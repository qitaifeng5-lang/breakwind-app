import {test,expect} from '@playwright/test';
import {fresh} from '../public/model.js';
test('reference home shows only explicit completion and dates open the real calendar',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-12T15:00:00Z'));
 const s=fresh();s.plans=[{id:'old',date:'2026-11-09',name:'旧标记',completed:true},{id:'reported',date:'2026-11-10',name:'本人记录',trainingOutcome:{status:'complete',source:'user-report'}},{id:'partial',date:'2026-11-11',name:'部分完成',trainingOutcome:{status:'partial',source:'user-report'}}];
 await page.addInitScript(s=>localStorage.setItem('breakwind.local.v1',JSON.stringify(s)),s);await page.goto('/#run');
 await expect(page.locator('.home-week-days .is-done')).toHaveCount(1);
 await expect(page.locator('.home-week-days .is-done')).toHaveAttribute('aria-label','2026-11-10 本人标记完成');
 await page.locator('[data-action="home-date:2026-11-11"]').click();await expect(page.getByRole('heading',{name:'训练与日程',exact:true})).toBeVisible();await expect(page.locator('main')).toContainText('部分完成');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans)).toEqual(s.plans);
});
test('food reference has no fabricated target and shortcuts reach real recent and favorite lists',async({page})=>{
 await page.goto('/#food');await expect(page.locator('.food-overview')).toHaveAttribute('data-nutrients','false');await expect(page.locator('.nutrition-ring strong')).toHaveText('—');await expect(page.locator('.macro')).toHaveCount(3);
 await page.getByRole('button',{name:'最近吃过',exact:true}).click();await expect(page.locator('.food-tabs [aria-pressed=true]')).toHaveText('最近吃过');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'我的收藏',exact:true}).click();await expect(page.locator('.food-tabs [aria-pressed=true]')).toHaveText('收藏');
 expect(await page.locator('svg path[d="undefined"]').count()).toBe(0);
});
