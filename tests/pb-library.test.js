import test from 'node:test';
import assert from 'node:assert/strict';
import {pbDistances,pbOptions,matchPB,pbCourses,pbWeek,pbSeconds,formatPB} from '../public/pb-library.js';

test('800m PB options cover 3:00 through 1:45 at 5-second intervals',()=>{
  const items=pbOptions('800 m');
  assert.equal(items.length,16);
  assert.equal(items[0].label,'3:00');
  assert.equal(items.at(-1).label,'1:45');
  assert.deepEqual(items.filter(item=>['2:30','2:25','2:20'].includes(item.label)).map(item=>item.label),['2:30','2:25','2:20']);
  assert.ok(items.every((item,i)=>!i||items[i-1].seconds-item.seconds===5));
});
test('1500m PB options cover 6:00 through 3:30 at 10-second intervals',()=>{
  const items=pbOptions('1500 m');
  assert.equal(items.length,16);
  assert.equal(items[0].label,'6:00');
  assert.deepEqual(items.slice(0,3).map(item=>item.label),['6:00','5:50','5:40']);
  assert.equal(items.at(-1).label,'3:30');
});
test('all supported events have ordered PB ladders and distinct session categories',()=>{
  for(const event of pbDistances) {
    const options=pbOptions(event);
    assert.ok(options.length>=8,event);
    assert.ok(options.every((p,i)=>!i||p.seconds<options[i-1].seconds),event);
    const courses=pbCourses(event,options[3].seconds);
    assert.deepEqual([...new Set(courses.map(x=>x.categoryId))],['interval','endurance','tempo','speed','combination','aerobic','hills']);
    assert.ok(courses.every(x=>Array.isArray(x.blocks) && x.blocks.length===3));
    assert.ok(courses.every(x=>x.review.status==='pending' && x.review.reviewer===null && x.sources.every(s=>s.rule&&s.limit&&s.url)));
  }
});
test('PB bands change browsing applicability, never dose or recovery',()=>{
  const slower=pbCourses('800 m','3:00');
  const faster=pbCourses('800 m','1:45');
  assert.notEqual(slower[0].applicablePB,faster[0].applicablePB);
  assert.equal(slower[4].setRecovery,faster[4].setRecovery);
  assert.equal(slower[4].segments[0].recoverySeconds,faster[4].segments[0].recoverySeconds);
  assert.equal(slower[0].segments[0].repeats,faster[0].segments[0].repeats);
  assert.notEqual(pbCourses('800 m','2:20')[0].main,pbCourses('1500 m','4:20')[0].main);
});
test('weekly templates contain recovery and progressively different learning structures',()=>{
  const beginner=pbWeek('800 m','3:00');
  const advanced=pbWeek('800 m','2:00');
  assert.equal(beginner.length,7);
  assert.equal(advanced.length,7);
  assert.equal(beginner[0].dayLabel,'周一');
  assert.ok(beginner.some(x=>x.id==='rest'));
  assert.ok(advanced.some(x=>x.isPlanningSlot));
  assert.ok(!advanced.some(x=>x.id==='combination'));
  assert.deepEqual(beginner.map(x=>x.id),advanced.map(x=>x.id),'Faster PB does not add quality sessions');
  for (const event of pbDistances) for (const phase of ['base','develop','prepare','recover']) {
    const week=pbWeek(event,pbOptions(event).at(-1).seconds,{phase});
    const hard=week.filter(c=>c.quality);
    assert.ok(hard.length<=2);
    if (hard.length===2) assert.ok(hard[1].dayIndex-hard[0].dayIndex>=3);
    if (phase==='recover') assert.equal(hard.length,0);
  }
});

test('middle-distance categories offer different purposes and structures without PB volume escalation',()=>{
  for (const event of ['800 m','1500 m']) {
    const slow=pbCourses(event,pbOptions(event)[0].seconds),fast=pbCourses(event,pbOptions(event).at(-1).seconds);
    for (const category of new Set(slow.map(c=>c.categoryId))) {
      const choices=slow.filter(c=>c.categoryId===category);
      assert.ok(choices.length>=2);
      assert.notEqual(choices[0].objective,choices[1].objective);
      assert.notEqual(choices[0].main,choices[1].main);
    }
    for (const course of slow) {
      const other=fast.find(c=>c.id===course.id);
      assert.equal(course.sets,other.sets);
      assert.deepEqual(course.segments.map(s=>[s.distance,s.repeats]),other.segments.map(s=>[s.distance,s.repeats]));
    }
    const phases=['base','develop','prepare','recover'].map(phase=>pbWeek(event,'2:00',{phase}));
    assert.equal(new Set(phases.map(w=>w.map(c=>c.id).join(','))).size,4);
    assert.ok(phases.every(w=>w.every(c=>c.weekPurpose && c.review.status==='pending')));
    assert.ok(phases.every(w=>w.filter(c=>c.quality).length<=1),'Draft contains at most one authored main session, not a full plan');
  }
  assert.notDeepEqual(pbWeek('800 m','2:00').map(c=>c.id),pbWeek('1500 m','4:00').map(c=>c.id));
  assert.match(pbWeek('全程马拉松','3:00:00')[0].coverage,/尚非完整专项/);
});
test('nearest PB matching handles intermediate and invalid values',()=>{
  assert.equal(matchPB('800 m','2:28')?.label,'2:30');
  assert.equal(matchPB('800 m','not a time'),null);
  assert.equal(matchPB('unknown','2:30'),null);
  assert.equal(pbSeconds('4:99'),null);
  assert.equal(pbSeconds('2:05.30'),125.3);
  assert.equal(formatPB(125.3,{fraction:true}),'2:05.30');
  assert.equal(formatPB(5400,{hours:true}),'1:30:00');
});
