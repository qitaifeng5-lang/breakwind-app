import {catalog,searchFood} from '../public/fuel.js';
import {writeFile} from 'node:fs/promises';
const queries=['米饭','米飯','mifan','糙米','面条','面包','馒头','包子','饺子','粥','燕麦','全脂牛奶','牛奶','niunai','酸奶','奶酪','鸡蛋','jidan','水煮蛋','豆腐','老豆腐','豆浆','毛豆','黄豆','鸡胸肉','牛肉','猪肉','羊肉','三文鱼','虾','苹果','香蕉','橙子','草莓','蓝莓','西瓜','芒果','牛油果','西兰花','胡萝卜','黄瓜','西红柿','菠菜','土豆','红薯','玉米','花生','杏仁','核桃','咖啡','奶茶','番茄炒蛋','蛋炒饭','清炒菠菜','可口可乐','桂格','日清','农心','维他奶巧克力250ml','061954000041','00049000000443','00030000010402','070662198018','伊利纯牛奶250ml','蒙牛特仑苏250ml','中国版可口可乐330ml','麦当劳巨无霸中国','星巴克拿铁中国大杯','肯德基香辣鸡腿堡中国','瑞幸生椰拿铁','不存在牌牛奶750ml'];
const report=queries.map(query=>{const results=searchFood(catalog,query),first=results[0];return {query,result:!first?'未收录':/^\d{8,14}$/.test(query)?'条码命中，核对标示市场':first.matchKind==='brand'?'品牌候选，需核对口味规格':first.matchKind==='recipe'||first.matchKind==='estimate'?'估算':'通用参考／近似',id:first?.id,name:first?.originalName||first?.name,market:first?.market,source:first?.url,count:results.length};});
await writeFile(new URL('../docs/food-coverage-6837289927.json',import.meta.url),JSON.stringify({date:'2026-11-12',method:'真实官方批量数据本地查询；不是远程API实时返回，也不是虚构fixture',results:report},null,2));
const counts=Object.fromEntries([...new Set(report.map(r=>r.result))].map(k=>[k,report.filter(r=>r.result===k).length]));
const text=`# 食品覆盖与整卡交互复核 · 6837289927

训练内容整改14ffe9b保留；本轮不新增收费、追踪或独立页面。

## 实际数据路线

正式库由脚本从USDA SR Legacy、FNDDS 2021–2023及2026-10品牌官方完整下载包重建。中文索引是名称/烹调状态的编辑映射，营养数字全部来自原记录；不是模型生成。保留原始英文完整品名以便核对口味和加工状态。品牌保留真实条码、市场、包装与每份资料；同条码不同名称、口味、明确包装不强行合并。

[官方数据下载](https://fdc.nal.usda.gov/download-datasets/)；[官方API与CC0许可](https://fdc.nal.usda.gov/api-guide/)；[品牌100g/100mL基准说明](https://fdc.nal.usda.gov/docs/GBFPD_Documentation_and_Download_User_Guide_Jan2024.pdf)。来源压缩包SHA256见food-source-manifest.json。私有资料没有写入公共数据。

- 基础食材为美国通用参考；FNDDS菜品标为调查/配方估算。不能冒充中国当地营养测量或餐厅官方值。
- 具体品牌记录目前以美国市场为主，少量新西兰；没有证明中国市场覆盖。伊利、蒙牛、中国连锁餐品缺口明示。
- 番茄炒蛋、蛋炒饭、清炒菠菜、馒头和水饺是可修改示例配方，食材营养来自USDA，份量与成品产量是可改估计，未校正烹调营养保留率；不是餐厅配方。
- 完整品名、来源地区及估算状态随结果显示；无包装净含量就明示未提供，不猜整盒大小。

## 份量与历史

每100g和每100mL分开；只有来源已给的份量重量/容量才提供杯、盒、瓶等按钮。没有密度不互换g/mL。私人录入支持kJ按4.184转换为kcal，并保留原单位。缺失营养保持null，完整合计有缺项时显示未知。

保存整份食物及营养快照。改份量按当时快照计算，数据库更新不重算旧日志。收藏缓存来源记录，最近食品也可从私人快照读取。搜索→份量→保存→修改→删除已接通；组合餐和历史保留。

## 查询验收

${queries.length}个实际中文/拼音/条码查询。结果分类：${JSON.stringify(counts)}。这表示本次样本命中情况，不表示完整中国饮食覆盖。品牌候选不算本地准确商品；条码命中仍需核对市场及包装标签。下面列出第一项，完整可读返回保存于配套JSON。

|查询|结果性质|返回记录|市场|
|---|---|---|---|
${report.map(r=>`|${r.query}|${r.result}|${r.name||'—'}|${r.market||'—'}|`).join('\n')}

## 尚未启用与成本

本版全部搜索在本地数据中完成，不包含假远程按钮；基础库、收藏、最近与已保存食物可离线使用。未启用相机扫码或AI识别。条码可直接在搜索框输入。

Open Food Facts适配未作为可用服务交付：官方要求API使用登记、明确客户端标识及限额，ODbL涉及衍生数据库共享义务；没有把分库当作免责方式，也没有上传私人记录。未来若采用，须完成使用登记、授权兼容性核验和可信代理部署，并补超时/限流/异步回归。当前静态预览和iOS离线入口均不依赖它。

本轮无密钥、无付费API、未购买数据。若需要中国品牌/连锁官方全面覆盖，仍需合法授权来源；USDA远程API未来接入需要服务端密钥，不能写进静态包。本轮未申请这些资源。

## 训练卡

非交互图标、文字、留白委托给原标题按钮。标题保留键盘入口；summary、内部按钮/链接、结构图和表单排除；拖动/滚动或文字选择不会误开。没有重写展开/收起或详情界面。
`;
await writeFile(new URL('../docs/food-review-6837289927.md',import.meta.url),text);
console.log(counts);
