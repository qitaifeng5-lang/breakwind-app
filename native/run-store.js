import { likelyDuplicate } from '../public/running.js';
import { captureBatch, initialSession, runSummary, transition } from './session.js';

export const maxSamples = 24000;

const schema = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started INTEGER NOT NULL,
    phase TEXT NOT NULL CHECK(phase IN ('paused','running','finished','saved')),
    state TEXT NOT NULL,
    source TEXT NOT NULL,
    summary TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS single_draft ON workouts((1)) WHERE phase <> 'saved';
  CREATE TABLE IF NOT EXISTS samples (
    workout INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    t INTEGER NOT NULL,
    point TEXT NOT NULL,
    PRIMARY KEY(workout,t)
  );
`;

const active = async db => {
  const row = await db.getFirstAsync("SELECT id,state,source FROM workouts WHERE phase <> 'saved'");
  return row ? {id:row.id,source:row.source,...JSON.parse(row.state)} : null;
};
const readPoints = async (db,id) => (await db.getAllAsync('SELECT point FROM samples WHERE workout=? ORDER BY t',id)).map(row=>JSON.parse(row.point));
const comparisonRun = run=>({distance:run.distance,minutes:run.elapsed/60000,startedAt:run.started});
const update = (db,session) => db.runAsync('UPDATE workouts SET phase=?, state=? WHERE id=?',session.phase,JSON.stringify(session),session.id);

export function createRunStore(openDatabase) {
  let database;
  const open = () => database ??= openDatabase().then(async db=>{
    await db.execAsync(schema);
    return db;
  }).catch(error=>{database=undefined;throw error;});
  let tail = Promise.resolve();
  function transaction(work) {
    const operation = tail.then(async()=>{
      const db = await open();
      let value;
      for (let attempt=0;attempt<5;attempt++) {
        try {
          await db.withExclusiveTransactionAsync(async tx=>{
            value = await work(tx);
          });
          return value;
        } catch (error) {
          if (!/SQLITE_BUSY|database is locked/i.test(error.message) || attempt===4) throw error;
          await new Promise(resolve=>setTimeout(resolve,50*(attempt+1)));
        }
      }
    });
    tail = operation.catch(()=>{});
    return operation;
  }
  return {
    snapshot:() => transaction(async db=>{
      const session = await active(db);
      const history = (await db.getAllAsync("SELECT id,started,source,summary FROM workouts WHERE phase='saved' ORDER BY started DESC,id DESC LIMIT 100"))
        .map(row=>({...row,...JSON.parse(row.summary)}));
      return {session,points:session?await readPoints(db,session.id):[],history};
    }),
    create:(now,source) => transaction(async db=>{
      if (await active(db)) throw new Error('请先处理现有跑步草稿。');
      const session=initialSession(now);
      const result=await db.runAsync('INSERT INTO workouts(started,phase,state,source) VALUES (?,?,?,?)',now,session.phase,JSON.stringify(session),source);
      return {id:result.lastInsertRowId,source,...session};
    }),
    change:(event,now,expected) => transaction(async db=>{
      const session=await active(db);
      if (!session || (expected != null && session.id!==expected)) return null;
      const next=transition(session,event,now);
      if (next!==session) await update(db,next);
      return next;
    }),
    append:(locations,now) => transaction(async db=>{
      const session=await active(db);
      if (session?.phase!=='running') return null;
      const row=await db.getFirstAsync('SELECT point FROM samples WHERE workout=? ORDER BY t DESC LIMIT 1',session.id);
      const count=await db.getFirstAsync('SELECT count(*) AS total FROM samples WHERE workout=?',session.id);
      const batch=captureBatch(session,row?JSON.parse(row.point):null,locations,now,maxSamples-count.total);
      for (const point of batch.points) await db.runAsync('INSERT OR IGNORE INTO samples(workout,t,point) VALUES (?,?,?)',session.id,point.t,JSON.stringify(point));
      if (count.total+batch.points.length>=maxSamples) {
        await update(db,{...transition(batch.session,'pause',now),reason:'sample-limit'});
        return false;
      } else if (batch.session.lastFix!==session.lastFix) await update(db,batch.session);
      return true;
    }),
    save:(id) => transaction(async db=>{
      const session=await active(db);
      if (!session || session.id!==id) throw new Error('没有可保存的跑步草稿。');
      const summary=runSummary(session,await readPoints(db,id));
      if (!summary.valid) throw new Error('保存需要至少 10 米有效轨迹和 6 秒记录。可以继续记录或放弃草稿。');
      const imports = (await db.getAllAsync("SELECT id,started,summary FROM workouts WHERE phase='saved' AND source='healthkit'"))
        .map(row=>({...row,...JSON.parse(row.summary)}));
      const duplicate=imports.find(run=>likelyDuplicate([comparisonRun(run)],comparisonRun({...summary,started:session.started})));
      if (duplicate) {
        summary.externalId=duplicate.externalId;
        await db.runAsync("DELETE FROM workouts WHERE id=? AND source='healthkit'",duplicate.id);
      }
      await db.runAsync("UPDATE workouts SET phase='saved',summary=? WHERE id=?",JSON.stringify(summary),id);
      return summary;
    }),
    importHealth:(workouts,now) => transaction(async db=>{
      if (await active(db)) throw new Error('请先保存或放弃当前跑步草稿。');
      const saved = (await db.getAllAsync("SELECT id,started,summary FROM workouts WHERE phase='saved'"))
        .map(row=>({...row,...JSON.parse(row.summary)}));
      let added=0;
      for (const item of workouts) {
        const duplicate = saved.some(run=>run.externalId===item.externalId ||
          likelyDuplicate([comparisonRun(run)],comparisonRun(item)));
        if (duplicate) continue;
        const summary={...item,importedAt:now};
        await db.runAsync("INSERT INTO workouts(started,phase,state,source,summary) VALUES (?,'saved','{}','healthkit',?)",
          item.started,JSON.stringify(summary));
        saved.push(summary);
        added++;
      }
      return {added,skipped:workouts.length-added};
    }),
    readSaved:(id) => transaction(async db=>{
      const run=await db.getFirstAsync("SELECT id,started,source,summary FROM workouts WHERE id=? AND phase='saved'",id);
      return run?{...run,...JSON.parse(run.summary),points:await readPoints(db,id)}:null;
    }),
    discard:(id) => transaction(async db=>{
      // Explicit sample deletion also works on platforms where transaction connections do not inherit foreign_keys.
      const session=await active(db);
      if (session?.id!==id || session.phase==='running') throw new Error('请先暂停跑步。');
      await db.runAsync('DELETE FROM samples WHERE workout=?',id);
      await db.runAsync("DELETE FROM workouts WHERE id=? AND phase<>'saved'",id);
    }),
    deleteSaved:(id) => transaction(async db=>{
      const row=await db.getFirstAsync("SELECT id FROM workouts WHERE id=? AND phase='saved'",id);
      if (!row) return;
      await db.runAsync('DELETE FROM samples WHERE workout=?',id);
      await db.runAsync("DELETE FROM workouts WHERE id=? AND phase='saved'",id);
    })
  };
}
