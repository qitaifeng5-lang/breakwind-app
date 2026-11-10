import {compileWorkout,workoutTotals} from './workout.js';
// Browsing groups are navigation aids, never a diagnosis of training readiness.
const specifications={
  '800 m':[180,105,5,'800m',125,150], '1500 m':[360,210,10,'1500m',270,330],
  '3000 m':[900,480,30,'3000m',600,750], '5000 m':[2100,840,60,'5km',1080,1500],
  '10000 m':[4200,1800,120,'10km',2280,3000], '越野跑':[3000,1200,120,'越野 · 6km参考',1560,2160],
  '半程马拉松':[9000,3600,300,'半马',5400,7200], '全程马拉松':[19800,7200,600,'全马',10800,14400]
};
export const pbDistances=Object.keys(specifications);
export const pbDistanceLabel=event=>specifications[event]?.[3] || event;
export const courseCategories={interval:'间歇',endurance:'速度耐力',tempo:'Tempo／阈值',speed:'速度与技术',combination:'组合课',aerobic:'有氧与恢复',hills:'坡道与越野'};
export const coursePhases={base:'基础期',develop:'专项期',prepare:'赛前期',recover:'恢复周'};
export const phasePurposes={base:'先建立有氧连续性与动作习惯，不追求比赛疲劳。',develop:'围绕专项节奏组织主课，以低负荷日隔开不同刺激。',prepare:'保留节奏感，减少质量课数量；不是按比赛日倒推的减量处方。',recover:'取消质量课，以休息和轻量技术恢复为主。'};
export const courseSources={
  middle:{title:'Haugen 等 · 800m / 1500m 训练综述（2021）',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8363530/',kind:'同行评审综述＋精英实践',
    population:'世界级中跑运动员，资料偏重成年男性',rule:'区分速度、速度耐力、有氧与专项节奏；短速度段需要充分恢复。',limit:'用于分类与恢复原则，不照搬精英周量。本库原创组数不是经验证的个体处方。'},
  intervals:{title:'World Athletics · Speed training（2022）',url:'https://worldathletics.org/personal-best/performance/speed-training-endurance-runners-benefits-limits',kind:'官方平台公开教练实践',
    population:'有训练基础的耐力跑者',rule:'3–4 × 500m，重复间恢复2–3分钟；质量课后安排轻松日。',limit:'仅500m课的重复和恢复范围对应原文，其余课程为原创编排，不能声称已验证。'},
  hills:{title:'World Athletics · Hill running（2021）',url:'https://worldathletics.org/personal-best/performance/hill-running-training-variety-speed-sessions',kind:'官方平台公开教练实践',
    population:'有基础的跑者',rule:'坡道按地形和体感控制；短坡重复用步行下坡恢复。',limit:'未采用全力冲刺和长上坡剂量；此处改为受控动作练习，需个体审核。'},
  youth:{title:'Krabak 等 · Youth running consensus（2021）',url:'https://pubmed.ncbi.nlm.nih.gov/33122252/',kind:'同行评审青少年共识',
    population:'青少年跑者，不能外推为统一年龄距离表',rule:'结合成熟度、营养、恢复与指导环境判断；不以年龄或PB直接套成人负荷。',limit:'共识未验证本库剂量。技术变式仍待专项教练审核，竞技强度须经教练个体评估。'},
  load:{title:'IOC · Load and injury consensus（2016）',url:'https://pubmed.ncbi.nlm.nih.gov/27535989/',kind:'同行评审共识',
    population:'多项目运动员',rule:'负荷与恢复一起判断，课程浏览不等于当日执行许可。',limit:'质量课之间留恢复日是保守编排规则，不代表经验证的安全阈值。'}
};
export function formatPB(seconds,{hours=false,fraction=false}={}) {
  if (!Number.isFinite(seconds)||seconds<=0) return '—';
  const centis=Math.round(seconds*100),whole=Math.floor(centis/100);
  const h=Math.floor(whole/3600),m=Math.floor(whole/60)%60,s=String(whole%60).padStart(2,'0');
  return (h||hours?h+':'+String(m).padStart(2,'0'):String(Math.floor(whole/60)))+':'+s+(fraction&&centis%100?'.'+String(centis%100).padStart(2,'0'):'');
}
export function pbSeconds(value) {
  if (typeof value==='number') return Number.isFinite(value)&&value>0?value:null;
  if (typeof value!=='string'||!/^\d{1,3}:[0-5]\d(?:\.[0-9]{1,2})?$|^\d{1,2}:[0-5]\d:[0-5]\d$/.test(value)) return null;
  const n=value.split(':').reduce((sum,part)=>sum*60+Number(part),0);
  return n>0?n:null;
}
export function pbOptions(event) {
  if (!Object.hasOwn(specifications,event)) return [];
  const [slow,fast,step]=specifications[event];
  return Array.from({length:Math.floor((slow-fast)/step)+1},(_,index)=>({seconds:slow-index*step,label:formatPB(slow-index*step),index}));
}
export function matchPB(event,value) {
  const n=pbSeconds(value),list=pbOptions(event);
  return n&&list.length?list.reduce((a,b)=>Math.abs(b.seconds-n)<Math.abs(a.seconds-n)?b:a):null;
}
export function pbBand(event,pb) {
  const n=pbSeconds(pb),spec=specifications[event];
  if (!spec||!n) return {id:'open',label:'不按成绩分组',range:'所有成绩，可自由浏览'};
  const [, , , ,fast,mid]=spec;
  return n<=fast?{id:'performance',label:'专项提高',range:'PB ≤ '+formatPB(fast)}:
    n<=mid?{id:'development',label:'专项发展',range:formatPB(fast)+' < PB ≤ '+formatPB(mid)}:
      {id:'foundation',label:'技术与节奏',range:'PB > '+formatPB(mid)};
}
const segment=(distance,repeats,recovery,unit='m')=>({distance,unit,repeats,recoverySeconds:recovery});
const definition=(id,name,phase,objective,sets,segments,setRecovery,effort,sourceIds)=>({id,name,phase,objective,sets,segments,setRecovery,effort,sourceIds});
export function pbCourses(event,pb,{youth=false,group='base'}={}) {
  if (!pbDistances.includes(event)) return [];
  const band=pbBand(event,pb),track=['800 m','1500 m'].includes(event),short=event==='800 m',xc=event==='越野跑';
  const foundation=['foundation','open'].includes(band.id);
  // Explicit editorial variants. Faster PB never automatically adds repetitions.
  const definitions=[
    definition('interval',short?'200m 节奏重复':track?'500m 稳定间歇':'分段有氧间歇','develop','保持重复段的节奏一致，最后一段仍能控制动作',1,
      [segment(short?200:track?500:3,short?4:3,track?180:120,track?'m':'min')],0,'受控偏强，不以PB换算目标秒数',['intervals','middle']),
    definition('endurance',short?'300m 速度维持':track?'400m 节奏保持':'长段节奏耐力','prepare','练习疲劳前的动作稳定；不是力竭测试',1,
      [segment(short?300:track?400:4,3,300,track?'m':'min')],0,'专项强度，仅供已有同类训练基础者核对',['middle']),
    definition('tempo',track?'短段 Tempo':'分段阈值节奏','base','发展可持续输出，避免把阈值理解为全力',1,
      [segment(track?4:6,3,120,'min')],0,'稳定、受控；阈值需实际测试或教练评估，PB不能替代',['middle','load']),
    definition('speed',short?'60m 放松加速':'跑姿与渐进加速','base','在充分恢复下练习协调、落地和放松',1,
      [segment(short?60:80,4,180)],0,'渐进加速，保持放松，非最大冲刺',['middle']),
    definition('combination',short?'200 + 150 组合':track?'400 + 200 组合':xc?'上坡 + 平地组合':'长短段组合','develop','在不同长度之间切换节奏，保持相同动作质量',2,
      track?[segment(short?200:400,1,180),segment(short?150:200,1,0)]:[segment(3,1,120,'min'),segment(1,1,0,'min')],360,
      foundation?'先熟悉单段；掌握后再评估组合':'有同类训练经历才考虑整组；不叠加速度耐力课',['middle','load']),
    definition('aerobic',xc?'轻松地形适应':'轻松有氧与恢复','base','支持恢复与有氧基础，依据习惯时长调整',1,
      [segment(20,1,0,'min')],0,'能完整交谈；20分钟只是浏览示例，不是你的负荷上限',['load']),
    definition('hills',xc?'短坡与下坡控制':'短坡技术','develop','在安全地形练习步频，步行下坡恢复',1,
      [segment(10,5,180,'sec')],0,'受控上坡，非全力；湿滑或技术不足时改平地',['hills'])
  ];
  if (track) definitions.push(
    definition('interval-aerobic','按时间的有氧间歇','base','以时间而非圈速控制连续有氧刺激；与距离间歇的节奏一致性目标不同',1,[segment(short?2:3,3,120,'min')],0,'受控、可重复；不追求800m或1500m比赛速度',['middle','load']),
    definition('endurance-split',short?'分段 400m 动作保持':'分段 600m 动作保持','prepare','短暂恢复后重建姿态，识别动作开始失稳的时点；不做力竭乳酸测试',2,[segment(short?200:300,2,120)],360,'已有速度耐力经历才考虑；动作失稳即结束，不强求第二组',['middle','load']),
    definition('tempo-continuous','连续 Tempo 控制','base','练习不中断的呼吸与体感控制，区别于分段Tempo的恢复后再进入节奏',1,[segment(short?8:12,1,0,'min')],0,'稳定受控；不能用PB计算阈值；不熟悉连续节奏时选择分段课',['middle','load']),
    definition('speed-drills','协调与跑姿练习','base','以低疲劳练习协调与姿态，不追求加速距离或速度成绩',1,[{distance:0,unit:'skill',repeats:1,recoverySeconds:null,description:'动态协调 → 原地步频 → 轻松跑姿练习；由动作质量决定结束，练习间充分恢复'}],0,'轻量技术，保持放松；复杂动作需现场指导',['middle']),
    definition('combination-change',short?'150 + 200 + 150 节奏转换':'200 + 400 + 200 节奏转换','prepare','中间较长段保持节奏，末段恢复放松动作；练习转换而非模拟全力比赛',1,[segment(short?150:200,1,180),segment(short?200:400,1,180),segment(short?150:200,1,0)],0,'各段受控，不规定PB百分比；不能额外叠加速度耐力课',['middle','load']),
    definition('aerobic-steady','连续有氧基础','base','轻松进入后维持连续有氧，最后主动降速；区别于质量课后的恢复性短跑',1,
      [{...segment(5,1,0,'min'),label:'轻松进入'},{...segment(short?15:20,1,0,'min'),label:'稳定有氧，全程可完整交谈'},{...segment(5,1,0,'min'),label:'逐步放慢；三段之间不暂停'}],0,
      '全程轻松，不变成渐进强度课；示例时长不是最低要求或个人上限，按既有耐受缩短中段',['load']),
    definition('hills-control','坡面步态与下坡控制','base','先练安全地形判断、平衡与下坡控制，区别于短坡重复的推进动作',1,[{distance:0,unit:'skill',repeats:1,recoverySeconds:null,description:'检查坡面 → 缓坡步行 → 小步走下坡；每段停下检查平衡，不做下坡冲刺'}],0,'低负荷地形技术；不熟悉地形时改平地，避免湿滑坡面',['hills','load'])
  );
  if(short) definitions.unshift(definition('interval-development','200m 专项耐受','develop','在重复800m节奏中维持动作；疲劳性发展主课，非技术激活或赛前短量',1,[segment(200,10,120)],0,'800m 配速；仅使用当前已达同项参考',['middle']));
  if(track) definitions.push(definition('combination-source','递减距离组合 · 资料候选','develop','核对递减段长下的速度控制；具体强度仍需专项教练审核',1,[350,300,250,200,150,100].map((m,i)=>({...segment(m,1,null),label:i<5?(short?'趟间100m步行＋100m慢跑':'趟间'+[300,250,200,150,100][i]+'m慢跑'):'直接进入冷身'})),0,short?'原资料未给目标节奏；不得从PB补造':'原资料为fast，未定义比赛节奏或精确秒数',['middle']));
  if(track) definitions.push(definition('combination-development','400 + 200 双节奏组合','develop','先保持1500m节奏，再在恢复后切换800m节奏；不是全力冲刺或比赛模拟',3,[segment(400,1,60),segment(200,1,0)],300,'需要两个专项各自的近期已达成绩',['middle','load']));
  const courses=definitions.map(d=>{
    const categoryId=d.id.split('-')[0];
    const adapted=youth && ['speed','aerobic','hills'].includes(categoryId);
    const segments=adapted && categoryId!=='aerobic'?[{distance:0,unit:'skill',repeats:1,recoverySeconds:null,description:categoryId==='hills'?'教练带领辨认安全坡面，练习走下坡与姿态':'教练带领步频、协调和放松加速游戏；次数由现场反馈决定'}]:d.segments;
    const course={...d,segments,event,categoryId,category:courseCategories[categoryId],band,applicablePB:band.range,pb:pbSeconds(pb)?formatPB(pbSeconds(pb),{fraction:true}):'未选择',
      phaseLabel:coursePhases[d.phase],youth,adapted,quality:!['aerobic','speed'].includes(categoryId) && d.id!=='hills-control',
      warmup:'轻松活动后做动态关节活动与跑姿练习；达到准备状态再进入主训练。',
      cooldown:'逐步放慢并轻松放松；有疼痛或异常时停止，不补做未完成段。',
      adjustment:foundation?'先评估单段动作与恢复；可减少重复次数或跳过主训练。':'保留既有训练剂量；状态下降时减少重复或延长恢复，不因PB更快自动加量。',
      intensityBasis:d.effort,parameterOrigin:'原创教学编排，剂量待专业审核；仅1500m的3 × 500m与2–3分钟恢复对应公开示例。',
      review:{status:'pending',label:'待专业审核',reviewer:null,date:null},
      sources:[...new Set([...d.sourceIds,'load',...(youth?['youth']:[])])].map(id=>({id,...courseSources[id]}))};
    course.selectedGroup=group;
    if (track) {auditCourse(course);completeSupport(course);}
    return finalizeCourse(course);
  });
  return track&&group==='competitive'?competitiveCatalog(courses,event,youth):courses;
}
function finalizeCourse(course) {
    const units=course.segments.flatMap(part=>Array.from({length:part.repeats},()=>part));
    const recovery=units.slice(0,-1).map(part=>part.recoverySeconds);
    course.loadSummary={mainDistanceM:units.every(p=>p.unit==='m')?units.reduce((n,p)=>n+p.distance,0)*course.sets:null,
      mainDurationSeconds:units.every(p=>['min','sec'].includes(p.unit))?units.reduce((n,p)=>n+p.distance*(p.unit==='min'?60:1),0)*course.sets:null,
      repCount:units.length*course.sets,repRecoveries:Math.max(0,units.length-1)*course.sets,setRecoveries:course.sets-1,
      recoverySeconds:recovery.every(Number.isFinite)?recovery.reduce((a,b)=>a+b,0)*course.sets+(course.sets-1)*course.setRecovery:null};
    course.main=courseSummary(course);
    course.blocks=[{name:'热身',detail:course.warmup},{name:'主训练',detail:course.main},{name:'冷身',detail:course.cooldown}];
  return course;
}

