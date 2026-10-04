// Regression check for the hyperlocal booking flow a member walks through, run against a real
// API and PostgreSQL:
//   GET  /api/hyperlocal/services
//   GET  /api/hyperlocal/services/{serviceId}
//   POST /api/hyperlocal/services/{serviceId}/bookings
//   GET  /api/hyperlocal/me/bookings
//   GET  /api/hyperlocal/me/bookings/{bookingId}
//   POST /api/hyperlocal/me/bookings/{bookingId}/cancel
//   GET  /api/hyperlocal/staff/bookings
//   POST /api/hyperlocal/staff/bookings/{bookingId}/confirm | /complete
// Usage: node scripts/service-bookings-api-test.mjs http://localhost:5000
// Requires the local PostgreSQL container for role promotion, for moving a booking
// into the past to exercise completion timing, and for cleanup (override the container
// with POSTGRES_CONTAINER).
// Covers: list -> detail -> book -> my list -> my detail -> cancel end to end, 401 for anonymous
// callers, 201 with a Location header and status pending, the 30-minute/60-day scheduling window
// and field validation as 400 (never 500), unknown and soft-deleted services 404, bookings of a
// later-deleted service still readable, my list paged newest first and scoped to the caller,
// another member's booking answering 404 for read and cancel, cancel setting cancelledAt, and a
// second cancel / past booking / completed booking answering 409 booking_not_cancellable.
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
  return { status: response.status, json, text, location: response.headers.get('location') };
}

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const stamp = Date.now();
const testEmails = [];
const createdServiceIds = [];

async function register(label, role) {
  const email = `booking-${label}-${stamp}@example.com`;
  const { status, json } = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `Booking ${label}`, city: 'TP.HCM' },
  });
  assert.ok(status === 200 || status === 201, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  testEmails.push(email);
  const onboarding = await call('PUT', '/api/users/me/onboarding', {
    token: json.accessToken,
    body: { name: `Booking ${label}`, age: '24', gender: 'Nam', employment: 'Đang đi làm',
      orgName: 'Booking QA', hideOrg: false, city: 'TP.HCM', bio: '', sleep: '22h–0h', env: 'Yên tĩnh',
      yn: { smoke: 'Không', drink: 'Không', pets: 'Có' }, cleanliness: 4, extroversion: 60,
      budgetMin: 3, budgetMax: 7, hasRoom: 'no', distance: '2–5 km', roomType: 'Phòng riêng',
      moveInDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric',
        month: '2-digit', day: '2-digit' }).format(new Date()), amenities: [] },
  });
  assert.equal(onboarding.status, 200, onboarding.text);
  if (role === undefined) {
    return json.accessToken;
  }
  sql(`UPDATE users SET role='${role}' WHERE email='${email}'`);
  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200, `login ${label} returned ${login.status}`);
  return login.json.accessToken;
}

const inHours = (hours) => new Date(Date.now() + hours * 3_600_000).toISOString();
const bookingBody = (overrides = {}) => ({
  scheduledAt: inHours(24),
  address: '12 Nguyễn Trãi, Quận 1, TP.HCM',
  contactPhone: '0901234567',
  note: 'Gọi trước 15 phút',
  ...overrides,
});

