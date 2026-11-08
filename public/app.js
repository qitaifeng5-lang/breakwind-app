import { runModes, sourceNames, addFix, analyzeTrack, likelyDuplicate, energyEstimate, importRun, coordinate, heartSegment, heartZones } from './running.js';
import { catalog, searchFood, portionValues, mealTotals, validBarcode } from './fuel.js';
import { ageGroups, cycleVersion, draftCycle, reviewCycle, specialties } from './engine.js';
import { evidence, evidenceLevels } from './knowledge.js';
import { types, meals, distances, fresh, dateKey, offset, weekStart, pace, duration, sum, week, conflicts, insight, readData, demo } from './model.js';

const icons = {
  home: 'M3 10l9-7 9 7v10H3z M9 20v-6h6v6',
  run: 'M3 12h4l3-7 4 14 3-7h4',
  calendar: 'M4 6h16v15H4z M4 10h16 M8 3v5 M16 3v5',
  food: 'M5 3v7a3 3 0 0 0 6 0V3 M8 3v18 M19 3c-4 3-4 7-4 10h4 M19 3v18',
  chart: 'M4 4v16h16 M8 15l4-5 3 2 5-6',
  growth: 'M5 21h14 M12 17v4 M8 4h8v7a4 4 0 0 1-8 0z M8 6H4v2a4 4 0 0 0 4 4 M16 6h4v2a4 4 0 0 1-4 4',
  book: 'M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
  bolt: 'M13 2 4 14h7l-1 8 10-12h-7z',
  plus: 'M12 5v14 M5 12h14', arrow: 'M5 12h14 M13 6l6 6-6 6',
  left: 'm15 6-6 6 6 6', right: 'm9 6 6 6-6 6', close: 'm6 6 12 12 M18 6 6 18',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  flag: 'M5 21V4c4-3 8 3 14 0v11c-6 3-10-3-14 0',
  spark: 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  play: 'm8 5 12 7-12 7z', settings: 'M4 7h16 M4 17h16 M9 4v6 M15 14v6',
  moon: 'M20 15A9 9 0 0 1 9 4 9 9 0 1 0 20 15z'
};
const icon = (name, size = 19) => '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + icons[name] + '"/></svg>';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const routes = { home: ['总览','总览面板'], run: ['训练','训练工作台'], calendar: ['日程','训练与日程'], food: ['营养','运动营养'], chart: ['数据','数据中心'], heart: ['恢复','恢复日志'], book: ['学院','知识库与训练引擎'], growth: ['成长','跑者成长'] };
const key = 'breakwind.local.v1';
const main = document.querySelector('#main');
const editor = document.querySelector('#editor');
let data = fresh();
let storageError = '';
function load() {
  try {
    data = readData(localStorage.getItem(key));
    storageError = '';
  } catch {
    storageError = '本地数据暂时无法读取。请检查浏览器存储设置。';
  }
}
load();
let sample = location.hash.includes('demo=1');
let day = dateKey();
let selectedDate = day;
let calendarMode = 'week';
let chartRange = 7;
let chartDate = '';
let toastTimer;
let activeWorkout;
let clockTimer;
let opener;
let homeTab = 'training';
let foodDate = day;
let planFilter = 'all';
let detailPeriod = 7;
let activeDetail;
let rankingTab = 'manual';
const themes = {ember:'破风暗红',track:'赛道蓝',forest:'林地绿'};
let currentTheme = 'ember';
try {
  const preference = localStorage.getItem('breakwind.theme');
  if (Object.hasOwn(themes,preference)) currentTheme = preference;
} catch { /* Use default if browser preferences are unavailable. */ }

const state = () => sample ? demo(day) : data;
const currentRoute = () => {
  const route = location.hash.slice(1).split('?')[0];
  return Object.hasOwn(routes, route) ? route : 'home';
};
const href = route => '#' + route + (sample ? '?demo=1' : '');
const num = value => new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 1}).format(value);
const fullDate = date => new Intl.DateTimeFormat('zh-CN', {month:'long',day:'numeric',weekday:'long'}).format(new Date(date + 'T12:00:00'));
const byDate = (items, date) => items.filter(item => item.date === date);
const desc = items => [...items].sort((a,b) => b.date.localeCompare(a.date));
const tag = (label, tone = '') => '<span class="tag ' + tone + '">' + escape(label) + '</span>';
const btn = (label, action, glyph = '', style = 'secondary') => '<button type="button" class="btn ' + style + '" data-action="' + action + '">' + (glyph ? icon(glyph, 17) : '') + escape(label) + '</button>';
const link = (label, route) => '<a class="text-link" href="' + href(route) + '">' + escape(label) + icon('arrow',16) + '</a>';
const empty = (glyph, title, detail) => '<div class="empty">' + icon(glyph,22) + '<div><strong>' + escape(title) + '</strong><p>' + escape(detail) + '</p></div></div>';
const head = (eyebrow, title, sub, actions = '') => '<div class="page-head"><div><div class="eyebrow"><i></i>' + eyebrow + '</div><h1>' + title + '</h1><p>' + sub + '</p></div><div class="page-actions">' + actions + '</div></div>';
const panel = (title, content, action = '', subtitle = '') => '<section class="panel"><div class="panel-head"><div><h2>' + title + '</h2>' + (subtitle ? '<p>' + subtitle + '</p>' : '') + '</div>' + action + '</div>' + content + '</section>';
const metric = (label, value, unit = '') => '<div class="metric"><small>' + label + '</small><div><strong>' + escape(value) + '</strong> <span>' + escape(unit) + '</span></div></div>';
const timeline = (s, date) => [
  ...byDate(s.plans,date).map(item => ({...item, collection:'plans'})),
  ...byDate(s.events,date).map(item => ({...item, collection:'events'}))
].sort((a,b) => (a.start || '99:99').localeCompare(b.start || '99:99'));

function navLink(route, active) {
  return '<a href="' + href(route) + '" ' + (route === active ? 'aria-current="page"' : '') + '>' + icon(route) + '<span>' + routes[route][0] + '</span></a>';
}
function chrome(route) {
  document.querySelector('#sidebar').innerHTML = '<a class="brand" href="' + href('home') + '"><img src="icon.svg" alt=""><span><strong>破风</strong><small>BREAKWIND</small></span></a><div class="side-label">训练工作台</div><nav aria-label="主导航">' + Object.keys(routes).map(item => navLink(item, route)).join('') + '</nav><div class="side-bottom"><div class="side-status"><i></i> 本地训练日志</div><span>PERFORMANCE / 01</span></div>';
  document.querySelector('#bottom-nav').innerHTML = ['home','run','calendar','food','chart'].map(item => navLink(item, route)).join('') + '<button type="button" data-action="menu">' + icon('settings') + '<span>更多</span></button>';
  document.querySelector('#topbar').innerHTML = '<div class="crumb"><img src="icon.svg" alt=""><span>破风</span><b>/</b><strong>' + routes[route][1] + '</strong></div><div class="top-actions">' + btn(sample ? '退出演示' : '查看演示','demo','', 'quiet') + '<button class="icon-button" data-action="notifications" aria-label="通知">' + icon('bell') + '</button><button class="avatar" data-action="profile" aria-label="目标与设置">跑</button></div>';
}

function bars(series, highlighted = chartDate) {
  const max = Math.max(1, ...series.map(item => item.distance));
  return '<div class="bars" aria-label="每日跑量">' + series.map(item => {
    const picked = item.date === highlighted;
    return '<button type="button" class="bar-day' + (picked ? ' picked' : '') + '" data-action="chart:' + item.date + '" aria-pressed="' + picked + '" aria-label="' + escape(fullDate(item.date)) + '，' + num(item.distance) + ' 公里"><span class="bar-plot"><span class="bar-fill" style="--height:' + Math.max(3, item.distance / max * 90) + '%"></span></span><small>' + (series.length === 7 ? '一二三四五六日'[(new Date(item.date+'T12:00:00').getDay()+6)%7] : item.date.slice(8)) + '</small></button>';
  }).join('') + '</div>';
}
function workoutHero(s) {
  const plan = byDate(s.plans,day).find(item => !item.completed);
  const completed = byDate(s.plans,day).some(item => item.completed);
  const planMetrics = plan ? '<div class="hero-metrics">' + metric('计划距离', plan.distance || '—', plan.distance ? 'km' : '') + metric('预计时长', plan.minutes || '—', plan.minutes ? 'min' : '') + metric('建议配速', plan.pace || '—') + '</div>' : '';
  return '<section class="hero"><div class="hero-content"><div class="hero-kicker"><i></i> 今日训练 <span> / TODAY</span></div><h2>' + escape(plan?.name || (completed ? '今日训练已完成' : '每一步，从今天开始')) + '</h2><p>' + escape(plan?.note || (plan ? plan.type : completed ? '在训练日志回顾今天的表现。' : '安排今天的训练，或者记录一场已经完成的跑步。')) + '</p>' + planMetrics + '<div class="hero-actions">' + (activeWorkout ? btn('继续计时','timer','play','primary') : btn('开始训练','start:' + (plan?.id || ''),'play','primary')) + btn(plan ? '调整计划' : '安排训练','edit:plans:' + (plan?.id || ''),'calendar','hero-secondary') + '</div></div><span class="hero-index" aria-hidden="true">01 / TRAINING</span></section>';
}

