export const types = ['轻松跑', '恢复跑', '节奏跑', '阈值跑', '间歇跑', '长距离跑', '坡道跑', '加速跑', '比赛配速跑', '交叉训练', '力量训练', '休息'];
export const meals = ['早餐', '午餐', '晚餐', '加餐'];
export const distances = ['800 m', '1500 m', '3000 m', '5 km', '10 km', '半程马拉松', '全程马拉松', '自定义'];
export const fresh = () => ({ version: 1, coachSchedule: {rules:[]}, runs: [], plans: [], recovery: [], food: [], foodLibrary: [], favorites: [], planFavorites: [], events: [], records: [], cycles: [], cycleAudit: [], cycleProfile: null, groupPlan: null, trainingHold: false, goals: { weekly: 0, days: 0, race: '', target: '', raceDate: '' } });

export function dateKey(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, '0')).join('-');
}
export function offset(day, delta) {
  const date = new Date(day + 'T12:00:00');
  date.setDate(date.getDate() + delta);
  return dateKey(date);
}
export function weekStart(day) {
  return offset(day, -((new Date(day + 'T12:00:00').getDay() + 6) % 7));
}
export function pace(distance, minutes) {
  if (!(distance > 0 && minutes > 0)) return '—';
  const seconds = Math.round(minutes * 60 / distance);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
export function duration(seconds) {
  const h = Math.floor(seconds / 3600);
  return (h ? h + ':' : '') + String(Math.floor(seconds / 60) % 60).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}
export const sum = (items, key) => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
export const week = (runs, day) => {
  const start = weekStart(day);
  return Array.from({length: 7}, (_, index) => {
    const date = offset(start, index);
    const entries = runs.filter(run => run.date === date);
    return { date, distance: sum(entries, 'distance'), minutes: sum(entries, 'minutes'), count: entries.length };
  });
};
export function conflicts(item, events) {
  if (!item.start || !item.end) return [];
  return events.filter(event => event.id !== item.id && event.date === item.date && event.start && event.end && item.start < event.end && event.start < item.end);
}
export function insight(data, day) {
  const latest = data.recovery.filter(item => item.date === day).at(-1);
  const todayRuns = data.runs.filter(item => item.date === day);
  if (latest?.pain || todayRuns.some(item => item.pain)) {
    return ['先回顾今天的不适反馈', '今天的记录包含疼痛反馈。已在训练日志中标记，调整日程前可以回顾具体备注。'];
  }
  const recent = data.runs.filter(item => item.date >= offset(day, -6) && item.date <= day);
  const prior = data.runs.filter(item => item.date >= offset(day, -13) && item.date <= offset(day, -7));
  if (recent.length && prior.length && sum(prior, 'distance') > 0) {
    const change = Math.round((sum(recent, 'distance') / sum(prior, 'distance') - 1) * 100);
    return ['对比最近两周的跑量', '近 7 天跑量较前 7 天' + (change === 0 ? '持平' : (change > 0 ? '增加 ' : '减少 ') + Math.abs(change) + '%') + '。跑量对比仅反映距离，可结合恢复日志一起查看。'];
  }
  if (latest) return ['已记录今日恢复', '你记录了 ' + latest.sleep + ' 小时睡眠和 ' + latest.fatigue + ' / 5 的疲劳感。持续记录可以帮助回顾训练与恢复的变化。'];
  if (recent.length) return ['训练记录正在积累', '近 7 天已记录 ' + recent.length + ' 次训练。补充睡眠和疲劳反馈后，可以一起回顾。'];
  return ['从第一条记录开始', '记录一次跑步或填写今日恢复。这里会根据你的日志解释训练变化。'];
}
export function readData(raw) {
  const base = fresh();
  if (raw === null) return base;
  const parsed = JSON.parse(raw);
  if (parsed?.version !== base.version) throw new Error('无法读取当前数据版本');
  for (const key of ['runs', 'plans', 'recovery', 'food', 'events', 'records']) {
    if (!Array.isArray(parsed[key]) || parsed[key].some(item => !item || typeof item.id !== 'string' || typeof item.date !== 'string')) {
      throw new Error('无法读取已保存的记录');
    }
    base[key] = parsed[key];
  }
  for (const key of ['cycles','cycleAudit']) {
    if (parsed[key] !== undefined && !Array.isArray(parsed[key])) throw new Error('无法读取训练周期');
    base[key] = parsed[key] || [];
  }
  base.cycleProfile = parsed.cycleProfile || null;
  base.coachSchedule = parsed.coachSchedule && Array.isArray(parsed.coachSchedule.rules) ? parsed.coachSchedule : {rules:[]};
  base.groupPlan = parsed.groupPlan && typeof parsed.groupPlan === 'object' ? parsed.groupPlan : null;
  base.trainingHold = parsed.trainingHold === true;
  base.foodLibrary = Array.isArray(parsed.foodLibrary) ? parsed.foodLibrary : [];
  base.favorites = Array.isArray(parsed.favorites) ? parsed.favorites : [];
  base.planFavorites = Array.isArray(parsed.planFavorites) ? parsed.planFavorites.filter(value => typeof value === 'string') : [];
  base.goals = { ...base.goals, ...parsed.goals };
  return base;
}
export function demo(day) {
  const start = weekStart(day);
  return {
    ...fresh(),
    goals: { weekly: 30, days: 4, race: '10 km', target: '45:00', raceDate: offset(day, 35) },
    runs: [
      { id: 'dr1', date: start, name: '晨间轻松跑', type: types[0], distance: 6.2, minutes: 37, effort: 3 },
      { id: 'dr2', date: offset(start, 2), name: '节奏跑', type: types[2], distance: 8.4, minutes: 44, effort: 6 },
      { id: 'dr3', date: offset(start, 4), name: '轻松跑', type: types[0], distance: 5, minutes: 31, effort: 3 },
      { id: 'dr4', date: offset(start, -4), name: '轻松跑', type: types[0], distance: 7, minutes: 44, effort: 3 },
      { id: 'dr5', date: offset(start, -2), name: '周末跑', type: types[5], distance: 10, minutes: 61, effort: 4 }
    ].filter(run => run.date <= day),
    plans: [{ id: 'dp1', date: day, name: '有氧轻松跑', type: types[0], distance: 6, minutes: 36, pace: '5:50–6:15', note: '保持可以自然交谈的节奏，轻松完成今天的训练。', start: '18:30', end: '19:06' }],
    recovery: [{ id: 'ds1', date: day, sleep: 7.5, fatigue: 2, pain: false, note: '' }],
    food: [{ id: 'df1', date: day, name: '燕麦酸奶碗', meal: meals[0], grams: 280, kcal: 420, carbs: 62, protein: 22, fat: 10, timing: '训练前' }],
    records: [{ id: 'db1', date: offset(day, -14), event: '5 km', seconds: 1308 }, { id: 'db2', date: offset(day, -28), event: '10 km', seconds: 2782 }]
  };
}
