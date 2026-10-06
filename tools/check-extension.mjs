import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfig } from '../core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
const manifest = await readJson('manifest.json');
const packageJson = await readJson('package.json');
const catalog = await readJson('catalog.json');
const defaultConfig = await readJson('default-config.json');

if (manifest.manifest_version !== 3) throw new Error('必须使用 Manifest V3');
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('Manifest 版本必须是三段式版本号');
if (manifest.version !== packageJson.version) throw new Error('package.json 与 manifest.json 版本不一致');
if (manifest.action?.default_popup !== 'popup.html') throw new Error('默认弹窗必须是 popup.html');

const requiredFiles = [
  'popup.html',
  'popup.js',
  'popup.css',
  'popup-layout.js',
  'core.js',
  'content.js',
  'catalog.json',
  'default-config.json',
];
for (const name of requiredFiles) {
  try {
    await fs.access(path.join(root, name));
  } catch {
    throw new Error(`缺少扩展文件：${name}`);
  }
}

const operatorIds = new Set();
for (const operator of catalog.operators) {
  if (operatorIds.has(operator.id)) throw new Error(`重复干员 ID：${operator.id}`);
  operatorIds.add(operator.id);
}
const bondIds = new Set();
for (const bond of catalog.bonds) {
  if (bondIds.has(bond.id)) throw new Error(`重复羁绊 ID：${bond.id}`);
  bondIds.add(bond.id);
}
parseConfig(JSON.stringify(defaultConfig), catalog);

for (const name of ['core.js', 'content.js', 'popup.js', 'popup-layout.js']) {
  const source = await fs.readFile(path.join(root, name), 'utf8');
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(source)) {
    throw new Error(`${name} 包含禁止的动态代码执行`);
  }
}

console.log(`Extension check passed: v${manifest.version}, ${catalog.operators.length} operators, ${catalog.bonds.length} bonds`);
