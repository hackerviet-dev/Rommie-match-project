// Regression check for the owner-side room listing backend, run against a real API + PostgreSQL:
//   GET/POST /api/rooms, GET /api/rooms/me, GET/PUT/DELETE /api/rooms/{roomId}
// Usage: node scripts/rooms-api-test.mjs http://localhost:5000
// Requires the local PostgreSQL container to read the stored columns and to prove the soft delete
// (override it with POSTGRES_CONTAINER).
// POST /api/auth/register shares a 10-requests-per-60s-per-IP limit and this script spends 2, so
// leave a minute between runs, the same cooldown as the other account-creating scripts.
// Covers: anonymous callers are refused on every owner route; /me returns only the caller's own
// listings (an empty array before the first one) and keeps the inactive ones; POST/PUT reject bad
// bodies with 400 (including a null amenity element, which used to be a 500) and an unknown id
// with 404; PUT is an owner-only full replace, so a non-owner gets 403 and the stored row is
// proven unchanged; omitted optional fields reset to null and isActive back to true; DELETE
// soft-deletes (deleted_at set), removes the room from /me and from search, and makes the
// following GET/PUT/DELETE 404. Every fixture is removed at the end, including on failure.
// Phase 2 adds the public read side on the same fixtures: anonymous search and detail, each of
// city/district/maxRent/availableBy alone and combined (inclusive boundaries), empty results,
// malformed queries (400, never 500), pagination/totalCount/hasNextPage with a stable order, and
// detail compared field by field against the stored row. It also pins the current visibility
// rules: unlisted and soft-deleted rooms leave public search, an unlisted room still shows in the
// owner's /me; anonymous detail hides unlisted or pending listings with 404.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

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

// The district is unique per run so the public search below can only ever return this script's
// rows, never a seed row or another run's fixture.
const stamp = Date.now();
const districtA = `Phase1 A ${stamp}`;
const districtB = `Phase1 B ${stamp}`;

const roomBody = (overrides = {}) => ({
  title: 'Phòng kiểm tra quản lý',
  description: 'Mô tả ban đầu',
  address: '12 Nguyễn Huệ',
  district: districtA,
  city: 'TP.HCM',
  monthlyRent: 4200000,
  deposit: 4000000,
  availableFrom: '2026-11-01',
  maxOccupants: 2,
  pairOccupancyConfirmed: true, accuracyAndResidenceConfirmed: true,
  propertyType: 'apartment',
  bedrooms: 2,
  areaM2: 55.5,
  roommatesNeeded: 1,
  amenities: ['máy lạnh', 'wifi', 'máy lạnh'],
  latitude: 10.7769,
  longitude: 106.7009,
  isActive: true,
  ...overrides,
});

// PUT is a full replace: the smallest valid body leaves every optional field at its default.
const minimalBody = (overrides = {}) => ({
  title: 'Phòng tối giản',
  address: '1 Tối giản',
  district: districtA,
  city: 'TP.HCM',
  monthlyRent: 3000000,
  availableFrom: '2026-11-01',
  maxOccupants: 2,
  roommatesNeeded: 1,
  pairOccupancyConfirmed: true, accuracyAndResidenceConfirmed: true,
  ...overrides,
});

// Stored columns read straight from PostgreSQL, so the API response is checked against the row it
// really wrote - not against itself.
const columnList = [
  'title', "coalesce(description, '<null>')", 'address', 'district', 'city', 'monthly_rent',
  'deposit', 'available_from', 'max_occupants', "coalesce(property_type, '<null>')",
  "coalesce(bedrooms::text, '<null>')", "coalesce(area_m2::text, '<null>')",
  "coalesce(roommates_needed::text, '<null>')", "array_to_string(amenities, ',')",
  "coalesce(latitude::text, '<null>')", "coalesce(longitude::text, '<null>')", 'is_active',
];

const nullish = (value) => (value === '<null>' ? null : value);

