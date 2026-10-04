import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const base='http://localhost:5000';
const users=[],entities=[];
const sql=q=>execFileSync('docker',['compose','exec','-T','postgres','psql','-U','roomiematch','-d','roomiematch','-v','ON_ERROR_STOP=1','-c',q],{stdio:['ignore','pipe','pipe']});
async function call(path,user,body,method=body===undefined?'GET':'POST',expected){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+user.accessToken}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const t=await r.text();if(expected)assert.equal(r.status,expected,path);else assert.ok(r.ok,`${path}: ${r.status} ${t}`);
 return t?JSON.parse(t):null;
}
const list=u=>call('/api/users/me/notifications?pageSize=50',u);
try {
 for(let i=0;i<2;i++){
  const email=`noti-${randomUUID()}@example.test`,password=randomUUID()+'Aa1!';
  const u={...await call('/api/auth/register',null,{email,password,displayName:'Notification QA '+i,gender:'male',city:'TP.HCM'}),email,password};users.push(u);
  await call('/api/users/me/onboarding',u,{name:'Notification QA '+i,age:'24',gender:'Nam',employment:'Đang đi làm',orgName:'QA test',hideOrg:false,city:'TP.HCM',bio:'Tài khoản kiểm tra thông báo',sleep:'22h–0h',env:'Yên tĩnh',yn:{smoke:'Không',drink:'Không',pets:'Không'},cleanliness:4,extroversion:50,budgetMin:3,budgetMax:7,hasRoom:'no',distance:'2–5 km',roomType:'Phòng riêng',moveInDate:new Date(Date.now()+86400000).toISOString().slice(0,10),amenities:[]},'PUT');
 }
 const [a,b]=users;
 await call('/api/users/me/notifications',null,undefined,'GET',401);
 const group=await call('/api/groups',a,{name:'Notification QA group'});entities.push(group.id);
 await call(`/api/groups/${group.id}/invitations`,a,{email:b.email});
 let feed=await list(b);assert.ok(feed.items.some(n=>n.title.includes('lời mời')&&n.data.url.includes(group.id)));
 const invitation=feed.items.find(n=>n.data.entityId===group.id);
 await call(`/api/users/me/notifications/${invitation.id}/read`,a,undefined,'POST',404);
 await call(`/api/users/me/notifications/${invitation.id}/read`,b,undefined,'POST',204);
 await call(`/api/users/me/notifications/${invitation.id}/read`,b,undefined,'POST',204);
 await call(`/api/groups/${group.id}/accept`,b,undefined,'POST');
 const request=await call('/api/matching/requests',a,{candidateId:b.user.id,message:'QA invitation'});entities.push(request.id);
 assert.ok((await list(b)).items.some(n=>n.type==='match_requests'&&n.data.status==='pending'));
 await call(`/api/matching/requests/${request.id}/accept`,b,undefined,'POST');
 assert.ok((await list(a)).items.some(n=>n.type==='match_requests'&&n.data.status==='accepted'));
 const conversation=await call('/api/chat/conversations',a,{userId:b.user.id});entities.push(conversation.id);
 const message=await call(`/api/chat/conversations/${conversation.id}/messages`,a,{content:'QA private message'});entities.push(message.id);
 feed=await list(b);assert.ok(feed.items.some(n=>n.type==='message'&&!n.body.includes('QA private')));
 await call(`/api/chat/conversations/${conversation.id}/read`,b,undefined,'POST');
 assert.ok((await list(b)).items.filter(n=>n.type==='message').every(n=>n.readAt));
 const services=await call('/api/hyperlocal/services',null);assert.ok(services.items.length);
 const booking=await call(`/api/hyperlocal/services/${services.items[0].id}/bookings`,a,{scheduledAt:new Date(Date.now()+86400000).toISOString(),address:'QA test address',contactPhone:'0901234567',note:'QA'});entities.push(booking.id);
 await call(`/api/hyperlocal/me/bookings/${booking.id}/cancel`,a,undefined,'POST');
 feed=await list(a);assert.ok(feed.items.some(n=>n.type==='service_bookings'&&n.data.status==='cancelled'));
 if((await call('/api/billing/health',null)).provider==='mock'){
  const plans=await call('/api/billing/plans',null);
  const payment=await call('/api/billing/checkout',a,{planCode:plans.find(p=>p.price>0)?.code??plans.find(p=>p.code!=='free').code});entities.push(payment.paymentId);
  const res=await fetch(base+`/api/billing/mock-gateway/${payment.paymentId}/complete`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'result=success',redirect:'manual'});assert.equal(res.status,302);
  feed=await list(a);assert.ok(feed.items.some(n=>n.type==='payments'&&n.data.status==='paid'));
  const before=feed.items.filter(n=>n.type==='payments'&&n.data.status==='paid').length;
  await fetch(base+`/api/billing/mock-gateway/${payment.paymentId}/complete`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'result=success',redirect:'manual'});
  assert.equal((await list(a)).items.filter(n=>n.type==='payments'&&n.data.status==='paid').length,before);
  await call(`/api/billing/payments/${payment.paymentId}/refund`,a,{reason:'QA kiểm tra thông báo hoàn tiền'});
  assert.ok((await list(a)).items.some(n=>n.type==='payments'&&n.data.status==='refunded'));
 }
 const profile=await call('/api/users/me/profile',a);
 await call('/api/users/me/profile',a,{...profile,bio:'Đã chỉnh sửa để kiểm tra thông báo'},'PUT');
 assert.ok((await list(a)).items.some(n=>n.type==='profiles'));
 const room=await call('/api/rooms',a,{title:'Notification QA room',description:'Phòng kiểm tra thông báo duyệt tin',address:'123 QA',district:'Quận 1',city:'TP.HCM',monthlyRent:3000000,deposit:0,availableFrom:new Date(Date.now()+86400000).toISOString().slice(0,10),maxOccupants:2,propertyType:'apartment',bedrooms:1,areaM2:30,roommatesNeeded:1,amenities:[],isActive:true});entities.push(room.id);
 const dispute=await call('/api/disputes',a,{respondentId:b.user.id,title:'QA kiểm tra thông báo hòa giải',details:'Yêu cầu kiểm tra thông báo và kết luận hòa giải giữa hai tài khoản QA.'});entities.push(dispute.id);
 sql(`UPDATE users SET role='moderator' WHERE id='${b.user.id}';`);
 Object.assign(b,await call('/api/auth/login',null,{email:b.email,password:b.password}));
 const staffRooms=await call('/api/admin/rooms',b);
 const pendingRoom=staffRooms.items.find(r=>r.id===room.id);assert.ok(pendingRoom);
 await call(`/api/admin/rooms/${room.id}/review`,b,{status:'approved',note:'QA kiểm tra thông báo duyệt',expectedUpdatedAt:pendingRoom.updatedAt});
 assert.ok((await list(a)).items.some(n=>n.type==='rooms'&&n.data.status==='approved'));
 await call(`/api/admin/disputes/${dispute.id}/review`,b,{status:'resolved',note:'QA self-review forbidden'},'POST',409);
 // A rolled-back event must not leak into the notification history.
 sql(`BEGIN; SELECT activity_notice('${a.user.id}','qa_rollback','Rollback test','Should not persist','/notifications'); ROLLBACK;`);
 assert.ok(!(await list(a)).items.some(n=>n.type==='qa_rollback'));
 await call('/api/users/me/notifications/read-all',a,undefined,'POST',204);
 assert.equal((await call('/api/users/me/notifications/unread-count',a)).count,0);
 assert.equal((await call('/api/users/me/notifications?unreadOnly=true',a)).totalCount,0);
 assert.ok((await list(b)).items.every(n=>!n.data.url?.startsWith('/payments/')&&!n.data.url?.startsWith('/bookings/')));
 await call('/api/users/me/notifications?page=0',a,undefined,'GET',400);
 const page=await call('/api/users/me/notifications?pageSize=1',a);assert.equal(page.items.length,1);assert.ok(page.hasNextPage);
 console.log('PASS notifications: group/match invitation, chat privacy/read sync, booking cancel, mock payment/replay/refund, profile save, room moderation, dispute privacy, transaction rollback, history/paging, ownership, read/read-all.');
} finally {
 const ids=users.map(u=>`'${u.user.id}'`).join(',');
 if(ids){
  const targets=[...new Set([...entities,...users.map(u=>u.user.id)])].map(x=>`'${x}'`).join(',');
  sql(`BEGIN; DELETE FROM notifications WHERE data->>'entityId' IN (${targets}); DELETE FROM housing_groups WHERE created_by IN (${ids}); DELETE FROM payments WHERE user_id IN (${ids}); DELETE FROM conversations WHERE id IN (SELECT conversation_id FROM conversation_members WHERE user_id IN (${ids})); DELETE FROM staff_audit_logs WHERE actor_id IN (${ids}) OR target_id IN (${targets}); DELETE FROM users WHERE id IN (${ids}) AND email LIKE 'noti-%@example.test'; COMMIT;`);
  console.log('Isolated notification QA data cleaned.');
 }
}
