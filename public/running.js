import { dateKey } from './model.js';

export const runModes = ['户外跑','跑步机','田径场'];
export const sourceNames = { manual:'手动记录', timer:'手动计时', gps:'手机 GPS · 前台', fit:'FIT 文件', gpx:'GPX 文件', tcx:'TCX 文件' };
const radians = degrees => degrees * Math.PI / 180;
export const coordinate = point => Number.isFinite(point?.lat) && Number.isFinite(point?.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180;

export function metersBetween(a,b) {
  const h = Math.sin(radians(b.lat-a.lat)/2)**2 + Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(radians(b.lon-a.lon)/2)**2;
  return 12742000 * Math.asin(Math.sqrt(Math.min(1,h)));
}

export function addFix(points,coords,t,segment) {
  if (!coordinate({lat:coords.latitude,lon:coords.longitude}) || !Number.isFinite(coords.accuracy) || coords.accuracy > 30 || !Number.isFinite(t)) return false;
  const point = {lat:coords.latitude,lon:coords.longitude,t,segment,alt:Number.isFinite(coords.altitude) && coords.altitudeAccuracy <= 12 && coords.altitudeAccuracy != null ? coords.altitude : null};
  const previous = points.at(-1);
  if (previous && t <= previous.t) return false;
  if (previous?.segment === segment) {
    const seconds = (t-previous.t)/1000;
    const meters = metersBetween(previous,point);
    if (seconds > 35) point.break = true;
    else if (meters < Math.max(4,coords.accuracy * 0.45) || meters/seconds > 12) return false;
  }
  points.push(point);
  return true;
}

export function analyzeTrack(points) {
  let distance = 0, seconds = 0, climb = 0, altitudePairs = 0, altitudeBase;
  let splitStart = 0;
  const splits = [], series = [];
  for (let i=0;i<points.length;i++) {
    const point = points[i], previous = points[i-1];
    let speed = null;
    if (!previous || point.break || previous.segment !== point.segment) altitudeBase = undefined;
    else {
      const delta = Number.isFinite(previous.m) && Number.isFinite(point.m) && point.m >= previous.m ? point.m-previous.m :
        coordinate(point) && coordinate(previous) ? metersBetween(previous,point) : 0;
      const elapsed = Number.isFinite(point.t) && Number.isFinite(previous.t) ? (point.t-previous.t)/1000 : 0;
      if (elapsed > 0) {
        speed = delta > 0 ? elapsed * 1000 / delta : null;
        for (let next=(splits.length+1)*1000; delta > 0 && next <= distance+delta && splits.length < 300; next+=1000) {
          const splitEnd = seconds + elapsed*(next-distance)/delta;
          splits.push(splitEnd-splitStart);
          splitStart = splitEnd;
        }
        seconds += elapsed;
      }
      distance += delta;
    }
    if (Number.isFinite(point.alt)) {
      if (altitudeBase === undefined) altitudeBase = point.alt;
      else {
        altitudePairs++;
        const change = point.alt-altitudeBase;
        if (Math.abs(change) >= 3) {climb += Math.max(0,change);altitudeBase = point.alt;}
      }
    }
    series.push({distance,speed,heart:point.heart ?? null,cadence:point.cadence ?? null,alt:point.alt ?? null,t:point.t});
  }
  return {distance,seconds,climb:altitudePairs ? climb : null,splits,series};
}
export function likelyDuplicate(runs,candidate) {
  return runs.find(run => {
    if (candidate.fileHash && candidate.fileHash === run.fileHash) return true;
    const gap = Number.isFinite(candidate.startedAt) && Number.isFinite(run.startedAt) ? Math.abs(candidate.startedAt-run.startedAt) : null;
    if (gap !== null ? gap > 120000 : run.date !== candidate.date) return false;
    return Math.abs(run.distance-candidate.distance) <= Math.max(0.12,candidate.distance*0.04) &&
      Math.abs(run.minutes-candidate.minutes) <= Math.max(1,candidate.minutes*0.06);
  });
}
export function energyEstimate(km,minutes,weight) {
  if (!(km>0 && minutes>0 && weight>0)) return null;
  const speed = km*60/minutes;
  const met = [[6.4,6.5],[8,8.5],[9.7,9.3],[11.3,11],[12.9,12],[14.5,13],[16.1,14.8],[17.7,16.8]].reduce((best,row) => Math.abs(speed-row[0]) < Math.abs(speed-best[0]) ? row : best);
  if (speed < 6 || speed > 18.5) return null;
  return {kcal:Math.round(met[1]*3.5*weight/200*minutes),met:met[1]};
}

const number = value => value === '' || value == null ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const timestamp = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const named = (node,name) => [...node.getElementsByTagNameNS('*',name)];
const val = (node,name) => named(node,name)[0]?.textContent.trim();
export function parseXmlTrack(xml,format) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('不支持含外部实体定义的文件。');
  const doc = new DOMParser().parseFromString(xml,'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('文件不是有效的 XML。');
  const gpx = format === 'gpx';
  if (doc.documentElement.localName !== (gpx ? 'gpx' : 'TrainingCenterDatabase')) throw new Error('文件内容与扩展名不匹配。');
  const activities = named(doc,'Activity');
  const tracks = named(doc,'trk');
  if ((gpx ? tracks.length : activities.length) !== 1) throw new Error('请选择只包含一次运动的文件。');
  if (!gpx && !/^running$/i.test(activities[0].getAttribute('Sport') || '')) throw new Error('该 TCX 未标记为跑步。');
  const root = gpx ? tracks[0] : activities[0];
  const points = (gpx ? named(root,'trkseg') : named(root,'Track')).flatMap((segment,index) => named(segment,gpx ? 'trkpt' : 'Trackpoint').map(node => ({
    segment:index,t:timestamp(val(node,gpx?'time':'Time')),lat:number(gpx?node.getAttribute('lat'):val(node,'LatitudeDegrees')),
    lon:number(gpx?node.getAttribute('lon'):val(node,'LongitudeDegrees')), alt:number(val(node,gpx?'ele':'AltitudeMeters')),
    heart:number(gpx?val(node,'hr'):val(named(node,'HeartRateBpm')[0] || node,'Value')),
    cadence:number(val(node,gpx?'cad':'RunCadence') ?? val(node,'Cadence')),m:gpx?null:number(val(node,'DistanceMeters'))
  })));
  const laps = gpx ? [] : named(root,'Lap');
  const total = (key) => {
    const values = laps.map(lap => number(val(lap,key)));
    return values.length && values.every(Number.isFinite) ? values.reduce((sum,value)=>sum+value,0) : null;
  };
  return {name:gpx?val(root,'name'):'TCX 跑步',points,meters:total('DistanceMeters'),seconds:total('TotalTimeSeconds'),
    startedAt:timestamp(gpx?null:laps[0]?.getAttribute('StartTime'))};
}

const fitEpoch = Date.UTC(1989,11,31);
const crc16 = (bytes) => {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit=0;bit<8;bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc;
};
export function parseFit(buffer) {
  const view = new DataView(buffer), bytes = new Uint8Array(buffer);
  const fail = () => {throw new Error('FIT 文件不完整或校验失败。');};
  if (bytes.length < 14 || ![12,14].includes(bytes[0]) || String.fromCharCode(...bytes.slice(8,12)) !== '.FIT') fail();
  let cursor = bytes[0];
  const end = cursor + view.getUint32(4,true);
  if (end+2 !== bytes.length || crc16(bytes) !== 0) fail();
  const defs = new Map(), points = [], sessions = [];
  let lastTimestamp;
  const requireBytes = size => {if (cursor+size>end) fail();};
  const read = (field,little) => {
    const {size,type} = field;
    requireBytes(size);
    let value = null;
    if (size === 1 && [0,2].includes(type)) value = bytes[cursor] === 255 ? null : bytes[cursor];
    if (size === 2 && type === 4) {const v=view.getUint16(cursor,little);value=v===65535?null:v;}
    if (size === 4 && type === 5) {const v=view.getInt32(cursor,little);value=v===2147483647?null:v;}
    if (size === 4 && type === 6) {const v=view.getUint32(cursor,little);value=v===4294967295?null:v;}
    cursor += size;
    return value;
  };
  while (cursor<end) {
    const header = bytes[cursor++];
    const compressed = Boolean(header&128);
    const local = compressed ? (header>>5)&3 : header&15;
    if (!compressed && (header&64)) {
      requireBytes(5);
      if (bytes[cursor+1]>1) fail();
      const little = bytes[cursor+1]===0, global=view.getUint16(cursor+2,little), count=bytes[cursor+4];
      cursor+=5;
      const readFields = length => Array.from({length},() => {
        requireBytes(3);
        const field={id:bytes[cursor],size:bytes[cursor+1],type:bytes[cursor+2]&31};
        cursor+=3;
        return field;
      });
      const fields = readFields(count);
      let developerSize=0;
      if (header&32) {requireBytes(1);developerSize=readFields(bytes[cursor++]).reduce((total,f)=>total+f.size,0);}
      defs.set(local,{little,global,fields,developerSize});
      continue;
    }
    const def=defs.get(local);
    if (!def) fail();
    const fields={};
    for (const f of def.fields) {
      if (compressed && f.id===253) {
        if (lastTimestamp == null) fail();
        let t=lastTimestamp-(lastTimestamp%32)+(header&31);
        if (t<lastTimestamp) t+=32;
        fields[253]=t;
      } else fields[f.id]=read(f,def.little);
    }
    requireBytes(def.developerSize);
    cursor+=def.developerSize;
    if (fields[253]!=null) lastTimestamp=fields[253];
    const scaled = (key,factor,offset=0) => fields[key] == null ? null : fields[key]/factor-offset;
    if (def.global===18) sessions.push({sport:fields[5],startedAt:fields[2]==null?null:fitEpoch+fields[2]*1000,seconds:scaled(8,1000),meters:scaled(9,100),heart:fields[16],climb:fields[22]});
    if (def.global===20) points.push({t:fields[253]==null?null:fitEpoch+fields[253]*1000,lat:scaled(0,2**31/180),lon:scaled(1,2**31/180),
      alt:scaled(78,5,500)??scaled(2,5,500),heart:fields[3],cadence:fields[4]==null?null:fields[4]*2,m:scaled(5,100),segment:0});
  }
  if (sessions.length!==1 || sessions[0].sport!==1) throw new Error('FIT 需要包含单次且明确标记为跑步的运动。');
  return {name:'FIT 跑步',points,...sessions[0]};
}

export async function importRun(file) {
  const format=file.name.split('.').at(-1).toLowerCase();
  if (!['fit','gpx','tcx'].includes(format) || file.size > 8*1024*1024) throw new Error('请选择不超过 8 MB 的 FIT、GPX 或 TCX 文件。');
  const buffer=await file.arrayBuffer();
  const parsed=format==='fit' ? parseFit(buffer) : parseXmlTrack(new TextDecoder().decode(buffer),format);
  if (parsed.points.length>18000) throw new Error('该活动的采样点超过 18,000 个。');
  const stats=analyzeTrack(parsed.points);
  const distance=(parsed.meters > 0 ? parsed.meters : stats.distance)/1000;
  const minutes=(parsed.seconds > 0 ? parsed.seconds : stats.seconds)/60;
  const startedAt=parsed.startedAt ?? parsed.points.find(p=>Number.isFinite(p.t))?.t ?? null;
  if (!(distance>=0.01 && distance<=300 && minutes>=0.1 && minutes<=1440) || !Number.isFinite(startedAt)) throw new Error('缺少有效的开始时间、跑步距离或耗时。GPX 需要带时间戳的轨迹。');
  const fileHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),v=>v.toString(16).padStart(2,'0')).join('');
  return {name:(parsed.name || '导入跑步').slice(0,100),date:dateKey(new Date(startedAt)),distance,minutes,startedAt,source:format,fileHash,points:parsed.points,heart:parsed.heart ?? null,climb:parsed.climb ?? null};
}

export function heartSegment(a,b) {
  if (!Number.isFinite(a.heart) || !Number.isFinite(b.heart) || !Number.isFinite(a.t) || !Number.isFinite(b.t) || a.segment!==b.segment || b.break) return 0;
  const seconds=(b.t-a.t)/1000;
  return seconds>0 && seconds<=30 ? seconds : 0;
}
export function heartZones(points,max) {
  const zones = [['低于 60%',0],['60–69%',0],['70–79%',0],['80–89%',0],['90% 及以上',0]];
  if (!(max>0)) return zones;
  for (let i=1;i<points.length;i++) {
    const previous=points[i-1],current=points[i];
    const seconds=heartSegment(previous,current);
    if (seconds) zones[Math.max(0,Math.min(4,Math.floor((previous.heart/max)*10+1e-9)-5))][1]+=seconds;
  }
  return zones;
}
