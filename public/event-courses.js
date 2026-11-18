// Editorial candidates: cited principles and product-selected doses are distinct.
// No PB, age or streak is used as a multiplier of training volume.
export const eventCourseRevision='2026-11-18-event-v1';
export const supportedEvents=['800 m','1500 m','3000 m','5000 m','越野跑'];
export const normalizeEvent=e=>({'800m':'800 m','1500m':'1500 m','3000m':'3000 m','3 km':'3000 m','5 km':'5000 m','5km':'5000 m','越野':'越野跑','Cross Country':'越野跑'})[e]||e;
const sources={
 definitions:{id:'definitions',title:'Jack Daniels · Training Definitions',url:'https://vdoto2.com/learn-more/training-definitions',kind:'原作者公开训练定义',population:'有持续训练的跑者',rule:'区分持续有氧、Tempo、重复节奏及技术；休息服务于训练目的',limit:'未采用付费配速表；不直接验证本产品次数、距离及周安排'},
 xc:{id:'xc',title:'World Athletics · Cross country for beginners (2021)',url:'https://worldathletics.org/personal-best/performance/cross-country-trail-running-advice-tips-beginners',kind:'官方平台教练实践',population:'越野入门及有基础跑者',rule:'变化地形、按时间节奏变化、控制体感，配合力量与协调',limit:'不提供本产品精确剂量；不把平地PB换算为越野目标秒数'},
 youth:{id:'youth',title:'Krabak 等 · Youth running consensus (2021)',url:'https://doi.org/10.1136/bjsports-2020-102518',kind:'同行评审共识',population:'青少年跑者，按发育和训练背景判断',rule:'个体化、充足休息与能量供给，保留多方向活动；不能仅按年龄规定统一负荷',limit:'本产品初高中分支不是共识验证的剂量；成熟度、总运动负荷仍需本人和现场教练核对'},
 middle:{id:'middle',title:'Haugen 等 · 800m / 1500m训练综述 (2021)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8363530/',kind:'同行评审综述',population:'世界级中跑，成人男性资料偏多',rule:'800m速度与1500m有氧支持侧重不同，准备、专项和恢复有不同目的',limit:'仅用于项目差异，不把精英训练量外推到青少年'},
 load:{id:'load',title:'IOC负荷与伤病共识 (2016)',url:'https://pubmed.ncbi.nlm.nih.gov/27535989/',kind:'同行评审共识',population:'多项目运动员',rule:'同时考虑训练背景、负荷与恢复',limit:'本产品恢复间隔是保守编排，不是已验证的个人安全阈值'}
};
const groups={base:'基础',advanced:'进阶',competitive:'竞技'};
const phases={base:'基础期',develop:'专项期',prepare:'比赛期',recover:'恢复期'};
const categories={interval:'间歇',tempo:'Tempo／阈值',speed:'速度与技术',aerobic:'有氧与恢复',hills:'坡道与越野'};
const roles={development:'常规发展主课',transition:'衔接课',technique:'技术辅助课',primer:'赛前短量课',recovery:'恢复课'};
const effort={easy:'轻松，能完整交谈；不末段加速',threshold:'Tempo，受控偏强且各段稳定；不是比赛全力，也不由PB推阈值',technique:'快而放松，动作质量优先；非全力冲刺'};

