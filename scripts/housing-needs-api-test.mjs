// Regression check for the onboarding "housing needs" backend APIs, run against a real API
// and PostgreSQL:
//   GET/PUT /api/users/me/housing-needs
// Usage: node scripts/housing-needs-api-test.mjs http://localhost:5000
// Covers: anonymous access is refused, GET before any answer returns nulls (not false), a PUT
// is read back exactly by GET, invalid enum / over-long string / contradictory bodies are 400
// (never 500), two accounts never read or write each other's data, hasRoom transitions leave
// no stale search fields, a housing-only save neither fabricates a lifestyle record nor feeds
// matching, and the fields never appear in the public profile.
import assert from 'node:assert/strict';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
const password = 'RoomieTest123!';

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

const housingBody = (overrides = {}) => ({
  hasRoom: false,
  occupationStatus: 'student',
  organizationName: 'Đại học Bách Khoa',
  hideOrganization: true,
  drinking: false,
  preferredDistance: 'lt_2km',
  preferredRoomType: 'studio',
  ...overrides,
});

const lifestyleBody = (overrides = {}) => ({
  sleepSchedule: '23:00–07:00',
  cleanliness: 4,
  socialStyle: 'Cân bằng',
  smoking: false,
  petFriendly: true,
  roomEnvironment: 'moderate',
  budgetMin: 3500000,
  budgetMax: 6000000,
  interests: ['cà phê'],
  ...overrides,
});

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const stamp = Date.now();

