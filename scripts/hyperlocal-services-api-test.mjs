// Regression check for the hyperlocal services CRUD backend, run against a real API and
// PostgreSQL:
//   GET    /api/hyperlocal/services
//   GET    /api/hyperlocal/services/{serviceId}
//   POST   /api/hyperlocal/services
//   PUT    /api/hyperlocal/services/{serviceId}
//   DELETE /api/hyperlocal/services/{serviceId}
// Usage: node scripts/hyperlocal-services-api-test.mjs http://localhost:5000
// Requires the local PostgreSQL container for role promotion and for proving the soft delete
// (override the container with POSTGRES_CONTAINER).
// Covers: the seeded directory reads back through the paged list and the detail endpoint with
// page/pageSize/totalCount/hasNextPage echoed, writes are staff-only (401 anonymous, 403 member,
// 201/200/204 for admin and moderator), POST answers 201 with a Location header pointing at the
// new detail URL, PUT replaces the whole record and GET reads it back, DELETE is a soft delete
// (deleted_at set, row still in the table) that removes the service from both the list and the
// detail and makes a second DELETE 404, invalid bodies are 400 (never 500), unknown ids are 404,
// paging bounds are enforced, and the seeded directory is left untouched.
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
const createdIds = [];
const testEmails = [];
const listPath = (params) => `/api/hyperlocal/services?${new URLSearchParams(params)}`;

async function register(label, role) {
  const email = `hyperlocal-${label}-${stamp}@example.com`;
  const { status, json } = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `Hyperlocal ${label}`, city: 'TP.HCM' },
  });
  assert.ok(status === 200 || status === 201, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
  testEmails.push(email);
  if (role === undefined) {
    return { token: json.accessToken, role: json.user.role };
  }
  // Roles are never set through the API, so promote the account and sign in again: the role
  // claim is baked into the token when it is issued.
  sql(`UPDATE users SET role='${role}' WHERE email='${email}'`);
  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200, `login ${label} returned ${login.status}: ${login.text.slice(0, 200)}`);
  assert.equal(login.json.user.role, role, `${label} token role should be ${role}`);
  return { token: login.json.accessToken, role: login.json.user.role };
}
// 1. The public list is paged and reports the pagination fields the frontend pages on.
const baselineList = await call('GET', listPath({ city: 'TP.HCM', page: '1', pageSize: '50' }));
assert.equal(baselineList.status, 200, `public list returned ${baselineList.status}`);
for (const field of ['items', 'page', 'pageSize', 'totalCount', 'hasNextPage']) {
  assert.ok(field in baselineList.json, `paged response is missing "${field}"`);
}
assert.ok(Array.isArray(baselineList.json.items), 'items must be an array');
assert.ok(baselineList.json.totalCount >= 6, `seeded TP.HCM directory should hold at least 6 services, got ${baselineList.json.totalCount}`);
assert.equal(baselineList.json.page, 1);
assert.equal(baselineList.json.pageSize, 50);
assert.equal(baselineList.json.hasNextPage, false);
const baselineTotal = baselineList.json.totalCount;

// 2. The public detail endpoint returns exactly the shape the list exposes.
const seed = baselineList.json.items[0];
const detailFields = ['id', 'category', 'name', 'description', 'phone', 'district', 'city', 'distanceKm', 'rating', 'reviewCount', 'priceFrom', 'isVerified'];
assert.deepEqual(Object.keys(seed).sort(), [...detailFields].sort(), 'list item shape drifted from LocalServiceDto');
const seedDetail = await call('GET', `/api/hyperlocal/services/${seed.id}`);
assert.equal(seedDetail.status, 200, `public detail returned ${seedDetail.status}`);
assert.deepEqual(seedDetail.json, seed, 'detail must match the list row');
const unknownId = crypto.randomUUID();
assert.equal((await call('GET', `/api/hyperlocal/services/${unknownId}`)).status, 404, 'unknown id must be 404');
assert.equal((await call('GET', '/api/hyperlocal/services/not-a-guid')).status, 404, 'non-guid id must not be 500');

