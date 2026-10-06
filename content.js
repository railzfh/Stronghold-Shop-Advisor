// Runs in Chrome's isolated world, with no dependency on the game's JavaScript globals.
(() => {
  if (globalThis.__spAdvisorExtension) return;
  globalThis.__spAdvisorExtension = true;
  let state = null;
  let timer;
  const marked = new Map();
  const colors = ['', '#e6b449', '#46c897', '#81b9f0'];
  const labels = ['', '优先', '推荐', '可考虑'];
  let notesBox;
  let notesToggle;
  let notesRound = null;
  let lastBanSignature = '';
  const noteLines = () => {
    const notes = state?.notes;
    if (!notes) return [];
    const round = currentRound();
    const specific = notes.rounds?.[String(round)];
    return Array.isArray(specific) && specific.length ? specific : (notes.defaultText ? [notes.defaultText] : []);
  };
  const currentRound = () => {
    const value = document.querySelector('.roundbox__num')?.textContent?.trim()
      || document.querySelector('.gtop')?.textContent?.match(/回合\s*(\d+)/)?.[1];
    const round = Number.parseInt(value, 10);
    return Number.isInteger(round) && round > 0 ? round : null;
  };
  const readBannedNames = () => {
    const nodes = document.querySelectorAll(
      '.brief-banned .uthumb[title], .ibanned .uthumb[title], .ibanned__one[title], .ibanned__one .uthumb[title]',
    );
    return [...new Set([...nodes].map(node => node.getAttribute('title')?.trim()).filter(Boolean))];
  };
  const analyzeBans = () => {
    const names = readBannedNames();
    const bannedIds = [];
    for (const name of names) {
      for (const operator of state?.catalog?.operators || []) {
        if (operator.name === name && !bannedIds.includes(operator.id)) bannedIds.push(operator.id);
      }
    }
    const config = state?.banAdvisor;
    const triggered = [];
    if (config?.enabled) {
      for (const group of config.groups || []) {
        const bannedCount = group.operatorIds.filter(id => bannedIds.includes(id)).length;
        const available = group.operatorIds.length - bannedCount;
        const conditions = group.conditions || {};
        if (
          (Number.isInteger(group.minAvailable) && available < group.minAvailable)
          || (Number.isInteger(conditions.availableBelow) && available < conditions.availableBelow)
          || (Number.isInteger(conditions.bannedAtLeast) && bannedCount >= conditions.bannedAtLeast)
          || (conditions.anyBanned === true && bannedCount > 0)
        ) {
          triggered.push({
            id: group.id, name: group.name, severity: group.severity, message: group.message,
            bannedCount, available, total: group.operatorIds.length,
          });
        }
      }
      const order = { critical: 0, warning: 1, info: 2 };
      triggered.sort((a, b) => order[a.severity] - order[b.severity] || a.name.localeCompare(b.name));
    }
    return { bannedNames: names, bannedIds, triggered };
  };
  const ensureNotesUi = () => {
    const ready = document.querySelector('.readywrap, .brief-ready');
    const readyHost = ready?.classList.contains('brief-ready') ? ready.parentElement : ready;
    const center = document.querySelector('.gtop__center') || document.querySelector('.brief__foot') || document.querySelector('.brief');
    if (!readyHost || !center) return false;
    if (!notesToggle || !notesToggle.isConnected) {
      notesToggle = null;
      notesToggle = document.createElement('button');
      notesToggle.className = 'sp-ext-notes-toggle';
      notesToggle.type = 'button';
      notesToggle.textContent = '注意';
      notesToggle.title = '显示本回合注意事项';
      notesToggle.setAttribute('aria-expanded', 'false');
      notesToggle.style.cssText = 'pointer-events:auto;align-self:flex-end;display:inline-flex;align-items:center;justify-content:center;min-width:52px;height:30px;margin-top:6px;padding:0 9px;border:1px solid rgba(255,198,0,.8);background:rgba(24,18,4,.96);color:#ffc600;font:700 12px/1 system-ui;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35);';
      notesToggle.addEventListener('click', () => {
        const open = notesBox?.hidden === false;
        if (notesBox) notesBox.hidden = open;
        notesToggle.setAttribute('aria-expanded', String(!open));
      });
    }
    if (notesToggle.parentElement !== readyHost) readyHost.append(notesToggle);
    if (!notesBox || !notesBox.isConnected) {
      notesBox = null;
      notesBox = document.createElement('div');
      notesBox.className = 'sp-ext-notes';
      notesBox.hidden = true;
      notesBox.style.cssText = 'position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);z-index:30;width:min(380px,calc(100vw - 24px));max-height:min(280px,35vh);overflow:auto;margin:0;padding:9px 12px;background:rgba(8,11,10,.97);border:1px solid rgba(255,198,0,.65);border-left:3px solid #ffc600;color:#f4e6bc;font:12px/1.45 system-ui;white-space:normal;overflow-wrap:anywhere;pointer-events:auto;box-shadow:0 4px 16px rgba(0,0,0,.5);';
      center.style.position = 'relative';
      center.append(notesBox);
    } else if (notesBox.parentElement !== center) {
      center.append(notesBox);
    }
    return true;
  };
  const updateNotes = () => {
    if (!ensureNotesUi()) return;
    const round = currentRound();
    const lines = noteLines();
    const analysis = analyzeBans();
    const banSignature = JSON.stringify(analysis);
    if (notesRound !== round || notesBox.textContent !== lines.join('\n') || banSignature !== lastBanSignature) {
      notesRound = round;
      lastBanSignature = banSignature;
      notesBox.replaceChildren();
      if (lines.length) {
        const title = document.createElement('strong');
        title.textContent = round ? `第 ${round} 回合注意事项` : '注意事项';
        title.style.cssText = 'display:block;margin-bottom:4px;color:#ffc600;font-weight:800;';
        notesBox.append(title);
        for (const line of lines) {
          const item = document.createElement('div');
          item.textContent = `• ${line}`;
          notesBox.append(item);
        }
      }
      if (analysis.triggered.length) {
        const title = document.createElement('strong');
        title.textContent = '禁用干员分析';
        title.style.cssText = 'display:block;margin-bottom:4px;color:#ff9d72;font-weight:800;';
        notesBox.append(title);
        for (const item of analysis.triggered) {
          const row = document.createElement('div');
          row.style.cssText = `color:${item.severity === 'critical' ? '#ff7777' : item.severity === 'warning' ? '#ffc600' : '#81b9f0'};`;
          row.textContent = `• ${item.message}（可用 ${item.available}/${item.total}）`;
          notesBox.append(row);
        }
      }
      notesToggle.hidden = false;
      if (state?.banAdvisor?.enabled && analysis.bannedNames.length === 0) {
        notesBox.append(Object.assign(document.createElement('div'), {
          textContent: '等待读取本局禁用干员。',
          style: 'color:#8a948f;',
        }));
      }
      if (!lines.length && !analysis.triggered.length && !(state?.banAdvisor?.enabled && analysis.bannedNames.length === 0)) {
        const title = document.createElement('strong');
        title.textContent = round ? `第 ${round} 回合注意事项` : '注意事项';
        title.style.cssText = 'display:block;margin-bottom:4px;color:#ffc600;font-weight:800;';
        notesBox.append(Object.assign(document.createElement('div'), {
          textContent: '本回合暂无配置的注意事项。',
          style: 'color:#8a948f;',
        }));
        notesBox.prepend(title);
      }
      chrome.storage.local.set({ lastBanAnalysis: analysis }).catch(() => {});
    }
  };
  function clear(card, original) {
    card.querySelector(':scope > .sp-ext-advice')?.remove();
    card.style.outline = original.outline;
    card.style.outlineOffset = original.offset;
  }
  function update() {
    for (const [card, original] of marked) clear(card, original);
    marked.clear();
    if (!state?.enabled) return 0;
    const { strategy, catalog } = state;
    let count = 0;
    for (const card of document.querySelectorAll('.shopbar__cards button.scard, .shopbar__rwcards button.scard')) {
      const name = card.querySelector('.scard__name')?.textContent.trim();
      const op = catalog.operators.find(c => c.name === name);
      if (!op) continue;
      const direct = strategy.operatorRules.find(r => r.chessId === op.id);
      const matches = strategy.bondRules.filter(r => op.bonds.includes(r.bondId));
      const candidates = matches.map(r => ({ tier: r.tier, reason: r.reason || `羁绊：${catalog.bonds.find(b => b.id === r.bondId)?.name || r.bondId}` }));
      if (card.querySelector('.scard__mergetag') && strategy.mergeTier !== null) candidates.push({ tier: strategy.mergeTier, reason: '可完成合成' });
      candidates.sort((a, b) => a.tier - b.tier);
      const result = direct || candidates[0];
      if (!result) continue;
      marked.set(card, { outline: card.style.outline, offset: card.style.outlineOffset });
      card.style.outline = `2px solid ${colors[result.tier]}`;
      card.style.outlineOffset = '-2px';
      const badge = document.createElement('span');
      badge.className = 'sp-ext-advice';
      badge.textContent = labels[result.tier];
      badge.title = result.reason || '干员专属规则';
      badge.setAttribute('aria-label', `${labels[result.tier]}：${badge.title}`);
      badge.style.cssText = `position:absolute;left:4px;top:28%;z-index:5;background:#17231f;color:${colors[result.tier]};padding:2px 4px;font:600 10px/1.2 system-ui;pointer-events:none;border-left:2px solid currentColor;max-width:90%;`;
      card.appendChild(badge);
      count++;
    }
    return count;
  }
  const observer = new MutationObserver(records => {
    // Ignore our own badges. Attribute writes are intentionally not observed.
    if (!records.some(r => {
      if (r.target?.closest?.('.sp-ext-notes, .sp-ext-notes-toggle')) return false;
      return r.type === 'characterData'
        || [...r.addedNodes, ...r.removedNodes].some(n => !(n.nodeType === 1 && (n.classList.contains('sp-ext-advice') || n.classList.contains('sp-ext-notes') || n.classList.contains('sp-ext-notes-toggle'))));
    })) return;
    clearTimeout(timer);
    timer = setTimeout(() => { update(); updateNotes(); }, 80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type === 'sp-advisor-apply') {
      state = message.state;
      const count = update();
      updateNotes();
      respond({ ok: !!document.querySelector('.shopbar'), count, banAnalysis: analyzeBans() });
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.advisor && state) {
      state = { ...state, ...changes.advisor.newValue };
      update();
      updateNotes();
    }
  });
  setInterval(updateNotes, 400);
})();
