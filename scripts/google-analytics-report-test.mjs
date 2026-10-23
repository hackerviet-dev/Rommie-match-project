// Regression check for the staff analytics dashboard API, against a real API and PostgreSQL but
// a fake Google (token endpoint + GA4 Data API), so no real service account is needed:
//   GET /api/admin/analytics/report?days=7|28|90   (admin, moderator)
// Usage: node scripts/google-analytics-report-test.mjs
// Builds nothing: run `dotnet build` on the Bootstrapper first. The script starts the API itself
// twice (without and with a service account key) on API_PORT (default 5099), and needs the local
// PostgreSQL container to promote a test account (override with POSTGRES_CONTAINER).
// Spends 3 of the 10-per-minute credential requests.
// Covers: 503 not_configured without a key; 401 anonymous, 403 member, 400 for days outside
// 7/28/90; the JWT sent to the token endpoint is RS256-signed by the key's private_key with the
// analytics.readonly scope; 502 permission_denied (with the service account email) when GA4
// answers 403, and that failure is not cached; 200 maps totals for both date ranges, fills days
// GA left out with zeros, keeps the top pages/channels/devices/cities order and reports realtime
// users; a second request within 10 minutes is served from the cache without calling Google.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createVerify, generateKeyPairSync } from 'node:crypto';

const container = process.env.POSTGRES_CONTAINER ?? 'roomiematch-postgres-1';
const apiPort = Number(process.env.API_PORT ?? 5099);
const baseUrl = `http://127.0.0.1:${apiPort}`;
const password = 'RoomieTest123!';
const stamp = Date.now();
const emails = [];
const serviceEmail = 'dashboard@roomiematch-test.iam.gserviceaccount.com';

const sql = (query) => execFileSync('docker', [
  'exec', container, 'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-t', '-A', '-c', query,
]).toString().trim();

// ---- Fake Google ---------------------------------------------------------------------------
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const google = { mode: 'ok', tokenCalls: 0, dataCalls: 0, assertions: [], batches: [] };
const fmt = (date) => date.toISOString().slice(0, 10).replaceAll('-', '');
const vnToday = new Date(Date.now() + 7 * 3600_000);
const daysAgo = (n) => new Date(vnToday.getTime() - n * 86400_000);
const row = (dims, metrics) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value: String(value) })),
});

const fake = createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  const send = (status, json) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(json));
  };
  if (req.url === '/token') {
    google.tokenCalls++;
    google.assertions.push(new URLSearchParams(body));
    return send(200, { access_token: 'fake-access-token', expires_in: 3600, token_type: 'Bearer' });
  }
  google.dataCalls++;
  assert.equal(req.headers.authorization, 'Bearer fake-access-token');
  if (google.mode === 'forbidden') {
    return send(403, { error: { code: 403, message: 'User does not have sufficient permissions for this property.' } });
  }
  if (req.url.endsWith('/v1beta/properties/559419688:runRealtimeReport')) {
    return send(200, { rows: [row([], [4])] });
  }
  assert.ok(req.url.endsWith('/v1beta/properties/559419688:batchRunReports'), req.url);
  const { requests } = JSON.parse(body);
  google.batches.push(requests);
  const reports = requests.map((request) => {
    const dimension = request.dimensions?.[0]?.name;
    switch (dimension) {
      case undefined: return { rows: [row(['current'], [120, 80, 300, 900, 95.25, 0.6345]), row(['previous'], [100, 70, 250, 800, 80, 0.5])] };
      // Only two days have traffic; the API must fill the rest of the range with zeros.
      case 'date': return { rows: [row([fmt(daysAgo(3))], [10, 5, 40]), row([fmt(daysAgo(0))], [12, 6, 50])] };
      case 'pagePath': return { rows: [row(['/'], [500, 90]), row(['/rooms/:id'], [300, 60])] };
      case 'sessionDefaultChannelGroup': return { rows: [row(['Direct'], [200]), row(['Organic Search'], [100])] };
      case 'deviceCategory': return { rows: [row(['mobile'], [90]), row(['desktop'], [30])] };
      case 'city': return { rows: [row(['Ho Chi Minh City'], [70]), row(['Hanoi'], [40])] };
      default: return send(400, { error: { message: `unexpected dimension ${dimension}` } });
    }
  });
  send(200, { reports });
});
await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve));
const googleUrl = `http://127.0.0.1:${fake.address().port}`;

