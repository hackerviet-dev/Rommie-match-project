// Phase 4 regression check: the whole onboarding -> quiz -> matching backend flow on a real
// API + PostgreSQL, in the order the frontend should call it:
//   1) POST /api/auth/login            2) GET/PUT /api/users/me/profile
//   3) GET/PUT /api/users/me/lifestyle 4) GET/PUT /api/users/me/housing-needs
//   5) GET /api/matching/quiz          6) GET/PUT /api/matching/me/quiz
//   7) POST /api/matching/me/recalculate
//   8) GET /api/matching/me/matches (the Phase 3 roommate list)
// Usage: node scripts/matching-flow-api-test.mjs http://localhost:5000
// The credential endpoints (register/login) allow 10 requests per 60s per IP, and this script
// uses 5, so wait a minute between runs or the next run stops on a 429.
// Requires the local PostgreSQL container for the Premium fixture and the read-time visibility
// checks (override the container with POSTGRES_CONTAINER, default roomiematch-postgres-1).
// Covers: anonymous access is refused on every private step, the public question set, the
// 404/400 quiz contract, recalculation needing a lifestyle (409 lifestyle_required), the
// scan quota actually taken from GET /me/usage (never a hard-coded guess), the 403
// scan_quota_exceeded + resetsAt at the real limit, per-account scan budgets, and the fact
// that saving profile, lifestyle, housing needs or quiz never recalculates matches or
// spends a scan.
// Phase 3 (the list the frontend renders): GET /api/matching/me/matches is always the
// token's own list (never the caller, never another account), pages with totalCount /
// hasNextPage and a stable score order, returns an empty page for an unscored account,
// answers 400 for invalid queries, honours the standard filters, returns a score/breakdown
// that equals the stored scoring row, costs no scan, refuses the Premium filters with 403
// premium_required on the free plan but allows them for an active subscription, and hides
// candidates whose profile is private, whose account is disabled, who are not a plain
// member, or who are blocked.
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

const stamp = Date.now();
const createdEmails = [];

