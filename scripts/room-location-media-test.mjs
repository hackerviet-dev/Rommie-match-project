import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const base = process.env.API_URL ?? 'http://localhost:5000';
const users = [];
const sql = query => execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', query], { encoding: 'utf8' }).trim();
async function call(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}
let keep = false;
try {
  for (let i = 0; i < 3; i++) {
    const email = `room-location-${randomUUID()}@example.test`, password = randomUUID() + 'Aa1!';
    const user = await call('/api/auth/register', null, 'POST', { email, password, displayName: `Room location QA ${i}`, gender: 'male', city: 'TP.HCM' });
    users.push({ ...user, email, password });
  }
  const [owner, resident, outsider] = users;
  const id = owner.user.id, token = owner.accessToken;
  // Geo must work during incomplete onboarding; all other room operations remain gated.
  const config = await call('/api/geo/config', token);
  assert.equal(typeof config.browserApiKey, 'string'); assert.ok(!('serverApiKey' in config));
  await call('/api/geo/config', null, 'GET', undefined, 401);
  await call('/api/geo/reverse?latitude=91&longitude=100', token, 'GET', undefined, 400);
  for (const link of ['http://www.google.com/maps?q=x', 'https://127.0.0.1/maps?q=x', 'https://google.com.evil.test/maps?q=x', 'https://www.google.com:444/maps?q=x', 'https://user:pass@www.google.com/maps?q=x'])
    await call('/api/geo/resolve-link', token, 'POST', { link }, 400);
  await call('/api/geo/resolve-link', token, 'POST', { link: 'https://www.google.com/maps/@10.7769,106.7009,16z' }, 422);
  if (!config.geocodingEnabled) {
    await call('/api/geo/reverse?latitude=10.7769&longitude=106.7009', token, 'GET', undefined, 503);
    await call('/api/geo/resolve-link', token, 'POST', { link: 'https://www.google.com/maps/search/?api=1&query=10.7769,106.7009' }, 503);
    await call('/api/geo/resolve-link', token, 'POST', { link: 'https://www.google.com/maps/search/?api=1&query=room&query_place_id=test-place' }, 503);
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const onboarding = { name: 'Room location QA', age: '24', gender: 'Nam', employment: 'Khác', orgName: '', hideOrg: false, city: 'TP.HCM', bio: 'Dữ liệu kiểm tra sẽ được xóa', sleep: '22h–0h', env: 'Yên tĩnh', yn: { smoke: 'Không', drink: 'Không', pets: 'Có' }, cleanliness: 4, extroversion: 60, budgetMin: 3, budgetMax: 7, hasRoom: 'yes', roomPosterType:'resident', addr: 'Địa chỉ QA', district: 'Khu vực QA', roomCity: 'Thành phố phòng QA', latitude: 10.7769, longitude: 106.7009, bedrooms: '1', area: '25', rent: '3500000', needed: '1', moveIn: today, houseType: 'Studio', amenities: [] };
  for (const user of users) {
    const quiz=await call('/api/matching/quiz',user.accessToken);
    await call('/api/matching/me/quiz',user.accessToken,'PUT',{answers:Object.fromEntries(quiz.questions.map(q=>[q.id,q.options[0].id]))});
    await call('/api/users/me/onboarding', user.accessToken, 'PUT', onboarding);
  }
  // Having a room completes onboarding without creating a listing or demanding room details.
  const deferred = { ...onboarding, addr: '', district: '', bedrooms: '', area: '', rent: '', needed: '', moveIn: '', houseType: '', latitude: null, longitude: null };
  for (const roomAction of ['explore', 'post_room']) {
    await call('/api/users/me/onboarding', token, 'PUT', { ...deferred, roomAction });
    assert.equal((await call('/api/users/me/onboarding', token)).isComplete, true);
    const saved = await call('/api/users/me/profile', token);
    assert.equal(saved.hasRoom, true);
    assert.equal(saved.onboarding.roomAction, roomAction);
    assert.deepEqual(await call('/api/rooms/me', token), []);
  }
  await call('/api/users/me/onboarding', token, 'PUT', { ...deferred, roomAction: 'invalid' }, 400);
  for (const roomPosterType of ['resident']) {
    await call('/api/users/me/onboarding', token, 'PUT', { ...deferred, roomAction: 'explore', roomPosterType });
    assert.equal((await call('/api/users/me/profile', token)).onboarding.roomPosterType,roomPosterType);
  }
  await call('/api/users/me/onboarding', token, 'PUT', { ...deferred, roomAction:'explore',roomPosterType:'admin' }, 400);
  await call('/api/users/me/onboarding', token, 'PUT', { ...deferred, roomAction:'explore',roomPosterType:'landlord_agent' }, 400);
  await call('/api/users/me/onboarding', token, 'PUT', { ...deferred, hasRoom:'no',roomAction:'',roomPosterType:'resident' }, 400);
  await call('/api/users/me/onboarding', token, 'PUT', { ...deferred, roomAction: 'explore', age: '' }, 400);
  await call('/api/users/me/onboarding', token, 'PUT', { ...deferred, hasRoom: 'no', roomAction: 'explore' }, 400);
  await call('/api/users/me/onboarding', token, 'PUT', onboarding);
  const mine = await call('/api/users/me/profile', token); assert.equal(mine.onboarding.roomCity, onboarding.roomCity); assert.equal(mine.onboarding.latitude, 10.7769);
  const invalidPhoto = new FormData(); invalidPhoto.append('photo', new Blob(['not an image'], { type: 'image/png' }), 'invalid.png');
  const invalidUpload = await fetch(base + '/api/rooms/photos', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: invalidPhoto });
  assert.ok([400, 503].includes(invalidUpload.status), 'Reject invalid image or explicitly report unconfigured Cloudinary'); await invalidUpload.text();
  await call(`/api/users/${resident.user.id}/lifestyle`, token);
  const photo = `https://res.cloudinary.com/qa/image/upload/${randomUUID()}.jpg`;
  sql(`INSERT INTO room_photo_assets(owner_user_id,url,public_id) VALUES('${id}','${photo}','${randomUUID()}');`);
  const body = { description:'Phòng QA sạch thoáng',googleMapsUrl:'https://maps.app.goo.gl/qa',title: 'Phòng kiểm tra vị trí', address: '123 đường kiểm tra', district: "Phường Phú Nhuận", city: "TP.HCM", monthlyRent: 3500000, deposit: 1000000, availableFrom: today, maxOccupants: 2, roommatesNeeded: 1, pairOccupancyConfirmed:true,accuracyAndResidenceConfirmed:true, bedrooms: 1, areaM2: 25, propertyType: 'studio', amenities: ['Wi-Fi'], latitude: 10.7769, longitude: 106.7009, isActive: true, photoUrls: [photo] };
  const {pairOccupancyConfirmed, ...withoutConsent}=body;
  await call('/api/rooms',token,'POST',withoutConsent,400);
  const {accuracyAndResidenceConfirmed, ...withoutResidenceConsent}=body;
  await call('/api/rooms',token,'POST',withoutResidenceConsent,400);
  await call('/api/rooms',token,'POST',{...body,accuracyAndResidenceConfirmed:false},400);
  await call('/api/rooms',token,'POST',{...body,pairOccupancyConfirmed:false},400);
  await call('/api/rooms',token,'POST',{...body,maxOccupants:3},400);
  await call('/api/rooms',token,'POST',{...body,roommatesNeeded:2},400);
  await call('/api/rooms',token,'POST',{...body,roommatesNeeded:null},400);
  for(const patch of [{address:'adasd'},{address:'123'},{address:'Nguyễn Huệ'},{deposit:'0dadasdas'},{city:'dadasdas'},{district:'dadasdas'},{city:'Hà Nội',district:'Phường Phú Nhuận'}])
    await call('/api/rooms',token,'POST',{...body,...patch},400);
  const room = await call('/api/rooms', token, 'POST', body, 201);
  assert.equal(room.googleMapsUrl, body.googleMapsUrl);
  for (const googleMapsUrl of ['javascript:alert(1)', 'https://evil.example/maps', 'https://google.com.evil.example/maps', 'https://user@maps.app.goo.gl/test', 'http://maps.app.goo.gl/test'])
    await call('/api/rooms', token, 'POST', {...body, googleMapsUrl}, 400);
  const embedUrl='https://www.google.com/maps/embed?pb=!1m18!2m3';
  const embedded=await call('/api/rooms',token,'POST',{...body,googleMapsUrl:null,googleMapsEmbedUrl:embedUrl},201);
  assert.equal(embedded.googleMapsEmbedUrl,embedUrl);
  assert.equal((await call(`/api/rooms/${embedded.id}`,token)).googleMapsEmbedUrl,embedUrl);
  assert.equal(sql(`SELECT google_maps_embed_url FROM rooms WHERE id='${embedded.id}'`),embedUrl);
  const updatedEmbed=embedUrl+'&hl=vi';
  assert.equal((await call(`/api/rooms/${embedded.id}`,token,'PUT',{...body,googleMapsUrl:null,googleMapsEmbedUrl:updatedEmbed})).googleMapsEmbedUrl,updatedEmbed);
  for(const googleMapsEmbedUrl of ['https://evil.example/maps/embed?pb=x','javascript:alert(1)','https://www.google.com/maps/embed/v1/place?key=x','https://user@www.google.com/maps/embed?pb=x','https://www.google.com/maps/embed?pb=%20'])
    await call('/api/rooms',token,'POST',{...body,googleMapsEmbedUrl},400);
  await call(`/api/rooms/${embedded.id}`,token,'PUT',{...body,googleMapsUrl:null,googleMapsEmbedUrl:null},400);
  console.log('PASS: embed-only create/read/update and database persistence; invalid embed URLs and missing location rejected.');
  const mapsLink = 'https://maps.app.goo.gl/ggNLtoWR5V7HTEq98';
  const linked = await call('/api/rooms', token, 'POST', {...body, latitude:null, longitude:null, googleMapsUrl:mapsLink}, 201);
  assert.equal(linked.googleMapsUrl, mapsLink);
  assert.equal((await call(`/api/rooms/${linked.id}`, token)).googleMapsUrl, mapsLink);
  assert.equal(sql(`SELECT google_maps_url FROM rooms WHERE id='${linked.id}'`),mapsLink);
  const changedLink = 'https://www.google.com/maps/place/Test';
  assert.equal((await call(`/api/rooms/${linked.id}`, token, 'PUT', {...body,googleMapsUrl:changedLink})).googleMapsUrl, changedLink);
  await call(`/api/rooms/${linked.id}`, token, 'PUT', {...body,googleMapsUrl:null},400);
  for(const key of ['description','googleMapsUrl','bedrooms','areaM2','propertyType','amenities','photoUrls','deposit']) {
    await call('/api/rooms',token,'POST',{...body,[key]:null},400);
    await call(`/api/rooms/${linked.id}`,token,'PUT',{...body,[key]:null},400);
  }
  await call('/api/rooms',token,'POST',{...body,photoUrls:[]},400);
  await call('/api/rooms',token,'POST',{...body,amenities:[]},400);
  await call('/api/rooms',token,'POST',{...body,monthlyRent:0},400);
  assert.deepEqual(room.photoUrls, [photo]); assert.equal(room.moderationStatus, 'pending');
  assert.equal(sql(`SELECT pair_occupancy_confirmed_at IS NOT NULL FROM rooms WHERE id='${room.id}'`),'t');
  assert.equal(sql(`SELECT accuracy_residence_confirmed_at IS NOT NULL FROM rooms WHERE id='${room.id}'`),'t');
  await call(`/api/rooms/${room.id}`,token,'PUT',withoutResidenceConsent,400);
  await call(`/api/rooms/${room.id}`,token,'PUT',withoutConsent,400);
  await call(`/api/rooms/${room.id}`,token,'PUT',{...body,maxOccupants:4,roommatesNeeded:3},400);
  await call(`/api/rooms/${room.id}/residents`, null, 'GET', undefined, 404);
  const updated = await call(`/api/rooms/${room.id}`, token, 'PUT', { ...body, photoUrls: [photo] }); assert.deepEqual(updated.photoUrls, [photo]);
  const legacy = { ...body }; delete legacy.photoUrls;
  await call(`/api/rooms/${room.id}`, token, 'PUT', legacy,400);
  await call('/api/rooms', outsider.accessToken, 'POST', { ...body, photoUrls: [photo] }, 400);
  await call(`/api/rooms/${room.id}`, token, 'PUT', { ...body, photoUrls: Array(11).fill(photo) }, 400);
  await call(`/api/rooms/${room.id}`, token, 'PUT', { ...body, photoUrls: [null] }, 400);
  const group = randomUUID();
  sql(`UPDATE rooms SET moderation_status='approved' WHERE id='${room.id}'; INSERT INTO housing_groups(id,name,room_id,created_by) VALUES('${group}','QA room group','${room.id}','${id}'); INSERT INTO housing_group_members(group_id,user_id,role,status) VALUES('${group}','${id}','owner','active'),('${group}','${resident.user.id}','member','active');`);
  assert.equal((await call(`/api/rooms/${room.id}/residents`)).residents.length, 0);
  await call(`/api/rooms/${room.id}/residents/visibility`, outsider.accessToken, 'PUT', { share: true }, 403);
  await call(`/api/rooms/${room.id}/residents/visibility`, resident.accessToken, 'PUT', { share: true }, 204);
  const shared = await call(`/api/rooms/${room.id}/residents`); assert.equal(shared.residents[0].userId, resident.user.id); assert.deepEqual(Object.keys(shared.residents[0]).sort(), ['avatarUrl', 'displayName', 'userId']);
  sql(`UPDATE profiles SET is_public=false WHERE user_id='${resident.user.id}';`);
  assert.equal((await call(`/api/rooms/${room.id}/residents`)).residents.length, 0);
  await call(`/api/users/${resident.user.id}/lifestyle`, token, 'GET', undefined, 404);
  sql(`UPDATE profiles SET is_public=true WHERE user_id='${resident.user.id}'; INSERT INTO user_blocks(blocker_id,blocked_id) VALUES('${id}','${resident.user.id}');`);
  assert.equal((await call(`/api/rooms/${room.id}/residents`, token)).residents.length, 0);
  await call(`/api/users/${resident.user.id}/lifestyle`, token, 'GET', undefined, 404);
  await call(`/api/rooms/${room.id}/residents/visibility`, resident.accessToken, 'PUT', { share: false }, 204);
  assert.equal((await call(`/api/rooms/${room.id}/residents`)).residents.length, 0);
  sql(`DELETE FROM user_blocks WHERE blocker_id='${id}';`);
  const visibleLifestyle = await call(`/api/users/${resident.user.id}/lifestyle`, token);
  assert.equal(visibleLifestyle.sleepSchedule, 'normal'); assert.ok(!('budgetMin' in visibleLifestyle));
  sql(`UPDATE rooms SET moderation_status='pending' WHERE id='${room.id}';`);
  await call(`/api/rooms/${room.id}/residents`, outsider.accessToken, 'GET', undefined, 404);
  console.log('PASS: onboarding geo access, invalid Maps hosts/center-only links, missing-key errors, persisted coordinates/photos, mandatory full room fields/Maps link/photos, photo ownership/limits, resident opt-in/opt-out/invitations, private/blocked profile rules, safe lifestyle fields. Live Maps/Cloudinary success requires configured credentials; not tested.');
  if (process.env.KEEP_UI_FIXTURES === '1') {
    keep = true; mkdirSync('tmp/room-location', { recursive: true });
    // No credentials persisted; UI inspection uses a public approved fixture.
    sql(`UPDATE rooms SET moderation_status='approved',photo_urls='{}' WHERE id='${room.id}';`);
    writeFileSync('tmp/room-location/fixture.json', JSON.stringify({ roomId: room.id, users: users.map(u => ({ id: u.user.id, email: u.email })) }));
  }
} finally {
  if (!keep) {
    for (const u of users) sql(`DELETE FROM housing_groups WHERE created_by='${u.user.id}'; DELETE FROM users WHERE id='${u.user.id}' AND email='${u.email}';`);
    console.log('Temporary room/location fixtures cleaned; existing accounts untouched.');
  }
}
