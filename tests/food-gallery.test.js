import test from 'node:test';
import assert from 'node:assert/strict';
import {foodData} from '../public/food-data.js';
import {foodGallery,foodGalleryGroups} from '../public/food-gallery.js';
import {foodArtwork,foodArtManifest} from '../public/food-art.js';
import {catalog,searchFood,foodSnapshot,resizeFoodSnapshot} from '../public/fuel.js';

test('expanded pictured foods preserve source identity, actual nutrition and available serving units',()=>{
 const sources=new Map(foodData.map(f=>[f.id,f]));
 assert.equal(new Set(foodGallery.map(f=>f.id)).size,432);
 assert.equal(Object.keys(foodArtManifest).length,537);
 for(const row of foodGallery){
  const raw=sources.get(row.id),food=catalog.find(f=>f.id===row.id);
  assert.equal(raw.originalName,row.expectedOriginal,row.name);assert.equal(raw.url,row.source);
  if(/\buncooked\b/i.test(raw.originalName))assert.ok(!/（熟）/.test(row.name),'uncooked is not cooked: '+row.name);
  assert.ok(!raw.brand&&!raw.barcode&&raw.matchKind!=='brand');
  for(const key of ['kcal','protein','carbs','fat','basis','portions','source','verification','sourceUpdated'])assert.deepEqual(food[key],raw[key],row.name+' '+key);
  assert.equal(foodArtwork(food)?.key,row.id,row.name);
  assert.equal(foodArtwork({...food,originalName:'source identity changed'})?.key,undefined);
  assert.equal(foodArtwork({...food,brand:'具体商品'}),null);
  assert.ok(searchFood(catalog,row.name).some(f=>f.id===row.id),'Chinese search: '+row.name);
 }
 for(const group of Object.keys(foodGalleryGroups))assert.equal(foodGallery.filter(f=>f.group===group).length,24);
});

test('search distinguishes bitter melon from leaves, dry from cooked and soups from concentrates',()=>{
 for(const [q,id] of [['苦瓜','fdc-168393'],['龙眼','fdc-169089'],['鸭蛋','fdc-172189'],['贝果','fdc-2707684'],['牛肉干','fdc-2705860'],['奶油蘑菇汤','fdc-2710107'],['磅蛋糕','fdc-172704']])assert.equal(searchFood(catalog,q)[0].id,id,q);
 assert.match(catalog.find(f=>f.id==='fdc-174258').name,/干/);
 assert.match(catalog.find(f=>f.id==='fdc-172191').name,/生/);
 assert.match(catalog.find(f=>f.id==='fdc-2707451').name,/干/);
 assert.ok(!/condensed|dry/.test(catalog.find(f=>f.id==='fdc-2710107').originalName));
});

test('gallery localization and catalog replacement cannot recalculate existing meal snapshots',()=>{
 const source=foodData.find(f=>f.id==='fdc-169089'),saved=foodSnapshot(source,150),before=structuredClone(saved);
 assert.equal(foodArtwork(saved).key,source.id);
 const resized=resizeFoodSnapshot(saved,75);assert.equal(resized.kcal,source.kcal*.75);
 assert.equal(saved.name,source.name);assert.deepEqual(saved,before);
 assert.equal(resized.foodSnapshot.sourceUpdated,source.sourceUpdated);
});
