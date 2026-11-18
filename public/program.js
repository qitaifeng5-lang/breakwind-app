import {completionSummary} from './completion.js';
import {pbWeek,programWeekCourses,courseMetadata,courseContentComplete,competitiveRevision} from './pb-library.js';
import {offset,dateKey} from './model.js';
import {courseReadiness} from './engine.js';
import {assessSchedule,recurringFor,occupied} from './coach-plan.js';
import {templateSpecification,workoutTotals,recentPerformance} from './workout.js';
import {weekTotals,mapWeekCourses} from './week-plan.js';
import {entitlement} from './membership.js';
import {supportedEvents,normalizeEvent,eventCourseRevision} from './event-courses.js';
import {trainingContext,assessWeekLoad,fitWeekToHistory,resolveRaceDate,applyRaceWindow} from './training-policy.js';

export const programVersion='2026-11-18-program-content-v3';
export const programCoverage=['800 m','1500 m','3000 m','5 km','10 km','越野','半程马拉松','全程马拉松'].map(event=>({event,status:supportedEvents.includes(normalizeEvent(event))?'adult-and-school-candidate':'not-programmed',populations:supportedEvents.includes(normalizeEvent(event))?['adult','junior','senior']:[],independentReview:'pending'}));
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
export function programWeekSummary(courses,phase){
  const quality=courses.filter(c=>c.quality);
  return {totals:weekTotals(courses),stimuli:courses.filter(c=>c.id!=='rest').map(c=>({courseId:c.id,revision:c.catalogRevision,stimulus:c.stimulus,role:c.sessionRole})),
    relationship:quality.length?'质量课：'+quality.map(c=>c.name).join('；')+'。课间保留低负荷或休息日，不叠加、不补堆。':phase==='prepare'?'比赛期保留熟悉短量与休息，不补做发展课':'无质量主课；轻松支持与休息，下一阶段需重新确认恢复。',
    unknown:['准备与整理时长','未校准比赛节奏的耗时','力量、体育课等其他负荷'],sourceSupport:'公开资料支持刺激区分和恢复原则；周序及重复巩固是产品编排，非效果试验'};
}
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&offset(d,0)===d;
export function buildProgram({event,pb=null,length=12,startDate=dateKey(),asOf=dateKey(),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone,cohort='competitive',data={},youth=data.cycleProfile?.age==='未满18岁',schoolStage=data.cycleProfile?.schoolStage||'junior',raceDate}={}) {
  event=normalizeEvent(event);
  if(data.cycleProfile?.age==='未满18岁'&&!youth)throw Error('已知青少年资料不能使用成人分支；请使用初中或高中方案');
  const adultMiddle=!youth&&['800 m','1500 m'].includes(event);
  if(!supportedEvents.includes(event)||!['base','advanced','competitive'].includes(cohort)||adultMiddle&&cohort!=='competitive')throw Error('该人群的完整长期内容尚未编排；当前支持成人竞技中跑、成人基础至竞技3000m/5000m/越野及初高中各专项组');
  if(youth&&!['junior','senior'].includes(schoolStage))throw Error('请选择初中或高中适龄分支；年级不是成熟度判断');
  if(!sequences[length]||!validDate(startDate))throw Error('请选择8、12或16周及有效开始日期');
  raceDate=resolveRaceDate({raceDate,event,data,startDate});
  const options={group:cohort,youth,schoolStage};
  const weeks=sequences[length].map((key,index)=>{
    const start=offset(startDate,index*7),end=offset(start,6),block={...blocks[key]};
    if(raceDate&&start>raceDate){block.phase='recover';block.purpose='赛后恢复与阶段复盘；重新核对恢复后才决定后续训练';}
    else if(raceDate&&end>=offset(raceDate,-7)){block.phase='prepare';block.purpose='按比赛日期保留熟悉节奏，撤下发展主课；赛后转入恢复，不补堆漏课';}
    const primary=adultMiddle&&block.phase==='develop'?(block.primary==='specific'?(event==='800 m'?'endurance':'combination-development'):block.primary==='contrast'?(event==='800 m'?'combination-development':'endurance'):block.primary==='interval-development'&&event==='1500 m'?'interval':block.primary):null;
    let courses=programWeekCourses(event,pb,{...options,phase:block.phase,primary});
    if(raceDate)courses=applyRaceWindow(courses,{start,raceDate,prepare:pbWeek(event,pb,{...options,phase:'prepare'}),recover:pbWeek(event,pb,{...options,phase:'recover'})});
    const fitting=fitWeekToHistory(data,courses,asOf,{applyFatigue:index===0});courses=fitting.courses;
    if(courses.some(c=>c.id!=='rest'&&!courseContentComplete(c)))throw Error('周课次未完整编排');
    const purpose=adultMiddle?block.purpose:(block.phase==='base'?'基础期：受控有氧、技术与恢复；先确认熟悉剂量':block.phase==='develop'?event+'专项期：专项节奏替换Tempo主课，保留轻松支持；重复巩固不代表加量':block.purpose);
    return {number:index+1,key,phase:block.phase,purpose,primaryCourseId:primary,contentSummary:programWeekSummary(courses,block.phase),start,end,courses,individualAdjustments:fitting.changes,loadReview:assessWeekLoad(data,courses,asOf),
      transition:'需要确认当前恢复及同类训练耐受；日期、PB、续费和打卡不构成升级依据',checkpoint:index===0||sequences[length][index-1]!==key,status:'preview'};
  });
  return {version:programVersion,event,pb,cohort,youth,schoolStage:youth?schoolStage:null,raceDate,population:adultMiddle?'adult-competitive-balanced':youth?'youth-'+schoolStage:'adult-distance',length,startDate,timezone,weeks,cursor:0,status:'draft',
    courseRevision:adultMiddle?competitiveRevision:eventCourseRevision,sources:[{url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8363530/',supports:'中跑项目差异；不外推精英剂量'},{url:'https://doi.org/10.1136/bjsports-2020-102518',supports:'青少年发育、休息和多样性原则；不验证产品剂量'},{url:'https://pubmed.ncbi.nlm.nih.gov/37163550/',supports:'减量与保留熟悉刺激；不据此实施赛前过量或统一减量百分比'}],
    reviewStatus:{sources:'checked-at-course-level',programming:'complete-candidate',independentReview:'pending',physicalDevice:'not-tested'},
    limitation:(adultMiddle?'成人竞技中跑须已有六课周和相近双刺激经验。':youth?'初高中分支保持所选训练组；年级不代表发育成熟度。':'成人长跑分支须已有相近专项与周结构经验。')+'周序、休息位置及8/12/16周长度是产品编排，未获独立教练审核。赛前七日采用熟悉短量，赛后保持恢复等待复盘；不是伤后复出或保证达峰方案。',revisionHistory:[],referencePerformance:structuredClone(data.records||[]),scheduleConstraints:null};
}
export function saveProgram(data,draft,{now=Date.now(),mode='production',id=globalThis.crypto.randomUUID()}={}) {
  if(!entitlement(data.membershipTest,'new-program',{mode,now}))throw Error('长期计划体验未生效；免费课程和已有数据仍可用');
  data.programs??=[];if(data.programs.some(p=>p.programId===id))return data.programs.find(p=>p.programId===id);
  const p={...structuredClone(draft),programId:id,status:'active',referencePerformance:structuredClone(data.records),scheduleConstraints:structuredClone(data.coachSchedule),createdAt:new Date(now).toISOString()};
  if(draft.baselineInputs){data.cycleProfile={...data.cycleProfile};for(const [key,value]of Object.entries(draft.baselineInputs))if(value===null)delete data.cycleProfile[key];else data.cycleProfile[key]=structuredClone(value);}
  if(draft.youth)data.cycleProfile={...data.cycleProfile,age:'未满18岁',schoolStage:draft.schoolStage};
  data.programs.push(p);return p;
}
export function programReview(data,program,weekIndex=program.cursor,today=dateKey()) {
  const plans=data.plans.filter(p=>p.programId===program.programId&&p.programWeek===weekIndex);
  const runs=data.runs.filter(r=>plans.some(p=>r.courseSession?.course?.planId===p.id||r.planId===p.id));
  const summary=completionSummary(plans,today);
  const reports=plans.map(p=>p.trainingOutcome).filter(Boolean),context=trainingContext(data,today);
  return {planned:plans.filter(p=>!p.cancelled).length,...summary,cancelled:plans.filter(p=>p.cancelled).length,missed:plans.filter(p=>p.trainingOutcome?.status==='missed').map(p=>p.id),actualRuns:runs.length,
    feedback:{fatigue:context.fatigue,needsRecovery:context.needsRecovery,userReportedMinutes:reports.some(r=>Number.isFinite(r.actualMinutes))?reports.reduce((n,r)=>n+(r.actualMinutes||0),0):null,sessionRpe:reports.filter(r=>Number.isFinite(r.actualMinutes)&&Number.isFinite(r.effort)).map(r=>r.actualMinutes*r.effort),source:'user-report',completeCoverage:reports.length>0&&reports.every(r=>Number.isFinite(r.actualMinutes))},
    note:'完成情况来自用户明确记录；关联运动历史单独保留，未知数据不推算，不补堆漏课，不因完成率加量'};
}
export function previewProgramWeek(data,program,index,{today=dateKey(),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone,build='local'}={}) {
  const week=program.weeks[index];if(!week)throw Error('周号不存在');
  if(timezone!==program.timezone)return {index,added:[],held:[{date:week.start,reason:'当前时区与周期不同，请确认未来时区；不自动换算或移动已有课次'}],review:programReview(data,program,index,today)};
  const loadReview=assessWeekLoad(data,week.courses,today);
  if(!loadReview.canArrange)return {index,added:[],held:[{date:week.start,reason:[...loadReview.reasons,...loadReview.courseIssues.map(i=>i.reason)].join('；')}],loadReview,review:programReview(data,program,index,today)};
  const added=[],held=[],coachInWeek=data.plans.some(p=>p.coachIssued&&!p.cancelled&&p.executionStatus!=='reference-only'&&p.date>=week.start&&p.date<=week.end);
  for(const row of mapWeekCourses(data,week.courses,week.start).rows){
    const course=row.course,dayIndex=week.courses.findIndex(c=>c.dayIndex===course.dayIndex),date=row.date;
    if(course.id==='rest')continue;
    const id=program.programId+'|'+index+'|'+dayIndex+'|'+(week.revision||0);
    if(data.plans.some(p=>p.id===id)){held.push({id,date,reason:'已存在或已取消，不重复生成'});continue;}
    const ready=courseReadiness(data,course,date,today);
    const reason=row.held?row.held:date<today?'过去课次不补排':program.status==='paused'?'周期已暂停':!ready.canSchedule?ready.reason:course.quality&&coachInWeek?'本周已有教练安排，保留教练课，不叠加质量课':data.plans.some(p=>p.date===date&&!p.cancelled&&p.executionStatus!=='reference-only')?'本日已有课表，保留原安排':null;
    if(reason){held.push({id,date,reason});continue;}
    const slot=recurringFor(data,date).find(r=>r.kind==='training');let seconds=null,spec=null;
    try {const refs=Object.fromEntries(['800','1500','mile','3000','5000'].map(b=>[b,recentPerformance(data.records||program.referencePerformance||[],b,today)]).filter(([,r])=>r).map(([b,r])=>[b,{...r,kind:'achieved'}]));spec=templateSpecification(course,refs);seconds=workoutTotals(spec).estimatedSecondsRange?.[1];}catch{ /* missing race reference stays visible, never guessed */ }
    const plan=occupied({id,date,name:course.name,...courseMetadata(course),type:course.quality?'间歇跑':'轻松跑',quality:course.quality,course:{...structuredClone(course),build,...(spec?{executionSpec:spec}:{})},programId:program.programId,programWeek:index,programDay:dayIndex,courseRevision:course.catalogRevision,
      start:slot?.start||'',estimatedMinutes:seconds?seconds/60:'',recurringKey:slot?.id||'',preparationMinutes:data.coachSchedule?.preparationMinutes||0,bufferMinutes:data.coachSchedule?.bufferMinutes||0,completed:false,executionStatus:'待执行核对'});
    const review=assessSchedule({...data,plans:[...data.plans,...added]},plan,{today});plan.scheduleReview=review;
    if(slot&&(!plan.end||plan.end>slot.end)){
      const clockMinutes=text=>Number(text.slice(0,2))*60+Number(text.slice(3));
      const minimum=spec?workoutTotals(spec).mainRecoverySecondsRange?.[0]:null;
      const tooShort=minimum&&(minimum/60+Number(plan.preparationMinutes||0)+Number(plan.bufferMinutes||0)>clockMinutes(slot.end)-clockMinutes(slot.start));
      held.push({id,date,reason:tooShort||plan.end?'主训练及恢复已超出固定时段，不压缩恢复':'固定时段容量待核对：准备、整理时长或节奏参考待补，不猜结束时间'});continue;
    }
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
  if(kind==='auto')kind=['paused','recovery','load'].includes(readiness.status)||evidence.feedback.needsRecovery?'recover':'hold';
  // A "keep familiar work" suggestion must never erase an authored recovery week.
  const protectedRecovery=p.weeks[index].phase==='recover';if(protectedRecovery)kind='recover';
  const protectedRace=p.weeks[index].phase==='prepare'||p.weeks[index].courses.some(c=>c.calendarLocked);
  const reasons={recover:'近期恢复不足：下一周替换为恢复周，不补堆遗漏质量课',hold:'保持已熟悉结构，不因成绩或打卡提高剂量'};
  if(!reasons[kind])throw Error('未知调整');
  let source=kind==='recover'?pbWeek(p.event,p.pb,{group:p.cohort,phase:'recover',youth:p.youth,schoolStage:p.schoolStage||'junior'}):protectedRace?p.weeks[index].courses:p.weeks[p.cursor].courses;
  if(p.raceDate)source=source.map((c,i)=>{const date=offset(p.weeks[index].start,i);return {...structuredClone(date===p.raceDate?{id:'rest',name:'比赛日 · 核对已有比赛安排',quality:false,raceReservation:true,dayIndex:i,event:p.event}:c),calendarDate:date,calendarLocked:protectedRace||p.weeks[index].start>p.raceDate};});
  const reason=(protectedRecovery?'保留原计划恢复周，不用巩固建议替换成质量周':reasons[kind])+'；关联完成'+evidence.completed+'课、部分完成'+evidence.partial+'课、未记录'+evidence.unreported.length+'课。'+(['paused','recovery'].includes(readiness.status)?readiness.reason:'没有恢复异常记录不等于已经确认适合升级。');
  return {programId:id,baseRevision:p.revisionHistory.length,index,kind,phase:kind==='recover'?'recover':protectedRace?p.weeks[index].phase:p.weeks[p.cursor].phase,today,reason,evidence,pause:readiness.status==='paused',referencePerformance:structuredClone(data.records),courses:structuredClone(source),before:structuredClone(p.weeks[index])};
}
export function confirmProgramChange(data,proposal,{mode='production',now=Date.now()}={}) {
  if(!entitlement(data.membershipTest,'adjust-program',{mode,now}))throw Error('体验已到期；已有课表可查看、手动整理和导出');
  const p=data.programs?.find(p=>p.programId===proposal.programId);if(!p||proposal.baseRevision!==p.revisionHistory.length)throw Error('周期已变更，请重新预览');
  const week=p.weeks[proposal.index];
  if(week.start<=proposal.today)throw Error('只调整未来整周，不回写进行中或历史课次');
  if(data.plans.some(r=>r.programId===p.programId&&r.programWeek===proposal.index&&(r.completed||r.trainingOutcome)))throw Error('该周已有实际完成记录，不替换历史结构');
  const affected=data.plans.filter(r=>r.programId===p.programId&&r.programWeek===proposal.index&&!r.completed&&!r.trainingOutcome&&!r.coachIssued&&r.date>proposal.today);
  for(const r of affected){r.cancelled=true;r.adjustmentReason=proposal.reason;}
  // New revision IDs prevent colliding with cancelled snapshots, which remain in history.
  const next=structuredClone(proposal.courses),phase=proposal.phase||(proposal.kind==='recover'?'recover':p.weeks[p.cursor].phase);p.weeks[proposal.index]={...week,revision:(week.revision||0)+1,courses:next,primaryCourseId:next.find(c=>c.quality&&c.categoryId!=='tempo')?.id||null,contentSummary:programWeekSummary(next,phase),purpose:proposal.reason,phase,status:'adjusted'};
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
