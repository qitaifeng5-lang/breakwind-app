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
export function pbCourses(event,pb,{youth=false}={}) {
  if (!pbDistances.includes(event)) return [];
  const band=pbBand(event,pb),track=['800 m','1500 m'].includes(event),short=event==='800 m',xc=event==='越野跑';
  const foundation=['foundation','open'].includes(band.id);
  // Explicit editorial variants. Faster PB never automatically adds repetitions.
  const definitions=[
    definition('interval',short?'200m 节奏重复':track?'500m 稳定间歇':'分段有氧间歇','develop','保持重复段的节奏一致，最后一段仍能控制动作',1,
      [segment(short?200:track?500:3,short?4:3,track?180:120,track?'m':'min')],0,'受控偏强，不以PB换算目标秒数',['intervals','middle']),
    definition('endurance',short?'300m 速度维持':track?'400m 节奏保持':'长段节奏耐力','prepare','练习疲劳前的动作稳定；不是力竭测试',1,
      [segment(short?300:track?400:4,3,foundation?300:240,track?'m':'min')],0,'专项强度，仅供已有同类训练基础者核对',['middle']),
    definition('tempo',track?'短段 Tempo':'分段阈值节奏','base','发展可持续输出，避免把阈值理解为全力',1,
      [segment(track?4:6,3,120,'min')],0,'稳定、受控；阈值需实际测试或教练评估，PB不能替代',['middle','load']),
    definition('speed',short?'60m 放松加速':'跑姿与渐进加速','base','在充分恢复下练习协调、落地和放松',1,
      [segment(short?60:80,4,180)],0,'渐进加速，保持放松，非最大冲刺',['middle']),
    definition('combination',short?'200 + 150 组合':track?'400 + 200 组合':xc?'上坡 + 平地组合':'长短段组合','develop','在不同长度之间切换节奏，保持相同动作质量',2,
      track?[segment(short?200:400,1,foundation?180:120),segment(short?150:200,1,0)]:[segment(3,1,120,'min'),segment(1,1,0,'min')],foundation?360:300,
      foundation?'先熟悉单段；掌握后再评估组合':'有同类训练经历才考虑整组；不叠加速度耐力课',['middle','load']),
    definition('aerobic',xc?'轻松地形适应':'轻松有氧与恢复','base','支持恢复与有氧基础，依据习惯时长调整',1,
      [segment(20,1,0,'min')],0,'能完整交谈；20分钟只是浏览示例，不是你的负荷上限',['load']),
    definition('hills',xc?'短坡与下坡控制':'短坡技术','develop','在安全地形练习步频，步行下坡恢复',1,
      [segment(10,5,180,'sec')],0,'受控上坡，非全力；湿滑或技术不足时改平地',['hills'])
  ];
  if (track) definitions.push(
    definition('interval-aerobic','按时间的有氧间歇','base','以时间而非圈速控制连续有氧刺激；与距离间歇的节奏一致性目标不同',1,[segment(short?2:3,3,120,'min')],0,'受控、可重复；不追求800m或1500m比赛速度',['middle','load']),
    definition('endurance-split',short?'分段 400m 动作保持':'分段 600m 动作保持','prepare','短暂恢复后重建姿态，识别动作开始失稳的时点；不做力竭乳酸测试',2,[segment(short?200:300,2,foundation?120:90)],foundation?360:300,'已有速度耐力经历才考虑；动作失稳即结束，不强求第二组',['middle','load']),
    definition('tempo-continuous','连续 Tempo 控制','base','练习不中断的呼吸与体感控制，区别于分段Tempo的恢复后再进入节奏',1,[segment(short?8:12,1,0,'min')],0,'稳定受控；不能用PB计算阈值；不熟悉连续节奏时选择分段课',['middle','load']),
    definition('speed-drills','协调与跑姿练习','base','以低疲劳练习协调与姿态，不追求加速距离或速度成绩',1,[{distance:0,unit:'skill',repeats:1,recoverySeconds:null,description:'动态协调 → 原地步频 → 轻松跑姿练习；由动作质量决定结束，练习间充分恢复'}],0,'轻量技术，保持放松；复杂动作需现场指导',['middle']),
    definition('combination-change',short?'150 + 200 + 150 节奏转换':'200 + 400 + 200 节奏转换','prepare','中间较长段保持节奏，末段恢复放松动作；练习转换而非模拟全力比赛',1,[segment(short?150:200,1,180),segment(short?200:400,1,180),segment(short?150:200,1,0)],0,'各段受控，不规定PB百分比；不能额外叠加速度耐力课',['middle','load']),
    definition('aerobic-steady','连续有氧基础','base','轻松进入后维持连续有氧，最后主动降速；区别于质量课后的恢复性短跑',1,
      [{...segment(5,1,0,'min'),label:'轻松进入'},{...segment(short?15:20,1,0,'min'),label:'稳定有氧，全程可完整交谈'},{...segment(5,1,0,'min'),label:'逐步放慢；三段之间不暂停'}],0,
      '全程轻松，不变成渐进强度课；示例时长不是最低要求或个人上限，按既有耐受缩短中段',['load']),
    definition('hills-control','坡面步态与下坡控制','base','先练安全地形判断、平衡与下坡控制，区别于短坡重复的推进动作',1,[{distance:0,unit:'skill',repeats:1,recoverySeconds:null,description:'检查坡面 → 缓坡步行 → 小步走下坡；每段停下检查平衡，不做下坡冲刺'}],0,'低负荷地形技术；不熟悉地形时改平地，避免湿滑坡面',['hills','load'])
  );
  return definitions.map(d=>{
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
    course.main=courseSummary(course);
    course.blocks=[{name:'热身',detail:course.warmup},{name:'主训练',detail:course.main},{name:'冷身',detail:course.cooldown}];
    return course;
  });
}
export function courseSummary(course) {
  const parts=course.segments.map(s=>s.unit==='skill'?s.description:(s.repeats>1?s.repeats+' × ':'')+s.distance+({m:'m',min:'分钟',sec:'秒'}[s.unit]||''));
  return (course.sets>1?course.sets+' 组（':'')+parts.join(' + ')+(course.sets>1?'）':'');
}
export function pbWeek(event,pb,{phase='develop',youth=false}={}) {
  const courses=pbCourses(event,pb,{youth});
  if (!courses.length) return [];
  const track=['800 m','1500 m'].includes(event),xc=event==='越野跑';
  const quality=phase==='base'?'tempo':phase==='prepare'?'endurance':xc?'hills':'interval';
  const patterns={
    base:['speed-drills','tempo',null,'aerobic-steady','hills-control',null,'aerobic'],
    develop:event==='800 m'?['speed','interval',null,'aerobic','combination',null,'aerobic']:['speed-drills','interval-aerobic',null,'aerobic','tempo',null,'aerobic'],
    prepare:['speed',event==='800 m'?'endurance':'combination-change',null,'aerobic','speed-drills',null,null],
    recover:['aerobic',null,'speed-drills',null,'aerobic',null,null]
  };
  const structure=track?(patterns[phase]||patterns.develop):phase==='recover'?['aerobic',null,'speed',null,'aerobic',null,null]:['speed',quality,null,'aerobic','speed',null,'aerobic'];
  const relations=['先以技术进入本周','本周主要刺激，替代其他质量课','恢复日，为前一课留出恢复','低强度衔接，检查主课后反应','与主课间隔两个低负荷日；恢复不足则取消','恢复，不补做漏课','轻松收尾，为下一周期留余力'];
  return structure.map((id,dayIndex)=>({...(courses.find(c=>c.id===id)||{id:'rest',name:'休息与自主恢复',category:'恢复',quality:false,review:{status:'pending',label:'待专业审核'}}),
    dayIndex,dayLabel:['周一','周二','周三','周四','周五','周六','周日'][dayIndex],relation:phase==='recover'?'恢复周：不安排质量课，保留轻量技术与休息。':relations[dayIndex],event,
    weekPhase:phase,weekPurpose:phasePurposes[phase]||phasePurposes.develop,coverage:track?'中跑阶段结构示例':'仅通用基础示例，尚非完整专项周期',previewOnly:true}));
}
