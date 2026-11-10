import {test,expect} from '@playwright/test';
import {fresh} from '../public/model.js';

const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
test.beforeEach(async({page})=>page.clock.setFixedTime(new Date('2026-11-07T15:00:00Z')));

test('PB changes applicability, not dose or recovery; withdrawn combinations cannot schedule',async({page})=>{
  await page.goto('/#run');await click(page,'调整专项与PB');await click(page,'3:00');
  await click(page,'200m 专项耐受');const dialog=page.getByRole('dialog');
  await expect(dialog.locator('.execution-line')).toContainText('10×200m');
  await expect(dialog.locator('.rep-rest')).toContainText('120秒');
  await click(page,'返回课程');await click(page,'调整专项与PB');await click(page,'2:00');
  await click(page,'200m 专项耐受');await expect(dialog.locator('.execution-line')).toContainText('10×200m');
  await expect(dialog.locator('.rep-rest')).toContainText('120秒');
  await click(page,'加入日程');await click(page,'200m 专项耐受');await click(page,'加入日程');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).plans.length)).toBe(1);
  await click(page,'按类型浏览');await click(page,'教学存档');await click(page,'200 + 150 组合');
  await expect(dialog.getByRole('button',{name:'加入日程'})).toHaveCount(0);
  await expect(dialog.locator('.course-readiness')).toContainText('仅供审查浏览');
});

test('PB precision, hours, cancellation and reload never alter a scheduled course',async({page})=>{
  await page.goto('/#run');
  await click(page,'调整专项与PB');await click(page,'自定义成绩');
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('combobox',{name:'分',exact:true}).selectOption('2');
  await dialog.getByRole('combobox',{name:'秒',exact:true}).selectOption('5');
  await dialog.getByRole('combobox',{name:'百分秒',exact:true}).selectOption('30');
  await click(page,'保存成绩');
  await expect(page.locator('.pb-tiers-label')).toContainText('2:05.30');
  await click(page,'200m 专项耐受');await click(page,'加入日程');
  const before=await page.evaluate(()=>localStorage.getItem('breakwind.local.v1'));
  await click(page,'调整专项与PB');await click(page,'半马');await click(page,'自定义成绩');
  await dialog.getByRole('combobox',{name:'小时',exact:true}).selectOption('1');
  await dialog.getByRole('combobox',{name:'分',exact:true}).selectOption('30');
  await click(page,'取消');
  await expect(page.locator('.pb-tiers-label')).toContainText('2:05.30');
  await click(page,'调整专项与PB');await click(page,'半马');await click(page,'自定义成绩');
  await dialog.getByRole('combobox',{name:'小时',exact:true}).selectOption('1');
  await dialog.getByRole('combobox',{name:'分',exact:true}).selectOption('30');
  await click(page,'保存成绩');await page.reload();
  await expect(page.locator('.pb-tiers-label')).toContainText('1:30:00');
  expect(await page.evaluate(()=>localStorage.getItem('breakwind.local.v1'))).toBe(before);
});

test('youth can discover every category and coached technical variants but not schedule adult intensity',async({page})=>{
  const data=fresh();data.cycleProfile={age:'未满18岁'};
  await page.addInitScript(value=>localStorage.setItem('breakwind.local.v1',JSON.stringify(value)),data);
  await page.goto('/#run');await click(page,'调整专项与PB');await click(page,'2:20');
  await expect(page.locator('.course-card')).toHaveCount(15);
  await click(page,'200m 专项耐受');
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('教练结合成熟度评估');
  await expect(dialog.getByRole('button',{name:'加入日程'})).toHaveCount(0);
  await click(page,'返回课程');await click(page,'按类型浏览');await click(page,'速度与技术');await click(page,'协调与跑姿练习');
  await expect(dialog).toContainText('教练带领步频');
  await expect(dialog).not.toContainText('4 × 60m');
  await expect(dialog.getByRole('button',{name:'加入日程'})).toBeVisible();
});

test('course search and interruptible expansion work with motion and reduce motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#run');await click(page,'搜索');
  const input=page.getByRole('searchbox',{name:'搜索课程',exact:true});
  await input.fill('坡');
  await expect(page.locator('.course-card')).toHaveCount(2);
  await input.clear();
  await expect(page.locator('.course-card')).toHaveCount(15);
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

test('course content leads the first screen and middle-distance phases select different sessions',async({page})=>{
  await page.goto('/#run');
  await expect(page.locator('main .pb-events')).toHaveCount(0);
  await expect(page.locator('main .pb-tiers')).toHaveCount(0);
  const card=await page.locator('.course-card h3').first().boundingBox();
  expect(card.y+card.height).toBeLessThan(page.viewportSize().height-50);
  for(const event of ['800m','1500m']) {
    await click(page,'调整专项与PB');await click(page,event);await click(page,'查看课程');
    await click(page,'按类型浏览');await click(page,'间歇');
    await expect(page.locator('.course-card')).toHaveCount(2);
    await click(page,'按时间的有氧间歇');
    await expect(page.getByRole('dialog')).toContainText('以时间而非圈速');
    await expect(page.getByRole('dialog')).toContainText('待教练审核');
    await click(page,'返回课程');await click(page,'周安排草案');
    const outlines=[];
    for(const phase of ['基础期','专项期','赛前期','恢复周']) {
      await click(page,'调整阶段');await click(page,phase);
      outlines.push(await page.locator('.week-outline').innerText());
      await expect(page.locator('.course-section-head h2')).toHaveText(phase);
    }
    expect(new Set(outlines).size).toBe(4);
    await expect(page.locator('.week-purpose:not([role=status])')).toContainText(/取消质量(?:主)?课/);
    await click(page,'单节训练');
  }
});
