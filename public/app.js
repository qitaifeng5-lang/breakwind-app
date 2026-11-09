import { runModes, sourceNames, addFix, analyzeTrack, likelyDuplicate, energyEstimate, importRun, coordinate, heartSegment, heartZones } from './running.js';
import { pbDistances, pbDistanceLabel, pbOptions, pbSeconds, formatPB, pbCourses, pbWeek, courseCategories, coursePhases } from './pb-library.js';
import { catalog, searchFood, portionValues, mealTotals, validBarcode } from './fuel.js';
import { athleteTiers, cycleVersion, courseReadiness, groupEvents, groupWeek, phases, recentPain, reviewCycle, specialties, templateDetails } from './engine.js';
import { evidence, evidenceLevels } from './knowledge.js';
import { types, meals, distances, fresh, dateKey, offset, weekStart, pace, duration, sum, conflicts, readData, demo } from './model.js';

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
const hostedPreview = Boolean(document.querySelector('meta[name="breakwind-preview"]'));
const storagePrefix = hostedPreview ? 'breakwind.preview' : 'breakwind';
const key = storagePrefix + '.local.v1';
const main = document.querySelector('#main');
const editor = document.querySelector('#editor');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// Safari keeps the layout viewport behind the keyboard. Fit sheets to the
// visual viewport instead; never resize the page or discard a form draft.
function fitEditorViewport(event) {
  const viewport=window.visualViewport;
  if (!viewport || viewport.scale!==1) return;
  // A keyboard/viewport change must not leave the entrance transform below
  // the newly visible bottom edge, even for the remaining animation frames.
  if (event?.type==='resize') for (const animation of editor.getAnimations()) {
    if (animation.animationName==='bw-modal-rise') animation.finish();
  }
  editor.style.setProperty('--visible-height',viewport.height+'px');
  editor.style.setProperty('--keyboard-inset',Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop)+'px');
}
window.visualViewport?.addEventListener('resize',fitEditorViewport);
window.visualViewport?.addEventListener('scroll',fitEditorViewport);
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
let foodDate = day;
let planFilter = 'all';
let planSearch = '';
let tierFilter = '';
let phaseFilter = '';
let dayFilter = '';
let weekFilter = '';
let comparePlans = [];
let trainingDate = '';
let pbLibraryEvent = '';
let pbLibraryChoice = '';
let pbLibraryMode = 'single';
let pbLibraryFocus = 'all';
try {
  const stored = JSON.parse(localStorage.getItem(storagePrefix+'.pb-catalog')||'null');
  if (pbDistances.includes(stored?.event)) {
    pbLibraryEvent=stored.event;
    pbLibraryChoice=pbSeconds(stored.pb)?stored.pb:'';
  }
  if (['week','single'].includes(stored?.mode)) pbLibraryMode=stored.mode;
} catch { /* PB catalogue may operate without local persistence. */ }
function persistPBChoice() {
  try {localStorage.setItem(storagePrefix+'.pb-catalog',JSON.stringify({
    event:pbLibraryEvent,pb:pbLibraryChoice,mode:pbLibraryMode
  }));} catch { /* Browsing remains available without storage. */ }
}

let detailPeriod = 7;
let activeDetail;
let detailDay = '';
let rankingTab = 'manual';
const themes = {ember:'破风暗红',track:'赛道蓝',forest:'林地绿'};
let currentTheme = 'ember';
try {
  const preference = localStorage.getItem(storagePrefix + '.theme');
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
const head = (eyebrow, title, sub, actions = '') => '<div class="page-head"><div>' + (eyebrow ? '<div class="eyebrow"><i></i>' + eyebrow + '</div>' : '') +
  '<h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
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
  const scheduled=byDate(s.plans,day).find(item=>!item.completed);
  // Do not present an unverified generic easy-run fallback as the user's complete PB training plan.
  const plan = scheduled;
  const paused=trainingPaused(s);
  const runnable=plan && !plan.completed && !['休息','交叉训练'].includes(plan.type);
  const secondary=paused ? btn('伤痛与暂停','training-safety','','quiet') :
    plan?.groupWorkout ? btn('课次详情','group-workout:'+day,'','quiet') :
    plan ? btn('课次详情','open-plan:'+plan.id,'','quiet') : link('选训练计划','run');
  const primary=activeWorkout ? btn('继续计时','timer','play','primary') :
    paused ? '' : btn('开始跑步','start:'+(runnable?plan.id:''),'play','primary');
  return '<section class="hero today-hero"><div class="hero-content"><h2>'+
    escape(paused?'暂缓训练':plan?.name || (s.groupPlan?.pb?'从 PB 课程库选课':'今天还没有课表'))+'</h2>'+
    (paused ? '<p>有伤痛或尚未恢复时，请暂停相关训练。</p>' :
      plan?.minutes ? '<p>'+plan.minutes+' 分钟'+(plan.intensity?' · '+escape(plan.intensity):'')+'</p>' : '')+
    '<div class="hero-actions">'+primary+secondary+'</div></div></section>';
}

