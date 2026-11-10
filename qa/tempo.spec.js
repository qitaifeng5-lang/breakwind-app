import {test,expect} from '@playwright/test';
import {fresh} from '../public/model.js';
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
test('Tempo is a complete authored timed session without a design questionnaire; saves unknown distance honestly',async({page})=>{
 await page.clock.install();await page.goto('/#run');await click(page,'按类型浏览');await click(page,'Tempo／阈值');await click(page,'分段 Tempo · 3×5分钟');
 await expect(page.locator('.execution-line')).toContainText('3×5分钟｜Tempo');await expect(page.locator('.rep-rest')).toContainText('慢跑 60 秒');
 await expect(page.locator('.course-block h3')).toHaveText(['热身','主训练','组间恢复','冷身']);
 await click(page,'开始记录');await expect(page.locator('#template-reference,#workout-calibrate')).toHaveCount(0);await expect(page.getByRole('dialog')).toContainText('37:00');
 await click(page,'确认并热身');for(const input of await page.locator('[data-warmup]').all())await input.check();
 await page.clock.fastForward(600000);await click(page,'完成本阶段');await click(page,'完成本趟');await expect(page.locator('#course-player-error')).toContainText('本段计时尚未完成');
 for(let i=0;i<3;i++){await page.clock.fastForward(300000);await click(page,'完成本趟');if(i<2){await page.clock.fastForward(60000);await click(page,'恢复完成');}}
 await page.clock.fastForward(600000);await click(page,'完成本阶段');await expect(page.getByRole('dialog')).toContainText('距离未测量');await expect(page.getByRole('dialog')).not.toContainText('NaN');await click(page,'保存分段记录');
 const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).runs.at(-1));expect(record.completedWorkSeconds).toBeGreaterThanOrEqual(900);expect(record.completedWorkSeconds).toBe(record.courseSession.logs.filter(l=>l.step.kind==='work'&&l.reason==='completed').reduce((n,l)=>n+l.actualSeconds,0));expect(record.distanceMeasured).toBe(false);expect(record.courseSession.logs).toHaveLength(7);
});
test('adult and youth week views expose actual content gaps and never claim a generated executable week',async({page})=>{
 await page.goto('/#run');await click(page,'周安排草案');await click(page,'调整阶段');await click(page,'基础期');
 await expect(page.locator('.week-purpose[role=status]')).toContainText('内容编排齐全');await expect(page.locator('.week-purpose[role=status]')).toContainText('尚待整周审核');
 await expect(page.locator('.week-outline')).toContainText('分段 Tempo');
 const data=fresh();data.cycleProfile={age:'未满18岁'};await page.evaluate(d=>localStorage.setItem('breakwind.local.v1',JSON.stringify(d)),data);await page.reload();await click(page,'周安排草案');await click(page,'调整阶段');await click(page,'基础期');
 await expect(page.locator('.week-purpose[role=status]')).toContainText('已编排 0 个训练位');await expect(page.locator('.week-purpose[role=status]')).toContainText('不是可直接执行');
});