export function courseSummary(course) {
  const parts=course.segments.map(s=>s.unit==='skill'?s.description:(s.repeats>1?s.repeats+' × ':'')+s.distance+({m:'m',min:'分钟',sec:'秒'}[s.unit]||''));
  return (course.sets>1?course.sets+' 组（':'')+parts.join(' + ')+(course.sets>1?'）':'');
}
export function pbWeek(event,pb,{phase='develop',youth=false,group='base'}={}) {
  const courses=pbCourses(event,pb,{youth,group});
  if (!courses.length) return [];
  if(['800 m','1500 m'].includes(event)&&group==='competitive')return competitiveWeek(courses,event,phase,youth);
  if(['800 m','1500 m'].includes(event)&&!youth&&['base','advanced'].includes(group)&&(['base','recover'].includes(phase)||group==='advanced'&&phase==='develop'))return authoredWeek(courses,event,group,phase);
  const track=['800 m','1500 m'].includes(event),xc=event==='越野跑';
  const quality=phase==='base'?'tempo':phase==='prepare'?'endurance':xc?'hills':'interval';
  const patterns={
    base:['speed-drills','tempo',null,'aerobic-steady','hills-control',null,'aerobic'],
    develop:event==='800 m'?['speed','interval-development',null,'aerobic','combination',null,'aerobic']:['speed-drills','interval',null,'aerobic','tempo',null,'aerobic'],
    prepare:['speed',event==='800 m'?'endurance':'combination-change',null,'aerobic','speed-drills',null,null],
    recover:['aerobic',null,'speed-drills',null,'aerobic',null,null]
  };
  const structure=track?(patterns[phase]||patterns.develop):phase==='recover'?['aerobic',null,'speed',null,'aerobic',null,null]:['speed',quality,null,'aerobic','speed',null,'aerobic'];
  const relations=['先以技术进入本周','本周主要刺激，替代其他质量课','恢复日，为前一课留出恢复','低强度衔接，检查主课后反应','与主课间隔两个低负荷日；恢复不足则取消','恢复，不补做漏课','轻松收尾，为下一周期留余力'];
  return structure.map((id,dayIndex)=>({...(courses.find(c=>c.id===id && (!c.trainingGroups||c.trainingGroups.includes(contentGroups[group])) && (c.automaticRecommendation!==false || (!youth && ((phase==='base'&&id==='tempo') || (phase==='develop'&&['interval','interval-development'].includes(id))))))||{id:id?'slot-'+id:'rest',isPlanningSlot:Boolean(id),sessionRole:phase==='prepare'&&dayIndex===4?'primer':courses.find(c=>c.id===id)?.sessionRole,name:id?((phase==='prepare'&&dayIndex===4?'赛前短量课':courses.find(c=>c.id===id)?.roleLabel||'训练')+' · 待确认'):'休息与自主恢复',category:id?'待编排':'恢复',quality:false,review:{status:'pending',label:'待专业审核'}}),
    dayIndex,dayLabel:['周一','周二','周三','周四','周五','周六','周日'][dayIndex],relation:phase==='recover'?'恢复周：不安排质量课，保留轻量技术与休息。':relations[dayIndex],event,
    weekDraft:true,weekPhase:phase,weekPurpose:phasePurposes[phase]||phasePurposes.develop,coverage:track?'中跑阶段结构示例':'仅通用基础示例，尚非完整专项周期',previewOnly:true}));
}

