import { expect, test } from '@playwright/test';

const now = new Date('2026-11-07T15:00:00Z');
const click = (page,name) => page.getByRole('button',{name,exact:true}).click();
test.beforeEach(async ({page})=>page.clock.setFixedTime(now));

test('PB numeric picker preserves selection and cancellation without a keyboard',async({page,isMobile},info)=>{
  await page.goto('/#run');
  await click(page,'调整专项与PB');
  await click(page,'1500m');
  await click(page,'4:20');
  await click(page,'调整专项与PB');await click(page,'自定义成绩');
  const dialog=page.locator('#editor[open]');
  await expect(dialog.locator('input:visible')).toHaveCount(0);
  await expect(dialog.getByRole('combobox',{name:'分',exact:true})).toHaveValue('4');
  await dialog.getByRole('combobox',{name:'秒',exact:true}).selectOption('55');
  await page.screenshot({path:info.outputPath('pb-picker.png')});
  await click(page,'取消');
  await expect(page.locator('.pb-tiers-label')).toContainText('4:20');
  await click(page,'调整专项与PB');await click(page,'自定义成绩');
  await expect(dialog.getByRole('combobox',{name:'秒',exact:true})).toHaveValue('20');
  await dialog.getByRole('combobox',{name:'秒',exact:true}).selectOption('55');
  if(isMobile) {
    await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:320});visualViewport.dispatchEvent(new Event('resize'));});
    const bounds=await dialog.boundingBox();
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(321);
  }
  await click(page,'保存成绩');
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.pb-tiers-label')).toContainText('4:55');
  await expect(page.locator('.course-card')).toHaveCount(15);
});

test('training, food and calendar fit the viewport and capture screenshots',async({page},info)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const routes = [
    ['run','训练'],['food','饮食'],['calendar','训练与日程']
  ];
  for (const [route,title] of routes) {
    await page.goto('/#'+route+'?demo=1');
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
    const metrics=await page.evaluate(()=>{
      const root=document.documentElement;
      const navigation=performance.getEntriesByType('navigation')[0];
      return {over:root.scrollWidth-root.clientWidth,load:navigation?.domContentLoadedEventEnd||0};
    });
    expect(metrics.over,route+' overflows viewport').toBeLessThanOrEqual(1);
    expect(metrics.load,route+' DOM load budget (ms)').toBeLessThan(4000);
    await page.screenshot({path:info.outputPath(route+'.png'),fullPage:true,animations:'disabled'});
  }
  expect(errors).toEqual([]);
  await page.goto('/#home?demo=1');
  await expect(page.getByRole('heading',{name:'训练',exact:true})).toBeVisible();
  const signature=()=>page.locator('main .course-card').evaluateAll(nodes=>nodes.map(node=>{
    const {width,height}=node.getBoundingClientRect();
    return [width,height].map(Math.round);
  }));
  const before=await signature();
  await page.reload();
  await expect(page.getByRole('heading',{name:'训练',exact:true})).toBeVisible();
  expect(await signature()).toEqual(before);
});

test('experienced 1500m runner with no logs discovers complete courses and saves one without a questionnaire',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#run');
  await click(page,'调整专项与PB');
  await click(page,'1500m');
  await click(page,'4:20');
  await expect(page.locator('.course-card')).toHaveCount(15);
  await expect(page.locator('.course-card').first()).toContainText('3×500m');
  await expect(page.locator('main')).not.toContainText('轻松走跑');
  await page.screenshot({path:info.outputPath('course-discovery.png')});
  await click(page,'500m 稳定间歇');
  const dialog=page.locator('#editor[open]');
  await expect(dialog.locator('.rep-rest')).toContainText('180秒');
  await expect(dialog).toContainText('待教练审核');
  await expect(dialog.locator('input:not([type=date])')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('course-detail.png')});
  await click(page,'加入课表');
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.pb-tiers-label')).toContainText('4:20');
  await click(page,'本周计划');
  await expect(page.locator('.week-outline li')).toHaveCount(7);
  await expect(page.locator('.week-outline')).toContainText('恢复日');
  await page.screenshot({path:info.outputPath('course-week.png')});
  await click(page,'训练日程');
  await expect(page.locator('main')).toContainText('500m 稳定间歇');
  await page.locator('[data-action^="open-plan:"]').first().click();await expect(dialog.locator('.execution-line')).toContainText('3×500m');await click(page,'查看课表');await click(page,'记录完成情况');await page.getByLabel('完成',{exact:true}).check();await click(page,'保存完成情况');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).runs.length)).toBe(0);
  expect(errors).toEqual([]);
});

