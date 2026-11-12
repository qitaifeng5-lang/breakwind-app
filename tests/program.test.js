import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fresh,readData,offset} from '../public/model.js';
import {buildProgram,saveProgram,previewProgramWeek,arrangeProgramWeek,proposeProgramChange,confirmProgramChange,advanceProgram,moveProgramPlan,programReview,exportProgram} from '../public/program.js';
import {applyTestTransaction,entitlement,membershipStatus,vipProduct} from '../public/membership.js';
import {courseContentComplete} from '../public/pb-library.js';
import {courseReadiness} from '../public/engine.js';
import {compileWorkout,templateSpecification,workoutTotals,newSession} from '../public/workout.js';
const today='2026-11-10',now=Date.parse(today+'T12:00:00Z');
const refs={'800':{event:'800 m',seconds:130,date:today,kind:'achieved'},'1500':{event:'1500 m',seconds:270,date:today,kind:'achieved'},mile:{event:'1 mile',seconds:300,date:today,kind:'achieved'}};
function fixture(event='800 m'){
 const s=fresh();s.records=Object.values(refs).map((r,i)=>({...r,id:'ref'+i}));
 s.membershipTest=applyTestTransaction(null,{id:'test',mode:'experience',sequence:1,type:'success',expiresAt:now+30*86400000});
 const p=saveProgram(s,buildProgram({event,startDate:today}),{mode:'experience',now,id:'program'});return {s,p};
}
test('8/12/16 weeks contain coherent adult courses with distinct primary stimuli, preserved recovery and no PB dose escalator',()=>{
 for(const event of ['800 m','1500 m'])for(const length of [8,12,16]){
  const p=buildProgram({event,length,startDate:today,pb:120}),faster=buildProgram({event,length,startDate:today,pb:100});
  assert.equal(p.weeks.length,length);assert.equal(p.weeks.at(-1).phase,'recover');assert.ok(new Set(p.weeks.map(w=>w.key)).size>=6);
  assert.equal(p.reviewStatus.independentReview,'pending');assert.ok(p.weeks.every(w=>w.purpose&&w.transition));
  for(const [i,w] of p.weeks.entries()){
   const q=w.courses.filter(c=>c.quality);assert.ok(q.length<=2);assert.equal(w.courses.length,7);
   if(w.phase==='recover')assert.equal(q.length,0);
   for(const [j,c] of w.courses.entries())if(c.id!=='rest'){
    assert.equal(courseContentComplete(c),true);assert.equal(c.population,'adult-competitive-balanced');
    const spec=templateSpecification(c,refs),steps=compileWorkout(spec),t=workoutTotals(spec);
    assert.equal(steps[0].kind,'warmup');assert.equal(steps.at(-1).kind,'cooldown');assert.equal(t.repCount,c.loadSummary.repCount);assert.equal(t.recoverySeconds,c.loadSummary.recoverySeconds);
    assert.deepEqual(spec,templateSpecification(faster.weeks[i].courses[j],refs),'PB does not determine dosage');
   }
   if(w.phase==='develop')assert.equal(w.courses[4].id,'tempo-competitive-support');
  }
  assert.equal(p.weeks.find(w=>w.key==='bridge').courses[1].id,event==='800 m'?'interval-development':'interval');
 }
});
test('arranging is idempotent, retains coach priorities, respects real time bounds and never backfills missed work',()=>{
 const {s,p}=fixture();s.plans.push({id:'coach',date:offset(today,1),name:'合成教练课',coachIssued:{original:'合成私有样例'},quality:true});const original=structuredClone(s.plans[0]);
 const r=arrangeProgramWeek(s,p.programId,0,{today});assert.ok(r.held.some(h=>h.reason.includes('教练')));assert.ok(r.added.every(c=>!c.quality));assert.deepEqual(s.plans[0],original);
 const n=s.plans.length;arrangeProgramWeek(s,p.programId,0,{today});assert.equal(s.plans.length,n);assert.equal(s.runs.length,0);
 assert.equal(previewProgramWeek(s,p,0,{today:offset(today,8)}).added.length,0);
 const {s:s2,p:p2}=fixture();s2.coachSchedule.rules=[{id:'slot',weekday:new Date(today+'T12:00:00').getDay(),start:'18:00',end:'18:20',name:'合成固定时段',kind:'training'}];
 const constrained=previewProgramWeek(s2,p2,0,{today});assert.equal(constrained.added.length,0);assert.ok(constrained.held.some(h=>/固定时段/.test(h.reason))); // Whole-week mapping may select short hills; unknown preparation still blocks fitting it into a precise slot.
});
test('time move keeps identity; cancellation is not regenerated; confirmed future revisions do not rewrite history',()=>{
 const {s,p}=fixture();arrangeProgramWeek(s,p.programId,0,{today});const plan=s.plans[0],snapshot=structuredClone(plan.course);
 moveProgramPlan(s,plan.id,{start:'18:00'},{today});assert.deepEqual(plan.course,snapshot);assert.equal(s.plans.filter(r=>r.id===plan.id).length,1);
 plan.cancelled=true;arrangeProgramWeek(s,p.programId,0,{today});assert.equal(s.plans.filter(r=>r.id===plan.id).length,1);
 arrangeProgramWeek(s,p.programId,1,{today});s.runs.push({id:'actual',date:today,minutes:20});const historical=JSON.stringify(s.runs),prior=structuredClone(p.weeks[1]);
 const proposal=proposeProgramChange(s,p.programId,{kind:'recover',today});assert.deepEqual(p.weeks[1],prior,'preview/cancel changes nothing');
 confirmProgramChange(s,proposal,{mode:'experience',now});assert.equal(p.weeks[1].phase,'recover');assert.equal(JSON.stringify(s.runs),historical);
 const result=arrangeProgramWeek(s,p.programId,1,{today});assert.ok(result.added.length);assert.ok(result.added.every(c=>!c.quality));assert.ok(s.plans.some(r=>r.programWeek===1&&r.cancelled));
 assert.throws(()=>confirmProgramChange(s,proposal,{mode:'experience',now}),/重新预览/);
});
test('progress, snapshots and records survive expiry and restart, without cancelling an active timer',()=>{
 const {s,p}=fixture();arrangeProgramWeek(s,p.programId,0,{today});const spec=templateSpecification(p.weeks[0].courses[1],refs),session=newSession(spec,p.weeks[0].courses[1],now,'timer'),snapshot=JSON.stringify(session);
 s.membershipTest=applyTestTransaction(s.membershipTest,{id:'expire',mode:'experience',sequence:2,type:'expire'});
 assert.throws(()=>saveProgram(s,buildProgram({event:'1500 m'}),{mode:'experience',now}));
 const saved=readData(JSON.stringify(s));assert.deepEqual(saved.programs,s.programs);assert.deepEqual(saved.plans,s.plans);assert.equal(JSON.stringify(session),snapshot);
 assert.equal(entitlement(saved.membershipTest,'finish-session',{mode:'experience',now}),true);assert.equal(entitlement(saved.membershipTest,'export',{now}),true);
 advanceProgram(saved,p.programId,{today,confirmed:true});assert.equal(saved.programs[0].cursor,1);assert.equal(saved.runs.length,0);
});
test('known pain, youth and fatigue remain independent of membership; no data is not beginner status',()=>{
 for(const protection of [{trainingHold:true},{cycleProfile:{age:'未满18岁'}},{cycleProfile:{background:'recovering'}}]){
  const {s,p}=fixture();Object.assign(s,protection);assert.equal(previewProgramWeek(s,p,0,{today}).added.length,0);assert.ok(p.weeks[1].courses.some(c=>c.quality));
 }
 const {s,p}=fixture();s.records=[];const r=previewProgramWeek(s,p,1,{today});assert.ok(r.added.some(c=>c.quality));assert.equal(p.cohort,'competitive');
 s.trainingHold=true;assert.throws(()=>advanceProgram(s,p.programId,{today,confirmed:true}),/伤痛/);
 assert.equal(programReview(s,p).actualRuns,0);
});
test('calendar dates cross DST and month boundaries without adding UTC 24-hour instants',()=>{
 const code="import {buildProgram} from './public/program.js';console.log(JSON.stringify(buildProgram({event:'800 m',length:8,startDate:'2026-10-26'}).weeks.map(w=>[w.start,w.end])))";
 const a=execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,TZ:'America/Toronto'},encoding:'utf8'}),b=execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,TZ:'Asia/Shanghai'},encoding:'utf8'});
 assert.equal(a,b);assert.equal(JSON.parse(a)[1][0],'2026-11-02');
 const {s,p}=fixture();assert.equal(previewProgramWeek(s,p,0,{today,timezone:'Pacific/Auckland'}).added.length,0);
});
test('pause blocks restarting existing program sessions and confirmed automatic feedback never increases load',()=>{
 const {s,p}=fixture();arrangeProgramWeek(s,p.programId,0,{today});const plan=s.plans[0];p.status='paused';
 assert.equal(courseReadiness(s,{...plan.course,planId:plan.id},today,today).canSchedule,false);p.status='active';
 s.recovery.push({id:'feedback',date:today,fatigue:5});const proposal=proposeProgramChange(s,p.programId,{today});assert.equal(proposal.kind,'recover');assert.equal(proposal.evidence.actualRuns,0);
 confirmProgramChange(s,proposal,{mode:'experience',now});assert.ok(p.weeks[1].courses.every(c=>!c.quality));
 plan.cancelled=true;assert.equal(courseReadiness(s,{...plan.course,planId:plan.id},today,today).status,'cancelled');
 const clean=fixture();clean.p.cursor=2;const next=proposeProgramChange(clean.s,clean.p.programId,{kind:'hold',today});assert.equal(next.kind,'recover');assert.ok(next.courses.every(c=>!c.quality),'holding familiar work cannot remove a planned recovery week');
});
test('test transactions are ordered and idempotent; no local state authorizes real payment or bypasses free access',()=>{
 assert.equal(vipProduct.targetPriceMinor,1290);let s=null;
 const event=(sequence,type,extra={})=>({id:'e'+sequence,sequence,type,mode:'experience',expiresAt:now+86400000,...extra});
 s=applyTestTransaction(s,event(1,'pending'));assert.equal(membershipStatus(s,now).active,false);
 s=applyTestTransaction(s,event(2,'success'));assert.equal(entitlement(s,'new-program',{mode:'experience',now}),true);assert.equal(entitlement({...s,verified:true},'new-program',{mode:'production',now}),false);
 const prior=structuredClone(s);assert.deepEqual(applyTestTransaction(s,event(2,'success')),prior);assert.deepEqual(applyTestTransaction(s,event(1,'revoke')),prior);
 s=applyTestTransaction(s,event(3,'cancel-renew'));assert.equal(membershipStatus(s,now).active,true);assert.equal(s.autoRenew,false);
 s=applyTestTransaction(s,event(4,'renew',{expiresAt:now+2*86400000}));assert.equal(s.expiresAt,now+2*86400000);
 s=applyTestTransaction(s,event(5,'revoke'));s=applyTestTransaction(s,event(6,'restore',{restoredStatus:'revoked'}));assert.equal(membershipStatus(s,now).active,false);
 assert.equal(entitlement(s,'basic-week'),true);assert.equal(entitlement(s,'coach-plan'),true);assert.equal(entitlement(s,'safety'),true);
 assert.throws(()=>applyTestTransaction(s,{...event(7,'success'),mode:'production'}));
 assert.equal(applyTestTransaction(null,event(1,'cancel')).status,'cancelled');assert.equal(applyTestTransaction(null,event(1,'failure')).status,'failed');
 assert.equal(membershipStatus(applyTestTransaction(null,event(1,'success')),now+2*86400000).status,'expired');
});

test('expired personal export includes associated actual sessions, excluding unrelated records',()=>{const {s,p}=fixture();arrangeProgramWeek(s,p.programId,0,{today});s.runs.push({id:'own',date:today,courseSession:{course:{planId:s.plans[0].id}}},{id:'other',date:today});s.membershipTest.status='expired';const out=exportProgram(s,p.programId);assert.deepEqual(out.runs.map(r=>r.id),['own']);out.plans[0].name='edited export';assert.notEqual(s.plans[0].name,'edited export');});
