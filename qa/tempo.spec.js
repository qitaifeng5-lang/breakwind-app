import {test,expect} from '@playwright/test';
import {fresh} from '../public/model.js';
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
test('adult and youth week views expose actual content gaps and never claim a generated executable week',async({page})=>{
 await page.goto('/#run');await click(page,'周安排草案');await click(page,'调整阶段');await click(page,'基础期');
 await expect(page.locator('.week-purpose[role=status]')).toContainText('内容编排齐全');await expect(page.locator('.week-purpose[role=status]')).toContainText('尚待整周审核');
 await expect(page.locator('.week-outline')).toContainText('分段 Tempo');
 const data=fresh();data.cycleProfile={age:'未满18岁'};await page.evaluate(d=>localStorage.setItem('breakwind.local.v1',JSON.stringify(d)),data);await page.reload();await click(page,'周安排草案');await click(page,'调整阶段');await click(page,'基础期');
 await expect(page.locator('.week-purpose[role=status]')).toContainText('已编排 0 个训练位');await expect(page.locator('.week-purpose[role=status]')).toContainText('不是可直接执行');
});
