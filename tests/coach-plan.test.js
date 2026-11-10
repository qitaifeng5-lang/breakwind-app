import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCoachText,occupied,recurringFor,moveCoachPlan,scheduleWarnings} from '../public/coach-plan.js';
import {fresh,readData} from '../public/model.js';
test('synthetic transcription preserves all original text and does not infer missing prescriptions',()=>{
  const original='测试样例，不是教练原课表\n热身：10分钟\n主训练：2×(200+150)\n趟间恢复：步行2分钟\n组间恢复：待补\n冷身：10分钟';
  const result=parseCoachText(original);assert.equal(result.original,original);assert.equal(result.blocks.主训练,'2×(200+150)');assert.match(result.blocks.恢复,/步行2分钟/);assert.ok(result.unresolved.includes('目标节奏待核对'));
});
test('reschedule keeps issued snapshot and history, checks conflicts, creates no duplicate; recurrence is overridden',()=>{
  const s=fresh(),issued={original:'synthetic',blocks:{}};s.runs.push({id:'old',date:'2026-11-01',distance:4});
  s.coachSchedule.rules=[{id:'club',weekday:1,start:'17:00',end:'19:00',kind:'training',name:'club'}];
  s.plans.push(occupied({id:'p',date:'2026-11-09',start:'17:00',estimatedMinutes:60,preparationMinutes:10,bufferMinutes:5,coachIssued:issued,recurringKey:'club|2026-11-09',quality:false}));
  assert.equal(recurringFor(s,'2026-11-09').length,0);assert.equal(s.plans[0].end,'18:15');
  const history=JSON.stringify(s.runs);s.events.push({id:'work',date:'2026-11-10',name:'work',start:'17:00',end:'19:00'});
  assert.ok(moveCoachPlan(s,'p',{date:'2026-11-10'}).warnings.length);assert.equal(s.plans[0].date,'2026-11-09');
  assert.ok(moveCoachPlan(s,'p',{date:'2026-11-11'}).plan);assert.equal(s.plans.length,1);assert.deepEqual(s.plans[0].coachIssued,issued);assert.equal(JSON.stringify(s.runs),history);
  s.plans[0].cancelled=true;assert.equal(recurringFor(s,'2026-11-09').length,0);assert.deepEqual(readData(JSON.stringify(s)).coachSchedule,s.coachSchedule);
});
test('unknown duration is unresolved; moving quality work checks adjacent sessions',()=>{
  assert.equal(occupied({start:'17:00'}).end,'');const s=fresh();s.plans.push({id:'q',date:'2026-11-10',quality:true,name:'interval'});
  assert.ok(scheduleWarnings(s,{id:'new',date:'2026-11-11',start:'10:00',estimatedMinutes:60,quality:true}).some(w=>w.includes('相邻')));
});
test('one-off club cancellation and relocation replace recurrence without assuming intensity',()=>{
  const s=fresh();s.coachSchedule={rules:[{id:'club',weekday:1,start:'17:00',end:'19:00',kind:'training',name:'club'}],exceptions:{'club|2026-11-09':{date:'2026-11-10',start:'18:00',end:'20:00'}}};
  assert.equal(recurringFor(s,'2026-11-09').length,0);assert.equal(recurringFor(s,'2026-11-10').length,1);assert.equal(recurringFor(s,'2026-11-10')[0].quality,undefined);
  s.coachSchedule.exceptions['club|2026-11-09'].cancelled=true;assert.equal(recurringFor(s,'2026-11-10').length,0);assert.equal(recurringFor(s,'2026-11-16').length,1);
});
