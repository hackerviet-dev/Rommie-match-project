// Regression check for the member safety tools and the roommate confirmation flow, run
// against a real API and PostgreSQL:
//   POST   /api/users/{userId}/block        DELETE /api/users/{userId}/block
//   GET    /api/users/me/blocks             POST   /api/users/{userId}/reports
//   POST   /api/matching/requests           GET    /api/matching/requests[/{requestId}]
//   POST   /api/matching/requests/{requestId}/accept|decline|cancel|end
// Usage: node scripts/safety-match-requests-api-test.mjs http://localhost:5000
// Requires the local PostgreSQL container to promote a moderator, hide a profile, read rows
// back and clean up (override the container with POSTGRES_CONTAINER).
// Covers: 401 anonymous everywhere; block is idempotent, hides the two members' profiles from
// each other, refuses self (400 self_target), unknown (404) and staff (403 staff_target),
// unblock is a soft delete (row kept, deleted_at set) and re-blocking revives the same row;
// reports land as open rows the moderator queue sees, validate reason/details (other needs
// details), refuse self/unknown, allow hidden members, and allow one open report per pair
// (409 report_already_open until a moderator closes it); match requests go pending -> accepted
// -> ended, pending -> declined and pending -> cancelled with role checks (recipient_only,
// requester_only), state checks (request_not_pending, not_matched), conflicts in either
// direction (match_request_pending / already_matched with the open request attached), hidden,
// staff, unknown and blocked candidates 404, a block between the pair stopping accept (403
// blocked), outsiders 404, list filters/paging/validation, history kept as rows, and two
// simultaneous invitations in opposite directions producing exactly one request.
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

async function call(method, path, { token, body } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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

function expectProblem(result, status, code, label) {
  assert.equal(result.status, status, `${label} returned ${result.status}: ${result.text.slice(0, 300)}`);
  if (code !== undefined) {
    assert.equal(result.json?.code, code, `${label} code was ${result.json?.code}`);
  }
}

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const stamp = Date.now();
const testEmails = [];

async function register(label, role) {
  const email = `safety-${label}-${stamp}@example.com`;
  const { status, json } = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `Safety ${label}`, city: 'TP.HCM' },
  });
  assert.ok(status === 200 || status === 201, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  testEmails.push(email);
  if (role === undefined) {
    return { token: json.accessToken, id: json.user.id };
  }
  sql(`UPDATE users SET role='${role}' WHERE email='${email}'`);
  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200, `login ${label} returned ${login.status}`);
  return { token: login.json.accessToken, id: json.user.id };
}

