import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,searchFood,portionValues,foodPortions,foodSnapshot,resizeFoodSnapshot,mealTotals,calculateRecipe,validBarcode,dedupeFoodRecords} from '../public/fuel.js';
test('Chinese staple searches rank the actual food above flavour, ingredient and restaurant references',()=>{
 for(const [query,subject] of [['面条',/^noodles,.*cooked/i],['酸奶',/^yogurt, plain/i],['橙子',/^oranges, raw/i],['芒果',/^mangos, raw/i],['牛油果',/^avocados, raw/i],['胡萝卜',/^carrots,/i],['西红柿',/^tomatoes,/i],['花生',/^peanuts,/i],['燕麦',/^oats/i],['核桃',/^nuts, walnuts/i]]){
  assert.match(searchFood(catalog,query)[0].originalName,subject,query);
 }
 assert.equal(searchFood(catalog,'奶茶').length,0,'separate milk and tea aliases do not create a milk-tea product');
 assert.ok(!searchFood(catalog,'黄瓜').some(f=>/sea cucumber/i.test(f.originalName)));
});
test('official offline records retain source, raw cooking description, nullable nutrients and stable IDs',()=>{
 const rice=catalog.find(f=>f.id==='fdc-168878');assert.equal(rice.kcal,130);assert.equal(rice.license,'CC0-1.0');assert.match(rice.originalName,/cooked/);
 assert.equal(searchFood(catalog,'米飯')[0].id,rice.id);assert.equal(searchFood(catalog,'niunai')[0].id,'fdc-171265');
 assert.equal(searchFood(catalog,'不存在牌牛奶750ml').length,0);
 const humanMilk=catalog.find(f=>f.originalName==='Milk, human'&&f.matchKind==='estimate');assert.equal(humanMilk.kcal,null);
 assert.equal(portionValues(humanMilk,100).kcal,null);
});
test('real US Vitasoy barcode identifies its precise record, volume basis and declared package rather than generic milk',()=>{
 const matches=searchFood(catalog,'061954000041');assert.ok(matches.length>=1);
 const product=matches.find(f=>/CHOCOLATE/.test(f.originalName));assert.ok(product);assert.equal(product.matchKind,'brand');assert.equal(product.market,'United States');assert.equal(product.basis.unit,'ml');assert.equal(validBarcode(product.barcode),true);
 assert.throws(()=>portionValues(product,250,'g'),/缺少可靠换算/);
 assert.equal(portionValues(product,250,'ml').kcal,product.kcal*2.5);
 assert.ok(foodPortions(product).some(p=>p.unit==='ml'&&p.amount===250));
 assert.equal(searchFood(catalog,'维他奶巧克力250ml').some(f=>f.barcode===product.barcode),true);
 assert.equal(searchFood(catalog,'维他奶巧克力250ml中国版').length,0);
});
test('saved nutrition is immutable across a source update; resizing uses that saved version',()=>{
 const source=structuredClone(catalog.find(f=>f.id==='fdc-168878')),part=foodSnapshot(source,150);source.kcal=999;
 assert.equal(part.kcal,195);assert.equal(resizeFoodSnapshot(part,100).kcal,130);assert.equal(part.grams,150);
 const incomplete={...part,protein:null};assert.equal(mealTotals([part,incomplete]).protein,null);assert.equal(mealTotals([part,incomplete]).kcal,390);
});
test('recipe ingredient changes are a labeled estimate, calculated from source foods, without mutating the public recipe',()=>{
 const item=catalog.find(f=>f.id==='recipe-tomato-egg'),before=structuredClone(item),weights=item.recipe.ingredients.map(i=>i.amount);weights[2]=0;
 const next=calculateRecipe(item,weights,280);assert.ok(next.kcal<item.kcal);assert.equal(next.matchKind,'recipe');assert.deepEqual(item,before);
 assert.throws(()=>calculateRecipe(item,weights,0));assert.throws(()=>calculateRecipe(item,[-1,100,5],280));
});
test('no kJ/kcal conflation, invented volume conversion or mass for a volume-based meal',()=>{
 const item={id:'unit-fixture',name:'explicit unit fixture',basis:{amount:100,unit:'ml'},kcal:418.4/4.184,protein:null,carbs:3,fat:0};
 const p=foodSnapshot(item,250);assert.equal(p.grams,null);assert.ok(Math.abs(p.kcal-250)<1e-9);assert.equal(p.protein,null);assert.equal(p.unit,'ml');
 assert.throws(()=>portionValues(item,250,'g'));assert.equal(foodPortions({portion:100,basis:{amount:100,unit:'g'},portions:[{label:'unverified cup',amount:250,unit:'ml'}]}).length,1);
});
test('duplicate source versions collapse without merging different flavors, package sizes or markets',()=>{
 const base={id:'a',barcode:'061954000041',matchKind:'brand',market:'US',originalName:'SOY DRINK, CHOCOLATE',portion:250,basis:{unit:'ml'},packageSize:'250 mL',sourceUpdated:'2020-01-01'};
 const rows=dedupeFoodRecords([base,{...base,id:'new',sourceUpdated:'2023-01-01',originalName:'SOY DRINK, CHOCOLATE, CHOCOLATE'}, {...base,id:'flavor',originalName:'SOY DRINK, VANILLA'}, {...base,id:'market',market:'China'}, {...base,id:'package',packageSize:'1000 mL'}]);
 assert.equal(rows.length,4);assert.equal(rows.find(f=>f.id==='new').alternateIds.length,2);assert.ok(rows.some(f=>f.id==='flavor'));assert.ok(rows.some(f=>f.id==='package'));
});