test('a long mobile sheet keeps close reachable, and trend points respond to taps',async({page},info)=>{
  await page.goto('/#chart?demo=1');
  await page.getByRole('button',{name:/^跑量 /}).click();
  const dialog=page.locator('#editor[open]');
  const close=dialog.getByRole('button',{name:'关闭',exact:true});
  await expect(dialog.getByRole('heading',{name:'跑量趋势'})).toBeFocused();
  await dialog.getByRole('button',{name:'近 30 天',exact:true}).click();
  const trend=dialog.getByRole('group',{name:'跑量逐日趋势'});
  await expect(trend.getByRole('button')).toHaveCount(30);
  await trend.getByRole('button',{name:/11月4日/}).click();
  await expect(dialog.locator('#trend-reading')).toContainText('8.4 km');
  await expect(trend.getByRole('button',{name:/11月4日/})).toHaveAttribute('aria-pressed','true');
  await dialog.getByText('查看逐日数据',{exact:true}).click();
  await dialog.locator('.dialog-body').evaluate(node=>{node.scrollTop=node.scrollHeight;});
  const box=await close.boundingBox();
  expect(box?.y).toBeGreaterThanOrEqual(0);
  expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize().height);
  await page.screenshot({path:info.outputPath('trend-sheet.png'),animations:'disabled'});
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button',{name:/^跑量 /})).toBeFocused();
});

test('specialty search, filters, comparison and favorites use the live catalog',async({page},info)=>{
  await page.goto('/#run');
  await page.getByText('计划资料与收藏',{exact:true}).click();
  const search=page.getByRole('searchbox',{name:'搜索训练计划'});
  await search.fill('800m');
  await expect(page.locator('#catalog-results [role=status]')).toHaveText('1 项计划');
  await page.locator('.catalog-actions').getByRole('button',{name:'收藏',exact:true}).click();
  await click(page,'比较');
  await search.fill('5km');
  await expect(page.locator('#catalog-results [role=status]')).toHaveText('1 项计划');
  await click(page,'比较');
  await click(page,'比较已选（2）');
  const dialog=page.locator('#editor[open]');
  await expect(dialog.getByRole('heading',{name:'800 m',exact:true})).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'5000 m',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('plan-comparison.png'),animations:'disabled'});
  await click(page,'关闭');
  await search.focus();
  // The dialog close event is queued. It must not steal a newer input focus.
  await page.locator('#editor').evaluate(node=>node.dispatchEvent(new Event('close')));
  await expect(search).toBeFocused();
  await search.clear();
  await expect(search).toHaveValue('');
  await page.getByText('训练条件',{exact:true}).click();
  await page.getByRole('combobox',{name:'适用水平',exact:true}).selectOption('recovering');
  await page.getByRole('combobox',{name:'训练阶段',exact:true}).selectOption('recovery');
  await page.getByRole('combobox',{name:'每周训练天数',exact:true}).selectOption('2');
  await page.getByRole('combobox',{name:'周期周数',exact:true}).selectOption('2');
  await expect(page.locator('#catalog-results [role=status]')).toHaveText('1 项计划');
  await expect(page.getByRole('button',{name:/恢复与交叉训练/})).toBeVisible();
  await page.reload();
  await page.getByText('计划资料与收藏',{exact:true}).click();
  await page.getByRole('group',{name:'专项筛选'}).getByRole('button',{name:'收藏',exact:true}).click();
  await expect(page.getByRole('button',{name:/800 m/})).toBeVisible();
  await expect(page.locator('.catalog-actions button').first()).toHaveAttribute('aria-pressed','true');
});

test('reported pain prevents scheduling while the full course remains browsable',async({page})=>{
  await page.goto('/#run');
  await click(page,'调整专项与PB');
  await click(page,'800m');
  await click(page,'2:20');
  await click(page,'伤痛与恢复');
  await click(page,'暂停训练建议');
  await page.reload();
  await expect(page.locator('.course-card')).toHaveCount(15);
  await expect(page.locator('.course-risk')).toContainText('已知伤痛');
  await click(page,'200m 专项耐受');
  await expect(page.locator('#editor[open]')).toContainText('专业评估');
  await expect(page.getByRole('button',{name:'加入课表',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'开始记录',exact:true})).toHaveCount(0);
});
