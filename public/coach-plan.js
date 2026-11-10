// Private, deterministic transcription. No external service sees the source text.
export const blockNames=['热身','主训练','恢复','冷身'];
export function parseCoachText(raw) {
  const original=String(raw);
  const blocks=Object.fromEntries(blockNames.map(name=>[name,'']));
  const unassigned=[];
  let active='';
  for(const line of original.split(/\r?\n/)) {
    const match=line.match(/^\s*(热身|主训练|恢复|趟间恢复|组间恢复|冷身)\s*[:：]\s*(.*)$/);
    if(match){active=/恢复/.test(match[1])?'恢复':match[1];blocks[active]+=(blocks[active]?'\n':'')+(/恢复/.test(match[1])?match[1]+'：':'')+match[2];}
    else if(line.trim()){if(active)blocks[active]+='\n'+line;else unassigned.push(line);}
  }
  const unresolved=blockNames.filter(name=>!blocks[name]).map(name=>name+'待补');
  if(!/(配速|Tempo|阈值|秒\/|RPE)/i.test(blocks.主训练))unresolved.push('目标节奏待核对');
  if(/待补|待定|不详|未知/.test(Object.values(blocks).join(' ')))unresolved.push('原文含未确定参数');
  if(unassigned.length)unresolved.push('未归类原文待核对');
  return {original,blocks,unassigned,unresolved,parserVersion:1};
}
const minute=value=>/^\d{2}:\d{2}$/.test(value||'')?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
function potentialQuality(item) {
  if(typeof item.quality==='boolean')return item.quality;
  if(Number(item.effort)>=6)return true;
  if(['轻松跑','恢复跑','休息'].includes(item.type))return false;
  return true; // Unknown intensity is a reason to review, not an invented easy session.
}
export function occupied(plan) {
  const start=minute(plan.start);
  const duration=Number(plan.estimatedMinutes);
  if(start===null||!(duration>0))return {...plan,end:'',durationStatus:'待补：含全部恢复的时长'};
  const end=start+duration+Number(plan.preparationMinutes||0)+Number(plan.bufferMinutes||0);
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
export function scheduleWarnings(data,plan) {
  const item=occupied(plan), warnings=[];
  const others=[...data.plans,...data.runs,...data.events.map(p=>({...p,collection:'events'})),...recurringFor(data,plan.date)].filter(p=>p.id!==plan.id&&!p.cancelled&&p.executionStatus!=='reference-only'&&p.id!==plan.recurringKey);
  if(!item.end)warnings.push('结束时间待补，不能确认没有时间冲突');
  for(const other of others){
    if(other.date===plan.date&&item.start&&other.start&&(!other.end||!item.end||item.start<other.end&&other.start<item.end))warnings.push('占用冲突：'+other.name);
    if(potentialQuality(plan)&&potentialQuality(other)&&other.collection!=='events'&&Math.abs(Date.parse(other.date)-Date.parse(plan.date))<3*86400000)warnings.push('相邻课次负荷需核对：'+other.name);
  }
  return [...new Set(warnings)];
}
export function moveCoachPlan(data,id,changes) {
  const plan=data.plans.find(p=>p.id===id&&p.coachIssued);
  if(!plan||plan.completed)throw new Error('课次不存在或已完成');
  const next=occupied({...plan,date:changes.date||plan.date,start:changes.start||plan.start,estimatedMinutes:changes.estimatedMinutes||plan.estimatedMinutes,id:plan.id,coachIssued:plan.coachIssued});
  const warnings=scheduleWarnings(data,next);
  if(warnings.length)return {warnings};
  Object.assign(plan,next);
  return {plan};
}
