import test from 'node:test';
import assert from 'node:assert/strict';
import {pbCourses,pbWeek,courseMetadata,courseCoverage} from '../public/pb-library.js';
import {buildProgram,previewProgramWeek,exportProgram,proposeProgramChange,confirmProgramChange} from '../public/program.js';
import {courseParameters,mapWeekCourses} from '../public/week-plan.js';
import {courseReading} from '../public/workout-ui.js';
import {fresh} from '../public/model.js';
import {applyTestTransaction} from '../public/membership.js';

test('single, free week and every 8/12/16-week session retain the same content and semantic identity',()=>{
 for(const event of ['800 m','1500 m'])for(const group of ['base','advanced','competitive']){
  const catalog=pbCourses(event,130,{group});
  const weeks=['base','develop','prepare','recover'].map(phase=>pbWeek(event,130,{group,phase}));
  if(group==='competitive')for(const length of [8,12,16])weeks.push(...buildProgram({event,pb:130,length,startDate:'2026-12-07'}).weeks.map(w=>w.courses));
  for(const week of weeks)for(const c of week.filter(c=>c.id!=='rest'&&!c.isPlanningSlot)){
   const original=catalog.find(x=>x.id===c.id);assert.ok(original,c.id);
   assert.deepEqual(courseParameters(c),courseParameters(original));
   assert.deepEqual(courseReading(c),courseReading(original));
   assert.deepEqual(c.contentContract,original.contentContract);
   assert.equal(c.contentContract.courseRevision,c.catalogRevision);
   if(c.prescription)assert.equal(c.prescription.catalogRevision,c.catalogRevision);
  }
 }
});
test('calendar/export preserve true categories and per-course revisions, never turn Tempo into interval semantics',()=>{
 const data=fresh(),p=buildProgram({event:'1500 m',startDate:'2026-12-07',length:8});p.programId='synthetic';p.status='active';
 data.programs=[p];const before=JSON.stringify(p);
 const result=previewProgramWeek(data,p,3,{today:'2026-12-07'});
 assert.ok(result.added.some(x=>x.categoryId==='tempo'));
 assert.ok(result.added.some(x=>x.categoryId==='combination'));
 for(const plan of result.added){assert.deepEqual(plan.courseRef,courseMetadata(plan.course).courseRef);assert.equal(plan.courseRevision,plan.course.catalogRevision);assert.ok(plan.stimulus);}
 data.plans.push(...result.added);const payload=exportProgram(data,p.programId);
 assert.equal(JSON.stringify(p),before);assert.deepEqual(payload.plans,data.plans);
 assert.equal(payload.plans.find(x=>x.categoryId==='tempo').stimulus,'受控持续有氧');
});
test('free and long-term scheduling share fixed-day mapping without changing the session sequence',()=>{
 const data=fresh(),p=buildProgram({event:'800 m',startDate:'2026-12-07'});p.programId='mapped';
 data.coachSchedule.rules=[1,3,5].map(weekday=>({id:'slot'+weekday,weekday,kind:'training',start:'18:00',end:'20:00'}));
 const mapped=mapWeekCourses(data,p.weeks[1].courses,p.weeks[1].start);
 const result=previewProgramWeek(data,p,1,{today:'2026-12-07'});
 for(const plan of result.added)assert.equal(mapped.rows.find(r=>r.date===plan.date).course.id,plan.courseId);
 assert.ok(result.held.some(h=>h.reason.includes('固定时段')));
 assert.deepEqual(p.weeks[1].courses,buildProgram({event:'800 m',startDate:'2026-12-07'}).weeks[1].courses);
});
test('both rest layers exclude last repetitions; pace browsing changes no volume or rest',()=>{
 for(const event of ['800 m','1500 m']){
  const slow=pbCourses(event,180,{group:'competitive'}),fast=pbCourses(event,110,{group:'competitive'});
  for(const c of slow){const other=fast.find(x=>x.id===c.id);assert.deepEqual(c.loadSummary,other.loadSummary);assert.deepEqual(c.segments,other.segments);assert.equal(c.setRecovery,other.setRecovery);}
  const combo=slow.find(c=>c.id==='combination-development');
  assert.equal(combo.loadSummary.mainDistanceM,1800);assert.equal(combo.loadSummary.repRecoveries,3);assert.equal(combo.loadSummary.setRecoveries,2);assert.equal(combo.loadSummary.recoverySeconds,780);
  assert.equal(combo.contentContract.durationBoundary.includes('未知'),true);
 }
});
test('explicit partial completion protects a future snapshot from a program replacement',()=>{
 const data=fresh(),p=buildProgram({event:'800 m',startDate:'2026-12-07'});p.programId='history';p.status='active';data.programs=[p];
 const now=Date.parse('2026-11-12T12:00:00Z');data.membershipTest=applyTestTransaction(null,{id:'test',mode:'experience',sequence:1,type:'success',expiresAt:now+86400000});
 data.plans=[{id:'reported',programId:p.programId,programWeek:1,date:'2026-12-14',trainingOutcome:{status:'partial'},course:structuredClone(p.weeks[1].courses[0])}];
 const before=JSON.stringify(data.plans),proposal=proposeProgramChange(data,p.programId,{kind:'recover',today:'2026-11-12'});
 assert.throws(()=>confirmProgramChange(data,proposal,{mode:'experience',now}),/历史结构/);assert.equal(JSON.stringify(data.plans),before);
});
test('coverage does not pretend youth frameworks and unfinished groups are complete',()=>{
 assert.ok(courseCoverage({youth:true}).filter(c=>c.group==='competitive').every(c=>!c.week.complete));
 assert.ok(courseCoverage().filter(c=>c.group==='competitive').every(c=>c.week.complete));
 assert.ok(courseCoverage().filter(c=>c.group==='base'&&c.phase==='prepare').every(c=>!c.week.complete));
});