function dashboard(s) {
  const series = week(s.runs, day);
  const total = sum(series,'distance');
  const count = sum(series,'count');
  const selected = series.find(item => item.date === chartDate);
  const percent = s.goals.weekly ? Math.min(100, Math.round(total / s.goals.weekly * 100)) : 0;
  const recovery = byDate(s.recovery,day).at(-1);
  const food = byDate(s.food,day);
  const [title, copy] = insight(s, day);
  const name = '准备好破风了吗？';
  return head('PERFORMANCE DASHBOARD', name, fullDate(day) + ' · 把今天的训练、恢复和补给安排好。', btn('记录跑步','run-options','plus','primary')) + homeSwitch() + (homeTab === 'food' ? homeFuel(s,food) : workoutHero(s) + homeCalendar(s)) +
    '<div class="dashboard-grid"><div class="stack">' +
    panel('本周训练概览', '<div class="weekly-summary">' + metric('本周跑量',num(total),'km') + metric('训练次数',count,'次') + '<div class="goal-meter"><div class="ring" style="--progress:' + percent + '%"><strong>' + (s.goals.weekly ? percent + '%' : '—') + '</strong></div><div><small>周跑量目标</small><strong>' + (s.goals.weekly ? num(s.goals.weekly) + ' km' : '待设置') + '</strong></div></div></div>' + bars(series) + '<div class="chart-caption">' + (selected ? escape(fullDate(selected.date)) + ' · ' + num(selected.distance) + ' km · ' + selected.count + ' 次' : count ? '点击任意一天查看记录' : '本周暂无跑步记录') + '</div>',link('查看数据','chart'), '每周一更新统计周期') +
    panel('个人纪录', personalBest(s), btn('添加','edit:records:','plus','quiet'), '按距离查看最快的记录') +
    '</div><div class="stack">' +
    '<section class="panel coach"><div class="coach-label"><span class="tile red">' + icon('spark',19) + '</span><div><h2>训练洞察</h2><small>基于日志的规则分析</small></div></div><h3>' + title + '</h3><p>' + escape(copy) + '</p>' + '<div class="insight-links">' + link('查看恢复','heart') + link('训练引擎','book') + '</div></section>' +
    panel('恢复状态', recovery ? '<div class="mini-grid">' + metric('睡眠',recovery.sleep,'h') + metric('疲劳',recovery.fatigue,'/ 5') + metric('疼痛反馈',recovery.pain ? '有' : '无') + '</div>' : empty('moon','等待今日反馈','记录睡眠、疲劳与疼痛。'), link('恢复日志','heart')) +
    panel('今日营养', food.length ? nutritionStats(food) : empty('food','今天还没有餐食记录','记录一餐，查看能量和营养构成。'), link('营养日志','food')) +
    '</div></div>';
}
function personalBest(s) {
  const groups = distances.map(event => s.records.filter(item => item.event === event).sort((a,b) => a.seconds - b.seconds)[0]).filter(Boolean);
  return groups.length ? '<div class="mini-grid pb-grid">' + groups.map(item => metric(item.event,duration(item.seconds))).join('') + '</div>' : empty('flag','还没有个人纪录','添加一次比赛或计时跑成绩。');
}
function nutritionStats(items) {
  const total=mealTotals(items);
  const display=key=>total[key]===null?'—':num(total[key]);
  return '<div class="mini-grid">' + metric('能量',display('kcal'),'kcal') + metric('蛋白质',display('protein'),'g') + metric('碳水',display('carbs'),'g') + metric('脂肪',display('fat'),'g') + '</div>';
}
function rows(items, collection, render, glyph, emptyLabel, emptyCopy) {
  return items.length ? '<ul class="rows">' + items.map(item => {
    const [title, detail, badge] = render(item);
    return '<li><span class="tile">' + icon(glyph,17) + '</span><div class="row-text"><strong>' + escape(title) + '</strong><small>' + escape(detail) + '</small></div>' + (badge ? tag(badge) : '') + (collection === 'runs' ? btn('运动详情','run-detail:' + item.id,'','quiet') : collection === 'food' && item.components ? btn('餐食详情','meal-detail:' + item.id,'','quiet') : collection === 'plans' ? btn('课次详情','open-plan:' + item.id,'','quiet') : btn(sample ? '查看' : '编辑','edit:' + collection + ':' + item.id,'','quiet')) + '</li>';
  }).join('') + '</ul>' : empty(glyph,emptyLabel,emptyCopy);
}
const planRow = item => [item.name, [item.date, item.start, item.distance ? item.distance + ' km' : '', item.minutes ? item.minutes + ' min' : '', item.pace ? item.pace + ' /km' : ''].filter(Boolean).join(' · '), item.completed ? '已完成' : item.type];
const runRow = item => [item.name, item.date + ' · ' + item.distance + ' km · ' + item.minutes + ' min · ' + pace(item.distance,item.minutes) + ' /km' + (item.heart ? ' · ' + item.heart + ' bpm' : ''), sourceNames[item.source] || '手动记录'];
function training(s) {
  return head('TRAINING STUDIO','训练工作台','安排训练，回顾距离、配速和主观强度。',btn('记录跑步','run-options','plus','primary') + btn('生成训练周期','generate','spark') + btn('设备与同步','devices','settings')) +
  planCarousel() + cycleOverview(s) + '<div class="split">' + panel('训练计划',rows(desc(s.plans),'plans',planRow,'calendar','还没有训练计划','从轻松跑开始，或创建自定义训练。'),btn('安排训练','edit:plans:','plus','quiet')) +
  panel('跑步日志',rows(desc(s.runs),'runs',runRow,'run','还没有跑步记录','训练结束后可以填写实际距离和耗时。')) + '</div>';
}
function schedule(s) {
  const start = calendarMode === 'month' ? selectedDate.slice(0,7) + '-01' : weekStart(selectedDate);
  const [year, month] = selectedDate.split('-').map(Number);
  const size = calendarMode === 'month' ? new Date(year, month, 0).getDate() : calendarMode === 'week' ? 7 : 0;
  const selected = timeline(s,selectedDate);
  const dateButtons = Array.from({length:size}, (_,i) => {
    const date = offset(start,i);
    return '<button type="button" data-action="date:' + date + '" aria-pressed="' + (date === selectedDate) + '"><small>' + '日一二三四五六'[new Date(date+'T12:00:00').getDay()] + '</small><strong>' + Number(date.slice(8)) + '</strong><i class="' + (timeline(s,date).length ? 'has-event' : '') + '"></i></button>';
  }).join('');
  return head('SCHEDULE','训练与日程','把工作、学习和跑步放进同一张日历。',btn('新建事项','edit:events:','plus','primary') + btn('安排训练','edit:plans:','calendar')) +
  '<div class="split">' + panel('日历', '<div class="calendar-controls">' + btn('上一周期','move:-1','left','quiet') + '<strong>' + escape(calendarMode === 'month' ? selectedDate.slice(0,7) : fullDate(selectedDate)) + '</strong>' + btn('下一周期','move:1','right','quiet') + '</div><div class="calendar-days">' + dateButtons + '</div>', '<div class="segmented">' + [['day','日'],['week','周'],['month','月']].map(([mode,label]) => '<button type="button" aria-pressed="' + (calendarMode===mode) + '" data-action="mode:' + mode + '">' + label + '</button>').join('') + '</div>') +
  panel('当天安排', selected.length ? '<ul class="rows">' + selected.map(item => '<li><span class="tile">' + icon(item.collection === 'plans' ? 'run' : 'calendar') + '</span><div class="row-text"><strong>' + escape(item.name) + '</strong><small>' + escape(item.start ? item.start + (item.end ? '–' + item.end : '') : '未指定时间') + ' · ' + escape(item.type) + '</small></div>' + (conflicts(item,selected).length ? tag('时间冲突','red') : '') + (item.collection==='plans'?btn('课次详情','open-plan:'+item.id,'','quiet'):btn(sample ? '查看' : '编辑','edit:' + item.collection + ':' + item.id,'','quiet')) + '</li>').join('') + '</ul>' : empty('calendar','这天没有安排','为训练或日常事项留出时间。'),btn('回到今天','date:' + day,'','quiet')) + '</div>';
}
function nutrition(s) {
  const today = byDate(s.food,foodDate);
  const mealRow = item => [item.name,[item.loggedAt ? new Date(item.loggedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : '',item.date,item.meal,item.grams ? num(item.grams)+' g' : '',Number.isFinite(item.kcal) ? num(item.kcal)+' kcal' : ''].filter(Boolean).join(' · '),item.timing];
  const totals = mealTotals(today);
  const macros = ['protein','carbs','fat'];
  const chart = today.length && macros.every(key=>totals[key]!==null) ? '<div class="distribution macro-chart">'+macros.map(key=>'<div><span>'+foodNames[key]+'</span><progress max="'+Math.max(1,...macros.map(k=>totals[k]))+'" value="'+totals[key]+'"></progress><strong>'+num(totals[key])+' g</strong></div>').join('')+'</div>' : '';
  const frequent = [...new Set(desc(s.food).flatMap(item=>(item.components || []).map(part=>part.name)))].slice(0,5);
  return head('FUEL LOG','运动营养','回顾每一餐和训练前后的补给。',btn('添加餐食','food-start','plus','primary')) +
  nutritionDateNav() + '<div class="split">' + panel('当日营养汇总',today.length ? nutritionStats(today)+chart : empty('food','等待第一餐','搜索食物，或按实际份量填写营养。'),'', '食物估算及包装标签汇总') +
  panel('餐食时间线',meals.map(meal=>'<section class="meal-group"><header><h3>'+meal+'</h3>'+btn('添加'+meal,'food-start:'+meal,'plus','quiet')+'</header>'+rows([...today].reverse().filter(item=>item.meal===meal),'food',mealRow,'food','尚未记录','可按实际份量添加。')+'</section>').join(''),btn('营养趋势','metric-detail:meals','','quiet')) +
  panel('常用餐食',frequent.length ? '<div class="cycle-weeks">'+frequent.map(name=>tag(name)).join('')+'</div>' : empty('food','暂无常用食物','餐食保存后可在最近吃过中重用。')) +
  panel('饮食记录历史',rows(desc(s.food.filter(item=>item.date!==foodDate)),'food',mealRow,'food','暂无往日餐食','训练前后补给会在列表里标记。')) + '</div>';
}
function recoveryPage(s) {
  return head('RECOVERY LOG','恢复日志','在训练之外，也记录身体的反馈。',btn('填写今日恢复','edit:recovery:' + (byDate(s.recovery,day).at(-1)?.id || ''),'plus','primary')) +
  panel('恢复记录',rows(desc(s.recovery),'recovery',item => [item.date,item.sleep + ' 小时睡眠 · 疲劳 ' + item.fatigue + ' / 5' + (item.note ? ' · ' + item.note : ''),item.pain ? '有疼痛反馈' : '无疼痛反馈'],'moon','还没有恢复记录','填写睡眠、疲劳和疼痛反馈，便于结合训练回顾。'));
}
function analytics(s) {
  const monthly = s.runs.filter(run=>run.date.startsWith(day.slice(0,7)) && run.date<=day);
  const series = Array.from({length:chartRange}, (_,i) => {
    const date = offset(day,i-chartRange+1);
    const runs = byDate(s.runs,date);
    return {date,distance:sum(runs,'distance'),minutes:sum(runs,'minutes'),count:runs.length};
  });
  const selected = series.find(item => item.date === chartDate);
  const runs = s.runs.filter(run => run.date >= series[0].date && run.date <= day);
  const distribution = types.map(type => [type,runs.filter(run => run.type === type).length]).filter(([,n]) => n);
  return head('PERFORMANCE ANALYTICS','数据中心','从真实训练记录里看跑量、配速和一致性。',btn('添加成绩','edit:records:','plus','primary')) + performanceCards(s) +
  '<div class="split">' + panel('跑量趋势','<div class="weekly-summary">' + metric('累计跑量',num(sum(series,'distance')),'km') + metric('综合配速',pace(sum(series,'distance'),sum(series,'minutes')),'/km') + metric('训练天数',series.filter(item=>item.count).length,'天') + metric('本月跑量',num(sum(monthly,'distance')),'km') + '</div>' + bars(series) + '<div class="chart-caption">' + (selected ? escape(fullDate(selected.date)) + ' · ' + num(selected.distance) + ' km · 配速 ' + pace(selected.distance,selected.minutes) : '点击某天查看跑量和配速。') + '</div>', '<div class="segmented">' + [1,7,30].map(n => '<button type="button" aria-pressed="' + (n===chartRange) + '" data-action="range:' + n + '">' + n + ' 天</button>').join('') + '</div>') +
  panel('训练类型',distribution.length ? '<div class="distribution">' + distribution.map(([type,n]) => '<div><span>' + type + '</span><progress max="' + runs.length + '" value="' + n + '">' + n + '</progress><strong>' + n + ' 次</strong></div>').join('') + '</div>' : empty('chart','暂无训练分布','完成记录后，可按训练类型查看次数。')) +
  panel('个人最好成绩',personalBest(s)) +
  panel('成绩历史',rows(desc(s.records),'records',item => [item.event,item.date + ' · ' + duration(item.seconds),'手动 · 未验证'],'flag','还没有成绩记录','支持常见比赛距离和自定义项目。')) + '</div>';
}
const articles = [
  ['跑步入门','配速怎么读？','配速是跑完一个单位距离所用的时间。6:00 /km 表示每公里用时 6 分钟。破风用总耗时除以总距离计算平均配速。'],
  ['专业训练','训练日志怎么记？','同一次训练可同时记录客观数据和主观强度。查看相近配速下的体感变化时，记得回顾天气、路线、睡眠和停顿等背景。'],
  ['比赛策略','如何整理比赛成绩？','保存项目、日期和完赛时间，再比较同距离的成绩。场地、天气和计时方式也会影响结果，适合单独写在备注里。'],
  ['营养与恢复','怎样回顾训练前后的补给？','用餐食日志中的训练前、训练后标签关联补给时机，再结合训练备注回顾实际感受。']
];
function academy() {
  return head('TRAINING INTELLIGENCE','知识库与训练引擎','比较国际训练资料，根据实际日志预览和调整训练周期。',btn('生成训练周期','generate','spark','primary')) + '<div class="split">' + articles.map(([category,title,body]) => '<details class="panel article"><summary>' + tag(category,'red') + '<strong>' + title + '</strong></summary><p>' + body + '</p></details>').join('') + '</div>' + evidenceLibrary();
}

const pages = { home:dashboard, run:training, calendar:schedule, food:nutrition, chart:analytics, heart:recoveryPage, book:academy, growth:growth };
function render() {
  const route = currentRoute();
  document.documentElement.dataset.theme = currentTheme;
  chrome(route);
  const banner = sample ? '<div class="notice">' + icon('spark',17) + '<span>演示模式 · 示例数据仅供体验</span>' + btn('返回我的记录','demo','','quiet') + '</div>' : '';
  main.innerHTML = banner + (storageError ? '<div class="notice" role="alert">' + escape(storageError) + '</div>' : '') + pages[route](state());
}
const textField = (name,label,required = false) => ({name,label,required,type:'text'});
const numberField = (name,label,min,max,step = 1,required = false) => ({name,label,min,max,step,required,type:'number'});
const selectField = (name,label,choices) => ({name,label,choices,type:'select'});
const dateField = {name:'date',label:'日期',type:'date',required:true};
const noteField = {name:'note',label:'备注',type:'textarea'};
const timeFields = [{name:'start',label:'开始时间',type:'time'},{name:'end',label:'结束时间',type:'time'}];
const painField = {name:'pain',label:'有疼痛反馈',type:'checkbox'};
const schemas = {
  runs: ['跑步记录',[textField('name','训练名称',true),dateField,selectField('type','训练类型',types.slice(0,9)),selectField('mode','跑步场景',runModes),numberField('distance','实际距离（km）',0.01,300,'any',true),numberField('minutes','实际耗时（分钟）',0.1,1440,'any',true),numberField('heart','平均心率（bpm）',20,250),numberField('effort','主观强度（1–10）',1,10),painField,noteField]],
  plans: ['训练计划',[textField('name','训练名称',true),dateField,selectField('type','训练类型',types),numberField('distance','计划距离（km）',0.01,300,0.01),numberField('minutes','预计时长（分钟）',1,1440),textField('pace','建议配速（每公里）'),...timeFields,{name:'completed',label:'已完成',type:'checkbox'},noteField]],
  events: ['日程事项',[textField('name','事项名称',true),dateField,selectField('type','分类',['工作','学习','生活','待办']),...timeFields,noteField]],
  food: ['餐食记录',[textField('name','食物名称',true),dateField,selectField('meal','餐别',meals),selectField('timing','补给时机',['日常','训练前','训练中','训练后']),numberField('grams','实际份量（g）',0.1,10000,0.1),numberField('kcal','热量（kcal）',0,10000,0.1),numberField('protein','蛋白质（g）',0,1000,0.1),numberField('carbs','碳水（g）',0,1000,0.1),numberField('fat','脂肪（g）',0,1000,0.1),noteField]],
  recovery: ['恢复反馈',[dateField,numberField('sleep','睡眠（小时）',0,24,0.1,true),numberField('fatigue','疲劳（1–5，5 为最高）',1,5,1,true),painField,noteField]],
  records: ['成绩记录',[selectField('event','比赛项目',distances),textField('custom','自定义项目名称'),dateField,numberField('seconds','完赛总时间（秒）',1,86400,1,true),noteField]],
  goals: ['训练目标',[numberField('weekly','周跑量目标（km）',0,300,0.1),numberField('days','每周可训练天数',1,7),textField('race','目标赛事'),textField('target','目标成绩'),{name:'raceDate',label:'比赛日期',type:'date'}]]
};
let formContext;
function field(config,item) {
  const {name,label,required,type,min,max,step,choices} = config;
  const value = escape(item[name]);
  const req = required ? ' required' : '';
  if (type === 'checkbox') return '<label class="check"><input type="checkbox" name="' + name + '"' + (item[name] ? ' checked' : '') + '>' + label + '</label>';
  const control = type === 'textarea' ? '<textarea name="' + name + '" rows="3" maxlength="500">' + value + '</textarea>' :
    type === 'select' ? '<select name="' + name + '">' + choices.map(choice => '<option' + (choice === item[name] ? ' selected' : '') + '>' + choice + '</option>').join('') + '</select>' :
    '<input name="' + name + '" type="' + type + '" value="' + value + '"' + req + (type === 'number' ? ' min="' + min + '" max="' + max + '" step="' + step + '"' : '') + (type === 'text' ? ' maxlength="100"' : '') + '>';
  return '<label class="' + (type === 'textarea' ? 'wide' : '') + '"><span>' + label + '</span>' + control + '</label>';
}
function modal(title, body, variant = '') {
  editor.dataset.variant = variant;
  if (!editor.open) opener = document.activeElement;
  editor.innerHTML = '<div class="dialog-head"><h2 id="dialog-title">' + title + '</h2><button type="button" class="icon-button" data-action="close" aria-label="关闭">' + icon('close') + '</button></div>' + body;
  if (!editor.open) editor.showModal();
}
function openEditor(collection,id = '',defaults = {}) {
  const schema = schemas[collection];
  if (!schema) return;
  const item = collection === 'goals' ? state().goals : state()[collection].find(entry => entry.id === id);
  if (sample && !item) {
    modal('演示模式','<p>示例记录可供浏览。返回个人模式即可添加自己的数据。</p>' + btn('返回我的记录','demo','','primary'));
    return;
  }
  const [title, allFields] = schema;
  const fields = collection === 'food' && item?.components ? allFields.filter(config=>['name','date','meal','timing','note'].includes(config.name)) : allFields;
  formContext = {collection,id,defaults,fields};
  const values = item ? {...item} : {date:currentRoute() === 'calendar' ? selectedDate : day, ...defaults};
  if (collection === 'records' && item && !distances.includes(item.event)) {
    values.event = '自定义';
    values.custom = item.event;
  }
  modal(title,'<form id="entry-form"><fieldset class="fields"' + (sample ? ' disabled' : '') + '>' + fields.map(config => field(config,values)).join('') + '</fieldset>' + (item?.engineVersion === cycleVersion ? sessionExplanation(item) : '') + (collection === 'runs' ? '<p id="entry-pace"></p>' + (!id ? '<label class="duplicate-confirm" hidden><input type="checkbox" name="differentRun"> 我已核对，这是不同的一次跑步</label>' : '') : '') + '<p class="form-error" role="alert" hidden></p><div class="dialog-actions">' +
    (!sample && id ? btn('删除记录','ask-delete','','danger') : '') + btn(sample ? '关闭' : '取消','close','','quiet') + (!sample ? '<button class="btn primary" type="submit">保存记录</button>' : '') + '</div></form>');
}
function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; },3500);
}
function commit(change) {
  try {
    const next = readData(localStorage.getItem(key));
    change(next);
    localStorage.setItem(key,JSON.stringify(next));
    data = next;
    storageError = '';
    return true;
  } catch {
    notify('保存失败。请检查浏览器的存储设置后重试。');
    return false;
  }
}
function formError(message) {
  const target = editor.querySelector('.form-error');
  target.textContent = message;
  target.hidden = false;
}
editor.addEventListener('submit', event => {
  if (event.target.id !== 'entry-form' || sample) return;
  event.preventDefault();
  const { collection,id,defaults,fields } = formContext;
  const form = new FormData(event.target);
  const item = {};
  for (const config of fields) {
    const value = form.get(config.name)?.trim() || '';
    if (config.required && !value) return formError('请填写' + config.label + '。');
    item[config.name] = config.type === 'checkbox' ? form.has(config.name) : config.type === 'number' ? (value ? Number(value) : null) : value;
  }
  if ((item.start || item.end) && (!item.start || !item.end || item.end <= item.start)) return formError('请填写有效的起止时间，结束时间需晚于开始。');
  if (collection === 'records' && item.event === '自定义') {
    if (!item.custom) return formError('请填写自定义项目名称。');
    item.event = item.custom;
  }
  delete item.custom;
  if (collection === 'runs' && !id) {
    Object.assign(item,defaults.capture || {source:'manual'});
    const duplicate = likelyDuplicate(data.runs,item);
    if (duplicate && (item.fileHash === duplicate.fileHash && item.fileHash || !form.has('differentRun'))) {
      const error = editor.querySelector('.duplicate-confirm');
      if (error) error.hidden = Boolean(item.fileHash && item.fileHash === duplicate.fileHash);
      return formError('已有相似跑步记录：' + duplicate.name + '。请核对后再保存。');
    }
  }
  const saved = commit(next => {
    if (collection === 'goals') {
      next.goals = item;
      return;
    }
    const index = next[collection].findIndex(entry => entry.id === id);
    if (id && index === -1) throw new Error('Record removed');
    item.id = id || crypto.randomUUID();
    if (collection === 'runs' && !id && next.runs.some(run => item.fileHash && run.fileHash === item.fileHash)) throw new Error('Duplicate file');
    if (index >= 0) {
      const original = next[collection][index];
      if (collection === 'plans' && original.engineVersion === cycleVersion) {
        auditCycle(next,original,'手动编辑',item);
      }
      next[collection][index] = {...original,...item,...(collection === 'plans' && original.engineVersion === cycleVersion ? {manual:true} : {})};
    }
    else next[collection].push(item);
    if (defaults.planId) {
      const plan = next.plans.find(entry => entry.id === defaults.planId);
      if (plan) {
        plan.completed = true;
        if (plan.engineVersion === cycleVersion) auditCycle(next,plan,'已完成');
      }
    }
  });
  if (!saved) return;
  if (collection !== 'runs' || id) editor.close();
  if (defaults.timed) clearWorkout();
  if (currentRoute() === 'calendar' && item.date) selectedDate = item.date;
  render();
  notify('已保存' + (defaults.planId ? '跑步记录，训练计划已完成' : ''));
  if (collection === 'runs' && !id) showRun([item.id]);
});

