import {chromium,devices,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const sha=process.argv[2],base=process.argv[3]||'https://qitaifeng5-lang.github.io/breakwind-app/';
if(!/^[a-f0-9]{40}$/.test(sha||''))throw new Error('Expected deployment SHA');
const output=new URL('../.expo/tempo-preview/'+sha+'/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.BREAKWIND_TEST_BROWSER||undefined,args:['--disable-gpu']});
try{
 const page=await browser.newPage({...devices['iPhone 13'],locale:'zh-CN',reducedMotion:'reduce'}),errors=[],modules=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const u=new URL(r.url());if(u.pathname.endsWith('.js')&&!u.pathname.endsWith('/sw.js'))modules.push({path:u.pathname,version:u.searchParams.get('v'),status:r.status()});});
 await page.clock.install();await page.goto(base+'#run');await expect(page.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',sha);
 const click=name=>page.getByRole('button',{name,exact:true}).click();
 await click('周安排草案');await click('调整阶段');await click('基础期');await expect(page.locator('.week-purpose[role=status]')).toContainText('已编排 1 个训练位');
 await page.screenshot({path:fileURLToPath(new URL('week-draft.png',output))});
 await click('单节训练');await click('按类型浏览');await click('Tempo／阈值');await click('分段 Tempo · 3×5分钟');
 await expect(page.locator('.execution-line')).toContainText('3×5分钟｜Tempo');await page.locator('.executable-spec').scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('tempo-detail.png',output))});
 await click('开始记录');await expect(page.locator('#workout-calibrate,#template-reference')).toHaveCount(0);await click('确认并热身');
 for(const input of await page.locator('[data-warmup]').all())await input.check();await page.clock.fastForward(600000);await click('完成本阶段');
 for(let i=0;i<3;i++){await page.clock.fastForward(300000);await click('完成本趟');if(i<2){await page.clock.fastForward(60000);await click('恢复完成');}}
 await page.clock.fastForward(600000);await click('完成本阶段');await expect(page.getByRole('dialog')).toContainText('距离未测量');await click('保存分段记录');
 const run=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.preview.local.v1')).runs.at(-1));expect(run.distanceMeasured).toBe(false);expect(run.courseSession.logs).toHaveLength(7);
 await page.evaluate(async()=>{await(await navigator.serviceWorker.ready).update();});await expect.poll(()=>page.evaluate(async()=> (await caches.keys()).filter(k=>k.startsWith('breakwind-preview-')))).toEqual(['breakwind-preview-'+sha]);
 expect(modules.every(m=>m.version===sha&&m.status===200)).toBe(true);expect(new Set(modules.map(m=>m.path)).size).toBe(9);expect(errors).toEqual([]);
 const result={sha,base,modules,errors,completedSteps:run.courseSession.logs.length,actualWorkSeconds:run.completedWorkSeconds,distanceMeasured:run.distanceMeasured,testing:'Chromium iPhone viewport, accelerated clock; NOT physical iPhone or real exercise'};
 await writeFile(new URL('verification.json',output),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