try {
  const a = await register('a');
  const b = await register('b');
  const hidden = await register('hidden');
  const d = await register('d');
  const moderator = await register('mod', 'moderator');
  sql(`UPDATE profiles SET is_public = false WHERE user_id = '${hidden.id}'`);
  const unknownId = crypto.randomUUID();

  // 1. Everything needs a signed-in caller.
  for (const [method, path, body] of [
    ['POST', `/api/users/${b.id}/block`],
    ['DELETE', `/api/users/${b.id}/block`],
    ['GET', '/api/users/me/blocks'],
    ['POST', `/api/users/${b.id}/reports`, { reason: 'spam' }],
    ['POST', '/api/matching/requests', { candidateId: b.id }],
    ['GET', '/api/matching/requests'],
    ['GET', `/api/matching/requests/${unknownId}`],
    ['POST', `/api/matching/requests/${unknownId}/accept`],
    ['POST', `/api/matching/requests/${unknownId}/decline`],
    ['POST', `/api/matching/requests/${unknownId}/cancel`],
    ['POST', `/api/matching/requests/${unknownId}/end`],
  ]) {
    assert.equal((await call(method, path, { body })).status, 401, `anonymous ${method} ${path}`);
  }

  // 2. Block: 204, idempotent, both profiles hidden from each other, listed for the blocker only.
  assert.equal((await call('GET', `/api/users/${b.id}/profile`, { token: a.token })).status, 200, 'b is visible before the block');
  assert.equal((await call('POST', `/api/users/${b.id}/block`, { token: a.token })).status, 204);
  assert.equal((await call('POST', `/api/users/${b.id}/block`, { token: a.token })).status, 204, 'blocking twice is still 204');
  assert.equal(sql(`SELECT count(*) FROM user_blocks WHERE blocker_id='${a.id}' AND blocked_id='${b.id}'`), '1');
  assert.equal((await call('GET', `/api/users/${b.id}/profile`, { token: a.token })).status, 404, 'the blocker no longer sees b');
  assert.equal((await call('GET', `/api/users/${a.id}/profile`, { token: b.token })).status, 404, 'the blocked member no longer sees a');
  const blocks = await call('GET', '/api/users/me/blocks', { token: a.token });
  assert.equal(blocks.status, 200);
  assert.equal(blocks.json.totalCount, 1);
  assert.equal(blocks.json.items[0].userId, b.id);
  assert.equal(blocks.json.items[0].displayName, 'Safety b');
  assert.ok(blocks.json.items[0].blockedAt);
  assert.equal((await call('GET', '/api/users/me/blocks', { token: b.token })).json.totalCount, 0, 'b has blocked nobody');
  assert.equal((await call('GET', '/api/users/me/blocks?pageSize=51', { token: a.token })).status, 400);
  expectProblem(await call('POST', `/api/users/${a.id}/block`, { token: a.token }), 400, 'self_target', 'self block');
  expectProblem(await call('POST', `/api/users/${unknownId}/block`, { token: a.token }), 404, undefined, 'unknown block');
  expectProblem(await call('POST', `/api/users/${moderator.id}/block`, { token: a.token }), 403, 'staff_target', 'staff block');
  assert.equal((await call('POST', `/api/users/${hidden.id}/block`, { token: a.token })).status, 204, 'a hidden member can be blocked');

  // 3. Unblock: soft delete, idempotent; re-block revives the same row.
  assert.equal((await call('DELETE', `/api/users/${b.id}/block`, { token: a.token })).status, 204);
  assert.equal(sql(`SELECT deleted_at IS NOT NULL FROM user_blocks WHERE blocker_id='${a.id}' AND blocked_id='${b.id}'`), 't', 'unblock keeps the row with deleted_at');
  assert.equal((await call('DELETE', `/api/users/${b.id}/block`, { token: a.token })).status, 204, 'unblocking twice is still 204');
  assert.equal((await call('DELETE', `/api/users/${unknownId}/block`, { token: a.token })).status, 204, 'unblocking an unknown id is a no-op');
  assert.equal((await call('GET', `/api/users/${b.id}/profile`, { token: a.token })).status, 200, 'b is visible again');
  assert.deepEqual((await call('GET', '/api/users/me/blocks', { token: a.token })).json.items.map((item) => item.userId), [hidden.id]);
  assert.equal((await call('POST', `/api/users/${b.id}/block`, { token: a.token })).status, 204);
  assert.equal(sql(`SELECT count(*) || ':' || bool_and(deleted_at IS NULL) FROM user_blocks WHERE blocker_id='${a.id}' AND blocked_id='${b.id}'`), '1:true', 're-block revives the single row');
  assert.equal((await call('DELETE', `/api/users/${b.id}/block`, { token: a.token })).status, 204);
  assert.equal((await call('DELETE', `/api/users/${hidden.id}/block`, { token: a.token })).status, 204);

  // 4. Report: 201 open row the moderation queue sees; one open report per pair.
  const report = await call('POST', `/api/users/${b.id}/reports`, { token: a.token, body: { reason: 'scam', details: '  Đòi chuyển cọc trước khi xem phòng  ' } });
  assert.equal(report.status, 201, `report returned ${report.status}: ${report.text.slice(0, 300)}`);
  assert.equal(report.json.reportedUserId, b.id);
  assert.equal(report.json.reason, 'scam');
  assert.equal(report.json.details, 'Đòi chuyển cọc trước khi xem phòng');
  assert.equal(report.json.status, 'open');
  assert.equal(sql(`SELECT reporter_id || ':' || status FROM user_reports WHERE id='${report.json.id}'`), `${a.id}:open`);
  const queue = await call('GET', '/api/admin/reports?status=open&pageSize=50', { token: moderator.token });
  assert.equal(queue.status, 200);
  assert.ok(queue.json.items.some((item) => item.id === report.json.id), 'the moderator queue must list the new report');
  expectProblem(await call('POST', `/api/users/${b.id}/reports`, { token: a.token, body: { reason: 'spam' } }), 409, 'report_already_open', 'second open report');
  assert.equal((await call('POST', `/api/admin/reports/${report.json.id}/review`, { token: moderator.token, body: { status: 'dismissed', resolutionNote: 'test' } })).status, 204);
  const afterReview = await call('POST', `/api/users/${b.id}/reports`, { token: a.token, body: { reason: 'spam', details: '   ' } });
  assert.equal(afterReview.status, 201, 'a new report is allowed once the previous one is closed');
  assert.equal(afterReview.json.details, null, 'blank details are stored as null');
  assert.equal((await call('POST', `/api/users/${a.id}/reports`, { token: b.token, body: { reason: 'harass' } })).status, 201, 'reports are per direction');
  assert.equal((await call('POST', `/api/users/${hidden.id}/reports`, { token: a.token, body: { reason: 'fake' } })).status, 201, 'a hidden member can be reported');
  for (const [label, body, field] of [
    ['unknown reason', { reason: 'rude' }, 'reason'],
    ['missing reason', {}, 'reason'],
    ['other without details', { reason: 'other' }, 'details'],
    ['other with blank details', { reason: 'other', details: '  ' }, 'details'],
    ['details too long', { reason: 'spam', details: 'x'.repeat(2001) }, 'details'],
  ]) {
    const rejected = await call('POST', `/api/users/${d.id}/reports`, { token: a.token, body });
    assert.equal(rejected.status, 400, `${label} returned ${rejected.status}: ${rejected.text.slice(0, 200)}`);
    const keys = Object.keys(rejected.json?.errors ?? {}).map((key) => key.toLowerCase());
    assert.ok(keys.some((key) => key.endsWith(field)), `${label} must report ${field}, got ${keys}`);
  }
  assert.equal(sql(`SELECT count(*) FROM user_reports WHERE reporter_id='${a.id}' AND reported_user_id='${d.id}'`), '0', 'rejected reports insert nothing');
  assert.equal((await call('POST', `/api/users/${d.id}/reports`, { token: a.token, body: { reason: 'other', details: 'Hồ sơ dùng ảnh người khác' } })).status, 201);
  expectProblem(await call('POST', `/api/users/${a.id}/reports`, { token: a.token, body: { reason: 'spam' } }), 400, 'self_target', 'self report');
  expectProblem(await call('POST', `/api/users/${unknownId}/reports`, { token: a.token, body: { reason: 'spam' } }), 404, undefined, 'unknown report');

  // 5. Match request: a invites b.
  const created = await call('POST', '/api/matching/requests', { token: a.token, body: { candidateId: b.id, message: '  Mình ở gần trường, ở chung nhé?  ' } });
  assert.equal(created.status, 201, `create returned ${created.status}: ${created.text.slice(0, 300)}`);
  const request = created.json;
  assert.equal(request.direction, 'outgoing');
  assert.equal(request.status, 'pending');
  assert.equal(request.partner.userId, b.id);
  assert.equal(request.partner.displayName, 'Safety b');
  assert.equal(request.message, 'Mình ở gần trường, ở chung nhé?');
  assert.equal(request.isBlocked, false);
  assert.equal(request.respondedAt, null);
  assert.ok(created.location?.toLowerCase().endsWith(`/api/matching/requests/${request.id}`), `Location was ${created.location}`);
  const seenByB = await call('GET', `/api/matching/requests/${request.id}`, { token: b.token });
  assert.equal(seenByB.status, 200);
  assert.equal(seenByB.json.direction, 'incoming');
  assert.equal(seenByB.json.partner.userId, a.id);
  assert.equal((await call('GET', `/api/matching/requests/${request.id}`, { token: d.token })).status, 404, 'an outsider cannot read it');
  assert.equal((await call('GET', `/api/matching/requests/${unknownId}`, { token: a.token })).status, 404);

  // Conflicts in either direction carry the open request.
  const again = await call('POST', '/api/matching/requests', { token: a.token, body: { candidateId: b.id } });
  expectProblem(again, 409, 'match_request_pending', 'second invitation');
  assert.equal(again.json.request.id, request.id);
  assert.equal(again.json.request.direction, 'outgoing');
  const reverse = await call('POST', '/api/matching/requests', { token: b.token, body: { candidateId: a.id } });
  expectProblem(reverse, 409, 'match_request_pending', 'reverse invitation');
  assert.equal(reverse.json.request.id, request.id);
  assert.equal(reverse.json.request.direction, 'incoming', 'b learns that a already invited them');

  // Invalid candidates.
  expectProblem(await call('POST', '/api/matching/requests', { token: a.token, body: { candidateId: a.id } }), 400, 'self_target', 'self invitation');
  for (const [label, candidateId] of [['unknown', unknownId], ['hidden', hidden.id], ['staff', moderator.id]]) {
    expectProblem(await call('POST', '/api/matching/requests', { token: a.token, body: { candidateId } }), 404, undefined, `${label} candidate`);
  }
  assert.equal((await call('POST', `/api/users/${a.id}/block`, { token: d.token })).status, 204);
  expectProblem(await call('POST', '/api/matching/requests', { token: a.token, body: { candidateId: d.id } }), 404, undefined, 'candidate who blocked me');
  assert.equal((await call('DELETE', `/api/users/${a.id}/block`, { token: d.token })).status, 204);
  for (const [label, body] of [['missing candidateId', {}], ['bad candidateId', { candidateId: 'abc' }], ['message too long', { candidateId: d.id, message: 'x'.repeat(501) }]]) {
    assert.equal((await call('POST', '/api/matching/requests', { token: a.token, body })).status, 400, label);
  }

  // Role and state checks before accepting.
  expectProblem(await call('POST', `/api/matching/requests/${request.id}/accept`, { token: a.token }), 403, 'recipient_only', 'requester accepting');
  expectProblem(await call('POST', `/api/matching/requests/${request.id}/decline`, { token: a.token }), 403, 'recipient_only', 'requester declining');
  expectProblem(await call('POST', `/api/matching/requests/${request.id}/cancel`, { token: b.token }), 403, 'requester_only', 'recipient cancelling');
  expectProblem(await call('POST', `/api/matching/requests/${request.id}/end`, { token: a.token }), 409, 'not_matched', 'ending a pending request');
  assert.equal((await call('POST', `/api/matching/requests/${request.id}/accept`, { token: d.token })).status, 404, 'an outsider cannot accept');

  // 6. Accept: the confirmed match.
  const accepted = await call('POST', `/api/matching/requests/${request.id}/accept`, { token: b.token });
  assert.equal(accepted.status, 200, `accept returned ${accepted.status}: ${accepted.text.slice(0, 300)}`);
  assert.equal(accepted.json.status, 'accepted');
  assert.ok(accepted.json.respondedAt);
  expectProblem(await call('POST', `/api/matching/requests/${request.id}/accept`, { token: b.token }), 409, 'request_not_pending', 'accepting twice');
  expectProblem(await call('POST', `/api/matching/requests/${request.id}/cancel`, { token: a.token }), 409, 'request_not_pending', 'cancelling an accepted request');
  const matchedA = await call('GET', '/api/matching/requests?status=accepted', { token: a.token });
  assert.equal(matchedA.json.totalCount, 1);
  assert.equal(matchedA.json.items[0].partner.userId, b.id);
  assert.equal((await call('GET', '/api/matching/requests?status=accepted', { token: b.token })).json.items[0].partner.userId, a.id);
  const matchedAgain = await call('POST', '/api/matching/requests', { token: b.token, body: { candidateId: a.id } });
  expectProblem(matchedAgain, 409, 'already_matched', 'inviting a matched member');
  assert.equal(matchedAgain.json.request.status, 'accepted');

  // 7. End the match, then invite again; cancel and decline paths.
  const ended = await call('POST', `/api/matching/requests/${request.id}/end`, { token: b.token });
  assert.equal(ended.status, 200);
  assert.equal(ended.json.status, 'ended');
  assert.equal(ended.json.endedBy, b.id);
  assert.ok(ended.json.endedAt);
  expectProblem(await call('POST', `/api/matching/requests/${request.id}/end`, { token: a.token }), 409, 'not_matched', 'ending twice');
  const second = await call('POST', '/api/matching/requests', { token: a.token, body: { candidateId: b.id } });
  assert.equal(second.status, 201, 'a new invitation is allowed after the match ended');
  const cancelled = await call('POST', `/api/matching/requests/${second.json.id}/cancel`, { token: a.token });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.json.status, 'cancelled');
  expectProblem(await call('POST', `/api/matching/requests/${second.json.id}/accept`, { token: b.token }), 409, 'request_not_pending', 'accepting a cancelled request');
  const third = await call('POST', '/api/matching/requests', { token: b.token, body: { candidateId: a.id } });
  assert.equal(third.status, 201);
  const declined = await call('POST', `/api/matching/requests/${third.json.id}/decline`, { token: a.token });
  assert.equal(declined.status, 200);
  assert.equal(declined.json.status, 'declined');
  expectProblem(await call('POST', `/api/matching/requests/${third.json.id}/decline`, { token: a.token }), 409, 'request_not_pending', 'declining twice');

  // 8. A block between the pair stops accept; unblocking lets it through.
  const fourth = await call('POST', '/api/matching/requests', { token: a.token, body: { candidateId: b.id } });
  assert.equal(fourth.status, 201);
  assert.equal((await call('POST', `/api/users/${a.id}/block`, { token: b.token })).status, 204);
  assert.equal((await call('GET', `/api/matching/requests/${fourth.json.id}`, { token: a.token })).json.isBlocked, true);
  expectProblem(await call('POST', `/api/matching/requests/${fourth.json.id}/accept`, { token: b.token }), 403, 'blocked', 'accepting while blocked');
  assert.equal((await call('GET', `/api/matching/requests/${fourth.json.id}`, { token: b.token })).json.status, 'pending', 'the request is untouched by the failed accept');
  assert.equal((await call('DELETE', `/api/users/${a.id}/block`, { token: b.token })).status, 204);
  assert.equal((await call('POST', `/api/matching/requests/${fourth.json.id}/accept`, { token: b.token })).status, 200);

  // 9. Listing: filters, ordering, paging and validation; history is kept as rows.
  const all = await call('GET', '/api/matching/requests?pageSize=50', { token: a.token });
  assert.equal(all.status, 200);
  assert.equal(all.json.totalCount, 4);
  assert.equal(all.json.items[0].id, fourth.json.id, 'most recently changed first');
  assert.deepEqual(
    (await call('GET', '/api/matching/requests?direction=incoming&pageSize=50', { token: a.token })).json.items.map((item) => item.id),
    [third.json.id],
  );
  assert.equal((await call('GET', '/api/matching/requests?direction=outgoing&status=cancelled', { token: a.token })).json.items[0].id, second.json.id);
  const paged = await call('GET', '/api/matching/requests?page=2&pageSize=3', { token: a.token });
  assert.equal(paged.json.items.length, 1);
  assert.equal(paged.json.hasNextPage, false);
  for (const query of ['direction=sideways', 'status=matched', 'pageSize=51']) {
    assert.equal((await call('GET', `/api/matching/requests?${query}`, { token: a.token })).status, 400, `list ${query}`);
  }
  assert.equal(sql(`SELECT count(*) FROM match_requests WHERE '${a.id}' IN (requester_id, recipient_id)`), '4', 'every transition keeps its row');

  // 10. Two members inviting each other at the same moment end up with one request.
  const [fromB, fromD] = await Promise.all([
    call('POST', '/api/matching/requests', { token: b.token, body: { candidateId: d.id } }),
    call('POST', '/api/matching/requests', { token: d.token, body: { candidateId: b.id } }),
  ]);
  assert.deepEqual([fromB.status, fromD.status].sort(), [201, 409], `simultaneous invitations returned ${fromB.status}/${fromD.status}`);
  assert.equal(sql(`SELECT count(*) FROM match_requests WHERE status IN ('pending','accepted') AND '${b.id}' IN (requester_id, recipient_id) AND '${d.id}' IN (requester_id, recipient_id)`), '1');
} finally {
  if (testEmails.length > 0) {
    const emails = `'${testEmails.join("','")}'`;
    // Reviewed reports point at the moderator without a cascade, so drop them first.
    sql(`DELETE FROM user_reports WHERE reporter_id IN (SELECT id FROM users WHERE email IN (${emails})) OR reported_user_id IN (SELECT id FROM users WHERE email IN (${emails}))`);
    sql(`DELETE FROM users WHERE email IN (${emails})`);
  }
}

console.log('PASS: safety + match requests - 401 anonymous; block 204 idempotent hiding both profiles, self 400/unknown 404/staff 403, unblock soft delete and re-block revives the row, blocks list; report 201 open in the moderator queue, reason/details validation 400, other needs details, self 400/unknown 404, hidden member reportable, 409 report_already_open until reviewed; match request pending -> accepted -> ended, cancel and decline, recipient_only/requester_only 403, request_not_pending/not_matched 409, match_request_pending/already_matched 409 with the open request in either direction, hidden/staff/unknown/blocked candidates 404, block stops accept with 403 blocked, outsiders 404, list filters/order/paging/validation, history rows kept, simultaneous opposite invitations produce one request, test data cleaned up.');
