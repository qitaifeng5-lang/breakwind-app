# 破风 BREAKWIND

手机优先的简体中文跑步训练 Web App。包含训练仪表盘、跑步计时、日历、恢复与营养日志、个人纪录、全球训练知识库和多周训练引擎。

## 本地启动

需要 Node.js 22 或更高版本，无第三方依赖。

```sh
npm start
npm test
```

访问 http://127.0.0.1:4188/ 。此地址只供本机访问。若端口被占用，可在 PowerShell 中运行 `$env:PORT = '4190'; npm start` 并打开终端打印的地址。浏览器按地址隔离本地记录，切换端口会看到另一份记录。右上角「查看演示」可进入只读示例。支持的浏览器在首次加载并完成缓存后可以离线打开应用。

## 演示生成和调整

1. 在「训练」选择「生成训练周期」，填写训练基础、年龄段、目标项目、每周可用天数与单次时间，并确认本次健康情况。
2. 查看 1–4 周草案，展开任一课次的安排理由、训练结构、调整条件和来源。需要更改条件时用「修改设置」重新生成。
3. 确认后，周期和课次写入本地日历。训练页的「复核与调整」会提示近期反馈、完成情况和日程变化。选择课次可手动更改时间、距离、日期和完成状态。
4. 在「学院」按来源类型展开 22 条资料，查看原文标题、出处、年份、适用范围、局限与版权状态。未标注发表年份的机构页面以核验日期追踪。

## 数据结构

目前沿用同一个浏览器数据库键 breakwind.local.v1。旧日志可读，新字段有默认值。

| 实体 | 主键和关系 | 保存内容 |
| --- | --- | --- |
| EvidenceSource | id | 原文标题、作者、机构、地区、语言、年份、链接、出版类型、A–D 标签、对象、专项、原则、应用条件、局限、核验日期、版权状态 |
| Specialty | 目标项目名 | 训练关注点、原创练习描述、引用的 EvidenceSource.id |
| TrainingProfile | 当前浏览器一份 | 年龄段、项目、跑步基础、可用时间、周期长度和比赛日期。单次健康确认只在内存中用于校验 |
| TrainingCycle | id | 目标项目、比赛日期、规则版本、分周阶段、来源 ID |
| TrainingSession | id，cycleId 可关联 TrainingCycle | 既有训练字段、日期、时长/距离、阶段、目的、结构、强度、调整条件和出处 |
| CycleAudit | 按本地顺序追加 | 周期 ID、课次 ID、时间、事件，以及手动编辑前后的训练负荷字段 |

知识库放在 public/knowledge.js，规则与复核在 public/engine.js。草案提交前用最新数据重新计算，一旦结果变化即要求重新预览。当前周期在基础强度范围内区分九个专项的训练重点，竞赛强度、专项配速模型、伤后复跑、生成式个性化与教练人工审查尚未上线。产品约束不是临床阈值。

## 跑步与餐食

- 「训练 → 记录跑步」提供前台 GPS、手动计时、手动填写和运动文件导入。浏览器 GPS 要求安全地址和位置权限，隐藏页面时主动暂停。同一标签刷新可恢复暂停草稿。草稿和轨迹保存在浏览器中。
- 运动报告按实有数据绘制路线示意、配速、心率、步频和海拔，按 GPS 或设备采样计算完整公里分段。步幅是由平均步频和总距离估算的平均值。可输入体重进行一次成人 MET 总能量估算。路线图不请求在线底图。
- FIT 解析器支持单次跑步、标准 Session/Record 字段及 CRC 校验。TCX 仅接受标为跑步的单次 Activity。GPX 需用户确认属于跑步，并包含可计算距离与耗时的时间戳轨迹。文件不会上传。文件指纹阻止重复导入，近似时间、距离和时长则要求用户核对。
- 「营养 → 添加餐食」提供中文搜索、份量、收藏、最近吃过、自定义条码食品和多食物组合。初始食材来自 USDA FoodData Central SR Legacy，按 CC0 使用。包装条码只查询本机收藏的自定义食品库。兼容的浏览器可解码照片里的条码；其他浏览器可手输。照片辅助仅供人工核对，不上传或保存图片。
- 当前预览为本机 Web。iOS 原生后台 GPS 与 HealthKit、Android 前台定位服务与 Health Connect、获授权的手表同步、AI 食物识别、中国品牌与餐饮数据库仍待交付。当前版本也未做手机户外 GPS 真机验证。

### 接入与数据参考

- Apple HealthKit 路线和位置权限 https://developer.apple.com/documentation/healthkit/creating-a-workout-route
- Android Health Connect 运动路线 https://developer.android.com/health-and-fitness/health-connect/features/exercise-routes
- COROS 官方文件导出 https://support.coros.com/hc/en-us/articles/360043975752-Exporting-Workout-Data-and-Uploading-to-3rd-Party-Apps
- Garmin Connect 直接接入 https://developer.garmin.com/gc-developer-program/overview/
- FIT 数据协议 https://developer.garmin.com/fit/protocol/
- USDA FoodData Central 使用许可 https://fdc.nal.usda.gov/api-guide/
- 成人活动 MET 档位 https://pacompendium.com/running/
