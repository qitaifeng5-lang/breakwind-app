import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,offset} from '../public/model.js';
import {pbCourses,pbWeek,courseContentComplete} from '../public/pb-library.js';
import {buildProgram,saveProgram,previewProgramWeek,proposeProgramChange,confirmProgramChange} from '../public/program.js';
import {courseReadiness} from '../public/engine.js';
import {targetFor,recentPerformance} from '../public/workout.js';
import {trainingContext,assessWeekLoad} from '../public/training-policy.js';
import {recordCompletion} from '../public/completion.js';
import {applyTestTransaction} from '../public/membership.js';
import {courseParameters,mapWeekCourses} from '../public/week-plan.js';
const today='2026-11-18';
test('3000m, 5000m and cross-country have complete, distinct phase weeks',()=>{
 for(const event of ['3000 m','5000 m','越野跑'])for(const group of ['base','advanced','competitive'])for(const phase of ['base','develop','prepare','recover']){
  const week=pbWeek(event,900,{group,phase});
  assert.equal(week.length,7);
  assert.ok(week.filter(c=>c.id!=='rest').every(courseContentComplete),event+' '+group+' '+phase);
  assert.ok(week.filter(c=>c.quality).length<=2);
  if(phase==='recover')assert.equal(week.filter(c=>c.quality).length,0);
 }
 const a=pbCourses('3000 m',600,{group:'competitive'}).find(c=>c.id==='interval');
 const b=pbCourses('5000 m',1100,{group:'competitive'}).find(c=>c.id==='interval');
 assert.notDeepEqual(a.segments,b.segments);
});
test('achieved 3km and 5km references calibrate only the matching event',()=>{
 const ref={event:'5000 m',seconds:1200,date:today,kind:'achieved'};
 assert.equal(targetFor(1000,'5000',ref)?.targetSecondsRange[0],240);
 assert.equal(targetFor(600,'3000',ref),null);
 assert.equal(recentPerformance([{...ref,kind:'goal'}],'5000',today),null);
});
test('completed quality sessions still protect the adjacent days',()=>{
 const s=fresh();s.plans=[{id:'done',date:offset(today,-1),quality:true,completed:true,trainingOutcome:{status:'complete'}}];
 assert.equal(courseReadiness(s,{quality:true},today,today).status,'spacing');
});
test('a race date produces preparation and recovery without a synthetic race completion',()=>{
 const raceDate=offset(today,32),p=buildProgram({event:'1500 m',startDate:today,asOf:today,length:8,raceDate});
 assert.equal(p.raceDate,raceDate);
 assert.ok(p.weeks.some(w=>w.phase==='prepare'));
 assert.ok(p.weeks.filter(w=>w.start>raceDate).every(w=>w.phase==='recover'));
 assert.ok(p.weeks.flatMap(w=>w.courses).every(c=>!c.completed));
});

test('junior and senior programs cover all five specialties, groups and lengths with complete age-specific content',()=>{
 for(const event of ['800 m','1500 m','3000 m','5000 m','越野跑'])for(const schoolStage of ['junior','senior'])for(const cohort of ['base','advanced','competitive'])for(const length of [8,12,16]){
  const p=buildProgram({event,cohort,length,youth:true,schoolStage,startDate:today,asOf:today});
  assert.equal(p.population,'youth-'+schoolStage);
  const catalog=pbCourses(event,null,{group:cohort,youth:true,schoolStage});
  for(const w of p.weeks){
   const active=w.courses.filter(c=>c.id!=='rest');
   assert.ok(active.length<=4&&w.courses.filter(c=>c.quality).length<=1);
   for(const c of active){
    assert.ok(courseContentComplete(c)&&c.adapted&&c.youth&&!c.name.includes('走跑'));
    assert.equal(c.selectedGroup,cohort);assert.equal(c.review.reviewer,null);
    assert.deepEqual(courseParameters(c),courseParameters(catalog.find(r=>r.id===c.id)));
    assert.ok(c.prescription.warmup.every(s=>!s.durationSeconds));
    assert.ok(c.prescription.cooldown.every(s=>!s.durationSeconds));
   }
  }
 }
 const options={event:'1500 m',cohort:'competitive',youth:true,startDate:today,asOf:today};
 const junior=buildProgram({...options,schoolStage:'junior'}),senior=buildProgram({...options,schoolStage:'senior'});
 assert.notDeepEqual(junior.weeks[1].courses[1].segments,senior.weeks[1].courses[1].segments);
});

test('known frequency personalizes by retaining whole sessions; no logs and faster PB do not downgrade or increase dose',()=>{
 const s=fresh();s.cycleProfile={weeklyDays:3,recentKm:24,recentLongest:9,baselineDate:today};
 const p=buildProgram({event:'800 m',data:s,startDate:today,asOf:today});
 assert.equal(p.cohort,'competitive');
 assert.ok(p.weeks.every(w=>w.courses.filter(c=>c.id!=='rest').length<=3&&w.courses.filter(c=>c.quality).length<=1));
 assert.ok(p.weeks[0].individualAdjustments.length>0);
 const missing=buildProgram({event:'800 m',data:fresh(),pb:110,startDate:today,asOf:today});
 assert.equal(missing.weeks[0].loadReview.status,'baseline-unknown');
 assert.equal(missing.weeks[0].courses.filter(c=>c.id!=='rest').length,6);
 const slower=buildProgram({event:'800 m',data:fresh(),pb:180,startDate:today,asOf:today});
 assert.deepEqual(missing.weeks.map(w=>w.courses.map(c=>c.segments)),slower.weeks.map(w=>w.courses.map(c=>c.segments)));
});

