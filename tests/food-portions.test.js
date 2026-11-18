import test from 'node:test';
import assert from 'node:assert/strict';
import {householdPortions} from '../public/food-portions.js';

const food=(extra={})=>({id:'test',originalName:'Test food',basis:{amount:100,unit:'g'},matchKind:'generic',...extra});
const portion=(label,amount,unit='g')=>({label,amount,unit,source:'test source'});

test('source household counts normalize whole units, fractions and decimal counts',()=>{
 const options=householdPortions(food({portions:[portion('2 slices',60),portion('1/2 cup',80),portion('0.5 Bar',40),portion('1½ cups',150)]}));
 assert.equal(options.find(p=>p.label==='片').amount,30);
 assert.equal(options.find(p=>p.sourceLabel==='1/2 cup').amount,160);
 assert.equal(options.find(p=>p.label==='块').amount,80);
 assert.equal(options.find(p=>p.sourceLabel==='1½ cups').amount,100);
 assert.equal(options.find(p=>p.label==='片').sourceCount,2);
 assert.equal(options.find(p=>p.label==='片').estimated,false);
});

test('personal labels can use natural Chinese household counts',()=>{
 const options=householdPortions(food({matchKind:'personal',portions:[portion('一盒',250),portion('两片',60),portion('半碗',75)]}));
 assert.equal(options.find(p=>p.label==='盒').amount,250);
 assert.equal(options.find(p=>p.label==='片').amount,30);
 assert.equal(options.find(p=>p.label==='碗').amount,150);
});

test('cooked rice bowls are explicit estimates distinct from a source cup',()=>{
 const options=householdPortions(food({originalName:'Rice, white, long-grain, regular, enriched, cooked',portions:[portion('1 cup',158)]}));
 assert.equal(options[0].label,'中碗');assert.equal(options[0].amount,150);assert.equal(options[0].estimated,true);
 const cup=options.find(p=>p.label==='杯');assert.equal(cup.amount,158);assert.equal(cup.estimated,false);assert.match(cup.note,/不是家用饭碗/);
 assert.notEqual(cup.id,options[0].id);
 const noodle=householdPortions(food({originalName:'Noodles, japanese, soba, cooked'}));
 const congee=householdPortions(food({originalName:'Congee'}));
 assert.equal(noodle[0].amount,200);assert.equal(congee[0].amount,250);
 assert.match(noodle[0].note,/不含汤和配菜/);
});

test('an explicitly defined source bowl stays a bowl without borrowing cup weight',()=>{
 const options=householdPortions(food({portions:[portion('1 bowl',310),portion('1 cup',240)]}));
 assert.equal(options.find(p=>p.label==='碗').amount,310);
 assert.equal(options.find(p=>p.label==='碗').estimated,false);
 assert.equal(options.find(p=>p.label==='杯').amount,240);
});

test('ingredient flavour, dry foods and branded names never receive cooked bowl estimates',()=>{
 for(const originalName of ['Snacks, rice cakes, brown rice, sesame seed','Rice, white, long-grain, raw','Noodles, egg, dry','Banana split','CHOCOLATE BANANA FLAVOR BAR']){
  assert.deepEqual(householdPortions(food({originalName})),[]);
 }
 assert.deepEqual(householdPortions(food({originalName:'Rice, white, cooked',matchKind:'brand'})),[]);
 assert.deepEqual(householdPortions(food({originalName:'Rice, white, cooked',matchKind:'personal'})),[]);
});

test('milk and packaging keep their recorded mass or volume without guessing a conversion',()=>{
 const milk=householdPortions(food({originalName:'Milk, whole, 3.25% milkfat',portions:[portion('1 cup',244),portion('1 CARTON',250,'ml')]}));
 assert.equal(milk.length,1);assert.equal(milk[0].unit,'g');assert.equal(milk[0].amount,244);
 const carton=householdPortions(food({matchKind:'brand',basis:{amount:100,unit:'ml'},portions:[portion('1 CARTON',250,'ml'),portion('1 bottle',250)]}));
 assert.equal(carton.length,1);assert.equal(carton[0].label,'盒');assert.equal(carton[0].amount*0.5,125);assert.equal(carton[0].unit,'ml');
 const guessed=householdPortions(food({matchKind:'brand',portions:[portion('整包／瓶标注净含量',500)]}));
 assert.deepEqual(guessed,[]);
});

test('whole fruit and eggs use source sizes and retain edible-part instructions',()=>{
 const banana=householdPortions(food({originalName:'Bananas, raw',portions:[portion('1 small (6 inches long)',101),portion('1 medium (7 inches long)',118),portion('1 cup, sliced',150)]}));
 assert.equal(banana[0].label,'根（中等）');assert.equal(banana[0].amount,118);assert.match(banana[0].note,/去皮/);
 const eggs=householdPortions(food({originalName:'Egg, whole, cooked, hard-boiled',portions:[portion('1 large',50)]}));
 assert.equal(eggs[0].label,'个（大）');assert.match(eggs[0].note,/去壳/);
 const flavour=householdPortions(food({originalName:'Banana flavored pudding',portions:[portion('1 medium',50)]}));
 assert.deepEqual(flavour,[]);
});

test('unsupported and invalid old measures do not invent a serving',()=>{
 assert.deepEqual(householdPortions(null),[]);
 assert.deepEqual(householdPortions(food({portion:100})),[]);
 assert.deepEqual(householdPortions(food({portions:[portion('Quantity not specified',100),portion('0 slices',30),portion('1 cup',NaN),portion('1 slice',-10)]})),[]);
 assert.deepEqual(householdPortions(food({basis:{amount:1,unit:'serving'},portions:[portion('1 box',1,'serving')]})),[]);
});

test('portion identity is stable and duplicate source descriptions do not create duplicate options',()=>{
 const a=portion('2 slices',60),b=portion('1 cup',150);
 const first=householdPortions(food({portions:[a,b,a]}));const next=householdPortions(food({portions:[b,a]}));
 assert.equal(first.length,2);assert.deepEqual(first.map(p=>p.id),next.map(p=>p.id));
});

test('recipe portion uses its current estimated yield and never labels it measured',()=>{
 const options=householdPortions(food({id:'recipe-tomato-egg',matchKind:'recipe',recipe:{yieldAmount:280}}));
 assert.equal(options[0].label,'份');assert.equal(options[0].amount,280);assert.equal(options[0].estimated,true);
 const changed=householdPortions(food({id:'recipe-tomato-egg',matchKind:'recipe',recipe:{yieldAmount:320}}));
 assert.equal(changed[0].amount,320);
 assert.match(changed[0].source,/编辑估算/);
});
