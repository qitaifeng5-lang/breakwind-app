import {chromium,devices,expect} from '@playwright/test';
import {mkdir,writeFile,rename,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {pbCourses,pbWeek,weekContentStatus,contentGroups} from '../public/pb-library.js';
import {compileWorkout,templateSpecification,workoutTotals} from '../public/workout.js';
const sha=process.argv[2],base=process.argv[3]||'https://qitaifeng5-lang.github.io/breakwind-app/';
if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Expected exact deployed commit');
const dir=new URL('../.expo/content-preview/'+sha+'/',import.meta.url);await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:process.env.BREAKWIND_TEST_BROWSER||undefined});
const evidence=[],errors=[],responses=[];
const click=(p,n)=>p.getByRole('button',{name:n,exact:true}).click();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const checksum=buffer=>createHash('sha256').update(buffer).digest('hex');
try{
 // Compare actual deployed bytes to this commit's exported module bytes before any accelerated clock.
 const assetChecks=[];
 for(const name of ['index.html','styles.css','app.js','pb-library.js','workout.js','workout-ui.js','engine.js','model.js','running.js','fuel.js','knowledge.js','sw.js']){
  const r=await fetch(base+name+(name==='index.html'||name==='sw.js'?'':'?v='+sha));if(!r.ok)throw Error(name+' HTTP '+r.status);
  const actual=Buffer.from(await r.arrayBuffer()),expected=await readFile(new URL('../.expo/pages-preview/'+name,import.meta.url));expect(checksum(actual)).toBe(checksum(expected));assetChecks.push({name,sha256:checksum(actual)});
 }
 for(const item of [{event:'800 m',group:'base',id:'tempo'},{event:'1500 m',group:'advanced',id:'tempo-continuous'},{event:'800 m',group:'competitive',id:'endurance'},{event:'1500 m',group:'advanced',id:'combination-development'}]){
  const key=sha.slice(0,8)+'-'+item.event.replace(' m','m')+'-'+item.group+'-'+item.id;
  const context=await browser.newContext({...devices['iPhone 13'],locale:'zh-CN',reducedMotion:'reduce',recordVideo:{dir:fileURLToPath(dir),size:{width:390,height:844}}});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(new URL(r.url()).pathname.endsWith('.js'))responses.push({url:r.url(),status:r.status()});});
  await p.clock.install();await p.goto(base+'#run');await expect(p.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',sha);
  await click(p,'调整专项与PB');await click(p,item.event==='800 m'?'800m':'1500m');await click(p,contentGroups[item.group]+'组');await click(p,'查看课程');
  const c=pbCourses(item.event,null,{group:item.group}).find(c=>c.id===item.id);
  if(item.group!=='competitive'){
   await click(p,'周安排草案');await click(p,'调整阶段');await click(p,'基础期');await expect(p.locator('.week-purpose[role=status]')).toContainText('内容编排齐全');
   await p.screenshot({path:fileURLToPath(new URL(key+'-base-week.png',dir))});await click(p,'单节训练');
  }
  await p.screenshot({path:fileURLToPath(new URL(key+'-catalog.png',dir))});
  if(item.id==='tempo'){
   await click(p,'调整专项与PB');await click(p,'自定义成绩');
   await expect(p.getByRole('dialog').locator('input:visible')).toHaveCount(0);
   await p.screenshot({path:fileURLToPath(new URL(key+'-pb-picker.png',dir))});await click(p,'取消');
  }
  const card=p.locator('[data-course-id="'+item.id+'"]');await expect(card).toContainText(c.main);await card.getByRole('button',{name:c.name,exact:true}).click();
  let spec=c.prescription;
  if(!spec){
   await click(p,'开始记录');const f=p.locator('#template-reference'),bases=c.targetBases||[c.targetBasis],refs={};
   for(const basis of bases){const suffix=bases.length>1?basis:'';await f.locator('[name=seconds'+suffix+']').fill(basis==='800'?'130':'270');const date=await f.locator('[name=date'+suffix+']').inputValue();refs[basis]={event:basis+' m',kind:'achieved',date,seconds:basis==='800'?130:270};}
   await f.locator('[name=confirm]').check();await click(p,'使用课程编排');spec=templateSpecification(c,refs);
  }
  await expect(p.locator('.course-version').first()).toContainText(sha.slice(0,8));await expect(p.locator('.course-version').first()).toContainText(item.id);
  await p.locator('.course-version').first().scrollIntoViewIfNeeded();await sleep(250);await p.screenshot({path:fileURLToPath(new URL(key+'-'+c.phase+'-detail.png',dir))});
  await click(p,'开始记录');await click(p,'确认并热身');
  for(const [index,step] of compileWorkout(spec).entries()){
   for(const check of await p.locator('[data-warmup]').all())await check.check();
   if(index===1){await sleep(250);await p.screenshot({path:fileURLToPath(new URL(key+'-'+c.phase+'-timer.png',dir))});}
   await p.clock.fastForward((step.durationSeconds||step.target?.targetSecondsRange?.[1]||0)*1000);await sleep(100);
   await click(p,step.kind==='work'?'完成本趟':step.kind==='recovery'?'恢复完成':'完成本阶段');
  }
  await expect(p.getByRole('dialog')).toContainText('完整结束');await sleep(250);await p.screenshot({path:fileURLToPath(new URL(key+'-'+c.phase+'-report.png',dir))});await click(p,'保存分段记录');
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.preview.local.v1')).runs.at(-1));
  expect(saved.courseSession.course.id).toBe(c.id);expect(saved.courseSession.course.event).toBe(c.event);expect(saved.courseSession.course.build).toBe(sha);
  expect(saved.courseSession.logs.map(l=>[l.step.kind,l.step.distanceM||null,l.step.durationSeconds||null,l.step.mode||null])).toEqual(compileWorkout(spec).map(s=>[s.kind,s.distanceM||null,s.durationSeconds||null,s.mode||null]));
  expect(saved.courseSession.spec.repetitions.map(r=>[r.durationSeconds||null,r.distanceM||null,r.repsPerSet,r.repRecovery])).toEqual(spec.repetitions.map(r=>[r.durationSeconds||null,r.distanceM||null,r.repsPerSet,r.repRecovery]));
  await p.evaluate(async()=>{await(await navigator.serviceWorker.ready).update();});
  await expect.poll(()=>p.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('breakwind-preview-')))).toEqual(['breakwind-preview-'+sha]);
  const entry={sha,...item,phase:c.phase,route:base+'#run',contentRevision:c.catalogRevision,structure:spec,totals:workoutTotals(spec),saved,week:item.group==='competitive'?null:weekContentStatus(pbWeek(item.event,null,{group:item.group,phase:'base'})),video:key+'.webm',screenshotPrefix:key};
  const video=p.video();await context.close();await rename(await video.path(),new URL(entry.video,dir));evidence.push(entry);
 }
 expect(errors).toEqual([]);
 expect(responses.filter(r=>!r.url.includes('/sw.js')).every(r=>new URL(r.url).searchParams.get('v')===sha&&r.status===200)).toBe(true);
 await writeFile(new URL('manifest.json',dir),JSON.stringify({sha,base,testing:'Actual HTTPS Chromium/Edge mobile viewport; accelerated exercise clock; NOT physical iPhone or real running',errors,assetChecks,evidence},null,2));
 console.log(JSON.stringify({sha,base,verified:evidence.map(e=>[e.event,e.id,e.totals]),output:fileURLToPath(dir),errors}));
}finally{await browser.close();}
