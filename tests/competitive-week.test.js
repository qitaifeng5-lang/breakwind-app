import test from 'node:test';
import assert from 'node:assert/strict';
import {pbCourses,pbWeek,weekContentStatus,courseCoverage,courseContentComplete} from '../public/pb-library.js';
import {templateSpecification,compileWorkout,workoutTotals,newSession} from '../public/workout.js';
import {courseReadiness} from '../public/engine.js';
import {fresh} from '../public/model.js';
const refs={mile:{event:'1 mile',seconds:300,date:'2026-11-09',kind:'achieved'},'800':{event:'800 m',seconds:130,date:'2026-11-09',kind:'achieved'},'1500':{event:'1500 m',seconds:270,date:'2026-11-09',kind:'achieved'}};
const week=(event,phase,youth=false)=>pbWeek(event,130,{group:'competitive',phase,youth});
const total=rows=>rows.filter(c=>c.id!=='rest').reduce((n,c)=>n+workoutTotals(templateSpecification(c,refs)).estimatedSecondsRange[0],0);

test('both adult competitive cohorts have complete, phase-compatible weeks with explicit workload and recovery relationships',()=>{
 for(const event of ['800 m','1500 m'])for(const phase of ['base','develop','prepare','recover']){
  const rows=week(event,phase),s=weekContentStatus(rows);assert.equal(s.complete,true);assert.equal(s.canExecuteWeek,false);
  assert.equal(s.qualitySessions,{base:2,develop:2,prepare:1,recover:0}[phase]);
  assert.equal(new Set(rows.map(c=>c.cohortId)).size,1);assert.ok(rows.every(c=>c.weekEligibility.includes('六课周')&&c.transitionRules));
  const quality=rows.flatMap((c,i)=>c.quality?[i]:[]);assert.ok(quality.every((n,i)=>i===0||n-quality[i-1]>=3));
  for(const c of rows.filter(c=>c.id!=='rest')){
   assert.equal(courseContentComplete(c),true);assert.equal(c.population,'adult-competitive-balanced');
   assert.equal(c.review.reviewer,null);assert.equal(c.automaticRecommendation,false);assert.ok(c.evidenceMap.every(e=>e.source&&e.adaptation&&e.limit));
   const spec=templateSpecification(c,refs),steps=compileWorkout(spec),t=workoutTotals(spec);
   assert.equal(steps[0].kind,'warmup');assert.equal(steps.at(-1).kind,'cooldown');
   if(c.warmupSeconds===900)assert.doesNotMatch(c.evidenceMap.map(e=>e.parameter+' '+e.adaptation).join(' '),/热身(?:、冷身各|冷身各)?10分钟/);
   assert.equal(t.repCount,c.loadSummary.repCount);assert.equal(t.recoverySeconds,c.loadSummary.recoverySeconds);
   assert.equal(t.mainDistanceM,c.loadSummary.mainDistanceM);assert.equal(t.mainDurationSeconds,c.loadSummary.mainDurationSeconds);
  }
 }
 assert.equal(courseCoverage().filter(c=>c.group==='competitive'&&c.week.complete).length,8);
});

test('800m and 1500m competitive development differ in stimulus, references, recoveries and aerobic support',()=>{
 const a=week('800 m','develop'),b=week('1500 m','develop');
 assert.deepEqual(a.map(c=>c.id),['aerobic-competitive','endurance','aerobic-competitive-recovery','aerobic-competitive','tempo-competitive-support','rest','aerobic-competitive-long']);
 assert.equal(b[1].id,'combination-development');
 const as=templateSpecification(a[1],refs),bs=templateSpecification(b[1],refs);
 assert.deepEqual(as.repetitions.map(r=>[r.distanceM,r.repsPerSet,r.target.targetSecondsRange[0]]),[[300,3,48.75]]);assert.equal(as.setCount,2);
 assert.deepEqual(bs.repetitions.map(r=>[r.distanceM,r.repsPerSet,r.target.targetSecondsRange[0]]),[[400,1,300*400/1609.344],[200,1,32.5]]);assert.equal(bs.setCount,3);
 assert.equal(workoutTotals(as).recoverySeconds,1080);assert.equal(workoutTotals(bs).recoverySeconds,780);
 assert.equal(a[4].prescription.repetitions[0].durationSeconds,300);assert.equal(b[4].prescription.repetitions[0].durationSeconds,300);
 assert.equal(workoutTotals(a[6].prescription).estimatedSecondsRange[0],3600);assert.equal(workoutTotals(b[6].prescription).estimatedSecondsRange[0],4200);
 assert.throws(()=>templateSpecification(b[1],refs['1500']));
});

