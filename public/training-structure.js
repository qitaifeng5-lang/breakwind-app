// @ts-check
/** @typedef {{mode:string,seconds:number|null,distanceM:number|null,description?:string}} Recovery */
/** @typedef {{id:string,repeats:number,amount:number|null,unit:'m'|'min'|'sec',target:string,recovery:Recovery,label?:string,skill?:boolean}} TrainingPart */
/** @typedef {{version:1,sets:number,warmup:string,cooldown:string,parts:TrainingPart[],setRecovery:Recovery}} TrainingStructure */
/** @typedef {{kind:'warmup'|'work'|'recovery'|'cooldown',label:string,detail:string,partId?:string,set?:number}} Segment */
/** @returns {TrainingStructure} */
export function emptyStructure(){return {version:1,sets:1,warmup:'轻松慢跑、动态活动、相应跑姿准备',cooldown:'轻松慢跑、放松整理',parts:[{id:'part-1',repeats:1,amount:null,unit:'m',target:'',recovery:{mode:'',seconds:null,distanceM:null}}],setRecovery:{mode:'',seconds:null,distanceM:null}};}
/** @param {unknown} raw @param {{draft?:boolean}} [options] @returns {TrainingStructure} */
export function readStructure(raw,{draft=false}={}){
 const value=typeof raw==='string'?JSON.parse(raw):structuredClone(raw);
 if(!value||value.version!==1||!Array.isArray(value.parts)||!value.parts.length||value.parts.length>12)throw new Error('训练结构无效，请重新核对');
 if(!Number.isFinite(value.sets)||!draft&&(!Number.isInteger(value.sets)||value.sets<1||value.sets>20))throw new Error('大组数应在1–20之间');
 if(typeof value.warmup!=='string'||typeof value.cooldown!=='string')throw new Error('准备与冷身内容无效');
 const ids=new Set();
 for(const p of value.parts){
  if(typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)||ids.has(p.id)||!Number.isFinite(p.repeats)||!draft&&(!Number.isInteger(p.repeats)||p.repeats<1||p.repeats>30)||!['m','min','sec'].includes(p.unit)||typeof p.target!=='string'||(p.amount!==null&&(!Number.isFinite(p.amount)||!draft&&(p.amount<=0||p.amount>100000))))throw new Error('请核对每段的趟数和距离／时长');
  ids.add(p.id);
  for(const r of [p.recovery,value.setRecovery])if(!r||!['','jog','walk','stand'].includes(r.mode)||[r.seconds,r.distanceM].some(n=>n!==null&&(!Number.isFinite(n)||!draft&&(n<0||n>100000)))||(!draft&&r.mode==='stand'&&r.distanceM))throw new Error('请核对恢复动作与时间／距离');
 }
 return value;
}
/** @param {Recovery} r */
export function restText(r){if(r.description)return r.description;const mode=({jog:'慢跑',walk:'步行',stand:'站立'})[r.mode]||'动作待补';return [mode,r.seconds!==null?r.seconds+'秒':'',r.distanceM!==null?r.distanceM+'m':''].filter(Boolean).join(' · ')+(r.seconds===null&&r.distanceM===null?' · 时长／距离待补':'');}
/** @param {TrainingStructure} s */
export function structureSummary(s){
 const reps=s.parts.reduce((n,p)=>n+p.repeats,0)*s.sets;
 const known=s.parts.every(p=>p.amount!==null),allDistance=s.parts.every(p=>p.unit==='m'),allTime=s.parts.every(p=>p.unit!=='m');
 const total=known?s.parts.reduce((n,p)=>n+(p.amount||0)*p.repeats*(p.unit==='min'?60:1),0)*s.sets:null;
 return {reps,mainDistanceM:known&&allDistance?total:null,mainSeconds:known&&allTime?total:null,restCount:Math.max(0,reps-s.sets),setRestCount:s.sets-1,
  gaps:[...(!s.warmup.trim()?['热身内容待补']:[]),...(!s.cooldown.trim()?['冷身内容待补']:[]),...s.parts.flatMap((p,i)=>[...(p.amount===null?['第'+(i+1)+'段距离／时长待补']:[]),...(!p.target.trim()?['第'+(i+1)+'段目标待补']:[]),...((p.repeats>1||i<s.parts.length-1)&&(!p.recovery.mode||p.recovery.seconds===null&&p.recovery.distanceM===null)?['第'+(i+1)+'段恢复待补']:[])]),...(s.sets>1&&(!s.setRecovery.mode||s.setRecovery.seconds===null&&s.setRecovery.distanceM===null)?['组间恢复待补']:[])]};
}
/** Sequence is ordinal, not proportional time, distance or physiological intensity.
 * @param {TrainingStructure} s @returns {Segment[]} */
export function structureSegments(s){
 /** @type {Segment[]} */const rows=[{kind:'warmup',label:'准备',detail:s.warmup||'热身内容待补'}];
 for(let set=1;set<=s.sets;set++)s.parts.forEach((p,i)=>{for(let rep=1;rep<=p.repeats;rep++){
  rows.push({kind:'work',label:p.label||(p.amount??'—')+({m:'m',min:'分',sec:'秒'})[p.unit],detail:p.skill?p.target:'第'+set+'组 · 第'+rep+'趟 · '+(p.target||'目标待补'),partId:p.id,set});
  if(rep<p.repeats||i<s.parts.length-1)rows.push({kind:'recovery',label:'恢复',detail:restText(p.recovery),partId:p.id,set});
  else if(set<s.sets)rows.push({kind:'recovery',label:'组间',detail:restText(s.setRecovery),set});
 }});
 rows.push({kind:'cooldown',label:'冷身',detail:s.cooldown||'冷身内容待补'});return rows;
}