// 3. Reads stay public while every write is closed to anonymous callers.
for (const [method, path, body] of [
  ['POST', '/api/hyperlocal/services', {}],
  ['PUT', `/api/hyperlocal/services/${seed.id}`, {}],
  ['DELETE', `/api/hyperlocal/services/${seed.id}`, undefined],
]) {
  const anonymous = await call(method, path, { body });
  assert.equal(anonymous.status, 401, `anonymous ${method} ${path} returned ${anonymous.status}`);
}

// 4. A member token must not be able to write; the directory is staff-curated, not user-owned.
const member = await register('member');
assert.equal(member.role, 'member');
const memberBody = {
  category: 'Giặt ủi',
  name: 'Member không được ghi',
  description: null,
  phone: null,
  district: 'Quận 1',
  city: 'TP.HCM',
  distanceKm: 1,
  rating: 4,
  reviewCount: 0,
  priceFrom: 0,
  isVerified: false,
};
for (const [method, path, body] of [
  ['POST', '/api/hyperlocal/services', memberBody],
  ['PUT', `/api/hyperlocal/services/${seed.id}`, memberBody],
  ['DELETE', `/api/hyperlocal/services/${seed.id}`, undefined],
]) {
  const forbidden = await call(method, path, { token: member.token, body });
  assert.equal(forbidden.status, 403, `member ${method} ${path} returned ${forbidden.status}`);
}
assert.equal((await call('GET', listPath({ city: 'TP.HCM' }), { token: member.token })).status, 200, 'member keeps public read access');
assert.equal((await call('GET', `/api/hyperlocal/services/${seed.id}`)).status, 200, 'the seed service must survive the refused writes');
// 5. Admin create: 201, a Location header for the new resource, and the exact saved values.
const admin = await register('admin', 'admin');
const city = `P4-API-${stamp}`;
const createBody = {
  category: 'Giặt ủi',
  name: 'Dịch vụ kiểm tra Phase 4',
  description: 'Hồ sơ kiểm tra CRUD tự động.',
  phone: '0901234567',
  district: 'Quận 1',
  city,
  distanceKm: 1.25,
  rating: 4.5,
  reviewCount: 12,
  priceFrom: 50000,
  isVerified: true,
};
const created = await call('POST', '/api/hyperlocal/services', { token: admin.token, body: createBody });
assert.equal(created.status, 201, `admin create returned ${created.status}: ${created.text.slice(0, 300)}`);
assert.match(created.json.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'create must return a server-generated uuid');
createdIds.push(created.json.id);
assert.ok(created.location, '201 must carry a Location header');
assert.ok(
  created.location.endsWith(`/api/hyperlocal/services/${created.json.id}`),
  `Location should point at the new resource, got ${created.location}`,
);
const createdExpected = { id: created.json.id, ...createBody };
assert.deepEqual(created.json, createdExpected, 'create response must echo the saved row');

const createdDetail = await call('GET', `/api/hyperlocal/services/${created.json.id}`);
assert.equal(createdDetail.status, 200);
assert.deepEqual(createdDetail.json, createdExpected, 'GET after POST must read the created row');
const createdInList = await call('GET', listPath({ city }));
assert.equal(createdInList.json.totalCount, 1, 'the created service must appear in the list for its city');
assert.deepEqual(createdInList.json.items[0], createdExpected);
assert.equal(sql(`select deleted_at is null from local_services where id='${created.json.id}'`), 't', 'created row must be stored live in PostgreSQL');

// The seeded directory must not have been touched by the test writes.
assert.equal((await call('GET', listPath({ city: 'TP.HCM', pageSize: '50' }))).json.totalCount, baselineTotal);