function roomRow(roomId) {
  const row = sql(`SELECT ${columnList.join(" || '|' || ")} FROM rooms WHERE id = '${roomId}'`);
  if (row.length === 0) {
    return null;
  }
  const [title, description, address, district, city, monthlyRent, deposit, availableFrom,
    maxOccupants, propertyType, bedrooms, areaM2, roommatesNeeded, amenities, latitude, longitude,
    isActive] = row.split('|');
  return {
    title,
    description: nullish(description),
    address,
    district,
    city,
    monthlyRent: Number(monthlyRent),
    deposit: Number(deposit),
    availableFrom,
    maxOccupants: Number(maxOccupants),
    propertyType: nullish(propertyType),
    bedrooms: nullish(bedrooms) === null ? null : Number(bedrooms),
    areaM2: nullish(areaM2) === null ? null : Number(areaM2),
    roommatesNeeded: nullish(roommatesNeeded) === null ? null : Number(roommatesNeeded),
    amenities: amenities === '' ? [] : amenities.split(','),
    latitude: nullish(latitude) === null ? null : Number(latitude),
    longitude: nullish(longitude) === null ? null : Number(longitude),
    // Concatenated with ||, PostgreSQL renders a boolean as "true"/"false", while psql -t prints
    // a bare boolean column as "t"/"f"; accept either so the helper is not display-dependent.
    isActive: isActive === 'true' || isActive === 't',
  };
}

const ownerOf = (roomId) => sql(`SELECT owner_user_id FROM rooms WHERE id = '${roomId}'`);
const isDeleted = (roomId) => sql(`SELECT deleted_at IS NOT NULL FROM rooms WHERE id = '${roomId}'`) === 't';
const search = async (district) => {
  const result = await call('GET', `/api/rooms?district=${encodeURIComponent(district)}&pageSize=50`);
  assert.equal(result.status, 200, `search returned ${result.status}: ${result.text.slice(0, 200)}`);
  return result.json;
};

// Phase 2 needs the query string spelled out (filters, paging, malformed values), so this helper
// takes it verbatim and lets the caller decide the expected status.
const searchQuery = async (query, expectedStatus = 200) => {
  const result = await call('GET', `/api/rooms?${query}`);
  assert.equal(
    result.status,
    expectedStatus,
    `GET /api/rooms?${query} returned ${result.status}: ${result.text.slice(0, 200)}`,
  );
  return result.json;
};

const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const emails = { a: `rooms-api-a-${stamp}@example.com`, b: `rooms-api-b-${stamp}@example.com` };
let roomA = null;
let roomB = null;

