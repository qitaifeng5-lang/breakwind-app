import {offset} from './model.js';
import {recentPerformance,templateSpecification,workoutTotals,referenceEvents} from './workout.js';
import {normalizeEvent} from './event-courses.js';

export const trainingPolicyVersion='2026-11-18-policy-v1';
export const validTrainingDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&offset(d,0)===d;
const number=n=>Number.isFinite(n)&&n>=0;
const inWindow=(d,today,days)=>validTrainingDate(d)&&d<=today&&d>=offset(today,-days);
export function trainingContext(data={},today){
 const profile=data.cycleProfile||{},runs=(data.runs||[]).filter(r=>inWindow(r.date,today,27));
 const outcomes=(data.plans||[]).filter(p=>!p.cancelled&&inWindow(p.date,today,27)&&p.trainingOutcome).map(p=>({date:p.date,planId:p.id,...p.trainingOutcome}));
 const reports=outcomes.filter(r=>r.status!=='missed'&&!runs.some(run=>run.planId===r.planId||run.courseSession?.course?.planId===r.planId));
 const observed=[...runs.map(r=>({date:r.date,minutes:r.minutes,distance:r.distance,effort:r.effort})),...reports.map(r=>({date:r.date,minutes:r.actualMinutes,effort:r.effort}))];
 // A partial log is evidence of activity, NOT a complete weekly capacity estimate.
 const completeWindow=validTrainingDate(profile.logsCompleteSince)&&profile.logsCompleteSince<=offset(today,-27)&&validTrainingDate(profile.logsCompleteThrough)&&profile.logsCompleteThrough>=today;
 const freshDeclaration=!profile.baselineDate||inWindow(profile.baselineDate,today,28);
 const declared=freshDeclaration&&number(profile.recentKm)&&number(profile.weeklyDays)&&profile.weeklyDays<=7;
 const measuredKm=runs.filter(r=>number(r.distance)&&r.distanceMeasured!==false).reduce((n,r)=>n+r.distance,0);
 const fatigue=[...(data.recovery||[]),...outcomes].filter(r=>inWindow(r.date,today,2)&&number(r.fatigue));
 const recentEffort=observed.filter(r=>inWindow(r.date,today,1)&&r.effort>=8);
 const completeMinutes=completeWindow&&observed.length>0&&observed.every(r=>number(r.minutes));
 return {version:trainingPolicyVersion,profile,observedSessions:observed.length,observedKm:measuredKm,
  weeklyKm:declared?profile.recentKm:completeWindow&&runs.every(r=>number(r.distance)&&r.distanceMeasured!==false)&&!reports.length?measuredKm/4:null,
  weeklyMinutes:completeMinutes?observed.reduce((n,r)=>n+r.minutes,0)/4:null,
  weeklyDays:declared?profile.weeklyDays:completeWindow?new Set(observed.map(r=>r.date)).size/4:null,
  longestKm:freshDeclaration&&number(profile.recentLongest)?profile.recentLongest:completeWindow&&runs.length?Math.max(...runs.map(r=>number(r.distance)?r.distance:0)):null,
  longestMinutes:completeMinutes?Math.max(...observed.map(r=>r.minutes)):null,
  baselineSource:declared?'user-declared':completeWindow?'confirmed-complete-28-days':'partial-or-unknown',
  fatigue:fatigue.length?Math.max(...fatigue.map(r=>r.fatigue)):null,
  needsRecovery:fatigue.some(r=>r.fatigue>=4)||recentEffort.length>0||profile.readiness==='tired',
  pain:outcomes.some(r=>r.pain),
  youth:profile.age==='未满18岁',schoolStage:profile.schoolStage==='senior'?'senior':'junior',
  referencePerformance:Object.fromEntries(Object.keys(referenceEvents).map(b=>[b,recentPerformance(data.records||[],b,today)]).filter(([,r])=>r).map(([b,r])=>[b,{...r,kind:'achieved'}])),
  limitation:'零日志不等于零经验；未确认完整覆盖的日志不估算能力上限。用户完成标记不补造实际距离或用时。'};
}

export function assessCourseLoad(data,course,today){
 const context=trainingContext(data,today),reasons=[],limits=course.loadSummary||{};
 if(context.longestKm!==null&&limits.mainDistanceM>context.longestKm*1000)reasons.push('主训练距离已超过近期最长整课距离，另有热身冷身尚未计入');
 if(context.longestMinutes!==null&&limits.mainDurationSeconds>context.longestMinutes*60)reasons.push('主训练用时已超过近期最长整课用时');
 if(course.quality&&context.weeklyDays!==null&&context.weeklyDays<2)reasons.push('近期训练频率不足以支持质量课后的恢复结构，先核对中断与既有训练');
 return {allowed:reasons.length===0,reasons,baselineSource:context.baselineSource,unknown:['准备与整理用时','其他运动与力量负荷'],context};
}

