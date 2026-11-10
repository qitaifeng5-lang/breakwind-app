import test from 'node:test';
import assert from 'node:assert/strict';
import {pbCourses,pbWeek,courseContentComplete,weekContentStatus} from '../public/pb-library.js';
import {compileWorkout,workoutTotals,newSession,advanceSession,sessionRecord} from '../public/workout.js';
import {courseReadiness} from '../public/engine.js';
import {fresh} from '../public/model.js';
test('Tempo has three timed work bouts, two jog recoveries and full 37-minute structure; no PB-derived threshold or distance',()=>{
 for(const event of ['800 m','1500 m']){
  const c=pbCourses(event,'2:00').find(c=>c.id==='tempo'),spec=c.prescription,steps=compileWorkout(spec),totals=workoutTotals(spec);
  assert.equal(courseContentComplete(c),true);assert.equal(c.contentState.independentReview,'pending');assert.equal(c.review.reviewer,null);
  assert.deepEqual(steps.map(s=>s.kind),['warmup','work','recovery','work','recovery','work','cooldown']);
  assert.equal(totals.mainDurationSeconds,900);assert.equal(totals.mainDistanceM,null);assert.equal(totals.recoverySeconds,120);assert.deepEqual(totals.estimatedSecondsRange,[2220,2220]);
  assert.ok(spec.repetitions.every(r=>r.target.effort&&!r.target.targetSecondsRange));
  assert.deepEqual(pbCourses(event,'6:00').find(c=>c.id==='tempo').prescription,spec);
  const session=newSession(spec,c,0,'tempo-test');let now=0;for(const step of steps){now+=step.durationSeconds*1000;advanceSession(session,now);}
  const record=sessionRecord(session,'2026-11-09');assert.equal(record.completedWorkSeconds,900);assert.equal(record.distanceMeasured,false);assert.equal(record.type,'阈值跑');
 }
});
test('week completeness detects missing prescriptions and malformed recovery, not merely seven cards or complete labels',()=>{
 for(const event of ['800 m','1500 m']){
  const base=pbWeek(event,'2:00',{phase:'base'}),status=weekContentStatus(base);
  assert.equal(status.filled,1);assert.equal(status.complete,false);assert.ok(status.missing>0);assert.equal(status.canExecuteWeek,false);
  const broken=structuredClone(base),tempo=broken.find(c=>c.id==='tempo');delete tempo.prescription.repetitions[0].repRecovery;
  assert.equal(weekContentStatus(broken).filled,0);
  const absent=structuredClone(base);absent.find(c=>c.id==='tempo').segments=[];assert.equal(weekContentStatus(absent).filled,0);
  const youth=pbWeek(event,'2:00',{phase:'base',youth:true});assert.equal(weekContentStatus(youth).filled,0);assert.equal(weekContentStatus(youth).complete,false);
 }
});
test('completed programming is independent of current safety and does not mutate a saved snapshot',()=>{
 const c=pbCourses('800 m','2:00').find(c=>c.id==='tempo'),snapshot=structuredClone(c),data=fresh();
 data.trainingHold=true;assert.equal(courseReadiness(data,c,'2026-11-09').status,'paused');assert.equal(courseContentComplete(c),true);
 data.trainingHold=false;data.cycleProfile={age:'未满18岁'};assert.equal(courseReadiness(data,c,'2026-11-09').status,'coach');
 pbCourses('800 m','1:45');pbWeek('800 m','1:45',{phase:'base'});assert.deepEqual(c,snapshot);
});
