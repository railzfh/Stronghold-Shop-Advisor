import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const input = path.resolve(root, option('--input', 'catalog.json'));
const output = path.resolve(root, option('--output', 'catalog.json'));
const data = JSON.parse(await fs.readFile(input, 'utf8'));

if (!data || Array.isArray(data) || !Array.isArray(data.operators) || !Array.isArray(data.bonds)) {
  throw new Error('catalog 必须包含 operators 和 bonds 数组');
}

const ids = new Set();
const bonds = data.bonds.map((bond) => {
  if (!bond || typeof bond.id !== 'string' || !bond.id.trim()
    || typeof bond.name !== 'string' || !bond.name.trim()) {
    throw new Error('羁绊必须包含非空 id 和 name');
  }
  if (ids.has(bond.id)) throw new Error(`重复目录 ID：${bond.id}`);
  ids.add(bond.id);
  return { id: bond.id.trim(), name: bond.name.trim() };
});

const bondIds = new Set(bonds.map((bond) => bond.id));
const operators = data.operators.map((operator) => {
  if (!operator || typeof operator.id !== 'string' || !operator.id.trim()
    || typeof operator.name !== 'string' || !operator.name.trim()
    || !Number.isInteger(operator.tier) || operator.tier < 1
    || !Array.isArray(operator.bonds)) {
    throw new Error(`干员目录项格式无效：${JSON.stringify(operator)}`);
  }
  if (ids.has(operator.id)) throw new Error(`重复目录 ID：${operator.id}`);
  ids.add(operator.id);
  const memberBonds = [...new Set(operator.bonds)];
  if (memberBonds.some((bondId) => typeof bondId !== 'string' || !bondIds.has(bondId))) {
    throw new Error(`干员 ${operator.id} 引用了未知羁绊`);
  }
  return {
    id: operator.id.trim(),
    name: operator.name.trim(),
    tier: operator.tier,
    bonds: memberBonds,
  };
});

operators.sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
bonds.sort((a, b) => a.id.localeCompare(b.id));
await fs.writeFile(output, `${JSON.stringify({ operators, bonds }, null, 2)}\n`);
console.log(`Catalog written: ${operators.length} operators, ${bonds.length} bonds`);