// Source audit revision: snapshots retain their original dose; none is an approved prescription.
export const sessionRoles={development:'常规发展主课',transition:'低总量衔接课',technique:'技术辅助课',primer:'赛前短量课',recovery:'恢复课'};
function auditCourse(c) {
  c.catalogRevision='2026-11-09-programming';
  c.automaticRecommendation=false;
  c.sessionRole=['speed','hills'].includes(c.categoryId)?'technique':c.categoryId==='aerobic'?'recovery':'development';
  c.primaryObjective=c.objective;
  c.eligibility='成人、已有持续中跑训练及同类课程经验；PB仅用于浏览，不证明负荷耐受。缺少设备日志不降低经验判断。';
  c.catalogStatus='candidate';
  c.evidenceMap=[{parameter:'剂量、段长、目标与恢复',source:'现有资料只支持训练类别；未验证此完整组合',adaptation:'原教学参数保留供审查，不作为常规推荐',limit:'需要专项教练核对整体目的、阶段与既有耐受后才能执行'}];
  c.executionEligible=false;
  c.parameterOrigin='参数审查候选；没有独立教练审核，不自动加入周课表。';
  if(c.id==='interval-development') {
    c.executionEligible=true;c.targetBasis='800';c.recoveryMode='walk';
    c.eligibility='成人、有数月持续训练，并已在既有课表耐受相近2km的800m节奏重复；更快PB不能替代同类负荷经验。';
    c.evidenceMap=[{parameter:'10×200m／800m 配速／趟间120秒',source:'Momentum Sports中跑速度指南：10×200、约800m节奏、1–2分钟恢复',adaptation:'保留整套重复结构，恢复取上端；步行是产品补充，原文没有指定动作',limit:'公开教练实践不是干预试验；不是从旧4趟直接加量，不沿用原文过时的乳酸废物解释'},
      {parameter:'热身、冷身各10分钟；专项期与同类耐受前提',source:'Haugen表2支持低强度准备和冷身类别；原教练示例未细分阶段与准入',adaptation:'计时起点、阶段与准入属于编辑选择，准备不足继续热身',limit:'不是已验证安全阈值；动作失稳或恢复不足则停止，不强求10趟'}];
    c.sources.push({id:'momentum',title:'Momentum Sports · Middle Distance Speed',url:'https://www.momentumsports.co.uk/TtMDSpeed.asp',kind:'公开教练实践',population:'已有中跑训练背景者；原文未细分年龄',rule:'对应200m重复的段长、次数、目标和恢复区间',limit:'恢复动作及准入为产品补充；没有独立审核，不复制过时乳酸解释'});
  }
  if (c.id==='interval') {
    const short=c.event==='800 m';
    // Do not rewrite the old 4x200 snapshot into a larger prescription.
    if(short){c.catalogStatus='archive';c.parameterOrigin='原4×200教学示例存档；未证实为常规发展剂量，不自动推荐。';}
    else {
      c.executionEligible=true;
      c.targetBasis='1500';c.recoveryMode='walk';
      c.evidenceMap=[{parameter:'3×500m／1500m 配速／趟间180秒',source:'World Athletics 2022公开示例：3–4×500m，目标1500m节奏，恢复2–3分钟',adaptation:'采用3趟和3分钟；以当前同项已达成绩代替目标成绩，恢复方式补充为步行',limit:'原文未指定恢复动作；步行及当前成绩替代属于待审核产品选择，不能宣称整套已被验证'},
        {parameter:'热身10分钟＋准备检查；冷身10分钟',source:'Haugen 2021表2给出低强度热身/冷身范围；不是统一个人处方',adaptation:'采用范围下端作为计时起点，准备不足不得开始主训练',limit:'时长为编辑选择；需有持续训练及相近1500m质量跑量耐受，非初学者入口'}];
      c.objective='维持1500m节奏与重复质量；专项发展主课候选，不是赛前减量课';
    }
  }
  if(c.id==='combination-source'){
    c.eligibility='ASA历史教练课程中的赛季前训练背景；不是按PB选中的个人处方，青年不能直接复制成人计划。';
    c.evidenceMap=[{parameter:'350＋300＋250＋200＋150＋100m；累计1350m',source:'ASA距离项目教练手册，800m第38页、1500m第44页（印刷页码）',adaptation:'仅抽取这一节结构，不复制原周量；800m段间100m步行＋100m慢跑，1500m段间依次300/250/200/150/100m慢跑',limit:'800m原例没有明确节奏；1500m仅写fast。均不能据此编造比赛配速或秒数，暂不进入执行推荐'},
      {parameter:'准备、冷身与阶段',source:'原例热身10分钟并做拉伸/渐进跑；800m冷身10分钟、1500m15分钟；均属Phase Two赛季前',adaptation:'现代动态准备表述替代无区分拉伸；不把赛季前误写成比赛前几天的短量课',limit:'恢复距离合计1000m，时间与预计全程未知；没有独立教练审核'}];
    c.sources.push({id:'asa',title:'Athletics South Africa · Distance Coaching Manual',url:'https://athleticssa.org.za/SportsInfo/ASA-Level-1-Coaching-Distance-Races-Middle-Long-Steeple-Walk.pdf',kind:'官方教练教材（历史实践）',population:'手册训练背景，非按PB定义的人群',rule:'对应递减段长与不同恢复距离；缺少足够节奏定义',limit:'不复制整周负荷、过时生理解释或假定适龄；课程暂不推荐执行'});
  }
  if(c.id==='combination'){
    c.catalogStatus='archive';
    c.parameterOrigin='教学组合存档；旧2×(200+150)及2×(400+200)的目的、剂量与恢复未形成可核验处方，不改名为赛前课。';
    c.evidenceMap=[{parameter:'整套组合',source:'未找到支持原组合全部参数及适用背景的直接依据',adaptation:'保留历史与教练课表转录；退出默认课程发现和全部自动周安排',limit:'测试中的秒数、步行与站立恢复仅用于验证软件，不能成为推荐依据'}];
  }
  if(c.id==='endurance')c.evidenceMap=[{parameter:'速度耐力段长／趟数／恢复',source:'Haugen表2区分乳酸耐受与高输出课，恢复和总量随目的不同',adaptation:'原3×300或3×400不因PB更快缩短恢复；原参数冻结待审',limit:'尚不能判定属于哪种发展刺激；不自动执行，不用综述中的成人精英剂量替代个体设计'}];
  if(c.categoryId==='tempo')c.evidenceMap=[{parameter:'Tempo段长与累计时间',source:'Haugen表2的连续与分段阈值课来自精英实践',adaptation:'保留原短量候选；不把800m或1500m PB换算为阈值，不宣称达到精英主课刺激',limit:'缺少该剂量适用背景与阈值校准；需补齐后才能推荐。短不等于适合所有人'}];
  if(c.categoryId==='speed'){
    c.eligibility=c.youth?'适龄技术候选：需教练现场结合成熟度与动作反馈调整，不执行成人速度剂量。':'技术辅助，不替代发展主课；需动作指导，保持低疲劳。';
    c.evidenceMap=[{parameter:'技术目的／距离／恢复',source:'Momentum中跑速度指南区分技术练习与高强度速度训练',adaptation:'保留低疲劳动作目的；原4趟与180秒没有独立剂量验证',limit:'不因短距离便称为赛前激活；适龄变式不固定成人组数'}];
  }
  if(c.adapted && c.id==='speed-drills')c.executionEligible=true;
  if(c.id==='aerobic-steady')c.sessionRole='development';
  c.primaryObjective=c.objective;
  if(c.categoryId==='aerobic')c.evidenceMap=[{parameter:'恢复与连续有氧',source:'IOC负荷共识支持结合恢复反应；不提供统一20分钟处方',adaptation:'20分钟仅供既有恢复习惯核对，不是无日志者的负荷上限',limit:'连续有氧发展与恢复用途不同，不能由低强度名称判定适用'}];
  c.contentState={sources: ['interval-development','interval'].includes(c.id)&&c.executionEligible?'checked':'partial',programming:c.executionEligible&&!c.adapted?'complete':'incomplete',independentReview:'pending',currentExecution:'requires-readiness'};
  if(c.id==='tempo')completeTempo(c);
  c.roleLabel=sessionRoles[c.sessionRole];
  c.review={status:'pending',label:c.prescription?'编排完成 · 待独立审核':c.catalogStatus==='archive'?'教学存档 · 不推荐':'参数已审查 · 待教练审核',reviewer:null,date:null};
}

