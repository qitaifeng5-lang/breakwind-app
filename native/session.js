import { addFix, analyzeTrack, coordinate } from '../public/running.js';

export const initialSession = now => ({
  started:now, phase:'paused', anchor:null, elapsed:0, segment:-1, lastFix:null, reason:null
});

export function elapsedMs(session, now) {
  return session.elapsed + (session.anchor === null ? 0 : Math.max(0,now-session.anchor));
}

export function transition(session, event, now) {
  if (event === 'resume' && session.phase === 'paused') {
    return {...session,phase:'running',anchor:now,lastFix:null,segment:session.segment+1,reason:null};
  }
  if (event === 'finish' && session.phase === 'paused') return {...session,phase:'finished'};
  if (event === 'reopen' && session.phase === 'finished') return {...session,phase:'paused'};
  if (session.phase !== 'running') return session;
  if (event === 'pause' || event === 'finish' || event === 'interrupted' || event === 'location-error') {
    const cutoff = ['interrupted','location-error'].includes(event) ? session.lastFix ?? session.anchor : now;
    return {...session,phase:event==='finish'?'finished':'paused',anchor:null,elapsed:elapsedMs(session,cutoff),
      reason:['interrupted','location-error'].includes(event)?event:null};
  }
  return session;
}

export function captureBatch(session, previous, locations, now, room) {
  if (session.phase !== 'running') return {session,points:[]};
  const points = previous ? [previous] : [];
  const base = points.length;
  let lastFix = session.lastFix;
  for (const {coords,timestamp} of [...locations].sort((a,b)=>a.timestamp-b.timestamp)) {
    if (!Number.isFinite(timestamp) || timestamp < session.anchor || timestamp > now + 1000 || timestamp <= (lastFix ?? -1)) continue;
    if (!Number.isFinite(coords?.accuracy) || coords.accuracy > 30 || !coordinate({lat:coords.latitude,lon:coords.longitude})) continue;
    lastFix = timestamp;
    if (points.length-base < room) addFix(points,coords,timestamp,session.segment);
  }
  return {session:{...session,lastFix},points:points.slice(base)};
}

export function runSummary(session, points) {
  const report = analyzeTrack(points);
  return {distance:report.distance/1000,climb:report.climb,splits:report.splits,elapsed:session.elapsed,
    valid:session.phase==='finished' && report.distance>=10 && session.elapsed>=6000};
}
