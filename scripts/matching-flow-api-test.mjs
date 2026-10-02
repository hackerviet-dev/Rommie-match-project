// Phase 4 regression check: the whole onboarding -> quiz -> matching backend flow on a real
// API + PostgreSQL, in the order the frontend should call it:
//   1) POST /api/auth/login            2) GET/PUT /api/users/me/profile
//   3) GET/PUT /api/users/me/lifestyle 4) GET/PUT /api/users/me/housing-needs
//   5) GET /api/matching/quiz          6) GET/PUT /api/matching/me/quiz
//   7) POST /api/matching/me/recalculate
// Usage: node scripts/matching-flow-api-test.mjs http://localhost:5000
// The credential endpoints (register/login) allow 10 requests per 60s per IP, and this script
// uses 3, so wait a minute between runs or the next run stops on a 429.
// Covers: anonymous access is refused on every private step, the public question set, the
// 404/400 quiz contract, recalculation needing a lifestyle (409 lifestyle_required), the
// scan quota actually taken from GET /me/usage (never a hard-coded guess), the 403
// scan_quota_exceeded + resetsAt at the real limit, per-account scan budgets, and the fact
// that saving profile, lifestyle, housing needs or quiz never recalculates matches or
// spends a scan.
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
  return { status: response.status, json, text, contentType: response.headers.get('content-type') ?? '' };
}

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

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const stamp = Date.now();

