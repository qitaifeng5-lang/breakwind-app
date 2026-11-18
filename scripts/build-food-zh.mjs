import {foodData} from '../public/food-data.js';
import {writeFile} from 'node:fs/promises';
// Editorial names only. Every selection is pinned to the original description in the output.
const rules=[
 ['宫保鸡丁（美国调查参考）','宫保鸡丁 宫保鸡肉 家常菜',/^Kung pao chicken$/],
 ['糖醋猪肉（美国调查参考）','糖醋肉 咕咾肉 家常菜',/^Sweet and sour pork$/],
 ['糖醋肉配饭（调查参考）','盖饭 糖醋肉饭',/^Sweet and sour pork with rice$/],
 ['酱汁牛肉配饭（调查参考）','盖饭 牛肉盖饭 酱汁牛肉饭',/^Beef and rice with soy-based sauce$/],
 ['鸡肉或火鸡肉配饭（酱汁，调查参考）','盖饭 鸡肉盖饭',/^Chicken or turkey and rice with soy-based sauce$/],
 ['烤牛肉（无酱，美国调查参考）','烧烤 烤牛肉',/^Barbecue beef, no sauce$/],
 ['烤猪肉（无酱，美国调查参考）','烧烤 烤猪肉',/^Barbecue pork, no sauce$/],
 ['烤鸡肉（美国调查参考）','烧烤 烤鸡肉',/^Barbecue chicken$/],
 ['川味四季豆（熟，调查参考）','家常菜 四季豆 川味四季豆',/^Green beans, cooked, Szechuan-style$/],
 ['拿铁（调查参考）','拿铁 咖啡 牛奶咖啡',/^Coffee, Latte$/],
 ['脱脂奶拿铁（调查参考）','拿铁 脱脂拿铁 咖啡',/^Coffee, Latte, nonfat$/],
 ['植物奶拿铁（奶种未细分）','拿铁 植物奶拿铁 咖啡',/^Coffee, Latte, with non-dairy milk$/],
 ['冰拿铁（调查参考）','冰拿铁 拿铁 咖啡',/^Coffee, Iced Latte$/],
 ['卡布奇诺（调查参考）','卡布奇诺 咖啡',/^Coffee, Cappuccino$/],
 ['热茶加奶（配方未细分，调查参考）','奶茶 热奶茶 热茶加奶',/^Tea, hot, with milk$/],

 ['包子（馅料未细分）','包子 肉包 baozi',/^Bao bun$/],['素包子','包子 素菜包',/^Bao bun, no meat$/],
 ['素馅饺子','饺子 素饺',/^Dumpling, no meat$/],['蒸饺／蒸馄饨（馅料未细分）','蒸饺 饺子 馄饨',/^Wonton, dumpling or pot sticker, steamed$/],
 ['煎饺／锅贴（馅料未细分）','锅贴 煎饺',/^Wonton, dumpling or pot sticker, fried$/],['素煎饺／锅贴','素锅贴 煎饺',/^Wonton, dumpling or pot sticker, fried, no meat$/],
 ['白粥（调查参考）','粥 白粥 稀饭',/^Congee$/],['肉类／海鲜粥（类别未细分）','肉粥 海鲜粥',/^Congee, with meat, poultry, and\/or seafood$/],['蔬菜粥','菜粥 蔬菜粥',/^Congee, with vegetables$/],['鸡蛋粥','鸡蛋粥',/^Congee, with egg$/],
 ['素炒饭（调查参考）','炒饭 素炒饭',/^Rice, fried, meatless$/],['鸡肉炒饭','炒饭 鸡肉炒饭',/^Rice, fried, with chicken$/],['猪肉炒饭','炒饭 猪肉炒饭',/^Rice, fried, with pork$/],['牛肉炒饭','炒饭 牛肉炒饭',/^Rice, fried, with beef$/],['虾仁炒饭','炒饭 虾仁炒饭',/^Rice, fried, with shrimp$/],
 ['素捞面（调查参考）','面条 捞面 拌面',/^Lo mein, meatless$/],['虾仁捞面','捞面 虾仁面',/^Lo mein, with shrimp$/],['猪肉捞面','捞面 猪肉面',/^Lo mein, with pork$/],['牛肉捞面','捞面 牛肉面',/^Lo mein, with beef$/],['鸡肉捞面','捞面 鸡肉面',/^Lo mein, with chicken$/],
 ['馄饨汤（调查参考）','馄饨 云吞 抄手',/^Soup, wonton$/],['蛋花汤（调查参考）','鸡蛋汤 蛋花汤',/^Soup, egg drop$/],['酸辣汤（调查参考）','酸辣汤',/^Soup, hot and sour$/],
 ['炒什锦蔬菜（加油）','炒菜 家常菜 炒蔬菜',/^Asian stir fry vegetables, cooked, fat added$/],['什锦蔬菜（熟，不加油）','蔬菜 熟蔬菜',/^Asian stir fry vegetables, cooked, no added fat$/],
 ['素春卷（调查参考）','春卷',/^Egg roll, meatless$/],['虾仁春卷','春卷 虾仁春卷',/^Egg roll, with shrimp$/],
 ['糙米饭（中粒，熟）','糙米 糙米饭 米饭',/^Rice, brown, medium-grain, cooked/],['白米饭（中粒，熟）','白米饭 米饭',/^Rice, white, medium-grain, enriched, cooked$/],['白米饭（短粒，熟）','米饭 白米饭',/^Rice, white, short-grain, enriched, cooked$/],
 ['鸡蛋面（熟，无添加盐）','面条 鸡蛋面',/^Noodles, egg, unenriched, cooked, without added salt$/],['荞麦面（熟）','面条 荞麦面',/^Noodles, japanese, soba, cooked$/],['细面（熟）','面条 素面',/^Noodles, japanese, somen, cooked$/],
 ['燕麦（干）','燕麦 燕麦片',/^Oats \(/],['原味即食燕麦（干，强化）','燕麦 燕麦片',/^Cereals, oats, instant, fortified, plain, dry$/],
 ['原味低脂酸奶','酸奶 原味酸奶',/^Yogurt, plain, low fat$/],['原味全脂酸奶','酸奶 全脂酸奶',/^Yogurt, plain, whole milk/],
 ['胡萝卜（生）','胡萝卜',/^Carrots, raw$/],['黄瓜（带皮，生）','黄瓜',/^Cucumber, with peel, raw$/],['菠菜（生）','菠菜',/^Spinach, raw$/],['菠菜（水煮，无盐）','菠菜 熟菠菜',/^Spinach, cooked, boiled, drained, without salt$/],
 ['番茄（红，熟）','西红柿 番茄',/^Tomatoes, red, ripe, cooked$/],['土豆（带皮，生）','土豆 马铃薯',/^Potatoes, flesh and skin, raw$/],
 ['橙子（生）','橙子 橙',/^Oranges, raw, all commercial varieties$/],['草莓（生）','草莓',/^Strawberries, raw$/],['蓝莓（生）','蓝莓',/^Blueberries, raw$/],['西瓜（生）','西瓜',/^Watermelon, raw$/],['芒果（生）','芒果',/^Mangos, raw$/],['牛油果（生）','牛油果 鳄梨',/^Avocados, raw, all commercial varieties$/],
 ['花生（生）','花生',/^Peanuts, all types, raw$/],['杏仁（原味）','杏仁',/^Nuts, almonds$/],['核桃（英国核桃）','核桃',/^Nuts, walnuts, english$/],
 ['虾（熟）','虾 虾仁',/^Crustaceans, shrimp, cooked$/],['虾（生）','虾 虾仁',/^Crustaceans, shrimp, raw$/],
 ['黑咖啡（冲煮）','黑咖啡 美式咖啡 咖啡',/^Beverages, coffee, brewed, prepared with tap water$/],['浓缩咖啡','咖啡 浓缩咖啡 espresso',/^Beverages, coffee, brewed, espresso, restaurant-prepared$/],
 ['绿茶（冲泡）','绿茶 茶',/^Beverages, tea, green, brewed, regular$/],['红茶（冲泡）','红茶 茶',/^Beverages, tea, black, brewed, prepared with tap water$/],['乌龙茶（冲泡）','乌龙茶 茶',/^Beverages, tea, Oolong, brewed$/]
];
const labels=[];for(const [name,aliases,re] of rules){const f=foodData.find(f=>f.matchKind!=='brand'&&re.test(f.originalName));if(!f)throw Error('Missing source '+re);labels.push({id:f.id,name,aliases,expectedOriginal:f.originalName,source:f.url,sourceUpdated:f.sourceUpdated,reviewed:'2026-11-14',scope:f.matchKind==='estimate'?'美国调查食品参考／估算':'美国通用参考'});}
const branded=[
 ['fdc-2622528','VITASOY, SOY DRINK, CHOCOLATE, CHOCOLATE','维他奶巧克力豆奶（250mL，美国市场）','维他奶 巧克力 豆奶 250ml','巧克力'],
 ['fdc-1165176','Gatorade Thirst Quencher Orange 20 Fluid Ounce Plastic Bottle','佳得乐橙味运动饮料（20 fl oz，美国市场）','佳得乐 运动饮料 运动补给 橙味 Gatorade','橙味'],
 ['fdc-2743966','Coca-Cola Bottle, 20 fl oz','可口可乐瓶装（20 fl oz，美国市场）','可口可乐 Coca-Cola 瓶装',''],
 ['fdc-2723877','Quaker Oats Old Fashioned 42 Oz','桂格传统燕麦片（42 oz，美国市场）','桂格 燕麦 燕麦片 Quaker',''],
 ['fdc-1076697','ORIGINAL SOY SAUCE FLAVOR RAMEN NOODLE SOUP, ORIGINAL SOY SAUCE','酱油味拉面（Nissin供应商记录，美国）','日清 酱油味 拉面 速食 Nissin','原味酱油']
];
for(const [id,expectedOriginal,name,aliases,flavor] of branded){const f=foodData.find(f=>f.id===id);if(f?.originalName!==expectedOriginal)throw Error('Product changed '+id);labels.push({id,name,aliases,flavor,expectedOriginal,source:f.url,sourceUpdated:f.sourceUpdated,reviewed:'2026-11-14',scope:'美国商品记录，不是中国版或逐件标签认证'});}
await writeFile('public/food-zh.js','// Names and search aliases only; nutrition is read from the pinned USDA record.\nexport const chineseFoods='+JSON.stringify(labels,null,2)+';\n');
console.log('Reviewed '+labels.length+' names, without changing nutrient values');
