// Local integration check: uploads a public logo, verifies a real room write,
// then destroys only the newly created Cloudinary asset and temporary member.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) assert.ok(env[key], `${key} required`);
const base = 'http://localhost:5000';
const sql = query => execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', query], {encoding:'utf8'}).trim();
async function api(path, method, body, token, status = 200) {
  const response = await fetch(base + path, {method, headers:{...(token ? {Authorization:`Bearer ${token}`} : {}), ...(body instanceof FormData ? {} : {'Content-Type':'application/json'})}, body: body instanceof FormData ? body : JSON.stringify(body)});
  assert.equal(response.status, status, `${method} ${path}: ${await response.clone().text()}`);
  return response.json();
}
let member, publicId;
const email = `cloudinary-live-${randomUUID()}@example.test`;
try {
  member = await api('/api/auth/register', 'POST', {email, password:randomUUID()+'Aa1!', displayName:'Cloudinary QA', gender:'male', city:'TP.HCM'});
  const token = member.accessToken, id = member.user.id;
  assert.match(id, /^[0-9a-f-]{36}$/);
  const quiz=await api('/api/matching/quiz','GET',undefined,token);
  await api('/api/matching/me/quiz','PUT',{answers:Object.fromEntries(quiz.questions.map(q=>[q.id,q.options[0].id]))},token);
  await api('/api/users/me/onboarding', 'PUT', {name:'Cloudinary QA',age:'24',gender:'Nam',employment:'Khác',city:'TP.HCM',sleep:'22h–0h',env:'Yên tĩnh',yn:{smoke:'Không',drink:'Không',pets:'Không'},hasRoom:'yes',roomAction:'explore',roomPosterType:'resident'},token);
  const data = new FormData();
  data.append('photo', new Blob([readFileSync('frontend/web-app/rommie-match/public/logo-mark.png')], {type:'image/png'}), 'qa-public-logo.png');
  const uploaded = await api('/api/rooms/photos','POST',data,token);
  const rows = JSON.parse(sql(`SELECT json_agg(row_to_json(a)) FROM room_photo_assets a WHERE owner_user_id='${id}';`));
  assert.equal(rows.length, 1); publicId = rows[0].public_id;
  assert.equal(rows[0].url, uploaded.url);
  assert.ok(publicId.startsWith(`roomiematch/rooms/${id.replaceAll('-','')}/`));
  const image = await fetch(uploaded.url);
  assert.equal(image.status, 200); assert.ok(image.headers.get('content-type')?.startsWith('image/'));
  assert.ok((await image.arrayBuffer()).byteLength > 0);
  const availableFrom = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const room = await api('/api/rooms','POST',{title:'Phòng kiểm tra Cloudinary',description:'Dữ liệu QA tạm, ảnh logo kiểm tra kỹ thuật.',address:'123 đường kiểm tra',city:'TP.HCM',district:'Phường Phú Nhuận',monthlyRent:3500000,deposit:0,availableFrom,maxOccupants:2,roommatesNeeded:1,propertyType:'studio',bedrooms:1,areaM2:25,amenities:['Wi-Fi'],photoUrls:[uploaded.url],pairOccupancyConfirmed:true,accuracyAndResidenceConfirmed:true,googleMapsEmbedUrl:'https://www.google.com/maps/embed?pb=!1m18!2m3'},token,201);
  assert.deepEqual(room.photoUrls,[uploaded.url]);
  assert.equal(room.moderationStatus,'pending');
  const saved = await fetch(base+`/api/rooms/${room.id}`,{headers:{Authorization:`Bearer ${token}`}});
  assert.equal(saved.status,200); assert.deepEqual((await saved.json()).photoUrls,[uploaded.url]);
  console.log('PASS: real Cloudinary upload, accessible image, asset ownership, room create/read with uploaded photo.');
} finally {
  try {
    if (publicId) {
      assert.match(publicId, /^roomiematch\/rooms\/[0-9a-f]{32}\/[0-9a-f]{32}$/);
      const timestamp = Math.floor(Date.now()/1000).toString();
      const signature = createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest('hex');
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/destroy`,{method:'POST',body:new URLSearchParams({public_id:publicId,timestamp,signature,api_key:env.CLOUDINARY_API_KEY})});
      assert.equal(response.status,200,'Cloudinary QA asset cleanup');
      assert.equal((await response.json()).result,'ok');
      console.log('Temporary Cloudinary asset destroyed.');
    }
  } finally {
    if (member) {
      sql(`DELETE FROM users WHERE id='${member.user.id}' AND email='${email}' AND role='member';`);
      console.log('Temporary QA member and room removed; existing data untouched.');
    }
  }
}
