// Household measures are separate from nutrient data. A source cup is never
// renamed a bowl, and a mass measure is never silently converted to volume.
const estimateSource='破风日常份量参考 v1 · 编辑估算，并非薄荷或实测标准';
const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
const round=value=>Math.round(value*1000)/1000;

function stableId(value){
 let hash=2166136261;
 for(const char of value){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
 return 'source-'+(hash>>>0).toString(36);
}

function fraction(value){
 const bits=value.trim().split(/\s+/);
 return bits.reduce((sum,part)=>{const [a,b]=part.split('/').map(Number);return sum+(b===undefined?a:a/b);},0);
}

function countAndDescription(value){
 // Keep a separating space before unicode fractions: “1½” means 1.5.
 const fractions={'½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'};
 const text=String(value||'').replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g,c=>' '+fractions[c]).trim();
 const chinese=text.match(/^(半|一|两|二|三|四|五|六|七|八|九|十)\s*(.+)$/);
 if(chinese){
  const count={'半':0.5,'一':1,'两':2,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}[chinese[1]];
  return {count,description:chinese[2].trim(),original:text};
 }
 const match=text.match(/^(?:about\s+|approximately\s+|约\s*)?(\d+\s+\d+\/\d+|\d+\/\d+|(?:\d+(?:\.\d+)?|\.\d+))\s*(.*)$/i);
 if(!match)return null;
 const count=fraction(match[1]);
 return positive(count)&&match[2].trim()?{count,description:match[2].trim(),original:text}:null;
}

function itemIdentity(food){
 const name=String(food.originalName||'');
 if(/^bananas?, raw(?:,|$)/i.test(name))return {unit:'根',note:'按去皮后的可食部分计。'};
 if(/^egg, whole, (?:raw|cooked, (?:hard-boiled|poached|fried))(?:,|$)/i.test(name))return {unit:'个',note:'按去壳后的可食部分计。'};
 if(/^(?:apples|pears|oranges|peaches|plums|nectarines|tangerines|grapefruit), raw(?:,|$)/i.test(name))return {unit:'个',note:'按该食物来源的可食部分计，果核、果皮是否计入以食物名称为准。'};
 if(/^(?:potatoes|sweet potato|tomatoes|cucumber|carrots),.*\b(?:raw|cooked|boiled|baked)\b/i.test(name))return {unit:'个',note:'按食物名称对应的生熟状态及可食部分计。'};
 return null;
}

function sizeLabel(description){
 if(/\bextra\s+small\b/i.test(description))return '特小';
 if(/\bextra\s+large\b/i.test(description))return '特大';
 if(/\b(?:jumbo|extra-large)\b/i.test(description))return '特大';
 if(/\bsmall\b/i.test(description))return '小';
 if(/\bmedium\b/i.test(description))return '中等';
 if(/\blarge\b/i.test(description))return '大';
 return '';
}