editor.addEventListener('close', () => {
  clearInterval(clockTimer);
  if (opener?.isConnected) opener.focus();
  else main.focus();
});
function leaveSample() {
  sample = !sample;
  chartDate = '';
  editor.close();
  location.hash = href(currentRoute());
}
function moveDate(direction) {
  if (calendarMode === 'month') {
    const first = new Date(selectedDate.slice(0,7) + '-01T12:00:00');
    first.setMonth(first.getMonth() + direction);
    selectedDate = dateKey(first);
  } else selectedDate = offset(selectedDate, direction * (calendarMode === 'week' ? 7 : 1));
}
const actions = {
  generate: () => openGenerator(),
  'generate-specialty': ([index]) => openGenerator(Object.keys(specialties)[Number(index)]),
  'show-specialty': showSpecialty,
  'plan-filter': ([filter]) => {planFilter=filter;render();},
  'home-tab': ([tab]) => {homeTab=tab;render();},
  'open-day': ([date]) => {selectedDate=date;calendarMode='day';location.hash=href('calendar');},
  'open-plan': showWorkout,
  'nutrition-date': ([direction]) => {foodDate=offset(foodDate,Number(direction));render();},
  'metric-detail': ([kind]) => {detailPeriod=7;showPerformance(kind);},
  'metric-period': ([n]) => {detailPeriod=Number(n);showPerformance(activeDetail);},
  'rank-tab': ([tab]) => {rankingTab=tab;render();},
  theme: setTheme,
  'review-cycle': showCycleReview,
  'save-draft': saveDraft,
  edit: ([collection,id]) => openEditor(collection,id),
  demo: leaveSample,
  close: () => editor.close(),
  profile: () => openEditor('goals'),
  menu: () => modal('更多','<div class="menu-links">' + ['heart','book','growth'].map(route => link(routes[route][1],route)).join('') + btn('训练目标','profile','flag') + '</div>'),
  notifications: () => {
    const items = timeline(state(),day);
    const count = items.filter(item => conflicts(item,items).length).length;
    modal('通知',empty('bell', count ? '今日有 ' + count + ' 项安排发生时间冲突' : '目前没有新通知', count ? '在日程页面查看有冲突的事项。' : '这里会显示今天的日程冲突。') + link('查看日程','calendar'));
  },
  'ask-delete': () => modal('删除记录？','<p>这条记录会从本地日志和相关统计中移除。</p><div class="dialog-actions">' + btn('取消','delete-back','','quiet') + btn('确认删除','delete','','danger') + '</div>'),
  'delete-back': () => openEditor(formContext.collection,formContext.id),
  delete: () => {
    const {collection,id} = formContext;
    if (sample || !id || !commit(next => {
      const original = next[collection].find(item => item.id === id);
      if (collection === 'plans' && original?.engineVersion === cycleVersion) auditCycle(next,original,'已删除');
      next[collection] = next[collection].filter(item => item.id !== id);
    })) return;
    editor.close();
    render();
    notify('记录已删除');
  },
  date: ([date]) => {selectedDate = date; render();},
  mode: ([mode]) => {calendarMode = mode; render();},
  move: ([delta]) => {moveDate(Number(delta)); render();},
  range: ([range]) => {chartRange = Number(range); chartDate = ''; render();},
  chart: ([date]) => {chartDate = date; render();},
  start: ([id]) => runOptions(id),
  timer: timerView,
  'run-options': () => runOptions(),
  'run-manual': () => openEditor('runs','',{name:pendingPlan?.name,type:types.slice(0,9).includes(pendingPlan?.type)?pendingPlan.type:types[0],planId:pendingPlan?.id}),
  'run-gps': () => startWorkout('gps'),
  'run-timer': () => startWorkout('timer'),
  'run-detail': showRun,
  'run-import': importDialog,
  'run-pause': toggleWorkout,
  'cancel-timer': discardWorkout,
  finish: finishWorkout,
  devices: showDevices,
  'food-start': startMeal,
  'food-tab': ([tab]) => mealTab(tab),
  'food-custom': () => showCustomFood(),
  'food-pick': pickFood,
  'food-favorite': favoriteFood,
  'food-remove': removeFood,
  'meal-detail': showMeal,
  'vision-analyze': analyzeMealPhoto,
  'vision-pick': args => pickFood(args,true),
  'barcode-photo': () => editor.querySelector('#barcode-file')?.click()
};

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) {
    const [action,...args] = button.dataset.action.split(':');
    actions[action]?.(args);
    if (['chart','date','range','mode','move','home-tab','plan-filter','nutrition-date','metric-period','rank-tab','theme'].includes(action)) {
      document.querySelector('[data-action="' + button.dataset.action + '"]')?.focus({preventScroll:true});
    }
  } else if (editor.open && event.target.closest('a[href^="#"]')) editor.close();
});
window.addEventListener('hashchange', () => {
  if (editor.open) editor.close();
  sample = location.hash.includes('demo=1');
  render();
  main.focus();
  window.scrollTo(0,0);
});
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) {load(); render();}
});
function refreshDay() {
  const now = dateKey();
  if (now === day) return;
  if (selectedDate === day) selectedDate = now;
  if (foodDate === day) foodDate = now;
  day = now;
  render();
}
document.addEventListener('visibilitychange', refreshDay);
setInterval(refreshDay,60000);
function networkState() {
  document.querySelector('#offline').hidden = navigator.onLine;
}
window.addEventListener('offline',networkState);
window.addEventListener('online',networkState);
networkState();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});