try {
  // 1. Anonymous callers are refused before anything else: the owner list, create, update and
  //    delete all need a token.
  for (const [method, path, body] of [
    ['GET', '/api/rooms/me'],
    ['POST', '/api/rooms', roomBody()],
    ['PUT', `/api/rooms/${randomUUID()}`, roomBody()],
    ['DELETE', `/api/rooms/${randomUUID()}`],
  ]) {
    const { status } = await call(method, path, { body });
    assert.equal(status, 401, `${method} ${path} without a token returned ${status}`);
  }

  async function register(label, email) {
    const body = { email, password, displayName: `Rooms ${label}`, city: 'TP.HCM' };
    const { status, json } = await call('POST', '/api/auth/register', { body });
    assert.equal(status, 200, `register ${label} returned ${status}: ${JSON.stringify(json)}`);
    const quiz=await call('GET','/api/matching/quiz',{token:json.accessToken});
    assert.equal(quiz.status,200);
    const savedQuiz=await call('PUT','/api/matching/me/quiz',{token:json.accessToken,body:{answers:Object.fromEntries(quiz.json.questions.map(q=>[q.id,q.options[0].id]))}});
    assert.equal(savedQuiz.status,200);
    const onboarding = await call('PUT','/api/users/me/onboarding',{token:json.accessToken,body:{name:`Rooms ${label}`,age:'24',gender:'Nam',employment:'Khác',city:'TP.HCM',sleep:'22h–0h',env:'Yên tĩnh',yn:{smoke:'Không',drink:'Không',pets:'Không'},hasRoom:'yes',roomAction:'explore',roomPosterType:'resident'}});
    assert.equal(onboarding.status,200);
    return { body, token: json.accessToken, userId: json.user.id };
  }

  const a = await register('A', emails.a);
  const b = await register('B', emails.b);

  // 2. A member who never posted a room gets an empty array, not a 404 or a null.
  const emptyA = await call('GET', '/api/rooms/me', { token: a.token });
  assert.equal(emptyA.status, 200);
  assert.ok(Array.isArray(emptyA.json), '/api/rooms/me must return an array');
  assert.deepEqual(emptyA.json, []);

  // 3. POST creates A's room and stores every column; duplicate amenities are collapsed.
  const created = await call('POST', '/api/rooms', { token: a.token, body: roomBody() });
  assert.equal(created.status, 201, `POST /api/rooms returned ${created.status}: ${created.text.slice(0, 200)}`);
  roomA = created.json;
  assert.equal(roomA.ownerUserId, a.userId);
  assert.equal(roomA.district, districtA);
  assert.equal(roomA.isActive, true);
  assert.deepEqual(roomA.amenities, ['máy lạnh', 'wifi'], 'duplicate amenities must be collapsed');
  assert.equal(ownerOf(roomA.id), a.userId, 'the owner must come from the token');

  const storedA = roomRow(roomA.id);
  assert.equal(storedA.title, roomBody().title);
  assert.equal(storedA.description, 'Mô tả ban đầu');
  assert.equal(storedA.address, '12 Nguyễn Huệ');
  assert.equal(storedA.city, 'TP.HCM');
  assert.equal(storedA.monthlyRent, 4200000);
  assert.equal(storedA.deposit, 4000000);
  assert.equal(storedA.availableFrom, '2026-11-01');
  assert.equal(storedA.maxOccupants, 2);
  assert.equal(storedA.propertyType, 'apartment');
  assert.equal(storedA.bedrooms, 2);
  assert.equal(storedA.areaM2, 55.5);
  assert.equal(storedA.roommatesNeeded, 1);
  assert.deepEqual(storedA.amenities, ['máy lạnh', 'wifi']);
  assert.equal(storedA.latitude, 10.7769);
  assert.equal(storedA.longitude, 106.7009);
  assert.equal(storedA.isActive, true);

  // 4. B posts its own room; /me is per account and never mixes the two.
  const createdB = await call('POST', '/api/rooms', {
    token: b.token,
    body: roomBody({ district: districtB, title: 'Phòng của B' }),
  });
  assert.equal(createdB.status, 201);
  roomB = createdB.json;

  const meA = await call('GET', '/api/rooms/me', { token: a.token });
  assert.equal(meA.status, 200);
  assert.equal(meA.json.length, 1, "A's /me must list exactly A's room");
  assert.equal(meA.json[0].id, roomA.id);
  const meB = await call('GET', '/api/rooms/me', { token: b.token });
  assert.equal(meB.json.length, 1);
  assert.equal(meB.json[0].id, roomB.id);
  assert.ok(!meA.json.some((room) => room.id === roomB.id), "A's /me must never contain B's room");

  // Approve fixtures before checking public discovery; real new listings remain pending.
  sql(`UPDATE rooms SET moderation_status='approved' WHERE id IN ('${roomA.id}','${roomB.id}');`);
  // 5. Approved detail is public and reflects the stored row.
  const detailA = await call('GET', `/api/rooms/${roomA.id}`);
  assert.equal(detailA.status, 200);
  assert.equal(detailA.json.id, roomA.id);
  assert.equal(detailA.json.ownerUserId, a.userId);
  assert.equal(detailA.json.district, districtA);

  // 6. Both listings are findable by their own district while they are active.
  const activeA = await search(districtA);
  assert.equal(activeA.totalCount, 1);
  assert.equal(activeA.items.length, 1);
  assert.equal(activeA.items[0].id, roomA.id);
  assert.equal(activeA.hasNextPage, false);
  const activeB = await search(districtB);
  assert.equal(activeB.totalCount, 1);
  assert.equal(activeB.items[0].id, roomB.id);

  // 7. A non-owner is refused and the row does not move.
  const foreignUpdate = await call('PUT', `/api/rooms/${roomA.id}`, {
    token: b.token,
    body: roomBody({ title: 'B cố sửa phòng A' }),
  });
  assert.equal(foreignUpdate.status, 403, `non-owner PUT returned ${foreignUpdate.status}`);
  assert.ok(foreignUpdate.contentType.includes('problem+json'), '403 must be problem details');
  assert.equal(roomRow(roomA.id).title, roomBody().title, 'a forbidden PUT must not change the row');

  // 8. The owner updates every field; response and stored row agree.
  const updatedBody = {
    title: 'Phòng đã sửa',
    description: 'Mô tả mới',
    address: '99 Lê Lợi',
    district: districtA,
    city: 'TP.HCM',
    monthlyRent: 5000000,
    deposit: 2500000,
    availableFrom: '2026-12-15',
    maxOccupants: 2,
    pairOccupancyConfirmed: true, accuracyAndResidenceConfirmed: true,
    propertyType: 'studio',
    bedrooms: 1,
    areaM2: 40.5,
    roommatesNeeded: 1,
    amenities: ['wifi', 'bếp'],
    latitude: 10.1,
    longitude: 106.2,
    isActive: true,
  };
  const updated = await call('PUT', `/api/rooms/${roomA.id}`, { token: a.token, body: updatedBody });
  assert.equal(updated.status, 200, `owner PUT returned ${updated.status}: ${updated.text.slice(0, 200)}`);
  roomA = updated.json;
  const storedUpdated = roomRow(roomA.id);
  for (const field of ['title', 'description', 'address', 'district', 'city', 'monthlyRent',
    'deposit', 'availableFrom', 'maxOccupants', 'propertyType', 'bedrooms', 'areaM2',
    'roommatesNeeded', 'latitude', 'longitude', 'isActive']) {
    assert.deepEqual(storedUpdated[field], updatedBody[field], `PUT must persist ${field}`);
    assert.deepEqual(roomA[field], updatedBody[field], `PUT response must echo ${field}`);
  }
  assert.deepEqual(storedUpdated.amenities, ['wifi', 'bếp']);

  // 9. PUT is a full replace: the optional fields left out become null (and isActive true again).
  const reset = await call('PUT', `/api/rooms/${roomA.id}`, { token: a.token, body: minimalBody() });
  assert.equal(reset.status, 200);
  roomA = reset.json;
  assert.equal(roomA.description, null);
  assert.equal(roomA.deposit, 0);
  assert.equal(roomA.propertyType, null);
  assert.equal(roomA.bedrooms, null);
  assert.equal(roomA.areaM2, null);
  assert.equal(roomA.roommatesNeeded, 1);
  assert.deepEqual(roomA.amenities, []);
  assert.equal(roomA.latitude, null);
  assert.equal(roomA.longitude, null);
  assert.equal(roomA.isActive, true, 'isActive falls back to true when omitted');
  const storedReset = roomRow(roomA.id);
  assert.equal(storedReset.description, null);
  assert.equal(storedReset.deposit, 0);
  assert.equal(storedReset.propertyType, null);
  assert.equal(storedReset.bedrooms, null);
  assert.equal(storedReset.areaM2, null);
  assert.equal(storedReset.roommatesNeeded, 1);
  assert.deepEqual(storedReset.amenities, []);
  assert.equal(storedReset.latitude, null);
  assert.equal(storedReset.longitude, null);
  assert.equal(storedReset.isActive, true);

  // 10. Invalid bodies are 400 (never 500) and leave the stored row alone.
  const beforeRejects = roomRow(roomA.id);
  const { title: droppedTitle, ...withoutTitle } = minimalBody();
  for (const [label, body] of [
    ['missing title', withoutTitle],
    ['null amenity element', { ...minimalBody(), amenities: ['wifi', null] }],
    ['over-long amenity', { ...minimalBody(), amenities: ['x'.repeat(61)] }],
    ['roommatesNeeded >= maxOccupants', { ...minimalBody(), maxOccupants: 2, roommatesNeeded: 2 }],
    ['maxOccupants out of range', { ...minimalBody(), maxOccupants: 0 }],
    ['latitude without longitude', { ...minimalBody(), latitude: 10 }],
    ['unknown propertyType', { ...minimalBody(), propertyType: 'villa' }],
  ]) {
    const rejected = await call('PUT', `/api/rooms/${roomA.id}`, { token: a.token, body });
    assert.equal(rejected.status, 400, `PUT with ${label} returned ${rejected.status} instead of 400 (${rejected.text.slice(0, 200)})`);
  }
  assert.deepEqual(roomRow(roomA.id), beforeRejects, 'a rejected PUT must not change the row');
  const badCreate = await call('POST', '/api/rooms', {
    token: a.token,
    body: { ...roomBody(), amenities: ['wifi', null] },
  });
  assert.equal(badCreate.status, 400, `POST with a null amenity returned ${badCreate.status} instead of 400`);

  // 11. An id that does not exist is 404 on detail, update and delete.
  assert.equal((await call('GET', `/api/rooms/${randomUUID()}`)).status, 404);
  assert.equal((await call('PUT', `/api/rooms/${randomUUID()}`, { token: a.token, body: minimalBody() })).status, 404);
  assert.equal((await call('DELETE', `/api/rooms/${randomUUID()}`, { token: a.token })).status, 404);

  // 12. isActive=false hides the room from search but keeps it manageable in /me.
  const inactive = await call('PUT', `/api/rooms/${roomA.id}`, {
    token: a.token,
    body: minimalBody({ isActive: false }),
  });
  assert.equal(inactive.status, 200);
  assert.equal(inactive.json.isActive, false);
  assert.equal(roomRow(roomA.id).isActive, false);
  const hidden = await search(districtA);
  assert.equal(hidden.totalCount, 0, 'an inactive room must not appear in search');
  assert.deepEqual(hidden.items, []);
  const meInactive = await call('GET', '/api/rooms/me', { token: a.token });
  assert.equal(meInactive.json.length, 1, 'an inactive room stays visible to its owner');
  assert.equal(meInactive.json[0].id, roomA.id);
  assert.equal(meInactive.json[0].isActive, false);

  // 13. A non-owner cannot delete; the row keeps its deleted_at unset.
  const foreignDelete = await call('DELETE', `/api/rooms/${roomB.id}`, { token: a.token });
  assert.equal(foreignDelete.status, 403);
  assert.equal(isDeleted(roomB.id), false, 'a forbidden DELETE must not soft-delete the row');
  assert.equal(roomRow(roomB.id).title, 'Phòng của B');

  // 14. The owner deletes: 204 with no body, deleted_at set, gone from /me and search, and the
  //     next detail/update/delete are 404.
  const deleted = await call('DELETE', `/api/rooms/${roomA.id}`, { token: a.token });
  assert.equal(deleted.status, 204, `owner DELETE returned ${deleted.status}: ${deleted.text.slice(0, 200)}`);
  assert.equal(deleted.text, '');
  assert.equal(isDeleted(roomA.id), true, 'DELETE must set deleted_at');
  assert.deepEqual((await call('GET', '/api/rooms/me', { token: a.token })).json, [], 'a soft-deleted room must leave /me');
  assert.equal((await search(districtA)).totalCount, 0);
  assert.equal((await call('GET', `/api/rooms/${roomA.id}`)).status, 404, 'a soft-deleted room must be 404 on detail');
  assert.equal((await call('PUT', `/api/rooms/${roomA.id}`, { token: a.token, body: minimalBody() })).status, 404);
  assert.equal((await call('DELETE', `/api/rooms/${roomA.id}`, { token: a.token })).status, 404, 'a second DELETE must be 404');
  assert.equal((await call('DELETE', `/api/rooms/${roomA.id}`, { token: b.token })).status, 404, 'a soft-deleted room is gone for everyone');

  // 15. B still manages and deletes its own room.
  const deleteB = await call('DELETE', `/api/rooms/${roomB.id}`, { token: b.token });
  assert.equal(deleteB.status, 204);
  assert.equal(isDeleted(roomB.id), true);
  assert.deepEqual((await call('GET', '/api/rooms/me', { token: b.token })).json, []);

  // ---- Phase 2: tìm, lọc và chi tiết phòng (cả hai API công khai, không cần token) ----
  // Ba tin trong một quận chỉ tồn tại ở lần chạy này nên các bộ lọc dưới đây chỉ có thể trả về
  // chúng. Chúng khác giá và ngày để chốt thứ tự và biên.
  const city2 = `Phase2 City ${stamp}`;
  const district2 = `Phase2 Q ${stamp}`;
  const phase2Body = (overrides = {}) => ({
    title: 'Phòng lọc Phase 2',
    address: '5 Phase 2',
    district: district2,
    city: city2,
    monthlyRent: 3000000,
    availableFrom: '2026-11-01',
    maxOccupants: 2,
    roommatesNeeded: 1,
    pairOccupancyConfirmed: true, accuracyAndResidenceConfirmed: true,
    ...overrides,
  });
  const phase2Config = {
    r1: { monthlyRent: 3000000, availableFrom: '2026-11-01' },
    r2: { monthlyRent: 5000000, availableFrom: '2026-11-15' },
    r3: { monthlyRent: 4000000, availableFrom: '2026-10-20' },
  };
  const p2 = {};
  for (const [label, overrides] of Object.entries(phase2Config)) {
    const response = await call('POST', '/api/rooms', {
      token: a.token,
      body: phase2Body({ title: `P2 ${label}`, ...overrides }),
    });
    assert.equal(response.status, 201, `phase 2 fixture ${label} returned ${response.status}: ${response.text.slice(0, 200)}`);
    p2[label] = response.json;
  }
  const { r1, r2, r3 } = p2;
  sql(`UPDATE rooms SET moderation_status='approved' WHERE id IN ('${r1.id}','${r2.id}','${r3.id}');`);

  // 16. Search and detail are public: an anonymous caller reads both.
  const anonSearch = await searchQuery(`district=${encodeURIComponent(district2)}&pageSize=50`);
  assert.equal(anonSearch.totalCount, 3);
  const anonDetail = await call('GET', `/api/rooms/${r1.id}`);
  assert.equal(anonDetail.status, 200);
  assert.equal(anonDetail.json.id, r1.id);
  assert.equal(anonDetail.json.ownerDisplayName, a.body.displayName);
  assert.equal('email' in anonDetail.json, false, 'room detail must not leak the owner email');

  // 17. Each filter alone, then combined: city, district, maxRent, availableBy.
  assert.equal((await searchQuery(`city=${encodeURIComponent(city2)}&pageSize=50`)).totalCount, 3, 'city alone');
  assert.equal((await searchQuery(`district=${encodeURIComponent(district2)}&pageSize=50`)).totalCount, 3, 'district alone');
  assert.equal(
    (await searchQuery(`city=${encodeURIComponent(city2)}&district=${encodeURIComponent(district2)}&pageSize=50`)).totalCount,
    3,
    'city+district',
  );
  const wrongCity = await searchQuery(`city=${encodeURIComponent(`Phase2 Nowhere ${stamp}`)}&pageSize=50`);
  assert.deepEqual(wrongCity.items, []);
  const wrongDistrict = await searchQuery(`district=${encodeURIComponent(`Phase2 Nowhere ${stamp}`)}&pageSize=50`);
  assert.equal(wrongDistrict.totalCount, 0);

  // maxRent is inclusive: 3,500,000 keeps only the 3,000,000 room and the exact value still matches.
  assert.deepEqual(
    (await searchQuery(`district=${encodeURIComponent(district2)}&maxRent=3500000&pageSize=50`)).items.map((room) => room.id),
    [r1.id],
  );
  assert.deepEqual(
    (await searchQuery(`district=${encodeURIComponent(district2)}&maxRent=3000000&pageSize=50`)).items.map((room) => room.id),
    [r1.id],
    'maxRent boundary is inclusive',
  );
  assert.deepEqual((await searchQuery(`district=${encodeURIComponent(district2)}&maxRent=2999999&pageSize=50`)).items, []);

  // availableBy is inclusive too (available_from <= value) and the result stays ordered.
  assert.deepEqual(
    (await searchQuery(`district=${encodeURIComponent(district2)}&availableBy=2026-11-01&pageSize=50`)).items.map((room) => room.id),
    [r3.id, r1.id],
  );
  assert.deepEqual(
    (await searchQuery(`district=${encodeURIComponent(district2)}&availableBy=2026-10-20&pageSize=50`)).items.map((room) => room.id),
    [r3.id],
    'availableBy boundary is inclusive',
  );
  assert.deepEqual((await searchQuery(`district=${encodeURIComponent(district2)}&availableBy=2026-10-19&pageSize=50`)).items, []);
  assert.deepEqual(
    (await searchQuery(`city=${encodeURIComponent(city2)}&district=${encodeURIComponent(district2)}&maxRent=4500000&availableBy=2026-11-01&pageSize=50`)).items.map((room) => room.id),
    [r3.id, r1.id],
    'combined filters intersect',
  );
  // Empty data: a filter combination with no match is an empty page, not an error.
  const noMatch = await searchQuery(`district=${encodeURIComponent(district2)}&maxRent=1000`);
  assert.deepEqual(noMatch.items, []);
  assert.equal(noMatch.totalCount, 0);
  assert.equal(noMatch.hasNextPage, false);

  // 18. Pagination, totalCount and hasNextPage over a stable order (available_from, monthly_rent, id).
  const defaults = await searchQuery(`district=${encodeURIComponent(district2)}`);
  assert.equal(defaults.page, 1);
  assert.equal(defaults.pageSize, 20, 'page defaults to 1 and pageSize to 20');
  const page1 = await searchQuery(`district=${encodeURIComponent(district2)}&page=1&pageSize=2`);
  assert.equal(page1.totalCount, 3);
  assert.equal(page1.page, 1);
  assert.equal(page1.pageSize, 2);
  assert.equal(page1.hasNextPage, true);
  assert.deepEqual(page1.items.map((room) => room.id), [r3.id, r1.id], 'order is available_from, then monthly_rent, then id');
  const page2 = await searchQuery(`district=${encodeURIComponent(district2)}&page=2&pageSize=2`);
  assert.equal(page2.hasNextPage, false);
  assert.deepEqual(page2.items.map((room) => room.id), [r2.id]);
  const page3 = await searchQuery(`district=${encodeURIComponent(district2)}&page=3&pageSize=2`);
  assert.equal(page3.totalCount, 3);
  assert.equal(page3.hasNextPage, false);
  assert.deepEqual(page3.items, [], 'a page past the end is empty, not an error');
  const page1Again = await searchQuery(`district=${encodeURIComponent(district2)}&page=1&pageSize=2`);
  assert.deepEqual(page1Again.items.map((room) => room.id), page1.items.map((room) => room.id), 'the same page returns the same order');

  // 19. A malformed query is 400, never 500.
  for (const [label, query] of [
    ['page=0', `district=${encodeURIComponent(district2)}&page=0`],
    ['pageSize=0', `district=${encodeURIComponent(district2)}&pageSize=0`],
    ['pageSize=51', `district=${encodeURIComponent(district2)}&pageSize=51`],
    ['maxRent=abc', `district=${encodeURIComponent(district2)}&maxRent=abc`],
    ['availableBy=not-a-date', `district=${encodeURIComponent(district2)}&availableBy=not-a-date`],
    ['page=abc', `district=${encodeURIComponent(district2)}&page=abc`],
  ]) {
    const result = await call('GET', `/api/rooms?${query}`);
    assert.equal(result.status, 400, `search with ${label} returned ${result.status} instead of 400 (${result.text.slice(0, 150)})`);
  }

  // 20. Detail matches the stored row field by field.
  const storedDetail = roomRow(r1.id);
  const detail = await call('GET', `/api/rooms/${r1.id}`);
  assert.equal(detail.status, 200);
  for (const field of ['title', 'description', 'address', 'district', 'city', 'monthlyRent',
    'deposit', 'availableFrom', 'maxOccupants', 'propertyType', 'isActive']) {
    assert.deepEqual(detail.json[field], storedDetail[field], `detail must match the stored ${field}`);
  }
  assert.deepEqual(detail.json.amenities, storedDetail.amenities);

  // 21. Unlisted/pending listings are hidden from public search and detail; the owner can still manage them.
  const unlist = await call('PUT', `/api/rooms/${r2.id}`, {
    token: a.token,
    body: phase2Body({ title: 'P2 r2', monthlyRent: 5000000, availableFrom: '2026-11-15', isActive: false }),
  });
  assert.equal(unlist.status, 200);
  const afterUnlist = await searchQuery(`district=${encodeURIComponent(district2)}&pageSize=50`);
  assert.equal(afterUnlist.totalCount, 2);
  assert.ok(!afterUnlist.items.some((room) => room.id === r2.id), 'an unlisted room must not appear in search');
  assert.equal((await call('GET', `/api/rooms/${r2.id}`)).status, 404, 'unlisted/pending detail is hidden from anonymous callers');
  assert.ok(
    (await call('GET', '/api/rooms/me', { token: a.token })).json.some((room) => room.id === r2.id && room.isActive === false),
    'the owner still sees the unlisted room',
  );

  const removeR3 = await call('DELETE', `/api/rooms/${r3.id}`, { token: a.token });
  assert.equal(removeR3.status, 204);
  assert.equal(isDeleted(r3.id), true);
  const afterDelete = await searchQuery(`district=${encodeURIComponent(district2)}&pageSize=50`);
  assert.equal(afterDelete.totalCount, 1);
  assert.ok(!afterDelete.items.some((room) => room.id === r3.id), 'a soft-deleted room must not appear in search');
  assert.equal((await call('GET', `/api/rooms/${r3.id}`)).status, 404, 'a soft-deleted room is 404 on detail');

  console.log('PASS: rooms owner APIs - anonymous 401 on /me + POST/PUT/DELETE, per-account /me (empty array, no cross-account rows), POST/PUT store every column (duplicate amenities collapsed, null amenity 400), full-replace PUT resets optional fields and isActive, non-owner PUT/DELETE 403 with the row untouched, inactive room hidden from search but kept in /me, soft DELETE 204 sets deleted_at and makes the next GET/PUT/DELETE 404. Phase 2: anonymous search and detail, city/district/maxRent/availableBy alone and combined with inclusive boundaries, empty result, malformed query 400, pagination/totalCount/hasNextPage with a stable order, detail equals the stored row, unlisted and soft-deleted rooms leave search while the owner keeps both in /me, and unlisted detail is hidden with 404.');
} finally {
  // Only this script's fixtures: deleting the two users cascades to their rooms.
  sql(`DELETE FROM users WHERE email IN ('${emails.a}', '${emails.b}')`);
  assert.equal(sql(`SELECT count(*) FROM users WHERE email IN ('${emails.a}', '${emails.b}')`), '0', 'fixtures must be removed');
}
