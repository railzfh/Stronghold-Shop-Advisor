import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG_FORMAT, BAN_ADVISOR_FORMAT, analyzeBans, emptyNotes, emptyStrategy, exportConfig, notesForRound, parseBanAdvisor, parseConfig, parseNotes, parseStrategy, recommendVisible, MAX_BYTES, NOTES_MAX_BYTES } from '../core.js';
const read = name => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
const catalog = read('catalog.json');
const knownChessIds = catalog.operators.map(item => item.id);

test('bundled unified config contains strategy and attention notes', () => {
  const result = parseConfig(JSON.stringify(read('default-config.json')), catalog);
  assert.equal(result.strategy.operatorRules[0].chessId, 'chess_char_1_03_a');
  assert.equal(result.strategy.bondRules.length, 2);
  assert.equal(result.notes.rounds['6'].length > 0, true);
  assert.equal(JSON.parse(exportConfig(result)).format, CONFIG_FORMAT);
  assert.deepEqual(parseConfig(exportConfig(result), catalog), result);
});
test('operator rules override bonds and merges without needing game state', () => {
  const strategy = emptyStrategy();
  strategy.bondRules = [{ bondId: 'yanShip', tier: 1, reason: '' }];
  strategy.operatorRules = [{ chessId: 'chess_char_1_03_a', tier: 3, reason: '稍后购买' }];
  assert.deepEqual(recommendVisible({ id: 'chess_char_1_03_a', bonds: ['yanShip'], merge: true }, strategy), { tier: 3, reason: '稍后购买' });
  strategy.operatorRules = [];
  strategy.bondRules = [];
  strategy.mergeTier = null;
  assert.equal(recommendVisible({ id: 'a', bonds: [], merge: true }, strategy), null);
});
test('bad imports are rejected rather than partially replacing current rules', () => {
  for (const change of [
    { version: 2 }, { name: '' }, { bondRules: [{ bondId: 'missing', tier: 1 }] },
    { operatorRules: [{ chessId: 'chess_char_1_03_a', tier: 4 }] },
    { operatorRules: [{ chessId: 'chess_char_1_03_a', tier: 1, when: 'eval(x)' }] },
    { bondRules: [{ bondId: 'yanShip', tier: 1 }, { bondId: 'yanShip', tier: 2 }] },
  ]) assert.throws(() => parseStrategy(JSON.stringify({ ...emptyStrategy(), ...change }), catalog));
  assert.throws(() => parseStrategy(' '.repeat(MAX_BYTES + 1), catalog));
  assert.throws(() => parseStrategy('{ broken', catalog));
});

test('attention notes support default and per-round lines', () => {
  const notes = parseNotes(JSON.stringify({
    format: 'stronghold.shop-attention-notes',
    version: 1,
    name: '测试提醒',
    defaultText: '保留升级资金',
    rounds: { '1': ['第一回合', '先买基础战力'], '6': ['检查核心羁绊'] },
  }));
  assert.deepEqual(notesForRound(notes, 1), ['第一回合', '先买基础战力']);
  assert.deepEqual(notesForRound(notes, 6), ['检查核心羁绊']);
  assert.deepEqual(notesForRound(notes, 9), ['保留升级资金']);
  assert.deepEqual(notesForRound(emptyNotes(), 1), []);
});

test('attention note imports reject invalid rounds, fields, and oversized content', () => {
  const base = { format: 'stronghold.shop-attention-notes', version: 1, name: 'x', defaultText: '', rounds: {} };
  assert.throws(() => parseNotes(JSON.stringify({ ...base, rounds: { '0': ['bad'] } })));
  assert.throws(() => parseNotes(JSON.stringify({ ...base, rounds: { '1': Array(13).fill('x') } })));
  assert.throws(() => parseNotes(JSON.stringify({ ...base, unexpected: true })));
  assert.throws(() => parseNotes('x'.repeat(NOTES_MAX_BYTES + 1)));
});

test('optional banAdvisor validates groups and analyzes triggered severity', () => {
  const banAdvisor = parseBanAdvisor({
    format: BAN_ADVISOR_FORMAT,
    version: 1,
    enabled: true,
    groups: [{
      id: 'yan-core',
      name: '炎核心',
      operatorIds: ['chess_char_1_03_a', 'chess_char_2_04_a'],
      minAvailable: 2,
      severity: 'critical',
      message: '炎核心成员不足。',
      conditions: { bannedAtLeast: 1 },
    }],
  }, { operators: knownChessIds.map(id => ({ id })) });
  const result = analyzeBans({ bannedIds: ['chess_char_1_03_a'], banAdvisor });
  assert.equal(result.triggered[0].severity, 'critical');
  assert.equal(result.triggered[0].available, 1);
  assert.throws(() => parseBanAdvisor({
    format: BAN_ADVISOR_FORMAT, version: 1, enabled: true, groups: [{
      id: 'bad', name: 'bad', operatorIds: ['missing'], severity: 'critical', message: 'bad',
    }],
  }, { operators: knownChessIds.map(id => ({ id })) }));
});
