/* Credits & Usage: commit wallets, Dialpad Credits, allocation (Allowance → Commit → Credits), usage history with a
   transaction popup, analytics and spending alerts. It is drawn inside the Usage page (B.cu.*).
   There is no backend: every figure here comes from a labelled, deterministic mock data set built below. */
(function (B) {
  const S = B.state, esc = B.esc, $ = B.money, r2 = n => Math.round(n * 100) / 100;
  const SAMPLE = '<span class="sbadge muted" title="Generated demo data. Not your real charges.">Sample data</span>';

  /* ---------------------------------------------------------------- mock data ---------------------------------------------------------------- */
  const WALLETS = {
    calling: { id: 'calling', name: 'Calling Credit Commit', short: 'Calling commit', committed: 150, start: '2026-09-05', end: '2027-09-04', covers: 'Calls, text and picture messages beyond your plan allowance', tone: 'blue' },
    ai: { id: 'ai', name: 'AI Agent Credit Commit', short: 'AI commit', committed: 20, start: '2026-09-05', end: '2027-09-04', covers: 'AI voice minutes and AI replies beyond your plan allowance', tone: 'violet' }
  };
  S.spendAlerts = S.spendAlerts || { calling: { on: true, pct: 80 }, ai: { on: true, pct: 80 }, credits: { on: true, below: 10 }, allowance: { on: false, pct: 90 } };

  const CALLS = [['United Kingdom', 'Mobile', 0.19], ['India', 'Mobile', 0.045], ['Germany', 'Landline', 0.085], ['Mexico', 'Landline', 0.062], ['Canada', 'Landline', 0.052], ['Australia', 'Mobile', 0.21], ['United States', 'Toll-free inbound', 0.0225]];
  const SMS = S.messageRates.map(m => [m.dest, `${m.unit} · ${m.type}`, m.rate]);
  const POOL0 = { call: 0, sms: 250, aiVoice: 40, aiReply: 300 };   // plan allowance left, in units, over the demo window

  function build() {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
    const users = S.licences.map(l => l.user).filter(Boolean), people = users.length ? users : ['Unassigned'];
    const pool = Object.assign({}, POOL0), left = { calling: WALLETS.calling.committed, ai: WALLETS.ai.committed };
    const out = []; let n = 0;
    for (let t = Date.UTC(2026, 8, 5); t <= Date.UTC(2026, 9, 6); t += 864e5) {
      const date = new Date(t).toISOString().slice(0, 10), count = 3 + Math.floor(rnd() * 3), times = [];
      for (let i = 0; i < count; i++) times.push(String(8 + Math.floor(rnd() * 11)).padStart(2, '0') + ':' + String(Math.floor(rnd() * 60)).padStart(2, '0'));
      times.sort().forEach(time => {
        const k = rnd(); let type, detail, unit, rate, qty, cat, pk, wallet;
        if (k < .52) { const c = pick(CALLS); type = 'Call'; detail = `${c[0]} · ${c[1]}`; unit = 'min'; rate = c[2]; qty = 2 + Math.floor(rnd() * 28); cat = 'call'; pk = 'call'; wallet = 'calling'; }
        else if (k < .76) { const m = pick(SMS); type = m[1].startsWith('MMS') ? 'MMS' : 'SMS'; detail = `${m[0]} · ${m[1].split(' · ')[1]}`; unit = 'messages'; rate = m[2]; qty = 5 + Math.floor(rnd() * 70); cat = 'msg'; pk = 'sms'; wallet = 'calling'; }
        else if (k < .88) { type = 'AI voice agent'; detail = 'AI voice minutes'; unit = 'min'; rate = 0.15; qty = 2 + Math.floor(rnd() * 14); cat = 'ai'; pk = 'aiVoice'; wallet = 'ai'; }
        else { type = 'AI reply'; detail = 'AI chat replies'; unit = 'replies'; rate = 0.012; qty = 20 + Math.floor(rnd() * 160); cat = 'ai'; pk = 'aiReply'; wallet = 'ai'; }
        const value = r2(qty * rate), allowU = Math.min(qty, pool[pk] || 0); pool[pk] = (pool[pk] || 0) - allowU;
        const allowance = r2(allowU * rate), rest = r2(value - allowance), commit = r2(Math.min(rest, left[wallet])); left[wallet] = r2(left[wallet] - commit);
        const credits = r2(rest - commit); n++;
        const parts = [['Allowance', allowance], ['Commit', commit], ['Credits', credits]].filter(p => p[1] > 0);
        out.push({ id: n, date, time, ts: `${date} ${time}`, user: pick(people), type, cat, detail, qty, unit, rate, value, allowance, commit, credits, charge: r2(commit + credits), wallet,
          walletName: WALLETS[wallet].short, fund: parts.length > 1 ? 'Mixed' : parts.length ? ({ Allowance: 'Plan allowance', Commit: 'Commit wallet', Credits: 'Dialpad Credits' })[parts[0][0]] : 'Plan allowance',
          ref: (type.startsWith('AI') ? 'AI-' : type === 'Call' ? 'CALL-' : 'MSG-') + (0x3a1f00 + n * 7919).toString(16).toUpperCase().slice(-6), status: 'Billed' });
      });
    }
    return out;
  }
  S.creditTx = S.creditTx || build();
  const inRange = start => S.creditTx.filter(t => t.date >= start);

  /* ---------------------------------------------------------------- numbers ---------------------------------------------------------------- */
  function walletStats() {
    const sum = (w, k) => r2(S.creditTx.filter(t => t.wallet === w).reduce((n, t) => n + t[k], 0));
    const mk = w => { const W = WALLETS[w], spent = sum(w, 'commit'); return Object.assign({}, W, { spent, available: r2(W.committed - spent), usedPct: Math.round(spent / W.committed * 100) }); };
    const credSpent = r2(S.creditTx.reduce((n, t) => n + t.credits, 0)), added = r2(S.activity.filter(a => a.status === 'Paid' && /top-up|recharge/i.test(a.description) && a.date >= '2026-09-05').reduce((n, a) => n + a.amount, 0));
    return { calling: mk('calling'), ai: mk('ai'), credits: { id: 'credits', name: 'Dialpad Credits', balance: S.credit, spent: credSpent, added } };
  }
  const allowancePct = () => Math.max(...S.usage.filter(u => u.key !== 'users' && u.key !== 'ai').map(u => Math.round(u.used / u.included * 100)));
  function alertStates() {
    const w = walletStats(), a = S.spendAlerts, list = [];
    if (a.calling.on && w.calling.usedPct >= a.calling.pct) list.push({ tone: 'warn', text: `${w.calling.name} is ${w.calling.usedPct}% used (alert at ${a.calling.pct}%). ${$(w.calling.available)} left.` });
    if (a.ai.on && w.ai.usedPct >= a.ai.pct) list.push({ tone: w.ai.usedPct >= 100 ? 'bad' : 'warn', text: `${w.ai.name} is ${w.ai.usedPct}% used (alert at ${a.ai.pct}%).${w.ai.available <= 0 ? ' New AI usage now draws on Dialpad Credits.' : ''}` });
    if (a.credits.on && w.credits.balance < a.credits.below) list.push({ tone: 'bad', text: `Dialpad Credits are ${$(w.credits.balance)}, below your ${$(a.credits.below)} alert.` });
    if (a.allowance.on && allowancePct() >= a.allowance.pct) list.push({ tone: 'warn', text: `A plan allowance is ${allowancePct()}% used (alert at ${a.allowance.pct}%).` });
    return list;
  }
  B.cu = { walletStats, alertStates, tx: () => S.creditTx };

  /* ---------------------------------------------------------------- shared bits ---------------------------------------------------------------- */
  const chip = (k, v) => `<span class="fund fund-${k}"><i></i>${v}</span>`;
  const fundChips = t => [t.allowance > 0 ? chip('a', 'Allowance') : '', t.commit > 0 ? chip('c', 'Commit') : '', t.credits > 0 ? chip('p', 'Credits') : ''].join('') || chip('a', 'Allowance');
  const bar = (a, c, p) => { const tot = a + c + p || 1; return `<div class="fund-bar" role="img" aria-label="Allowance ${$(a)}, commit ${$(c)}, credits ${$(p)}"><i class="fa" style="width:${a / tot * 100}%"></i><i class="fc" style="width:${c / tot * 100}%"></i><i class="fp" style="width:${p / tot * 100}%"></i></div>`; };
  const xlsCell = v => typeof v === 'number' ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${String(v).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</Data></Cell>`;
  B.xls = (name, sheet, head, rows) => B.download(name, `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${sheet}"><Table>${[head, ...rows].map(r => `<Row>${r.map(xlsCell).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`, 'application/vnd.ms-excel');

  /* ---------------------------------------------------------------- Credits & wallets ---------------------------------------------------------------- */
  B.cu.walletsSection = () => {
    const w = walletStats(), al = alertStates(), a = S.spendAlerts, ar = S.autoRecharge;
    const used = x => `<div class="wl-bar ${x.usedPct >= 100 ? 'full' : x.usedPct >= a[x.id].pct ? 'warn' : ''}" role="progressbar" aria-label="${esc(x.name)} used" aria-valuenow="${Math.min(100, x.usedPct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100, x.usedPct)}%"></i></div>`;
    const commitCard = x => `<div class="col-12 col-lg-4"><div class="wl-card"><div class="wl-top"><div class="wl-name">${esc(x.name)}</div>${x.usedPct >= 100 ? B.badge('Used up', 'bad') : x.usedPct >= a[x.id].pct ? B.badge('Alert', 'warn') : B.badge('Active', 'ok')}</div>
      <div class="wl-big">${$(x.available)}<span>available</span></div>${used(x)}
      <div class="wl-row"><span>Spent</span><b>${$(x.spent)}</b></div><div class="wl-row"><span>Committed</span><b>${$(x.committed)}</b></div><div class="wl-row"><span>Used</span><b>${x.usedPct}%</b></div>
      <div class="wl-row"><span>Commit period</span><b>${B.fmtDate(x.start)} – ${B.fmtDate(x.end)}</b></div><p class="wl-note">${esc(x.covers)}.</p>
      <button type="button" class="btn btn-brand-o btn-sm" data-cu-wallet="${x.id}">View history</button></div></div>`;
    return `<section class="ao-card" aria-label="Credits and wallets"><div class="ao-head"><div><div class="ao-name">Credits &amp; wallets ${SAMPLE}</div><div class="ao-desc">Three places usage can be paid from, used in this order: plan allowance, then commit wallets, then Dialpad Credits.</div></div>
        <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-brand" data-cu="add">Add credits</button><button type="button" class="btn btn-brand-o" data-cu="auto">Auto-recharge ${ar.on ? '· On' : '· Off'}</button></div></div>
      <div class="p-3 pt-0">
        ${al.length ? `<div class="d-grid gap-2 mb-3">${al.map(x => `<div class="ar-alert ${x.tone === 'bad' ? 'bad' : 'warn'}" role="alert"><div>${esc(x.text)}</div></div>`).join('')}</div>` : ''}
        <ol class="alloc" aria-label="How usage is paid for"><li><span>1</span><div><b>Plan allowance</b><small>Included minutes, messages and AI</small></div></li><li><span>2</span><div><b>Commit wallets</b><small>Spend you committed to</small></div></li><li><span>3</span><div><b>Dialpad Credits</b><small>Your pay-as-you-go balance</small></div></li></ol>
        <div class="row g-3">${commitCard(w.calling)}${commitCard(w.ai)}
          <div class="col-12 col-lg-4"><div class="wl-card wl-credit"><div class="wl-top"><div class="wl-name">${esc(w.credits.name)}</div>${w.credits.balance < S.spendAlerts.credits.below && S.spendAlerts.credits.on ? B.badge('Low', 'bad') : B.badge('Active', 'ok')}</div>
            <div class="wl-big">${$(w.credits.balance)}<span>balance</span></div><div class="wl-bar plain" aria-hidden="true"><i style="width:100%"></i></div>
            <div class="wl-row"><span>Spent from credits</span><b>${$(w.credits.spent)}</b></div><div class="wl-row"><span>Added since 5 Sep</span><b>${$(w.credits.added)}</b></div>
            <div class="wl-row"><span>Auto-recharge</span><b>${ar.on ? `${$(ar.amount)} below ${$(ar.threshold)}` : 'Off'}</b></div><p class="wl-note">Used last. Shared across the company and never expires while the account is open.</p>
            <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-brand btn-sm" data-cu="add">Add credits</button><button type="button" class="btn btn-brand-o btn-sm" data-cu="auto">Auto-recharge</button></div></div></div></div>
        <div class="wl-alerts" aria-labelledby="alh"><div class="d-flex justify-content-between align-items-start gap-2 flex-wrap"><div><h3 class="sub-title" id="alh">Spending alerts</h3><p class="sub-desc mb-2">Get a warning on screen when a wallet or allowance passes the level you choose.</p></div></div>
          <form id="alertForm" novalidate><div class="row g-3">${[['calling', 'Calling Credit Commit', 'pct', 'Alert when used reaches (%)'], ['ai', 'AI Agent Credit Commit', 'pct', 'Alert when used reaches (%)'], ['credits', 'Dialpad Credits', 'below', 'Alert when balance falls below ($)'], ['allowance', 'Plan allowances', 'pct', 'Alert when any is used (%)']].map(([k, n, f, lab]) => `
            <div class="col-12 col-sm-6 col-xl-3"><div class="al-item"><div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" role="switch" id="al_${k}_on" ${a[k].on ? 'checked' : ''}><label class="form-check-label fw-semibold" for="al_${k}_on">${n}</label></div>
              <label class="form-label small" for="al_${k}_v">${lab}</label><input id="al_${k}_v" class="form-control" inputmode="decimal" value="${a[k][f]}" ${a[k].on ? '' : 'disabled'}><div class="ar-err" id="al_${k}_e" role="alert"></div></div></div>`).join('')}</div>
            <div class="mt-3 d-flex flex-wrap gap-2"><button type="submit" class="btn btn-brand">Save alerts</button><button type="button" class="btn btn-brand-o" data-cu="resetAlerts">Reset</button></div></form></div>
      </div></section>`;
  };

  /* ---------------------------------------------------------------- Usage history ---------------------------------------------------------------- */
  B.cu.historySection = () => `<section class="ao-card" aria-label="Usage history"><div class="ao-head"><div><div class="ao-name">Usage history ${SAMPLE}</div><div class="ao-desc">Every charged call, message and AI action in the selected range, and which wallet paid for it. Open a row for the full breakdown.</div></div>
      <div class="dropdown"><button type="button" class="btn btn-brand-o dropdown-toggle" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false" id="hxBtn">Export</button>
        <ul class="dropdown-menu dropdown-menu-end"><li><button type="button" class="dropdown-item" data-cu="csv"><span>Download CSV</span></button></li><li><button type="button" class="dropdown-item" data-cu="xls"><span>Download Excel (.xls)</span></button></li></ul></div></div>
      <div class="p-3 pt-0" id="hTable"></div></section>`;

  function txModal(t) {
    const row = (k, v) => `<div class="tx-row"><span>${k}</span><b>${v}</b></div>`, total = t.allowance + t.commit + t.credits;
    const m = B.modal({ title: 'Transaction details', size: 'modal-md', body: `<div class="tx"><div class="tx-head"><div><div class="tx-type">${esc(t.type)}</div><div class="tx-sub">${esc(t.detail)}</div></div><div class="tx-amt">${$(t.charge)}<small>charged</small></div></div>
        <div class="tx-sec">Paid for by</div>${bar(t.allowance, t.commit, t.credits)}
        <div class="tx-legend">${[['a', 'Plan allowance', t.allowance], ['c', WALLETS[t.wallet].name, t.commit], ['p', 'Dialpad Credits', t.credits]].map(([k, n, v]) => `<div class="${v > 0 ? '' : 'off'}">${chip(k, esc(n))}<b>${$(v)}</b></div>`).join('')}</div>
        <div class="tx-sec">Details</div><div class="tx-rows">${row('Date and time', `${B.fmtDate(t.date)}, ${t.time}`)}${row('User', esc(t.user))}${row('Quantity', `${B.num(t.qty)} ${esc(t.unit)}`)}${row('Rate', `$${t.rate.toFixed(t.rate < .1 ? 4 : 2)} per ${esc(t.unit.replace(/s$/, ''))}`)}${row('Usage value', $(total))}${row('Wallet', esc(WALLETS[t.wallet].name))}${row('Status', B.badge(t.status, 'ok'))}${row('Reference', `<span class="mono">${esc(t.ref)}</span> <button type="button" class="btn btn-link btn-sm p-0 align-baseline" data-copy>Copy</button>`)}</div>
        <p class="tx-note">${SAMPLE} Generated for demonstration. Not a real call or charge.</p></div>`,
      footer: '<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Close</button>' });
    m.el.querySelector('[data-copy]').onclick = () => { try { navigator.clipboard.writeText(t.ref); } catch (_) {} B.toast(`${t.ref} copied.`); };
  }
  B.cu.txDetails = txModal;

  /* ---------------------------------------------------------------- Analytics ---------------------------------------------------------------- */
  B.cu.analyticsSection = (start, label) => {
    const rows = inRange(start), by = {}, byType = {}, byUser = {};
    rows.forEach(t => { const d = by[t.date] || (by[t.date] = { a: 0, c: 0, p: 0 }); d.a += t.allowance; d.c += t.commit; d.p += t.credits; byType[t.type] = (byType[t.type] || 0) + t.charge; byUser[t.user] = (byUser[t.user] || 0) + t.charge; });
    const days = Object.keys(by).sort(), totalCharged = r2(rows.reduce((n, t) => n + t.charge, 0)), totalCredits = r2(rows.reduce((n, t) => n + t.credits, 0)), totalAllow = r2(rows.reduce((n, t) => n + t.allowance, 0));
    const span = Math.max(1, Math.round((Date.parse(S.today) - Date.parse(start)) / 864e5) + 1), avg = r2(totalCharged / span);
    const td = new Date(S.today + 'T00:00:00'), dim = new Date(td.getFullYear(), td.getMonth() + 1, 0).getDate(), month = td.toLocaleDateString('en-GB', { month: 'long' }), projected = r2(avg * dim), creditAvg = totalCredits / span, runway = creditAvg > 0 ? Math.floor(S.credit / creditAvg) : null;
    const max = Math.max(0.01, ...days.map(d => by[d].c + by[d].p)), W = 640, H = 210, pl = 40, pb = 26, pt = 10, bw = Math.min(26, (W - pl - 8) / Math.max(1, days.length) * .68), gap = (W - pl - 8) / Math.max(1, days.length);
    const bars = days.map((d, i) => { const x = pl + i * gap + (gap - bw) / 2, hc = by[d].c / max * (H - pb - pt), hp = by[d].p / max * (H - pb - pt), y0 = H - pb;
      return `<g><title>${B.fmtDate(d)}: commit ${$(by[d].c)}, credits ${$(by[d].p)}, covered by allowance ${$(by[d].a)}</title><rect x="${x}" y="${y0 - hc}" width="${bw}" height="${hc}" rx="2" class="ch-c"/><rect x="${x}" y="${y0 - hc - hp}" width="${bw}" height="${hp}" rx="2" class="ch-p"/>${days.length <= 12 || i % Math.ceil(days.length / 10) === 0 ? `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="ch-t">${d.slice(8)}/${d.slice(5, 7)}</text>` : ''}</g>`; }).join('');
    const grid = [0, .5, 1].map(f => `<g><line x1="${pl}" x2="${W}" y1="${H - pb - f * (H - pb - pt)}" y2="${H - pb - f * (H - pb - pt)}" class="ch-g"/><text x="${pl - 6}" y="${H - pb - f * (H - pb - pt) + 3}" text-anchor="end" class="ch-t">${$(max * f).replace('.00', '')}</text></g>`).join('');
    const list = (obj, n) => Object.entries(obj).sort((x, y) => y[1] - x[1]).slice(0, n), tmax = Math.max(0.01, ...Object.values(byType));
    const w = walletStats();
    return `<section class="ao-card" aria-label="Credits analytics" data-plain><div class="ao-head"><div><div class="ao-name">Credits analytics ${SAMPLE}</div><div class="ao-desc">${esc(label)}: how much was charged, where it went and what paid for it.</div></div></div>
      <div class="p-3 pt-0">
        <div class="row g-3 mb-3">${[['Charged', $(totalCharged), 'Paid from commit or credits'], ['Average per day', $(avg), `Over ${span} day${span === 1 ? '' : 's'}`], ['Covered by allowance', $(totalAllow), 'Value of usage that cost nothing extra'], [`Projected for ${month}`, $(projected), 'At the current daily average'], ['Credit runway', runway == null ? 'No credit use' : `${runway} day${runway === 1 ? '' : 's'}`, `${$(S.credit)} at ${$(r2(creditAvg))} a day`]].map(k => `<div class="col-6 col-lg"><div class="tile"><div class="eyebrow">${k[0]}</div><div class="t-val sm">${k[1]}</div><div class="t-note">${k[2]}</div></div></div>`).join('')}</div>
        <div class="row g-3"><div class="col-12 col-xl-7"><div class="an-card"><div class="an-h">Daily charges by funding source</div>
          ${days.length ? `<svg viewBox="0 0 ${W} ${H}" class="an-svg" role="img" aria-label="Daily charges: ${$(totalCharged)} in total over ${days.length} days">${grid}${bars}</svg><div class="an-key">${chip('c', 'Commit wallets')}${chip('p', 'Dialpad Credits')}</div>` : '<div class="dt-empty">No charged usage in this range.</div>'}</div></div>
          <div class="col-12 col-xl-5"><div class="an-card"><div class="an-h">By usage type</div>${list(byType, 6).map(([k, v]) => `<div class="an-bar"><div class="d-flex justify-content-between"><span>${esc(k)}</span><b>${$(v)}</b></div><div class="wl-bar plain"><i style="width:${v / tmax * 100}%"></i></div></div>`).join('') || '<div class="dt-empty">Nothing charged.</div>'}</div></div>
          <div class="col-12 col-xl-7"><div class="an-card"><div class="an-h">Top spenders</div><div class="table-responsive"><table class="table btable align-middle mb-0"><caption class="visually-hidden">Top spenders</caption><thead><tr><th scope="col"><span class="th-static">User</span></th><th scope="col" class="text-end"><span class="th-static">Charged</span></th><th scope="col" class="text-end"><span class="th-static">Share</span></th></tr></thead>
            <tbody>${list(byUser, 5).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="text-end fw-bold">${$(r2(v))}</td><td class="text-end">${totalCharged ? Math.round(v / totalCharged * 100) : 0}%</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted small">No charged usage.</td></tr>'}</tbody></table></div></div></div>
          <div class="col-12 col-xl-5"><div class="an-card"><div class="an-h">Wallet use</div>${[w.calling, w.ai].map(x => `<div class="an-bar"><div class="d-flex justify-content-between"><span>${esc(x.short)}</span><b>${x.usedPct}%</b></div><div class="wl-bar ${x.usedPct >= 100 ? 'full' : ''}"><i style="width:${Math.min(100, x.usedPct)}%"></i></div><small class="text-muted">${$(x.spent)} of ${$(x.committed)}</small></div>`).join('')}</div></div></div></div></section>`;
  };

  /* ---------------------------------------------------------------- wiring ---------------------------------------------------------------- */
  B.cu.bind = (host, o) => {
    const rows = () => inRange(o.start);
    const dt = B.DataTable(host.querySelector('#hTable'), {
      caption: 'Usage history', rows, dateKey: 'date', amountKey: 'charge', searchKeys: ['user', 'type', 'detail', 'ref'], searchPlaceholder: 'Search user, type or reference',
      emptyText: 'No usage in this range.', idKey: 'id',
      filters: [{ key: 'type', label: 'Type', options: ['Call', 'SMS', 'MMS', 'AI voice agent', 'AI reply'] }, { key: 'walletName', label: 'Wallet', options: [WALLETS.calling.short, WALLETS.ai.short] }, { key: 'fund', label: 'Paid by', options: ['Plan allowance', 'Commit wallet', 'Dialpad Credits', 'Mixed'] }],
      columns: [
        { key: 'ts', label: 'Date and time', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}<span class="text-muted small d-block">${r.time}</span></span>` },
        { key: 'user', label: 'User', hide: 'md' },
        { key: 'type', label: 'Type', render: r => `<div class="fw-semibold">${esc(r.type)}</div><div class="text-muted small">${esc(r.detail)}</div>` },
        { key: 'qty', label: 'Quantity', hide: 'lg', render: r => `${B.num(r.qty)} ${esc(r.unit)}` },
        { key: 'value', label: 'Value', hide: 'lg', align: 'end', render: r => $(r.value) },
        { key: 'charge', label: 'Charged', align: 'end', render: r => `<strong>${$(r.charge)}</strong>` },
        { key: 'fund', label: 'Paid by', render: r => `<div class="fund-cell">${fundChips(r)}</div>` },
        { key: 'ref', label: 'Reference', hide: 'xl', render: r => `<span class="mono">${esc(r.ref)}</span>` },
        { key: '_act', label: 'Actions', align: 'end' }
      ],
      actions: r => B.actBtn('open', r.id, 'eye', `Details for ${r.ref}`),
      onAction: (a, r) => txModal(r)
    });
    host.querySelector('#hTable').addEventListener('click', e => {
      const tr = e.target.closest('tbody tr'); if (!tr || e.target.closest('button,a,.dropdown,.rz-col,.rz-row')) return;
      const ref = (tr.querySelector('.mono') || {}).textContent, t = S.creditTx.find(x => x.ref === ref); if (t) txModal(t);
    });
    const exportRows = () => dt.filtered().map(t => [t.date, t.time, t.user, t.type, t.detail, t.qty, t.unit, t.rate, t.value, t.allowance, t.commit, t.credits, t.charge, t.walletName, t.fund, t.ref]);
    const HEAD = ['Date', 'Time', 'User', 'Type', 'Detail', 'Quantity', 'Unit', 'Rate', 'Usage value', 'Plan allowance', 'Commit', 'Dialpad Credits', 'Charged', 'Wallet', 'Paid by', 'Reference'];
    const doExport = kind => {
      const r = exportRows(); if (!r.length) return B.toast('There is nothing to export with these filters.', 'error', 'Nothing to export');
      kind === 'csv' ? B.download('usage-history.csv', B.csv(HEAD, r.map(x => x.map(v => typeof v === 'number' ? String(v) : v))), 'text/csv') : B.xls('usage-history.xls', 'Usage history', HEAD, r);
      B.toast(`${r.length} record${r.length === 1 ? '' : 's'} exported as ${kind === 'csv' ? 'CSV' : 'Excel'}. Sample data.`, 'ok', 'Export ready');
    };

    host.onclick = e => {   // assigned (not added), so a redraw never stacks a second handler
      const b = e.target.closest('[data-cu],[data-cu-wallet]'); if (!b) return;
      if (b.dataset.cuWallet) { const strip = host.querySelector('.pg-tabs [data-st="2"]'); strip && strip.click(); dt.setFilter('walletName', WALLETS[b.dataset.cuWallet].short); return; }
      ({ add: () => addCredits(o.redraw), auto: () => B.go('credit-payment?tab=auto'), csv: () => doExport('csv'), xls: () => doExport('xls'), resetAlerts: () => { S.spendAlerts = { calling: { on: true, pct: 80 }, ai: { on: true, pct: 80 }, credits: { on: true, below: 10 }, allowance: { on: false, pct: 90 } }; B.toast('Alert settings reset.', 'info', 'Reset'); o.redraw(); } }[b.dataset.cu] || (() => {}))();
    };

    /* spending alerts */
    const form = host.querySelector('#alertForm'); if (!form) return;
    ['calling', 'ai', 'credits', 'allowance'].forEach(k => { const on = form.querySelector(`#al_${k}_on`), v = form.querySelector(`#al_${k}_v`); on.onchange = () => { v.disabled = !on.checked; if (!on.checked) form.querySelector(`#al_${k}_e`).textContent = ''; }; });
    form.onsubmit = ev => {
      ev.preventDefault(); let bad = false; const next = {};
      ['calling', 'ai', 'credits', 'allowance'].forEach(k => {
        const on = form.querySelector(`#al_${k}_on`).checked, vEl = form.querySelector(`#al_${k}_v`), eEl = form.querySelector(`#al_${k}_e`), val = vEl.value.trim(), f = k === 'credits' ? 'below' : 'pct'; let err = '';
        if (on) { if (!val) err = 'Enter a value.'; else if (!/^\d{1,5}(\.\d{1,2})?$/.test(val) || +val <= 0) err = 'Enter a positive number.'; else if (f === 'pct' && (!/^\d+$/.test(val) || +val > 100)) err = 'Enter a whole percentage from 1 to 100.'; else if (+val > 100000) err = 'That is too large.'; }
        vEl.classList.toggle('is-invalid', !!err); eEl.textContent = err; if (err) bad = true; next[k] = Object.assign({}, S.spendAlerts[k], { on }, on ? { [f]: +val } : {});
      });
      if (bad) return B.toast('Fix the highlighted alert levels and try again.', 'error', 'Cannot save yet');
      S.spendAlerts = next; const t = alertStates();
      B.toast(t.length ? `Saved. ${t.length} alert${t.length === 1 ? ' is' : 's are'} active right now.` : 'Spending alerts saved.', t.length ? 'warn' : 'ok', 'Alerts saved'); o.redraw();
    };
  };

  /* ---------------------------------------------------------------- Add credits (quick) ---------------------------------------------------------------- */
  B.openAddCredits = done => addCredits(done);
  function addCredits(done) {
    const chips = [20, 50, 100, 200];
    const m = B.modal({ title: 'Add credits', size: 'modal-md', body: `<p class="small text-muted mb-2">Credits are used last, after your plan allowance and commit wallets.</p>
      <div class="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Amount">${chips.map(c => `<button type="button" class="btn btn-brand-o" data-amt="${c}">$${c}</button>`).join('')}</div>
      <label class="form-label" for="acAmt">Amount ($)</label><div class="input-group"><span class="input-group-text">$</span><input id="acAmt" class="form-control" inputmode="numeric" value="20" autocomplete="off"></div><div class="ar-err" id="acErr" role="alert"></div>
      <div class="small text-muted mt-3">Paid with <b>${S.methods.length ? esc((S.methods.find(x => x.primary) || S.methods[0]).brand + ' •••• ' + (S.methods.find(x => x.primary) || S.methods[0]).last4) : 'no card saved'}</b>. New balance: <b id="acNew"></b></div>`,
      footer: '<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-brand" data-ok>Add credits</button>' });
    const inp = m.el.querySelector('#acAmt'), err = m.el.querySelector('#acErr'), nb = m.el.querySelector('#acNew');
    const check = () => { const v = inp.value.trim(); const msg = !v ? 'Enter an amount.' : !/^\d+$/.test(v) ? 'Enter a whole-dollar amount.' : +v < 3 || +v > 1000 ? 'Enter an amount between $3 and $1,000.' : ''; inp.classList.toggle('is-invalid', !!msg); err.textContent = msg; nb.textContent = msg ? '—' : $(S.credit + +v); return msg; };
    inp.oninput = check; check();
    m.el.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => { inp.value = b.dataset.amt; check(); });
    let busy = false;
    m.el.querySelector('[data-ok]').onclick = ev => {
      if (busy || check()) return; if (!S.methods.length) return B.toast('Save a card first. Credits are charged to your primary card.', 'error', 'No card saved');
      busy = true; ev.target.disabled = true; const pm = S.methods.find(x => x.primary) || S.methods[0]; B.addCredit(+inp.value, `${pm.brand} •••• ${pm.last4}`); m.hide(); done && done();
    };
  }
})(window.Billing);
