import { exportConfig, parseBanAdvisor, parseConfig, parseStrategy, STORAGE_KEY, LABELS, MAX_BYTES } from './core.js';

const $ = id => document.getElementById(id);
const extension = !!globalThis.chrome?.storage?.local;
let catalog, state, tab = 'bonds', pending, saveQueue = Promise.resolve();
let lastBanAnalysis = null;
const say = (text, error = false) => { $('status').textContent = text; $('status').classList.toggle('error', error); };

function save() {
  const snapshot = structuredClone(state);
  $('saved').textContent = '保存中…';
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    if (extension) await chrome.storage.local.set({ [STORAGE_KEY]: snapshot });
    else localStorage.setItem('sp-extension-preview', JSON.stringify(snapshot));
    $('saved').textContent = '已保存';
  }).catch(() => { $('saved').textContent = '保存失败'; say('存储失败，请先导出策略。', true); });
  return saveQueue;
}

function counts() {
  $('bond-count').textContent = state.strategy.bondRules.length;
  $('operator-count').textContent = state.strategy.operatorRules.length;
}

function renderBanAnalysis() {
  const box = $('ban-analysis');
  box.replaceChildren();
  if (!lastBanAnalysis) {
    const empty = document.createElement('p');
    empty.textContent = '当前页面尚未读取本局禁用干员。';
    box.append(empty);
    return;
  }
  const title = document.createElement('div');
  title.className = 'ban-analysis__title';
  title.innerHTML = `<strong>禁用干员分析</strong><span>已识别 ${lastBanAnalysis.bannedIds.length} 名</span>`;
  box.append(title);
  if (!lastBanAnalysis.triggered.length) {
    const ok = document.createElement('p');
    ok.className = 'ban-analysis__ok';
    ok.textContent = '当前配置未触发风险提醒。';
    box.append(ok);
    return;
  }
  for (const item of lastBanAnalysis.triggered) {
    const row = document.createElement('div');
    row.className = `ban-analysis__item ban-analysis__item--${item.severity}`;
    row.innerHTML = `<b>${item.severity === 'critical' ? '严重' : item.severity === 'warning' ? '警告' : '提示'} · ${item.name}</b><span>${item.message}</span><small>可用 ${item.available}/${item.total}，禁用 ${item.bannedCount}</small>`;
    box.append(row);
  }
}

function render() {
  counts();
  const key = tab === 'bonds' ? 'bondId' : 'chessId';
  const field = tab === 'bonds' ? 'bondRules' : 'operatorRules';
  const query = $('search').value.trim().toLowerCase();
  const records = catalog[tab].filter(r => {
    const match = r.name.toLowerCase().includes(query) || r.id.includes(query);
    return match && (!$('configured').checked || state.strategy[field].some(rule => rule[key] === r.id));
  });
  $('rules').replaceChildren();
  for (const record of records) {
    const rule = state.strategy[field].find(r => r[key] === record.id);
    const block = document.createElement('section'); block.className = 'rule';
    const row = document.createElement('div'); row.className = 'row';
    const identity = document.createElement('div'); identity.className = 'identity';
    const title = document.createElement('strong'); title.textContent = record.name;
    identity.append(title);
    if (tab === 'operators') {
      const sub = document.createElement('small');
      sub.textContent = `${record.tier}阶 · ${record.bonds.map(id => catalog.bonds.find(b => b.id === id)?.name || id).join(' / ')}`;
      identity.append(sub);
    }
    const tiers = document.createElement('div'); tiers.className = 'tiers'; tiers.setAttribute('role', 'group'); tiers.setAttribute('aria-label', `${record.name}推荐程度`);
    for (const tier of [1, 2, 3, 0]) {
      const button = document.createElement('button');
      button.textContent = LABELS[tier] || '×'; button.dataset.tier = tier;
      button.title = tier ? `${record.name}：${LABELS[tier]}` : `清除${record.name}规则`;
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', String((rule?.tier || 0) === tier));
      button.addEventListener('click', () => {
        const other = state.strategy[field].filter(r => r[key] !== record.id);
        if (tier) other.push({ [key]: record.id, tier, reason: rule?.reason || '' });
        state.strategy[field] = other; save(); render();
      });
      tiers.append(button);
    }
    row.append(identity, tiers); block.append(row);
    if (rule) {
      const note = document.createElement('input'); note.className = 'note'; note.maxLength = 160;
      note.placeholder = '推荐理由（可选）'; note.value = rule.reason;
      note.setAttribute('aria-label', `${record.name}推荐理由`);
      note.addEventListener('input', () => { rule.reason = note.value; save(); });
      block.append(note);
    }
    $('rules').append(block);
  }
  if (!records.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = '没有匹配的规则'; $('rules').append(p); }
}

function sync() {
  $('enabled').checked = state.enabled;
  $('name').value = state.strategy.name;
  $('merge').value = state.strategy.mergeTier ?? 0;
  render();
  renderBanAnalysis();
}

function preview(strategy) {
  pending = strategy;
  $('preview-name').textContent = strategy.name;
  $('preview-count').textContent = `${strategy.bondRules.length} 条羁绊规则 · ${strategy.operatorRules.length} 条干员规则`;
  $('preview').showModal();
}

