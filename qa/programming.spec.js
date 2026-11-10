import {test,expect} from '@playwright/test';
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
test('source template requires only current reference; cancellation is pure; complete 200m session persists actual laps',async({page})=>{
  await page.clock.install();await page.goto('/#run');await click(page,'200m 专项耐受');
  if(await page.locator('.alternate-action').count())await page.locator('.alternate-action summary').click();await click(page,'开始记录');const form=page.locator('#template-reference');
  await expect(form.locator('[name=seconds]')).toHaveValue('');
  await expect(page.locator('#workout-calibrate')).toHaveCount(0);
  await form.locator('[name=seconds]').fill('130');await click(page,'取消');await click(page,'放弃修改');
  await expect(page.locator('.execution-line')).toContainText('配速待校准');
  if(await page.locator('.alternate-action').count())await page.locator('.alternate-action summary').click();await click(page,'开始记录');await form.locator('[name=seconds]').fill('130');await form.locator('[name=confirm]').check();await click(page,'使用课程编排');
  await expect(page.locator('.execution-line')).toContainText('10×200m｜800m 配速｜32.5秒/趟');
  await expect(page.locator('.course-block h3')).toHaveText(['热身','主训练','恢复说明','冷身']);
  if(await page.locator('.alternate-action').count())await page.locator('.alternate-action summary').click();await click(page,'开始记录');await click(page,'确认并热身');
  for(const box of await page.locator('[data-warmup]').all())await box.check();
  await page.clock.fastForward(600000);await click(page,'完成本阶段');
  for(let i=0;i<10;i++){
    await page.clock.fastForward(32500);await click(page,'完成本趟');
    if(i<9){await page.clock.fastForward(120000);await click(page,'恢复完成');}
  }
  await expect(page.getByRole('dialog')).toContainText('冷身');
  await page.clock.fastForward(600000);await click(page,'完成本阶段');await click(page,'保存分段记录');
  const run=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).runs.at(-1));
  expect(run.distance).toBe(2);expect(run.courseSession.spec.origin).toBe('editorial-candidate');
  expect(run.courseSession.logs.filter(l=>l.step.kind==='recovery')).toHaveLength(9);
  expect(run.courseSession.spec.review.reviewer).toBeNull();
});
