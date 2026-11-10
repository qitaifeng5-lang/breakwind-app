import {chromium,devices,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const revision=process.argv[2];
if (!/^(local|[a-f0-9]{40})$/.test(revision||'')) throw new Error('Pass the expected full commit SHA');
const base=process.argv[3] || 'https://qitaifeng5-lang.github.io/breakwind-app/';
const output=new URL('../.expo/course-preview/'+revision+'/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.BREAKWIND_TEST_BROWSER || undefined});
try {
  const context=await browser.newContext({...devices['iPhone 13'],locale:'zh-CN',reducedMotion:'no-preference',
    recordVideo:{dir:fileURLToPath(output),size:{width:390,height:664}}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const button=name=>page.getByRole('button',{name,exact:true});
  const pause=()=>page.waitForTimeout(800); // Deliberate recording pacing, not test synchronization.
  const click=async name=>{await button(name).click();await pause();};
  const capture=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',output)),animations:'disabled'});
  const response=await page.goto(base+'#run');
  expect(response.status()).toBe(200);
  if (revision!=='local') await expect(page.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',revision);
  await click('调整专项与PB');await click('1500m');
  await click('4:20');
  await capture('training');
  await click('调整专项与PB');await click('自定义成绩');
  const dialog=page.getByRole('dialog');
  await expect(dialog.locator('input:visible')).toHaveCount(0);
  await dialog.getByRole('combobox',{name:'秒',exact:true}).selectOption('55');
  await pause();await capture('pb-picker');
  await click('取消');
  await expect(page.locator('.pb-tiers-label')).toContainText('4:20');
  await click('调整专项与PB');await click('自定义成绩');
  await expect(dialog.getByRole('combobox',{name:'秒',exact:true})).toHaveValue('20');
  await dialog.getByRole('combobox',{name:'秒',exact:true}).selectOption('25');
  await pause();await click('保存成绩');
  await expect(page.locator('.pb-tiers-label')).toContainText('4:25');
  await capture('training');
  await click('按类型浏览');await click('间歇');
  await expect(page.locator('.course-card')).toHaveCount(2);
  const session=await context.newCDPSession(page);
  const swipe=async(x,y,dx,dy)=>{
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause();
  };
  const rail=await page.locator('.course-rail').boundingBox();
  await swipe(rail.x+275,rail.y+70,-210,0);
  await expect.poll(()=>page.locator('.course-rail').evaluate(node=>node.scrollLeft)).toBeGreaterThan(20);
  await swipe(rail.x+65,rail.y+70,210,0);
  await page.locator('.course-expansion summary').first().click();await pause();
  await expect(page.locator('.course-expansion').first()).toHaveAttribute('open','');
  await click('500m 稳定间歇');
  await expect(dialog).toContainText('3 × 500m');
  await capture('course-detail');
  await dialog.locator('.course-block').nth(1).scrollIntoViewIfNeeded();await pause();
  await capture('course-structure');
  await click('返回课程');await click('500m 稳定间歇');
  const handle=await dialog.locator('.sheet-handle').boundingBox();
  await swipe(handle.x+handle.width/2,handle.y+handle.height/2,0,150);
  await expect(dialog).not.toBeVisible();
  await click('500m 稳定间歇');
  await click('加入日程');
  await expect(dialog).not.toBeVisible();
  await click('周安排草案');
  await click('调整阶段');await click('赛前期');
  await expect(page.locator('.week-outline li')).toHaveCount(7);
  await page.locator('.week-feature').scrollIntoViewIfNeeded();
  await capture('week');
  const bounds=await page.locator('.week-feature').boundingBox();
  const x=bounds.x+240,y=bounds.y+50;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for (let i=1;i<=8;i++) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*16,y}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('.course-dates [aria-pressed=true]')).toHaveAttribute('data-action','course-day:1');
  await pause();
  await click('训练日程');
  await expect(page.locator('main')).toContainText('500m 稳定间歇');
  await capture('scheduled');
  await page.goto(base+'#run');
  await expect(page.locator('.pb-tiers-label')).toContainText('4:25');
  await page.reload();
  await expect(page.locator('.pb-tiers-label')).toContainText('4:25');
  if (revision!=='local') {
    await page.evaluate(async()=>{await(await navigator.serviceWorker.ready).update();});
    await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).filter(key=>key.startsWith('breakwind-preview-')))).toEqual(['breakwind-preview-'+revision]);
    const modules=await page.evaluate(()=>performance.getEntriesByType('resource').filter(item=>/\/(app|engine|model|fuel|running|knowledge|pb-library|workout|workout-ui)\.js/.test(item.name)).map(item=>new URL(item.name).searchParams.get('v')));
    expect(modules.length).toBeGreaterThanOrEqual(9);
    expect(modules.every(value=>value===revision)).toBe(true);
  }
  expect(errors).toEqual([]);
  const video=page.video();
  await context.close();
  await video.saveAs(fileURLToPath(new URL('course-interaction.webm',output)));
  const result={revision,https:response.status(),flow:'1500m / PB 4:25 / category alternatives / full course / schedule / phase / reload',picker:'cancel kept 4:20; numeric save changed to 4:25; no text input focus',
    gestures:'horizontal cards, expansion, detail return, drag dismissal, date swipe',cache:revision==='local'?'local':'current revision only',
    device:'Chromium iPhone 13 viewport, not a physical iPhone',output:fileURLToPath(output)};
  await writeFile(new URL('verification.json',output),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally {await browser.close();}