function completeTempo(c) {
  c.sessionRole='transition';
  c.name='分段 Tempo · 3×5分钟';c.phase='base';c.phaseLabel=coursePhases.base;
  c.objective='在受控偏强的强度下积累持续有氧工作，短慢跑恢复后重建稳定节奏；不是800m/1500m比赛速度训练。';
  c.primaryObjective=c.objective;c.sets=1;c.segments=[segment(5,3,60,'min')];c.setRecovery=0;
  c.eligibility='成人基础／进阶中跑组，已有持续有氧训练且曾耐受累计15分钟的受控Tempo；竞技组仅作基础期低总量衔接，不替代常规阈值主课。首次接触Tempo、近期训练中断或恢复不足者不直接执行；PB不能证明这些条件。';
  c.trainingGroups=['基础','进阶'];c.competitiveUse='仅基础期低总量衔接，非竞技组常规阈值主课';c.trainingPhases=['base'];
  c.intensityBasis='Tempo：受控偏强、呼吸稳定，不追求冲刺。以既有Tempo体感为参照；无法维持动作或必须明显加力时降速并提前结束。不从短距离PB推算阈值。';
  c.adjustment='每段保持相同受控强度，不做末段加速。恢复不足不强行开始下一段；结束记录而非压缩恢复。不可在原有质量课之外额外叠加。';
  c.evidenceMap=[{parameter:'5分钟工作／1分钟慢跑',source:'Haugen 2021表2：阈值分段3–10分钟，约每5分钟工作配1分钟轻松慢跑',adaptation:'采用5分钟段和60秒慢跑，不采用精英25–40分钟总量',limit:'综述为精英背景，支持组织方式而非本课对所有人的安全或有效性'},
    {parameter:'Tempo强度与训练目的',source:'V.O2训练定义与阈值训练说明：受控偏强、分段间短恢复；区别于更高强度间歇',adaptation:'使用已有训练体感，不套用精英半马配速或由800m/1500m PB推算生理阈值',limit:'体感不是阈值测量；V.O2的2025建议总量至少30分钟，本课15分钟是不同适用背景的产品衔接编排，不声称符合其完整剂量建议'},
    {parameter:'3趟／15分钟总量，基础期及已有经验的成人组',source:'资料没有验证本产品的3趟、准入条件或周方案',adaptation:'原创限量编排：已有15分钟同类经验，不做自动进阶；基础期一节主课位置，前后留低负荷日',limit:'不是第一次Tempo入门课或比赛减量课；尚无独立教练审核，未完成整周负荷核验'},
    {parameter:'热身10分钟与冷身10分钟',source:'综述给出低强度准备与冷身类别',adaptation:'10分钟作为计时起点；准备未完成则继续，不适可直接停止',limit:'产品时长，不是保证预防伤病的阈值'}];
  c.sources.push({id:'vdot-threshold',title:'V.O2 · Training definitions / Threshold',url:'https://vdoto2.com/learn-more/training-definitions',kind:'教练训练体系公开说明',population:'具备相应耐受与强度认识的跑者',rule:'受控偏强的Tempo与短恢复分段组织',limit:'不验证本App的3趟剂量；不复制其完整计划或配速数据库'});
  c.sources.push({id:'vdot-tempo-2025',title:'V.O2 · Threshold training（2025）',url:'https://news.vdoto2.com/2025/06/get-the-most-out-of-your-threshold-training/',kind:'教练体系公开训练说明',population:'已熟悉阈值强度的跑者',rule:'稳定受控强度，短恢复后不加速；该文建议更高总量',limit:'该文分段建议至少30分钟；本课15分钟是低总量衔接编排，不冒充原文完整剂量'});
  c.parameterOrigin='来源已核对；原创编排完成；独立审核未完成。当前执行还需满足适用背景和恢复条件。';
  c.contentState={sources:'checked',programming:'complete',independentReview:'pending',currentExecution:'requires-readiness'};
  c.executionEligible=true;c.catalogRevision='2026-11-09-tempo';
  c.prescription={version:2,origin:'editorial-candidate',catalogRevision:c.catalogRevision,setCount:1,
    repetitions:[{durationSeconds:300,repsPerSet:3,target:{targetBasis:'threshold',effort:'受控偏强 · 呼吸与动作稳定',provenance:'既有Tempo体感；未测量生理阈值'},repRecovery:{mode:'jog',endRule:'time',durationSeconds:60}}],setRecovery:null,
    warmup:[{label:'轻松跑、动态活动与渐进准备；准备不足继续',durationSeconds:600,checks:['轻松活动已完成','动态活动与跑姿已完成','渐进准备完成且无不适']}],
    cooldown:[{label:'轻松放慢；不适可提前停止',durationSeconds:600}],objective:c.objective,parameterSource:c.evidenceMap.map(e=>e.source+'；产品编排：'+e.adaptation).join('。'),review:{status:'pending',label:'编排完成 · 待独立审核',reviewer:null,date:null}};
}

