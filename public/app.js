import { evidence, draftTraining } from './engine.js';
import { types, meals, distances, fresh, dateKey, offset, weekStart, pace, duration, sum, week, conflicts, insight, readData, demo } from './model.js';

const icons = {
  home: 'M3 10l9-7 9 7v10H3z M9 20v-6h6v6',
  run: 'M3 12h4l3-7 4 14 3-7h4',
  calendar: 'M4 6h16v15H4z M4 10h16 M8 3v5 M16 3v5',
  food: 'M5 3v7a3 3 0 0 0 6 0V3 M8 3v18 M19 3c-4 3-4 7-4 10h4 M19 3v18',
  chart: 'M4 4v16h16 M8 15l4-5 3 2 5-6',
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
const routes = { home: ['总览','总览面板'], run: ['训练','训练工作台'], calendar: ['日程','训练与日程'], food: ['营养','运动营养'], chart: ['数据','数据中心'], heart: ['恢复','恢复日志'], book: ['学院','知识库与训练引擎'] };
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
  return head('PERFORMANCE DASHBOARD', name, fullDate(day) + ' · 把今天的训练、恢复和补给安排好。', btn('记录跑步','edit:runs:','plus','primary')) + workoutHero(s) +
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
  return '<div class="mini-grid">' + metric('能量',num(sum(items,'kcal')),'kcal') + metric('蛋白质',num(sum(items,'protein')),'g') + metric('碳水',num(sum(items,'carbs')),'g') + metric('脂肪',num(sum(items,'fat')),'g') + '</div>';
}
function rows(items, collection, render, glyph, emptyLabel, emptyCopy) {
  return items.length ? '<ul class="rows">' + items.map(item => {
    const [title, detail, badge] = render(item);
    return '<li><span class="tile">' + icon(glyph,17) + '</span><div class="row-text"><strong>' + escape(title) + '</strong><small>' + escape(detail) + '</small></div>' + (badge ? tag(badge) : '') + btn(sample ? '查看' : '编辑','edit:' + collection + ':' + item.id,'','quiet') + '</li>';
  }).join('') + '</ul>' : empty(glyph,emptyLabel,emptyCopy);
}
const planRow = item => [item.name, [item.date, item.start, item.distance ? item.distance + ' km' : '', item.minutes ? item.minutes + ' min' : '', item.pace ? item.pace + ' /km' : ''].filter(Boolean).join(' · '), item.completed ? '已完成' : item.type];
const runRow = item => [item.name, item.date + ' · ' + item.distance + ' km · ' + item.minutes + ' min · ' + pace(item.distance,item.minutes) + ' /km' + (item.heart ? ' · ' + item.heart + ' bpm' : ''), item.type];
function training(s) {
  return head('TRAINING STUDIO','训练工作台','安排训练，回顾距离、配速和主观强度。',btn('记录跑步','edit:runs:','plus','primary') + btn('目标设置','profile','flag')) +
  '<div class="split">' + panel('训练计划',rows(desc(s.plans),'plans',planRow,'calendar','还没有训练计划','从轻松跑开始，或创建自定义训练。'),btn('安排训练','edit:plans:','plus','quiet')) +
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
  panel('当天安排', selected.length ? '<ul class="rows">' + selected.map(item => '<li><span class="tile">' + icon(item.collection === 'plans' ? 'run' : 'calendar') + '</span><div class="row-text"><strong>' + escape(item.name) + '</strong><small>' + escape(item.start ? item.start + (item.end ? '–' + item.end : '') : '未指定时间') + ' · ' + escape(item.type) + '</small></div>' + (conflicts(item,selected).length ? tag('时间冲突','red') : '') + btn(sample ? '查看' : '编辑','edit:' + item.collection + ':' + item.id,'','quiet') + '</li>').join('') + '</ul>' : empty('calendar','这天没有安排','为训练或日常事项留出时间。'),btn('回到今天','date:' + day,'','quiet')) + '</div>';
}
function nutrition(s) {
  const today = byDate(s.food, day);
  return head('FUEL LOG','运动营养','用餐食记录回顾训练前后的补给。',btn('添加餐食','edit:food:','plus','primary')) +
  '<div class="split">' + panel('今日营养汇总',today.length ? nutritionStats(today) : empty('food','等待第一餐','按实际份量填写你已知的营养数据。'),'', '根据手动填写的数值汇总') +
  panel('餐食历史',rows(desc(s.food),'food',item => [item.name,[item.date,item.meal,item.grams ? item.grams+' g' : '',item.kcal !== null ? item.kcal+' kcal' : ''].filter(Boolean).join(' · '),item.timing],'food','还没有餐食记录','早餐、午餐、晚餐和加餐都可以记录。')) + '</div>';
}
function recoveryPage(s) {
  return head('RECOVERY LOG','恢复日志','在训练之外，也记录身体的反馈。',btn('填写今日恢复','edit:recovery:' + (byDate(s.recovery,day).at(-1)?.id || ''),'plus','primary')) +
  panel('恢复记录',rows(desc(s.recovery),'recovery',item => [item.date,item.sleep + ' 小时睡眠 · 疲劳 ' + item.fatigue + ' / 5' + (item.note ? ' · ' + item.note : ''),item.pain ? '有疼痛反馈' : '无疼痛反馈'],'moon','还没有恢复记录','填写睡眠、疲劳和疼痛反馈，便于结合训练回顾。'));
}
function analytics(s) {
  const series = Array.from({length:chartRange}, (_,i) => {
    const date = offset(day,i-chartRange+1);
    const runs = byDate(s.runs,date);
    return {date,distance:sum(runs,'distance'),minutes:sum(runs,'minutes'),count:runs.length};
  });
  const selected = series.find(item => item.date === chartDate);
  const runs = s.runs.filter(run => run.date >= series[0].date && run.date <= day);
  const distribution = types.map(type => [type,runs.filter(run => run.type === type).length]).filter(([,n]) => n);
  return head('PERFORMANCE ANALYTICS','数据中心','从真实训练记录里看跑量、配速和一致性。',btn('添加成绩','edit:records:','plus','primary')) +
  '<div class="split">' + panel('跑量趋势','<div class="weekly-summary">' + metric('累计跑量',num(sum(series,'distance')),'km') + metric('综合配速',pace(sum(series,'distance'),sum(series,'minutes')),'/km') + metric('训练天数',series.filter(item=>item.count).length,'天') + '</div>' + bars(series) + '<div class="chart-caption">' + (selected ? escape(fullDate(selected.date)) + ' · ' + num(selected.distance) + ' km · 配速 ' + pace(selected.distance,selected.minutes) : '点击某天查看跑量和配速。') + '</div>', '<div class="segmented">' + [7,30].map(n => '<button type="button" aria-pressed="' + (n===chartRange) + '" data-action="range:' + n + '">' + n + ' 天</button>').join('') + '</div>') +
  panel('训练类型',distribution.length ? '<div class="distribution">' + distribution.map(([type,n]) => '<div><span>' + type + '</span><progress max="' + runs.length + '" value="' + n + '">' + n + '</progress><strong>' + n + ' 次</strong></div>').join('') + '</div>' : empty('chart','暂无训练分布','完成记录后，可按训练类型查看次数。')) +
  panel('个人最好成绩',personalBest(s)) +
  panel('成绩历史',rows(desc(s.records),'records',item => [item.event,item.date + ' · ' + duration(item.seconds),''],'flag','还没有成绩记录','支持常见比赛距离和自定义项目。')) + '</div>';
}
const articles = [
  ['跑步入门','配速怎么读？','配速是跑完一个单位距离所用的时间。6:00 /km 表示每公里用时 6 分钟。破风用总耗时除以总距离计算平均配速。'],
  ['专业训练','训练日志怎么记？','同一次训练可同时记录客观数据和主观强度。查看相近配速下的体感变化时，记得回顾天气、路线、睡眠和停顿等背景。'],
  ['比赛策略','如何整理比赛成绩？','保存项目、日期和完赛时间，再比较同距离的成绩。场地、天气和计时方式也会影响结果，适合单独写在备注里。'],
  ['营养与恢复','怎样回顾训练前后的补给？','用餐食日志中的训练前、训练后标签关联补给时机，再结合训练备注回顾实际感受。']
];
function academy() {
  return head('TRAINING INTELLIGENCE','知识库与训练引擎','用国际研究理解训练，再根据实际日志生成可审核的七日基础草案。',btn('生成训练草案','generate','spark','primary')) + '<div class="split">' + articles.map(([category,title,body]) => '<details class="panel article"><summary>' + tag(category,'red') + '<strong>' + title + '</strong></summary><p>' + body + '</p></details>').join('') + '</div>' + evidenceLibrary();
}

