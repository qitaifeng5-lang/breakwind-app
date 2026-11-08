import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, offset, readData } from '../public/model.js';
import { draftCycle, reviewCycle, specialties, cycleVersion } from '../public/engine.js';
import { evidence } from '../public/knowledge.js';

const today = '2026-11-07';
const profile = {event:'跑步入门',age:'18–39岁',level:'beginner',days:3,minutes:30,weeks:4,raceDate:'',risk:'clear'};
const generate = (data = fresh(), changes = {}) => draftCycle(data,today,{...profile,...changes});
function regular() {
  const data = fresh();
  data.goals = {...data.goals,weekly:11,days:3};
  data.runs = Array.from({length:12},(_,i) => ({date:offset(today,-3-i*2),distance:6,minutes:36,effort:3}));
  return data;
}

test('catalog entries are structured and every specialty has traceable references', () => {
  assert.equal(Object.keys(specialties).length,9);
  assert.equal(new Set(evidence.map(source => source.id)).size,evidence.length);
  for (const source of evidence) {
    for (const key of ['id','title','authors','organization','region','language','url','kind','level','population','events','principle','application','limits','reviewed','license']) assert.ok(source[key],key);
    assert.ok('year' in source);
    assert.equal(new URL(source.url).protocol,'https:');
  }
  for (const specialty of Object.values(specialties)) assert.ok(specialty.references.every(id => evidence.some(source => source.id === id)));
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
