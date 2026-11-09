import { expect, test } from '@playwright/test';

const now = new Date('2026-11-07T15:00:00Z');
const click = (page,name) => page.getByRole('button',{name,exact:true}).click();
test.beforeEach(async ({page})=>page.clock.setFixedTime(now));

test('PB numeric picker preserves selection and cancellation without a keyboard',async({page,isMobile},info)=>{
  await page.goto('/#run');
  await click(page,'1500m');
  await click(page,'4:20');
  await click(page,'自定义成绩');
  const dialog=page.getByRole('dialog');
  await expect(dialog.locator('input:visible')).toHaveCount(0);
  await expect(dialog.getByRole('combobox',{name:'分',exact:true})).toHaveValue('4');
  await dialog.getByRole('combobox',{name:'秒',exact:true}).selectOption('55');
  await page.screenshot({path:info.outputPath('pb-picker.png')});
  await click(page,'取消');
  await expect(page.locator('.pb-tiers-label')).toContainText('4:20');
  await click(page,'自定义成绩');
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
  await expect(page.locator('.course-card')).toHaveCount(7);
});

test('dashboard, training, nutrition, analytics and growth fit the viewport and capture screenshots',async({page},info)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const routes = [
    ['home','今日训练'],['run','训练'],['food','运动营养'],['chart','数据中心'],['growth','跑者成长']
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
  await expect(page.getByRole('heading',{name:'今日训练'})).toBeVisible();
  const signature=()=>page.locator('main .hero').evaluateAll(nodes=>nodes.map(node=>{
    const {width,height}=node.getBoundingClientRect();
    return [width,height].map(Math.round);
  }));
  const before=await signature();
  await page.reload();
  await expect(page.getByRole('heading',{name:'今日训练'})).toBeVisible();
  expect(await signature()).toEqual(before);
});

test('experienced 1500m runner with no logs discovers complete courses and saves one without a questionnaire',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#run');
  await click(page,'1500m');
  await click(page,'4:20');
  await expect(page.locator('.course-card')).toHaveCount(7);
  await expect(page.locator('.course-card').first()).toContainText('3 × 500m');
  await expect(page.locator('main')).not.toContainText('轻松走跑');
  await page.screenshot({path:info.outputPath('course-discovery.png')});
  await click(page,'500m 稳定间歇');
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('组内恢复 · 3 分钟');
  await expect(dialog).toContainText('待专业审核');
  await expect(dialog.locator('input:not([type=date])')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('course-detail.png')});
  await click(page,'加入日程');
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.pb-tiers-label')).toContainText('4:20');
  await click(page,'一周课表');
  await expect(page.locator('.week-outline li')).toHaveCount(7);
  await expect(page.locator('.week-outline')).toContainText('恢复日');
  await page.screenshot({path:info.outputPath('course-week.png')});
  await click(page,'训练日程');
  await expect(page.locator('main')).toContainText('500m 稳定间歇');
  await page.goto('/#home');
  await click(page,'课次详情');
  await expect(dialog).toContainText('3 × 500m');
  await click(page,'开始记录');
  await dialog.getByRole('checkbox').check();
  await click(page,'确认并记录');
  await click(page,'手动填写');
  await page.getByRole('spinbutton',{name:'实际距离（km）'}).fill('2');
  await page.getByRole('spinbutton',{name:'实际耗时（分钟）'}).fill('20');
  await click(page,'保存记录');
  await expect(dialog).toContainText('2');
  expect(errors).toEqual([]);
});

test('running and rice at lunch persist and drive interactive data cards',async({page},info)=>{
  await page.goto('/#run');
  await click(page,'记录跑步');
  await click(page,'手动填写');
  await page.getByRole('textbox',{name:'训练名称'}).fill('测试晨跑');
  await page.getByRole('spinbutton',{name:'实际距离（km）'}).fill('5');
  await page.getByRole('spinbutton',{name:'实际耗时（分钟）'}).fill('28.5');
  await page.getByRole('spinbutton',{name:'主观强度（1–10）'}).fill('4');
  await click(page,'保存记录');
  await expect(page.getByRole('dialog')).toContainText('5:42');
  await click(page,'关闭');
  await page.goto('/#food');
  await click(page,'添加午餐');
  await expect(page.getByRole('combobox',{name:'餐别'})).toHaveValue('午餐');
  await page.getByRole('searchbox').fill('米饭');
  await page.getByRole('button',{name:/^白米饭（熟）/}).click();
  await click(page,'150 g');
  await expect(page.getByRole('spinbutton',{name:'食用重量（g）'})).toHaveValue('150');
  await page.screenshot({path:info.outputPath('rice-portion.png'),animations:'disabled'});
  await click(page,'保存到午餐');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.meal-group').filter({has:page.getByRole('heading',{name:'午餐'})})).toContainText('白米饭（熟）');
  await page.screenshot({path:info.outputPath('lunch-saved.png'),animations:'disabled'});
  await click(page,'上一天');
  await expect(page.locator('.meal-list').getByText('白米饭（熟）',{exact:true})).toHaveCount(0);
  await click(page,'下一天');
  await page.goto('/#chart');
  await page.getByRole('button',{name:/主观训练负荷 114/}).click();
  await expect(page.getByRole('dialog')).toContainText('114');
  await click(page,'今天');
  await page.getByText('查看逐日数据',{exact:true}).click();
  await expect(page.getByRole('dialog').getByText('11月7日星期六',{exact:true})).toBeVisible();
});

