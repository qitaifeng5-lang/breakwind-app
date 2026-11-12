import {chromium,devices,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=process.argv[2],base=process.argv[3]||'https://qitaifeng5-lang.github.io/breakwind-app/';
if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Expected full commit');
const out='.expo/launch-evidence/'+sha;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.BREAKWIND_TEST_BROWSER||undefined});
const checks=[];
try{for(const mobile of [false,true]){
 const context=await browser.newContext({...mobile?devices['iPhone 13']:{viewport:{width:1440,height:900}},locale:'zh-CN',timezoneId:'America/Toronto',reducedMotion:'no-preference',recordVideo:mobile?{dir:out,size:{width:390,height:844}}:undefined});
 const page=await context.newPage(),errors=[],modules=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('.js')&&!r.url().includes('/sw.js'))modules.push(r.url());});
 await page.clock.setFixedTime(new Date('2026-11-12T15:00:00Z'));await page.goto(base+'?build='+sha+'#run');await expect(page.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',sha);await expect(page.locator('#bottom-nav a')).toHaveText(['训练','饮食']);
 const click=async name=>{await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(320);};
 const shot=async name=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await page.screenshot({path:out+'/'+(mobile?'phone':'desktop')+'-'+name+'.png',animations:'disabled'});};
 await click('调整专项与PB');await click('1500m');await click('4:20');await shot('training');await click('500m 稳定间歇');await expect(page.locator('.phase-card h3')).toHaveText(['热身','主训练','恢复说明','冷身']);await expect(page.getByRole('button',{name:'开始训练',exact:true})).toHaveCount(0);await shot('detail');
 await page.getByRole('tab',{name:'说明',exact:true}).click();await page.waitForTimeout(350);await page.getByRole('tab',{name:'训练内容',exact:true}).click();await click('加入课表');await click('500m 稳定间歇');await click('查看课表');await click('改期／改时');await page.locator('#launch-move [name=start]').fill('18:30');await click('保存时间');await click('记录完成情况');await page.getByLabel('部分完成',{exact:true}).check();await click('保存完成情况');await expect(page.locator('#editor')).toContainText('部分完成');await shot('completion');await click('返回');
 await page.locator((mobile?'#bottom-nav':'#sidebar')+' a[href="#food"]').click();await click('添加午餐');await page.getByRole('searchbox').fill('米饭');await page.getByRole('button',{name:/^白米饭（熟）/}).click();await click('150 g');await shot('portion');await click('保存到午餐');await expect(page.locator('.meal-list')).toContainText('白米饭');await shot('food');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.preview.local.v1')));expect(stored.runs).toHaveLength(0);expect(stored.plans[0].trainingOutcome.source).toBe('user-report');expect(stored.food[0].grams).toBe(150);expect(errors).toEqual([]);expect(modules.every(u=>new URL(u).searchParams.get('v')===sha)).toBe(true);
 checks.push({mode:mobile?'browser-iPhone-390x844':'browser-desktop-1440x900',errors,modules,userFeedback:true,food:true,realDevice:false});
 if(mobile){await page.evaluate(async()=>{await(await navigator.serviceWorker.ready).update();});await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('breakwind-preview-')))).toEqual(['breakwind-preview-'+sha]);}
 await context.close();
 }
 const hashes=[];for(const name of ['index.html','app.js','model.js','completion.js','styles.css','coach-ui.js','program.js','program-ui.js','workout-ui.js','workout-detail.js','sw.js']){
  const response=await fetch(base+name+'?v='+sha);if(!response.ok)throw Error('HTTP '+response.status+' '+name);const remote=Buffer.from(await response.arrayBuffer()),local=await readFile('.expo/pages-preview/'+name);const hash=b=>createHash('sha256').update(b).digest('hex');expect(hash(remote),name).toBe(hash(local));hashes.push({name,sha256:hash(remote)});
 }
 await writeFile(out+'/verification.json',JSON.stringify({sha,base,checks,hashes},null,2));console.log(JSON.stringify({sha,base,passed:true,out}));
}finally{await browser.close();}
