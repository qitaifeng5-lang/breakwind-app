"""Rebuild public CC0 food data from original USDA downloads, no invented nutrients.
Usage: python scripts/build-food-catalog.py [.expo/food-source]
"""
import csv,io,json,zipfile,re,hashlib,argparse,urllib.request,shutil
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('root',nargs='?',default='.expo/food-source');parser.add_argument('--download',action='store_true');args=parser.parse_args();root=Path(args.root)
sources={
 'sr.zip':('https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip','b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0'),
 'fndds.zip':('https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip','dfb06ae7ddc397ccd570b91c14b75438ab2ba39f64f22d321f61d4a52a77f3eb'),
 'branded.zip':('https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_branded_food_csv_2026-10-29.zip','17f1e52ea91854d8c6c266487597bf1dd6ce63441bfe27c9e61f64e2768440c7')}
root.mkdir(parents=True,exist_ok=True)
for name,(url,digest) in sources.items():
 path=root/name
 if not path.exists() and args.download:
  with urllib.request.urlopen(url,timeout=120) as response,path.open('wb') as output:shutil.copyfileobj(response,output)
 if not path.exists():raise SystemExit('Missing '+name+'; run with --download for official public downloads')
 with path.open('rb') as stream:actual=hashlib.file_digest(stream,'sha256').hexdigest()
 if actual!=digest:raise SystemExit('Source hash mismatch: '+name+'; review new source before regenerating')

