import {readFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {compileWorkout} from '../public/workout.js';
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
test('long program preview, local entitlement, arrange, adjust, expiry and retained data are real product flows',async({page})=>{
 test.setTimeout(90000);await page.goto('/#run');await click(page,'长期训练 · 体验');
 await page.locator('[name=event]').selectOption('1500 m');await click(page,'预览整个周期');
 await expect(page.locator('#editor .week-outline li')).toHaveCount(12);await click(page,'保存体验周期');await expect(page.locator('#editor')).toContainText('长期计划体验未生效');
 await click(page,'VIP 测试状态');await expect(page.locator('#editor')).toContainText('不收款');await click(page,'启用本地体验');await expect(page.locator('#editor')).toContainText('模拟有效期至');await page.getByText('模拟状态验收（不是购买）',{exact:true}).click();await click(page,'模拟取消续费');await expect(page.locator('#editor')).toContainText('模拟续费已关闭');await click(page,'返回周期预览');await click(page,'保存体验周期');
 let s=await read(page);expect(s.programs).toHaveLength(1);expect(s.programs[0].event).toBe('1500 m');expect(s.programs[0].cursor).toBe(0);
 await click(page,'安排这一周');s=await read(page);expect(s.plans.length).toBeGreaterThan(0);const n=s.plans.length;await click(page,'安排这一周');expect((await read(page)).plans).toHaveLength(n);
 await click(page,'调整未来一周');await click(page,'恢复不足／漏课：改为恢复周');const before=(await read(page)).programs[0].weeks[1];await page.keyboard.press('Escape');expect((await read(page)).programs[0].weeks[1]).toEqual(before);
 await click(page,'长期计划');await click(page,'调整未来一周');await click(page,'恢复不足／漏课：改为恢复周');await click(page,'确认调整');s=await read(page);expect(s.programs[0].weeks[1].phase).toBe('recover');expect(s.runs).toHaveLength(0);
 await click(page,'阶段复盘／推进');await click(page,'确认复盘并推进');expect((await read(page)).programs[0].cursor).toBe(1);
 await click(page,'返回周期');await click(page,'VIP 测试状态');await page.getByText('模拟状态验收（不是购买）',{exact:true}).click();await click(page,'模拟到期');await expect(page.locator('#editor')).toContainText('体验已到期');await page.keyboard.press('Escape');await page.reload();
 s=await read(page);expect(s.programs[0].cursor).toBe(1);expect(s.plans).toHaveLength(n);await click(page,'长期计划');const download=page.waitForEvent('download');await click(page,'导出本人周期');expect((await download).suggestedFilename()).toContain('breakwind-program');
 await click(page,'调整未来一周');await click(page,'恢复不足／漏课：改为恢复周');await click(page,'确认调整');await expect(page.locator('#editor')).toContainText('体验已到期');
});
test('starting a program session reuses its plan and expiry does not interrupt or prevent saving',async({page})=>{
 test.setTimeout(90000);await page.clock.install();await page.goto('/#run');
 await click(page,'长期训练 · 体验');await click(page,'预览整个周期');await click(page,'VIP 测试状态');await click(page,'启用本地体验');await click(page,'返回周期预览');await click(page,'保存体验周期');await click(page,'安排这一周');
 const before=await read(page),plan=before.plans[0],spec=plan.course.prescription;
 await page.locator('[data-action="program-course:0"]').click();await expect(page.locator('.workout-detail .phase-card')).toHaveCount(4);await click(page,'开始记录');await click(page,'确认并热身');expect((await read(page)).plans).toHaveLength(before.plans.length);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('breakwind.local.v1'));s.membershipTest.status='expired';localStorage.setItem('breakwind.local.v1',JSON.stringify(s));});
 await page.reload();await click(page,'继续分段训练');await click(page,'继续计时');
 for(const step of compileWorkout(spec)){
  for(const box of await page.locator('[data-warmup]').all())await box.check();await page.clock.fastForward(step.durationSeconds*1000);
  await click(page,step.kind==='work'?'完成本趟':step.kind==='recovery'?'恢复完成':'完成本阶段');
 }
 await click(page,'保存分段记录');const after=await read(page);expect(after.runs).toHaveLength(1);expect(after.plans).toHaveLength(before.plans.length);expect(after.plans.find(p=>p.id===plan.id).completed).toBe(true);expect(after.membershipTest.status).toBe('expired');
 await click(page,'长期计划');const exported=page.waitForEvent('download');await click(page,'导出本人周期');const payload=JSON.parse(await readFile(await (await exported).path(),'utf8'));expect(payload.runs.map(r=>r.id)).toEqual([after.runs[0].id]);
});
