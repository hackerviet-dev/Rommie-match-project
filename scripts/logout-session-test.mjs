import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const require = createRequire(process.cwd() + '/frontend/web-app/rommie-match/package.json');
await mkdir('tmp/auth', { recursive: true });
await require('esbuild').build({
  entryPoints: ['frontend/web-app/rommie-match/src/services/api-client.ts', 'frontend/web-app/rommie-match/src/services/token-storage.ts'],
  bundle: true, platform: 'node', format: 'cjs', outdir: 'tmp/auth/logout', outExtension: { '.js': '.cjs' },
  define: { 'import.meta.env.VITE_API_BASE_URL': '"http://localhost:5000"', 'import.meta.env.VITE_API_URL': '""' },
});
function storage() {
  const values = new Map();
  return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
}
globalThis.sessionStorage = storage();
globalThis.localStorage = storage();
globalThis.window = new EventTarget();
const { tokenStorage, SESSION_ENDED_KEY } = require(process.cwd() + '/tmp/auth/logout/token-storage.cjs');
const { apiClient } = require(process.cwd() + '/tmp/auth/logout/api-client.cjs');
let events = 0;
window.addEventListener('roomiematch-session-ended', () => events++);
for (const replacement of [false, true]) {
  tokenStorage.setTokens('old-access', 'old-refresh');
  let finishRefresh;
  let markStarted;
  const started = new Promise(resolve => { markStarted = resolve; });
  globalThis.fetch = async url => {
    if (url.endsWith('/api/auth/refresh')) {
      markStarted();
      return new Promise(resolve => { finishRefresh = resolve; });
    }
    return new Response('', { status: 401 });
  };
  const pending = apiClient('/api/users/me/profile', { authenticated: true });
  const rejected = assert.rejects(pending, e => e.status === 401);
  await started;
  tokenStorage.clear();
  assert.equal(tokenStorage.getAccessToken(), null);
  assert.equal(tokenStorage.getRefreshToken(), null);
  assert.ok(localStorage.getItem(SESSION_ENDED_KEY));
  if (replacement) tokenStorage.setTokens('new-access', 'new-refresh');
  finishRefresh(Response.json({ accessToken: 'late-access', refreshToken: 'late-refresh' }));
  await rejected;
  assert.equal(tokenStorage.getAccessToken(), replacement ? 'new-access' : null);
  assert.equal(tokenStorage.getRefreshToken(), replacement ? 'new-refresh' : null);
}
const signal = localStorage.getItem(SESSION_ENDED_KEY);
tokenStorage.clear(false);
assert.equal(localStorage.getItem(SESSION_ENDED_KEY), signal);
assert.equal(events, 3);
console.log('PASS: logout clears credentials and broadcasts; late refresh cannot restore logout or overwrite a new login; peer clear does not rebroadcast.');
