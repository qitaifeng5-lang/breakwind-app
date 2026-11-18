import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { sanitizeVision } from '../vision.mjs';
import { catalog, searchFood } from '../public/fuel.js';

test('vision leaves unknown food and invalid ranges unresolved',()=>{
  const result=sanitizeVision({uncertain:false,candidates:[
    {name:'米饭',foodId:'fdc-168878',minGrams:120,maxGrams:180,kcal:1},
    {name:'未知菜肴',foodId:'invented',minGrams:80,maxGrams:80},
    {name:' '},null
  ]});
  assert.deepEqual(result,{uncertain:true,candidates:[
    {name:'米饭',foodId:'fdc-168878',minGrams:120,maxGrams:180},
    {name:'未知菜肴',foodId:null,minGrams:null,maxGrams:null}
  ]});
});
test('Chinese aliases resolve verified entries with stable USDA identifiers',()=>{
  assert.equal(searchFood(catalog,'番薯')[0].id,'fdc-168483');
  assert.equal(searchFood(catalog,'老豆腐')[0].protein,17.27);
  assert.equal(searchFood(catalog,'毛豆')[0].kcal,141);
});
test('vision endpoint restricts origin, checks the installed model and sanitizes local output',async()=>{
  const previous=process.env.BREAKWIND_VISION_MODEL;
  const previousFetch=globalThis.fetch;
  process.env.BREAKWIND_VISION_MODEL='local-vision:test';
  const port=Number(process.env.PORT || 4188);
  const {visionRoute}=await import('../vision.mjs?enabled-fixture');
  const run=async origin=>{
    const request=Readable.from([Buffer.from([255,216,0,255,217])]);
    request.method='POST';
    request.headers={host:'127.0.0.1:'+port,origin,'content-type':'image/jpeg'};
    let status,body;
    const response={writeHead(value){status=value;return this;},end(value){body=JSON.parse(value);}};
    await visionRoute(request,response);
    return {status,body};
  };
  const calls=[];
  globalThis.fetch=async (url,options)=>{
    calls.push(url);
    if (url.endsWith('/tags')) return {ok:true,json:async()=>({models:[{name:'local-vision:test',size:2000000}]})};
    assert.equal(options.redirect,'error');
    assert.equal(JSON.parse(options.body).messages[0].images.length,1);
    return {ok:true,json:async()=>({message:{content:JSON.stringify({candidates:[{name:'豆腐',foodId:'invented'}]})}})};
  };
  try {
    assert.equal((await run('https://example.test')).status,403);
    assert.deepEqual(calls,[]);
    const result=await run('http://127.0.0.1:'+port);
    assert.equal(result.status,200);
    assert.equal(result.body.candidates[0].foodId,null);
    assert.deepEqual(calls,['http://127.0.0.1:11434/api/tags','http://127.0.0.1:11434/api/chat']);
  } finally {
    if (previous===undefined) delete process.env.BREAKWIND_VISION_MODEL;
    else process.env.BREAKWIND_VISION_MODEL=previous;
    globalThis.fetch=previousFetch;
  }
});
