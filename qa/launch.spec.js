import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {nativeLaunchBootstrap} from '../native/launch-storage.js';
import {fresh} from '../public/model.js';
import {buildProgram,saveProgram} from '../public/program.js';
import {applyTestTransaction} from '../public/membership.js';
const click=(p,n)=>p.getByRole('button',{name:n,exact:true}).click({timeout:10000}),day='2026-11-12';
async function entry(page,native,values={},nativeOptions={}){
 await page.clock.setFixedTime(new Date(day+'T15:00:00Z'));
 await page.addInitScript(()=>{window.__gpsCalls=0;Object.defineProperty(navigator,'geolocation',{value:{watchPosition:()=>{window.__gpsCalls++;throw Error('GPS must not start');},getCurrentPosition:()=>{window.__gpsCalls++;}}});});
 if(native){const source=await readFile('.expo/native-shell.html','utf8');await page.addInitScript(()=>{window.ReactNativeWebView={postMessage:text=>{const m=JSON.parse(text);if(m.type==='export')window.__exported=m;if(m.type==='persist'){window.__persisted=m.values;window.__nativeAck?.(m.revision,null);}}};});await page.route('**/native-test',r=>r.fulfill({contentType:'text/html',body:source.replace('/*__BREAKWIND_NATIVE_BOOT__*/',()=>nativeLaunchBootstrap(values,'browser-native-contract',nativeOptions))}));await page.goto('/native-test#run');}
 else {await page.addInitScript(v=>{for(const [k,value]of Object.entries(v))localStorage.setItem(k,value);},values);await page.goto('/#run');}
}
test('release native shell exposes free features with no membership simulator',async({page})=>{
 await entry(page,true);
 await expect(page.getByRole('button',{name:'单节训练',exact:true})).toBeVisible();
 await click(page,'本周计划');await expect(page.getByRole('button',{name:'下一周',exact:true})).toBeVisible();
 await expect(page.locator('[data-action="program-new"],[data-action="program-vip"],[data-action^="program-test:"],[data-action="program-history"]')).toHaveCount(0);
 await page.locator('a[href="#food"]:visible').click();await click(page,'添加午餐');
 await expect(page.getByRole('searchbox')).toBeVisible();
});
test('release native shell reads and exports all saved plans without a simulated transaction',async({page})=>{
 const s=fresh(),now=Date.parse(day+'T15:00Z');
 s.membershipTest=applyTestTransaction(null,{id:'internal',mode:'experience',sequence:1,type:'success',expiresAt:now+30*86400000});
 for(const [id,length]of [['earlier',8],['later',12]]){
   saveProgram(s,buildProgram({event:'1500 m',length,startDate:day}),{mode:'experience',now,id});
 }
 await entry(page,true,{'breakwind.local.v1':JSON.stringify(s)});
 await click(page,'已保存的长期计划');await expect(page.locator('[data-action^="program-history-open:"]')).toHaveCount(2);
 await click(page,'1500 m · '+day+' · 8周');await expect(page.locator('.week-outline li')).toHaveCount(8);
 await expect(page.locator('[data-action="program-new"],[data-action="program-vip"]')).toHaveCount(0);
 await page.locator('[data-action="program-week:0"]').click();await expect(page.locator('[data-action^="program-course:"]').first()).toBeVisible();
 await expect(page.locator('[data-action="program-adjust"],[data-action="program-arrange"]')).toHaveCount(0);
 await click(page,'导出本人周期');
 const result=await page.evaluate(()=>({name:window.__exported.name,state:JSON.parse(localStorage.getItem('breakwind.local.v1'))}));
 expect(result.name).toBe('breakwind-program-earlier.json');expect(result.state.programs).toEqual(s.programs);expect(result.state.membershipTest).toEqual(s.membershipTest);
});
for(const [build,nativeOptions]of [
 ['debug',{development:true}],
 ['internal-only TestFlight release',{development:false,internalTestFlight:true}]
])test(build+' shell exposes the internal membership simulation',async({page})=>{
 await entry(page,true,{},nativeOptions);await click(page,'长期训练 · 体验');
 await page.locator('#program-create [name=event]').selectOption('3000 m');
 await click(page,'预览整个周期');await click(page,'VIP 测试状态');await click(page,'启用本地体验');
 await expect(page.locator('#editor')).toContainText('体验有效');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).membershipTest.mode)).toBe('experience');
});
for(const native of [false,true])test((native?'bundled iOS entry contract':'web entry')+' supports schedule → move → explicit completion and rice → lunch → history without tracking',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await entry(page,native);
 await expect(page.locator('#bottom-nav a')).toHaveText(['训练','饮食']);await expect(page.getByRole('button',{name:/开始跑步|开始训练|开始记录|继续计时/})).toHaveCount(0);
 await click(page,'调整专项与PB');await click(page,'1500m');await click(page,'查看课程');await click(page,'按类型浏览');await click(page,'间歇');await click(page,'500m 稳定间歇');await expect(page.locator('.phase-card h3')).toHaveText(['热身','主训练','休息安排','冷身']);await click(page,'加入课表');await click(page,'500m 稳定间歇');await click(page,'查看课表');await click(page,'改期／改时');await page.locator('#launch-move [name=date]').fill('2026-11-13');await click(page,'保存时间');await click(page,'记录完成情况');await page.getByLabel('完成',{exact:true}).check();await click(page,'保存完成情况');await expect(page.locator('.form-error')).toContainText('未来');await click(page,'返回');await click(page,'放弃修改');await click(page,'改期／改时');await page.locator('#launch-move [name=date]').fill(day);await click(page,'保存时间');await click(page,'记录完成情况');await page.getByLabel('部分完成',{exact:true}).check();await page.getByLabel('备注（可选）').fill('只完成已确认的部分');await click(page,'保存完成情况');await expect(page.locator('#editor')).toContainText('部分完成');
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(s.plans).toHaveLength(1);expect(s.plans[0].trainingOutcome.source).toBe('user-report');expect(s.runs).toHaveLength(0);await page.screenshot({path:info.outputPath(native?'ios-completion.png':'web-completion.png')});
 await click(page,'返回');await page.locator('a[href="#food"]:visible').click();await click(page,'添加午餐');await expect(page.getByRole('button',{name:'拍照识别',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'扫码',exact:true})).toHaveCount(0);await page.getByRole('searchbox').fill('米饭');await page.getByRole('button',{name:/^白米饭（熟）/}).click();await click(page,'按克输入');await click(page,'150 g');await click(page,'保存到午餐');await expect(page.locator('.meal-list')).toContainText('白米饭');await page.screenshot({path:info.outputPath(native?'ios-food.png':'web-food.png')});
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(stored.food).toHaveLength(1);expect(stored.food[0].meal).toBe('午餐');expect(stored.runs).toHaveLength(0);if(native)expect(await page.evaluate(()=>JSON.parse(window.__persisted['breakwind.local.v1']).food.length)).toBe(1);else{await page.reload();await expect(page.locator('.meal-list')).toContainText('白米饭');}
 expect(await page.evaluate(()=>window.__gpsCalls)).toBe(0);expect(errors).toEqual([]);
});
test('long program review advances from user reports with no player, no fabricated runs and no backfill',async({page})=>{
 const s=fresh(),now=Date.parse(day+'T15:00Z');s.membershipTest=applyTestTransaction(null,{id:'experience',mode:'experience',sequence:1,type:'success',expiresAt:now+30*86400000});const p=saveProgram(s,buildProgram({event:'1500 m',length:8,startDate:day}),{mode:'experience',now,id:'long'});const course=p.weeks[0].courses.find(c=>c.id!=='rest');s.plans=[{id:'lesson',date:day,name:course.name,type:'阈值跑',course,programId:p.programId,programWeek:0,programDay:0}];await entry(page,false,{'breakwind.local.v1':JSON.stringify(s)});
 await click(page,'长期计划');await page.locator('[data-action="program-course:0"]').click();await click(page,'查看课表');await click(page,'记录完成情况');await page.getByLabel('完成',{exact:true}).check();await click(page,'保存完成情况');await click(page,'返回');await click(page,'长期计划');await click(page,'阶段复盘／推进');await expect(page.locator('#editor')).toContainText('用户记录完成1课');await expect(page.locator('#editor')).toContainText('关联运动历史0条');await click(page,'确认复盘并推进');const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(after.programs[0].cursor).toBe(1);expect(after.plans).toHaveLength(1);expect(after.runs).toHaveLength(0);
});

test('legacy web draft is stopped, archived exactly once and exported without invented distance',async({page})=>{
 const draft={started:1,elapsed:0,anchor:1,points:[],mode:'gps'};
 await page.addInitScript(d=>sessionStorage.setItem('breakwind.run.draft',JSON.stringify(d)),draft);
 await entry(page,false);await click(page,'处理旧记录草稿');await expect(page.locator('#editor')).toContainText('定位已停止');await click(page,'结束并核对保存');
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));expect(s.runs).toHaveLength(0);expect(s.legacyDraftArchives).toHaveLength(1);expect(s.legacyDraftArchives[0].snapshot).toEqual({...draft,anchor:null});expect(await page.evaluate(()=>sessionStorage.getItem('breakwind.run.draft'))).toBeNull();expect(await page.evaluate(()=>window.__gpsCalls)).toBe(0);
 await click(page,'个人与设置');await click(page,'旧记录草稿归档');await page.locator('#editor summary').click();await expect(page.locator('#editor pre')).toContainText('"elapsed": 0');const download=page.waitForEvent('download');await click(page,'导出全部归档');expect((await download).suggestedFilename()).toBe('breakwind-legacy-archives.json');
});