out=Path('public/food-data.js')
keys={'1008':'kcal','1003':'protein','1005':'carbs','1004':'fat'}
# Editorial search translations only. Original descriptions and preparation are retained.
terms=[(r'rice.*\bcooked\b|rice, fried','米饭 白饭 mif an mifan'),('rice, brown','糙米'),('rice, fried','炒饭'),('rice','大米'),('noodle|spaghetti|macaroni|pasta','面条 面食 意面 miantiao'),('bread','面包'),('steamed.*bun|bun.*steamed','馒头 包子'),('dumpling|potsticker|wonton','饺子 馄饨'),('oat','燕麦'),('porridge|congee','粥'),('milk','牛奶 niunai'),('yogurt','酸奶'),('cheese','奶酪 芝士'),('egg','鸡蛋 jid an jidan'),('tofu','豆腐'),('soymilk|soy milk','豆浆 豆奶'),('soybean','黄豆 大豆'),('edamame','毛豆'),('lentil','扁豆'),('chickpea|garbanzo','鹰嘴豆'),('beans?','豆类'),('chicken','鸡肉'),('turkey','火鸡肉'),('beef','牛肉'),('pork','猪肉'),('lamb','羊肉'),('duck','鸭肉'),('shrimp','虾'),('salmon','三文鱼 鲑鱼'),('tuna','金枪鱼'),('cod,|codfish','鳕鱼'),('tilapia','罗非鱼'),('fish','鱼'),('apple','苹果'),('banana','香蕉'),('orange','橙子'),('grape','葡萄'),(r'strawberr\w*','草莓'),(r'blueberr\w*','蓝莓'),('watermelon','西瓜'),('mango','芒果'),('pineapple','菠萝'),('pear','梨'),('peach','桃子'),('kiwi','猕猴桃 奇异果'),('avocado','牛油果'),('tomato','番茄 西红柿'),('potato, sweet|sweet potato','红薯 地瓜 番薯'),('potato','土豆 马铃薯'),('broccoli','西兰花 西蓝花'),('spinach','菠菜'),('cabbage','卷心菜 包菜'),('bok choy|pak choi','小白菜 青菜'),('carrot','胡萝卜'),('cucumber','黄瓜'),('eggplant','茄子'),('mushroom','蘑菇'),('pepper','辣椒 甜椒'),('onion','洋葱'),('pumpkin','南瓜'),('corn','玉米'),('peas?','豌豆'),('peanut','花生'),('almond','杏仁'),('walnut','核桃'),('cashew','腰果'),('sesame','芝麻'),('sunflower','葵花籽'),('coffee','咖啡'),('tea','茶'),('juice','果汁'),('cola','可乐'),('water,','水'),('chocolate','巧克力'),('cracker','饼干'),('cookie','曲奇 饼干'),('cake','蛋糕'),('ice cream','冰淇淋'),('pizza','披萨'),('hamburger|cheeseburger','汉堡'),('french fries|french fried','薯条'),('sandwich','三明治'),('soup','汤'),('oil','食用油'),('olive oil','橄榄油'),('butter','黄油'),('sugar','白糖'),('honey','蜂蜜'),('salt','盐'),('original','原味'),('vanilla','香草'),('unsweetened|sugar free','无糖'),('lowfat|low fat','低脂'),('skim|nonfat','脱脂'),('sausage','香肠'),('ham,','火腿'),('bacon','培根'),('kfc|kentucky fried','肯德基'),("mcdonald",'麦当劳'),('starbucks','星巴克'),('subway','赛百味')]
legacy={168878:('白米饭（熟）','米饭 白饭 大米 rice',150),173944:('香蕉','水果 banana',118),173424:('鸡蛋（水煮）','鸡蛋 煮蛋 egg',50),171477:('鸡胸肉（烤，去皮）','鸡肉 鸡胸 chicken',100),171265:('全脂牛奶','牛奶 奶 milk',245),171688:('苹果（带皮）','水果 苹果 apple',182),169967:('西兰花（水煮）','西蓝花 花椰菜 broccoli',100),168483:('红薯（烤熟，去皮）','地瓜 番薯 甘薯 sweet potato',130),172475:('硬豆腐（石膏凝固，未烹调）','豆腐 老豆腐 tofu',100),172476:('普通豆腐（石膏凝固，未烹调）','豆腐 tofu',100),169283:('毛豆（水煮，无盐）','青豆 大豆 edamame',100),175168:('养殖大西洋三文鱼（烤熟）','三文鱼 鲑鱼 salmon',100)}
def translated(desc):
 matches=[zh for en,zh in terms if re.search(r'(?<![a-z])(?:'+en+r')(?:s|es)?(?![a-z])',desc,re.I)]
 if re.search('sea cucumber',desc,re.I):matches=[x for x in matches if x!='黄瓜']+['海参']
 if re.search('sweet potato',desc,re.I):matches=[x for x in matches if x!='土豆 马铃薯']
 if re.search(r'(soy|almond|oat|rice|coconut).*milk',desc,re.I):matches=[x for x in matches if not x.startswith('牛奶')]
 if re.search('rice vinegar',desc,re.I):matches=[x for x in matches if x!='大米']+['米醋']
 if re.search('soy sauce',desc,re.I):matches+=['酱油 生抽']
 states=[zh for en,zh in [('raw','生'),(r'\bcooked\b|boiled','熟'),('fried','煎炸'),('roasted|baked','烤'),('dried','干制'),('canned','罐装'),('without salt','无盐')] if re.search(en,desc,re.I)]
 return ('、'.join(x.split()[0] for x in matches[:3])+('（'+ '／'.join(states)+'）' if states else '')+' · '+desc if matches else desc),' '.join(matches)
def base(fid,desc,provider,date):
 name,aliases=translated(desc)
 row={'id':'fdc-'+str(fid),'provider':'USDA FDC','providerId':str(fid),'name':name,'originalName':desc,'aliases':aliases,'portion':100,'basis':{'amount':100,'unit':'g'},'portions':[],'source':'USDA FoodData Central · '+provider,'url':'https://fdc.nal.usda.gov/food-details/'+str(fid)+'/nutrients','sourceUpdated':date,'retrieved':'2026-11-12','license':'CC0-1.0','verification':'official-dataset-not-individual-label','market':'美国参考','matchKind':'generic','kcal':None,'protein':None,'carbs':None,'fat':None}
 if fid in legacy:row.update(name=legacy[fid][0],aliases=legacy[fid][1],portion=legacy[fid][2],preferred=True)
 return row
