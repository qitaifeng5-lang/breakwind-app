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
  await click(page,'当天日程');
  await expect(page.getByRole('heading',{name:'训练与日程'})).toBeVisible();
  await page.goto('/#run');
  await click(page,'场地');
  await page.getByRole('button',{name:/1500 m/}).click();
  await expect(page.getByRole('dialog')).toContainText('研究依据');
  await click(page,'用此专项生成');
  await expect(page.getByRole('combobox',{name:'目标项目'})).toHaveValue('1500 m');
  await page.getByRole('combobox',{name:'跑步背景'}).selectOption('长期参加专项比赛');
  await page.getByRole('combobox',{name:'年龄段'}).selectOption('18–39岁');
  await page.getByLabel('跑龄（年）').fill('6');
  await page.getByLabel('近四周平均跑步天数 / 周').fill('4');
  await page.getByLabel('近四周平均跑量（km / 周）').fill('28');
  await page.getByLabel('近四周最长一跑（km）').fill('9');
  await page.getByLabel('过去两年专项参赛次数').fill('8');
  await page.getByRole('combobox',{name:'本次疼痛或康复确认'}).selectOption({label:'目前没有这些情况'});
  await click(page,'查看草案');
  await expect(page.getByRole('dialog')).toContainText('第 4 周');
  await expect(page.locator('.athlete-result')).toHaveText('竞技运动员');
  await expect(page.locator('.draft-session').filter({hasText:'入门走跑'})).toHaveCount(0);
  await click(page,'确认加入日程');
  await expect(page.getByRole('heading',{name:'当前训练周期'})).toBeVisible();
  await page.getByRole('button',{name:'课次详情',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toContainText('课次详情');
  await page.getByText('执行',{exact:true}).click();
  await expect(page.getByText('先轻松热身，再均匀慢跑，最后放慢收尾。达到时间或距离上限即结束。',{exact:true})).toBeVisible();
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
  const hero=page.getByRole('button',{name:'开始跑步',exact:true});
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

test('specialty search, filters, comparison and favorites use the live catalog',async({page},info)=>{
  await page.goto('/#run');
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
  await search.clear();
  await page.getByText('训练条件',{exact:true}).click();
  await page.getByRole('combobox',{name:'适用水平',exact:true}).selectOption('recovering');
  await page.getByRole('combobox',{name:'训练阶段',exact:true}).selectOption('recovery');
  await page.getByRole('combobox',{name:'每周训练天数',exact:true}).selectOption('2');
  await page.getByRole('combobox',{name:'周期周数',exact:true}).selectOption('2');
  await expect(page.locator('#catalog-results [role=status]')).toHaveText('1 项计划');
  await expect(page.getByRole('button',{name:/恢复与交叉训练/})).toBeVisible();
  await page.reload();
  await page.getByRole('group',{name:'专项筛选'}).getByRole('button',{name:'收藏',exact:true}).click();
  await expect(page.getByRole('button',{name:/800 m/})).toBeVisible();
  await expect(page.locator('.catalog-actions button').first()).toHaveAttribute('aria-pressed','true');
});

test('date gestures drive the chart, the carousel scrolls, and a data sheet follows the pointer',async({page},info)=>{
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
  await page.goto('/#home?demo=1');
  const dates=page.locator('.week-preview .calendar-days');
  await dates.scrollIntoViewIfNeeded();
  const strip=await dates.boundingBox();
  await drag(strip.x+35,strip.y+16,strip.x+127,strip.y+16);
  await expect(dates.locator('[aria-current=date]')).toHaveAttribute('data-action','home-date:2026-11-06');
  await expect(page.locator('.home-status .chart-caption')).toContainText('11月6日');
  await expect(page.locator('.home-status .bar-day[aria-pressed=true]')).toHaveAttribute('data-action','chart:2026-11-06');
  await page.goto('/#run?demo=1');
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

test('reported pain blocks generation and leaves no competitive schedule to save',async({page})=>{
  await page.goto('/#run');
  await click(page,'生成训练周期');
  await page.getByLabel('跑步背景').selectOption('长期参加专项比赛');
  await page.getByLabel('目标项目').selectOption('800 m');
  await page.getByLabel('本次疼痛或康复确认').selectOption('有疼痛、功能受限或仍在康复');
  await click(page,'查看草案');
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('伤后恢复者');
  await expect(dialog).toContainText('专业评估');
  await expect(dialog.getByRole('button',{name:'确认加入日程'})).toHaveCount(0);
});
