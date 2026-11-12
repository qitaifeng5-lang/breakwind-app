import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStructure,readStructure,structureSummary,structureSegments} from '../public/training-structure.js';
import {courseStructure,courseMap} from '../public/training-workbench.js';
import {compileWorkout,workoutTotals} from '../public/workout.js';
const rest={mode:'walk',seconds:60,distanceM:null};
test('course visualization preserves executable Tempo and combination snapshots and recovery ordering',()=>{
 const recovery={mode:'walk',durationSeconds:60,endRule:'time'};
 // Arithmetic fixtures, not recommended training prescriptions.
 const specs=[{setCount:1,repetitions:[{durationSeconds:300,repsPerSet:3,target:{targetBasis:'threshold',effort:'已校准 Tempo'},repRecovery:recovery}]},{setCount:2,setRecovery:{...recovery,durationSeconds:180},repetitions:[{distanceM:200,repsPerSet:1,target:{targetBasis:'1500',targetSecondsRange:[38,40]},repRecovery:recovery},{distanceM:150,repsPerSet:1,target:{targetBasis:'800',targetSecondsRange:[24,25]},repRecovery:recovery}]}];
 for(const spec of specs){spec.warmup=[{label:'动态准备'}];spec.cooldown=[{label:'放松整理'}];const source=structuredClone(spec),course={executionSpec:spec};const s=courseStructure(course),timeline=structureSegments(s),compiled=compileWorkout(spec);assert.deepEqual(timeline.map(x=>x.kind),compiled.map(x=>x.kind));assert.equal(structureSummary(s).mainDistanceM,workoutTotals(spec).mainDistanceM||null);assert.ok(!courseMap(course).includes('undefined'));assert.deepEqual(spec,source);}
 const mixed=structuredClone(specs[1]);mixed.setRecovery={mode:'mixed',steps:[recovery,{mode:'jog',distanceM:100,endRule:'distance'}]};assert.match(courseMap({executionSpec:mixed}),/步行 · 60秒 → 慢跑 · 100m/);
 const skill={sets:1,segments:[{unit:'skill',distance:0,repeats:1,description:'动态协调与跑姿，按动作质量结束'}]};const mapped=courseStructure(skill);assert.equal(structureSegments(mapped)[1].kind,'work');assert.match(courseMap(skill),/动态协调与跑姿/);assert.match(courseMap(skill),/动作质量优先/);assert.equal(structureSummary(mapped).mainDistanceM,null);
});
test('authored combination sequence interleaves recovery once and totals all sets',()=>{
 const s=emptyStructure();s.sets=2;s.parts=[{id:'a',repeats:3,amount:200,unit:'m',target:'1500m 配速',recovery:rest},{id:'b',repeats:1,amount:150,unit:'m',target:'800m 配速',recovery:rest}];s.setRecovery={...rest,seconds:180};
 assert.deepEqual(readStructure(s),s);const t=structureSummary(s),steps=structureSegments(s);assert.equal(t.reps,8);assert.equal(t.mainDistanceM,1500);assert.equal(t.restCount,6);assert.equal(t.setRestCount,1);assert.equal(t.gaps.length,0);assert.equal(steps.filter(x=>x.kind==='recovery').length,7);assert.equal(steps.at(-2).kind,'work');assert.equal(steps.at(-1).kind,'cooldown');
});
test('Tempo duration never manufactures a pace, whole-session duration or measured distance',()=>{
 const s=emptyStructure();s.parts[0]={...s.parts[0],repeats:3,amount:5,unit:'min',target:'Tempo，已有校准',recovery:rest};const t=structureSummary(s);assert.equal(t.mainSeconds,900);assert.equal(t.mainDistanceM,null);assert.equal(t.reps,3);assert.match(structureSegments(s)[1].detail,/已有校准/);assert.ok(!('estimatedSeconds' in t));
});
test('invalid edits can remain a private draft, but cannot be saved as validated structure',()=>{
 const s=emptyStructure();s.sets=0;s.parts[0].repeats=0;assert.throws(()=>readStructure(s),/大组数/);assert.equal(readStructure(s,{draft:true}).parts[0].repeats,0);s.sets=1;s.parts[0].repeats=1;s.parts[0].recovery={mode:'stand',seconds:60,distanceM:100};assert.throws(()=>readStructure(s),/恢复/);
});
test('source objects remain immutable and incomplete authored inputs stay visibly unresolved',()=>{
 const s=emptyStructure(),before=structuredClone(s);const copy=readStructure(s);copy.parts[0].amount=200;assert.deepEqual(s,before);assert.ok(structureSummary(s).gaps.includes('第1段距离／时长待补'));s.parts.push({...s.parts[0]});assert.throws(()=>readStructure(s),/距离／时长/);
});