test('local themes persist and official ranking stays empty',async({page})=>{
  await page.goto('/#growth');
  await click(page,'赛道蓝');
  await expect(page.locator('html')).toHaveAttribute('data-theme','track');
  await click(page,'官方验证');
  await expect(page.getByText('暂无官方验证成绩',{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','track');
});

test('run timer uses the live layout and can pause and continue',async({page})=>{
  await page.goto('/#run');
  await click(page,'记录跑步');
  await click(page,'开始手动计时');
  await expect(page.getByRole('dialog')).toHaveAttribute('data-variant','live');
  await click(page,'暂停');
  await click(page,'继续');
  await click(page,'结束并填写');
  await expect(page.getByRole('dialog')).toContainText('跑步记录');
});

test('a long mobile sheet keeps close reachable, and trend points respond to taps',async({page},info)=>{
  await page.goto('/#chart?demo=1');
  await page.getByRole('button',{name:/^跑量 /}).click();
  const dialog=page.getByRole('dialog');
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

test('compact phone navigation keeps a reachable action and meal search fits a modal',async({page})=>{
  await page.goto('/#home');
  const nav=page.getByRole('navigation',{name:'移动端导航'});
  const mobile=await nav.isVisible();
  const hero=page.getByRole('button',{name:'开始跑步',exact:true});
  await hero.click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'手动填写',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  if (mobile) await nav.getByRole('link',{name:'营养',exact:true}).click();
  else await page.goto('/#food');
  await click(page,'添加食物');
  await dialog.getByRole('searchbox').fill('老豆腐');
  await expect(dialog.getByText('硬豆腐（石膏凝固，未烹调）',{exact:true})).toBeVisible();
  const size=await dialog.evaluate(node=>({inner:node.clientWidth,outer:node.scrollWidth}));
  expect(size.outer-size.inner).toBeLessThanOrEqual(1);
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
  const dialog=page.getByRole('dialog');
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

test('date gestures select the next workout, the carousel scrolls, and a data sheet follows the pointer',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  const client=info.project.name==='desktop' ? null : await page.context().newCDPSession(page);
  async function drag(x,y,toX,toY) {
    if (!client) {
      await page.mouse.move(x,y);
      await page.mouse.down();
      await page.mouse.move(toX,toY,{steps:8});
      await page.mouse.up();
      return;
    }
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for (let i=1;i<=8;i++) await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(toX-x)*i/8,y:y+(toY-y)*i/8}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await page.goto('/#run');
  await click(page,'1500m');
  await click(page,'一周课表');
  const dates=page.locator('.week-feature');
  await dates.scrollIntoViewIfNeeded();
  const strip=await dates.boundingBox();
  await drag(strip.x+127,strip.y+65,strip.x+35,strip.y+65);
  await expect(page.locator('.course-dates [aria-pressed=true]')).toHaveAttribute('data-action','course-day:1');
  await page.getByText('计划资料与收藏',{exact:true}).click();
  await click(page,'下一项');
  await expect.poll(()=>page.locator('.plan-carousel').evaluate(node=>node.scrollLeft)).toBeGreaterThan(20);
  await page.goto('/#chart?demo=1');
  await page.getByRole('button',{name:/^跑量 /}).click();
  const sheet=page.getByRole('dialog');
  const handle=await sheet.locator('.sheet-handle').boundingBox();
  const x=handle.x+handle.width/2;
  const y=handle.y+handle.height/2;
  await drag(x,y,x,y+145);
  await expect(sheet).not.toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:/^跑量 /}).click();
  await expect(sheet).toBeVisible();
  expect(await sheet.evaluate(node=>node.getAnimations().length)).toBe(0);
});

test('reported pain prevents scheduling while the full course remains browsable',async({page})=>{
  await page.goto('/#run');
  await click(page,'800m');
  await click(page,'2:20');
  await click(page,'伤痛与恢复');
  await click(page,'暂停训练建议');
  await page.reload();
  await expect(page.locator('.course-card')).toHaveCount(7);
  await expect(page.locator('.course-risk')).toContainText('已知伤痛');
  await click(page,'200m 节奏重复');
  await expect(page.getByRole('dialog')).toContainText('专业评估');
  await expect(page.getByRole('button',{name:'加入日程',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'开始记录',exact:true})).toHaveCount(0);
});
