import { pbWeek } from './pb-library.js';
import { offset, sum } from './model.js';

export const specialties = {
  '跑步入门': { focus:'稳定习惯与轻松体感', practice:'练习走跑切换，保持步态自然。', references:['england','talk'] },
  '800 m': { focus:'速度储备与动作协调', practice:'在熟悉的平坦场地跑，关注放松摆臂和步态。', references:['middle'], group:'track', format:'strides' },
  '1500 m': { focus:'有氧支持与节奏感', practice:'在熟悉的平坦路线中保持均匀节奏。', references:['middle'], group:'track', format:'rhythm' },
  '3000 m': { focus:'持续节奏与跑步经济性', practice:'用相似体感跑完各段，比较节奏是否稳定。', references:['japan','norway'], group:'track', format:'repeats' },
  '5000 m': { focus:'有氧耐力与配速稳定性', practice:'在平坦路线观察起跑后体感如何变化。', references:['intensity','five-k'], format:'tempo' },
  '10000 m': { focus:'持续有氧与耐力分配', practice:'全程保持相近的呼吸与主观用力程度。', references:['kenya','intensity'], format:'steady' },
  '越野跑': { focus:'地面变化中的步态与用力控制', practice:'选择熟悉且稳定的低技术难度地面，地形变化时以体感调整速度。', references:['usatf'], group:'trail', format:'terrain' },
  '半程马拉松': { focus:'持续有氧与配速纪律', practice:'从轻松体感起步，全程以稳定用力为主。', references:['volume','hudson'], format:'steady' },
  '全程马拉松': { focus:'长距离有氧基础与耐力习惯', practice:'沿熟悉路线保持稳定体感，记录可持续时间。', references:['volume','pfitzinger'], format:'endurance' },
  '基础有氧训练': { focus:'持续轻松有氧', practice:'选择可自然交谈的节奏。', references:['talk','intensity'], group:'support' },
  '速度训练': { focus:'放松加速与步态协调', practice:'使用熟悉的平坦场地，保留明显余力。', references:['middle'], group:'support', format:'strides' },
  '阈值训练': { focus:'可控的持续节奏', practice:'先练习稳定体感，再与教练或测试确认个人阈值。', references:['norway','intensity'], group:'support', format:'tempo' },
  '比赛准备': { focus:'熟悉比赛流程与恢复安排', practice:'检查路线、装备和既有赛前安排。', references:['japan','ioc-load'], group:'support', format:'race' },
  '恢复与交叉训练': { focus:'低冲击活动与恢复反馈', practice:'只在已允许的范围内选择熟悉、无痛的低冲击活动。', references:['ais','ioc-load'], group:'support', format:'cross' }
};
export const athleteTiers = { novice:'零基础跑者', base:'有基础跑者', advanced:'进阶跑者', competitive:'竞技运动员', professional:'专业运动员', recovering:'伤后恢复者', unclassified:'待补充训练背景' };
export const backgrounds = { auto:'按记录判断', recreational:'日常跑步', competitive:'长期参加专项比赛', professional:'职业或专业队训练', recovering:'伤后恢复', beginner:'主动选择入门模式' };
export const phases = { foundation:'基础适应', specific:'专项发展', race:'比赛准备', recovery:'恢复巩固' };
const qualityTiers = ['advanced','competitive','professional'];
const qualityFormats = ['strides','rhythm','repeats','tempo','steady','terrain'];

export function templateDetails(event) {
  const specialty = specialties[event];
  const cross = specialty.format === 'cross';
  const intro = event === '跑步入门' || event === '基础有氧训练';
  return {
    tiers:cross ? ['base','advanced','competitive','professional','recovering'] : intro ? ['novice','base','advanced','competitive','professional'] :
      ['base','advanced','competitive','professional'],
    phases:cross ? ['recovery'] : specialty.format === 'race' ? ['race','recovery'] : intro ? ['foundation','recovery'] : ['foundation','specific','race','recovery'],
    days:cross ? [1,2] : intro ? [1,2,3] : [2,3,4,5],
    weeks:cross ? [1,2] : [1,2,3,4],
    load:cross ? '短时、低冲击，遵循专业人员给出的上限。' : '由近期频率、平均周跑量和单次距离及时长共同限定。',
    recovery:cross ? '持续疼痛或未获活动许可时暂停。' : '疼痛暂停排课。受控专项段至少隔两天，并保留低强度课。',
    limits:specialty.format === 'tempo' ? '可控节奏段不代表测得乳酸阈值，需另行评估。' :
      qualityFormats.includes(specialty.format) ? '专项练习取训练目的，不外推精英剂量或比赛配速。' : '短周期草案，需要根据训练反应复核。'
  };
}

