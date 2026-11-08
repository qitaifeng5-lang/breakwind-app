import test from 'node:test';
import assert from 'node:assert/strict';
import {pbDistances,pbOptions,matchPB,pbCourses,pbWeek} from '../public/pb-library.js';

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
    assert.deepEqual(courses.map(x=>x.id),['interval','speed-endurance','tempo','speed','combination','aerobic']);
    assert.ok(courses.every(x=>Array.isArray(x.blocks) && x.blocks.length===3));
  }
});
test('different 800m PB tiers change actual course structure, not just the heading',()=>{
  const slower=pbCourses('800 m','3:00');
  const middle=pbCourses('800 m','2:30');
  const next=pbCourses('800 m','2:25');
  const faster=pbCourses('800 m','1:45');
  assert.notEqual(slower[0].main,middle[0].main);
  assert.notEqual(middle[0].main,next[0].main);
  assert.notEqual(next[0].main,faster[0].main);
  assert.notEqual(slower[1].main,faster[1].main);
});
test('weekly templates contain recovery and progressively different learning structures',()=>{
  const beginner=pbWeek('800 m','3:00');
  const advanced=pbWeek('800 m','2:20');
  assert.equal(beginner.length,7);
  assert.equal(advanced.length,7);
  assert.equal(beginner[0].dayLabel,'周一');
  assert.ok(beginner.some(x=>x.id==='rest'));
  assert.ok(advanced.some(x=>x.id==='interval'));
  assert.ok(advanced.some(x=>x.id==='tempo'));
  assert.notDeepEqual(beginner.map(x=>x.id),advanced.map(x=>x.id));
});
test('nearest PB matching handles intermediate and invalid values',()=>{
  assert.equal(matchPB('800 m','2:28')?.label,'2:30');
  assert.equal(matchPB('800 m','not a time'),null);
  assert.equal(matchPB('unknown','2:30'),null);
});
