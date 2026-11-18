export const outcomeLabels={complete:'完成',partial:'部分完成',missed:'未完成'};
export function recordCompletion(data,id,{status,note='',pain=false,actualMinutes,effort,fatigue},today,now=Date.now()){
 const plan=data.plans.find(p=>p.id===id);if(!plan||plan.cancelled||plan.executionStatus==='reference-only')throw Error('课次不可记录完成情况');
 if(plan.date>today)throw Error('未来课次不能提前标记完成');if(!outcomeLabels[status])throw Error('请选择完成情况');
 const optional=(value,min,max,label)=>{if(value===undefined||value===null||value==='')return null;const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+'超出有效范围');return n;};
 const measured={actualMinutes:optional(actualMinutes,0,720,'实际用时'),effort:optional(effort,0,10,'主观用力'),fatigue:optional(fatigue,1,5,'疲劳')};
 if(status==='missed'&&(measured.actualMinutes>0||measured.effort>0))throw Error('未完成课次不能同时记录训练用时或用力；做过部分训练请选择部分完成');
 const report={status,note:String(note).trim().slice(0,2000),pain:Boolean(pain),...measured,source:'user-report',recordedAt:new Date(now).toISOString()};
 plan.completionReports=[...(plan.completionReports||[]),report];plan.trainingOutcome=report;plan.completed=status==='complete';if(pain)data.trainingHold=true;
 return report;
}
export function completionSummary(plans,today){
 const active=plans.filter(p=>!p.cancelled),count=status=>active.filter(p=>p.trainingOutcome?.status===status).length;
 return {completed:count('complete'),partial:count('partial'),notCompleted:count('missed'),legacyMarked:active.filter(p=>p.completed&&!p.trainingOutcome).length,unreported:active.filter(p=>!p.trainingOutcome&&!p.completed).map(p=>p.id),overdue:active.filter(p=>p.date<today&&!p.trainingOutcome&&!p.completed).map(p=>p.id)};
}
