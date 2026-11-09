import {chromium,devices,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const revision=process.argv[2],base=process.argv[3]||'https://qitaifeng5-lang.github.io/breakwind-app/';
if(!/^(local|[a-f0-9]{40})$/.test(revision||''))throw new Error('Pass expected commit SHA');
const output=new URL('../.expo/executable-preview/'+revision+'/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.BREAKWIND_TEST_BROWSER||undefined});
try{
  const context=await browser.newContext({...devices['iPhone 13'],locale:'zh-CN',reducedMotion:'no-preference',recordVideo:{dir:fileURLToPath(output),size:{width:390,height:664}}});
  const page=await context.newPage(),errors=[],loadedModules=[];page.on('pageerror',e=>errors.push(e.message));
  // The accelerated test clock stubs Performance entries. Observe real responses instead.
  page.on('response',response=>{const url=new URL(response.url());if(/\/(app|workout|workout-ui|pb-library|engine|model|running|fuel|knowledge)\.js$/.test(url.pathname))loadedModules.push({name:url.pathname.split('/').at(-1),version:url.searchParams.get('v'),status:response.status()});});
  await page.clock.install();
  const capture=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',output)),animations:'disabled'});
  const click=async name=>{await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(650);};
  const response=await page.goto(base+'#run');expect(response.status()).toBe(200);
  if(revision!=='local')await expect(page.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',revision);
  // Visible test-only watermark prevents mistaking accelerated execution for a real run.
  await page.evaluate(()=>{const el=document.createElement('div');el.textContent='浏览器验收 · 时钟加速 · 非实际运动';el.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;text-align:center;background:#282828;color:white;font:11px sans-serif;padding:3px;pointer-events:none';document.body.append(el);});
  await page.addStyleTag({content:'#editor::before{content:"浏览器验收 · 时钟加速 · 非实际运动";position:fixed;top:0;left:0;right:0;z-index:99999;text-align:center;background:#282828;color:white;font:11px sans-serif;padding:3px;pointer-events:none}'});
  await capture('training');
  await click('调整专项与PB');await click('自定义成绩');await capture('pb-picker');await click('取消');
  async function configure(name,combo=false){
    await click(name);await click('校准本课');const f=page.locator('#workout-calibrate');
    await f.locator('[name=basis0]').selectOption('800');await f.locator('[name=ref0800]').fill('130');
    await f.locator('[name=rep0Mode]').selectOption('walk');
    if(combo){await f.locator('[name=basis1]').selectOption('1500');await f.locator('[name=ref11500]').fill('270');await f.locator('[name=setMode]').selectOption('stand');}
    await f.locator('[name=warmup]').fill('10');await f.locator('[name=cooldown]').fill('5');
    await f.locator('[name=source]').fill('交互验收样例，非训练建议');await f.locator('[name=confirm]').check();
    await click('保存执行规格');await page.locator('.executable-spec').scrollIntoViewIfNeeded();await page.waitForTimeout(650);
  }
  await configure('200m 节奏重复');await capture('200m-detail');
  await click('返回课程');await configure('200 + 150 组合',true);await capture('combination-detail');
  await click('开始记录');await click('确认并热身');await capture('warmup');
  for(const input of await page.locator('[data-warmup]').all())await input.check();
  await page.clock.fastForward(600000);await click('完成本阶段');await capture('lap-target');
  for(let set=0;set<2;set++){
    await page.clock.fastForward(32500);await click('完成本趟');
    if(!set){await capture('rep-recovery');await click('暂停计时');await capture('paused');await click('继续计时');}
    await page.clock.fastForward(180000);await click('恢复完成');
    await expect(page.getByRole('dialog')).toContainText('27 秒');
    await page.clock.fastForward(27000);await click('完成本趟');
    if(!set){await capture('set-recovery');await page.clock.fastForward(360000);await click('恢复完成');}
  }
  await capture('cooldown');await page.clock.fastForward(300000);await click('完成本阶段');await capture('completed-log');await click('保存分段记录');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(document.querySelector('meta[name=breakwind-preview]')?'breakwind.preview.local.v1':'breakwind.local.v1')).runs);
  expect(saved).toHaveLength(1);expect(saved[0].distance).toBe(.7);expect(saved[0].courseSession.status).toBe('complete');
  if(revision!=='local'){
    await page.evaluate(async()=>{await(await navigator.serviceWorker.ready).update();});
    await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('breakwind-preview-')))).toEqual(['breakwind-preview-'+revision]);
    expect(new Set(loadedModules.map(r=>r.name)).size).toBe(9);
    expect(loadedModules.every(r=>r.version===revision&&r.status===200)).toBe(true);
  }
  expect(errors).toEqual([]);
  const video=page.video();await context.close();await video.saveAs(fileURLToPath(new URL('execution-interaction.webm',output)));
  const result={revision,url:base,device:'Chromium iPhone 13 viewport; NOT physical iPhone',clock:'accelerated test clock, not a real workout',review:'pending independent coach review; fixture values are not recommendations',mainDistanceM:700,completedSteps:saved[0].courseSession.logs.length,loadedModules,errors};
  await writeFile(new URL('verification.json',output),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
