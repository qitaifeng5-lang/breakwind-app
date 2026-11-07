export const nutrients = ['kcal','protein','carbs','fat'];
const row = (fdc,name,aliases,portion,kcal,protein,carbs,fat) => ({
  id:'fdc-'+fdc,name,aliases,portion,kcal,protein,carbs,fat,source:'USDA FoodData Central · SR Legacy',
  url:'https://fdc.nal.usda.gov/food-details/'+fdc+'/nutrients'
});
export const catalog = [
  row(168878,'白米饭（熟）','米饭 白饭 大米 rice',150,130,2.69,28.17,0.28),
  row(173944,'香蕉','水果 banana',118,89,1.09,22.84,0.33),
  row(173424,'鸡蛋（水煮）','鸡蛋 煮蛋 egg',50,155,12.58,1.12,10.61),
  row(171477,'鸡胸肉（烤，去皮）','鸡肉 鸡胸 chicken',100,165,31.02,0,3.57),
  row(171265,'全脂牛奶','牛奶 奶 milk',245,61,3.15,4.8,3.25),
  row(171688,'苹果（带皮）','水果 苹果 apple',182,52,0.26,13.81,0.17),
  row(169967,'西兰花（水煮）','西蓝花 花椰菜 broccoli',100,35,2.38,7.18,0.41),
  row(168483,'红薯（烤熟，去皮）','地瓜 番薯 甘薯 sweet potato',130,90,2.01,20.7,0.15),
  row(172475,'硬豆腐（石膏凝固，未烹调）','豆腐 老豆腐 tofu',100,144,17.3,2.78,8.72),
  row(172476,'普通豆腐（石膏凝固，未烹调）','豆腐 tofu',100,76,8.08,1.87,4.78),
  row(169283,'毛豆（水煮，无盐）','青豆 大豆 edamame',100,141,12.4,11,6.4),
  row(175168,'养殖大西洋三文鱼（烤熟）','三文鱼 鲑鱼 salmon',100,206,22.1,0,12.4)
];
export const searchFood = (items,query) => {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => tokens.every(token => (item.name+' '+(item.aliases||'')+' '+(item.barcode||'')).toLowerCase().includes(token)));
};
export const portionValues = (item,grams) => Object.fromEntries(nutrients.map(key => [key,Number.isFinite(item[key]) ? item[key]*grams/100 : null]));
export function mealTotals(items) {
  return Object.fromEntries(nutrients.map(key => [key,items.length && items.every(item=>Number.isFinite(item[key])) ? items.reduce((total,item)=>total+item[key],0) : null]));
}
export function validBarcode(value) {
  if (!/^(?:\d{8}|\d{12,14})$/.test(value)) return false;
  const sum = [...value.slice(0,-1)].reverse().reduce((total,digit,index)=>total+Number(digit)*(index%2 ? 1 : 3),0);
  return (10-sum%10)%10 === Number(value.at(-1));
}
