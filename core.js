export const FORMAT = 'stronghold.shop-strategy';
export const NOTES_FORMAT = 'stronghold.shop-attention-notes';
export const CONFIG_FORMAT = 'stronghold.shop-advisor-config';
export const CONFIG_VERSION = 1;
export const BAN_ADVISOR_FORMAT = 'stronghold.shop-ban-advisor';
export const BAN_ADVISOR_VERSION = 1;
export const BAN_SEVERITIES = Object.freeze(['critical', 'warning', 'info']);
export const STORAGE_KEY = 'advisor';
export const NOTES_MAX_BYTES = 64 * 1024;
export const LABELS = ['', '优先', '推荐', '可考虑'];
export const MAX_BYTES = 256 * 1024;
export const emptyStrategy = () => ({ format: FORMAT, version: 1, name: '我的策略', bondRules: [], operatorRules: [], mergeTier: 1 });
export const emptyNotes = () => ({ format: NOTES_FORMAT, version: 1, name: '回合注意事项', defaultText: '', rounds: {} });
export const emptyConfig = () => ({
  format: CONFIG_FORMAT,
  version: CONFIG_VERSION,
  name: '我的顾问配置',
  strategy: emptyStrategy(),
  notes: emptyNotes(),
  banAdvisor: emptyBanAdvisor(),
});

export const emptyBanAdvisor = () => ({
  format: BAN_ADVISOR_FORMAT,
  version: BAN_ADVISOR_VERSION,
  enabled: false,
  groups: [],
});

// A strict whitelist keeps typos and unsupported conditional rules from silently changing a strategy.
export function parseStrategy(text, catalog) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('策略文件不能超过 256 KB');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('JSON 格式不正确'); }
  if (!data || Array.isArray(data) || data.format !== FORMAT || data.version !== 1) throw new Error('不支持的策略格式或版本');
  const fields = ['format', 'version', 'name', 'bondRules', 'operatorRules', 'mergeTier'];
  if (Object.keys(data).some(k => !fields.includes(k))) throw new Error('策略包含不支持的字段');
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80) throw new Error('策略名称须为 1–80 个字符');
  const validTier = n => Number.isInteger(n) && n >= 1 && n <= 3;
  if (data.mergeTier !== null && !validTier(data.mergeTier)) throw new Error('合成档位须为 1、2、3 或 null');
  const readRules = (rules, key, records, max) => {
    if (!Array.isArray(rules) || rules.length > max) throw new Error('规则数量或格式不正确');
    const ids = new Set(records.map(r => r.id)), seen = new Set();
    return rules.map(r => {
      if (!r || Object.keys(r).some(k => ![key, 'tier', 'reason'].includes(k))) throw new Error('规则包含不支持的字段');
      if (!ids.has(r[key])) throw new Error(`未知 ID：${r[key]}`);
      if (seen.has(r[key])) throw new Error(`重复规则：${r[key]}`);
      if (!validTier(r.tier)) throw new Error('推荐档位须为 1、2 或 3');
      if (r.reason !== undefined && (typeof r.reason !== 'string' || r.reason.length > 160)) throw new Error('备注最多 160 个字符');
      seen.add(r[key]);
      return { [key]: r[key], tier: r.tier, reason: r.reason || '' };
    });
  };
  return { format: FORMAT, version: 1, name: data.name.trim(),
    bondRules: readRules(data.bondRules, 'bondId', catalog.bonds, 64),
    operatorRules: readRules(data.operatorRules, 'chessId', catalog.operators, 512), mergeTier: data.mergeTier };
}

// Only visible offer facts are used: no hidden state, inferred layers or simulated purchases.
export function recommendVisible(offer, strategy) {
  const custom = strategy.operatorRules.find(r => r.chessId === offer.id);
  if (custom) return { tier: custom.tier, reason: custom.reason || '干员专属规则' };
  const matches = strategy.bondRules.filter(r => offer.bonds.includes(r.bondId));
  const candidates = matches.map(r => ({ tier: r.tier, reason: r.reason || '命中羁绊规则' }));
  if (offer.merge && strategy.mergeTier !== null) candidates.push({ tier: strategy.mergeTier, reason: '可完成合成' });
  candidates.sort((a, b) => a.tier - b.tier);
  return candidates[0] || null;
}

