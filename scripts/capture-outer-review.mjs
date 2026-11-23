import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [base,sha]=process.argv.slice(2),out='.expo/outer-review/'+sha.slice(0,8);
if(!base||!sha)throw Error('Pass a running preview URL and commit');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.BREAKWIND_TEST_BROWSER||'msedge'}),results=[];
try{for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small',375,812],['large',430,932],['compact',320,568]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:name==='phone'?3:1,isMobile:width<800,hasTouch:width<800,locale:'zh-CN',timezoneId:'America/Toronto',reducedMotion:'no-preference',...(name==='phone'?{recordVideo:{dir:out,size:{width,height}}}:{})});
 const p=await context.newPage(),errors=[];const shot=async options=>{await p.evaluate(()=>Promise.all(document.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await p.screenshot(options);};p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-11-12T15:00:00Z'));
 await p.goto(base+'?build='+sha+'#run');const preview=await p.locator('meta[name=breakwind-preview]').count(),prefix=preview?'breakwind.preview':'breakwind';
 if(preview)await expect(p.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',sha);
 await p.evaluate(({prefix})=>localStorage.setItem(prefix+'.pb-catalog',JSON.stringify({event:'800 m',group:'competitive',mode:'week',pb:'2:10',phase:'develop'})),{prefix});await p.reload();
 await shot({path:out+'/'+name+'-week.png'});
 const row=p.locator('.outer-week>li[data-course-id="endurance"]');await row.scrollIntoViewIfNeeded();await shot({path:out+'/'+name+'-week-content.png'});
 const position=await p.evaluate(()=>window.scrollY);await row.locator('h3 button').click();await expect(p.locator('.phase-card h3')).toHaveText(['热身','主训练','休息安排','冷身']);await shot({path:out+'/'+name+'-detail.png'});
 await p.getByRole('tab',{name:'说明',exact:true}).click();await p.getByText('查看说明',{exact:true}).click();await p.getByRole('tab',{name:'适用与来源',exact:true}).click();await p.getByRole('button',{name:'返回',exact:true}).click();expect(Math.abs(await p.evaluate(()=>window.scrollY)-position)).toBeLessThan(8);
 await p.getByRole('button',{name:'单节训练',exact:true}).click();await p.evaluate(()=>window.scrollTo(0,0));await shot({path:out+'/'+name+'-single.png'});
 await p.locator('.course-card[data-course-id="endurance"] h3 button').click();await p.getByRole('button',{name:'加入课表',exact:true}).click();await p.getByRole('button',{name:'返回训练',exact:true}).click();await p.evaluate(()=>window.scrollTo(0,0));await expect(p.locator('#toast')).not.toBeVisible();await shot({path:out+'/'+name+'-home.png'});
 await p.getByRole('button',{name:'调整专项与PB',exact:true}).click();await p.getByRole('button',{name:'自定义成绩',exact:true}).click();await shot({path:out+'/'+name+'-pb.png'});await p.getByRole('button',{name:'取消',exact:true}).click();
 await p.getByRole('button',{name:'日历与时间',exact:true}).click();await expect(p.getByRole('heading',{name:'训练与日程',exact:true})).toBeVisible();await shot({path:out+'/'+name+'-calendar.png'});
 await p.locator('a[href="#food"]:visible').click();await expect(p.getByRole('heading',{name:'饮食',exact:true})).toBeVisible();await shot({path:out+'/'+name+'-food.png'});
 await p.getByRole('button',{name:'添加午餐',exact:true}).click();await p.getByRole('searchbox').fill('米饭');await p.getByRole('button',{name:/^白米饭（熟）/}).click();await p.getByRole('button',{name:'150 g',exact:true}).click();await p.getByRole('button',{name:'保存到午餐',exact:true}).click();await expect(p.locator('.meal-list')).toContainText('白米饭');await p.evaluate(()=>window.scrollTo(0,0));await expect(p.locator('#toast')).not.toBeVisible();await shot({path:out+'/'+name+'-food-recorded.png'});
 const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);
 results.push({name,width,height,overflow,errors});const video=p.video();await context.close();if(video)await video.saveAs(out+'/phone-flow.webm');
}}
finally{await browser.close();}
if(base.startsWith('https:')){
 process.env.GITHUB_SHA=sha;const {assets}=await import('./export-preview.mjs');const resources=[];
 for(const file of assets){const response=await fetch(base+file+'?v='+sha);if(!response.ok)throw Error(file+' '+response.status);const actual=Buffer.from(await response.arrayBuffer()),expected=await readFile('.expo/pages-preview/'+file),hash=b=>createHash('sha256').update(b).digest('hex');expect(hash(actual),file).toBe(hash(expected));resources.push({file,sha256:hash(actual)});}
 await writeFile(out+'/resources.json',JSON.stringify(resources,null,2));
}
await writeFile(out+'/manifest.json',JSON.stringify({sha,base,results,course:{event:'800 m',group:'competitive',phase:'develop',id:'endurance'},physicalIPhone:false,privateUserData:false,testInputs:"Isolated browser: one catalog lesson scheduled and 150g cooked rice entered through real UI; not the user’s personal records"},null,2));
console.log(out);