function recentContext(data, day, profile) {
  const runs = data.runs.filter(item => item.date >= offset(day,-29) && item.date <= day);
  const recovery = data.recovery.filter(item => item.date >= offset(day,-6) && item.date <= day).sort((a,b) => a.date.localeCompare(b.date));
  const loggedDays = Math.floor(new Set(runs.filter(item => item.distance > 0 && item.minutes > 0).map(item => item.date)).size * 7 / 30);
  const currentLogs = new Set(runs.filter(item => item.date >= offset(day,-13) && item.distance > 0 && item.minutes > 0).map(item => item.date)).size;
  const logged = loggedDays >= 2 && currentLogs >= 2;
  const declared = profile.weeklyDays >= 2 && profile.recentKm > 0 && profile.recentLongest > 0 && profile.recentLongest <= profile.recentKm;
  return {runs,recovery,logged,declared,frequency:logged ? loggedDays : declared ? profile.weeklyDays : 0,
    km:logged ? sum(runs,'distance') * 7 / 30 : declared ? profile.recentKm : 0,
    longest:logged ? Math.max(0,...runs.map(item => Number(item.distance) || 0)) : declared ? profile.recentLongest : 0};
}

function classify(data, day, profile, context) {
  const {background = 'auto', years = 0, raceStarts = 0, raceSeconds = 0, readiness} = profile;
  const resultEvent = {'5000 m':'5 km','10000 m':'10 km','越野跑':'Cross Country'}[profile.event] || profile.event;
  const loggedResults = new Set(data.records.filter(record => record.date >= offset(day,-730) && record.date <= day &&
    [profile.event,resultEvent].includes(record.event) && record.seconds > 0).map(record => record.date)).size;
  const competitiveEvidence = raceStarts >= 2 || loggedResults >= 2 || (raceStarts + loggedResults > 0 && raceSeconds > 0);
  const competitiveIntent = ['competitive','professional'].includes(background);
  let tier = 'unclassified';
  if (profile.risk === 'reported' || background === 'recovering' || recentPain(data,day)) tier = 'recovering';
  else if (background === 'beginner' || (!competitiveIntent && (profile.level === 'beginner' ||
      (background === 'auto' && profile.years === 0 && !context.frequency && !competitiveEvidence)))) tier = 'novice';
  else if (years >= 3 && context.frequency >= 4 && competitiveEvidence && background === 'professional' && readiness === 'ready') tier = 'professional';
  else if (years >= 2 && context.frequency >= 3 && competitiveEvidence && (competitiveIntent || readiness === 'ready')) tier = 'competitive';
  else if (context.frequency >= 3 && years >= 1 && (readiness === 'ready' || competitiveIntent)) tier = 'advanced';
  else if (context.frequency >= 2) tier = 'base';
  return {tier,competitiveIntent,competitiveEvidence,years,frequency:context.frequency,baseline:context.logged ? '训练日志' : context.declared ? '本人填报' : '待补充'};
}

export function recentPain(data, day) {
  return [...data.recovery,...data.runs].some(item => item.date >= offset(day,-6) && item.date <= day && item.pain);
}
export const cycleVersion = 'cycle-1';
export const ageGroups = ['未提供','未满18岁','18–39岁','40–59岁','60岁及以上'];

const qualityWork = {
  strides:['短加速','加速跑','4 × 15 秒放松加速，每次之间慢走或慢跑约 75 秒。保持动作放松。'],
  rhythm:['节奏重复','间歇跑','3 × 2 分钟均匀节奏，每次之间慢跑 2 分钟，末段仍能保持动作。'],
  repeats:['耐力节奏重复','间歇跑','3 × 3 分钟可控节奏，每次之间轻松慢跑 2 分钟。最后一组与第一组保持相似体感。'],
  tempo:['可控节奏','节奏跑','2 × 4 分钟稳定节奏，中间慢跑 2 分钟。保留余力，避免追赶比赛配速。'],
  steady:['持续稳态','节奏跑','完成 10 分钟连续稳态跑，呼吸稍快且能说短句。结束时应有余力延长几分钟。'],
  terrain:['地形节奏','坡道跑','在熟悉、低技术难度的缓坡上做 4 × 45 秒节奏变化，组间轻松返回约 90 秒。']
};