function evidenceLink(source) {
  return '<a class="text-link" href="' + source.url + '" target="_blank" rel="noopener">查看原始来源 ' + icon('arrow',15) + '</a>';
}
function sourcesList(ids) {
  return '<ul class="reference-list">' + evidence.filter(source => ids.includes(source.id)).map(source =>
    '<li><a href="' + source.url + '" target="_blank" rel="noopener">' + escape(source.authors) + ' · ' + (source.year ?? '未标注年份') + ' · ' + source.level + '</a></li>').join('') + '</ul>';
}
function evidenceLibrary() {
  const methodology = [
    ['先建立有氧基础','Lydiard 的阶段思路适用于比较中长跑周期组织。历史精英跑量不用于产品处方。',['lydiard']],
    ['按目的区分强度','Daniels 按训练目的组织强度和赛季。配速框架不能单凭一次比赛成绩推导负荷。',['daniels']],
    ['受控阈值','挪威访谈反映高水平教练如何管理强度。双阈值或乳酸监测要求较高，本版不自动安排。',['norway']],
    ['马拉松专项方法的书目','世界田联档案可核验 Arcelli 与 Canova 的出版记录。当前证据不足以比较其剂量或训练效果。',['canova']],
    ['马拉松周期','Pfitzinger 面向有经验的长距离跑者。按赛事组织周次的概念可用于比较，付费计划和跑量档位不进入生成器。',['pfitzinger']],
    ['反馈驱动','Hudson 的教练框架与产品的反馈复核有共同关注点。其书目条目不是该方法效果的独立研究。',['hudson']],
    ['中距离与越野','场地速度、动作与地形控制是不同研究和教练情境。精英课表不外推至大众。',['middle','japan','usatf','kenya','ethiopia']],
    ['青年发展','成熟度、训练环境和长期参与比套用成人专项更重要。可参考国际共识与加拿大教练教育路径。',['ioc-youth','youth-running','canada']]
  ];
  return '<section class="stack evidence-grid"><h2>训练体系比较</h2><div class="split">' + methodology.map(([title,copy,ids]) =>
    '<details class="panel article"><summary><strong>' + title + '</strong></summary><p>' + copy + '</p>' + sourcesList(ids) + '</details>').join('') +
    '</div><h2>全球资料索引</h2><p class="library-note">证据标签描述来源性质。研究质量与适用人群需逐条阅读。</p><div class="split">' +
    evidence.map(source => '<details class="panel article"><summary>' + tag(source.level + ' · ' + source.kind,'red') +
      '<strong>' + escape(source.title) + '</strong><small>' + escape(source.region + ' · ' + (source.year ?? '年份未标注')) + '</small></summary>' +
      '<div class="evidence-copy"><p>' + escape(source.authors + ' · ' + source.organization + ' · ' + source.language) + '</p>' +
      '<p><strong>适用对象</strong> ' + escape(source.population + ' / ' + source.events) + '</p>' +
      '<p><strong>训练原则</strong> ' + escape(source.principle) + '</p><p><strong>产品应用</strong> ' + escape(source.application) + '</p>' +
      '<p><strong>局限</strong> ' + escape(source.limits) + '</p><p><strong>使用权限</strong> ' + escape(source.license) + '</p>' +
      '<p><strong>核验日期</strong> ' + source.reviewed + ' · ' + source.id + ' · ' + evidenceLevels[source.level] + '</p>' + evidenceLink(source) + '</div></details>').join('') + '</div></section>';
}
function sessionExplanation(plan) {
  const summary = plan.manual ? '<p>以下依据来自原始草案。本次训练随后已手动调整。</p>' : '';
  return '<details class="plan-explanation"><summary>为什么安排这节训练？</summary>' + summary +
    '<p><strong>训练目的</strong> ' + escape(plan.objective) + ' · ' + escape(plan.phase) + '</p>' +
    '<p>' + escape(plan.rationale) + '</p><p><strong>训练结构</strong> ' + escape(plan.structure) + '</p>' +
    '<p><strong>强度与调整</strong> ' + escape(plan.intensity + ' ' + plan.adjustment) + '</p>' + sourcesList(plan.sources || []) + '</details>';
}
function cycleOverview(s) {
  const cycle = s.cycles.at(-1);
  if (!cycle) return panel('训练周期',empty('spark','生成你的基础训练周期','按专项、训练时间和近期记录预览 1–4 周课表。'),link('查看研究','book'));
  const current = cycle.weeks.find(item => item.start <= day && day <= item.end);
  const planned = s.plans.filter(item => item.cycleId === cycle.id);
  const completed = planned.filter(item => item.completed).length;
  return '<div class="cycle-overview">' + panel('当前训练周期',
    '<div class="weekly-summary">' + metric('目标项目',cycle.event) + metric('当前阶段',current?.phase || '周期结束') + metric('完成情况',completed + ' / ' + planned.length) + '</div>' +
    '<p class="library-note">' + escape(cycle.weeks[0].start + ' 至 ' + cycle.weeks.at(-1).end + (cycle.raceDate ? ' · 比赛 ' + cycle.raceDate : '')) + '</p>' +
    '<div class="cycle-weeks">' + cycle.weeks.map((week,index) => tag('第 ' + (index+1) + ' 周 · ' + week.phase + ' · ' + week.count + ' 项')).join('') + '</div>',
    btn('复核与调整','review-cycle','settings','quiet')) + '</div>';
}
function showCycleReview() {
  const s = state();
  const review = reviewCycle(s,day);
  const history = s.cycleAudit.slice(-5).reverse();
  modal('训练复核与调整','<p>调整建议根据当前记录更新。选择一项训练可以手动修改日期、时长和完成状态。</p><ul class="draft-reasons">' +
    (review.reasons.length ? review.reasons : ['现有记录未触发额外调整提示。']).map(reason => '<li>' + escape(reason) + '</li>').join('') + '</ul>' +
    rows(review.future,'plans',planRow,'run','暂无待完成训练','可生成新的训练周期。') +
    (history.length ? '<h3>最近变更</h3><ul class="draft-reasons">' + history.map(entry => '<li>' + escape(entry.at.slice(0,10) + ' · ' + entry.action + ' · ' + entry.name) + '</li>').join('') + '</ul>' : ''));
}
function auditCycle(data, plan, action, change) {
  const load = item => ({date:item.date,distance:item.distance,minutes:item.minutes,type:item.type,completed:item.completed});
  data.cycleAudit.push({at:new Date().toISOString(),cycleId:plan.cycleId,planId:plan.id,action,name:plan.name,before:load(plan),after:change ? load(change) : null});
}
let proposed;
const levels = ['刚开始或重新起跑','近期规律跑步'];
const riskOptions = ['请选择','目前没有这些情况','有疼痛、功能受限或仍在康复'];
function openGenerator(eventName = '') {
  const s = state();
  const settings = proposed?.profile || s.cycleProfile;
  const available = s.goals.days || 3;
  const values = {age:'未提供',days:available,minutes:30,weeks:4,...settings,
    event:eventName || settings?.event || '跑步入门',raceDate:settings?.raceDate || s.goals.raceDate, level:settings?.level === 'regular' ? levels[1] : levels[0]};
  const fields = [
    selectField('event','目标项目',Object.keys(specialties)),selectField('age','年龄段',ageGroups),
    selectField('level','跑步基础',levels),numberField('days','每周可训练天数',1,7,1,true),
    numberField('minutes','每次可用时间（分钟）',5,120,1,true),numberField('weeks','周期周数',1,4,1,true),
    {name:'raceDate',label:'比赛日期（可选）',type:'date'},selectField('risk','本次疼痛或康复确认',riskOptions)
  ];
  modal('生成训练周期','<form id="engine-form"><div class="fields">' + fields.map(config => field(config,values)).join('') + '</div>' +
    '<p>只将本次健康选项用于当前安全检查，不保存该选项、不发送给外部服务。近期跑量和频率从日志计算。</p>' +
    '<div class="dialog-actions"><button class="btn primary" type="submit">查看草案</button></div></form>');
}
editor.addEventListener('submit', event => {
  if (event.target.id !== 'engine-form') return;
  event.preventDefault();
  const form = new FormData(event.target);
  const profile = {
    event:form.get('event'), age:form.get('age'), level:form.get('level') === levels[1] ? 'regular' : 'beginner',
    days:Number(form.get('days')),minutes:Number(form.get('minutes')),weeks:Number(form.get('weeks')),raceDate:form.get('raceDate'),
    risk:form.get('risk') === riskOptions[1] ? 'clear' : form.get('risk') === riskOptions[2] ? 'reported' : 'unknown'
  };
  proposed = draftCycle(state(),day,profile);
  modal('训练周期草案','<ul class="draft-reasons">' + proposed.reasons.map(reason => '<li>' + escape(reason) + '</li>').join('') + '</ul>' +
    proposed.weeks.map((week,index) => '<section class="draft-week"><h3>第 ' + (index+1) + ' 周 · ' + week.phase + '</h3><small>' + week.start + ' 至 ' + week.end +
      ' · 新增 ' + week.count + ' 项</small>' + proposed.plans.filter(plan => plan.date >= week.start && plan.date <= week.end).map(plan =>
      '<div class="draft-session"><strong>' + escape(plan.name) + '</strong><small>' + plan.date + ' · 最多 ' + plan.minutes + ' 分钟' + (plan.distance ? ' / ' + plan.distance + ' km' : '') + '</small>' + sessionExplanation(plan) + '</div>').join('') + '</section>').join('') +
    sourcesList(proposed.sources) + '<div class="dialog-actions">' + btn('修改设置','generate','','quiet') +
    (sample ? btn('返回我的记录','demo') : proposed.plans.length ? btn('确认加入日程','save-draft','calendar','primary') : btn('关闭','close')) + '</div>');
});
function saveDraft() {
  if (sample || !proposed?.plans.length) return;
  let changed = false;
  const saved = commit(next => {
    const latest = draftCycle(next,dateKey(),proposed.profile);
    if (JSON.stringify(latest) !== JSON.stringify(proposed)) {
      changed = true;
      throw new Error('Draft changed');
    }
    const id = crypto.randomUUID();
    const {risk,...profile} = proposed.profile;
    next.cycleProfile = profile;
    next.cycles.push({id,event:profile.event,raceDate:profile.raceDate || next.goals.raceDate,version:proposed.version,weeks:proposed.weeks,sources:proposed.sources});
    next.plans.push(...proposed.plans.map(plan => ({...plan,id:crypto.randomUUID(),cycleId:id})));
    next.cycleAudit.push({at:new Date().toISOString(),cycleId:id,action:'创建周期',name:profile.event});
  });
  if (changed) {
    notify('日志或日程有变化，请重新生成。');
    openGenerator();
  }
  if (!saved) return;
  const count = proposed.plans.length;
  proposed = undefined;
  editor.close();
  if (currentRoute() === 'run') render();
  else location.hash = href('run');
  notify('已加入 ' + count + ' 项训练。可在日程中调整。');
}

