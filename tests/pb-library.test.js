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
    assert.deepEqual(courses.map(x=>x.id),['interval','endurance','tempo','speed','combination','aerobic','hills']);
    assert.ok(courses.every(x=>Array.isArray(x.blocks) && x.blocks.length===3));
    assert.ok(courses.every(x=>x.review.status==='pending' && x.review.reviewer===null && x.sources.every(s=>s.rule&&s.limit&&s.url)));
  }
});
test('PB bands change applicability and recovery guidance, never mechanically add work',()=>{
  const slower=pbCourses('800 m','3:00');
  const faster=pbCourses('800 m','1:45');
  assert.notEqual(slower[0].applicablePB,faster[0].applicablePB);
  assert.notEqual(slower[4].setRecovery,faster[4].setRecovery);
  assert.notEqual(slower[4].segments[0].recoverySeconds,faster[4].segments[0].recoverySeconds);
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
  assert.ok(advanced.some(x=>x.id==='interval'));
  assert.ok(advanced.some(x=>x.id==='combination'));
  assert.notDeepEqual(beginner.map(x=>x.id),advanced.map(x=>x.id));
  for (const event of pbDistances) for (const phase of ['base','develop','prepare','recover']) {
    const week=pbWeek(event,pbOptions(event).at(-1).seconds,{phase});
    const hard=week.filter(c=>c.quality);
    assert.ok(hard.length<=2);
    if (hard.length===2) assert.ok(hard[1].dayIndex-hard[0].dayIndex>=3);
    if (phase==='recover') assert.equal(hard.length,0);
  }
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