async function register(label) {
  const body = {
    email: `housing-needs-${label}-${stamp}@example.com`,
    password,
    displayName: `Housing ${label}`,
    city: 'TP.HCM',
  };
  const { status, json } = await call('POST', '/api/auth/register', { body });
  assert.equal(status, 200, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  return { token: json.accessToken, userId: json.user.id };
}

// 1. Without a token nothing can be read or written.
for (const [method, path, body] of [
  ['GET', '/api/users/me/housing-needs'],
  ['PUT', '/api/users/me/housing-needs', housingBody()],
]) {
  const { status } = await call(method, path, { body });
  assert.equal(status, 401, `${method} ${path} without a token returned ${status}`);
}

// 2. Two members: A for the read/write round-trip, B to prove the records stay separate.
const a = await register('a');
const b = await register('b');

// 3. GET before answering returns nulls, never false.
const fresh = await call('GET', '/api/users/me/housing-needs', { token: a.token });
assert.equal(fresh.status, 200);
assert.equal(fresh.json.userId, a.userId);
assert.equal(fresh.json.hasRoom, null);
assert.equal(fresh.json.occupationStatus, null);
assert.equal(fresh.json.organizationName, null);
assert.equal(fresh.json.hideOrganization, false, 'hideOrganization is a switch, so it defaults to false');
assert.equal(fresh.json.drinking, null);
assert.equal(fresh.json.preferredDistance, null);
assert.equal(fresh.json.preferredRoomType, null);

// 4. PUT persists exactly what GET reads back.
const saved = await call('PUT', '/api/users/me/housing-needs', { token: a.token, body: housingBody() });
assert.equal(saved.status, 200, `valid PUT returned ${saved.status}: ${saved.text.slice(0, 200)}`);
const reread = await call('GET', '/api/users/me/housing-needs', { token: a.token });
assert.deepEqual(reread.json, saved.json);

// 5. Invalid enum values and over-long strings are 400, not 500.
for (const [label, body] of [
  ['occupationStatus lạ', housingBody({ occupationStatus: 'working' })],
  ['preferredDistance lạ', housingBody({ preferredDistance: '1km' })],
  ['preferredRoomType lạ', housingBody({ preferredRoomType: 'balcony' })],
  ['organizationName quá dài', housingBody({ organizationName: 'x'.repeat(161) })],
]) {
  const { status, text } = await call('PUT', '/api/users/me/housing-needs', { token: a.token, body });
  assert.equal(status, 400, `housing-needs "${label}" returned ${status} instead of 400 (${text.slice(0, 200)})`);
}

// 6. "Đã có phòng" and "đang tìm phòng" are mutually exclusive.
const contradictory = await call('PUT', '/api/users/me/housing-needs', {
  token: a.token,
  body: housingBody({ hasRoom: true, preferredDistance: '2_5km' }),
});
assert.equal(contradictory.status, 400, `hasRoom=true with a search distance returned ${contradictory.status}`);

// 7. A rejected request must not change the stored record.
const afterRejects = await call('GET', '/api/users/me/housing-needs', { token: a.token });
assert.deepEqual(afterRejects.json, saved.json);

// 8. Switching to "đã có phòng" drops the search fields; switching back sets them again.
const hasRoomNow = await call('PUT', '/api/users/me/housing-needs', {
  token: a.token,
  body: { hasRoom: true, occupationStatus: 'employed', organizationName: 'Công ty ABC', hideOrganization: false, drinking: true },
});
assert.equal(hasRoomNow.status, 200);
assert.equal(hasRoomNow.json.hasRoom, true);
assert.equal(hasRoomNow.json.drinking, true);
assert.equal(hasRoomNow.json.preferredDistance, null, 'switching to "đã có phòng" must not keep stale search fields');
assert.equal(hasRoomNow.json.preferredRoomType, null);
const searchingAgain = await call('PUT', '/api/users/me/housing-needs', {
  token: a.token,
  body: housingBody({ hasRoom: false, preferredDistance: '5_10km', preferredRoomType: 'shared' }),
});
assert.equal(searchingAgain.json.hasRoom, false);
assert.equal(searchingAgain.json.preferredDistance, '5_10km');
assert.equal(searchingAgain.json.preferredRoomType, 'shared');
assert.equal(searchingAgain.json.occupationStatus, 'student');

// 9. PUT is a full replace: an empty body clears the optional fields back to null (chưa khai).
const cleared = await call('PUT', '/api/users/me/housing-needs', { token: a.token, body: {} });
assert.equal(cleared.status, 200);
assert.equal(cleared.json.hasRoom, null);
assert.equal(cleared.json.occupationStatus, null);
assert.equal(cleared.json.organizationName, null);
assert.equal(cleared.json.hideOrganization, false);
assert.equal(cleared.json.drinking, null);
assert.equal(cleared.json.preferredDistance, null);
assert.equal(cleared.json.preferredRoomType, null);

// 10. Saving housing needs creates no room listing.
const claimedRoom = await call('PUT', '/api/users/me/housing-needs', { token: a.token, body: { hasRoom: true } });
assert.equal(claimedRoom.status, 200, `PUT hasRoom=true returned ${claimedRoom.status}: ${claimedRoom.text.slice(0, 200)}`);
const myRooms = await call('GET', '/api/rooms/me', { token: a.token });
assert.equal(myRooms.status, 200);
assert.ok(Array.isArray(myRooms.json), 'GET /api/rooms/me should return an array');
assert.equal(myRooms.json.length, 0, 'saving housing needs must not create a room');

// 11. A housing-only save does not fabricate a lifestyle record, so matching still asks for one.
const lifestyleBefore = await call('GET', '/api/users/me/lifestyle', { token: a.token });
assert.equal(lifestyleBefore.status, 404, 'housing-only row must not surface as a lifestyle record');
const recalc = await call('POST', '/api/matching/me/recalculate', { token: a.token });
assert.equal(recalc.status, 409, `recalculate for a housing-only member returned ${recalc.status} instead of 409`);
assert.equal(recalc.json.code, 'lifestyle_required');

// 12. A real lifestyle submission and the housing needs coexist on the same row.
const lifestyleSaved = await call('PUT', '/api/users/me/lifestyle', { token: a.token, body: lifestyleBody() });
assert.equal(lifestyleSaved.status, 200, `lifestyle PUT returned ${lifestyleSaved.status}: ${lifestyleSaved.text.slice(0, 200)}`);
const housingKept = await call('GET', '/api/users/me/housing-needs', { token: a.token });
assert.equal(housingKept.json.hasRoom, true);
await call('PUT', '/api/users/me/housing-needs', {
  token: a.token,
  body: housingBody({ drinking: true, preferredDistance: '2_5km', preferredRoomType: 'private' }),
});
const lifestyleStill = await call('GET', '/api/users/me/lifestyle', { token: a.token });
assert.equal(lifestyleStill.status, 200);
assert.equal(lifestyleStill.json.petFriendly, true);
assert.equal(lifestyleStill.json.sleepSchedule, '23:00–07:00');

// 13. Member B saves independently; A cannot read B's values and vice versa.
const bFirst = await call('GET', '/api/users/me/housing-needs', { token: b.token });
assert.equal(bFirst.json.userId, b.userId);
assert.equal(bFirst.json.occupationStatus, null);
const bSaved = await call('PUT', '/api/users/me/housing-needs', {
  token: b.token,
  body: housingBody({ occupationStatus: 'both', organizationName: 'Trường XYZ', drinking: false, preferredDistance: 'anywhere', preferredRoomType: 'whole_apartment' }),
});
assert.equal(bSaved.status, 200);
assert.equal(bSaved.json.userId, b.userId);
const aAfterB = await call('GET', '/api/users/me/housing-needs', { token: a.token });
assert.equal(aAfterB.json.userId, a.userId);
assert.equal(aAfterB.json.organizationName, 'Đại học Bách Khoa');
const bAfterB = await call('GET', '/api/users/me/housing-needs', { token: b.token });
assert.equal(bAfterB.json.organizationName, 'Trường XYZ');
assert.equal(bAfterB.json.preferredDistance, 'anywhere');
assert.equal(bAfterB.json.preferredRoomType, 'whole_apartment');

// 14. These are private fields: another member's profile never exposes them.
const publicA = await call('GET', `/api/users/${a.userId}/profile`, { token: b.token });
assert.equal(publicA.status, 200);
for (const field of ['hasRoom', 'occupationStatus', 'organizationName', 'hideOrganization', 'drinking', 'preferredDistance', 'preferredRoomType']) {
  assert.equal(field in publicA.json, false, `public profile leaked private field "${field}"`);
}

console.log('PASS: housing-needs API - anonymous 401, null-vs-false on GET, PUT->GET round-trip, 400 validation (bad enum, over-long string, hasRoom contradiction), full-replace transitions, no room listing, no fabricated lifestyle row, per-account isolation and private-by-default fields.');