// 6. Invalid bodies are rejected with 400 and never reach PostgreSQL as a 500.
const badBodies = [
  ['category missing', { ...createBody, category: undefined }],
  ['category empty', { ...createBody, category: '' }],
  ['category whitespace only', { ...createBody, category: '   ' }],
  ['category 1 char', { ...createBody, category: 'A' }],
  ['category 81 chars', { ...createBody, category: 'x'.repeat(81) }],
  ['name missing', { ...createBody, name: undefined }],
  ['name whitespace only', { ...createBody, name: '   ' }],
  ['name 161 chars', { ...createBody, name: 'x'.repeat(161) }],
  ['district missing', { ...createBody, district: undefined }],
  ['district whitespace only', { ...createBody, district: '   ' }],
  ['district 101 chars', { ...createBody, district: 'x'.repeat(101) }],
  ['city missing', { ...createBody, city: undefined }],
  ['city 101 chars', { ...createBody, city: 'x'.repeat(101) }],
  ['distanceKm missing', { ...createBody, distanceKm: undefined }],
  ['distanceKm negative', { ...createBody, distanceKm: -0.01 }],
  ['distanceKm above 999.99', { ...createBody, distanceKm: 1000 }],
  ['rating missing', { ...createBody, rating: undefined }],
  ['rating below 0', { ...createBody, rating: -0.1 }],
  ['rating above 5', { ...createBody, rating: 5.1 }],
  ['reviewCount negative', { ...createBody, reviewCount: -1 }],
  ['priceFrom negative', { ...createBody, priceFrom: -1 }],
  ['description 2001 chars', { ...createBody, description: 'x'.repeat(2001) }],
  ['phone not a phone', { ...createBody, phone: 'not-a-phone' }],
  ['phone 31 chars', { ...createBody, phone: '1'.repeat(31) }],
  ['rating wrong type', { ...createBody, rating: 'cao' }],
];
for (const [label, body] of badBodies) {
  const rejected = await call('POST', '/api/hyperlocal/services', { token: admin.token, body });
  assert.equal(rejected.status, 400, `POST with ${label} returned ${rejected.status}, expected 400: ${rejected.text.slice(0, 200)}`);
  assert.ok(rejected.json?.errors, `400 for ${label} must carry field errors, got ${rejected.text.slice(0, 200)}`);
}
assert.equal((await call('GET', listPath({ city }))).json.totalCount, 1, 'rejected bodies must not insert rows');

// Optional text fields stay optional in the shapes a form actually sends: null, "" and "   ".
for (const blank of [null, '', '   ']) {
  const body = { ...createBody, phone: blank, description: blank, isVerified: undefined };
  const accepted = await call('POST', '/api/hyperlocal/services', { token: admin.token, body });
  assert.equal(accepted.status, 201, `POST with phone=${JSON.stringify(blank)} returned ${accepted.status}: ${accepted.text.slice(0, 200)}`);
  assert.equal(accepted.json.phone, null, `blank phone must be stored as null, got ${JSON.stringify(accepted.json.phone)}`);
  assert.equal(accepted.json.description, null, `blank description must be stored as null, got ${JSON.stringify(accepted.json.description)}`);
  assert.equal(accepted.json.isVerified, false, 'omitted isVerified must default to false');
  createdIds.push(accepted.json.id);
}
assert.equal((await call('GET', listPath({ city }))).json.totalCount, 4, 'the three blank-field rows must all be stored');
// 7. PUT replaces the whole record, and the row is readable right after.
const updateBody = {
  category: 'Dọn dẹp',
  name: 'Dịch vụ đã cập nhật',
  description: null,
  phone: null,
  district: 'Quận 3',
  city,
  distanceKm: 2.5,
  rating: 3.5,
  reviewCount: 0,
  priceFrom: 123000,
  isVerified: false,
};
const updated = await call('PUT', `/api/hyperlocal/services/${created.json.id}`, { token: admin.token, body: updateBody });
assert.equal(updated.status, 200, `admin update returned ${updated.status}: ${updated.text.slice(0, 300)}`);
assert.deepEqual(updated.json, { id: created.json.id, ...updateBody }, 'update response must be the replaced row');
const updatedDetail = await call('GET', `/api/hyperlocal/services/${created.json.id}`);
assert.deepEqual(updatedDetail.json, updated.json, 'GET after PUT must read the replaced row');
// Repeating the same PUT must stay 200: the row matches even though nothing changes.
const updatedAgain = await call('PUT', `/api/hyperlocal/services/${created.json.id}`, { token: admin.token, body: updateBody });
assert.equal(updatedAgain.status, 200, `idempotent PUT returned ${updatedAgain.status}`);
assert.deepEqual(updatedAgain.json, updated.json);

