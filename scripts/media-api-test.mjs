// Regression check for image uploads (Cloudinary) and image messages in chat, run against a real
// API and PostgreSQL:
//   GET  /api/media/health
//   POST /api/media/images                                   (multipart: file, purpose)
//   PUT  /api/users/me/profile                               (avatarUrl from an upload)
//   POST /api/chat/conversations/{conversationId}/messages   ({content, imageUrl})
// Usage: node scripts/media-api-test.mjs http://localhost:5000
// Requires the local PostgreSQL container for cleanup (override with POSTGRES_CONTAINER).
// Without Cloudinary credentials on the API (CLOUDINARY_URL) every check that does not need
// storage still runs and a valid image must answer 503; with them, real uploads are made into
// <folder>/avatars|chat/<user id>/ and the accept paths are checked too.
// Covers: 401 anonymous, 400 for missing file / bad purpose / non-image bytes / a file named .jpg
// that is not one, 413 above 5 MB, chat image messages refusing outside links, another member's
// upload, an avatar upload and malformed URLs with 400, blank message without image 400, text
// messages unchanged (imageUrl null); when configured also upload 200 with a URL in the caller's
// folder, avatar saved on the profile, image-only and captioned image messages 200 and listed in
// history and as lastMessage.
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

async function call(method, path, { token, body, form } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
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

function imageForm(bytes, { purpose = 'chat', name = 'photo.png', type = 'image/png' } = {}) {
  const form = new FormData();
  if (bytes) form.append('file', new Blob([bytes], { type }), name);
  if (purpose !== null) form.append('purpose', purpose);
  return form;
}

// A valid 1x1 PNG.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);
const media = await call('GET', '/api/media/health');
assert.equal(media.status, 200, `media health returned ${media.status}`);
const configured = media.json.configured === true;
assert.equal(media.json.maxImageBytes, 5 * 1024 * 1024);

const stamp = Date.now();
const testEmails = [];

async function register(label) {
  const email = `media-${label}-${stamp}@example.com`;
  const { status, json } = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `Media ${label}`, city: 'TP.HCM' },
  });
  assert.ok(status === 200 || status === 201, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  testEmails.push(email);
  return { token: json.accessToken, id: json.user.id };
}

