# 在 Mac 上归档破风并交给 TestFlight

`npm run ios:archive` 从当前源码生成本机可用的 `.xcarchive`。适用于首次内测，也可用于后续相同 App Store Connect 记录的构建。

## 准备签名与构建编号

使用已安装 Xcode、CocoaPods 和 Node.js 24 的 Mac。在 Xcode 的 Settings → Accounts 登录有该应用权限的 Apple Developer 团队账号。确认该团队已注册应用的明确 Bundle ID，在 App Store Connect 建立或打开对应 App 记录。已有内测用户时，使用旧版的相同 Bundle ID 才能验证覆盖安装与本机数据保留。[Apple 创建应用记录](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)

选择 App Store Connect 接受的 Xcode 与 SDK 版本。把要交测的提交检出到独立工作副本。构建会生成或更新该副本的 `ios/` 项目和 `native/generated/web.js`。在项目根目录运行 `npm ci`。[Apple 上传构建要求](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)

原生工程使用固定模板 `expo-template-bare-minimum@56.0.38`，其中声明 Expo `~56.0.24` 和 React Native `0.85.3`。当前锁文件的 Expo 包内置了 SDK 57 的原生模板。归档命令通过 npm 缓存或官方 registry 获取 SDK 56 模板，验证发布的 SHA-512 后才生成 `ios/`。如工作目录已有其他来源的原生工程，请在旁边的独立工作树操作，例如执行 `git worktree add --detach ../breakwind-testflight HEAD` 后在新目录运行 `npm ci`。同一个归档工作树可重复使用。[模板发布记录](https://www.npmjs.com/package/expo-template-bare-minimum/v/56.0.38)

在同一个终端设置三个环境变量。值来自团队账户和应用记录，证书及其私钥由登录的 Mac 钥匙串管理。`app.json` 的 `expo.version` 是对外版本号，`BREAKWIND_IOS_BUILD_NUMBER` 是该版本这次上传的新构建编号。

```sh
printf '已注册的 Bundle ID：'; read -r BREAKWIND_IOS_BUNDLE_ID
printf 'Apple Team ID：'; read -r BREAKWIND_APPLE_TEAM_ID
printf '本次构建编号：'; read -r BREAKWIND_IOS_BUILD_NUMBER
export BREAKWIND_IOS_BUNDLE_ID BREAKWIND_APPLE_TEAM_ID BREAKWIND_IOS_BUILD_NUMBER
npm run ios:archive
```

普通归档关闭模拟会员，适合交测免费首发功能，也适合作为公开候选。若团队需要在内部 TestFlight 专门验证长期计划，使用独立的构建编号，改为运行 `npm run ios:archive -- --internal-testing`。这个开关仅在本次原生打包时启用测试体验，输出目录以 `internal-only-` 开头。在 Xcode Organizer 分发此包时**必须选择 TestFlight Internal Only**，用于受限的内部测试。准备公开候选时使用新的构建编号，重新运行普通 `npm run ios:archive`，再选择 App Store Connect 分发。

## 识别成功的归档

每次归档先重新打包离线训练与饮食界面，再用发布专用的 Expo 配置更新 Xcode 项目、安装 Pods，并用通用 iOS 真机目标执行 Release archive。脚本核对归档内应用的签名、Bundle ID、版本和构建编号，然后输出完整归档路径与源码提交。每次生成单独的输出目录，可以保留上次已验证的包。

如果首次归档提示缺少证书或 provisioning profile，打开刚生成的 `ios/*.xcworkspace`，选中应用 target，在 Signing & Capabilities 选对团队，按团队的签名方式配置相应证书和 profile，然后重新运行命令。若团队自定义了 Xcode scheme，设置 `BREAKWIND_IOS_XCODE_SCHEME` 为应用的实际 scheme 名称。[Expo 本机归档指南](https://docs.expo.dev/submit/ios-manual/)

## 上传并在 iPhone 上验收

在 Finder 打开脚本输出的 `.xcarchive`。在 Xcode Organizer 核对应用、版本和构建编号，选择 Validate App，再通过 Distribute App 选择与上一步构建类型对应的分发方式。上传完成后，在 App Store Connect → TestFlight 等待该构建处理，依界面补充适用的出口合规信息，并将该构建分配到内部测试组。[Apple 上传构建](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/) · [Apple 内部测试](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)

用 TestFlight 安装，记录构建号、iPhone 型号、iOS 版本以及实际通过的项目。先开飞行模式进入训练和饮食，安排一次训练、以日常份量记录一餐，强退并重开，核对保存的课次、份量和餐次。再检验中文键盘、底部安全区、系统分享和备份恢复。如有旧版，在同一设备覆盖安装后核对历史课表与餐食。[完整真机清单](launch-training-food.md)
