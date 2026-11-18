import {test,expect} from '@playwright/test';

const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')||'{"food":[]}'));
const openRice=async page=>{
 await click(page,'添加午餐');
 await page.getByRole('searchbox').fill('米饭');
 await page.locator('[data-action="food-pick:fdc-168878"]').click();
};
const editCurrentRice=async page=>{
 await page.locator('.meal-entry').first().click();
 await click(page,'修改食物与份量');
 await click(page,'调整份量');
};

test('half a rice bowl saves without weighing and retains its unit after reload',async({page})=>{
 await page.goto('/#food');await openRice(page);
 await expect(page.getByLabel('食用数量')).toBeVisible();
 await expect(page.getByLabel('食用重量（g）')).not.toBeVisible();
 await expect(page.locator('[data-action="food-unit:0"]')).toContainText('中碗');
 await page.locator('[data-action="food-quantity:0.5"]').click();
 await expect(page.locator('#portion-equivalent')).toHaveText('0.5 碗（中碗） · 约 75 g');
 await expect(page.locator('#household-note')).toContainText('估算');
 await click(page,'保存到午餐');
 const saved=(await state(page)).food[0];
 expect(saved.components[0]).toMatchObject({amount:75,unit:'g',grams:75,household:{label:'中碗',quantity:0.5,amount:150,unit:'g',estimated:true}});
 expect(saved.kcal).toBeCloseTo(97.5);
 expect(saved.components[0].household.source).toBeTruthy();
 await page.reload();
 await expect(page.locator('.meal-entry-copy')).toContainText('0.5 碗（中碗） · 约 75 g');
 expect((await state(page)).food[0]).toEqual(saved);
});

