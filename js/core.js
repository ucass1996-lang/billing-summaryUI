/* Shared helpers: formatting, icons, toast/modal/form validation, loading/error states, DataTable. */
(function (B) {
  let uid = 0;

  /* ---------- formatting ---------- */
  B.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  B.money = n => (n < 0 ? '-' : '') + '$' + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  B.num = n => Number(n).toLocaleString('en-US');
  B.fmtDate = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  B.pct = (used, inc) => inc ? Math.round(used / inc * 1000) / 10 : 0;
  B.dueDate = iso => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); };
  /* small "billing impact" list used inside forms: rows of [label, value] */
  B.impact = rows => `<div class="impact-title">Billing impact</div><dl class="kv impact-kv">${rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;

  /* ---------- icons ---------- */
  const IC = {
    summary: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    usage: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    plan: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    pricing: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    licences: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>',
    payment: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    invoices: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    statement: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2z"/><path d="M8 7h8M8 11h8"/>',
    modules: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7M14 17.5h7"/>',
    addons: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>',
    cost: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h6"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    power: '<path d="M18.4 6.6a9 9 0 11-12.8 0M12 2v10"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    play: '<path d="M5 3l14 9-14 9z"/>',
    home: '<path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z"/>',
    userCircle: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.2 18.5c1.2-2 3.2-3 5.8-3s4.6 1 5.8 3"/>',
    phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    wallet: '<path d="M20 7H5a2 2 0 010-4h13v4"/><path d="M3 5v14a2 2 0 002 2h15V7"/><circle cx="16.5" cy="14" r="1.2"/>',
    listBox: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h2M7 12h2M7 16h2M12 8h5M12 12h5M12 16h5"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a1.5 1.5 0 001.5 1.1h8.6a1.5 1.5 0 001.5-1.2L21 8H6"/>',
    invoicePen: '<path d="M13 21H5a1 1 0 01-1-1V4a1 1 0 011-1h10l4 4v4"/><path d="M8 9h5M8 13h3"/><path d="M15 21l.7-3 5.3-5.3 2.3 2.3L18 20.3z"/>',
    pagePlain: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    docSmall: '<path d="M7 3h8l4 4v14H7z"/><path d="M10 12h6M10 16h6"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    idcard: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M14 9h4M14 13h4M5 16c.6-1.5 2-2 3-2s2.4.5 3 2"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    refreshcw: '<path d="M21 12a9 9 0 01-15.5 6.2L3 16M3 12a9 9 0 0115.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>'
  };
  B.icon = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${IC[n] || ''}</svg>`;

  /* Icon-only row action: tooltip (title) + aria-label so it stays accessible. */
  B.actBtn = (act, id, icon, label, kind = '') =>
    `<button type="button" class="btn-ico ${kind}" data-act="${act}" data-id="${B.esc(id)}" title="${B.esc(label)}" aria-label="${B.esc(label)}">${B.icon(icon, 15)}</button>`;

  B.badge = (text, kind) => `<span class="sbadge ${kind}">${B.esc(text)}</span>`;
  B.statusKind = s => ({ Paid: 'ok', Active: 'ok', Enabled: 'ok', Failed: 'bad', Overdue: 'bad', Refunded: 'warn', Credit: 'info', Disabled: 'muted', Inactive: 'muted', Trial: 'info', Available: 'info', Pending: 'warn', Suspended: 'bad' }[s] || 'muted');

  /* Page header. `controls` (e.g. a range select) sits under the title; the header is pinned below the top bar unless `sticky: false`. */
  const PAGE_ICON = { summary: 'summary', usage: 'usage', plan: 'plan', 'licences-resources': 'licences', 'credit-payment': 'wallet', invoices: 'invoices', statement: 'statement', 'add-ons': 'addons', 'cost-centres': 'cost', 'modules-access': 'modules' };
  const HEAD_ART = '<svg class="ph-art" viewBox="0 0 160 110" aria-hidden="true" focusable="false"><circle cx="118" cy="58" r="44" fill="#e6efff"/><circle cx="30" cy="30" r="6" fill="#dbe7ff"/><circle cx="146" cy="18" r="4" fill="#cfe0ff"/><path d="M132 40c18-4 26 10 20 24-12 2-22-6-20-24z" fill="#cdeede"/><rect x="50" y="10" width="64" height="82" rx="9" fill="#fff" stroke="#c9d9fb" stroke-width="2"/><g stroke="#b7ccf7" stroke-width="3" stroke-linecap="round"><path d="M62 28h40M62 40h40M62 52h24"/></g><circle cx="102" cy="66" r="13" fill="#2f6bff"/><text x="102" y="71" text-anchor="middle" font-size="15" font-weight="700" fill="#fff" font-family="Inter,sans-serif">$</text><g fill="#2f6bff"><rect x="96" y="82" width="8" height="12" rx="2" opacity=".55"/><rect x="108" y="76" width="8" height="18" rx="2" opacity=".75"/><rect x="120" y="68" width="8" height="26" rx="2"/></g></svg>';
  const DOC_USD = '<svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false"><path d="M8 4h11l6 6v15a3 3 0 01-3 3H8a3 3 0 01-3-3V7a3 3 0 013-3z" fill="#2f6bff"/><path d="M19 4l6 6h-4a2 2 0 01-2-2z" fill="#8db2ff"/><path d="M10 14h8M10 18h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="23" r="6" fill="#fff" stroke="#2f6bff" stroke-width="1.6"/><text x="22" y="26.3" text-anchor="middle" font-size="9" font-weight="700" fill="#2f6bff" font-family="Inter,sans-serif">$</text></svg>';
  B.head = ({ title, desc, actions, controls, key }) => {
    const c = B.crumbs ? B.crumbs(key) : ['Billing'];
    const bc = `<nav class="bc" aria-label="Breadcrumb"><ol><li class="bc-home" aria-hidden="true">${B.icon('home', 15)}</li>${c.map((x, i) => `<li ${i === c.length - 1 ? 'aria-current="page"' : ''}>${B.esc(x)}</li>`).join('')}</ol></nav>`;
    const next = B.state && B.state.period ? B.fmtDate(B.state.period.next) : '';
    return `<div class="page-head">
       ${bc}
       <div class="page-head-row">
         <div class="page-head-text ph-main"><span class="ph-ico">${key === 'summary' ? DOC_USD : B.icon(PAGE_ICON[key] || 'summary', 30)}</span><div class="ph-t"><h1>${title}</h1><p>${desc}</p></div></div>
         <div class="page-head-actions no-print">${actions || ''}</div></div>
       ${controls ? `<div class="page-head-controls no-print">${controls}</div>` : ''}</div>`;
  };

  /* Several icon buttons in a table row become one "Actions" dropdown; the buttons keep their data-act / data-id. */
  B.rowActions = html => {
    const re = /<button type="button" class="btn-ico ?([^"]*)" data-act="([^"]*)" data-id="([^"]*)" title="([^"]*)" aria-label="[^"]*">(<svg.*?<\/svg>)<\/button>/g;
    const items = [...html.matchAll(re)];
    if (items.length < 2 || html.replace(re, '').trim()) return html;
    return `<div class="dropdown row-menu"><button type="button" class="btn-ico" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false" aria-label="Actions" title="Actions">${B.icon('more', 16)}</button>
      <ul class="dropdown-menu dropdown-menu-end">${items.map(m => `<li><button type="button" class="dropdown-item ${m[1].includes('danger') ? 'text-danger' : ''}" data-act="${m[2]}" data-id="${m[3]}">${m[5]}<span>${m[4].endsWith(' ' + m[3]) ? m[4].slice(0, -(m[3].length + 1)) : m[4]}</span></button></li>`).join('')}</ul></div>`;
  };

  /* Tabs that show or hide sections that are already on the page, so nothing re-renders and tables keep their state. */
  const SV = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  B.pillIcons = {
    doc: SV('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>'),
    hash: SV('<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M10 7.5l-1 9M15 7.5l-1 9M7.5 10.5h9M7.5 13.5h9"/>'),
    db: SV('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>'),
    spark: SV('<path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
    fax: SV('<path d="M7 9V4h10v5M7 17H5a1.5 1.5 0 01-1.5-1.5v-5A1.5 1.5 0 015 9h14a1.5 1.5 0 011.5 1.5v5A1.5 1.5 0 0119 17h-2"/><rect x="7" y="14" width="10" height="6.5" rx="1"/>'),
    wallet: SV('<path d="M4 7.5A2.5 2.5 0 016.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2.5"/><circle cx="16" cy="13.5" r="1.1"/>'),
    clock: SV('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    chart: SV('<path d="M4 20V5M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>'),
    list: SV('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
    cal: SV('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    grid: SV('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>')
  };
  B.sectionTabs = ({ anchor, groups, labels, key, icons }) => {
    B._st = B._st || {}; let cur = B._st[key] || 0; if (cur >= groups.length) cur = 0;
    const strip = document.createElement('div'); strip.className = 'bcard pg-tabs no-print';
    if (icons) strip.classList.add('pg-pills');
    strip.innerHTML = `<div class="tabs" role="tablist" aria-label="Page sections">${labels.map((l, i) => `<button type="button" role="tab" class="tab" data-st="${i}">${icons && icons[i] ? `<span class="pill-i">${icons[i]}</span>` : ''}<span>${B.esc(l)}</span></button>`).join('')}</div>`;
    anchor.parentNode.insertBefore(strip, anchor);
    const show = i => {
      B._st[key] = i; groups.forEach((g, n) => g.forEach(el => { el.hidden = n !== i; }));
      strip.querySelectorAll('.tab').forEach((b, n) => { b.classList.toggle('active', n === i); b.setAttribute('aria-selected', n === i); });
    };
    strip.onclick = e => { const b = e.target.closest('[data-st]'); if (b) show(+b.dataset.st); };
    show(cur);
  };


  /* ---------- plan cards: short "Includes:" list + "Show more details" ---------- */
  B.PLAN_LIMITS = { ultimate: 3000, 'phone-standard': 50, 'phone-pro': 500, 'ai-chat': 500, 'ai-voice': 500, 'sell-essentials': 100, 'sell-advanced': 250, 'sell-premium': 500,
    'cc-essentials': 100, 'cc-advanced': 250, 'cc-premium': 500, 'support-essentials': 100, 'support-advanced': 250, 'support-premium': 500 };
  B.planLimit = p => B.PLAN_LIMITS[p.id] != null ? B.PLAN_LIMITS[p.id] : 500;
  B.PLAN_VISIBLE = 3;

  B.planDetails = p => {
    const l = B.planLimit(p), rows = [['About', p.desc], ['Licences', l === Infinity ? 'Unlimited' : 'Up to ' + B.num(l)], ['Monthly', B.money(p.monthly) + ' per user'], ['Annually', B.money(p.annual) + ' per user, each month']];
    if (p.inc) rows.push(['Calling', p.inc.minutes], ['Texts', p.inc.sms], ['Phone numbers', p.inc.numbers], ['Recording storage', p.inc.storage], ['AI voice minutes', p.inc.aiMin], ['AI chat replies', p.inc.aiReplies]);
    return `<dl class="pd">${rows.map(r => `<dt>${B.esc(r[0])}</dt><dd>${B.esc(r[1])}</dd>`).join('')}</dl>`;
  };

  /* first few features always visible; the rest + plan details sit behind the button */
  B.planMore = (p, open, cls = '') => {
    const f = p.features, head = f.slice(0, B.PLAN_VISIBLE), rest = f.slice(B.PLAN_VISIBLE);
    return `<ul class="${cls}">${head.map(x => `<li>${B.esc(x)}</li>`).join('')}</ul>
      <div class="pf-extra" ${open ? '' : 'hidden'}>${rest.length ? `<ul class="${cls}">${rest.map(x => `<li>${B.esc(x)}</li>`).join('')}</ul>` : ''}${B.planDetails(p)}</div>
      <button type="button" class="pf-more" data-more="${p.id}" aria-expanded="${open}"><span>${open ? 'Show less' : 'Show more details'}</span>${B.icon('chev', 14)}</button>`;
  };

  /* one delegated listener per container; `open` is a Set of expanded plan ids */
  B.bindPlanMore = (root, open) => root.addEventListener('click', e => {
    const b = e.target.closest('[data-more]'); if (!b) return;
    const id = b.dataset.more, now = !open.has(id); now ? open.add(id) : open.delete(id);
    b.closest('article').querySelector('.pf-extra').hidden = !now;
    b.setAttribute('aria-expanded', now); b.querySelector('span').textContent = now ? 'Show less' : 'Show more details';
  });

  /* ---------- files ---------- */
  B.download = (name, text, mime = 'text/plain') => {
    const url = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
  };
  B.csv = (head, rows) => [head, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');

  /* ---------- toast / modal / confirm ---------- */
  /* Bootstrap toast: types are ok/success, error, warn and info. Hover pauses the timer; errors stay a little longer. */
  const TOAST = {
    success: { t: 'Success', p: '<path d="M5 12.5l4.5 4.5L19 7.5"/>' },
    error: { t: 'Something went wrong', p: '<path d="M12 7v6M12 17h.01"/>' },
    warn: { t: 'Please note', p: '<path d="M12 7v6M12 17h.01"/>' },
    info: { t: 'Info', p: '<path d="M12 11v6M12 7.5h.01"/>' }
  };
  B.toast = (msg, type = 'ok', title) => {
    const k = type === 'ok' ? 'success' : (TOAST[type] ? type : 'info'), c = TOAST[k], delay = k === 'error' ? 6000 : 4000;
    const el = document.createElement('div');
    el.className = `toast bt-toast bt-${k} border-0`;
    el.setAttribute('role', k === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-atomic', 'true');
    el.style.setProperty('--bt-delay', delay + 'ms');
    el.innerHTML = `<div class="bt-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c.p}</svg></div>
      <div class="bt-body"><div class="bt-title">${B.esc(title || c.t)}</div><div class="bt-msg">${B.esc(msg)}</div></div>
      <button type="button" class="btn-close bt-close" data-bs-dismiss="toast" aria-label="Close"></button><span class="bt-bar" aria-hidden="true"></span>`;
    const host = document.getElementById('toasts'); host.appendChild(el);
    while (host.children.length > 4) host.firstElementChild.remove();
    el.addEventListener('hidden.bs.toast', () => el.remove());
    new bootstrap.Toast(el, { delay }).show();
  };

  /* bare: no title bar or footer, just a floating close button (used by the invoice document). */
  B.modal = ({ title, body, footer, size, bare }) => {
    const id = 'm' + (++uid);
    const el = document.createElement('div');
    el.className = 'modal fade'; el.tabIndex = -1; el.setAttribute('aria-labelledby', id);
    const head = bare
      ? `<h2 class="visually-hidden" id="${id}">${B.esc(title)}</h2><button type="button" class="btn-close modal-bare-close" data-bs-dismiss="modal" aria-label="Close"></button>`
      : `<div class="modal-header"><h2 class="modal-title fs-6 fw-bold" id="${id}">${B.esc(title)}</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>`;
    el.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ${size || ''}"><div class="modal-content">
      ${head}<div class="modal-body ${bare ? 'p-0' : ''}">${body}</div>${footer && !bare ? `<div class="modal-footer">${footer}</div>` : ''}</div></div>`;
    document.body.appendChild(el);
    const m = new bootstrap.Modal(el);
    el.addEventListener('hidden.bs.modal', () => { m.dispose(); el.remove(); });
    m.show();
    return { el, hide: () => m.hide() };
  };

  B.confirm = ({ title, message, okLabel = 'Confirm', danger, onOk }) => {
    const m = B.modal({ title, body: `<p class="mb-0">${B.esc(message)}</p>`,
      footer: `<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-brand'}" data-ok>${B.esc(okLabel)}</button>` });
    m.el.querySelector('[data-ok]').onclick = () => { m.hide(); onOk(); };
  };

  B.info = (title, html) => B.modal({ title, body: html, footer: '<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Close</button>' });

  /* ---------- validation + forms ---------- */
  B.validateField = (f, raw, all) => {
    const v = typeof raw === 'string' ? raw.trim() : raw;
    if (f.required && (v === '' || v == null)) return f.requiredMsg || `${f.label} is required.`;
    if (v === '' || v == null) return '';
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address.';
    if (f.type === 'tel' && !/^\+?[0-9][0-9\s().-]{6,18}$/.test(v)) return 'Please enter a valid phone number.';
    if (f.type === 'date' && (isNaN(Date.parse(v)) || !/^\d{4}-\d{2}-\d{2}$/.test(v))) return 'Please enter a valid date.';
    if (f.type === 'number') {
      const n = Number(v);
      if (!/^-?\d+(\.\d+)?$/.test(v) || !isFinite(n)) return f.numMsg || 'Please enter a valid number.';
      if (f.integer && !Number.isInteger(n)) return `${f.label} must be a whole number.`;
      if (f.money && !/^\d+(\.\d{1,2})?$/.test(v)) return 'Please enter a valid amount.';
      if (f.gt != null && n <= f.gt) return f.gtMsg || `${f.label} must be greater than ${f.gt}.`;
      if (f.min != null && n < f.min) return f.minMsg || `${f.label} must be at least ${f.min}.`;
      if (f.max != null && n > f.max) return f.maxMsg || `${f.label} must be at most ${f.max}.`;
    }
    if (f.minLength && v.length < f.minLength) return `${f.label} must be at least ${f.minLength} characters.`;
    if (f.maxLength && v.length > f.maxLength) return `${f.label} must be at most ${f.maxLength} characters.`;
    if (f.pattern && !f.pattern.test(v)) return f.patternMsg || `Please enter a valid ${f.label.toLowerCase()}.`;
    if (f.validate) return f.validate(v, all) || '';
    return '';
  };

  function fieldHtml(f, val, fid) {
    const id = `${fid}_${f.name}`, v = B.esc(val == null ? '' : val);
    const col = f.col || 'col-12 col-md-6';
    const desc = f.help ? ` aria-describedby="${id}_h"` : '';
    let ctl;
    if (f.type === 'select') {
      ctl = `<select class="form-select" id="${id}" name="${f.name}"${desc}>${f.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${B.esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${B.esc(ol)}</option>`; }).join('')}</select>`;
    } else if (f.type === 'textarea') {
      ctl = `<textarea class="form-control" id="${id}" name="${f.name}" rows="3"${desc}>${v}</textarea>`;
    } else {
      ctl = `<input class="form-control" id="${id}" name="${f.name}" type="${f.type === 'number' ? 'text' : (f.type || 'text')}"${f.type === 'number' ? ' inputmode="decimal"' : ''} value="${v}"${f.placeholder ? ` placeholder="${B.esc(f.placeholder)}"` : ''}${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ' autocomplete="off"'}${f.readonly ? ' readonly' : ''}${desc}>`;
    }
    const fb = `<div class="invalid-feedback" data-fb="${f.name}"></div>`;
    if (f.icon || f.iconRight) ctl = `<div class="input-icon">${f.icon || ''}${ctl.replace('class="form-control"', `class="form-control ${f.icon ? 'has-icon' : ''} ${f.iconRight ? 'has-icon-r' : ''}"`)}${f.iconRight ? `<span class="ii-r" id="${id}_ir" aria-hidden="true">${f.iconRight}</span>` : ''}${fb}</div>`;
    return `<div class="${col}"><label class="form-label" for="${id}">${B.esc(f.label)}${f.required ? ' <span class="text-danger" aria-hidden="true">*</span>' : ''}</label>${ctl}${f.icon || f.iconRight ? '' : fb}${f.help ? `<div class="form-text" id="${id}_h">${B.esc(f.help)}</div>` : ''}</div>`;
  }

  /* Wires validation onto a <form>. Returns {values, validate}. Used by modals and inline forms. */
  B.bindForm = (form, fields, onSubmit) => {
    const get = () => Object.fromEntries(fields.map(f => [f.name, String(form.elements[f.name].value || '').trim()]));
    const show = (f, msg) => { form.elements[f.name].classList.toggle('is-invalid', !!msg); form.querySelector(`[data-fb="${f.name}"]`).textContent = msg; };
    const check = f => { const msg = B.validateField(f, get()[f.name], get()); show(f, msg); return !msg; };
    fields.forEach(f => {
      const inp = form.elements[f.name];
      inp.addEventListener('blur', () => check(f));
      inp.addEventListener('input', () => { if (inp.classList.contains('is-invalid')) check(f); });
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const err = form.querySelector('[data-formerr]'); if (err) err.classList.add('d-none');
      const ok = fields.map(check).every(Boolean);
      if (!ok) { form.querySelector('.is-invalid')?.focus(); return; }
      const res = onSubmit(get());
      if (res && typeof res === 'object') {
        Object.entries(res).forEach(([k, msg]) => {
          const f = fields.find(x => x.name === k);
          if (f) show(f, msg); else if (err) { err.textContent = msg; err.classList.remove('d-none'); }
        });
        form.querySelector('.is-invalid')?.focus();
      }
    });
    return { get, check };
  };

  B.form = ({ title, fields, values = {}, submitLabel = 'Save', size, intro, impact, onSubmit }) => {
    const fid = 'f' + (++uid);
    const body = `${intro ? `<p class="text-muted small">${intro}</p>` : ''}<form id="${fid}" novalidate><div class="row g-3">${fields.map(f => fieldHtml(f, values[f.name], fid)).join('')}</div>${impact ? '<div class="impact-box mt-3" data-impact aria-live="polite"></div>' : ''}<div class="alert alert-danger d-none mt-3 mb-0" data-formerr role="alert"></div></form>`;
    const m = B.modal({ title, size, body, footer: `<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-brand" form="${fid}">${B.esc(submitLabel)}</button>` });
    const form = m.el.querySelector('form');
    B.bindForm(form, fields, vals => { const r = onSubmit(vals); if (!r || typeof r !== 'object') m.hide(); return r; });
    if (impact) {
      const box = form.querySelector('[data-impact]');
      const upd = () => { const v = Object.fromEntries(fields.map(f => [f.name, String(form.elements[f.name].value || '').trim()])); const h = impact(v); box.innerHTML = h || ''; box.hidden = !h; };
      form.addEventListener('input', upd); form.addEventListener('change', upd); upd();
    }
    m.el.addEventListener('shown.bs.modal', () => form.querySelector('input:not([readonly]),select,textarea')?.focus());
    return m;
  };
  B.fieldHtml = fieldHtml;

  /* ---------- loading / error states ---------- */
  B._tok = 0;
  const skeleton = () => `<div class="bcard p-3" aria-busy="true" aria-label="Loading billing data"><div class="sk mb-3" style="width:30%"></div><div class="row g-3 mb-3">${'<div class="col-6 col-lg-3"><div class="sk" style="height:84px"></div></div>'.repeat(4)}</div><div class="sk mb-2"></div><div class="sk mb-2" style="width:92%"></div><div class="sk" style="width:75%"></div></div>`;
  B.mount = (el, fn, delay = 320) => {
    const tok = B._tok;
    el.innerHTML = skeleton();
    setTimeout(() => {
      if (tok !== B._tok) return;
      try {
        if (/error=1/.test(location.hash)) throw new Error('forced');
        el.innerHTML = ''; fn(el);
      } catch (e) {
        console.warn('Billing page failed to render:', e && e.message);
        el.innerHTML = `<div class="state-box" role="alert"><h2 class="h6 fw-bold">Unable to load billing data.</h2><p class="text-muted small mb-3">Something went wrong while loading this page.</p><button type="button" class="btn btn-brand" data-retry>Try again</button></div>`;
        el.querySelector('[data-retry]').onclick = () => { if (/error=1/.test(location.hash)) location.hash = location.hash.replace(/\?error=1/, ''); else B.mount(el, fn, delay); };
      }
    }, delay);
  };

  /* ---------- DataTable: search, filters, date range, sorting, pagination ---------- */
  B.DataTable = (host, o) => {
    const id = 'dt' + (++uid);
    const st = { q: '', filters: {}, from: '', to: '', min: '', max: '', sort: null, dir: null, page: 1, size: o.pageSize || 10 };
    const cols = o.columns;
    const sizes = [10, 25, 50, 100].concat([st.size].filter(n => ![10, 25, 50, 100].includes(n))).sort((x, y) => x - y);
    const searchKeys = o.searchKeys || cols.filter(c => c.key !== '_act').map(c => c.key);
    const dateErr = () => st.from && st.to && st.from > st.to;
    /* the calendars refuse days that would make From later than To */
    const syncRange = () => { const f = host.querySelector('input[type=date][id$="from"]'), t = host.querySelector('input[type=date][id$="to"]'); if (f) f.max = st.to || ''; if (t) t.min = st.from || ''; };
    const amt = v => v === '' ? null : (/^\d+(\.\d{1,2})?$/.test(v) ? Number(v) : NaN);
    const amtErr = () => {
      const a = amt(st.min), b = amt(st.max);
      if (Number.isNaN(a) || Number.isNaN(b)) return 'Enter a valid amount, for example 25 or 25.50.';
      if (a != null && b != null && a > b) return 'Minimum amount cannot be greater than maximum.';
      return '';
    };
    const activeCount = () => Object.values(st.filters).filter(Boolean).length + (st.from || st.to ? 1 : 0) + (st.min || st.max ? 1 : 0);

    function filtered() {
      let rows = o.rows().slice();
      const q = st.q.trim().toLowerCase();
      if (q) rows = rows.filter(r => searchKeys.some(k => String(r[k] == null ? '' : r[k]).toLowerCase().includes(q)));
      (o.filters || []).forEach(f => { const v = st.filters[f.key]; if (v) rows = rows.filter(r => String(r[f.key]) === v); });
      if (o.dateKey && !dateErr()) {
        if (st.from) rows = rows.filter(r => r[o.dateKey] >= st.from);
        if (st.to) rows = rows.filter(r => r[o.dateKey] <= st.to);
      }
      if (o.amountKey && !amtErr()) {
        const lo = amt(st.min), hi = amt(st.max);
        if (lo != null) rows = rows.filter(r => Number(r[o.amountKey]) >= lo);
        if (hi != null) rows = rows.filter(r => Number(r[o.amountKey]) <= hi);
      }
      if (st.sort) {
        const k = st.sort, m = st.dir === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
          const x = a[k], y = b[k];
          return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })) * m;
        });
      }
      return rows;
    }
    const isFiltered = () => !!(st.q.trim() || Object.values(st.filters).some(Boolean) || st.from || st.to || st.min || st.max);

    host.innerHTML = `
      <div class="row g-2 align-items-end mb-3 no-print dt-toolbar${o.toolbar === false ? ' d-none' : ''}">
        ${o.search === false ? '' : `<div class="col-12 col-xl-3"><label class="form-label" for="${id}q">Search</label><input id="${id}q" type="search" class="form-control" placeholder="${B.esc(o.searchPlaceholder || 'Search…')}" autocomplete="off"></div>`}
        <div class="col-12 d-md-none"><button type="button" class="btn btn-brand-o w-100 d-flex justify-content-center align-items-center gap-2" data-togglefilters aria-expanded="false" aria-controls="${id}fl">Filters <span class="sbadge info" data-fcount hidden></span></button></div>
        <div class="dt-filters" id="${id}fl">
        ${(o.filters || []).map(f => `<div class="col-6 col-md-4 col-xl"><label class="form-label" for="${id}f_${f.key}">${B.esc(f.label)}</label><select id="${id}f_${f.key}" class="form-select" data-filter="${f.key}"><option value="">All</option>${f.options.map(x => `<option>${B.esc(x)}</option>`).join('')}</select></div>`).join('')}
        ${o.dateKey ? `<div class="col-6 col-md-4 col-xl"><label class="form-label" for="${id}from">From</label><input id="${id}from" type="date" class="form-control"></div><div class="col-6 col-md-4 col-xl"><label class="form-label" for="${id}to">To</label><input id="${id}to" type="date" class="form-control"></div>` : ''}
        ${o.amountKey ? `<div class="col-6 col-md-4 col-xl"><label class="form-label" for="${id}min">Min amount</label><input id="${id}min" class="form-control" inputmode="decimal" placeholder="$ 0" data-amtinput="min" autocomplete="off"></div><div class="col-6 col-md-4 col-xl"><label class="form-label" for="${id}max">Max amount</label><input id="${id}max" class="form-control" inputmode="decimal" placeholder="$ any" data-amtinput="max" autocomplete="off"></div>` : ''}
        <div class="col-auto"><button type="button" class="btn btn-link px-1" data-clear>Clear filters</button></div>
        </div>
      </div>
      <div class="text-danger small mb-2" data-dateerr role="alert" hidden>From date cannot be greater than To date.</div>
      <div class="text-danger small mb-2" data-amterr role="alert" hidden></div>
      <div class="table-responsive"><table class="table btable align-middle" aria-describedby="${id}cnt"><caption class="visually-hidden">${B.esc(o.caption || 'Data table')}</caption><thead></thead><tbody></tbody></table></div>
      <div class="dt-pager no-print"><div class="d-flex align-items-center gap-3 flex-wrap">
        <label class="d-flex align-items-center gap-2 mb-0">Rows per page <select class="form-select form-select-sm w-auto" data-size aria-label="Rows per page">${sizes.map(s => `<option ${s === st.size ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <span id="${id}cnt" data-count aria-live="polite"></span><button type="button" class="btn-ico" data-refresh title="Refresh" aria-label="Refresh">${B.icon('refresh', 14)}</button></div>
        <nav aria-label="Pagination"><ul class="pagination pagination-sm" data-pages></ul></nav></div>`;

    const $ = s => host.querySelector(s);
    const thead = $('thead'), tbody = $('tbody'), pagesEl = $('[data-pages]');

    function update() {
      $('[data-dateerr]').hidden = !dateErr();
      const ae = o.amountKey ? amtErr() : ''; $('[data-amterr]').hidden = !ae; $('[data-amterr]').textContent = ae;
      const fc = $('[data-fcount]'); if (fc) { const n = activeCount(); fc.hidden = !n; fc.textContent = n + ' active'; }
      const all = filtered(), total = all.length, pages = Math.max(1, Math.ceil(total / st.size));
      if (st.page > pages) st.page = pages;
      const start = (st.page - 1) * st.size, slice = all.slice(start, start + st.size);

      thead.innerHTML = '<tr>' + cols.map(c => {
        const cls = [c.align === 'end' ? 'text-end' : '', c.hide ? `d-none d-${c.hide}-table-cell` : ''].join(' ').trim();
        if (c.sortable === false || c.key === '_act') return `<th scope="col" class="${cls}"><span class="th-static">${B.esc(c.label)}</span></th>`;
        const active = st.sort === c.key, ind = active ? (st.dir === 'asc' ? '↑' : '↓') : '↕';
        return `<th scope="col" class="${cls}" aria-sort="${active ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="sort-btn" data-sort="${c.key}">${B.esc(c.label)}<span class="sort-ind" aria-hidden="true">${ind}</span></button></th>`;
      }).join('') + '</tr>';

      if (!slice.length) {
        tbody.innerHTML = `<tr><td colspan="${cols.length}"><div class="dt-empty">${!isFiltered() && o.emptyHtml ? o.emptyHtml : `<strong>${isFiltered() ? 'No results found.' : B.esc(o.emptyText || 'No records found.')}</strong>`}${isFiltered() ? '<span>Try a different search or <button type="button" class="btn btn-link p-0 align-baseline" data-clear>clear filters</button>.</span>' : ''}</div></td></tr>`;
      } else {
        tbody.innerHTML = slice.map(r => `<tr>` + cols.map(c => {
          const cls = [c.align === 'end' ? 'text-end' : '', c.hide ? `d-none d-${c.hide}-table-cell` : '', c.cls || ''].join(' ').trim();
          const inner = c.key === '_act' ? `<div class="d-flex flex-nowrap gap-1 ${c.align === 'end' ? 'justify-content-end' : ''}">${B.rowActions(o.actions(r))}</div>` : (c.render ? c.render(r) : B.esc(r[c.key]));
          return `<td class="${cls}">${inner}</td>`;
        }).join('') + '</tr>').join('');
      }

      /* reserve the height of a full page of rows, so the pager never moves for empty, short or long results */
      const box = host.querySelector('.table-responsive');
      if (slice.length && tbody.offsetHeight) st.rowH = Math.max(st.rowH || 0, Math.ceil(tbody.offsetHeight / slice.length));
      if (!st.minH || (slice.length && !st.measured)) { st.minH = Math.ceil((thead.offsetHeight || 41) + st.size * (st.rowH || 49) + 2); st.measured = !!(slice.length && tbody.offsetHeight); }
      box.classList.add('dt-box'); box.style.setProperty('--dt-min', st.minH + 'px');
      /* the table body may only be as tall as leaves room for the footer, so rows and pager fit on one screen (nothing overlaps) */
      const vw = document.getElementById('view'), pg = host.querySelector('.dt-pager');
      if (vw && pg && window.innerWidth >= 768) { const above = Math.max(0, box.getBoundingClientRect().top - host.getBoundingClientRect().top); box.style.setProperty('--dt-cap', Math.max(240, Math.min(640, vw.clientHeight - above - pg.offsetHeight - 56)) + 'px'); }

      $('[data-count]').textContent = total ? `${start + 1}–${start + slice.length} of ${total} record(s)` : '0 record(s)';

      const p = st.page, set = new Set([1, pages, p, p - 1, p + 1]);
      const arr = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [...set].filter(x => x >= 1 && x <= pages).sort((a, b) => a - b);
      const items = []; arr.forEach((x, i) => { if (i && x - arr[i - 1] > 1) items.push('…'); items.push(x); });
      const li = (label, page, dis, aria, act) => `<li class="page-item ${dis ? 'disabled' : ''} ${act ? 'active' : ''}"><button type="button" class="page-link" ${dis ? 'disabled' : ''} data-page="${page}" aria-label="${aria}" ${act ? 'aria-current="page"' : ''}>${label}</button></li>`;
      pagesEl.innerHTML = li('«', 1, p === 1, 'First page') + li('‹', p - 1, p === 1, 'Previous page') +
        items.map(x => x === '…' ? '<li class="page-item disabled"><span class="page-link">…</span></li>' : li(x, x, false, `Page ${x}`, x === p)).join('') +
        li('›', p + 1, p === pages, 'Next page') + li('»', pages, p === pages, 'Last page');
    }

    host.addEventListener('click', e => {
      if (e.target.closest('[data-refresh]')) { update(); return; }
      const tf = e.target.closest('[data-togglefilters]');
      if (tf) { const box = host.querySelector('.dt-filters'); const open = box.classList.toggle('open'); tf.setAttribute('aria-expanded', open); return; }
      const sb = e.target.closest('[data-sort]');
      if (sb) { const k = sb.dataset.sort; if (st.sort !== k) { st.sort = k; st.dir = 'asc'; } else if (st.dir === 'asc') st.dir = 'desc'; else { st.sort = null; st.dir = null; } st.page = 1; update(); return; }
      const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; update(); return; }
      if (e.target.closest('[data-clear]')) {
        st.q = ''; st.filters = {}; st.from = st.to = ''; st.min = st.max = ''; st.page = 1;
        host.querySelectorAll('input[type=search],input[type=date],[data-amtinput]').forEach(i => i.value = '');
        host.querySelectorAll('[data-filter]').forEach(s => s.value = '');
        syncRange(); update(); return;
      }
      const act = e.target.closest('[data-act]');
      if (act && o.onAction) { const row = o.rows().find(r => String(r[o.idKey || 'id']) === act.dataset.id); if (row) o.onAction(act.dataset.act, row); }
    });
    host.addEventListener('input', e => {
      if (e.target.type === 'search') { st.q = e.target.value; st.page = 1; update(); }
      else if (e.target.dataset.amtinput) { st[e.target.dataset.amtinput] = e.target.value.trim(); st.page = 1; update(); }
      else if (e.target.type === 'date') { if (e.target.id.endsWith('from')) st.from = e.target.value; else st.to = e.target.value; st.page = 1; syncRange(); update(); }
    });
    host.addEventListener('change', e => {
      if (e.target.dataset.filter) { st.filters[e.target.dataset.filter] = e.target.value; st.page = 1; update(); }
      else if (e.target.dataset.size !== undefined) { st.size = +e.target.value; st.page = 1; update(); }
    });

    update();
    const setFilter = (k, v) => { st.filters[k] = v || ''; const sel = host.querySelector(`[data-filter="${k}"]`); if (sel) sel.value = v || ''; st.page = 1; update(); };
    return { refresh: update, filtered, state: st, setFilter };
  };
})(window.Billing);
