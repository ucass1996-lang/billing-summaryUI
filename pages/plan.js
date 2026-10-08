/* Plan Summary: current plan, allowances, plan comparison, extras, and seat/number/storage/AI panel. */
(function (B) {
  const S = B.state, C = B.calc, esc = B.esc, $ = B.money;
  let host, panel = 'licence', featAll = false;

  S.cancelAt = S.cancelAt || null;

  /* After a plan is picked and confirmed: show what happened, then return to the Billing Summary. */
  B.planChanged = () => {
    const c = B.lastPlanChange; if (!c) return;
    const up = c.kind === 'up', row = (k, v) => `<div class="pc-row"><span>${k}</span><b>${v}</b></div>`;
    const m = B.modal({ title: up ? 'Plan upgraded' : 'Downgrade scheduled', size: 'modal-sm',
      body: `<div class="pc-ok"><div class="pc-tick ${up ? '' : 'sched'}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${up ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>' : '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'}</svg></div>
        <h3 class="pc-h">${up ? `You are now on ${esc(c.name)}` : `${esc(c.name)} starts ${B.fmtDate(c.effective)}`}</h3>
        <p class="pc-p">${up ? 'Your new plan is active today and the next bill is updated.' : `You keep ${esc(S.plan.name)} until then. Nothing changes on your bill today.`}</p>
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
    const lp = lastPaid(), cancel = S.cancelAt;
    const cur = S.plans.find(p => p.name === S.plan.name);
    const ico = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.4 6.7 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z"/></svg>';
    host.innerHTML = `<div class="d-grid gap-3">
      <section class="ao-card pl-hero" aria-label="Current plan">
        <div class="pl-top">
          <div class="pl-id"><div class="pl-ico">${ico}</div>
            <div><div class="pl-kick">Your current plan</div>
              <div class="ao-name pl-name">${esc(S.plan.name)} ${cancel ? B.badge('Cancels ' + B.fmtDate(cancel), 'bad') : B.badge('Active', 'ok')}</div>
              <div class="pl-sub"><b>${$(S.plan.rate)}</b> per seat a month <span class="pl-dot"></span> billed ${esc(S.plan.cycle.toLowerCase())} <span class="pl-dot"></span> ${S.seats} seats${cur ? ` <span class="pl-dot"></span> ${esc(cur.inc.minutes)} calling` : ''}</div>
              ${S.scheduledPlan ? `<div class="pl-note">${B.badge('Scheduled', 'warn')} Moves to <b>${esc(S.scheduledPlan.name)}</b> on ${B.fmtDate(S.scheduledPlan.effective)}. <button type="button" class="btn btn-link p-0 align-baseline" id="undoSched">Cancel change</button></div>` : ''}</div></div>
          <div class="pl-actions">${cancel ? '<button type="button" class="btn btn-brand-o" id="keepSub">Keep subscription</button>' : ''}<button type="button" class="btn btn-brand" data-chg>Change plan</button><button type="button" class="btn btn-brand-o" id="dlInv">Download invoice</button></div></div>
        <div class="p-3 pt-0"><div class="row g-3">
          <div class="col-6 col-xl-3"><div class="tile accent"><div class="eyebrow">Last payment</div><div class="t-val">${lp ? $(lp.amount) : '—'}</div><div class="t-note">${lp ? 'Paid ' + B.fmtDate(lp.date) : 'No payment yet'}</div></div></div>
          <div class="col-6 col-xl-3"><div class="tile"><div class="eyebrow">Next bill</div><div class="t-val">${$(C.estimate())}</div><div class="t-note">${S.seats} seats × ${$(S.plan.rate)}${C.addonsTotal() ? ` + ${$(C.addonsTotal())} add-ons` : ''}</div></div></div>
          <div class="col-6 col-xl-3"><div class="tile"><div class="eyebrow">${cancel ? 'Ends on' : 'Renewing on'}</div><div class="t-val sm">${B.fmtDate(S.period.next)}</div><div class="t-note">Billed every month</div></div></div>
          <div class="col-6 col-xl-3"><div class="tile"><div class="eyebrow">Seats</div><div class="t-val">${C.assigned()} of ${S.seats}</div><div class="t-note">Assigned of the seats you pay for</div></div></div>
        </div></div></section>

      <div class="row g-3" data-tabgroup="overview">
        <div class="col-12 col-xxl-7">${includes()}</div>
        <div class="col-12 col-xxl-5"><section class="ao-card" aria-label="Seats and resources">
          <div class="tabs" role="tablist" aria-label="Plan resources">${[['licence', 'Licence'], ['numbers', 'Numbers'], ['storage', 'Storage'], ['ai', 'AI']].map(t => `<button type="button" role="tab" class="tab ${panel === t[0] ? 'active' : ''}" aria-selected="${panel === t[0]}" data-panel="${t[0]}">${t[1]}</button>`).join('')}</div>
          <div class="p-3" id="sidePanel" role="tabpanel"></div></section></div>
      </div>
      <div data-tabgroup="compare">${matrix()}</div>
      <div data-tabgroup="ai">${allowances()}</div>
      <div data-tabgroup="extras">${extras()}</div></div>`;

    host.querySelectorAll('[data-go]').forEach(b => b.onclick = () => B.go(b.dataset.go));
    host.querySelectorAll('[data-chg]').forEach(b => b.onclick = () => B.openChangePlan(() => { draw(); B.planChanged(); }));
    host.querySelector('#undoSched')?.addEventListener('click', () => { S.scheduledPlan = null; B.toast('Plan change cancelled.'); draw(); });
    host.querySelectorAll('[data-pickplan]').forEach(b => b.onclick = () => B.openChangePlan(() => { draw(); B.planChanged(); }, b.dataset.pickplan));
    host.querySelector('[data-feat]')?.addEventListener('click', () => { featAll = !featAll; draw(); });
    host.querySelectorAll('[data-rates]').forEach(b => b.onclick = () => openRates(b.dataset.rates));
    host.querySelector('#dlInv').onclick = () => { const r = lastPaid(); if (!r) return B.toast('There is no paid invoice to download yet.', 'error'); B.showReceipt(B.activityInvoice(r)); };
    host.querySelector('#keepSub')?.addEventListener('click', () => { S.cancelAt = null; B.toast('Subscription kept.'); draw(); });
    host.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => { panel = b.dataset.panel; draw(); });
    side(host.querySelector('#sidePanel'));
    const g = n => [host.querySelector(`[data-tabgroup="${n}"]`)];
    B.sectionTabs({ anchor: g('overview')[0], groups: [g('overview'), g('compare'), g('ai'), g('extras')], labels: ['Overview', 'Compare plans', 'AI & rates', 'Extras'], key: 'plan' });
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
        <div class="col-6"><div class="tile"><div class="eyebrow">AI minutes included</div><div class="t-val sm">${esc(i ? i.aiMin : 'Not included')}</div></div></div>
        <div class="col-6"><div class="tile"><div class="eyebrow">AI replies included</div><div class="t-val sm">${esc(i ? i.aiReplies : 'Not included')}</div></div></div></div>
        <div class="bsub p-3 mb-2 d-flex flex-wrap justify-content-between align-items-center gap-2"><strong class="small">Available Minutes</strong><button type="button" class="btn btn-brand-o" data-rates="minutes">Choose Available Minutes</button></div>
        <div class="bsub p-3 mb-2 d-flex flex-wrap justify-content-between align-items-center gap-2"><strong class="small">Available Fax</strong><button type="button" class="btn btn-brand-o" data-rates="fax">Choose Available Fax</button></div>
        <div class="bsub p-3 mb-2 d-flex flex-wrap justify-content-between align-items-center gap-2"><strong class="small">Available SMS/MMS</strong><button type="button" class="btn btn-brand-o" data-rates="sms">Choose Available SMS/MMS</button></div></div></section>`;
  }

  function includes() {
    const rows = [['voice', 'Calling'], ['sms', 'Text messages'], ['meetings', 'Meetings'], ['storage', 'Recording storage']];
    return `<section class="ao-card" aria-label="What your plan includes"><div class="ao-head"><div><div class="ao-name">What your plan includes</div><div class="ao-desc">Each allowance, how much of it you have used, and what is left.</div></div></div>
      <div class="table-responsive"><table class="table btable align-middle"><caption class="visually-hidden">Plan allowances</caption><thead><tr>${['Allowance', 'Included', 'Used', 'Left'].map((h, n) => `<th scope="col" class="${n ? 'text-end' : ''}"><span class="th-static">${h}</span></th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => { const u = inc(r[0]); const left = Math.max(0, u.included - u.used); return `<tr><td class="fw-semibold">${r[1]}</td><td class="text-end">${B.num(u.included)} ${esc(u.unit)}</td><td class="text-end">${B.num(u.used)} ${esc(u.unit)}<div class="pl-bar" aria-hidden="true"><i style="width:${Math.min(100, Math.round(u.used / (u.included || 1) * 100))}%"></i></div></td><td class="text-end">${left ? B.num(left) + ' ' + esc(u.unit) : '<span class="text-danger">None left</span>'}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  }

  function matrix() {
    const P = plans(), rows = [['Calling', 'minutes'], ['Text messages', 'sms'], ['Numbers included', 'numbers'], ['Recording storage', 'storage'], ['AI minutes', 'aiMin'], ['AI replies', 'aiReplies']];
    const isCur = p => p.name === S.plan.name, tick = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    const val = v => /^(none|—|-)$/i.test(String(v).trim()) ? `<span class="pl-none">${esc(v)}</span>` : /unlimited/i.test(v) ? `<b class="pl-yes">${esc(v)}</b>` : `<b>${esc(v)}</b>`;
    const shown = p => featAll ? p.features : p.features.slice(0, 4), more = Math.max(...P.map(p => p.features.length)) > 4;
    const cols = `--pl-n:${P.length}`;
    const card = p => {
      const diff = Math.round((p.monthly - S.plan.rate) * 100) / 100, kind = isCur(p) ? 'cur' : diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
      return `<div class="pl-hc" role="columnheader"><div class="pl-card ${kind === 'cur' ? 'is-cur' : ''}">
        <div class="pl-tag">${kind === 'cur' ? B.badge('Your plan', 'ok') : kind === 'up' ? B.badge('Upgrade', 'info') : kind === 'down' ? B.badge('Downgrade', 'warn') : B.badge('Same price', 'muted')}</div>
        <div class="pl-pn">${esc(p.name)}</div>
        <div class="pl-price">${$(p.monthly)}<span>per ${esc(p.unit)} / mo</span></div>
        <div class="pl-delta">${kind === 'cur' ? 'What you pay today' : diff === 0 ? 'No price change' : `${diff > 0 ? '+' : '−'}${$(Math.abs(diff))} vs your plan`}</div>
        <button type="button" class="btn ${kind === 'up' ? 'btn-brand' : 'btn-brand-o'}" ${kind === 'cur' ? 'disabled' : `data-pickplan="${esc(p.id)}"`}>${kind === 'cur' ? 'Current plan' : 'Select plan'}</button></div></div>`;
    };
    const cell = (p, inner, cls = '') => `<div class="pl-c ${isCur(p) ? 'is-cur' : ''} ${cls}" role="cell">${inner}</div>`;
    return `<section class="ao-card pl-cmp" aria-label="What each plan includes"><div class="ao-head"><div><div class="ao-name">What each plan includes</div><div class="ao-desc">Business phone plans side by side. Your plan is highlighted, and each price shows how it compares with yours.</div></div></div>
      <div class="pl-scroll" tabindex="0" role="region" aria-label="Plan comparison. Scroll sideways on small screens.">
        <div class="pl-grid" role="table" aria-label="Plan comparison" style="${cols}">
          <div class="pl-row pl-heads" role="row"><div class="pl-corner" role="columnheader"><div class="pl-ck">Compare plans</div><div class="pl-cs">Prices are per seat, per month. Allowances reset every billing period.</div></div>${P.map(card).join('')}</div>
          <div class="pl-grp" role="row"><span role="columnheader">Allowances</span><em>per seat each month</em></div>
          ${rows.map(r => `<div class="pl-row" role="row"><div class="pl-rl" role="rowheader">${r[0]}</div>${P.map(p => cell(p, val(p.inc[r[1]]))).join('')}</div>`).join('')}
          <div class="pl-grp" role="row"><span role="columnheader">Highlights</span></div>
          <div class="pl-row pl-feat" role="row"><div class="pl-rl" role="rowheader">What's included</div>${P.map(p => cell(p, `<ul>${shown(p).map(f => `<li><i>${tick}</i><span>${esc(f)}</span></li>`).join('')}</ul>`)).join('')}</div>
        </div></div>
      ${more ? `<div class="pl-more"><button type="button" class="btn btn-brand-o btn-sm" data-feat aria-expanded="${featAll}">${featAll ? 'Show fewer features' : 'Show all features'}</button></div>` : ''}
      <div class="px-3 py-2 small" style="background:var(--info-bg);color:var(--info)">Allowances are per seat each month. Anything beyond them is billed at the rates on the Usage page.</div></section>`;
  }

  function extras() {
    const items = S.addons.filter(a => a.status !== 'Coming soon').slice(0, 8);
    return `<section class="ao-card" aria-label="Add extras to a plan"><div class="ao-head"><div><div class="ao-name">Add extras to a plan ${B.badge('Optional', 'warn')}</div><div class="ao-desc">Extras you can add at any time. They are billed with the plan.</div></div><button type="button" class="btn btn-brand-o" data-go="add-ons">All add-ons</button></div>
      <div class="table-responsive"><table class="table btable align-middle"><caption class="visually-hidden">Add-ons</caption><thead><tr><th scope="col"><span class="th-static">Add-on</span></th><th scope="col" class="text-end"><span class="th-static">Price</span></th><th scope="col" class="d-none d-md-table-cell"><span class="th-static">Charged</span></th></tr></thead>
        <tbody>${items.map(a => `<tr><td><div class="fw-semibold">${esc(a.name)}</div><div class="text-muted small">${esc(a.description)}</div></td><td class="text-end fw-bold">${$(a.price)}</td><td class="d-none d-md-table-cell text-muted small">${esc(a.unit)}, ${esc(a.freq.toLowerCase())}</td></tr>`).join('')}</tbody></table></div></section>`;
  }

  /* ---- right-hand tabs ---- */
  function side(p) {
    if (panel === 'licence') {
      const inUse = C.assigned(), unassigned = Math.max(0, S.seats - inUse - C.pending());
      p.innerHTML = `<div class="bsub mb-3">${[['Seats in use', inUse], ['Paid but unassigned', unassigned], ['Scheduled for removal', 0], ['Total seats on plan', S.seats], ['Seats you pay for next', `${S.seats} (${$(S.seats * S.plan.rate)}/month)`]].map(r => `<div class="ao-row" style="padding:8px 14px"><span class="small">${r[0]}</span><strong>${r[1]}</strong></div>`).join('').replace('border-top', 'border-top')}</div>
        <p class="small text-muted">Seats you remove stop being billed from the next period. Seats you add are charged in proportion for the rest of this one.</p>
        <div class="d-flex flex-wrap justify-content-end gap-2 mb-3"><button type="button" class="btn btn-brand-o" id="rmSeats">Remove seats</button><button type="button" class="btn btn-brand-o" id="buySeats">Buy seats</button></div>
        <div id="seatTable"></div>`;
      p.querySelector('#rmSeats').onclick = () => B.manageSeats(draw);
      p.querySelector('#buySeats').onclick = () => B.buySeats(draw);
      B.DataTable(p.querySelector('#seatTable'), {
        caption: 'Licences', toolbar: false, search: false, compactPager: true, pageSize: 25, rows: () => S.licences, idKey: 'id', emptyText: 'No licences assigned yet.',
        columns: [
          { key: 'user', label: 'Name', render: r => `<div class="fw-semibold">${esc(r.user)}</div><div class="text-muted small">${esc(r.email)}</div>` },
          { key: 'tier', label: 'Licence', hide: 'sm' },
          { key: 'status', label: 'Status', render: r => B.badge(r.status, B.statusKind(r.status)) }
        ]
      });
    } else if (panel === 'numbers') {
      const r = S.resources[0];
      p.innerHTML = `<div class="d-flex justify-content-between mb-1"><strong>Phone numbers</strong><span class="text-muted small">${r.used} of ${r.limit} used</span></div>
        <div class="progress mb-3" role="progressbar" aria-label="Phone numbers used" aria-valuenow="${B.pct(r.used, r.limit)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${B.pct(r.used, r.limit)}%"></div></div>
        <ul class="list-unstyled small mb-3">${['+1 (555) 010-2041', '+1 (555) 010-2042'].map(n => `<li class="d-flex justify-content-between border-bottom py-2"><span class="mono">${n}</span><span class="text-muted">Direct dial</span></li>`).join('')}</ul>
        <button type="button" class="btn btn-brand-o" data-go="add-ons">Add numbers</button>`;
    } else if (panel === 'storage') {
      const r = S.resources[3], pct = B.pct(r.used, r.limit);
      p.innerHTML = `<div class="d-flex justify-content-between mb-1"><strong>Recording storage</strong><span class="text-muted small">${r.used} of ${r.limit} GB used</span></div>
        <div class="progress mb-2" role="progressbar" aria-label="Storage used" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${pct >= 85 ? 'near' : ''}" style="width:${pct}%"></div></div>
        <p class="small text-muted">${r.limit - r.used} GB left${pct >= 85 ? ' · near the limit' : ''}. Extra storage is sold in 50 GB blocks.</p><button type="button" class="btn btn-brand-o" data-go="add-ons">Add storage</button>`;
    } else {
      const u = inc('ai'), pct = B.pct(u.used, u.included);
      p.innerHTML = `<div class="d-flex justify-content-between mb-1"><strong>AI usage</strong><span class="text-muted small">${B.num(u.used)} of ${B.num(u.included)} tokens</span></div>
        <div class="progress mb-2" role="progressbar" aria-label="AI usage" aria-valuenow="${Math.min(pct, 100)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${pct > 100 ? 'over' : ''}" style="width:${Math.min(pct, 100)}%"></div></div>
        <p class="small ${pct > 100 ? 'text-danger' : 'text-muted'}">${pct > 100 ? `Over the allowance by ${B.num(u.used - u.included)} tokens, ${$((u.used - u.included) * u.rate)} charged.` : 'Within the allowance.'}</p><button type="button" class="btn btn-brand-o" data-go="usage">See usage</button>`;
    }
    p.querySelectorAll('[data-go]').forEach(b => b.onclick = () => B.go(b.dataset.go));
  }
})(window.Billing);
