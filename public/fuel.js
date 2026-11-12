import {foodData} from './food-data.js';
export const nutrients=['kcal','protein','carbs','fat'];
export const catalog=[...recipeCatalog(foodData),...dedupeFoodRecords(foodData)];
const traditional={'飯':'饭','麵':'面','條':'条','雞':'鸡','蛋':'蛋','魚':'鱼','豬':'猪','餅':'饼','乾':'干','蘋':'苹','蘿':'萝','蔔':'卜','漿':'浆','鹽':'盐','醬':'酱','檸':'柠','檬':'檬','蝦':'虾','餃':'饺','饅':'馒','頭':'头','奶':'奶','樂':'乐','飲':'饮','無':'无'};
export const normalizeFoodQuery=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[飯麵條雞蛋魚豬餅乾蘋蘿蔔漿鹽醬檸檬蝦餃饅頭奶樂飲無]/g,c=>traditional[c]).replace(/毫升/g,'ml').replace(/克/g,'g').trim();
const index=new WeakMap();
// Search relevance is an editorial name mapping, never a nutrition substitution.
// A food mentioned as an ingredient/flavour must not outrank the food itself.
const subjects={
 '面条':/^noodles,.*(?:cooked|boiled)/i,'面包':/^bread, (?:white|whole-wheat|wheat),/i,
 '燕麦':/^(?:oats(?: \(|, raw)|cereals, oats,.*plain)/i,'酸奶':/^yogurt, plain,/i,'奶酪':/^cheese,/i,
 '黄豆':/^soybeans, mature seeds,/i,'牛肉':/^beef,.*(?:round|sirloin|ground)/i,'猪肉':/^pork, fresh,/i,'羊肉':/^lamb,.*(?:leg|shoulder|loin)/i,
 '虾':/^crustaceans, shrimp,(?!.*(?:breaded|fried|imitation|canned))/i,'橙子':/^oranges, raw/i,'草莓':/^strawberries, raw/i,'蓝莓':/^blueberries, raw/i,
 '芒果':/^mangos, raw/i,'牛油果':/^avocados, raw/i,'胡萝卜':/^carrots, (?:raw|cooked)/i,'黄瓜':/^cucumber,.*raw/i,
 '西红柿':/^tomatoes,.*(?:raw|cooked)/i,'番茄':/^tomatoes,.*(?:raw|cooked)/i,'菠菜':/^spinach, (?:raw|cooked)/i,
 '土豆':/^potatoes,.*(?:raw|boiled|baked)/i,'玉米':/^corn, sweet,/i,'花生':/^peanuts,.*(?:raw|roasted)/i,
 '杏仁':/^nuts, almonds/i,'核桃':/^nuts, walnuts/i,'咖啡':/^beverages, coffee, brewed,/i
};
function relevance(item,q){return Number(Boolean(subjects[q]?.test(item.originalName||'')))*100+Number(Boolean(item.preferred))*20+Number(normalizeFoodQuery(item.name)===q)*200;}
const lexicon=[...new Set(foodData.flatMap(f=>normalizeFoodQuery(f.aliases).split(/\s+/)).filter(t=>/^[\u4e00-\u9fff]{2,}$/.test(t)))].sort((a,b)=>b.length-a.length);
function queryTokens(q){
 const tokens=[];let rest=q;
 while(rest){rest=rest.trimStart();if(!rest)break;const known=lexicon.find(t=>rest.startsWith(t));
 if(known){tokens.push(known);rest=rest.slice(known.length);continue;}
 const ascii=rest.match(/^[a-z0-9.]+/i);if(ascii){tokens.push(ascii[0]);rest=rest.slice(ascii[0].length);continue;}
 let n=1;while(n<rest.length&&!/\s|[a-z0-9]/i.test(rest[n])&&!lexicon.some(t=>rest.slice(n).startsWith(t)))n++;
 tokens.push(rest.slice(0,n));rest=rest.slice(n);
 }return tokens;
}
export function searchFood(items,query){
 const q=normalizeFoodQuery(({niunai:'牛奶',mifan:'米饭',jidan:'鸡蛋'})[String(query).trim().toLowerCase()]||query),tokens=queryTokens(q);
 if(/^\d{8,14}$/.test(q))return items.filter(i=>i.barcode&&i.barcode.padStart(14,'0')===q.padStart(14,'0'));
 return items.map((item,order)=>{let text=index.get(item);if(!text){text=normalizeFoodQuery([item.name,item.originalName,item.aliases,item.brand,item.packageSize,item.market,(item.portion||100)+(item.basis?.unit||'g')].filter(Boolean).join(' '));index.set(item,text);}return {item,order,text};})
 .filter(r=>tokens.every(t=>r.text.includes(t)))
 .sort((a,b)=>relevance(b.item,q)-relevance(a.item,q)||a.order-b.order).map(r=>r.item);
}
export function portionValues(item,amount,unit=item.basis?.unit||'g'){
 const basis=item.basis||{amount:100,unit:'g'};
 if(!Number.isFinite(amount)||amount<0||unit!==basis.unit||!Number.isFinite(basis.amount)||basis.amount<=0)throw Error('份量单位与营养基准不同，缺少可靠换算');
 return Object.fromEntries(nutrients.map(k=>[k,Number.isFinite(item[k])?item[k]*amount/basis.amount:null]));
}
export function foodPortions(item){
 const unit=item.basis?.unit||'g',translate=label=>String(label).replace(/cups?/gi,'杯').replace(/bottles?/gi,'瓶').replace(/packages?|packets?/gi,'包').replace(/containers?|cartons?/gi,'盒').replace(/cans?/gi,'罐').replace(/pouches?/gi,'袋').replace(/pieces?/gi,'个').replace(/slices?/gi,'片').replace(/servings?/gi,'份').replace(/large/gi,'大').replace(/medium/gi,'中').replace(/small/gi,'小');
 return [{label:(item.portion||100)+' '+unit,amount:item.portion||100,unit},...(item.portions||[]).filter(p=>p.unit===unit&&p.amount>0).map(p=>({...p,label:translate(p.label)+'（'+p.amount+' '+p.unit+'）'}))];
}
export function foodSnapshot(item,amount,unit=item.basis?.unit||'g'){
 return {foodId:item.id,name:item.name,source:item.source,amount,unit,grams:unit==='g'?amount:null,foodSnapshot:structuredClone(item),...portionValues(item,amount,unit)};
}
export function resizeFoodSnapshot(part,amount){
 if(part.foodSnapshot)return foodSnapshot(part.foodSnapshot,amount,part.unit||'g');
 if(!(part.grams>0))throw Error('旧记录缺少重量，不能推算新份量');
 return {...structuredClone(part),grams:amount,amount,unit:'g',...Object.fromEntries(nutrients.map(k=>[k,Number.isFinite(part[k])?part[k]*amount/part.grams:null]))};
}
export const foodMatchLabel=item=>item.matchKind==='personal'||item.source?.startsWith('自定义')?'个人标签记录':item.matchKind==='brand'?'品牌商品 · 请核对地区与规格':item.matchKind==='estimate'?'配方／调查估算':item.matchKind==='recipe'?'配方估算':'通用食物参考';
export function mealTotals(items) {
  return Object.fromEntries(nutrients.map(key => [key,items.length && items.every(item=>Number.isFinite(item[key])) ? items.reduce((total,item)=>total+item[key],0) : null]));
}
export function validBarcode(value) {
  if (!/^(?:\d{8}|\d{12,14})$/.test(value)) return false;
  const sum = [...value.slice(0,-1)].reverse().reduce((total,digit,index)=>total+Number(digit)*(index%2 ? 1 : 3),0);
  return (10-sum%10)%10 === Number(value.at(-1));
}

export function calculateRecipe(item,weights=item.recipe.ingredients.map(i=>i.amount),yieldAmount=item.recipe.yieldAmount){
 if(!(yieldAmount>0)||weights.some(w=>!Number.isFinite(w)||w<0))throw Error('请填写有效食材重量与成品重量');
 const next=structuredClone(item);next.recipe.yieldAmount=yieldAmount;
 next.recipe.ingredients.forEach((p,i)=>{p.amount=weights[i];});
 for(const k of nutrients)next[k]=next.recipe.ingredients.every(p=>Number.isFinite(p.food[k]))?next.recipe.ingredients.reduce((sum,p)=>sum+p.food[k]*p.amount/100,0)/yieldAmount*100:null;
 return next;
}
function recipeCatalog(foods){
 const recipes=[['tomato-egg','番茄炒蛋（可改配方估算）','西红柿炒鸡蛋',[['fdc-170457',200],['fdc-171287',100],['fdc-171413',8]],280],
 ['egg-rice','鸡蛋炒饭（可改配方估算）','蛋炒饭',[['fdc-168878',200],['fdc-171287',50],['fdc-171413',5]],240],
 ['mantou','馒头（可改配方估算）','白馒头', [['fdc-168936',300],['fdc-175043',3],['fdc-173647',160]],430],
 ['dumpling','猪肉白菜水饺（可改配方估算）','饺子 水饺 白菜猪肉饺子', [['fdc-168936',200],['fdc-167902',150],['fdc-169979',150],['fdc-173647',100]],600],
 ['spinach','清炒菠菜（可改配方估算）','炒青菜',[['fdc-168462',250],['fdc-171413',5]],200]];
 return recipes.map(([id,name,aliases,parts,yieldAmount])=>calculateRecipe({id:'recipe-'+id,name,aliases,portion:150,basis:{amount:100,unit:'g'},matchKind:'recipe',market:'家庭配方示例',source:'USDA食材加权 · 成品产量为可修改估计',license:'CC0-1.0',verification:'recipe-estimate',recipe:{yieldAmount,yieldStatus:'估计，需按自家食材与成品称重调整；未校正营养保留率',ingredients:parts.map(([id,amount])=>({amount,food:structuredClone(foods.find(f=>f.id===id))}))}}));
}

export function dedupeFoodRecords(items){
 const plain=[],groups=new Map();
 for(const f of items){if(f.matchKind!=='brand'||!f.barcode){plain.push(f);continue;}
 const key=[f.barcode.padStart(14,'0'),f.market==='US'?'United States':f.market,[...new Set(String(f.originalName).split(',').map(x=>x.trim().toLowerCase()))].join(','),f.portion,f.basis?.unit].join('|');
 if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
 for(const group of groups.values()){
  const packages=new Map();for(const f of group){const match=f.packageSize?.match(/([\d.]+)\s*(ml|g)\b/i),key=match?Number(match[1])+match[2].toLowerCase():'unknown';if(!packages.has(key))packages.set(key,[]);packages.get(key).push(f);}
  const known=[...packages.keys()].filter(k=>k!=='unknown'),keys=known.length?known:['unknown'];
  for(const key of keys){const versions=[...packages.get(key),...(key!=='unknown'?(packages.get('unknown')||[]):[])].sort((a,b)=>String(b.sourceUpdated||'').localeCompare(String(a.sourceUpdated||'')));
   const chosen=versions.find(f=>key==='unknown'||f.packageSize?.match(/([\d.]+)\s*(ml|g)\b/i))||versions[0];
   plain.push({...chosen,alternateIds:versions.map(f=>f.id),sourceVersions:versions.map(f=>({providerId:f.providerId,updated:f.sourceUpdated}))});
  }
 }return plain;
}
