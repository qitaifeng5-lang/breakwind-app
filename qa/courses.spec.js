import {test,expect} from '@playwright/test';
import {fresh} from '../public/model.js';

const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
test.beforeEach(async({page})=>page.clock.setFixedTime(new Date('2026-11-07T15:00:00Z')));

test('800m PB bands change recovery and matching, without requiring imported history',async({page})=>{
  await page.goto('/#run');
  await click(page,'3:00');
  await click(page,'组合课');
  await click(page,'200 + 150 组合');
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('组间恢复 6 分钟');
  await expect(dialog).toContainText('组内恢复 · 3 分钟');
  await click(page,'返回课程');
  await click(page,'2:00');
  await click(page,'200 + 150 组合');
  await expect(dialog).toContainText('组间恢复 5 分钟');
  await expect(dialog).toContainText('组内恢复 · 2 分钟');
  await expect(dialog).toContainText('PB ≤ 2:05');
  await click(page,'加入日程');
  await click(page,'200 + 150 组合');
  await click(page,'加入日程');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans.length)).toBe(1);
  await click(page,'间歇');
  await click(page,'200m 节奏重复');
  await expect(dialog).toContainText('附近已有质量课');
  await expect(dialog.getByRole('button',{name:'开始记录',exact:true})).toHaveCount(0);
  await dialog.locator('input[type=date]').fill('2026-11-10');
  await click(page,'加入日程');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans.length)).toBe(2);
});

test('PB precision, hours, cancellation and reload never alter a scheduled course',async({page})=>{
  await page.goto('/#run');
  await click(page,'自定义成绩');
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('combobox',{name:'分',exact:true}).selectOption('2');
  await dialog.getByRole('combobox',{name:'秒',exact:true}).selectOption('5');
  await dialog.getByRole('combobox',{name:'百分秒',exact:true}).selectOption('30');
  await click(page,'保存成绩');
  await expect(page.locator('.pb-tiers-label')).toContainText('2:05.30');
  await click(page,'200m 节奏重复');await click(page,'加入日程');
  const before=await page.evaluate(()=>localStorage.getItem('breakwind.local.v1'));
  await click(page,'半马');await click(page,'自定义成绩');
  await dialog.getByRole('combobox',{name:'小时',exact:true}).selectOption('1');
  await dialog.getByRole('combobox',{name:'分',exact:true}).selectOption('30');
  await click(page,'取消');
  await expect(page.locator('.pb-tiers-label')).toContainText('所有档位');
  await click(page,'自定义成绩');
  await dialog.getByRole('combobox',{name:'小时',exact:true}).selectOption('1');
  await dialog.getByRole('combobox',{name:'分',exact:true}).selectOption('30');
  await click(page,'保存成绩');await page.reload();
  await expect(page.locator('.pb-tiers-label')).toContainText('1:30:00');
  expect(await page.evaluate(()=>localStorage.getItem('breakwind.local.v1'))).toBe(before);
});

test('youth can discover every category and coached technical variants but not schedule adult intensity',async({page})=>{
  const data=fresh();data.cycleProfile={age:'未满18岁'};
  await page.addInitScript(value=>localStorage.setItem('breakwind.local.v1',JSON.stringify(value)),data);
  await page.goto('/#run');await click(page,'2:20');
  await expect(page.locator('.course-card')).toHaveCount(7);
  await click(page,'200m 节奏重复');
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('教练结合成熟度评估');
  await expect(dialog.getByRole('button',{name:'加入日程'})).toHaveCount(0);
  await click(page,'返回课程');await click(page,'速度与技术');await click(page,'60m 放松加速');
  await expect(dialog).toContainText('教练带领步频');
  await expect(dialog).not.toContainText('4 × 60m');
  await expect(dialog.getByRole('button',{name:'加入日程'})).toBeVisible();
});

test('course search and interruptible expansion work with motion and reduce motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#run');await click(page,'搜索');
  const input=page.getByRole('searchbox',{name:'搜索课程',exact:true});
  await input.fill('坡');
  await expect(page.locator('.course-card')).toHaveCount(1);
  await input.clear();
  await expect(page.locator('.course-card')).toHaveCount(7);
  const expand=page.locator('.course-expansion').first();
  await expand.locator('summary').click();
  await expect(expand).toHaveAttribute('open','');
  await expand.locator('summary').click();
  await expect(expand).not.toHaveAttribute('open','');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expand.locator('summary').click();
  await expect(expand).toHaveAttribute('open','');
  expect(await expand.evaluate(node=>node.getAnimations({subtree:true}).length)).toBe(0);
});
