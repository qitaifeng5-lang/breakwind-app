import {writeFile} from 'node:fs/promises';
import {courseCoverage,pbWeek,contentGroups,coursePhases,courseCategories,courseContentComplete,contentRevision,competitiveRevision} from '../public/pb-library.js';
import {templateSpecification,workoutTotals} from '../public/workout.js';
const rows=courseCoverage();
let text='# PR #13 课程覆盖表\n\n对应复核评论 6755098785。竞技内容版本：'+competitiveRevision+'。此表由正式课程数据生成，编排完整不等于独立审核或当日执行许可。\n\n';
text+='|专项|组别|阶段|整周内容|本阶段已完成编排的课类与ID|尚缺完整编排的课类|\n|---|---|---|---|---|---|\n';
for(const r of rows)text+='|'+[r.event,contentGroups[r.group],coursePhases[r.phase],r.week.complete?'完整周草案':'未完整（'+r.week.filled+'个训练位已编排）',r.categories.filter(c=>c.complete.length).map(c=>courseCategories[c.category]+': '+c.complete.join(', ')).join('；')||'无',r.categories.filter(c=>!c.complete.length).map(c=>courseCategories[c.category]).join('、')].join('|')+'|\n';
text+='\n“尚缺”指该组/阶段的完整候选内容，不意味着每周必须安排所有课类。恢复周有意没有质量主课。完整周覆盖成人基础组基础衔接/恢复周，成人进阶组基础/专项巩固/恢复周，两专项分别有明确身份；不是把不同组模板拼在一起。成人竞技四阶段已补齐候选周；青少年竞技保持独立审议框架，尚无完整适龄执行课表。\n\n';
text+='## 代表周：成人基础组基础衔接\n\n两专项共享支持性结构，因为本周目的为一般基础衔接，不声称两者的专项训练体系相同。共同前提：已有稳定五课周，耐受每次列明时长及15分钟同类Tempo；不是零基础或伤后复出周。全周137分30秒，含热身、主训练、步行/慢跑恢复及冷身；主课仅一次Tempo。按时间记录的距离未知。\n\n|日|课次ID|课程|完整结构|\n|---|---|---|---|\n';
for(const c of pbWeek('800 m',130,{group:'base',phase:'base'}))text+='|'+[c.dayLabel,c.id,c.name,c.id==='rest'?c.relation:c.prescription.warmup[0].durationSeconds/60+'分钟热身；'+c.main+'；'+(c.loadSummary.recoverySeconds?c.loadSummary.repRecoveries+'次趟间恢复合计'+c.loadSummary.recoverySeconds+'秒':'无趟间或组间恢复')+'；'+c.prescription.cooldown[0].durationSeconds/60+'分钟冷身'].join('|')+'|\n';
text+='\n进阶基础周：周二/周日各35分钟有氧；周四为20分钟连续Tempo（热身冷身各10分钟）；其余同组支持课不变，全周150分30秒。进阶专项巩固周：周四替换为800m的10×200或1500m的3×500，其余为该进阶组支持课；实际总时长须用同项已达成绩校准，不能从浏览PB伪造。恢复周仅两次20分钟恢复跑和一次20分30秒技术课，共60分30秒，强调主动减量，不冒充常规发展周。\n\n';
text+='## 四种状态\n\n- 来源核对：完整候选已核对对应资料的参数支持范围，产品改编和证据局限单独记录。\n- 编排完成：包含真实热身、主训练、目标、全部恢复及冷身，且与卡片/计时/报告算术一致；无空槽。\n- 独立审核：全部仍待独立教练审核，reviewer为空，不使用认证文案。\n- 当前可执行：单课需适用背景、成绩校准（距离课）、当日伤痛与恢复检查；整周不自动执行。既有疼痛、未恢复、青少年保护没有移除。\n\n';
text+='## 阶段衔接\n\n不按PB提高自动加量，也不按完成打卡自动升级。基础组分段衔接与进阶连续Tempo是不同既有耐受人群，不能从15分钟直接推导20分钟资格。进入专项巩固须具备该专项重复负荷经验，用专项课替换Tempo，不额外叠加。速度耐力或双节奏组合作为专项后段替代候选，不与其他质量主课挤在同一周。恢复不足保留低负荷/休息，疼痛另行评估。成人竞技赛前采用D-7至D-1训练块，日期绑定仍由用户在日程中选择；基础/进阶的赛前缺口保留。\n';
text+='\n## 成人竞技组：完整四阶段周\n\n适用人群：已有六课周、两种质量刺激、相近专项负荷的成人俱乐部中跑者；800m限定有氧与速度均衡型。不是所有竞技者的默认剂量，不覆盖纯400/800型、精英双练或青少年。表中同项均速仅用800m=130秒、1500m=270秒作算术核验，不是默认用户成绩。时间包含热身和全部恢复，不代表生理负荷等价；距离未知的低强度段不伪造周公里数。\n';
const refs={mile:{event:'1 mile',seconds:300,date:'2026-11-10',kind:'achieved'},'800':{event:'800 m',seconds:130,kind:'achieved'},'1500':{event:'1500 m',seconds:270,kind:'achieved'}};
for(const event of ['800 m','1500 m'])for(const phase of Object.keys(coursePhases)){
 const week=pbWeek(event,null,{group:'competitive',phase});let seconds=0;
 text+='\n### '+event+' · '+coursePhases[phase]+'\n\n'+week[0].weekPurpose+'\n\n|日|课次|主段与目标|全部恢复|准备/冷身|周内关系|\n|---|---|---|---|---|---|\n';
 for(const c of week){if(c.id==='rest'){text+='|'+c.dayLabel+'|休息|—|—|—|'+c.relation+'|\n';continue;}
  const spec=templateSpecification(c,refs),t=workoutTotals(spec);seconds+=t.estimatedSecondsRange[0];
  text+='|'+[c.dayLabel,c.id,c.main+'；'+(c.targetBases?c.targetBases.join('m / ')+'m 配速':c.targetBasis?c.targetBasis+'m 配速':c.intensityBasis),t.repRecoveries+'次趟间 / '+t.setRecoveries+'次组间；合计'+t.recoverySeconds+'秒；'+(c.recoveryMode||spec.repetitions[0].repRecovery?.mode||'无'),spec.warmup[0].durationSeconds/60+'分钟 / '+spec.cooldown[0].durationSeconds/60+'分钟',c.relation].join('|')+'|\n';
 }
 text+='\n此参考成绩下计划总时长 '+(seconds/60).toFixed(2)+' 分钟；质量课 '+week.filter(c=>c.quality).length+' 次。'+week[0].transitionRules+'\n';
}
text+='\n## 青少年竞技独立覆盖\n\n|专项|阶段|内容状态|执行状态|\n|---|---|---|---|\n';
for(const r of courseCoverage({youth:true}).filter(r=>r.group==='competitive'))text+='|'+r.event+'|'+coursePhases[r.phase]+'|专项审议框架，未完成适龄整周编排|无自动执行；需成熟度、训练背景与现场教练审核，不降为入门组|\n';
await writeFile(new URL('../docs/pr13-content-coverage.md',import.meta.url),text);
await writeFile(new URL('../.expo/content-coverage.json',import.meta.url),JSON.stringify({contentRevision,competitiveRevision,rows},null,2));
if(rows.filter(r=>r.week.complete).some(r=>pbWeek(r.event,null,{group:r.group,phase:r.phase}).some(c=>c.id!=='rest'&&!courseContentComplete(c))))throw Error('Coverage overstates completeness');
console.log('Wrote 24 event/group/phase rows; '+rows.filter(r=>r.week.complete).length+' coherent weekly drafts.');