const workoutKey = 'breakwind.run.draft';
let watchId, gpsStatus = '', pendingPlan, statsCache;
function storeWorkout() {
  try { sessionStorage.setItem(workoutKey,JSON.stringify({...activeWorkout,elapsed:workoutElapsed(),anchor:null})); }
  catch { gpsStatus = '暂时无法保留中断草稿，请在关闭页面前保存。'; }
}
function restoreWorkout() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(workoutKey));
    if (saved?.started && Array.isArray(saved.points)) activeWorkout = saved;
  } catch { /* A malformed draft is ignored. */ }
}
function workoutElapsed() {
  return activeWorkout.elapsed + (activeWorkout.anchor ? Date.now()-activeWorkout.anchor : 0);
}
function runOptions(id) {
  if (sample) return openEditor('runs');
  if (activeWorkout) return timerView();
  pendingPlan = data.plans.find(plan=>plan.id===id);
  modal('记录跑步','<div class="menu-links">' +
    btn('手机 GPS · 前台记录','run-gps','play','primary') + btn('开始手动计时','run-timer','clock') +
    btn('手动填写','run-manual','plus') + btn('导入 FIT / GPX / TCX','run-import','flag') +
    btn('设备与同步','devices','settings') + '</div><p class="help-copy">网页 GPS 需要定位授权和前台页面。切到后台或锁屏时会暂停。</p>');
}
function startWorkout(mode) {
  if (sample || activeWorkout) return;
  if (mode === 'gps' && (!navigator.geolocation || !window.isSecureContext)) {
    modal('定位不可用','<p>请使用 HTTPS 或本机安全地址开启定位。也可以手动计时、填写记录或导入文件。</p>'+btn('开始手动计时','run-timer','clock'));
    return;
  }
  activeWorkout = {mode,started:Date.now(),anchor:Date.now(),elapsed:0,segment:0,points:[],plan:pendingPlan};
  gpsStatus = mode === 'gps' ? '正在获取定位…' : '';
  if (mode === 'gps') beginWatch();
  storeWorkout();
  render();
  timerView();
}
function beginWatch() {
  watchId = navigator.geolocation.watchPosition(position => {
    if (!activeWorkout?.anchor) return;
    gpsStatus = '定位精度约 '+Math.round(position.coords.accuracy)+' m';
    if (position.coords.accuracy > 30) gpsStatus += ' · 等待更稳定的信号';
    if (addFix(activeWorkout.points,position.coords,position.timestamp,activeWorkout.segment)) {
      statsCache = null;
      storeWorkout();
      if (activeWorkout.points.length >= 12000) pauseWorkout('已达到单次 GPS 采样上限，请结束并保存。');
    }
  },error => {
    if (!activeWorkout?.anchor) return;
    if (error.code === 1) {
      pauseWorkout('定位权限被拒绝。可在浏览器设置中授权后继续，或改用手动记录。');
      if (editor.querySelector('#elapsed')) timerView();
    }
    else gpsStatus = '暂未获得 GPS 信号。信号恢复后继续采样，缺口不连线。';
  },{enableHighAccuracy:true,maximumAge:0,timeout:12000});
}
function endWatch() {
  if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
  watchId = undefined;
}
function pauseWorkout(message) {
  if (!activeWorkout?.anchor) return;
  activeWorkout.elapsed = workoutElapsed();
  activeWorkout.anchor = null;
  gpsStatus = message;
  endWatch();
  storeWorkout();
}
function toggleWorkout() {
  if (!activeWorkout) return;
  if (activeWorkout.anchor) pauseWorkout('已暂停');
  else {
    if (activeWorkout.points.length >= 12000) return notify('已达到采样上限，请保存本次跑步。');
    activeWorkout.anchor = Date.now();
    activeWorkout.segment++;
    if (activeWorkout.mode === 'gps') {
      gpsStatus = '正在重新获取定位…';
      beginWatch();
    }
    storeWorkout();
  }
  timerView();
}
function clearWorkout() {
  endWatch();
  clearInterval(clockTimer);
  statsCache = null;
  activeWorkout = undefined;
  try { sessionStorage.removeItem(workoutKey); } catch { /* Storage may be disabled. */ }
}
function discardWorkout() {
  clearWorkout();
  editor.close();
  render();
}
function timerView() {
  if (!activeWorkout) return;
  const gps = activeWorkout.mode === 'gps';
  modal(gps?'手机 GPS · 前台跑步':'手动计时','<div class="timer"><span>ACTIVE TIME</span><strong id="elapsed">00:00</strong></div>' +
    (gps ? '<div id="gps-metrics"></div><p id="gps-status" role="status"></p><p>保持页面在前台。路线只存于当前浏览器。</p>' : '<p>结束后填写实际距离与训练反馈。</p>') +
    '<div class="dialog-actions">' + btn('放弃草稿','cancel-timer','','quiet') + btn(activeWorkout.anchor?'暂停':'继续','run-pause','clock') + btn('结束并填写','finish','flag','primary') + '</div>','live');
  const tick = () => {
    const target = editor.querySelector('#elapsed');
    if (!target || !activeWorkout) return;
    target.textContent = duration(Math.floor(workoutElapsed()/1000));
    if (!gps) return;
    const stats = statsCache ||= analyzeTrack(activeWorkout.points);
    const speed = stats.series.at(-1)?.speed;
    const status = editor.querySelector('#gps-status');
    const message = gpsStatus || '草稿已恢复，点击继续以开启定位。';
    if (status.textContent !== message) status.textContent = message;
    const live = speed && activeWorkout.anchor && Date.now()-(activeWorkout.points.at(-1)?.t||0)<15000;
    editor.querySelector('#gps-metrics').innerHTML = '<div class="mini-grid">' +
      metric('距离',num(stats.distance/1000),'km') + metric('平均配速',pace(stats.distance/1000,workoutElapsed()/60000),'/km') +
      metric('当前配速',live?duration(Math.round(speed)):'—','/km') + metric('累计爬升',stats.climb === null?'—':num(stats.climb),'m') + '</div>' +
      (stats.splits.length ? '<p>最近完整公里 · '+duration(Math.round(stats.splits.at(-1)))+'</p>' : '');
  };
  clearInterval(clockTimer);
  tick();
  clockTimer = setInterval(tick,500);
}
function finishWorkout() {
  if (!activeWorkout) return;
  pauseWorkout('已结束计时');
  clearInterval(clockTimer);
  const {plan,started,points,mode} = activeWorkout;
  const stats = analyzeTrack(points);
  openEditor('runs','',{name:plan?.name || '跑步训练',type:types.slice(0,9).includes(plan?.type)?plan.type:types[0],
    date:dateKey(new Date(started)),minutes:Math.max(0.1,Math.round(workoutElapsed()/600)/100),
    distance:stats.distance >= 10 ? Math.round(stats.distance/10)/100 : '',planId:plan?.id,timed:true,
    capture:{startedAt:started,source:mode==='gps' && stats.distance>=10?'gps':'timer',points:mode==='gps' && stats.distance>=10?points:[]}});
}
document.addEventListener('visibilitychange',()=> {
  if (!document.hidden || !activeWorkout?.anchor) return;
  pauseWorkout('页面离开前台，计时与采样已暂停。');
  if (editor.querySelector('#elapsed')) timerView();
});
editor.addEventListener('input',event=>{
  const form = event.target.closest('#entry-form');
  const target = form?.querySelector('#entry-pace');
  if (target) target.textContent = '平均配速 · '+pace(Number(form.elements.distance.value),Number(form.elements.minutes.value))+' /km';
});

