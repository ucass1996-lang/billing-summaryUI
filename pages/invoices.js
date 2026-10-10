/* Invoices: searchable, filterable, sortable, paginated; icon actions View / Download / Details. */
(function (B) {
  const S = B.state, esc = B.esc;
  const short = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const day = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const refOf = i => /^\d{12}$/.test(i.id) ? i.id : ('90' + i.id.replace(/\D/g, '') + '000000').slice(0, 12);

  const r2 = n => Math.round(n * 100) / 100;
  const sum = a => r2(a.reduce((s, x) => s + x.amount, 0));
  /* Invoices may carry their own `lines` / `taxes` arrays; otherwise they are derived from the plan. */
  const taxes = i => (i.taxes && i.taxes.length)
    ? i.taxes.map((t, n) => ({ ref: refOf(i).slice(0, 11) + (n + 2), name: t.name, sub: `${Number(t.rate).toFixed(2)}% · ${t.location || S.taxLocation}`, qty: '', amount: t.amount }))
    : [{ ref: refOf(i), name: 'Tax', sub: `0.00% · ${S.taxLocation}`, qty: '', amount: 0 }];
  const lines = i => {
    if (i.lines) return i.lines.map((l, n) => ({ ref: l.ref || refOf(i).slice(0, 11) + n, name: l.name, sub: l.sub || '', qty: l.qty || '', amount: l.amount }));
    const net = r2(i.amount - sum(i.taxes || [])), seats = S.seats * S.plan.rate;
    if (net <= 0) return [];
    const base = Math.min(net, seats), extra = r2(net - base);
    const out = [{ ref: refOf(i), name: S.plan.name, sub: base === seats ? `${S.seats} × ${B.money(S.plan.rate)} a seat` : 'Plan subscription', qty: base === seats ? `${S.seats} × ${B.money(S.plan.rate)}` : `1 × ${B.money(base)}`, amount: base }];
    if (extra > 0) out.push({ ref: refOf(i).slice(0, 11) + '1', name: 'Add-ons and usage', sub: 'Members, top-ups and overage', qty: `1 × ${B.money(extra)}`, amount: extra });
    return out;
  };
  const payments = i => {
    if (i.payments) return i.payments;
    if (i.status !== 'Paid') return [];
    const pm = S.methods.find(m => m.primary) || S.methods[0];
    return [{ name: `Paid by ${pm ? pm.brand + ' Card' : 'Credit Card'} ending ${pm ? pm.last4 : '3339'}`, amount: total(i), type: 'payment' }];
  };
  const received = i => r2(payments(i).reduce((n, p) => n + p.amount, 0));
  const total = i => r2(sum(lines(i)) + sum(taxes(i)));

  const NOTE = { Paid: 'Paid in full', Failed: 'Payment failed · retry from Credit &amp; Payment', Pending: 'Awaiting payment', Overdue: 'Overdue · please pay now', Draft: 'Draft · not issued yet' };
  const emptyRow = msg => `<tr><td colspan="6" class="text-center text-muted py-4">${esc(msg)}</td></tr>`;
  const table = (head, rows, subtotal, label = 'Subtotal, completed charges', cls = '') => `<div class="table-responsive"><table class="table btable align-middle ${cls}"><caption class="visually-hidden">${esc(head)}</caption>
    <thead><tr><th scope="col"><span class="th-static">Date</span></th><th scope="col"><span class="th-static">Reference</span></th><th scope="col"><span class="th-static">Description</span></th><th scope="col"><span class="th-static">Quantity × Rate</span></th><th scope="col"><span class="th-static">Status</span></th><th scope="col" class="text-end"><span class="th-static">Amount</span></th></tr></thead>
    <tbody>${rows}<tr class="inv-sub"><td colspan="5">${esc(label)}</td><td class="text-end">${B.money(subtotal)}</td></tr></tbody></table></div>`;

  /* The full "Tax Invoice / Receipt" document shown by View. */
  const doc = i => {
    const paid = i.status === 'Paid', L = lines(i), T = taxes(i), bi = S.billingInfo, kind = B.statusKind(i.status);
    const row = l => `<tr><td>${day(i.date)}</td><td class="mono">${esc(l.ref)}</td><td><div class="fw-semibold">${esc(l.name)}</div><div class="text-muted small">${esc(l.sub)}</div></td><td class="mono">${esc(l.qty)}</td><td>${B.badge(i.status, kind)}</td><td class="text-end">${B.money(l.amount)}</td></tr>`;
    const rows = L.length ? L.map(row).join('') : emptyRow('No chargeable items on this invoice.');
    const taxRow = T.length ? T.map(row).join('') : emptyRow('No taxes or fees on this invoice.');
    const grand = total(i), P = payments(i);
    const payRow = (p, n) => {
      const neg = p.amount < 0, st = p.type === 'refund' ? 'Refunded' : p.type === 'credit' ? 'Credit' : 'Paid';
      return `<tr><td>${day(i.date)}</td><td class="mono">${n ? refOf(i).slice(0, 10) + String(n + 10) : refOf(i)}</td><td class="fw-semibold">${esc(p.name)}</td><td></td><td>${B.badge(st, p.type === 'refund' ? 'warn' : p.type === 'credit' ? 'info' : 'ok')}</td><td class="text-end mono-amt ${neg ? 'text-danger' : 'text-success'}">${neg ? '− ' : '+ '}${B.money(Math.abs(p.amount))}</td></tr>`;
    };
    const payRows = P.length ? P.map(payRow).join('') : emptyRow('No payments or credits on this invoice.');
    return `<div class="inv-doc">
      <div class="inv-top">
        <div><div class="inv-logo"><img src="assets/logo.svg" alt="Logo"></div>
          <p class="mt-3 mb-3 small">${esc(S.seller.address)}</p><p class="mb-0 small">Email: ${esc(S.seller.email)}</p></div>
        <div><div class="fw-bold">Tax Invoice / Receipt</div>
          <dl class="inv-meta"><dt>Invoice #</dt><dd>${esc(i.id)}</dd><dt>Invoice date</dt><dd>${i.date} 14:14</dd><dt>Billed to</dt><dd>${esc(bi.billedTo || 'NA')}</dd></dl></div></div>
      <div class="inv-addr"><div class="h">Billing address</div><div class="b">${esc(bi.contact || bi.company)}</div></div>

      <section class="inv-card" aria-label="Billing summary"><header><h3>Billing summary <small class="text-muted fw-normal fs-6">${esc(S.plan.name)} · ${S.seats} seats</small></h3></header>
        <div class="p-3"><div class="row g-3">
          <div class="col-12 col-md-4"><div class="tile ${paid ? '' : 'accent'}" style="${paid ? 'border-left:4px solid #0f9d78' : ''}"><div class="eyebrow">${paid ? 'Amount paid' : 'Amount due'}</div><div class="t-val">${B.money(grand)}</div><div class="t-note">${NOTE[i.status] || ''}</div></div></div>
          <div class="col-6 col-md-4"><div class="tile"><div class="eyebrow">Due date</div><div class="t-val">${short(i.date)}</div><div class="t-note">Invoice date</div></div></div>
          <div class="col-6 col-md-4"><div class="tile"><div class="eyebrow">Total tax</div><div class="t-val">${B.money(sum(T))}</div><div class="t-note">Included in the total</div></div></div></div></div></section>

      <section class="inv-card" aria-label="User licences"><header><h3>User licences</h3><p>The plan seats billed this period, with the add-ons that belong to each licence underneath it.</p></header>${table('User licences', rows, sum(L))}</section>
      <section class="inv-card" aria-label="Taxes and fees"><header><h3>Taxes and fees</h3><p>Assessed on the charges above, based on the billing address on the account.</p></header>${table('Taxes and fees', taxRow, sum(T))}</section>
      <section class="inv-card" aria-label="Payments and credits"><header><h3>Payments and credits</h3><p>Money that came into the account this period, and credit applied to it, less refunds paid back.</p></header>${table('Payments and credits', payRows, received(i), 'Received, less refunds', 'pay-table')}</section></div>`;
  };

  const text = i => {
    const row = (n, a) => `${n.padEnd(46)} ${B.money(a)}`;
    return `INVOICE ${i.id}\nInvoice date: ${B.fmtDate(i.date)}\nStatus: ${i.status}\nBilled to: ${S.billingInfo.billedTo || 'NA'}\n\n` +
      'USER LICENCES\n' + (lines(i).map(l => row(l.name + (l.qty ? ' (' + l.qty + ')' : ''), l.amount)).join('\n') || 'None') + '\n\n' +
      'TAXES AND FEES\n' + taxes(i).map(t => row(t.name + ' (' + t.sub + ')', t.amount)).join('\n') + '\n\n' +
      'PAYMENTS AND CREDITS\n' + (payments(i).map(p => row(p.name, p.amount)).join('\n') || 'None') + '\n' + row('Received, less refunds', received(i)) + '\n\n' +
      `Total: ${B.money(total(i))}\n`;
  };

  const download = i => { B.download(`${i.id}.txt`, text(i)); B.toast(`${i.id} downloaded.`); };
  B.downloadInvoice = download;

  /* Receipt sheet: paper-style invoice with a status stamp, details strip, line items and totals at the right.
     Used by "Download invoice" on the Plan page. Footer: Close + Download invoice. */
  const receipt = i => {
    const L = lines(i), T = taxes(i), P = payments(i), bi = S.billingInfo;
    const subtotal = sum(L), tax = sum(T), grand = total(i), got = received(i), due = r2(grand - got);
    const kind = B.statusKind(i.status);
    const item = l => `<tr><td><div class="fw-semibold">${esc(l.name)}</div>${l.sub ? `<div class="rc-mute">${esc(l.sub)}</div>` : ''}</td><td class="rc-num">${esc(l.qty) || '—'}</td><td class="rc-num">${B.money(l.amount)}</td></tr>`;
    const payRow = p => { const neg = p.amount < 0; return `<tr><td>${day(i.date)}</td><td class="fw-semibold">${esc(p.name)}</td><td>${B.badge(p.type === 'refund' ? 'Refunded' : p.type === 'credit' ? 'Credit' : 'Paid', p.type === 'refund' ? 'warn' : p.type === 'credit' ? 'info' : 'ok')}</td><td class="rc-num ${neg ? 'text-danger' : 'text-success'}">${neg ? '− ' : '+ '}${B.money(Math.abs(p.amount))}</td></tr>`; };
    return `<div class="rc"><div class="rc-sheet">
      <div class="rc-band"></div>
      <div class="rc-head">
        <div class="rc-from"><img src="assets/logo.svg" alt="Logo"><p>${esc(S.seller.address)}<br>${esc(S.seller.email)}</p></div>
        <div class="rc-title"><h2>Tax invoice</h2><span class="rc-stamp ${kind}">${esc(i.status)}</span></div>
      </div>
      <dl class="rc-meta">
        <div><dt>Invoice number</dt><dd>${esc(i.id)}</dd></div>
        <div><dt>Invoice date</dt><dd>${short(i.date)}</dd></div>
        <div><dt>Billed to</dt><dd>${esc(bi.billedTo || 'NA')}</dd></div>
        <div><dt>Billing address</dt><dd>${esc(bi.contact || bi.company)}</dd></div>
      </dl>
      <section class="rc-sec" aria-label="Line items"><h3>Items</h3><div class="rc-scroll"><table class="rc-table"><caption class="visually-hidden">Invoice items</caption>
        <thead><tr><th scope="col">Description</th><th scope="col" class="rc-num">Qty × rate</th><th scope="col" class="rc-num">Amount</th></tr></thead>
        <tbody>${L.length ? L.map(item).join('') : '<tr><td colspan="3" class="rc-mute">No chargeable items on this invoice.</td></tr>'}
        ${T.map(t => item({ name: t.name, sub: t.sub, qty: '', amount: t.amount })).join('')}</tbody></table></div></section>
      <div class="rc-totals">
        <div><span>Subtotal</span><b>${B.money(subtotal)}</b></div>
        <div><span>Tax</span><b>${B.money(tax)}</b></div>
        <div class="grand"><span>Total</span><b>${B.money(grand)}</b></div>
        <div><span>Received, less refunds</span><b>${B.money(got)}</b></div>
        <div class="due ${due > 0 ? 'owing' : ''}"><span>${due > 0 ? 'Balance due' : 'Balance'}</span><b>${B.money(due)}</b></div>
      </div>
      <section class="rc-sec" aria-label="Payments and credits"><h3>Payments and credits</h3><div class="rc-scroll"><table class="rc-table"><caption class="visually-hidden">Payments and credits</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Status</th><th scope="col" class="rc-num">Amount</th></tr></thead>
        <tbody>${P.length ? P.map(payRow).join('') : '<tr><td colspan="4" class="rc-mute">No payments or credits on this invoice.</td></tr>'}</tbody></table></div></section>
      <p class="rc-note">${i.status === 'Paid' ? 'Thank you. This invoice has been paid in full.' : esc((NOTE[i.status] || '').replace('&amp;', '&'))}</p>
    </div></div>`;
  };

  B.showReceipt = i => {
    const m = B.modal({ title: `Invoice ${i.id}`, size: 'modal-xl', body: receipt(i),
      footer: '<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Close</button><button type="button" class="btn btn-brand" data-dl>Download invoice</button>' });
    m.el.classList.add('rc-modal');
    m.el.querySelector('[data-dl]').onclick = () => download(i);
  };

  /* an invoice-shaped object for a row of the account activity list (the "last payment") */
  B.activityInvoice = r => ({ id: r.ref, date: r.date, amount: r.amount, status: r.status, period: '',
    lines: [{ ref: r.ref, name: r.description, sub: B.fmtDate(r.date), qty: `1 × ${B.money(r.amount)}`, amount: r.amount }] });

  /* compact summary on top of the invoice popup */
  const summary = i => `<div class="inv-sum" role="group" aria-label="Invoice summary">
    <div class="inv-sum-i"><span>Invoice</span><b class="mono">${esc(i.id)}</b></div>
    <div class="inv-sum-i"><span>Billing date</span><b>${B.fmtDate(i.date)}</b></div>
    <div class="inv-sum-i"><span>Due date</span><b>${B.fmtDate(B.dueDate ? B.dueDate(i.date) : i.date)}</b></div>
    <div class="inv-sum-i"><span>Status</span><b>${B.badge(i.status, B.statusKind(i.status))}</b></div>
    <div class="inv-sum-i tot"><span>Total</span><b>${B.money(total(i))}</b></div></div>`;

  B.showInvoice = i => {
    const m = B.modal({ title: `Invoice ${i.id}`, size: 'modal-xl inv-modal', body: `${summary(i)}${doc(i)}`, bare: true });
    m.el.querySelector('.modal-content').insertAdjacentHTML('afterbegin', `<button type="button" class="btn-ico modal-bare-dl" data-dl title="Download invoice" aria-label="Download invoice">${B.icon('download', 15)}</button>`);
    m.el.querySelector('[data-dl]').onclick = () => download(i);
  };

  /* ---- the Invoices page: one searchable ledger, with add-on purchases on their own tab ---- */
  const isAddon = d => /did purchase|add-on|addon|usage charges|number/i.test(d);
  const ledger = () => S.activity.map(a => ({ id: 'a' + a.id, kind: 'act', date: a.date, number: a.ref, amount: a.amount, description: a.description, payment: 'Credit Card', status: a.status, src: a }))
    .concat(S.invoices.filter(i => i.status !== 'Draft').map(i => ({ id: i.id, kind: 'inv', date: i.date, number: i.id, amount: i.amount, description: `Invoice for ${i.period || 'the billing period'}`, payment: 'Credit Card', status: i.status, src: i })))
    .sort((x, y) => y.date.localeCompare(x.date) || String(y.number).localeCompare(String(x.number)));
  let invTab = 'invoices', invDt, invFit;
  const PERIODS = [['', 'All time'], ['30', 'Last 30 days'], ['month', 'This month'], ['90', 'Last 3 months'], ['year', 'This year']];
  const sinceOf = v => { const t = new Date(S.today + 'T00:00:00'); if (v === '30') t.setDate(t.getDate() - 29); else if (v === '90') t.setDate(t.getDate() - 89); else if (v === 'month') t.setDate(1); else if (v === 'year') { t.setMonth(0); t.setDate(1); } else return ''; return t.toISOString().slice(0, 10); };

  B.pages.invoices = {
    title: 'Invoices',
    desc: 'Plan, seat, number and usage charges. Add-on purchases sit on the other tab.',
    actions: `<button type="button" class="btn-ico inv-export" id="invExport" title="Export CSV" aria-label="Export the listed invoices as CSV">${B.icon('download', 18)}</button>`,
    bind(root) {
      invTab = 'invoices';
      root.querySelector('#invExport').onclick = () => {
        const r = invDt ? invDt.filtered() : []; if (!r.length) return B.toast('There is nothing to export with these filters.', 'error', 'Nothing to export');
        B.download('invoices.csv', B.csv(['Date', 'Invoice number', 'Amount', 'Description', 'Payment method', 'Status'], r.map(x => [x.date, x.number, x.amount.toFixed(2), x.description, x.payment, x.status])), 'text/csv');
        B.toast(`${r.length} row${r.length === 1 ? '' : 's'} exported.`, 'ok', 'Export ready');
      };
    },
    render(el) {
      el.innerHTML = `<div class="inv-kpis" id="invKpis" role="group" aria-label="Filter by status"></div><section class="bcard inv-card" data-plain>
        <div class="inv-bar"><div class="inv-search"><span class="inv-si">${B.icon('search', 15)}</span><label class="visually-hidden" for="invQ">Search by invoice number</label><input id="invQ" type="search" class="form-control" placeholder="Search by invoice number" autocomplete="off"></div>
          <div class="inv-filters"><label class="visually-hidden" for="invPeriod">Period</label><select id="invPeriod" class="form-select">${PERIODS.map(p => `<option value="${p[0]}">${p[1]}</option>`).join('')}</select>
            <label class="visually-hidden" for="invStatus">Status</label><select id="invStatus" class="form-select"><option value="">Select status</option>${['Paid', 'Failed', 'Pending', 'Overdue'].map(x => `<option>${x}</option>`).join('')}</select>
            <button type="button" class="btn btn-brand-o btn-sm" id="invReset">Reset</button></div></div>
        <div class="tabs inv-tabs" role="tablist" aria-label="Invoice types"><button type="button" role="tab" class="tab active" aria-selected="true" data-it="invoices">Invoices</button><button type="button" role="tab" class="tab" aria-selected="false" data-it="addon">Add-on invoices</button></div>
        <div id="iTable"></div></section>`;
      invDt = B.DataTable(el.querySelector('#iTable'), {
        caption: 'Invoices', toolbar: false, compactPager: true, pageSize: 25, idKey: 'id', dateKey: 'date', searchKeys: ['number', 'description', 'status'],
        filters: [{ key: 'status', label: 'Status', options: ['Paid', 'Failed', 'Pending', 'Overdue'] }],
        rows: () => ledger().filter(r => invTab === 'addon' ? isAddon(r.description) : !isAddon(r.description)),
        emptyText: 'No invoices found.',
        columns: [
          { key: 'date', label: 'Date', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}</span>` },
          { key: 'number', label: 'Invoice number', render: r => `<span class="mono inv-no">${esc(r.number)}</span>` },
          { key: 'amount', label: 'Amount', align: 'end', render: r => `<strong>${B.money(r.amount)}</strong>` },
          { key: 'description', label: 'Description', render: r => `<div class="inv-d">${esc(r.description)}</div>${r.description.length > 46 ? '<button type="button" class="btn btn-link p-0 inv-more" aria-expanded="false">Read More</button>' : ''}` },
          { key: 'payment', label: 'Payment method', hide: 'md', render: r => `<span class="text-nowrap">${esc(r.payment)}</span>` },
          { key: 'status', label: 'Status', render: r => B.badge(r.status, B.statusKind(r.status)) },
          { key: '_act', label: 'Action', align: 'end' }
        ],
        actions: r => B.actBtn('view', r.id, 'eye', `View invoice ${r.number}`),
        onAction: (a, r) => { const row = ledger().find(x => x.id === r.id); if (row) B.showInvoice(row.kind === 'inv' ? row.src : B.activityInvoice(row.src)); }
      });
      /* status cards: counts and amounts for the current tab; a click filters the table to that status */
      const KP = [['Paid', 'Paid', 'ok', 'wallet'], ['Pending', 'Pending', 'warn', 'clock'], ['Overdue', 'Overdue', 'bad', 'bell'], ['Failed', 'Failed', 'bad', 'refresh']];
      const tabRows = () => ledger().filter(r => invTab === 'addon' ? isAddon(r.description) : !isAddon(r.description));
      const paintKpis = () => {
        const rows = tabRows(), cur = invDt.state.filters.status || '';
        el.querySelector('#invKpis').innerHTML = KP.map(k => { const r = rows.filter(x => x.status === k[0]); return `<button type="button" class="inv-kpi k-${k[2]} ${cur === k[0] ? 'on' : ''}" data-ks="${k[0]}" aria-pressed="${cur === k[0]}"><span class="inv-ki">${B.icon(k[3], 18)}</span><span class="inv-kt"><small>${k[1]} invoices</small><b>${B.money(r2(r.reduce((n, x) => n + x.amount, 0)))}</b><em>${r.length} invoice${r.length === 1 ? '' : 's'}</em></span></button>`; }).join('');
      };
      const setStatus = v => { invDt.state.filters.status = v; el.querySelector('#invStatus').value = v; invDt.state.page = 1; invDt.refresh(); paintKpis(); };
      paintKpis();
      el.querySelector('#invKpis').addEventListener('click', e => { const b = e.target.closest('[data-ks]'); if (b) setStatus(invDt.state.filters.status === b.dataset.ks ? '' : b.dataset.ks); });
      /* size the card to the space that is visible, so the table body scrolls and the pager is always on screen */
      const card = el.querySelector('.inv-card'), view = document.getElementById('view');
      const fit = () => {
        if (!card.isConnected) return window.removeEventListener('resize', fit);
        if (window.innerWidth >= 768) { const top = card.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop; card.style.height = Math.max(440, view.clientHeight - top - 28) + 'px'; }
        else card.style.height = Math.max(460, window.innerHeight - 56 - 28) + 'px';
      };
      if (invFit) window.removeEventListener('resize', invFit);
      invFit = fit; window.addEventListener('resize', fit); fit(); setTimeout(fit, 120);
      const st = invDt.state, go = () => { st.page = 1; invDt.refresh(); };
      el.querySelector('#invQ').addEventListener('input', e => { st.q = e.target.value; go(); });
      el.querySelector('#invPeriod').addEventListener('change', e => { st.from = sinceOf(e.target.value); go(); });
      el.querySelector('#invStatus').addEventListener('change', e => { st.filters.status = e.target.value; go(); paintKpis(); });
      el.querySelector('#invReset').onclick = () => { st.q = ''; st.from = ''; st.to = ''; st.filters = {}; el.querySelector('#invQ').value = ''; el.querySelector('#invPeriod').value = ''; el.querySelector('#invStatus').value = ''; go(); paintKpis(); };
      el.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { invTab = b.dataset.it; el.querySelectorAll('[data-it]').forEach(t => { const on = t === b; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); }); go(); paintKpis(); });
      el.querySelector('#iTable').addEventListener('click', e => {
        const tr = e.target.closest('tbody tr');
        if (tr && !e.target.closest('button, a, input, select, .dropdown')) { const v = tr.querySelector('[data-act="view"]'); if (v) return v.click(); }
        const m = e.target.closest('.inv-more'); if (!m) return; const d = m.previousElementSibling, open = !d.classList.contains('open');
        d.classList.toggle('open', open); m.textContent = open ? 'Show less' : 'Read More'; m.setAttribute('aria-expanded', open);
      });
    }
  };
})(window.Billing);