export const contentRevision='2026-11-09-middle-week-v2';
export const competitiveRevision='2026-11-09-competitive-v3';
export const contentGroups={base:'基础',advanced:'进阶',competitive:'竞技'};
const easySource={id:'ea-easy',title:'England Athletics · Runner FAQ',url:'https://www.englandathletics.org/runtogether/support/runner-frequently-asked-questions/',kind:'官方跑步指导',population:'一般跑者，非本App分组试验',rule:'稳定已有训练频率，轻松日放松，保留恢复；不突然增加频率',limit:'不直接规定本产品的20/30/35分钟或五课周'};
function completeSupport(c) {
  if(c.youth)return;
  const group=c.selectedGroup,advanced=group==='advanced';
  const effort={easy:'全程可完整交谈；不追配速，不做末段加速',technique:'逐渐加速后自然放松；非最大速度，动作变形即停止',threshold:'受控偏强，维持稳定呼吸与动作；不是800m或1500m节奏'};
  const definitions={
    speed:{name:'放松加速 · 4×15秒',role:'technique',basis:'technique',seconds:15,reps:4,rest:90,warm:600,cool:300,objective:'低疲劳练习加速、姿态与放松；不作为最大速度、速度耐力或赛前主课',background:'已熟悉放松加速和动态准备；不是首次学习跑姿的替代教练',source:'Momentum技术部分支持准备阶段的drills/strides；短时、充分恢复用于区别疲劳性主课',choice:'4×15秒、90秒步行、热身10分钟及冷身5分钟为低总量技术编排；90秒是计时下限，未恢复不开始下一趟'},
    aerobic:{name:'恢复轻松跑 · 20分钟',role:'recovery',basis:'easy',seconds:600,reps:1,rest:0,warm:300,cool:300,objective:'以轻松活动结束恢复日，不追求新增训练刺激；持续疼痛时不执行',background:'已习惯20分钟轻松活动，正常恢复中；这不是伤后复出方案',source:'England Athletics支持轻松恢复和休息；Haugen表2区分恢复跑与长跑',choice:'5分钟进入＋10分钟轻松＋5分钟放慢；20分钟是本课安排，不是缺少日志者的能力上限'},
    'aerobic-steady':{name:'连续有氧 · '+(advanced?'35':'30')+'分钟',role:'development',basis:'easy',seconds:advanced?1500:1200,reps:1,rest:0,warm:300,cool:300,objective:'维持连续有氧习惯，强度全程轻松；区别于恢复短跑和阈值刺激',background:'已稳定完成本课总时长的连续轻松跑；周内不额外叠加原有同类课',source:'England Athletics支持稳定训练、全程轻松与渐进负荷原则',choice:'进入和放慢各5分钟，主段20/25分钟由明确选择的训练组提供；不是由更快PB加时'},
    'tempo-continuous':{name:'连续 Tempo · 20分钟',role:'development',basis:'threshold',seconds:1200,reps:1,rest:0,warm:600,cool:600,objective:'不中断地维持受控有氧输出，区别于3×5分钟低总量衔接',background:'成人进阶组，已耐受20分钟连续Tempo且熟悉该体感；不是从3×5自动升级',source:'Haugen表2列出连续阈值；England Athletics公开指导给出20–30分钟受控Tempo',choice:'选20分钟连续段，无趟间/组间恢复；热身冷身各10分钟为产品准备起点'}
  };
  const d=definitions[c.id];
  if(d){
    c.name=d.name;c.objective=d.objective;c.primaryObjective=d.objective;c.sessionRole=d.role;c.roleLabel=sessionRoles[d.role];
    c.sets=1;c.segments=[segment(d.seconds%60?d.seconds:d.seconds/60,d.reps,d.rest,d.seconds%60?'sec':'min')];c.setRecovery=0;c.phase='base';c.phaseLabel=coursePhases.base;
    c.trainingPhases=['speed','aerobic'].includes(c.id)?['base','develop','recover']:c.id==='aerobic-steady'?['base','develop']:['base'];
    c.quality=d.basis==='threshold';c.trainingGroups=c.id==='tempo-continuous'?['进阶']:['基础','进阶'];
    c.eligibility=d.background+'。成人已有持续训练；更快PB不证明耐受，缺少App日志不否定经验。';
    c.intensityBasis=effort[d.basis];c.adjustment='维持模板剂量；恢复不足则停止或取消，不压缩恢复、不自动加趟。';
    c.evidenceMap=[{parameter:'目的、工作段与恢复',source:d.source,adaptation:d.choice,limit:'整体为产品编排，没有直接验证本组处方的干预研究；独立审核未完成'},
      {parameter:'人群及周关系',source:'IOC负荷共识支持结合既有负荷与恢复',adaptation:d.background,limit:'所列既有耐受门槛是产品适用条件，不是已验证安全阈值'}];
    c.sources.push(easySource);
    if(c.id==='speed')c.sources.push({id:'momentum-technique',title:'Momentum Sports · Middle Distance Speed',url:'https://www.momentumsports.co.uk/TtMDSpeed.asp',kind:'公开教练实践',population:'已有中跑背景者；未给本App分组剂量',rule:'准备中的跑姿练习与放松加速，区别于疲劳性速度主课',limit:'4×15秒及90秒恢复是产品编排；原文不验证此剂量，不采用过时乳酸解释'});
    c.catalogRevision=contentRevision;c.executionEligible=true;c.automaticRecommendation=false;
    c.contentState={sources:'checked',programming:'complete',independentReview:'pending',currentExecution:'requires-readiness'};
    c.review={status:'pending',label:'编排完成 · 待独立审核',reviewer:null,date:null};
    c.prescription={version:3,origin:'editorial-candidate',catalogRevision:contentRevision,setCount:1,repetitions:[{durationSeconds:d.seconds,repsPerSet:d.reps,target:{targetBasis:d.basis,effort:effort[d.basis],provenance:'明确体感目标，不从短距离PB换算'},repRecovery:d.rest?{mode:'walk',endRule:'time',durationSeconds:d.rest}:null}],setRecovery:null,
      warmup:[{label:d.basis==='easy'?'轻松进入':'轻松跑、动态准备；不足则继续',durationSeconds:d.warm,checks:['当前无不适，已完成本课所需准备']}],cooldown:[{label:'逐步放慢，不适时可立即停止',durationSeconds:d.cool}],objective:c.objective,parameterSource:d.source+'；产品编排：'+d.choice,review:structuredClone(c.review)};
    c.parameterOrigin='来源核对与编排完成；热身/冷身及组别剂量是公开标注的产品选择，不代表教练认证。';
  }
  if(c.id==='endurance'&&c.event==='800 m'){
    c.name='300m 专项速度耐力';c.phase='develop';c.phaseLabel=coursePhases.develop;c.sets=2;c.segments=[segment(300,3,120)];c.setRecovery=600;c.targetBasis='800';c.recoveryMode='walk';
    c.objective='在800m节奏下维持较长重复段，组间充分恢复后重建质量；区别于短段10×200密集重复';c.primaryObjective=c.objective;
    c.eligibility='成人竞技800m组，已有分组300m与1800m同类专项量耐受；不面向基础组、训练中断者或无同类经历者。';c.trainingGroups=['竞技'];
    c.evidenceMap=[{parameter:'2大组×3趟×300m；800m节奏；趟间2分钟、组间10分钟',source:'Prendergast《A Fundamental Approach》训练汇总表第93页（PDF第93页）：2组3趟300m、800m节奏，趟间2分钟，组间8–12分钟',adaptation:'组间取10分钟，恢复动作选择步行；不采用原文逐次缩短趟间恢复',limit:'历史教练实践，未验证本App成人准入；不沿用书中固定能量系统百分比及过时生理解释'},
      {parameter:'阶段、准备与总量',source:'原表支持完整主段结构，不提供本App热身与当日适用判断',adaptation:'专项后段候选，主训练1800m，4次120秒趟间＋1次600秒组间；热身冷身各10分钟为产品起点',limit:'不额外叠加200m主课或组合课；独立审核未完成'}];
    c.sources.push({id:'prendergast',title:'Kevin Prendergast · A Fundamental Approach',url:'https://oztrack.com/fundamd.pdf',kind:'公开专业教练历史著作',population:'已训练中跑人群，非统一适龄处方',rule:'训练汇总表支持分组300m的距离、目标和恢复区间',limit:'仅核对训练结构，不将理论模型当作现代实证或App审核'});
    c.executionEligible=true;c.catalogRevision=contentRevision;c.contentState={sources:'checked',programming:'complete',independentReview:'pending',currentExecution:'requires-readiness'};
    c.review={status:'pending',label:'编排完成 · 待独立审核',reviewer:null,date:null};
  }
  if(c.id==='combination-development'){
    c.trainingGroups=['进阶','竞技'];c.eligibility='成人进阶/竞技中跑组，已完成相近1800m双节奏组合，分别有近期800m与1500m已达成绩；不适用于首次专项组合训练。';
    c.evidenceMap=[{parameter:'3×(400m＋200m)，趟间60秒，组间300秒',source:'Jonathan Dalby，OATCCC 2022讲义第17页，Specific Middle Distance Pace Workout Examples：3–5组400m mile effort/200m 800 effort，趟间1分钟、组间4–5分钟',adaptation:'取3组和5分钟；mile effort明确改为当前1500m均速参考，恢复动作补充步行；是产品改编而非等价换算',limit:'该讲义为学校训练背景，本App成人适用条件与1500m替代未独立验证；不直接套给青少年'},
      {parameter:'目的与阶段',source:'讲义支持两种节奏的组内组合，不验证本App周负荷',adaptation:'专项后段用于节奏切换；1800m主段、3次60秒趟间和2次300秒组间，替代同周其他专项主课',limit:'缺少任一同项成绩则仅浏览，不从800m猜1500m；不得将旧2×(200+150)改名为本课'}];
    c.sources.push({id:'dalby',title:'Jonathan Dalby · OATCCC 2022 coaching presentation',url:'https://www.oatccc.com/Clinics/Track-And-Field/Archive/2022/jonathon-dalby-distance-training.pdf',kind:'教练协会公开讲座实践',population:'学校训练背景；成人转用是产品改编',rule:'支持400+200双节奏的组数范围及两层恢复',limit:'mile与1500m不等同；本产品改编和成年准入尚待审核'});
    c.targetBases=['1500','800'];c.targetBasis='1500';c.recoveryMode='walk';c.catalogRevision=contentRevision;
    c.executionEligible=true;c.contentState={sources:'checked',programming:'complete',independentReview:'pending',currentExecution:'requires-readiness'};c.review={status:'pending',label:'编排完成 · 待独立审核',reviewer:null,date:null};
  }
  if(c.id==='endurance'&&c.event==='1500 m'){
    c.name='400m 速度储备';c.phase='develop';c.phaseLabel=coursePhases.develop;c.sets=1;c.segments=[segment(400,3,360)];c.setRecovery=0;c.targetBasis='800';c.recoveryMode='walk';
    c.objective='以800m节奏发展1500m跑者的较快段维持能力；充分恢复以保留动作质量，不做短恢复阈值或赛前减量';c.primaryObjective=c.objective;
    c.eligibility='成人进阶/竞技1500m组，已有1200m同类800m节奏长段经验和当前800m已达成绩；不能用1500m PB推算目标。';c.trainingGroups=['进阶','竞技'];
    c.evidenceMap=[{parameter:'3×400m、800m节奏、趟间360秒',source:'Dalby OATCCC 2022第17页：3–4×400m，800m effort，恢复5–8分钟',adaptation:'采用3趟、6分钟；将effort具体化为当前已达800m均速，恢复选择步行',limit:'学校实践转为成人限定候选；800m均速参考不等于生理强度验证，独立审核未完成'},
      {parameter:'阶段与总量',source:'原例支持主段范围，不决定本App组别和当日恢复',adaptation:'专项后段替代其他高强度主课；1200m、2次360秒恢复，热身冷身各10分钟起点',limit:'不额外叠加500m间歇或双节奏组合；准备不足继续，不因PB较快压缩恢复'}];
    c.sources.push({id:'dalby-reserve',title:'Jonathan Dalby · OATCCC 2022，PDF第17页',url:'https://www.oatccc.com/Clinics/Track-And-Field/Archive/2022/jonathon-dalby-distance-training.pdf',kind:'公开专业教练实践',population:'原讲座为学校训练；成人改编限定有相近经验',rule:'支持400m速度储备的段长、目标及恢复范围',limit:'不是成人或青少年统一处方；当日执行仍需核对'});
    c.executionEligible=true;c.catalogRevision=contentRevision;c.contentState={sources:'checked',programming:'complete',independentReview:'pending',currentExecution:'requires-readiness'};c.review={status:'pending',label:'编排完成 · 待独立审核',reviewer:null,date:null};
  }
  if(['interval','interval-development'].includes(c.id))c.trainingGroups=['进阶','竞技'];
  if(c.id==='tempo')c.roleLabel=sessionRoles.transition;
}