function showDevices() {
  const recent = state().runs.filter(run=>run.importedAt).sort((a,b)=>b.importedAt-a.importedAt)[0];
  modal('设备与同步','<div class="device-list">' + [
    ['Apple Watch / Apple Health','需要 iOS 原生 HealthKit','运动、路线和心率分别需要授权。'],
    ['Android / Health Connect','需要 Android 原生接入','运动及健康数据需用户授权，其他应用创建的路线可能需要单次确认。'],
    ['COROS','未连接 · 支持文件导入','可在 COROS 应用导出 FIT 或 GPX，再手动导入。'],
    ['Garmin','未连接 · 支持文件导入','直接同步需要获批的 Garmin Connect 开发者接入。']
  ].map(([title,status,scope])=>'<div><strong>'+title+'</strong><small>'+status+'</small><p>'+scope+'</p></div>').join('') +
    '</div><p>当前网页没有设备授权或自动同步。最近文件导入：'+(recent?.importedAt?escape(new Date(recent.importedAt).toLocaleString('zh-CN')):'暂无')+'。</p>' +
    '<p id="device-error" role="status">'+escape(lastImportError)+'</p>'+btn('手动导入运动文件','run-import','flag','primary'));
}
let lastImportError = '';
function importDialog() {
  if (sample) return openEditor('runs');
  modal('导入运动文件','<form id="import-form"><div class="fields"><label class="wide">运动文件<input type="file" name="activity" accept=".fit,.gpx,.tcx" required></label></div><p class="help-copy">文件在当前浏览器解析。GPX 只表示轨迹，请确认该文件来自一次跑步。</p><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button class="btn primary">解析文件</button></div></form>');
}
editor.addEventListener('submit',async event=>{
  if (event.target.id!=='import-form' || sample) return;
  event.preventDefault();
  const form=event.target;
  const file=form.elements.activity.files[0];
  form.querySelector('button').disabled=true;
  try {
    const record=await importRun(file);
    if (!form.isConnected || !editor.open) return;
    const {points,fileHash,startedAt,source,climb,...values}=record;
    lastImportError='';
    openEditor('runs','',{...values,capture:{points,fileHash,startedAt,source,climb,importedAt:Date.now()}});
  } catch (error) {
    lastImportError=error.message;
    if (form.isConnected && editor.open) formError(error.message);
  } finally { if (form.isConnected) form.querySelector('button').disabled=false; }
});
function svgLine(points,value,label,invert=false) {
  const values=points.map(value).filter(Number.isFinite);
  if (values.length<2) return '';
  const low=Math.min(...values), high=Math.max(...values);
  const shape=points.map((point,index)=>{
    const y=value(point);
    if (!Number.isFinite(y)) return '';
    const normalized=(y-low)/(high-low || 1);
    return (index===0 || !Number.isFinite(value(points[index-1])) ? 'M' : 'L')+
      (10+index*300/Math.max(1,points.length-1)).toFixed(1)+' '+(high===low?48:invert?10+normalized*74:84-normalized*74).toFixed(1);
  }).join(' ');
  return '<div class="report-chart"><h3>'+label+'</h3><small>'+num(low)+' – '+num(high)+'</small><svg role="img" aria-label="'+label+'" viewBox="0 0 320 95"><path d="M10 84H310 M10 47H310 M10 10H310" class="chart-grid"/><path d="'+shape+'" class="chart-line"/></svg></div>';
}
function routeMap(points) {
  const valid=points.filter(coordinate);
  if (valid.length<2) return empty('flag','暂无可绘制路线','可通过 GPS 或运动文件添加轨迹。');
  const origin=valid[0];
  const x=p=>(((p.lon-origin.lon+540)%360)-180)*Math.cos(origin.lat*Math.PI/180);
  const left=Math.min(...valid.map(x)),right=Math.max(...valid.map(x));
  const top=Math.max(...valid.map(p=>p.lat)), bottom=Math.min(...valid.map(p=>p.lat));
  const scale=Math.min(282/Math.max(1e-9,right-left),142/Math.max(1e-9,top-bottom));
  const project=p=>((x(p)-(left+right)/2)*scale+160).toFixed(1)+' '+(((top+bottom)/2-p.lat)*scale+90).toFixed(1);
  const d=points.map((p,i)=>coordinate(p)?(!coordinate(points[i-1])||p.break||points[i-1].segment!==p.segment?'M':'L')+project(p):'').join(' ');
  return '<div class="route-map"><svg viewBox="0 0 320 180" role="img" aria-label="跑步路线示意图"><path class="chart-line" d="'+d+'"/><path class="route-start" d="M'+project(valid[0])+'h0"/><path class="route-end" d="M'+project(valid.at(-1))+'h0"/></svg><small>路线示意 · 无地图底图</small></div>';
}
function showRun([id]) {
  const run=state().runs.find(item=>item.id===id);
  if (!run) return;
  const points=Array.isArray(run.points)?run.points:[];
  const report=analyzeTrack(points);
  const chartPoints=report.series.filter((_,index)=>index%Math.max(1,Math.ceil(report.series.length/350))===0);
  const mean=key=>{
    const values=report.series.map(item=>item[key]).filter(value=>Number.isFinite(value)&&value>0);
    return values.length?values.reduce((total,value)=>total+value,0)/values.length:null;
  };
  const heart=run.heart??mean('heart');
  const cadence=mean('cadence');
  const stride=cadence && run.distance && run.minutes ? run.distance*1000/run.minutes/cadence : null;
  const climb=run.climb??report.climb;
  modal('运动报告','<div class="report-title"><h3>'+escape(run.name)+'</h3>'+tag(sourceNames[run.source]||'手动记录','red')+
    '<p>'+escape([run.date,run.mode||'场景未记录',run.type].join(' · '))+'</p></div><div class="mini-grid">'+
    metric('距离',num(run.distance),'km')+metric('耗时',duration(Math.round(run.minutes*60)))+metric('平均配速',pace(run.distance,run.minutes),'/km')+
    metric('主观强度',run.effort??'—','/10')+metric('平均心率',heart?Math.round(heart):'—','bpm')+metric('平均步频',cadence?Math.round(cadence):'—','步/分钟')+
    metric('估算步幅',stride?stride.toFixed(2):'—','m/步')+metric('累计爬升',climb===null?'—':num(climb),'m')+'</div>'+
    '<h3 class="report-section">GPS 路线</h3>'+routeMap(points)+
    svgLine(chartPoints,p=>p.speed && p.speed<1800?p.speed/60:null,'配速趋势（分钟/km）',true)+svgLine(chartPoints,p=>p.heart,'心率趋势（bpm）')+
    svgLine(chartPoints,p=>p.cadence,'步频趋势（步/分钟）')+svgLine(chartPoints,p=>p.alt,'海拔趋势（m）')+
    '<h3 class="report-section">公里分段</h3>'+(report.splits.length?'<ol class="split-list">'+report.splits.map((seconds,i)=>'<li><span>'+ (i+1)+' km</span><strong>'+duration(Math.round(seconds))+' /km</strong></li>').join('')+'</ol>':'<p>没有可计算完整公里分段的轨迹采样。</p>')+
    '<form id="energy-form" class="fields"><label>体重（kg，仅用于本次估算）<input type="number" name="weight" min="20" max="350" step="0.1" required></label><button class="btn secondary">估算总消耗</button></form><p id="energy-result" role="status"></p>'+
    '<p>以速度匹配成人活动汇编的 MET 档位，再按 MET × 3.5 × 体重 ÷ 200 × 分钟估算。包含静息消耗，未校正个人代谢、坡度或地形。<a class="text-link" href="https://pacompendium.com/running/" target="_blank" rel="noopener">MET 来源</a></p>'+
    (run.note?'<p>'+escape(run.note)+'</p>':'')+'<div class="dialog-actions">'+btn(sample?'查看记录':'编辑记录','edit:runs:'+run.id,'settings')+'</div>');
  installHeartZones(points);
  editor.querySelector('#energy-form').addEventListener('submit',event=>{
    event.preventDefault();
    const estimate=energyEstimate(run.distance,run.minutes,Number(event.target.elements.weight.value));
    editor.querySelector('#energy-result').textContent=estimate?'约 '+estimate.kcal+' kcal · '+estimate.met+' MET':'当前速度超出此估算覆盖范围。';
  });
}
const foodNames = {kcal:'能量',protein:'蛋白质',carbs:'碳水',fat:'脂肪'};
let mealDraft, selectedFood;
function allFoods(s=state()) {
  return [...catalog,...s.foodLibrary];
}
function startMeal([requestedMeal] = []) {
  if (sample) return openEditor('food');
  mealDraft={date:currentRoute()==='food'?foodDate:day,meal:meals.includes(requestedMeal)?requestedMeal:meals[new Date().getHours()<10?0:new Date().getHours()<15?1:2],timing:'日常',items:[],query:'',tab:'search'};
  mealTab('search');
}
function keepMealFields() {
  const form=editor.querySelector('#meal-form');
  if (!form) return;
  for (const key of ['date','meal','timing','name']) mealDraft[key]=form.elements[key].value;
}
function mealTab(tab) {
  if (!mealDraft || sample) return;
  keepMealFields();
  mealDraft.tab=tab;
  const tabs=[['search','搜索食物'],['recent','最近吃过'],['favorite','我的收藏'],['barcode','条形码'],['photo','照片辅助']];
  const options='<div class="food-tabs segmented">'+tabs.map(([id,title])=>'<button type="button" data-action="food-tab:'+id+'" aria-pressed="'+(id===tab)+'">'+title+'</button>').join('')+'</div>';
  const search='<label class="food-search">食物名称或关键词<input type="search" id="food-query" placeholder="例如 米饭、鸡蛋、banana" maxlength="80" value="'+escape(mealDraft.query)+'"></label>';
  const barcode='<form id="barcode-form"><div class="fields"><label>输入条形码<input name="barcode" inputmode="numeric" maxlength="14" required></label><button class="btn secondary">查找本地食品</button></div></form>' +
    '<input type="file" id="barcode-file" accept="image/*" capture="environment" hidden>'+btn('从照片扫描','barcode-photo','flag')+
    '<p class="help-copy">支持时在设备上解码。仅查询本地食品库，未匹配时可按包装营养标签新建。</p><p id="food-message" role="status"></p>';
  const photo='<label class="food-search">拍摄或选择餐食照片<input type="file" id="food-photo" accept="image/*" capture="environment"></label><img id="meal-preview" class="meal-preview" alt="本次餐食照片预览" hidden>'+
    '<p class="help-copy">照片默认只在浏览器预览。启用本机视觉模型后，可手动送去识别。AI 结果仅用于辅助核对，份量由你确认。</p>'+btn('用本机 AI 识别','vision-analyze','spark')+'<div id="vision-results" aria-live="polite"></div>'+search;
  modal('添加餐食',options+(tab==='search'?search:tab==='barcode'?barcode:tab==='photo'?photo:'')+
    '<div id="food-results"></div><div class="meal-tools">'+btn('自定义食物','food-custom','plus')+btn('单项手动记录','edit:food:','','quiet')+'</div>'+
    '<form id="meal-form"><div class="fields">'+field(dateField,mealDraft)+field(selectField('meal','餐别',meals),mealDraft)+
    field(selectField('timing','补给时机',['日常','训练前','训练中','训练后']),mealDraft)+field(textField('name','组合餐食名称（可选）'),mealDraft)+'</div>'+
    (mealDraft.items.length?'<ul class="rows">'+mealDraft.items.map((item,index)=>'<li><div class="row-text"><strong>'+escape(item.name)+'</strong><small>'+num(item.grams)+' g · '+(item.kcal===null?'热量未知':num(item.kcal)+' kcal')+'</small></div>'+btn('移除','food-remove:'+index,'close','quiet')+'</li>').join('')+'</ul>'+nutritionStats(mealDraft.items):'<p class="help-copy">选择一种或多种食物，调整份量后保存。</p>')+
    '<p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button class="btn primary" type="submit" '+(!mealDraft.items.length?'disabled':'')+'>保存餐食</button></div></form>');
  displayFood();
}
function displayFood(matches) {
  const target=editor.querySelector('#food-results');
  if (!target || !mealDraft) return;
  const s=state(), items=allFoods(s);
  const recent=[...new Set(desc(s.food).flatMap(item=>(item.components || []).map(part=>part.foodId)))];
  const tab=mealDraft.tab;
  if (!matches && tab==='barcode') return;
  const results=matches ?? (tab==='recent'?recent.map(id=>items.find(item=>item.id===id)).filter(Boolean):
    tab==='favorite'?items.filter(item=>s.favorites.includes(item.id)):searchFood(items,mealDraft.query));
  target.innerHTML=results.length?'<ul class="rows food-results">'+results.slice(0,35).map(item=>'<li><div class="row-text"><strong>'+escape(item.name)+'</strong><small>'+
    escape(item.source)+' · 每 100 g '+(item.kcal===null?'能量未知':num(item.kcal)+' kcal')+'</small></div>'+
    btn(s.favorites.includes(item.id)?'取消收藏':'收藏','food-favorite:'+item.id,'','quiet')+btn('选取','food-pick:'+item.id,'plus','quiet')+'</li>').join('')+'</ul>':
    empty('food',tab==='recent'?'暂无近期食物':tab==='favorite'?'还没有收藏':'未找到食物','可以按包装营养标签添加自定义食物。');
}
function favoriteFood([id]) {
  if (sample || !allFoods().some(item=>item.id===id)) return;
  if (!commit(next=>{next.favorites=next.favorites.includes(id)?next.favorites.filter(value=>value!==id):[...next.favorites,id];})) return;
  if (mealDraft.tab==='barcode') matchBarcode(mealDraft.barcode);
  else displayFood();
}
function pickFood([id],fromVision=false) {
  keepMealFields();
  selectedFood=allFoods().find(item=>item.id===id);
  if (!selectedFood) return;
  modal('确认份量','<h3>'+escape(selectedFood.name)+'</h3><p>每 100 g · '+escape(selectedFood.source)+'</p>'+
    nutritionStats([selectedFood])+(selectedFood.url?'<p><a class="text-link" href="'+escape(selectedFood.url)+'" target="_blank" rel="noopener">查看营养来源</a></p>':'')+
    '<form id="portion-form"><div class="fields">'+field(numberField('grams','食用重量（g）',0.1,5000,0.1,true),{grams:fromVision?null:selectedFood.portion})+
    '</div><p id="portion-energy" role="status"></p><div class="dialog-actions">'+btn('返回食物列表','food-tab:'+mealDraft.tab,'','quiet')+
    '<button class="btn primary">加入这餐</button></div></form>');
  showPortionEnergy(fromVision?0:selectedFood.portion);
}
function showPortionEnergy(grams) {
  const target=editor.querySelector('#portion-energy');
  if (!target || !selectedFood) return;
  const values=portionValues(selectedFood,grams);
  target.textContent=grams>0?Object.entries(values).map(([key,value])=>foodNames[key]+' '+(value===null?'未知':num(value)+(key==='kcal'?' kcal':' g'))).join(' · '):'';
}
function removeFood([index]) {
  if (!mealDraft || sample) return;
  mealDraft.items.splice(Number(index),1);
  mealTab(mealDraft.tab);
}
function showCustomFood() {
  keepMealFields();
  const fields=[textField('name','食品名称',true),textField('barcode','包装条形码（可选）'),numberField('portion','常用份量（g）',0.1,5000,0.1,true),
    ...Object.entries(foodNames).map(([key,label])=>numberField(key,label+' / 100 g（'+(key==='kcal'?'kcal':'g')+'）',0,key==='kcal'?1000:100,0.01))];
  modal('自定义食物','<p>按营养标签填写每 100 g 数值。没有数据的项目留空。</p><form id="custom-food-form"><div class="fields">'+
    fields.map(config=>field(config,{portion:100,barcode:mealDraft.barcode})).join('')+'</div><p class="form-error" role="alert" hidden></p>'+
    '<div class="dialog-actions">'+btn('返回','food-tab:'+mealDraft.tab,'','quiet')+'<button class="btn primary">保存并选用</button></div></form>');
}
function matchBarcode(value) {
  mealDraft.barcode=validBarcode(value)?value:'';
  const message=editor.querySelector('#food-message');
  if (!mealDraft.barcode) {
    if (message) message.textContent='请输入有效的 8、12、13 或 14 位商品条形码。';
    editor.querySelector('#food-results').replaceChildren();
    return;
  }
  const results=allFoods().filter(item=>item.barcode?.padStart(14,'0')===value.padStart(14,'0'));
  if (message) message.textContent=results.length?'已在本地食品库匹配。':'本地食品库没有该条形码。可用包装标签创建自定义食物。';
  displayFood(results);
}
function showMeal([id]) {
  const item=state().food.find(row=>row.id===id);
  if (!item?.components) return;
  modal('餐食详情','<div class="report-title"><h3>'+escape(item.name)+'</h3><p>'+escape([item.date,item.meal,item.timing].join(' · '))+'</p></div>'+
    nutritionStats([item])+'<ul class="rows">'+item.components.map(part=>'<li><div class="row-text"><strong>'+escape(part.name)+'</strong><small>'+
      num(part.grams)+' g · '+escape(part.source)+'</small></div></li>').join('')+'</ul>'+
    (sample?'':'<div class="dialog-actions">'+btn('编辑餐别与补给','edit:food:'+id,'settings')+'</div>'));
}
editor.addEventListener('input',event=>{
  if (event.target.id==='food-query') {mealDraft.query=event.target.value;displayFood();}
  if (event.target.name==='grams' && event.target.form?.id==='portion-form') showPortionEnergy(Number(event.target.value));
});
editor.addEventListener('change',async event=>{
  if (!['barcode-file','food-photo'].includes(event.target.id)) return;
  const input=event.target, file=input.files[0];
  if (!file || file.size>12*1024*1024 || !file.type.startsWith('image/')) return notify('请选择不超过 12 MB 的图片。');
  if (input.id==='food-photo') {
    const preview=editor.querySelector('#meal-preview');
    const url=URL.createObjectURL(file);
    preview.onload=preview.onerror=()=>URL.revokeObjectURL(url);
    preview.src=url;
    preview.hidden=false;
    return;
  }
  const message=editor.querySelector('#food-message');
  if (!('BarcodeDetector' in window)) {message.textContent='此浏览器没有照片条码解码能力，请输入包装上的号码。';return;}
  let bitmap;
  try {
    const formats=(await BarcodeDetector.getSupportedFormats()).filter(item=>['ean_13','ean_8','upc_a','upc_e','itf'].includes(item));
    if (!formats.length) throw new Error('Unsupported barcode formats');
    bitmap=await createImageBitmap(file);
    const codes=await new BarcodeDetector({formats}).detect(bitmap);
    const code=codes.map(item=>item.rawValue).find(validBarcode);
    if (!input.isConnected || !editor.open) return;
    if (code) {
      editor.querySelector('#barcode-form').elements.barcode.value=code;
      matchBarcode(code);
    } else message.textContent='没有识别出支持的商品条码。可换一张更清晰的照片或手动输入。';
  } catch { if (input.isConnected) message.textContent='无法读取照片条码，请手动输入。'; }
  finally {bitmap?.close();}
});
editor.addEventListener('submit',event=>{
  const form=event.target;
  if (!['portion-form','custom-food-form','meal-form','barcode-form'].includes(form.id) || sample) return;
  event.preventDefault();
  const values=new FormData(form);
  if (form.id==='barcode-form') return matchBarcode(values.get('barcode').trim());
  if (form.id==='portion-form') {
    const grams=Number(values.get('grams'));
    mealDraft.items.push({foodId:selectedFood.id,name:selectedFood.name,source:selectedFood.source,grams,...portionValues(selectedFood,grams)});
    return mealTab(mealDraft.tab);
  }
  if (form.id==='custom-food-form') {
    const name=values.get('name').trim(),barcode=values.get('barcode').trim();
    if (!name || (barcode && !validBarcode(barcode))) return formError('请填写食物名称和有效的商品条形码。条形码可留空。');
    if (barcode && allFoods().some(item=>item.barcode?.padStart(14,'0')===barcode.padStart(14,'0'))) return formError('该条形码已有食品，可以返回搜索。');
    const item={id:crypto.randomUUID(),name,barcode,portion:Number(values.get('portion')),source:'自定义 · 用户填写'};
    for (const key of Object.keys(foodNames)) item[key]=values.get(key)===''?null:Number(values.get(key));
    if (commit(next=>next.foodLibrary.push(item))) pickFood([item.id]);
    return;
  }
  if (!mealDraft.items.length) return;
  keepMealFields();
  const {name,date,meal,timing,items}=mealDraft;
  const title=(name.trim() || items.map(item=>item.name).join(' + ')).slice(0,100);
  const item={id:crypto.randomUUID(),name:title,date,meal,timing,components:items,grams:sum(items,'grams'),...mealTotals(items),loggedAt:Date.now()};
  if (!commit(next=>next.food.push(item))) return;
  mealDraft=undefined;
  editor.close();
  render();
  notify('餐食已保存');
});


