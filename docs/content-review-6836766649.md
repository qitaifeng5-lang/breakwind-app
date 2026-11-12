# 课程内容复核 · 6836766649

基线：2348c465052245e05859a5c0778a1f256f3e723c。仅修改内容与编排规则，保留界面、私人原文及旧快照。

## 修改前后

|范围|修改前|本轮修改后|
|---|---|---|
|课程身份|长期保存把质量课统一写成间歇；仅周期级版本|每课保存 courseId、courseRevision、categoryId、stimulus、courseRef；兼容 type 保留，日历显示真实分类|
|当前选择|周期读取旧 groupPlan，隐式竞技组|复用当前专项、PB、组别；不支持组别明确拒绝生成，不悄悄升级或降级|
|课程版本|内容、说明、处方分别带旧版本|同一课程合同、处方、周引用使用同一版本；已保存快照不迁移|
|长期周主课|program.js 自行拼替换位置|使用课程内容层的明确替代白名单，原始段落/两层休息不改，替代而不叠加|
|固定训练日|免费周会映射，长期周仍按数组日期|共同整周映射，保留课次间隔；时段不足或容量未知不压缩恢复、不伪造结束时间|
|已记录课次|只保护旧 completed 标志|完成、部分完成、未完成的明确报告均阻止未来整周覆盖|
|准备时间|部分证据说明仍称固定10/15分钟|活动内容保留，准备及整理自主完成；只汇总已知主段和休息，总课时未知|

## 规则与来源映射

