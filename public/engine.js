import { offset, sum } from './model.js';

export const evidence = [
  {
    id:'volume', region:'丹麦研究团队 · 多国跑者', year:2025, kind:'前瞻性队列',
    title:'单次跑量跳升与过度使用损伤',
    author:'Frandsen 等', url:'https://bjsm.bmj.com/content/59/17/1203.long',
    finding:'5,205 名跑者的随访中，单次距离比过去 30 天最长跑超过 10% 时，过度使用损伤率更高。',
    limits:'观察性关联，存在自报和选择偏差。研究中的分组阈值不能作为个人安全界线。',
    application:'基础草案的单次距离取值保守，上限低于近期最长距离。'
  },
  {
    id:'intensity', region:'西班牙 · 次精英耐力跑者', year:2007, kind:'小样本随机对照',
    title:'强度分配与耐力跑表现',
    author:'Esteve-Lanao 等', url:'https://pubmed.ncbi.nlm.nih.gov/17685689/',
    finding:'12 名受过良好训练的跑者中，低强度训练占比更高的一组，在试验所测跑步表现中提升更大。',
    limits:'样本小，研究对象已有训练基础，不能据此确定所有跑者的最优强度比例。',
    application:'基础草案优先安排轻松训练，后续专项强度模型需要独立证据。'
  },
  {
    id:'talk', region:'美国 · 活跃成年人', year:2015, kind:'交叉实验',
    title:'用说话舒适度调节运动强度',
    author:'Woltmann 等', url:'https://doi.org/10.1519/JSC.0000000000000811',
    finding:'16 名志愿者参与不同说话舒适度条件下的稳态跑。能舒适说话的阶段通常对应较低强度。',
    limits:'小样本实验。说话舒适度随情境变化，不能用于诊断或精确测量阈值。',
    application:'轻松跑以能自然交谈作为体感提示。'
  }
];
export const engineVersion = 'base-1';

export function draftTraining(data, day, level) {
  const from = offset(day,-29);
  const runs = data.runs.filter(item => item.date >= from && item.date <= day);
  const latest = [...data.recovery].filter(item => item.date <= day && item.date >= offset(day,-2)).sort((a,b) => a.date.localeCompare(b.date)).at(-1);
  const result = { version:engineVersion, level, plans:[], reasons:[], sources:[] };
  const hasPain = latest?.pain || runs.some(item => item.date >= offset(day,-2) && item.pain);
  if (hasPain) {
    result.reasons.push('最近三天的日志包含疼痛反馈。训练引擎暂停安排跑步，请先回顾记录。');
    return result;
  }
  const race = data.goals.raceDate;
  if (race && race >= day && race <= offset(day,6)) {
    result.reasons.push('目标赛事落在未来七天，基础引擎暂停生成课表，保留原有安排。');
    return result;
  }
  if (latest?.fatigue === 5) {
    result.reasons.push('最近恢复记录为最高疲劳等级。先保留恢复时间，稍后可根据新反馈重新生成。');
    return result;
  }
  const familiar = level === 'regular' && runs.length >= 4;
  const reduced = latest?.fatigue === 4;
  const maxSessions = reduced ? 1 : familiar ? 3 : 2;
  const requested = Math.min(data.goals.days || maxSessions,maxSessions);
  const occupied = new Set([...data.events,...data.plans,...runs].map(item => item.date));
  const existingDays = new Set([...data.plans,...runs].filter(item => item.date >= day && item.date <= offset(day,6) && item.type !== '休息').map(item => item.date));
  const count = Math.max(0,requested - existingDays.size);
  const longest = Math.max(0,...runs.map(item => Number(item.distance) || 0));
  const existingDistance = sum(data.plans.filter(item => item.date >= day && item.date <= offset(day,6) && !item.completed), 'distance') + sum(runs.filter(item => item.date === day),'distance');
  const remaining = Math.max(0,Math.min(sum(runs,'distance') * 7 / 30,data.goals.weekly || Infinity) - existingDistance);
  const distance = familiar ? Math.floor(Math.min(longest * 0.8,remaining / Math.max(1,count),reduced ? 3 : 8) * 10) / 10 : 0;
  const useDistance = distance >= 0.5;
  if (familiar && !useDistance) {
    result.reasons.push('近期周均跑量或本周期剩余距离不足，暂不追加跑步安排。');
    return result;
  }
  result.reasons.push('近 30 天记录 ' + runs.length + ' 次、' + sum(runs,'distance').toFixed(1) + ' km。' + (useDistance ? '本次按近期周均跑量和最长单次距离控制距离。' : '使用短时入门走跑，按体感自行选择步行或慢跑。'));
  if (reduced) result.reasons.push('最近记录的疲劳为 4 / 5，草案减少训练次数。');
  if (!latest) result.reasons.push('最近三天缺少恢复反馈，无法据此评估疲劳或疼痛。');
  result.reasons.push('避开已有安排和跑步的日期，新增训练之间至少间隔一天。距离、次数与疲劳阈值是此版本的保守产品规则。');
  result.sources = useDistance ? ['volume','intensity','talk'] : ['talk'];
  for (let index = 0; index < 7 && result.plans.length < count; index++) {
    const date = offset(day,index);
    if (occupied.has(date) || [...data.plans,...runs].some(item => item.date === offset(date,-1) || item.date === offset(date,1))) continue;
    result.plans.push({
      name:useDistance ? '基础有氧轻松跑' : '入门走跑',
      date, type:'轻松跑', distance:useDistance ? distance : null, minutes:useDistance ? null : reduced ? 8 : 12,
      pace:'', start:'',end:'',completed:false,
      note:useDistance ? '用可以自然交谈的节奏完成。' : '在舒适的步行与慢跑之间自行切换，保持可以自然交谈的节奏。',
      engineVersion, sources:result.sources
    });
    index++;
  }
  if (!result.plans.length) result.reasons.push('当前七天内没有可追加的训练日期。');
  return result;
}