def table(z,name):
 path=next(n for n in z.namelist() if n.endswith('/'+name));return csv.DictReader(io.TextIOWrapper(z.open(path),encoding='utf-8-sig'))
z=zipfile.ZipFile(root/'sr.zip');rows={r['fdc_id']:base(int(r['fdc_id']),r['description'],'SR Legacy',r['publication_date']) for r in table(z,'food.csv')}
for r in table(z,'food_nutrient.csv'):
 if r['nutrient_id'] in keys and r['amount']!='': rows[r['fdc_id']][keys[r['nutrient_id']]]=float(r['amount'])
for r in table(z,'food_portion.csv'):
 if r['gram_weight'] and float(r['gram_weight'])>0:
  rows[r['fdc_id']]['portions'].append({'label':(r['amount']+' '+(r['modifier'] or r['portion_description'])).strip(),'amount':float(r['gram_weight']),'unit':'g','source':'USDA food_portion '+r['id']})
z=zipfile.ZipFile(root/'fndds.zip');survey=json.load(z.open(next(n for n in z.namelist() if n.endswith('.json'))))['SurveyFoods']
for f in survey:
 r=base(f['fdcId'],f['description'],'FNDDS 2021–2023',f.get('publicationDate'));r['matchKind']='estimate';r['verification']='survey-food-estimate-not-restaurant-official'
 for n in f['foodNutrients']:
  key=keys.get(str(n['nutrient']['id']))
  if key and isinstance(n.get('amount'),(int,float)):r[key]=n['amount']
 r['portions']=[{'label':p.get('portionDescription') or p.get('modifier'),'amount':p['gramWeight'],'unit':'g','source':'USDA foodPortions '+str(p['id'])} for p in f.get('foodPortions',[]) if p.get('gramWeight',0)>0]
 rows[str(f['fdcId'])]=r

# Branded subset is selected reproducibly from the official bulk release, not API scraping.
brands=[('coca-cola','可口可乐'),('pepsi','百事'),('quaker','桂格'),('oreo','奥利奥'),('nissin','日清'),('nongshim','农心'),('kikkoman','龟甲万'),('lee kum kee','李锦记'),('vitasoy','维他奶'),('yili','伊利'),('mengniu','蒙牛'),('wahaha','娃哈哈'),('oatly','燕麦奶 OATLY'),('danone','达能'),('yoplait','优诺'),('chobani','Chobani'),('nestle','雀巢'),('kellogg','家乐氏'),('lays','乐事'),('lay\'s','乐事'),('frito-lay','菲多利'),('tropicana','纯果乐')]
if (root/'branded.zip').exists():
 z=zipfile.ZipFile(root/'branded.zip');picked={};identity={}
 for b in table(z,'branded_food.csv'):
  label=(b.get('brand_name','')+' '+b.get('brand_owner','')).lower();aliases=' '.join(zh for en,zh in brands if en in label)
  if not aliases and b.get('market_country','') not in ['China','Hong Kong','Taiwan']:continue
  if b.get('discontinued_date') or b.get('serving_size_unit','').lower() not in ['g','grm','ml','mlt']:continue
  unit='ml' if b['serving_size_unit'].lower() in ['ml','mlt'] else 'g'
  if not b.get('gtin_upc'):continue
  key=(b['gtin_upc'].zfill(14),'United States' if b.get('market_country')=='US' else b.get('market_country',''),b.get('package_weight',''),b.get('brand_name',''),b.get('serving_size',''),unit)
  previous=identity.get(key)
  if previous and picked[previous].get('modified_date','')>=b.get('modified_date',''):continue
  if previous:del picked[previous]
  identity[key]=b['fdc_id'];b['unit']=unit;b['aliasesZh']=aliases;picked[b['fdc_id']]=b
 print('Selected branded',len(picked),flush=True)
 for f in table(z,'food.csv'):
  if f['fdc_id'] not in picked:continue
  b=picked[f['fdc_id']];r=base(int(f['fdc_id']),f['description'],'Branded October 2026',b.get('modified_date'))
  r.update(brand=b.get('brand_name') or b['brand_owner'],brandOwner=b['brand_owner'],barcode=b['gtin_upc'],market=('United States' if b.get('market_country')=='US' else b.get('market_country')) or '地区未提供',packageSize=b.get('package_weight') or '包装净含量未提供',servingText=b.get('household_serving_fulltext'),matchKind='brand',verification='provider-label-record-check-local-package',basis={'amount':100,'unit':b['unit']})
  r['name']=r['brand']+' · '+r['name']+' · '+r['packageSize'];r['aliases']+=' '+b['aliasesZh']
  try:r['portion']=float(b['serving_size'])
  except ValueError:r['portion']=100
  if not r['portion']>0:r['portion']=100
  if r['servingText']:r['portions']=[{'label':r['servingText'],'amount':r['portion'],'unit':b['unit'],'source':'USDA branded_food serving_size'}]
  # A package shortcut only when its net amount explicitly uses the same basis unit.
  m=re.search(r'([\d.]+)\s*'+('ml' if b['unit']=='ml' else 'g')+r'\b',b.get('package_weight',''),re.I)
  if m:r['portions'].append({'label':'整包／瓶标注净含量','amount':float(m.group(1)),'unit':b['unit'],'source':'USDA package_weight'})
  rows[f['fdc_id']]=r
 for n in table(z,'food_nutrient.csv'):
  if n['fdc_id'] in picked and n['nutrient_id'] in keys and n['amount']!='':rows[n['fdc_id']][keys[n['nutrient_id']]]=float(n['amount'])
 print('Imported brand nutrients',flush=True)
