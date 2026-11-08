import { offset, sum } from './model.js';

export const specialties = {
  '跑步入门': { focus:'稳定习惯与轻松体感', practice:'练习走跑切换，保持步态自然。', references:['england','talk'] },
  '800 m': { focus:'有氧基础与动作协调', practice:'在熟悉的平坦场地跑，关注放松摆臂和步态。', references:['middle'] },
  '1500 m': { focus:'有氧支持与节奏感', practice:'在熟悉的平坦路线中保持均匀节奏。', references:['middle'] },
  '3000 m': { focus:'持续节奏与跑步经济性', practice:'用相似体感跑完各段，比较节奏是否稳定。', references:['japan','norway'] },
  '5000 m': { focus:'有氧耐力与配速稳定性', practice:'在平坦路线观察起跑后体感如何变化。', references:['intensity'] },
  '10000 m': { focus:'持续有氧与耐力分配', practice:'全程保持相近的呼吸与主观用力程度。', references:['kenya','intensity'] },
  '越野跑': { focus:'地面变化中的步态与用力控制', practice:'选择熟悉且稳定的低技术难度地面，地形变化时以体感调整速度。', references:['usatf'] },
  '半程马拉松': { focus:'持续有氧与配速纪律', practice:'从轻松体感起步，全程以稳定用力为主。', references:['volume','hudson'] },
  '全程马拉松': { focus:'长距离有氧基础与耐力习惯', practice:'沿熟悉路线保持稳定体感，记录可持续时间。', references:['volume','pfitzinger'] }
};
export const cycleVersion = 'cycle-1';
export const ageGroups = ['未提供','未满18岁','18–39岁','40–59岁','60岁及以上'];

export function draftCycle(data, day, profile) {
  const { event, age, level, days, minutes, weeks, risk, raceDate } = profile;
  const specialty = Object.hasOwn(specialties,event) ? specialties[event] : null;
  const result = {version:cycleVersion,profile, plans:[], weeks:[], reasons:[], sources:['ioc-load']};
  const stop = message => { result.reasons.push(message); return result; };
  if (!specialty || !ageGroups.includes(age) || !['regular','beginner'].includes(level) ||
      !Number.isInteger(days) || days < 1 || days > 7 || !Number.isInteger(minutes) || minutes < 5 || minutes > 120 ||
      ![1,2,3,4].includes(weeks) || !['clear','reported','unknown'].includes(risk)) {
    return stop('请检查专项、年龄段、训练时间和周期设置。');
  }
  if (risk === 'reported') {
    result.sources.push('ais');
    return stop('你报告了持续或明显运动疼痛、功能受限或尚在康复。请停止相关训练负荷，并寻求适当的专业评估；草案暂停排课。');
  }
  if (risk === 'unknown') return stop('本次未确认疼痛和康复情况。请确认后再生成草案。');
  const race = raceDate || data.goals.raceDate;
  if (race && (!/^\d{4}-\d{2}-\d{2}$/.test(race) || offset(race,0) !== race || race < day)) return stop('请在训练目标中更新已过去的比赛日期，或为本周期选择新日期。');
  const recentRecovery = data.recovery.filter(item => item.date >= offset(day,-6) && item.date <= day).sort((a,b) => a.date.localeCompare(b.date));
  const recentRuns = data.runs.filter(item => item.date >= offset(day,-29) && item.date <= day);
  if (recentRecovery.some(item => item.pain) || recentRuns.some(item => item.date >= offset(day,-6) && item.pain)) {
    result.sources.push('ais');
    return stop('近七天记录了疼痛。请回顾症状；如果持续、明显或影响功能，请停止相关负荷并寻求适当的专业评估。');
  }
  const latest = recentRecovery.at(-1);
  if (latest?.fatigue === 5 && latest.date >= offset(day,-2)) return stop('最近恢复记录为最高疲劳等级，暂缓排课，更新反馈后再评估。');
  if (race && race <= offset(day,6)) return stop('距比赛不足一周，停止追加训练。可以与教练核对现有赛前安排。');

  const youth = age === '未满18岁';
  const guarded = youth || age === '未提供';
  const shortSleep = recentRecovery.filter(item => Number.isFinite(item.sleep) && item.sleep < (youth ? 8 : 7)).length >= 3;
  const harderRun = recentRuns.some(item => item.date >= offset(day,-2) && item.effort >= 8);
  const reduced = shortSleep || harderRun || (latest?.fatigue >= 4 && latest.date >= offset(day,-2));
  const rollingFrequency = Math.min(3,Math.floor(new Set(recentRuns.map(item => item.date)).size * 7 / 30));
  const hasBaseline = !guarded && level === 'regular' && rollingFrequency >= 2 &&
    recentRuns.filter(item => item.date >= offset(day,-13)).length >= 2;
  const sessionLimit = Math.min(days,data.goals.days || days,guarded || reduced ? 1 : hasBaseline ? rollingFrequency : 2);
  const historyLimit = sum(recentRuns,'distance') * 7 / 30;
  const longest = Math.max(0,...recentRuns.map(item => Number(item.distance) || 0));
  const availableMinutes = Math.min(minutes, guarded || reduced ? 12 : hasBaseline ? 45 : 15);
  const occupied = new Set([...data.plans,...data.events,...recentRuns].map(item => item.date));
  const runDates = new Set([...data.plans.filter(item => item.type !== '休息'),...recentRuns].map(item => item.date));
  const referenceIds = ['talk',...specialty.references];
  if (hasBaseline) referenceIds.push('volume','intensity');
  if (guarded) referenceIds.push('ioc-youth','youth-running');
  result.sources = [...new Set([...result.sources,...referenceIds])];
  result.reasons.push('近 30 天记录 ' + recentRuns.length + ' 次，累计 ' + sum(recentRuns,'distance').toFixed(1) + ' km。' + (hasBaseline ? '以已记录的距离与频率约束本周期。' : '当前走跑分支按时长安排，不推定专项能力。'));
  if (guarded) result.reasons.push(youth ? '青少年分支优先活动多样性和长期发展，专项强度留给教练审核。' : '未提供年龄段，按保守分支安排。');
  if (reduced) result.reasons.push('近期日志包含持续较短睡眠、很吃力的跑步或较高疲劳，已缩减本次草案。');
  if (!recentRecovery.length) result.reasons.push('近期没有恢复记录，计划无法据此判断训练反应。');
  result.reasons.push('每周保留空闲日期并避开已有事项。目标成绩与单场成绩不会用来增加训练负荷。');

  for (let index = 0; index < weeks; index++) {
    const start = offset(day,index * 7);
    const end = offset(start,6);
    if (race && race < start) break;
    const preparation = Boolean(race && race <= end);
    const phase = preparation ? '赛前保留' : index === 0 || !hasBaseline ? '基础适应' : index === weeks - 1 ? '恢复巩固' : '专项基础';
    const existing = data.plans.filter(item => item.date >= start && item.date <= end && item.type !== '休息');
    const recorded = recentRuns.filter(item => item.date >= start && item.date <= end);
    const usedDays = new Set([...existing,...recorded].map(item => item.date)).size;
    const count = preparation ? 0 : Math.max(0,sessionLimit - usedDays);
    const plannedKm = sum(existing.filter(item => !item.completed),'distance') + sum(recorded,'distance');
    const availableKm = Math.max(0,Math.min(historyLimit,data.goals.weekly || Infinity) - plannedKm);
    const weekDistance = Math.floor(Math.min(longest,availableKm / Math.max(1,count), phase === '恢复巩固' ? longest * 0.65 : longest * 0.8) * 10) / 10;
    // If a scheduled run has no distance, its contribution to the weekly cap is unknown.
    const unknownLoad = existing.some(item => !item.completed && !(item.distance > 0));
    const sessions = [];
    for (let delta = 0; delta < 7 && sessions.length < count; delta++) {
      const date = offset(start,delta);
      if (occupied.has(date) || runDates.has(offset(date,-1)) || runDates.has(offset(date,1))) continue;
      if (hasBaseline && (weekDistance < 0.5 || unknownLoad)) break;
      const time = phase === '恢复巩固' ? Math.max(5,Math.floor(availableMinutes * 0.75)) : availableMinutes;
      const specific = hasBaseline && phase === '专项基础';
      const objective = specific ? specialty.focus : hasBaseline ? '轻松有氧与稳定性' : '走跑适应与观察体感';
      const structure = hasBaseline ? '先轻松热身，再均匀慢跑，最后放慢收尾。达到时间或距离上限即结束。' : '从步行开始，自选短段慢跑与步行，最后用步行收尾。';
      const note = structure + (specific ? specialty.practice : '');
      sessions.push({date,name:specific ? event + ' · 专项基础' : hasBaseline ? '轻松有氧跑' : '入门走跑',
        type:'轻松跑', distance:hasBaseline ? weekDistance : null, minutes:time, pace:'', start:'', end:'', completed:false, note,
        engineVersion:cycleVersion, sources:result.sources, event, phase, objective, structure,
        intensity:'轻松，能自然交谈。', adjustment:'如果出现明显疼痛或动作受影响，停止相关训练并重新评估。',
        rationale:specific ? '在近期训练能力内练习' + specialty.focus + '，为日后专项训练建立基础。' : '通过低强度训练观察当前耐受，为下一阶段提供真实反馈。'});
      occupied.add(date);
      runDates.add(date);
    }
    result.weeks.push({start,end,phase,count:sessions.length,existing:usedDays});
    result.plans.push(...sessions);
  }
  if (!result.plans.length) result.reasons.push('本周期没有可安全追加的训练。可能已有较多安排、已到赛前，或无法估算已排训练的负荷。');
  return result;
}

