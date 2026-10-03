// Regression check for "Hồ sơ đã lưu", run against a real API and PostgreSQL:
//   POST   /api/users/{userId}/save          DELETE /api/users/{userId}/save
//   GET    /api/users/me/saved-profiles      GET    /api/users/me/saved-profiles/ids
// Usage: node scripts/saved-profiles-api-test.mjs http://localhost:5000
// Requires the local PostgreSQL container to promote a moderator, hide a profile, read rows
// back and clean up (override the container with POSTGRES_CONTAINER).
// Covers: 401 anonymous everywhere; save is idempotent and keeps the first saved time, refuses
// self (400 self_target), unknown/hidden/staff/blocked targets (404); list is newest first with
// profile fields, paging and pageSize validation, and is private to the caller; ids match the
// list; unsave is a soft delete (row kept, deleted_at set), idempotent, and saving again revives
// the same row; a profile that turns private or gets blocked drops out of the list and comes
// back once visible again.
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
  return { status: response.status, json, text };
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
  const email = `saved-${label}-${stamp}@example.com`;
  const { status, json } = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `Saved ${label}`, city: 'TP.HCM' },
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

const savedIds = async (token) => (await call('GET', '/api/users/me/saved-profiles/ids', { token })).json;
const savedList = async (token, query = '') => call('GET', `/api/users/me/saved-profiles${query}`, { token });