async function register(label) {
  const body = {
    email: `flow-${label}-${stamp}@example.com`,
    password,
    displayName: `Flow ${label} ${stamp}`,
    city: 'TP.HCM',
  };
  const { status, json } = await call('POST', '/api/auth/register', { body });
  assert.equal(status, 200, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  return { body, token: json.accessToken, userId: json.user.id };
}

// 0. Every private step refuses an anonymous caller; the question set stays public and
//    carries no body or parameter.
for (const [method, path, body] of [
  ['GET', '/api/users/me/profile'],
  ['PUT', '/api/users/me/profile', { displayName: 'Ẩn danh', city: 'TP.HCM' }],
  ['GET', '/api/users/me/lifestyle'],
  ['PUT', '/api/users/me/lifestyle', lifestyleBody()],
  ['GET', '/api/users/me/housing-needs'],
  ['PUT', '/api/users/me/housing-needs', housingBody()],
  ['GET', '/api/matching/me/quiz'],
  ['PUT', '/api/matching/me/quiz', { answers: {} }],
  ['POST', '/api/matching/me/recalculate'],
  ['GET', '/api/matching/me/usage'],
]) {
  const { status } = await call(method, path, { body });
  assert.equal(status, 401, `${method} ${path} without a token returned ${status}`);
}
const publicQuiz = await call('GET', '/api/matching/quiz');
assert.equal(publicQuiz.status, 200, 'GET /api/matching/quiz must stay public');

// 1. Login returns the session the frontend stores (register already proved the endpoint;
//    login is the step the app actually uses on the sign-in form).
const a = await register('a');
const b = await register('b'); // Becomes a candidate for A, so A scores at least one person.
const login = await call('POST', '/api/auth/login', { body: { email: a.body.email, password } });
assert.equal(login.status, 200, `login returned ${login.status}: ${login.text.slice(0, 200)}`);
assert.ok(typeof login.json.accessToken === 'string' && login.json.accessToken.length > 0, 'login must return accessToken');
assert.ok(typeof login.json.refreshToken === 'string' && login.json.refreshToken.length > 0, 'login must return refreshToken');
assert.equal(login.json.tokenType, 'Bearer');
assert.equal(login.json.user.id, a.userId);
a.token = login.json.accessToken;

// B supplies lifestyle so A has someone to be scored against. B never calls recalculate,
// so B keeps its own scan quota for other checks.
const bLifestyle = await call('PUT', '/api/users/me/lifestyle', { token: b.token, body: lifestyleBody({ sleepSchedule: '01:00–09:00', cleanliness: 2 }) });
assert.equal(bLifestyle.status, 200, `B lifestyle PUT returned ${bLifestyle.status}: ${bLifestyle.text.slice(0, 200)}`);

// 2. Profile: GET then full-replace PUT, then GET reads the change back.
const profileBefore = await call('GET', '/api/users/me/profile', { token: a.token });
assert.equal(profileBefore.status, 200);
assert.equal(profileBefore.json.userId, a.userId);
const profileSaved = await call('PUT', '/api/users/me/profile', {
  token: a.token,
  body: { displayName: 'Flow A Updated', city: 'Hà Nội', district: 'Cầu Giấy', gender: 'female', birthDate: '2004-10-02', occupation: 'Sinh viên', bio: 'Xin chào' },
});
assert.equal(profileSaved.status, 200, `profile PUT returned ${profileSaved.status}: ${profileSaved.text.slice(0, 200)}`);
assert.equal(profileSaved.json.displayName, 'Flow A Updated');
assert.equal(profileSaved.json.birthDate, '2004-10-02');
assert.ok(profileSaved.json.profileCompletion >= 40 && profileSaved.json.profileCompletion <= 100);
const profileReread = await call('GET', '/api/users/me/profile', { token: a.token });
assert.deepEqual(profileReread.json, profileSaved.json, 'GET /me/profile must read back the PUT');


// 3. Lifestyle is a prerequisite for matching: 404 before, round-trip after.
const lifestyleBefore = await call('GET', '/api/users/me/lifestyle', { token: a.token });
assert.equal(lifestyleBefore.status, 404, 'lifestyle must be 404 before it is saved');

// 4. Housing needs: GET before answering returns nulls (not false), PUT round-trips.
const housingBefore = await call('GET', '/api/users/me/housing-needs', { token: a.token });
assert.equal(housingBefore.status, 200);
assert.equal(housingBefore.json.hasRoom, null);
assert.equal(housingBefore.json.occupationStatus, null);
assert.equal(housingBefore.json.drinking, null);
const housingSaved = await call('PUT', '/api/users/me/housing-needs', { token: a.token, body: housingBody() });
assert.equal(housingSaved.status, 200, `housing-needs PUT returned ${housingSaved.status}: ${housingSaved.text.slice(0, 200)}`);
assert.equal(housingSaved.json.hasRoom, false);
assert.equal(housingSaved.json.preferredRoomType, 'studio');
const housingReread = await call('GET', '/api/users/me/housing-needs', { token: a.token });
assert.deepEqual(housingReread.json, housingSaved.json, 'GET /me/housing-needs must read back the PUT');

// 5. The question set is public and self-describing.
const quiz = await call('GET', '/api/matching/quiz');
assert.equal(quiz.status, 200);
assert.equal(quiz.json.code, 'lifestyle_v1');
assert.ok(Array.isArray(quiz.json.questions) && quiz.json.questions.length > 0, 'questions must not be empty');
const answers = Object.fromEntries(quiz.json.questions.map((question) => [question.id, question.options[0].id]));

// 6. Quiz result: 404 before answering, 400 for an incomplete body, PUT -> GET round-trip.
const quizBefore = await call('GET', '/api/matching/me/quiz', { token: a.token });
assert.equal(quizBefore.status, 404, 'quiz result must be 404 before answering');
const partial = await call('PUT', '/api/matching/me/quiz', { token: a.token, body: { answers: { [quiz.json.questions[0].id]: quiz.json.questions[0].options[0].id } } });
assert.equal(partial.status, 400, `an incomplete quiz body must be 400 (got ${partial.status})`);
assert.ok(Object.keys(partial.json.errors ?? {}).some((key) => key.startsWith('Answers.')), 'quiz 400 must key errors by question');

const usageBeforeQuiz = await call('GET', '/api/matching/me/usage', { token: a.token });
assert.equal(usageBeforeQuiz.status, 200);
const savedQuiz = await call('PUT', '/api/matching/me/quiz', { token: a.token, body: { answers } });
assert.equal(savedQuiz.status, 200, `quiz PUT returned ${savedQuiz.status}: ${savedQuiz.text.slice(0, 200)}`);
assert.deepEqual(savedQuiz.json.answers, answers);
const quizReread = await call('GET', '/api/matching/me/quiz', { token: a.token });
assert.deepEqual(quizReread.json, savedQuiz.json, 'GET /me/quiz must read back the PUT');

// 7a. Saving the quiz does not recalculate and does not spend a scan: the two operations
//     are independent, so the app can save answers without burning quota.
const usageAfterQuiz = await call('GET', '/api/matching/me/usage', { token: a.token });
assert.equal(usageAfterQuiz.json.scansUsed, usageBeforeQuiz.json.scansUsed, 'saving the quiz must not consume a scan');


// 7b. Recalculate without a lifestyle record: 409 lifestyle_required and no scan spent.
const tooEarly = await call('POST', '/api/matching/me/recalculate', { token: a.token });
assert.equal(tooEarly.status, 409, `recalculate without a lifestyle returned ${tooEarly.status} instead of 409`);
assert.equal(tooEarly.json.code, 'lifestyle_required');
assert.equal((await call('GET', '/api/matching/me/usage', { token: a.token })).json.scansUsed, usageBeforeQuiz.json.scansUsed, 'a rejected scan must not consume a scan');

// Now save the lifestyle record (GET round-trip) that unblocks matching.
const lifestyleSaved = await call('PUT', '/api/users/me/lifestyle', { token: a.token, body: lifestyleBody() });
assert.equal(lifestyleSaved.status, 200, `lifestyle PUT returned ${lifestyleSaved.status}: ${lifestyleSaved.text.slice(0, 200)}`);
const lifestyleReread = await call('GET', '/api/users/me/lifestyle', { token: a.token });
assert.deepEqual(lifestyleReread.json, lifestyleSaved.json, 'GET /me/lifestyle must read back the PUT');
assert.equal((await call('GET', '/api/matching/me/usage', { token: a.token })).json.scansUsed, usageBeforeQuiz.json.scansUsed, 'saving profile/lifestyle/housing/quiz must not consume a scan');

// 7c. Explicit recalculation: 200 with candidatesScored and the first page of matches.
//     The request carries no body and no parameter.
const recalculated = await call('POST', '/api/matching/me/recalculate', { token: a.token });
assert.equal(recalculated.status, 200, `recalculate returned ${recalculated.status}: ${recalculated.text.slice(0, 200)}`);
assert.deepEqual(Object.keys(recalculated.json).sort(), ['candidatesScored', 'matches'], 'recalculate must return exactly candidatesScored and matches');
assert.ok(Number.isInteger(recalculated.json.candidatesScored) && recalculated.json.candidatesScored >= 1, `candidatesScored should count B (got ${recalculated.json.candidatesScored})`);
const matchPage = recalculated.json.matches;
for (const key of ['items', 'page', 'pageSize', 'totalCount', 'hasNextPage']) {
  assert.ok(key in matchPage, `matches page is missing ${key}`);
}
assert.ok(matchPage.totalCount >= 1, 'A must see at least one match after recalculating');
assert.ok(matchPage.items.length >= 1, 'the first match page must not be empty');

// The first page is ordered by score, so with earlier members already in the database B is
// not guaranteed to be on it. Ask for B by (unique) name to prove the pair was really scored.
const bMatches = await call('GET', `/api/matching/me/matches?q=${encodeURIComponent(b.body.displayName)}`, { token: a.token });
assert.equal(bMatches.status, 200, `filtered matches returned ${bMatches.status}: ${bMatches.text.slice(0, 200)}`);
const bMatch = bMatches.json.items.find((m) => m.id === b.userId);
assert.ok(bMatch, "B must appear in A's matches after recalculating");
assert.ok(bMatch.score >= 0 && bMatch.score <= 100, 'score must be 0-100');
assert.ok(Array.isArray(bMatch.breakdown) && bMatch.breakdown.length > 0, 'a match must carry its breakdown');

// Saving again must not silently recalculate: only the explicit call spends a scan.
const usageAfterFirstScan = await call('GET', '/api/matching/me/usage', { token: a.token });
assert.equal(usageAfterFirstScan.json.scansUsed, usageBeforeQuiz.json.scansUsed + 1, 'one explicit recalculate must spend exactly one scan');
await call('PUT', '/api/users/me/profile', { token: a.token, body: { displayName: 'Flow A Again', city: 'Hà Nội' } });
await call('PUT', '/api/users/me/lifestyle', { token: a.token, body: lifestyleBody({ cleanliness: 5 }) });
await call('PUT', '/api/users/me/housing-needs', { token: a.token, body: housingBody({ drinking: true }) });
await call('PUT', '/api/matching/me/quiz', { token: a.token, body: { answers } });
const usageAfterSaves = await call('GET', '/api/matching/me/usage', { token: a.token });
assert.equal(usageAfterSaves.json.scansUsed, usageAfterFirstScan.json.scansUsed, 'PUT profile/lifestyle/housing/quiz must never recalculate or spend a scan');


// 7d. The monthly limit is read from the API, never assumed: exhaust the remaining scans
//     and prove the last call is 403 scan_quota_exceeded with a resetsAt.
const limit = usageAfterSaves.json.scansLimit;
assert.ok(Number.isInteger(limit) && limit > 0, `a free account must expose a numeric scansLimit (got ${limit})`);
let successes = usageAfterSaves.json.scansUsed;
while (successes < limit) {
  const next = await call('POST', '/api/matching/me/recalculate', { token: a.token });
  assert.equal(next.status, 200, `scan ${successes + 1}/${limit} returned ${next.status}: ${next.text.slice(0, 200)}`);
  successes += 1;
}
const exhausted = await call('POST', '/api/matching/me/recalculate', { token: a.token });
assert.equal(exhausted.status, 403, `recalculate past the limit returned ${exhausted.status} instead of 403`);
assert.equal(exhausted.json.code, 'scan_quota_exceeded');
assert.ok(exhausted.json.resetsAt, 'scan_quota_exceeded must carry resetsAt');
assert.ok(exhausted.contentType.includes('problem+json'), 'quota errors are problem details');

const finalUsage = await call('GET', '/api/matching/me/usage', { token: a.token });
assert.equal(finalUsage.json.scansUsed, limit, 'usage must report the spent scans against the limit');
assert.equal(finalUsage.json.scansRemaining, 0);
assert.equal(finalUsage.json.periodResetsAt, exhausted.json.resetsAt, 'resetsAt must match the period reset');

// 8. The scan budget is per account: B has its own lifestyle record and its own monthly
//    scans, so B recalculating succeeds even though A already exhausted its own quota.
const bRecalc = await call('POST', '/api/matching/me/recalculate', { token: b.token });
assert.equal(bRecalc.status, 200, `B recalculate returned ${bRecalc.status}: ${bRecalc.text.slice(0, 200)}`);
assert.ok(bRecalc.json.candidatesScored >= 1);
const bUsage = await call('GET', '/api/matching/me/usage', { token: b.token });
assert.equal(bUsage.json.scansUsed, 1, "B's scan budget must be counted separately from A's");

console.log(
  'PASS: onboarding -> quiz -> matching flow - anonymous 401 on every private step, public question set, '
  + 'profile/lifestyle/housing-needs/quiz PUT->GET round-trips, quiz 404/400 contract, 409 lifestyle_required before lifestyle, '
  + `recalculate 200 with candidatesScored+matches, quota limit read from /me/usage (${limit}/month) and 403 scan_quota_exceeded + resetsAt at the real limit, `
  + 'per-account scan budgets, and saving profile/lifestyle/housing/quiz never recalculates or spends a scan.',
);

