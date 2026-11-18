import test from 'node:test';import assert from 'node:assert/strict';
import {copyMealSnapshots,mealTotals,catalog,searchFood,foodSnapshot,resizeFoodSnapshot,foodPortionText,recentFoodSnapshots} from '../public/fuel.js';
import {fresh,readData,mergeBackup} from '../public/model.js';
import {chineseFoods} from '../public/food-zh.js';
import {foodData} from '../public/food-data.js';
test('Chinese editorial index pins source identity without changing nutrients or inventing restaurant verification',()=>{
 for(const zh of chineseFoods){const original=foodData.find(f=>f.id===zh.id),food=catalog.find(f=>f.id===zh.id);assert.equal(original.originalName,zh.expectedOriginal);for(const key of ['kcal','protein','carbs','fat'])assert.equal(food[key],original[key]);assert.equal(food.source,original.source);}
 for(const [q,fragment] of [['包子','Bao bun'],['虾仁炒饭','Rice, fried, with shrimp'],['鸡肉捞面','Lo mein, with chicken'],['蛋花汤','Soup, egg drop']]){const f=searchFood(catalog,q)[0];assert.ok(f.originalName.includes(fragment),q);assert.equal(f.matchKind,'estimate');}
 assert.ok(searchFood(catalog,'米饭').slice(0,4).every(f=>/^Rice, (white|brown),/.test(f.originalName)));
 assert.equal(searchFood(catalog,'中国版佳得乐600ml').length,0);assert.equal(searchFood(catalog,'馄饨')[0].originalName,'Soup, wonton');
});
test('copying yesterday keeps missing nutrition and exact historical snapshots; repeating cannot double count',()=>{
 const food={id:'old',date:'2026-11-13',meal:'午餐',name:'个人盒装食品',kcal:120,protein:null,carbs:12,fat:4,components:[{foodId:'private',unit:'ml',amount:250,grams:null,foodSnapshot:{name:'原标签',kcal:48}}]};
 const copies=copyMealSnapshots([food],['old'],'2026-11-14');assert.equal(copies.length,1);assert.equal(copies[0].components[0].grams,null);assert.equal(copies[0].protein,null);assert.notEqual(copies[0].id,food.id);
 assert.equal(copyMealSnapshots([food,...copies],['old'],'2026-11-14').length,0);copies[0].components[0].foodSnapshot.name='修改';assert.equal(food.components[0].foodSnapshot.name,'原标签');assert.equal(mealTotals(copies).protein,null);
});
test('saved meal combinations survive reload and backup merge without replacing existing private records',()=>{
 const s=fresh();s.foodCombos.push({id:'combo',name:'早餐组合',components:[{name:'牛奶',amount:250,unit:'ml',protein:null}]});const restored=readData(JSON.stringify(s));assert.deepEqual(restored.foodCombos,s.foodCombos);
 const old=readData(JSON.stringify({...fresh(),foodCombos:undefined}));assert.deepEqual(old.foodCombos,[]);mergeBackup(old,restored);mergeBackup(old,restored);assert.equal(old.foodCombos.length,1);
});
test('Foundation data keep published nutrient provenance and unknown values rather than calculated guesses',()=>{
 const foundation=foodData.filter(f=>f.source.includes('Foundation 2026-10'));assert.equal(foundation.length,424);
 for(const f of foundation){if(f.kcal!==null){assert.ok([1008,2048,2047].includes(f.sourceNutrients.kcal.id));assert.equal(f.sourceNutrients.kcal.unit.toLowerCase(),'kcal');}for(const key of ['protein','carbs','fat'])if(f[key]!==null)assert.equal(f.sourceNutrients[key].unit.toLowerCase(),'g');}
});

test('household amounts preserve historical mapping and units while exact edits clear stale labels',()=>{
 const food={id:'snapshot-fixture',name:'测试饮品',basis:{amount:100,unit:'ml'},kcal:40,protein:null,carbs:5,fat:1};
 const unit={id:'carton-v1',label:'盒',amount:250,unit:'ml',quantity:0.5,estimated:false,source:'测试标签'};
 const part=foodSnapshot(food,125,'ml',unit);food.kcal=999;unit.amount=500;
 assert.equal(part.kcal,50);assert.equal(part.grams,null);assert.equal(part.household.amount,250);assert.match(foodPortionText(part),/0.5 盒/);
 const resized=resizeFoodSnapshot(part,500);assert.equal(resized.household.quantity,2);assert.equal(resized.kcal,200);assert.equal(resized.protein,null);
 const exact=resizeFoodSnapshot(part,173,null);assert.equal(exact.household,undefined);assert.equal(foodPortionText(exact),'173 ml');assert.equal(part.amount,125);
 assert.throws(()=>foodSnapshot(food,125,'ml',{...part.household,unit:'g'}),/份量/);
 assert.throws(()=>foodSnapshot(food,250,'ml',part.household),/份量/);
});
test('recent food keeps the latest same-day serving, with deterministic legacy ordering',()=>{
 const records=[{id:'old',date:'2026-11-17',loggedAt:900,components:[{foodId:'rice',amount:400}]},{id:'first',date:'2026-11-18',loggedAt:1,components:[{foodId:'rice',amount:75}]},{id:'last',date:'2026-11-18',loggedAt:2,components:[{foodId:'rice',amount:300}]}];
 assert.equal(recentFoodSnapshots(records)[0].amount,300);assert.equal(recentFoodSnapshots(records).length,1);
 const legacy=records.slice(1).map(({id,date,components})=>({id,date,components}));assert.equal(recentFoodSnapshots(legacy)[0].amount,300);assert.equal(records[1].components[0].amount,75);
});
test('copied household snapshots survive reload and combos without new source lookups',()=>{
 const p=foodSnapshot(catalog.find(f=>f.id==='fdc-168878'),75,'g',{id:'rice-bowl-v1',label:'中碗',amount:150,unit:'g',quantity:0.5,estimated:true,source:'测试编辑估算'});
 const meal={id:'rice',date:'2026-11-17',meal:'午餐',components:[p],...mealTotals([p])};
 const copy=copyMealSnapshots([meal],['rice'],'2026-11-18')[0];const s=fresh();s.food=[meal,copy];s.foodCombos=[{id:'combo',name:'半碗饭',components:structuredClone(copy.components)}];
 const restored=readData(JSON.stringify(s));assert.deepEqual(restored.food[1].components[0],p);assert.deepEqual(restored.foodCombos[0].components[0].household,p.household);
 copy.components[0].household.amount=300;assert.equal(meal.components[0].household.amount,150);
});
