import { normalizeHealthWorkout } from '../native/health-data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { captureBatch, elapsedMs, initialSession, transition } from '../native/session.js';
import { createRunStore } from '../native/run-store.js';

function setup() {
  const sql=new DatabaseSync(':memory:');
  const connection={
    execAsync:async statement=>sql.exec(statement),
    runAsync:async (statement,...values)=>{const result=sql.prepare(statement).run(...values);return {...result,lastInsertRowId:Number(result.lastInsertRowid)};},
    getFirstAsync:async (statement,...values)=>sql.prepare(statement).get(...values),
    getAllAsync:async (statement,...values)=>sql.prepare(statement).all(...values),
    async withExclusiveTransactionAsync(work) {
      sql.exec('BEGIN IMMEDIATE');
      try {await work(connection);sql.exec('COMMIT');}
      catch (error) {sql.exec('ROLLBACK');throw error;}
    }
  };
  return {connection,sql,store:createRunStore(async()=>connection)};
}
const location=(timestamp,longitude,accuracy=5)=>({timestamp,coords:{latitude:0,longitude,accuracy,altitude:null,altitudeAccuracy:null}});
test('native pause and resume exclude paused time and never bridge pre-resume fixes',()=>{
  let session=transition(initialSession(1000),'resume',1000);
  session=transition(session,'pause',7000);
  assert.equal(elapsedMs(session,20000),6000);
  session=transition(session,'resume',21000);
  const batch=captureBatch(session,null,[location(12000,0),location(24000,.0002),location(23000,.0001),location(25000,.5,60)],26000,10);
  assert.deepEqual(batch.points.map(p=>[p.t,p.segment]),[[23000,1],[24000,1]]);
  assert.equal(elapsedMs(transition(batch.session,'finish',27000),90000),12000);
});
test('interruption after a cold launch counts only time through last usable fix',()=>{
  const running=transition(initialSession(1000),'resume',1000);
  const {session}=captureBatch(running,null,[location(5000,0)],6000,10);
  const restored=transition(session,'interrupted',60000);
  assert.equal(restored.elapsed,4000);
  assert.equal(restored.reason,'interrupted');
  assert.equal(restored.phase,'paused');
  assert.equal(transition(running,'location-error',60000).elapsed,0);
});
test('durable store recovers a draft across reopen, saves once and removes private samples when deleted',async()=>{
  const {store,sql,connection}=setup();
  const draft=await store.create(1000,'ios-background-gps');
  await assert.rejects(store.create(1001,'ios-background-gps'),/草稿/);
  await store.change('resume',1000,draft.id);
  await store.append([location(1000,0),location(8000,.00016)],8000);
  const reopened=createRunStore(async()=>connection);
  assert.equal((await reopened.snapshot()).points.length,2);
  await reopened.change('interrupted',30000,draft.id);
  await reopened.change('finish',30000,draft.id);
  const summary=await reopened.save(draft.id);
  assert.equal(summary.elapsed,7000);
  assert.ok(summary.distance>.01);
  await assert.rejects(reopened.save(draft.id),/没有可保存/);
  assert.equal((await reopened.readSaved(draft.id)).source,'ios-background-gps');
  await reopened.deleteSaved(draft.id);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM samples').get().n,0);
  assert.equal((await reopened.snapshot()).history.length,0);
  assert.notEqual((await reopened.create(40000,'ios-background-gps')).id,draft.id);
  sql.close();
});
test('discard only applies to stopped drafts and late batches do not alter a paused run',async()=>{
  const {store,sql}=setup();
  const draft=await store.create(1000,'ios-background-gps');
  await store.change('resume',1000,draft.id);
  await assert.rejects(store.discard(draft.id),/暂停/);
  await store.change('pause',3000,draft.id);
  assert.equal(await store.append([location(2000,0)],5000),null);
  assert.equal((await store.snapshot()).points.length,0);
  await store.change('finish',5000,draft.id);
  await assert.rejects(store.save(draft.id),/至少/);
  await store.discard(draft.id);
  assert.equal((await store.snapshot()).session,null);
  sql.close();
});

test('HealthKit normalization uses explicit units and retains provider identity',()=>{
  const sample={uuid:'watch-1',startDate:new Date(1000),endDate:new Date(20000),
    duration:{quantity:0.25,unit:'min'},totalDistance:{quantity:0.02,unit:'mi'},
    sourceRevision:{source:{name:'Watch',bundleIdentifier:'example.watch'}}};
  const item=normalizeHealthWorkout(sample);
  assert.equal(item.elapsed,15000);
  assert.ok(Math.abs(item.distance-.03218688)<1e-8);
  assert.equal(item.sourceName,'Watch');
  assert.equal(item.sourceBundle,'example.watch');
  assert.equal(normalizeHealthWorkout({...sample,endDate:'invalid'}),null);
  assert.equal(normalizeHealthWorkout({...sample,totalDistance:{quantity:20,unit:'unknown'}}),null);
});
test('HealthKit imports are idempotent and richer native GPS supersedes an equivalent import',async()=>{
  const {store,sql}=setup();
  const watch={externalId:'watch-1',started:1000,distance:.018,elapsed:7000,climb:null,splits:[]};
  assert.deepEqual(await store.importHealth([watch,watch],20000),{added:1,skipped:1});
  const session=await store.create(1000,'ios-background-gps');
  await assert.rejects(store.importHealth([watch],20000),/草稿/);
  await store.change('resume',1000,session.id);
  await store.append([location(1000,0),location(8000,.00016)],8000);
  await store.change('finish',8000,session.id);
  assert.equal((await store.save(session.id)).externalId,'watch-1');
  assert.deepEqual(await store.importHealth([watch],30000),{added:0,skipped:1});
  const saved=(await store.snapshot()).history;
  assert.equal(saved.length,1);
  assert.equal(saved[0].source,'ios-background-gps');
  sql.close();
});
