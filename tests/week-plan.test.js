import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,offset} from '../public/model.js';
import {pbCourses,pbWeek} from '../public/pb-library.js';
import {groupWeek} from '../public/engine.js';
import {restoreSelection,calendarWeek,courseParameters,weekTotals} from '../public/week-plan.js';
import {courseReading} from '../public/workout-ui.js';

test('all authored week courses use catalog prescriptions, including both levels of rest',()=>{
 for(const event of ['800 m','1500 m'])for(const group of ['base','advanced','competitive'])for(const phase of ['base','develop','prepare','recover']){
  const catalog=pbCourses(event,130,{group});
  for(const c of pbWeek(event,130,{group,phase}).filter(c=>c.id!=='rest'&&!c.isPlanningSlot)){
   const source=catalog.find(x=>x.id===c.id);assert.ok(source,c.id);
   assert.deepEqual(courseParameters(c),courseParameters(source),event+'/'+group+'/'+phase+'/'+c.id);
   assert.deepEqual(courseReading(c),courseReading(source));
  }
 }
});
test('legacy competitive group and saved phase survive without PB-based promotion',()=>{
 const s=fresh();s.groupPlan={event:'800 m',group:'competitive',pb:130,start:'2026-11-09',phase:'prepare'};
 assert.deepEqual(restoreSelection(null,s),{event:'800 m',group:'competitive',pb:130,phase:'prepare',confirmed:true});
 const legacy=groupWeek(s,'2026-11-12',s.groupPlan),catalog=pbWeek('800 m',130,{group:'competitive',phase:'prepare'});
 assert.deepEqual(legacy.map(c=>c.courseId),catalog.map(c=>c.id));
 assert.equal(restoreSelection({group:'base',pb:90},s).group,'base');
 assert.equal(restoreSelection(null,fresh()).confirmed,false);
});
test('every weekday opens the same Monday week; fixed-day mapping preserves complete sequence',()=>{
 const s=fresh(),o={group:'competitive',phase:'develop'};
 for(let i=0;i<7;i++)assert.equal(calendarWeek(s,'800 m',130,o,offset('2026-11-09',i)).start,'2026-11-09');
 s.coachSchedule.rules=[{id:'club',kind:'training',weekday:3,start:'17:00',end:'19:00'}];
 const w=calendarWeek(s,'800 m',130,o,'2026-11-12');
 for(let i=0;i<7;i++)assert.deepEqual(courseParameters(w.rows[(i+w.shift)%7].course),courseParameters(w.template[i]));
 assert.equal(w.rows[2].slot.start,'17:00');assert.ok(w.rows.some(r=>r.held==='固定时段不足，暂不安排'));
 s.coachSchedule.exceptions={'club|2026-11-11':{date:'2026-11-11',cancelled:true}};
 assert.equal(calendarWeek(s,'800 m',130,o,'2026-11-12').rows[2].slot,undefined);
});
test('saved coach snapshots remain private and unchanged; unknown totals are never actuals',()=>{
 const s=fresh();s.plans=[{id:'private',date:'2026-11-10',name:'本人安排',coachIssued:{original:'趟间恢复：原文'},course:{sets:7,segments:[]}}];
 const before=JSON.stringify(s),w=calendarWeek(s,'1500 m',240,{group:'competitive'},'2026-11-12');
 assert.equal(w.rows[1].held,'已有课表优先');assert.equal(w.rows[1].plans[0].course.sets,7);assert.equal(JSON.stringify(s),before);
 const totals=weekTotals([{isPlanningSlot:true}]);assert.equal(totals.unknown,1);assert.equal(totals.actual,false);
});
