/* Licences & Resources: tabs for Licences, Numbers, Storage, AI and Fax. Each shows what the plan holds as a catalogue
   (item, quantity x rate, a month), with the assignment table and resource meters kept alongside. */
(function (B) {
  const S = B.state, C = B.calc, esc = B.esc;
  let host, dt, nextId = 100;

  B.pages['licences-resources'] = {
    title: 'Licences & Resources',
    desc: 'What this account holds — seats, numbers, storage and AI usage — and who is using them.',
    render(el) { host = el; draw(); }
  };

  const $ = B.money, plan = () => S.plans.find(p => p.name === S.plan.name) || { inc: {}, features: [] };
  const addon = n => S.addons.find(a => a.name === n);
  const feat = re => (plan().features.find(f => re.test(f)) || '');

  /* one catalogue card: parent rows with indented children, in the Licence / Quantity x Rate / A month layout */
  function catalog(id, title, desc, totalLabel, total, rows, noun = 'Item') {
    const kid = k => `<tr class="lic-kid"><td><div class="lic-n"><i class="lic-l" aria-hidden="true">\u2514</i>${esc(k.name)}</div>${k.desc ? `<div class="lic-d">${esc(k.desc)}</div>` : ''}</td><td class="mono">${esc(k.qty || '')}</td><td class="mono text-end">${k.amount == null ? 'Included' : esc(k.amount)}</td></tr>`;
    return `<section class="bcard lic-card" aria-labelledby="lc_${id}" data-plain><div class="lic-head"><div><h2 class="sub-title" id="lc_${id}">${esc(title)}</h2><p class="sub-desc">${esc(desc)}</p></div>
      <div class="lic-total"><span>${esc(totalLabel)}</span><b>${esc(total)}</b></div></div>
      <div class="table-responsive"><table class="table lic-table"><caption class="visually-hidden">${esc(title)}</caption>
        <thead><tr><th scope="col">${noun}</th><th scope="col">Quantity \u00d7 Rate</th><th scope="col" class="text-end">A month</th></tr></thead>
        <tbody>${rows.map(r => `<tr class="lic-parent"><td><div class="lic-n">${esc(r.name)}</div>${r.desc ? `<div class="lic-d">${esc(r.desc)}</div>` : ''}</td><td class="mono">${esc(r.qty || '')}</td><td class="mono text-end">${r.amount == null ? 'Included' : esc(r.amount)}</td></tr>${(r.kids || []).map(kid).join('')}`).join('')}</tbody></table></div></section>`;
  }
  /* an add-on as a row: quantity x rate and the monthly amount when held, otherwise how to get it */
  function addonRow(name, desc) {
    const a = addon(name); if (!a) return null;
    const held = a.qty > 0 && a.status === 'Active';
    return { name: a.name, desc: desc || `${a.description} ${$(a.price)} ${a.unit}, ${a.freq.toLowerCase()}.`, qty: held ? `${a.qty} \u00d7 ${$(a.price)}` : '\u2014', amount: held ? $(a.qty * a.price) : (a.status === 'Coming soon' ? 'Coming soon' : 'Not added'), amt: held ? a.qty * a.price : 0 };
  }
  const addonKids = names => names.map(n => addonRow(n)).filter(Boolean);

  function cards() {
    const p = plan(), inc = p.inc || {}, seats = S.seats, rate = S.plan.rate, money = n => $(n);
    const seatAddons = addonKids(['AI Copilot', 'Screen Capture', 'Voicemail Transcription', 'Voice Biometrics']);
    const seatTotal = seats * rate + seatAddons.reduce((n, k) => n + k.amt, 0);
    const lic = catalog('lic', 'User licences', 'The plan seats this account holds, what each seat includes, and the add-ons that belong to the licence.', 'Seats, a month', money(seatTotal), [{
      name: `${S.plan.name} \u2014 ${seats} seat${seats === 1 ? '' : 's'}`, desc: `${seats} \u00d7 ${money(rate)} a seat, a month.`, qty: `${seats} \u00d7 ${money(rate)}`, amount: money(seats * rate),
      kids: [
        { name: 'Domestic calling', desc: `${inc.minutes || 'Calling'} with each seat, each month.` },
        { name: 'Text messages', desc: `${String(inc.sms || '').replace('messages', 'texts')} with each seat, each month.` },
        { name: 'AI replies', desc: `${inc.aiReplies || 'None'} with each seat, each month.` },
        { name: 'AI voice minutes', desc: `${inc.aiMin || 'None'} with each seat, each month.` },
        { name: 'Recording storage', desc: `${inc.storage || 'None'} with each seat, each month.` },
        { name: 'Phone numbers', desc: `${inc.numbers || 'None'} included with each seat.` },
        ...seatAddons
      ] }], 'Licence');

    return { lic };
  }

  const sel = new Set();   // seats ticked for a bulk cost-centre change

  /* ---------- Numbers, Storage, AI and Fax tabs ---------- */
  S.dids = S.dids || [{ id: 1, number: '+1 939 814 8021', flag: 'PR', country: 'Puerto Rico', from: '2026-09-07', to: '2026-11-06', cost: 0 }];
  S.aiAgents = S.aiAgents || [];
  S.faxLines = S.faxLines || [];
  S.faxHistory = S.faxHistory || [];
  const NONE_ART = '<svg class="empty-art" width="150" height="110" viewBox="0 0 150 110" aria-hidden="true"><rect x="12" y="14" width="64" height="80" rx="6" transform="rotate(-6 44 54)" fill="#fff" stroke="#c9d0de" stroke-width="2"/><rect x="70" y="10" width="66" height="84" rx="6" transform="rotate(5 103 52)" fill="#fff" stroke="#c9d0de" stroke-width="2"/><path d="M26 34h34M26 44h34M26 54h22M84 30h38M84 40h38M84 50h26" stroke="#d4dae6" stroke-width="3" stroke-linecap="round"/><circle cx="78" cy="72" r="14" fill="#fff" stroke="#8a94ab" stroke-width="3"/><path d="M88 82l14 14" stroke="#8a94ab" stroke-width="4" stroke-linecap="round"/></svg>';

  function storageSection() {
    const r = S.resources.find(x => x.label === 'Storage') || { used: 0, limit: 100, unit: 'GB' }, extraAdd = S.addons.find(a => a.name === 'Additional Storage');
    const extra = extraAdd && extraAdd.status === 'Active' ? extraAdd.qty * 50 : 0, free = r.limit, total = free + extra, used = r.used, pct = total ? Math.min(100, Math.round(used / total * 100)) : 0;
    const CIRC = 2 * Math.PI * 70, len = CIRC * pct / 100, objects = 412 + Math.round(used * 3);
    const price = (S.plans.find(p => p.name === S.plan.name) || { features: [] }).features.find(f => /Extra recording storage/.test(f)) || '';
    const m = (price.match(/\$[\d.]+/) || ['$2.49'])[0];
    return `<section class="bcard sto-card" aria-label="Storage usage" data-plain>
      <h2 class="sto-h">Storage Usage</h2><p class="sto-sub">Monitor your storage consumption</p>
      <div class="sto-donut"><svg viewBox="0 0 180 180" role="img" aria-label="${pct}% of storage used"><circle cx="90" cy="90" r="70" fill="none" stroke="#e6e8ee" stroke-width="22"/><circle cx="90" cy="90" r="70" fill="none" stroke="${pct >= 85 ? '#d97706' : '#4da3f0'}" stroke-width="22" stroke-dasharray="${len} ${CIRC - len}" transform="rotate(-90 90 90)"/><text x="90" y="88" text-anchor="middle" class="sto-p">${pct}%</text><text x="90" y="106" text-anchor="middle" class="sto-l">Used</text></svg></div>
      <div class="sto-key"><span><i class="u"></i>Used</span><span><i class="f"></i>Free</span></div>
      <p class="sto-line"><b>${used.toFixed(2)} GB</b> of ${total} GB used</p>
      <div class="sto-stats">${[['Objects', B.num(objects)], ['Size (GB)', used.toFixed(2)], ['Size (MB)', B.num(Math.round(used * 1024))], ['Extra', `${extra} GB`], ['Plan Free', `${free} GB`], ['Total Allowed', `${total} GB`]].map(x => `<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
      <div class="sto-more"><div><b>Need more space?</b><p>Extra storage is bought from Add-ons for ${esc(m)} per GB.</p></div><button type="button" class="btn btn-brand-o w-100" data-go-addons>Go to Add-ons</button></div></section>`;
  }

  function faxSection() {
    const held = S.faxLines.length, inUse = S.faxLines.filter(l => l.used).length, month = new Date(S.today + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const first = S.today.slice(0, 8) + '01';
    return `<section class="bcard fax-card" aria-label="Fax lines" data-plain><div class="fax-head"><div><h2 class="sub-title">Fax lines</h2><p class="sub-desc">Pages reset each line's own period (not a shared month). The allowance is per line and is not shared between lines; pages beyond it are charged per page.</p></div><div class="fax-period"><span>Period</span><b>${esc(month)}</b></div></div>
        <div class="fax-grid"><div><span>Fax Numbers</span><b>${held} held \u00b7 ${inUse} in use \u00b7 ${held - inUse} spare</b></div><div><span>Pages Included</span><b>100 a line, each month</b></div><div><span>Most lines an account may hold</span><b>200</b></div></div>
        <p class="fax-empty">${held ? `${held} fax line${held === 1 ? '' : 's'} on this account.` : 'There are no fax lines on this account.'}</p>
        <p class="fax-note">Lines are bought and removed on <button type="button" class="btn btn-link p-0 align-baseline" data-go-addons>Add-ons</button>. Received faxes cost nothing and are not counted.</p></section>
      <section class="bcard fax-card" aria-label="Fax history" data-plain><div class="fax-head"><div><h2 class="sub-title">History</h2><p class="sub-desc">Every fax in the days chosen, newest first. Days and times are in UTC. The clock a line's monthly pages are counted by.</p></div><div class="fax-period"><span>Showing</span><b id="faxShowing">${S.faxHistory.length ? S.faxHistory.length : '\u2014'}</b></div></div>
        <form class="fax-filters" id="faxForm" novalidate>
          <div><label class="form-label" for="fxFrom">First day</label><input id="fxFrom" type="date" class="form-control" value="${first}"></div>
          <div><label class="form-label" for="fxTo">Last day</label><input id="fxTo" type="date" class="form-control" value="${S.today}"></div>
          <div><label class="form-label" for="fxLine">Fax line</label><select id="fxLine" class="form-select"><option>Every line</option>${S.faxLines.map(l => `<option>${esc(l.number)}</option>`).join('')}</select></div>
          <div><label class="form-label" for="fxDir">Direction</label><select id="fxDir" class="form-select"><option>Sent and received</option><option>Sent</option><option>Received</option></select></div>
          <div><label class="form-label" for="fxStatus">Status</label><select id="fxStatus" class="form-select"><option>Any status</option><option>Delivered</option><option>Failed</option></select></div>
          <div class="fax-dl"><button type="button" class="btn btn-brand-o" id="faxCsv">Download CSV</button></div></form>
        <div class="text-danger small mb-2" id="faxErr" role="alert" hidden>The first day cannot be after the last day.</div>
        <p class="fax-note mb-0" id="faxMsg">${S.faxHistory.length ? '' : 'No faxes in these days. Sample data: nothing has been sent or received on this account.'}</p></section>`;
  }


  function draw() {
    const c = cards(), inUse = C.assigned(), unassigned = Math.max(0, S.seats - inUse - C.pending());
    const ccs = () => S.costCentres.filter(x => x.status === 'Active');
    const ccOpts = v => `<option value="">Unallocated</option>${ccs().map(x => `<option value="${esc(x.code)}" ${v === x.code ? 'selected' : ''}>${esc(x.code)} \u00b7 ${esc(x.name)}</option>`).join('')}`;
    const initials = n => n.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase(), ext = r => 1000 + r.id * 7;
    const tip = t => `<span class="seat-i" title="${esc(t)}" tabindex="0" aria-label="${esc(t)}">${B.icon('info', 13)}</span>`;
    const stat = (k, v, t) => `<div class="seat-stat"><span>${k}${t ? tip(t) : ''}</span><b>${v}</b></div>`;
    host.innerHTML = `<div class="d-grid gap-3">${c.lic}
      <section class="bcard seat-card" aria-label="Seat management" data-plain>
        <div class="seat-stats">${stat('Seats in use', inUse)}${stat('Paid but unassigned', unassigned, 'Seats you pay for that nobody is using yet.')}${stat('Scheduled for removal', 0, 'Seats that stop being billed from the next period.')}${stat('Total seats on plan', S.seats)}${stat('Seats you pay for next', `${S.seats} (${B.money(S.seats * S.plan.rate)}/month)`, 'What you will be billed for from the next period.')}</div>
        <p class="seat-note">A seat is something you buy, not something a user owns. Deleting a user frees their seat but keeps it on your bill \u2014 you have to remove the seat here as well. Seat removals take effect on <b>${B.fmtDate(S.period.next)}</b>; the current period is never refunded.</p>
        <div class="seat-btns"><button type="button" class="btn btn-brand-o" id="assignSeat">Assign seat</button><button type="button" class="btn btn-brand-o" id="rmSeats">Remove seats</button><button type="button" class="btn btn-brand-o" id="buySeats">Buy seats</button></div>
        <div class="seat-bulk" id="seatBulk"><div class="seat-hint">Tick seats to give them all the same cost centre, or pick one for each person below.</div>
          <div class="seat-tools"><label class="form-check mb-0"><input class="form-check-input" type="checkbox" id="selAll"><span class="form-check-label small">Select all</span></label>
            <select id="bulkCc" class="form-select form-select-sm w-auto" aria-label="Cost centre for the ticked seats">${ccOpts('')}</select><button type="button" class="btn btn-brand btn-sm" id="bulkApply" disabled>Apply to selected</button></div></div>
        <div id="lTable"></div></section>
      <section class="bcard p-0 overflow-hidden" aria-label="Phone numbers" data-plain><div id="didTable"></div></section>
      ${storageSection()}
      <section class="bcard p-0 overflow-hidden" aria-label="AI agent usage" data-plain><div id="aiTable"></div></section>
      ${faxSection()}</div>`;
    { const k = [...host.firstElementChild.children]; B.sectionTabs({ anchor: k[0], groups: [[k[0], k[1]], [k[2]], [k[3]], [k[4]], [k[5], k[6]]], labels: ['Licences', 'Numbers', 'Storage', 'AI', 'Fax'], icons: [B.pillIcons.doc, B.pillIcons.hash, B.pillIcons.db, B.pillIcons.spark, B.pillIcons.fax], key: 'licences' }); }

    B.DataTable(host.querySelector('#didTable'), {
      caption: 'DID numbers', toolbar: false, search: false, compactPager: true, pageSize: 25, idKey: 'id', rows: () => S.dids, emptyText: 'No phone numbers on this account yet.',
      columns: [
        { key: 'number', label: 'DID Number', render: r => `<span class="did-n"><span class="did-flag" title="${esc(r.country)}">${esc(r.flag)}</span>${esc(r.number)}</span>` },
        { key: 'from', label: 'Duration', render: r => `<span class="text-nowrap">${esc(r.from)} - ${esc(r.to)}</span>` },
        { key: 'cost', label: 'DID Cost ($)', render: r => `<span class="did-cost">${r.cost.toFixed(2)}</span>${r.cost === 0 ? '<span class="did-free">FREE</span>' : ''}` }
      ]
    });
    B.DataTable(host.querySelector('#aiTable'), {
      caption: 'AI agent usage', toolbar: false, search: false, compactPager: true, pageSize: 25, idKey: 'id', rows: () => S.aiAgents,
      emptyHtml: NONE_ART + '<strong class="did-none">No Agent Usage Found!</strong>',
      columns: [{ key: 'name', label: 'Agent Name' }, { key: 'type', label: 'Type' }, { key: 'total', label: 'Total USD', render: r => B.money(r.total) }, { key: 'minutes', label: 'Used Minutes', render: r => B.num(r.minutes) }, { key: 'messages', label: 'Used Messages', render: r => B.num(r.messages) }]
    });
    host.querySelectorAll('[data-go-addons]').forEach(b => b.onclick = () => B.go('add-ons'));
    { const from = host.querySelector('#fxFrom'), to = host.querySelector('#fxTo'), err = host.querySelector('#faxErr');
      const check = () => { const bad = from.value && to.value && from.value > to.value; err.hidden = !bad; from.classList.toggle('is-invalid', !!bad); return !bad; };
      from.addEventListener('change', check); to.addEventListener('change', check); from.addEventListener('input', check); to.addEventListener('input', check);
      host.querySelector('#faxCsv').onclick = () => {
        if (!check()) return B.toast('The first day cannot be after the last day.', 'error', 'Check the dates');
        if (!S.faxHistory.length) return B.toast('There are no faxes in these days to download.', 'error', 'Nothing to download');
        B.download('fax-history.csv', B.csv(['Date', 'Line', 'Direction', 'Status', 'Pages'], S.faxHistory.map(f => [f.date, f.line, f.dir, f.status, f.pages])), 'text/csv');
      }; }
    host.querySelector('#assignSeat').onclick = () => assign();
    host.querySelector('#rmSeats').onclick = () => B.manageSeats(draw);
    host.querySelector('#buySeats').onclick = () => buy();
    const upd = () => { const n = [...sel].filter(id => S.licences.some(l => l.id === id)).length, ap = host.querySelector('#bulkApply'), sa = host.querySelector('#selAll'); ap.disabled = !n; ap.textContent = n ? `Apply to ${n} selected` : 'Apply to selected'; sa.checked = !!n && n === S.licences.length; sa.indeterminate = n > 0 && n < S.licences.length; };
    dt = B.DataTable(host.querySelector('#lTable'), {
      caption: 'Seat allocation', toolbar: false, search: false, compactPager: true, pageSize: 25, rows: () => S.licences, idKey: 'id', emptyText: 'No licences assigned yet.',
      columns: [
        { key: '_sel', label: '', sortable: false, render: r => `<input class="form-check-input" type="checkbox" data-sel="${r.id}" ${sel.has(r.id) ? 'checked' : ''} aria-label="Select ${esc(r.user)}">` },
        { key: 'user', label: 'Name', render: r => `<div class="seat-who"><span class="seat-av" aria-hidden="true">${esc(initials(r.user))}</span><div><div class="fw-semibold">${esc(r.user)}</div><div class="text-muted small">${esc((r.tier || '').replace(' Seat', '').toLowerCase())}</div><div class="text-muted small">${esc(r.email)}</div></div></div>` },
        { key: 'ext', label: 'User ID', hide: 'sm', sortable: false, render: r => `<span class="mono seat-id">${ext(r)}</span>` },
        { key: 'cc', label: 'Cost centre', sortable: false, render: r => `<select class="form-select form-select-sm seat-cc" data-cc="${r.id}" aria-label="Cost centre for ${esc(r.user)}">${ccOpts(r.cc || '')}</select><div class="seat-under"><span class="cc-note">${r.cc ? `Charged to ${esc(r.cc)}.` : 'Unallocated \u2014 nothing set on this person; their spend is not charged to a cost centre.'}</span>${r.cc ? `<button type="button" class="btn btn-link btn-sm p-0" data-sync="${r.id}">Sync across entries</button>` : ''}</div>` },
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
    const box = host.querySelector('#lTable');
    box.addEventListener('change', e => {
      const c1 = e.target.closest('[data-sel]'), k = e.target.closest('[data-cc]');
      if (c1) { c1.checked ? sel.add(+c1.dataset.sel) : sel.delete(+c1.dataset.sel); upd(); }
      else if (k) { const l = S.licences.find(x => x.id === +k.dataset.cc); if (l && (l.cc || '') !== e.target.value) { l.cc = e.target.value; B.toast(e.target.value ? `${l.user} is now charged to ${e.target.value}.` : `${l.user} is unallocated.`, 'ok', 'Cost centre updated'); dt.refresh(); } }
    });
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-sync]'); if (!b) return; const l = S.licences.find(x => x.id === +b.dataset.sync); if (!l || !l.cc) return;
      B.confirm({ title: 'Apply to every seat?', okLabel: 'Apply to all', message: `All ${S.licences.length} seats will be charged to ${l.cc}.`, onOk: () => { S.licences.forEach(x => { x.cc = l.cc; }); B.toast(`All seats are now charged to ${l.cc}.`, 'ok', 'Cost centre synced'); dt.refresh(); } });
    });
    host.querySelector('#selAll').onchange = e => { e.target.checked ? S.licences.forEach(l => sel.add(l.id)) : sel.clear(); dt.refresh(); upd(); };
    host.querySelector('#bulkApply').onclick = () => {
      const cc = host.querySelector('#bulkCc').value, ids = [...sel].filter(id => S.licences.some(l => l.id === id));
      if (!ids.length) return B.toast('Tick at least one seat first.', 'error', 'No seats selected');
      S.licences.forEach(l => { if (ids.includes(l.id)) l.cc = cc; });
      B.toast(cc ? `${ids.length} seat${ids.length === 1 ? '' : 's'} charged to ${cc}.` : `${ids.length} seat${ids.length === 1 ? '' : 's'} unallocated.`, 'ok', 'Cost centre updated'); sel.clear(); dt.refresh(); upd();
    };
    upd();
  }

  function assign() {
    B.form({ title: 'Assign licence', submitLabel: 'Assign', size: 'modal-md',
      intro: `${C.available()} licence${C.available() === 1 ? '' : 's'} available.`,
      fields: [
        { name: 'user', label: 'Full name', required: true, minLength: 2, maxLength: 60, col: 'col-12', autocomplete: 'off' },
        { name: 'email', label: 'Work email', type: 'email', required: true, col: 'col-12',
          validate: v => S.licences.some(l => l.email.toLowerCase() === v.toLowerCase()) ? 'This email already has a licence.' : '' }
      ],
      onSubmit: v => {
        if (C.available() < 1) return { user: 'No licences available. Buy more licences first.' };
        S.licences.push({ id: ++nextId, user: v.user, email: v.email, tier: 'Ultimate Seat', status: 'Active', assigned: S.today });
        B.toast(`Licence assigned to ${v.user}.`); if (host.isConnected) draw();
      } });
  }

  function buy(done) {
    B.form({ title: 'Buy licences', submitLabel: 'Buy', size: 'modal-md',
      intro: `Each extra licence adds ${B.money(S.plan.rate)} per month to your next bill.`,
      fields: [{ name: 'qty', label: 'Quantity', type: 'number', required: true, integer: true, gt: 0, gtMsg: 'Quantity must be greater than 0.', max: 500, col: 'col-12' }],
      impact: v => { const q = Number(v.qty); if (!/^\d+$/.test(v.qty) || q < 1 || q > 500) return ''; return B.impact([['Added each month', B.money(q * S.plan.rate)], ['Total licences', `${S.seats} → ${S.seats + q}`], ['Seat charges', `${B.money(C.seatsTotal())} → ${B.money(C.seatsTotal() + q * S.plan.rate)}`]]); },
      onSubmit: v => { S.seats += Number(v.qty); B.toast(`${v.qty} licence(s) added.`); if (typeof done === 'function') done(); else if (host.isConnected) draw(); } });
  }
  B.buySeats = buy;
  B.assignLicence = assign;   // used by the card hover popups (Assigned / Available tiles)
})(window.Billing);