function sourceLabel(description,food){
 const text=description.toLowerCase(),identity=itemIdentity(food),size=sizeLabel(text);
 let label='',note='';
 const chinese=text.match(/^(?:(小|中|大|标准|整))?(碗|份|个|根|片|块|杯|瓶|包|袋|盒|罐|勺|盘)(?:\b|[（(\s]|$)/);
 if(chinese){label=(chinese[1]||'')+chinese[2];}
 else if(/^bowls?\b/.test(text)){label='碗';note='沿用该来源定义的一碗，实际碗型和装盛量可能不同。';}
 else if(/^plates?\b/.test(text)){label='盘';note='沿用该来源定义的一盘，实际装盛量可能不同。';}
 else if(/^cups?\b/.test(text)){
  label='杯';
  if(/\bmashed\b/.test(text))label+='（压泥）';
  else if(/\bslic(?:e|ed|es)\b/.test(text))label+='（切片）';
  else if(/\b(?:chopped|diced|quartered)\b/.test(text))label+='（切块）';
  note='这里的杯沿用来源量杯（cup），不是家用饭碗；装法以来源说明为准。';
 }
 else if(/^(?:tbsp|tbsps|tablespoons?)\b/.test(text)){label='汤匙';note='沿用来源标准汤匙，不是任意家用大勺。';}
 else if(/^(?:tsp|tsps|teaspoons?)\b/.test(text)){label='茶匙';note='沿用来源标准茶匙，不是任意家用小勺。';}
 else if(/^bottles?\b/.test(text))label='瓶';
 else if(/^(?:cartons?|containers?)\b/.test(text))label='盒';
 else if(/^cans?\b/.test(text))label='罐';
 else if(/^(?:pouches?|bags?)\b/.test(text))label='袋';
 else if(/^(?:packages?|packets?)\b/.test(text))label='包';
 else if(/^(?:(?:thin|thick|regular|large|small)\s+)?slices?\b/.test(text)){
  label='片'+(/\bthin\b/.test(text)?'（薄片）':/\bthick\b/.test(text)?'（厚片）':size?'（'+size+'）':'');
 }
 else if(/^(?:pieces?|items?|units?|fruits?|eggs?|cookies?|crackers?|dumplings?|buns?|rolls?|pastries|muffins?)\b/.test(text))label=(identity?.unit||'个')+(size?'（'+size+'）':'');
 else if(/^(?:ears?|stalks?|sticks?)\b/.test(text))label='根'+(size?'（'+size+'）':'');
 else if(/^(?:bars?|squares?|nuggets?|patt(?:y|ies))\b/.test(text))label='块'+(size?'（'+size+'）':'');
 else if(/^(?:(?:nlea|label)\s+)?servings?\b/.test(text))label='份（来源标准）';
 else if(identity&&/^(?:(?:extra\s+)?(?:small|medium|large)|jumbo)\b/.test(text))label=identity.unit+'（'+size+'）';
 if(!label)return null;
 return {label,note:[note,identity?.note].filter(Boolean).join(' ')};
}

function sourcePortions(food,unit){
 const result=[];
 for(const portion of food.portions||[]){
  if(portion.unit!==unit||!positive(portion.amount))continue;
  const parsed=countAndDescription(portion.label);
  // “Quantity not specified” and a bare package weight do not define a
  // countable household unit. Do not guess a bottle, a bag or one serving.
  if(!parsed)continue;
  const display=sourceLabel(parsed.description,food);
  if(!display)continue;
  const amount=round(portion.amount/parsed.count);
  // Counts outside the entry form's mass/volume range are not usable defaults.
  // In particular, do not surface a provider's malformed multi-litre "one can".
  if(!positive(amount)||amount<0.1||amount>5000)continue;
  const source=portion.source||food.source||'该食物的份量记录';
  result.push({
   id:stableId([portion.label,portion.amount,unit,source].join('|')),
   label:display.label,amount,unit,estimated:portion.estimated===true,
   source,note:[display.note,'来源份量：'+parsed.original+' = '+portion.amount+' '+unit+'。',portion.note||''].filter(Boolean).join(' '),
   sourceLabel:portion.label,sourceCount:parsed.count,sourceAmount:portion.amount
  });
 }
 return result;
}

function estimates(food,unit){
 // No generic household guess is applied to a branded product or an unverified
 // custom name. Exact original descriptions and prepared states drive these
 // optional estimates, not an ingredient/flavour search match.
 if(unit!=='g'||food.matchKind==='brand'||food.matchKind==='personal')return [];
 const name=String(food.originalName||'');
 let key='',amounts=[],note='';
 if(/^(?:rice, (?:white|brown),|wild rice,).*\bcooked\b/i.test(name)&&!/(?:uncooked|dry|fried|mix)/i.test(name)){
  key='rice';amounts=[['中碗',150],['小碗',100],['大碗',200]];
  note='熟米饭的编辑估算；按盛平的一碗计，紧实度和饭碗大小会改变实际重量。';
 }else if(/^(?:noodles,|rice noodles,|spaghetti,|macaroni,).*\b(?:cooked|boiled)\b/i.test(name)&&!/(?:uncooked|dry|dehydrated|soup)/i.test(name)){
  key='noodles';amounts=[['中碗',200],['小碗',150],['大碗',300]];
  note='熟面条沥水后、不含汤和配菜的编辑估算；有汤、酱或配菜请选对应成品条目。';
 }else if(/^congee(?:,|$)/i.test(name)){
  key='congee';amounts=[['中碗',250],['小碗',200],['大碗',350]];
  note='成品粥含水的编辑估算；稀稠度会改变每碗的营养。';
 }else if(/^rice, fried(?:,|$)/i.test(name)){
  key='fried-rice';amounts=[['份',300],['小份',200],['大份',400]];
  note='炒饭成品的编辑估算；按本条目配方参考，实际用油与配料可能不同。';
 }else if(/^(?:kung pao chicken|sweet and sour pork|asian stir fry vegetables, cooked)(?:,|$)/i.test(name)){
  key='dish';amounts=[['份',200],['小份',150],['大份',300]];
  note='取到自己餐盘中的菜量，不是整桌公用一盘；为成品份量编辑估算。';
 }else if(/^soup, (?:wonton|egg drop|hot and sour)$/.test(name.toLowerCase())){
  key='soup';amounts=[['中碗',250],['小碗',200],['大碗',350]];
  note='本条目成品汤含汤料的编辑估算；实际汤料比例可能不同。';
 }else if(food.matchKind==='recipe'&&food.recipe){
  const recipe=food.id;
  if(recipe==='recipe-mantou'){
   key='mantou';amounts=[['个（中等）',80],['个（小）',50],['个（大）',120]];
   note='蒸熟馒头可食部分的编辑估算；大小不同请切换单位。';
  }else if(recipe==='recipe-dumpling'){
   key='dumpling';amounts=[['个',25],['份（10个）',250]];
   note='本配方每个成品饺子约25 g的编辑估算；一份按10个计。';
  }else if(positive(food.recipe.yieldAmount)&&['recipe-tomato-egg','recipe-egg-rice','recipe-spinach'].includes(recipe)){
   key=recipe;amounts=[['份',food.recipe.yieldAmount]];
   note='一份指当前示例配方的全部成品；成品产量本身为估算，可用半份记录分食。';
  }
 }
 return amounts.map(([label,amount],i)=>({id:'estimate-'+key+'-'+i+'-v1',label,amount:round(amount),unit,estimated:true,source:estimateSource,note}));
}

function sourcePriority(portion){
 if(/^(?:盒|瓶|袋|包|罐)$/.test(portion.label))return 0;
 if(/^[个根片块]/.test(portion.label))return /中等/.test(portion.label)?1:/特[小大]/.test(portion.label)?4:/[小大]/.test(portion.label)?3:2;
 if(/^份/.test(portion.label))return 4;
 if(/^杯/.test(portion.label))return 5;
 return 6;
}

/**
 * A household option's amount is the mass/volume of ONE option unit; multiply
 * by the user's quantity. Return no option when its identity/measure is unknown.
 * Persist the selected option and quantity with the meal rather than looking it
 * up again when editing old records.
 */
export function householdPortions(food){
 if(!food||typeof food!=='object')return [];
 const unit=food.basis?.unit||'g';
 if(!['g','ml'].includes(unit))return [];
 const sourced=sourcePortions(food,unit).sort((a,b)=>sourcePriority(a)-sourcePriority(b));
 const options=[...estimates(food,unit),...sourced];
 const seen=new Set();
 return options.filter(option=>{const key=[option.label,option.amount,option.unit].join('|');if(seen.has(key))return false;seen.add(key);return true;});
}
