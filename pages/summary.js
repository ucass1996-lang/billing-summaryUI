/* Billing Summary: Current billing + Invoice history tabs. */
(function (B) {
  let host, tab = 'current', example = false;
  /* Sample account shown by "Show an example": invented quantities, not the user's real data. */
  const EX = {
    banner: 'Example only. A sample account: 8 seats of Support Premium with every add-on, priced from the real plans and catalogue with invented quantities. Not your charges, and not your card.',
    plan: 'Support Premium', seats: 8, rate: 70, estimate: 1616.5, estimateNote: 'Licences and add-ons; usage beyond the plan is extra',
    next: '31 October 2026', period: '30 September 2026 – 30 October 2026', assigned: 8, billed: 9, calls: 10,
    credit: 89.82, failed: 50, payment: 'Visa ending 4242 · a sample card, not yours',
    rows: [
      ['AI copilot', '8 seats', 8, 10], ['Screen capture', '8 seats', 8, 6], ['Toll-free number', '1 number, for the month', 1, 17],
      ['Extra local number', '3 numbers, for the month', 3, 3], ['Spam monitoring', '2 numbers watched', 2, 18], ['Conference room device', '2 meeting-room phones', 2, 8],
      ['Large meeting', '1 host', 1, 19], ['Messaging compliance pack', 'Brand registration, for the month', 1, 18],
      ['Messaging brand registration', 'One-off, first month only', 1, 29], ['Extra recording storage', '3 GB over the included storage', 3, 0.5]
    ].map(r => ({ name: r[0], sub: r[1], qty: r[2], price: r[3] }))
  };
  const S = B.state, C = B.calc, esc = B.esc, $ = B.money;

  B.pages.summary = {
    title: 'Billing Summary',
    desc: 'What you are paying for, what is due next, and what you have paid before.',
    bind() { example = false; tab = 'current'; },
    render(el) { host = el; draw(); }
  };

  function draw() {
    if (tab === 'history') {
      host.removeAttribute('data-plain');
      host.innerHTML = `<div class="d-grid gap-3"><div><button type="button" class="btn btn-brand-o btn-sm" id="backSum">\u2190 Back to summary</button></div><div class="bcard overflow-hidden"><div class="p-3" id="panel"></div></div></div>`;
      host.querySelector('#backSum').onclick = () => { tab = 'current'; draw(); };
      return history(host.querySelector('#panel'));
    }
    current(host);
  }

  const r2 = n => Math.round(n * 100) / 100;

  /* One object per mode, so the page below draws real billing and the sample account the same way. */
  function model() {
    const pm = S.methods.find(m => m.primary) || S.methods[0];
    if (example) {
      const addons = r2(EX.rows.reduce((n, r) => n + r.qty * r.price, 0)), plan = r2(EX.assigned * EX.rate), licence = r2((EX.billed - EX.assigned) * EX.rate);
      const subtotal = r2(plan + licence + addons), tax = r2(subtotal * 0.07);
      return { sample: true, planName: EX.plan, seats: EX.billed, rate: EX.rate, cycle: 'Monthly', period: EX.period, next: EX.next, assigned: EX.assigned, rows: EX.rows,
        bd: { plan, licence, addons, usage: 0, discount: 0, subtotal, tax, taxRate: 0.07, total: r2(subtotal + tax) }, overage: [],
        credit: EX.credit, outstanding: EX.failed, outstandingCount: 1, pay: { text: 'Visa •••• 4242', last4: '4242', exp: 'a sample card', status: ['Sample', 'info'] },
        invoices: [['SAMPLE-003', '2026-09-30', 1616.5, 'Paid'], ['SAMPLE-002', '2026-08-31', 1546.5, 'Paid'], ['SAMPLE-001', '2026-07-31', 1480, 'Paid']].map(r => ({ id: r[0], date: r[1], amount: r[2], status: r[3] })) };
    }
    const exp = pm && /^(\d{2})\s*\/\s*(\d{2})$/.exec(pm.exp), expired = exp && (2000 + +exp[2] < +S.today.slice(0, 4) || (2000 + +exp[2] === +S.today.slice(0, 4) && +exp[1] < +S.today.slice(5, 7)));
    const status = !pm ? ['No card', 'bad'] : expired ? ['Card expired', 'bad'] : S.failed > 0 ? ['Needs attention', 'warn'] : ['Good standing', 'ok'];
    return { sample: false, planName: S.plan.name, seats: S.seats, rate: S.plan.rate, cycle: S.plan.cycle || 'Monthly', period: `${B.fmtDate(S.period.start)} – ${B.fmtDate(S.period.end)}`, next: B.fmtDate(S.period.next),
      assigned: C.assigned(), rows: C.activeAddons().map(a => ({ name: a.name, sub: '', qty: a.qty, price: a.price })), bd: C.breakdown(), overage: C.overage(),
      credit: S.credit, outstanding: C.outstandingTotal(), outstandingCount: C.outstanding().length,
      pay: pm ? { text: `${pm.brand} •••• ${pm.last4}`, last4: pm.last4, exp: pm.exp, status } : { text: '', status },
      invoices: S.invoices.filter(i => i.status !== 'Draft').slice().sort((x, y) => y.date.localeCompare(x.date)).slice(0, 5), pm, scheduled: S.scheduledPlan };
  }

  /* "View details" for the next bill: every line, including add-ons and any usage over the allowance. */
  B.billDetails = () => {
    const bd = C.breakdown(), row = (n, sub, v, cls = '') => `<div class="bk-row ${cls}"><div><div class="bk-n">${esc(n)}</div>${sub ? `<div class="bk-s">${esc(sub)}</div>` : ''}</div><div class="bk-v">${v}</div></div>`;
    const seats = C.assigned(), spare = Math.max(0, S.seats - seats);
    const m = B.modal({ title: 'Next bill details', size: 'modal-lg', body: `<p class="text-muted small">Estimated for ${B.fmtDate(S.period.start)} – ${B.fmtDate(S.period.end)}, charged on ${B.fmtDate(S.period.next)}.</p>
      ${row('Plan charges', `${S.plan.name}: ${seats} assigned seat${seats === 1 ? '' : 's'} × ${$(S.plan.rate)}`, $(bd.plan))}
      ${row('Licence charges', `${spare} unassigned seat${spare === 1 ? '' : 's'} × ${$(S.plan.rate)}`, $(bd.licence))}
      ${C.activeAddons().map(a => row(`Add-on: ${a.name}`, `${a.qty} × ${$(a.price)} ${a.unit}`, $(a.qty * a.price))).join('') || row('Add-on charges', 'No active add-ons', $(0))}
      ${C.overage().map(o => row(`Usage: ${o.name}`, `${B.num(o.qty)} ${o.unit} over the allowance`, $(o.amount))).join('') || row('Usage charges', 'Everything is within the included allowances', $(0))}
      ${row('Discounts', 'None applied this period', $(-bd.discount))}${row('Taxes', `GST 5% + State levy 2% (${Math.round(bd.taxRate * 100)}%)`, $(bd.tax))}
      <div class="bk-row bk-total"><div class="bk-n">Estimated total</div><div class="bk-v">${$(bd.total)}</div></div>`,
      footer: '<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Close</button><button type="button" class="btn btn-brand" data-chg>Change plan</button>' });
    m.el.querySelector('[data-chg]').onclick = () => { m.hide(); B.go('plan'); };
  };
  B.refreshSummary = () => { if (host && host.isConnected) draw(); };

  function current(p) {
    const v = model(), hasCard = S.methods.length > 0, spare = Math.max(0, v.seats - v.assigned);
    const plan = S.plans.find(x => x.name === v.planName), feats = (plan ? plan.features : ['Calling and messaging', 'Voicemail', 'Mobile and desktop apps', 'Support']).slice(0, 4);
    const estimate = v.sample ? EX.estimate : C.estimate(), usedPct = v.seats ? Math.round(v.assigned / v.seats * 100) : 0, ar = S.autoRecharge;
    const lastPay = v.sample ? { amount: v.invoices[0].amount, date: v.invoices[0].date } : S.activity.find(a => a.status === 'Paid');
    const tick = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    const kpi = (ico, tone, label, val, sub, badge, info) => `<div class="dash-kpi"><span class="dash-ico ${tone}">${B.icon(ico, 20)}</span><div class="dash-kpi-b"><div class="dash-kl">${label}${badge || ''}${info ? `<span class="dash-info" title="${esc(info)}" tabindex="0" aria-label="${esc(info)}">${B.icon('info', 14)}</span>` : ''}</div><div class="dash-kv">${val}</div><div class="dash-ks">${sub}</div></div></div>`;
    const row = (act, ico, label, val, badge) => `<button type="button" class="act-row" data-a="${act}"><span class="act-i">${B.icon(ico, 16)}</span><span class="act-l">${label}</span><span class="act-v">${val}</span>${badge}${B.icon('chev', 13)}</button>`;
    const inv = v.sample ? v.invoices.map(i => ({ id: i.id, date: i.date, due: B.dueDate(i.date), amount: i.amount, status: i.status, description: 'Sample invoice' })) : S.invoices.filter(i => i.status !== 'Draft').map(i => ({ id: i.id, date: i.date, due: B.dueDate(i.date), amount: i.amount, status: i.status, description: `Invoice for ${i.period || 'the billing period'}` }));
    p.setAttribute('data-plain', '');
    const tile = (cls, ico, label, val, sub) => `<div class="sm-tile ${cls}"><span class="sm-ti">${B.icon(ico, 18)}</span><div><div class="sm-tl">${label}</div><div class="sm-tv">${val}</div>${sub ? `<div class="sm-ts">${sub}</div>` : ''}</div></div>`;
    const th = t => `<th scope="col"><span class="th-static">${t}</span></th>`;
    const cards = v.sample ? [{ brand: 'Visa', last4: '4242', exp: 'sample', primary: true }] : S.methods;
    p.innerHTML = `<div class="sm">
      ${v.sample ? `<div class="sm-alert" role="status"><div><h2>${esc(EX.banner.split('. ')[0])}.</h2><p>${esc(EX.banner.slice(EX.banner.indexOf('. ') + 2))}</p></div></div>`
        : hasCard ? '' : `<div class="sm-alert" role="alert"><div><h2>No payment method saved</h2><p>Everything works today, but the next bill has nothing to charge. Saving a card now avoids that.</p></div><button type="button" class="btn btn-brand-o btn-sm" data-card>Add a card</button></div>`}

      <section class="sm-card" aria-labelledby="cp0">
        <div class="sm-hd"><div><h2 class="sm-h" id="cp0">Current plan</h2><p class="sm-sub">${esc(v.planName)} \u00b7 ${v.seats} seat${v.seats === 1 ? '' : 's'} \u00b7 ${$(v.rate)} a seat per month${v.scheduled ? ` \u00b7 moves to <b>${esc(v.scheduled.name)}</b> on ${B.fmtDate(v.scheduled.effective)}` : ''}</p></div>
          <button type="button" class="btn btn-brand-o btn-sm" data-a="plan">Change plan</button></div>
        <div class="sm-tiles">
          ${tile('teal', 'wallet', 'Next bill estimate', $(estimate), `${v.seats} seat${v.seats === 1 ? '' : 's'} \u00d7 ${$(v.rate)}${v.rows.length ? ' + add-ons' : ''}`)}
          ${tile('', 'statement', 'Next bill date', esc(v.next), 'When the card on file is charged.')}
          ${tile('amber', 'refresh', 'Billing period', `<span class="sm-tv-sm">${esc(v.period)}</span>`, `Billed ${esc(v.cycle.toLowerCase())}.`)}
          ${tile('', 'licences', 'Licences', `${v.assigned} of ${v.seats}`, `Assigned: ${v.assigned} \u00b7 Free: ${spare}`)}
        </div>
        <p class="sm-foot">Credit balance: <b>${$(v.credit)}</b></p>
      </section>

      <div class="row g-3">
        <div class="col-12 col-lg-6"><section class="sm-card h-100" aria-labelledby="ao">
          <div class="sm-hd"><div><h2 class="sm-h" id="ao">Add-ons on the plan</h2><p class="sm-sub">What you hold, billed with each plan: numbers, storage, AI and more.</p></div><button type="button" class="btn btn-brand-o btn-sm" data-a="addon">Add ons</button></div>
          <div class="table-responsive"><table class="table btable sm-t align-middle mb-0"><caption class="visually-hidden">Add-ons on the plan</caption>
            <thead><tr>${th('Add-ons')}${th('Quantity \u00d7 paid')}${th('Status')}</tr></thead>
            <tbody>${v.rows.length ? v.rows.map(r => `<tr><td class="fw-semibold">${esc(r.name)}</td><td>${r.qty} \u00d7 ${$(r.price)} = <b>${$(r.qty * r.price)}</b></td><td>${B.badge('Active', 'ok')}</td></tr>`).join('')
              : '<tr><td colspan="3" class="text-muted">No add-ons on this plan yet. Try them from Add-ons.</td></tr>'}</tbody></table></div></section></div>
        <div class="col-12 col-lg-6"><section class="sm-card h-100" aria-labelledby="pd">
          <div class="sm-hd"><div><h2 class="sm-h" id="pd">Payment details</h2><p class="sm-sub">${cards.length ? 'The card charged for each bill. You can pay by card or by credit.' : 'No card saved. Add one so your plan can renew and numbers can be bought without interruption.'}</p></div><button type="button" class="btn btn-brand-o btn-sm" data-a="pay" ${v.sample ? 'disabled' : ''}>Edit payment details</button></div>
          ${cards.length ? `<div class="table-responsive"><table class="table btable sm-t align-middle mb-0"><caption class="visually-hidden">Payment methods</caption>
            <thead><tr>${th('Card')}${th('Expires')}${th('Status')}</tr></thead>
            <tbody>${cards.length ? cards.map(c => `<tr><td class="fw-semibold">${esc(c.brand)} \u2022\u2022\u2022\u2022 ${esc(c.last4)}</td><td>${esc(c.exp)}</td><td>${B.badge(c.primary ? 'Primary' : 'Saved', c.primary ? 'ok' : 'muted')}</td></tr>`).join('')
              : ''}</tbody></table></div>` : ''}</section></div>
      </div>

      <section class="sm-card" aria-labelledby="ri"><div class="sm-hd"><div><h2 class="sm-h" id="ri">Invoice history</h2><p class="sm-sub">The invoices you are paying for, newest first. Open one for the full invoice.</p></div>
          <button type="button" class="btn btn-brand-o btn-sm" data-a="inv">Invoices</button></div>
        <div id="riTable"></div></section></div>`;

    B.DataTable(p.querySelector('#riTable'), {
      caption: 'Invoice history', toolbar: false, rows: () => inv, searchKeys: ['id', 'status', 'description'], pageSize: 5, idKey: 'id', emptyText: 'No invoices yet.',
      columns: [
        { key: 'date', label: 'Date', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}</span>` },
        { key: 'amount', label: 'Amount', render: r => `<strong>${$(r.amount)}</strong>` },
        { key: 'status', label: 'Status', render: r => B.badge(r.status, B.statusKind(r.status)) },
        { key: 'description', label: 'Description', hide: 'md', render: r => `<span class="sm-desc">${esc(r.description)}</span>` },
        { key: 'id', label: 'Invoice ID', align: 'end', render: r => v.sample ? `<span class="mono">${esc(r.id)}</span>` : `<button type="button" class="btn btn-link p-0 mono" data-act="view" data-id="${esc(r.id)}" title="Open invoice">${esc(r.id)}</button>` }
      ],
      onAction: (a, r) => { const i = S.invoices.find(x => x.id === r.id); if (i) B.showInvoice(i); }
    });

    const act = {
      details: () => B.billDetails(), plan: () => B.go('plan'), ar: () => B.go('credit-payment?tab=auto'), inv: () => B.go('invoices'), lic: () => B.go('licences-resources'), stm: () => B.go('statement'),
      addons: () => B.go('add-ons'), addon: () => B.go('add-ons'), pay: () => B.go('credit-payment'), hist: () => { tab = 'history'; draw(); },
      credits: () => (B.openAddCredits ? B.openAddCredits(draw) : B.go('credit-payment'))
    };
    p.onclick = e => {
      const a = e.target.closest('[data-a]');
      if (a && !a.disabled) { act[a.dataset.a](); return; }
      if (e.target.closest('[data-card]')) B.openCardForm(draw);
    };
  }

  function history(p) {
    p.innerHTML = `<section class="bsub p-3" aria-labelledby="ih">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div><h2 class="sub-title" id="ih">Invoice history</h2><p class="sub-desc">Every charge and payment on the account, newest first. Open a row for the full invoice.</p></div>
        <button type="button" class="btn btn-brand-o" data-go="invoices">Invoices</button></div>
      <div id="histTable"></div></section>`;
    p.querySelector('[data-go]').onclick = () => B.go('invoices');
    B.DataTable(p.querySelector('#histTable'), {
      caption: 'Invoice history', rows: () => S.activity, dateKey: 'date', amountKey: 'amount',
      searchKeys: ['description', 'ref', 'status'], searchPlaceholder: 'Search description or reference',
      filters: [{ key: 'status', label: 'Status', options: ['Paid', 'Failed'] }],
      emptyText: 'No invoices found.', idKey: 'id',
      columns: [
        { key: 'date', label: 'Date', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}</span>` },
        { key: 'amount', label: 'Amount', render: r => $(r.amount) },
        { key: 'status', label: 'Status', render: r => B.badge(r.status, B.statusKind(r.status)) },
        { key: 'description', label: 'Description' },
        { key: 'ref', label: 'Reference', hide: 'md', render: r => `<span class="mono">${esc(r.ref)}</span>` },
        { key: '_act', label: 'Actions', align: 'end' }
      ],
      actions: r => B.actBtn('open', r.id, 'eye', `Open invoice ${r.ref}`),
      // Open shows the same full "Tax Invoice / Receipt" as the Invoices page.
      onAction: (a, r) => B.showInvoice({
        id: r.ref, date: r.date, amount: r.amount, status: r.status, period: '',
        lines: [{ ref: r.ref, name: r.description, sub: B.fmtDate(r.date), qty: `1 × ${$(r.amount)}`, amount: r.amount }]
      })
    });
  }
})(window.Billing);
