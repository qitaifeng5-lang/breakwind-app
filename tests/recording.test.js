import test from 'node:test';
import assert from 'node:assert/strict';
import { addFix, analyzeTrack, likelyDuplicate, parseFit, importRun, energyEstimate, heartZones } from '../public/running.js';
import { catalog, mealTotals, portionValues, searchFood, validBarcode } from '../public/fuel.js';

const fix=(longitude,accuracy=6)=>({latitude:0,longitude,accuracy,altitude:null,altitudeAccuracy:null});

test('GPS drops poor fixes, stationary jitter and impossible jumps; breaks do not bridge pauses',()=>{
  const points=[];
  assert.equal(addFix(points,fix(0,100),1000,0),false);
  assert.equal(addFix(points,fix(0),1000,0),true);
  assert.equal(addFix(points,fix(0.000005),4000,0),false);
  assert.equal(addFix(points,fix(0.01),5000,0),false);
  assert.equal(addFix(points,fix(0.0001),6000,0),true);
  assert.equal(addFix(points,fix(0.01),50000,0),true);
  assert.equal(points.at(-1).break,true);
  assert.equal(addFix(points,fix(0.02),60000,1),true);
  const report=analyzeTrack(points);
  assert.ok(report.distance>11 && report.distance<12);
  assert.equal(report.seconds,5);
  assert.equal(report.climb,null);
});
test('time and distance are interpolated at kilometer boundaries',()=>{
  const track=[{m:0,t:1000,alt:4},{m:800,t:241000,alt:5},{m:1200,t:361000,alt:9}];
  const report=analyzeTrack(track);
  assert.deepEqual(report.splits,[300]);
  assert.equal(report.distance,1200);
  assert.equal(report.climb,5);
  assert.equal(report.series.at(-1).speed,300);
});
test('same-file and probable device duplicates are detected',()=>{
  const a={fileHash:'abc',distance:5,minutes:25,startedAt:200000,date:'2026-11-07'};
  assert.equal(likelyDuplicate([a],{...a,distance:9}),a);
  assert.equal(likelyDuplicate([a],{...a,fileHash:'xyz',distance:5.04,startedAt:201000}),a);
  assert.equal(likelyDuplicate([a],{...a,fileHash:'xyz',startedAt:500000}),undefined);
  assert.equal(likelyDuplicate([a],{distance:5,minutes:25,date:a.date}),a);
});
function fitFile(sport=1) {
  const definition=[64,0,0,18,0,4,5,1,0,2,4,134,8,4,134,9,4,134];
  const record=Buffer.alloc(14);
  record[1]=sport;
  record.writeUInt32LE(1160000000,2);
  record.writeUInt32LE(1500000,6);
  record.writeUInt32LE(500000,10);
  const body=Buffer.concat([Buffer.from(definition),record]);
  const header=Buffer.alloc(12);
  header[0]=12;
  header[1]=16;
  header.writeUInt32LE(body.length,4);
  header.write('.FIT',8);
  const file=Buffer.concat([header,body,Buffer.alloc(2)]);
  let crc=0;
  for (const byte of file.subarray(0,-2)) {
    crc ^= byte;
    for (let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xa001:0);
  }
  file.writeUInt16LE(crc,file.length-2);
  return file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
}
test('FIT validates CRC, records source and rejects non-running sessions',async()=>{
  const bytes=fitFile();
  assert.equal(parseFit(bytes).meters,5000);
  const run=await importRun(new File([bytes],'workout.fit'));
  assert.equal(run.source,'fit');
  assert.equal(run.minutes,25);
  assert.equal(run.distance,5);
  assert.equal(run.fileHash.length,64);
  assert.throws(()=>parseFit(fitFile(2)),/跑步/);
  new Uint8Array(bytes)[15]^=1;
  assert.throws(()=>parseFit(bytes),/校验/);
});
test('heart zones skip long gaps and energy estimates need a known weight',()=>{
  const points=[{heart:120,t:0},{heart:150,t:10000},{heart:150,t:20000},{heart:150,t:70000}];
  assert.deepEqual(heartZones(points,200).map(([,s])=>s),[0,10,10,0,0]);
  assert.equal(energyEstimate(4,30,0),null);
  assert.equal(energyEstimate(4,30,70).met,8.5);
});
test('food search, portions and incomplete meal data retain source and uncertainty',()=>{
  const rice=searchFood(catalog,'米饭')[0];
  assert.equal(rice.id,'fdc-168878');
  assert.equal(portionValues(rice,150).kcal,195);
  const combined=mealTotals([portionValues(rice,150),portionValues({kcal:60},50)]);
  assert.equal(combined.kcal,225);
  assert.equal(combined.protein,null);
  assert.ok(validBarcode('4006381333931'));
  assert.equal(validBarcode('4006381333932'),false);
});
