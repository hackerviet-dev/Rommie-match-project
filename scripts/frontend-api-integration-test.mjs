import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const require = createRequire(process.cwd()+'/frontend/web-app/rommie-match/package.json');
await mkdir('tmp/frontend-api', {recursive:true});
const names=['matching','rooms','hyperlocal','billing','quiz','chat','admin'];
const entry=names.map(n=>`export {${n==='hyperlocal'?'hyperlocalApi':n+'Api'}} from '../../frontend/web-app/rommie-match/src/features/${n}/services/${n}-api';`).join('\n')+`\nexport {savedProfilesApi} from '../../frontend/web-app/rommie-match/src/features/profile/hooks/use-saved-profiles';\nexport {safetyApi} from '../../frontend/web-app/rommie-match/src/features/profile/services/safety-api';\nexport {bookingsApi} from '../../frontend/web-app/rommie-match/src/features/hyperlocal/services/bookings-api';`;
await writeFile('tmp/frontend-api/entry.ts',entry);
await require('esbuild').build({entryPoints:['tmp/frontend-api/entry.ts'],bundle:true,platform:'node',format:'cjs',outfile:'tmp/frontend-api/client.cjs',define:{'import.meta.env':JSON.stringify({VITE_API_BASE_URL:'http://localhost:5000'})}});
const session=new Map();
globalThis.sessionStorage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
globalThis.localStorage={removeItem:()=>{}};
globalThis.window={dispatchEvent:()=>{}};
const api=require(process.cwd()+'/tmp/frontend-api/client.cjs');
const fixture={users:[],serviceIds:[]};
let passed=false;
const sql=query=>execFileSync('docker',['compose','exec','-T','postgres','psql','-U','roomiematch','-d','roomiematch','-v','ON_ERROR_STOP=1','-c',query],{stdio:['ignore','pipe','pipe']});
async function raw(path,body,token,method='POST'){
 const response=await fetch('http://localhost:5000'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json();assert.ok(response.ok,`${method} ${path}: ${response.status} ${JSON.stringify(result)}`);return result;
}
const auth=user=>{session.set('roomiematch-access-token',user.accessToken);session.set('roomiematch-refresh-token',user.refreshToken);};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
try {
 for(const name of ['API Member A','API Member B','API Admin']){
  const email='web-api-'+randomUUID()+'@example.test',password=randomUUID()+'Aa1!';
  const login=await raw('/api/auth/register',{email,password,displayName:name,gender:'male',city:'TP.HCM'});
  const user={...login,email,password};fixture.users.push(user);
  if(name==='API Admin')continue;
  await raw('/api/users/me/onboarding',{name,age:'24',gender:'Nam',employment:'Đang đi làm',orgName:'API QA',hideOrg:false,city:'TP.HCM',bio:'Tài khoản kiểm tra nối API',sleep:'22h–0h',env:'Yên tĩnh',yn:{smoke:'Không',drink:'Không',pets:'Có'},cleanliness:4,extroversion:60,budgetMin:3,budgetMax:7,hasRoom:'no',distance:'2–5 km',roomType:'Phòng riêng',moveInDate:today,amenities:[]},login.accessToken,'PUT');
 }
 const [a,b,admin]=fixture.users;
 sql(`UPDATE users SET role='admin' WHERE id='${admin.user.id}' AND email='${admin.email}';`);
 Object.assign(admin,await raw('/api/auth/login',{email:admin.email,password:admin.password}));
 auth(a);
 const quiz=await api.quizApi.get();
 await api.quizApi.saveMine(Object.fromEntries(quiz.questions.map(q=>[q.id,q.options[0].id])));
 const scans=await api.matchingApi.recalculate();assert.ok(scans.matches.items.some(m=>m.id===b.user.id));
 const matches=await api.matchingApi.list({sameCity:true,pageSize:4});assert.ok(matches.items.some(m=>m.id===b.user.id));assert.ok(Array.isArray(matches.items[0].breakdown));
 assert.ok((await api.matchingApi.list({city:'TP.HCM',q:'API Member B'})).items.some(m=>m.id===b.user.id));
 assert.equal((await api.matchingApi.list({city:'QA nonexistent city'})).totalCount,0);
 await assert.rejects(api.matchingApi.list({minCleanliness:4}),e=>e.status===403);
 assert.ok((await api.matchingApi.detail(b.user.id)).match.id===b.user.id);
 assert.equal((await api.matchingApi.usage()).scansUsed,1);
 await api.savedProfilesApi.set(b.user.id,true);assert.ok((await api.savedProfilesApi.ids()).includes(b.user.id));assert.ok((await api.savedProfilesApi.list()).items.some(p=>p.userId===b.user.id));
 const conversation=await api.chatApi.start(b.user.id);fixture.conversationId=conversation.id;
 const message=await api.chatApi.send(conversation.id,'Kiểm tra tin nhắn API thật');assert.equal(message.content,'Kiểm tra tin nhắn API thật');
 auth(b);assert.ok((await api.chatApi.list()).items.some(c=>c.id===conversation.id));assert.equal((await api.chatApi.get(conversation.id)).unreadCount,1);assert.ok((await api.chatApi.messages(conversation.id)).items.some(m=>m.id===message.id));await api.chatApi.read(conversation.id);assert.equal((await api.chatApi.get(conversation.id)).unreadCount,0);
 auth(a);const request=await api.matchingApi.request(b.user.id,'Kiểm tra xác nhận ghép');assert.ok((await api.matchingApi.requests()).items.some(r=>r.id===request.id));auth(b);await api.matchingApi.respond(request.id,'accept');auth(a);await api.matchingApi.respond(request.id,'end');
 const room=await api.roomsApi.create({title:'Phòng kiểm tra API web',description:'Phòng fixture',address:'123 API Test Street',district:'Quận 1',city:'TP.HCM',monthlyRent:3500000,deposit:1000000,availableFrom:today,maxOccupants:3,propertyType:'apartment',bedrooms:2,areaM2:45,roommatesNeeded:1,amenities:['Wi-Fi'],latitude:10.7769,longitude:106.7009,isActive:true});fixture.roomId=room.id;
 assert.ok((await api.roomsApi.search({city:'TP.HCM',district:'Quận 1',maxRent:4000000})).items.some(r=>r.id===room.id));assert.ok((await api.roomsApi.mine()).some(r=>r.id===room.id));assert.equal((await api.roomsApi.get(room.id)).latitude,10.7769);await api.roomsApi.update(room.id,{...room,title:'Phòng kiểm tra API web đã sửa'});assert.equal((await api.roomsApi.get(room.id)).title,'Phòng kiểm tra API web đã sửa');
 auth(admin);const service=await api.hyperlocalApi.create({name:'Dịch vụ QA web '+randomUUID().slice(0,6),category:'Dọn dẹp',description:'Fixture only',phone:'0901234567',district:'Quận 1',city:'TP.HCM',distanceKm:1,rating:4.5,reviewCount:0,priceFrom:100000,isVerified:true});fixture.serviceIds.push(service.id);fixture.serviceId=service.id;
 await api.hyperlocalApi.update(service.id,{...service,priceFrom:120000});assert.equal((await api.hyperlocalApi.get(service.id)).priceFrom,120000);
 auth(a);assert.ok((await api.hyperlocalApi.list('TP.HCM','Quận 1','Dọn dẹp')).items.some(s=>s.id===service.id));
 assert.ok((await api.hyperlocalApi.list('TP. Hồ Chí Minh','Quận 1','Dọn dẹp')).items.some(s=>s.id===service.id));
 assert.ok((await api.hyperlocalApi.list('TP.HCM',undefined,undefined,1,service.name)).items.some(s=>s.id===service.id));
 assert.equal((await api.hyperlocalApi.list('TP.HCM',undefined,undefined,1,'%')).totalCount,0);
 const booking=await api.bookingsApi.create(service.id,{scheduledAt:new Date(Date.now()+86400000).toISOString(),address:'123 API Test Street',contactPhone:'0901234567',note:'Fixture booking'});fixture.bookingId=booking.id;
 assert.ok((await api.bookingsApi.list()).items.some(b=>b.id===booking.id));assert.equal((await api.bookingsApi.get(booking.id)).address,'123 API Test Street');await api.bookingsApi.cancel(booking.id);assert.equal((await api.bookingsApi.get(booking.id)).status,'cancelled');
 await api.safetyApi.report(b.user.id,'other','Báo cáo QA cô lập, không có người thật.');auth(admin);const report=(await api.adminApi.reports()).items.find(r=>r.reporterName===a.user.displayName&&r.reportedUserName===b.user.displayName);assert.ok(report);await api.adminApi.reviewReport(report.id,'dismissed','QA only');assert.ok((await api.adminApi.stats()).activeUsers>=3);assert.ok(Array.isArray((await api.adminApi.verifications()).items));assert.ok(Array.isArray((await api.adminApi.refunds()).items));
 auth(a);await api.safetyApi.block(b.user.id);assert.ok((await api.safetyApi.blocks()).items.some(u=>u.userId===b.user.id));assert.equal((await api.chatApi.get(conversation.id)).isBlocked,true);assert.ok(!(await api.matchingApi.list()).items.some(m=>m.id===b.user.id));await api.safetyApi.unblock(b.user.id);await api.savedProfilesApi.set(b.user.id,false);assert.ok(!(await api.savedProfilesApi.ids()).includes(b.user.id));
 assert.ok((await api.billingApi.plans()).length>0);assert.equal((await api.billingApi.subscription()).isPremium,false);assert.ok(Array.isArray(await api.billingApi.payments()));
 if(process.env.KEEP_UI_FIXTURES==='1'){await api.savedProfilesApi.set(b.user.id,true);await writeFile('tmp/frontend-api/ui-fixtures.json',JSON.stringify(fixture));}
 passed=true;
 console.log('PASS actual frontend services: matching/paging/detail/quota, quiz, save/unsave, rooms CRUD/filter/map coordinates, services CRUD, booking/read/cancel, chat/send/read, match requests, safety, admin review, plans/subscription/history.');
} finally {
 if(process.env.KEEP_UI_FIXTURES!=='1'||!passed){
  for(const id of fixture.serviceIds)sql(`DELETE FROM service_bookings WHERE service_id IN (SELECT id FROM local_services WHERE id='${id}' AND name LIKE 'Dịch vụ QA web %'); DELETE FROM local_services WHERE id='${id}' AND name LIKE 'Dịch vụ QA web %';`);
  for(const u of fixture.users)sql(`DELETE FROM users WHERE id='${u.user.id}' AND email='${u.email}';`);
  console.log('Isolated fixtures cleaned.');
 }
}
