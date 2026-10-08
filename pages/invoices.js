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

  B.showInvoice = i => {
    const m = B.modal({ title: `Invoice ${i.id}`, size: 'modal-xl', body: doc(i), bare: true });
    m.el.querySelector('.modal-content').insertAdjacentHTML('afterbegin', `<button type="button" class="btn-ico modal-bare-dl" data-dl title="Download invoice" aria-label="Download invoice">${B.icon('download', 15)}</button>`);
    m.el.querySelector('[data-dl]').onclick = () => download(i);
  };

  B.pages.invoices = {
    title: 'Invoices',
    desc: 'Search, view and download your invoices.',
    render(el) {
      el.innerHTML = '<section class="bcard p-3"><div id="iTable"></div></section>';
      B.DataTable(el.querySelector('#iTable'), {
        caption: 'Invoices', rows: () => S.invoices.map(i => Object.assign({}, i, { amountText: i.amount.toFixed(2) })), idKey: 'id', dateKey: 'date', amountKey: 'amount',
        searchKeys: ['id', 'customer', 'period', 'status', 'amountText'], searchPlaceholder: 'Search invoice number, customer or period',
        filters: [{ key: 'status', label: 'Status', options: ['Paid', 'Pending', 'Overdue', 'Draft', 'Failed'] }],
        emptyText: 'No invoices found.',
        columns: [
          { key: 'id', label: 'Invoice #', render: r => `<span class="mono fw-bold">${esc(r.id)}</span>` },
          { key: 'customer', label: 'Customer', hide: 'lg' },
          { key: 'period', label: 'Billing period', hide: 'md' },
          { key: 'date', label: 'Invoice date', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}</span>` },
          { key: 'amount', label: 'Amount', render: r => `<strong>${B.money(r.amount)}</strong>` },
          { key: 'status', label: 'Status', render: r => B.badge(r.status, B.statusKind(r.status)) },
          { key: '_act', label: 'Actions', align: 'end' }
        ],
        actions: r => B.actBtn('view', r.id, 'eye', `View invoice ${r.id}`) + B.actBtn('download', r.id, 'download', `Download invoice ${r.id}`) + B.actBtn('details', r.id, 'info', `Details for invoice ${r.id}`),
        onAction: (a, r) => {
          if (a === 'download') download(r);
          else if (a === 'view') B.showInvoice(r);
          else B.info(`Details · ${r.id}`, `<dl class="kv"><dt>Billing period</dt><dd>${esc(r.period)}</dd><dt>Invoice date</dt><dd>${B.fmtDate(r.date)}</dd><dt>Status</dt><dd>${B.badge(r.status, B.statusKind(r.status))}</dd><dt>Amount</dt><dd>${B.money(r.amount)}</dd><dt>Customer</dt><dd>${esc(r.customer)}</dd><dt>Payment</dt><dd>${r.status === 'Paid' ? 'Collected' : (NOTE[r.status] || '')}</dd></dl>`);
        }
      });
    }
  };
})(window.Billing);