try {
  const a = await register('a');
  const b = await register('b');
  const c = await register('c');
  const d = await register('d');
  const hidden = await register('hidden');
  const moderator = await register('mod', 'moderator');
  sql(`UPDATE profiles SET is_public = false WHERE user_id = '${hidden.id}'`);
  const unknownId = crypto.randomUUID();

  // 1. Everything needs a signed-in caller.
  for (const [method, path] of [
    ['POST', `/api/users/${b.id}/save`],
    ['DELETE', `/api/users/${b.id}/save`],
    ['GET', '/api/users/me/saved-profiles'],
    ['GET', '/api/users/me/saved-profiles/ids'],
  ]) {
    assert.equal((await call(method, path)).status, 401, `anonymous ${method} ${path}`);
  }

  // 2. Save: 204, idempotent, first saved time kept.
  assert.deepEqual(await savedIds(a.token), [], 'a starts with nothing saved');
  assert.equal((await call('POST', `/api/users/${b.id}/save`, { token: a.token })).status, 204);
  const firstSavedAt = sql(`SELECT created_at FROM saved_profiles WHERE user_id='${a.id}' AND saved_user_id='${b.id}'`);
  assert.equal((await call('POST', `/api/users/${b.id}/save`, { token: a.token })).status, 204, 'saving twice is still 204');
  assert.equal(sql(`SELECT count(*) FROM saved_profiles WHERE user_id='${a.id}' AND saved_user_id='${b.id}'`), '1');
  assert.equal(sql(`SELECT created_at FROM saved_profiles WHERE user_id='${a.id}' AND saved_user_id='${b.id}'`), firstSavedAt, 'saving again keeps the first saved time');
  sql(`UPDATE saved_profiles SET created_at = now() - interval '1 minute' WHERE user_id='${a.id}' AND saved_user_id='${b.id}'`);
  assert.equal((await call('POST', `/api/users/${c.id}/save`, { token: a.token })).status, 204);

  // Refusals: self, unknown, private, staff.
  expectProblem(await call('POST', `/api/users/${a.id}/save`, { token: a.token }), 400, 'self_target', 'self save');
  expectProblem(await call('POST', `/api/users/${unknownId}/save`, { token: a.token }), 404, undefined, 'unknown save');
  expectProblem(await call('POST', `/api/users/${hidden.id}/save`, { token: a.token }), 404, undefined, 'hidden save');
  expectProblem(await call('POST', `/api/users/${moderator.id}/save`, { token: a.token }), 404, undefined, 'staff save');
  assert.equal(sql(`SELECT count(*) FROM saved_profiles WHERE user_id='${a.id}'`), '2', 'refused saves insert nothing');

  // 3. List: newest first, profile fields, private to the caller, paging.
  const list = await savedList(a.token);
  assert.equal(list.status, 200, `list returned ${list.status}: ${list.text.slice(0, 300)}`);
  assert.equal(list.json.totalCount, 2);
  assert.deepEqual(list.json.items.map((item) => item.userId), [c.id, b.id]);
  assert.equal(list.json.items[1].displayName, 'Saved b');
  assert.equal(list.json.items[1].city, 'TP.HCM');
  assert.ok(list.json.items[1].savedAt);
  assert.equal(typeof list.json.items[1].isVerified, 'boolean');
  assert.equal(typeof list.json.items[1].profileCompletion, 'number');
  assert.deepEqual(await savedIds(a.token), [c.id, b.id], 'ids match the list order');
  assert.equal((await savedList(b.token)).json.totalCount, 0, 'b has saved nobody');
  const page2 = await savedList(a.token, '?page=2&pageSize=1');
  assert.deepEqual(page2.json.items.map((item) => item.userId), [b.id]);
  assert.equal(page2.json.totalCount, 2);
  assert.equal(page2.json.hasNextPage, false);
  assert.equal((await savedList(a.token, '?pageSize=51')).status, 400);

  // 4. Unsave: soft delete, idempotent; saving again revives the same row.
  assert.equal((await call('DELETE', `/api/users/${b.id}/save`, { token: a.token })).status, 204);
  assert.equal(sql(`SELECT deleted_at IS NOT NULL FROM saved_profiles WHERE user_id='${a.id}' AND saved_user_id='${b.id}'`), 't', 'unsave keeps the row with deleted_at');
  assert.equal((await call('DELETE', `/api/users/${b.id}/save`, { token: a.token })).status, 204, 'unsaving twice is still 204');
  assert.equal((await call('DELETE', `/api/users/${unknownId}/save`, { token: a.token })).status, 204, 'unsaving an unknown id is a no-op');
  assert.deepEqual(await savedIds(a.token), [c.id]);
  assert.equal((await call('POST', `/api/users/${b.id}/save`, { token: a.token })).status, 204);
  assert.equal(sql(`SELECT count(*) || ':' || bool_and(deleted_at IS NULL) FROM saved_profiles WHERE user_id='${a.id}' AND saved_user_id='${b.id}'`), '1:true', 're-save revives the single row');
  assert.deepEqual(await savedIds(a.token), [b.id, c.id], 'a revived save counts as the newest');

  // 5. Visibility follows the profile: private or blocked drops out, then comes back.
  sql(`UPDATE profiles SET is_public = false WHERE user_id = '${c.id}'`);
  assert.deepEqual(await savedIds(a.token), [b.id], 'a profile turned private drops out');
  assert.equal((await savedList(a.token)).json.totalCount, 1, 'count agrees with the items');
  sql(`UPDATE profiles SET is_public = true WHERE user_id = '${c.id}'`);
  assert.deepEqual(await savedIds(a.token), [b.id, c.id], 'it comes back once public again');

  assert.equal((await call('POST', `/api/users/${a.id}/block`, { token: b.token })).status, 204, 'b blocks a');
  assert.deepEqual(await savedIds(a.token), [c.id], 'a block by the saved member hides it');
  expectProblem(await call('POST', `/api/users/${b.id}/save`, { token: a.token }), 404, undefined, 'save while blocked');
  assert.equal((await call('DELETE', `/api/users/${a.id}/block`, { token: b.token })).status, 204);
  assert.deepEqual(await savedIds(a.token), [b.id, c.id], 'unblocking brings it back');

  assert.equal((await call('POST', `/api/users/${d.id}/block`, { token: a.token })).status, 204, 'a blocks d');
  expectProblem(await call('POST', `/api/users/${d.id}/save`, { token: a.token }), 404, undefined, 'save someone you blocked');
  assert.equal((await call('DELETE', `/api/users/${d.id}/block`, { token: a.token })).status, 204);
  assert.equal((await call('POST', `/api/users/${d.id}/save`, { token: a.token })).status, 204, 'saving works after unblocking');
} finally {
  if (testEmails.length > 0) {
    sql(`DELETE FROM users WHERE email IN ('${testEmails.join("','")}')`);
  }
}

console.log('PASS: saved profiles - 401 anonymous; save 204 idempotent keeping the first saved time, self 400 self_target, unknown/hidden/staff/blocked 404; list newest first with profile fields, private per caller, paging and pageSize 400; ids match the list; unsave soft delete idempotent and re-save revives the row; private or blocked profiles drop out and return when visible again; test data cleaned up.');