test('partial logs, unmeasured distances and completion flags cannot manufacture a training capacity',()=>{
 const s=fresh();s.runs=[{date:today,distance:5,minutes:30,effort:3}];
 assert.equal(trainingContext(s,today).weeklyKm,null);
 s.plans=[{id:'p',date:today,completed:true,distance:30,minutes:180}];
 assert.equal(trainingContext(s,today).observedKm,5);
 s.cycleProfile={logsCompleteSince:offset(today,-28),logsCompleteThrough:today};
 assert.equal(trainingContext(s,offset(today,1)).weeklyDays,null,'an old completeness confirmation cannot cover new days');
 s.runs[0].distanceMeasured=false;assert.equal(trainingContext(s,today).weeklyKm,null);
 s.cycleProfile={recentKm:1,weeklyDays:5,recentLongest:1,baselineDate:today};
 assert.equal(assessWeekLoad(s,pbWeek('5000 m',1200,{group:'competitive'}),today).canArrange,false);
});

test('fatigue feedback persists, drives a previewed recovery change, and never rewrites old snapshots',()=>{
 const s=fresh(),now=Date.parse(today+'T12:00:00Z');
 s.membershipTest=applyTestTransaction(null,{id:'test',mode:'experience',sequence:1,type:'success',expiresAt:now+30*86400000});
 const p=saveProgram(s,buildProgram({event:'1500 m',youth:true,schoolStage:'senior',startDate:today,asOf:today}),{mode:'experience',now,id:'p'});
 s.plans=[{id:'session',programId:'p',programWeek:0,date:today,course:structuredClone(p.weeks[0].courses[1])}];
 const original=JSON.stringify(s.plans[0].course);
 recordCompletion(s,'session',{status:'partial',actualMinutes:25,effort:8,fatigue:5},today,now);
 const restored=JSON.parse(JSON.stringify(s));
 const proposal=proposeProgramChange(restored,'p',{today});
 assert.equal(proposal.kind,'recover');assert.equal(proposal.evidence.feedback.userReportedMinutes,25);
 assert.equal(proposal.evidence.actualRuns,0);assert.ok(proposal.courses.every(c=>!c.quality));
 confirmProgramChange(restored,proposal,{mode:'experience',now});
 assert.equal(JSON.stringify(restored.plans[0].course),original);
 assert.ok(restored.programs[0].weeks[1].courses.every(c=>c.population==='youth-senior'));
 recordCompletion(s,'session',{status:'partial',pain:true},today,now);
 assert.equal(previewProgramWeek(s,p,1,{today,timezone:p.timezone}).added.length,0);
 assert.throws(()=>recordCompletion(s,'session',{status:'missed',actualMinutes:30},today));
});

test('every race weekday preserves stimulus spacing, reserves race day, locks fixed-slot rotation and protects taper from hold',()=>{
 for(let days=28;days<35;days++){
  const s=fresh(),raceDate=offset(today,days),p=buildProgram({event:'800 m',startDate:today,asOf:today,raceDate});
  const all=p.weeks.flatMap(w=>w.courses.map((c,i)=>({...c,date:offset(w.start,i)}))),quality=all.filter(c=>c.quality);
  assert.ok(quality.every((c,i)=>!i||Date.parse(c.date)-Date.parse(quality[i-1].date)>=3*86400000));
  assert.equal(all.find(c=>c.date===raceDate).raceReservation,true);
  assert.ok(all.filter(c=>c.date>raceDate).every(c=>!c.quality));
  const index=p.weeks.findIndex(w=>w.phase==='prepare');
  s.coachSchedule.rules=[{id:'slot',kind:'training',weekday:5,start:'17:00',end:'19:00'}];
  assert.equal(mapWeekCourses(s,p.weeks[index].courses,p.weeks[index].start).shift,0);
  p.programId='p';p.cursor=index-1;s.programs=[p];
  const proposal=proposeProgramChange(s,'p',{kind:'hold',today});
  assert.equal(proposal.phase,'prepare');assert.deepEqual(proposal.courses.map(c=>c.id),p.weeks[index].courses.map(c=>c.id));
 }
});

test('youth can arrange their own authored plan, but known age cannot be bypassed to select adult training',()=>{
 const s=fresh();s.cycleProfile={age:'未满18岁',schoolStage:'senior'};
 assert.throws(()=>buildProgram({event:'800 m',data:s,youth:false,startDate:today,asOf:today}));
 const p={...buildProgram({event:'800 m',data:s,startDate:today,asOf:today}),programId:'p',status:'active'};
 assert.ok(previewProgramWeek(s,p,0,{today,timezone:p.timezone}).added.length>0);
 s.trainingHold=true;assert.equal(previewProgramWeek(s,p,0,{today,timezone:p.timezone}).added.length,0);
});

test('work and school appointments are not quality workouts; another event race date is not borrowed',()=>{
 const s=fresh();s.events=[{date:today,type:'学习',name:'上课'}];
 assert.equal(courseReadiness(s,{quality:true},today).canSchedule,true);
 s.events.push({date:today,type:'比赛'});assert.equal(courseReadiness(s,{quality:true},today).status,'spacing');
 s.goals={race:'5 km',raceDate:offset(today,30)};
 assert.equal(buildProgram({event:'800 m',data:s,startDate:today,asOf:today}).raceDate,null);
 assert.equal(buildProgram({event:'5000 m',data:s,startDate:today,asOf:today}).raceDate,s.goals.raceDate);
 assert.equal(buildProgram({event:'5000 m',data:s,startDate:today,asOf:today,raceDate:null}).raceDate,null);
});
