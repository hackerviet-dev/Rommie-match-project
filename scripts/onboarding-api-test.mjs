// Regression check for the onboarding backend APIs, run against a real API and PostgreSQL:
//   GET/PUT /api/users/me/profile, GET/PUT /api/users/me/lifestyle, the "other member" read
//   GET /api/users/{userId}/profile and the discovery list GET /api/users/profiles
// Usage: node scripts/onboarding-api-test.mjs http://localhost:5000
// Covers: anonymous access is refused, PUT persists what GET reads back, invalid bodies are
// 400 (never 500), two accounts never read or write each other's data, and the public profile
// route answers 401/404/200 correctly, exposes exactly ProfileDetailDto and honours is_public,
// is_active and a mutual block. The discovery list applies the same BR-07 mutual-block rule as
// the detail route, the matching list, the room search and chat: a one-way block drops exactly
// the blocked member from totalCount and from every page for both sides, and removing the block
// brings the member back. Needs the local PostgreSQL container for the is_public/is_active
// toggles and the block fixture (override with POSTGRES_CONTAINER, default roomiematch-postgres-1).
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
const createdEmails = [];

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
  createdEmails.push(body.email);
  return { body, token: json.accessToken, userId: json.user.id };
}

async function run() {

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

// 14. The public profile route is members-only and unknown ids are 404 (never 500): no token is
// 401, and both a valid-but-unused UUID and a non-GUID answer 404.
assert.equal((await call('GET', `/api/users/${b.userId}/profile`)).status, 401, 'an anonymous public profile read must be 401');
assert.equal((await call('GET', '/api/users/00000000-0000-0000-0000-000000000000/profile', { token: a.token })).status, 404);
assert.equal((await call('GET', '/api/users/not-a-guid/profile', { token: a.token })).status, 404);

// 15. A reads B and gets exactly B's stored profile (same userId, same values), never A's.
const bProfile = {
  displayName: 'Trần Bảo',
  birthDate: '2002-03-15',
  gender: 'male',
  occupation: 'Kỹ sư phần mềm',
  bio: 'Thích chạy bộ và nấu ăn.',
  city: 'Đà Nẵng',
  district: 'Hải Châu',
  avatarUrl: 'https://example.com/b-avatar.png',
};
const bProfileSaved = await call('PUT', '/api/users/me/profile', { token: b.token, body: bProfile });
assert.equal(bProfileSaved.status, 200);
const bAsA = await call('GET', `/api/users/${b.userId}/profile`, { token: a.token });
assert.equal(bAsA.status, 200);
assert.equal(bAsA.json.userId, b.userId);
assert.notEqual(bAsA.json.userId, a.userId);
for (const field of Object.keys(bProfile)) {
  assert.deepEqual(bAsA.json[field], bProfile[field], `public profile.${field} did not match B's stored value`);
}
assert.equal(bAsA.json.isVerified, false);
assert.equal(bAsA.json.profileCompletion, bProfileSaved.json.profileCompletion);

// 16. The payload is exactly the public ProfileDetailDto: no extra key, no email, no access or
// refresh token, no password hash, no verification evidence and none of the private
// housing/lifestyle fields. Anything outside the DTO would be a leak.
assert.deepEqual(
  Object.keys(bAsA.json).sort(),
  ['avatarUrl', 'bio', 'birthDate', 'city', 'displayName', 'district', 'gender', 'isVerified', 'occupation', 'profileCompletion', 'updatedAt', 'userId'],
  'the public profile must expose exactly the ProfileDetailDto keys',
);
const publicPayload = JSON.stringify(bAsA.json);
for (const secret of [
  b.body.email,
  b.token,
  'password',
  'passwordHash',
  'refreshToken',
  'identity_verifications',
  'verification',
  'hasRoom',
  'occupationStatus',
  'organizationName',
  'hideOrganization',
  'drinking',
  'preferredDistance',
  'preferredRoomType',
  'sleepSchedule',
  'cleanliness',
  'socialStyle',
  'is_public',
  'is_active',
]) {
  assert.equal(publicPayload.includes(secret), false, `public profile leaked "${secret}"`);
}

// 17. is_public=false hides the profile from other members with the same 404 as a missing one,
// while its owner still reads it. Turning it back on restores the profile.
sql(`UPDATE profiles SET is_public = false WHERE user_id = '${b.userId}'`);
assert.equal((await call('GET', `/api/users/${b.userId}/profile`, { token: a.token })).status, 404, 'a private profile must be hidden from other members');
assert.equal((await call('GET', `/api/users/${b.userId}/profile`, { token: b.token })).status, 200, 'the owner must still see its own private profile');
sql(`UPDATE profiles SET is_public = true WHERE user_id = '${b.userId}'`);
assert.equal((await call('GET', `/api/users/${b.userId}/profile`, { token: a.token })).status, 200, 'restoring is_public must bring the profile back');

// 18. users.is_active=false hides the profile as well, and the disabled account cannot use its
// own access token any more (the token validator also requires is_active).
sql(`UPDATE users SET is_active = false WHERE id = '${b.userId}'`);
assert.equal((await call('GET', `/api/users/${b.userId}/profile`, { token: a.token })).status, 404, 'a disabled account must be hidden from other members');
assert.equal((await call('GET', '/api/users/me/profile', { token: b.token })).status, 401, 'a disabled account must not authenticate any more');
sql(`UPDATE users SET is_active = true WHERE id = '${b.userId}'`);
assert.equal((await call('GET', `/api/users/${b.userId}/profile`, { token: a.token })).status, 200, 'reactivating the account must restore the profile');

// 19. A block is a mutual hiding rule on the other read paths (matching list, room search, chat),
// so this route applies it too: 404 both ways while blocked, and the owner always sees its own.
// Fixture only - this phase adds no block/report member API.
sql(`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ('${a.userId}', '${b.userId}') ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET deleted_at = NULL`);
assert.equal((await call('GET', `/api/users/${b.userId}/profile`, { token: a.token })).status, 404, 'the blocker must not see the blocked profile');
assert.equal((await call('GET', `/api/users/${a.userId}/profile`, { token: b.token })).status, 404, 'the blocked member must not see the blocker profile');
assert.equal((await call('GET', `/api/users/${b.userId}/profile`, { token: b.token })).status, 200, 'a block must never hide your own profile');
sql(`DELETE FROM user_blocks WHERE blocker_id = '${a.userId}' AND blocked_id = '${b.userId}'`);
assert.equal((await call('GET', `/api/users/${b.userId}/profile`, { token: a.token })).status, 200, 'removing the block must restore the profile');

// 20. The discovery list (GET /api/users/profiles) applies the same BR-07 mutual-block rule as
// the detail profile, the matching list, the room search and chat: a one-way block hides both
// members from each other, and the page envelope (totalCount/hasNextPage) follows the filtered
// set. Fixture only - this phase still adds no block/report member API.
const listPage = async (token, page = 1, pageSize = 50) => {
  const { status, json } = await call('GET', `/api/users/profiles?page=${page}&pageSize=${pageSize}`, { token });
  assert.equal(status, 200, `GET /api/users/profiles returned ${status}: ${JSON.stringify(json)}`);
  return json;
};
const listAllIds = async (token, pageSize = 50) => {
  const ids = [];
  let page = 1;
  let totalCount = 0;
  for (;;) {
    const body = await listPage(token, page, pageSize);
    totalCount = body.totalCount;
    ids.push(...body.items.map((item) => item.id));
    if (!body.hasNextPage) {
      break;
    }
    page += 1;
    assert.ok(page <= 100, 'the discovery list never stopped paging');
  }
  assert.equal(new Set(ids).size, ids.length, 'a discovery page repeated an id');
  return { ids, totalCount };
};

const discoveryForA = await listAllIds(a.token);
assert.equal(discoveryForA.totalCount, discoveryForA.ids.length, 'totalCount must match the items collected across pages');
assert.ok(discoveryForA.ids.includes(b.userId), 'B must show in A discovery list before any block');
const discoveryForB = await listAllIds(b.token);
assert.ok(discoveryForB.ids.includes(a.userId), 'A must show in B discovery list before any block');

sql(`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ('${a.userId}', '${b.userId}') ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET deleted_at = NULL`);
const blockedForA = await listAllIds(a.token);
assert.equal(blockedForA.totalCount, discoveryForA.totalCount - 1, 'blocking B must drop exactly one row from A discovery totalCount');
assert.equal(blockedForA.ids.includes(b.userId), false, 'the blocker must not see the blocked member in the discovery list');
const blockedForB = await listAllIds(b.token);
assert.equal(blockedForB.totalCount, discoveryForB.totalCount - 1, 'a one-way block must also hide A from B, so B loses exactly one row');
assert.equal(blockedForB.ids.includes(a.userId), false, 'the blocked member must not see the blocker in the discovery list');
// The filter must hold on every page, not only the first: paging with a smaller pageSize returns
// the same filtered set, and a page past the end stays empty while keeping the filtered count.
const blockedSmallPages = await listAllIds(a.token, 7);
assert.deepEqual(blockedSmallPages.ids.slice().sort(), blockedForA.ids.slice().sort(), 'paging with a smaller pageSize must return the same filtered set');
assert.equal(blockedSmallPages.totalCount, blockedForA.totalCount, 'the filtered totalCount must not depend on pageSize');
const beyond = await listPage(b.token, Math.ceil(blockedForB.totalCount / 50) + 10, 50);
assert.equal(beyond.items.length, 0, 'a page past the end must be empty');
assert.equal(beyond.totalCount, blockedForB.totalCount, 'a page past the end must keep the filtered totalCount');
assert.equal(beyond.hasNextPage, false);

sql(`DELETE FROM user_blocks WHERE blocker_id = '${a.userId}' AND blocked_id = '${b.userId}'`);
const restoredForA = await listAllIds(a.token);
assert.equal(restoredForA.totalCount, discoveryForA.totalCount, 'removing the block must restore the discovery totalCount');
assert.ok(restoredForA.ids.includes(b.userId), 'removing the block must show B in A discovery list again');
}

const cleanup = () => {
  if (createdEmails.length === 0) {
    return;
  }
  const emails = createdEmails.map((email) => `'${email}'`).join(',');
  sql(`DELETE FROM users WHERE email IN (${emails})`);
};

let failure = null;
try {
  await run();
} catch (error) {
  failure = error;
} finally {
  try {
    cleanup();
  } catch (cleanupError) {
    if (failure === null) {
      failure = cleanupError;
    } else {
      console.error(`cleanup also failed: ${cleanupError.message}`);
    }
  }
}

if (failure !== null) {
  console.error(`FAIL: ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log('PASS: onboarding profile/lifestyle APIs - anonymous 401, PUT->GET round-trip, 400 validation (including null interest), full-replace reset and per-account isolation. Public profile GET /api/users/{userId}/profile: anonymous 401, unknown/non-GUID id 404, A reads B with exactly the ProfileDetailDto keys (no email, token, password hash, verification evidence or private fields), is_public=false and is_active=false hidden from others but readable by the owner, and a mutual block hidden both ways. Discovery list GET /api/users/profiles: the same BR-07 mutual-block rule drops exactly the blocked member from totalCount and from every page for both sides (checked with pageSize 50 and 7 plus a page past the end), and removing the block restores the member.');
}



