// Original illustrative photography. This presentation layer never changes nutrition snapshots.
import {foodGallery,foodGalleryGroups} from './food-gallery.js';
const sheets={
 photos:['rice','milk','chicken','egg','banana','broccoli','sweet-potato','oats','yogurt'],
 produce:['apple','orange','strawberry','blueberry','watermelon','mango','avocado','cucumber','spinach-raw','spinach','carrot','tomato','potato','corn','peanut','almond','walnut','edamame','tofu','lettuce','pear','grape','kiwi','pineapple'],
 staples:['brown-rice','white-bread','whole-bread','noodles','soba','lamb','beef','pork','salmon','shrimp-raw','shrimp','coffee','green-tea','black-tea','latte','iced-latte','milk-tea','soy-milk','cheese','mixed-vegetables','green-beans','cappuccino','fried-egg','soybean'],
 dishes:['tomato-egg','fried-rice','mantou','dumpling','potsticker','steamed-dumpling','bao','lo-mein','congee','vegetable-congee','egg-congee','meat-congee','hot-sour-soup','egg-soup','wonton-soup','kung-pao','sweet-sour-pork','beef-rice','chicken-rice','spring-roll','sweet-sour-rice','shrimp-rice','chicken-fried-rice','shrimp-noodles'],
 basics:['beef-raw','pork-raw','lamb-raw','chicken-raw','salmon-raw','egg-raw','potato-cooked','corn-kernels','flour','oil','butter','sugar','salt','honey','chocolate','water','orange-juice','cola','mushroom','eggplant','bok-choy','cabbage','pumpkin','peach']
};
export const foodArtAssets=[...Object.keys(sheets).map(name=>'food-'+name+'.png'),...Object.keys(foodGalleryGroups).map(name=>'food-gallery-'+name+'.webp')];
export const foodArtManifest=Object.fromEntries([...Object.entries(sheets).flatMap(([sheet,keys])=>keys.map((key,index)=>[key,{key,sheet,index,columns:sheet==='photos'?3:6,rows:sheet==='photos'?3:4,kind:'illustration'}])),...foodGallery.map(f=>[f.id,{key:f.id,sheet:f.sheet,index:f.cell,columns:6,rows:4,kind:'illustration'}])]);
const galleryIndex=new Map(foodGallery.map(f=>[f.id,f]));

