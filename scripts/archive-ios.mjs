import {execFileSync} from 'node:child_process';
import {access, mkdir, mkdtemp, readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import appConfig from '../app.config.js';

// Build and validate one local archive. Upload is a separate action in Xcode.
const project = fileURLToPath(new URL('../', import.meta.url));
process.chdir(project);
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--internal-testing')) {
  throw new Error('用法：npm run ios:archive [-- --internal-testing]');
}
const internalTesting = args[0] === '--internal-testing';
process.env.EXPO_PUBLIC_BREAKWIND_INTERNAL_TESTFLIGHT = internalTesting ? '1' : '0';
if (process.platform !== 'darwin') {
  throw new Error('归档需要在安装 Xcode 和 CocoaPods 的 Mac 上运行。');
}
process.env.BREAKWIND_IOS_DISTRIBUTION = 'testflight';
const base = JSON.parse(await readFile('app.json', 'utf8')).expo;
const {ios, version} = appConfig({config: base});

function run(command, args, options = {}) {
  return execFileSync(command, args, {stdio: 'inherit', ...options});
}
function output(command, args) {
  return run(command, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']}).trim();
}

run('xcodebuild', ['-version']);
run('pod', ['--version']);
const expo = path.resolve('node_modules/expo/bin/cli');
await access(expo);
process.env.GITHUB_SHA = output('git', ['rev-parse', 'HEAD']);
run(process.execPath, ['scripts/export-native-web.mjs']);
run(process.execPath, ['scripts/prepare-ios-project.mjs']);
run('pod', ['install'], {cwd: path.resolve('ios')});

const generated = await readdir('ios');
const workspaces = generated.filter(name => name.endsWith('.xcworkspace'));
if (workspaces.length !== 1) throw new Error('Expected one app workspace in ios/: '+workspaces.join(', '));
const workspace = path.resolve('ios', workspaces[0]);
const workspaceInfo = JSON.parse(output('xcodebuild', ['-workspace', workspace, '-list', '-json']));
const schemes = workspaceInfo.workspace.schemes;
const scheme = process.env.BREAKWIND_IOS_XCODE_SCHEME || path.basename(workspace, '.xcworkspace');
if (!schemes.includes(scheme)) {
  throw new Error('Set BREAKWIND_IOS_XCODE_SCHEME to the app scheme from: '+schemes.join(', '));
}
const archiveRoot = path.resolve('.expo/ios-archives');
await mkdir(archiveRoot, {recursive: true});
const channel = internalTesting ? 'internal-only' : 'release';
const archiveDir = await mkdtemp(path.join(archiveRoot, `${channel}-${ios.buildNumber}-`));
const archive = path.join(archiveDir, 'Breakwind.xcarchive');
run('xcodebuild', [
  '-workspace', workspace, '-scheme', scheme, '-configuration', 'Release',
  '-destination', 'generic/platform=iOS', '-archivePath', archive, 'archive',
]);

const apps = path.join(archive, 'Products/Applications');
const products = (await readdir(apps)).filter(name => name.endsWith('.app'));
if (products.length !== 1) throw new Error('Expected one signed app inside '+archive);
const app = path.join(apps, products[0]);
const plist = path.join(app, 'Info.plist');
for (const [key, expected] of Object.entries({CFBundleIdentifier: ios.bundleIdentifier, CFBundleVersion: ios.buildNumber, CFBundleShortVersionString: version})) {
  const actual = output('/usr/libexec/PlistBuddy', ['-c', 'Print :'+key, plist]);
  if (actual !== expected) throw new Error(`归档 ${key} 为 ${actual}，期望 ${expected}。`);
}
run('codesign', ['--verify', '--deep', '--strict', app]);
console.log(`已校验本机归档 ${version} (${ios.buildNumber})，源码 ${process.env.GITHUB_SHA}\n${archive}`);
if (internalTesting) console.log('本包包含内部测试体验。请在 Organizer 选择 TestFlight Internal Only。公开候选请使用普通 ios:archive 和新的构建号。');
