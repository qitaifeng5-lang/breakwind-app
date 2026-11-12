import test from 'node:test';
import assert from 'node:assert/strict';
import {pbCourses} from '../public/pb-library.js';
import {courseStatistics,workoutDetail} from '../public/workout-detail.js';
test('reference-layout Tempo metrics use the actual prescription, not numbers from the image',()=>{
 const course=pbCourses('1500 m',270,{group:'base'}).find(c=>c.id==='tempo'),before=structuredClone(course),stats=Object.fromEntries(courseStatistics(course));
 assert.equal(stats['主训练'],'15 分钟');assert.equal(stats['趟间 / 组间恢复'],'2 / 0 次');assert.equal(stats['累计恢复'],'2 分钟');assert.match(stats['预计全程'],/待估/);assert.deepEqual(course,before);
 const html=workoutDetail({title:course.name,stats:Object.entries(stats)});assert.doesNotMatch(html,/6–8|85–90|3:45|1500m.*\+10/);
});
