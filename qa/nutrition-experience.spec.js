import {test,expect} from '@playwright/test';
const click=(p,n)=>p.getByRole('button',{name:n,exact:true}).click();
const state=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
test('fullscreen search retains query and scroll, quick meal switching and unknown label entry work',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');await expect(page.locator('#modal-shell')).not.toHaveAttribute('open','');await expect(page.locator('#editor')).toHaveAttribute('data-variant','page');
 await page.getByRole('searchbox').fill('米饭');await page.locator('.food-pick').nth(3).scrollIntoViewIfNeeded();const pos=await page.locator('.dialog-body').evaluate(e=>e.scrollTop);
 await page.locator('.food-pick').nth(3).click();await click(page,'返回');await expect(page.getByRole('searchbox')).toHaveValue('米饭');expect(Math.abs(await page.locator('.dialog-body').evaluate(e=>e.scrollTop)-pos)).toBeLessThan(2);
 await page.locator('[data-action=food-meal-menu]').click();await click(page,'晚餐');await expect(page.locator('.meal-switch [aria-pressed=true]')).toHaveText('晚餐');await page.getByRole('searchbox').fill('未收录测试品牌燕麦饮');await expect(page.locator('.food-no-match')).toContainText('未收录');await click(page,'补录食品');
 await expect(page.locator('[name=name]')).toHaveValue('未收录测试品牌燕麦饮');await page.locator('[name=basisUnit]').selectOption('ml');await page.locator('[name=energyUnit]').selectOption('kJ');await page.locator('[name=portion]').fill('250');await page.locator('[name=kcal]').fill('418.4');await click(page,'保存并选用');await click(page,'保存到晚餐');
 const s=await state(page);expect(s.food).toHaveLength(1);expect(s.food[0].meal).toBe('晚餐');expect(s.food[0].kcal).toBeCloseTo(250);expect(s.food[0].protein).toBeNull();await expect(page.locator('.nutrition-summary')).toHaveAttribute('data-nutrients','false');await click(page,'添加午餐');await page.getByRole('searchbox').fill('未收录测试品牌燕麦饮');await expect(page.locator('.food-pick')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
test('copy yesterday and reuse a saved combination preserve values and do not duplicate copied records',async({page})=>{
 await page.goto('/#food');await page.evaluate(async()=>{const {fresh,dateKey,offset}=await import('/model.js');const s=fresh();s.food=[{id:'yesterday',date:offset(dateKey(),-1),meal:'午餐',name:'昨日米饭',timing:'日常',kcal:195,protein:4,carbs:42,fat:null,components:[{foodId:'fdc-168878',name:'白米饭（熟）',amount:150,unit:'g',grams:150,kcal:195,protein:4,carbs:42,fat:null,source:'测试历史快照'}]}];localStorage.setItem('breakwind.local.v1',JSON.stringify(s));});await page.reload();
 await click(page,'复制昨日');await click(page,'复制所选餐食');expect((await state(page)).food).toHaveLength(2);await click(page,'复制昨日');await click(page,'复制所选餐食');expect((await state(page)).food).toHaveLength(2);await click(page,'返回');
 await page.locator('[data-action^="meal-detail:"]').first().click();await click(page,'保存为常用组合');await click(page,'返回');await click(page,'常用组合');await page.locator('[data-action^="food-combo:"]').click();await click(page,'保存组合');const s=await state(page);expect(s.food).toHaveLength(3);expect(s.foodCombos).toHaveLength(1);expect(s.food.at(-1).fat).toBeNull();expect(s.food[0].date).not.toBe(s.food.at(-1).date);
});
test('keyboard-sized viewport keeps search and portion save usable without nested scroll clipping',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');const original=page.viewportSize();await page.setViewportSize({width:original.width,height:430});await page.getByRole('searchbox').fill('米饭');await page.getByRole('button',{name:/^白米饭（熟）/}).click();await page.locator('[name=grams]').fill('150');
 const save=page.getByRole('button',{name:'保存到午餐',exact:true});const box=await save.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(431);await save.click();expect((await state(page)).food[0].kcal).toBe(195);await page.setViewportSize(original);
});

test('portion controls show live nutrients without opening source disclosure',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');await page.getByRole('searchbox').fill('米饭');await page.getByRole('button',{name:/^白米饭（熟）/}).click();await expect(page.locator('#portion-energy')).toBeVisible();await expect(page.locator('#portion-energy')).toContainText('195');await click(page,'增加份量');await expect(page.locator('[name=grams]')).toHaveValue('175');await click(page,'减少份量');await expect(page.locator('[name=grams]')).toHaveValue('150');await expect(page.getByRole('button',{name:'150 g',exact:true})).toHaveAttribute('aria-pressed','true');await click(page,'保存到午餐');await expect(page.locator('.meal-entry-copy')).toContainText('150 g');
});

test('food information keeps quantity, favorites persist and a different meal can be chosen before save',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');await page.getByRole('searchbox').fill('米饭');await page.getByRole('button',{name:/^白米饭（熟）/}).click();await click(page,'增加份量');await click(page,'查看食物详情');await expect(page.getByRole('heading',{name:'食物详情',exact:true})).toBeVisible();await expect(page.locator('.food-base-nutrients')).toContainText('130');await click(page,'收藏食物');await expect(page.getByRole('button',{name:'已收藏',exact:true})).toHaveAttribute('aria-pressed','true');await click(page,'调整份量');await expect(page.locator('[name=grams]')).toHaveValue('175');await page.locator('[data-action="portion-meal:晚餐"]').click();await click(page,'保存到晚餐');expect((await state(page)).food[0].meal).toBe('晚餐');expect((await state(page)).food[0].kcal).toBeCloseTo(227.5);await click(page,'我的收藏');await expect(page.locator('.food-recent-rail')).toContainText('白米饭');
 expect(await page.locator('.food-photo').first().evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('food-photos.png');expect(await page.locator('svg path[d="undefined"]').count()).toBe(0);
});