const pages = { home:dashboard, run:training, calendar:schedule, food:nutrition, chart:analytics, heart:recoveryPage, book:academy };
function render() {
  const route = currentRoute();
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
  runs: ['跑步记录',[textField('name','训练名称',true),dateField,selectField('type','训练类型',types.slice(0,9)),numberField('distance','实际距离（km）',0.01,300,0.01,true),numberField('minutes','实际耗时（分钟）',0.1,1440,0.1,true),numberField('heart','平均心率（bpm）',20,250),numberField('effort','主观强度（1–10）',1,10),painField,noteField]],
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
function modal(title, body) {
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
  const [title, fields] = schema;
  formContext = {collection,id,defaults};
  const values = item ? {...item} : {date:currentRoute() === 'calendar' ? selectedDate : day, ...defaults};
  if (collection === 'records' && item && !distances.includes(item.event)) {
    values.event = '自定义';
    values.custom = item.event;
  }
  modal(title,'<form id="entry-form"><fieldset class="fields"' + (sample ? ' disabled' : '') + '>' + fields.map(config => field(config,values)).join('') + '</fieldset><p class="form-error" role="alert" hidden></p><div class="dialog-actions">' +
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
  const { collection,id,defaults } = formContext;
  const fields = schemas[collection][1];
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
  const saved = commit(next => {
    if (collection === 'goals') {
      next.goals = item;
      return;
    }
    const index = next[collection].findIndex(entry => entry.id === id);
    if (id && index === -1) throw new Error('Record removed');
    item.id = id || crypto.randomUUID();
    if (index >= 0) next[collection][index] = {...next[collection][index],...item};
    else next[collection].push(item);
    if (defaults.planId) {
      const plan = next.plans.find(entry => entry.id === defaults.planId);
      if (plan) plan.completed = true;
    }
  });
  if (!saved) return;
  editor.close();
  if (defaults.timed) activeWorkout = undefined;
  if (currentRoute() === 'calendar' && item.date) selectedDate = item.date;
  render();
  notify('已保存' + (defaults.planId ? '跑步记录，训练计划已完成' : ''));
});

function timerView() {
  if (!activeWorkout) return;
  modal('训练计时','<div class="timer"><span>ELAPSED TIME</span><strong id="elapsed">00:00</strong></div><p>结束后填写实际距离与训练反馈。</p><div class="dialog-actions">' + btn('放弃计时','cancel-timer','','quiet') + btn('结束并填写','finish','flag','primary') + '</div>');
  const tick = () => {
    const target = editor.querySelector('#elapsed');
    if (target) target.textContent = duration(Math.floor((Date.now() - activeWorkout.started) / 1000));
  };
  clearInterval(clockTimer);
  tick();
  clockTimer = setInterval(tick,250);
}
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
  generate: openGenerator,
  'save-draft': saveDraft,
  edit: ([collection,id]) => openEditor(collection,id),
  demo: leaveSample,
  close: () => editor.close(),
  profile: () => openEditor('goals'),
  menu: () => modal('更多','<div class="menu-links">' + ['heart','book'].map(route => link(routes[route][1],route)).join('') + btn('训练目标','profile','flag') + '</div>'),
  notifications: () => {
    const items = timeline(state(),day);
    const count = items.filter(item => conflicts(item,items).length).length;
    modal('通知',empty('bell', count ? '今日有 ' + count + ' 项安排发生时间冲突' : '目前没有新通知', count ? '在日程页面查看有冲突的事项。' : '这里会显示今天的日程冲突。') + link('查看日程','calendar'));
  },
  'ask-delete': () => modal('删除记录？','<p>这条记录会从本地日志和相关统计中移除。</p><div class="dialog-actions">' + btn('取消','delete-back','','quiet') + btn('确认删除','delete','','danger') + '</div>'),
  'delete-back': () => openEditor(formContext.collection,formContext.id),
  delete: () => {
    const {collection,id} = formContext;
    if (sample || !id || !commit(next => {next[collection] = next[collection].filter(item => item.id !== id);})) return;
    editor.close();
    render();
    notify('记录已删除');
  },
  date: ([date]) => {selectedDate = date; render();},
  mode: ([mode]) => {calendarMode = mode; render();},
  move: ([delta]) => {moveDate(Number(delta)); render();},
  range: ([range]) => {chartRange = Number(range); chartDate = ''; render();},
  chart: ([date]) => {chartDate = date; render();},
  start: ([id]) => {
    if (sample) return openEditor('runs');
    const plan = data.plans.find(item => item.id === id);
    activeWorkout = {started:Date.now(), plan};
    render();
    timerView();
  },
  timer: timerView,
  'cancel-timer': () => {activeWorkout = undefined; editor.close(); render();},
  finish: () => {
    clearInterval(clockTimer);
    const {plan,started} = activeWorkout;
    const minutes = Math.max(0.1, Math.round((Date.now() - started) / 6000) / 10);
    openEditor('runs','',{name:plan?.name || '跑步训练',type:types.slice(0,9).includes(plan?.type) ? plan.type : types[0],minutes,planId:plan?.id,timed:true});
  }
};

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) {
    const [action,...args] = button.dataset.action.split(':');
    actions[action]?.(args);
    if (['chart','date','range','mode','move'].includes(action)) {
      document.querySelector('[data-action="' + button.dataset.action + '"]')?.focus({preventScroll:true});
    }
  } else if (editor.open && event.target.closest('a[href^="#"]')) editor.close();
});
window.addEventListener('hashchange', () => {
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
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

function evidenceLink(source) {
  return '<a class="text-link" href="' + source.url + '" target="_blank" rel="noopener">原始研究 ' + icon('arrow',15) + '</a>';
}
function evidenceLibrary() {
  return '<div class="stack evidence-grid">' + evidence.map(source => panel(source.title,
    '<div class="evidence-copy"><p>' + source.finding + '</p><p><strong>适用范围</strong> ' + source.limits + '</p><p><strong>产品规则</strong> ' + source.application + '</p>' + evidenceLink(source) + '</div>',
    tag(source.kind,'red'),source.author + ' · ' + source.year + ' · ' + source.region)).join('') + '</div>';
}
let proposed;
function openGenerator() {
  modal('生成七日训练草案','<form id="engine-form"><div class="fields">' + field(selectField('level','训练基础',['刚开始或重新起跑','近期规律跑步']),{}) + '</div><p>以近期记录、恢复反馈、目标与日程为依据。基础引擎使用可解释规则。</p><div class="dialog-actions"><button class="btn primary" type="submit">查看草案</button></div></form>');
}
editor.addEventListener('submit', event => {
  if (event.target.id !== 'engine-form') return;
  event.preventDefault();
  const level = new FormData(event.target).get('level') === '近期规律跑步' ? 'regular' : 'beginner';
  proposed = draftTraining(state(),day,level);
  modal('七日基础训练草案','<ul class="draft-reasons">' + proposed.reasons.map(reason => '<li>' + escape(reason) + '</li>').join('') + '</ul><ul class="rows">' +
    proposed.plans.map(plan => '<li><span class="tile">' + icon('run',17) + '</span><div class="row-text"><strong>' + escape(plan.name) + '</strong><small>' + plan.date + ' · ' + (plan.distance ? plan.distance + ' km' : plan.minutes + ' min') + ' · ' + escape(plan.note) + '</small></div></li>').join('') +
    '</ul><div class="menu-links">' + evidence.filter(source => proposed.sources.includes(source.id)).map(source => '<div class="source-line"><span>' + source.author + ' (' + source.year + ')</span> ' + evidenceLink(source) + '</div>').join('') + '</div><div class="dialog-actions">' +
    btn('关闭','close','','quiet') + (sample ? btn('返回我的记录','demo') : proposed.plans.length ? btn('确认加入日程','save-draft','calendar','primary') : '') + '</div>');
});
function saveDraft() {
  if (sample || !proposed?.plans.length) return;
  let changed = false;
  const saved = commit(next => {
    const latest = draftTraining(next,dateKey(),proposed.level);
    if (JSON.stringify(latest) !== JSON.stringify(proposed)) {
      changed = true;
      throw new Error('Draft changed');
    }
    next.plans.push(...proposed.plans.map(plan => ({...plan,id:crypto.randomUUID()})));
  });
  if (changed) {
    notify('日志或日程有变化，请重新生成。');
    openGenerator();
  }
  if (!saved) return;
  const count = proposed.plans.length;
  proposed = undefined;
  selectedDate = day;
  calendarMode = 'week';
  editor.close();
  location.hash = href('calendar');
  notify('已加入 ' + count + ' 项训练。可在日程中调整。');
}
