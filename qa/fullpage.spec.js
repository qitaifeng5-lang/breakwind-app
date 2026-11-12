import {test,expect} from '@playwright/test';
const click=(p,n)=>p.getByRole('button',{name:n,exact:true}).click();
test('full-page coach review is reading-first, drafts survive restart, discard does not save',async({page})=>{
 await page.goto('/#run');await click(page,'录入／粘贴课表');
 await page.locator('[name=name]').fill('Tempo 衔接');await page.locator('[name=original]').fill('热身：慢跑2km＋动态活动\n主训练：3×5分钟 Tempo\n趟间恢复：慢跑60秒\n冷身：轻松慢跑，放松整理');await click(page,'预览');
 await expect(page.locator('#editor')).toHaveAttribute('data-variant','page');
 await expect(page.locator('[name=主训练]')).not.toBeVisible();
 await page.getByText('编辑主训练',{exact:true}).click();await page.locator('[name=主训练]').fill('3×5分钟 Tempo，按现有校准');
 await click(page,'返回');await click(page,'保存草稿并返回');await page.reload();await click(page,'录入／粘贴课表');
 await page.getByText('编辑主训练',{exact:true}).click();await expect(page.locator('[name=主训练]')).toHaveValue('3×5分钟 Tempo，按现有校准');
 await page.locator('[name=主训练]').fill('未保存的修改');await click(page,'返回');await click(page,'放弃修改');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')||'{"plans":[]}').plans)).toHaveLength(0);
 await click(page,'录入／粘贴课表');await expect(page.locator('[name=name]')).toHaveValue('');
});
test('long review and enlarged text keep last section and bottom action reachable in a reduced viewport',async({page})=>{
 await page.goto('/#run');await click(page,'录入／粘贴课表');await page.locator('[name=name]').fill('800m 节奏训练');await page.locator('[name=original]').fill('热身：轻松慢跑、动态准备\n主训练：'+ '按既有教练安排核对每趟目标。'.repeat(35)+'\n恢复：步行恢复，时间待补\n冷身：轻松慢跑、放松整理');await click(page,'预览');
 await page.addStyleTag({content:'html{font-size:24px}'});await page.setViewportSize({width:390,height:430});
 await page.getByText('编辑冷身',{exact:true}).click();await page.locator('[name=冷身]').fill('放松整理，由本人结束');
 const action=page.getByRole('button',{name:'确认保存',exact:true});await expect(action).toBeVisible();const b=await action.boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(430);expect(b.y).toBeGreaterThan(0);
 await page.locator('[name=冷身]').scrollIntoViewIfNeeded();const field=await page.locator('[name=冷身]').boundingBox();expect(field.y).toBeLessThan(b.y);expect(await page.locator('#editor').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await click(page,'确认保存');const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(s.plans[0].coachIssued.blocks.冷身).toBe('放松整理，由本人结束');
});
