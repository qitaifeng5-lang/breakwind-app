import {pbWeek,contentGroups,coursePhases} from './pb-library.js';
import {weekStart,offset} from './model.js';
import {recurringFor} from './coach-plan.js';
export const weekRevision='2026-11-12-calendar-v2';
export function restoreSelection(saved,data){
 const aliases={...Object.fromEntries(Object.keys(contentGroups).map(k=>[k,k])),...Object.fromEntries(Object.entries(contentGroups).map(([k,v])=>[v,k]))};
 const old=data.groupPlan||{},group=aliases[saved?.group]||aliases[old.group]||aliases[old.level];
 return {event:saved?.event||old.event,pb:saved?.pb??old.pb??'',group:group||'base',confirmed:Boolean(group),phase:Object.hasOwn(coursePhases,saved?.phase||old.phase)?(saved?.phase||old.phase):'develop'};
}
export function courseParameters(c){return {id:c.id,event:c.event,group:c.selectedGroup,revision:c.catalogRevision,sets:c.sets,segments:c.segments,setRecovery:c.setRecovery,targetBasis:c.targetBasis,targetBases:c.targetBases,prescription:c.prescription,executionSpec:c.executionSpec,warmup:c.warmup,cooldown:c.cooldown};}
export function calendarWeek(data,event,pb,options,date){
 return mapWeekCourses(data,pbWeek(event,pb,options),weekStart(date));
}
export function mapWeekCourses(data,template,start){
 const days=Array.from({length:7},(_,i)=>offset(start,i));
 const slots=days.map(d=>recurringFor(data,d).filter(r=>r.kind==='training'&&!r.cancelled));
 const fixed=Boolean(data.coachSchedule?.rules?.some(r=>r.kind==='training'));
 // Rotate the whole structure, never randomly draw sessions or compress recovery.
 let shift=0;if(fixed){let best=-1;for(let n=0;n<7;n++){const score=template.reduce((s,c,i)=>s+(c.id!=='rest'&&slots[(i+n)%7].length?(c.quality?3:1):0),0);if(score>best){best=score;shift=n;}}}
 const rows=days.map((date,i)=>{const c=structuredClone(template[(i-shift+7)%7]),slot=slots[i][0],plans=data.plans.filter(p=>p.date===date&&!p.cancelled&&p.executionStatus!=='reference-only');
  const coachNearby=c.quality&&data.plans.some(p=>p.coachIssued&&!p.cancelled&&Math.abs(Date.parse(p.date)-Date.parse(date))<3*86400000);
  return {date,course:c,slot,plans,held:c.id!=='rest'?(plans.length?'已有课表优先':coachNearby?'邻近教练安排，先核对':fixed&&!slot?'固定时段不足，暂不安排':''):'',mapping:{revision:weekRevision,shift,reason:fixed?'整周平移匹配固定训练日，保留小组、大组和周内间隔':'日历周从周一开始；尚未保存为个人课表'}};});
 return {start,rows,template,shift,fixed,held:rows.filter(r=>r.held).length};
}
export function weekTotals(courses){
 const total={mainDistanceM:0,aerobicSeconds:0,otherMainSeconds:0,recoverySeconds:0,unknown:0};
 for(const c of courses.filter(c=>c.id!=='rest')){const t=c.loadSummary;if(c.isPlanningSlot||!t){total.unknown++;continue;}if(t.mainDistanceM!=null)total.mainDistanceM+=t.mainDistanceM;if(t.mainDurationSeconds!=null)total[c.categoryId==='aerobic'?'aerobicSeconds':'otherMainSeconds']+=t.mainDurationSeconds;if(t.mainDistanceM==null&&t.mainDurationSeconds==null)total.unknown++;if(t.recoverySeconds!=null)total.recoverySeconds+=t.recoverySeconds;else total.unknown++;}
 return {...total,preparation:'热身与冷身时长未知，不计入已知合计',actual:false};
}
