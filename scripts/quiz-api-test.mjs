// Regression check for the quiz backend APIs, run against a real API and PostgreSQL:
//   GET /api/matching/quiz (public) and GET/PUT /api/matching/me/quiz (JWT).
// Usage: node scripts/quiz-api-test.mjs http://localhost:5000
// Covers: the server question set and its ids, anonymous access is refused, 404 before a
// result exists, 400 for missing/unknown/invalid answers (never 500), the PUT -> GET
// round-trip with backend-computed traits/tags, a retake that replaces the previous answers
// (completed_at kept, updated_at moves) without rescoring matches, and two accounts staying
// independent.
import assert from 'node:assert/strict';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
const password = 'RoomieTest123!';

async function call(method, path, { token, body, raw } = {}) {
  const hasBody = body !== undefined || raw !== undefined;
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: hasBody ? (raw ?? JSON.stringify(body)) : undefined,
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

// The questions and option ids the scorer is written against. Changing an id means a new
// quiz code, so this list is the contract the app builds its answers from.
const EXPECTED_QUESTIONS = ['weekend_guests', 'late_dishes', 'saturday_morning', 'shared_costs', 'sofa_guest'];

const ALL_MAX = {
  weekend_guests: 'welcome',
  late_dishes: 'wash_now',
  saturday_morning: 'early_run',
  shared_costs: 'split_evenly',
  sofa_guest: 'of_course',
};
const ALL_MIN = {
  weekend_guests: 'quiet_weekends',
  late_dishes: 'might_forget',
  saturday_morning: 'sleep_in',
  shared_costs: 'each_pays',
  sofa_guest: 'no_guests',
};
const MIDDLE = {
  weekend_guests: 'with_notice',
  late_dishes: 'next_morning',
  saturday_morning: 'brunch',
  shared_costs: 'itemize',
  sofa_guest: 'ask_roommate',
};

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

// 1. The question set is public, needs no body/parameter, and is self-describing: the app
//    builds the submit body from these ids.
const quiz = await call('GET', '/api/matching/quiz');
assert.equal(quiz.status, 200, `GET /api/matching/quiz returned ${quiz.status}`);
assert.equal(quiz.json.code, 'lifestyle_v1');
assert.ok(typeof quiz.json.title === 'string' && quiz.json.title.length > 0, 'quiz title is required');
const questions = quiz.json.questions;
assert.ok(Array.isArray(questions) && questions.length > 0, 'questions must not be empty');
assert.deepEqual(questions.map((q) => q.id).sort(), [...EXPECTED_QUESTIONS].sort(), 'server questions changed');

for (const question of questions) {
  assert.ok(typeof question.id === 'string' && question.id.length > 0, 'question id is required');
  assert.ok(typeof question.text === 'string' && question.text.length > 0, `${question.id} needs text`);
  assert.ok(typeof question.emoji === 'string' && question.emoji.length > 0, `${question.id} needs an emoji`);
  assert.ok(Array.isArray(question.options) && question.options.length >= 2, `${question.id} needs options`);
  const optionIds = question.options.map((o) => o.id);
  assert.equal(new Set(optionIds).size, optionIds.length, `${question.id} has duplicate option ids`);
  for (const option of question.options) {
    assert.ok(typeof option.id === 'string' && option.id.length > 0, `${question.id} option id is required`);
    assert.ok(typeof option.text === 'string' && option.text.length > 0, `${question.id} option text is required`);
  }
}

// 2. Only the question set is public; the member's own result always needs a token.
for (const [method, path, body] of [
  ['GET', '/api/matching/me/quiz'],
  ['PUT', '/api/matching/me/quiz', { answers: ALL_MAX }],
]) {
  const { status } = await call(method, path, { body });
  assert.equal(status, 401, `${method} ${path} without a token returned ${status}`);
}

const stamp = Date.now();

async function register(label) {
  const body = {
    email: `quiz-api-${label}-${stamp}@example.com`,
    password,
    displayName: `Quiz ${label}`,
    city: 'TP.HCM',
  };
  const { status, json } = await call('POST', '/api/auth/register', { body });
  assert.equal(status, 200, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  return { token: json.accessToken, userId: json.user.id };
}

// 3. Two members: A for the round-trip and retake, B to prove the rows stay separate.
const a = await register('a');
const b = await register('b');

// A member who has not answered gets 404, not an empty result.
for (const member of [a, b]) {
  const { status } = await call('GET', '/api/matching/me/quiz', { token: member.token });
  assert.equal(status, 404, `GET /api/matching/me/quiz before answering returned ${status}`);
}


// 4. Bad submissions are rejected with 400 and are keyed by question id. None may be 500 and
//    none may be stored.
// Every bad case names the question it is about, so the app can highlight the right one.
const [q1, q2] = questions;
const badAnswers = [
  ['no answer at all', {}, q1.id],
  ['one question missing', Object.fromEntries(Object.entries(ALL_MAX).filter(([id]) => id !== q1.id)), q1.id],
  ['unknown question id', { ...ALL_MAX, total_unknown: q1.options[0].id }, 'total_unknown'],
  ['option id that does not exist', { ...ALL_MAX, [q1.id]: 'not_an_option' }, q1.id],
  ['option id belonging to another question', { ...ALL_MAX, [q1.id]: q2.options[0].id }, q1.id],
  ['null option value', { ...ALL_MAX, [q1.id]: null }, q1.id],
  ['blank option value', { ...ALL_MAX, [q1.id]: '   ' }, q1.id],
];

for (const [label, answers, expectedKey] of badAnswers) {
  const { status, json, text } = await call('PUT', '/api/matching/me/quiz', { token: a.token, body: { answers } });
  assert.equal(status, 400, `PUT with "${label}" returned ${status} (${text.slice(0, 200)})`);
  const keys = Object.keys(json?.errors ?? {});
  assert.ok(
    keys.some((key) => key.includes(expectedKey)),
    `PUT with "${label}" did not report ${expectedKey}: ${text.slice(0, 200)}`,
  );
}

// A missing or null answers object is a bad request too, never a crash.
for (const [label, raw] of [
  ['answers omitted', '{}'],
  ['answers null', '{"answers":null}'],
  ['body null', 'null'],
]) {
  const { status, text } = await call('PUT', '/api/matching/me/quiz', { token: a.token, raw });
  assert.equal(status, 400, `PUT with "${label}" returned ${status} (${text.slice(0, 200)})`);
}

// Rejected requests must not have created a result.
assert.equal((await call('GET', '/api/matching/me/quiz', { token: a.token })).status, 404);


// 5. A valid submit is echoed back with the traits and tags the backend computed.
const scansBefore = (await call('GET', '/api/matching/me/usage', { token: a.token })).json.scansUsed;

const savedMax = await call('PUT', '/api/matching/me/quiz', { token: a.token, body: { answers: ALL_MAX } });
assert.equal(savedMax.status, 200, `valid PUT returned ${savedMax.status}: ${savedMax.text.slice(0, 300)}`);
assert.equal(savedMax.json.code, 'lifestyle_v1');
assert.equal(savedMax.json.title, quiz.json.title);
assert.deepEqual(savedMax.json.answers, ALL_MAX, 'stored answers must match what was sent');
assert.deepEqual(savedMax.json.traits, { noiseTolerance: 88, tidiness: 95, earlyBird: 90, costSplit: 'split_evenly' });
assert.deepEqual(savedMax.json.tags, ['Thích náo nhiệt', 'Gọn gàng', 'Dậy sớm']);
assert.ok(Date.parse(savedMax.json.completedAt) > 0 && Date.parse(savedMax.json.updatedAt) > 0);

// 6. GET reads the same record back.
const rereadMax = await call('GET', '/api/matching/me/quiz', { token: a.token });
assert.equal(rereadMax.status, 200);
assert.deepEqual(rereadMax.json, savedMax.json, 'GET must return what PUT stored');

// 7. Saving answers does not touch the matching scan quota: recalculation is a separate call.
const scansAfter = (await call('GET', '/api/matching/me/usage', { token: a.token })).json.scansUsed;
assert.equal(scansAfter, scansBefore, 'PUT /me/quiz must not recalculate matches');

// 8. Answering again replaces the previous answers: completed_at stays, updated_at moves.
await new Promise((resolve) => setTimeout(resolve, 10));
const savedMin = await call('PUT', '/api/matching/me/quiz', { token: a.token, body: { answers: ALL_MIN } });
assert.equal(savedMin.status, 200);
assert.deepEqual(savedMin.json.answers, ALL_MIN, 'a retake replaces the earlier answers, it does not merge');
assert.equal(Object.keys(savedMin.json.answers).length, questions.length);
assert.deepEqual(savedMin.json.traits, { noiseTolerance: 15, tidiness: 20, earlyBird: 10, costSplit: 'each_pays' });
assert.deepEqual(savedMin.json.tags, ['Thích yên tĩnh', 'Cú đêm']);
assert.equal(savedMin.json.completedAt, savedMax.json.completedAt, 'completed_at is the first completion');
assert.ok(
  Date.parse(savedMin.json.updatedAt) >= Date.parse(savedMax.json.updatedAt),
  'updated_at must move on a retake',
);

const rereadMin = await call('GET', '/api/matching/me/quiz', { token: a.token });
assert.deepEqual(rereadMin.json, savedMin.json, 'GET must return the retake, not the first attempt');

// Option ids are stored trimmed, so a padded id from the app still matches.
const padded = await call('PUT', '/api/matching/me/quiz', {
  token: a.token,
  body: { answers: { ...ALL_MIN, [q1.id]: ` ${ALL_MIN[q1.id]} ` } },
});
assert.equal(padded.status, 200);
assert.equal(padded.json.answers[q1.id], ALL_MIN[q1.id]);
await call('PUT', '/api/matching/me/quiz', { token: a.token, body: { answers: ALL_MIN } });


// 9. Member B answers independently and neither member can see or overwrite the other.
const savedMiddleB = await call('PUT', '/api/matching/me/quiz', { token: b.token, body: { answers: MIDDLE } });
assert.equal(savedMiddleB.status, 200);
assert.deepEqual(savedMiddleB.json.answers, MIDDLE);
assert.deepEqual(savedMiddleB.json.traits, { noiseTolerance: 52, tidiness: 60, earlyBird: 50, costSplit: 'itemize' });
assert.deepEqual(savedMiddleB.json.tags, ['Linh hoạt']);

const aFinal = await call('GET', '/api/matching/me/quiz', { token: a.token });
assert.deepEqual(aFinal.json.answers, ALL_MIN, "B's submission must not change A");
assert.equal(aFinal.json.completedAt, savedMax.json.completedAt);
const bFinal = await call('GET', '/api/matching/me/quiz', { token: b.token });
assert.deepEqual(bFinal.json, savedMiddleB.json, 'B must read back its own record only');

console.log(
  'PASS: quiz APIs - public question set, anonymous 401, 404 before answering, 400 for missing/unknown/invalid answers, '
  + 'PUT->GET round-trip with computed traits/tags, retake replaces answers without rescoring, and per-account isolation.',
);