- [World Athletics 2022](https://worldathletics.org/personal-best/performance/speed-training-endurance-runners-benefits-limits)：已读取原文。1500m重复示例支持500m段及重复/休息范围；本产品选3趟、180秒步行，以当前成绩替代目标成绩，都是明确改编。速度课后低强度日支持周关系，不认证本产品周剂量。
- [Daniels训练定义](https://vdoto2.com/learn-more/training-definitions)：已读取。用于区分有氧间歇、比赛节奏重复、Tempo与低疲劳技术。800m节奏重复不自动等同其FR体系；不混用不同体系的负荷上限来声称处方合规。不复制配速表。
- [Haugen 2021原文](https://link.springer.com/article/10.1007/s40279-021-01481-2)：已读取。支持中跑能力类型和阶段刺激差异；世界级、偏男性资料，不能验证本App组数或直接外推青少年。
- [Olympiatoppen成人](https://olt-skala.nif.no/en)及[青年](https://olt-skala.nif.no/ung)：已读取。体感和呼吸可辅助描述，不能把平均心率或乳酸当个人测量。青年页面针对15/16岁框架，不是所有未成年统一剂量。
- [Momentum](https://www.momentumsports.co.uk/TtMDSpeed.asp)：已读取。10×200m、800m节奏及1–2分钟恢复属公开教练实践；本产品选择120秒和步行。保留相近负荷经验前提，不采用过时乳酸废物解释。
- [Dalby 2022讲义](https://www.oatccc.com/Clinics/Track-And-Field/Archive/2022/jonathon-dalby-distance-training.pdf)：复核本地原PDF第17页。支持400m mile effort＋200m 800 effort的组范围和两层休息，以及400m较快段的范围。当前成绩均速、步行、成人准入是产品改编；mile不等于1500m。
- [Prendergast历史教练著作](https://oztrack.com/fundamd.pdf)：沿用此前第93页核对记录；本轮未重新下载全文。800m分组300m保留原参数，不宣称新增独立验证。
- [研究23752040](https://pubmed.ncbi.nlm.nih.gov/23752040/)与[研究PMC7739641](https://pmc.ncbi.nlm.nih.gov/articles/PMC7739641/)：研究对象是休闲跑者，不据此生成中跑统一强度比例。
- [青少年共识](https://bjsm.bmj.com/content/55/6/305)：本轮全文访问403，未声称重新核对全文。既有适龄保护保留；青年竞技完整课表仍未完成。

## 代表性课程：参数保留，目的与适用说明修正

|专项／课程ID|当前主训练|小组休息／大组休息|已知主量／休息量|用途与限制|
|---|---|---|---|---|
|800 m / interval-development|1大组；10×200m 800m 配速|步行 120秒；大组无|2000m / 1080秒|800m比赛节奏重复；常规发展主课，须已有同类耐受|
|800 m / endurance|2大组；3×300m 800m 配速|步行 120秒；大组步行 600秒|1800m / 1080秒|较快节奏维持；常规发展主课，须已有同类耐受|
|800 m / combination-development|3大组；1×400m 英里配速＋1×200m 800m 配速|步行 60秒 / 无；大组步行 300秒|1800m / 780秒|双节奏转换；常规发展主课，须已有同类耐受|
|800 m / tempo-competitive-support|1大组；4×5分钟 Tempo · Tempo：既有受控偏强体感，不由PB推阈值|慢跑 60秒；大组无|1200秒 / 180秒|受控持续有氧；常规发展主课，须已有同类耐受|
|800 m / speed-competitive-recovery|1大组；4×10秒 放松加速 · 快而放松，非全力；姿态或协调下降立即停止|步行 90秒；大组无|40秒 / 270秒|低疲劳速度技术；技术辅助课，须已有同类耐受|
|1500 m / interval|1大组；3×500m 1500m 配速|步行 180秒；大组无|1500m / 360秒|1500m比赛节奏重复；常规发展主课，须已有同类耐受|
|1500 m / endurance|1大组；3×400m 800m 配速|步行 360秒；大组无|1200m / 720秒|较快节奏维持；常规发展主课，须已有同类耐受|
|1500 m / combination-development|3大组；1×400m 英里配速＋1×200m 800m 配速|步行 60秒 / 无；大组步行 300秒|1800m / 780秒|双节奏转换；常规发展主课，须已有同类耐受|
|1500 m / tempo-competitive-support|1大组；5×5分钟 Tempo · Tempo：既有受控偏强体感，不由PB推阈值|慢跑 60秒；大组无|1500秒 / 240秒|受控持续有氧；常规发展主课，须已有同类耐受|
|1500 m / speed-competitive-recovery|1大组；4×10秒 放松加速 · 快而放松，非全力；姿态或协调下降立即停止|步行 90秒；大组无|40秒 / 270秒|低疲劳速度技术；技术辅助课，须已有同类耐受|

本轮没有增加组数、提高配速或缩短休息。真正变化是刺激定义、准备时长边界、统一内容引用、固定日映射及历史保护。未把分类修正说成新的训练效果验证。

## 当前覆盖

“完整”指内容编排完整，不等于独立审核通过或当天可执行；已知伤痛、恢复及年龄检查仍单独生效。

|人群|专项|组别|阶段|完整课次／缺项|状态|
|---|---|---|---|---|---|
|成人|800 m|base|base|5 / 0|编排完整草案|
|成人|800 m|base|develop|0 / 5|未完成，保留明确缺项|
|成人|800 m|base|prepare|0 / 4|未完成，保留明确缺项|
|成人|800 m|base|recover|3 / 0|编排完整草案|
|成人|800 m|advanced|base|5 / 0|编排完整草案|
|成人|800 m|advanced|develop|5 / 0|编排完整草案|
|成人|800 m|advanced|prepare|0 / 4|未完成，保留明确缺项|
|成人|800 m|advanced|recover|3 / 0|编排完整草案|
|成人|800 m|competitive|base|6 / 0|编排完整草案|
|成人|800 m|competitive|develop|6 / 0|编排完整草案|
|成人|800 m|competitive|prepare|6 / 0|编排完整草案|
|成人|800 m|competitive|recover|5 / 0|编排完整草案|
|成人|1500 m|base|base|5 / 0|编排完整草案|
|成人|1500 m|base|develop|0 / 5|未完成，保留明确缺项|
|成人|1500 m|base|prepare|0 / 4|未完成，保留明确缺项|
|成人|1500 m|base|recover|3 / 0|编排完整草案|
|成人|1500 m|advanced|base|5 / 0|编排完整草案|
|成人|1500 m|advanced|develop|5 / 0|编排完整草案|
|成人|1500 m|advanced|prepare|0 / 4|未完成，保留明确缺项|
|成人|1500 m|advanced|recover|3 / 0|编排完整草案|
|成人|1500 m|competitive|base|6 / 0|编排完整草案|
|成人|1500 m|competitive|develop|6 / 0|编排完整草案|
|成人|1500 m|competitive|prepare|6 / 0|编排完整草案|
|成人|1500 m|competitive|recover|5 / 0|编排完整草案|
|青年|800 m|base|base|0 / 5|未完成，保留明确缺项|
|青年|800 m|base|develop|0 / 5|未完成，保留明确缺项|
|青年|800 m|base|prepare|0 / 4|未完成，保留明确缺项|
|青年|800 m|base|recover|0 / 3|未完成，保留明确缺项|
|青年|800 m|advanced|base|0 / 5|未完成，保留明确缺项|
|青年|800 m|advanced|develop|0 / 5|未完成，保留明确缺项|
|青年|800 m|advanced|prepare|0 / 4|未完成，保留明确缺项|
|青年|800 m|advanced|recover|0 / 3|未完成，保留明确缺项|
|青年|800 m|competitive|base|0 / 5|未完成，保留明确缺项|
|青年|800 m|competitive|develop|0 / 5|未完成，保留明确缺项|
|青年|800 m|competitive|prepare|0 / 5|未完成，保留明确缺项|
|青年|800 m|competitive|recover|0 / 5|未完成，保留明确缺项|
|青年|1500 m|base|base|0 / 5|未完成，保留明确缺项|
|青年|1500 m|base|develop|0 / 5|未完成，保留明确缺项|
|青年|1500 m|base|prepare|0 / 4|未完成，保留明确缺项|
|青年|1500 m|base|recover|0 / 3|未完成，保留明确缺项|
|青年|1500 m|advanced|base|0 / 5|未完成，保留明确缺项|
|青年|1500 m|advanced|develop|0 / 5|未完成，保留明确缺项|
|青年|1500 m|advanced|prepare|0 / 4|未完成，保留明确缺项|
|青年|1500 m|advanced|recover|0 / 3|未完成，保留明确缺项|
|青年|1500 m|competitive|base|0 / 5|未完成，保留明确缺项|
|青年|1500 m|competitive|develop|0 / 5|未完成，保留明确缺项|
|青年|1500 m|competitive|prepare|0 / 5|未完成，保留明确缺项|
|青年|1500 m|competitive|recover|0 / 5|未完成，保留明确缺项|

## 8／12／16周逐周核算

限已有稳定六课周、两类质量刺激及相近负荷经验的成人竞技均衡型。其他组不静默套用。周序及8/12/16长度是产品编排，不是研究验证的最佳周期。
基础周：受控Tempo＋短坡，间隔低强度支持。专项周：一个比赛节奏主课＋Tempo，之间保留低强度支持。恢复周：撤下质量课，保留轻松与低疲劳技术。重复周用于巩固，不自动加量；主课替换只在明确阶段评估后采用。
以下有氧分钟与其他主段分钟不含热身、冷身；距离段耗时缺同项校准时未知，所有合计均非实际完成量。固定日映射只是预览，加入日程仍检查已有课表与相邻负荷。

|专项|周期|周|阶段／目标|专项或基础主课|有氧主段分钟／其他定时主段分钟|距离主段m／已知休息秒|
|---|---|---|---|---|---|---|
|800 m|8|1|base：确认现有分段有氧与短坡耐受，建立恢复基线|tempo-competitive-base＋hills-competitive|130 / 20.83|0 / 900|
|800 m|8|2|develop：用同项间歇替换短坡；保持熟悉的分段有氧支持|interval-development＋tempo-competitive-support|130 / 20.00|2000 / 1260|
|800 m|8|3|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|8|4|develop：专项段质量与有氧支持分工；不同时提高周量|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|8|5|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|8|6|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|8|7|develop：在同一质量位练习另一专项能力，替换而不叠加|combination-development＋tempo-competitive-support|130 / 20.00|1800 / 960|
|800 m|8|8|recover：阶段复盘与下一周期决策；不自动回加强度|无质量课|70 / 0.67|0 / 270|
|800 m|12|1|base：确认现有分段有氧与短坡耐受，建立恢复基线|tempo-competitive-base＋hills-competitive|130 / 20.83|0 / 900|
|800 m|12|2|base：巩固同一有氧剂量；观察动作质量，不增加次数|tempo-competitive-base＋hills-competitive|130 / 20.83|0 / 900|
|800 m|12|3|develop：用同项间歇替换短坡；保持熟悉的分段有氧支持|interval-development＋tempo-competitive-support|130 / 20.00|2000 / 1260|
|800 m|12|4|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|12|5|develop：专项段质量与有氧支持分工；不同时提高周量|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|12|6|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|12|7|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|12|8|develop：在同一质量位练习另一专项能力，替换而不叠加|combination-development＋tempo-competitive-support|130 / 20.00|1800 / 960|
|800 m|12|9|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|12|10|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|12|11|develop：专项段质量与有氧支持分工；不同时提高周量|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|12|12|recover：阶段复盘与下一周期决策；不自动回加强度|无质量课|70 / 0.67|0 / 270|
|800 m|16|1|base：确认现有分段有氧与短坡耐受，建立恢复基线|tempo-competitive-base＋hills-competitive|130 / 20.83|0 / 900|
|800 m|16|2|base：巩固同一有氧剂量；观察动作质量，不增加次数|tempo-competitive-base＋hills-competitive|130 / 20.83|0 / 900|
|800 m|16|3|develop：用同项间歇替换短坡；保持熟悉的分段有氧支持|interval-development＋tempo-competitive-support|130 / 20.00|2000 / 1260|
|800 m|16|4|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|16|5|develop：用同项间歇替换短坡；保持熟悉的分段有氧支持|interval-development＋tempo-competitive-support|130 / 20.00|2000 / 1260|
|800 m|16|6|develop：专项段质量与有氧支持分工；不同时提高周量|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|16|7|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|16|8|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|16|9|develop：在同一质量位练习另一专项能力，替换而不叠加|combination-development＋tempo-competitive-support|130 / 20.00|1800 / 960|
|800 m|16|10|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|16|11|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|16|12|develop：专项段质量与有氧支持分工；不同时提高周量|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|16|13|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|endurance＋tempo-competitive-support|130 / 20.00|1800 / 1260|
|800 m|16|14|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|70 / 0.67|0 / 270|
|800 m|16|15|develop：在同一质量位练习另一专项能力，替换而不叠加|combination-development＋tempo-competitive-support|130 / 20.00|1800 / 960|
|800 m|16|16|recover：阶段复盘与下一周期决策；不自动回加强度|无质量课|70 / 0.67|0 / 270|
|1500 m|8|1|base：确认现有分段有氧与短坡耐受，建立恢复基线|tempo-competitive-base＋hills-competitive|150 / 25.83|0 / 960|
|1500 m|8|2|develop：用同项间歇替换短坡；保持熟悉的分段有氧支持|interval＋tempo-competitive-support|150 / 25.00|1500 / 600|
|1500 m|8|3|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|8|4|develop：专项段质量与有氧支持分工；不同时提高周量|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|8|5|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|8|6|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|8|7|develop：在同一质量位练习另一专项能力，替换而不叠加|endurance＋tempo-competitive-support|150 / 25.00|1200 / 960|
|1500 m|8|8|recover：阶段复盘与下一周期决策；不自动回加强度|无质量课|80 / 0.67|0 / 270|
|1500 m|12|1|base：确认现有分段有氧与短坡耐受，建立恢复基线|tempo-competitive-base＋hills-competitive|150 / 25.83|0 / 960|
|1500 m|12|2|base：巩固同一有氧剂量；观察动作质量，不增加次数|tempo-competitive-base＋hills-competitive|150 / 25.83|0 / 960|
|1500 m|12|3|develop：用同项间歇替换短坡；保持熟悉的分段有氧支持|interval＋tempo-competitive-support|150 / 25.00|1500 / 600|
|1500 m|12|4|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|12|5|develop：专项段质量与有氧支持分工；不同时提高周量|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|12|6|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|12|7|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|12|8|develop：在同一质量位练习另一专项能力，替换而不叠加|endurance＋tempo-competitive-support|150 / 25.00|1200 / 960|
|1500 m|12|9|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|12|10|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|12|11|develop：专项段质量与有氧支持分工；不同时提高周量|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|12|12|recover：阶段复盘与下一周期决策；不自动回加强度|无质量课|80 / 0.67|0 / 270|
|1500 m|16|1|base：确认现有分段有氧与短坡耐受，建立恢复基线|tempo-competitive-base＋hills-competitive|150 / 25.83|0 / 960|
|1500 m|16|2|base：巩固同一有氧剂量；观察动作质量，不增加次数|tempo-competitive-base＋hills-competitive|150 / 25.83|0 / 960|
|1500 m|16|3|develop：用同项间歇替换短坡；保持熟悉的分段有氧支持|interval＋tempo-competitive-support|150 / 25.00|1500 / 600|
|1500 m|16|4|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|16|5|develop：用同项间歇替换短坡；保持熟悉的分段有氧支持|interval＋tempo-competitive-support|150 / 25.00|1500 / 600|
|1500 m|16|6|develop：专项段质量与有氧支持分工；不同时提高周量|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|16|7|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|16|8|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|16|9|develop：在同一质量位练习另一专项能力，替换而不叠加|endurance＋tempo-competitive-support|150 / 25.00|1200 / 960|
|1500 m|16|10|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|16|11|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|16|12|develop：专项段质量与有氧支持分工；不同时提高周量|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|16|13|develop：巩固已确认的专项结构；根据真实反馈决定保持或退出|combination-development＋tempo-competitive-support|150 / 25.00|1800 / 1020|
|1500 m|16|14|recover：撤下质量刺激，检查疲劳和缺课原因，不补课|无质量课|80 / 0.67|0 / 270|
|1500 m|16|15|develop：在同一质量位练习另一专项能力，替换而不叠加|endurance＋tempo-competitive-support|150 / 25.00|1200 / 960|
|1500 m|16|16|recover：阶段复盘与下一周期决策；不自动回加强度|无质量课|80 / 0.67|0 / 270|

## 验收与剩余范围

回归逐课比较单课、免费周与长期周的结构、两层休息、可读详情和版本；再检查日历与导出的分类和来源。组合课1800m，3次60秒小组休息＋2次300秒大组休息＝780秒，末组不重复加休息。更快PB不改变课量。

已保存周期不静默升级内容。恢复周调整仍需要预览确认；完整的跨能力类型自适应、缺少参考成绩时的教练替代选择、青少年竞技处方、其他专项长期方案尚未完成。本轮也未新增VO₂max有氧间歇处方，不把现有比赛节奏课换名冒充。
独立教练审核、实际训练效果及真实iPhone测试未完成；浏览器检验仅证明内容数据流与交互，不证明处方适合所有人。
