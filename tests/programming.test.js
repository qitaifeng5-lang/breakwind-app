import test from 'node:test';
import assert from 'node:assert/strict';
import {pbCourses,pbWeek} from '../public/pb-library.js';
import {templateSpecification,workoutTotals} from '../public/workout.js';
import {courseReadiness} from '../public/engine.js';
import {fresh} from '../public/model.js';
const day='2026-11-09';
const find=(event,id,pb='2:10')=>pbCourses(event,pb).find(c=>c.id===id);
const reference=(event,seconds)=>({event,seconds,kind:'achieved',date:day});
test('source candidates supply dose and recovery; PB scales timing only',()=>{
  for(const [event,id,seconds,distance,rest,total] of [['800 m','interval-development',130,2000,1080,2605],['1500 m','interval',265,1500,360,1825]]){
    const c=find(event,id),spec=templateSpecification(c,reference(event,seconds)),t=workoutTotals(spec);
    assert.equal(t.mainDistanceM,distance);assert.equal(t.recoverySeconds,rest);assert.deepEqual(t.estimatedSecondsRange,[total,total]);
    assert.equal(t.setRecoveries,0);assert.equal(t.repRecoveries,spec.repetitions[0].repsPerSet-1);
    const faster=templateSpecification(find(event,id,'1:45'),reference(event,seconds-10));
    assert.equal(faster.repetitions[0].repsPerSet,spec.repetitions[0].repsPerSet);
    assert.deepEqual(faster.repetitions[0].repRecovery,spec.repetitions[0].repRecovery);
    assert.equal(c.review.reviewer,null);assert.equal(c.automaticRecommendation,false);
    assert.throws(()=>templateSpecification(c,reference(event==='800 m'?'1500 m':'800 m',seconds)));
  }
});
test('old combinations and stored fixture specs cannot bypass withdrawal; explicit coach transcription preserves pain protection',()=>{
  const data=fresh(),old={event:'800 m',id:'combination',quality:true,executionSpec:{version:1}};
  assert.equal(courseReadiness(data,old,day).canSchedule,false);
  const transcribed={...old,executionSpec:{origin:'coach-transcription'}};
  assert.equal(courseReadiness(data,transcribed,day).canSchedule,true);
  data.trainingHold=true;assert.equal(courseReadiness(data,transcribed,day).status,'paused');
  assert.throws(()=>templateSpecification(find('800 m','combination'),reference('800 m',130)));
});
test('unreviewed courses never auto-fill phase slots; browsing does not depend on device logs',()=>{
  for(const event of ['800 m','1500 m'])for(const phase of ['base','develop','prepare','recover']){
    const week=pbWeek(event,'2:00',{phase});assert.equal(week.length,7);
    assert.ok(week.filter(c=>c.id!=='rest'&&!c.isPlanningSlot).every(c=>c.contentState?.programming==='complete'));
    if(['develop','prepare'].includes(phase))assert.ok(week.some(c=>c.isPlanningSlot));else assert.equal(week.some(c=>c.isPlanningSlot),false);
    for(const c of week.filter(c=>c.isPlanningSlot))assert.equal(courseReadiness(fresh(),c,day).canSchedule,false);
  }
  assert.equal(courseReadiness(fresh(),find('800 m','interval-development'),day).canSchedule,true);
  const youth=fresh();youth.cycleProfile={age:'未满18岁'};
  assert.equal(courseReadiness(youth,find('800 m','interval-development'),day).status,'coach');
});
test('descending combination preserves source distances and unresolved target instead of invented seconds',()=>{
  for(const event of ['800 m','1500 m']){
    const c=find(event,'combination-source');assert.equal(c.segments.reduce((n,s)=>n+s.distance*s.repeats,0)*c.sets,1350);
    assert.equal(c.executionEligible,false);assert.equal(c.catalogStatus,'candidate');
    assert.ok(c.evidenceMap.some(e=>e.limit.includes('1000m')));
    assert.equal(courseReadiness(fresh(),c,day).canSchedule,false);
  }
});
