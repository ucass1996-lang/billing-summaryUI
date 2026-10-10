/* Plan Summary: one page. Current plan, AI allowances beside what the plan includes, then the seat / DID / storage / AI panel with
   a cost-centre allocation per seat. Plan comparison and extras sit in collapsible sections at the bottom. */
(function (B) {
  const S = B.state, C = B.calc, esc = B.esc, $ = B.money;
  let host, panel = 'licence';
  const sel = new Set();   // seats ticked for a bulk cost-centre change

  S.cancelAt = S.cancelAt || null;
  /* sample data for the DID(s) and AI tabs */
  S.dids = S.dids || [
    { id: 1, number: '+1 939 814 8021', flag: 'PR', country: 'Puerto Rico', from: '2026-09-07', to: '2026-11-06', cost: 0 },
    { id: 2, number: '+1 415 555 0142', flag: 'US', country: 'United States', from: '2026-09-07', to: '2026-11-06', cost: 0 }
  ];
  S.aiAgents = S.aiAgents || [];

  /* After a plan is picked and confirmed: show what happened, then return to the Billing Summary. */
  B.planChanged = () => {
    const c = B.lastPlanChange; if (!c) return;
    const up = c.kind === 'up', sch = c.kind === 'sched', row = (k, v) => `<div class="pc-row"><span>${k}</span><b>${v}</b></div>`;
    const m = B.modal({ title: up ? 'Plan upgraded' : sch ? 'Upgrade scheduled' : 'Downgrade scheduled', size: 'modal-sm',
      body: `<div class="pc-ok"><div class="pc-tick ${up ? '' : 'sched'}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${up ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>' : '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'}</svg></div>
        <h3 class="pc-h">${up ? `You are now on ${esc(c.name)}` : `${esc(c.name)} starts ${B.fmtDate(c.effective)}`}</h3>
        <p class="pc-p">${up ? 'Your new plan is active today and the next bill is updated.' : (sch ? `No charge today. You keep ${esc(S.plan.name)} until then, and the new allowances start with the new period.` : `You keep ${esc(S.plan.name)} until then. Nothing changes on your bill today.`)}</p>
        <div class="pc-rows">${row('Plan', esc(c.name))}${row('Price', `${$(c.rate)} per seat a month`)}${row('Billing cycle', esc(c.cycle))}${up ? row('Prorated charge', c.extra > 0 ? $(c.extra) : 'None') : ''}${row(up ? 'Next bill estimate' : 'Takes effect', up ? $(C.estimate()) : B.fmtDate(c.effective))}</div></div>`,
      footer: '<button type="button" class="btn btn-brand" data-bs-dismiss="modal">Back to Billing Summary</button>' });
    m.el.addEventListener('hidden.bs.modal', () => B.go('summary'));
  };

  B.pages.plan = {
    title: 'Plan Summary',
    desc: 'What you are paying for today, what changes at the next bill, and what each plan includes.',
    actions: '<button type="button" class="btn btn-outline-danger" id="cancelSub">Cancel subscription</button>',
    bind(root) {
      panel = 'licence';
      root.querySelector('#cancelSub').onclick = () => {
        if (S.cancelAt) return B.toast(`Cancellation is already scheduled for ${B.fmtDate(S.cancelAt)}.`);
        B.confirm({ title: 'Cancel subscription?', danger: true, okLabel: 'Cancel subscription',
          message: `Your plan stays active until ${B.fmtDate(S.period.next)}. After that, calling and messaging stop and no further bills are raised.`,
          onOk: () => { S.cancelAt = S.period.next; B.toast('Cancellation scheduled.'); draw(); } });
      };
    },
    render(el) { host = el; draw(); }
  };

  /* seat dialog shared with the Licences page */
  B.manageSeats = done => {
    const min = C.assigned() + C.pending();
    B.form({
      title: 'Remove or change seats', submitLabel: 'Save changes', size: 'modal-md', values: { seats: S.seats },
      intro: `You are on <strong>${esc(S.plan.name)}</strong> at ${$(S.plan.rate)} per seat per month.`,
      fields: [{ name: 'seats', label: 'Number of seats', type: 'number', required: true, integer: true, gt: 0, gtMsg: 'Number of seats must be greater than 0.', max: 500, col: 'col-12',
        validate: v => Number(v) < min ? `Seats cannot be fewer than the ${min} already assigned.` : '' }],
      onSubmit: v => { S.seats = Number(v.seats); B.toast('Seats updated.'); if (done) done(); }
    });
  };

  const plans = () => S.plans.filter(p => p.cat === 'phone');
  const inc = u => S.usage.find(x => x.key === u);
  const lastPaid = () => S.activity.find(a => a.status === 'Paid' && /renewal/i.test(a.description));

  function draw() {
    if (!host || !host.isConnected) return;
    const lp = lastPaid(), cancel = S.cancelAt, ago = lp ? Math.max(0, Math.round((Date.parse(S.today) - Date.parse(lp.date)) / 864e5)) : 0;
    host.innerHTML = `<div class="d-grid gap-3" data-plain>
      <div class="pl-bar2">
        <div class="pl-line"><span><b>${esc(S.plan.name)}</b> \u00b7 ${$(S.plan.rate)}/user per ${esc(S.plan.cycle === 'Annual' ? 'month, billed yearly' : 'month')} \u00b7 ${cancel ? B.badge('Cancels ' + B.fmtDate(cancel), 'bad') : `<span class="pl-active">Active <svg class="pl-okic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none"/><path d="M8 12.4l2.8 2.8L16 9.6" stroke="#fff"/></svg></span>`}</span>
          ${S.scheduledPlan ? `<span class="pl-note">${B.badge('Scheduled', 'warn')} Moves to <b>${esc(S.scheduledPlan.name)}</b> on ${B.fmtDate(S.scheduledPlan.effective)}. <button type="button" class="btn btn-link p-0 align-baseline" id="undoSched">Cancel change</button></span>` : ''}</div>
        <div class="pl-btns">${cancel ? '<button type="button" class="btn btn-brand-o" id="keepSub">Keep subscription</button>' : ''}<button type="button" class="btn btn-brand pl-b1" data-chg>${B.icon('refresh', 15)} Change plan</button><button type="button" class="btn btn-brand pl-b2" id="dlInv">${B.icon('download', 15)} Download invoice</button></div></div>

      <div class="row g-3 pl-kpis">
        <div class="col-6 col-xl-3"><div class="tile pl-t pl-g"><span class="pl-ti">${B.icon('wallet', 20)}</span><div class="pl-tb"><div class="eyebrow">Last charge</div><div class="t-val">${lp ? $(lp.amount) : '\u2014'}</div><div class="t-note">${lp ? `${B.fmtDate(lp.date)} \u00b7 ${ago} day${ago === 1 ? '' : 's'} ago` : 'No payment yet'}</div></div></div></div>
        <div class="col-6 col-xl-3"><div class="tile pl-t pl-b"><span class="pl-ti">${B.icon('statement', 20)}</span><div class="pl-tb"><div class="eyebrow">Next bill</div><div class="t-val">${$(C.estimate())}</div><div class="t-note">${$(S.plan.rate)}/user \u00d7 ${S.seats} seats${C.addonsTotal() ? ` + ${$(C.addonsTotal())} add-ons` : ''}</div></div></div></div>
        <div class="col-6 col-xl-3"><div class="tile pl-t pl-v"><span class="pl-ti">${B.icon('refresh', 20)}</span><div class="pl-tb"><div class="eyebrow">${cancel ? 'Ends on' : 'Renews on'}</div><div class="t-val">${B.fmtDate(S.period.next)}</div><div class="t-note">When the card on file is charged</div></div></div></div>
        <div class="col-6 col-xl-3"><div class="tile pl-t pl-a"><span class="pl-ti">${B.icon('licences', 20)}</span><div class="pl-tb"><div class="eyebrow">Seats</div><div class="t-val">${C.assigned()} of ${S.seats} <i class="pl-dotg" aria-hidden="true"></i></div><div class="t-note">In use of seats on the bill</div></div></div></div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-xl-6">${allowances()}</div>
        <div class="col-12 col-xl-6">${includes()}</div>
      </div>

      <section class="ao-card" aria-label="Seats and resources">
        <div class="tabs" role="tablist" aria-label="Plan resources">${[['licence', 'Licence'], ['numbers', 'DID(s)'], ['storage', 'Storage'], ['ai', 'AI']].map(t => `<button type="button" role="tab" class="tab ${panel === t[0] ? 'active' : ''}" aria-selected="${panel === t[0]}" data-panel="${t[0]}">${t[1]}</button>`).join('')}</div>
        <div class="p-3" id="sidePanel" role="tabpanel"></div></section></div>`;

    host.querySelectorAll('[data-go]').forEach(b => b.onclick = () => B.go(b.dataset.go));
    host.querySelectorAll('[data-chg]').forEach(b => b.onclick = () => B.openChangePlan(() => { draw(); B.planChanged(); }));
    host.querySelector('#undoSched')?.addEventListener('click', () => { S.scheduledPlan = null; B.toast('Plan change cancelled.'); draw(); });
    host.querySelectorAll('[data-rates]').forEach(b => b.onclick = () => openRates(b.dataset.rates));
    host.querySelector('#dlInv').onclick = () => { const r = lastPaid(); if (!r) return B.toast('There is no paid invoice to download yet.', 'error'); B.showReceipt(B.activityInvoice(r)); };
    host.querySelector('#keepSub')?.addEventListener('click', () => { S.cancelAt = null; B.toast('Subscription kept.'); draw(); });
    host.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => { panel = b.dataset.panel; draw(); });
    side(host.querySelector('#sidePanel'));
  }

  /* "Available Minutes / Fax / SMS-MMS": what the plan's free credit buys at each rate (rounded up, as in the reference) */
  const RATE_POPUPS = {
    minutes: { title: 'Available Minutes', list: () => S.minuteRates, sel: 0 },
    fax: { title: 'Available Fax', list: () => S.faxRates, sel: -1 },
    sms: { title: 'Available SMS/MMS', list: () => S.messageRates, sel: -1 }
  };
  function openRates(kind) {
    const cfg = RATE_POPUPS[kind], credit = S.plan.freeCredit || 0;
    const rates = cfg.list().map(r => Object.assign({}, r, { qty: Math.ceil(credit / r.rate - 1e-9) }));
    let sel = cfg.sel;
    const m = B.modal({
      title: cfg.title, size: 'modal-lg', bare: true,
      body: `<div class="am-wrap"><h2 class="am-title" aria-hidden="true">${esc(cfg.title)}</h2>
        <p class="am-desc">Rates are calculated using the Free Credit amount available in your plan.</p>
        <div class="row g-3" id="amGrid" role="group" aria-label="${esc(cfg.title)} by destination"></div></div>`
    });
    m.el.classList.add('am-modal');
    const draw = () => {
      m.el.querySelector('#amGrid').innerHTML = rates.length ? rates.map((r, i) => `<div class="col-12 col-md-6"><button type="button" class="am-card ${i === sel ? 'sel' : ''}" data-i="${i}" aria-pressed="${i === sel}">
        <span class="am-left"><span class="am-dest">${esc(r.dest)}</span><span class="am-meta"><span class="am-chip">${esc(r.type)}</span><span class="am-rate">Rate: <b>$${r.rate.toFixed(4)}</b></span></span></span>
        <span class="am-right"><b>${r.qty}</b> ${esc(r.unit)}</span></button></div>`).join('')
        : '<div class="col-12"><div class="dt-empty"><strong>No rates available.</strong></div></div>';
    };
    draw();
    m.el.querySelector('#amGrid').addEventListener('click', e => { const c = e.target.closest('[data-i]'); if (c) { sel = +c.dataset.i; draw(); } });
  }

  function allowances() {
    const cur = S.plans.find(p => p.name === S.plan.name), i = cur && cur.inc;
    return `<section class="ao-card" aria-label="AI allowances"><div class="ao-head"><div><div class="ao-name">AI allowances</div><div class="ao-desc">What your plan includes for AI each period, and where to get more.</div></div></div>
      <div class="p-3 pt-0"><div class="row g-3 mb-3">
        <div class="col-6"><div class="tile"><div class="eyebrow">AI call minutes included</div><div class="t-val sm">${esc(i ? i.aiMin : 'Not included')}</div></div></div>
        <div class="col-6"><div class="tile"><div class="eyebrow">AI message replies included</div><div class="t-val sm">${esc(i ? i.aiReplies : 'Not included')}</div></div></div></div>
        <div class="al-row"><strong>Available Minutes</strong><button type="button" class="btn btn-brand-o" data-rates="minutes">Check Available Minutes</button></div>
        <div class="al-row"><strong>Available Fax</strong><button type="button" class="btn btn-brand-o" data-rates="fax">Check Available FAX</button></div>
        <div class="al-row"><strong>Available SMS/MMS</strong><button type="button" class="btn btn-brand-o" data-rates="sms">Check Available SMS/MMS</button></div></div></section>`;
  }

  function includes() {
    const rows = [['voice', 'Calling'], ['sms', 'Text messages'], ['meetings', 'Meetings'], ['storage', 'Recording storage']];
    return `<section class="ao-card" aria-label="What your plan includes"><div class="ao-head"><div><div class="ao-name">What your plan includes</div><div class="ao-desc">Each allowance, how much of it you have used, and what is left.</div></div></div>
      <div class="table-responsive"><table class="table btable align-middle"><caption class="visually-hidden">Plan allowances</caption><thead><tr>${['Service', 'Allowance', 'Used', 'Left'].map((h, n) => `<th scope="col" class="${n ? 'text-end' : ''}"><span class="th-static">${h}</span></th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => { const u = inc(r[0]); const left = Math.max(0, u.included - u.used); return `<tr><td class="fw-semibold">${r[1]}</td><td class="text-end">${B.num(u.included)} ${esc(u.unit)}</td><td class="text-end">${B.num(u.used)} ${esc(u.unit)}<div class="pl-bar" aria-hidden="true"><i style="width:${Math.min(100, Math.round(u.used / (u.included || 1) * 100))}%"></i></div></td><td class="text-end">${left ? B.num(left) + ' ' + esc(u.unit) : '<span class="text-danger">None left</span>'}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  }

  /* ---- right-hand tabs ---- */
  function side(p) {
    if (panel === 'licence') {
      const inUse = C.assigned(), unassigned = Math.max(0, S.seats - inUse - C.pending());
      p.innerHTML = `<p class="seat-sum">Seats in use <b>${inUse}</b> \u00b7 Paid but unassigned <b>${unassigned}</b> \u00b7 Scheduled for removal <b>0</b> \u00b7 Seats you pay for next <b>${S.seats}</b> (${$(S.seats * S.plan.rate)}/month). Seats you remove stop being billed from the next period; seats you add are charged in proportion for the rest of this one.</p>
        <div id="seatTable"></div>`;
      const ccs = () => S.costCentres.filter(c => c.status === 'Active');
      const ccOpts = v => `<option value="">Unallocated</option>${ccs().map(c => `<option value="${esc(c.code)}" ${v === c.code ? 'selected' : ''}>${esc(c.code)} \u00b7 ${esc(c.name)}</option>`).join('')}`;
      const initials = n => n.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
      const ext = r => 'x' + (1000 + r.id * 7);
      p.querySelector('#seatTable').insertAdjacentHTML('beforebegin', `<div class="seat-bulk" id="seatBulk"><div class="seat-hint">Tick seats to give them all the same cost centre, or pick one for each person below.</div>
        <div class="seat-tools"><label class="form-check mb-0"><input class="form-check-input" type="checkbox" id="selAll"><span class="form-check-label small">Select all</span></label>
          <select id="bulkCc" class="form-select form-select-sm w-auto" aria-label="Cost centre for the ticked seats">${ccOpts('')}</select><button type="button" class="btn btn-brand btn-sm" id="bulkApply" disabled>Apply to selected</button></div></div>`);
      const bulk = p.querySelector('#seatBulk'), upd = () => { const n = [...sel].filter(id => S.licences.some(l => l.id === id)).length; p.querySelector('#bulkApply').disabled = !n; p.querySelector('#bulkApply').textContent = n ? `Apply to ${n} selected` : 'Apply to selected'; p.querySelector('#selAll').checked = n && n === S.licences.length; p.querySelector('#selAll').indeterminate = n > 0 && n < S.licences.length; };
      const dt = B.DataTable(p.querySelector('#seatTable'), {
        caption: 'Seat allocation', toolbar: false, search: false, compactPager: true, pageSize: 25, rows: () => S.licences, idKey: 'id', emptyText: 'No licences assigned yet.',
        columns: [
          { key: '_sel', label: '', sortable: false, render: r => `<input class="form-check-input" type="checkbox" data-sel="${r.id}" ${sel.has(r.id) ? 'checked' : ''} aria-label="Select ${esc(r.user)}">` },
          { key: 'user', label: 'User name', render: r => `<div class="seat-who"><span class="seat-av" aria-hidden="true">${esc(initials(r.user))}</span><div><div class="fw-semibold">${esc(r.user)}</div><div class="text-muted small">${esc((r.tier || '').replace(' Seat', '').toLowerCase())}</div></div></div>` },
          { key: 'email', label: 'Email', hide: 'md', render: r => `<span class="seat-mail">${esc(r.email)}</span>` },
          { key: 'ext', label: 'User ID', hide: 'sm', sortable: false, render: r => `<span class="mono seat-id"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z"/></svg>${ext(r).slice(1)}</span>` },
          { key: 'role', label: 'Badges', hide: 'lg', sortable: false, render: r => `<span class="seat-role ${r.id === S.licences[0].id ? 'admin' : ''}">${r.id === S.licences[0].id ? 'ADMIN' : 'AGENT'}</span>` },
          { key: 'cc', label: 'Cost Center', sortable: false, render: r => `<select class="form-select form-select-sm seat-cc" data-cc="${r.id}" aria-label="Cost centre for ${esc(r.user)}">${ccOpts(r.cc || '')}</select>${r.cc ? '' : '<div class="cc-note">Unallocated \u2014 not charged to a cost centre.</div>'}` },
          { key: '_act', label: 'Actions', align: 'end' }
        ],
        actions: r => `<div class="dropdown"><button type="button" class="btn btn-brand-o btn-sm dropdown-toggle" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false">Actions</button><ul class="dropdown-menu dropdown-menu-end"><li><button type="button" class="dropdown-item" data-act="clear" data-id="${r.id}" ${r.cc ? '' : 'disabled'}><span>Clear cost centre</span></button></li><li><button type="button" class="dropdown-item text-danger" data-act="revoke" data-id="${r.id}"><span>Revoke seat</span></button></li></ul></div>`,
        onAction: (a, r) => {
          const l = S.licences.find(x => x.id === r.id); if (!l) return;
          if (a === 'clear') { l.cc = ''; B.toast(`${l.user} is unallocated.`, 'info', 'Cost centre cleared'); dt.refresh(); }
          else B.confirm({ title: 'Revoke licence?', danger: true, okLabel: 'Revoke', message: `${l.user} will lose access and the licence becomes available to assign again.`,
            onOk: () => { S.licences = S.licences.filter(x => x.id !== l.id); sel.delete(l.id); B.toast('Licence revoked.'); draw(); } });
        }
      });
      p.querySelector('.dt-pager').insertAdjacentHTML('beforeend', '<div class="seat-actions"><button type="button" class="btn btn-brand" id="rmSeats">Remove seats</button><button type="button" class="btn btn-brand" id="buySeats">Buy seats</button></div>');
      p.querySelector('#rmSeats').onclick = () => B.manageSeats(draw);
      p.querySelector('#buySeats').onclick = () => B.buySeats(draw);
      const box = p.querySelector('#seatTable');
      box.addEventListener('change', e => {
        const c = e.target.closest('[data-sel]'), k = e.target.closest('[data-cc]');
        if (c) { c.checked ? sel.add(+c.dataset.sel) : sel.delete(+c.dataset.sel); upd(); }
        else if (k) { const l = S.licences.find(x => x.id === +k.dataset.cc); if (l && (l.cc || '') !== e.target.value) { l.cc = e.target.value; B.toast(e.target.value ? `${l.user} is now charged to ${e.target.value}.` : `${l.user} is unallocated.`, 'ok', 'Cost centre updated'); dt.refresh(); } }
      });
      bulk.querySelector('#selAll').onchange = e => { e.target.checked ? S.licences.forEach(l => sel.add(l.id)) : sel.clear(); dt.refresh(); upd(); };
      bulk.querySelector('#bulkApply').onclick = () => {
        const cc = bulk.querySelector('#bulkCc').value, ids = [...sel].filter(id => S.licences.some(l => l.id === id));
        if (!ids.length) return B.toast('Tick at least one seat first.', 'error', 'No seats selected');
        S.licences.forEach(l => { if (ids.includes(l.id)) l.cc = cc; });
        B.toast(cc ? `${ids.length} seat${ids.length === 1 ? '' : 's'} charged to ${cc}.` : `${ids.length} seat${ids.length === 1 ? '' : 's'} unallocated.`, 'ok', 'Cost centre updated'); sel.clear(); dt.refresh(); upd();
      };
      upd();
    } else if (panel === 'numbers') {
      p.innerHTML = '<div id="didTable"></div>';
      B.DataTable(p.querySelector('#didTable'), {
        caption: 'DID numbers', toolbar: false, search: false, compactPager: true, pageSize: 25, idKey: 'id', rows: () => S.dids, emptyText: 'No phone numbers on this account yet.',
        columns: [
          { key: 'number', label: 'DID Number', render: r => `<span class="did-n"><span class="did-flag" title="${esc(r.country)}">${esc(r.flag)}</span>${esc(r.number)}</span>` },
          { key: 'from', label: 'Duration', render: r => `<span class="text-nowrap">${esc(r.from)} - ${esc(r.to)}</span>` },
          { key: 'cost', label: 'DID Cost ($)', render: r => `<span class="did-cost">${r.cost.toFixed(2)}</span>${r.cost === 0 ? '<span class="did-free">FREE</span>' : ''}` }
        ]
      });
    } else if (panel === 'storage') {
      const sto = S.resources.find(r => r.label === 'Storage') || { used: 0, limit: 0, unit: 'GB' }, extra = S.addons.find(a => a.name === 'Additional Storage');
      p.innerHTML = '<div id="stoTable"></div>';
      B.DataTable(p.querySelector('#stoTable'), {
        caption: 'Storage', toolbar: false, search: false, compactPager: true, pageSize: 25, idKey: 'id',
        rows: () => [{ id: 1, name: 'Recording storage', note: 'Included with the plan', used: sto.used, limit: sto.limit, cost: 0 }].concat(extra && extra.status === 'Active' && extra.qty ? [{ id: 2, name: 'Additional Storage', note: `${extra.qty} \u00d7 50 GB blocks`, used: 0, limit: extra.qty * 50, cost: extra.qty * extra.price }] : []),
        columns: [
          { key: 'name', label: 'Storage', render: r => `<div class="fw-semibold">${esc(r.name)}</div><div class="text-muted small">${esc(r.note)}</div>` },
          { key: 'used', label: 'Used', render: r => `${B.num(r.used)} ${esc(sto.unit)}` },
          { key: 'limit', label: 'Available', render: r => `${B.num(r.limit)} ${esc(sto.unit)}` },
          { key: 'bar', label: 'Usage', sortable: false, hide: 'sm', render: r => { const pc = r.limit ? Math.min(100, Math.round(r.used / r.limit * 100)) : 0; return `<div class="did-bar" role="progressbar" aria-label="${esc(r.name)} used" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100"><i class="${pc >= 85 ? 'near' : ''}" style="width:${pc}%"></i></div><small class="text-muted">${pc}%</small>`; } },
          { key: 'cost', label: 'Cost ($)', render: r => `<span class="did-cost">${r.cost.toFixed(2)}</span>${r.cost === 0 ? '<span class="did-free">INCLUDED</span>' : ''}` }
        ]
      });
    } else {
      p.innerHTML = '<div id="aiTable"></div>';
      B.DataTable(p.querySelector('#aiTable'), {
        caption: 'AI agent usage', toolbar: false, search: false, compactPager: true, pageSize: 25, idKey: 'id', rows: () => S.aiAgents,
        emptyHtml: '<svg class="empty-art" width="150" height="110" viewBox="0 0 150 110" aria-hidden="true"><rect x="12" y="14" width="64" height="80" rx="6" transform="rotate(-6 44 54)" fill="#fff" stroke="#c9d0de" stroke-width="2"/><rect x="70" y="10" width="66" height="84" rx="6" transform="rotate(5 103 52)" fill="#fff" stroke="#c9d0de" stroke-width="2"/><path d="M26 34h34M26 44h34M26 54h22M84 30h38M84 40h38M84 50h26" stroke="#d4dae6" stroke-width="3" stroke-linecap="round"/><circle cx="78" cy="72" r="14" fill="#fff" stroke="#8a94ab" stroke-width="3"/><path d="M88 82l14 14" stroke="#8a94ab" stroke-width="4" stroke-linecap="round"/></svg><strong class="did-none">No Agent Usage Found!</strong>',
        columns: [
          { key: 'name', label: 'Agent Name' },
          { key: 'type', label: 'Type' },
          { key: 'total', label: 'Total USD', render: r => $(r.total) },
          { key: 'minutes', label: 'Used Minutes', render: r => B.num(r.minutes) },
          { key: 'messages', label: 'Used Messages', render: r => B.num(r.messages) }
        ]
      });
    }
    p.querySelectorAll('[data-go]').forEach(b => b.onclick = () => B.go(b.dataset.go));
  }
})(window.Billing);