export function reviewCycle(data, day) {
  const future = data.plans.filter(plan => plan.engineVersion === cycleVersion && plan.date >= day && !plan.completed);
  const recent = data.recovery.filter(item => item.date >= offset(day,-6) && item.date <= day);
  const past = data.plans.filter(plan => plan.engineVersion === cycleVersion && plan.date >= offset(day,-7) && plan.date < day);
  const completed = past.filter(plan => plan.completed).length;
  const reasons = [];
  if (past.length) reasons.push('最近七天已完成 ' + completed + ' / ' + past.length + ' 项计划。未完成的训练不自动补做。');
  if (recent.some(item => item.pain) || data.runs.some(item => item.date >= offset(day,-6) && item.date <= day && item.pain)) reasons.push('近期有疼痛反馈，请暂停相关负荷并复核计划；疼痛持续、明显或影响动作时，请寻求专业评估。');
  if (recent.some(item => item.fatigue >= 4) || recent.filter(item => Number.isFinite(item.sleep) && item.sleep < 7).length >= 3) reasons.push('近期记录到高疲劳或多日短睡，建议复核接下来的训练。');
  if (data.runs.some(item => item.date >= offset(day,-6) && item.date <= day && item.effort >= 8)) reasons.push('近期有高主观强度训练，建议查看恢复再决定是否缩短或推迟下一次。');
  if (future.some(plan => data.events.some(event => event.date === plan.date))) reasons.push('未来训练与新增事项落在同一天，可检查是否需要调整。');
  if (future.some(plan => data.goals.raceDate && data.goals.raceDate <= plan.date)) reasons.push('有训练落在目前记录的比赛日期或之后，请复核比赛与训练安排。');
  return {reasons, future};
}