export function assessWeekLoad(data,courses,today){
 const context=trainingContext(data,today),training=courses.filter(c=>c.id!=='rest'),reasons=[];
 let minimumSeconds=0,minimumDistanceM=0,uncalibrated=0;
 for(const c of training){
  minimumDistanceM+=c.loadSummary?.mainDistanceM||0;
  try{minimumSeconds+=workoutTotals(templateSpecification(c,context.referencePerformance)).mainRecoverySecondsRange?.[0]||0;}catch{uncalibrated++;minimumSeconds+=(c.loadSummary?.mainDurationSeconds||0)+(c.loadSummary?.recoverySeconds||0);}
 }
 if(context.weeklyDays!==null&&training.length>context.weeklyDays)reasons.push('模板课次超过近期已确认训练频率；保留组别，不自动增加训练日');
 if(context.weeklyKm!==null&&minimumDistanceM>context.weeklyKm*1000)reasons.push('已知主训练距离已超过近期周跑量，完整周负荷还包含准备与整理');
 if(context.weeklyMinutes!==null&&minimumSeconds>context.weeklyMinutes*60)reasons.push('仅主段和休息已超过近期周用时，不把未知热身冷身当零');
 const courseIssues=training.flatMap(c=>assessCourseLoad(data,c,today).reasons.map(reason=>({courseId:c.id,reason})));
 return {version:trainingPolicyVersion,status:reasons.length||courseIssues.length?'needs-load-review':context.baselineSource==='partial-or-unknown'?'baseline-unknown':'within-known-lower-bounds',
  canArrange:reasons.length===0&&courseIssues.length===0,reasons,courseIssues,minimumDistanceM,minimumSeconds,uncalibrated,
  baseline:{source:context.baselineSource,weeklyKm:context.weeklyKm,weeklyDays:context.weeklyDays,weeklyMinutes:context.weeklyMinutes},
  unknown:['热身与冷身实际时长/距离','力量、体育课与其他运动负荷'],disclaimer:'仅比较已知下限；未超出不等于完整负荷或医学安全已验证。'};
}

// Select whole authored sessions within a known frequency. Never shorten their
// rests, fabricate a pace, or silently change an athlete's selected group.
export function fitWeekToHistory(data,courses,today,{applyFatigue=true}={}){
 const context=trainingContext(data,today),copy=structuredClone(courses),changes=[];
 const rest=(index,reason)=>{
  const c=copy[index];changes.push({dayIndex:c.dayIndex,courseId:c.id,reason});
  copy[index]={id:'rest',name:'休息与自主恢复',category:'恢复',quality:false,event:c.event,selectedGroup:c.selectedGroup,population:c.population,cohortId:c.cohortId,weekPhase:c.weekPhase,weekPurpose:c.weekPurpose,dayIndex:c.dayIndex,dayLabel:c.dayLabel,calendarDate:c.calendarDate,calendarLocked:c.calendarLocked,relation:reason,adjustment:{sourceCourseId:c.id,sourceRevision:c.catalogRevision,reason}};
 };
 // Recovery is a reason to remove a stimulus, not an excuse to substitute a
 // new harder workout. Known pain is handled separately by the scheduling gate.
 for(const [i,c] of copy.entries())if(c.id!=='rest'&&(!assessCourseLoad(data,c,today).allowed||applyFatigue&&context.needsRecovery&&c.quality))rest(i,applyFatigue&&context.needsRecovery?'近期疲劳：暂撤质量课，原模板保留，不补课':'超过已确认单次耐受：保留组别，撤下本课等待复核');
 if(context.weeklyDays!==null){
  const days=Math.max(0,Math.min(7,Math.floor(context.weeklyDays)));
  const quality=copy.map((c,i)=>({c,i})).filter(x=>x.c.quality);
  // A low-frequency week cannot sustain the same two-stimulus structure.
  const qualityLimit=days<2?0:days<4?1:2;
  for(const {i} of quality.slice(qualityLimit))rest(i,'按近期训练频率保留恢复，撤下第二刺激；不自动增加训练日');
  const ranked=copy.map((c,i)=>({c,i})).filter(x=>x.c.id!=='rest').sort((a,b)=>{
   const priority=c=>c.quality?10:c.sessionRole==='recovery'?8:c.id.includes('long')?6:c.categoryId==='aerobic'?5:4;
   return priority(b.c)-priority(a.c)||a.i-b.i;
  });
  for(const {i} of ranked.slice(days))rest(i,'维持近期已确认训练频率；保留主课和恢复顺序，不自动加课');
 }
 return {courses:copy,changes,baselineSource:context.baselineSource};
}

export function resolveRaceDate({raceDate,event,data,startDate}){
 const goalEvent=data?.goals?.event||data?.goals?.race;
 const candidate=raceDate===undefined?(normalizeEvent(goalEvent)===event?data?.goals?.raceDate:null):raceDate;
 if(!candidate)return null;
 if(!validTrainingDate(candidate)||candidate<startDate)throw Error('比赛日期无效或早于周期开始；请更新目标，不压缩训练补进度');
 return candidate;
}

export function applyRaceWindow(courses,{start,raceDate,prepare,recover}){
 if(!raceDate)return courses;
 return courses.map((original,index)=>{
  const date=offset(start,index),days=Math.round((Date.parse(raceDate)-Date.parse(date))/86400000);
  let c=original;
  if(days>=1&&days<=7)c=prepare[7-days];
  else if(days>7&&days<=10&&c.quality)c={...recover.find(r=>r.id!=='rest'&&!r.quality),relation:'接近赛前节奏课，撤下相邻发展刺激，不压缩休息'};
  else if(days<0)c=recover[((-days)-1)%7];
  else if(days===0)c={id:'rest',name:'比赛日 · 核对已有比赛安排',quality:false,category:'比赛安排',event:original.event,selectedGroup:original.selectedGroup,raceReservation:true,weekPhase:'prepare'};
  return {...structuredClone(c),dayIndex:index,dayLabel:original.dayLabel,calendarDate:date,calendarLocked:days<=7,
   raceWindow:days<=7?'日期已对齐比赛；固定时段不能旋转赛前顺序':'比赛前发展阶段',
   ...(days<0?{relation:'赛后恢复，仅在恢复正常后另行确认下一周期，不自动重返专项主课'}:{})};
 });
}
