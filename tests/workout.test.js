import {test} from 'node:test';
import assert from 'node:assert/strict';
import {targetFor,raceSplit,compileWorkout,workoutTotals,newSession,pauseSession,advanceSession,stopSession,sessionRecord,recoverySteps} from '../public/workout.js';
const ref={event:'800 m',seconds:130,kind:'achieved',date:'2026-11-09'};
const rest={mode:'walk',durationSeconds:180,endRule:'time'};
// Arithmetic fixtures, NOT recommendations or independently reviewed doses.
const spec=()=>({setCount:1,repetitions:[{distanceM:200,repsPerSet:4,target:targetFor(200,'800',ref),repRecovery:rest}],warmup:[{durationSeconds:600}],cooldown:[{durationSeconds:300}]});
test('race split is a same-event arithmetic reference, not an inferred threshold or future PB',()=>{
  assert.equal(raceSplit(130,800,200),32.5);
  assert.equal(targetFor(200,'1500',ref),null);
  assert.equal(targetFor(200,'800',{...ref,kind:'goal'}),null);
  assert.equal(targetFor(200,'threshold',ref),null);
  assert.equal(targetFor(200,'coach',null,[34,36]).referencePerformance,null);
  assert.equal(raceSplit(Infinity,800,200),null);
});
test('4 x 200: three recoveries, 800m quality, 9min recovery, full timed total 26:10',()=>{
  const t=workoutTotals(spec());
  assert.equal(t.mainDistanceM,800);assert.equal(t.repRecoveries,3);assert.equal(t.setRecoveries,0);
  assert.equal(t.recoverySeconds,540);assert.deepEqual(t.estimatedSecondsRange,[1570,1570]);
  assert.equal(t.warmupDistanceM,null);assert.equal(t.cooldownDistanceM,null);
  assert.equal(compileWorkout(spec()).at(-2).kind,'work');
});
test('2 x (200 + 150): set recovery replaces trailing rep recovery, different segment bases',()=>{
  const s=spec();s.setCount=2;s.setRecovery={...rest,durationSeconds:300};
  s.repetitions=[{...s.repetitions[0],repsPerSet:1},{distanceM:150,repsPerSet:1,target:targetFor(150,'coach',null,[25,27])}];
  const t=workoutTotals(s);
  assert.equal(t.mainDistanceM,700);assert.equal(t.repRecoveries,2);assert.equal(t.setRecoveries,1);
  assert.equal(t.recoverySeconds,660);assert.deepEqual(t.estimatedSecondsRange,[1675,1679]);
  assert.deepEqual(compileWorkout(s).map(x=>x.kind),['warmup','work','recovery','work','recovery','work','recovery','work','cooldown']);
});
test('unknown recovery is rejected; distance recovery cannot manufacture total duration',()=>{
  const s=spec();s.repetitions[0].repRecovery=null;assert.throws(()=>compileWorkout(s),/恢复/);
  s.repetitions[0].repRecovery={mode:'jog',distanceM:100,endRule:'distance'};
  assert.equal(workoutTotals(s).estimatedSecondsRange,null);assert.equal(workoutTotals(s).recoverySeconds,null);
  assert.equal(workoutTotals(s).jogRecoveryDistanceM,300);
  assert.throws(()=>recoverySteps({mode:'walk',durationSeconds:60,endRule:'both'}));
  assert.throws(()=>recoverySteps({mode:'stand',distanceM:100,endRule:'distance'}));
  assert.equal(recoverySteps({mode:'mixed',steps:[rest,{mode:'jog',distanceM:100,endRule:'distance'}]}).length,2);
});
test('execution is a deep snapshot, pauses exclude lost time, stopped distance excludes incomplete lap',()=>{
  const s=spec(),c={name:'验收用课表',pb:130};const session=newSession(s,c,1000,'fixed-id');
  s.repetitions[0].distanceM=400;c.pb=100;
  pauseSession(session,11000);session.anchor=100000;advanceSession(session,110000);
  assert.equal(session.logs[0].actualSeconds,20);assert.equal(session.course.pb,130);assert.equal(session.steps[1].distanceM,200);
  advanceSession(session,142500);advanceSession(session,322500);stopSession(session,330000,'pain');
  const record=sessionRecord(session,'2026-11-09');
  assert.equal(record.distance,.2);assert.equal(record.pain,true);assert.equal(record.id,'fixed-id');
  assert.equal(advanceSession(session,400000),false);
});