function authoredWeek(courses,event,group,phase){
  const recovery=phase==='recover',advanced=group==='advanced',specific=phase==='develop';
  const ids=recovery?['aerobic',null,'speed',null,'aerobic',null,null]:['speed','aerobic-steady',null,specific?(event==='800 m'?'interval-development':'interval'):advanced?'tempo-continuous':'tempo',null,'aerobic','aerobic-steady'];
  const cohort=event+'|adult-'+group+'|'+phase;
  const eligibility=recovery?'已在连续训练、主动安排减量的成人；不是伤后复出周。':'已稳定每周5次训练，能完成本周各次时长，已有'+(specific?(event==='800 m'?'2km的800m节奏重复':'1500m累计1500m节奏重复'):(advanced?'20分钟连续':'累计15分钟分段')+'Tempo')+'经验；不得在原课表之上叠加。';
  const purpose=recovery?'主动恢复周：取消质量主课；不把短量恢复当常规发展周。':specific?'成人进阶组专项巩固周：以同项间歇替换Tempo，保留技术和低强度支持；速度耐力/组合是后续替代候选，不能额外叠加。':advanced?'成人进阶组基础期：连续Tempo主刺激与低强度支持，非竞技精英周量。':'成人基础组基础衔接周：一节15分钟Tempo、技术与轻松跑；不是竞技组常规发展周。';
  const relations=recovery?['低负荷恢复','完整休息，不补课','放松技术；疲劳仍在则取消','休息','轻松恢复','休息','评估恢复，不自动回加质量']:
    ['低疲劳技术进入本周','保持轻松，不为主课预先制造疲劳','主课前完整恢复','本周唯一质量刺激，替代其他质量课','主课后完整恢复，不补漏课','轻松恢复，检查反应','轻松有氧收尾，不末段加速'];
  return ids.map((id,i)=>({...structuredClone(id?courses.find(c=>c.id===id):{id:'rest',name:'休息与自主恢复',category:'恢复',quality:false,review:{status:'pending',label:'周编排待审核'}}),cohortId:cohort,selectedGroup:group,weekEligibility:eligibility,weekPhase:phase,weekPurpose:purpose,weekDraft:true,dayIndex:i,dayLabel:['周一','周二','周三','周四','周五','周六','周日'][i],relation:relations[i],event,previewOnly:true,
    transitionRules:'不以PB变化、完成打卡或日历自动加量。基础衔接→持续基础需先耐受现有主课和周结构；专项期替换主课而非叠加；赛前方案尚未编排。恢复不足留在恢复/休息，伤痛另行评估。'}));
}

export function courseCoverage({youth=false}={}){
  return ['800 m','1500 m'].flatMap(event=>Object.keys(contentGroups).flatMap(group=>Object.keys(coursePhases).map(phase=>{
    const courses=pbCourses(event,null,{group,youth}),week=pbWeek(event,null,{group,phase,youth});
    return {event,group,phase,population:youth?'youth':'adult',week:weekContentStatus(week),categories:Object.keys(courseCategories).map(category=>({category,complete:courses.filter(c=>c.categoryId===category&&(c.trainingPhases||[c.phase]).includes(phase)&&(!c.trainingGroups||c.trainingGroups.includes(contentGroups[group]))&&courseContentComplete(c)).map(c=>c.id)}))};
  })));
}
export function weekContentStatus(week) {
  const training=week.filter(c=>c.id!=='rest');
  const filled=training.filter(courseContentComplete);
  const coherent=new Set(week.map(c=>c.weekPhase)).size<=1&&new Set(week.map(c=>c.cohortId).filter(Boolean)).size<=1&&new Set(week.map(c=>c.population).filter(Boolean)).size<=1&&training.every(c=>!c.cohortId||(c.trainingGroups?.includes(contentGroups[c.selectedGroup])&&(c.trainingPhases||[c.phase]).includes(c.weekPhase)));
  const timed=filled.length===training.length&&training.every(c=>c.prescription);
  const totals=timed?training.map(c=>workoutTotals(c.prescription)):[];
  return {complete:week.length===7&&training.length>0&&filled.length===training.length&&coherent,coherent,filled:filled.length,missing:training.length-filled.length,
    plannedSeconds:timed?totals.reduce((n,t)=>n+t.estimatedSecondsRange[0],0):null,qualitySessions:training.filter(c=>c.quality).length,
    label:'周安排草案',independentReview:'pending',canExecuteWeek:false};
}

