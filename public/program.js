import {pbWeek,pbCourses,courseContentComplete,competitiveRevision} from './pb-library.js';
import {offset,dateKey} from './model.js';
import {courseReadiness} from './engine.js';
import {assessSchedule,recurringFor,occupied} from './coach-plan.js';
import {templateSpecification,workoutTotals,recentPerformance} from './workout.js';
import {entitlement} from './membership.js';

export const programVersion='2026-11-10-program-candidate-v1';
export const programCoverage=['800 m','1500 m','3000 m','5 km','10 km','越野','半程马拉松','全程马拉松'].map(event=>({event,status:['800 m','1500 m'].includes(event)?'adult-competitive-candidate':'not-programmed',independentReview:'pending'}));
// Ordered editorial blocks: repeat familiar doses deliberately, change the purpose/primary
// stimulus at a checkpoint, and retain recovery weeks. Never choose random sessions.
const blocks={
  entry:{phase:'base',purpose:'确认现有分段有氧与短坡耐受，建立恢复基线',primary:null},
  settle:{phase:'base',purpose:'巩固同一有氧剂量；观察动作质量，不增加次数',primary:null},
  bridge:{phase:'develop',purpose:'用同项间歇替换短坡；保持熟悉的分段有氧支持',primary:'interval-development'},
  specific:{phase:'develop',purpose:'专项段质量与有氧支持分工；不同时提高周量',primary:'specific'},
  consolidate:{phase:'develop',purpose:'巩固已确认的专项结构；根据真实反馈决定保持或退出',primary:'specific'},
  contrast:{phase:'develop',purpose:'在同一质量位练习另一专项能力，替换而不叠加',primary:'contrast'},
  recovery:{phase:'recover',purpose:'撤下质量刺激，检查疲劳和缺课原因，不补课',primary:null},
  review:{phase:'recover',purpose:'阶段复盘与下一周期决策；不自动回加强度',primary:null}
};
const sequences={
  8:['entry','bridge','recovery','specific','consolidate','recovery','contrast','review'],
  12:['entry','settle','bridge','recovery','specific','consolidate','recovery','contrast','consolidate','recovery','specific','review'],
  16:['entry','settle','bridge','recovery','bridge','specific','consolidate','recovery','contrast','consolidate','recovery','specific','consolidate','recovery','contrast','review']
};
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&offset(d,0)===d;
export function buildProgram({event,pb=null,length=12,startDate=dateKey(),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone,cohort='competitive'}={}) {
  if(!['800 m','1500 m'].includes(event)||cohort!=='competitive')throw Error('当前长期候选仅完成成人800m／1500m竞技组；其他人群仍可使用原免费课程');
  if(!sequences[length]||!validDate(startDate))throw Error('请选择8、12或16周及有效开始日期');
  const catalog=pbCourses(event,pb,{group:cohort});
  const weeks=sequences[length].map((key,index)=>{
    const block=blocks[key],courses=pbWeek(event,pb,{group:cohort,phase:block.phase});
    if(block.primary){
      const id=block.primary==='specific'?(event==='800 m'?'endurance':'combination-development'):block.primary==='contrast'?(event==='800 m'?'combination-development':'endurance'):block.primary==='interval-development'&&event==='1500 m'?'interval':block.primary;
      const replacement=catalog.find(c=>c.id===id);if(!replacement||!courseContentComplete(replacement))throw Error('长期主课编排尚不完整');
      const placement=courses[1];
      courses[1]={...structuredClone(replacement),cohortId:placement.cohortId,weekEligibility:placement.weekEligibility,weekPhase:block.phase,dayIndex:1,dayLabel:placement.dayLabel,relation:'本周唯一专项主刺激；与周五有氧支持隔开，不叠加其他主课'};
    }
    if(courses.some(c=>c.id!=='rest'&&!courseContentComplete(c)))throw Error('周课次未完整编排');
    return {number:index+1,key,phase:block.phase,purpose:block.purpose,start:offset(startDate,index*7),end:offset(startDate,index*7+6),courses,
      transition:'需要确认当前恢复及同类训练耐受；日期、PB、续费和打卡不构成升级依据',checkpoint:index===0||sequences[length][index-1]!==key,status:'preview'};
  });
  return {version:programVersion,event,pb,cohort,population:'adult-competitive-balanced',length,startDate,timezone,weeks,cursor:0,status:'draft',
    courseRevision:competitiveRevision,sources:[{url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8363530/',supports:'个体差异、阶段性刺激及恢复原则；不验证本产品逐周处方'}],
    reviewStatus:{sources:'checked-at-course-level',programming:'complete-candidate',independentReview:'pending',physicalDevice:'not-tested'},
    limitation:'适用于已有六课周、两种质量刺激和相近剂量经验的成人均衡型中跑者。周序、恢复周位置及8/12/16周长度是产品编排，未经独立教练审核；不是自动备赛减量或伤后复出方案。',revisionHistory:[],referencePerformance:[],scheduleConstraints:null};
}
export function saveProgram(data,draft,{now=Date.now(),mode='production',id=globalThis.crypto.randomUUID()}={}) {
  if(!entitlement(data.membershipTest,'new-program',{mode,now}))throw Error('长期计划体验未生效；免费课程和已有数据仍可用');
  data.programs??=[];if(data.programs.some(p=>p.programId===id))return data.programs.find(p=>p.programId===id);
  const p={...structuredClone(draft),programId:id,status:'active',referencePerformance:structuredClone(data.records),scheduleConstraints:structuredClone(data.coachSchedule),createdAt:new Date(now).toISOString()};
  data.programs.push(p);return p;
}
export function programReview(data,program,weekIndex=program.cursor,today=dateKey()) {
  const plans=data.plans.filter(p=>p.programId===program.programId&&p.programWeek===weekIndex);
  const runs=data.runs.filter(r=>plans.some(p=>r.courseSession?.course?.planId===p.id||r.planId===p.id));
  return {planned:plans.filter(p=>!p.cancelled).length,completed:plans.filter(p=>p.completed||runs.some(r=>r.courseSession?.course?.planId===p.id||r.planId===p.id)).length,
    cancelled:plans.filter(p=>p.cancelled).length,missed:plans.filter(p=>!p.completed&&!p.cancelled&&p.date<today&&!runs.some(r=>r.courseSession?.course?.planId===p.id||r.planId===p.id)).map(p=>p.id),actualRuns:runs.length,
    note:'只统计关联的实际记录；未完成不自动补堆，不凭完成率提高剂量'};
}
export function previewProgramWeek(data,program,index,{today=dateKey(),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone,build='local'}={}) {
  const week=program.weeks[index];if(!week)throw Error('周号不存在');
  if(timezone!==program.timezone)return {index,added:[],held:[{date:week.start,reason:'当前时区与周期不同，请确认未来时区；不自动换算或移动已有课次'}],review:programReview(data,program,index,today)};
  const added=[],held=[],coachInWeek=data.plans.some(p=>p.coachIssued&&!p.cancelled&&p.executionStatus!=='reference-only'&&p.date>=week.start&&p.date<=week.end);
  for(const [dayIndex,course] of week.courses.entries()){
    if(course.id==='rest')continue;
    const date=offset(week.start,dayIndex),id=program.programId+'|'+index+'|'+dayIndex+'|'+(week.revision||0);
    if(data.plans.some(p=>p.id===id)){held.push({id,date,reason:'已存在或已取消，不重复生成'});continue;}
    const ready=courseReadiness(data,course,date,today);
    const reason=date<today?'过去课次不补排':program.status==='paused'?'周期已暂停':!ready.canSchedule?ready.reason:course.quality&&coachInWeek?'本周已有教练安排，保留教练课，不叠加质量课':data.plans.some(p=>p.date===date&&!p.cancelled&&p.executionStatus!=='reference-only')?'本日已有课表，保留原安排':null;
    if(reason){held.push({id,date,reason});continue;}
    const slot=recurringFor(data,date).find(r=>r.kind==='training');let seconds=null,spec=null;
    try {const refs=Object.fromEntries(['800','1500','mile'].map(b=>[b,recentPerformance(program.referencePerformance||[],b,today)]).filter(([,r])=>r).map(([b,r])=>[b,{...r,kind:'achieved'}]));spec=templateSpecification(course,refs);seconds=workoutTotals(spec).estimatedSecondsRange?.[1];}catch{ /* missing race reference stays visible, never guessed */ }
    const plan=occupied({id,date,name:course.name,type:course.quality?'间歇跑':'轻松跑',quality:course.quality,course:{...structuredClone(course),build,...(spec?{executionSpec:spec}:{})},programId:program.programId,programWeek:index,programDay:dayIndex,courseRevision:program.courseRevision,
      start:slot?.start||'',estimatedMinutes:seconds?seconds/60:'',recurringKey:slot?.id||'',preparationMinutes:data.coachSchedule?.preparationMinutes||0,bufferMinutes:data.coachSchedule?.bufferMinutes||0,completed:false,executionStatus:'待执行核对'});
    const review=assessSchedule({...data,plans:[...data.plans,...added]},plan,{today});plan.scheduleReview=review;
    if(slot&&(!plan.end||plan.end>slot.end)){held.push({id,date,reason:!plan.end?'固定时段容量待核对：缺少同项节奏参考，不猜结束时间':'完整课次超出固定时段，不压缩恢复'});continue;}
    if(!review.canSave){held.push({id,date,reason:review.conflicts.join('；')});continue;}
    added.push(plan);
  }
  return {index,added,held,review:programReview(data,program,index,today)};
}
export function arrangeProgramWeek(data,id,index,options={}) {
  const p=data.programs?.find(p=>p.programId===id);if(!p)throw Error('周期不存在');
  // Already-generated content remains usable after expiry; arranging it is a free calendar action.
  const result=previewProgramWeek(data,p,index,options);data.plans.push(...result.added);
  const count=data.plans.filter(r=>r.programId===id&&r.programWeek===index&&!r.cancelled).length;
  p.weeks[index].status=count===p.weeks[index].courses.filter(c=>c.id!=='rest').length?'arranged':count?'partially-arranged':'needs-schedule-review';
  p.revisionHistory.push({at:new Date().toISOString(),action:'arrange-week',week:index,added:result.added.map(r=>r.id),held:result.held});return result;
}
export function proposeProgramChange(data,id,{kind='auto',today=dateKey()}={}) {
  const p=data.programs?.find(p=>p.programId===id);if(!p)throw Error('周期不存在');
  const index=p.cursor+1;if(!p.weeks[index])throw Error('周期已到最后一周，请先复盘');
  const evidence=programReview(data,p,p.cursor,today),readiness=courseReadiness(data,{adapted:true,quality:false},today,today);
  if(kind==='auto')kind=['paused','recovery'].includes(readiness.status)?'recover':'hold';
  // A "keep familiar work" suggestion must never erase an authored recovery week.
  const protectedRecovery=p.weeks[index].phase==='recover';if(protectedRecovery)kind='recover';
  const reasons={recover:'近期恢复不足：下一周替换为恢复周，不补堆遗漏质量课',hold:'保持已熟悉结构，不因成绩或打卡提高剂量'};
  if(!reasons[kind])throw Error('未知调整');
  const source=kind==='recover'?pbWeek(p.event,p.pb,{group:p.cohort,phase:'recover'}):p.weeks[p.cursor].courses;
  const reason=(protectedRecovery?'保留原计划恢复周，不用巩固建议替换成质量周':reasons[kind])+'；关联完成'+evidence.completed+'课、过期未完成'+evidence.missed.length+'课。'+(['paused','recovery'].includes(readiness.status)?readiness.reason:'没有恢复异常记录不等于已经确认适合升级。');
  return {programId:id,baseRevision:p.revisionHistory.length,index,kind,today,reason,evidence,pause:readiness.status==='paused',referencePerformance:structuredClone(data.records),courses:structuredClone(source),before:structuredClone(p.weeks[index])};
}
export function confirmProgramChange(data,proposal,{mode='production',now=Date.now()}={}) {
  if(!entitlement(data.membershipTest,'adjust-program',{mode,now}))throw Error('体验已到期；已有课表可查看、手动整理和导出');
  const p=data.programs?.find(p=>p.programId===proposal.programId);if(!p||proposal.baseRevision!==p.revisionHistory.length)throw Error('周期已变更，请重新预览');
  const week=p.weeks[proposal.index];
  if(week.start<=proposal.today)throw Error('只调整未来整周，不回写进行中或历史课次');
  if(data.plans.some(r=>r.programId===p.programId&&r.programWeek===proposal.index&&r.completed))throw Error('该周已有实际完成记录，不替换历史结构');
  const affected=data.plans.filter(r=>r.programId===p.programId&&r.programWeek===proposal.index&&!r.completed&&!r.coachIssued&&r.date>proposal.today);
  for(const r of affected){r.cancelled=true;r.adjustmentReason=proposal.reason;}
  // New revision IDs prevent colliding with cancelled snapshots, which remain in history.
  const next=structuredClone(proposal.courses);p.weeks[proposal.index]={...week,revision:(week.revision||0)+1,courses:next,purpose:proposal.reason,phase:proposal.kind==='recover'?'recover':p.weeks[p.cursor].phase,status:'adjusted'};
  p.referencePerformance=structuredClone(proposal.referencePerformance);if(proposal.pause)p.status='paused';
  p.revisionHistory.push({at:new Date(now).toISOString(),action:'confirmed-adjustment',reason:proposal.reason,evidence:proposal.evidence,before:proposal.before,week:proposal.index,cancelled:affected.map(r=>r.id)});
  return p;
}
export function advanceProgram(data,id,{today=dateKey(),confirmed=false}={}) {
  const p=data.programs?.find(p=>p.programId===id);if(!p||!confirmed)throw Error('请先查看阶段复盘并确认');
  const readiness=courseReadiness(data,{adapted:true,quality:false},today,today);
  if(['paused','recovery'].includes(readiness.status)||p.status==='paused')throw Error('先处理已知伤痛或恢复问题；周期进度保留');
  const review=programReview(data,p,p.cursor,today);p.revisionHistory.push({at:new Date().toISOString(),action:'advance-after-review',week:p.cursor,review});
  if(p.cursor===p.weeks.length-1)p.status='completed';else p.cursor++;
  return p;
}
export function moveProgramPlan(data,id,changes,{today=dateKey()}={}) {
  const original=data.plans.find(p=>p.id===id&&p.programId);if(!original||original.completed||original.coachIssued)throw Error('不能修改已完成或教练锁定课次');
  if(!validDate(changes.date||original.date))throw Error('日期无效');
  const next=occupied({...original,date:changes.date||original.date,start:changes.start??original.start});
  const review=assessSchedule(data,next,{today,previous:original});if(!review.canSave)return {review};
  next.scheduleReview=review;next.scheduleAudit=[...(original.scheduleAudit||[]),{at:new Date().toISOString(),before:{date:original.date,start:original.start},after:{date:next.date,start:next.start},review}];
  Object.assign(original,next);return {plan:original,review};
}
export function exportProgram(data,id) {
  const program=data.programs?.find(p=>p.programId===id);if(!program)throw Error('周期不存在');
  const plans=data.plans.filter(p=>p.programId===id),ids=new Set(plans.map(p=>p.id));
  return structuredClone({program,plans,runs:data.runs.filter(r=>ids.has(r.planId)||ids.has(r.courseSession?.course?.planId))});
}