export function parseNotes(text) {
  if (new TextEncoder().encode(text).length > NOTES_MAX_BYTES) throw new Error('注意事项文件不能超过 64 KB');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('注意事项 JSON 格式不正确'); }
  if (!data || Array.isArray(data) || data.format !== NOTES_FORMAT || data.version !== 1) {
    throw new Error('不支持的注意事项格式或版本');
  }
  const allowed = new Set(['format', 'version', 'name', 'defaultText', 'rounds']);
  if (Object.keys(data).some(k => !allowed.has(k))) throw new Error('注意事项包含不支持的字段');
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80) throw new Error('注意事项名称须为 1–80 个字符');
  if (data.defaultText !== undefined && (typeof data.defaultText !== 'string' || data.defaultText.length > 240)) {
    throw new Error('默认注意事项最多 240 个字符');
  }
  if (!data.rounds || typeof data.rounds !== 'object' || Array.isArray(data.rounds)) throw new Error('rounds 必须是对象');

  const rounds = {};
  for (const [key, value] of Object.entries(data.rounds)) {
    if (!/^(?:[1-9]|[1-9][0-9])$/.test(key)) throw new Error(`无效回合号：${key}`);
    if (!Array.isArray(value) || value.length > 12 || value.some(line => typeof line !== 'string' || line.length > 240)) {
      throw new Error(`第 ${key} 回合的注意事项必须是最多12条、每条240字以内的数组`);
    }
    rounds[key] = value.map(line => line.trim()).filter(Boolean);
  }
  return {
    format: NOTES_FORMAT,
    version: 1,
    name: data.name.trim(),
    defaultText: (data.defaultText || '').trim(),
    rounds,
  };
}

export function parseBanAdvisor(data, catalog) {
  if (data == null) return emptyBanAdvisor();
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || data.format !== BAN_ADVISOR_FORMAT || data.version !== BAN_ADVISOR_VERSION) {
    throw new Error('不支持的禁用干员分析格式或版本');
  }
  const allowed = new Set(['format', 'version', 'enabled', 'groups']);
  if (Object.keys(data).some(k => !allowed.has(k))) throw new Error('禁用分析包含不支持的字段');
  if (typeof data.enabled !== 'boolean') throw new Error('禁用分析 enabled 必须是布尔值');
  if (!Array.isArray(data.groups) || data.groups.length > 128) throw new Error('禁用分析分组数量无效');
  const operators = new Set((catalog?.operators || []).map(item => item.id));
  const seenGroups = new Set();
  const groups = data.groups.map(group => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error('禁用分析分组格式无效');
    const allowedGroup = new Set(['id', 'name', 'operatorIds', 'minAvailable', 'severity', 'message', 'conditions']);
    if (Object.keys(group).some(k => !allowedGroup.has(k))) throw new Error('禁用分析分组包含不支持的字段');
    if (typeof group.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(group.id) || seenGroups.has(group.id)) {
      throw new Error(`无效或重复的禁用分析分组 ID：${String(group.id)}`);
    }
    if (typeof group.name !== 'string' || !group.name.trim() || group.name.length > 80) throw new Error('禁用分析分组名称无效');
    if (!Array.isArray(group.operatorIds) || group.operatorIds.length < 1 || group.operatorIds.length > 128) {
      throw new Error(`分组 ${group.id} 的 operatorIds 无效`);
    }
    const memberSet = new Set();
    for (const id of group.operatorIds) {
      if (typeof id !== 'string' || !operators.has(id)) throw new Error(`分组 ${group.id} 包含未知干员 ID：${String(id)}`);
      if (memberSet.has(id)) throw new Error(`分组 ${group.id} 包含重复干员 ID：${id}`);
      memberSet.add(id);
    }
    if (!BAN_SEVERITIES.includes(group.severity)) throw new Error(`分组 ${group.id} 的 severity 无效`);
    if (typeof group.message !== 'string' || !group.message.trim() || group.message.length > 240) {
      throw new Error(`分组 ${group.id} 的 message 无效`);
    }
    const minAvailable = group.minAvailable == null ? null : Number(group.minAvailable);
    if (minAvailable != null && (!Number.isInteger(minAvailable) || minAvailable < 0 || minAvailable > group.operatorIds.length)) {
      throw new Error(`分组 ${group.id} 的 minAvailable 无效`);
    }
    const conditions = group.conditions == null ? {} : group.conditions;
    if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions)) throw new Error(`分组 ${group.id} 的 conditions 无效`);
    const allowedConditions = new Set(['bannedAtLeast', 'anyBanned', 'availableBelow']);
    if (Object.keys(conditions).some(k => !allowedConditions.has(k))) throw new Error(`分组 ${group.id} 有未知触发条件`);
    const bannedAtLeast = conditions.bannedAtLeast == null ? null : Number(conditions.bannedAtLeast);
    if (bannedAtLeast != null && (!Number.isInteger(bannedAtLeast) || bannedAtLeast < 1 || bannedAtLeast > group.operatorIds.length)) {
      throw new Error(`分组 ${group.id} 的 bannedAtLeast 无效`);
    }
    const availableBelow = conditions.availableBelow == null ? null : Number(conditions.availableBelow);
    if (availableBelow != null && (!Number.isInteger(availableBelow) || availableBelow < 0 || availableBelow > group.operatorIds.length)) {
      throw new Error(`分组 ${group.id} 的 availableBelow 无效`);
    }
    if (conditions.anyBanned != null && typeof conditions.anyBanned !== 'boolean') throw new Error(`分组 ${group.id} 的 anyBanned 无效`);
    seenGroups.add(group.id);
    return {
      id: group.id,
      name: group.name.trim(),
      operatorIds: [...memberSet],
      minAvailable,
      severity: group.severity,
      message: group.message.trim(),
      conditions: {
        bannedAtLeast,
        anyBanned: conditions.anyBanned === true,
        availableBelow,
      },
    };
  });
  return { format: BAN_ADVISOR_FORMAT, version: BAN_ADVISOR_VERSION, enabled: data.enabled, groups };
}