test('phase transitions replace stimuli and reduce actual totals rather than rename a base week or stack courses',()=>{
 for(const event of ['800 m','1500 m']){
  const base=week(event,'base'),development=week(event,'develop'),prepare=week(event,'prepare'),recover=week(event,'recover');
  assert.equal(base[4].id,'hills-competitive');assert.equal(base[1].id,'tempo-competitive-base');assert.equal(development[4].id,'tempo-competitive-support');
  assert.ok(Math.abs(total(base)-total(development))/total(base)<.1,'phase substitution keeps whole-session time comparable; not a physiological equivalence');
  assert.ok(total(prepare)<total(development)*.65);assert.ok(total(recover)<total(development)*.65);
  assert.equal(prepare[1].sessionRole,'primer');assert.equal(prepare[6].id,'rest');assert.ok(prepare.every(c=>c.categoryId!=='tempo'&&!c.id.endsWith('-long')));
  const t=workoutTotals(templateSpecification(prepare[1],refs));assert.equal(t.mainDistanceM,event==='800 m'?800:900);assert.equal(t.setRecoveries,0);assert.equal(t.repRecoveries,event==='800 m'?3:2);
  const bad=structuredClone(development);bad[4]=base[1];assert.equal(weekContentStatus(bad).complete,false,'wrong-phase course cannot complete the week');
  const before=pbCourses(event,105,{group:'competitive'}),after=pbCourses(event,180,{group:'competitive'});assert.deepEqual(before.map(c=>[c.id,c.segments,c.setRecovery,c.prescription]),after.map(c=>[c.id,c.segments,c.setRecovery,c.prescription]));
 }
});

test('youth competitive remains a separate review framework; known pain, fatigue and old snapshots retain protection',()=>{
 const data=fresh(),c=week('800 m','develop')[1];data.cycleProfile={age:'未满18岁'};
 assert.equal(courseReadiness(data,c,'2026-11-09').canSchedule,false);
 const young=week('800 m','develop',true);assert.equal(weekContentStatus(young).complete,false);assert.ok(young.every(c=>c.weekPurpose.includes('青少年竞技')&&!c.name.includes('走跑')));
 assert.ok(young.filter(c=>c.id!=='rest').every(c=>c.isPlanningSlot));
 assert.ok(courseCoverage({youth:true}).filter(r=>r.group==='competitive').every(r=>r.categories.every(c=>c.complete.length===0)),'adult source-checked intervals do not count as completed youth prescriptions');
 data.cycleProfile={};data.trainingHold=true;assert.equal(courseReadiness(data,c,'2026-11-09').status,'paused');
 data.trainingHold=false;data.recovery=[{date:'2026-11-09',fatigue:5}];assert.equal(courseReadiness(data,c,'2026-11-09').status,'recovery');
 const old=structuredClone(c),spec=templateSpecification(old,refs);old.catalogRevision='2026-11-09-middle-week-v2';spec.warmup[0].durationSeconds=600;
 const saved=newSession(spec,old,0,'historical');week('800 m','prepare');assert.equal(saved.spec.warmup[0].durationSeconds,600);assert.equal(saved.course.catalogRevision,'2026-11-09-middle-week-v2');
});

test('specific Tempo retains familiar aerobic dose and recovery while the primary stimulus changes',()=>{
 for(const event of ['800 m','1500 m']){
  const base=week(event,'base')[1],support=week(event,'develop')[4];
  assert.deepEqual(support.prescription.repetitions,base.prescription.repetitions);
  const t=workoutTotals(support.prescription);assert.equal(t.mainDurationSeconds,event==='800 m'?1200:1500);assert.equal(t.recoverySeconds,event==='800 m'?180:240);
 }
 const c=week('1500 m','develop')[1],old=structuredClone(c);old.targetBases=['1500','800'];old.targetBasis='1500';
 assert.equal(courseReadiness(fresh(),old,'2026-11-10').canSchedule,false);
 assert.throws(()=>templateSpecification(c,{'1500':refs['1500'],'800':refs['800']}));
 assert.equal(old.targetBases[0],'1500','archived snapshots are not rewritten');
});
