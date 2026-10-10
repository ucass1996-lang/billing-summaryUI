/* Usage: period summary, plan inclusions with rates, where the charges went, and the usage records. */
(function (B) {
  const S = B.state, esc = B.esc, $ = B.money;
  const RANGES = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['period', 'This period']];
  let host, range = '7', showBreak = true, dt;

  const startOf = () => {
    if (range === 'period') return S.period.start;
    const d = new Date(S.today + 'T00:00:00'); d.setDate(d.getDate() - Number(range) + 1);
    return d.toISOString().slice(0, 10);
  };
  const inRange = () => S.usageHistory.filter(r => r.date >= startOf());
  const rate = r => '$' + r.toFixed(r < 0.1 ? 4 : 2);
  const callsOf = r => Math.max(1, Math.round(r.qty / 8));   // demo: about 8 minutes a call
  const talk = mins => mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  const label = () => RANGES.find(r => r[0] === range)[1];

  B.pages.usage = {
    title: 'Usage',
    desc: `What you have used against your plan, and what it cost. Billing period ${B.fmtDate(S.period.start)} – ${B.fmtDate(S.period.end)}.`,
    sticky: true,
    actions: '<button type="button" class="btn btn-brand-o" id="exportCsv">Export CSV</button>',
    controls: `<label class="visually-hidden" for="rangeSel">Date range</label><select id="rangeSel" class="form-select w-auto">${RANGES.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('')}</select>`,
    bind() {
      range = '7'; showBreak = true;
      const sel = document.querySelector('#rangeSel'); sel.value = range;
      sel.onchange = e => { range = e.target.value; draw(); };
      document.querySelector('#exportCsv').onclick = () => {
        const rows = inRange();
        if (!rows.length) return B.toast('There is no usage in this range to export.', 'error');
        B.download('usage.csv', B.csv(['Date', 'Usage type', 'Quantity', 'Unit', 'Included', 'Overage', 'Charge'], rows.map(r => [r.date, r.type, r.qty, r.unit, r.included, r.overage, r.charge.toFixed(2)])), 'text/csv');
        B.toast('Usage exported.');
      };
    },
    render(el) { host = el; draw(); }
  };

  function draw() {
    if (!host || !host.isConnected) return;
    const rows = inRange(), charged = Math.round(rows.reduce((s, r) => s + r.charge, 0) * 100) / 100;
    const voice = rows.filter(r => r.type === 'Voice'), calls = voice.reduce((n, r) => n + callsOf(r), 0), mins = voice.reduce((s, r) => s + r.qty, 0);
    const sms = rows.filter(r => r.type === 'SMS').reduce((s, r) => s + r.qty, 0);
    // demo attribution: usage records carry no user, so charged records are shared out across the active licences
    const people = S.licences.filter(l => l.status === 'Active').map(l => l.user);
    const who = {}, where = {};
    rows.filter(r => r.charge > 0).forEach(r => {
      const n = people.length ? people[r.id % people.length] : 'Unassigned';
      who[n] = (who[n] || 0) + r.charge; where[r.type] = (where[r.type] || 0) + r.charge;
    });
    const dir = { Outbound: { spent: 0, calls: 0, mins: 0 }, Inbound: { spent: 0, calls: 0, mins: 0 } };
    voice.forEach(r => { const d = dir[r.id % 2 === 0 ? 'Outbound' : 'Inbound']; d.spent += r.charge; d.calls += callsOf(r); d.mins += r.qty; });
    const share = v => charged ? Math.round(v / charged * 100) : 0;
    const list = obj => Object.keys(obj).length
      ? `<table class="table btable mb-0"><tbody>${Object.entries(obj).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="text-end fw-bold">${$(v)}</td></tr>`).join('')}</tbody></table>`
      : '<div class="ao-t">No charged usage in this range.</div>';

    host.innerHTML = `<div class="d-grid gap-3">
      <section class="ao-card" aria-label="${esc(label())}">
        <div class="ao-head"><div><div class="ao-name">${esc(label())}</div><div class="ao-desc">Usage counted from ${B.fmtDate(startOf())} to today. Estimated charges are what usage beyond your allowance costs.</div></div><div class="ao-price fs-4">${$(charged)}</div></div>
        <div class="ao-row"><div><div class="ao-h">Charged</div><div class="ao-t">What has been billed for usage beyond the plan.</div></div><strong>${$(charged)}</strong></div>
        <div class="ao-row"><div><div class="ao-h">Calls</div><div class="ao-t">Voice records in this range.</div></div><strong>${calls}</strong></div>
        <div class="ao-row"><div><div class="ao-h">Talk time</div><div class="ao-t">Total minutes spent on calls.</div></div><strong>${talk(mins)}</strong></div>
        <div class="ao-row"><div><div class="ao-h">Messages sent</div><div class="ao-t">Text messages in this range.</div></div><strong>${B.num(sms)}</strong></div>
        <div class="px-3 py-2 small" style="background:var(--info-bg);color:var(--info)">Charges appear only once usage passes your plan allowance. Anything inside the allowance is included.</div>
      </section>

      <section class="ao-card" aria-label="Plan inclusions">
        <div class="ao-head"><div><div class="ao-name">Plan usage balance</div><div class="ao-desc">What your plan includes each period, how much you have used, and what is left.</div></div><button type="button" class="btn btn-brand-o" id="costList">Full cost list</button></div>
        <div class="table-responsive"><table class="table btable align-middle"><caption class="visually-hidden">Plan inclusions</caption>
          <thead><tr>${['Allowance', 'Committed', 'Spent', 'Available', 'Used %', 'Rate', 'Charge'].map((h, i) => `<th scope="col" class="${i ? 'text-end' : ''}"><span class="th-static">${h}</span></th>`).join('')}</tr></thead>
          <tbody>${S.usage.map(u => {
            const over = Math.max(0, u.used - u.included), left = Math.max(0, u.included - u.used), pct = B.pct(u.used, u.included);
            return `<tr><td><div class="fw-semibold">${esc(u.label)}</div><div class="text-muted small">${pct > 100 ? 'Over the allowance' : pct >= 85 ? 'Near the allowance' : 'Within the allowance'} · ${pct}% used</div></td>
              <td class="text-end">${B.num(u.included)} ${esc(u.unit)}</td><td class="text-end">${B.num(u.used)} ${esc(u.unit)}</td>
              <td class="text-end ${left ? '' : 'text-danger'}">${left ? B.num(left) + ' ' + esc(u.unit) : 'None left'}</td>
              <td class="text-end"><div class="up-pct"><span>${pct}%</span><div class="wl-bar ${pct >= 100 ? 'full' : pct >= 85 ? 'warn' : ''}" role="progressbar" aria-label="${esc(u.label)} used" aria-valuenow="${Math.min(100, pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100, pct)}%"></i></div></div></td>
              <td class="text-end">${rate(u.rate)} <span class="text-muted small">/ ${esc(u.unit.replace(/s$/, ''))}</span></td><td class="text-end fw-bold ${over ? 'text-danger' : ''}">${$(over * u.rate)}</td></tr>`;
          }).join('')}</tbody></table></div>
        <div class="px-3 py-2 small" style="background:var(--info-bg);color:var(--info)">Usage beyond an allowance is charged at the rate shown. Seats and add-ons are billed with the plan, not here.</div>
      </section>

      ${B.cu.walletsSection()}
      ${B.cu.historySection()}
      ${B.cu.analyticsSection(startOf(), label())}

      <section class="ao-card" aria-label="Where the charges went">
        <div class="ao-head"><div><div class="ao-name">Where the charges went</div><div class="ao-desc">The same period, split three ways. Credit is pooled across the company, but every charge belongs to somebody — this is who.</div></div>
          <button type="button" class="btn btn-brand-o" id="toggleBreak" aria-expanded="${showBreak}">${showBreak ? 'Hide breakdown' : 'Show breakdown'}</button></div>
        ${showBreak ? `<div class="ao-row d-block"><div class="ao-h mb-2">Who spent it</div>${list(who)}</div>
          <div class="ao-row d-block"><div class="ao-h mb-2">Where it went</div>${list(where)}</div>
          <div class="ao-row d-block"><div class="ao-h mb-2">Out against in</div>
            <div class="table-responsive"><table class="table btable align-middle mb-0"><caption class="visually-hidden">Outbound against inbound calls</caption>
              <thead><tr>${['Direction', 'Spent', 'Calls', 'Talk time', 'Share'].map((h, i) => `<th scope="col" class="${i ? 'text-end' : ''}"><span class="th-static">${h}</span></th>`).join('')}</tr></thead>
              <tbody>${Object.entries(dir).map(([k, d]) => `<tr><td>${k}</td><td class="text-end">${$(d.spent)}</td><td class="text-end">${d.calls}</td><td class="text-end">${talk(d.mins)}</td><td class="text-end">${share(d.spent)}%</td></tr>`).join('')}</tbody></table></div></div>` : ''}
      </section>

      <section class="ao-card" aria-label="Usage records">
        <div class="ao-head"><div><div class="ao-name">The records themselves</div><div class="ao-desc">Every usage record in this range. Search, filter and sort to find one particular charge.</div></div>
          <button type="button" class="btn btn-brand-o" id="voiceOnly" aria-pressed="false">Call history</button></div>
        <div class="p-3 pt-0" id="uTable"></div>
        <div class="ao-row"><div><div class="ao-h">Looking for one particular charge?</div><div class="ao-t">Filter by usage type or date, then sort by Charge to see the largest first. Each row shows the date, quantity and what it cost.</div></div></div>
      </section></div>`;

    { const sec = [...host.querySelectorAll('.d-grid > section')]; B.sectionTabs({ anchor: sec[0], groups: [[sec[0], sec[1]], [sec[2]], [sec[3]], [sec[4]], [sec[5]], [sec[6]]], labels: ['Overview', 'Credits & wallets', 'Usage history', 'Analytics', 'Where charges went', 'Daily records'], icons: [B.pillIcons.grid, B.pillIcons.wallet, B.pillIcons.clock, B.pillIcons.chart, B.pillIcons.list, B.pillIcons.cal], key: 'usage' }); B.cu.bind(host, { start: startOf(), redraw: draw }); }
    host.querySelector('#toggleBreak').onclick = () => { showBreak = !showBreak; draw(); };
    host.querySelector('#costList').onclick = () => B.info('Full cost list', `<div class="table-responsive"><table class="table btable"><thead><tr><th scope="col"><span class="th-static">Service</span></th><th scope="col" class="text-end"><span class="th-static">Rate</span></th><th scope="col" class="text-end"><span class="th-static">Allowance</span></th></tr></thead><tbody>${S.usage.map(u => `<tr><td>${esc(u.label)}</td><td class="text-end">${rate(u.rate)} per ${esc(u.unit.replace(/s$/, ''))}</td><td class="text-end">${B.num(u.included)} ${esc(u.unit)}</td></tr>`).join('')}</tbody></table></div><p class="text-muted small mb-0">Rates apply only to usage beyond the allowance.</p>`);

    dt = B.DataTable(host.querySelector('#uTable'), {
      caption: 'Usage records', rows: () => inRange(), dateKey: 'date', amountKey: 'charge', searchKeys: ['type', 'date', 'included'],
      searchPlaceholder: 'Search usage type', emptyText: 'No usage records found.',
      filters: [{ key: 'type', label: 'Usage type', options: ['Voice', 'SMS', 'Meetings', 'Storage', 'AI'] }],
      columns: [
        { key: 'date', label: 'Date', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}</span>` },
        { key: 'type', label: 'Usage type' },
        { key: 'qty', label: 'Quantity', render: r => `${B.num(r.qty)} ${esc(r.unit)}` },
        { key: 'included', label: 'Included', hide: 'md' },
        { key: 'overage', label: 'Overage', render: r => r.overage ? `<span class="text-danger fw-semibold">+${B.num(r.overage)}</span>` : '0' },
        { key: 'charge', label: 'Charge', align: 'end', render: r => `<strong>${$(r.charge)}</strong>` }
      ]
    });
    const vo = host.querySelector('#voiceOnly'); let on = false;
    vo.onclick = () => { on = !on; dt.setFilter('type', on ? 'Voice' : ''); vo.setAttribute('aria-pressed', on); vo.textContent = on ? 'All records' : 'Call history'; };
  }
})(window.Billing);