try {
  const a = await register('a');
  const b = await register('b');

  // 1. Uploading needs a signed-in caller.
  assert.equal((await call('POST', '/api/media/images', { form: imageForm(png) })).status, 401, 'anonymous upload');

  // 2. Bad requests are refused whether or not storage is configured.
  for (const [label, form, expected] of [
    ['missing file', imageForm(null), 400],
    ['missing purpose', imageForm(png, { purpose: null }), 400],
    ['unknown purpose', imageForm(png, { purpose: 'room' }), 400],
    ['text file', imageForm(Buffer.from('hello world, not an image'), { name: 'note.txt', type: 'text/plain' }), 400],
    ['text named .jpg', imageForm(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), { name: 'x.jpg', type: 'image/jpeg' }), 400],
    ['over 5 MB', imageForm(Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)])), 413],
  ]) {
    const response = await call('POST', '/api/media/images', { token: a.token, form });
    assert.equal(response.status, expected, `${label} returned ${response.status}: ${response.text.slice(0, 200)}`);
  }

  // 3. Chat image messages only take the sender's own chat uploads.
  const conversation = await call('POST', '/api/chat/conversations', { token: a.token, body: { userId: b.id } });
  assert.equal(conversation.status, 200);
  const messagesPath = `/api/chat/conversations/${conversation.json.id}/messages`;
  for (const [label, body] of [
    ['outside link', { imageUrl: 'https://example.com/cat.jpg' }],
    ['cloudinary link of another account', { imageUrl: `https://res.cloudinary.com/someone-else/image/upload/v1/roomiematch/chat/${a.id}/abc.jpg` }],
    ['not a url', { imageUrl: 'javascript:alert(1)' }],
    ['blank without image', { content: '   ' }],
    ['nothing at all', {}],
  ]) {
    const response = await call('POST', messagesPath, { token: a.token, body });
    assert.equal(response.status, 400, `${label} returned ${response.status}`);
  }
  const text = await call('POST', messagesPath, { token: a.token, body: { content: 'chỉ có chữ' } });
  assert.equal(text.status, 200);
  assert.equal(text.json.imageUrl, null, 'a text message has no image');

  // 4. A valid image: 503 without storage, otherwise a real upload.
  const upload = await call('POST', '/api/media/images', { token: a.token, form: imageForm(png) });
  if (!configured) {
    assert.equal(upload.status, 503, `unconfigured upload returned ${upload.status}`);
  } else {
    assert.equal(upload.status, 200, `upload returned ${upload.status}: ${upload.text.slice(0, 300)}`);
    assert.match(upload.json.url, new RegExp(`^https://res\\.cloudinary\\.com/[^/]+/image/upload/v\\d+/.+/chat/${a.id}/[A-Za-z0-9_-]+\\.png$`));
    assert.equal(upload.json.width, 1);
    assert.equal(upload.json.format, 'png');

    const imageOnly = await call('POST', messagesPath, { token: a.token, body: { imageUrl: upload.json.url } });
    assert.equal(imageOnly.status, 200, `image message returned ${imageOnly.status}: ${imageOnly.text}`);
    assert.equal(imageOnly.json.imageUrl, upload.json.url);
    assert.equal(imageOnly.json.content, '');
    const captioned = await call('POST', messagesPath, { token: a.token, body: { content: '  phòng nè  ', imageUrl: upload.json.url } });
    assert.equal(captioned.status, 200);
    assert.equal(captioned.json.content, 'phòng nè');

    // B may not pass off A's upload, nor may A send an avatar upload as a chat image.
    assert.equal((await call('POST', messagesPath, { token: b.token, body: { imageUrl: upload.json.url } })).status, 400, 'another member\'s upload');
    const avatar = await call('POST', '/api/media/images', { token: a.token, form: imageForm(png, { purpose: 'avatar' }) });
    assert.equal(avatar.status, 200);
    assert.match(avatar.json.url, new RegExp(`/avatars/${a.id}/`));
    assert.equal((await call('POST', messagesPath, { token: a.token, body: { imageUrl: avatar.json.url } })).status, 400, 'avatar upload used as chat image');

    const history = await call('GET', messagesPath, { token: b.token });
    assert.equal(history.json.items[0].imageUrl, upload.json.url, 'newest message carries the image');
    assert.equal(history.json.items.filter((message) => message.imageUrl).length, 2);
    const listed = await call('GET', `/api/chat/conversations/${conversation.json.id}`, { token: b.token });
    assert.equal(listed.json.lastMessage.imageUrl, upload.json.url);

    // The avatar URL saves on the profile like any other.
    const profile = (await call('GET', '/api/users/me/profile', { token: a.token })).json;
    const saved = await call('PUT', '/api/users/me/profile', {
      token: a.token,
      body: { displayName: profile.displayName, city: profile.city, avatarUrl: avatar.json.url },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.json.avatarUrl, avatar.json.url);
  }
} finally {
  if (testEmails.length > 0) {
    const ids = sql(`SELECT string_agg(id::text, ',') FROM users WHERE email IN ('${testEmails.join("','")}')`);
    if (ids) {
      const list = ids.split(',').map((id) => `'${id}'`).join(',');
      sql(`DELETE FROM conversations WHERE id IN (SELECT conversation_id FROM conversation_members WHERE user_id IN (${list}))`);
    }
    sql(`DELETE FROM users WHERE email IN ('${testEmails.join("','")}')`);
  }
}

console.log(`PASS: media uploads + chat images (Cloudinary ${configured ? 'configured: real uploads checked' : 'NOT configured: valid upload answered 503'}) - 401 anonymous, 400 missing file/purpose/unknown purpose/non-image bytes, 413 over 5 MB, chat refuses outside/foreign/malformed image URLs and blank messages, text messages keep imageUrl null${configured ? ', upload lands in the caller\'s folder, image-only and captioned messages saved and listed, other member\'s and avatar uploads refused in chat, avatar saved on profile' : ''}, test data cleaned up.`);
process.exit(0);