function previewConfig(config) {
  pending = { type: 'config', value: config };
  $('preview-name').textContent = config.name;
  $('preview-count').textContent = `${config.strategy.bondRules.length} 条羁绊规则 · ${config.strategy.operatorRules.length} 条干员规则 · ${Object.keys(config.notes.rounds).length} 个回合提醒`;
  $('preview').showModal();
}

async function apply() {
  if (!extension) { say('预览页面：请在浏览器扩展弹窗中连接游戏。'); return; }
  $('apply').disabled = true;
  try {
    await saveQueue;
    const tabs = await chrome.tabs.query({});
    const current = tabs.find(tab => tab.active && /^https?:/.test(tab.url || ''))
      || tabs.filter(tab => /^https?:/.test(tab.url || '')).sort((a, b) => (b.id || 0) - (a.id || 0))[0];
    if (!current?.id || !/^https?:/.test(current.url || '')) throw new Error('请先打开游戏网页，再应用策略。');
    await chrome.scripting.executeScript({ target: { tabId: current.id }, files: ['content.js'] });
    const response = await chrome.tabs.sendMessage(current.id, { type: 'sp-advisor-apply', state: { ...state, catalog } });
    if (response.banAnalysis) {
      lastBanAnalysis = response.banAnalysis;
      renderBanAnalysis();
    }
    say(response.ok
      ? (state.enabled ? `已连接 · ${response.count} 张商店卡命中规则` : '已关闭当前页面推荐')
      : (response.banAnalysis?.bannedIds?.length ? `已读取本局禁用干员 · ${response.banAnalysis.bannedIds.length} 名` : '已连接，等待进入游戏商店。'));
  } catch (error) { say(error.message || '连接失败，请刷新游戏页面后重试。', true); }
  finally { $('apply').disabled = false; }
}

async function boot() {
  catalog = await fetch('./catalog.json').then(r => r.json());
  const bundledConfig = await fetch('./default-config.json').then(r => r.json()).then(data => parseConfig(JSON.stringify(data), catalog));
  state = { enabled: false, strategy: bundledConfig.strategy, notes: bundledConfig.notes, banAdvisor: bundledConfig.banAdvisor };
  try {
    const saved = extension ? (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] : JSON.parse(localStorage.getItem('sp-extension-preview') || 'null');
    if (saved) state = {
      enabled: saved.enabled === true,
      strategy: parseStrategy(JSON.stringify(saved.strategy), catalog),
      notes: saved.notes || bundledConfig.notes,
      banAdvisor: parseBanAdvisor(saved.banAdvisor, catalog),
    };
    if (extension) lastBanAnalysis = (await chrome.storage.local.get('lastBanAnalysis')).lastBanAnalysis || null;
  } catch { say('已恢复默认设置，原保存内容未覆盖。', true); }
  $('enabled').addEventListener('change', () => { state.enabled = $('enabled').checked; save(); });
  $('name').addEventListener('change', () => { state.strategy.name = $('name').value.trim() || '我的策略'; $('name').value = state.strategy.name; save(); });
  $('merge').addEventListener('change', () => { state.strategy.mergeTier = Number($('merge').value) || null; save(); });
  $('search').addEventListener('input', render); $('configured').addEventListener('change', render);
  for (const button of document.querySelectorAll('[data-tab]')) button.addEventListener('click', () => {
    tab = button.dataset.tab; $('search').value = ''; $('search').placeholder = tab === 'bonds' ? '搜索羁绊' : '搜索干员';
    for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-pressed', String(b === button));
    render(); $('rules').scrollTop = 0;
  });
  $('import').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async () => {
    const file = $('file').files[0]; $('file').value = '';
    if (!file) return;
    try {
      if (file.size > MAX_BYTES) throw new Error('策略文件不能超过 256 KB');
      previewConfig(parseConfig(await file.text(), catalog));
    } catch (error) { say(error.message, true); }
  });
  $('preset').addEventListener('click', async () => {
    try { previewConfig(parseConfig(await fetch('./default-config.json').then(r => r.text()), catalog)); }
    catch { say('无法载入炎配置', true); }
  });
  $('cancel').addEventListener('click', () => { pending = null; $('preview').close(); });
  $('confirm').addEventListener('click', () => {
    if (!pending) return;
    if (pending?.type !== 'config') return;
    state.strategy = pending.value.strategy;
    state.notes = pending.value.notes;
    state.banAdvisor = pending.value.banAdvisor;
    pending = null; save(); sync(); $('preview').close(); say('配置已导入');
  });
  $('export').addEventListener('click', () => {
    const blob = new Blob([exportConfig({
      name: state.strategy.name, strategy: state.strategy, notes: state.notes, banAdvisor: state.banAdvisor,
    })], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'shop-advisor-config.json';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('apply').addEventListener('click', apply);
  if (extension) chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastBanAnalysis) {
      lastBanAnalysis = changes.lastBanAnalysis.newValue || null;
      renderBanAnalysis();
    }
  });
  sync();
}
boot().catch(() => { say('初始化失败，请重新打开插件。', true); $('apply').disabled = true; });
