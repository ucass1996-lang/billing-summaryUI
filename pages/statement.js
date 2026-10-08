/* Statement: balance summary + sortable/filterable ledger, CSV download and print. */
(function (B) {
  const S = B.state, esc = B.esc;
  let dt;

  B.pages.statement = {
    title: 'Statement',
    desc: 'A ledger of every charge, credit and payment on the account.',
    actions: '<button type="button" class="btn btn-brand-o" id="dl">Download Statement</button><button type="button" class="btn btn-brand" id="pr">Print Statement</button>',
    bind(root) {
      root.querySelector('#dl').onclick = () => {
        if (!dt) return;
        const rows = dt.filtered();
        if (!rows.length) return B.toast('There are no transactions to download.', 'error');
        B.download('statement.csv', B.csv(['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'],
          rows.map(r => [r.date, r.description, r.ref, r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2)])), 'text/csv');
        B.toast('Statement downloaded.');
      };
      root.querySelector('#pr').onclick = () => window.print();
    },
    render(el) {
      const rows = B.calc.ledgerRows();
      const sum = t => rows.filter(r => r.type === t).reduce((s, r) => s + (r.credit || r.debit), 0);
      const closing = rows.length ? rows[rows.length - 1].balance : 0;
      const tiles = [['Opening balance', B.money(0)], ['Charges', B.money(sum('charge'))], ['Credits', B.money(sum('credit'))], ['Payments', B.money(sum('payment'))], ['Adjustments', B.money(sum('adjustment'))], ['Closing balance', B.money(closing) + ' CR']];
      el.innerHTML = `<div class="row g-3 mb-4">${tiles.map((t, i) => `<div class="col-6 col-md-4 col-xl-2"><div class="tile ${i === 5 ? 'accent' : ''}"><div class="eyebrow">${t[0]}</div><div class="t-val sm">${t[1]}</div></div></div>`).join('')}</div>
        <section class="bcard p-3"><h2 class="sub-title mb-3">Transaction ledger</h2><div id="sTable"></div></section>`;
      dt = B.DataTable(el.querySelector('#sTable'), {
        caption: 'Transaction ledger', rows: () => B.calc.ledgerRows().reverse(), dateKey: 'date',
        searchKeys: ['description', 'ref'], searchPlaceholder: 'Search description or reference', emptyText: 'No transactions found.',
        columns: [
          { key: 'date', label: 'Date', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}</span>` },
          { key: 'description', label: 'Description' },
          { key: 'ref', label: 'Reference', hide: 'md', render: r => `<span class="mono">${esc(r.ref)}</span>` },
          { key: 'debit', label: 'Debit', align: 'end', render: r => r.debit ? `<span class="text-danger fw-semibold">${B.money(r.debit)}</span>` : '—' },
          { key: 'credit', label: 'Credit', align: 'end', render: r => r.credit ? `<span class="text-success fw-semibold">${B.money(r.credit)}</span>` : '—' },
          { key: 'balance', label: 'Balance', align: 'end', render: r => `<strong>${B.money(r.balance)}</strong>` }
        ]
      });
    }
  };
})(window.Billing);