// ---- API process ---------------------------------------------------------------------------
async function startApi(extraEnv) {
  const api = spawn('dotnet', ['run', '--no-build', '--no-launch-profile', '--project', 'backend/src/RoomieMatch.Bootstrapper'], {
    env: { ...process.env, ASPNETCORE_URLS: baseUrl, ASPNETCORE_ENVIRONMENT: 'Development', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  api.stdout.on('data', (d) => { log += d; });
  api.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${baseUrl}/health`)).ok) return api;
    } catch { /* not listening yet */ }
    if (api.exitCode !== null) throw new Error(`API exited early:\n${log}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  api.kill();
  throw new Error(`API did not start:\n${log}`);
}

async function stopApi(api) {
  api.kill();
  await new Promise((resolve) => (api.exitCode !== null ? resolve() : api.once('exit', resolve)));
}

async function call(path, token) {
  const response = await fetch(baseUrl + path, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
}

async function register(label, role) {
  const email = `ga-report-${stamp}-${label}@example.com`;
  const post = (path, body) => fetch(baseUrl + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json() }));
  const created = await post('/api/auth/register', { email, password, displayName: `GA ${label}`, city: 'TP.HCM' });
  assert.ok([200, 201].includes(created.status), `register ${label}: ${created.status}`);
  emails.push(email);
  if (!role) return created.json.accessToken;
  sql(`UPDATE users SET role='${role}' WHERE email='${email}'`);
  const login = await post('/api/auth/login', { email, password });
  assert.equal(login.status, 200);
  return login.json.accessToken;
}

let api;
try {
  // 1. No key: the API still starts and answers 503.
  api = await startApi({ GoogleAnalytics__ServiceAccountJson: '' });
  const member = await register('member');
  const moderator = await register('moderator', 'moderator');
  assert.equal((await call('/api/admin/analytics/report')).status, 401, 'anonymous');
  assert.equal((await call('/api/admin/analytics/report', member)).status, 403, 'member');
  assert.equal((await call('/api/admin/analytics/report?days=5', moderator)).status, 400, 'days=5');
  const unconfigured = await call('/api/admin/analytics/report', moderator);
  assert.equal(unconfigured.status, 503);
  assert.equal(unconfigured.json.code, 'not_configured');
  await stopApi(api);

  // 2. With a key (base64 form) pointed at the fake Google.
  const key = JSON.stringify({ type: 'service_account', client_email: serviceEmail, private_key: privateKey });
  api = await startApi({
    GoogleAnalytics__ServiceAccountJson: Buffer.from(key).toString('base64'),
    GoogleAnalytics__TokenUri: `${googleUrl}/token`,
    GoogleAnalytics__DataApiBaseUrl: googleUrl,
  });

  google.mode = 'forbidden';
  const denied = await call('/api/admin/analytics/report?days=7', moderator);
  assert.equal(denied.status, 502);
  assert.equal(denied.json.code, 'permission_denied');
  assert.ok(denied.json.detail.includes(serviceEmail), 'names the service account to add in GA4');

  const [assertion] = google.assertions;
  assert.equal(assertion.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  const [header, payload, signature] = assertion.get('assertion').split('.');
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${header}.${payload}`);
  assert.ok(verifier.verify(publicKey, Buffer.from(signature, 'base64url')), 'JWT signed with private_key');
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.iss, serviceEmail);
  assert.equal(claims.aud, `${googleUrl}/token`);
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/analytics.readonly');
  assert.equal(claims.exp - claims.iat, 3600);

  google.mode = 'ok';
  const ok = await call('/api/admin/analytics/report?days=7', moderator);
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  const report = ok.json;
  assert.equal(report.days, 7);
  assert.equal(report.realtimeActiveUsers, 4);
  assert.deepEqual(report.current, { activeUsers: 120, newUsers: 80, sessions: 300, pageViews: 900, averageSessionSeconds: 95.3, engagementRate: 0.6345 });
  assert.deepEqual(report.previous, { activeUsers: 100, newUsers: 70, sessions: 250, pageViews: 800, averageSessionSeconds: 80, engagementRate: 0.5 });
  assert.equal(report.daily.length, 7, 'every day of the range is present');
  assert.deepEqual(report.daily.map((d) => d.date.replaceAll('-', '')), [6, 5, 4, 3, 2, 1, 0].map((n) => fmt(daysAgo(n))));
  assert.deepEqual(report.daily.map((d) => d.activeUsers), [0, 0, 0, 10, 0, 0, 12]);
  assert.deepEqual(report.topPages, [{ path: '/', views: 500, users: 90 }, { path: '/rooms/:id', views: 300, users: 60 }]);
  assert.deepEqual(report.channels.map((s) => s.label), ['Direct', 'Organic Search']);
  assert.deepEqual(report.devices, [{ label: 'mobile', value: 90 }, { label: 'desktop', value: 30 }]);
  assert.deepEqual(report.cities.map((s) => s.value), [70, 40]);

  const [batchA] = google.batches;
  assert.deepEqual(batchA[0].dateRanges, [
    { startDate: '6daysAgo', endDate: 'today', name: 'current' },
    { startDate: '13daysAgo', endDate: '7daysAgo', name: 'previous' },
  ]);
  assert.equal(google.batches.length, 2, 'six reports in two batches');

  const callsBefore = google.dataCalls;
  assert.equal((await call('/api/admin/analytics/report?days=7', moderator)).status, 200);
  assert.equal(google.dataCalls, callsBefore, 'second request is served from cache');
  assert.equal(google.tokenCalls, 1, 'access token is reused');

  console.log('GA4 report checks passed: auth, validation, not configured, permission denied, JWT, mapping, gap fill, cache.');
} finally {
  if (api) await stopApi(api);
  fake.close();
  if (emails.length) sql(`DELETE FROM users WHERE email IN (${emails.map((e) => `'${e}'`).join(',')})`);
}