# Search aliases must identify the product brand, not the supplier's entire portfolio.
for r in rows.values():
 if r.get('matchKind')!='brand':continue
 direct=r['originalName']+' '+(r.get('brand','') if r.get('brand')!=r.get('brandOwner') else '')
 normalized=re.sub('[^a-z0-9]','',direct.lower())
 _,basic=translated(r['originalName'])
 r['aliases']=basic+' '+' '.join(zh for en,zh in brands+[('coke','可口可乐'),('fanta','芬达'),('sprite','雪碧'),('gatorade','佳得乐')] if re.sub('[^a-z0-9]','',en) in normalized)
 if r.get('brand')==r.get('brandOwner'):r['brand']='品牌未单列（供应商：'+r['brandOwner']+'）'
foods=list(rows.values());foods.sort(key=lambda f:(not f.get('preferred',False),f['providerId']))
fields=['id','name','originalName','aliases','portion','basis','portions','source','sourceUpdated','market','matchKind','kcal','protein','carbs','fat','brand','brandOwner','barcode','packageSize','servingText','preferred','verification']
compact=[[f.get(k) for k in fields] for f in foods]
script="// Generated USDA CC0 data; rebuild with scripts/build-food-catalog.py.\nconst fields="+json.dumps(fields)+";\nconst rows="+json.dumps(compact,ensure_ascii=False,separators=(',',':'))+";\nexport const foodData=rows.map(row=>{const f=Object.fromEntries(fields.map((key,i)=>[key,row[i]]));return {...f,provider:'USDA FDC',providerId:f.id.slice(4),license:'CC0-1.0',retrieved:'2026-11-12',url:'https://fdc.nal.usda.gov/food-details/'+f.id.slice(4)+'/nutrients'};});\n"
out.write_text(script,encoding='utf-8')
manifest={'license':'CC0-1.0','foods':len(foods),'retrieved':'2026-11-12','sources':[{'file':n,'url':sources[n][0],'sha256':hashlib.sha256((root/n).read_bytes()).hexdigest()} for n in ['sr.zip','fndds.zip','branded.zip'] if (root/n).exists()],'nutrition':'Only original nutrient values; missing values remain null','translation':'Editorial search index; original description retained; not localized Chinese nutrient measurements'}
Path('docs/food-source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Generated',len(foods),'records',out.stat().st_size,'bytes')