function installHeartZones(points) {
  if (!points.some((point,i)=>i>0 && heartSegment(points[i-1],point)>0)) return;
  const energy=editor.querySelector('#energy-form');
  energy.insertAdjacentHTML('beforebegin','<form id="heart-zone-form" class="fields"><label>已知最大心率（bpm）<input name="max" type="number" min="80" max="250" required></label><button class="btn secondary">查看心率区间</button></form><div id="zone-result"></div>');
  editor.querySelector('#heart-zone-form').addEventListener('submit',event=>{
    event.preventDefault();
    const zones=heartZones(points,Number(event.target.elements.max.value));
    editor.querySelector('#zone-result').innerHTML='<p>按所填最大心率的百分比分段。仅统计有连续样本的时段。</p><ol class="split-list">'+
      zones.map(([label,seconds])=>'<li><span>'+label+'</span><strong>'+duration(Math.round(seconds))+'</strong></li>').join('')+'</ol>';
  });
}

async function analyzeMealPhoto() {
  const input=editor.querySelector('#food-photo');
  const target=editor.querySelector('#vision-results');
  const button=editor.querySelector('[data-action="vision-analyze"]');
  const file=input?.files[0];
  if (!file || file.size>12*1024*1024 || !file.type.startsWith('image/')) {
    target.textContent='请先拍摄或选择一张不超过 12 MB 的照片。';
    return;
  }
  button.disabled=true;
  target.textContent='正在检查本机模型…';
  let bitmap;
  try {
    const availability=await fetch('./api/food-vision',{signal:AbortSignal.timeout(6000)});
    if (!availability.ok || !(await availability.json()).enabled) {
      target.textContent='本机视觉模型尚未启用。你可以搜索食物并确认份量。';
      return;
    }
    bitmap=await createImageBitmap(file);
    const scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const image=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.82));
    if (!target.isConnected || !image || input.files[0]!==file) return;
    target.textContent='本机模型正在尝试识别…';
    const response=await fetch('./api/food-vision',{method:'POST',body:image,signal:AbortSignal.timeout(96000)});
    const result=await response.json();
    if (!target.isConnected || input.files[0]!==file) return;
    if (!response.ok) {target.textContent=result.error;return;}
    if (!result.candidates.length) {target.textContent='未识别出可靠的食物，请手动搜索。';return;}
    target.innerHTML='<p>候选食物和份量均可能有误。请核对做法和重量，确认后才会匹配营养。</p><ul class="rows">'+
      result.candidates.map(item=>{
        const match=catalog.find(food=>food.id===item.foodId);
        return '<li><div class="row-text"><strong>'+escape(item.name)+'</strong><small>'+
          (item.minGrams===null?'份量未知':'粗略范围 '+item.minGrams+'–'+item.maxGrams+' g')+' · '+
          escape(match?'可匹配 '+match.name:'暂无营养匹配，请手动搜索')+'</small></div>'+
          (match?btn('核对份量','vision-pick:'+match.id,'','quiet'):'')+'</li>';
      }).join('')+'</ul>';
  } catch {
    if (target.isConnected && input.files[0]===file) target.textContent='识别不可用或照片无法解码，请手动搜索。';
  } finally {bitmap?.close();if (button.isConnected) button.disabled=false;}
}

