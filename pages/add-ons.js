/* Add-ons: catalogue (grouped cards) + Manage tab. Changes flow into the Billing Summary estimate. */
(function (B) {
  const S = B.state, C = B.calc, esc = B.esc;
  let host, tab = 'catalogue', dt;
  const collapsed = new Set();

  const groupOf = a => /^per (seat|user|supervisor)$/i.test(a.unit) ? 'licence' : /number/i.test(a.unit) ? 'number' : 'workspace';
  const GROUPS = [
    ['licence', 'Per licence', 'Charged per seat, and billed with that seat.'],
    ['number', 'Per number', 'Charged per number, and billed with the number.'],
    ['workspace', 'Per workspace', 'Charged once for the whole workspace, whatever the number of users.']
  ];
  const SAVES = {
    'AI Copilot': 'Agents spend less time typing notes: suggestions and call summaries are written for them.',
    'Screen Capture': 'Review how a call was handled, not only what was said, for coaching and disputes.',
    'Voice Biometrics': 'Callers are verified in seconds, so agents skip the security questions.',
    'Additional Phone Numbers': 'Give each team or campaign its own direct dial number.',
    'Toll-free Number': 'Customers call you free of charge, which helps support lines.',
    'Number Porting': 'Keep the numbers customers already know when you move carrier.',
    'AI Assistant': 'Summaries, transcripts and agent assist across the workspace.',
    'Call Recording': 'Keep recordings for training, quality and compliance.',
    'Advanced Analytics': 'Custom dashboards and scheduled reports instead of manual exports.',
    'Priority Support': 'A named engineer and a 15-minute response when something breaks.',
    'Voicemail Transcription': 'Read a voicemail in seconds instead of listening to every message.',
    'SMS Bundle': 'A fixed block of messages, so busy months do not tip into per-message overage.',
    'Extra Meeting Capacity': 'Run larger all-hands and webinars without splitting them across rooms.',
    'Additional Storage': 'Room for more recordings and files before you reach the plan limit.',
    'Call Whisper & Barge': 'Supervisors coach agents live without the caller hearing.',
    'Digital Signage Display': 'Queue times and targets visible to the whole floor.'
  };

  B.pages['add-ons'] = {
    title: 'Add-ons',
    desc: 'Extras you can add to your plan, and what you already hold. They are billed with the plan each period.',
    bind() { tab = 'catalogue'; },
    render(el) { host = el; draw(); }
  };

  function draw() {
    if (!host || !host.isConnected) return;
    host.innerHTML = `<div class="bcard overflow-hidden"><div class="tabs" role="tablist" aria-label="Add-ons views">
      <button type="button" role="tab" class="tab ${tab === 'catalogue' ? 'active' : ''}" aria-selected="${tab === 'catalogue'}" data-tab="catalogue">Add-ons</button>
      <button type="button" role="tab" class="tab ${tab === 'manage' ? 'active' : ''}" aria-selected="${tab === 'manage'}" data-tab="manage">Manage</button>
    </div><div class="p-3" role="tabpanel" id="aoPanel"></div></div>`;
    host.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    const p = host.querySelector('#aoPanel');
    tab === 'catalogue' ? catalogue(p) : manage(p);
  }

  /* ---------- catalogue ---------- */
  function card(a) {
    const soon = a.status === 'Coming soon', on = a.status === 'Active', open = !collapsed.has(a.id);
    const badge = soon ? B.badge('Coming soon', 'muted') : on ? B.badge(`On your plan · ${a.qty}`, 'info') : B.badge('Not on your plan', 'ok');
    const rows = soon
      ? `<div class="ao-row"><div><div class="ao-h">What it saves you</div><div class="ao-t">${esc(SAVES[a.name] || a.description)}</div></div></div>
         <div class="ao-row"><div><div class="ao-h">How it is charged</div><div class="ao-t">Pricing will be shown here when it launches.</div></div><span class="text-muted small">Coming soon</span></div>
         <div class="ao-row"><div><div class="ao-h">Availability</div><div class="ao-t">This add-on is not available to order yet.</div></div><span class="text-muted small">Coming soon</span></div>`
      : `<div class="ao-row"><div><div class="ao-h">What it saves you</div><div class="ao-t">${esc(SAVES[a.name] || a.description)}</div></div></div>
         <div class="ao-row"><div><div class="ao-h">How it is charged</div><div class="ao-t">${esc(a.freq)} charge, billed with the plan.</div></div><div class="ao-price">${B.money(a.price)} <small>${esc(a.unit)}, ${esc(a.freq.toLowerCase())}</small></div></div>
         <div class="ao-row"><div><div class="ao-h">${on ? 'On your plan' : 'Add to your plan'}</div><div class="ao-t">${on ? `${a.qty} held, ${B.money(a.qty * a.price)} each period.` : 'Charged in proportion for the rest of this period, then on the plan each period.'}</div></div>
           <div class="d-flex gap-2">${on ? `<button type="button" class="btn btn-brand-o" data-manage="${a.id}">Manage</button><button type="button" class="btn btn-brand-o" data-remove="${a.id}">Remove</button>` : `<button type="button" class="btn btn-brand-o" data-add="${a.id}" aria-label="Add ${esc(a.name)} to your plan">Add</button>`}</div></div>`;
    return `<article class="ao-card" aria-label="${esc(a.name)}"><div class="ao-head"><div><div class="ao-name">${esc(a.name)}</div><div class="ao-desc">${esc(a.description)}</div></div>${badge}</div>
      ${open ? rows : ''}<button type="button" class="ao-toggle" data-toggle="${a.id}" aria-expanded="${open}">${open ? 'Hide details' : 'Show details'}</button></article>`;
  }

  function catalogue(p) {
    p.innerHTML = `<div class="d-grid gap-3">
      <section class="ao-card ao-intro" aria-label="About add-ons">
        <div class="ao-head"><div><div class="ao-name">What this page does for you ${B.badge('Flat prices', 'warn')}</div><div class="ao-desc">Each add-on shows what it saves you, how it is charged and how to add it.</div></div></div>
        <div class="ao-row"><div><div class="ao-h">Add extras where you need them</div><div class="ao-t">Pick them per licence, per number or for the whole workspace. Nothing is added until you press Add.</div></div></div>
        <div class="ao-row"><div><div class="ao-h">Looking for the modules your plan already includes?</div><div class="ao-t">Voice, video meetings, chat and more are turned on or off separately, and many are part of the plan already.</div></div><button type="button" class="btn btn-brand-o" data-go="modules-access">Modules &amp; access</button></div>
        <div class="ao-row"><div><div class="ao-h">Looking for what a call allowance costs?</div><div class="ao-t">Usage beyond your included minutes, messages and tokens is billed separately at the rates shown with your usage.</div></div><button type="button" class="btn btn-brand-o" data-go="usage">Usage &amp; rates</button></div>
      </section>
      <div class="ao-note" role="note">Add-ons are billed with your plan each period. One added part-way through a period is charged in proportion for the days left, and removing one takes effect from the next period.</div>
      ${GROUPS.map(g => {
        const items = S.addons.filter(a => groupOf(a) === g[0]);
        return items.length ? `<section class="ao-group" aria-label="${g[1]}"><h2>${g[1]}</h2><p>${g[2]}</p><div class="d-grid gap-3">${items.map(card).join('')}</div></section>` : '';
      }).join('')}</div>`;
    p.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.go) return B.go(t.dataset.go);
      if (t.dataset.toggle) { const id = +t.dataset.toggle; collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id); return catalogue(p); }
      const id = +(t.dataset.add || t.dataset.manage || t.dataset.remove || 0); if (!id) return;
      const ad = S.addons.find(x => x.id === id);
      if (t.dataset.remove) return removeAddon(ad);
      openQty(ad, !!t.dataset.add);
    };
  }

  function openQty(ad, adding) {
    B.form({ title: `${adding ? 'Add' : 'Manage'} ${ad.name}`, submitLabel: adding ? 'Add to plan' : 'Save', size: 'modal-md', values: { qty: adding ? 1 : ad.qty },
      intro: `${B.money(ad.price)} ${esc(ad.unit)}, billed ${ad.freq.toLowerCase()}.`,
      fields: [{ name: 'qty', label: 'Quantity', type: 'number', required: true, integer: true, gt: 0, gtMsg: 'Quantity must be greater than 0.', max: 100, col: 'col-12' }],
      impact: v => impactFor(ad, v.qty, adding ? 0 : ad.qty),
      onSubmit: v => { ad.qty = Number(v.qty); ad.status = 'Active'; B.toast(adding ? `${ad.name} added.` : `${ad.name} updated.`); draw(); } });
  }
  function impactFor(ad, qty, had) {
    const q = Number(qty); if (!/^\d+$/.test(String(qty)) || q < 1 || q > 100) return '';
    const delta = Math.round((q - had) * ad.price * 100) / 100;
    return B.impact([['Price', `${B.money(ad.price)} ${esc(ad.unit)}`], ['This add-on each month', B.money(q * ad.price)], ['Change to next bill', `${delta >= 0 ? '+' : '-'}${B.money(Math.abs(delta))}`], ['All add-ons each month', B.money(C.addonsTotal() + delta)]]);
  }
  /* Add an add-on from anywhere: pick it, choose a quantity, see the price, confirm. */
  B.openAddAddon = done => {
    const avail = S.addons.filter(a => a.status === 'Available');
    if (!avail.length) return B.toast('Every available add-on is already on your plan.', 'error');
    const byId = id => avail.find(a => String(a.id) === String(id));
    B.form({ title: 'Add an add-on', submitLabel: 'Add to plan', size: 'modal-md', values: { addon: avail[0].id, qty: 1 },
      intro: 'Choose an add-on and how many you need. It is billed with your plan from the next period.',
      fields: [
        { name: 'addon', label: 'Add-on', type: 'select', col: 'col-12', options: avail.map(a => [a.id, `${a.name} - ${B.money(a.price)} ${a.unit}`]) },
        { name: 'qty', label: 'Quantity', type: 'number', required: true, integer: true, gt: 0, gtMsg: 'Quantity must be greater than 0.', max: 100, col: 'col-12' }],
      impact: v => byId(v.addon) ? impactFor(byId(v.addon), v.qty, 0) : '',
      onSubmit: v => { const a = byId(v.addon); a.qty = Number(v.qty); a.status = 'Active'; B.toast(`${a.name} added.`); if (typeof done === 'function') done(); else draw(); } });
  };
  function removeAddon(ad) {
    B.confirm({ title: `Remove ${ad.name}?`, danger: true, okLabel: 'Remove', message: 'It stops being billed from the next period.', onOk: () => { ad.status = 'Available'; ad.qty = 0; B.toast(`${ad.name} removed.`); draw(); } });
  }

  /* ---------- manage ---------- */
  function manage(p) {
    p.innerHTML = `<div class="row g-3 mb-3">
        <div class="col-6 col-lg-3"><div class="tile"><div class="eyebrow">Active add-ons</div><div class="t-val">${C.activeAddons().length}</div></div></div>
        <div class="col-6 col-lg-3"><div class="tile"><div class="eyebrow">Monthly cost</div><div class="t-val">${B.money(C.addonsTotal())}</div></div></div></div>
      <div id="aTable"></div>`;
    dt = B.DataTable(p.querySelector('#aTable'), {
      caption: 'Add-ons', rows: () => S.addons.map(a => Object.assign({}, a, { amount: a.qty * a.price })), amountKey: 'price', searchKeys: ['name', 'description', 'status'], searchPlaceholder: 'Search add-ons',
      filters: [{ key: 'status', label: 'Status', options: ['Active', 'Available', 'Coming soon'] }], emptyText: 'No add-ons found.',
      columns: [
        { key: 'name', label: 'Name', render: r => `<div class="fw-semibold">${esc(r.name)}</div><div class="text-muted small d-md-none">${esc(r.description)}</div>` },
        { key: 'description', label: 'Description', hide: 'md' },
        { key: 'qty', label: 'Quantity' },
        { key: 'price', label: 'Price', render: r => `${B.money(r.price)} <span class="text-muted small">${esc(r.unit)}</span>` },
        { key: 'freq', label: 'Billing frequency', hide: 'lg' },
        { key: 'status', label: 'Status', render: r => B.badge(r.status, r.status === 'Coming soon' ? 'muted' : B.statusKind(r.status)) },
        { key: '_act', label: 'Actions', align: 'end' }
      ],
      actions: r => r.status === 'Active'
        ? B.actBtn('manage', r.id, 'sliders', `Manage ${r.name}`) + B.actBtn('remove', r.id, 'trash', `Remove ${r.name}`, 'danger')
        : r.status === 'Coming soon' ? '<span class="text-muted small">Coming soon</span>' : B.actBtn('add', r.id, 'plus', `Add ${r.name}`),
      onAction: (a, row) => { const ad = S.addons.find(x => x.id === row.id); a === 'remove' ? removeAddon(ad) : openQty(ad, a === 'add'); }
    });
  }
})(window.Billing);
