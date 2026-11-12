# 破风 BREAKWIND

首发聚焦 **训练计划＋饮食记录**，沿用现有全屏深蓝黑界面。训练内容、日程、长期阶段和营养记录保留；不提供新的 GPS、训练播放器或逐段计时入口。

## 使用流程

- 训练：专项／PB → 课程四段阅读 → 加入课表 → 改期 → 本人记录完成情况。教练原课表不被推荐覆盖，固定时段及单次例外可复用。
- 长期计划：从明确的完成、部分完成、未完成反馈复盘；未知仍为未知，不补造距离、心率或消耗，不自动补堆漏课。
- 饮食：添加餐次 → 搜索 → 份量 → 保存。最近、收藏、组合餐、汇总与历史保留。未接通的拍照／扫码不展示为可用功能。
- 个人与设置在右上角，提供资料、备份合并、导出和历史运动记录。旧记录与草稿仍可查看、归档和导出。

VIP 仍为 ¥12.9/月目标价的测试权益，不收款、不自动续费、不锁住已有免费课程。课程来源核验与独立审核状态分开，适龄及伤痛保护保留。

## 本地网页与检查

Node.js 22 以上（CI 使用 24）：

```sh
npm ci
npm start
npm test
npm run lint
npm run check:types
npm run check:syntax
npm run check:integrity
npm run test:browser
```

打开终端显示的本机地址（默认 http://127.0.0.1:4188/）。同源本机数据沿用 `breakwind.local.v1`，旧字段兼容。浏览器地址或端口不同，存储独立；备份可按 ID 合并而不覆盖旧快照。

## 同一源码的 iOS 入口

`native/App.js` 加载由正式网页代码构建的离线界面，通过 SQLite 持久化本机记录及系统分享导出。没有新的定位任务、倒计时监听或 HealthKit 请求。旧 SQLite 运动库保留；升级时停止旧定位任务。

```sh
npm run check:ios
npm run mobile:bundle -- --max-workers 2
```

macOS/Xcode 连接已授权 iPhone 后运行 `npm run mobile:ios`。当前 Windows 环境的 Hermes 构建与浏览器契约检查不等于真机成功，也不是可安装 IPA。签名、真机升级、键盘、文件分享与离线强退恢复验收见 [首发与 iOS 准备](docs/launch-training-food.md)。不启动付费云构建或 App Store 发布。

## HTTPS 预览

https://qitaifeng5-lang.github.io/breakwind-app/ 来自现有 `preview/v3` 分支，不需要合并生产分支。预览显示构建版本，资源与 Service Worker 按同一 SHA 发布；使用独立的 `breakwind.preview` 本机存储空间。仅发布运行资产，不发布私人课表、测试数据库或密钥。

验证脚本 `scripts/verify-launch-preview.mjs <完整SHA>` 检查线上课程／日程／反馈／饮食流程并生成实际截图、录屏与资源哈希。浏览器手机视口与真实设备验收分开。退役的播放器浏览器用例保留在 `docs/retired-player-tests`；历史计时／存储的单元测试仍运行。
