import {writeFile} from 'node:fs/promises';
import {pbDistances,pbCourses,contentGroups,courseContentComplete} from '../public/pb-library.js';
import {buildProgram,programCoverage,programVersion} from '../public/program.js';
let text='# 长期计划与免费课程完整性覆盖\n\n版本：'+programVersion+'。编排候选不等于独立审核。以下扫描正式数据，不以卡片数量判定完整。私人原始课表未进入此表。\n\n## 现有免费单课审计\n\n|专项|组别|可浏览课程|参数完整候选|尚未完整编排|\n|---|---|---|---|---|\n';
for(const event of pbDistances)for(const group of Object.keys(contentGroups)){
 const courses=pbCourses(event,null,{group}),complete=courses.filter(courseContentComplete);
 text+='|'+[event,contentGroups[group],courses.length,complete.length,courses.filter(c=>!courseContentComplete(c)).map(c=>c.id).join('、')||'无'].join('|')+'|\n';
}
text+='\n未完整课程保持原有免费浏览，但不列为完整长期方案，也不声称已专业审核。中跑已完成的候选仍逐节保留参数来源、产品选择及限制；其他专项旧教学候选缺乏完整目标/恢复/适用依据的部分尚未整改完毕，不能靠会员解锁变成可靠方案。\n\n## 长期覆盖\n\n|专项|支持状态|独立审核|\n|---|---|---|\n';
for(const r of programCoverage)text+='|'+[r.event,r.status==='adult-competitive-candidate'?'成人竞技均衡型8/12/16周候选':'未编排；不宣称VIP已支持',r.independentReview].join('|')+'|\n';
text+='\n基础/进阶组现有免费周草案不变，其长期连续方案尚未完成；青少年竞技没有套用成人长周期。\n';
for(const event of ['800 m','1500 m'])for(const length of [8,12,16]){
 const p=buildProgram({event,length,startDate:'2026-11-16'});
 text+='\n## '+event+' · '+length+'周 · 成人竞技候选\n\n|周|阶段目的|完整课次ID（按先后，含休息）|衔接条件|\n|---|---|---|---|\n';
 for(const w of p.weeks)text+='|'+[w.number,w.purpose,w.courses.map(c=>c.id).join(' → '),w.transition].join('|')+'|\n';
}
text+='\n## 证据和运行边界\n\n各课保持原剂量，不因PB、打卡或续费变化。基础确认→同项间歇衔接→恢复→专项发展→巩固/对比刺激→复盘是本产品编排。熟悉剂量的重复有稳定性目的；不是声称每周必须换动作。恢复周位置及8/12/16周长度未获独立教练审核，也没有疗效或PB保证。Haugen综述支持周期化和个体差异原则，不验证这套逐周安排；课程保留各自原始实践来源。\n\n已有教练课优先，固定时段容不下完整课次则暂不安排，不压缩恢复。课程原文/参数不写回完成历史；漏课不补堆，未来调整先展示实际完成和恢复信息并确认。时区变化需明确确认未来时区，既有课次不自动移动。尚不支持自动比赛日倒排或青少年适龄长期处方。\n';
await writeFile(new URL('../docs/pr13-program-coverage.md',import.meta.url),text);
console.log('Wrote free-course audit and six adult competitive program maps');
