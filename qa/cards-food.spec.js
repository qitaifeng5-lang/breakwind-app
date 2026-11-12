import {test,expect} from '@playwright/test';
test.use({screenshot:'off',video:'off'});
const click=(p,name)=>p.getByRole('button',{name,exact:true}).click();
test('card surfaces open one existing detail, while expansion, selection and drag stay in the list',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('breakwind.pb-catalog',JSON.stringify({event:'800 m',pb:130,group:'competitive',phase:'develop'})));
 await page.goto('/#run');await click(page,'单节训练');const card=page.locator('.course-card').first();
 const name=await card.locator('h3 button').innerText();
 for(const selector of ['.course-cover','.course-reading-summary','h3 button']){
  await card.locator(selector).click();await expect(page.locator('#editor')).toContainText(name);await click(page,'返回');
 }
 await card.locator('summary').click();await expect(card.locator('details')).toHaveAttribute('open','');await expect(page.locator('#editor')).not.toBeVisible();
 await card.locator('summary').click();await expect(card.locator('details')).not.toHaveAttribute('open','');
 await card.locator('.course-cover').dispatchEvent('pointerdown',{pointerId:1,isPrimary:true,button:0,clientX:10,clientY:10});
 await card.locator('.course-cover').dispatchEvent('pointermove',{pointerId:1,isPrimary:true,clientX:10,clientY:90});
 await card.locator('.course-cover').dispatchEvent('click');await expect(page.locator('#editor')).not.toBeVisible();
 await card.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el.querySelector('h3'));getSelection().removeAllRanges();getSelection().addRange(r);});
 await card.locator('.course-cover').dispatchEvent('click');await expect(page.locator('#editor')).not.toBeVisible();
 await page.evaluate(()=>getSelection().removeAllRanges());await card.locator('h3 button').focus();await page.keyboard.press('Enter');await expect(page.locator('#editor')).toContainText(name);
});
test('Chinese food search, measured portion, meal edit/delete and immutable nutrition snapshots work',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');await page.getByRole('searchbox').fill('米饭');await page.getByRole('button',{name:/^白米饭（熟）/}).click();await click(page,'150 g');await click(page,'保存到午餐');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
 let s=await read();expect(s.food[0].kcal).toBe(195);expect(s.food[0].components[0].foodSnapshot.providerId).toBe('168878');
 await page.locator('[data-action^="meal-detail:"]').first().click();await click(page,'修改食物与份量');await click(page,'调整份量');await page.locator('#portion-form [name=grams]').fill('100');await click(page,'保存到午餐');
 s=await read();expect(s.food).toHaveLength(1);expect(s.food[0].kcal).toBe(130);expect(s.food[0].components[0].amount).toBe(100);
 await page.locator('[data-action^="meal-detail:"]').first().click();await click(page,'删除这顿记录');expect((await read()).food).toHaveLength(0);
 await click(page,'添加午餐');await page.getByRole('searchbox').fill('番茄炒蛋');await page.getByRole('button',{name:/^番茄炒蛋（可改配方估算）/}).click();await expect(page.locator('#editor')).toContainText('配方估算');
 await page.getByText('调整配方食材与成品重量',{exact:true}).click();await page.locator('[name=ingredient-2]').fill('4');await click(page,'保存到午餐');
 s=await read();expect(s.food[0].components[0].foodSnapshot.recipe.ingredients[2].amount).toBe(4);
});