export function eventCourses(event,{group='base',youth=false,schoolStage='junior'}={}){
 if(!supportedEvents.includes(event)||!groups[group])return [];
 const xc=event==='越野跑',senior=schoolStage==='senior',level=['base','advanced','competitive'].indexOf(group);
 const population=youth?'youth-'+(senior?'senior':'junior'):'adult-distance';
 const school=youth?(senior?'高中':'初中')+'专项组':'成人持续训练组';
 const refs=[sources.definitions,sources.load,...(xc?[sources.xc]:[]),...(youth?[sources.youth,...(['800 m','1500 m'].includes(event)?[sources.middle]:[])]:[])];
 const prep='轻松慢跑、动态活动、相应跑姿准备；准备充分后进入主训练，距离和实际用时由本人记录。';
 const cool='逐步放慢，轻松慢跑与放松整理；不适时直接停止。';
 function make(id,name,category,role,phase,amount,reps,rest,basis,objective,options={}){
  const unit=options.unit||'min',pace=options.effort||effort[basis]||basis+'m 配速';
  const c={id,name,event,categoryId:category,category:categories[category],selectedGroup:group,population,youth,adapted:youth,schoolStage:youth?(senior?'senior':'junior'):null,
   trainingGroups:[groups[group]],trainingPhases:options.phases||[phase],phase,phaseLabel:phases[phase],sessionRole:role,roleLabel:roles[role],quality:['interval','tempo','hills'].includes(category),
   sets:1,segments:[{distance:amount,unit,repeats:reps,recoverySeconds:rest}],setRecovery:0,targetBasis:basis,recoveryMode:category==='tempo'||category==='interval'?'jog':'walk',
   warmup:prep,cooldown:cool,objective,primaryObjective:objective,intensityBasis:pace,
   eligibility:school+' · '+groups[group]+'。已有本课相近主段和恢复的耐受；初次接触或近期中断不能按PB直接采用。'+(youth?'同时核对发育变化、体育课/其他运动、营养及学业恢复；年级不等于成熟度。':''),
   adjustment:'不自动加趟、提速或缩短休息；疲劳未退暂停质量课，漏课不补堆。',automaticRecommendation:false,executionEligible:true,catalogStatus:'candidate',catalogRevision:eventCourseRevision,
   sources:structuredClone(refs),review:{status:'pending',label:'编排完成 · 待独立审核',reviewer:null,date:null},
   contentState:{sources:'checked',programming:'complete',independentReview:'pending',currentExecution:'requires-readiness'},
   evidenceMap:[{parameter:'目的与配速依据',source:refs.map(s=>s.title+'：'+s.rule).join('；'),adaptation:objective,limit:'公开原则不直接验证本课的精确组数、主训练量或目标人群'},
    {parameter:'段长、次数及两层休息',source:'训练类别与恢复原则见上述来源；无该整套剂量的直接试验',adaptation:`产品编排：1大组，每大组${reps}小组×${amount}${unit}；小组休息${rest}秒${category==='tempo'||category==='interval'?'慢跑':'步行'}，无大组休息。${options.choice||''}`,limit:'仅适用已有相近负荷的所选组；需要独立教练审核，不能当作统一适龄阈值'}],
   parameterOrigin:'来源核对原则；段长、次数、休息和组别为明确标记的产品编排，尚无独立审核。'};
  if(unit!=='m')c.prescription={version:3,origin:'editorial-candidate',catalogRevision:eventCourseRevision,setCount:1,
   repetitions:[{durationSeconds:amount*(unit==='min'?60:1),repsPerSet:reps,target:{targetBasis:basis,effort:pace,provenance:'按体感；不外推PB百分比'},repRecovery:rest?{mode:c.recoveryMode,endRule:'time',durationSeconds:rest}:null}],setRecovery:null,
   warmup:[{label:prep}],cooldown:[{label:cool}],objective,parameterSource:c.evidenceMap[1].adaptation,review:structuredClone(c.review)};
  return c;
 }
 const easy=youth?(senior?[15,20,25]:[12,15,20])[level]:[20,30,35][level];
 const long=youth?(senior?[20,25,35]:[15,20,25])[level]:[30,40,50][level];
 const tempoReps=youth?(senior&&level>0?3:2):[2,3,4][level];
 const tempoMinutes=youth?(senior?4:3):5;
 const list=[
  make('aerobic','轻松有氧支持','aerobic','development','base',easy,1,0,'easy','维持轻松连续性，为质量课留下恢复空间',{phases:['base','develop']}),
  make('aerobic-long','连续有氧支持','aerobic','development','base',long,1,0,'easy','保持已耐受的持续有氧，不作为每周加量测试',{phases:['base','develop']}),
  make('aerobic-recovery','恢复轻松跑','aerobic','recovery','recover',youth?8:10,1,0,'easy','低负荷恢复；有残余疲劳可完全休息',{phases:['base','develop','prepare','recover']}),
  make('speed','放松加速与协调','speed','technique','base',youth?10:15,youth?4:6,90,'technique','练习快速放松与协调，不发展力竭速度耐力',{unit:'sec',phases:['base','develop']}),
  make('tempo','分段 Tempo','tempo','development','base',tempoMinutes,tempoReps,90,'threshold','维持受控连续输出，短休息服务于稳定节奏',{phases:['base','develop']}),
  make('primer','赛前节奏唤醒','speed','primer','prepare',10,3,120,'technique','保留熟悉动作，避免新疲劳；不在比赛前补做发展主课',{unit:'sec'}),
  make('technique-recovery','低疲劳协调','speed','technique','recover',10,3,120,'technique','恢复期保持动作感，疲劳未退则取消',{unit:'sec'})
 ];
 if(youth){
  const dose=event==='800 m'?[20,'sec',senior?6:4,120,'technique','短段放松与速度协调']:
   event==='1500 m'?[1,'min',senior?6:4,120,'threshold','分段节奏与姿态控制']:
    event==='3000 m'?[2,'min',senior?4:3,120,'threshold','稳定有氧节奏重复']:
     event==='5000 m'?[3,'min',senior?4:3,120,'threshold','长段有氧节奏重复']:[1,'min',senior?6:4,120,'threshold','地形节奏变化'];
  list.push(make('interval',dose[5],'interval','development','develop',dose[0],dose[2],dose[3],xc?'terrain':event==='800 m'?'technique':'controlled',dose[5],{unit:dose[1],effort:event==='800 m'?effort.technique:'稳定、受控，能说短句；非比赛全力；各段动作一致',choice:'初高中分开编排；不按更快PB或竞技标签增加次数。'}));
 }else if(xc){
  list.push(make('interval','地形节奏间歇','interval','development','develop',3,[3,4,5][level],120,'terrain','在可控地形切换输出，上坡缩步、下坡控制；不追平路圈速',{effort:'受控偏强，按地形保持动作；不设平地PB秒数',choice:'避开湿滑和陡技术坡，120秒轻松恢复，不做下坡冲刺。'}));
 }else{
  const three=event==='3000 m';
  list.push(make('interval',three?'600m 专项节奏重复':'1000m 专项节奏重复','interval','development','develop',three?600:1000,[3,4,5][level],three?150:120,three?'3000':'5000','同项近期已达均速下保持各段一致；不是用比赛速度推算VO₂max或阈值',{unit:'m',choice:'组别须已有相近1.8–3km或3–5km主段耐受；不是从基础组自动加组升级。'}));
 }
 const hill=make('hills','缓坡动作练习','hills','technique','base',10,youth?4:5,180,'technique','安全缓坡练推进动作，步行下坡；不做力竭或下坡冲刺',{unit:'sec',choice:'180秒为产品休息安排，未回起点或未恢复可延长/停止。'});
 hill.sources.push(structuredClone(sources.xc));list.push(hill);
 return list;
}

