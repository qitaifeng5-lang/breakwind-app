import {test,expect} from '@playwright/test';
test.use({screenshot:'off',video:'off'});
const click=(p,name)=>p.getByRole('button',{name,exact:true}).click();
test('real barcode, carton volume and favorites work offline without invented grams',async({page,context})=>{
 await page.goto('/#food');await click(page,'添加午餐');await page.getByRole('searchbox').fill('061954000041');
 await expect(page.locator('.food-pick')).toHaveCount(1);await expect(page.locator('.food-pick')).toContainText('United States');
 await page.locator('.food-results button[aria-label^="收藏 "]').click();
 await context.setOffline(true);await page.locator('.food-pick').click();await expect(page.getByLabel('食用容量（mL）')).toHaveValue('250');
 await page.getByRole('button',{name:/1 盒（250 ml）/}).click();await click(page,'保存到午餐');
 const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
 expect(record.food[0].grams).toBeNull();expect(record.food[0].components[0].unit).toBe('ml');expect(record.food[0].components[0].amount).toBe(250);
 expect(record.food[0].components[0].foodSnapshot.barcode).toBe('061954000041');expect(record.foodLibrary).toHaveLength(1);
 await click(page,'添加午餐');await click(page,'收藏');await expect(page.locator('.food-pick')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
test('private label input converts kJ and preserves unknown macros',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');await page.getByText('更多餐食选项',{exact:true}).click();await click(page,'自定义食物');
 await page.locator('#custom-food-form [name=name]').fill('测试私人标签');await page.locator('[name=basisUnit]').selectOption('ml');await page.locator('[name=energyUnit]').selectOption('kJ');await page.locator('[name=portion]').fill('250');await page.locator('[name=kcal]').fill('418.4');await click(page,'保存并选用');await click(page,'保存到午餐');
 const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).food[0]);expect(record.kcal).toBeCloseTo(250);expect(record.protein).toBeNull();expect(record.components[0].foodSnapshot.originalEnergyKJ).toBe(418.4);
});
