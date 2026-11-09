// Execution specifications are snapshots, never inferred from a browsing PB.
export const paceLabels={'800':'800m 配速','1500':'1500m 配速','3000':'3km 配速','5000':'5km 配速',threshold:'Tempo',coach:'自定义配速'};
// Only supported calibration bases are offered; display names do not infer new targets.
export const targetBases=Object.fromEntries(['800','1500','threshold','coach'].map(key=>[key,paceLabels[key]]));
export const recoveryModes={jog:'慢跑',walk:'步行',stand:'站立',mixed:'混合恢复'};
export const supportsWorkout=c=>['800 m','1500 m'].includes(c?.event)&&['interval','combination'].includes(c?.id) && (c.id==='combination'||c.event==='800 m');
const positive=n=>Number.isFinite(n)&&n>0;
export const raceSplit=(seconds,raceDistance,distance)=>[seconds,raceDistance,distance].every(positive)?seconds*distance/raceDistance:null;
export function recentPerformance(records,event,today) {
  return records.filter(r=>r.event===event+' m' && r.kind!=='goal' && r.seconds>0 && r.date<=today && Date.parse(today)-Date.parse(r.date)<=90*86400000).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
}
export function targetFor(distanceM,basis,reference,range) {
  if(!positive(distanceM))return null;
  if (basis==='800'||basis==='1500') {
    if (!reference || reference.event!==basis+' m'||reference.kind!=='achieved'||!positive(reference.seconds)) return null;
    const seconds=raceSplit(reference.seconds,Number(basis),distanceM);
    return {targetBasis:basis,referencePerformance:structuredClone(reference),targetSecondsRange:[seconds,seconds],provenance:'同项已达成绩均速换算；不是生理阈值或负荷处方',status:'user-confirmed-reference'};
  }
  if (['threshold','coach'].includes(basis)&&range?.length===2&&range.every(positive)&&range[1]>=range[0]) return {targetBasis:basis,referencePerformance:null,targetSecondsRange:[...range],provenance:basis==='threshold'?'用户录入已校准阈值分段；App未测量或验证':'用户转录教练给定秒数；App未核验教练身份',status:'user-entered'};
  return null;
}
export function recoverySteps(recovery) {
  if (!recovery) throw new Error('缺少必要恢复');
  if (recovery.mode==='mixed') {if(!recovery.steps?.length)throw new Error('混合恢复缺少动作');return recovery.steps.flatMap(recoverySteps);}
  if (!['jog','walk','stand'].includes(recovery.mode)) throw new Error('请选择恢复动作');
  const time=positive(recovery.durationSeconds),distance=positive(recovery.distanceM),rule=recovery.endRule;
  if(!['time','distance','both','either'].includes(rule))throw new Error('请选择恢复结束条件');
  if(rule==='time'&&(!time||recovery.distanceM)||rule==='distance'&&(!distance||recovery.durationSeconds)||['both','either'].includes(rule)&&(!time||!distance))throw new Error('恢复时间、距离与结束条件不一致');
  if(recovery.mode==='stand'&&distance)throw new Error('站立恢复不能设置移动距离');
  return [{kind:'recovery',...recovery}];
}
export function compileWorkout(spec) {
  for(const phase of ['warmup','cooldown'])if(!spec[phase]?.length||!spec[phase].every(s=>positive(s.durationSeconds)||positive(s.distanceM)))throw new Error('请补充热身与冷身安排');
  if (!Number.isInteger(spec.setCount)||spec.setCount<1||spec.setCount>20) throw new Error('大组数无效');
  const units=spec.repetitions.flatMap((r,index)=>{
    if (!Number.isInteger(r.repsPerSet)||r.repsPerSet<1||r.repsPerSet>30||!positive(r.distanceM)||!r.target?.targetSecondsRange?.every(positive)||r.target.targetSecondsRange.length!==2||r.target.targetSecondsRange[1]<r.target.targetSecondsRange[0]) throw new Error('主训练尚未校准');
    return Array.from({length:r.repsPerSet},(_,rep)=>({...r,segment:index,rep:rep+1,kind:'work'}));
  });
  if (!units.length) throw new Error('缺少主训练');
  const steps=spec.warmup.map(s=>({...s,kind:'warmup'}));
  for(let set=1;set<=spec.setCount;set++) {
    units.forEach((r,index)=>{
      steps.push({...r,set,lap:index+1,lapsPerSet:units.length});
      if(index<units.length-1) steps.push(...recoverySteps(r.repRecovery).map(s=>({...s,set,afterLap:index+1})));
    });
    if(set<spec.setCount) steps.push(...recoverySteps(spec.setRecovery).map(s=>({...s,set,betweenSets:true})));
  }
  steps.push(...spec.cooldown.map(s=>({...s,kind:'cooldown'})));
  return steps;
}
export function workoutTotals(spec) {
  const steps=compileWorkout(spec),main=steps.filter(s=>s.kind==='work'),rest=steps.filter(s=>s.kind==='recovery');
  const timed=steps.filter(s=>s.kind!=='work');
  const knownTime=timed.every(s=>s.durationSeconds>0 && !s.distanceM);
  const base=timed.reduce((n,s)=>n+(s.durationSeconds||0),0);
  return {mainDistanceM:main.reduce((n,s)=>n+s.distanceM,0),repCount:main.length,
    repRecoveries:rest.filter(s=>!s.betweenSets).length,setRecoveries:rest.filter(s=>s.betweenSets).length,
    recoverySeconds:rest.every(s=>s.durationSeconds>0&&!s.distanceM)?rest.reduce((n,s)=>n+s.durationSeconds,0):null,
    jogRecoveryDistanceM:rest.filter(s=>s.mode==='jog').every(s=>s.distanceM>0)?rest.filter(s=>s.mode==='jog').reduce((n,s)=>n+s.distanceM,0):null,
    warmupDistanceM:spec.warmup.every(s=>s.distanceM>0)?spec.warmup.reduce((n,s)=>n+s.distanceM,0):null,
    cooldownDistanceM:spec.cooldown.every(s=>s.distanceM>0)?spec.cooldown.reduce((n,s)=>n+s.distanceM,0):null,
    estimatedSecondsRange:knownTime?[0,1].map(i=>base+main.reduce((n,s)=>n+s.target.targetSecondsRange[i],0)):null};
}
export function newSession(spec,course,now,id) {
  return {id,spec:structuredClone(spec),course:structuredClone(course),steps:compileWorkout(spec),index:0,logs:[],elapsed:0,anchor:now,startedAt:now,status:'active'};
}
export const stepElapsed=(s,now)=>s.elapsed+(s.anchor===null?0:Math.max(0,now-s.anchor)/1000);
export function pauseSession(s,now) {s.elapsed=stepElapsed(s,now);s.anchor=null;}
export function advanceSession(s,now,reason='completed') {
  if(s.status!=='active') return false;
  const step=s.steps[s.index];
  s.logs.push({index:s.index,step:structuredClone(step),actualSeconds:stepElapsed(s,now),reason,at:now});
  s.elapsed=0;s.index++;
  if(s.index===s.steps.length){s.status='complete';s.anchor=null;}else s.anchor=now;
  return true;
}
export function stopSession(s,now,reason) {
  if(s.status!=='active')return;
  s.logs.push({index:s.index,step:structuredClone(s.steps[s.index]),actualSeconds:stepElapsed(s,now),reason:'unfinished',at:now});
  s.status='stopped';s.stopReason=reason;s.anchor=null;
}
export function sessionRecord(s,date) {
  const finished=s.logs.filter(l=>l.step.kind==='work'&&l.reason==='completed');
  return {id:s.id,date,name:s.course.name,type:'间歇跑',source:'manual',quality:finished.length>0,
    distance:finished.reduce((n,l)=>n+l.step.distanceM,0)/1000,minutes:s.logs.reduce((n,l)=>n+l.actualSeconds,0)/60,
    distanceBasis:'仅已确认完成的场地手动圈距离；不含未知的热身、恢复和冷身距离',
    pain:s.stopReason==='pain',courseSession:structuredClone(s),note:'分段手动计时 · '+(s.status==='complete'?'完整结束':'提前结束')};
}
