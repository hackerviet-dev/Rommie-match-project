// Regression check for the onboarding backend APIs, run against a real API and PostgreSQL:
//   GET/PUT /api/users/me/profile and GET/PUT /api/users/me/lifestyle
// Usage: node scripts/onboarding-api-test.mjs http://localhost:5000
// Covers: anonymous access is refused, PUT persists what GET reads back, invalid bodies are
// 400 (never 500), and two accounts never read or write each other's data.
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

const profileBody = (displayName, city) => ({ displayName, city });
const lifestyleBody = (overrides = {}) => ({
  sleepSchedule: '23:00–07:00',
  cleanliness: 4,
  socialStyle: 'Cân bằng',
  smoking: false,
  petFriendly: true,
  cookingFrequency: '3–4 lần/tuần',
  roomEnvironment: 'moderate',
  budgetMin: 3500000,
  budgetMax: 6000000,
  moveInDate: '2026-11-01',
  interests: ['cà phê', 'phim', 'chạy bộ'],
  ...overrides,
});

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const stamp = Date.now();

async function register(label, extra = {}) {
  const body = {
    email: `onboarding-api-${label}-${stamp}@example.com`,
    password,
    displayName: `Onboarding ${label}`,
    city: 'TP.HCM',
    ...extra,
  };
  const { status, json } = await call('POST', '/api/auth/register', { body });
  assert.equal(status, 200, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  return { body, token: json.accessToken, userId: json.user.id };
}

// 1. Without a token nothing can be read or written.
for (const [method, path, body] of [
  ['GET', '/api/users/me/profile'],
  ['PUT', '/api/users/me/profile', profileBody('Ẩn danh', 'TP.HCM')],
  ['GET', '/api/users/me/lifestyle'],
  ['PUT', '/api/users/me/lifestyle', lifestyleBody()],
]) {
  const { status } = await call(method, path, { body });
  assert.equal(status, 401, `${method} ${path} without a token returned ${status}`);
}

// 2. Two members: A for the write/read round-trip, B to prove the records stay separate.
const a = await register('a', {
  district: 'Quận 1',
  gender: 'female',
  birthDate: '2004-10-02',
  occupation: 'Sinh viên',
});
const b = await register('b');

// 3. GET returns the caller's own profile, taken from the token.
const profileA = await call('GET', '/api/users/me/profile', { token: a.token });
assert.equal(profileA.status, 200);
assert.equal(profileA.json.userId, a.userId);
assert.equal(profileA.json.displayName, a.body.displayName);
assert.equal(profileA.json.city, 'TP.HCM');
assert.equal(profileA.json.district, 'Quận 1');
assert.equal(profileA.json.gender, 'female');
assert.equal(profileA.json.birthDate, '2004-10-02');
// 40 base + birthDate 15 + gender 15 + occupation 10 + district 10
assert.equal(profileA.json.profileCompletion, 90);
const profileB = await call('GET', '/api/users/me/profile', { token: b.token });
assert.equal(profileB.json.userId, b.userId);
assert.notEqual(profileB.json.userId, profileA.json.userId);

// 4. PUT replaces the whole profile and the database keeps it: GET reads the same values back.
const savedProfile = await call('PUT', '/api/users/me/profile', {
  token: a.token,
  body: {
    displayName: 'Nguyễn Anh',
    birthDate: '2003-05-20',
    gender: 'other',
    occupation: 'Thiết kế',
    bio: 'Thích yên tĩnh, gọn gàng.',
    city: 'Hà Nội',
    district: 'Cầu Giấy',
    avatarUrl: 'https://example.com/avatar.png',
  },
});
assert.equal(savedProfile.status, 200);
assert.equal(savedProfile.json.profileCompletion, 100);
const profileReread = await call('GET', '/api/users/me/profile', { token: a.token });
assert.equal(profileReread.json.userId, a.userId);
for (const field of [
  'displayName', 'birthDate', 'gender', 'occupation', 'bio', 'city', 'district', 'avatarUrl', 'profileCompletion',
]) {
  assert.deepEqual(profileReread.json[field], savedProfile.json[field], `profile.${field} did not round-trip`);
}

// 5. Optional fields omitted by the PUT are stored as null and profileCompletion is recalculated.
const clearedProfile = await call('PUT', '/api/users/me/profile', {
  token: a.token,
  body: profileBody('Nguyễn Anh', 'Hà Nội'),
});
assert.equal(clearedProfile.status, 200);
for (const field of ['birthDate', 'gender', 'occupation', 'bio', 'district', 'avatarUrl']) {
  assert.equal(clearedProfile.json[field], null, `profile.${field} should be reset to null`);
}
assert.equal(clearedProfile.json.profileCompletion, 40);

// 6. Member B is untouched by A's writes.
const profileBAfterA = await call('GET', '/api/users/me/profile', { token: b.token });
assert.equal(profileBAfterA.json.displayName, b.body.displayName);
assert.equal(profileBAfterA.json.district, null);

// 7. Invalid profile bodies answer 400.
for (const [label, body] of [
  ['gender không hợp lệ', { displayName: 'Nguyễn Anh', city: 'Hà Nội', gender: 'abc' }],
  ['displayName quá ngắn', { displayName: 'A', city: 'Hà Nội' }],
  ['thiếu city', { displayName: 'Nguyễn Anh' }],
  ['birthDate là số tuổi', { displayName: 'Nguyễn Anh', city: 'Hà Nội', birthDate: 22 }],
  ['avatarUrl không phải URL', { displayName: 'Nguyễn Anh', city: 'Hà Nội', avatarUrl: 'not-a-url' }],
]) {
  const { status } = await call('PUT', '/api/users/me/profile', { token: a.token, body });
  assert.equal(status, 400, `profile "${label}" returned ${status} instead of 400`);
}

// 8. Lifestyle is absent until the first save, and only for the caller.
assert.equal((await call('GET', '/api/users/me/lifestyle', { token: a.token })).status, 404);
assert.equal((await call('GET', '/api/users/me/lifestyle', { token: b.token })).status, 404);

// 9. PUT creates the row, normalizes interests and GET returns the stored record.
const savedLifestyle = await call('PUT', '/api/users/me/lifestyle', {
  token: a.token,
  body: lifestyleBody({ interests: ['cà phê', ' cà phê ', 'phim'] }),
});
assert.equal(savedLifestyle.status, 200);
assert.equal(savedLifestyle.json.userId, a.userId);
assert.deepEqual(savedLifestyle.json.interests, ['cà phê', 'phim']);
const lifestyleReread = await call('GET', '/api/users/me/lifestyle', { token: a.token });
for (const field of [
  'userId', 'sleepSchedule', 'cleanliness', 'socialStyle', 'smoking', 'petFriendly', 'cookingFrequency',
  'roomEnvironment', 'budgetMin', 'budgetMax', 'moveInDate', 'interests',
]) {
  assert.deepEqual(lifestyleReread.json[field], savedLifestyle.json[field], `lifestyle.${field} did not round-trip`);
}

// 10. Invalid lifestyle bodies answer 400, including a null element inside interests
// (that used to escape validation and fail the insert with a 500).
for (const [label, body] of [
  ['thiếu sleepSchedule', lifestyleBody({ sleepSchedule: undefined })],
  ['thiếu socialStyle', lifestyleBody({ socialStyle: undefined })],
  ['cleanliness = 0', lifestyleBody({ cleanliness: 0 })],
  ['cleanliness = 6', lifestyleBody({ cleanliness: 6 })],
  ['budgetMax < budgetMin', lifestyleBody({ budgetMin: 6000000, budgetMax: 3500000 })],
  ['21 sở thích', lifestyleBody({ interests: Array.from({ length: 21 }, (_, index) => `sở thích ${index}`) })],
  ['sở thích dài 41 ký tự', lifestyleBody({ interests: ['x'.repeat(41)] })],
  ['sở thích có phần tử null', lifestyleBody({ interests: ['cà phê', null] })],
  ['sở thích chỉ có khoảng trắng', lifestyleBody({ interests: ['   '] })],
  ['roomEnvironment không hợp lệ', lifestyleBody({ roomEnvironment: 'noisy' })],
]) {
  const { status, text } = await call('PUT', '/api/users/me/lifestyle', { token: a.token, body });
  assert.equal(status, 400, `lifestyle "${label}" returned ${status} instead of 400 (${text.slice(0, 200)})`);
}

// An empty array is valid: the onboarding form may send no interest at all.
const noInterests = await call('PUT', '/api/users/me/lifestyle', {
  token: a.token,
  body: lifestyleBody({ interests: [] }),
});
assert.equal(noInterests.status, 200);
assert.deepEqual(noInterests.json.interests, []);
await call('PUT', '/api/users/me/lifestyle', {
  token: a.token,
  body: lifestyleBody({ interests: ['cà phê', 'phim'] }),
});

// A rejected request must not change the stored record.
const lifestyleAfterRejects = await call('GET', '/api/users/me/lifestyle', { token: a.token });
assert.equal(lifestyleAfterRejects.json.cleanliness, 4);
assert.equal(lifestyleAfterRejects.json.sleepSchedule, '23:00–07:00');

// 11. Member B saves independently; A keeps its own values and cannot read B's record.
const bLifestyle = await call('PUT', '/api/users/me/lifestyle', {
  token: b.token,
  body: lifestyleBody({
    sleepSchedule: '01:00–09:00',
    cleanliness: 2,
    socialStyle: 'Hướng nội',
    budgetMin: 1000000,
    budgetMax: 2000000,
  }),
});
assert.equal(bLifestyle.status, 200);
assert.equal(bLifestyle.json.userId, b.userId);
const aLifestyleAfterB = await call('GET', '/api/users/me/lifestyle', { token: a.token });
assert.equal(aLifestyleAfterB.json.userId, a.userId);
assert.equal(aLifestyleAfterB.json.sleepSchedule, '23:00–07:00');
assert.equal(aLifestyleAfterB.json.cleanliness, 4);
const bLifestyleReread = await call('GET', '/api/users/me/lifestyle', { token: b.token });
assert.equal(bLifestyleReread.json.userId, b.userId);
assert.equal(bLifestyleReread.json.sleepSchedule, '01:00–09:00');
assert.equal(bLifestyleReread.json.budgetMin, 1000000);

// 12. A full-replace PUT resets the optional fields and the booleans.
const minimalLifestyle = await call('PUT', '/api/users/me/lifestyle', {
  token: a.token,
  body: { sleepSchedule: '22:00–06:00', cleanliness: 5, socialStyle: 'Hướng ngoại' },
});
assert.equal(minimalLifestyle.status, 200);
assert.equal(minimalLifestyle.json.smoking, false);
assert.equal(minimalLifestyle.json.petFriendly, false);
assert.equal(minimalLifestyle.json.cookingFrequency, null);
assert.equal(minimalLifestyle.json.roomEnvironment, null);
assert.equal(minimalLifestyle.json.moveInDate, null);
assert.deepEqual(minimalLifestyle.json.interests, []);
assert.equal(minimalLifestyle.json.budgetMin, 0);
assert.equal(minimalLifestyle.json.budgetMax, 0);

// 13. Another member's profile is readable through the public route, which never leaks email,
// and the private lifestyle record stays private (there is no per-user lifestyle route).
const publicB = await call('GET', `/api/users/${b.userId}/profile`, { token: a.token });
assert.equal(publicB.status, 200);
assert.equal(publicB.json.userId, b.userId);
assert.equal(publicB.json.displayName, b.body.displayName);
assert.equal('email' in publicB.json, false);
assert.equal((await call('GET', `/api/users/${b.userId}/lifestyle`, { token: a.token })).status, 404);

console.log('PASS: onboarding profile/lifestyle APIs - anonymous 401, PUT->GET round-trip, 400 validation (including null interest), full-replace reset and per-account isolation.');



