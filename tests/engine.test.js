import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, offset, readData } from '../public/model.js';
import { draftCycle, reviewCycle, specialties, cycleVersion, templateDetails, groupWeek, parseGroupPB, courseReadiness } from '../public/engine.js';
import { pbCourses } from '../public/pb-library.js';
import { evidence } from '../public/knowledge.js';

const today = '2026-11-07';
const profile = {event:'跑步入门',age:'18–39岁',level:'beginner',days:3,minutes:30,weeks:4,raceDate:'',risk:'clear'};
const generate = (data = fresh(), changes = {}) => draftCycle(data,today,{...profile,...changes});

test('PB parser applies the event format and accepts track hundredths',()=>{
  assert.equal(parseGroupPB('1500 m','4:20'),260);
  assert.equal(parseGroupPB('800 m','2：05.30'),125.3);
  assert.equal(parseGroupPB('5000 m','21:30'),1290);
  assert.equal(parseGroupPB('全程马拉松','3:45:00'),13500);
  assert.equal(parseGroupPB('1500 m','0:40'),null);
  assert.equal(parseGroupPB('越野跑','1:12:60'),null);
  assert.equal(parseGroupPB('半程马拉松','1:75:00'),null);
});

test('competitive group without logs browses complete courses, not a 15 minute fallback',()=>{
  const settings={event:'1500 m',group:'competitive',pb:'4:20',start:today};
  const week=groupWeek(fresh(),today,settings);
  assert.equal(week.length,7);
  assert.ok(week.some(plan=>plan.isPlanningSlot));
  assert.ok(pbCourses('1500 m','4:20').some(c=>c.executionEligible && c.segments.length));
  assert.ok(week.every(plan=>plan.previewOnly && plan.minutes===null && !plan.name.includes('走跑')));
  assert.ok(week.every(plan=>!plan.readiness.canStart));
  assert.equal(groupWeek(fresh(),offset(today,7),settings)[0].date,offset(today,7));
});

test('course structure is independent of app history; saved plans and pain remain respected',()=>{
  const data=experienced('1500 m');
  const settings={event:'1500 m',group:'competitive',pb:'4:20',start:today};
  const week=groupWeek(data,today,settings);
  assert.deepEqual(week.map(p=>p.segments),groupWeek(fresh(),today,settings).map(p=>p.segments));
  data.plans.push({id:'existing',date:today,type:'轻松跑',minutes:20});
  assert.equal(groupWeek(data,today,settings)[0].id,'existing');
  data.recovery.push({date:today,pain:true});
  data.plans=[];
  assert.ok(groupWeek(data,today,settings).every(plan=>plan.readiness.status==='paused'));
  assert.ok(groupWeek(data,today,settings).some(plan=>plan.isPlanningSlot));
});

test('execution gates known pain, recovery and youth intensity without hiding the library',()=>{
  const data=fresh(),course=pbCourses('800 m','2:20')[0];
  assert.equal(courseReadiness(data,course,today).canSchedule,true);
  assert.equal(courseReadiness(data,course,today).canStart,false);
  data.cycleProfile={background:'recovering',returnCleared:false};
  assert.equal(courseReadiness(data,course,today).status,'paused');
  data.cycleProfile={age:'未满18岁'};
  assert.equal(courseReadiness(data,course,today).status,'coach');
  const youth=pbCourses('800 m','2:20',{youth:true});
  assert.ok(youth.length>=14);
  assert.equal(courseReadiness(data,youth.find(c=>c.id==='speed-drills'),today).canSchedule,true);
  data.recovery=[{date:offset(today,-20),pain:true}];
  assert.equal(courseReadiness(data,youth[3],today).status,'paused');
});

test('quality course spacing uses external/manual logs and allows inspecting a saved course',()=>{
  const data=fresh(),course=pbCourses('1500 m','4:20')[0];
  data.runs.push({date:today,effort:8});
  assert.equal(courseReadiness(data,course,offset(today,1),today).status,'spacing');
  assert.equal(courseReadiness(data,course,offset(today,3),today).canSchedule,true);
  data.runs=[];
  data.plans.push({id:'saved',date:today,quality:true});
  assert.equal(courseReadiness(data,{...course,planId:'saved'},today).canSchedule,true);
});
test('competitive 800 m history without device imports never falls back to beginner walk/run', () => {
  const draft = generate(fresh(),{event:'800 m',level:'regular',background:'competitive',years:6,weeklyDays:4,recentKm:28,recentLongest:9,raceStarts:8,readiness:'ready'});
  assert.equal(draft.athlete?.tier,'competitive');
  assert.ok(draft.plans.length);
  assert.ok(draft.plans.every(plan => !plan.name.includes('走跑')));
});
function regular() {
  const data = fresh();
  data.goals = {...data.goals,weekly:11,days:3};
  data.runs = Array.from({length:12},(_,i) => ({date:offset(today,-3-i*2),distance:6,minutes:36,effort:3}));
  return data;
}

