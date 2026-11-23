import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {access, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// expo@56.0.24 embeds a bare template for SDK 57. Pin the official SDK 56
// bare template whose package.json specifies this project's React Native 0.85.3.
const name = 'expo-template-bare-minimum';
const version = '56.0.38';
const sha512 = '+lLqjJE17Fus3699Dv+BELfrud6kfb4Xwx29vBr8wAUcLyllsoJ+F0oR8z2JWwD2UN7MQtZQxAPjsfdniKer8w==';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const marker = 'ios/.breakwind-bare-template';
const fingerprint = `${name}@${version} sha512-${sha512}\n`;
try {
  await access('ios');
  const previous = await readFile(marker, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (previous !== fingerprint) {
    throw new Error('当前 ios/ 的起始模板未经本构建流程确认。请在同一提交的新工作副本运行构建，保留当前原生工程。');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const temp = await mkdtemp(path.join(tmpdir(), 'breakwind-sdk56-'));
try {
  execFileSync('npm', ['pack', `${name}@${version}`, '--registry=https://registry.npmjs.org',
    '--prefer-offline', '--ignore-scripts', '--silent', '--pack-destination', temp], {stdio: 'inherit'});
  const template = path.join(temp, `${name}-${version}.tgz`);
  const actual = createHash('sha512').update(await readFile(template)).digest('base64');
  if (actual !== sha512) throw new Error('Expo SDK 56 模板的 SHA-512 校验失败。');
  execFileSync(process.execPath, ['node_modules/expo/bin/cli', 'prebuild', '--platform', 'ios',
    '--no-install', '--template', template], {stdio: 'inherit'});
  await writeFile(marker, fingerprint);
} finally {
  await rm(temp, {recursive: true, force: true});
}
