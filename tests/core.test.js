import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, offset, week, pace, conflicts, readData, insight, demo } from '../public/model.js';
import { draftTraining, evidence } from '../public/engine.js';

const day = '2026-11-07';

test('weekly aggregation uses local dates and includes Monday and Sunday', () => {
  const runs = [
    {date:'2026-11-01',distance:20}, {date:'2026-11-02',distance:6,minutes:36},
    {date:'2026-11-08',distance:4,minutes:28}, {date:'2026-11-09',distance:9}
  ];
  const result = week(runs,day);
  assert.equal(result[0].date,'2026-11-02');
  assert.equal(result[6].distance,4);
  assert.equal(result.reduce((sum, item) => sum + item.distance,0),10);
  assert.equal(pace(10,64),'6:24');
  assert.equal(pace(1,5.999),'6:00');
  assert.equal(pace(0,64),'—');
});
test('events conflict only on the same day with a real overlap', () => {
  const item = {id:'one',date:day,start:'08:00',end:'09:00'};
  const events = [item,{id:'two',date:day,start:'08:59',end:'09:30'},{id:'three',date:day,start:'09:00',end:'10:00'},{id:'four',date:offset(day,1),start:'08:30',end:'09:30'}];
  assert.deepEqual(conflicts(item,events).map(event => event.id),['two']);
});
test('real and demonstration data are separate and invalid storage is rejected', () => {
  assert.equal(readData(null).runs.length,0);
  assert.ok(demo(day).runs.length);
  assert.throws(() => readData('{"version":0}'));
  assert.throws(() => readData('{"version":1,"runs":[null]}'));
  assert.match(insight(fresh(),day)[0],/第一条/);
});
test('a beginner draft avoids busy dates, spaces sessions and changes no state', () => {
  const data = fresh();
  data.events = [{date:day},{date:offset(day,2)}];
  const original = structuredClone(data);
  const draft = draftTraining(data,day,'beginner');
  assert.deepEqual(draft.plans.map(plan => plan.date),[offset(day,1),offset(day,3)]);
  assert.ok(draft.plans.every(plan => plan.distance === null && plan.minutes === 12));
  assert.deepEqual(data,original);
  assert.ok(draft.sources.every(id => evidence.some(source => source.id === id)));
});
test('recent pain, highest fatigue and an imminent race suppress automatic plans', () => {
  const data = fresh();
  data.recovery = [{date:offset(day,-2),fatigue:2,pain:true}];
  assert.equal(draftTraining(data,day,'beginner').plans.length,0);
  data.recovery = [{date:day,fatigue:5,pain:false}];
  assert.equal(draftTraining(data,day,'regular').plans.length,0);
  data.recovery = [];
  data.goals.raceDate = offset(day,6);
  assert.equal(draftTraining(data,day,'regular').plans.length,0);
});
test('trained draft respects the real baseline and reduces sessions with fatigue', () => {
  const data = fresh();
  data.goals = {...data.goals,weekly:6,days:3};
  data.runs = [-4,-8,-12,-17,-22,-26].map(delta => ({date:offset(day,delta),distance:7}));
  const regular = draftTraining(data,day,'regular');
  assert.equal(regular.plans.length,3);
  assert.ok(regular.plans.reduce((total,plan) => total + plan.distance,0) <= 6);
  data.recovery = [{date:day,fatigue:4}];
  assert.equal(draftTraining(data,day,'regular').plans.length,1);
  data.plans = regular.plans;
  assert.equal(draftTraining(data,day,'regular').plans.length,0);
});