test('catalog entries are structured and every specialty has traceable references', () => {
  assert.equal(Object.keys(specialties).length,14);
  assert.equal(new Set(evidence.map(source => source.id)).size,evidence.length);
  for (const source of evidence) {
    for (const key of ['id','title','authors','organization','region','language','url','kind','level','population','events','principle','application','limits','reviewed','license']) assert.ok(source[key],key);
    assert.ok('year' in source);
    assert.equal(new URL(source.url).protocol,'https:');
  }
  for (const [name,specialty] of Object.entries(specialties)) {
    assert.ok(specialty.references.every(id => evidence.some(source => source.id === id)));
    for (const value of Object.values(templateDetails(name))) assert.ok(value.length,name);
  }
});

function experienced(event) {
  const data = fresh();
  data.runs = Array.from({length:26},(_,i)=>({
    date:offset(today,-i-4),distance:7,minutes:39,effort:i===2?6:3
  })).filter((_,i)=>i%7>=2);
  data.recovery = [{date:offset(today,-1),sleep:8,fatigue:2,pain:false}];
  data.records = [-35,-95].map(delta=>({date:offset(today,delta),event,seconds:event==='800 m'?126:event==='1500 m'?265:1100}));
  return data;
}
const racing = {level:'regular',background:'competitive',years:6,days:4,minutes:40,weeks:3,phase:'specific',readiness:'ready'};

test('A and B receive different plans, and a single fast result cannot set the level', () => {
  const novice = draftCycle(fresh(),today,{...profile,level:undefined,background:'auto',years:0});
  const casual = regular();
  casual.records = [{date:offset(today,-5),event:'5 km',seconds:980}];
  const base = draftCycle(casual,today,{...profile,event:'5000 m',level:undefined,background:'recreational',years:2,readiness:'ready'});
  assert.equal(novice.athlete.tier,'novice');
  assert.equal(base.athlete.tier,'base');
  assert.ok(novice.plans.length && base.plans.length);
  assert.ok(novice.plans.every(plan=>plan.name==='入门走跑' && plan.distance===null));
  assert.ok(base.plans.every(plan=>plan.type==='轻松跑' && plan.distance>0));
});

test('C and D can find distinct quality workouts within recent load and only in eligible phases', () => {
  for (const [event,record,work] of [
    ['800 m','800 m','4 × 15 秒'],['1500 m','1500 m','3 × 2 分钟'],
    ['5000 m','5 km','2 × 4 分钟'],['越野跑','Cross Country','4 × 45 秒']
  ]) {
    const data = experienced(record);
    const draft = generate(data,{...racing,event});
    assert.equal(draft.athlete.tier,'competitive',event);
    const hard = draft.plans.filter(plan=>plan.quality);
    assert.ok(hard.length >= 1,event);
    assert.ok(hard.every(plan=>plan.blocks[1][1].includes(work) && plan.date<=offset(today,10)),event);
    assert.ok(draft.plans.some(plan=>plan.type==='轻松跑'));
    assert.ok(draft.plans.every(plan=>plan.distance<=7 && plan.minutes<=39 && !plan.name.includes('走跑')));
    assert.ok(generate(data,{...racing,event,phase:'foundation'}).plans.every(plan=>!plan.quality));
  }
});

test('E stops all competitive sessions and needs explicit clearance even for cross-training', () => {
  const data = experienced('800 m');
  data.recovery.push({date:today,pain:true,fatigue:2});
  for (const risk of ['reported','clear']) {
    const draft = generate(data,{...racing,event:'800 m',risk});
    assert.equal(draft.athlete.tier,'recovering');
    assert.equal(draft.plans.length,0);
    assert.match(draft.reasons.join(' '),/专业评估/);
  }
  const cross = {...racing,event:'恢复与交叉训练',phase:'recovery',background:'recovering',weeks:1};
  assert.equal(generate(data,{...cross,returnCleared:true}).plans.length,0);
  const rested=experienced('800 m');
  assert.equal(generate(rested,cross).plans.length,0);
  const permitted=generate(rested,{...cross,returnCleared:true});
  assert.equal(permitted.plans.length,1);
  assert.equal(permitted.plans[0].type,'交叉训练');
});

