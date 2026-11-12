import {dateKey} from './model.js';
import {courseReadiness} from './engine.js';
// Private, deterministic transcription. No external service sees the source text.
export const blockNames=['热身','主训练','恢复','冷身'];
export function parseCoachText(raw) {
  const original=String(raw);
  const blocks=Object.fromEntries(blockNames.map(name=>[name,'']));
  const unassigned=[];
  let active='';
  for(const line of original.split(/\r?\n/)) {
    const match=line.match(/^\s*(热身|主训练|休息安排|小组休息|大组休息|恢复|趟间恢复|组间恢复|冷身|warm[ -]?up|main(?: set| workout| training)?|recovery|rest|between reps|between sets|cool[ -]?down)\s*[:：]\s*(.*)$/i);
    if(match){
      const label=match[1];
      active=/休息|恢复|recovery|rest|between/i.test(label)?'恢复':/warm/i.test(label)?'热身':/cool/i.test(label)?'冷身':/main/i.test(label)?'主训练':label;
      blocks[active]+=(blocks[active]?'\n':'')+(active==='恢复'?label+'：':'')+match[2];
    } else if(line.trim()){
      // An unfamiliar heading is not a license to put strides into cooldown
      // or merge another day's session into the previous block.
      if(/^\s*[^:：]{1,60}[:：]/.test(line))active='';
      if(active)blocks[active]+='\n'+line;else unassigned.push(line);
    }
  }
  const unresolved=blockNames.filter(name=>!blocks[name]).map(name=>name+'待补');
  if(!/(配速|Tempo|阈值|秒\/|RPE|pace|threshold)/i.test(blocks.主训练))unresolved.push('目标节奏待核对');
  if(/待补|待定|不详|未知|not supplied|not specified|unknown|\bTBD\b/i.test(Object.values(blocks).join(' ')))unresolved.push('原文含未确定参数');
  if(unassigned.length)unresolved.push('未归类原文待核对');
  return {original,blocks,unassigned,unresolved,parserVersion:1};
}
const minute=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'')?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
function potentialQuality(item) {
  if(typeof item.quality==='boolean')return item.quality;
  if(Number(item.effort)>=6)return true;
  if(['轻松跑','恢复跑','休息'].includes(item.type))return false;
  return true; // Unknown intensity is a reason to review, not an invented easy session.
}
export function occupied(plan) {
  const start=minute(plan.start);
  const duration=Number(plan.estimatedMinutes);
  if(start===null||!Number.isFinite(duration)||!(duration>0))return {...plan,end:'',durationStatus:'待补：含全部恢复的时长'};
  const end=Math.ceil(start+duration+Number(plan.preparationMinutes||0)+Number(plan.bufferMinutes||0));
  if(end>=1440)return {...plan,end:'',durationStatus:'跨日占用待核对'};
  return {...plan,end:String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0'),durationStatus:'估计（用户填写，非自动测量）'};
}
export function recurringFor(data,date) {
  const weekday=new Date(date+'T12:00:00').getDay();
  const exceptions=data.coachSchedule?.exceptions||{};
  const rules=data.coachSchedule?.rules||[];
  const regular=rules.filter(rule=>Number(rule.weekday)===weekday).map(rule=>({...rule,id:rule.id+'|'+date,date}));
  for(const [id,change] of Object.entries(exceptions)){
    if(change.date!==date||id.endsWith('|'+date))continue;
    const rule=rules.find(r=>id.startsWith(r.id+'|'));if(rule)regular.push({...rule,id,date});
  }
  return regular.map(rule=>({...rule,...exceptions[rule.id]})).filter(rule=>rule.date===date&&!rule.cancelled&&!data.plans.some(plan=>plan.recurringKey===rule.id)).map(rule=>({...rule,type:rule.kind==='training'?'俱乐部时段 · 内容待下发':'学习／工作',collection:'events',recurring:true}));
}
export function assessSchedule(data,plan,{today=dateKey(),previous=null}={}) {
  const item=occupied(plan),conflicts=[],information=[],loadReview=[],executionRestrictions=[];
  const others=[...data.plans,...data.runs,...data.events.map(p=>({...p,collection:'events'})),...recurringFor(data,plan.date)].filter(p=>p.id!==plan.id&&!p.cancelled&&p.executionStatus!=='reference-only'&&p.id!==plan.recurringKey);
  const training=plan.collection!=='events'||plan.kind==='training';
  if(!item.end)information.push('结束时间待补，不能确认没有时间冲突；保存不代表时间已核验');
  if(training&&typeof plan.quality!=='boolean'&&!['轻松跑','恢复跑','休息'].includes(plan.type))information.push('强度未确定，负荷仅作待核对提示');
  for(const other of others){
    if(other.date===plan.date){
      const a=minute(item.start),b=minute(item.end),c=minute(other.start),d=minute(other.end);
      if(a!==null&&b!==null&&b>a&&c!==null&&d!==null&&d>c&&a<d&&c<b)conflicts.push('占用冲突：'+other.name+'（'+other.start+'–'+other.end+'）');
      else if(c===null||d===null||a===null||b===null)information.push('时间范围待核对：'+other.name+'；未据此判定重叠');
    }
    if(training&&potentialQuality(plan)&&potentialQuality(other)&&other.collection!=='events'&&Math.abs(Date.parse(other.date)-Date.parse(plan.date))<3*86400000)loadReview.push('相邻课次负荷需核对：'+other.name+'；日期间隔不是个体适用性结论');
  }
  if(training){
    const readiness=courseReadiness(data,{adapted:true,quality:false},plan.date,today);
    if(['paused','recovery'].includes(readiness.status))executionRestrictions.push(readiness.reason);
    if(data.cycleProfile?.age==='未满18岁')executionRestrictions.push('青少年执行仍需教练确认适龄、成熟度和恢复；整理日程不替代该确认');
    if(plan.executionStatus==='reference-only')executionRestrictions.push('历史资料仅作参考，不作为当前执行方案');
  }
  const changeType=!previous?'new-arrangement':previous.date!==plan.date?'date-change':Number(previous.estimatedMinutes||0)!==Number(plan.estimatedMinutes||0)?'duration-estimate':'time-only';
  return {version:1,changeType,conflicts:[...new Set(conflicts)],information:[...new Set(information)],loadReview:[...new Set(loadReview)],executionRestrictions:[...new Set(executionRestrictions)],canSave:!conflicts.length,executionApproved:false};
}
export function scheduleWarnings(data,plan,options) {
  const review=assessSchedule(data,plan,options);
  return [...review.conflicts,...review.information,...review.loadReview,...review.executionRestrictions];
}
export function moveCoachPlan(data,id,changes,options={}) {
  const plan=data.plans.find(p=>p.id===id&&p.coachIssued);
  if(!plan||plan.completed)throw new Error('课次不存在或已完成');
  const next=occupied({...plan,date:changes.date??plan.date,start:changes.start??plan.start,estimatedMinutes:changes.estimatedMinutes??plan.estimatedMinutes,id:plan.id,coachIssued:plan.coachIssued});
  const review=assessSchedule(data,next,{...options,previous:plan});
  if(!review.canSave)return {warnings:review.conflicts,review};
  const timing=p=>({date:p.date,start:p.start,end:p.end,estimatedMinutes:p.estimatedMinutes});
  next.scheduleReview=review;
  next.scheduleAudit=[...(plan.scheduleAudit||[]),{at:new Date().toISOString(),before:timing(plan),after:timing(next),review:structuredClone(review)}];
  Object.assign(plan,next);
  return {plan,review};
}
