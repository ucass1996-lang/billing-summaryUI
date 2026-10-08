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
    title: 'Billing summary',
    desc: 'What you are paying for, what is due next, and what you have paid before.',
    actions: '<button type="button" class="btn btn-brand-o rounded-pill" id="exampleBtn" aria-pressed="false">Show an example</button>',
    bind(root) {
      example = false; tab = 'current';
      const b = root.querySelector('#exampleBtn');
      b.onclick = () => {
        example = !example; b.textContent = example ? 'Show my real billing' : 'Show an example'; b.setAttribute('aria-pressed', example);
        if (host) { tab = 'current'; draw(); }
      };
    },
    render(el) { host = el; draw(); }
  };

  function draw() {
    host.innerHTML = `<div class="bcard overflow-hidden">
      <div class="tabs" role="tablist" aria-label="Billing views">
        <button type="button" role="tab" class="tab ${tab === 'current' ? 'active' : ''}" aria-selected="${tab === 'current'}" data-tab="current">Current billing</button>
        <button type="button" role="tab" class="tab ${tab === 'history' ? 'active' : ''}" aria-selected="${tab === 'history'}" data-tab="history">Invoice history</button>
      </div><div class="p-3" role="tabpanel" id="panel"></div></div>`;
    host.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    const panel = host.querySelector('#panel');
    tab === 'current' ? current(panel) : history(panel);
  }

  const r2 = n => Math.round(n * 100) / 100;
  const QA = [['plan', 'Change plan', 'plan'], ['lic', 'Manage licences', 'licences'], ['addon', 'Add an add-on', 'addons'], ['pay', 'Update payment', 'payment'], ['inv', 'View invoices', 'invoices']];

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
    const v = model(), bd = v.bd, hasCard = S.methods.length > 0, spare = Math.max(0, v.seats - v.assigned);
    const tile = (label, val, note, cls = '') => `<div class="tile ${cls}"><div class="eyebrow">${label}</div><div class="t-val ${val.length > 14 ? 'sm' : ''}">${val}</div><div class="t-note">${note}</div></div>`;
    const bk = (n, sub, val, cls = '') => `<div class="bk-row ${cls}"><div><div class="bk-n">${n}</div>${sub ? `<div class="bk-s">${sub}</div>` : ''}</div><div class="bk-v">${val}</div></div>`;
    const usageSub = v.overage.length ? v.overage.map(o => `${esc(o.name)}: ${B.num(o.qty)} ${esc(o.unit)} over`).join(' · ') : 'Within every included allowance';
    p.innerHTML = `<div class="d-grid gap-3">
      ${v.sample ? `<div class="alert-warn" role="status"><div><h2>${esc(EX.banner.split('. ')[0])}.</h2><p>${esc(EX.banner.slice(EX.banner.indexOf('. ') + 2))}</p></div></div>`
        : hasCard ? '' : `<div class="alert-warn" role="alert"><div><h2>No payment method saved</h2><p>Everything works today, but the next bill has nothing to charge and the account will go on hold when it is due. Saving a card now avoids that.</p></div><button type="button" class="btn btn-brand-o" data-card>Add a card</button></div>`}

      <section aria-label="Billing at a glance"><div class="row g-3">
        <div class="col-12 col-sm-6 col-xl-3">${tile('Current plan', esc(v.planName), `${v.seats} seats · ${$(v.rate)} a seat${v.scheduled ? ` · moving to ${esc(v.scheduled.name)} on ${B.fmtDate(v.scheduled.effective)}` : ''}`, 'accent')}</div>
        <div class="col-12 col-sm-6 col-xl-3">${tile('Next bill due', esc(v.next), `Estimated ${$(bd.total)} including usage and tax`)}</div>
        <div class="col-12 col-sm-6 col-xl-3">${tile('Billing cycle', esc(v.cycle), `Period ${esc(v.period)}`)}</div>
        <div class="col-12 col-sm-6 col-xl-3">${tile('Licences', `${v.assigned} of ${v.seats}`, `Assigned; ${spare ? spare + ' spare' : 'none spare'}`)}</div>
        <div class="col-12 col-sm-6 col-xl-4">${tile('Active add-ons', String(v.rows.length), v.rows.length ? `${$(bd.addons)} a month` : 'None on the plan yet')}</div>
        <div class="col-12 col-sm-6 col-xl-4">${tile('Available credit', $(v.credit), 'Shared across the company; pays for usage beyond the plan')}</div>
        <div class="col-12 col-sm-6 col-xl-4">${tile('Outstanding amount', $(v.outstanding), v.outstanding > 0 ? `${v.outstandingCount} unpaid invoice${v.outstandingCount === 1 ? '' : 's'}: Failed, Pending or Overdue` : 'Nothing owed. You are paid up.')}</div>
      </div></section>

      <div class="row g-3">
        <div class="col-12 col-xl-7"><section class="bsub p-3 h-100" aria-labelledby="bb">
          <h2 class="sub-title" id="bb">Billing breakdown</h2><p class="sub-desc mb-2">How the next bill adds up.</p>
          ${bk('Plan charges', `${v.assigned} assigned seat${v.assigned === 1 ? '' : 's'} × ${$(v.rate)}`, $(bd.plan))}
          ${bk('Licence charges', `${spare} unassigned seat${spare === 1 ? '' : 's'} × ${$(v.rate)}`, $(bd.licence))}
          ${bk('Add-on charges', `${v.rows.length} active add-on${v.rows.length === 1 ? '' : 's'}`, $(bd.addons))}
          ${bk('Usage charges', usageSub, $(bd.usage))}
          ${bk('Discounts', 'None applied this period', $(-bd.discount))}
          ${bk('Taxes', `GST 5% + State levy 2% on ${$(bd.subtotal)}`, $(bd.tax))}
          ${bk('Total', '', $(bd.total), 'bk-total')}
        </section></div>
        <div class="col-12 col-xl-5"><section class="bsub p-3 h-100" aria-labelledby="nb">
          <h2 class="sub-title" id="nb">Next bill</h2><p class="sub-desc">Charged to the card on file on the payment date.</p>
          <div class="nb-amount my-3">${$(bd.total)}</div>
          <dl class="kv mb-3"><dt>Billing period</dt><dd>${esc(v.period)}</dd><dt>Next payment date</dt><dd>${esc(v.next)}</dd><dt>Payment method</dt><dd>${v.pay.last4 ? esc(v.pay.text) : '<span class="text-muted fw-normal">No card saved</span>'}</dd></dl>
          <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-brand-o" data-a="details" ${v.sample ? 'disabled' : ''}>View details</button><button type="button" class="btn btn-brand" data-a="plan">Change plan</button></div>
        </section></div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-xl-7"><section class="bsub overflow-hidden h-100" aria-labelledby="ri">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 p-3 pb-2"><div><h2 class="sub-title" id="ri">Recent invoices</h2><p class="sub-desc">Your latest five. Open one for the full invoice.</p></div>
            <button type="button" class="btn btn-brand-o btn-sm" data-a="inv">All invoices</button></div>
          <div class="table-responsive"><table class="table btable align-middle mb-0"><caption class="visually-hidden">Recent invoices</caption>
            <thead><tr><th scope="col"><span class="th-static">Invoice</span></th><th scope="col"><span class="th-static">Date</span></th><th scope="col" class="d-none d-md-table-cell"><span class="th-static">Due date</span></th><th scope="col"><span class="th-static">Amount</span></th><th scope="col"><span class="th-static">Status</span></th><th scope="col" class="text-end"><span class="th-static">Actions</span></th></tr></thead>
            <tbody>${v.invoices.map(i => `<tr><td><span class="mono fw-bold">${esc(i.id)}</span></td><td class="text-nowrap">${B.fmtDate(i.date)}</td><td class="text-nowrap d-none d-md-table-cell">${B.fmtDate(B.dueDate(i.date))}</td><td><strong>${$(i.amount)}</strong></td><td>${B.badge(i.status, B.statusKind(i.status))}</td>
              <td class="text-end">${v.sample ? '<span class="text-muted small">Sample</span>' : `<div class="d-flex flex-nowrap gap-1 justify-content-end">${B.actBtn('view', i.id, 'eye', `View invoice ${i.id}`)}${B.actBtn('download', i.id, 'download', `Download invoice ${i.id}`)}</div>`}</td></tr>`).join('')}</tbody></table></div>
        </section></div>
        <div class="col-12 col-xl-5 d-grid gap-3 align-content-start">
          <section class="bsub p-3" aria-labelledby="pd">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2"><div><h2 class="sub-title" id="pd">Payment details</h2><p class="sub-desc">The card used for renewals and top-ups.</p></div>${B.badge(v.pay.status[0], v.pay.status[1])}</div>
            ${v.pay.last4 ? `<div class="pm-line mb-3"><span class="pm-chip">${B.icon('card', 18)}</span><div><div class="fw-semibold">${esc(v.pay.text)}</div><div class="text-muted small">Last 4 digits ${esc(v.pay.last4)} · expires ${esc(v.pay.exp)}</div></div></div>${S.failed > 0 && !v.sample ? `<p class="small text-muted">${$(S.failed)} in failed payments needs another attempt.</p>` : ''}`
              : '<p class="text-muted small">No card saved. Add one so your plan can renew without interruption.</p>'}
            <button type="button" class="btn btn-brand-o" data-a="pay" ${v.sample ? 'disabled' : ''}>${v.pay.last4 ? 'Update payment' : 'Add a card'}</button>
          </section>
          ${B.autoRechargeCard(v.sample)}
          <section class="bsub p-3" aria-labelledby="qa"><h2 class="sub-title mb-3" id="qa">Quick actions</h2>
            <div class="qa-grid">${QA.map(q => `<button type="button" class="qa-btn" data-a="${q[0]}">${B.icon(q[2], 16)}<span>${q[1]}</span></button>`).join('')}</div></section>
        </div>
      </div>

      <section class="bsub overflow-hidden" aria-labelledby="ao">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 p-3">
          <div><h2 class="sub-title" id="ao">Add-ons on the plan</h2><p class="sub-desc">What you hold now, billed with the plan each period. Numbers, storage, AI and per-seat extras.</p></div>
          <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-brand-o" id="aoToggle" aria-expanded="false" aria-controls="aoBody">View details (${v.rows.length})</button><button type="button" class="btn btn-brand-o" data-a="addon">Add an add-on</button></div>
        </div>
        <div class="table-responsive" id="aoBody" hidden><table class="table btable align-middle"><caption class="visually-hidden">Add-ons on the plan</caption>
          <thead><tr><th scope="col"><span class="th-static">Add-on</span></th><th scope="col"><span class="th-static">Quantity × Rate</span></th><th scope="col" class="text-end"><span class="th-static">Amount</span></th></tr></thead>
          <tbody>${v.rows.length ? v.rows.map(r => `<tr><td><div class="fw-semibold">${esc(r.name)}</div>${r.sub ? `<div class="text-muted small">${esc(r.sub)}</div>` : ''}</td><td class="mono">${r.qty} × ${$(r.price)}</td><td class="text-end fw-bold">${$(r.qty * r.price)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-muted small">No add-ons on this plan yet. Buy them from Add-ons.</td></tr>'}</tbody></table></div>
      </section></div>`;

    host.querySelector('#aoToggle').onclick = e => { const b = host.querySelector('#aoBody'), open = b.hidden; b.hidden = !open; e.currentTarget.setAttribute('aria-expanded', open); e.currentTarget.textContent = open ? 'Hide details' : `View details (${v.rows.length})`; };
    const act = {
      details: () => B.billDetails(), plan: () => B.go('plan'), ar: () => B.go('credit-payment?tab=auto'), inv: () => B.go('invoices'), lic: () => B.go('licences-resources'),
      addon: () => B.openAddAddon(draw), pay: () => (v.pm ? B.openCardForm(draw, v.pm) : B.openCardForm(draw))
    };
    p.onclick = e => {
      const a = e.target.closest('[data-a]');
      if (a && !a.disabled) { act[a.dataset.a](); return; }
      const r = e.target.closest('[data-act][data-id]');
      if (r && !v.sample) { const inv = S.invoices.find(i => i.id === r.dataset.id); if (inv) r.dataset.act === 'view' ? B.showInvoice(inv) : B.downloadInvoice(inv); return; }
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