function optionalNumbersValid(profile) {
  const ranges = {years:80,weeklyDays:7,recentKm:350,recentLongest:120,raceStarts:100,raceSeconds:86400};
  return Object.entries(ranges).every(([key,max]) => profile[key] === undefined ||
    (Number.isFinite(profile[key]) && profile[key] >= 0 && profile[key] <= max));
}

export function draftCycle(data, day, profile) {
  const { event, age, level, days, minutes, weeks, risk, raceDate } = profile;
  const specialty = Object.hasOwn(specialties,event) ? specialties[event] : null;
  const result = {version:cycleVersion,profile, plans:[], weeks:[], reasons:[], sources:['ioc-load']};
  const stop = message => { result.reasons.push(message); return result; };
  if (!specialty || !ageGroups.includes(age) || (level && !['regular','beginner'].includes(level)) ||
      (profile.background && !Object.hasOwn(backgrounds,profile.background)) ||
      (profile.phase && !Object.hasOwn(phases,profile.phase)) || !optionalNumbersValid(profile) ||
      (profile.readiness && !['ready','uncertain','tired'].includes(profile.readiness)) ||
      !Number.isInteger(days) || days < 1 || days > 7 || !Number.isInteger(minutes) || minutes < 5 || minutes > 120 ||
      ![1,2,3,4].includes(weeks) || !['clear','reported','unknown'].includes(risk)) {
    return stop('请检查专项、年龄段、训练时间和周期设置。');
  }
  const context = recentContext(data,day,profile);
  const {recovery:recentRecovery,runs:recentRuns} = context;
  result.athlete = classify(data,day,profile,context);
  const {tier,competitiveIntent} = result.athlete;
  if (risk === 'reported' || (tier === 'recovering' && (event !== '恢复与交叉训练' || profile.returnCleared !== true))) {
    result.sources.push('ais');
    return stop('你报告了持续或明显运动疼痛、功能受限或尚在康复。请停止相关训练负荷，并寻求适当的专业评估；草案暂停排课。');
  }
  if (risk === 'unknown') return stop('本次未确认疼痛和康复情况。请确认后再生成草案。');
  const race = raceDate || data.goals.raceDate;
  if (race && (!/^\d{4}-\d{2}-\d{2}$/.test(race) || offset(race,0) !== race || race < day)) return stop('请在训练目标中更新已过去的比赛日期，或为本周期选择新日期。');
  if (recentPain(data,day)) {
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
  const reduced = shortSleep || harderRun || profile.readiness === 'tired' || (latest?.fatigue >= 4 && latest.date >= offset(day,-2));
  const template = templateDetails(event);
  const novice = tier === 'novice';
  const cross = specialty.format === 'cross';
  if (tier === 'unclassified' || (competitiveIntent && !context.frequency)) return stop('近期训练基线不足。请补充过去四周的训练频率、跑量和最长一次距离。竞技背景不会自动切换到入门。');
  if (novice && !template.tiers.includes(tier)) return stop('当前专项需要跑步基础。可从「跑步入门」或「基础有氧训练」生成适应周期，再按实际反馈评估。');
  if (profile.phase && !template.phases.includes(profile.phase)) return stop('这个模板不适用于所选阶段。请调整模板或训练阶段。');
  if (weeks > Math.max(...template.weeks)) return stop('这个模板请先从 ' + template.weeks.join('–') + ' 周开始，再根据反馈调整。');
  const hasBaseline = !guarded && !novice && !cross && context.frequency >= 2;
  const sessionLimit = Math.min(days,data.goals.days || days,Math.max(...template.days),
    guarded || reduced || tier === 'recovering' ? 1 : cross || novice ? 2 : context.frequency);
  const historyLimit = context.km * (context.logged ? 1 : 0.8);
  const longest = context.longest;
  const historicalTime = context.logged ? Math.max(0,...recentRuns.filter(run => run.distance > 0).map(run => Number(run.minutes) || 0)) : 30;
  const weeklyTime = context.logged && hasBaseline ? sum(recentRuns,'minutes') * 7 / 30 : Infinity;
  const availableMinutes = Math.min(minutes, guarded || reduced ? 12 : cross ? 20 : hasBaseline ? Math.min(historicalTime,60) : 15);
  const qualityEligible = hasBaseline && context.logged && !reduced && qualityTiers.includes(tier) &&
    profile.readiness === 'ready' && availableMinutes >= 28 && latest?.fatigue >= 1 && latest.fatigue <= 3 &&
    latest.date >= offset(day,-3) && sessionLimit >= 2 &&
    recentRuns.some(run => run.date >= offset(day,-13) && run.effort >= 5 && run.effort <= 7);
  const occupied = new Set([...data.plans,...data.events,...recentRuns].map(item => item.date));
  const runDates = new Set([...data.plans.filter(item => item.type !== '休息'),...recentRuns].map(item => item.date));
  const hardDates = new Set([...data.plans.filter(item => item.quality || ['间歇跑','节奏跑','阈值跑','坡道跑','加速跑','比赛配速跑','比赛'].includes(item.type)),
    ...recentRuns.filter(item => item.effort >= 5),...data.events].map(item => item.date));
  const referenceIds = ['talk',...specialty.references];
  if (hasBaseline) referenceIds.push('volume','intensity');
  if (guarded) referenceIds.push('ioc-youth','youth-running');
  result.sources = [...new Set([...result.sources,...referenceIds])];
  result.reasons.push(athleteTiers[tier] + ' · 跑龄 ' + result.athlete.years + ' 年 · 近期 ' + context.frequency + ' 天/周（' +
    result.athlete.baseline + '）· ' + (result.athlete.competitiveEvidence ? '有专项参赛依据' : '参赛信息有限') + '。');
  result.reasons.push('近 30 天记录 ' + recentRuns.length + ' 次，累计 ' + sum(recentRuns,'distance').toFixed(1) + ' km。' +
    (hasBaseline ? (context.logged ? '负荷上限依据本地训练日志。' : '负荷按本人填报打折，仅安排轻松跑。') : '当前按时长保守安排。'));
  if (competitiveIntent && !qualityEligible) result.reasons.push('保留专项方向。补充近期跑步日志、可控节奏训练与恢复反馈后，可评估专项质量课。');
  if (guarded) result.reasons.push(youth ? '青少年分支优先活动多样性和长期发展，专项强度留给教练审核。' : '未提供年龄段，按保守分支安排。');
  if (reduced) result.reasons.push('近期日志包含持续较短睡眠、很吃力的跑步或较高疲劳，已缩减本次草案。');
  if (!recentRecovery.length) result.reasons.push('近期没有恢复记录，计划无法据此判断训练反应。');
  result.reasons.push('每周保留空闲日期并避开已有事项。目标成绩与单场成绩不会用来增加训练负荷。');

  const limits = [];
  for (let index = 0; index < weeks; index++) {
    const start = offset(day,index * 7);
    const end = offset(start,6);
    if (race && race < start) break;
    const preparation = Boolean(race && race <= end);
    const phase = preparation ? '赛前保留' : profile.phase ? phases[profile.phase] : cross ? phases.recovery : specialty.format === 'race' ? phases.race :
      index === 0 || !hasBaseline ? phases.foundation : index === weeks - 1 ? phases.recovery : '专项基础';
    const existing = data.plans.filter(item => item.date >= start && item.date <= end && item.type !== '休息');
    const recorded = recentRuns.filter(item => item.date >= start && item.date <= end);
    const usedDays = new Set([...existing,...recorded].map(item => item.date)).size;
    const count = preparation ? 0 : Math.max(0,Math.min(sessionLimit,phase === phases.race ? 2 : sessionLimit) - usedDays);
    const plannedKm = sum(existing.filter(item => !item.completed),'distance') + sum(recorded,'distance');
    const plannedMinutes = sum(existing.filter(item => !item.completed),'minutes') + sum(recorded,'minutes');
    const availableWeekMinutes = Math.max(0,weeklyTime-plannedMinutes);
    const availableKm = Math.max(0,Math.min(historyLimit,data.goals.weekly || Infinity) - plannedKm);
    const distanceRatio = phase === phases.recovery || phase === phases.race ? 0.65 : 0.8;
    const weekDistance = Math.floor(Math.min(availableKm / Math.max(1,count),longest*distanceRatio) * 10) / 10;
    const weekMinutes = Math.floor(Math.min(availableMinutes,availableWeekMinutes/Math.max(1,count)));
    // If a scheduled run has no distance, its contribution to the weekly cap is unknown.
    const unknownLoad = existing.some(item => !item.completed && item.type !== '交叉训练' && !(item.distance > 0));
    const sessions = [];
    for (let delta = 0; delta < 7 && sessions.length < count; delta++) {
      const date = offset(start,delta);
      if (occupied.has(date) || (sessionLimit <= 3 && (runDates.has(offset(date,-1)) || runDates.has(offset(date,1))))) continue;
      if (weekMinutes < 5 || (hasBaseline && (weekDistance < 0.5 || unknownLoad))) break;
      const time = phase === phases.recovery || phase === phases.race ? Math.max(5,Math.floor(weekMinutes * 0.75)) : weekMinutes;
      const specific = !novice && ['专项基础',phases.specific].includes(phase);
      const quality = specific && qualityEligible && time>=28 && date <= offset(day,10) && Boolean(qualityWork[specialty.format]) && !sessions.some(plan => plan.quality) &&
        weekDistance >= 3 && ![-2,-1,0,1,2].some(step => hardDates.has(offset(date,step))) &&
        ![...hardDates].some(hard => hard >= start && hard <= end) && (!race || race > offset(date,9));
      const objective = specific || cross || phase === phases.race ? specialty.focus : novice ? '走跑适应与观察体感' : '轻松有氧与稳定性';
      const structure = cross ? '选择熟悉且已允许的轻松活动，遵循专业人员给出的范围。' :
        novice ? '从步行开始，自选短段慢跑与步行，最后用步行收尾。' :
        quality ? '热身至少 10 分钟，完成受控练习后慢跑收尾至少 5 分钟。接近时间或距离上限时优先缩减主段。' :
        '先轻松热身，再均匀慢跑，最后放慢收尾。达到时间或距离上限即结束。';
      const note = structure + (specific ? specialty.practice : '');
      const blocks = quality ? [['热身','轻松慢跑 10 分钟。'],['主段与组间恢复',qualityWork[specialty.format][2]],['冷身','预留至少 5 分钟轻松跑。']] :
        [['执行',structure],...(specific || phase === phases.race ? [['专项关注',specialty.practice]] : []),['结束后','记录主观强度、疼痛和动作变化。']];
      sessions.push({date,name:cross ? '轻松交叉训练' : quality ? event + ' · ' + qualityWork[specialty.format][0] :
        specific ? event + ' · 专项基础' : novice ? '入门走跑' : '轻松有氧跑',
        type:cross ? '交叉训练' : quality ? qualityWork[specialty.format][1] : '轻松跑',
        distance:hasBaseline ? weekDistance : null, minutes:time, pace:'', start:'', end:'', completed:false, note,
        engineVersion:cycleVersion, sources:result.sources, event, phase, objective, structure,
        quality, blocks, intensity:quality ? '受控，保留明显余力。短加速全程放松，持续段约 5–6/10。' : '轻松，能自然交谈。',
        adjustment:'如果出现明显疼痛或动作受影响，停止相关训练并重新评估。',
        rationale:quality ? '近期日志和恢复反馈支持短段练习。以' + specialty.focus + '为目标，保留充分恢复时间。' :
          specific ? '以轻松体感练习' + specialty.focus + '，并根据反馈决定下一阶段。' : '通过低强度活动观察当前耐受，为下一阶段提供真实反馈。'});
      occupied.add(date);
      runDates.add(date);
      if (quality) hardDates.add(date);
    }
    limits.push({start,end,count,availableKm,availableWeekMinutes,longest,unknownLoad});
    result.weeks.push({start,end,phase,count:sessions.length,existing:usedDays});
    result.plans.push(...sessions);
  }
  if (!validateSessions(result.plans,{limits,availableMinutes,qualityEligible,novice,cross,hasBaseline,race})) {
    result.plans = [];
    result.weeks = [];
    return stop('草案未通过负荷、课次间隔或训练类型校验，请复核设置。');
  }
  if (!result.plans.length) result.reasons.push('本周期没有可安全追加的训练。可能已有较多安排、已到赛前，或无法估算已排训练的负荷。');
  return result;
}

function validateSessions(plans,{limits,availableMinutes,qualityEligible,novice,cross,hasBaseline,race}) {
  const dates = new Set(plans.map(plan => plan.date));
  if (dates.size !== plans.length) return false;
  const hard = plans.filter(plan => plan.quality);
  if (hard.length && (!qualityEligible || novice || cross)) return false;
  if (hard.some((plan,index) => index > 0 && plan.date <= offset(hard[index-1].date,2))) return false;
  if (plans.some(plan => plan.minutes < 5 || plan.minutes > availableMinutes ||
      (race && plan.date >= race) || (!novice && plan.name.includes('走跑')) ||
      (hasBaseline ? !(plan.distance > 0) : plan.distance !== null))) return false;
  return limits.every(({start,end,count,availableKm,availableWeekMinutes,longest,unknownLoad}) => {
    const week = plans.filter(plan => plan.date >= start && plan.date <= end);
    return week.length <= count && week.filter(plan => plan.quality).length <= 1 &&
      week.every(plan => plan.distance === null || (!unknownLoad && plan.distance <= longest)) &&
      sum(week,'distance') <= availableKm + 0.00001 && sum(week,'minutes') <= availableWeekMinutes + 0.00001;
  });
}

export function reviewCycle(data, day) {
  const future = data.plans.filter(plan => plan.engineVersion === cycleVersion && plan.date >= day && !plan.completed);
  const recent = data.recovery.filter(item => item.date >= offset(day,-6) && item.date <= day);
  const past = data.plans.filter(plan => plan.engineVersion === cycleVersion && plan.date >= offset(day,-7) && plan.date < day);
  const completed = past.filter(plan => plan.completed).length;
  const reasons = [];
  if (past.length) reasons.push('最近七天已完成 ' + completed + ' / ' + past.length + ' 项计划。未完成的训练不自动补做。');
  if (recentPain(data,day)) reasons.push('近期有疼痛反馈，请暂停相关负荷并复核计划；疼痛持续、明显或影响动作时，请寻求专业评估。');
  if (recent.some(item => item.fatigue >= 4) || recent.filter(item => Number.isFinite(item.sleep) && item.sleep < 7).length >= 3) reasons.push('近期记录到高疲劳或多日短睡，建议复核接下来的训练。');
  if (data.runs.some(item => item.date >= offset(day,-6) && item.date <= day && item.effort >= 8)) reasons.push('近期有高主观强度训练，建议查看恢复再决定是否缩短或推迟下一次。');
  if (future.some(plan => data.events.some(event => event.date === plan.date))) reasons.push('未来训练与新增事项落在同一天，可检查是否需要调整。');
  if (future.some(plan => data.goals.raceDate && data.goals.raceDate <= plan.date)) reasons.push('有训练落在目前记录的比赛日期或之后，请复核比赛与训练安排。');
  return {reasons, future};
}

export const groupEvents = {
  '800 m':{label:'800m',km:0.8,example:'2:05.30',format:'strides'},
  '1500 m':{label:'1500m',km:1.5,example:'4:20',format:'rhythm'},
  '3000 m':{label:'3000m',km:3,example:'10:30',format:'repeats'},
  '5000 m':{label:'5km',km:5,example:'21:30',format:'tempo'},
  '10000 m':{label:'10km',km:10,example:'45:00',format:'steady'},
  '越野跑':{label:'越野',example:'1:12:00',format:'terrain'},
  '半程马拉松':{label:'半马',km:21.0975,example:'1:45:00',format:'steady'},
  '全程马拉松':{label:'全马',km:42.195,example:'3:45:00',format:'steady'}
};
export const trainingGroups = {novice:'入门',base:'基础',advanced:'进阶',competitive:'竞技'};
export function parseGroupPB(event, text) {
  const entry = Object.hasOwn(groupEvents,event) && groupEvents[event];
  if (!entry || typeof text !== 'string') return null;
  const value = text.trim().replaceAll('：',':');
  const long = !entry.km || entry.km > 10;
  const pattern = long ? /^\d{1,2}:[0-5]\d:[0-5]\d$/ : /^\d{1,3}:[0-5]\d(?:\.\d{1,2})?$/;
  if (!pattern.test(value)) return null;
  const seconds=value.split(':').reduce((total,part)=>total*60+Number(part),0);
  return seconds > 0 && seconds < 86400 && (!entry.km || seconds/entry.km >= 110) ? seconds : null;
}

// Availability and readiness never change the browsable course definition.
export function courseReadiness(data,course,date,today=date) {
  const profile=data.cycleProfile || {};
  const latest=[...data.recovery].filter(item=>item.date<=today).sort((a,b)=>b.date.localeCompare(a.date))[0];
  const recovering=profile.risk==='reported' || (profile.background==='recovering' && profile.returnCleared!==true);
  if (data.trainingHold || recentPain(data,today) || latest?.pain || recovering) {
    return {status:'paused',canSchedule:false,canStart:false,reason:'已知疼痛或尚未恢复：暂停相关课程，先接受专业评估。'};
  }
  const transcribed=course.executionSpec?.origin==='coach-transcription';
  if(course.planId&&data.plans.find(p=>p.id===course.planId)?.cancelled)return {status:'cancelled',canSchedule:false,canStart:false,reason:'该课次已取消，保留历史，不自动重建或继续执行。'};
  const programPlan=course.planId&&data.plans.find(p=>p.id===course.planId&&p.programId);
  if(programPlan&&data.programs?.find(p=>p.programId===programPlan.programId)?.status==='paused')return {status:'program-paused',canSchedule:false,canStart:false,reason:'长期周期已暂停。先复核恢复状态，再恢复后续执行；已有记录保留。'};
  const legacyCombo=['800 m','1500 m'].includes(course.event)&&course.id==='combination';
  if (!transcribed && course.id==='combination-development' && course.targetBases?.[0]!=='mile') return {status:'review',canSchedule:false,canStart:false,reason:'旧组合课使用了1500m替代英里节奏。历史快照保留；请重新核对修订课程，不沿用旧依据启动。'};
  if (course.isPlanningSlot) return {status:'review',canSchedule:false,canStart:false,reason:'这是阶段编排位置，尚未指定经过审核的课程，不作为运动记录。'};
  if (!transcribed && (legacyCombo || course.catalogStatus==='archive' || course.executionEligible===false)) return {status:'review',canSchedule:false,canStart:false,reason:'此课程尚缺完整参数依据，仅供审查浏览；不自动安排。已有教练课表请使用独立录入入口。'};
  const youth=profile.age==='未满18岁';
  if (youth && (!course.adapted || course.quality)) return {status:'coach',canSchedule:false,canStart:false,reason:'可浏览完整结构；青少年专项强度需教练结合成熟度评估，不能直接执行成人示例。'};
  const hard=course.quality && [...data.runs,...data.plans].some(item=>(!course.planId || item.id!==course.planId) && !item.completed && !item.cancelled && item.executionStatus!=='reference-only' &&
    (item.quality || item.effort>=6 || ['间歇跑','阈值跑','节奏跑','比赛配速跑','坡道跑'].includes(item.type)) &&
    Math.abs(Date.parse(date)-Date.parse(item.date))<3*86400000);
  if (hard) return {status:'spacing',canSchedule:false,canStart:false,reason:'附近已有质量课或高强度记录；请选择至少间隔两个低负荷日的日期。'};
  if (latest?.date>=offset(today,-2) && latest.fatigue>=4) return {status:'recovery',canSchedule:false,canStart:false,reason:'近期高疲劳：先恢复，再决定是否执行。'};
  return {status:'check',canSchedule:true,canStart:false,reason:youth?'适龄技术变式仍待专业审核；执行前需要教练现场指导。':'课程可加入日程；执行前核对当前状态与同类训练经验。缺少App日志不会降低课程档位。'};
}

// Compatibility for saved group preferences: preview only, never auto-prescribe.
export function groupWeek(data,today,profile) {
  if (!profile || !Object.hasOwn(groupEvents,profile.event) || !Object.hasOwn(trainingGroups,profile.group) ||
      typeof profile.start!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(profile.start) || offset(profile.start,0)!==profile.start || profile.start>today) return [];
  const elapsed=Math.round((Date.parse(today)-Date.parse(profile.start))/86400000);
  const start=offset(today,-(elapsed%7));
  return pbWeek(profile.event,profile.pb,{group:profile.group,phase:profile.phase||'develop',youth:data.cycleProfile?.age==='未满18岁'}).map((course,index)=>{
    const date=offset(start,index);
    const existing=data.plans.find(plan=>plan.date===date);
    if (existing) return {...existing,external:true};
    return {...course,id:['group',profile.event,profile.group,profile.start,date].join('~'),date,groupWorkout:true,
      type:course.id==='rest'?'休息':course.quality?'间歇跑':'轻松跑',courseId:course.id,readiness:courseReadiness(data,course,date,today),
      previewOnly:true,minutes:null,pace:'',blocks:course.blocks?.map(block=>[block.name,block.detail])};
  });
}
