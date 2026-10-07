// Regression check for the admin/moderation backend, run against a real API and PostgreSQL:
//   GET  /api/admin/stats                       (admin only)
//   GET  /api/admin/reports                     (admin, moderator)
//   POST /api/admin/reports/{id}/review         (admin, moderator)
//   GET  /api/admin/verifications               (admin, moderator)
//   POST /api/admin/verifications/{id}/review   (admin, moderator)
//   POST/PUT/DELETE /api/hyperlocal/services    (admin, moderator)
// Usage: node scripts/admin-moderation-api-test.mjs http://localhost:5000
// Requires the local PostgreSQL container for role promotion, for seeding the review queues
// and for reading the stored columns (override the container with POSTGRES_CONTAINER).
// POST /api/auth/register, /login and /refresh share a 10-requests-per-60s-per-IP limit and the
// script spends 7 of them, so leave a minute between two runs (same cooldown as the other
// account-creating scripts).
//
// There is still no member-facing API to file a report or submit a verification, so those two
// fixtures are seeded straight into the tables created by 001_schema.sql (the only supported
// way to create them today). Test accounts go through POST /api/auth/register and are
// promoted with psql; there is no API to change a role either.
//
// Covers: GET /api/admin/stats matches the database column by column and is admin-only
// (401 anonymous, 403 member and moderator); both review queues page, filter and order the
// same way the frontend reads them, and compare their totalCount against the database;
// POST reports/{id}/review accepts only resolved/dismissed, persists
// status/resolution_note/reviewed_by/reviewed_at, refuses a second review and invalid input,
// and leaves a report open when the body is rejected; POST verifications/{id}/review accepts
// only approved/rejected, requires a non-blank rejectionReason of at most 2000 characters,
// flips profiles.is_verified for an approval and never for a rejection, refuses a second
// review, and keeps identity_verifications and profiles consistent inside one transaction;
// service CRUD is staff-only. Every row is removed at the end, including on failure.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
const container = process.env.POSTGRES_CONTAINER ?? 'roomiematch-postgres-1';
const password = 'RoomieTest123!';

function sql(query) {
  return execFileSync('docker', [
    'exec', container,
    'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-t', '-A', '-c', query,
  ]).toString().trim();
}

const scalar = (query) => Number(sql(query));

async function call(method, path, { token, body, raw } = {}) {
  const hasBody = body !== undefined || raw !== undefined;
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: hasBody ? (raw ?? JSON.stringify(body)) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text, location: response.headers.get('location') };
}

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const stamp = Date.now();
const testEmails = [];
const serviceCity = 'AdmModRegTest';
// Fixed ids so the finally block can remove leftovers even from a crashed earlier run.
const RID = (n) => `a1000000-0000-0000-0000-00000000000${n}`;
const VID = (n) => `b2000000-0000-0000-0000-00000000000${n}`;
// Seeded members used only as the reporter/reported parties of the report fixtures; the
// script never edits them, it only inserts and then deletes its own user_reports rows.
const SEED_REPORTER = '00000000-0000-0000-0000-000000000001';

async function register(label, role) {
  const email = `adm-mod-${stamp}-${label}@example.com`;
  const { status, json, text } = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `AdmMod ${label}`, city: 'TP.HCM' },
  });
  assert.ok(status === 200 || status === 201, `register ${label} returned ${status}: ${text.slice(0, 200)}`);
  testEmails.push(email);
  if (role === undefined) {
    return { email, token: json.accessToken, id: json.user.id, role: json.user.role };
  }
  // Roles are never set through the API: promote the account and sign in again so the new
  // role claim is baked into a fresh token.
  sql(`UPDATE users SET role='${role}' WHERE email='${email}'`);
  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200, `login ${label} returned ${login.status}: ${login.text.slice(0, 200)}`);
  assert.equal(login.json.user.role, role, `${label} token role should be ${role}`);
  return { email, token: login.json.accessToken, id: login.json.user.id, role: login.json.user.role };
}

function dbStats() {
  const out = sql(
    "SELECT (SELECT count(*) FROM users WHERE is_active)||'|'||"
    + "(SELECT count(*) FROM user_reports WHERE status='open')||'|'||"
    + "(SELECT count(*) FROM identity_verifications WHERE status='pending')||'|'||"
    + "(SELECT count(*) FROM profiles WHERE is_verified)||'|'||"
    + "(SELECT count(*) FROM users WHERE created_at >= now() - interval '30 days')",
  );
  const [activeUsers, openReports, pendingVerifications, verifiedProfiles, newUsersLast30Days] =
    out.split('|').map(Number);
  return { activeUsers, openReports, pendingVerifications, verifiedProfiles, newUsersLast30Days };
}