function dashboard(s) {
  return '<header class="home-title"><h1>今日训练</h1><p>'+escape(fullDate(day))+'</p></header>'+workoutHero(s);
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

const pbCourseKinds={interval:'间歇跑',endurance:'间歇跑',tempo:'阈值跑',speed:'加速跑',combination:'间歇跑',aerobic:'轻松跑',hills:'坡道跑'};
let courseSearch='';
let courseSearchOpen=false;
let coursePhase='develop';
let courseDate=day;
let activeCourse;
let pbDraftEvent='';
let courseSelectionDraft;
function openCourseSettings(reset=true) {
  if (reset || !courseSelectionDraft) courseSelectionDraft={event:pbLibraryEvent,pb:pbLibraryChoice};
  const draft=courseSelectionDraft;
  const events=pbDistances.map((item,index)=>'<button data-action="pb-event:'+index+'" aria-pressed="'+(draft.event===item)+'">'+escape(pbDistanceLabel(item))+'</button>').join('');
  const choices='<button data-action="pb-all">不限成绩</button>'+pbOptions(draft.event).map(item=>'<button data-action="pb-choice:'+item.index+'" aria-pressed="'+(item.seconds===pbSeconds(draft.pb))+'">'+item.label+'</button>').join('');
  modal('专项与 PB','<div class="course-settings"><h3>专项</h3><div class="pb-events">'+events+'</div><h3>PB 档位</h3><div class="pb-tiers">'+choices+'</div>'+btn('自定义成绩','pb-custom','','secondary')+'<p>PB 只用于浏览匹配，不自动增加训练负荷。</p><div class="picker-actions">'+btn('取消','close','','quiet')+btn('查看课程','course-apply','','primary')+'</div></div>','sheet');
}
function applyCourseSelection() {
  if (!courseSelectionDraft) return;
  pbLibraryEvent=courseSelectionDraft.event;pbLibraryChoice=courseSelectionDraft.pb;pbLibraryFocus='all';
  persistPBChoice();editor.close();refreshPBView(false);
}
function openCourseFilters() {
  modal('训练类型','<div class="course-type-list">'+[['all','全部'],...Object.entries(courseCategories)].map(([id,label])=>btn(label,'pb-focus:'+id,'',pbLibraryFocus===id?'secondary':'quiet')).join('')+'</div>','sheet');
}
function openCoursePhase() {
  modal('训练阶段','<div class="course-type-list">'+Object.entries(coursePhases).map(([id,label])=>btn(label,'course-phase:'+id,'',coursePhase===id?'secondary':'quiet')).join('')+'</div>','sheet');
}
function courseOptions() {return {phase:coursePhase,youth:state().cycleProfile?.age==='未满18岁'};}
function pbLibrarySelection(s) {
  const event=pbLibraryEvent || s.groupPlan?.event || '800 m';
  const value=pbLibraryChoice;
  const seconds=pbSeconds(value);
  return {seconds,label:seconds?formatPB(seconds,{fraction:true}):'所有档位'};
}
function courseArt(id) {
  const paths=id==='hills'?'M0 100 70 28 130 78 200 10 300 100 M0 120 85 50 150 105 220 38 320 120':
    id==='tempo'?'M0 95 Q30 10 60 95 T120 95 T180 95 T240 95 T300 95':
    id==='combination'?'M20 100V50H75V100 M95 100V25H145V100 M170 100V65H225V100 M245 100V40H290V100':
    id==='aerobic'?'M-20 95 Q60 10 150 75 T330 45 M-20 110 Q60 25 150 90 T330 60':
    'M-20 100H130a35 35 0 0 0 0-70H50 M-20 115H130a50 50 0 0 0 0-100H50 M-20 85H130a20 20 0 0 0 0-40H50';
  return '<svg class="course-art art-'+id+'" viewBox="0 0 300 130" fill="none" aria-hidden="true"><path d="'+paths+'" stroke="currentColor" stroke-width="3"/><circle cx="245" cy="27" r="5" fill="currentColor"/></svg>';
}
const recoveryText=seconds=>seconds===null?'充分恢复，由现场指导确认':seconds>=60?num(seconds/60)+' 分钟':seconds+' 秒';
function structureHTML(course) {
  return '<ol class="course-segments">'+course.segments.map((part,index)=>'<li><span>'+String(index+1).padStart(2,'0')+'</span><div><strong>'+
    escape(part.unit==='skill'?part.description:(part.repeats>1?part.repeats+' × ':'')+part.distance+({m:'m',min:' 分钟',sec:' 秒'}[part.unit]||''))+'</strong>'+
    (part.label?'<small>'+escape(part.label)+'</small>':'')+
    ((part.repeats>1 || index<course.segments.length-1)?'<small>'+(part.recoverySeconds===0?'连续衔接，不暂停':'组内恢复 · '+recoveryText(part.recoverySeconds))+'</small>':'')+'</div></li>').join('')+'</ol>'+
    (course.sets>1?'<p class="set-recovery">共 '+course.sets+' 组 · 组间恢复 '+recoveryText(course.setRecovery)+'</p>':'');
}
function courseCard(course) {
  return '<article class="course-card"><div class="course-cover cover-'+course.categoryId+'">'+courseArt(course.categoryId)+
    '<span>'+escape(course.category)+' · '+escape(course.phaseLabel)+'</span></div><div class="course-card-body"><small>'+escape(course.band.label)+' · '+escape(course.applicablePB)+' · 待审核</small><h3>'+btn(course.name,'pb-course:'+course.id,'','course-title')+'</h3><p>'+escape(course.main)+'</p><p class="course-purpose">'+escape(course.objective)+'</p>'+
    '<details class="course-expansion"><summary>展开结构</summary><div>'+structureHTML(course)+'<p>'+escape(course.adjustment)+'</p></div></details></div></article>';
}
function pbLibraryView(s) {
  if (!pbDistances.includes(pbLibraryEvent)) {
    pbLibraryEvent=pbDistances.includes(s.groupPlan?.event)?s.groupPlan.event:'800 m';
    pbLibraryChoice=s.groupPlan?.event===pbLibraryEvent&&pbSeconds(s.groupPlan.pb)?s.groupPlan.pb:'';
  }
  const event=pbLibraryEvent,selection=pbLibrarySelection(s),options=courseOptions();
  const courses=pbCourses(event,selection.seconds,options);
  const selectedIndex=Math.max(0,Math.min(6,Math.round((Date.parse(courseDate)-Date.parse(day))/86400000)));
  const week=pbWeek(event,selection.seconds,options);
  const selected=week[selectedIndex];
  const filtered=courses.filter(item=>(pbLibraryFocus==='all'||pbLibraryFocus===item.categoryId)&&(!courseSearch||[item.name,item.category,item.objective,item.main].join(' ').toLowerCase().includes(courseSearch.toLowerCase())));
  const single='<div class="course-section-head"><h2>'+escape(courseCategories[pbLibraryFocus]||'发现课程')+'</h2>'+btn('按类型浏览','course-filter','','quiet')+'</div><div class="course-rail" tabindex="0" aria-label="训练课程，可横向滚动">'+
    (filtered.length?filtered.map(courseCard).join(''):'<p class="empty-courses">没有找到对应课程，试试其他关键词。</p>')+'</div>';
  const weekContent='<div class="course-section-head"><h2>'+escape(coursePhases[coursePhase])+'</h2>'+btn('调整阶段','course-phases','','quiet')+'</div><p class="week-purpose">'+escape(selected.weekPurpose)+'</p>'+
    '<div class="course-dates" aria-label="课程日期">'+week.map((item,index)=>'<button data-action="course-day:'+index+'" aria-pressed="'+(index===selectedIndex)+'"><small>'+escape(fullDate(offset(day,index)))+'</small><strong>'+escape(item.category)+'</strong></button>').join('')+'</div>'+
    '<section class="week-feature" data-swipe-day="course"><p>'+escape(fullDate(offset(day,selectedIndex)))+' · '+escape(selected.category)+'</p><h2>'+escape(selected.name)+'</h2><p>'+escape(selected.main||'休息也是本周安排的一部分。')+'</p><p class="week-relation">'+escape(selected.relation)+'</p>'+
    (selected.id!=='rest'?btn('查看完整课程','pb-week:'+selectedIndex,'arrow','primary'):'')+'</section>'+
    '<ol class="week-outline">'+week.map((item,index)=>'<li><button data-action="pb-week:'+index+'"><span>'+escape(fullDate(offset(day,index)))+'</span><strong>'+escape(item.name)+'</strong><small>'+escape(item.relation)+'</small></button></li>').join('')+'</ol>';
  return '<section id="pb-library" class="course-discover"><button class="course-profile pb-tiers-label" data-action="course-settings" aria-label="调整专项与PB"><strong>'+escape(pbDistanceLabel(event))+' <span>· PB '+escape(selection.label)+'</span></strong><span>调整 '+icon('right')+'</span></button>'+
    '<div class="pb-library-mode" role="group" aria-label="训练计划形式"><button data-action="pb-mode:single" aria-pressed="'+(pbLibraryMode==='single')+'">单节训练</button><button data-action="pb-mode:week" aria-pressed="'+(pbLibraryMode==='week')+'">一周课表</button></div>'+
    (trainingPaused(s)?'<div class="course-risk" role="status">已知伤痛：课程可以浏览，暂不安排执行。'+btn('查看原因','training-safety','','quiet')+'</div>':'')+
    (pbLibraryMode==='single'?single:weekContent)+'<div class="course-status"><span>原创教学课程 · 待专业审核'+(options.youth?' · 青少年指导模式':'')+'</span></div>'+
    (!['800 m','1500 m'].includes(event)?'<p class="coverage-note">当前仅提供通用基础示例，尚非完整'+escape(pbDistanceLabel(event))+'专项体系。</p>':'')+'</section>';
}
function refreshPBView(keepPosition=true) {
  const root=main.querySelector('#pb-library');
  if (!root) return render();
  const positions=['.pb-tiers','.pb-events','.pb-focus'].map(selector=>[selector,root.querySelector(selector)?.scrollLeft||0]);
  root.outerHTML=pbLibraryView(state());
  for (const [selector,left] of positions) main.querySelector(selector)?.scrollTo({left:keepPosition?left:0,behavior:'instant'});
}
function openPBWorkout(course,dayIndex=null) {
  if (!course) return;
  if (course.id==='rest') return modal('休息与恢复','<p>'+escape(course.relation)+'</p>'+btn('返回课程','close','','quiet'),'sheet');
  activeCourse={course,date:dayIndex===null?day:offset(day,dayIndex)};
  const key=[course.event,course.id,course.pb,activeCourse.date].join('|');
  const scheduled=state().plans.find(plan=>plan.courseKey===key);
  if (scheduled) {course={...course,planId:scheduled.id};activeCourse.course=course;}
  const ready=courseReadiness(state(),course,activeCourse.date,day);
  modal(course.name,'<div class="course-detail"><button class="btn quiet" data-action="close">'+icon('left')+'返回课程</button><div class="detail-cover cover-'+(course.categoryId||course.id)+'">'+courseArt(course.categoryId||course.id)+'<span>'+escape(course.category)+'</span></div>'+
    '<p class="course-kicker">'+escape(pbDistanceLabel(course.event)+' · '+course.applicablePB+' · '+course.phaseLabel)+'</p><p>'+escape(course.objective)+'</p>'+
    '<div class="review-label">待专业审核 · 不是个体训练处方</div><section class="course-block"><h3>热身</h3><p>'+escape(course.warmup)+'</p></section><section class="course-block"><h3>主训练</h3>'+structureHTML(course)+'</section>'+
    '<section class="course-block"><h3>冷身与恢复</h3><p>'+escape(course.cooldown)+'</p></section><section class="course-block"><h3>强度与调整</h3><p>'+escape(course.intensityBasis)+'</p><p>'+escape(course.adjustment)+'</p></section>'+
    '<details class="course-evidence"><summary>训练依据与审核状态</summary><p>'+escape(course.parameterOrigin)+'</p>'+course.sources.map(source=>'<article><a href="'+source.url+'" target="_blank" rel="noopener">'+escape(source.title)+'</a><small>'+escape(source.kind+' · '+source.population)+'</small><p>'+escape(source.rule)+'</p><p>'+escape(source.limit)+'</p></article>').join('')+'</details>'+
    '<p class="course-readiness" role="status">'+escape(ready.reason)+'</p>'+
    (ready.canSchedule || ready.status==='spacing'?'<form id="course-schedule"><label class="course-date-label">加入日期<input type="date" name="date" min="'+day+'" value="'+activeCourse.date+'" required></label><div class="dialog-actions"><button class="btn primary" type="submit">加入日程</button>'+(ready.canSchedule?btn('开始记录','course-start','','secondary'):'')+'</div><p class="form-error" role="alert" hidden></p></form>':'')+'</div>','sheet');
}
function scheduleCourse(date) {
  const course=activeCourse?.course;
  if (!course || sample || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date<day || offset(date,0)!==date) return false;
  const courseKey=[course.event,course.id,course.pb,date].join('|');
  const existing=data.plans.find(plan=>plan.courseKey===courseKey);
  const ready=courseReadiness(data,{...course,planId:existing?.id},date,day);
  if (!ready.canSchedule) {formError(ready.reason);return false;}
  if (existing) {notify('这节课已在日程中');return existing;}
  const plan={id:crypto.randomUUID(),date,name:course.name,type:course.id==='hills-control'?'技术训练':pbCourseKinds[course.categoryId||course.id],quality:course.quality,courseKey,
    course:structuredClone(course),reviewStatus:'pending',executionStatus:'待执行核对',completed:false,
    note:course.main,minutes:null,distance:null,pace:'',start:'',end:''};
  if (!commit(next=>next.plans.push(plan))) return false;
  return plan;
}
editor.addEventListener('submit',event=>{
  if (event.target.id!=='course-schedule') return;
  event.preventDefault();
  const plan=scheduleCourse(event.target.elements.date.value);
  if (plan) {editor.close();render();notify('已加入 '+plan.date+' 日程 · 执行前核对');}
});
function startCourseRecord() {
  const course=activeCourse?.course;
  if (!course) return;
  const ready=courseReadiness(data,course,day,day);
  if (!ready.canSchedule) return modal('暂不执行','<p>'+escape(ready.reason)+'</p>','sheet');
  modal('执行前核对','<p>'+escape(course.name)+' · 待专业审核</p><form id="course-ready"><label class="ready-check"><input type="checkbox" name="ready" required>'+escape(course.youth?'教练已在现场确认适龄技术活动；我目前没有疼痛。':'我已有同类训练经验，目前没有疼痛，已核对今天的恢复和训练安排。')+'</label><p>这项确认仅记录你的当前反馈，不代表专业审核通过。</p><button class="btn primary" type="submit">确认并记录</button></form>','sheet');
}
editor.addEventListener('submit',event=>{
  if (event.target.id!=='course-ready') return;
  event.preventDefault();
  if (!event.target.elements.ready.checked || !activeCourse) return;
  const plan=scheduleCourse(day);
  if (plan) runOptions(plan.id,true);
});
function training(s) {
  return '<div class="training-product">'+head('','训练','',btn('搜索','course-search','','quiet')+btn('记录跑步','run-options','plus','quiet'))+
    '<label class="course-search"'+(courseSearchOpen?'':' hidden')+'><span class="sr-only">搜索课程</span><input id="course-search" type="search" placeholder="搜索课程、结构或训练目的" value="'+escape(courseSearch)+'"></label>'+pbLibraryView(s)+
    '<nav class="training-tools" aria-label="训练记录">'+btn('训练日程','training-calendar','calendar','quiet')+btn('跑步历史','training-history','run','quiet')+btn('伤痛与恢复','training-safety','heart','quiet')+'</nav>'+
    '<details class="quick-secondary"><summary>计划资料与收藏</summary>'+planCarousel()+'</details></div>';
}

function showGroupWorkout([date]) {
  const plan=groupWeek(state(),day,state().groupPlan).find(item=>item.date===date);
  if (!plan) return;
  const details=plan.blocks?.map(([title,copy])=>'<li><strong>'+escape(title)+'</strong><p>'+escape(copy)+'</p></li>').join('');
  modal('课次详情','<h3>'+escape(plan.name)+'</h3><p>'+escape([fullDate(date),plan.minutes&&plan.minutes+' 分钟',plan.pace||plan.intensity].filter(Boolean).join(' · '))+'</p>'+
    (details?'<ol class="quick-steps">'+details+'</ol>':(plan.note?'<p>'+escape(plan.note)+'</p>':''))+
    (plan.rationale?sessionExplanation(plan):''),'sheet');
}
function showTrainingHold() {
  const s=state();
  modal('伤痛与暂停','<p>'+ (recentPain(s,day) ? '近期记录有疼痛。请暂停相关训练，症状持续时寻求专业评估。' :
    '有持续疼痛、动作受限或尚未恢复时，暂停相关训练并寻求专业评估。')+'</p>'+
    (sample?'':s.trainingHold ? (!recentPain(s,day)?btn('已恢复，解除暂停','training-hold:off','','quiet'):'') : btn('暂停训练建议','training-hold:on','','primary')),'sheet');
}
function toggleTrainingHold([mode]) {
  if (sample || (mode==='off' && recentPain(data,day))) return;
  if (!commit(next=>{next.trainingHold=mode==='on';})) return;
  editor.close();
  render();
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
  '<div class="split">' + panel('日历', '<div data-swipe-day="calendar"><div class="calendar-controls">' + btn('上一周期','move:-1','left','quiet') + '<strong>' + escape(calendarMode === 'month' ? selectedDate.slice(0,7) : fullDate(selectedDate)) + '</strong>' + btn('下一周期','move:1','right','quiet') + '</div><div class="calendar-days">' + dateButtons + '</div></div>', '<div class="segmented">' + [['day','日'],['week','周'],['month','月']].map(([mode,label]) => '<button type="button" aria-pressed="' + (calendarMode===mode) + '" data-action="mode:' + mode + '">' + label + '</button>').join('') + '</div>') +
  panel('当天安排', selected.length ? '<ul class="rows">' + selected.map(item => '<li><span class="tile">' + icon(item.collection === 'plans' ? 'run' : 'calendar') + '</span><div class="row-text"><strong>' + escape(item.name) + '</strong><small>' + escape(item.start ? item.start + (item.end ? '–' + item.end : '') : '未指定时间') + ' · ' + escape(item.type) + '</small></div>' + (conflicts(item,selected).length ? tag('时间冲突','red') : '') + (item.collection==='plans'?btn('课次详情','open-plan:'+item.id,'','quiet'):btn(sample ? '查看' : '编辑','edit:' + item.collection + ':' + item.id,'','quiet')) + '</li>').join('') + '</ul>' : empty('calendar','这天没有安排','为训练或日常事项留出时间。'),btn('回到今天','date:' + day,'','quiet')) + '</div>';
}
function nutrition(s) {
  const items = byDate(s.food,foodDate);
  return '<div class="quick-page">'+head('','运动营养','',btn('添加食物','food-start','plus','primary'))+nutritionDateNav()+
    '<div class="meal-list">'+meals.map(meal=>{
      const entries=items.filter(item=>item.meal===meal).reverse();
      return '<section class="meal-group"><header><h2>'+meal+'</h2>'+btn('添加'+meal,'food-start:'+meal,'plus','quiet')+'</header>'+
        entries.map(item=>'<button type="button" class="meal-entry" data-action="'+(item.components?'meal-detail:':'edit:food:')+item.id+
          '"><span>'+escape(item.name)+'</span><small>'+escape([item.grams?num(item.grams)+' g':'',item.timing==='日常'?'':item.timing].filter(Boolean).join(' · '))+
          '</small></button>').join('')+'</section>';
    }).join('')+'</div>'+
    (items.length?'<details class="quick-secondary"><summary>当日营养汇总</summary>'+nutritionStats(items)+'</details>':'')+
    '<details class="quick-secondary"><summary>饮食历史与趋势</summary>'+btn('营养趋势','metric-detail:meals','','quiet')+
    rows(desc(s.food.filter(item=>item.date!==foodDate)),'food',item=>[item.name,item.date+' · '+item.meal,item.timing],'food','暂无往日餐食','')+'</details></div>';
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
  return head('','知识库与训练引擎','',link('查看分组课表','run')) + '<div class="split">' + articles.map(([category,title,body]) => '<details class="panel article"><summary>' + tag(category,'red') + '<strong>' + title + '</strong></summary><p>' + body + '</p></details>').join('') + '</div>' + evidenceLibrary();
}

const pages = { home:dashboard, run:training, calendar:schedule, food:nutrition, chart:analytics, heart:recoveryPage, book:academy, growth:growth };
function render() {
  const route = currentRoute();
  document.documentElement.dataset.route=route;
  document.documentElement.dataset.theme = currentTheme;
  chrome(route);
  document.documentElement.dataset.preview = hostedPreview ? 'https' : '';
  const banner = sample ? '<div class="notice">' + icon('spark',17) + '<span>演示模式 · 示例数据仅供体验</span>' + btn('返回我的记录','demo','','quiet') + '</div>' : '';
  const revision=document.querySelector('meta[name="breakwind-preview"]')?.content.slice(0,7);
  const preview = document.documentElement.dataset.preview ? '<div class="notice preview-notice">测试版 '+escape(revision)+' · 记录保存在此浏览器</div>' : '';
  const previous = main.querySelector('.ring')?.style.getPropertyValue('--progress');
  main.innerHTML = preview + banner + (storageError ? '<div class="notice" role="alert">' + escape(storageError) + '</div>' : '') + pages[route](state());
  const ring = main.querySelector('.ring');
  if (ring && !reducedMotion.matches) {
    const target=ring.style.getPropertyValue('--progress');
    if (target !== previous) ring.animate([{'--progress':previous || '0%'},{'--progress':target}],{duration:340,easing:'ease-out'});
  }
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
  for (const animation of editor.getAnimations()) animation.cancel();
  const previous = editor.dataset.variant;
  editor.dataset.variant = variant;
  editor.style.removeProperty('transform');
  if (!editor.open) opener = document.activeElement;
  editor.innerHTML = (variant==='sheet' ? '<div class="sheet-handle" aria-hidden="true"><i></i></div>' : '') +
    '<div class="dialog-head"><h2 id="dialog-title" tabindex="-1">' + title + '</h2><button type="button" class="icon-button" data-action="close" aria-label="关闭">' + icon('close') + '</button></div><div class="dialog-body">' + body + '</div>';
  const wasOpen=editor.open;
  if (!editor.open) editor.showModal();
  fitEditorViewport();
  if (wasOpen && !reducedMotion.matches && (variant==='live' || previous==='live') && variant!==previous) {
    editor.querySelector('.dialog-body').animate(
      [{opacity:0.6,transform:'translateX('+ (variant==='live'?'-18px':'18px') +')'},{opacity:1,transform:'none'}],
      {duration:220,easing:'ease-out'});
  }
  editor.querySelector('#dialog-title').focus({preventScroll:true});
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
    if (defaults.groupWorkoutId && item.date===defaults.groupWorkoutId.split('~').at(-1)) item.groupWorkoutId=defaults.groupWorkoutId;
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
  // A queued close can arrive after another sheet opens or the user starts
  // typing. Restore focus only when it has not already moved elsewhere.
  if (editor.open) return;
  clearInterval(clockTimer);
  const active=document.activeElement;
  if (active===document.body || active===opener || editor.contains(active)) {
    if (opener?.isConnected) opener.focus({preventScroll:true});
    else main.focus({preventScroll:true});
  }
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
  'course-settings': () => openCourseSettings(),
  'course-apply': applyCourseSelection,
  'course-filter': openCourseFilters,
  'course-phases': openCoursePhase,
  'course-phase': ([phase]) => {if(!Object.hasOwn(coursePhases,phase))return;coursePhase=phase;courseDate=day;editor.close();refreshPBView();},
  'pb-mode': ([mode]) => {if(!['week','single'].includes(mode)) return; pbLibraryMode=mode;persistPBChoice();refreshPBView();},
  'pb-event': ([index]) => {const event=pbDistances[Number(index)];if(!event||!courseSelectionDraft)return;courseSelectionDraft={event,pb:event===pbLibraryEvent?pbLibraryChoice:''};openCourseSettings(false);},
  'pb-choice': ([index]) => {const option=pbOptions(courseSelectionDraft?.event)[Number(index)];if(!option)return;courseSelectionDraft.pb=option.label;applyCourseSelection();},
  'pb-focus': ([id]) => {if(id!=='all'&&!Object.hasOwn(courseCategories,id))return;pbLibraryFocus=id;editor.close();refreshPBView();},
  'pb-week': ([index]) => {openPBWorkout(pbWeek(pbLibraryEvent,pbLibrarySelection(state()).seconds,courseOptions())[Number(index)],Number(index));},
  'pb-course': ([id]) => {openPBWorkout(pbCourses(pbLibraryEvent,pbLibrarySelection(state()).seconds,courseOptions()).find(x=>x.id===id));},
  'pb-all': () => {if(courseSelectionDraft){courseSelectionDraft.pb='';applyCourseSelection();}},
  'pb-custom': () => openGroupSetup(quickEvents.findIndex(([event])=>event===(courseSelectionDraft?.event||pbLibraryEvent))),
  'course-start': startCourseRecord,
  'course-search': () => {courseSearchOpen=!courseSearchOpen;const field=main.querySelector('.course-search');field.hidden=!courseSearchOpen;if(courseSearchOpen)field.querySelector('input').focus();},
  'course-day': ([index]) => {if(Number(index)<0||Number(index)>6)return;courseDate=offset(day,Number(index));refreshPBView();},
  'training-calendar': () => {location.hash=href('calendar');},
  'training-history': () => modal('跑步历史',rows(desc(state().runs),'runs',runRow,'run','还没有跑步记录','')+btn('设备与同步','devices','settings','quiet'),'sheet'),
  'group-setup': ([index]) => openGroupSetup(index),
  'group-date': ([date]) => {
    const position=main.querySelector('.group-week-days')?.scrollLeft || 0;
    trainingDate=date;
    render();
    main.querySelector('.group-week-days')?.scrollTo({left:position,behavior:'instant'});
  },
  'group-workout': showGroupWorkout,
  'training-hold': toggleTrainingHold,
  'training-safety': showTrainingHold,
  'show-specialty': showSpecialty,
  'plan-filter': ([filter]) => {planFilter=filter;refreshPlanResults();},
  'plan-scroll': ([direction]) => {
    const carousel=main.querySelector('.plan-carousel');
    carousel?.scrollBy({left:Number(direction)*carousel.clientWidth*0.8,behavior:reducedMotion.matches?'instant':'smooth'});
  },
  'plan-favorite': ([index]) => togglePlanFavorite(index),
  'plan-compare': ([index]) => togglePlanComparison(index),
  'compare-plans': showComparison,
  'open-day': ([date]) => {selectedDate=date;calendarMode='day';location.hash=href('calendar');},
  'open-plan': showWorkout,
  'nutrition-date': ([direction]) => {foodDate=offset(foodDate,Number(direction));render();},
  'metric-detail': ([kind]) => {detailPeriod=7;detailDay='';showPerformance(kind);},
  'metric-period': ([n]) => {detailPeriod=Number(n);detailDay='';showPerformance(activeDetail);},
  'metric-point': ([date]) => {detailDay=date;updateTrendSelection();},
  'rank-tab': ([tab]) => {rankingTab=tab;render();},
  theme: setTheme,
  'review-cycle': showCycleReview,
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
  chart: ([date]) => {chartDate = date;render();},
  start: ([id]) => runOptions(id),
  timer: timerView,
  'run-options': () => runOptions(),
  'run-manual': () => openEditor('runs','',{name:pendingPlan?.name,type:types.slice(0,9).includes(pendingPlan?.type)?pendingPlan.type:types[0],
    planId:pendingPlan?.groupWorkout?null:pendingPlan?.id,groupWorkoutId:pendingPlan?.groupWorkout?pendingPlan.id:null}),
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
  'food-manual': () => {
    keepMealFields();
    openEditor('food','',{date:mealDraft.date,meal:mealDraft.meal,timing:mealDraft.timing});
  },
  'food-pick': pickFood,
  'food-grams': ([amount]) => {
    const grams=editor.querySelector('#portion-form')?.elements.grams;
    if (!grams) return;
    grams.value=amount;
    showPortionEnergy(Number(amount));
  },
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
    if (['chart','date','range','mode','move','group-date','plan-filter','nutrition-date','metric-period','rank-tab','theme'].includes(action)) {
      document.querySelector('[data-action="' + button.dataset.action + '"]')?.focus({preventScroll:true});
    }
  } else if (editor.open && event.target.closest('a[href^="#"]')) editor.close();
});
function updateRoute() {
  sample = location.hash.includes('demo=1');
  render();
  main.focus({preventScroll:true});
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', () => {
  if (editor.open) editor.close();
  if (!reducedMotion.matches && document.startViewTransition) {
    // Rapid navigation intentionally skips an unfinished visual transition.
    document.startViewTransition(updateRoute).ready.catch(()=>{});
  }
  else updateRoute();
});
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) {load(); render();}
});
function refreshDay() {
  const now = dateKey();
  if (now === day) return;
  if (selectedDate === day) selectedDate = now;
  if (foodDate === day) foodDate = now;
  if (trainingDate === day) trainingDate = now;
  if (courseDate === day) courseDate = now;
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
    '<li><a href="' + source.url + '" target="_blank" rel="noopener">' + escape(source.authors) + ' · ' + (source.year ?? '未标注年份') + ' · ' + escape(source.kind) + '</a></li>').join('') + '</ul>';
}
function evidenceLibrary() {
  const methodology = [
    ['先建立有氧基础','Lydiard 的阶段思路适用于比较中长跑周期组织。历史精英跑量不用于产品处方。',['lydiard']],
    ['按目的区分强度','Daniels 按训练目的组织强度和赛季。配速框架不能单凭一次比赛成绩推导负荷。',['daniels']],
    ['受控阈值','挪威访谈反映高水平教练如何管理强度。双阈值或乳酸监测要求较高，本版不自动安排。',['norway']],
    ['马拉松专项方法的书目','世界田联档案可核验 Arcelli 与 Canova 的出版记录。当前证据不足以比较其剂量或训练效果。',['canova']],
    ['马拉松周期','Pfitzinger 面向有经验的长距离跑者。按赛事组织周次的概念可用于比较，付费计划和跑量档位不进入生成器。',['pfitzinger']],
    ['反馈驱动','Hudson 的教练框架与产品的反馈复核有共同关注点。其书目条目不是该方法效果的独立研究。',['hudson']],
    ['中距离专项','800 米侧重放松速度，1500 米侧重有氧支持和均匀节奏。精英综述用于区分目的，训练剂量受个人日志和恢复约束。',['middle','japan']],
    ['5000 米与越野','5000 米案例展示分区方法的差别，越野教练教育提供专项背景。可控节奏和地形练习是短周期草案，负荷上限来自个人记录。',['five-k','intensity','usatf']],
    ['青年发展','成熟度、训练环境和长期参与比套用成人专项更重要。可参考国际共识与加拿大教练教育路径。',['ioc-youth','youth-running','canada']]
  ];
  return '<section class="stack evidence-grid"><h2>训练体系比较</h2><div class="split">' + methodology.map(([title,copy,ids]) =>
    '<details class="panel article"><summary><strong>' + title + '</strong></summary><p>' + copy + '</p>' + sourcesList(ids) + '</details>').join('') +
    '</div><h2>全球资料索引</h2><p class="library-note">来源性质与研究质量分别标注。官方目录用于定位教练教育。未经充分验证的经验目前不参与自动排课。</p><div class="split">' +
    evidence.map(source => '<details class="panel article"><summary>' + tag(source.category) + ' ' + tag(source.kind) +
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
  if (!cycle) return '';
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
const quickEvents = Object.entries(groupEvents);
function openGroupSetup(index) {
  const entry=quickEvents[Number(index)];
  if (!entry) return;
  pbDraftEvent=entry[0];
  const long=['半程马拉松','全程马拉松'].includes(pbDraftEvent);
  const track=['800 m','1500 m'].includes(pbDraftEvent);
  const seconds=pbSeconds(courseSelectionDraft?.event===pbDraftEvent?courseSelectionDraft.pb:pbLibraryEvent===pbDraftEvent?pbLibraryChoice:'') || 0;
  const select=(name,label,count,value)=>'<label>'+label+'<select name="'+name+'" aria-label="'+label+'">'+Array.from({length:count},(_,n)=>'<option value="'+n+'"'+(n===value?' selected':'')+'>'+String(n).padStart(2,'0')+'</option>').join('')+'</select></label>';
  modal('自定义 '+pbDistanceLabel(pbDraftEvent)+' PB','<form id="pb-picker"><p class="picker-help">选择数字即可，不需要输入冒号。</p><div class="pb-number-picker">'+
    (long?select('hours','小时',24,Math.floor(seconds/3600)):'')+select('minutes','分',long?60:180,Math.floor(seconds/60)%(long?60:180))+
    select('seconds','秒',60,Math.floor(seconds)%60)+(track?select('hundredths','百分秒',100,Math.round(seconds*100)%100):'')+'</div>'+
    '<output id="pb-draft-value">'+(seconds?formatPB(seconds,{hours:long,fraction:track}):'请选择成绩')+'</output>'+
    '<details class="pb-manual"><summary>备用：手动输入</summary><label class="quick-pb">PB<input type="text" name="manual" autocomplete="off" placeholder="'+(long?'1:30:00':'4:55.00')+'"></label></details>'+
    '<p class="form-error" role="alert" hidden></p><div class="picker-actions">'+btn('取消','close','','quiet')+'<button type="submit" class="btn primary">保存成绩</button></div></form>','sheet');
}
function pickerSeconds(form) {
  if (form.querySelector('.pb-manual').open) return pbSeconds(form.elements.manual.value.trim());
  const n=Number(form.elements.hours?.value||0)*3600+Number(form.elements.minutes.value)*60+Number(form.elements.seconds.value)+Number(form.elements.hundredths?.value||0)/100;
  return n>0?n:null;
}
editor.addEventListener('change',event=>{
  const form=event.target.closest('#pb-picker');
  if (form) form.querySelector('output').textContent=formatPB(pickerSeconds(form),{hours:Boolean(form.elements.hours),fraction:true});
});
editor.addEventListener('submit',event=>{
  const form=event.target;
  if (form.id!=='pb-picker') return;
  event.preventDefault();
  const seconds=pickerSeconds(form);
  if (!seconds || seconds>=86400) return formError('请选择有效的成绩，秒数为 00–59。');
  pbLibraryEvent=pbDraftEvent;
  pbLibraryChoice=formatPB(seconds,{fraction:true});
  pbLibraryFocus='all';
  persistPBChoice();
  editor.close();
  refreshPBView();
});

const workoutKey = storagePrefix + '.run.draft';
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
function runOptions(id,courseConfirmed=false) {
  if (sample) return openEditor('runs');
  if (activeWorkout) return timerView();
  if (id && trainingPaused(data)) return showTrainingHold();
  pendingPlan = data.plans.find(plan=>plan.id===id) || groupWeek(data,day,data.groupPlan).find(plan=>plan.id===id && plan.date===day && plan.type!=='休息' && plan.type!=='交叉训练');
  if (pendingPlan?.previewOnly) return notify('请从课程详情主动选课，浏览课表不会自动安排执行。');
  if (pendingPlan?.course) {
    activeCourse={course:{...pendingPlan.course,planId:pendingPlan.id},date:day};
    const ready=courseReadiness(data,activeCourse.course,day,day);
    if (!ready.canSchedule) return modal('暂不执行','<p>'+escape(ready.reason)+'</p>','sheet');
    if (!courseConfirmed) return startCourseRecord();
  }
  modal('记录跑步','<div class="menu-links">' +
    btn('手机 GPS · 前台记录','run-gps','play','primary') + btn('开始手动计时','run-timer','clock') +
    btn('手动填写','run-manual','plus') + btn('导入 FIT / GPX / TCX','run-import','flag') +
    btn('设备与同步','devices','settings') + '</div><p class="help-copy">网页 GPS 需要定位授权和前台页面。切到后台或锁屏时会暂停。</p>');
}
function startWorkout(mode) {
  if (sample || activeWorkout) return;
  if (pendingPlan?.course && !courseReadiness(data,{...pendingPlan.course,planId:pendingPlan.id},day,day).canSchedule) return showTrainingHold();
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
    distance:stats.distance >= 10 ? Math.round(stats.distance/10)/100 : '',planId:plan?.groupWorkout?null:plan?.id,groupWorkoutId:plan?.groupWorkout?plan.id:null,timed:true,
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
  mealDraft={date:currentRoute()==='food'?foodDate:day,meal:meals.includes(requestedMeal)?requestedMeal:meals[new Date().getHours()<10?0:new Date().getHours()<15?1:2],
    timing:'日常',name:'',items:[],query:'',tab:'search'};
  mealTab('search');
  editor.querySelector('#food-query').focus({preventScroll:true});
}
function keepMealFields() {
  const form=editor.querySelector('#meal-form');
  if (!form) return;
  for (const key of ['date','meal','timing','name']) if (form.elements[key]) mealDraft[key]=form.elements[key].value;
}
function mealTab(tab) {
  if (!mealDraft || sample) return;
  keepMealFields();
  mealDraft.tab=tab;
  const tabs=[['search','搜索'],['photo','拍照识别'],['barcode','扫码'],['recent','最近吃过'],['favorite','收藏']];
  const options='<div class="food-tabs segmented" aria-label="添加食物方式">'+tabs.map(([id,title])=>'<button type="button" data-action="food-tab:'+id+'" aria-pressed="'+(id===tab)+'">'+title+'</button>').join('')+'</div>';
  const search='<label class="food-search"><span class="visually-hidden">搜索食物</span><input type="search" id="food-query" placeholder="搜索米饭、鸡蛋等" maxlength="80" value="'+escape(mealDraft.query)+'"></label>';
  const barcode='<form id="barcode-form"><div class="fields"><label>输入条形码<input name="barcode" inputmode="numeric" maxlength="14" required></label><button class="btn secondary">查找本地食品</button></div></form>' +
    '<input type="file" id="barcode-file" accept="image/*" capture="environment" hidden>'+btn('从照片扫描','barcode-photo','flag')+
    '<p class="help-copy">支持时在设备上解码。仅查询本地食品库，未匹配时可按包装营养标签新建。</p><p id="food-message" role="status"></p>';
  const photo='<label class="food-search">拍摄或选择照片<input type="file" id="food-photo" accept="image/*" capture="environment"></label><img id="meal-preview" class="meal-preview" alt="本次餐食照片预览" hidden>'+
    (document.documentElement.dataset.preview?'<p>此测试站支持照片预览。可搜索食物并填写重量。</p>':btn('用本机 AI 识别','vision-analyze','spark'))+'<div id="vision-results" aria-live="polite"></div>'+search;
  modal('添加食物',options+(tab==='search'?search:tab==='barcode'?barcode:tab==='photo'?photo:'')+
    '<form id="meal-form"><div class="meal-select">'+field(selectField('meal','餐别',meals),mealDraft)+'</div>'+
    (mealDraft.items.length?'<ul class="rows">'+mealDraft.items.map((item,index)=>'<li><div class="row-text"><strong>'+escape(item.name)+'</strong><small>'+num(item.grams)+' g</small></div>'+
      btn('移除','food-remove:'+index,'close','quiet')+'</li>').join('')+'</ul><button class="btn primary" type="submit">保存组合</button>':'')+
    '<div id="food-results"></div><details class="quick-secondary"><summary>更多餐食选项</summary><div class="fields">'+field(dateField,mealDraft)+
    field(selectField('timing','补给时机',['日常','训练前','训练中','训练后']),mealDraft)+field(textField('name','组合餐食名称（可选）'),mealDraft)+'</div>'+
    '<div class="meal-tools">'+btn('自定义食物','food-custom','plus')+btn('单项手动记录','food-manual','','quiet')+'</div></details></form>','sheet');
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
  target.innerHTML=results.length?'<ul class="rows food-results">'+results.slice(0,35).map(item=>'<li>'+
    '<button type="button" class="food-pick" data-action="food-pick:'+item.id+'"><strong>'+escape(item.name)+'</strong><small>'+
    num(item.portion)+' g / 常用份量</small></button>'+
    '<button type="button" class="btn quiet" aria-label="'+(s.favorites.includes(item.id)?'取消收藏 ':'收藏 ')+escape(item.name)+
    '" aria-pressed="'+s.favorites.includes(item.id)+'" data-action="food-favorite:'+item.id+'">'+(s.favorites.includes(item.id)?'★':'☆')+'</button></li>').join('')+'</ul>':
    '<p class="help-copy">'+(tab==='recent'?'暂无近期食物':tab==='favorite'?'还没有收藏':'未找到食物')+'</p>';
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
  const amounts=[0.5,1,1.5].map(multiplier=>Math.round(selectedFood.portion*multiplier*10)/10).filter(amount=>amount>=0.1&&amount<=5000);
  modal('调整份量','<h3>'+escape(selectedFood.name)+'</h3>'+
    '<form id="portion-form">'+field(numberField('grams','食用重量（g）',0.1,5000,0.1,true),{grams:fromVision?null:selectedFood.portion})+
    '<div class="portion-choices">'+[...new Set(amounts)].map(amount=>btn(amount+' g','food-grams:'+amount,'','quiet')).join('')+'</div>'+
    '<details class="quick-secondary"><summary>营养与来源</summary><p id="portion-energy" role="status"></p><p>'+escape(selectedFood.source)+'</p>'+
    (selectedFood.url?'<p><a class="text-link" href="'+escape(selectedFood.url)+'" target="_blank" rel="noopener">查看来源</a></p>':'')+'</details>'+
    '<div class="dialog-actions">'+btn('返回','food-tab:'+mealDraft.tab,'','quiet')+
    '<button class="btn primary" type="submit" value="save">保存到'+mealDraft.meal+'</button></div>'+
    '<details class="quick-secondary"><summary>组合餐食</summary><button class="btn quiet" type="submit" value="add">加入组合，继续添加</button></details></form>','sheet');
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
    if (!selectedFood || !Number.isFinite(grams) || grams<0.1 || grams>5000) return;
    const portion={foodId:selectedFood.id,name:selectedFood.name,source:selectedFood.source,grams,...portionValues(selectedFood,grams)};
    if (event.submitter?.value==='add') {
      mealDraft.items.push(portion);
      return mealTab(mealDraft.tab);
    }
    return saveMeal([...mealDraft.items,portion]);
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
  saveMeal(mealDraft.items);
});
function saveMeal(items) {
  const {name,date,meal,timing}=mealDraft;
  const title=(name.trim() || items.map(item=>item.name).join(' + ')).slice(0,100);
  const item={id:crypto.randomUUID(),name:title,date,meal,timing,components:items,grams:sum(items,'grams'),...mealTotals(items),loggedAt:Date.now()};
  if (!commit(next=>next.food.push(item))) return;
  if (currentRoute()==='food') foodDate=date;
  mealDraft=undefined;
  editor.close();
  render();
  notify('已保存到'+meal);
}


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
const groups = {all:'全部',intro:'入门',track:'场地',road:'公路',trail:'越野',support:'训练目标',favorites:'收藏'};
const planCatalog = Object.entries(specialties).map(([name,specialty],index)=>({
  name,specialty,index,template:templateDetails(name),
  group:specialty.group || (index === 0 ? 'intro' : index === 3 ? 'track' : 'road'),
  aliases:{'5000 m':'5km 5公里','10000 m':'10km 10公里','越野跑':'Cross Country XC','半程马拉松':'半马 half marathon','全程马拉松':'全马 marathon'}[name] || ''
}));
const normalizeQuery = value => value.toLowerCase().replace(/\s/g,'');
const catalogSelect = (id,label,options,value) => '<label><span>'+label+'</span><select id="'+id+'">'+
  options.map(([key,title])=>'<option value="'+key+'"'+(key===value?' selected':'')+'>'+title+'</option>').join('')+'</select></label>';
function planCarousel() {
  return '<section class="discover"><div class="panel-head"><div><h2>找训练计划</h2><p>选项目和阶段，再按近期训练生成课表。</p></div></div>'+
    '<label class="plan-search"><span>搜索训练计划</span><input id="plan-search" type="search" placeholder="例如 800m、5km、越野" value="'+escape(planSearch)+'"></label>'+
    segments(Object.entries(groups),planFilter,'plan-filter','专项筛选')+
    '<details class="catalog-filters"'+(tierFilter||phaseFilter||dayFilter||weekFilter?' open':'')+'><summary>训练条件</summary><div class="fields">'+
    catalogSelect('tier-filter','适用水平',[['','全部水平'],...Object.entries(athleteTiers).filter(([key])=>key!=='unclassified')],tierFilter)+
    catalogSelect('phase-filter','训练阶段',[['','全部阶段'],...Object.entries(phases)],phaseFilter)+
    catalogSelect('day-filter','每周训练天数',[['','不限'],...[1,2,3,4,5].map(n=>[String(n),n+' 天'])],dayFilter)+
    catalogSelect('week-filter','周期周数',[['','不限'],...[1,2,3,4].map(n=>[String(n),n+' 周'])],weekFilter)+
    '</div></details><div id="catalog-results">'+planResults()+'</div></section>';
}
function planResults() {
  const favorites = data.planFavorites;
  const query = normalizeQuery(planSearch);
  const items = planCatalog.filter(({name,specialty,group,template,aliases})=>
    (planFilter==='all' || planFilter===group || (planFilter==='favorites' && favorites.includes(name))) &&
    (!query || normalizeQuery(name+' '+aliases+' '+specialty.focus).includes(query)) &&
    (!tierFilter || template.tiers.includes(tierFilter)) && (!phaseFilter || template.phases.includes(phaseFilter)) &&
    (!dayFilter || template.days.includes(Number(dayFilter))) && (!weekFilter || template.weeks.includes(Number(weekFilter))));
  return '<div class="catalog-toolbar"><span role="status">'+items.length+' 项计划</span>'+
    (comparePlans.length ? btn('比较已选（'+comparePlans.length+'）','compare-plans','','quiet') : '')+
    (items.length > 1 ? '<div class="catalog-scroll">'+btn('上一项','plan-scroll:-1','left','quiet')+btn('下一项','plan-scroll:1','right','quiet')+'</div>' : '')+'</div>'+
    (items.length ? '<div class="plan-carousel" aria-label="专项计划" tabindex="0">'+items.map(({name,specialty,group,index})=>
      '<article class="catalog-card"><button type="button" class="plan-cover cover-'+group+'" data-action="show-specialty:'+index+'"><small>'+
      groups[group]+'</small><strong>'+escape(name)+'</strong><span>'+escape(specialty.focus)+'</span></button><div class="catalog-actions">'+
      '<button type="button" class="btn quiet" data-action="plan-favorite:'+index+'" aria-pressed="'+favorites.includes(name)+'">收藏</button>'+
      '<button type="button" class="btn quiet" data-action="plan-compare:'+index+'" aria-pressed="'+comparePlans.includes(index)+'">比较</button></div></article>'
    ).join('')+'</div>' : '<p class="catalog-empty">没有符合条件的计划。</p>');
}
function refreshPlanResults(keepScroll = false) {
  const results=main.querySelector('#catalog-results');
  if (!results) return;
  const action=document.activeElement?.dataset.action;
  const position=keepScroll ? results.querySelector('.plan-carousel')?.scrollLeft : 0;
  results.innerHTML=planResults();
  if (position) results.querySelector('.plan-carousel')?.scrollTo({left:position,behavior:'instant'});
  for (const button of main.querySelectorAll('[data-action^="plan-filter:"]')) button.setAttribute('aria-pressed',String(button.dataset.action === 'plan-filter:'+planFilter));
  if (action) results.querySelector('[data-action="'+action+'"]')?.focus({preventScroll:true});
}
main.addEventListener('input',event=>{
  if (event.target.id==='course-search') {courseSearch=event.target.value;pbLibraryMode='single';refreshPBView();return;}
  if (event.target.id !== 'plan-search') return;
  planSearch=event.target.value;
  refreshPlanResults();
});
main.addEventListener('change',event=>{
  if (event.target.id==='course-phase') {coursePhase=event.target.value;refreshPBView();return;}
  if (event.target.id==='tier-filter') tierFilter=event.target.value;
  else if (event.target.id==='phase-filter') phaseFilter=event.target.value;
  else if (event.target.id==='day-filter') dayFilter=event.target.value;
  else if (event.target.id==='week-filter') weekFilter=event.target.value;
  else return;
  refreshPlanResults();
});
function togglePlanFavorite(index) {
  const entry=planCatalog[Number(index)];
  if (!entry) return;
  if (sample) return notify('返回个人模式后可以收藏。');
  if (commit(next=> {
    next.planFavorites=next.planFavorites.includes(entry.name) ? next.planFavorites.filter(name=>name!==entry.name) : [...next.planFavorites,entry.name];
  })) refreshPlanResults(true);
}
function togglePlanComparison(index) {
  const id=Number(index);
  if (!planCatalog[id]) return;
  if (comparePlans.includes(id)) comparePlans=comparePlans.filter(item=>item!==id);
  else if (comparePlans.length>=3) return notify('一次最多比较三项计划。');
  else comparePlans.push(id);
  refreshPlanResults(true);
}
function templateSummary(template) {
  return '<dl class="template-summary"><dt>适用水平</dt><dd>'+template.tiers.map(tier=>athleteTiers[tier]).join('、')+
    '</dd><dt>训练阶段</dt><dd>'+template.phases.map(phase=>phases[phase]).join('、')+
    '</dd><dt>周期及频率</dt><dd>'+template.weeks.join(' / ')+' 周 · 每周 '+template.days.join(' / ')+' 天'+
    '</dd><dt>负荷要求</dt><dd>'+template.load+'</dd><dt>恢复条件</dt><dd>'+template.recovery+'</dd><dt>适用限制</dt><dd>'+template.limits+'</dd></dl>';
}
function showComparison() {
  if (!comparePlans.length) return;
  modal('比较训练计划','<div class="comparison-list">'+comparePlans.map(id=>{
    const {name,template,specialty}=planCatalog[id];
    return '<section><h3>'+escape(name)+'</h3><p>'+escape(specialty.focus)+'</p>'+templateSummary(template)+'</section>';
  }).join('')+'</div>','sheet');
}
function showSpecialty([index]) {
  const entry=planCatalog[Number(index)];
  if (!entry) return;
  const {name,specialty,template}=entry;
  const quickIndex=quickEvents.findIndex(([event])=>event===name);
  modal(escape(name)+' · 专项计划','<div class="plan-detail-hero"><h3>'+escape(specialty.focus)+'</h3><p>'+escape(specialty.practice)+'</p></div>'+
    templateSummary(template)+
    '<h3>研究依据</h3>'+sourcesList(specialty.references)+(quickIndex>=0?'<div class="dialog-actions">'+btn('选训练组','group-setup:'+quickIndex,'','primary')+'</div>':''),'full');
}
function showWorkout([id]) {
  const plan=state().plans.find(item=>item.id===id);
  if (!plan) return;
  if (plan.course) return openPBWorkout({...plan.course,planId:plan.id},Math.round((Date.parse(plan.date)-Date.parse(day))/86400000));
  const fromEngine=plan.engineVersion===cycleVersion;
  const blocks=fromEngine ? plan.blocks || [['热身','先轻松热身，逐步进入运动状态。'],['主训练',plan.objective || plan.note],['冷身','放慢收尾，结束后记录体感。']] :
    [['课次说明',plan.note || '这节课没有记录分段说明。']];
  modal('课次详情','<div class="report-title"><h3>'+escape(plan.name)+'</h3><p>'+escape(plan.date+' · '+plan.type+(plan.completed?' · 已完成':''))+'</p></div>'+
    '<div class="mini-grid">'+metric('距离',plan.distance||'—','km')+metric('时长',plan.minutes||'—','min')+metric('配速',plan.pace||'—')+'</div>'+
    '<ol class="workout-blocks">'+blocks.map(([title,copy])=>'<li><details><summary>'+title+'</summary><p>'+escape(copy)+'</p></details></li>').join('')+'</ol>'+
    (fromEngine?sessionExplanation(plan):'')+'<div class="dialog-actions">'+btn(sample?'查看原始记录':'编辑课次','edit:plans:'+plan.id,'settings')+
    (!sample&&!plan.completed&&!trainingPaused(state())?btn('开始这节课','start:'+plan.id,'play','primary'):'')+'</div>','full');
}
function trainingPaused(s) {
  return courseReadiness(s,{adapted:true,quality:false},day,day).status==='paused';
}
function nutritionDateNav() {
  return '<div class="food-date-nav" data-swipe-day="food">'+btn('上一天','nutrition-date:-1','left','quiet')+'<strong>'+escape(fullDate(foodDate))+'</strong>'+
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
  const rows = Array.from({length:period},(_,i)=>({date:offset(day,i-period+1),distance:0,minutes:0,load:null,sleep:null,fatigue:null,meals:0}));
  const lookup = new Map(rows.map(row=>[row.date,row]));
  for (const run of s.runs) {
    const row=lookup.get(run.date);
    if (!row) continue;
    row.distance+=Number(run.distance)||0;
    row.minutes+=Number(run.minutes)||0;
    if (Number.isFinite(run.effort)&&run.effort>0) row.load=(row.load||0)+run.effort*(Number(run.minutes)||0);
  }
  for (const item of s.recovery) {
    const row=lookup.get(item.date);
    if (!row) continue;
    row.sleep=item.sleep ?? null;
    row.fatigue=item.fatigue ?? null;
  }
  for (const item of s.food) {
    const row=lookup.get(item.date);
    if (row) row.meals++;
  }
  return rows;
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
  const chart=present?interactiveTrend(rows,kind):'';
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
  try {localStorage.setItem(storagePrefix + '.theme',theme);}
  catch {notify('此浏览器无法保存主题，当前页面仍可预览。');}
  currentTheme=theme;
  render();
}
restoreWorkout();
render();

function interactiveTrend(rows,kind) {
  const [label,unit,value]=performanceFields[kind];
  const max=Math.max(1,...rows.map(row=>value(row) ?? 0));
  const active=rows.find(row=>row.date===detailDay) || [...rows].reverse().find(row=>Number.isFinite(value(row)));
  detailDay=active?.date || '';
  return '<div class="trend-plot" role="group" aria-label="'+label+'逐日趋势">'+rows.map(row=>{
    const v=value(row);
    const rendered=Number.isFinite(v)?(kind==='pace'?pace(row.distance,row.minutes):num(v))+' '+unit:'未记录';
    const description=fullDate(row.date)+' · '+rendered;
    return '<button type="button" class="trend-point" data-action="metric-point:'+row.date+'" data-value="'+escape(description)+
      '" aria-label="'+escape(description)+'" aria-pressed="'+(row.date===detailDay)+'"><i style="--point:'+Math.max(3,(v||0)*90/max)+'%"></i><small>'+
      Number(row.date.slice(8))+'</small></button>';
  }).join('')+'</div><p id="trend-reading" class="trend-reading" aria-live="polite">'+(active?escape(fullDate(active.date)+' · '+
    (kind==='pace'?pace(active.distance,active.minutes):num(value(active)))+' '+unit):'')+'</p>';
}
function updateTrendSelection() {
  const points=editor.querySelectorAll('.trend-point');
  for (const point of points) {
    const picked=point.dataset.action==='metric-point:'+detailDay;
    point.setAttribute('aria-pressed',String(picked));
    if (picked) editor.querySelector('#trend-reading').textContent=point.dataset.value;
  }
}

let dateGesture;
let sheetGesture;
let suppressDateClick = 0;
main.addEventListener('pointerdown',event=>{
  const zone=event.target.closest('[data-swipe-day]');
  if (!zone || event.button!==0 || !event.isPrimary) return;
  dateGesture={id:event.pointerId,x:event.clientX,y:event.clientY,zone};
});
main.addEventListener('pointercancel',()=>{dateGesture=undefined;});
window.addEventListener('pointerup',event=>{
  if (dateGesture?.id!==event.pointerId) return;
  const {zone,x,y}=dateGesture;
  dateGesture=undefined;
  if (!zone.isConnected) return;
  const dx=event.clientX-x;
  if (Math.abs(dx)<48 || Math.abs(dx)<Math.abs(event.clientY-y)*1.5) return;
  const direction=dx<0?1:-1;
  suppressDateClick=performance.now()+250;
  const kind=zone.dataset.swipeDay;
  if (kind==='course') {
    const index=Math.round((Date.parse(courseDate)-Date.parse(day))/86400000)+direction;
    actions['course-day']([index]);
  } else if (kind==='group') {
    const date=offset(trainingDate || day,direction);
    if (groupWeek(state(),day,state().groupPlan).some(plan=>plan.date===date)) actions['group-date']([date]);
  }
  else if (kind==='calendar') actions.date([offset(selectedDate,direction)]);
  else if (kind==='food' && offset(foodDate,direction)<=day) actions['nutrition-date']([direction]);
  const next=main.querySelector('[data-swipe-day="'+kind+'"]');
  if (next && !reducedMotion.matches) next.animate(
    [{transform:'translateX('+(direction*14)+'px)',opacity:0.78},{transform:'none',opacity:1}],{duration:210,easing:'ease-out'});
});
main.addEventListener('click',event=>{
  if (event.detail && performance.now()<suppressDateClick && event.target.closest('[data-swipe-day]')) {
    event.preventDefault();
    event.stopPropagation();
  }
},true);

editor.addEventListener('pointerdown',event=>{
  const handle=event.target.closest('.sheet-handle');
  if (!handle || event.button!==0 || !event.isPrimary) return;
  sheetGesture={id:event.pointerId,y:event.clientY,offset:0};
  handle.setPointerCapture(event.pointerId);
});
editor.addEventListener('pointermove',event=>{
  if (sheetGesture?.id!==event.pointerId) return;
  sheetGesture.offset=Math.max(0,event.clientY-sheetGesture.y);
  editor.style.transform='translateY('+sheetGesture.offset+'px)';
});
function settleSheet(event) {
  if (sheetGesture?.id!==event.pointerId) return;
  const distance=sheetGesture.offset;
  const dismiss=event.type==='pointerup' && distance>=Math.min(125,editor.clientHeight*0.26);
  sheetGesture=undefined;
  const from=editor.style.transform || 'none';
  editor.style.removeProperty('transform');
  if (reducedMotion.matches) {
    if (dismiss) editor.close();
    return;
  }
  const animation=editor.animate([{transform:from},{transform:dismiss?'translateY(100%)':'none'}],{duration:190,easing:'ease-out',fill:'forwards'});
  animation.onfinish=()=>{
    if (dismiss && editor.open) editor.close();
    animation.cancel();
  };
}
editor.addEventListener('pointerup',settleSheet);
editor.addEventListener('pointercancel',settleSheet);

const expandedWorkouts = new WeakMap();
document.addEventListener('click',event=>{
  const summary=event.target.closest('.workout-blocks summary,.course-expansion summary');
  if (!summary || reducedMotion.matches) return;
  const details=summary.parentElement;
  const content=summary.nextElementSibling;
  event.preventDefault();
  const previous=expandedWorkouts.get(details);
  const opening=previous?!previous.opening:!details.open;
  const height=details.open?content.getBoundingClientRect().height:0;
  previous?.animation.cancel();
  details.open=true;
  const animation=content.animate([{height:height+'px',opacity:height?1:0},{height:(opening?content.scrollHeight:0)+'px',opacity:opening?1:0}],{duration:210,easing:'ease-out',fill:'both'});
  expandedWorkouts.set(details,{animation,opening});
  animation.onfinish=()=>{
    details.open=opening;
    expandedWorkouts.delete(details);
    animation.cancel();
  };
});
