export const outcomeLabels={complete:'完成',partial:'部分完成',missed:'未完成'};
export function recordCompletion(data,id,{status,note='',pain=false},today,now=Date.now()){
 const plan=data.plans.find(p=>p.id===id);if(!plan||plan.cancelled||plan.executionStatus==='reference-only')throw Error('课次不可记录完成情况');
 if(plan.date>today)throw Error('未来课次不能提前标记完成');if(!outcomeLabels[status])throw Error('请选择完成情况');
 const report={status,note:String(note).trim().slice(0,2000),pain:Boolean(pain),source:'user-report',recordedAt:new Date(now).toISOString()};
 plan.completionReports=[...(plan.completionReports||[]),report];plan.trainingOutcome=report;plan.completed=status==='complete';if(pain)data.trainingHold=true;
 return report;
}
export function completionSummary(plans,today){
 const active=plans.filter(p=>!p.cancelled),count=status=>active.filter(p=>p.trainingOutcome?.status===status).length;
 return {completed:count('complete'),partial:count('partial'),notCompleted:count('missed'),legacyMarked:active.filter(p=>p.completed&&!p.trainingOutcome).length,unreported:active.filter(p=>!p.trainingOutcome&&!p.completed).map(p=>p.id),overdue:active.filter(p=>p.date<today&&!p.trainingOutcome&&!p.completed).map(p=>p.id)};
}