// An invalid PUT on an existing row is 400 and leaves the stored row untouched.
const badUpdate = await call('PUT', `/api/hyperlocal/services/${created.json.id}`, { token: admin.token, body: { ...updateBody, rating: 9 } });
assert.equal(badUpdate.status, 400, `invalid PUT returned ${badUpdate.status}`);
assert.ok(badUpdate.json?.errors, 'invalid PUT must carry field errors');
assert.deepEqual((await call('GET', `/api/hyperlocal/services/${created.json.id}`)).json, updated.json, 'rejected PUT must not change the row');

// Updating an unknown id is 404, and the role check runs before the id lookup.
const unknownUpdate = await call('PUT', `/api/hyperlocal/services/${unknownId}`, { token: admin.token, body: updateBody });
assert.equal(unknownUpdate.status, 404, `PUT on an unknown id returned ${unknownUpdate.status}`);
const memberUpdate = await call('PUT', `/api/hyperlocal/services/${unknownId}`, { token: member.token, body: updateBody });
assert.equal(memberUpdate.status, 403, 'the role check must run before the id lookup');

// 8. DELETE is a soft delete: 204, hidden from reads, row kept in PostgreSQL.
const removed = await call('DELETE', `/api/hyperlocal/services/${created.json.id}`, { token: admin.token });
assert.equal(removed.status, 204, `admin delete returned ${removed.status}: ${removed.text.slice(0, 200)}`);
assert.equal(removed.text, '', '204 must have an empty body');
assert.equal((await call('GET', `/api/hyperlocal/services/${created.json.id}`)).status, 404, 'a deleted service must disappear from the detail endpoint');
const afterDeleteList = await call('GET', listPath({ city }));
assert.equal(afterDeleteList.json.totalCount, 3, 'a deleted service must disappear from the list');
assert.equal(afterDeleteList.json.items.some((item) => item.id === created.json.id), false, 'a deleted service must not be in the returned items');
assert.equal(sql(`select deleted_at is not null from local_services where id='${created.json.id}'`), 't', 'the deleted row must stay in PostgreSQL with deleted_at set');
assert.equal((await call('DELETE', `/api/hyperlocal/services/${created.json.id}`, { token: admin.token })).status, 404, 'a second DELETE must be 404');
assert.equal((await call('PUT', `/api/hyperlocal/services/${created.json.id}`, { token: admin.token, body: updateBody })).status, 404, 'PUT on a deleted service must be 404');
assert.equal((await call('DELETE', `/api/hyperlocal/services/${unknownId}`, { token: admin.token })).status, 404, 'DELETE on an unknown id must be 404');
// 9. A moderator has the same write access as an admin.
const moderator = await register('mod', 'moderator');
const moderatorCity = `P4-MOD-${stamp}`;
const moderatorBody = { ...createBody, city: moderatorCity, isVerified: false };
const moderatorCreate = await call('POST', '/api/hyperlocal/services', { token: moderator.token, body: moderatorBody });
assert.equal(moderatorCreate.status, 201, `moderator create returned ${moderatorCreate.status}: ${moderatorCreate.text.slice(0, 200)}`);
createdIds.push(moderatorCreate.json.id);
assert.equal(moderatorCreate.json.city, moderatorCity);
const moderatorUpdate = await call('PUT', `/api/hyperlocal/services/${moderatorCreate.json.id}`, { token: moderator.token, body: { ...moderatorBody, name: 'Moderator cập nhật' } });
assert.equal(moderatorUpdate.status, 200, `moderator update returned ${moderatorUpdate.status}`);
assert.equal(moderatorUpdate.json.name, 'Moderator cập nhật');
const moderatorDelete = await call('DELETE', `/api/hyperlocal/services/${moderatorCreate.json.id}`, { token: moderator.token });
assert.equal(moderatorDelete.status, 204, `moderator delete returned ${moderatorDelete.status}`);
assert.equal((await call('GET', listPath({ city: moderatorCity }))).json.totalCount, 0);
const moderatorInvalid = await call('POST', '/api/hyperlocal/services', { token: moderator.token, body: { ...moderatorBody, rating: -1 } });
assert.equal(moderatorInvalid.status, 400, 'moderator validation must match the admin path');

