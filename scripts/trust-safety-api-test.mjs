// Identity verification, room reports and the 2-person housing group limit against the local
// Docker API + PostgreSQL. Image URLs are built in the shape the Media module issues, so the API
// must run with a Cloudinary cloud name (CLOUDINARY_QA_CLOUD, default roomiematch-qa); nothing is
// uploaded. Example:
//   CLOUDINARY_CLOUD_NAME=roomiematch-qa CLOUDINARY_API_KEY=qa CLOUDINARY_API_SECRET=qa docker compose up -d --no-deps api
//   node scripts/trust-safety-api-test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const base = process.env.API_URL ?? 'http://localhost:5000';
const cloud = process.env.CLOUDINARY_QA_CLOUD ?? 'roomiematch-qa';
const sql = q => execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', q], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

async function call(method, path, token, body, attempt = 0) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 429 && attempt < 2) {
    await res.text();
    const seconds = Math.max(1, Math.min(60, Number(res.headers.get('Retry-After')) || 60));
    console.log(`Rate limit: retrying after ${seconds}s.`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return call(method, path, token, body, attempt + 1);
  }
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
async function expect(status, method, path, token, body) {
  const res = await call(method, path, token, body);
  assert.equal(res.status, status, `${method} ${path}: ${res.status} ${JSON.stringify(res.json)}`);
  return res.json;
}
const image = (userId, name, purpose = 'verifications') =>
  `https://res.cloudinary.com/${cloud}/image/upload/v1700000000/roomiematch/${purpose}/${userId}/${name}.jpg`;
const verification = (userId, tag) => ({
  documentType: 'cccd', documentNumberLast4: '1234',
  frontImageUrl: image(userId, 'front' + tag), backImageUrl: image(userId, 'back' + tag), selfieImageUrl: image(userId, 'selfie' + tag),
});

const users = [];
try {
  const health = await expect(200, 'GET', '/api/media/health');
  assert.ok(health.configured, 'Start the API with a Cloudinary cloud name (see header comment).');

  for (const role of ['owner', 'reporter', 'outsider', 'moderator']) {
    const email = `trust-${randomUUID()}@example.test`, password = randomUUID() + 'Aa1!', name = 'Trust QA ' + role;
    const user = { ...await expect(200, 'POST', '/api/auth/register', undefined, { email, password, displayName: name, gender: 'male', city: 'TP.HCM' }), email, password };
    users.push(user);
    await expect(200, 'PUT', '/api/users/me/onboarding', user.accessToken, { name, age: '24', gender: 'Nam', employment: 'Đang đi làm', orgName: 'API QA', hideOrg: false, city: 'TP.HCM', bio: 'Tài khoản kiểm tra an toàn', sleep: '22h–0h', env: 'Yên tĩnh', yn: { smoke: 'Không', drink: 'Không', pets: 'Có' }, cleanliness: 4, extroversion: 60, budgetMin: 3, budgetMax: 7, hasRoom: 'no', distance: '2–5 km', roomType: 'Phòng riêng', moveInDate: today, amenities: [] });
    if (role === 'moderator') {
      sql(`UPDATE users SET role='moderator' WHERE id='${user.user.id}'`);
      Object.assign(user, await expect(200, 'POST', '/api/auth/login', undefined, { email, password }));
    }
  }
  const [owner, reporter, outsider, mod] = users;
  const id = u => u.user.id;

  // --- Identity verification ---------------------------------------------------------------
  const path = '/api/users/me/verification';
  assert.deepEqual(await expect(200, 'GET', path, reporter.accessToken), { isVerified: false, latest: null });
  await expect(401, 'GET', path);
  const good = verification(id(reporter), 'a');
  const invalid = async body => assert.equal((await expect(400, 'POST', path, reporter.accessToken, body)).code, 'invalid_image');
  await invalid({ ...good, frontImageUrl: 'https://example.com/cccd.jpg' });
  await invalid({ ...good, frontImageUrl: image(id(owner), 'front') });
  await invalid({ ...good, frontImageUrl: image(id(reporter), 'front', 'avatars') });
  await invalid({ ...good, backImageUrl: good.frontImageUrl });
  await expect(400, 'POST', path, reporter.accessToken, { ...good, documentNumberLast4: '12345' });
  await expect(400, 'POST', path, reporter.accessToken, { ...good, documentType: 'passport' });
  await expect(400, 'POST', path, reporter.accessToken, { ...good, selfieImageUrl: undefined });

  const first = await expect(201, 'POST', path, reporter.accessToken, good);
  assert.equal(first.status, 'pending');
  assert.equal(first.documentNumberLast4, '1234');
  assert.equal((await expect(409, 'POST', path, reporter.accessToken, verification(id(reporter), 'b'))).code, 'verification_pending');
  assert.equal((await expect(200, 'GET', path, reporter.accessToken)).latest.id, first.id);
  assert.ok((await expect(200, 'GET', '/api/admin/verifications?status=pending', mod.accessToken)).items.some(x => x.id === first.id));
  await expect(403, 'GET', '/api/admin/verifications', reporter.accessToken);

  await expect(204, 'POST', `/api/admin/verifications/${first.id}/review`, mod.accessToken, { status: 'rejected', rejectionReason: 'Ảnh mặt sau bị mờ.' });
  const rejected = await expect(200, 'GET', path, reporter.accessToken);
  assert.equal(rejected.isVerified, false);
  assert.equal(rejected.latest.status, 'rejected');
  assert.equal(rejected.latest.rejectionReason, 'Ảnh mặt sau bị mờ.');
  const notices = (await expect(200, 'GET', '/api/notifications', reporter.accessToken)).items.filter(n => n.type === 'verification');
  assert.ok(notices.some(n => n.body === 'Ảnh mặt sau bị mờ.'), 'rejection notice');

  const second = await expect(201, 'POST', path, reporter.accessToken, verification(id(reporter), 'b'));
  await expect(204, 'POST', `/api/admin/verifications/${second.id}/review`, mod.accessToken, { status: 'approved' });
  const approved = await expect(200, 'GET', path, reporter.accessToken);
  assert.equal(approved.isVerified, true);
  assert.equal(approved.latest.status, 'approved');
  assert.equal((await expect(409, 'POST', path, reporter.accessToken, verification(id(reporter), 'c'))).code, 'already_verified');
  assert.equal(sql(`SELECT is_verified FROM profiles WHERE user_id='${id(reporter)}'`), 't');

  // A moderator cannot approve their own submission.
  const own = await expect(201, 'POST', path, mod.accessToken, verification(id(mod), 'a'));
  await expect(404, 'POST', `/api/admin/verifications/${own.id}/review`, mod.accessToken, { status: 'approved' });

  // --- Room reports ------------------------------------------------------------------------
  const photo = `https://res.cloudinary.com/${cloud}/image/upload/qa-trust-${id(owner)}.jpg`;
  sql(`INSERT INTO room_photo_assets(owner_user_id,url,public_id) VALUES('${id(owner)}','${photo}','qa/${id(owner)}')`);
  const room = await expect(201, 'POST', '/api/rooms', owner.accessToken, { title: 'Phòng QA báo cáo', description: 'Phòng thử kiểm tra báo cáo, không phải tin thật.', address: '123 đường kiểm tra', city: 'TP.HCM', district: 'Phường Phú Nhuận', monthlyRent: 3500000, deposit: 0, availableFrom: today, maxOccupants: 2, roommatesNeeded: 1, propertyType: 'studio', bedrooms: 1, areaM2: 25, amenities: ['Wi-Fi'], photoUrls: [photo], pairOccupancyConfirmed: true, accuracyAndResidenceConfirmed: true, googleMapsUrl: 'https://maps.app.goo.gl/qa', isActive: true });

  const roomReport = await expect(201, 'POST', `/api/rooms/${room.id}/reports`, reporter.accessToken, { reason: 'scam', details: 'Yêu cầu chuyển cọc trước khi xem phòng.' });
  assert.equal(roomReport.roomId, room.id);
  assert.equal(roomReport.reportedUserId, id(owner));
  assert.equal((await expect(409, 'POST', `/api/rooms/${room.id}/reports`, reporter.accessToken, { reason: 'fake' })).code, 'report_already_open');
  assert.equal((await expect(400, 'POST', `/api/rooms/${room.id}/reports`, owner.accessToken, { reason: 'fake' })).code, 'self_target');
  assert.equal((await expect(404, 'POST', `/api/rooms/${randomUUID()}/reports`, reporter.accessToken, { reason: 'fake' })).code, 'room_not_found');
  await expect(400, 'POST', `/api/rooms/${room.id}/reports`, outsider.accessToken, { reason: 'other' });
  await expect(401, 'POST', `/api/rooms/${room.id}/reports`, undefined, { reason: 'fake' });
  // A general report on the owner is separate from the room report.
  const userReport = await expect(201, 'POST', `/api/users/${id(owner)}/reports`, reporter.accessToken, { reason: 'harass' });
  assert.equal(userReport.roomId, null);

  const queue = (await expect(200, 'GET', '/api/admin/reports?status=open&pageSize=50', mod.accessToken)).items;
  const listed = queue.find(x => x.id === roomReport.id);
  assert.equal(listed.roomId, room.id);
  assert.equal(listed.roomTitle, 'Phòng QA báo cáo');
  assert.equal(queue.find(x => x.id === userReport.id).roomId, null);
  await expect(204, 'POST', `/api/admin/reports/${roomReport.id}/review`, mod.accessToken, { status: 'resolved', resolutionNote: 'Đã ẩn tin.' });
  await expect(201, 'POST', `/api/rooms/${room.id}/reports`, reporter.accessToken, { reason: 'fake' });

  // --- Housing group pair limit ------------------------------------------------------------
  const group = await expect(201, 'POST', '/api/groups', owner.accessToken, { name: 'Nhóm QA hai người', roomId: room.id });
  await expect(204, 'POST', `/api/groups/${group.id}/invitations`, owner.accessToken, { email: reporter.email });
  await expect(409, 'POST', `/api/groups/${group.id}/invitations`, owner.accessToken, { email: outsider.email });
  assert.equal((await expect(200, 'GET', `/api/groups/${group.id}`, owner.accessToken)).memberLimit, 2);
  // The trigger rejects a third row even when the service check is bypassed.
  assert.throws(() => sql(`INSERT INTO housing_group_members(group_id,user_id,role,status) VALUES('${group.id}','${id(outsider)}','member','active')`), /two members/);

  console.log('PASS identity verification (submit/validation/pending/reject+notice/resubmit/approve/no self-review), room reports (roomId, duplicates, self, 404, admin queue with room title) and 2-person housing groups (service + trigger).');
} finally {
  for (const u of users) sql(`DELETE FROM staff_audit_logs WHERE actor_id='${u.user.id}'; DELETE FROM housing_groups WHERE created_by='${u.user.id}'; DELETE FROM users WHERE id='${u.user.id}' AND email='${u.email}';`);
  console.log('Temporary QA accounts, rooms, groups, reports and verifications removed.');
}
