import {test,expect} from '@playwright/test';
import {pbWeek,pbCourses,contentGroups} from '../public/pb-library.js';
import {compileWorkout,templateSpecification} from '../public/workout.js';
const click=(p,n)=>p.getByRole('button',{name:n,exact:true}).click();
async function choose(page,event,group){
 await page.goto('/#run');await page.evaluate(()=>localStorage.clear());await page.reload();
 await click(page,'调整专项与PB');await click(page,event==='800 m'?'800m':'1500m');await click(page,contentGroups[group]+'组');await click(page,'查看课程');
}
async function finish(page,spec){
 await click(page,'开始记录');await expect(page.locator('#workout-calibrate')).toHaveCount(0);await click(page,'确认并热身');
 for(const step of compileWorkout(spec)){
  for(const box of await page.locator('[data-warmup]').all())await box.check();
  await page.clock.fastForward((step.durationSeconds||step.target?.targetSecondsRange?.[1]||0)*1000);
  await click(page,step.kind==='work'?'完成本趟':step.kind==='recovery'?'恢复完成':'完成本阶段');
 }
 await expect(page.getByRole('dialog')).toContainText('完整结束');await click(page,'保存分段记录');
 return page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).runs.at(-1));
}
for(const event of ['800 m','1500 m'])for(const group of ['base','advanced'])test(event+' '+group+' full week courses keep card, detail, clock and report identical',async({page})=>{
 test.setTimeout(90000);await page.clock.install();
 const week=pbWeek(event,130,{phase:'base',group});
 for(const c of [...new Map(week.filter(c=>c.id!=='rest').map(c=>[c.id,c])).values()]){
  await choose(page,event,group);const card=page.locator('[data-course-id="'+c.id+'"]');await expect(card).toContainText(c.main);
  await card.getByRole('button',{name:c.name,exact:true}).click();await expect(page.locator('.course-version').first()).toContainText(c.id);
  await expect(page.locator('.course-block h3')).toHaveText(['热身','主训练','组间恢复','冷身']);
  const record=await finish(page,c.prescription),saved=record.courseSession;
  expect(saved.course.event).toBe(event);expect(saved.course.selectedGroup).toBe(group);expect(saved.spec).toEqual(c.prescription);
  expect(saved.logs.map(l=>l.step)).toEqual(compileWorkout(c.prescription));expect(saved.logs.every(l=>l.reason==='completed')).toBe(true);
  expect(saved.status).toBe('complete');expect(record.distanceMeasured).toBe(false);expect(record.quality).toBe(c.quality);
 }
 await choose(page,event,group);await click(page,'周安排草案');await click(page,'调整阶段');await click(page,'基础期');
 await expect(page.locator('.week-purpose[role=status]')).toContainText('内容编排齐全');await expect(page.locator('.week-purpose[role=status]')).toContainText('不可一键执行');
 await expect(page.locator('.week-outline')).not.toContainText('待确认');
});
test('dual pace composition uses two achieved references, three intra-set rests and two between-set rests',async({page})=>{
 await page.clock.install();await choose(page,'1500 m','advanced');await click(page,'400 + 200 双节奏组合');await click(page,'开始记录');
 const form=page.locator('#template-reference');await form.locator('[name=secondsmile]').fill('300');await form.locator('[name=seconds800]').fill('130');await form.locator('[name=confirm]').check();await click(page,'使用课程编排');
 await expect(page.locator('.execution-line')).toHaveText(['1×400m｜英里配速｜74.56秒/趟','1×200m｜800m 配速｜32.5秒/趟']);
 const date=await form.count()?null:new Date().toISOString().slice(0,10),c=pbCourses('1500 m',null,{group:'advanced'}).find(c=>c.id==='combination-development');
 const spec=templateSpecification(c,{mile:{event:'1 mile',seconds:300,date,kind:'achieved'},'800':{event:'800 m',seconds:130,date,kind:'achieved'}});
 const record=await finish(page,spec);expect(record.distance).toBe(1.8);
 expect(record.courseSession.logs.filter(l=>l.step.kind==='recovery').map(l=>[l.step.betweenSets||false,l.step.durationSeconds])).toEqual([[false,60],[true,300],[false,60],[true,300],[false,60]]);
 expect(record.courseSession.spec.repetitions.map(r=>r.target.targetSecondsRange)).toEqual([[300*400/1609.344,300*400/1609.344],[32.5,32.5]]);
});

test('a scheduled historical course without build metadata opens with its original dose',async({page})=>{
 await choose(page,'800 m','base');await click(page,'分段 Tempo · 3×5分钟');await click(page,'加入日程');
 const before=await page.evaluate(()=>{
  const key='breakwind.local.v1',data=JSON.parse(localStorage.getItem(key)),plan=data.plans.at(-1);
  delete plan.course.build;plan.course.catalogRevision='historical-3x6';
  plan.course.executionSpec.repetitions[0].durationSeconds=360;plan.course.executionSpec.repetitions[0].repRecovery.durationSeconds=120;
  localStorage.setItem(key,JSON.stringify(data));return plan;
 });
 await page.reload();await click(page,'训练日程');await page.locator('[data-action="open-plan:'+before.id+'"]').click();
 await expect(page.locator('.course-version').first()).toContainText('legacy');
 await expect(page.locator('.execution-line')).toContainText('3×6分钟');
 await expect(page.locator('.rep-rest')).toContainText('120');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans.at(-1))).toEqual(before);
});
