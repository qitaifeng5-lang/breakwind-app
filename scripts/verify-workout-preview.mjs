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
  page.on('response',response=>{const url=new URL(response.url());if(/\/(app|workout|workout-ui|pb-library|engine|model|running|fuel|knowledge)\.js$/.test(url.pathname))loadedModules.push({name:url.pathname.split('/').at(-1),version:url.searchParams.get('v'),status:response.status()});});
  await page.clock.install();
  const capture=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',output)),animations:'disabled'});
  const click=async name=>{await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(450);};
  const response=await page.goto(base+'#run');expect(response.status()).toBe(200);
  if(revision!=='local')await expect(page.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',revision);
  await page.addStyleTag({content:'body::before,#editor::before{content:"浏览器验收 · 时钟加速 · 非实际运动";position:fixed;top:0;left:0;right:0;z-index:99999;text-align:center;background:#282828;color:white;font:11px sans-serif;padding:3px;pointer-events:none}'});
  await capture('training');await click('调整专项与PB');await click('自定义成绩');await capture('pb-picker');await click('取消');
  async function choose(name,seconds){
    await click(name);await click('开始记录');const f=page.locator('#template-reference');
    await expect(page.locator('#workout-calibrate')).toHaveCount(0);
    await f.locator('[name=seconds]').fill(String(seconds));await f.locator('[name=confirm]').check();await click('使用课程编排');
    await page.locator('.executable-spec').scrollIntoViewIfNeeded();
  }
  await choose('200m 专项耐受',130);await capture('200m-detail');
  await click('开始记录');await click('确认并热身');await capture('warmup');
  for(const input of await page.locator('[data-warmup]').all())await input.check();
  await page.clock.fastForward(600000);await click('完成本阶段');await capture('lap-target');
  for(let i=0;i<10;i++){
    await page.clock.fastForward(32500);await click('完成本趟');
    if(i<9){if(!i){await capture('rep-recovery');await click('暂停计时');await capture('paused');await click('继续计时');}await page.clock.fastForward(120000);await click('恢复完成');}
  }
  await capture('cooldown');await page.clock.fastForward(600000);await click('完成本阶段');await capture('completed-log');await click('保存分段记录');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(document.querySelector('meta[name=breakwind-preview]')?'breakwind.preview.local.v1':'breakwind.local.v1')).runs);
  expect(saved).toHaveLength(1);expect(saved[0].distance).toBe(2);expect(saved[0].courseSession.status).toBe('complete');
  // Clear only this isolated browser test context's records to inspect the second candidate without inventing a recovery override.
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await click('调整专项与PB');await click('1500m');await click('4:20');await choose('500m 稳定间歇',265);await capture('1500m-detail');
  await click('返回课程');await click('按类型浏览');await click('组合课');await click('递减距离组合 · 资料候选');await capture('combination-candidate');
  await expect(page.getByRole('button',{name:'开始记录',exact:true})).toHaveCount(0);
  if(revision!=='local'){
    await page.evaluate(async()=>{await(await navigator.serviceWorker.ready).update();});
    await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('breakwind-preview-')))).toEqual(['breakwind-preview-'+revision]);
    expect(new Set(loadedModules.map(r=>r.name)).size).toBe(9);expect(loadedModules.every(r=>r.version===revision&&r.status===200)).toBe(true);
  }
  expect(errors).toEqual([]);
  const video=page.video();await context.close();await video.saveAs(fileURLToPath(new URL('execution-interaction.webm',output)));
  const result={revision,url:base,device:'Chromium iPhone 13 viewport; NOT physical iPhone',clock:'accelerated test clock, not a real workout',review:'pending independent coach review; arithmetic reference is not a dose validation',mainDistanceM:2000,completedSteps:saved[0].courseSession.logs.length,loadedModules,errors};
  await writeFile(new URL('verification.json',output),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
