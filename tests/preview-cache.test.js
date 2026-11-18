import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('preview install bypasses stale HTTP cache; online navigation refreshes while offline retains the installed shell',async()=>{
 const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8').replace(/breakwind-shell-v\d+/,'breakwind-preview-test');
 const handlers={},scope='https://example.test/breakwind/',stored=new Response('installed shell');
 let requests,networkOptions,pending,offline=false;
 const cache={addAll:async values=>{requests=values;},match:async()=>stored};
 vm.runInNewContext(source,{URL,Request,self:{registration:{scope},addEventListener:(name,fn)=>{handlers[name]=fn;},skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches:{open:async()=>cache},fetch:async(_request,options)=>{networkOptions=options;if(offline)throw Error('offline');return new Response('new shell');}});
 handlers.install({waitUntil:p=>{pending=p;}});await pending;
 assert.ok(requests.length>10);assert.ok(requests.every(r=>r.cache==='reload'));
 const event={request:{url:scope,method:'GET',mode:'navigate'},respondWith:p=>{pending=p;}};
 handlers.fetch(event);assert.equal(await(await pending).text(),'new shell');assert.equal(networkOptions.cache,'no-store');
 offline=true;handlers.fetch(event);assert.equal(await(await pending).text(),'installed shell');
});