function assertStatsMatch(label, api, db) {
  const keys = Object.keys(api ?? {}).sort();
  assert.deepEqual(
    keys,
    ['activeUsers', 'newUsersLast30Days', 'openReports', 'pendingVerifications', 'verifiedProfiles'],
    `${label}: unexpected stats keys ${keys.join(',')}`,
  );
  for (const key of keys) {
    assert.equal(api[key], db[key], `${label}: stats.${key} = ${api[key]}, DB = ${db[key]}`);
  }
}

async function collectPages(basePath, token) {
  const items = [];
  for (let page = 1; ; page += 1) {
    assert.ok(page < 1000, `${basePath}: pagination did not terminate`);
    const joiner = basePath.includes('?') ? '&' : '?';
    const result = await call('GET', `${basePath}${joiner}page=${page}&pageSize=2`, { token });
    assert.equal(result.status, 200, `${basePath} page ${page} returned ${result.status}`);
    assert.equal(result.json.page, page);
    assert.equal(result.json.pageSize, 2);
    assert.ok(result.json.items.length <= 2, `${basePath} page ${page} returned more than pageSize items`);
    items.push(...result.json.items);
    if (!result.json.hasNextPage) {
      return { items, totalCount: result.json.totalCount };
    }
  }
}

async function run() {
  // ---- fixtures: accounts, review queues, service directory rows ----------------
  const admin = await register('admin', 'admin');
  const moderator = await register('moderator', 'moderator');
  const owners = [];
  for (let n = 1; n <= 3; n += 1) {
    owners.push(await register(`owner${n}`));
  }
  // owner1 doubles as the plain member used by every permission check.
  const member = owners[0];
  assert.equal(member.role, 'member', 'owner accounts must start as members');

  sql("DELETE FROM user_reports WHERE id::text LIKE 'a1000000-%'");
  sql("DELETE FROM identity_verifications WHERE id::text LIKE 'b2000000-%'");
  sql(`DELETE FROM local_services WHERE city = '${serviceCity}'`);

  sql(`INSERT INTO user_reports (id, reporter_id, reported_user_id, reason, details, status, created_at) VALUES
    ('${RID(1)}','${SEED_REPORTER}','00000000-0000-0000-0000-000000000002','fake','test1','open', now() - interval '5 minutes'),
    ('${RID(2)}','${SEED_REPORTER}','00000000-0000-0000-0000-000000000003','scam','test2','open', now() - interval '4 minutes'),
    ('${RID(3)}','${SEED_REPORTER}','00000000-0000-0000-0000-000000000004','harass','test3','open', now() - interval '3 minutes'),
    ('${RID(4)}','${SEED_REPORTER}','00000000-0000-0000-0000-000000000005','spam','test4','open', now() - interval '2 minutes'),
    ('${RID(5)}','${SEED_REPORTER}','00000000-0000-0000-0000-000000000006','other','test5','open', now() - interval '1 minute')`);

  // Five pending verifications need five distinct owners: three plain members plus the two
  // staff accounts, so no extra registrations (and no extra rate-limited auth calls) are
  // spent on fixtures. ownerIds maps position -> user id, in the same order as VID(1..5).
  const ownerIds = [...owners.map((o) => o.id), admin.id, moderator.id];
  sql(`INSERT INTO identity_verifications (id, user_id, document_type, document_number_last4, front_image_url, back_image_url, selfie_image_url, status, created_at) VALUES
    ('${VID(1)}','${ownerIds[0]}','cccd','1001','https://example.com/f1.jpg','https://example.com/b1.jpg',NULL,'pending', now() - interval '5 minutes'),
    ('${VID(2)}','${ownerIds[1]}','cccd','1002','https://example.com/f2.jpg','https://example.com/b2.jpg','https://example.com/s2.jpg','pending', now() - interval '4 minutes'),
    ('${VID(3)}','${ownerIds[2]}','cmnd','1003','https://example.com/f3.jpg','https://example.com/b3.jpg',NULL,'pending', now() - interval '3 minutes'),
    ('${VID(4)}','${ownerIds[3]}','cccd','1004','https://example.com/f4.jpg','https://example.com/b4.jpg',NULL,'pending', now() - interval '2 minutes'),
    ('${VID(5)}','${ownerIds[4]}','cccd','1005','https://example.com/f5.jpg','https://example.com/b5.jpg',NULL,'pending', now() - interval '1 minute')`);

  const totalReports = scalar('SELECT count(*) FROM user_reports');
  const openBefore = scalar("SELECT count(*) FROM user_reports WHERE status='open'");
  const pendingBefore = scalar("SELECT count(*) FROM identity_verifications WHERE status='pending'");
  assert.equal(openBefore, 5, `expected 5 seeded open reports, DB has ${openBefore}`);
  assert.equal(pendingBefore, 5, `expected 5 seeded pending verifications, DB has ${pendingBefore}`);

  // ---- GET /api/admin/stats: value-level match with the DB + admin-only ---------
  const anonStats = await call('GET', '/api/admin/stats');
  assert.equal(anonStats.status, 401, `anonymous stats returned ${anonStats.status}`);
  const memberStats = await call('GET', '/api/admin/stats', { token: member.token });
  assert.equal(memberStats.status, 403, `member stats returned ${memberStats.status}`);
  const moderatorStats = await call('GET', '/api/admin/stats', { token: moderator.token });
  assert.equal(moderatorStats.status, 403, `moderator stats returned ${moderatorStats.status}`);
  const statsBeforeDb = dbStats();
  const adminStats = await call('GET', '/api/admin/stats', { token: admin.token });
  assert.equal(adminStats.status, 200, `admin stats returned ${adminStats.status}`);
  assertStatsMatch('stats before reviews', adminStats.json, statsBeforeDb);
  // ---- GET /api/admin/reports: shape, order, filters, paging, permission --------
  const reportsList = await call('GET', '/api/admin/reports?pageSize=50', { token: admin.token });
  assert.equal(reportsList.status, 200, `GET reports returned ${reportsList.status}`);
  assert.equal(reportsList.json.totalCount, totalReports, `reports totalCount ${reportsList.json.totalCount} != DB ${totalReports}`);
  const seededReports = reportsList.json.items.filter((r) => r.id.startsWith('a1000000-'));
  assert.equal(seededReports.length, 5, `expected the 5 seeded reports in the page, found ${seededReports.length}`);
  assert.deepEqual(
    seededReports.map((r) => r.id),
    [RID(5), RID(4), RID(3), RID(2), RID(1)],
    'reports must be newest first (created_at DESC, id DESC)',
  );
  const firstReport = seededReports[0];
  assert.equal(firstReport.status, 'open');
  assert.equal(firstReport.reason, 'other');
  assert.equal(firstReport.details, 'test5');
  assert.equal(firstReport.resolutionNote, null);
  assert.equal(firstReport.reviewedAt, null);
  assert.equal(firstReport.reporterId, SEED_REPORTER);
  assert.equal(firstReport.reportedUserId, '00000000-0000-0000-0000-000000000006');

  // Status filters are compared with the DB instead of assuming an empty table.
  for (const status of ['open', 'resolved', 'dismissed']) {
    const expected = scalar(`SELECT count(*) FROM user_reports WHERE status='${status}'`);
    const filtered = await call('GET', `/api/admin/reports?status=${status}&pageSize=50`, { token: admin.token });
    assert.equal(filtered.status, 200, `reports status=${status} returned ${filtered.status}`);
    assert.equal(filtered.json.totalCount, expected, `reports status=${status} totalCount ${filtered.json.totalCount} != DB ${expected}`);
    assert.ok(filtered.json.items.every((r) => r.status === status), `status=${status} returned a row with another status`);
  }

  const badReportStatus = await call('GET', '/api/admin/reports?status=bogus', { token: admin.token });
  assert.equal(badReportStatus.status, 400, `reports status=bogus returned ${badReportStatus.status}`);

  const reportsPages = await collectPages('/api/admin/reports', admin.token);
  assert.equal(reportsPages.totalCount, totalReports, 'paged reports totalCount must match the DB');
  assert.equal(reportsPages.items.length, totalReports, `paged reports collected ${reportsPages.items.length} rows, DB has ${totalReports}`);
  assert.equal(new Set(reportsPages.items.map((r) => r.id)).size, totalReports, 'report pages must not repeat a row');

  const badPage = await call('GET', '/api/admin/reports?page=0', { token: admin.token });
  const badPageSize = await call('GET', '/api/admin/reports?pageSize=51', { token: admin.token });
  assert.equal(badPage.status, 400, `reports page=0 returned ${badPage.status}`);
  assert.equal(badPageSize.status, 400, `reports pageSize=51 returned ${badPageSize.status}`);

  const moderatorReports = await call('GET', '/api/admin/reports', { token: moderator.token });
  assert.equal(moderatorReports.status, 200, `moderator GET reports returned ${moderatorReports.status}`);
  const anonReports = await call('GET', '/api/admin/reports');
  assert.equal(anonReports.status, 401, `anonymous GET reports returned ${anonReports.status}`);
  const memberReports = await call('GET', '/api/admin/reports', { token: member.token });
  assert.equal(memberReports.status, 403, `member GET reports returned ${memberReports.status}`);
  // ---- POST /api/admin/reports/{id}/review -------------------------------------
  const reportRow = (id) =>
    sql(`SELECT status||'|'||COALESCE(length(resolution_note)::text,'NULL')||'|'||COALESCE(reviewed_by::text,'NULL')||'|'||CASE WHEN reviewed_at IS NULL THEN 'NULL' ELSE 'SET' END FROM user_reports WHERE id='${id}'`);
  const ourReports = (status) =>
    scalar(`SELECT count(*) FROM user_reports WHERE id::text LIKE 'a1000000-%' AND status='${status}'`);
  const note2000 = 'x'.repeat(2000);

  // Moderator resolves report 1 with the longest accepted note.
  const resolve1 = await call('POST', `/api/admin/reports/${RID(1)}/review`, {
    token: moderator.token, body: { status: 'resolved', resolutionNote: note2000 },
  });
  assert.equal(resolve1.status, 204, `resolve report returned ${resolve1.status}`);
  assert.equal(reportRow(RID(1)), `resolved|2000|${moderator.id}|SET`, `report 1 DB row is ${reportRow(RID(1))}`);

  // A report can only be reviewed once.
  const repeat1 = await call('POST', `/api/admin/reports/${RID(1)}/review`, {
    token: admin.token, body: { status: 'dismissed' },
  });
  assert.equal(repeat1.status, 404, `second review returned ${repeat1.status}`);
  assert.equal(reportRow(RID(1)), `resolved|2000|${moderator.id}|SET`, 'a refused second review must not change the row');

  // Admin dismisses report 2 with no note -> stored note is NULL.
  const dismiss2 = await call('POST', `/api/admin/reports/${RID(2)}/review`, {
    token: admin.token, body: { status: 'dismissed' },
  });
  assert.equal(dismiss2.status, 204, `dismiss report returned ${dismiss2.status}`);
  assert.equal(reportRow(RID(2)), `dismissed|NULL|${admin.id}|SET`, `report 2 DB row is ${reportRow(RID(2))}`);

  // Invalid payloads are 400, never 500, and never touch the row.
  const badStatus = await call('POST', `/api/admin/reports/${RID(3)}/review`, {
    token: admin.token, body: { status: 'open' },
  });
  assert.equal(badStatus.status, 400, `report review status=open returned ${badStatus.status}`);
  const tooLong = await call('POST', `/api/admin/reports/${RID(3)}/review`, {
    token: admin.token, body: { status: 'resolved', resolutionNote: 'y'.repeat(2001) },
  });
  assert.equal(tooLong.status, 400, `report review note 2001 chars returned ${tooLong.status}`);
  assert.equal(reportRow(RID(3)), 'open|NULL|NULL|NULL', 'rejected payloads must leave report 3 untouched');
  const ok2000 = await call('POST', `/api/admin/reports/${RID(3)}/review`, {
    token: admin.token, body: { status: 'resolved', resolutionNote: note2000 },
  });
  assert.equal(ok2000.status, 204, `report review with 2000-char note returned ${ok2000.status}`);
  assert.equal(reportRow(RID(3)), `resolved|2000|${admin.id}|SET`, `report 3 DB row is ${reportRow(RID(3))}`);

  const missingReport = await call('POST', '/api/admin/reports/a9999999-9999-9999-9999-999999999999/review', {
    token: admin.token, body: { status: 'resolved' },
  });
  assert.equal(missingReport.status, 404, `review of an unknown report returned ${missingReport.status}`);
  const emptyBody = await call('POST', `/api/admin/reports/${RID(5)}/review`, { token: admin.token, raw: '' });
  assert.equal(emptyBody.status, 400, `review with an empty body returned ${emptyBody.status}`);
  assert.equal(reportRow(RID(5)), 'open|NULL|NULL|NULL', 'an empty body must leave report 5 open');

  // Concurrent reviews of the same open report: exactly one wins.
  const [concurrentA, concurrentB] = await Promise.all([
    call('POST', `/api/admin/reports/${RID(4)}/review`, { token: admin.token, body: { status: 'resolved' } }),
    call('POST', `/api/admin/reports/${RID(4)}/review`, { token: moderator.token, body: { status: 'dismissed' } }),
  ]);
  const concurrentCodes = [concurrentA.status, concurrentB.status].sort((a, b) => a - b);
  assert.deepEqual(concurrentCodes, [204, 404], `concurrent report reviews returned ${concurrentCodes.join(',')}`);
  assert.notEqual(reportRow(RID(4)), 'open|NULL|NULL|NULL', 'the winning concurrent review must persist a decision');

  // The queue reflects every decision: 1 of our 5 reports stays open, 4 are handled.
  assert.equal(ourReports('open'), 1, 'exactly one seeded report must remain open');
  assert.equal(ourReports('resolved') + ourReports('dismissed'), 4, 'the other four seeded reports must be handled');
  const dbOpenAfter = scalar("SELECT count(*) FROM user_reports WHERE status='open'");
  const openFiltered = await call('GET', '/api/admin/reports?status=open&pageSize=50', { token: admin.token });
  assert.equal(openFiltered.json.totalCount, dbOpenAfter, `open filter ${openFiltered.json.totalCount} != DB ${dbOpenAfter}`);
  assert.ok(openFiltered.json.items.some((r) => r.id === RID(5)), 'the one open report must still be listed');

  // POST permission: anonymous 401, member 403.
  const anonPost = await call('POST', `/api/admin/reports/${RID(5)}/review`, { body: { status: 'resolved' } });
  assert.equal(anonPost.status, 401, `anonymous review returned ${anonPost.status}`);
  const memberPost = await call('POST', `/api/admin/reports/${RID(5)}/review`, { token: member.token, body: { status: 'resolved' } });
  assert.equal(memberPost.status, 403, `member review returned ${memberPost.status}`);
  assert.equal(reportRow(RID(5)), 'open|NULL|NULL|NULL', 'refused reviewers must not change report 5');
  // ---- GET /api/admin/verifications: shape, order, filters, paging, permission --
  const dbAllVerifications = scalar('SELECT count(*) FROM identity_verifications');
  const dbPendingNow = scalar("SELECT count(*) FROM identity_verifications WHERE status='pending'");
  const verificationsList = await call('GET', '/api/admin/verifications?pageSize=50', { token: admin.token });
  assert.equal(verificationsList.status, 200, `GET verifications returned ${verificationsList.status}`);
  assert.equal(verificationsList.json.totalCount, dbAllVerifications, `verifications totalCount ${verificationsList.json.totalCount} != DB ${dbAllVerifications}`);
  const seededVerifications = verificationsList.json.items.filter((v) => v.id.startsWith('b2000000-'));
  assert.equal(seededVerifications.length, 5, `expected the 5 seeded verifications, found ${seededVerifications.length}`);
  assert.deepEqual(
    seededVerifications.map((v) => v.id),
    [VID(5), VID(4), VID(3), VID(2), VID(1)],
    'verifications must be newest first (created_at DESC, id DESC)',
  );
  const firstVerification = seededVerifications[0];
  assert.equal(firstVerification.status, 'pending');
  assert.equal(firstVerification.rejectionReason, null);
  assert.equal(firstVerification.userId, ownerIds[4]);
  assert.equal(firstVerification.documentType, 'cccd');

  for (const status of ['pending', 'approved', 'rejected']) {
    const expected = scalar(`SELECT count(*) FROM identity_verifications WHERE status='${status}'`);
    const filtered = await call('GET', `/api/admin/verifications?status=${status}&pageSize=50`, { token: admin.token });
    assert.equal(filtered.status, 200, `verifications status=${status} returned ${filtered.status}`);
    assert.equal(filtered.json.totalCount, expected, `verifications status=${status} totalCount ${filtered.json.totalCount} != DB ${expected}`);
    assert.ok(filtered.json.items.every((v) => v.status === status), `status=${status} returned a row with another status`);
  }

  const badVerificationStatus = await call('GET', '/api/admin/verifications?status=bogus', { token: admin.token });
  assert.equal(badVerificationStatus.status, 400, `verifications status=bogus returned ${badVerificationStatus.status}`);

  const verificationPages = await collectPages('/api/admin/verifications?status=pending', admin.token);
  assert.equal(verificationPages.totalCount, dbPendingNow, 'paged pending verifications totalCount must match the DB');
  assert.equal(verificationPages.items.length, dbPendingNow, `paged verifications collected ${verificationPages.items.length} rows, DB has ${dbPendingNow}`);
  assert.equal(new Set(verificationPages.items.map((v) => v.id)).size, dbPendingNow, 'verification pages must not repeat a row');

  const badVerificationPage = await call('GET', '/api/admin/verifications?page=0', { token: admin.token });
  const badVerificationPageSize = await call('GET', '/api/admin/verifications?pageSize=51', { token: admin.token });
  assert.equal(badVerificationPage.status, 400, `verifications page=0 returned ${badVerificationPage.status}`);
  assert.equal(badVerificationPageSize.status, 400, `verifications pageSize=51 returned ${badVerificationPageSize.status}`);

  const moderatorVerifications = await call('GET', '/api/admin/verifications', { token: moderator.token });
  assert.equal(moderatorVerifications.status, 200, `moderator GET verifications returned ${moderatorVerifications.status}`);
  const anonVerifications = await call('GET', '/api/admin/verifications');
  assert.equal(anonVerifications.status, 401, `anonymous GET verifications returned ${anonVerifications.status}`);
  const memberVerifications = await call('GET', '/api/admin/verifications', { token: member.token });
  assert.equal(memberVerifications.status, 403, `member GET verifications returned ${memberVerifications.status}`);
  // ---- POST /api/admin/verifications/{id}/review --------------------------------
  const verificationRow = (id) =>
    sql(`SELECT status||'|'||COALESCE(length(rejection_reason)::text,'NULL')||'|'||COALESCE(reviewed_by::text,'NULL')||'|'||CASE WHEN reviewed_at IS NULL THEN 'NULL' ELSE 'SET' END FROM identity_verifications WHERE id='${id}'`);
  const profileVerified = (userId) =>
    sql(`SELECT COALESCE((SELECT is_verified::text FROM profiles WHERE user_id='${userId}'),'NO_PROFILE')`);

  // Moderator approves V1 -> the profile flips to verified.
  const approve1 = await call('POST', `/api/admin/verifications/${VID(1)}/review`, {
    token: moderator.token, body: { status: 'approved' },
  });
  assert.equal(approve1.status, 204, `approve verification returned ${approve1.status}`);
  assert.equal(verificationRow(VID(1)), `approved|NULL|${moderator.id}|SET`, `V1 DB row is ${verificationRow(VID(1))}`);
  assert.equal(profileVerified(ownerIds[0]), 'true', 'approval must set profiles.is_verified=true');

  // A verification can only be reviewed once, and the profile stays verified.
  const repeatApprove = await call('POST', `/api/admin/verifications/${VID(1)}/review`, {
    token: admin.token, body: { status: 'approved' },
  });
  assert.equal(repeatApprove.status, 404, `second verification review returned ${repeatApprove.status}`);
  assert.equal(profileVerified(ownerIds[0]), 'true', 'a refused second review must not touch the profile');

  // Admin rejects V2 with a reason; the profile is not verified.
  const rejectReason = 'Tài liệu mờ, vui lòng chụp lại.';
  const reject2 = await call('POST', `/api/admin/verifications/${VID(2)}/review`, {
    token: admin.token, body: { status: 'rejected', rejectionReason: rejectReason },
  });
  assert.equal(reject2.status, 204, `reject verification returned ${reject2.status}`);
  assert.equal(verificationRow(VID(2)), `rejected|${rejectReason.length}|${admin.id}|SET`, `V2 DB row is ${verificationRow(VID(2))}`);
  assert.equal(profileVerified(ownerIds[1]), 'false', 'a rejection must not verify the profile');
  // Missing / whitespace-only / over-long reasons are 400 and leave the row pending.
  const noReason = await call('POST', `/api/admin/verifications/${VID(3)}/review`, {
    token: admin.token, body: { status: 'rejected' },
  });
  assert.equal(noReason.status, 400, `reject without a reason returned ${noReason.status}`);
  const blankReason = await call('POST', `/api/admin/verifications/${VID(3)}/review`, {
    token: admin.token, body: { status: 'rejected', rejectionReason: '   ' },
  });
  assert.equal(blankReason.status, 400, `reject with a blank reason returned ${blankReason.status}`);
  const longReason = await call('POST', `/api/admin/verifications/${VID(3)}/review`, {
    token: admin.token, body: { status: 'rejected', rejectionReason: 'q'.repeat(2001) },
  });
  assert.equal(longReason.status, 400, `reject with a 2001-char reason returned ${longReason.status}`);
  assert.equal(verificationRow(VID(3)), 'pending|NULL|NULL|NULL', 'rejected payloads must leave V3 pending');
  const reason2000 = await call('POST', `/api/admin/verifications/${VID(3)}/review`, {
    token: admin.token, body: { status: 'rejected', rejectionReason: note2000 },
  });
  assert.equal(reason2000.status, 204, `reject with a 2000-char reason returned ${reason2000.status}`);
  assert.equal(verificationRow(VID(3)), `rejected|2000|${admin.id}|SET`, `V3 DB row is ${verificationRow(VID(3))}`);

  // V4 belongs to the admin: reviewing one's own submission is refused, a moderator approves it.
  const selfApprove = await call('POST', `/api/admin/verifications/${VID(4)}/review`, {
    token: admin.token, body: { status: 'approved' },
  });
  assert.equal(selfApprove.status, 404, `self-approving V4 returned ${selfApprove.status}`);
  const approve4 = await call('POST', `/api/admin/verifications/${VID(4)}/review`, {
    token: moderator.token, body: { status: 'approved' },
  });
  assert.equal(approve4.status, 204, `approve V4 returned ${approve4.status}`);
  assert.equal(profileVerified(ownerIds[3]), 'true', 'approving V4 must verify its profile');

  // Invalid status / unknown id / empty body.
  const badVerificationReview = await call('POST', `/api/admin/verifications/${VID(5)}/review`, {
    token: admin.token, body: { status: 'pending' },
  });
  assert.equal(badVerificationReview.status, 400, `verification review status=pending returned ${badVerificationReview.status}`);
  const missingVerification = await call('POST', '/api/admin/verifications/b9999999-9999-9999-9999-999999999999/review', {
    token: admin.token, body: { status: 'approved' },
  });
  assert.equal(missingVerification.status, 404, `review of an unknown verification returned ${missingVerification.status}`);
  const emptyVerificationBody = await call('POST', `/api/admin/verifications/${VID(5)}/review`, { token: admin.token, raw: '' });
  assert.equal(emptyVerificationBody.status, 400, `verification review with an empty body returned ${emptyVerificationBody.status}`);

  // Concurrent approvals of the same pending verification: exactly one wins and the row
  // plus the profile stay consistent.
  const [vc1, vc2] = await Promise.all([
    call('POST', `/api/admin/verifications/${VID(5)}/review`, { token: admin.token, body: { status: 'approved' } }),
    call('POST', `/api/admin/verifications/${VID(5)}/review`, { token: moderator.token, body: { status: 'approved' } }),
  ]);
  const verificationCodes = [vc1.status, vc2.status].sort((a, b) => a - b);
  assert.deepEqual(verificationCodes, [204, 404], `concurrent verification reviews returned ${verificationCodes.join(',')}`);
  const v5Row = verificationRow(VID(5));
  assert.ok(v5Row.startsWith('approved|NULL|') && v5Row.endsWith('|SET'), `V5 DB row is ${v5Row}`);
  assert.equal(profileVerified(ownerIds[4]), 'true', 'the winning approval must verify the profile');

  // Transaction consistency: every approved verification has a verified profile.
  const inconsistent = scalar("SELECT count(*) FROM identity_verifications v JOIN profiles p ON p.user_id=v.user_id WHERE v.status='approved' AND p.is_verified=false");
  assert.equal(inconsistent, 0, `${inconsistent} approved verifications have a non-verified profile`);

  // Final queue state matches the DB for each status.
  for (const status of ['pending', 'approved', 'rejected']) {
    const expected = scalar(`SELECT count(*) FROM identity_verifications WHERE status='${status}'`);
    const filtered = await call('GET', `/api/admin/verifications?status=${status}&pageSize=50`, { token: admin.token });
    assert.equal(filtered.json.totalCount, expected, `verifications status=${status} totalCount ${filtered.json.totalCount} != DB ${expected}`);
  }
  assert.equal(
    scalar("SELECT count(*) FROM identity_verifications WHERE id::text LIKE 'b2000000-%' AND status='pending'"),
    0,
    'all seeded verifications must be reviewed',
  );

  // POST permission: anonymous 401, member 403.
  const anonVerificationPost = await call('POST', `/api/admin/verifications/${VID(1)}/review`, { body: { status: 'approved' } });
  assert.equal(anonVerificationPost.status, 401, `anonymous verification review returned ${anonVerificationPost.status}`);
  const memberVerificationPost = await call('POST', `/api/admin/verifications/${VID(1)}/review`, { token: member.token, body: { status: 'approved' } });
  assert.equal(memberVerificationPost.status, 403, `member verification review returned ${memberVerificationPost.status}`);
  // ---- stats after the reviews: the counters moved the way the DB says ----------
  const statsAfterDb = dbStats();
  const statsAfter = await call('GET', '/api/admin/stats', { token: admin.token });
  assert.equal(statsAfter.status, 200, `admin stats after reviews returned ${statsAfter.status}`);
  assertStatsMatch('stats after reviews', statsAfter.json, statsAfterDb);
  assert.equal(statsAfter.json.openReports, 1, `openReports should be 1 after reviews, got ${statsAfter.json.openReports}`);
  assert.equal(
    statsAfter.json.verifiedProfiles - statsBeforeDb.verifiedProfiles,
    3,
    'the three approvals must raise verifiedProfiles by exactly 3',
  );
  assert.equal(
    statsBeforeDb.openReports - statsAfter.json.openReports,
    4,
    'the four handled reports must lower openReports by exactly 4',
  );

  // ---- service CRUD is staff-only (admin, moderator) ----------------------------
  const serviceBody = {
    category: 'Giặt ủi',
    name: 'Dịch vụ kiểm thử quyền',
    description: 'Tạo bởi script hồi quy và luôn được dọn lại.',
    phone: '0901234567',
    district: 'Quận 1',
    city: serviceCity,
    distanceKm: 1.5,
    rating: 4.5,
    reviewCount: 3,
    priceFrom: 50000,
    isVerified: true,
  };

  const anonCreate = await call('POST', '/api/hyperlocal/services', { body: serviceBody });
  assert.equal(anonCreate.status, 401, `anonymous service POST returned ${anonCreate.status}`);
  const memberCreate = await call('POST', '/api/hyperlocal/services', { token: member.token, body: serviceBody });
  assert.equal(memberCreate.status, 403, `member service POST returned ${memberCreate.status}`);

  const adminCreate = await call('POST', '/api/hyperlocal/services', { token: admin.token, body: serviceBody });
  assert.equal(adminCreate.status, 201, `admin service POST returned ${adminCreate.status}`);
  assert.ok(adminCreate.location?.includes(adminCreate.json.id), 'POST must return a Location header for the new service');
  const moderatorCreate = await call('POST', '/api/hyperlocal/services', {
    token: moderator.token, body: { ...serviceBody, name: 'Dịch vụ kiểm thử moderator' },
  });
  assert.equal(moderatorCreate.status, 201, `moderator service POST returned ${moderatorCreate.status}`);

  const adminServiceId = adminCreate.json.id;
  const moderatorServiceId = moderatorCreate.json.id;
  const anonUpdate = await call('PUT', `/api/hyperlocal/services/${adminServiceId}`, { body: serviceBody });
  assert.equal(anonUpdate.status, 401, `anonymous service PUT returned ${anonUpdate.status}`);
  const memberUpdate = await call('PUT', `/api/hyperlocal/services/${adminServiceId}`, { token: member.token, body: serviceBody });
  assert.equal(memberUpdate.status, 403, `member service PUT returned ${memberUpdate.status}`);
  const moderatorUpdate = await call('PUT', `/api/hyperlocal/services/${adminServiceId}`, {
    token: moderator.token, body: { ...serviceBody, rating: 4.9 },
  });
  assert.equal(moderatorUpdate.status, 200, `moderator service PUT returned ${moderatorUpdate.status}`);
  assert.equal(moderatorUpdate.json.rating, 4.9);
  const reread = await call('GET', `/api/hyperlocal/services/${adminServiceId}`);
  assert.equal(reread.status, 200, `GET of the updated service returned ${reread.status}`);
  assert.equal(reread.json.rating, 4.9, 'PUT must persist the new rating');

  const anonDelete = await call('DELETE', `/api/hyperlocal/services/${adminServiceId}`);
  assert.equal(anonDelete.status, 401, `anonymous service DELETE returned ${anonDelete.status}`);
  const memberDelete = await call('DELETE', `/api/hyperlocal/services/${adminServiceId}`, { token: member.token });
  assert.equal(memberDelete.status, 403, `member service DELETE returned ${memberDelete.status}`);
  const adminDelete = await call('DELETE', `/api/hyperlocal/services/${adminServiceId}`, { token: admin.token });
  assert.equal(adminDelete.status, 204, `admin service DELETE returned ${adminDelete.status}`);
  const moderatorDelete = await call('DELETE', `/api/hyperlocal/services/${moderatorServiceId}`, { token: moderator.token });
  assert.equal(moderatorDelete.status, 204, `moderator service DELETE returned ${moderatorDelete.status}`);
  const gone = await call('GET', `/api/hyperlocal/services/${adminServiceId}`);
  assert.equal(gone.status, 404, `a soft-deleted service must read back 404, got ${gone.status}`);
}

const cleanup = () => {
  sql("DELETE FROM identity_verifications WHERE id::text LIKE 'b2000000-%'");
  sql("DELETE FROM user_reports WHERE id::text LIKE 'a1000000-%'");
  sql(`DELETE FROM local_services WHERE city = '${serviceCity}'`);
  if (testEmails.length > 0) {
    sql(`DELETE FROM users WHERE email IN (${testEmails.map((e) => `'${e}'`).join(',')})`);
  }
};

let failure = null;
try {
  await run();
} catch (error) {
  failure = error;
} finally {
  try {
    cleanup();
  } catch (cleanupError) {
    if (failure === null) {
      failure = cleanupError;
    } else {
      console.error(`cleanup also failed: ${cleanupError.message}`);
    }
  }
}

if (failure !== null) {
  console.error(`FAIL: ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log('PASS: admin moderation APIs - stats matches the DB and is admin-only; both review queues page, filter and order like the frontend reads them; reports and verifications persist the right columns, reject invalid input, refuse a second review; approvals flip profiles.is_verified and rejections do not, inside one transaction; and service CRUD stays staff-only.');
}

