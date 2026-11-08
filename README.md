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
- 「营养 → 添加餐食」提供中文搜索、份量、收藏、最近吃过、自定义条码食品和多食物组合。初始食材来自 USDA FoodData Central SR Legacy，按 CC0 使用。包装条码只查询本机收藏的自定义食品库。兼容的浏览器可解码照片里的条码；其他浏览器可手输。照片默认在浏览器预览。主动启用本机模型并点击识别后，缩小的照片才会发送到同一电脑的本地模型；破风不保存照片。
- 本机 Web 预览支持前台定位。iPhone 原生开发版见下方，仍待签名、安装和户外真机验收。Android 原生定位、Health Connect、厂商账号同步及中国品牌与餐饮数据库尚未接入。

### 接入与数据参考

- Apple HealthKit 路线和位置权限 https://developer.apple.com/documentation/healthkit/creating-a-workout-route
- Android Health Connect 运动路线 https://developer.android.com/health-and-fitness/health-connect/features/exercise-routes
- COROS 官方文件导出 https://support.coros.com/hc/en-us/articles/360043975752-Exporting-Workout-Data-and-Uploading-to-3rd-Party-Apps
- Garmin Connect 直接接入 https://developer.garmin.com/gc-developer-program/overview/
- FIT 数据协议 https://developer.garmin.com/fit/protocol/
- USDA FoodData Central 使用许可 https://fdc.nal.usda.gov/api-guide/
- 成人活动 MET 档位 https://pacompendium.com/running/

## iPhone 原生开发版

原生入口位于同一仓库的 native/。Web 仍用 npm start 启动，两端各自保存本机数据，目前不共享数据库。原生开发版使用 Expo SDK 56，要求 iOS 16.4 或更新版本。锁屏定位需要自建开发包，Expo Go 不适用。

在具备 Expo SDK 56 所需 Xcode 的 Mac 上连接 iPhone，在 Xcode 中选择具备相应能力的签名团队，并在手机开启开发者模式。确认签名团队能够签名后运行：

```sh
npm ci
npx expo prebuild --platform ios
npm run mobile:ios
```

如需单独启动开发服务器，运行 npm run mobile:start。若组织已经具备 HealthKit 签名能力，可在预构建与启动时设置 BREAKWIND_HEALTHKIT=1。切换能力后要重新预构建并安装。需要签名账号、云构建或发布时先由项目所有者决定。

### 真机验收记录表

| 场景 | 期望观察 |
| --- | --- |
| 拒绝位置、仅使用期间、关闭精确位置、定位总开关关闭 | 界面说明原因，后台定位任务不启动 |
| 允许始终定位后户外开始，锁屏走跑至少 2 分钟 | 解锁后时长、距离与轨迹增加，记录来源为 iPhone GPS |
| 暂停后移动，再继续跑步 | 暂停期间不累计活动时长，路线分段，暂停前后不直线补点 |
| 跑步中切网、信号短暂丢失、系统设置撤回权限 | 本地采样可持续写入，位置中断不会凭空补点，恢复前提示权限问题 |
| 记录中强制退出并重开 | 以最后可确认采样恢复暂停草稿，确认后才能继续。强制退出期间不承诺持续定位 |
| 结束、保存、重开应用、删除记录 | 报告可再次查看；删除后不再显示记录或轨迹 |
| 有权限与无权限的 Apple 健康读取 | 只请求运动读取；只在确认后导入；空结果不宣称已授权 |
| 重复导入同一运动，或导入与手机重合的跑步 | UUID 与近似活动检查阻止双计；本机有轨迹的活动优先保留 |
| 从健康 App 撤销读取 | 后续读取遵循系统权限；之前导入的副本可在本机删除 |

SQLite 持久化草稿、路点及报告。此开发版只按用户操作读取最近最多 100 条 HealthKit 跑步摘要，保留来源名称。路线、心率、Android Health Connect 与厂商账号同步尚未接入。Apple 的读取授权状态无法由应用精确判定，撤销操作通过系统健康权限完成。设备上的数据由 iOS 管理，应用没有健康或位置上传服务。

官方参考：
- Expo 后台定位 https://docs.expo.dev/versions/v56.0.0/sdk/location/
- iPhone 开发者模式 https://docs.expo.dev/guides/ios-developer-mode/
- HealthKit 授权模型 https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- Health Connect 路线权限 https://developer.android.com/health-and-fitness/health-connect/features/exercise-routes

### 可选本机食物照片识别

关闭 Ollama 云功能，使用已经安装且允许在你的场景中使用的本地视觉模型。破风默认关闭该接口，不自动安装模型或调用付费服务。将 BREAKWIND_VISION_MODEL 设置为 Ollama 模型列表中的完整名称（含标签），重启 Web 服务。服务只连接 127.0.0.1:11434，并拒绝跨站照片请求。模型可用时，在「营养 → 添加餐食 → 照片辅助」点击「用本机 AI 识别」。

匹配到已核验食材后，用户必须手动确认克数，系统再按数据库计算营养。找不到匹配或图片缺少比例时保留未知。结果取决于模型与实际照片，真实模型和图像准确度仍需实测。

- USDA FoodData Central 原始数据及许可 https://fdc.nal.usda.gov/api-guide/
- Ollama 本机视觉与关闭云功能 https://docs.ollama.com/capabilities/vision 和 https://docs.ollama.com/faq

## 自动检查与视觉回归

完整运行方式见 docs/quality-and-backlog.md。正式 Web 页面已接入专项卡片、餐食日期、数据详情抽屉和本地成长页。Design Lab 仍用于比较交互设计。浏览器截图使用合成演示数据；设备视口并非 iOS 或 Android 真机验收。

## V3 HTTPS 测试地址

测试地址为 https://qitaifeng5-lang.github.io/breakwind-app/ 。这是可公开访问的测试前端。发布只包含 scripts/export-preview.mjs 列出的运行资产，浏览器使用单独的本地日志命名空间。测试站禁用网络请求与本机 AI 模型接口。请使用测试数据。

预览从 preview/v3 分支部署到 GitHub Pages，源功能 PR 无需合并即可供手机测试。更新时仅将已通过检查的提交快进推送到该预览分支。真机签名与 iPhone 验收清单见 docs/iphone-validation.md。
