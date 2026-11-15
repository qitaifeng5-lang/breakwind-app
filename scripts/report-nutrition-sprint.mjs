import {writeFile,readFile} from 'node:fs/promises';import {catalog,searchFood,foodPortions} from '../public/fuel.js';
const queries=['米饭','白米饭','糙米饭','面条','燕麦','包子','素包子','饺子','蒸饺','锅贴','白粥','鸡蛋粥','虾仁炒饭','鸡肉炒饭','牛肉捞面','馄饨','蛋花汤','酸辣汤','宫保鸡丁','盖饭','糖醋肉饭','烧烤','羊肉串','火锅','拿铁','卡布奇诺','奶茶','珍珠奶茶','佳得乐橙味','维他奶巧克力250ml','桂格传统燕麦片','061954000041','00052000328677','伊利纯牛奶250ml','蒙牛特仑苏','元气森林白桃气泡水','康师傅红烧牛肉面','三全水饺','麦当劳巨无霸中国','肯德基香辣鸡腿堡中国','瑞幸生椰拿铁','喜茶多肉葡萄','宝矿力水特中国500ml'];
const rows=queries.map(query=>{const matches=searchFood(catalog,query),f=matches[0];return {query,result:!f?'未收录':/^\d+$/.test(query)?'条码命中（需核对市场与版本）':f.matchKind==='brand'?'品牌候选（核对市场／口味／规格）':['recipe','estimate'].includes(f.matchKind)?'估算／调查参考':'通用近似',id:f?.id||null,name:f?.name||null,original:f?.originalName||null,market:f?.market||null,source:f?.url||f?.source||null,updated:f?.sourceUpdated||null,flavor:f?.flavor||null,package:f?.packageSize||null,portions:f?foodPortions(f):[],count:matches.length};});
await writeFile('docs/nutrition-sprint-2026-11-14-samples.json',JSON.stringify({date:'2026-11-14',method:'从下载的官方源数据实际检索，不是实时远程API或模型生成',results:rows},null,2));
const sources=JSON.parse(await readFile('docs/food-source-manifest.json','utf8'));
await writeFile('docs/nutrition-sprint-2026-11-14.md',`# 饮食质量整改 · 2026-11-14

基线96c2316，沿用PR #13。训练课程参数、长期周期、会员测试价格未修改。以下是运行实现及数据边界，不是全面中国市场覆盖声明。

## 正式流程

首页改为紧凑营养概览、四餐、单一添加入口、最近与常用组合。搜索和份量采用正式全屏页面，餐次快速切换，最近搜索留在本机，返回保留关键词和列表位置。保存返回原餐次，修改/删除立即更新合计。缺项显示未记录。组合持久化、备份兼容；复制昨日使用历史快照并按来源记录去重。

## 来源与中文覆盖

原批量来源继续使用，新增USDA Foundation 2026-10官方完整下载（424条），保留官方能量字段1008/2048/2047及其原始值，不从宏量倒算未知能量。另有79条名称与检索映射经原始描述逐项对应：含日常食材、包子/粥/炒饭/捞面、调查参考菜品和少量明确市场的品牌。映射文件只含名称和来源ID，不复制一套营养数字。

${sources.sources.map(s=>'- '+s.file+'：'+s.url+'；SHA256 '+s.sha256).join('\n')}

许可证：USDA CC0，https://fdc.nal.usda.gov/api-guide/ 。固定版本下载后校验hash；中文映射检查expectedOriginal，不悄悄重指到同名食品。运行scripts/build-food-catalog.py --download、scripts/build-food-zh.mjs可重建。

品牌中维他奶巧克力250mL和佳得乐橙味20fl oz来自USDA美国市场记录。名称、口味、地区和原始标签描述可核对；数据库记录不等于当前每件商品已独立验标。旧版包装与来源日期可不同，条码结果优先展示较新来源，不把不同规格强制合并。没有可靠包装重量就不生成整盒换算，不将mL视作g。

## 真实查询

|查询|性质|实际首项|市场|
|---|---|---|---|
${rows.map(r=>'|'+[r.query,r.result,r.name||'—',r.market||'—'].map(x=>String(x).replaceAll('|','／')).join('|')+'|').join('\n')}

完整字段与原文见同名samples.json。另有71项基础覆盖样本见food-coverage-6837289927.json。命中并不代表与中国本地配方完全相同：美国调查菜品明确是参考/估算，火锅、羊肉串等无可靠对应时仍缺失；不能用零食烧烤味冒充烧烤正餐。

## 已复现与修复

- 半屏弹层、240px嵌套结果列表 → 全屏、单一内容滚动区域；搜索输入不因列表刷新失焦。
- 原文长串混入日常结果 → 核对中文常用名称、优先直接食物本体，品牌精确身份不跨地区替代。
- 切换晚餐被旧隐藏表单改回午餐 → 切换值与餐食草稿同步。
- 保存组合后首页未刷新 → 保存后即时更新常用组合。
- 整卡背景委托保留，扩展/结构图/文字选择/拖动排除。空白点击测试使用真实圆角卡片内区域，不将圆角外背景当作卡片。

## 许可、费用与未完成项

没有购买数据、调用付费模型或启用支付。没有采集个人照片/健康记录发布到公共库。

Open Food Facts官方文档要求API使用登记、请求标识与限额，数据库ODbL、图片另有许可：https://openfoodfacts.github.io/openfoodfacts-server/api/ 。本轮重新查看官方文档；中国地区页面及完整条款读取失败，未据此声称已核对中国商品覆盖。没有启用远程搜索或假扫码入口。正式接入仍需完成使用登记、许可兼容性核验与服务部署；不擅自代用户提交登记。

香港CFS NIIS公开说明为个人非商业参考用途（https://www.cfs.gov.hk/english/nutrient/index.php/nutrient.php），未抓取并包装成商业食品库。中国本地品牌、连锁餐品与运动补给仍需可再分发来源/授权；这是具体数据缺口，不由当前数据库条数证明完成。

浏览器视口覆盖320px、375×812、390×844、430×932。键盘检查采用缩小可视区域的自动化模拟，不是真实iPhone键盘。iOS共用入口与原生构建单独检查，未进行真机测试或App Store提交。运行截图/录屏保存于本次构建验收目录，不能替代真实手机验收。
`);
console.log(rows.map(r=>r.query+': '+r.result+' / '+(r.name||'—')).join('\n'));
