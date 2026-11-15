import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalog,foodSnapshot} from '../public/fuel.js';
import {foodArtwork,foodArtManifest,foodArtAssets} from '../public/food-art.js';

test('every reviewed common food and recipe has an existing original atlas cell',async()=>{
 const common=catalog.filter(f=>(f.nameReviewed||f.preferred||f.matchKind==='recipe')&&f.matchKind!=='brand');
 assert.ok(common.length>=90);
 for(const food of common)assert.ok(foodArtwork(food),food.name);
 for(const file of foodArtAssets){const png=await readFile(new URL('../public/'+file,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20),art=Object.values(foodArtManifest).find(a=>'food-'+a.sheet+'.png'===file);
  assert.equal(width/art.columns,height/art.rows,'atlas cells must be square: '+file);
 }
});

test('whole dishes, cooking states and complete common names determine the photo, not ingredient substrings',()=>{
 const key=id=>foodArtwork(catalog.find(f=>f.id===id))?.key;
 assert.equal(key('fdc-171477'),'chicken');assert.equal(key('fdc-2706796'),'kung-pao');assert.equal(key('fdc-2708953'),'chicken-fried-rice');
 assert.equal(key('fdc-2708418'),'congee');assert.equal(key('fdc-168878'),'rice');assert.equal(key('fdc-2708705'),'potsticker');
 assert.equal(key('fdc-175179'),'shrimp-raw');assert.equal(key('fdc-175180'),'shrimp');assert.equal(key('fdc-168462'),'spinach-raw');assert.equal(key('fdc-168463'),'spinach');
 for(const name of ['苹果派','鸡肉味薯片','牛奶巧克力','香蕉奶昔','鸡肉沙拉','我的午餐'])assert.equal(foodArtwork({name}),null,name);
 for(const originalName of ['Milk, whole, fluid, chocolate','Chicken, breast, cooked, breaded','Beef, ground, raw'])assert.equal(foodArtwork({originalName}),null,originalName);
 assert.equal(foodArtwork({name:'苹果（带皮）'}).key,'apple');assert.equal(foodArtwork({name:'番茄炒蛋'}).key,'tomato-egg');
});

test('brands never inherit generic photographs; recent, favorites and historical snapshots keep identity and nutrition',()=>{
 for(const food of catalog.filter(f=>f.matchKind==='brand'&&(f.nameReviewed||f.preferred)))assert.equal(foodArtwork(food),null,food.name);
 assert.equal(foodArtwork({name:'牛奶',brand:'示例品牌'}),null);
 const food=catalog.find(f=>f.id==='fdc-171688'),part=foodSnapshot(food,150),before=structuredClone(part);
 assert.equal(foodArtwork(part).key,'apple');assert.equal(foodArtwork({...part,foodSnapshot:{...part.foodSnapshot,brand:'具体商品'}}),null);
 assert.deepEqual(part,before,'presentation must not rewrite saved records');
});
