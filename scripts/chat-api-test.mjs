// Regression check for member chat, REST and SignalR realtime, run against a real API and
// PostgreSQL:
//   POST /api/chat/conversations
//   GET  /api/chat/conversations
//   GET  /api/chat/conversations/{conversationId}
//   GET  /api/chat/conversations/{conversationId}/messages
//   POST /api/chat/conversations/{conversationId}/messages
//   POST /api/chat/conversations/{conversationId}/read
//   SignalR /hubs/chat (SendMessage, MarkRead, Typing; MessageReceived, ConversationRead, Typing)
// Usage: node scripts/chat-api-test.mjs http://localhost:5000
// Needs Node 22+ (global WebSocket). Requires the local PostgreSQL container to seed a block and
// hide a profile (there is no member API to block or report yet) and for cleanup (override the
// container with POSTGRES_CONTAINER).
// Covers: 401 anonymous on REST and on the hub, start conversation 200 and idempotent in both
// directions, self/unknown/hidden/staff recipients 403, a third member 404 on every endpoint,
// send 200 trimmed with 400 for blank/too long, keyset history with beforeId/limit/hasMore,
// unreadCount and lastMessage in the list, mark read setting readAt and zeroing unreadCount,
// realtime MessageReceived to both members' connections (not to outsiders), ConversationRead,
// Typing to the other side only, hub SendMessage/MarkRead return values and HubException errors,
// and a block (either direction) setting isBlocked, refusing send/typing/new conversations with 403
// while history stays readable, then lifting when the block is soft-deleted.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
const container = process.env.POSTGRES_CONTAINER ?? 'roomiematch-postgres-1';
const password = 'RoomieTest123!';
const RS = '\x1e';

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