async function register(label) {
  const body = {
    email: `flow-${label}-${stamp}@example.com`,
    password,
    displayName: `Flow ${label} ${stamp}`,
    city: 'TP.HCM',
  };
  const { status, json } = await call('POST', '/api/auth/register', { body });
  assert.equal(status, 200, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  createdEmails.push(body.email);
  return { body, token: json.accessToken, userId: json.user.id };
}

// The page envelope every list endpoint returns, and the criteria a recalculated breakdown
// always carries (a missing key means the stored scoring row predates the current scorer).
const PAGE_KEYS = ['items', 'page', 'pageSize', 'totalCount', 'hasNextPage'];
const SCORE_KEYS = ['budget', 'cleanliness', 'interests', 'lifestyle', 'location', 'noise', 'sleep', 'social', 'timing'];

async function run() {
  const health = await call('GET', '/health');
  assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

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
    ['GET', '/api/matching/me/matches'],
    ['GET', '/api/matching/me/matches/00000000-0000-0000-0000-000000000001'],
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
  const d = await register('d'); // Stays without a lifestyle, so it never gets scored: the empty list.
  const login = await call('POST', '/api/auth/login', { body: { email: a.body.email, password } });
  assert.equal(login.status, 200, `login returned ${login.status}: ${login.text.slice(0, 200)}`);
  assert.ok(typeof login.json.accessToken === 'string' && login.json.accessToken.length > 0, 'login must return accessToken');
  assert.ok(typeof login.json.refreshToken === 'string' && login.json.refreshToken.length > 0, 'login must return refreshToken');
  assert.equal(login.json.tokenType, 'Bearer');
  assert.equal(login.json.user.id, a.userId);
  a.token = login.json.accessToken;

  // B supplies lifestyle so A has someone to be scored against. B never calls recalculate,
  // so B keeps its own scan quota for other checks. B smokes and does not accept pets, which
  // gives the standard filters something to exclude later.
  const bLifestyle = await call('PUT', '/api/users/me/lifestyle', {
    token: b.token,
    body: lifestyleBody({ sleepSchedule: '01:00–09:00', cleanliness: 2, smoking: true, petFriendly: false }),
  });
  assert.equal(bLifestyle.status, 200, `B lifestyle PUT returned ${bLifestyle.status}: ${bLifestyle.text.slice(0, 200)}`);

  // 2. Profile: GET then full-replace PUT, then GET reads the change back. A shares B's city
  //    (TP.HCM) so the sameCity filter has something to keep.
  const profileBefore = await call('GET', '/api/users/me/profile', { token: a.token });
  assert.equal(profileBefore.status, 200);
  assert.equal(profileBefore.json.userId, a.userId);
  const profileSaved = await call('PUT', '/api/users/me/profile', {
    token: a.token,
    body: { displayName: 'Flow A Updated', city: 'TP.HCM', district: 'Cầu Giấy', gender: 'female', birthDate: '2004-10-02', occupation: 'Sinh viên', bio: 'Xin chào' },
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

  // 6. Quiz result: 204 before answering, 400 for an incomplete body, PUT -> GET round-trip.
  const quizBefore = await call('GET', '/api/matching/me/quiz', { token: a.token });
  assert.equal(quizBefore.status, 204, 'quiz result must be 204 before answering');
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
  for (const key of PAGE_KEYS) {
    assert.ok(key in matchPage, `matches page is missing ${key}`);
  }
  assert.ok(matchPage.totalCount >= 2, 'A must see more than one match after recalculating');
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
  await call('PUT', '/api/users/me/profile', { token: a.token, body: { displayName: 'Flow A Again', city: 'TP.HCM' } });
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

  // -------------------------------------------------------------------------
  // 9. Phase 3: GET /api/matching/me/matches. Anonymous access was refused in step 0;
  //    here the list must be the token's own, never the caller, never another account.
  // -------------------------------------------------------------------------
  const firstList = await call('GET', '/api/matching/me/matches', { token: a.token });
  assert.equal(firstList.status, 200, `GET me/matches returned ${firstList.status}: ${firstList.text.slice(0, 200)}`);
  for (const key of PAGE_KEYS) {
    assert.ok(key in firstList.json, `matches page is missing ${key}`);
  }
  assert.equal(firstList.json.page, 1, 'the default page is 1');
  assert.equal(firstList.json.pageSize, 20, 'the default pageSize is 20');
  assert.equal(firstList.json.hasNextPage, firstList.json.totalCount > 20, 'hasNextPage follows page * pageSize < totalCount');
  assert.equal(firstList.json.items.length, Math.min(20, firstList.json.totalCount));
  assert.equal(firstList.json.totalCount, recalculated.json.matches.totalCount, 'the recalculate response and the list endpoint must agree on totalCount');
  assert.ok(firstList.json.items.every((m) => m.id !== a.userId), 'the caller is never in their own match list');
  assert.ok(firstList.json.items.some((m) => m.id === b.userId), "B (scored by A) is in A's list");
  assert.ok(!firstList.json.items.some((m) => m.id === d.userId), 'an account nobody scored is absent from the list');
  // There is no userId parameter: an extra one is ignored, so one member cannot read another's list.
  const spoofed = await call('GET', `/api/matching/me/matches?userId=${d.userId}&candidateId=${d.userId}`, { token: a.token });
  assert.equal(spoofed.status, 200);
  assert.equal(spoofed.json.totalCount, firstList.json.totalCount, 'the list is keyed by the token, not by a query parameter');
  assert.ok(spoofed.json.items.every((m) => m.id !== d.userId), 'the ignored query parameter cannot inject another account');

  // 10. Paging: page/pageSize control the slice, totalCount stays the whole list, hasNextPage
  //     follows, the same request comes back in the same order, and a page past the end is empty.
  const page1 = await call('GET', '/api/matching/me/matches?page=1&pageSize=1', { token: a.token });
  const page2 = await call('GET', '/api/matching/me/matches?page=2&pageSize=1', { token: a.token });
  const page1Again = await call('GET', '/api/matching/me/matches?page=1&pageSize=1', { token: a.token });
  assert.equal(page1.status, 200);
  assert.equal(page2.status, 200);
  assert.equal(page1.json.page, 1);
  assert.equal(page2.json.page, 2);
  assert.equal(page1.json.pageSize, 1);
  assert.equal(page1.json.totalCount, firstList.json.totalCount);
  assert.equal(page2.json.totalCount, firstList.json.totalCount);
  assert.equal(page1.json.items.length, 1);
  assert.equal(page2.json.items.length, 1);
  assert.notEqual(page1.json.items[0].id, page2.json.items[0].id, 'page 2 must not repeat page 1');
  assert.equal(page1.json.hasNextPage, firstList.json.totalCount > 1);
  assert.equal(page2.json.hasNextPage, firstList.json.totalCount > 2);
  assert.deepEqual(page1Again.json, page1.json, 'the same page must come back in the same order');

  const beyond = await call('GET', `/api/matching/me/matches?page=${firstList.json.totalCount + 5}&pageSize=1`, { token: a.token });
  assert.equal(beyond.status, 200);
  assert.deepEqual(beyond.json.items, [], 'a page past the end is empty, not an error');
  assert.equal(beyond.json.totalCount, firstList.json.totalCount);
  assert.equal(beyond.json.hasNextPage, false);

  // 11. Ordering is by score (a boosted profile may rank above a higher score, but a plain
  //     profile never does), so the highest scoring candidates come first.
  const scored = await call('GET', '/api/matching/me/matches?pageSize=50', { token: a.token });
  assert.equal(scored.status, 200);
  assert.equal(scored.json.pageSize, 50);
  assert.equal(scored.json.items.length, Math.min(50, scored.json.totalCount));
  for (let i = 1; i < scored.json.items.length; i += 1) {
    const previous = scored.json.items[i - 1];
    if (!previous.isBoosted) {
      assert.ok(previous.score >= scored.json.items[i].score, `ordered by score (${previous.score} before ${scored.json.items[i].score})`);
    }
  }

  // 12. Score and breakdown: right types and ranges, every scored criterion present, and the
  //     overall score is the weighted average of the breakdown the API returns.
  for (const match of scored.json.items) {
    assert.equal(typeof match.id, 'string', 'a match carries the candidate id');
    assert.equal(typeof match.name, 'string', 'a match carries the candidate name');
    assert.ok(match.name.length > 0, 'a match name must not be blank');
    assert.equal(typeof match.city, 'string', 'a match carries the candidate city');
    assert.ok(Number.isInteger(match.score) && match.score >= 0 && match.score <= 100, `score ${match.score} out of range`);
    assert.ok(Array.isArray(match.breakdown) && match.breakdown.length > 0, 'a match must carry its breakdown');
    const keys = match.breakdown.map((component) => component.key);
    assert.equal(new Set(keys).size, keys.length, 'breakdown keys are unique');
    assert.deepEqual([...keys].sort(), SCORE_KEYS, 'a recalculated breakdown carries every scored criterion');
    let weightSum = 0;
    let weighted = 0;
    for (const component of match.breakdown) {
      assert.equal(typeof component.key, 'string');
      assert.equal(typeof component.label, 'string');
      assert.ok(component.label.length > 0, `${component.key} needs a label`);
      assert.ok(Number.isInteger(component.value) && component.value >= 0 && component.value <= 100, `${component.key} value out of range`);
      assert.ok(Number.isInteger(component.weight) && component.weight > 0, `${component.key} weight must be positive`);
      weightSum += component.weight;
      weighted += component.value * component.weight;
    }
    assert.equal(weightSum, 100, 'the criterion weights add up to 100');
    assert.ok(Math.abs(Math.round(weighted / weightSum) - match.score) <= 1, 'score is the weighted average of the breakdown');
    assert.equal(typeof match.explanation, 'string');
  }

  // The stored scoring row is the source of truth: the API must read back the same numbers.
  // B's row is read from the fresh page, because saving A's lifestyle after recalculation
  // changes the next recalculation's numbers (and the read reflects the stored row).
  assert.equal(scored.json.items.length, scored.json.totalCount, 'pageSize 50 must cover the whole list for this check');
  const scoredB = scored.json.items.find((m) => m.id === b.userId);
  assert.ok(scoredB, "B is in A's scored page");
  const storedRow = sql(`SELECT overall_score||'|'||breakdown::text FROM matching_scores WHERE user_id='${a.userId}' AND candidate_user_id='${b.userId}'`);
  const [storedScore, storedBreakdown] = storedRow.split('|');
  assert.equal(Number(storedScore), scoredB.score, 'the list score must equal matching_scores.overall_score');
  assert.deepEqual(
    Object.fromEntries(scoredB.breakdown.map((component) => [component.key, component.value])),
    JSON.parse(storedBreakdown),
    'the returned breakdown must equal matching_scores.breakdown',
  );

  // 13. An account nobody has scored gets an empty page, and so does a filter that matches nothing.
  const emptyList = await call('GET', '/api/matching/me/matches', { token: d.token });
  assert.equal(emptyList.status, 200);
  for (const key of PAGE_KEYS) {
    assert.ok(key in emptyList.json, `empty page is missing ${key}`);
  }
  assert.deepEqual(emptyList.json.items, [], 'an account with no scores gets an empty page');
  assert.equal(emptyList.json.totalCount, 0);
  assert.equal(emptyList.json.hasNextPage, false);
  assert.equal(emptyList.json.page, 1);

  const none = await call('GET', `/api/matching/me/matches?q=${encodeURIComponent(`zzz-no-such-name-${stamp}`)}`, { token: a.token });
  assert.equal(none.status, 200);
  assert.deepEqual(none.json.items, []);
  assert.equal(none.json.totalCount, 0);
  assert.equal(none.json.hasNextPage, false);

  // 14. Isolation: each token reads its own scores. B's list is B's own (it contains A, not
  //     B nor the unscored account), even though A's list contains B.
  const bList = await call('GET', '/api/matching/me/matches', { token: b.token });
  assert.equal(bList.status, 200);
  assert.ok(!bList.json.items.some((m) => m.id === b.userId), "B is never in B's own list");
  assert.ok(bList.json.items.some((m) => m.id === a.userId), "A appears in B's own list");
  assert.ok(!bList.json.items.some((m) => m.id === d.userId), 'the unscored account is absent from B too');

  // 15. Standard (free) filters narrow the list. A is on the free plan, so only these are allowed.
  const byName = await call('GET', `/api/matching/me/matches?q=${encodeURIComponent(b.body.displayName)}`, { token: a.token });
  assert.equal(byName.status, 200);
  const byNameB = byName.json.items.find((m) => m.id === b.userId);
  assert.ok(byNameB, 'q must match the display name and return B');
  assert.equal(byName.json.totalCount, 1, 'the display name is unique, so q returns exactly B');

  const atLeast = await call('GET', `/api/matching/me/matches?minScore=${byNameB.score}`, { token: a.token });
  assert.equal(atLeast.status, 200);
  assert.ok(atLeast.json.items.some((m) => m.id === b.userId), "minScore at B's own score keeps B");
  assert.ok(atLeast.json.items.every((m) => m.score >= byNameB.score), 'minScore drops every lower score');

  const sameCity = await call('GET', '/api/matching/me/matches?sameCity=true&pageSize=50', { token: a.token });
  assert.equal(sameCity.status, 200);
  assert.ok(sameCity.json.items.some((m) => m.id === b.userId), "B shares A's city, so sameCity keeps B");
  assert.ok(sameCity.json.items.every((m) => m.city.trim().toLowerCase() === 'tp.hcm'), "sameCity keeps only candidates in A's city");

  const petFriendly = await call('GET', `/api/matching/me/matches?petFriendly=true&q=${encodeURIComponent(b.body.displayName)}`, { token: a.token });
  assert.equal(petFriendly.status, 200);
  assert.ok(!petFriendly.json.items.some((m) => m.id === b.userId), 'B does not accept pets, so petFriendly=true hides B');

  const nonSmoking = await call('GET', `/api/matching/me/matches?nonSmoking=true&q=${encodeURIComponent(b.body.displayName)}`, { token: a.token });
  assert.equal(nonSmoking.status, 200);
  assert.ok(!nonSmoking.json.items.some((m) => m.id === b.userId), 'B smokes, so nonSmoking=true hides B');

  const moveInBy = await call('GET', `/api/matching/me/matches?moveInBy=2027-12-31&q=${encodeURIComponent(b.body.displayName)}`, { token: a.token });
  assert.equal(moveInBy.status, 200);
  assert.ok(!moveInBy.json.items.some((m) => m.id === b.userId), 'B has no move-in date, so moveInBy drops B');

  // 16. Invalid queries are rejected with 400 problem details, never a 500 and never a silently
  //     ignored value. Validation runs before the Premium gate, so these are 400 even for Free.
  for (const [label, query] of [
    ['page 0', 'page=0'],
    ['pageSize 0', 'pageSize=0'],
    ['pageSize above the maximum', 'pageSize=51'],
    ['page not a number', 'page=abc'],
    ['minScore above 100', 'minScore=101'],
    ['minScore below 0', 'minScore=-1'],
    ['budgetMin below 0', 'budgetMin=-1'],
    ['budgetMax below budgetMin', 'budgetMin=5000000&budgetMax=1000000'],
    ['unknown roomEnvironment', 'roomEnvironment=noisy'],
    ['minCleanliness above 5', 'minCleanliness=6'],
    ['q over 60 characters', `q=${'a'.repeat(61)}`],
    ['district over 100 characters', `district=${'a'.repeat(101)}`],
  ]) {
    const { status, contentType } = await call('GET', `/api/matching/me/matches?${query}`, { token: a.token });
    assert.equal(status, 400, `${label} returned ${status} instead of 400`);
    assert.ok(contentType.includes('problem+json'), `${label} must answer with problem details`);
  }

  // 17. The advanced filters answer 403 premium_required on the free plan, while a standard
  //     filter keeps working. The code is stable so the app can show the Premium upsell.
  for (const [label, query] of [
    ['budgetMin', 'budgetMin=1000000'],
    ['budgetMax', 'budgetMax=6000000'],
    ['district', `district=${encodeURIComponent('Quận 1')}`],
    ['roomEnvironment', 'roomEnvironment=quiet'],
    ['minCleanliness', 'minCleanliness=3'],
    ['verifiedOnly', 'verifiedOnly=true'],
  ]) {
    const { status, json, contentType } = await call('GET', `/api/matching/me/matches?${query}`, { token: a.token });
    assert.equal(status, 403, `free plan ${label} filter returned ${status} instead of 403`);
    assert.equal(json.code, 'premium_required', `${label} must carry the premium_required code`);
    assert.ok(contentType.includes('problem+json'), `${label} must answer with problem details`);
  }
  const freeStandard = await call('GET', `/api/matching/me/matches?q=${encodeURIComponent(b.body.displayName)}`, { token: a.token });
  assert.equal(freeStandard.status, 200, 'the standard filters must stay available on the free plan');

  // 18. Reading the list never spends a scan: only recalculate is billed.
  const usageBeforeReads = await call('GET', '/api/matching/me/usage', { token: b.token });
  await call('GET', '/api/matching/me/matches', { token: b.token });
  await call('GET', '/api/matching/me/matches?page=1&pageSize=5', { token: b.token });
  await call('GET', '/api/matching/me/matches?q=x', { token: b.token });
  const usageAfterReads = await call('GET', '/api/matching/me/usage', { token: b.token });
  assert.equal(usageAfterReads.json.scansUsed, usageBeforeReads.json.scansUsed, 'reading the match list must not spend a scan');

  // 19. Premium unlocks the advanced filters. The subscription is seeded straight into the
  //     table (the same test mechanism the admin script uses); no plan policy or payment
  //     integration is touched. IsPremium reads the row live, so no fresh token is needed.
  const premium = await register('premium');
  const premiumLifestyle = await call('PUT', '/api/users/me/lifestyle', {
    token: premium.token,
    body: lifestyleBody({ sleepSchedule: '22:00–06:00', smoking: false, petFriendly: false }),
  });
  assert.equal(premiumLifestyle.status, 200, `premium lifestyle PUT returned ${premiumLifestyle.status}: ${premiumLifestyle.text.slice(0, 200)}`);
  const premiumRecalc = await call('POST', '/api/matching/me/recalculate', { token: premium.token });
  assert.equal(premiumRecalc.status, 200, `premium account recalculate returned ${premiumRecalc.status}: ${premiumRecalc.text.slice(0, 200)}`);

  const stillFree = await call('GET', '/api/matching/me/matches?verifiedOnly=true', { token: premium.token });
  assert.equal(stillFree.status, 403, 'the account stays on the free plan until the subscription is granted');

  sql(`INSERT INTO subscriptions (user_id, plan, status, starts_at, ends_at) VALUES ('${premium.userId}', 'premium', 'active', now(), now() + interval '1 month')`);

  const premiumUsage = await call('GET', '/api/matching/me/usage', { token: premium.token });
  assert.equal(premiumUsage.json.isPremium, true, 'the active subscription must mark the account Premium');
  assert.equal(premiumUsage.json.scansLimit, null, 'Premium scans are unlimited');
  assert.equal(premiumUsage.json.scansRemaining, null);

  const premiumAll = await call('GET', '/api/matching/me/matches?pageSize=50', { token: premium.token });
  assert.equal(premiumAll.status, 200);
  assert.ok(premiumAll.json.totalCount >= 1, 'the Premium account scored candidates of its own');
  assert.ok(!premiumAll.json.items.some((m) => m.id === premium.userId));

  const byDistrict = await call('GET', `/api/matching/me/matches?district=${encodeURIComponent('Quận 1')}&pageSize=50`, { token: premium.token });
  assert.equal(byDistrict.status, 200, `Premium district filter returned ${byDistrict.status}: ${byDistrict.text.slice(0, 200)}`);
  assert.ok(byDistrict.json.totalCount >= 1, 'the Quận 1 seed profiles must be visible to Premium');
  assert.ok(byDistrict.json.items.every((m) => m.district === 'Quận 1'), 'the district filter keeps only the requested district');

  const byVerified = await call('GET', '/api/matching/me/matches?verifiedOnly=true&pageSize=50', { token: premium.token });
  assert.equal(byVerified.status, 200);
  assert.ok(byVerified.json.totalCount >= 1, 'the verified seed profiles must stay visible to Premium');
  assert.ok(byVerified.json.items.every((m) => m.isVerified), 'verifiedOnly keeps only verified profiles');

  const byBudget = await call('GET', '/api/matching/me/matches?budgetMin=3500000&budgetMax=6000000&pageSize=50', { token: premium.token });
  assert.equal(byBudget.status, 200);
  assert.ok(byBudget.json.items.every((m) => m.budgetMax >= 3500000 && m.budgetMin <= 6000000), 'the budget filter keeps overlapping ranges');

  const combined = await call('GET', '/api/matching/me/matches?roomEnvironment=quiet&minCleanliness=3&pageSize=50', { token: premium.token });
  assert.equal(combined.status, 200, `combined advanced filters returned ${combined.status}: ${combined.text.slice(0, 200)}`);
  const allPremiumIds = new Set(premiumAll.json.items.map((m) => m.id));
  assert.ok(combined.json.items.every((m) => allPremiumIds.has(m.id)), 'a filtered list is a subset of the unfiltered list');

  // 20. Visibility is decided when the list is read, not when the scores were written: hiding
  //     a profile, disabling an account, changing its role or blocking it removes the candidate
  //     at once, and restoring the state brings it back.
  const bQuery = `q=${encodeURIComponent(b.body.displayName)}`;
  assert.ok((await call('GET', `/api/matching/me/matches?${bQuery}`, { token: a.token })).json.items.some((m) => m.id === b.userId), 'B starts visible');

  sql(`UPDATE profiles SET is_public = false WHERE user_id = '${b.userId}'`);
  assert.ok(!(await call('GET', `/api/matching/me/matches?${bQuery}`, { token: a.token })).json.items.some((m) => m.id === b.userId), 'a private profile leaves the list immediately');
  sql(`UPDATE profiles SET is_public = true WHERE user_id = '${b.userId}'`);

  sql(`UPDATE users SET is_active = false WHERE id = '${b.userId}'`);
  assert.ok(!(await call('GET', `/api/matching/me/matches?${bQuery}`, { token: a.token })).json.items.some((m) => m.id === b.userId), 'a disabled account is not a candidate');
  sql(`UPDATE users SET is_active = true WHERE id = '${b.userId}'`);

  sql(`UPDATE users SET role = 'moderator' WHERE id = '${b.userId}'`);
  assert.ok(!(await call('GET', `/api/matching/me/matches?${bQuery}`, { token: a.token })).json.items.some((m) => m.id === b.userId), 'only plain members are candidates');
  sql(`UPDATE users SET role = 'member' WHERE id = '${b.userId}'`);

  sql(`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ('${a.userId}', '${b.userId}') ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET deleted_at = NULL`);
  assert.ok(!(await call('GET', `/api/matching/me/matches?${bQuery}`, { token: a.token })).json.items.some((m) => m.id === b.userId), 'a block hides the candidate');
  sql(`DELETE FROM user_blocks WHERE blocker_id = '${a.userId}' AND blocked_id = '${b.userId}'`);

  assert.ok((await call('GET', `/api/matching/me/matches?${bQuery}`, { token: a.token })).json.items.some((m) => m.id === b.userId), 'B is visible again once the conditions are restored');
}

// Everything this run created is removed again: deleting the users cascades their profile,
// lifestyle, quiz response, matching scores (both directions), scan runs, blocks and the
// Premium subscription, so only rows created here disappear.
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
  console.log(
    'PASS: onboarding -> quiz -> matching flow - anonymous 401 on every private step, public question set, '
    + 'profile/lifestyle/housing-needs/quiz PUT->GET round-trips, quiz 204/400 contract, 409 lifestyle_required before lifestyle, '
    + 'recalculate 200 with candidatesScored+matches, quota limit read from /me/usage and 403 scan_quota_exceeded + resetsAt at the real limit, '
    + 'per-account scan budgets, and saving profile/lifestyle/housing/quiz never recalculates or spends a scan. '
    + 'Phase 3 matches list: 401 anonymous, token-owned list with no self and no cross-account leak, paging/totalCount/'
    + 'hasNextPage/stable score order, empty page for an unscored account, 400 invalid queries, standard filters applied, '
    + 'score/breakdown equal to the stored scoring row, no scan spent on reads, 403 premium_required for advanced filters on '
    + 'Free but allowed for an active Premium subscription, and private/disabled/non-member/blocked candidates hidden at read time.',
  );
}











