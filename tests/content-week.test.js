import test from 'node:test';
import assert from 'node:assert/strict';
import {pbCourses,pbWeek,weekContentStatus,courseContentComplete,courseCoverage,contentRevision} from '../public/pb-library.js';
import {templateSpecification,compileWorkout,workoutTotals,newSession,advanceSession,stopSession,sessionRecord} from '../public/workout.js';
import {courseReadiness} from '../public/engine.js';
import {fresh} from '../public/model.js';
const refs={'800':{event:'800 m',seconds:130,date:'2026-11-09',kind:'achieved'},'1500':{event:'1500 m',seconds:270,date:'2026-11-09',kind:'achieved'}};
test('coherent adult weeks contain full prescriptions, a single quality session and accounted recovery',()=>{
 for(const event of ['800 m','1500 m'])for(const group of ['base','advanced'])for(const phase of ['base','recover',...(group==='advanced'?['develop']:[])]){
  const week=pbWeek(event,130,{group,phase}),status=weekContentStatus(week);
  assert.equal(status.complete,true);assert.equal(status.canExecuteWeek,false);assert.equal(status.independentReview,'pending');
  assert.equal(new Set(week.map(c=>c.cohortId)).size,1);assert.equal(week.filter(c=>c.isPlanningSlot).length,0);
  assert.equal(status.qualitySessions,phase==='recover'?0:1);
  if(phase==='base')assert.equal(status.plannedSeconds,group==='base'?8250:9030);
  if(phase==='recover')assert.equal(status.plannedSeconds,3630);
  for(const c of week.filter(c=>c.id!=='rest')){
   assert.equal(courseContentComplete(c),true);assert.equal(c.review.reviewer,null);assert.ok(c.eligibility);assert.ok(c.weekEligibility);
   const spec=templateSpecification(c,refs),steps=compileWorkout(spec);
   assert.equal(steps[0].kind,'warmup');assert.equal(steps.at(-1).kind,'cooldown');
   assert.equal(steps.filter(s=>s.kind==='work').length,c.loadSummary.repCount);
   assert.equal(workoutTotals(spec).recoverySeconds,c.loadSummary.recoverySeconds);
  }
 }
});
test('PB changes neither cohort nor dose; different groups are explicit; mixed cohorts and corrupt parameters fail completeness',()=>{
 const a=pbWeek('800 m',105,{phase:'base',group:'base'}),b=pbWeek('800 m',180,{phase:'base',group:'base'});
 assert.deepEqual(a.map(c=>c.prescription),b.map(c=>c.prescription));
 const advanced=pbWeek('800 m',105,{phase:'base',group:'advanced'});assert.notEqual(advanced[3].id,a[3].id);
 const mixed=structuredClone(a);mixed[3]=advanced[3];assert.equal(weekContentStatus(mixed).complete,false);
 for(const mutate of [c=>c.segments[0].distance++,c=>c.prescription.repetitions[0].repRecovery.durationSeconds++,c=>c.prescription.repetitions[0].repsPerSet++]){
  const c=structuredClone(a[3]);mutate(c);assert.equal(courseContentComplete(c),false);
 }
 assert.equal(courseCoverage().length,24);
 assert.equal(weekContentStatus(pbWeek('800 m',105,{group:'competitive',phase:'base'})).complete,false);
});
test('speed endurance and dual-pace combination have independent source structures and full accounting',()=>{
 const find=(event,id)=>pbCourses(event,130,{group:'competitive'}).find(c=>c.id===id);
 const e=find('800 m','endurance'),spec=templateSpecification(e,refs),t=workoutTotals(spec);
 assert.equal(t.mainDistanceM,1800);assert.equal(t.repCount,6);assert.equal(t.repRecoveries,4);assert.equal(t.setRecoveries,1);assert.equal(t.recoverySeconds,1080);
 assert.deepEqual(t.estimatedSecondsRange,[2572.5,2572.5]);
 const reserve=templateSpecification(find('1500 m','endurance'),refs);assert.equal(reserve.repetitions[0].target.targetBasis,'800');assert.equal(workoutTotals(reserve).recoverySeconds,720);
 for(const event of ['800 m','1500 m']){
  const c=find(event,'combination-development'),s=templateSpecification(c,refs),totals=workoutTotals(s);
  assert.equal(courseContentComplete(c),true);assert.equal(c.catalogRevision,contentRevision);
  assert.deepEqual(s.repetitions.map(r=>r.target.targetSecondsRange),[[72,72],[32.5,32.5]]);
  assert.equal(totals.mainDistanceM,1800);assert.equal(totals.recoverySeconds,780);assert.equal(totals.repRecoveries,3);assert.equal(totals.setRecoveries,2);
  assert.deepEqual(totals.estimatedSecondsRange,[2293.5,2293.5]);
  assert.throws(()=>templateSpecification(c,refs['800']));
  assert.equal(c.automaticRecommendation,false);
 }
});
test('immutable course snapshots, honest partial reports, pain and youth protections survive completed weeks',()=>{
 const c=pbCourses('800 m',130).find(c=>c.id==='tempo'),old=structuredClone(c);
 old.catalogRevision='old-3x6';old.segments=[{distance:6,unit:'min',repeats:3,recoverySeconds:120}];old.prescription.repetitions[0].durationSeconds=360;old.prescription.repetitions[0].repRecovery.durationSeconds=120;
 const s=newSession(old.prescription,old,0,'legacy');advanceSession(s,600000);stopSession(s,610000,'user');
 const record=sessionRecord(s,'2026-11-09');pbWeek('800 m',105,{group:'advanced',phase:'base'});
 assert.equal(record.courseSession.spec.repetitions[0].durationSeconds,360);assert.equal(record.courseSession.course.catalogRevision,'old-3x6');assert.equal(record.completedWorkSeconds,0);assert.equal(record.courseSession.status,'stopped');
 const data=fresh();data.trainingHold=true;assert.equal(courseReadiness(data,c,'2026-11-09').status,'paused');
 data.trainingHold=false;data.cycleProfile={age:'未满18岁'};assert.equal(courseReadiness(data,c,'2026-11-09').status,'coach');
 assert.equal(weekContentStatus(pbWeek('1500 m',270,{youth:true,phase:'base'})).complete,false);
 const easy=pbCourses('800 m',130).find(c=>c.id==='aerobic'),run=newSession(easy.prescription,easy,0,'easy');for(const step of run.steps)advanceSession(run,(run.logs.reduce((n,l)=>n+l.actualSeconds,0)+step.durationSeconds)*1000);
 assert.equal(sessionRecord(run,'2026-11-09').quality,false);assert.equal(sessionRecord(run,'2026-11-09').type,'轻松跑');
});