function segments(options, selected, action, label) {
  return '<div class="segmented product-tabs" role="group" aria-label="'+label+'">'+options.map(([id,title])=>
    '<button type="button" data-action="'+action+':'+id+'" aria-pressed="'+(selected===id)+'">'+title+'</button>').join('')+'</div>';
}
function homeSwitch() {
  return segments([['training','训练'],['food','营养']],homeTab,'home-tab','今日重点');
}
function homeFuel(s,food) {
  return '<div class="feature-surface fuel-feature"><div class="eyebrow"><i></i> FUEL / TODAY</div><h2>每一餐，支持每一跑。</h2>'+
    (food.length?nutritionStats(food):'<p>今天还没有餐食记录。记录一餐，开始回顾训练前后的补给。</p>')+
    '<div class="hero-actions">'+btn('添加餐食','food-start','plus','primary')+link('打开营养日志','food')+'</div></div>'+homeCalendar(s);
}
function homeCalendar(s) {
  const start=weekStart(day);
  return '<section class="panel week-preview"><div class="panel-head"><div><h2>本周训练日历</h2><p>点选日期查看训练与日程</p></div>'+link('打开日历','calendar')+'</div><div class="calendar-days">'+
    Array.from({length:7},(_,i)=>{
      const date=offset(start,i);
      const plans=byDate(s.plans,date);
      return '<button type="button" data-action="open-day:'+date+'" aria-label="'+escape(fullDate(date)+'，'+plans.length+' 项训练')+'" '+(date===day?'aria-current="date"':'')+'><small>周'+'一二三四五六日'[i]+'</small><strong>'+Number(date.slice(8))+'</strong><i class="'+(plans.length?'has-event':'')+'"></i></button>';
    }).join('')+'</div></section>';
}
const groups = {all:'全部',intro:'入门',track:'场地',road:'公路',trail:'越野'};
const specialtyGroup = ['intro','track','track','track','road','road','trail','road','road'];
function planCarousel() {
  return '<section class="discover"><div class="panel-head"><div><div class="eyebrow"><i></i> PLAN DISCOVERY</div><h2>找到你的下一站</h2><p>从专项基础开始，根据实际训练调整。</p></div></div>'+
    segments(Object.entries(groups),planFilter,'plan-filter','专项筛选')+
    '<div class="plan-carousel" aria-label="专项计划" tabindex="0">'+Object.entries(specialties).map(([name,item],i)=>
      (planFilter==='all'||planFilter===specialtyGroup[i]) ? '<button type="button" class="plan-cover cover-'+specialtyGroup[i]+'" data-action="show-specialty:'+i+
      '"><small>'+groups[specialtyGroup[i]]+' / '+String(i+1).padStart(2,'0')+'</small><strong>'+escape(name)+'</strong><span>'+escape(item.focus)+'</span><span class="cover-arrow">查看计划 '+icon('arrow',16)+'</span></button>' : ''
    ).join('')+'</div></section>';
}
function showSpecialty([index]) {
  const entry=Object.entries(specialties)[Number(index)];
  if (!entry) return;
  const [name,specialty]=entry;
  modal(escape(name)+' · 专项计划','<div class="plan-detail-hero feature-surface"><div class="eyebrow"><i></i> FOUNDATION / 1–4 周</div><h3>'+escape(specialty.focus)+'</h3><p>'+escape(specialty.practice)+'</p></div>'+
    '<p>草案根据近期训练、恢复和可用时间生成。每节课可查看训练目的、强度和调整依据。</p>'+
    '<h3>研究依据</h3>'+sourcesList(specialty.references)+'<div class="dialog-actions">'+btn('用此专项生成','generate-specialty:'+index,'spark','primary')+'</div>','full');
}
function showWorkout([id]) {
  const plan=state().plans.find(item=>item.id===id);
  if (!plan) return;
  const fromEngine=plan.engineVersion===cycleVersion;
  const blocks=fromEngine ? [['热身','先轻松热身，逐步进入运动状态。'],['主训练',plan.objective || plan.note],['间歇恢复','按课次结构执行。基础跑以稳定轻松为主，草案未指定固定组间休息。'],['冷身','放慢收尾，结束后记录体感。']] :
    [['课次说明',plan.note || '这节课没有记录分段说明。']];
  modal('课次详情','<div class="report-title"><h3>'+escape(plan.name)+'</h3><p>'+escape(plan.date+' · '+plan.type+(plan.completed?' · 已完成':''))+'</p></div>'+
    '<div class="mini-grid">'+metric('距离',plan.distance||'—','km')+metric('时长',plan.minutes||'—','min')+metric('配速',plan.pace||'—')+'</div>'+
    '<ol class="workout-blocks">'+blocks.map(([title,copy])=>'<li><details><summary>'+title+'</summary><p>'+escape(copy)+'</p></details></li>').join('')+'</ol>'+
    (fromEngine?sessionExplanation(plan):'')+'<div class="dialog-actions">'+btn(sample?'查看原始记录':'编辑课次','edit:plans:'+plan.id,'settings')+
    (!sample&&!plan.completed?btn('开始这节课','start:'+plan.id,'play','primary'):'')+'</div>','full');
}
function nutritionDateNav() {
  return '<div class="panel food-date-nav">'+btn('上一天','nutrition-date:-1','left','quiet')+'<strong>'+escape(fullDate(foodDate))+'</strong>'+
    (foodDate<day?btn('下一天','nutrition-date:1','right','quiet'):'<span aria-hidden="true"></span>')+'</div>';
}

const performanceFields = {
  distance:['跑量','km',item=>item.distance],
  pace:['平均配速','/km',item=>item.distance>0?item.minutes/item.distance:null],
  load:['主观训练负荷','分钟 × 强度',item=>item.load],
  sleep:['睡眠','h',item=>item.sleep],
  recovery:['疲劳反馈','/5',item=>item.fatigue],
  meals:['餐食记录','餐',item=>item.meals]
};
function performanceSeries(s,period) {
  return Array.from({length:period},(_,i)=>{
    const date=offset(day,i-period+1);
    const runs=byDate(s.runs,date);
    const loadRuns=runs.filter(run=>Number.isFinite(run.effort)&&run.effort>0);
    const recovery=byDate(s.recovery,date).at(-1);
    return {date,distance:sum(runs,'distance'),minutes:sum(runs,'minutes'),
      load:loadRuns.length?loadRuns.reduce((acc,run)=>acc+run.effort*run.minutes,0):null,
      sleep:recovery?.sleep ?? null,fatigue:recovery?.fatigue ?? null,meals:byDate(s.food,date).length};
  });
}
function performanceValue(key, rows) {
  const [, ,value]=performanceFields[key];
  const known=rows.map(value).filter(Number.isFinite);
  if (key==='pace') return pace(sum(rows,'distance'),sum(rows,'minutes'));
  if (!known.length) return '—';
  const total=known.reduce((a,b)=>a+b,0);
  return num(key==='sleep'||key==='recovery'?total/known.length:total);
}
function performanceCards(s) {
  const rows=performanceSeries(s,7);
  return '<section class="performance-cards" aria-label="近七日数据卡">'+Object.entries(performanceFields).map(([key,[label,unit]])=>
    '<button type="button" class="panel metric-trigger" data-action="metric-detail:'+key+'"><small>'+label+'</small><strong>'+performanceValue(key,rows)+
    '</strong><span>'+unit+' '+icon('arrow',14)+'</span></button>'
  ).join('')+'</section>';
}
function showPerformance(kind) {
  if (!Object.hasOwn(performanceFields,kind)) return;
  activeDetail=kind;
  const [label,unit,value]=performanceFields[kind];
  const rows=performanceSeries(state(),detailPeriod);
  const measurements=rows.map(value).filter(Number.isFinite);
  const present=measurements.some(n=>n>0) || (['sleep','recovery','load'].includes(kind)&&measurements.length>0);
  const chart=present?svgLine(rows,value,label+'（'+unit+'）',kind==='pace'):'';
  modal(label+'趋势',segments([[1,'今天'],[7,'近 7 天'],[30,'近 30 天']],detailPeriod,'metric-period','统计范围')+
    '<div class="detail-total">'+metric(label,performanceValue(kind,rows),unit)+'</div>'+
    (kind==='load'?'<p>只累加填写了主观强度的跑步。该值用于回顾记录，不用于诊断或决定安全负荷。</p>':'')+
    (present?chart+'<details class="plan-explanation"><summary>查看逐日数据</summary><ol class="split-list">'+rows.map(row=>{
      const v=value(row);
      return '<li><span>'+escape(fullDate(row.date))+'</span><strong>'+(Number.isFinite(v)?(kind==='pace'?pace(row.distance,row.minutes):num(v)):'—')+'</strong></li>';
    }).join('')+'</ol></details>':empty('chart','该范围暂无记录','保存相关日志后再来查看。')),'sheet');
}

function growth(s) {
  const runDays=new Set(s.runs.map(run=>run.date)).size;
  const achievements=[
    [s.runs.length>0,'第一步','保存第一条跑步记录'],
    [runDays>=3,'三个训练日','在三个不同日期保存跑步记录'],
    [s.recovery.length>0,'听见身体','记录一次睡眠与恢复'],
    [s.plans.some(plan=>plan.completed),'计划落地','完成一次已安排的训练']
  ];
  const level=['起步','在路上','稳定实践','跑者习惯'][Math.min(3,achievements.filter(([done])=>done).length)];
  const activity=s.runs.filter(run=>['fit','gpx','tcx','gps'].includes(run.source)).sort((a,b)=>b.distance-a.distance).slice(0,5);
  const records=[...s.records].sort((a,b)=>a.event.localeCompare(b.event)||a.seconds-b.seconds).slice(0,10);
  const board=rankingTab==='manual' ? records.map(run=>[run.event,duration(run.seconds),'手动成绩 · 未验证']) :
    rankingTab==='device'?activity.map(run=>[run.name,num(run.distance)+' km',sourceNames[run.source]+' · 非赛事认证']):[];
  return head('GROWTH STUDIO','跑者成长','回顾个人成就，选择适合自己的界面。')+
    '<div class="split">'+panel('成就与段位','<div class="feature-level">'+tag('本地成长段位','red')+'<strong>'+level+'</strong></div><ul class="rows">'+achievements.map(([done,title,detail])=>
      '<li><div class="row-text"><strong>'+title+'</strong><small>'+detail+'</small></div>'+tag(done?'已达成':'待完成',done?'red':'')+'</li>').join('')+'</ul>')+
    panel('主题中心','<p class="library-note">主题只改变当前浏览器的显示。</p>'+segments(Object.entries(themes),currentTheme,'theme','本地主题'))+
    panel('本地成绩榜',segments([['manual','手动成绩'],['device','设备与定位'],['official','官方验证']],rankingTab,'rank-tab','来源筛选')+
      '<p class="library-note">仅展示当前浏览器的记录。'+(sample?'当前为演示模式。':'')+'</p>'+
      (board.length?'<ol class="split-list local-board">'+board.map(([name,value,source])=>'<li><span><strong>'+escape(name)+'</strong><small>'+escape(source)+'</small></span><strong>'+escape(value)+'</strong></li>').join('')+'</ol>':
        empty('flag',rankingTab==='official'?'暂无官方验证成绩':'当前来源暂无记录',rankingTab==='official'?'赛事认证服务尚未接入。':'在训练和数据页保存记录后可查看。')))+
    panel('跑团与挑战',empty('growth','等待安全接入','公开榜单、跑团和挑战需先完成权限、同意与审核流程。'))+'</div>';
}
function setTheme([theme]) {
  if (!Object.hasOwn(themes,theme)) return;
  try {localStorage.setItem('breakwind.theme',theme);}
  catch {notify('此浏览器无法保存主题，当前页面仍可预览。');}
  currentTheme=theme;
  render();
}
restoreWorkout();
render();
