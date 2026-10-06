import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));

test('standalone project keeps package, manifest and default config aligned', () => {
  const packageJson = readJson('package.json');
  const manifest = readJson('manifest.json');
  const config = readJson('default-config.json');
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.manifest_version, 3);
  assert.equal(config.format, 'stronghold.shop-advisor-config');
  assert.equal(config.banAdvisor.format, 'stronghold.shop-ban-advisor');
});

test('catalog contains unique operator and bond ids', () => {
  const catalog = readJson('catalog.json');
  const operatorIds = catalog.operators.map((item) => item.id);
  const bondIds = catalog.bonds.map((item) => item.id);
  assert.equal(new Set(operatorIds).size, operatorIds.length);
  assert.equal(new Set(bondIds).size, bondIds.length);
  const knownBonds = new Set(bondIds);
  for (const operator of catalog.operators) {
    assert.ok(operator.bonds.every((id) => knownBonds.has(id)));
  }
});
