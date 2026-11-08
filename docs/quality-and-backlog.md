# 破风质量门禁与开发队列

## 运行方式

本地使用 Node.js 24。运行 npm ci 安装锁定依赖，再执行：

- npm run check:integrity 核对入口、静态资源路由和锁文件。
- npm run check:syntax 与 npm run lint 检查 JavaScript 和原生 JSX。
- npm test 执行训练、导入、SQLite、HealthKit 转换及照片服务测试。
- npx playwright install chromium 后运行 npm run test:browser。五种视口使用 Chromium 的设备配置，覆盖界面、录入与报告等路径，生成截图、失败追踪及布局预算检查。重复渲染会比较布局几何，帮助识别同一次运行内的不稳定。截图尚未建立跨提交、跨系统的像素基线。
- npm run check:ios 和 npm run mobile:bundle -- --max-workers 2 检查原生配置与 Hermes 构建。后台定位、签名和健康权限的验收仍须使用 iPhone 真机。
- npm audit --audit-level=high 作为独立安全门禁。若 npm 建议跨主版本更换 Expo 等核心依赖，在独立分支评估并验证设备兼容性。

## 自动化边界

CI 对 Push 和 PR 执行，失败时保留 GitHub 步骤日志和可用的浏览器截图/追踪。测试不会上传真实账号、运动轨迹或健康数据。CI 并发按分支或 PR 限制，过时运行可取消；浏览器测试不自动重试。

每日质量巡检计划为 13:20 UTC。定时与 Dependabot 需要配置进入默认分支才会自动运行；仓库权限不足时，摘要会显示该项不可读取。每日摘要写入 GitHub Actions，检查 PR、CI、失败步骤、依赖告警、待办和近期提交。Dependabot 每周独立检查 npm 和 Actions，跳过常规主版本更新，升级由人工审核。

没有配置获授权的自动修复执行器。以后接入时应先确定失败指纹（工作流、失败步骤、归一化错误），只处理明确低风险的修复，在独立分支测试，最多尝试三轮。同一指纹去重，超时或超过上限时标为阻塞。执行器只能打开草稿 PR，部署、原生健康权限发布及重大依赖合并保留人工审核。

## 开发队列

GitHub Issue #4 为本轮开发队列。状态从 Backlog、Ready、In Progress、Review、Tested 到 Done。优先顺序为真机与安全门禁、线上自动化验收、Android 健康接入、本机照片模型实测、跑团与正式榜单。开始前检查已有 PR 与依赖，避免重复实现。

当前 Expo CLI 的 Zod 已用定向覆盖锁定到 4.6.6，保留 Expo SDK 主版本。高危审计通过；剩余中低风险告警仍须在兼容的上游修复可用后逐条核验。不要用 npm audit fix --force 作为自动化修复动作。
