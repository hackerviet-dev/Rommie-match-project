import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
await mkdir('tmp/routes', { recursive: true });
const require = createRequire(process.cwd() + '/frontend/web-app/rommie-match/package.json');
await require('esbuild').build({ entryPoints: ['frontend/web-app/rommie-match/src/features/auth/utils/actor-home.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: 'tmp/routes/actor-home.cjs', tsconfig: 'frontend/web-app/rommie-match/tsconfig.json' });
const { getActorHome, getLoginDestination } = require(process.cwd() + '/tmp/routes/actor-home.cjs');
assert.equal(getActorHome('moderator'), '/moderator');
assert.equal(getActorHome('admin'), '/admin');
assert.equal(getActorHome('member'), '/dashboard');
assert.equal(getLoginDestination('moderator', '/admin/rooms?page=2#queue'), '/moderator/rooms?page=2#queue');
assert.equal(getLoginDestination('admin', '/moderator/users/123'), '/admin/users/123');
for (const path of ['/moderator/rooms', '/admin/users', '//evil.test', '/\\evil.test'])
  assert.equal(getLoginDestination('member', path), '/dashboard');
assert.equal(getLoginDestination('moderator', '/rooms/123'), '/rooms/123');
console.log('PASS: role-specific homes, legacy staff deep links, query/hash preserved, member isolation and unsafe redirects rejected.');