test('professional status needs supporting signals, and unclear readiness cannot increase intensity', () => {
  const data=experienced('1500 m');
  const settings={...racing,event:'1500 m',background:'professional'};
  assert.equal(generate(data,settings).athlete.tier,'professional');
  const uncertain=generate(data,{...settings,readiness:'uncertain'});
  assert.equal(uncertain.athlete.tier,'competitive');
  assert.ok(uncertain.plans.length && uncertain.plans.every(plan=>!plan.quality));
  assert.equal(generate(fresh(),settings).plans.length,0);
  const advanced=generate({...data,records:[]},{...settings,background:'recreational'});
  assert.equal(advanced.athlete.tier,'advanced');
});
test('beginner with incomplete history gets time-based sessions and the draft is pure', () => {
  const data = fresh();
  const draft = generate(data);
  assert.equal(draft.weeks.length,4);
  assert.equal(draft.plans.length,8);
  assert.ok(draft.plans.every(session => session.minutes <= 15 && session.distance === null));
  assert.match(draft.reasons.join(' '),/没有恢复记录/);
  assert.deepEqual(data,fresh());
});
test('regular 800 m and marathon runners receive different objectives within the same verified load', () => {
  const data = regular();
  const middle = generate(data,{event:'800 m',level:'regular'});
  const marathon = generate(data,{event:'全程马拉松',level:'regular'});
  const objective = result => result.plans.find(plan => plan.phase === '专项基础').objective;
  assert.notEqual(objective(middle),objective(marathon));
  for (const result of [middle,marathon]) {
    assert.ok(result.plans.every(plan => plan.distance <= 6 && plan.type === '轻松跑' && plan.rationale));
    for (const week of result.weeks) {
      assert.ok(result.plans.filter(plan => plan.date >= week.start && plan.date <= week.end).reduce((total,plan) => total + plan.distance,0) <= 11);
    }
  }
  assert.ok(middle.plans.at(-1).minutes < middle.plans[0].minutes);
});
test('limited time, busy dates and existing runs constrain the schedule', () => {
  const data = regular();
  data.events = [{date:today}];
  data.plans = [{date:offset(today,3),type:'轻松跑',distance:4}];
  const draft = generate(data,{event:'越野跑',level:'regular',days:2,minutes:9,weeks:1});
  assert.ok(draft.plans.length <= 1);
  assert.ok(draft.plans.every(plan => plan.minutes <= 9 && ![today,offset(today,2),offset(today,3),offset(today,4)].includes(plan.date)));
});
test('youth and undisclosed age never receive adult distances or more than one session per week', () => {
  for (const age of ['未满18岁','未提供']) {
    const draft = generate(regular(),{age,level:'regular',event:'全程马拉松'});
    assert.ok(draft.weeks.every(week => week.count <= 1));
    assert.ok(draft.plans.every(plan => plan.distance === null && plan.minutes <= 12));
    assert.ok(draft.sources.includes('ioc-youth') && draft.sources.includes('youth-running'));
  }
});
test('pending recovery, recent pain, unknown status and high fatigue pause generation', () => {
  assert.match(generate(fresh(),{risk:'reported'}).reasons[0],/专业评估/);
  assert.equal(generate(fresh(),{risk:'unknown'}).plans.length,0);
  const data = regular();
  data.recovery = [{date:offset(today,-6),pain:true},{date:today,pain:false}];
  assert.equal(generate(data).plans.length,0);
  data.recovery = [{date:today,fatigue:5}];
  assert.equal(generate(data).plans.length,0);
});
test('short sleep, hard training and high fatigue shrink the proposed workload', () => {
  for (const signal of ['sleep','effort','fatigue']) {
    const data = regular();
    if (signal === 'sleep') data.recovery = [-1,-2,-3].map(delta => ({date:offset(today,delta),sleep:5}));
    if (signal === 'effort') data.runs.push({date:offset(today,-2),effort:8,distance:4,minutes:25});
    if (signal === 'fatigue') data.recovery = [{date:today,fatigue:4}];
    const result = generate(data,{level:'regular'});
    assert.ok(result.plans.length);
    assert.ok(result.weeks.every(week => week.count <= 1));
    assert.ok(result.plans.every(plan => plan.minutes <= 12));
  }
});
test('upcoming race stops the race week and excludes post-race scheduling', () => {
  assert.equal(generate(regular(),{raceDate:offset(today,6)}).plans.length,0);
  const draft = generate(regular(),{raceDate:offset(today,10),level:'regular'});
  assert.equal(draft.weeks.length,2);
  assert.equal(draft.weeks[1].phase,'赛前保留');
  assert.ok(draft.plans.every(plan => plan.date < draft.weeks[1].start));
  assert.equal(generate(regular(),{raceDate:'2026-11-31'}).plans.length,0);
});
test('existing unknown load prevents added mileage and review reports changed conditions', () => {
  const data = regular();
  data.plans = [{date:offset(today,2),engineVersion:cycleVersion,type:'轻松跑',distance:null}];
  assert.equal(generate(data,{level:'regular',weeks:1}).plans.length,0);
  data.plans.push({date:offset(today,-2),completed:false,engineVersion:cycleVersion});
  data.events.push({date:offset(today,2)});
  data.goals.raceDate = offset(today,1);
  const review = reviewCycle(data,today);
  assert.equal(review.future.length,1);
  assert.match(review.reasons.join(' '),/0 \/ 1/);
  assert.match(review.reasons.join(' '),/同一天/);
  assert.match(review.reasons.join(' '),/比赛日期/);
});
test('v1 logs remain readable without new cycle fields', () => {
  const old = fresh();
  delete old.cycles;
  delete old.cycleAudit;
  delete old.cycleProfile;
  assert.deepEqual(readData(JSON.stringify(old)),fresh());
});
