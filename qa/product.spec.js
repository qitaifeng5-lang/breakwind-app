import { expect, test } from '@playwright/test';

const now = new Date('2026-11-07T15:00:00Z');
const click = (page,name) => page.getByRole('button',{name,exact:true}).click();
test.beforeEach(async ({page})=>page.clock.setFixedTime(now));

test('dashboard, training, nutrition, analytics and growth fit the viewport and capture screenshots',async({page},info)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const routes = [
    ['home','准备好破风了吗？'],['run','训练工作台'],['food','运动营养'],['chart','数据中心'],['growth','跑者成长']
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
  await expect(page.getByRole('heading',{name:'准备好破风了吗？'})).toBeVisible();
  const signature=()=>page.locator('main .hero, main .week-preview, main .dashboard-grid').evaluateAll(nodes=>nodes.map(node=>{
    const {width,height}=node.getBoundingClientRect();
    return [width,height].map(Math.round);
  }));
  const before=await signature();
  await page.reload();
  await expect(page.getByRole('heading',{name:'准备好破风了吗？'})).toBeVisible();
  expect(await signature()).toEqual(before);
});

test('real specialty selection opens its own generator and today calendar has a live entry',async({page})=>{
  await page.goto('/#home');
  await click(page,'营养');
  await expect(page.getByRole('heading',{name:'每一餐，支持每一跑。'})).toBeVisible();
  await click(page,'训练');
  await expect(page.getByRole('heading',{name:'本周训练日历'})).toBeVisible();
  await page.getByRole('button',{name:/11月7日.*项训练/}).click();
  await expect(page.getByRole('heading',{name:'训练与日程'})).toBeVisible();
  await page.goto('/#run');
  await click(page,'场地');
  await page.getByRole('button',{name:/1500 m/}).click();
  await expect(page.getByRole('dialog')).toContainText('研究依据');
  await click(page,'用此专项生成');
  await expect(page.getByRole('combobox',{name:'目标项目'})).toHaveValue('1500 m');
  await page.getByRole('combobox',{name:'本次疼痛或康复确认'}).selectOption({label:'目前没有这些情况'});
  await click(page,'查看草案');
  await expect(page.getByRole('dialog')).toContainText('第 4 周');
  await click(page,'确认加入日程');
  await expect(page.getByRole('heading',{name:'当前训练周期'})).toBeVisible();
  await page.getByRole('button',{name:'课次详情',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toContainText('课次详情');
  await page.getByText('热身',{exact:true}).click();
  await expect(page.getByText('先轻松热身，逐步进入运动状态。')).toBeVisible();
});

test('running and meal records persist and drive interactive data cards',async({page})=>{
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
  await click(page,'添加早餐');
  await expect(page.getByRole('combobox',{name:'餐别'})).toHaveValue('早餐');
  await page.getByRole('searchbox').fill('米饭');
  await click(page,'选取');
  await page.getByRole('spinbutton',{name:'食用重量（g）'}).fill('150');
  await click(page,'加入这餐');
  await click(page,'保存餐食');
  await expect(page.locator('.meal-group').getByText('白米饭（熟）',{exact:true})).toBeVisible();
  await click(page,'上一天');
  await expect(page.getByRole('heading',{name:'当日营养汇总'})).toBeVisible();
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
  const hero=page.getByRole('button',{name:'开始训练',exact:true});
  const weekdays=await page.locator('.week-preview .calendar-days small').evaluateAll(labels=>labels.map(label=>({height:label.offsetHeight,line:parseFloat(getComputedStyle(label).fontSize)})));
  expect(weekdays.every(label=>label.height<=label.line*1.6)).toBe(true);
  await hero.click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'手动填写',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  if (mobile) await nav.getByRole('link',{name:'营养',exact:true}).click();
  else await page.goto('/#food');
  await click(page,'添加餐食');
  await dialog.getByRole('searchbox').fill('老豆腐');
  await expect(dialog.getByText('硬豆腐（石膏凝固，未烹调）',{exact:true})).toBeVisible();
  const size=await dialog.evaluate(node=>({inner:node.clientWidth,outer:node.scrollWidth}));
  expect(size.outer-size.inner).toBeLessThanOrEqual(1);
});