// Pinned mappings for the reviewed Chinese catalog and recipes. Variants share a food-type
// illustration, never a package photo or a claim about ingredients/portion/cooking method.
const pinned={
 'recipe-tomato-egg':'tomato-egg','recipe-egg-rice':'fried-rice','recipe-mantou':'mantou','recipe-dumpling':'dumpling','recipe-spinach':'spinach',
 '168483':'sweet-potato','168878':'rice','169283':'edamame','169967':'broccoli','171265':'milk','171477':'chicken','171688':'apple','172475':'tofu','172476':'tofu','173424':'egg','173944':'banana','175168':'salmon',
 '167762':'strawberry','167765':'watermelon','168409':'cucumber','168462':'spinach-raw','168463':'spinach','168875':'brown-rice','168880':'rice','168882':'rice','168907':'soba','168909':'noodles','168926':'noodles','169097':'orange','169705':'oats','169910':'mango','170026':'potato','170050':'tomato','170187':'walnut','170393':'carrot','170567':'almond','170886':'yogurt','171284':'yogurt','171661':'oats','171705':'avocado','171711':'blueberry','171890':'coffee','171891':'coffee','171917':'green-tea','172430':'peanut','173227':'black-tea','174120':'black-tea','175179':'shrimp-raw','175180':'shrimp',
 '2706391':'beef','2706400':'pork','2706401':'sweet-sour-pork','2706434':'chicken','2706497':'beef-rice','2706542':'chicken-rice','2706655':'sweet-sour-rice','2706796':'kung-pao','2707136':'hot-sour-soup','2707282':'egg-soup','2708344':'dumpling','2708418':'congee','2708700':'spring-roll','2708701':'spring-roll','2708705':'potsticker','2708706':'potsticker','2708708':'steamed-dumpling','2708724':'bao','2708725':'bao','2708799':'lo-mein','2708800':'shrimp-noodles','2708801':'lo-mein','2708802':'lo-mein','2708803':'lo-mein','2708951':'fried-rice','2708953':'chicken-fried-rice','2708954':'fried-rice','2708955':'fried-rice','2708956':'shrimp-rice','2708981':'meat-congee','2708983':'vegetable-congee','2708984':'egg-congee','2709160':'wonton-soup','2710035':'mixed-vegetables','2710036':'mixed-vegetables','2710041':'green-beans','2710386':'latte','2710387':'latte','2710388':'latte','2710431':'iced-latte','2710472':'cappuccino','2710506':'milk-tea'
};
const named={
 '米饭':'rice','白米饭':'rice','糙米饭':'brown-rice','全脂牛奶':'milk','牛奶':'milk','低脂牛奶':'milk','脱脂牛奶':'milk','鸡胸肉':'chicken','水煮蛋':'egg','鸡蛋':'egg-raw','煎蛋':'fried-egg','香蕉':'banana','西兰花':'broccoli','红薯':'sweet-potato','燕麦':'oats','酸奶':'yogurt','原味酸奶':'yogurt',
 '苹果':'apple','橙子':'orange','草莓':'strawberry','蓝莓':'blueberry','西瓜':'watermelon','芒果':'mango','牛油果':'avocado','黄瓜':'cucumber','菠菜':'spinach-raw','清炒菠菜':'spinach','胡萝卜':'carrot','番茄':'tomato','西红柿':'tomato','土豆':'potato','玉米':'corn','花生':'peanut','杏仁':'almond','核桃':'walnut','毛豆':'edamame','豆腐':'tofu','生菜':'lettuce','梨':'pear','葡萄':'grape','猕猴桃':'kiwi','菠萝':'pineapple','桃子':'peach',
 '白面包':'white-bread','全麦面包':'whole-bread','面条':'noodles','荞麦面':'soba','牛肉':'beef-raw','猪肉':'pork-raw','羊肉':'lamb-raw','三文鱼':'salmon-raw','虾':'shrimp-raw','咖啡':'coffee','黑咖啡':'coffee','绿茶':'green-tea','红茶':'black-tea','乌龙茶':'black-tea','拿铁':'latte','冰拿铁':'iced-latte','奶茶':'milk-tea','豆浆':'soy-milk','豆奶':'soy-milk','奶酪':'cheese','四季豆':'green-beans','黄豆':'soybean',
 '番茄炒蛋':'tomato-egg','西红柿炒鸡蛋':'tomato-egg','鸡蛋炒饭':'fried-rice','炒饭':'fried-rice','馒头':'mantou','水饺':'dumpling','饺子':'dumpling','煎饺':'potsticker','锅贴':'potsticker','蒸饺':'steamed-dumpling','包子':'bao','捞面':'lo-mein','白粥':'congee','蔬菜粥':'vegetable-congee','鸡蛋粥':'egg-congee','瘦肉粥':'meat-congee','酸辣汤':'hot-sour-soup','蛋花汤':'egg-soup','馄饨汤':'wonton-soup','宫保鸡丁':'kung-pao','糖醋肉':'sweet-sour-pork','牛肉盖饭':'beef-rice','鸡肉盖饭':'chicken-rice','春卷':'spring-roll','虾仁炒饭':'shrimp-rice','鸡肉炒饭':'chicken-fried-rice',
 '面粉':'flour','食用油':'oil','橄榄油':'oil','黄油':'butter','白糖':'sugar','食盐':'salt','蜂蜜':'honey','黑巧克力':'chocolate','饮用水':'water','橙汁':'orange-juice','蘑菇':'mushroom','茄子':'eggplant','小白菜':'bok-choy','大白菜':'cabbage','南瓜':'pumpkin'
};
// Subject anchored: apple pie is not an apple, chicken rice is not a chicken breast.
const subjects=[
 [/^congee,.*(?:meat|poultry|seafood)/i,'meat-congee'],[/^congee,.*vegetables/i,'vegetable-congee'],[/^congee,.*egg/i,'egg-congee'],[/^congee$/i,'congee'],
 [/^potsticker or wonton,/i,'potsticker'],[/^tofu, (?:firm|regular|soft), prepared/i,'tofu'],[/^bananas,.*raw/i,'banana'],[/^blueberries,.*raw/i,'blueberry'],
 [/^crustaceans, shrimp,.*cooked/i,'shrimp'],[/^crustaceans, shrimp,.*raw/i,'shrimp-raw'],[/^broccoli, frozen,.*cooked/i,'broccoli'],[/^potatoes,.*baked/i,'potato-cooked'],
 [/^rice, brown,.*cooked/i,'brown-rice'],[/^rice, white,.*cooked/i,'rice'],[/^milk, (?:whole|reduced fat|lowfat|nonfat|low fat|skim),.*(?:fluid|milkfat)/i,'milk'],[/^yogurt, plain,/i,'yogurt'],[/^(?:oats(?:\s|$)|cereals, oats,.*plain)/i,'oats'],
 [/^apples, raw/i,'apple'],[/^oranges, raw/i,'orange'],[/^strawberries, raw/i,'strawberry'],[/^blueberries, raw/i,'blueberry'],[/^watermelon, raw/i,'watermelon'],[/^mangos, raw/i,'mango'],[/^avocados, raw/i,'avocado'],[/^bananas, raw/i,'banana'],[/^pears, raw/i,'pear'],[/^grapes,.*raw/i,'grape'],[/^kiwifruit,.*raw/i,'kiwi'],[/^pineapple, raw/i,'pineapple'],[/^peaches, raw/i,'peach'],
 [/^cucumber,.*raw/i,'cucumber'],[/^spinach, raw/i,'spinach-raw'],[/^spinach, cooked/i,'spinach'],[/^carrots, (?:raw|cooked)/i,'carrot'],[/^tomatoes,.*(?:raw|cooked)/i,'tomato'],[/^potatoes,.*raw/i,'potato'],[/^potatoes,.*(?:boiled|cooked)/i,'potato-cooked'],[/^sweet potato, cooked/i,'sweet-potato'],[/^corn, sweet,/i,'corn-kernels'],[/^broccoli, (?:raw|cooked)/i,'broccoli'],[/^lettuce,/i,'lettuce'],[/^mushrooms,/i,'mushroom'],[/^eggplant,/i,'eggplant'],[/^cabbage, chinese \(pak/i,'bok-choy'],[/^cabbage, chinese \(pe-tsai/i,'cabbage'],[/^pumpkin,/i,'pumpkin'],
 [/^peanuts,.*(?:raw|roasted)/i,'peanut'],[/^nuts, almonds/i,'almond'],[/^nuts, walnuts/i,'walnut'],[/^soybeans, green/i,'edamame'],[/^soybeans, mature seeds/i,'soybean'],[/^tofu, raw,/i,'tofu'],[/^cheese,/i,'cheese'],[/^soymilk, (?:original|unsweetened|plain)/i,'soy-milk'],
 [/^bread, white,/i,'white-bread'],[/^bread, (?:whole-wheat|wheat),/i,'whole-bread'],[/^noodles, japanese, soba, cooked/i,'soba'],[/^noodles, (?:egg|japanese, somen),.*cooked/i,'noodles'],
 [/^beef,.*raw/i,'beef-raw'],[/^beef,.*cooked/i,'beef'],[/^pork, fresh,.*raw/i,'pork-raw'],[/^pork, fresh,.*cooked/i,'pork'],[/^lamb,.*raw/i,'lamb-raw'],[/^lamb,.*cooked/i,'lamb'],[/^chicken,.*breast,.*raw/i,'chicken-raw'],[/^chicken,.*breast,.*(?:roasted|cooked)/i,'chicken'],[/^fish, salmon,.*raw/i,'salmon-raw'],[/^fish, salmon,.*cooked/i,'salmon'],[/^crustaceans, shrimp, raw/i,'shrimp-raw'],[/^crustaceans, shrimp, cooked/i,'shrimp'],[/^egg, whole, raw/i,'egg-raw'],[/^egg, whole, cooked, hard-boiled/i,'egg'],[/^egg, whole, cooked, fried/i,'fried-egg'],
 [/^beverages, coffee, brewed,/i,'coffee'],[/^beverages, tea, green, brewed/i,'green-tea'],[/^beverages, tea, (?:black|oolong), brewed/i,'black-tea'],[/^wheat flour,/i,'flour'],[/^oil, (?:olive|canola|soybean|corn|sunflower)/i,'oil'],[/^butter, (?:salted|without salt)/i,'butter'],[/^sugars, granulated/i,'sugar'],[/^salt, table/i,'salt'],[/^honey$/i,'honey'],[/^chocolate, dark,/i,'chocolate'],[/^water, (?:tap|bottled)/i,'water'],[/^orange juice, (?:raw|chilled)/i,'orange-juice'],[/^beverages, carbonated, cola,/i,'cola']
];
export function foodArtwork(record){
 const food=typeof record==='string'?{name:record}:record?.foodSnapshot||record||{};
 // No generated type image may impersonate the packaging of a specific SKU.
 if(food.matchKind==='brand'||food.brand||food.barcode)return null;
 const gallery=galleryIndex.get(food.id||record?.foodId);
 if(gallery&&gallery.expectedOriginal===food.originalName)return foodArtManifest[gallery.id];
 const id=String(food.id||record?.foodId||'').replace(/^fdc-/,''),pinnedKey=pinned[id];
 if(pinnedKey)return foodArtManifest[pinnedKey];
 const original=food.originalName||'',plainName=String(food.name||'').split(/[（(]/)[0].trim();
 // Only complete common names are inferred for personal/legacy records.
 const key=original?subjects.find(([pattern])=>pattern.test(original))?.[1]:named[plainName];
 if(key==='milk'&&/chocolate|flavor|cocoa|condensed|evaporated|powder|dry/i.test(original))return null;
 if(/^(?:beef|pork|lamb|chicken|salmon|shrimp)(?:-raw)?$/.test(key||'')&&/breaded|ground|liver|kidney|heart|sausage|with (?:rice|noodles|pasta)/i.test(original))return null;
 return foodArtManifest[key]||null;
}
