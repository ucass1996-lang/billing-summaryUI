/* Resizable tables: drag a column border to change its width, drag the bottom edge of a row to change its height.
   Works on every table.btable (also after the table re-renders). Sizes are remembered for the session.
   Keyboard: focus a column border and use the left / right arrow keys. Double-click a border to reset that column. */
(function (B) {
  const store = {};                       // table key -> { cols: {label: px}, rows: {key: px} }
  const MIN_COL = 60, MAX_COL = 700, MIN_ROW = 30, MAX_ROW = 260;
  const keyOf = t => ((t.querySelector('caption') || {}).textContent || 'table').trim() + '#' + ((t.closest('[id]') || {}).id || '');
  const mem = t => store[keyOf(t)] || (store[keyOf(t)] = { cols: {}, rows: {} });
  const label = th => th.textContent.replace(/[↑↓↕]/g, '').trim();
  const rowKey = tr => (tr.cells[0] ? tr.cells[0].textContent.trim().slice(0, 60) : '') + '|' + [...tr.parentNode.children].indexOf(tr);
  const visible = th => th.offsetWidth > 0;

  function applyCols(t) {
    const m = mem(t), ths = [...t.tHead.rows[0].cells], keys = Object.keys(m.cols);
    if (!keys.length) { t.style.tableLayout = ''; t.style.width = ''; t.removeAttribute('data-rz'); return; }
    t.setAttribute('data-rz', '1'); t.style.tableLayout = 'fixed';
    let total = 0;
    ths.forEach(th => { const w = m.cols[label(th)]; if (visible(th) && w) { th.style.width = w + 'px'; th.style.minWidth = w + 'px'; } });
    ths.forEach(th => { if (visible(th)) total += th.offsetWidth; });
    t.style.width = total + 'px';
  }

  function enhance(t) {
    if (!t.tHead || !t.tHead.rows[0]) return;
    const m = mem(t);
    [...t.tHead.rows[0].cells].forEach((th, i, all) => {
      if (th.querySelector(':scope > .rz-col')) return;
      const h = document.createElement('span'); h.className = 'rz-col'; h.tabIndex = 0; h.setAttribute('role', 'separator'); h.setAttribute('aria-orientation', 'vertical');
      h.setAttribute('aria-label', `Resize column ${label(th) || i + 1}. Use the left and right arrow keys.`); h.title = 'Drag to resize. Double-click to reset.';
      th.appendChild(h);
    });
    [...t.tBodies].forEach(tb => [...tb.rows].forEach(tr => {
      if (tr.querySelector('.dt-empty') || tr.cells.length < 2) return;
      const k = rowKey(tr);
      if (m.rows[k]) tr.style.height = m.rows[k] + 'px';
      [...tr.cells].forEach(td => { if (!td.querySelector(':scope > .rz-row')) { const h = document.createElement('span'); h.className = 'rz-row'; h.title = 'Drag to change the row height'; h.setAttribute('aria-hidden', 'true'); td.appendChild(h); } });
    }));
    applyCols(t);
  }

  function setCol(t, th, w) {
    const m = mem(t), lab = label(th);
    // freeze the other visible columns at their current widths the first time
    if (!Object.keys(m.cols).length) [...t.tHead.rows[0].cells].forEach(c => { if (visible(c)) m.cols[label(c)] = c.offsetWidth; });
    m.cols[lab] = Math.max(MIN_COL, Math.min(MAX_COL, Math.round(w)));
    applyCols(t);
  }

  document.addEventListener('pointerdown', e => {
    const hc = e.target.closest('.rz-col'), hr = e.target.closest('.rz-row');
    if (!hc && !hr) return;
    e.preventDefault(); e.stopPropagation();
    const t = (hc || hr).closest('table'), start = { x: e.clientX, y: e.clientY };
    const handle = hc || hr; try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    document.body.classList.add('rz-drag', hc ? 'rz-x' : 'rz-y'); handle.classList.add('on');
    if (hc) {
      const th = hc.closest('th'), w0 = th.offsetWidth;
      const move = ev => setCol(t, th, w0 + ev.clientX - start.x);
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); document.body.classList.remove('rz-drag', 'rz-x'); handle.classList.remove('on'); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    } else {
      const tr = hr.closest('tr'), h0 = tr.offsetHeight, k = rowKey(tr), m = mem(t);
      const move = ev => { const h = Math.max(MIN_ROW, Math.min(MAX_ROW, Math.round(h0 + ev.clientY - start.y))); tr.style.height = h + 'px'; m.rows[k] = h; };
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); document.body.classList.remove('rz-drag', 'rz-y'); handle.classList.remove('on'); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    }
  }, true);

  document.addEventListener('dblclick', e => {
    const hc = e.target.closest('.rz-col'); if (!hc) return;
    const th = hc.closest('th'), t = th.closest('table'), m = mem(t);
    delete m.cols[label(th)]; th.style.width = th.style.minWidth = '';
    if (Object.keys(m.cols).length <= 1) { m.cols = {}; [...t.tHead.rows[0].cells].forEach(c => { c.style.width = c.style.minWidth = ''; }); }
    applyCols(t);
  });
  document.addEventListener('keydown', e => {
    const hc = e.target.closest && e.target.closest('.rz-col'); if (!hc || !/^Arrow(Left|Right)$/.test(e.key)) return;
    e.preventDefault(); const th = hc.closest('th'); setCol(th.closest('table'), th, th.offsetWidth + (e.key === 'ArrowRight' ? 12 : -12));
  });
  document.addEventListener('click', e => { if (e.target.closest('.rz-col, .rz-row')) { e.stopPropagation(); e.preventDefault(); } }, true);

  let timer = 0;
  const run = () => document.querySelectorAll('table.btable').forEach(enhance);
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 40); }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
  run();
})(window.Billing);
