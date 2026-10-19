// Regression check for member feedback, run against a real API and PostgreSQL:
//   POST /api/feedback                       (any signed-in member who finished onboarding)
//   GET  /api/admin/feedback                 (admin, moderator)
//   POST /api/admin/feedback/{id}/review     (admin, moderator)
//   GET  /api/admin/workspace-stats          newFeedback count
// Usage: node scripts/feedback-api-test.mjs http://localhost:5000
// Uses 3 register/login calls of the shared 10-per-60s credentials limit.
// Requires the local PostgreSQL container (override with POSTGRES_CONTAINER) to promote the
// moderator, mark onboarding complete and check stored rows. Every row is removed at the end.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
const container = process.env.POSTGRES_CONTAINER ?? 'roomiematch-postgres-1';
const password = 'RoomieTest123!';
const stamp = Date.now();
const testEmails = [];

const sql = (query) => execFileSync('docker', [
  'exec', container, 'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-t', '-A', '-c', query,
]).toString().trim();

async function call(method, path, { token, body } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, json, text };
}

async function register(label, role) {
  const email = `feedback-${stamp}-${label}@example.com`;
  const reg = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `Feedback ${label}`, city: 'TP.HCM' },
  });
  assert.ok(reg.status === 200 || reg.status === 201, `register ${label}: ${reg.status} ${reg.text.slice(0, 200)}`);
  testEmails.push(email);
  sql(`UPDATE profiles SET onboarding_completed_at = now(), onboarding_data = COALESCE(onboarding_data, '{}'::jsonb) WHERE user_id = '${reg.json.user.id}'`);
  if (!role) return { token: reg.json.accessToken, id: reg.json.user.id };
  sql(`UPDATE users SET role='${role}' WHERE email='${email}'`);
  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200, `login ${label}: ${login.status}`);
  return { token: login.json.accessToken, id: login.json.user.id };
}

async function run() {
  assert.equal((await call('GET', '/health')).status, 200, `API ${baseUrl} is not healthy`);
  const member = await register('member');
  const moderator = await register('mod', 'moderator');

  // Anonymous and invalid submissions are rejected.
  assert.equal((await call('POST', '/api/feedback', { body: { category: 'bug', message: 'Hello world' } })).status, 401);
  for (const body of [
    { category: 'nope', message: 'Nội dung hợp lệ' },
    { category: 'bug', message: 'abc' },
    { category: 'bug', message: 'x'.repeat(2001) },
    { category: 'bug', message: 'Nội dung hợp lệ', rating: 6 },
  ]) {
    const bad = await call('POST', '/api/feedback', { token: member.token, body });
    assert.equal(bad.status, 400, `invalid feedback ${JSON.stringify(body).slice(0, 60)} returned ${bad.status}`);
  }

  const statsBefore = (await call('GET', '/api/admin/workspace-stats', { token: moderator.token })).json.newFeedback;

  const created = await call('POST', '/api/feedback', {
    token: member.token,
    body: { category: 'suggestion', message: '  Thêm bộ lọc theo quận nhé  ', rating: 4, pagePath: '/rooms' },
  });
  assert.equal(created.status, 201, `create returned ${created.status}: ${created.text}`);
  assert.equal(created.json.status, 'new');
  assert.equal(created.json.message, 'Thêm bộ lọc theo quận nhé', 'message should be trimmed');
  assert.equal(created.json.rating, 4);
  const stored = sql(`SELECT user_id||'|'||category||'|'||rating||'|'||page_path FROM user_feedback WHERE id='${created.json.id}'`);
  assert.equal(stored, `${member.id}|suggestion|4|/rooms`);

  // Members cannot read the staff queue.
  assert.equal((await call('GET', '/api/admin/feedback', { token: member.token })).status, 403);
  assert.equal((await call('GET', '/api/admin/feedback?status=bogus', { token: moderator.token })).status, 400);
  assert.equal((await call('GET', '/api/admin/feedback?category=bogus', { token: moderator.token })).status, 400);

  const stats = (await call('GET', '/api/admin/workspace-stats', { token: moderator.token })).json.newFeedback;
  assert.equal(stats, statsBefore + 1, 'workspace-stats.newFeedback should count the new item');

  const list = await call('GET', '/api/admin/feedback?status=new&category=suggestion&pageSize=50', { token: moderator.token });
  assert.equal(list.status, 200);
  const item = list.json.items.find((f) => f.id === created.json.id);
  assert.ok(item, 'new feedback should be in the moderator queue');
  assert.equal(item.userId, member.id);
  assert.equal(item.userName, 'Feedback member');
  assert.equal(item.pagePath, '/rooms');
  assert.equal(list.json.totalCount, Number(sql("SELECT count(*) FROM user_feedback WHERE status='new' AND category='suggestion'")));

  // Members cannot review; moderators can, exactly once.
  assert.equal((await call('POST', `/api/admin/feedback/${created.json.id}/review`, { token: member.token, body: {} })).status, 403);
  const reviewed = await call('POST', `/api/admin/feedback/${created.json.id}/review`, {
    token: moderator.token, body: { staffNote: 'Đã chuyển nhóm sản phẩm' },
  });
  assert.equal(reviewed.status, 204, `review returned ${reviewed.status}: ${reviewed.text}`);
  assert.equal((await call('POST', `/api/admin/feedback/${created.json.id}/review`, { token: moderator.token, body: {} })).status, 404);
  assert.equal(
    sql(`SELECT status||'|'||staff_note||'|'||reviewed_by FROM user_feedback WHERE id='${created.json.id}'`),
    `reviewed|Đã chuyển nhóm sản phẩm|${moderator.id}`,
  );
  assert.equal(sql(`SELECT count(*) FROM staff_audit_logs WHERE target_id='${created.json.id}' AND action='feedback.reviewed'`), '1');
  const reviewedList = await call('GET', '/api/admin/feedback?status=reviewed&pageSize=50', { token: moderator.token });
  const reviewedItem = reviewedList.json.items.find((f) => f.id === created.json.id);
  assert.equal(reviewedItem?.reviewerName, 'Feedback mod');

  // Hourly limit: 5 per member, the 6th gets 429 with a stable code.
  for (let i = 0; i < 4; i += 1) {
    assert.equal((await call('POST', '/api/feedback', { token: member.token, body: { category: 'other', message: `Góp ý số ${i}` } })).status, 201);
  }
  const limited = await call('POST', '/api/feedback', { token: member.token, body: { category: 'other', message: 'Góp ý thứ sáu' } });
  assert.equal(limited.status, 429);
  assert.equal(limited.json?.code, 'feedback_rate_limited');

  console.log('feedback API test passed');
}

const cleanup = () => {
  if (testEmails.length === 0) return;
  const emails = testEmails.map((e) => `'${e}'`).join(',');
  sql(`DELETE FROM staff_audit_logs WHERE target_id IN (SELECT f.id FROM user_feedback f JOIN users u ON u.id = f.user_id WHERE u.email IN (${emails}))`);
  sql(`DELETE FROM user_feedback WHERE user_id IN (SELECT id FROM users WHERE email IN (${emails}))`);
  sql(`DELETE FROM users WHERE email IN (${emails})`);
};

try {
  await run();
} finally {
  cleanup();
}
