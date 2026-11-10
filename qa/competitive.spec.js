import {test,expect} from '@playwright/test';
import {pbWeek,coursePhases} from '../public/pb-library.js';
import {templateSpecification,compileWorkout} from '../public/workout.js';
const click=(p,name)=>p.getByRole('button',{name,exact:true}).click();
for(const event of ['800 m','1500 m'])test(event+' competitive four phases and complete specific-session recording share one specification',async({page})=>{
 test.setTimeout(90000);await page.clock.install();await page.goto('/#run');
 await click(page,'调整专项与PB');await click(page,event==='800 m'?'800m':'1500m');await click(page,'竞技组');await click(page,'查看课程');await click(page,'周安排草案');
 for(const phase of ['base','prepare','recover','develop']){
  await click(page,'调整阶段');await click(page,coursePhases[phase]);
  await expect(page.locator('.week-purpose[role=status]')).toContainText('内容编排齐全');
  const rows=pbWeek(event,null,{group:'competitive',phase});await expect(page.locator('.week-outline strong')).toHaveText(rows.map(c=>c.name));
  await expect(page.locator('.week-outline')).not.toContainText('undefined');
 }
 const c=pbWeek(event,null,{group:'competitive',phase:'develop'})[1];await page.locator('.week-outline [data-action="pb-week:1"]').click();
 await expect(page.locator('.course-block h3')).toHaveText(['热身','主训练','恢复说明','冷身']);if(await page.locator('.alternate-action').count())await page.locator('.alternate-action summary').click();await click(page,'开始记录');
 const form=page.locator('#template-reference'),bases=c.targetBases||[c.targetBasis],refs={};
 for(const basis of bases){const suffix=bases.length>1?basis:'';await form.locator('[name=seconds'+suffix+']').fill(basis==='800'?'130':basis==='mile'?'300':'270');refs[basis]={event:basis==='mile'?'1 mile':basis+' m',seconds:basis==='800'?130:basis==='mile'?300:270,kind:'achieved',source:'用户确认当前同项成绩',date:await form.locator('[name=date'+suffix+']').inputValue()};}
 await form.locator('[name=confirm]').check();await click(page,'使用课程编排');
 const spec=templateSpecification(c,refs);await expect(page.locator('.course-block').first()).toContainText('动态');
 if(await page.locator('.alternate-action').count())await page.locator('.alternate-action summary').click();await click(page,'开始记录');await click(page,'确认并热身');
 for(const step of compileWorkout(spec)){
  for(const box of await page.locator('[data-warmup]').all())await box.check();
  await page.clock.fastForward((step.durationSeconds||step.target?.targetSecondsRange?.[1]||3)*1000);
  await click(page,step.kind==='work'?'完成本趟':step.kind==='recovery'?'恢复完成':'完成本阶段');
 }
 await expect(page.getByRole('dialog')).toContainText('完整结束');await click(page,'保存分段记录');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).runs.at(-1));
 expect(saved.courseSession.spec).toEqual(spec);expect(saved.courseSession.course.population).toBe('adult-competitive-balanced');
 expect(saved.courseSession.logs.map(l=>l.step)).toEqual(compileWorkout(spec));expect(saved.distance).toBe(1.8);
});