// Minimal SignalR JSON-protocol client over a raw WebSocket (skipNegotiation, as the
// @microsoft/signalr client does with transport: WebSockets + skipNegotiation: true).
async function connectHub(token) {
  const url = `${baseUrl.replace(/^http/, 'ws')}/hubs/chat${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
  const socket = new WebSocket(url);
  const events = [];
  const waiters = [];
  const pending = new Map();
  let nextId = 1;
  let buffer = '';

  const dispatch = (message) => {
    if (message.type === 1) {
      const event = { name: message.target, args: message.arguments };
      events.push(event);
      for (const waiter of [...waiters]) {
        if (waiter.match(event)) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(event);
        }
      }
    } else if (message.type === 3) {
      const entry = pending.get(message.invocationId);
      pending.delete(message.invocationId);
      if (message.error) entry?.reject(new Error(message.error));
      else entry?.resolve(message.result);
    }
  };

  await new Promise((resolve, reject) => {
    socket.addEventListener('error', () => reject(new Error('websocket error')), { once: true });
    socket.addEventListener('close', (event) => reject(new Error(`websocket closed ${event.code}`)), { once: true });
    socket.addEventListener('open', () => socket.send(JSON.stringify({ protocol: 'json', version: 1 }) + RS), { once: true });
    socket.addEventListener('message', function onHandshake(event) {
      buffer += event.data;
      const end = buffer.indexOf(RS);
      if (end < 0) return;
      const handshake = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      socket.removeEventListener('message', onHandshake);
      if (handshake.error) {
        reject(new Error(handshake.error));
        return;
      }
      socket.addEventListener('message', (next) => {
        buffer += next.data;
        let index;
        while ((index = buffer.indexOf(RS)) >= 0) {
          const frame = buffer.slice(0, index);
          buffer = buffer.slice(index + 1);
          if (frame.length > 0) dispatch(JSON.parse(frame));
        }
      });
      resolve();
    });
  });

  return {
    events,
    invoke(target, ...args) {
      const invocationId = String(nextId++);
      socket.send(JSON.stringify({ type: 1, invocationId, target, arguments: args }) + RS);
      return new Promise((resolve, reject) => {
        pending.set(invocationId, { resolve, reject });
        setTimeout(() => reject(new Error(`${target} timed out`)), 5000);
      });
    },
    waitFor(name, match = () => true, timeoutMs = 5000) {
      const found = events.find((event) => event.name === name && match(event.args[0]));
      if (found) return Promise.resolve(found);
      return new Promise((resolve, reject) => {
        const waiter = { match: (event) => event.name === name && match(event.args[0]), resolve };
        waiters.push(waiter);
        setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`no ${name} event within ${timeoutMs}ms`));
        }, timeoutMs);
      });
    },
    close() {
      socket.close();
    },
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const stamp = Date.now();
const testEmails = [];
const hubs = [];

async function register(label) {
  const email = `chat-${label}-${stamp}@example.com`;
  const { status, json } = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `Chat ${label}`, city: 'TP.HCM' },
  });
  assert.ok(status === 200 || status === 201, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  testEmails.push(email);
  return { token: json.accessToken, id: json.user.id, email };
}

try {
  const a = await register('a');
  const b = await register('b');
  const outsider = await register('c');
  const hidden = await register('hidden');
  const staff = await register('staff');
  sql(`UPDATE profiles SET is_public = false WHERE user_id = '${hidden.id}'`);
  sql(`UPDATE users SET role = 'moderator' WHERE id = '${staff.id}'`);
  const unknownId = crypto.randomUUID(); // seeded users own the 0000...0001-style ids

  // 1. Every endpoint needs a signed-in caller, the hub included.
  for (const [method, path, body] of [
    ['GET', '/api/chat/conversations'],
    ['POST', '/api/chat/conversations', { userId: b.id }],
    ['GET', `/api/chat/conversations/${unknownId}`],
    ['GET', `/api/chat/conversations/${unknownId}/messages`],
    ['POST', `/api/chat/conversations/${unknownId}/messages`, { content: 'hi' }],
    ['POST', `/api/chat/conversations/${unknownId}/read`],
  ]) {
    assert.equal((await call(method, path, { body })).status, 401, `anonymous ${method} ${path}`);
  }
  await assert.rejects(connectHub(null), 'the hub must refuse a connection without a token');

  // 2. Start a conversation: 200, idempotent from either side, bad recipients 403.
  const started = await call('POST', '/api/chat/conversations', { token: a.token, body: { userId: b.id } });
  assert.equal(started.status, 200, `start returned ${started.status}: ${started.text.slice(0, 300)}`);
  const conversation = started.json;
  assert.equal(conversation.partner.userId, b.id);
  assert.equal(conversation.partner.displayName, 'Chat b');
  assert.equal(conversation.lastMessage, null);
  assert.equal(conversation.unreadCount, 0);
  assert.equal(conversation.isBlocked, false);
  const conversationId = conversation.id;
  assert.equal((await call('POST', '/api/chat/conversations', { token: a.token, body: { userId: b.id } })).json.id, conversationId, 'starting twice must return the same conversation');
  const fromB = await call('POST', '/api/chat/conversations', { token: b.token, body: { userId: a.id } });
  assert.equal(fromB.status, 200);
  assert.equal(fromB.json.id, conversationId, 'the other side must get the same conversation');
  assert.equal(fromB.json.partner.userId, a.id);
  for (const [label, userId] of [['self', a.id], ['unknown', unknownId], ['hidden profile', hidden.id], ['staff account', staff.id]]) {
    const rejected = await call('POST', '/api/chat/conversations', { token: a.token, body: { userId } });
    assert.equal(rejected.status, 403, `start with ${label} returned ${rejected.status}`);
  }
  assert.equal((await call('POST', '/api/chat/conversations', { token: a.token, body: {} })).status, 400, 'missing userId must be 400');
  assert.equal((await call('POST', '/api/chat/conversations', { token: a.token, body: { userId: 'abc' } })).status, 400, 'non-uuid userId must be 400');

  // 3. A non-member gets 404 everywhere, and an unknown id is 404 too.
  for (const [method, path, body] of [
    ['GET', `/api/chat/conversations/${conversationId}`],
    ['GET', `/api/chat/conversations/${conversationId}/messages`],
    ['POST', `/api/chat/conversations/${conversationId}/messages`, { content: 'xin chào' }],
    ['POST', `/api/chat/conversations/${conversationId}/read`],
  ]) {
    assert.equal((await call(method, path, { token: outsider.token, body })).status, 404, `outsider ${method} ${path}`);
  }
  assert.equal((await call('GET', `/api/chat/conversations/${unknownId}`, { token: a.token })).status, 404);

  // 4. Realtime: both members connect, plus an outsider who must hear nothing.
  const hubA = await connectHub(a.token);
  const hubA2 = await connectHub(a.token); // a second tab of A
  const hubB = await connectHub(b.token);
  const hubOutsider = await connectHub(outsider.token);
  hubs.push(hubA, hubA2, hubB, hubOutsider);

  // 5. Send over REST: 200, trimmed, pushed to every connection of both members.
  const sent = await call('POST', `/api/chat/conversations/${conversationId}/messages`, { token: a.token, body: { content: '  Chào bạn, phòng còn trống không?  ' } });
  assert.equal(sent.status, 200, `send returned ${sent.status}: ${sent.text.slice(0, 200)}`);
  assert.equal(sent.json.content, 'Chào bạn, phòng còn trống không?');
  assert.equal(sent.json.senderId, a.id);
  assert.equal(sent.json.conversationId, conversationId);
  assert.equal(sent.json.readAt, null);
  for (const [label, hub] of [['B', hubB], ['A', hubA], ['A second tab', hubA2]]) {
    const event = await hub.waitFor('MessageReceived', (message) => message.id === sent.json.id);
    assert.deepEqual(event.args[0], sent.json, `${label} must receive the same MessageDto over SignalR`);
  }
  for (const [label, content] of [['blank', '   '], ['empty', ''], ['too long', 'x'.repeat(4001)]]) {
    const rejected = await call('POST', `/api/chat/conversations/${conversationId}/messages`, { token: a.token, body: { content } });
    assert.equal(rejected.status, 400, `${label} content returned ${rejected.status}`);
  }
  assert.equal((await call('POST', `/api/chat/conversations/${conversationId}/messages`, { token: a.token, body: { content: 'x'.repeat(4000) } })).status, 200, '4000 characters is allowed');

  // 6. Send over the hub: the caller gets the saved message as the result, B gets the event.
  const viaHub = await hubB.invoke('SendMessage', conversationId, 'Còn bạn ơi');
  assert.equal(viaHub.senderId, b.id);
  assert.equal(viaHub.content, 'Còn bạn ơi');
  await hubA.waitFor('MessageReceived', (message) => message.id === viaHub.id);
  await assert.rejects(hubB.invoke('SendMessage', conversationId, '  '), /1 đến 4000/, 'blank content over the hub must fail with the Vietnamese message');
  await assert.rejects(hubOutsider.invoke('SendMessage', conversationId, 'chen ngang'), /Không tìm thấy/, 'an outsider must not send over the hub');

  // 7. Typing reaches the other member only.
  await hubA.invoke('Typing', conversationId);
  const typing = await hubB.waitFor('Typing', (dto) => dto.conversationId === conversationId);
  assert.equal(typing.args[0].userId, a.id);
  await sleep(300);
  assert.ok(!hubA.events.some((event) => event.name === 'Typing'), 'the typist must not get their own Typing event');

  // 8. List and detail: lastMessage, unreadCount and ordering.
  const listA = await call('GET', '/api/chat/conversations', { token: a.token });
  assert.equal(listA.status, 200);
  assert.equal(listA.json.totalCount, 1);
  assert.equal(listA.json.items[0].id, conversationId);
  assert.equal(listA.json.items[0].lastMessage.id, viaHub.id);
  assert.equal(listA.json.items[0].unreadCount, 1, 'A has one unread message from B');
  const detailB = await call('GET', `/api/chat/conversations/${conversationId}`, { token: b.token });
  assert.equal(detailB.status, 200);
  assert.equal(detailB.json.unreadCount, 2, 'B has two unread messages from A');
  assert.equal((await call('GET', '/api/chat/conversations', { token: outsider.token })).json.totalCount, 0);
  assert.equal((await call('GET', '/api/chat/conversations?pageSize=51', { token: a.token })).status, 400);

  // 9. History: newest first, keyset paging with beforeId, limit bounds.
  for (let index = 1; index <= 3; index += 1) {
    await call('POST', `/api/chat/conversations/${conversationId}/messages`, { token: a.token, body: { content: `Tin ${index}` } });
  }
  const allMessages = await call('GET', `/api/chat/conversations/${conversationId}/messages?limit=50`, { token: a.token });
  assert.equal(allMessages.status, 200);
  assert.equal(allMessages.json.items.length, 6);
  assert.equal(allMessages.json.hasMore, false);
  assert.equal(allMessages.json.items[0].content, 'Tin 3', 'newest message first');
  const firstPage = await call('GET', `/api/chat/conversations/${conversationId}/messages?limit=4`, { token: b.token });
  assert.equal(firstPage.json.items.length, 4);
  assert.equal(firstPage.json.hasMore, true);
  const oldest = firstPage.json.items.at(-1).id;
  const olderPage = await call('GET', `/api/chat/conversations/${conversationId}/messages?limit=4&beforeId=${oldest}`, { token: b.token });
  assert.equal(olderPage.json.items.length, 2);
  assert.equal(olderPage.json.hasMore, false);
  assert.deepEqual([...firstPage.json.items, ...olderPage.json.items].map((m) => m.id), allMessages.json.items.map((m) => m.id), 'pages must join without gaps or duplicates');
  assert.deepEqual((await call('GET', `/api/chat/conversations/${conversationId}/messages?beforeId=${unknownId}`, { token: a.token })).json.items, [], 'an unknown beforeId is an empty page');
  for (const query of ['limit=0', 'limit=51', 'beforeId=abc']) {
    assert.equal((await call('GET', `/api/chat/conversations/${conversationId}/messages?${query}`, { token: a.token })).status, 400, `history ${query}`);
  }

  // 10. Mark read: readAt set on the other side's messages, unreadCount 0, receipt pushed.
  const read = await call('POST', `/api/chat/conversations/${conversationId}/read`, { token: b.token });
  assert.equal(read.status, 200);
  assert.equal(read.json.conversationId, conversationId);
  assert.equal(read.json.userId, b.id);
  assert.ok(read.json.readAt);
  const receipt = await hubA.waitFor('ConversationRead', (dto) => dto.userId === b.id);
  assert.equal(receipt.args[0].conversationId, conversationId);
  assert.equal((await call('GET', `/api/chat/conversations/${conversationId}`, { token: b.token })).json.unreadCount, 0);
  const afterRead = await call('GET', `/api/chat/conversations/${conversationId}/messages?limit=50`, { token: a.token });
  for (const message of afterRead.json.items) {
    if (message.senderId === a.id) assert.ok(message.readAt, 'A messages must be read after B marks read');
    else assert.equal(message.readAt, null, 'B own message must not be marked read by B');
  }
  const hubReceipt = await hubA.invoke('MarkRead', conversationId);
  assert.equal(hubReceipt.userId, a.id);
  assert.equal((await call('GET', `/api/chat/conversations/${conversationId}`, { token: a.token })).json.unreadCount, 0);
  assert.ok(!hubOutsider.events.length, 'the outsider must not receive any event');

  // 11. Block (B blocks A): isBlocked on both sides, sending/typing/starting refused, history readable.
  sql(`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ('${b.id}', '${a.id}')`);
  assert.equal((await call('GET', `/api/chat/conversations/${conversationId}`, { token: a.token })).json.isBlocked, true);
  assert.equal((await call('GET', `/api/chat/conversations/${conversationId}`, { token: b.token })).json.isBlocked, true);
  assert.equal((await call('POST', `/api/chat/conversations/${conversationId}/messages`, { token: a.token, body: { content: 'bị chặn' } })).status, 403, 'the blocked side cannot send');
  assert.equal((await call('POST', `/api/chat/conversations/${conversationId}/messages`, { token: b.token, body: { content: 'chặn rồi' } })).status, 403, 'the blocker cannot send either');
  await assert.rejects(hubA.invoke('SendMessage', conversationId, 'qua hub'), /chặn/);
  await assert.rejects(hubA.invoke('Typing', conversationId), /chặn/);
  assert.equal((await call('GET', `/api/chat/conversations/${conversationId}/messages`, { token: a.token })).status, 200, 'history stays readable');
  assert.equal((await call('POST', '/api/chat/conversations', { token: a.token, body: { userId: b.id } })).json.isBlocked, true, 'reopening returns the existing conversation with isBlocked');
  sql(`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ('${outsider.id}', '${a.id}')`);
  assert.equal((await call('POST', '/api/chat/conversations', { token: a.token, body: { userId: outsider.id } })).status, 403, 'a new conversation with someone who blocked you is refused');

  // 12. Unblocking (soft delete) restores sending.
  sql(`UPDATE user_blocks SET deleted_at = now() WHERE blocker_id = '${b.id}' AND blocked_id = '${a.id}'`);
  assert.equal((await call('GET', `/api/chat/conversations/${conversationId}`, { token: a.token })).json.isBlocked, false);
  assert.equal((await call('POST', `/api/chat/conversations/${conversationId}/messages`, { token: a.token, body: { content: 'mở chặn rồi' } })).status, 200);
} finally {
  for (const hub of hubs) hub.close();
  // Users cascade to memberships, messages and blocks; conversations are left without members.
  if (testEmails.length > 0) {
    const ids = sql(`SELECT string_agg(id::text, ',') FROM users WHERE email IN ('${testEmails.join("','")}')`);
    if (ids) {
      const list = ids.split(',').map((id) => `'${id}'`).join(',');
      sql(`DELETE FROM conversations WHERE id IN (SELECT conversation_id FROM conversation_members WHERE user_id IN (${list}))`);
    }
    sql(`DELETE FROM users WHERE email IN ('${testEmails.join("','")}')`);
  }
}

console.log('PASS: chat REST + SignalR - 401 anonymous (REST and hub), start conversation idempotent from both sides, self/unknown/hidden/staff recipients 403, outsider 404 everywhere, send trimmed with 400 for blank/too long, MessageReceived to every connection of both members and none to outsiders, hub SendMessage/MarkRead results and HubException errors, Typing to the other side only, list lastMessage/unreadCount, keyset history beforeId/limit/hasMore, mark read readAt + ConversationRead, block in either direction locks sending/typing/new conversations while history stays readable, soft-deleted block lifts it, test data cleaned up.');
process.exit(0);
