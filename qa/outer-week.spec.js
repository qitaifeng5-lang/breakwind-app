import {test,expect} from '@playwright/test';
import {fresh} from '../public/model.js';
const click=(p,n)=>p.getByRole('button',{name:n,exact:true}).click();
test('legacy competitive preference, calendar dates and shared rest structure survive every entry',async({page},info)=>{
 await page.clock.setFixedTime(new Date('2026-11-12T15:00:00Z'));
 const s=fresh();s.groupPlan={event:'800 m',group:'competitive',pb:130,start:'2026-11-09',phase:'develop'};
 await page.addInitScript(s=>localStorage.setItem('breakwind.local.v1',JSON.stringify(s)),s);
 await page.goto('/#run');await expect(page.locator('.course-profile')).toContainText('竞技组');
 await click(page,'本周计划');const row=page.locator('.outer-week>li[data-course-id="endurance"]');
 const rows=page.locator('.outer-week>li');await expect(rows.first()).toHaveAttribute('data-date','2026-11-09');await expect(rows.last()).toHaveAttribute('data-date','2026-11-15');
 const chosen=(await row.count())?row:rows.filter({has:page.locator('.course-reading-summary')}).first();
 const id=await chosen.getAttribute('data-course-id'),summary=await chosen.locator('.course-reading-summary').innerText();
 await chosen.locator('h3 button').click();const main=await page.locator('.phase-work').innerText();for(const text of summary.split('\n').filter(x=>x&&!x.startsWith('大组休息')))expect(main.replaceAll(' ','')).toContain(text.replaceAll(' ',''));
 await click(page,'返回');await click(page,'单节训练');const card=page.locator('.course-card[data-course-id="'+id+'"]');expect((await card.locator('.course-reading-summary').innerText()).replace(/\s/g,'')).toBe(summary.replace(/\s/g,''));
 await card.locator('h3 button').click();expect(await page.locator('.phase-work').innerText()).toBe(main);await click(page,'返回');
 await click(page,'本周计划');await click(page,'下一周');await expect(rows.first()).toHaveAttribute('data-date','2026-11-16');await click(page,'上一周');await expect(rows.first()).toHaveAttribute('data-date','2026-11-09');
 await page.screenshot({path:info.outputPath('week.png')});await page.reload();await expect(page.locator('.course-profile')).toContainText('竞技组');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
