import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
const base='http://localhost:5000';
const fixture='tmp/room-review-fixture.json';
const sql=q=>execFileSync('docker',['compose','exec','-T','postgres','psql','-U','roomiematch','-d','roomiematch','-v','ON_ERROR_STOP=1','-t','-A','-c',q],{encoding:'utf8'}).trim();
const cleanup=f=>{assert.match(f.id,/^[0-9a-f-]{36}$/);assert.match(f.email,/^review-qa-[0-9a-f-]+@example.test$/);sql(`DELETE FROM users WHERE id='${f.id}' AND email='${f.email}' AND role='member'`);};
if(process.argv.includes('--cleanup')){if(existsSync(fixture)){cleanup(JSON.parse(readFileSync(fixture,'utf8')));unlinkSync(fixture);}console.log('QA review fixture removed.');process.exit(0);}
async function api(path,method,body,token,status=200){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});assert.equal(r.status,status,`${method} ${path}: ${await r.clone().text()}`);return status===204?null:r.json();}
let f,keep=false;
try{
 const email=`review-qa-${randomUUID()}@example.test`,password=randomUUID()+'Aa1!';
 const member=await api('/api/auth/register','POST',{email,password,displayName:'Review QA',gender:'male',city:'TP.HCM'});
 f={id:member.user.id,email,password};const token=member.accessToken;
 const quiz=await api('/api/matching/quiz','GET',null,token);
 await api('/api/matching/me/quiz','PUT',{answers:Object.fromEntries(quiz.questions.map(q=>[q.id,q.options[0].id]))},token);
 await api('/api/users/me/onboarding','PUT',{name:'Review QA',age:'24',gender:'Nam',employment:'Khác',city:'TP.HCM',sleep:'22h–0h',env:'Yên tĩnh',yn:{smoke:'Không',drink:'Không',pets:'Không'},hasRoom:'yes',roomAction:'explore',roomPosterType:'resident'},token);
 const photo='https://res.cloudinary.com/vqqwcsim/image/upload/qa-review.png';
 sql(`INSERT INTO room_photo_assets(owner_user_id,url,public_id) VALUES('${f.id}','${photo}','qa/${f.id}')`);
 const body={title:'Phòng QA kiểm tra kết quả duyệt',description:'Phòng thử kiểm tra thông báo, không phải tin thật.',address:'123 đường kiểm tra',city:'TP.HCM',district:'Phường Phú Nhuận',monthlyRent:3500000,deposit:0,availableFrom:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),maxOccupants:2,roommatesNeeded:1,propertyType:'studio',bedrooms:1,areaM2:25,amenities:['Wi-Fi'],photoUrls:[photo],pairOccupancyConfirmed:true,accuracyAndResidenceConfirmed:true,googleMapsEmbedUrl:'https://www.google.com/maps/embed?pb=!1m18!2m3',isActive:true};
 let room=await api('/api/rooms','POST',body,token,201);f.roomId=room.id;
 const moderator=(await api('/api/auth/login','POST',{email:'moderator@roomiematch.vn',password:process.env.QA_STAFF_PASSWORD??'RoomieDemo@2026!'})).accessToken;
 const admin=(await api('/api/auth/login','POST',{email:'admin@roomiematch.vn',password:process.env.QA_STAFF_PASSWORD??'RoomieDemo@2026!'})).accessToken;
 const review=async(staff,status,note='Kết quả kiểm duyệt QA, thông tin đã kiểm tra.')=>{const q=await api(`/api/admin/rooms?id=${room.id}`,'GET',null,staff);await api(`/api/admin/rooms/${room.id}/review`,'POST',{status,note,message:status==="rejected"?"Ảnh phòng không đúng thực tế, tin bị từ chối.":"",expectedUpdatedAt:q.items[0].updatedAt},staff,204);};
 await review(moderator,'approved');
 await api(`/api/rooms/${room.id}`,'PUT',body,token,409);
 room=await api(`/api/rooms/${room.id}`,'GET',null,token);assert.equal(room.moderationStatus,'approved');
 let n=await api('/api/notifications','GET',null,token);assert.equal(n.unreadRoomCount,1);assert.equal(n.items[0].data.roomId,room.id);assert.equal(n.items[0].data.status,'approved');assert.equal(n.items[0].body,'Tin phòng của bạn đã được hiển thị.');assert.equal(room.moderationNote,null);
 assert.match((await api(`/api/admin/rooms?id=${room.id}`,'GET',null,moderator)).items[0].note,/QA/);
 assert.equal((await api('/api/rooms/me','GET',null,token)).find(r=>r.id===room.id).moderationNote,null);
 assert.equal((await api(`/api/rooms/${room.id}`,'GET')).moderationNote,null);
 assert.equal((await api('/api/rooms','GET')).items.find(r=>r.id===room.id).moderationNote,null);
 await api(`/api/notifications/${n.items[0].id}/read`,'PUT',null,admin,404);
 const q=await api(`/api/admin/rooms?id=${room.id}`,'GET',null,moderator);
 await api(`/api/admin/rooms/${room.id}/review`,'POST',{status:'approved',note:'Không tạo thông báo trùng.',expectedUpdatedAt:q.items[0].updatedAt},moderator,409);
 assert.equal((await api('/api/notifications','GET',null,token)).items.filter(n=>n.type==='room_review').length,1);
 await api(`/api/notifications/${n.items[0].id}/read`,'PUT',null,token,204);
 assert.equal((await api('/api/notifications','GET',null,token)).unreadRoomCount,0);
 const version=(await api(`/api/admin/rooms?id=${room.id}`,'GET',null,admin)).items[0].updatedAt;
 await api(`/api/admin/rooms/${room.id}/review`,'POST',{status:'rejected',note:'Ghi chú nội bộ không thay lý do gửi người đăng',expectedUpdatedAt:version},admin,400);
 assert.equal((await api(`/api/rooms/${room.id}`,'GET',null,token)).moderationStatus,'approved');
 await review(admin,'rejected');
 const rejected=(await api('/api/notifications','GET',null,token)).items.find(n=>n.type==='room_review'&&n.data.status==='rejected');
 assert.equal(rejected.body,'Ảnh phòng không đúng thực tế, tin bị từ chối.');
 assert.equal(sql(`SELECT count(*) FROM messages m JOIN conversation_members cm ON cm.conversation_id=m.conversation_id WHERE cm.user_id='${f.id}' AND m.content LIKE '%Ảnh phòng không đúng thực tế%'`),'1');
 const chats=await api('/api/chat/conversations','GET',null,token);
 assert.ok(chats.items.some(c=>c.lastMessage?.content?.includes('Ảnh phòng không đúng thực tế')),'staff message visible in chat');
 await api(`/api/notifications/${rejected.id}/read`,'PUT',null,token,204);
 await api(`/api/rooms/${room.id}`,'PUT',body,token,409);
 await review(admin,'approved','');await api(`/api/rooms/${room.id}`,'PUT',body,token,409);
 n=await api('/api/notifications','GET',null,token);assert.equal(n.unreadRoomCount,1);
 assert.equal(n.items.filter(n=>n.type==='rooms'&&['approved','rejected'].includes(n.data.status)).length,0,'No duplicate trigger review notices');
 await review(moderator,'rejected');
 assert.equal(sql(`SELECT count(DISTINCT m.conversation_id) FROM messages m JOIN conversation_members cm ON cm.conversation_id=m.conversation_id WHERE cm.user_id='${f.id}' AND m.content LIKE '%Ảnh phòng không đúng thực tế%'`),'2','each reviewer is the message sender');
 await api(`/api/rooms/${room.id}`,'PUT',body,token,409);
 console.log('PASS: Moderator/Admin reviews persist public status notifications; internal notes stay staff-only; blank approval accepted; duplicate review atomic; approved edits blocked; rejected edits blocked and recipient message persisted; ownership/read counts enforced.');
 if(process.argv.includes('--keep')){writeFileSync(fixture,JSON.stringify(f));keep=true;console.log('Temporary UI fixture retained for explicit cleanup.');}
}finally{if(f&&!keep){cleanup(f);console.log('Temporary QA member, room, photo metadata and notifications removed.');}}
