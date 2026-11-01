// Admin account deletion: soft delete → restore → soft delete → hard delete, through the real
// frontend staffApi client against the Docker API and PostgreSQL.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const require=createRequire(process.cwd()+'/frontend/web-app/rommie-match/package.json');
await mkdir('tmp/account-deletion',{recursive:true});
await writeFile('tmp/account-deletion/entry.ts',`export {staffApi} from '../../frontend/web-app/rommie-match/src/features/admin/services/staff-api';`);
await require('esbuild').build({entryPoints:['tmp/account-deletion/entry.ts'],bundle:true,platform:'node',format:'cjs',outfile:'tmp/account-deletion/client.cjs',define:{'import.meta.env':JSON.stringify({VITE_API_BASE_URL:'http://localhost:5000'})}});
const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};globalThis.localStorage={removeItem:()=>{}};globalThis.window={dispatchEvent:()=>{}};
const {staffApi:s}=require(process.cwd()+'/tmp/account-deletion/client.cjs');
const fixture={users:[]};
const sql=q=>execFileSync('docker',['compose','exec','-T','postgres','psql','-U','roomiematch','-d','roomiematch','-At','-v','ON_ERROR_STOP=1','-c',q],{stdio:['ignore','pipe','pipe']}).toString().trim();
const auth=u=>{storage.set('roomiematch-access-token',u.accessToken);storage.set('roomiematch-refresh-token',u.refreshToken);};
async function raw(path,body,token,method='POST',expected=200,attempt=0){const res=await fetch('http://localhost:5000'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});if(res.status===429&&attempt<2){await res.text();const seconds=Math.max(1,Math.min(60,Number(res.headers.get('Retry-After'))||60));console.log(`Rate limit: retrying after ${seconds}s.`);await new Promise(r=>setTimeout(r,seconds*1000));return raw(path,body,token,method,expected,attempt+1);}const text=await res.text();if(expected===200)assert.ok(res.ok,`${path}: ${res.status} ${text}`);else assert.equal(res.status,expected,`${path}: ${text}`);return text?JSON.parse(text):null;}
const fails=(fn,status)=>assert.rejects(fn,e=>e.status===status);
const roomVisible=id=>sql(`SELECT count(*) FROM rooms WHERE id='${id}' AND deleted_at IS NULL`)==='1';
try{
 for(const role of ['member','moderator','admin','member','member','member']){
  const email=`delete-${role}-${randomUUID()}@example.test`,password=randomUUID()+'Aa1!';
  const user={...await raw('/api/auth/register',{email,password,displayName:'Delete QA '+role,gender:'male',city:'TP.HCM'}),email,password};fixture.users.push(user);
  if(role!=='member'){sql(`UPDATE users SET role='${role}' WHERE id='${user.user.id}'`);Object.assign(user,await raw('/api/auth/login',{email,password}));}
 }
 const [m,mod,admin,target,selfA,selfG]=fixture.users;
 // An approved live room and a room the member had already deleted on their own.
 const room=sql(`INSERT INTO rooms(owner_user_id,title,address,district,city,monthly_rent,available_from,max_occupants,roommates_needed,pair_occupancy_confirmed_at,accuracy_residence_confirmed_at,moderation_status) VALUES('${m.user.id}','Delete QA room','1 QA','Q1','TP.HCM',3000000,current_date,2,1,now(),now(),'approved') RETURNING id`).split('\n')[0];
 const ownDeleted=sql(`INSERT INTO rooms(owner_user_id,title,address,district,city,monthly_rent,available_from,max_occupants,roommates_needed,pair_occupancy_confirmed_at,accuracy_residence_confirmed_at,moderation_status,deleted_at) VALUES('${m.user.id}','Delete QA old room','1 QA','Q1','TP.HCM',3000000,current_date,2,1,now(),now(),'approved',now()-interval '1 day') RETURNING id`).split('\n')[0];
 await raw('/api/rooms/'+room,undefined,undefined,'GET',200);

 auth(mod);await fails(()=>s.deleteUser(m.user.id,'QA moderator not allowed'),403);
 auth(admin);
 await fails(()=>s.purgeUser(m.user.id,'QA purge before soft delete',m.email),409);
 await fails(()=>s.deleteUser(admin.user.id,'QA self delete'),409);
 await fails(()=>s.deleteUser(m.user.id,'abc'),400);

 // Soft delete: sessions die, sign-in refused, room hidden, row kept.
 await s.deleteUser(m.user.id,'QA soft delete request');
 await raw('/api/auth/me',undefined,m.accessToken,'GET',401);
 await raw('/api/auth/refresh',{refreshToken:m.refreshToken},undefined,'POST',401);
 await raw('/api/auth/login',{email:m.email,password:m.password},undefined,'POST',403);
 await raw('/api/rooms/'+room,undefined,undefined,'GET',404);
 const detail=await s.user(m.user.id);assert.ok(detail.deletedAt);
 assert.ok((await s.users(m.email,'',1,'deleted')).items.some(x=>x.id===m.user.id));
 assert.ok(!(await s.users(m.email,'',1,'active')).items.some(x=>x.id===m.user.id));
 await fails(()=>s.access(m.user.id,{role:'moderator',isActive:true,note:'QA change deleted'}),409);
 await fails(()=>s.deleteUser(m.user.id,'QA delete twice'),409);

 // Restore brings back the account and only the room hidden by the soft delete.
 await s.restoreUser(m.user.id,'QA restore account');
 Object.assign(m,await raw('/api/auth/login',{email:m.email,password:m.password}));
 assert.ok(roomVisible(room));assert.ok(!roomVisible(ownDeleted));
 await fails(()=>s.restoreUser(m.user.id,'QA restore twice'),404);

 // Hard delete: email must match, then the row and its cascade are gone.
 await s.deleteUser(m.user.id,'QA soft delete before purge');
 await fails(()=>s.purgeUser(m.user.id,'QA wrong email','someone@example.test'),400);
 await s.purgeUser(m.user.id,'QA purge account',m.email.toUpperCase());
 assert.equal(sql(`SELECT count(*) FROM users WHERE id='${m.user.id}'`),'0');
 assert.equal(sql(`SELECT count(*) FROM rooms WHERE owner_user_id='${m.user.id}'`),'0');
 await fails(()=>s.user(m.user.id),404);
 const actions=(await s.audit()).items.filter(x=>x.targetId===m.user.id).map(x=>x.action);
 for(const a of ['account.delete','account.restore','account.purge'])assert.ok(actions.includes(a),a);

 // Member self-service deletion (Google Play): wrong confirmations are 400, never 401.
 const del=(u,body,expected)=>raw('/api/auth/delete-account',body,u.accessToken,'POST',expected);
 await raw('/api/auth/delete-account',{confirmEmail:selfA.email,password:selfA.password},undefined,'POST',401);
 await del(mod,{confirmEmail:mod.email,password:mod.password},409);
 await del(selfA,{confirmEmail:'other@example.test',password:selfA.password},400);
 await del(selfA,{confirmEmail:selfA.email,password:'wrong-password'},400);
 await del(selfA,{confirmEmail:selfA.email},400);
 const selfRoom=sql(`INSERT INTO rooms(owner_user_id,title,address,district,city,monthly_rent,available_from,max_occupants,roommates_needed,pair_occupancy_confirmed_at,accuracy_residence_confirmed_at,moderation_status) VALUES('${selfA.user.id}','Self delete QA room','1 QA','Q1','TP.HCM',3000000,current_date,2,1,now(),now(),'approved') RETURNING id`).split('\n')[0];
 await del(selfA,{confirmEmail:selfA.email.toUpperCase(),password:selfA.password},200);
 await raw('/api/auth/me',undefined,selfA.accessToken,'GET',401);
 await raw('/api/auth/login',{email:selfA.email,password:selfA.password},undefined,'POST',403);
 assert.ok(!roomVisible(selfRoom));
 auth(admin);const selfDetail=await s.user(selfA.user.id);assert.ok(selfDetail.deletedAt);assert.equal(selfDetail.deletedBySelf,true);
 assert.ok((await s.audit()).items.some(x=>x.targetId===selfA.user.id&&x.action==='account.self_delete'));
 // Google-only accounts have no password; the typed email alone confirms.
 sql(`UPDATE users SET password_hash=NULL WHERE id='${selfG.user.id}'`);
 await del(selfG,{confirmEmail:selfG.email,password:null},200);
 assert.equal(sql(`SELECT deleted_by=id FROM users WHERE id='${selfG.user.id}'`),'t');

 // A staff account that reviewed a report can be purged; the review stays without the link.
 const report=sql(`INSERT INTO user_reports(reporter_id,reported_user_id,reason,status,reviewed_by,reviewed_at) VALUES('${admin.user.id}','${target.user.id}','spam','resolved','${mod.user.id}',now()) RETURNING id`).split('\n')[0];
 await s.deleteUser(mod.user.id,'QA delete staff');await s.purgeUser(mod.user.id,'QA purge staff',mod.email);
 assert.equal(sql(`SELECT count(*) FROM user_reports WHERE id='${report}' AND reviewed_by IS NULL`),'1');
 sql(`DELETE FROM user_reports WHERE id='${report}'`);

 // The purge job runs once at startup: a self-deletion past 30 days is hard deleted, a fresh one and a staff soft delete are not.
 sql(`UPDATE users SET deleted_at=now()-interval '31 days' WHERE id='${selfA.user.id}'`);
 auth(admin);await s.deleteUser(target.user.id,'QA staff soft delete stays');sql(`UPDATE users SET deleted_at=now()-interval '31 days' WHERE id='${target.user.id}'`);
 execFileSync('docker',['compose','restart','api'],{stdio:'ignore'});
 for(let i=0;i<60&&sql(`SELECT count(*) FROM users WHERE id='${selfA.user.id}'`)!=='0';i++)await new Promise(r=>setTimeout(r,1000));
 assert.equal(sql(`SELECT count(*) FROM users WHERE id='${selfA.user.id}'`),'0');
 assert.equal(sql(`SELECT count(*) FROM users WHERE id='${selfG.user.id}'`),'1');
 assert.equal(sql(`SELECT count(*) FROM users WHERE id='${target.user.id}'`),'1');
 assert.equal(sql(`SELECT count(*) FROM staff_audit_logs WHERE target_id='${selfA.user.id}' AND action='account.purge'`),'1');
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:5000/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}

 console.log('PASS member self-delete: 401 anonymous, 409 staff, 400 wrong email/password/missing password, soft delete revokes sessions and hides rooms, admin sees deletedBySelf and audit, Google-only confirms by email, startup purge removes only self-deletions past 30 days.');
 console.log('PASS admin account deletion: role guard, self/twice/purge-first guards, soft delete revokes sessions and hides rooms, deleted filter, restore only restores its own rooms, email-confirmed hard delete with cascade and audit, staff purge keeps reviewed reports.');
}finally{
 for(const u of fixture.users)sql(`DELETE FROM staff_audit_logs WHERE actor_id='${u.user.id}' OR target_id='${u.user.id}'; DELETE FROM users WHERE id='${u.user.id}' AND email='${u.email}';`);
 console.log('Account deletion fixtures cleaned.');
}
