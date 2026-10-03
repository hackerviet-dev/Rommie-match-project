import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.TEST_API_URL ?? 'http://localhost:5000';
const container = process.env.POSTGRES_CONTAINER ?? 'roomiematch-postgres-1';
const email = `login-errors-${crypto.randomUUID()}@example.test`;
const password = 'LocalLoginTest123!';
let userId;
function sql(query) {
  return execFileSync('docker', ['exec', container, 'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-v', 'ON_ERROR_STOP=1', '-c', query], { encoding: 'utf8' });
}
async function post(path, body) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
function error(result, code, message) {
  assert.equal(result.status, 401);
  assert.equal(result.body.code, code);
  assert.ok(result.body.detail.includes(message));
  assert.equal(result.body.accessToken, undefined);
}
try {
  error(await post('/api/auth/login', { email, password }), 'email_not_registered', 'chưa được đăng ký');
  const registered = await post('/api/auth/register', { email, password, displayName: 'Login Error Test', city: 'TP.HCM', gender: 'male' });
  assert.equal(registered.status, 200);
  userId = registered.body.user.id;
  assert.match(userId, /^[0-9a-f-]{36}$/);
  error(await post('/api/auth/login', { email, password: 'IncorrectPassword1!' }), 'incorrect_password', 'Mật khẩu không đúng');
  assert.equal((await post('/api/auth/login', { email: email.toUpperCase(), password })).status, 200);
  sql(`UPDATE users SET is_active=false WHERE id='${userId}'`);
  const disabled = await post('/api/auth/login', { email, password });
  assert.equal(disabled.status, 403);
  assert.ok(disabled.body.detail.includes('vô hiệu'));
  sql(`UPDATE users SET is_active=true, password_hash=NULL WHERE id='${userId}'`);
  error(await post('/api/auth/login', { email, password }), 'password_login_unavailable', 'chưa có mật khẩu');
  assert.equal((await post('/api/auth/login', { email: 'invalid-email', password })).status, 400);
  console.log('PASS: unknown email, wrong password, normalized email/correct login, disabled account, no password and invalid email; no failed login issues tokens.');
} finally {
  if (userId) sql(`DELETE FROM users WHERE id='${userId}' AND email='${email}'`);
}
