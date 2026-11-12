import {test,expect} from '@playwright/test';
test('private coach transcription preview cancel save reload and reschedule',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/#run');
  const original='热身：10分钟\n主训练：3×5分钟 Tempo\n趟间恢复：慢跑60秒\n冷身：10分钟';
  async function preview(){await page.getByRole('button',{name:'录入／粘贴课表',exact:true}).click();await page.locator('[name=name]').fill('合成测试课表');await page.locator('[name=original]').fill(original);await page.getByRole('button',{name:'预览',exact:true}).click();}
  await preview();await page.keyboard.press('Escape');await page.getByRole('button',{name:'放弃修改',exact:true}).click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')||'{"plans":[]}').plans.length)).toBe(0);
  await preview();await page.getByRole('tab',{name:'说明',exact:true}).click();await page.getByText('时间与安排（可选）',{exact:true}).click();await page.locator('[name=start]').fill('17:00');await page.locator('[name=estimatedMinutes]').fill('37');await page.getByRole('button',{name:'确认保存',exact:true}).click();
  await expect(page.getByRole('heading',{name:'我的课表',exact:true})).toBeVisible();await page.reload();await page.getByRole('button',{name:/合成测试课表/}).click();
  await expect(page.locator('#editor')).toContainText('3×5分钟 Tempo');
  await page.getByRole('button',{name:'改期／改时',exact:true}).click();await page.locator('[name=start]').fill('18:00');await page.getByRole('button',{name:'检查并保存',exact:true}).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  const plans=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans);expect(plans).toHaveLength(1);expect(plans[0].start).toBe('18:00');expect(plans[0].coachIssued.original).toBe(original);
});
test('fixed slot exception cancels this week only and historical reference never becomes current execution',async({page})=>{
  await page.goto('/#run');await page.getByRole('button',{name:'时间安排',exact:true}).click();
  const weekday=await page.evaluate(()=>new Date().getDay());await page.locator('[name=weekday]').selectOption(String(weekday));await page.locator('[name=start]').fill('17:00');await page.locator('[name=end]').fill('19:00');await page.getByRole('button',{name:'保存固定安排'}).click();
  await page.getByRole('button',{name:'时间安排',exact:true}).click();await page.getByText('本周例外',{exact:true}).click();await page.getByRole('button',{name:'取消本次',exact:true}).click();
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(saved.coachSchedule.rules).toHaveLength(1);expect(Object.values(saved.coachSchedule.exceptions)[0].cancelled).toBe(true);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'录入／粘贴课表',exact:true}).click();await page.locator('[name=name]').fill('历史测试');await page.locator('[name=source]').selectOption('historical');await page.locator('[name=original]').fill('主训练：历史参数待补');await page.getByRole('button',{name:'预览',exact:true}).click();await page.getByRole('button',{name:'确认保存',exact:true}).click();
  await expect(page.getByRole('heading',{name:'我的课表',exact:true})).toHaveCount(0);await page.getByText('历史参考（不执行）',{exact:true}).click();await page.getByRole('button',{name:'历史测试',exact:true}).click();await expect(page.locator('#editor')).toContainText('不作为当前执行方案');
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(saved.runs).toHaveLength(0);expect(saved.plans[0].executionStatus).toBe('reference-only');
});

test('time-only review warning is saved; true overlap is blocked and cancel leaves storage unchanged',async({page})=>{
 await page.goto('/#run');
 await page.evaluate(async()=>{
  const {fresh,dateKey,offset}=await import('/model.js'),{occupied}=await import('/coach-plan.js');const s=fresh(),today=dateKey();
  s.plans=[['A',offset(today,-2)],['B',today]].map(([id,date])=>occupied({id,date,name:'合成相邻课 '+id,start:'18:30',estimatedMinutes:60,quality:true,coachIssued:{original:'合成软件验收',blocks:{主训练:'参数待补'}},executionStatus:'planned'}));
  localStorage.setItem('breakwind.local.v1',JSON.stringify(s));
 });await page.reload();
 const open=async()=>{if(!await page.locator('#editor[open] .workout-detail').isVisible())await page.getByRole('button',{name:/合成相邻课 B/}).click();await page.getByRole('button',{name:'改期／改时',exact:true}).click();};
 await open();await page.locator('[name=start]').fill('20:00');await page.keyboard.press('Escape');await page.getByRole('button',{name:'放弃修改',exact:true}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans[1].start)).toBe('18:30');
 await open();await page.locator('[name=start]').fill('19:00');await page.getByRole('button',{name:'检查并保存',exact:true}).click();await expect(page.locator('#editor')).not.toBeVisible();
 let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(s.plans).toHaveLength(2);expect(s.plans[1].start).toBe('19:00');expect(s.plans[1].scheduleReview.loadReview).toHaveLength(1);
 await page.getByRole('button',{name:/合成相邻课 B/}).click();await page.getByRole('tab',{name:'说明',exact:true}).click();await page.getByText('日程复核 · 待核对',{exact:true}).click();await expect(page.locator('#editor')).toContainText('负荷待核对');await page.keyboard.press('Escape');
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('breakwind.local.v1'));s.events.push({id:'busy',name:'合成工作',date:s.plans[1].date,start:'20:00',end:'21:00'});localStorage.setItem('breakwind.local.v1',JSON.stringify(s));});await page.reload();await open();await page.locator('[name=start]').fill('20:00');await page.getByRole('button',{name:'检查并保存',exact:true}).click();await expect(page.locator('#editor')).toContainText('占用冲突');
 s=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(s.plans[1].start).toBe('19:00');expect(s.plans[1].scheduleAudit).toHaveLength(1);
});
