/* Custom dropdowns and calendars. Any <select> and <input type="date"> on the page is upgraded automatically.
   The original element stays in the DOM (hidden) and is kept in sync, so existing code that reads .value or listens
   for change/input events keeps working. The menu and the calendar float in a layer on <body>, so nothing clips them. */
(function (B) {
  const $ = (s, r = document) => r.querySelector(s);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const selValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const inpValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const ICON = {
    chev: '<svg class="dd-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cal: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    x: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  /* a small colour dot in front of well-known status and type names */
  const DOT = { Paid: '#0f9d78', Active: '#0f9d78', Enabled: '#0f9d78', Failed: '#dc2626', Overdue: '#dc2626', Suspended: '#dc2626', Pending: '#d97706', Draft: '#64748b', Inactive: '#64748b',
    Disabled: '#64748b', Trial: '#4f46e5', Available: '#4f46e5', 'Coming soon': '#64748b', Voice: '#2563eb', SMS: '#0d9488', Meetings: '#7c3aed', Storage: '#d97706', AI: '#db2777' };
  const dot = t => DOT[t] ? `<i class="dd-dot" style="background:${DOT[t]}"></i>` : '';
  const phone = () => innerWidth < 576;

  const backdrop = document.createElement('div'); backdrop.className = 'dd-backdrop'; backdrop.hidden = true;
  const menu = document.createElement('ul'); menu.className = 'dd-menu'; menu.setAttribute('role', 'listbox'); menu.hidden = true; menu.id = 'ddMenu';
  const cal = document.createElement('div'); cal.className = 'dp-pop'; cal.setAttribute('role', 'dialog'); cal.setAttribute('aria-label', 'Choose a date'); cal.hidden = true;
  document.body.append(backdrop, menu, cal);

  let cur = null;   // { type:'dd'|'dp', el, btn, ... }

  function closeAll(focusBack) {
    if (!cur) return; const c = cur; cur = null;
    c.btn.setAttribute('aria-expanded', 'false'); c.btn.removeAttribute('aria-activedescendant'); c.wrap.classList.remove('open');
    menu.classList.remove('on'); cal.classList.remove('on'); backdrop.hidden = true;
    setTimeout(() => { if (!cur) { menu.hidden = true; cal.hidden = true; menu.classList.remove('sheet'); cal.classList.remove('sheet'); } }, 140);
    if (focusBack) c.btn.focus();
  }

  /* put a floating panel next to its button: below by default, above when there is no room; bottom sheet on phones */
  function position(panel, btn, minW) {
    panel.classList.toggle('sheet', phone()); backdrop.hidden = !phone();
    if (phone()) { panel.style.top = panel.style.left = panel.style.width = ''; return; }
    const r = btn.getBoundingClientRect(), w = Math.max(r.width, minW || 0); panel.style.width = w + 'px';
    const ph = panel.offsetHeight, below = innerHeight - r.bottom - 8, top = below >= ph || below >= r.top - 8 ? r.bottom + 6 : r.top - ph - 6;
    panel.style.top = Math.max(8, Math.min(innerHeight - ph - 8, top)) + 'px';
    panel.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  }

  /* ============================ dropdown ============================ */
  function upgradeSelect(sel) {
    if (sel.multiple || sel.size > 1) return; sel.dataset.ui = '1';
    const wrap = document.createElement('div');
    wrap.className = 'dd' + (sel.classList.contains('w-auto') ? ' dd-auto' : '') + (sel.classList.contains('form-select-sm') ? ' dd-sm' : '');
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn';
    btn.setAttribute('role', 'combobox'); btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'ddMenu');
    btn.innerHTML = `<span class="dd-val"></span>${ICON.chev}`;
    sel.parentNode.insertBefore(wrap, sel); wrap.append(btn, sel);
    sel.style.display = 'none'; sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    const lab = sel.id && $(`label[for="${sel.id}"]`); if (lab) { if (!lab.id) lab.id = sel.id + '_lbl'; btn.setAttribute('aria-labelledby', lab.id); } else if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
    const sync = () => {
      const o = sel.options[sel.selectedIndex]; btn.querySelector('.dd-val').innerHTML = o ? dot(o.text) + `<span>${E(o.text)}</span>` : '';
      btn.disabled = sel.disabled; btn.classList.toggle('is-invalid', sel.classList.contains('is-invalid'));
    };
    Object.defineProperty(sel, 'value', { configurable: true, get() { return selValue.get.call(sel); }, set(v) { selValue.set.call(sel, v); sync(); } });
    new MutationObserver(sync).observe(sel, { attributes: true, attributeFilter: ['class', 'disabled'] });
    new MutationObserver(sync).observe(sel, { childList: true });
    sel._ddSync = sync; sync();
    btn.addEventListener('click', () => (cur && cur.btn === btn) ? closeAll() : openMenu(sel, btn, wrap));
    btn.addEventListener('keydown', e => { if (!cur && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(sel, btn, wrap); } });
  }

  function openMenu(sel, btn, wrap) {
    closeAll(); const opts = [...sel.options];
    menu.innerHTML = opts.map((o, i) => `<li role="option" id="ddo${i}" data-i="${i}" aria-selected="${o.selected}" class="${o.selected ? 'sel' : ''}${o.disabled ? ' dis' : ''}">${dot(o.text)}<span class="dd-t">${E(o.text)}</span><span class="dd-ck">${ICON.check}</span></li>`).join('');
    menu.hidden = false; menu.scrollTop = 0; wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    cur = { type: 'dd', sel, btn, wrap, active: Math.max(0, sel.selectedIndex), typed: '', typedAt: 0 };
    position(menu, btn, 150); setActive(cur.active, true);
    requestAnimationFrame(() => menu.classList.add('on')); setTimeout(() => menu.classList.add('on'), 20);
  }
  function setActive(i, scroll) {
    const items = [...menu.children]; if (!items.length) return; i = (i + items.length) % items.length; cur.active = i;
    items.forEach((li, n) => li.classList.toggle('act', n === i)); cur.btn.setAttribute('aria-activedescendant', 'ddo' + i);
    if (scroll) items[i].scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    const c = cur, sel = c.sel, o = sel.options[i]; if (!o || o.disabled) return;
    const changed = sel.selectedIndex !== i; sel.selectedIndex = i; sel._ddSync(); closeAll(true);
    if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  menu.addEventListener('mousedown', e => e.preventDefault());
  menu.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li && cur && cur.type === 'dd') choose(+li.dataset.i); });
  menu.addEventListener('mousemove', e => { const li = e.target.closest('li[data-i]'); if (li && cur && cur.type === 'dd' && +li.dataset.i !== cur.active) setActive(+li.dataset.i); });

  /* ============================ calendar ============================ */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const pad = n => String(n).padStart(2, '0'), iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const parse = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };
  const todayISO = () => (B.state && B.state.today) || iso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const fmt = v => { const p = parse(v); return p ? new Date(p.y, p.m, p.d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };

  function upgradeDate(inp) {
    inp.dataset.ui = '1';
    const wrap = document.createElement('div'); wrap.className = 'dd dp';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn dp-btn';
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `<span class="dp-ico">${ICON.cal}</span><span class="dd-val"></span>`;
    const x = document.createElement('button'); x.type = 'button'; x.className = 'dp-x'; x.innerHTML = ICON.x; x.setAttribute('aria-label', 'Clear date'); x.hidden = true;
    inp.parentNode.insertBefore(wrap, inp); wrap.append(btn, x, inp);
    inp.style.display = 'none'; inp.tabIndex = -1; inp.setAttribute('aria-hidden', 'true');
    const lab = inp.id && $(`label[for="${inp.id}"]`); if (lab) { if (!lab.id) lab.id = inp.id + '_lbl'; btn.setAttribute('aria-labelledby', lab.id); }
    const sync = () => { const v = inpValue.get.call(inp); btn.querySelector('.dd-val').innerHTML = v ? `<span>${E(fmt(v))}</span>` : '<span class="dd-ph">Select date</span>'; x.hidden = !v; btn.classList.toggle('is-invalid', inp.classList.contains('is-invalid')); btn.disabled = inp.disabled; };
    Object.defineProperty(inp, 'value', { configurable: true, get() { return inpValue.get.call(inp); }, set(v) { inpValue.set.call(inp, v); sync(); } });
    new MutationObserver(sync).observe(inp, { attributes: true, attributeFilter: ['class', 'disabled'] });
    inp._ddSync = sync; sync();
    btn.addEventListener('click', () => (cur && cur.btn === btn) ? closeAll() : openCal(inp, btn, wrap));
    btn.addEventListener('keydown', e => { if (!cur && ['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openCal(inp, btn, wrap); } });
    x.addEventListener('click', () => setDate(inp, ''));
  }
  function setDate(inp, v) {
    if (v && ((inp.min && v < inp.min) || (inp.max && v > inp.max))) return;   // outside the allowed range
    const changed = inpValue.get.call(inp) !== v; inpValue.set.call(inp, v); inp._ddSync();
    if (changed) { inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  function openCal(inp, btn, wrap) {
    closeAll(); const val = parse(inpValue.get.call(inp)), t = parse(todayISO());
    const base = val || t; cur = { type: 'dp', inp, btn, wrap, view: 'days', y: base.y, m: base.m, focus: val ? iso(val.y, val.m, val.d) : todayISO() };
    cal.hidden = false; wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    drawCal(); position(cal, btn, 292); requestAnimationFrame(() => { cal.classList.add('on'); focusDay(); }); setTimeout(() => cal.classList.add('on'), 20);
  }
  function drawCal() {
    const c = cur, sel = inpValue.get.call(c.inp), today = todayISO();
    const mn = c.inp.min, mx = c.inp.max, offToday = (mn && today < mn) || (mx && today > mx);
    let body;
    if (c.view === 'months') {
      body = `<div class="dp-months">${MONTHS.map((n, i) => `<button type="button" class="dp-m ${i === c.m ? 'sel' : ''} ${c.y === +today.slice(0, 4) && i === +today.slice(5, 7) - 1 ? 'now' : ''}" data-m="${i}"${(mn && iso(c.y, i, 31) < mn) || (mx && iso(c.y, i, 1) > mx) ? ' disabled' : ''}>${n.slice(0, 3)}</button>`).join('')}</div>`;
    } else {
      const first = new Date(c.y, c.m, 1), lead = (first.getDay() + 6) % 7, start = new Date(c.y, c.m, 1 - lead), cells = [];
      for (let i = 0; i < 42; i++) { const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), v = iso(d.getFullYear(), d.getMonth(), d.getDate());
        const off = (mn && v < mn) || (mx && v > mx);
        cells.push(`<button type="button" class="dp-d ${d.getMonth() !== c.m ? 'out' : ''} ${v === sel ? 'sel' : ''} ${v === today ? 'now' : ''}" data-v="${v}" tabindex="${v === c.focus && !off ? 0 : -1}" aria-label="${E(fmt(v))}"${v === sel ? ' aria-pressed="true"' : ''}${off ? ' disabled' : ''}>${d.getDate()}</button>`); }
      body = `<div class="dp-week" aria-hidden="true">${DOW.map(d => `<span>${d}</span>`).join('')}</div><div class="dp-grid" role="grid">${cells.join('')}</div>`;
    }
    cal.innerHTML = `<div class="dp-head"><button type="button" class="dp-nav" data-nav="-1" aria-label="${c.view === 'months' ? 'Previous year' : 'Previous month'}">${ICON.left}</button>
      <button type="button" class="dp-title" data-view aria-label="Change month or year">${c.view === 'months' ? c.y : MONTHS[c.m] + ' ' + c.y}</button>
      <button type="button" class="dp-nav" data-nav="1" aria-label="${c.view === 'months' ? 'Next year' : 'Next month'}">${ICON.right}</button></div>${body}
      <div class="dp-foot"><button type="button" class="dp-link" data-today ${offToday ? 'disabled' : ''}>Today</button><button type="button" class="dp-link" data-clear ${sel ? '' : 'disabled'}>Clear</button></div>`;
  }
  function focusDay() { const b = cal.querySelector('.dp-d[tabindex="0"]') || cal.querySelector('.dp-d.sel') || cal.querySelector('.dp-d:not(.out):not(:disabled)'); b && b.focus({ preventScroll: true }); }
  function shiftFocus(days, months) {
    const p = parse(cur.focus); let d = new Date(p.y, p.m + (months || 0), p.d + (days || 0));
    if (months) { const last = new Date(p.y, p.m + months + 1, 0).getDate(); d = new Date(p.y, p.m + months, Math.min(p.d, last)); }
    cur.focus = iso(d.getFullYear(), d.getMonth(), d.getDate()); cur.y = d.getFullYear(); cur.m = d.getMonth(); drawCal(); focusDay();
  }
  cal.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
  cal.addEventListener('click', e => {
    if (!cur || cur.type !== 'dp') return; const c = cur, t = e.target.closest('button'); if (!t) return;
    if (t.dataset.nav) { const n = +t.dataset.nav; if (c.view === 'months') c.y += n; else { c.m += n; if (c.m < 0) { c.m = 11; c.y--; } if (c.m > 11) { c.m = 0; c.y++; } } drawCal(); }
    else if (t.hasAttribute('data-view')) { c.view = c.view === 'days' ? 'months' : 'days'; drawCal(); }
    else if (t.dataset.m != null) { c.m = +t.dataset.m; c.view = 'days'; c.focus = iso(c.y, c.m, 1); drawCal(); focusDay(); }
    else if (t.dataset.v) { const inp = c.inp; closeAll(true); setDate(inp, t.dataset.v); }
    else if (t.hasAttribute('data-today')) { const inp = c.inp; closeAll(true); setDate(inp, todayISO()); }
    else if (t.hasAttribute('data-clear')) { const inp = c.inp; closeAll(true); setDate(inp, ''); }
  });

  /* ============================ shared keyboard / dismissal ============================ */
  document.addEventListener('keydown', e => {
    if (!cur) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeAll(true); return; }
    if (cur.type === 'dd') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(cur.active + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(cur.active - 1, true); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0, true); }
      else if (e.key === 'End') { e.preventDefault(); setActive(menu.children.length - 1, true); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(cur.active); }
      else if (e.key === 'Tab') closeAll();
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        const now = Date.now(); cur.typed = (now - cur.typedAt > 700 ? '' : cur.typed) + e.key.toLowerCase(); cur.typedAt = now;
        const i = [...cur.sel.options].findIndex(o => o.text.toLowerCase().startsWith(cur.typed)); if (i >= 0) setActive(i, true);
      }
    } else if (cur.type === 'dp' && cal.contains(document.activeElement) && document.activeElement.classList.contains('dp-d')) {
      const k = e.key, map = { ArrowLeft: [-1], ArrowRight: [1], ArrowUp: [-7], ArrowDown: [7], PageUp: [0, -1], PageDown: [0, 1], Home: [-(((parse(cur.focus) && new Date(parse(cur.focus).y, parse(cur.focus).m, parse(cur.focus).d).getDay()) + 6) % 7)], End: [6 - (((new Date(parse(cur.focus).y, parse(cur.focus).m, parse(cur.focus).d).getDay()) + 6) % 7)] };
      if (map[k]) { e.preventDefault(); shiftFocus(map[k][0], map[k][1]); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); const inp = cur.inp, v = cur.focus; closeAll(true); setDate(inp, v); }
    } else if (cur.type === 'dp' && e.key === 'Tab' && !cal.contains(document.activeElement)) closeAll();
  }, true);
  document.addEventListener('pointerdown', e => { if (cur && !menu.contains(e.target) && !cal.contains(e.target) && !cur.wrap.contains(e.target)) closeAll(); }, true);
  backdrop.addEventListener('click', () => closeAll(true));
  window.addEventListener('scroll', e => { if (cur && !menu.contains(e.target) && !cal.contains(e.target) && !phone()) closeAll(); }, true);
  window.addEventListener('resize', () => closeAll());
  window.addEventListener('hashchange', () => closeAll());

  /* clicking a <label for=…> opens/focuses the custom control */
  document.addEventListener('click', e => {
    const l = e.target.closest('label[for]'); if (!l) return; const el = document.getElementById(l.getAttribute('for'));
    if (el && el.dataset.ui) { e.preventDefault(); const b = el.parentNode.querySelector('.dd-btn'); b && b.focus(); }
  });

  function enhance(root) {
    root.querySelectorAll('select:not([data-ui])').forEach(upgradeSelect);
    root.querySelectorAll('input[type="date"]:not([data-ui])').forEach(upgradeDate);
  }
  new MutationObserver(() => enhance(document.body)).observe(document.body, { childList: true, subtree: true });
  enhance(document.body);
})(window.Billing);