export function eventWeek(courses,event,{phase='develop',group='base',youth=false,schoolStage='junior'}={}){
 const recovery=phase==='recover',prepare=phase==='prepare';
 // All days belong to the same cohort. One primary stimulus; the second is only
 // for the explicitly selected experienced adult cohort, never triggered by PB.
 const second=!youth&&group==='competitive';
 const patterns={base:['speed','tempo',null,'aerobic',second?'hills':null,null,'aerobic-long'],
  develop:['speed','interval',null,'aerobic',second?'tempo':null,null,'aerobic-long'],
  prepare:['aerobic-recovery',null,'primer',null,'aerobic-recovery',null,null],
  recover:['aerobic-recovery',null,'technique-recovery',null,'aerobic-recovery',null,null]};
 const purpose=recovery?'主动恢复：撤下质量刺激，不自动回加。':prepare?'比赛期：保留低疲劳动作，撤下发展主课；比赛日期用于锁定赛前及赛后安排。':phase==='base'?'基础期：受控有氧与技术积累，已有耐受优先。':'专项期：专项主课替换基础期刺激，轻松日与休息日连接，不额外叠加。';
 const population=courses[0].population;
 return patterns[phase].map((id,i)=>({...structuredClone(id?courses.find(c=>c.id===id):{id:'rest',name:'休息与自主恢复',quality:false,category:'恢复'}),event,selectedGroup:group,population,
  cohortId:[event,population,group].join('|'),weekPhase:phase,weekPurpose:purpose,weekDraft:true,previewOnly:true,dayIndex:i,dayLabel:['周一','周二','周三','周四','周五','周六','周日'][i],
  weekEligibility: courses[0].eligibility,relation:i===1?'本周主刺激；之后留出休息与轻松支持':i===4&&second&&!recovery&&!prepare?'第二种刺激，与主课间隔两个低负荷日':'轻松支持或休息，不补堆漏课',
  strengthSupport:!recovery&&!prepare&&i===3?{status:'optional-existing-routine',content:'在轻松日复用熟悉的提踵、臀桥、平衡和躯干控制；动作质量优先，不新增最大重量或跳跃负荷。',youthSupervision:youth,loadKnown:false,source:sources.xc.url}:null,
  transitionRules:'先核对当前恢复和同类训练耐受，再确认阶段推进；初高中不按年龄或PB自动加量。力量和体育课计入总负荷。',schoolStage:youth?schoolStage:null}));
}
