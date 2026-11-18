import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../public/model.js';
import {occupied,moveCoachPlan} from '../public/coach-plan.js';
function fixture(){
  const s=fresh();
  for(const [id,date] of [['A','2026-11-16'],['B','2026-11-18']])s.plans.push(occupied({id,date,name:'合成课次 '+id,start:'18:30',estimatedMinutes:60,quality:true,coachIssued:{original:'合成原文',blocks:{主训练:'仅用于软件测试'}}}));
  return s;
}
test('review reproduction: time-only edit is saved despite an adjacent quality-session warning',()=>{
  const s=fixture(),before=structuredClone(s.plans[1].coachIssued);
  const result=moveCoachPlan(s,'B',{start:'19:00'},{today:'2026-11-18'});
  assert.equal(result.plan?.start,'19:00');
  assert.deepEqual(s.plans[1].coachIssued,before);assert.equal(s.plans.length,2);
});

test('real overlaps block without mutation; date moves retain load review and immutable issued/history snapshots',()=>{
 const s=fixture(),before=structuredClone(s);s.events.push({id:'busy',date:'2026-11-18',start:'19:00',end:'20:00',name:'合成工作时段'});
 const blocked=moveCoachPlan(s,'B',{start:'19:00'});assert.equal(blocked.review.canSave,false);assert.deepEqual(s.plans,before.plans);
 s.events=[];s.runs.push({id:'history',date:'2026-11-10',name:'合成实际记录',effort:3});const history=structuredClone(s.runs);
 const moved=moveCoachPlan(s,'B',{date:'2026-11-17'});assert.equal(moved.review.changeType,'date-change');assert.ok(moved.review.loadReview.length);assert.equal(s.plans.length,2);assert.equal(moved.plan.scheduleAudit.length,1);assert.deepEqual(s.runs,history);assert.deepEqual(moved.plan.coachIssued,before.plans[1].coachIssued);
});
test('unknown duration and intensity allow organization without claiming clearance; pain and youth restrictions persist',()=>{
 for(const profile of [{trainingHold:true},{cycleProfile:{age:'未满18岁'}},{cycleProfile:{background:'recovering'}}]){
  const s=fixture();Object.assign(s,profile);s.plans[1].quality=null;
  const result=moveCoachPlan(s,'B',{start:'19:00',estimatedMinutes:''},{today:'2026-11-18'});
  assert.equal(result.plan.end,'');assert.ok(result.review.information.length);assert.ok(result.review.executionRestrictions.length);assert.equal(result.review.executionApproved,false);
 }
});
