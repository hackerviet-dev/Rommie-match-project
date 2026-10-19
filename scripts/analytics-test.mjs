import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(new URL('../frontend/web-app/rommie-match/package.json', import.meta.url));
const { build } = require('esbuild');

async function setup(hostname, production = true) {
  const { outputFiles } = await build({
    entryPoints: ['frontend/web-app/rommie-match/src/services/analytics.ts'],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    define: { 'import.meta.env.PROD': String(production) },
  });
  const scripts = [];
  const context = {
    exports: {}, module: { exports: {} },
    window: { location: { hostname } },
    document: {
      getElementById: (id) => scripts.find((s) => s.id === id),
      createElement: () => ({}),
      head: { appendChild: (script) => scripts.push(script) },
    },
  };
  vm.runInNewContext(outputFiles[0].text, context);
  return { track: context.module.exports.trackPageView, scripts, window: context.window };
}

for (const [host, prod] of [['localhost', true], ['preview.vercel.app', true], ['rommie-match.vercel.app', false]]) {
  const app = await setup(host, prod);
  app.track('/');
  assert.equal(app.scripts.length, 0, 'Development and preview must not load GA');
}
const app = await setup('rommie-match.vercel.app');
app.track('/');
app.track('/');
app.track('/rooms/123');
app.track('/rooms/123');
app.track('/moderator/analytics');
app.track('/chat/private-conversation');
app.track('/profile/private-user');
app.track('/rooms/11aabbcc-1111-4444-8888-aabbccddeeff');
app.track('/services');
const calls = Array.from(app.window.dataLayer, (args) => Array.from(args));
assert.equal(app.scripts.length, 1, 'Only one GA tag is loaded');
assert.match(app.scripts[0].src, /G-0T70YWM8D8$/);
assert.equal(calls.filter(([command]) => command === 'config').length, 1);
assert.equal(calls[1][2].send_page_view, false, 'Automatic page views must be disabled');
assert.equal(calls[1][2].allow_google_signals, false);
const views = calls.filter(([command, event]) => command === 'event' && event === 'page_view');
assert.deepEqual(views.map(([, , data]) => data.page_location), [
  'https://rommie-match.vercel.app/',
  'https://rommie-match.vercel.app/rooms/:id',
  'https://rommie-match.vercel.app/rooms/:id',
  'https://rommie-match.vercel.app/services',
]);
assert.equal(views[2][2].page_referrer, '', 'Private routes are not sent as referrers');
assert.ok(!JSON.stringify(calls).includes('private-'));
console.log('GA4 checks passed: production scope, initialization, deduplication, private routes, ID redaction.');
