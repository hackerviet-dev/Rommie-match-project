import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
const fixture='tmp/resident-quiz-fixture.json';
const sql=q=>execFileSync('docker',['compose','exec','-T','postgres','psql','-U','roomiematch','-d','roomiematch','-v','ON_ERROR_STOP=1','-t','-A','-c',q],{encoding:'utf8'}).trim();
function cleanup(users){for(const u of users){assert.match(u.id,/^[0-9a-f-]{36}$/);assert.match(u.email,/^resident-quiz-[0-9a-f-]+@example.test$/);sql(`DELETE FROM users WHERE id='${u.id}' AND email='${u.email}' AND role='member'`);}}
if(process.argv.includes('--cleanup')){if(existsSync(fixture)){cleanup(JSON.parse(readFileSync(fixture,'utf8')));unlinkSync(fixture);}console.log('Resident quiz fixtures removed.');process.exit(0);}
async function api(path,method='GET',body,token,status=200){const r=await fetch('http://localhost:5000'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});assert.equal(r.status,status,`${method} ${path}: ${await r.clone().text()}`);return r.status===204?null:r.json();}
const users=[];let keep=false;
try {
 for(const name of ['Resident QA','Seeker QA']){const email=`resident-quiz-${randomUUID()}@example.test`,password=randomUUID()+'Aa1!';const r=await api('/api/auth/register','POST',{email,password,displayName:name,gender:'male',city:'TP.HCM'});users.push({id:r.user.id,email,password,token:r.accessToken});}
 const [resident,seeker]=users;
 assert.equal(await api("/api/matching/me/quiz","GET",null,resident.token,204),null);
 const base={name:'Resident QA',age:'24',gender:'Nam',employment:'Khác',city:'TP.HCM',sleep:'22h–0h',env:'Vừa phải',yn:{smoke:'Không',drink:'Không',pets:'Không'},hasRoom:'yes',roomPosterType:'resident',roomAction:'explore'};
 await api('/api/users/me/onboarding','PUT',{...base,roomPosterType:'landlord_agent'},resident.token,400);
 await api('/api/users/me/onboarding','PUT',base,resident.token,409);
 assert.equal((await api('/api/users/me/onboarding','GET',null,resident.token)).isComplete,false);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 await api('/api/users/me/onboarding','PUT',{...base,name:'Seeker QA',hasRoom:'no',roomPosterType:'',roomAction:'',distance:'2–5 km',roomType:'Phòng chung',moveInDate:today},seeker.token);
 const before=await api('/api/matching/me/usage','GET',null,seeker.token);
 await api('/api/matching/me/recalculate','POST',{},seeker.token,409);
 assert.equal((await api('/api/matching/me/usage','GET',null,seeker.token)).scansRemaining,before.scansRemaining);
 const quiz=await api('/api/matching/quiz','GET',null,resident.token);
 const answers=Object.fromEntries(quiz.questions.map(q=>[q.id,q.options[0].id]));
 await api('/api/matching/me/quiz','PUT',{answers:{}},resident.token,400);
 await api('/api/matching/me/quiz','PUT',{answers},resident.token);
 await api('/api/users/me/onboarding','PUT',base,resident.token);
 assert.equal(sql(`SELECT count(*) FROM profiles p JOIN lifestyle_preferences lp ON lp.user_id=p.user_id JOIN quiz_responses qr ON qr.user_id=p.user_id WHERE p.user_id='${resident.id}' AND p.onboarding_completed_at IS NOT NULL AND p.onboarding_data->>'roomPosterType'='resident' AND qr.completed_at IS NOT NULL`),'1');
 await api('/api/matching/me/quiz','PUT',{answers},seeker.token);
 const seekerProfile=await api('/api/users/me/profile','GET',null,seeker.token);
 assert.equal(seekerProfile.onboarding.hasRoom,'no'); assert.equal(seekerProfile.onboarding.distance,'2–5 km');
 assert.equal(seekerProfile.onboarding.roomType,'Phòng chung'); assert.equal(seekerProfile.onboarding.moveInDate,today);
 assert.equal(seekerProfile.onboarding.budgetMin,3); assert.equal(seekerProfile.onboarding.budgetMax,7);
 const savedSeeker=await api('/api/matching/me/quiz','GET',null,seeker.token);
 assert.deepEqual(savedSeeker.answers,answers);
 const afterView=await api('/api/matching/me/usage','GET',null,seeker.token);
 assert.equal(afterView.scansRemaining,before.scansRemaining,'reading saved profile and quiz consumes no scan');
 assert.equal((await api('/api/users/me/profile','GET',null,resident.token)).onboarding.hasRoom,'yes','own saved data stays isolated');
 await api('/api/matching/me/recalculate','POST',{},seeker.token);
 let matches=await api('/api/matching/me/matches','GET',null,seeker.token);assert.ok(matches.items.some(m=>m.id===resident.id),'completed resident must be visible');
 const storedQuiz=sql(`SELECT to_jsonb(qr)::text FROM quiz_responses qr WHERE user_id='${resident.id}'`);
 sql(`DELETE FROM quiz_responses WHERE user_id='${resident.id}'`);
 matches=await api('/api/matching/me/matches','GET',null,seeker.token);assert.ok(!matches.items.some(m=>m.id===resident.id),'stale score hidden without quiz');
 await api(`/api/matching/me/matches/${resident.id}`,'GET',null,seeker.token,404);
 await api('/api/matching/requests','POST',{candidateId:resident.id},seeker.token,404);
 assert.ok(storedQuiz);await api('/api/matching/me/quiz','PUT',{answers},resident.token);
 sql(`UPDATE profiles SET onboarding_data=jsonb_set(onboarding_data,'{roomPosterType}','"landlord_agent"') WHERE user_id='${resident.id}'`);
 matches=await api('/api/matching/me/matches','GET',null,seeker.token);assert.ok(!matches.items.some(m=>m.id===resident.id),'legacy landlord must be hidden');
 await api('/api/matching/requests','POST',{candidateId:resident.id},seeker.token,404);
 await api('/api/users/me/onboarding','PUT',{...base,roomAction:'post_room'},resident.token);
 assert.equal((await api('/api/users/me/profile','GET',null,resident.token)).onboarding.roomAction,'post_room');
 console.log('PASS: landlord rejected; resident quiz required; no scan charged before quiz; database checkpoint persisted; stale scores/details/requests hidden; action saves separately.');
 if(process.argv.includes('--keep-ui')){sql(`DELETE FROM quiz_responses WHERE user_id='${resident.id}'; DELETE FROM lifestyle_preferences WHERE user_id='${resident.id}'; UPDATE profiles SET onboarding_data=NULL,onboarding_completed_at=NULL,has_room=false WHERE user_id='${resident.id}'`);writeFileSync(fixture,JSON.stringify(users));keep=true;console.log('Only isolated QA users retained for UI check; no room created.');}
}finally{if(!keep){cleanup(users);console.log('QA users removed.');}}