try {
  const memberA = await register('a');
  const memberB = await register('b');
  const admin = await register('admin', 'admin');
  const moderator = await register('moderator', 'moderator');

  // 1. A member finds a service in the public list and opens its detail.
  const list = await call('GET', '/api/hyperlocal/services?city=TP.HCM&pageSize=10');
  assert.equal(list.status, 200, `service list returned ${list.status}`);
  assert.ok(list.json.items.length > 0, 'the seeded directory must have services in TP.HCM');
  const service = list.json.items[0];
  const detail = await call('GET', `/api/hyperlocal/services/${service.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.json.id, service.id);

  // 2. Every booking endpoint requires a signed-in caller.
  const someId = '00000000-0000-0000-0000-000000000001';
  for (const [method, path, body] of [
    ['POST', `/api/hyperlocal/services/${service.id}/bookings`, bookingBody()],
    ['GET', '/api/hyperlocal/me/bookings'],
    ['GET', `/api/hyperlocal/me/bookings/${someId}`],
    ['POST', `/api/hyperlocal/me/bookings/${someId}/cancel`],
  ]) {
    const anonymous = await call(method, path, { body });
    assert.equal(anonymous.status, 401, `anonymous ${method} ${path} returned ${anonymous.status}`);
  }

  // 3. Booking answers 201, a Location to the detail, and the booking joined with its service.
  const created = await call('POST', `/api/hyperlocal/services/${service.id}/bookings`, {
    token: memberA,
    body: bookingBody({ address: '  12 Nguyễn Trãi, Quận 1, TP.HCM  ' }),
  });
  assert.equal(created.status, 201, `create returned ${created.status}: ${created.text.slice(0, 300)}`);
  const booking = created.json;
  assert.equal(booking.status, 'pending');
  assert.equal(booking.serviceId, service.id);
  assert.equal(booking.serviceName, service.name);
  assert.equal(booking.serviceCategory, service.category);
  assert.equal(booking.address, '12 Nguyễn Trãi, Quận 1, TP.HCM', 'address must be trimmed');
  assert.equal(booking.contactPhone, '0901234567');
  assert.equal(booking.note, 'Gọi trước 15 phút');
  assert.equal(booking.cancelledAt, null);
  assert.ok(created.location?.toLowerCase().endsWith(`/api/hyperlocal/me/bookings/${booking.id}`), `Location was ${created.location}`);

  // A blank note is stored as null.
  const blankNote = await call('POST', `/api/hyperlocal/services/${service.id}/bookings`, {
    token: memberA,
    body: bookingBody({ scheduledAt: inHours(48), note: '   ' }),
  });
  assert.equal(blankNote.status, 201);
  assert.equal(blankNote.json.note, null);

  // 4. Invalid bodies are 400 with the offending field, never 500.
  for (const [label, body, field] of [
    ['scheduledAt too soon', bookingBody({ scheduledAt: inHours(0.25) }), 'ScheduledAt'],
    ['scheduledAt in the past', bookingBody({ scheduledAt: inHours(-2) }), 'ScheduledAt'],
    ['scheduledAt past 60 days', bookingBody({ scheduledAt: inHours(61 * 24) }), 'ScheduledAt'],
    ['scheduledAt missing', bookingBody({ scheduledAt: undefined }), 'ScheduledAt'],
    ['address too short', bookingBody({ address: 'ab' }), 'Address'],
    ['address missing', bookingBody({ address: undefined }), 'Address'],
    ['phone invalid', bookingBody({ contactPhone: 'không phải số' }), 'ContactPhone'],
    ['phone missing', bookingBody({ contactPhone: undefined }), 'ContactPhone'],
    ['note too long', bookingBody({ note: 'x'.repeat(1001) }), 'Note'],
  ]) {
    const rejected = await call('POST', `/api/hyperlocal/services/${service.id}/bookings`, { token: memberA, body });
    assert.equal(rejected.status, 400, `${label} returned ${rejected.status}: ${rejected.text.slice(0, 200)}`);
    const errorKeys = Object.keys(rejected.json?.errors ?? {}).map((key) => key.toLowerCase());
    assert.ok(errorKeys.some((key) => key.endsWith(field.toLowerCase())), `${label} must report ${field}, got ${errorKeys}`);
  }

  // 5. Unknown and soft-deleted services are 404; a booking of a later-deleted service stays readable.
  const unknownService = await call('POST', `/api/hyperlocal/services/${someId}/bookings`, { token: memberA, body: bookingBody() });
  assert.equal(unknownService.status, 404);
  const tempService = await call('POST', '/api/hyperlocal/services', {
    token: admin,
    body: {
      category: 'Giặt ủi', name: `Booking test ${stamp}`, description: null, phone: '0281234567',
      district: 'Quận 1', city: `BOOKING-${stamp}`, distanceKm: 1, rating: 4.5,
      reviewCount: 0, priceFrom: 30000, isVerified: false,
    },
  });
  assert.equal(tempService.status, 201, `temp service returned ${tempService.status}`);
  createdServiceIds.push(tempService.json.id);
  const beforeDelete = await call('POST', `/api/hyperlocal/services/${tempService.json.id}/bookings`, {
    token: memberA,
    body: bookingBody({ scheduledAt: inHours(72) }),
  });
  assert.equal(beforeDelete.status, 201);
  assert.equal((await call('DELETE', `/api/hyperlocal/services/${tempService.json.id}`, { token: admin })).status, 204);
  const afterDelete = await call('POST', `/api/hyperlocal/services/${tempService.json.id}/bookings`, { token: memberA, body: bookingBody() });
  assert.equal(afterDelete.status, 404, 'a soft-deleted service must not take new bookings');
  const stillReadable = await call('GET', `/api/hyperlocal/me/bookings/${beforeDelete.json.id}`, { token: memberA });
  assert.equal(stillReadable.status, 200, 'a booking must stay readable after its service is deleted');
  assert.equal(stillReadable.json.serviceName, `Booking test ${stamp}`);

  // 6. My list is paged, newest first, and only holds the caller's own bookings.
  const mine = await call('GET', '/api/hyperlocal/me/bookings?page=1&pageSize=2', { token: memberA });
  assert.equal(mine.status, 200);
  assert.equal(mine.json.totalCount, 3);
  assert.equal(mine.json.page, 1);
  assert.equal(mine.json.pageSize, 2);
  assert.equal(mine.json.hasNextPage, true);
  assert.deepEqual(mine.json.items.map((item) => item.id), [beforeDelete.json.id, blankNote.json.id], 'newest booking first');
  const minePage2 = await call('GET', '/api/hyperlocal/me/bookings?page=2&pageSize=2', { token: memberA });
  assert.deepEqual(minePage2.json.items.map((item) => item.id), [booking.id]);
  assert.equal(minePage2.json.hasNextPage, false);
  const theirs = await call('GET', '/api/hyperlocal/me/bookings', { token: memberB });
  assert.equal(theirs.status, 200);
  assert.equal(theirs.json.totalCount, 0, 'member B must not see member A bookings');
  assert.equal((await call('GET', '/api/hyperlocal/me/bookings?pageSize=51', { token: memberA })).status, 400);

  // 7. My detail: own booking 200; someone else's or unknown 404.
  const own = await call('GET', `/api/hyperlocal/me/bookings/${booking.id}`, { token: memberA });
  assert.equal(own.status, 200);
  assert.deepEqual(own.json, booking);
  assert.equal((await call('GET', `/api/hyperlocal/me/bookings/${booking.id}`, { token: memberB })).status, 404);
  assert.equal((await call('GET', `/api/hyperlocal/me/bookings/${someId}`, { token: memberA })).status, 404);

  // 8. Cancel: another member gets 404 and changes nothing; the owner gets the cancelled booking.
  assert.equal((await call('POST', `/api/hyperlocal/me/bookings/${booking.id}/cancel`, { token: memberB })).status, 404);
  assert.equal((await call('GET', `/api/hyperlocal/me/bookings/${booking.id}`, { token: memberA })).json.status, 'pending');
  assert.equal((await call('POST', `/api/hyperlocal/me/bookings/${someId}/cancel`, { token: memberA })).status, 404);
  const cancelled = await call('POST', `/api/hyperlocal/me/bookings/${booking.id}/cancel`, { token: memberA });
  assert.equal(cancelled.status, 200, `cancel returned ${cancelled.status}: ${cancelled.text.slice(0, 200)}`);
  assert.equal(cancelled.json.status, 'cancelled');
  assert.ok(cancelled.json.cancelledAt, 'cancelledAt must be set');
  assert.equal((await call('GET', `/api/hyperlocal/me/bookings/${booking.id}`, { token: memberA })).json.status, 'cancelled');

  const expectNotCancellable = async (bookingId, label) => {
    const result = await call('POST', `/api/hyperlocal/me/bookings/${bookingId}/cancel`, { token: memberA });
    assert.equal(result.status, 409, `${label} returned ${result.status}`);
    assert.equal(result.json?.code, 'booking_not_cancellable', `${label} code was ${result.json?.code}`);
  };
  await expectNotCancellable(booking.id, 'second cancel');
  // Move only time in fixtures; state changes must go through the staff API.
  sql(`UPDATE service_bookings SET scheduled_at = now() - interval '1 hour' WHERE id = '${blankNote.json.id}'`);
  await expectNotCancellable(blankNote.json.id, 'past booking');
  const staffPaths = [['GET', '/api/hyperlocal/staff/bookings'],
    ['POST', `/api/hyperlocal/staff/bookings/${beforeDelete.json.id}/confirm`],
    ['POST', `/api/hyperlocal/staff/bookings/${beforeDelete.json.id}/complete`]];
  for (const [method, path] of staffPaths) {
    assert.equal((await call(method, path)).status, 401);
    assert.equal((await call(method, path, { token: memberA })).status, 403);
    assert.equal((await call(method, path, { token: memberB })).status, 403);
  }
  for (const token of [admin, moderator]) {
    const staffList = await call('GET', '/api/hyperlocal/staff/bookings?pageSize=50', { token });
    assert.equal(staffList.status, 200);
    assert.ok(staffList.json.items.some(b => b.id === beforeDelete.json.id));
    for (const action of ['confirm', 'complete']) {
      assert.equal((await call('POST', `/api/hyperlocal/staff/bookings/${someId}/${action}`, { token })).status, 404);
    }
  }
  assert.equal((await call('GET', '/api/hyperlocal/staff/bookings?pageSize=51', { token: admin })).status, 400);
  const action = (id, name, token = admin) => call('POST', `/api/hyperlocal/staff/bookings/${id}/${name}`, { token });
  const rejected = async (id, name) => {
    const r = await action(id, name);
    assert.equal(r.status, 409);
    assert.equal(r.json.code, name === 'confirm' ? 'booking_not_confirmable' : 'booking_not_completable');
  };
  await rejected(booking.id, 'confirm'); // cancelled
  await rejected(booking.id, 'complete');
  await rejected(blankNote.json.id, 'confirm'); // pending but past
  await rejected(blankNote.json.id, 'complete'); // still pending
  await rejected(beforeDelete.json.id, 'complete'); // must first confirm
  const confirmations = await Promise.all([action(beforeDelete.json.id, 'confirm'), action(beforeDelete.json.id, 'confirm', moderator)]);
  assert.deepEqual(confirmations.map(r => r.status).sort(), [200, 409]);
  assert.equal(confirmations.find(r => r.status === 200).json.status, 'confirmed');
  assert.equal((await call('GET', `/api/hyperlocal/me/bookings/${beforeDelete.json.id}`, { token: memberA })).json.status, 'confirmed');
  await rejected(beforeDelete.json.id, 'complete'); // future
  sql(`UPDATE service_bookings SET scheduled_at = now() - interval '1 hour' WHERE id = '${beforeDelete.json.id}'`);
  const completions = await Promise.all([action(beforeDelete.json.id, 'complete'), action(beforeDelete.json.id, 'complete', moderator)]);
  assert.deepEqual(completions.map(r => r.status).sort(), [200, 409]);
  assert.equal(completions.find(r => r.status === 200).json.status, 'completed');
  await expectNotCancellable(beforeDelete.json.id, 'completed booking');
  await rejected(beforeDelete.json.id, 'confirm');
  await rejected(beforeDelete.json.id, 'complete');
  const cancellable = await call('POST', `/api/hyperlocal/services/${service.id}/bookings`, { token: memberA, body: bookingBody() });
  assert.equal(cancellable.status, 201);
  assert.equal((await action(cancellable.json.id, 'confirm', moderator)).status, 200);
  const confirmedCancel = await call('POST', `/api/hyperlocal/me/bookings/${cancellable.json.id}/cancel`, { token: memberA });
  assert.equal(confirmedCancel.status, 200, 'a confirmed future booking must be cancellable');
  assert.equal(confirmedCancel.json.status, 'cancelled');
} finally {
  // Users cascade to their bookings; services go after because bookings reference them.
  if (testEmails.length > 0) {
    sql(`DELETE FROM users WHERE email IN ('${testEmails.join("','")}')`);
  }
  if (createdServiceIds.length > 0) {
    sql(`DELETE FROM local_services WHERE id IN ('${createdServiceIds.join("','")}')`);
  }
}

console.log('PASS: member booking regression; admin/moderator staff list, confirm/complete; 401/403/404, pagination, state/time guards, concurrent transitions (one 200/one 409), member sees updated status, terminal states preserved and confirmed cancellation; fixtures cleaned.');