export function notesForRound(notes, round) {
  const config = notes && notes.format === NOTES_FORMAT ? notes : emptyNotes();
  const lines = config.rounds?.[String(round)];
  if (Array.isArray(lines) && lines.length) return lines;
  return config.defaultText ? [config.defaultText] : [];
}

export function parseConfig(text, catalog) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('配置文件不能超过 256 KB');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('配置 JSON 格式不正确'); }
  if (!data || Array.isArray(data) || data.format !== CONFIG_FORMAT || data.version !== CONFIG_VERSION) {
    throw new Error('不支持的统一配置格式或版本');
  }
  const allowed = new Set(['format', 'version', 'name', 'strategy', 'notes', 'banAdvisor']);
  if (Object.keys(data).some(k => !allowed.has(k))) throw new Error('配置包含不支持的字段');
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80) throw new Error('配置名称须为 1–80 个字符');
  if (!data.strategy || !data.notes) throw new Error('配置必须同时包含 strategy 和 notes');
  const strategy = parseStrategy(JSON.stringify(data.strategy), catalog);
  const notes = parseNotes(JSON.stringify(data.notes));
  const banAdvisor = parseBanAdvisor(data.banAdvisor, catalog);
  return { format: CONFIG_FORMAT, version: CONFIG_VERSION, name: data.name.trim(), strategy, notes, banAdvisor };
}

export function exportConfig({ name = '我的顾问配置', strategy, notes, banAdvisor } = {}) {
  const cleanStrategy = strategy || emptyStrategy();
  const cleanNotes = notes || emptyNotes();
  return JSON.stringify({
    format: CONFIG_FORMAT,
    version: CONFIG_VERSION,
    name: typeof name === 'string' && name.trim() ? name.trim() : '我的顾问配置',
    strategy: {
      format: FORMAT,
      version: 1,
      name: cleanStrategy.name || '我的策略',
      bondRules: Array.isArray(cleanStrategy.bondRules) ? cleanStrategy.bondRules : [],
      operatorRules: Array.isArray(cleanStrategy.operatorRules) ? cleanStrategy.operatorRules : [],
      mergeTier: cleanStrategy.mergeTier === null ? null : cleanStrategy.mergeTier || 1,
    },
    notes: {
      format: NOTES_FORMAT,
      version: 1,
      name: cleanNotes.name || '回合注意事项',
      defaultText: cleanNotes.defaultText || '',
      rounds: cleanNotes.rounds && typeof cleanNotes.rounds === 'object' ? cleanNotes.rounds : {},
    },
    banAdvisor: banAdvisor || emptyBanAdvisor(),
  }, null, 2);
}

export function analyzeBans({ bannedIds = [], banAdvisor = emptyBanAdvisor() } = {}) {
  const banned = new Set(Array.isArray(bannedIds) ? bannedIds : []);
  const groups = banAdvisor && Array.isArray(banAdvisor.groups) ? banAdvisor.groups : [];
  if (!banAdvisor?.enabled) return { bannedIds: [...banned], triggered: [] };
  const triggered = [];
  for (const group of groups) {
    const bannedCount = group.operatorIds.filter(id => banned.has(id)).length;
    const available = group.operatorIds.length - bannedCount;
    const conditions = group.conditions || {};
    const minAvailableTriggered = Number.isInteger(group.minAvailable) && available < group.minAvailable;
    const availableBelowTriggered = Number.isInteger(conditions.availableBelow) && available < conditions.availableBelow;
    const bannedAtLeastTriggered = Number.isInteger(conditions.bannedAtLeast) && bannedCount >= conditions.bannedAtLeast;
    const anyBannedTriggered = conditions.anyBanned === true && bannedCount > 0;
    if (minAvailableTriggered || availableBelowTriggered || bannedAtLeastTriggered || anyBannedTriggered) {
      triggered.push({
        id: group.id,
        name: group.name,
        severity: group.severity,
        message: group.message,
        bannedCount,
        available,
        total: group.operatorIds.length,
      });
    }
  }
  const order = { critical: 0, warning: 1, info: 2 };
  triggered.sort((a, b) => order[a.severity] - order[b.severity] || a.name.localeCompare(b.name));
  return { bannedIds: [...banned], triggered };
}
