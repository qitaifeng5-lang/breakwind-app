import {test,expect} from '@playwright/test';
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
async function configure(page,combo=false) {
  await page.goto('/#run');
  await click(page,'按类型浏览');await click(page,'教学存档');
  await click(page,combo?'200 + 150 组合':'200m 节奏重复');
  await page.getByText('查看说明',{exact:true}).click();await click(page,'录入已有教练课表');
  const f=page.locator('#workout-calibrate');
  await f.locator('[name=basis0]').selectOption('800');
  await expect(f.locator('[name=ref0800]')).toHaveValue(''); // Browsing PB is never an achieved reference.
  await f.locator('[name=ref0800]').fill('130');
  await f.locator('[name=rep0Mode]').selectOption('walk');
  if(combo){
    await f.locator('[name=basis1]').selectOption('1500');
    await expect(f.locator('[name=ref11500]')).toHaveValue('');
    await f.locator('[name=ref11500]').fill('270');
    await f.locator('[name=setMode]').selectOption('stand');
  }
  await f.getByText('热身与冷身建议时间（可选）',{exact:true}).click();await f.locator('[name=warmup]').fill('10');await f.locator('[name=cooldown]').fill('5');
  await f.locator('[name=source]').fill('自动化验收样例，非训练建议');await f.locator('[name=confirm]').check();
  await click(page,'保存执行规格');
  await expect(page.locator('.executable-spec')).toContainText('32.5秒');
  await expect(page.locator('.compact-workout .course-block h3')).toHaveText(['热身','主训练','恢复说明','冷身']);
  await expect(page.locator('.execution-line').first()).toContainText('200m｜800m 配速｜32.5秒/趟');
  await expect(page.locator('.course-original')).not.toHaveAttribute('open','');
  await expect(page.getByRole('button',{name:'录入已有教练课表',exact:true})).not.toBeVisible();
  await expect(page.getByText('查看说明',{exact:true})).toBeVisible();
}
test('200m execution: recovery timer, interrupted reload, immutable targets and idempotent save',async({page})=>{
  await page.clock.install();await configure(page);
  await click(page,'加入日程');await click(page,'200m 节奏重复');if(await page.locator('.alternate-action').count())await page.locator('.alternate-action summary').click();await click(page,'开始记录');await click(page,'确认并热身');
  for(const input of await page.locator('[data-warmup]').all())await input.check();
  await page.clock.fastForward(600000);await click(page,'完成本阶段');
  await expect(page.getByRole('dialog')).toContainText('32.5 秒');
  await page.clock.fastForward(32500);await click(page,'完成本趟');await click(page,'恢复完成');
  await expect(page.locator('#course-player-error')).toContainText('恢复时间尚未到');
  await page.reload();await click(page,'继续分段训练');
  await expect(page.getByRole('dialog')).toContainText('已暂停');
  await click(page,'继续计时');await page.clock.fastForward(180000);await click(page,'恢复完成');
  for(let i=1;i<4;i++){
    await page.clock.fastForward(32500);await click(page,'完成本趟');
    if(i<3){await page.clock.fastForward(180000);await click(page,'恢复完成');}
  }
  await expect(page.getByRole('dialog')).toContainText('冷身');
  await page.clock.fastForward(300000);await click(page,'完成本阶段');await click(page,'保存分段记录');
  const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
  expect(result.runs).toHaveLength(1);expect(result.runs[0].distance).toBe(.8);expect(result.runs[0].courseSession.logs).toHaveLength(9);
  expect(result.plans[0].completed).toBe(true);
  // A stale draft left by a storage interruption must not create another run.
  await page.evaluate(s=>localStorage.setItem('breakwind.course-session.v1',JSON.stringify(s)),result.runs[0].courseSession);
  await page.reload();await click(page,'继续分段训练');await click(page,'保存分段记录');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).runs.length)).toBe(1);
});
test('combination targets use independent references; pain stops and preserves partial record',async({page})=>{
  await configure(page,true);
  await expect(page.locator('.executable-spec')).toContainText('27秒');
  await page.getByText('查看说明',{exact:true}).click();
  await expect(page.locator('.execution-notes')).toContainText('700m');
  await page.getByText('查看说明',{exact:true}).click();
  if(await page.locator('.alternate-action').count())await page.locator('.alternate-action summary').click();await click(page,'开始记录');await click(page,'确认并热身');
  await page.getByText('提醒与提前结束',{exact:true}).click();await click(page,'疼痛／不适，立即停止');
  await click(page,'保存分段记录');await click(page,'200 + 150 组合');
  await expect(page.getByRole('dialog').getByRole('button',{name:'开始记录',exact:true})).toHaveCount(0);
  const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
  expect(result.trainingHold).toBe(true);expect(result.runs[0].distance).toBe(0);expect(result.runs[0].pain).toBe(true);
});
test('combination executes both sets and only one set recovery, preserving the scheduled specification',async({page})=>{
  await page.clock.install();await configure(page,true);await click(page,'加入日程');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans[0]);
  await click(page,'调整专项与PB');await click(page,'2:00');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans[0])).toEqual(before);
  await click(page,'训练日程');
  await page.locator('[data-action="open-plan:'+before.id+'"]').click();
  if(await page.locator('.alternate-action').count())await page.locator('.alternate-action summary').click();await click(page,'开始记录');await click(page,'确认并热身');
  for(const input of await page.locator('[data-warmup]').all())await input.check();
  await page.clock.fastForward(600000);await click(page,'完成本阶段');
  for(let set=0;set<2;set++){
    await expect(page.getByRole('dialog')).toContainText('32.5 秒');
    await page.clock.fastForward(32500);await click(page,'完成本趟');
    await page.clock.fastForward(180000);await click(page,'恢复完成');
    await expect(page.getByRole('dialog')).toContainText('27 秒');
    await page.clock.fastForward(27000);await click(page,'完成本趟');
    if(!set){await expect(page.getByRole('dialog')).toContainText('组间恢复');await page.clock.fastForward(360000);await click(page,'恢复完成');}
  }
  await expect(page.getByRole('dialog')).toContainText('冷身');await page.clock.fastForward(300000);
  await click(page,'完成本阶段');await click(page,'保存分段记录');
  const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
  expect(result.runs[0].distance).toBe(.7);
  expect(result.runs[0].courseSession.logs.filter(l=>l.step.betweenSets)).toHaveLength(1);
  expect(result.runs[0].courseSession.spec).toEqual(before.course.executionSpec);
});


test('editing pace references keeps existing preparation distances and descriptions',async({page})=>{
 await configure(page);await click(page,'加入日程');
 await page.evaluate(()=>{const key='breakwind.local.v1',s=JSON.parse(localStorage.getItem(key));s.plans[0].course.executionSpec.warmup=[{distanceM:2000,label:'慢跑、动态活动、跑姿准备'}];s.plans[0].course.executionSpec.cooldown=[{distanceM:1000,label:'轻松慢跑、放松整理'}];localStorage.setItem(key,JSON.stringify(s));});
 await page.goto('/#home');await page.reload();await click(page,'课次详情');await expect(page.locator('.course-block').first()).toContainText('2000m');await page.getByText('查看说明',{exact:true}).click();await click(page,'录入已有教练课表');
 await page.locator('#workout-calibrate [name=confirm]').check();await click(page,'保存执行规格');
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(s.plans[0].course.executionSpec.warmup).toEqual([{distanceM:2000,label:'慢跑、动态活动、跑姿准备'}]);expect(s.plans[0].course.executionSpec.cooldown).toEqual([{distanceM:1000,label:'轻松慢跑、放松整理'}]);
});