// 10. Paging: page/pageSize are echoed, totalCount counts only live rows and bounds are enforced.
const pageCity = `P4-PAGE-${stamp}`;
for (const [index, distanceKm] of [1, 2, 3].entries()) {
  const pageRow = await call('POST', '/api/hyperlocal/services', {
    token: admin.token,
    body: { ...createBody, name: `Dịch vụ trang ${index + 1}`, city: pageCity, distanceKm, isVerified: false },
  });
  assert.equal(pageRow.status, 201, `page fixture ${index + 1} returned ${pageRow.status}`);
  createdIds.push(pageRow.json.id);
}
const firstPage = await call('GET', listPath({ city: pageCity, page: '1', pageSize: '2' }));
assert.equal(firstPage.status, 200);
assert.equal(firstPage.json.page, 1);
assert.equal(firstPage.json.pageSize, 2);
assert.equal(firstPage.json.totalCount, 3);
assert.equal(firstPage.json.items.length, 2);
assert.equal(firstPage.json.hasNextPage, true, 'three rows with pageSize 2 must report another page');
assert.deepEqual(firstPage.json.items.map((item) => item.distanceKm), [1, 2], 'the list orders verified first, then distance ascending');
const secondPage = await call('GET', listPath({ city: pageCity, page: '2', pageSize: '2' }));
assert.equal(secondPage.json.items.length, 1);
assert.equal(secondPage.json.hasNextPage, false);
assert.deepEqual(secondPage.json.items.map((item) => item.distanceKm), [3]);
assert.equal((await call('GET', listPath({ city: pageCity, page: '99999', pageSize: '2' }))).json.items.length, 0, 'a page past the end must be an empty page, not an error');
for (const query of [{ page: '0' }, { pageSize: '0' }, { pageSize: '51' }, { page: '100001' }, { pageSize: 'abc' }]) {
  const rejected = await call('GET', listPath({ city: pageCity, ...query }));
  assert.equal(rejected.status, 400, `list with ${JSON.stringify(query)} returned ${rejected.status}, expected 400`);
}
// Filters are exact matches, so an unknown category returns an empty page rather than an error.
const filtered = await call('GET', listPath({ city: pageCity, category: 'Không tồn tại' }));
assert.equal(filtered.status, 200);
assert.equal(filtered.json.totalCount, 0);
assert.deepEqual(filtered.json.items, []);
assert.equal((await call('GET', listPath({ city: pageCity, category: 'Giặt ủi' }))).json.totalCount, 3);
assert.equal((await call('GET', listPath({ city: pageCity, district: 'Quận 1' }))).json.totalCount, 3);
assert.equal((await call('GET', listPath({ city: pageCity, district: 'Quận 9' }))).json.totalCount, 0);

// 11. Defaults and cleanup: the seeded directory is unchanged once the test rows are gone.
assert.ok((await call('GET', '/api/hyperlocal/services')).json.totalCount >= 6, 'the default city filter must be TP.HCM');
sql(`DELETE FROM local_services WHERE id IN ('${createdIds.join("','")}')`);
assert.equal((await call('GET', listPath({ city: 'TP.HCM', pageSize: '50' }))).json.totalCount, baselineTotal, 'the seeded directory must be exactly as before the run');
sql(`DELETE FROM users WHERE email IN ('${testEmails.join("','")}')`);

console.log('PASS: hyperlocal services CRUD - public paged list/detail, 401 anonymous, 403 member, admin+moderator 201 Location/200/204, full PUT replace read back by GET, soft DELETE hidden from list and detail with the row kept in PostgreSQL, second DELETE and unknown/soft-deleted ids 404, invalid bodies 400 with field errors (never 500), blank optional fields stored as null, paging echo/order/bounds and exact-match filters, seeded directory untouched.');




