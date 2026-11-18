import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {fresh} from '../public/model.js';
import {storageBootstrap} from '../native/launch-storage.js';
import {applyTestTransaction} from '../public/membership.js';
const day='2026-11-18',now=Date.parse(day+'T15:00:00Z');
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
for(const native of [false,true])test((native?'native web bundle':'web')+' school program → schedule → feedback → safe adjustment',async({page},info)=>{
 test.setTimeout(90000);await page.clock.setFixedTime(new Date(now));
 const s=fresh();s.cycleProfile={age:'未满18岁',schoolStage:'senior'};
 s.membershipTest=applyTestTransaction(null,{id:'test',mode:'experience',sequence:1,type:'success',expiresAt:now+30*86400000});
 const values={'breakwind.local.v1':JSON.stringify(s),'breakwind.pb-catalog':JSON.stringify({event:'1500 m',pb:270,group:'competitive',phase:'develop'})};
 if(native){
  const source=await readFile('.expo/native-shell.html','utf8');
  await page.addInitScript(()=>{window.ReactNativeWebView={postMessage:text=>{const m=JSON.parse(text);if(m.type==='persist')window.__nativeAck?.(m.revision,null);}};});
  await page.route('**/school-native',r=>r.fulfill({contentType:'text/html',body:source.replace('/*__BREAKWIND_NATIVE_BOOT__*/',()=>storageBootstrap(values,'school-contract'))}));
  await page.goto('/school-native#run');
 }else{await page.addInitScript(v=>{for(const [k,val]of Object.entries(v))localStorage.setItem(k,val);},values);await page.goto('/#run');}
 await click(page,'长期训练 · 体验');await expect(page.locator('[name=population]')).toHaveValue('senior');
 await page.locator('[name=length]').selectOption('8');await click(page,'预览整个周期');
 await expect(page.locator('#editor .week-outline li')).toHaveCount(8);
 await click(page,'保存体验周期');await click(page,'安排这一周');
 let data=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
 expect(data.programs[0].population).toBe('youth-senior');expect(data.plans).toHaveLength(4);
 expect(data.programs[0].weeks[1].courses[1].prescription.repetitions[0].repsPerSet).toBe(6);
 await page.locator('[data-action="program-course:0"]').click();
 await expect(page.locator('.phase-card h3')).toHaveText(['热身','主训练','休息安排','冷身']);
 await page.screenshot({path:info.outputPath(native?'school-native-detail.png':'school-web-detail.png'),fullPage:true});
 await click(page,'查看课表');await click(page,'记录完成情况');await page.getByLabel('部分完成',{exact:true}).check();
 await page.getByText('用时与恢复（可选）',{exact:true}).click();
 await page.locator('[name=actualMinutes]').fill('25');await page.locator('[name=effort]').fill('8');await page.locator('[name=fatigue]').fill('5');
 await click(page,'保存完成情况');await click(page,'返回');await click(page,'长期计划');
 await click(page,'调整未来一周');await click(page,'根据实际记录预览调整');
 await expect(page.locator('#editor')).toContainText('近期恢复不足');await click(page,'确认调整');
 data=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
 expect(data.programs[0].weeks[1].phase).toBe('recover');expect(data.runs).toHaveLength(0);
 expect(data.plans[0].trainingOutcome.actualMinutes).toBe(25);
 expect(data.programs[0].weeks[1].courses.every(c=>!c.quality)).toBe(true);
 await expect(page.getByRole('button',{name:/开始跑步|开始训练/})).toHaveCount(0);
});

test('5km single and week detail use achieved 5km performance, never browsing PB or estimated Tempo',async({page})=>{
 await page.clock.setFixedTime(new Date(now));const s=fresh();s.records=[{id:'pb',event:'5 km',seconds:1200,date:day,kind:'achieved'}];
 await page.addInitScript(data=>{localStorage.setItem('breakwind.local.v1',JSON.stringify(data));localStorage.setItem('breakwind.pb-catalog',JSON.stringify({event:'5000 m',pb:900,group:'competitive',phase:'develop'}));},s);
 await page.goto('/#run');await click(page,'1000m 专项节奏重复');await expect(page.locator('[data-phase=work]')).toContainText('240秒/小组');
 await click(page,'返回');await click(page,'本周计划');await page.locator('.week-outline button').filter({hasText:'1000m 专项节奏重复'}).first().click();
 await expect(page.locator('#editor')).toContainText('240秒/小组');
});

test('optional recent training baseline is preview-only until save and preserves the competitive group',async({page})=>{
 await page.clock.setFixedTime(new Date(now));const s=fresh();s.membershipTest=applyTestTransaction(null,{id:'test',mode:'experience',sequence:1,type:'success',expiresAt:now+30*86400000});
 await page.addInitScript(data=>{localStorage.setItem('breakwind.local.v1',JSON.stringify(data));localStorage.setItem('breakwind.pb-catalog',JSON.stringify({event:'800 m',pb:130,group:'competitive',phase:'develop'}));},s);
 await page.goto('/#run');await click(page,'长期训练 · 体验');
 await page.getByText('近期训练量（可选）',{exact:true}).click();
 await page.locator('[name=weeklyDays]').fill('3');await page.locator('[name=recentKm]').fill('24');await page.locator('[name=recentLongest]').fill('9');
 await click(page,'预览整个周期');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')).cycleProfile)).toBeNull();
 await click(page,'保存体验周期');await click(page,'安排这一周');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('breakwind.local.v1')));
 expect(stored.cycleProfile.weeklyDays).toBe(3);expect(stored.programs[0].cohort).toBe('competitive');expect(stored.plans).toHaveLength(3);
 expect(stored.programs[0].weeks.every(w=>w.courses.filter(c=>c.id!=='rest').length<=3)).toBe(true);
});