test('same-day recent food reuses the latest household amount without changing older meals',async({page})=>{
 await page.goto('/#food');await openRice(page);
 await page.locator('[data-action="food-quantity:0.5"]').click();await click(page,'保存到午餐');
 const first=(await state(page)).food[0];
 await openRice(page);await page.locator('[data-action="food-quantity:2"]').click();await click(page,'保存到午餐');
 await click(page,'添加午餐');await click(page,'最近吃过');await page.locator('[data-action="food-pick:fdc-168878"]').click();await expect(page.getByLabel('食用数量')).toHaveValue('2');await click(page,'返回');await click(page,'返回');
 const recent=page.locator('.food-recent-rail [data-action="food-repeat:fdc-168878"]');
 await expect(recent).toHaveCount(1);await expect(recent).toContainText('2 碗（中碗） · 约 300 g');
 await recent.click();await expect(page.getByLabel('食用数量')).toHaveValue('2');
 await expect(page.locator('[data-action="food-unit:0"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-action="portion-meal:午餐"]').click();await click(page,'保存到午餐');
 const saved=(await state(page)).food;
 expect(saved).toHaveLength(3);expect(saved[0]).toEqual(first);
 expect(saved[2].components[0].household.quantity).toBe(2);
 expect(saved[2].components[0].amount).toBe(300);
});

test('food information and favorite controls preserve a half bowl and chosen meal',async({page})=>{
 await page.goto('/#food');await openRice(page);
 await page.locator('[data-action="food-quantity:0.5"]').click();
 await page.locator('[data-action="portion-meal:晚餐"]').click();
 await click(page,'查看食物详情');await click(page,'收藏食物');await click(page,'调整份量');
 await expect(page.getByLabel('食用数量')).toHaveValue('0.5');
 await expect(page.getByLabel('食用重量（g）')).not.toBeVisible();
 await expect(page.locator('[data-action="portion-meal:晚餐"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#portion-equivalent')).toContainText('75 g');
 await click(page,'保存到晚餐');
 const saved=await state(page);
 expect(saved.food[0].meal).toBe('晚餐');expect(saved.food[0].components[0].household.quantity).toBe(0.5);
 expect(saved.favorites).toContain('fdc-168878');
});

test('half a 250 ml carton stays volume-based and saves offline',async({page,context})=>{
 await page.goto('/#food');await click(page,'添加午餐');
 await page.getByRole('searchbox').fill('061954000041');await expect(page.locator('.food-pick')).toHaveCount(1);
 await page.locator('.food-pick').click();
 await expect(page.locator('[data-action="food-unit:0"]')).toContainText('盒');
 await expect(page.locator('[data-action="food-unit:0"]')).toContainText('250 ml');
 await context.setOffline(true);await page.locator('[data-action="food-quantity:0.5"]').click();await click(page,'保存到午餐');
 const saved=(await state(page)).food[0],part=saved.components[0];
 expect(saved.grams).toBeNull();expect(part.grams).toBeNull();
 expect(part).toMatchObject({amount:125,unit:'ml',household:{label:'盒',quantity:0.5,amount:250,unit:'ml'}});
 expect(part.kcal).toBeCloseTo(part.foodSnapshot.kcal*1.25);
 await expect(page.locator('.meal-entry-copy')).toContainText('0.5 盒');
});

test('editing a saved household mapping uses its original snapshot and exact mode clears that mapping',async({page})=>{
 await page.goto('/#food');
 const original=await page.evaluate(async()=>{
  const {fresh,dateKey,offset}=await import('/model.js');
  const {catalog}=await import('/fuel.js');
  const food=structuredClone(catalog.find(f=>f.id==='fdc-168878'));
  food.kcal=100;food.source='测试保存时营养来源';
  const household={id:'estimate-rice-0-v1',label:'中碗',amount:120,unit:'g',quantity:1.5,estimated:true,source:'测试保存时份量定义',note:'旧版碗型'};
  const part={foodId:food.id,name:food.name,source:food.source,amount:180,unit:'g',grams:180,kcal:180,protein:4,carbs:40,fat:null,foodSnapshot:food,household};
  const older={id:'older-meal',date:offset(dateKey(),-1),meal:'午餐',name:food.name,timing:'日常',components:[structuredClone(part)],grams:180,kcal:180,protein:4,carbs:40,fat:null,loggedAt:1};
  const current={...structuredClone(older),id:'current-meal',date:dateKey(),copiedFrom:'older-meal',loggedAt:2};
  const data=fresh();data.food=[older,current];localStorage.setItem('breakwind.local.v1',JSON.stringify(data));return older;
 });
 await page.reload();await editCurrentRice(page);
 await expect(page.getByLabel('食用数量')).toHaveValue('1.5');
 await expect(page.locator('#portion-equivalent')).toContainText('180 g');
 await page.getByLabel('食用数量').fill('2');await click(page,'保存到午餐');
 let records=(await state(page)).food;
 expect(records).toHaveLength(2);expect(records[0]).toEqual(original);
 expect(records[1].components[0].amount).toBe(240);expect(records[1].kcal).toBe(240);
 expect(records[1].components[0].household.amount).toBe(120);
 expect(records[1].components[0].household.source).toBe('测试保存时份量定义');
 expect(records[1].copiedFrom).toBe('older-meal');
 await editCurrentRice(page);await click(page,'按克输入');
 await page.getByLabel('食用重量（g）').fill('90');await click(page,'保存到午餐');
 records=(await state(page)).food;
 expect(records[0]).toEqual(original);expect(records[1].components[0].household).toBeUndefined();
 expect(records[1].components[0].amount).toBe(90);expect(records[1].kcal).toBe(90);
 await click(page,'复制昨日');await click(page,'复制所选餐食');
 expect((await state(page)).food).toHaveLength(2);await click(page,'返回');
 await page.reload();await editCurrentRice(page);
 await expect(page.getByLabel('食用重量（g）')).toBeVisible();
 await expect(page.getByLabel('食用重量（g）')).toHaveValue('90');
 await expect(page.getByLabel('食用数量')).toBeDisabled();
});

test('household quantity and save fit a narrow keyboard-sized viewport',async({page})=>{
 await page.setViewportSize({width:320,height:430});await page.goto('/#food');await openRice(page);
 await page.getByLabel('食用数量').fill('0.5');
 const save=page.getByRole('button',{name:'保存到午餐',exact:true}),bounds=await save.boundingBox();
 expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(431);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await save.click();expect((await state(page)).food[0].components[0].amount).toBe(75);
});

test('empty, zero, negative and excessive quantities cannot create a meal',async({page})=>{
 await page.goto('/#food');await openRice(page);
 for(const value of ['', '0', '-1', '100000']){
  await page.getByLabel('食用数量').fill(value);await click(page,'保存到午餐');
  await expect(page.locator('#portion-form')).toBeVisible();expect((await state(page)).food).toHaveLength(0);
 }
 await page.getByLabel('食用数量').fill('');await page.getByLabel('食用数量').pressSequentially('0.5');await expect(page.getByLabel('食用数量')).toHaveValue('0.5');await click(page,'保存到午餐');
 const saved=(await state(page)).food;expect(saved).toHaveLength(1);expect(saved[0].components[0].amount).toBe(75);
});
