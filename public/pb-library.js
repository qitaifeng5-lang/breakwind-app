// PB-based course catalogue. These are original educational examples, not prescriptions.
// PB is a race-performance selector; training readiness must be considered separately.
const specifications = {
  '800 m': [180,105,5,'800m'],
  '1500 m': [360,210,10,'1500m'],
  '3000 m': [900,480,30,'3000m'],
  '5000 m': [2100,840,60,'5km'],
  '10000 m': [4200,1800,120,'10km'],
  '半程马拉松': [9000,3600,300,'半马'],
  '全程马拉松': [19800,7200,600,'全马']
};
export const pbDistances = Object.keys(specifications);
export const pbDistanceLabel = event => specifications[event]?.[3] || event;

export function formatPB(seconds) {
  if (!Number.isFinite(seconds) || seconds<=0) return '—';
  const whole=Math.round(seconds);
  const hours=Math.floor(whole/3600);
  const minutes=Math.floor((whole%3600)/60);
  const secs=String(whole%60).padStart(2,'0');
  return hours ? hours+':'+String(minutes).padStart(2,'0')+':'+secs : minutes+':'+secs;
}
export function pbOptions(event) {
  const spec=specifications[event];
  if (!spec) return [];
  const [slow,fast,step]=spec;
  return Array.from({length:Math.floor((slow-fast)/step)+1},(_,i)=>{
    const seconds=slow-i*step;
    return {seconds,label:formatPB(seconds),index:i};
  });
}
export function matchPB(event,value) {
  const list=pbOptions(event);
  if (!list.length) return null;
  let seconds=Number(value);
  if (typeof value==='string' && value.includes(':')) {
    const parts=value.split(':').map(Number);
    if (parts.some(n=>!Number.isFinite(n)||n<0)) return null;
    seconds=parts.reduce((acc,p)=>acc*60+p,0);
  }
  if (!Number.isFinite(seconds)||seconds<=0) return null;
  return list.reduce((closest,p)=>Math.abs(p.seconds-seconds)<Math.abs(closest.seconds-seconds)?p:closest,list[0]);
}
function session(id,category,name,main,effort,reason,minutes) {
  return {id,category,name,main,effort,reason,minutes,
    blocks:[
      {name:'热身',detail:'轻松跑和动态活动，逐步进入状态'},
      {name:'主训练',detail:main},
      {name:'恢复与冷身',detail:'根据训练反应充分恢复，最后轻松放松'}
    ]};
}
export function pbCourses(event,pb) {
  const choices=pbOptions(event);
  const selected=matchPB(event,pb);
  if(!selected) return [];
  const index=selected.index;
  const grade=index/Math.max(1,choices.length-1);
  const strength=index<4?'基础技术':index<9?'进阶发展':index<13?'专项提高':'高水平专项';
  const middle=event==='800 m'||event==='1500 m';
  const short=event==='800 m';
  const reps=Math.min(8,3+Math.floor(index/2));
  const repeats=short?(index<6?200:index<12?300:400):(event==='1500 m'?400:(index<8?600:1000));
  const combos=short
    ? ['150m + 150m','200m + 150m','200m + 200m','300m + 200m'][Math.min(3,Math.floor(index/4))]
    :middle
      ? ['200m + 200m','300m + 200m','400m + 200m','400m + 300m + 200m'][Math.min(3,Math.floor(index/4))]
      : ['400m + 400m','600m + 400m','800m + 400m','1000m + 600m'][Math.min(3,Math.floor(index/4))];
  const setCount=index<5?2:index<11?3:4;
  const tempoMinutes=6+Math.floor(index/3)*2;
  const speedDistance=60+(index%4)*20;
  const recovery=index%2===0?'以充分恢复为主':'根据呼吸与动作质量延长恢复';
  const course=[
    session('interval','间歇','节奏间歇',reps+' × '+repeats+'m，控制每次节奏一致；'+recovery,'受控的中高强度',
      '发展专项节奏与重复跑能力，不以冲刺代替间歇',35+Math.floor(grade*16)),
    session('speed-endurance','速度耐力','速度耐力课',setCount+' 组（'+combos+'），每组充分休息，动作稳定优先','高强度技术课，需训练基础',
      '提升专项速度维持能力；不宜与相邻高强度课叠加',35+Math.floor(grade*15)),
    session('tempo','Tempo','节奏 / 阈值练习',(middle?2:3)+' 组 × '+tempoMinutes+' 分钟稳定节奏，组间轻松恢复','稳定可控，非全力跑',
      '增强持续输出与耐力，节奏跑不等于比赛冲刺',35+tempoMinutes),
    session('speed','速度','短距离速度技术',Math.min(8,4+Math.floor(index/3))+' × '+speedDistance+'m，充分恢复，保持放松与技术质量','动作质量优先',
      '提高跑步协调性与速度技术；身体有异常立即停止',28+Math.floor(grade*12)),
    session('combination','组合课','组合间歇',setCount+' 组（'+combos+'），不同距离间安排足够恢复','按组完成，质量优先',
      '练习不同距离间的节奏转换与技术控制',36+Math.floor(grade*20)),
    session('aerobic','基础有氧','轻松有氧与跑姿练习',
      (index<5?'轻松跑并完成基础技术练习':index<11?'轻松跑与放松加速练习':'稳定有氧跑，保持可谈话强度'),
      '轻松', '支持恢复和有氧基础；并非所有训练日都应高强度',30+Math.floor(grade*20))
  ];
  return course.map(item=>({...item,event,pb:selected.label,grade:strength,level:index,
    caution:'此为课程库示例。PB 不能证明近期负荷承受力；需考虑训练背景与伤病情况。'}));
}
export function pbWeek(event,pb) {
  const selected=matchPB(event,pb);
  if(!selected) return [];
  const courses=pbCourses(event,selected.seconds);
  const find=id=>courses.find(c=>c.id===id);
  const index=selected.index;
  // More experienced tiers have richer *example* structures; not automatic high-intensity prescriptions.
  const structure=index<4
    ? ['aerobic','interval',null,'aerobic',null,null,null]
    :index<9
      ? ['aerobic','interval',null,'tempo','aerobic',null,null]
      :['aerobic','interval',null,'tempo','aerobic','combination',null];
  return structure.map((key,dayIndex)=>({
    dayIndex,dayLabel:['周一','周二','周三','周四','周五','周六','周日'][dayIndex],
    ...(key?find(key):{id:'rest',category:'恢复',name:'休息 / 自主恢复',main:'安排充分休息',effort:'轻松',minutes:null}),
    pb:selected.label,event
  }));
}