export function courseContentComplete(c) {
  if(c.isPlanningSlot||c.contentState?.sources!=='checked'||c.contentState?.programming!=='complete'||!c.objective||!c.phase||!c.eligibility||!c.evidenceMap?.length||!c.segments?.length)return false;
  if(c.prescription){
    try{const steps=compileWorkout(c.prescription),work=steps.filter(s=>s.kind==='work');
      return c.prescription.setCount===c.sets&&c.prescription.repetitions.length===c.segments.length&&c.segments.every((s,i)=>{const r=c.prescription.repetitions[i];return r.repsPerSet===s.repeats&&(s.unit==='m'?r.distanceM===s.distance:r.durationSeconds===s.distance*(s.unit==='min'?60:1))&&(!(s.repeats>1||i<c.segments.length-1)||r.repRecovery?.durationSeconds===s.recoverySeconds);})&&work.length===c.sets*c.segments.reduce((n,s)=>n+s.repeats,0);
    }catch{return false;}
  }
  return ['800','1500'].includes(c.targetBasis)&&(!c.targetBases||c.targetBases.length===c.segments.length&&c.targetBases.every(b=>['800','1500'].includes(b)))&&['jog','walk','stand'].includes(c.recoveryMode)&&Number.isInteger(c.sets)&&c.sets>0&&(c.sets===1||c.setRecovery>0)&&c.segments.every((s,i)=>s.unit==='m'&&s.distance>0&&Number.isInteger(s.repeats)&&s.repeats>0&&(!(s.repeats>1||i<c.segments.length-1)||s.recoverySeconds>0));
}

// Adult club middle-distance cohort, not a PB-derived elite-volume prescription.
export const competitiveCohort='成人俱乐部竞技中跑：已有稳定六课周、每周两次不同质量刺激及相近专项负荷；800m限有氧与速度均衡型，不覆盖纯400/800速度型。';
const taperSource={id:'taper-rp',title:'Spilsbury 等 2019 · 1500m减量研究',url:'https://irep.ntu.ac.uk/id/eprint/35522/',kind:'同行评审原始研究',population:'10名已训练成年1500m跑者',rule:'七日减量与保留比赛节奏；提高至115%节奏的效果差异大',limit:'不验证本App4×200/3×300、整周剂量或800m外推；不承诺成绩提升'};
function competitiveCatalog(existing,event,youth){
  if(youth)return existing.map(c=>({...c,population:'youth-competitive-review',eligibility:'青少年竞技专项审议：成熟度、既有专项训练、学业与恢复、现场教练需共同判断；不是入门分类。成人周量不可直接采用。 '+c.eligibility}));
  const short=event==='800 m';
  const common={...structuredClone(existing.find(c=>c.id==='aerobic')),selectedGroup:'competitive',population:'adult-competitive-balanced',trainingGroups:['竞技'],catalogRevision:competitiveRevision,
    eligibility:competitiveCohort,automaticRecommendation:false,executionEligible:true,adapted:false,youth:false,catalogStatus:'candidate',
    review:{status:'pending',label:'编排完成 · 待独立审核',reviewer:null,date:null},contentState:{sources:'checked',programming:'complete',independentReview:'pending',currentExecution:'requires-readiness'}};
  function timed(id,name,category,role,phase,minutes,reps,rest,basis,objective,choice,phases=[phase],warm=900,cool=600){
    const seconds=minutes*60,c={...structuredClone(common),id,name,categoryId:category,category:courseCategories[category],sessionRole:role,roleLabel:sessionRoles[role],phase,phaseLabel:coursePhases[phase],trainingPhases:phases,objective,primaryObjective:objective,
      quality:category==='tempo'||category==='hills',sets:1,segments:[segment(seconds%60?seconds:minutes,reps,rest,seconds%60?'sec':'min')],setRecovery:0,
      intensityBasis:basis==='threshold'?'Tempo：既有受控偏强体感，不由PB推阈值':basis==='easy'?'全程可完整交谈，不追配速':'快而放松，非全力；姿态或协调下降立即停止',
      adjustment:'仅适用于已耐受所列时长/重复及本周结构者；疲劳则取消，不补课、不压缩恢复。',
      evidenceMap:[{parameter:'训练目的及组织原则',source:category==='hills'?'World Athletics 2021：约5趟10秒短坡与步行下坡；原文为全力':'Haugen 2021表2：区分连续有氧、阈值、准备与恢复',adaptation:choice,limit:'组数、时长、成人俱乐部准入与整周安排为产品编排，未获独立审核；不是精英负荷复制'}],
      parameterOrigin:'来源支持类别/组织原则；精确剂量、阶段和人群为本产品编排，独立审核未完成。'};
    c.sources=[{id:'middle',...courseSources.middle},{id:'load',...courseSources.load},...(category==='hills'?[{id:'hills',...courseSources.hills}]:[])];
    c.eligibility+=' 本课须已有'+(reps>1?reps+'趟同类重复':minutes+'分钟同类主段')+'经验；准备与冷身也计入总时长。';
    c.prescription={version:3,origin:'editorial-candidate',catalogRevision:competitiveRevision,setCount:1,repetitions:[{durationSeconds:seconds,repsPerSet:reps,target:{targetBasis:basis,effort:c.intensityBasis,provenance:'明确体感目标，非PB推算生理阈值'},repRecovery:rest?{mode:basis==='threshold'?'jog':'walk',endRule:'time',durationSeconds:rest}:null}],setRecovery:null,
      warmup:[{label:basis==='easy'?'轻松进入':'轻松跑、动态准备和渐进活动；准备不足继续',durationSeconds:warm,checks:['已完成准备，动作与身体无不适']}],cooldown:[{label:'逐步放慢；不适时直接停止',durationSeconds:cool}],objective,parameterSource:c.evidenceMap.map(e=>e.source+'；产品编排：'+e.adaptation).join('。'),review:structuredClone(c.review)};
    return finalizeCourse(c);
  }
  const courses=[
    timed('aerobic-competitive','竞技有氧支持 · '+(short?40:45)+'分钟','aerobic','development','develop',short?30:35,1,0,'easy','维持两次主课之间的低强度有氧支持，不把轻松日跑成第三次主课','800m总40分钟、1500m45分钟是本队列已有耐受时长，进入/放慢各5分钟；并非精英最低周量',['base','develop'],300,300),
    timed('aerobic-competitive-long','连续有氧 · '+(short?60:70)+'分钟','aerobic','development','base',short?50:60,1,0,'easy','发展有氧持续性；与质量课隔开，不末段提速','总60/70分钟体现两专项有氧支持差异；需已有同等长跑耐受，不按800/1500 PB猜测',['base','develop'],300,300),
    timed('aerobic-competitive-recovery','主课后恢复 · 30分钟','aerobic','recovery','develop',20,1,0,'easy','检查主课后反应，轻松活动；疲劳未退可休息','20分钟主段与各5分钟进入/放慢，主动恢复而非增加专项量',['base','develop'],300,300),
    timed('tempo-competitive-base','有氧积累 · '+(short?4:5)+'×5分钟','tempo','development','base',5,short?4:5,60,'threshold','积累受控有氧工作，为后续专项周保持持续输出能力','5分钟/60秒慢跑来自分段组织；4/5趟为已耐受20/25分钟队列的产品安排，不采用精英更高总量'),
    timed('tempo-competitive-support','专项周 Tempo · '+(short?20:25)+'分钟','tempo','development','develop',short?20:25,1,0,'threshold','维持有氧输出；与周二专项刺激分工，禁止最后冲刺','连续20/25分钟以既有耐受为条件；从分段转连续是阶段变化，未恢复不推进'),
    timed('hills-competitive','短坡力量与动作 · 5×10秒','hills','technique','base',1/6,5,180,'technique','低总量上坡动作与推进力量；按质量课保留恢复间隔','采用原例5×10秒，但改为快而放松、非全力，选择可安全走回的短缓坡；180秒是产品恢复下限，未回起点或未恢复不得开始；不以本课代替全部力量训练'),
    timed('aerobic-competitive-taper','减量有氧 · 25分钟','aerobic','recovery','prepare',15,1,0,'easy','保留活动频率，减少连续跑总量','主段15分钟，进入放慢各5分钟；相对本竞技队列削减，不按通用百分比保证峰值',['prepare'],300,300),
    timed('aerobic-competitive-short','短恢复 · 20分钟','aerobic','recovery','recover',10,1,0,'easy','主动减量，允许完全休息；不是伤后恢复处方','总20分钟，给减量周/赛前低负荷日使用，不代表竞技能力降低',['prepare','recover'],300,300),
    timed('speed-competitive-taper','赛前放松加速 · 3×10秒','speed','primer','prepare',1/6,3,120,'technique','保持动作熟悉度，避免新疲劳；不发展速度耐力','3×10秒、120秒步行属原创低量技术编排，非全力；不是重命名旧200+150组合',['prepare'],600,300),
    timed('speed-competitive-recovery','恢复周技术 · 4×10秒','speed','technique','recover',1/6,4,90,'technique','低疲劳协调；有残余疲劳则取消，不视为专项主课','4×10秒及90秒步行是产品技术恢复安排，动作质量优先',['recover'],600,300),
    timed('aerobic-competitive-reset','恢复周连续有氧 · '+(short?35:40)+'分钟','aerobic','recovery','recover',short?25:30,1,0,'easy','保留轻松跑习惯，去掉所有代谢质量主课','总35/40分钟，按同队列已有稳定时长主动减量',['recover'],300,300)
  ];
  for(const id of ['endurance','interval','interval-development','combination-development']){
    const original=existing.find(c=>c.id===id&&c.executionEligible);if(!original)continue;
    const c=structuredClone(original);Object.assign(c,{population:common.population,selectedGroup:'competitive',trainingGroups:['竞技'],catalogRevision:competitiveRevision,warmupSeconds:900,cooldownSeconds:600});
    c.eligibility=competitiveCohort+' '+original.eligibility;
    c.evidenceMap.push({parameter:'周内关系与准备',source:'源主段结构保持不变；周负荷没有直接验证本App的试验',adaptation:'15分钟准备、10分钟冷身为产品起点；作为唯一比赛节奏主课，与周五Tempo间隔两低负荷日；其他间歇/速度耐力/组合只能替换，不能叠加',limit:'本队列和整周仍待独立审核；不因PB较快增加重复'});
    courses.push(finalizeCourse(c));
  }
  const primer={...structuredClone(common),id:'interval-competitive-primer',name:short?'赛前节奏 · 4×200m':'赛前节奏 · 3×300m',categoryId:'interval',category:courseCategories.interval,sessionRole:'primer',roleLabel:sessionRoles.primer,phase:'prepare',phaseLabel:coursePhases.prepare,trainingPhases:['prepare'],quality:true,
    sets:1,segments:[segment(short?200:300,short?4:3,180)],setRecovery:0,targetBasis:short?'800':'1500',recoveryMode:'walk',warmupSeconds:900,cooldownSeconds:600,
    objective:'比赛前七日至前一日训练块中的节奏保留；移除常规发展刺激与长跑，非新能力发展课',primaryObjective:'保留同项比赛节奏与动作，减少疲劳',
    eligibility:competitiveCohort+' 已完成本专项发展周且恢复正常，曾耐受本次节奏；比赛安排在本训练块之后，不在课表中伪造比赛记录。',
    evidenceMap:[{parameter:'减量与同项目标',source:'Spilsbury 2019成人1500m试验比较比赛配速与更高配速减量；Haugen区分中跑减量与发展期',adaptation:short?'从1800m分组300m转为800m总量的4×200，保留800m均速，180秒步行，不沿用旧教学课的常规发展定位':'从1800m双节奏转为900m的3×300，保留1500m节奏并移除800m快段，180秒步行',limit:'确切重复和恢复为产品编排，研究没有验证这套处方；800m外推额外不确定，独立审核未完成'}],
    intensityBasis:short?'800m 配速':'1500m 配速',parameterOrigin:'新赛前训练块编排，不升级旧4×200历史快照；来源支持减量原则，具体剂量待独立审核',sources:[{id:'middle',...courseSources.middle},taperSource]};
  delete primer.prescription;courses.push(finalizeCourse(primer));
  return courses;
}

function competitiveWeek(courses,event,phase,youth){
  if(youth){
    const aims=['专项技术与协调','比赛节奏判断','休息与学业恢复','有氧支持','专项刺激评估','多样活动与恢复','休息'];
    return aims.map((name,i)=>({id:[2,6].includes(i)?'rest':'youth-competitive-'+i,isPlanningSlot:![2,6].includes(i),name,category:[2,6].includes(i)?'恢复':'竞技专项待编排',dayIndex:i,dayLabel:['周一','周二','周三','周四','周五','周六','周日'][i],event,selectedGroup:'competitive',population:'youth-competitive-review',weekPhase:phase,weekDraft:true,previewOnly:true,
      weekPurpose:'青少年竞技专项框架，非入门周；尚非完整执行方案。需按成熟度、已耐受负荷与现场教练意见独立编排，不能直接套成人竞技周。',relation:aims[i],quality:false,review:{status:'pending',label:'适龄专项编排待审核'}}));
  }
  const patterns={base:['aerobic-competitive','tempo-competitive-base','aerobic-competitive-recovery','aerobic-competitive','hills-competitive',null,'aerobic-competitive-long'],
    develop:['aerobic-competitive',event==='800 m'?'endurance':'combination-development','aerobic-competitive-recovery','aerobic-competitive','tempo-competitive-support',null,'aerobic-competitive-long'],
    prepare:['aerobic-competitive-taper','interval-competitive-primer','aerobic-competitive-short','aerobic-competitive-taper','speed-competitive-taper','aerobic-competitive-short',null],
    recover:['aerobic-competitive-short','aerobic-competitive-reset',null,'speed-competitive-recovery','aerobic-competitive-short',null,'aerobic-competitive-reset']};
  const purposes={base:'成人竞技基础周：分段Tempo积累有氧，短坡承担动作与力量刺激；准备专项训练，不复制精英双练周量。',develop:event==='800 m'?'成人800m竞技专项周：周二分组300m维持专项段质量，周五连续Tempo维护有氧；两低负荷日隔开，不叠加200m或组合主课。':'成人1500m竞技专项周：周二400+200双节奏转换，周五连续Tempo维护有氧；两低负荷日隔开，500m间歇或速度储备只能替换。',prepare:'成人竞技赛前七日训练块（比赛前7日至前1日）：保留同项节奏，去掉Tempo和长跑。比赛在块结束后，比赛日期不必填才能浏览；不是自动日历减量。',recover:'成人竞技主动恢复周：取消质量主课，保留轻松有氧与低疲劳技术；不是伤后复出方案。'};
  const relations=phase==='prepare'?['D-7 减少连续跑量','D-6 唯一比赛节奏课；非力竭','D-5 轻松恢复','D-4 低量有氧','D-3 放松技术，不冲刺','D-2 轻松活动；疲劳可休息','D-1 休息，不补课；比赛不计入此训练块']:phase==='recover'?['轻松进入恢复周','控制时长，不渐进提速','完全休息','低疲劳技术；残余疲劳则取消','轻松恢复','休息','评估反应，不自动切回质量周']:['低强度进入本周','本周第一刺激；熟悉负荷，不额外加课','主课后恢复检查','第二个低负荷日','不同目的的第二刺激','完整休息，不补漏课','轻松有氧收尾；与下周主课隔开'];
  return patterns[phase].map((id,i)=>({...structuredClone(id?courses.find(c=>c.id===id):{id:'rest',name:'休息与自主恢复',category:'恢复',quality:false,review:{status:'pending',label:'周编排待审核'}}),cohortId:event+'|adult-competitive-balanced',population:'adult-competitive-balanced',selectedGroup:'competitive',weekEligibility:competitiveCohort,weekPhase:phase,weekPurpose:purposes[phase],weekDraft:true,previewOnly:true,dayIndex:i,dayLabel:['周一','周二','周三','周四','周五','周六','周日'][i],relation:relations[i],event,
    transitionRules:'基础→专项仅在已耐受两刺激周并恢复正常后，以专项课替换短坡、连续Tempo替换分段Tempo；不同时增加周量。专项→赛前须已有目标比赛及恢复条件，课程块可先浏览；移除长跑与Tempo，不追新刺激。恢复周不自动回加，伤痛暂停。力量房等既有训练未计入本跑步周，不能额外叠加而声称总负荷已核验。'}));
}
