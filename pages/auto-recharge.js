/* Auto Recharge: a section of Credit & Payment (tab "Auto recharge") plus the compact card on the Summary page.
   State lives in B.state like the rest of the project (no backend). The page keeps a draft until Save is confirmed. */
(function (B) {
  const S = B.state, esc = B.esc, $ = B.money;
  const r2 = n => Math.round(n * 100) / 100;
  const DEFAULTS = { on: false, threshold: 10, amount: 20, methodId: null, limit: 100, notify: true };

  S.autoRecharge = S.autoRecharge || Object.assign({ spent: 0, state: 'ok', failReason: '', lastRun: null }, DEFAULTS);
  S.autoLog = S.autoLog || [
    { id: 2, date: '2026-09-12', type: 'recharge', amount: 20, status: 'Paid', text: 'Balance fell below $10.00 · recharged', ref: 'AR-884102' },
    { id: 1, date: '2026-09-03', type: 'settings', amount: 0, status: 'Saved', text: 'Auto recharge turned on', ref: 'AR-880377' }
  ];

  let arRange = '', P, redraw, d, touched = {}, tried = false, saving = false, busy = false, loading = false;
  const a = () => S.autoRecharge;
  const method = (id = a().methodId) => S.methods.find(m => m.id === id) || S.methods.find(m => m.primary) || S.methods[0] || null;
  const mLabel = m => m ? `${m.brand} •••• ${m.last4}` : 'No payment method';
  const money = s => /^\d{1,5}(\.\d{1,2})?$/.test(String(s).trim()) && +s > 0;
  const isExpired = m => { const [mo, yr] = String(m.exp).split('/').map(x => +x); const t = S.today.split('-'); return !mo || (2000 + yr) < +t[0] || ((2000 + yr) === +t[0] && mo < +t[1]); };
  const fromSaved = () => ({ on: a().on, threshold: String(a().threshold), amount: String(a().amount), methodId: a().methodId, limit: String(a().limit), notify: a().notify });
  const remaining = () => Math.max(0, r2(a().limit - a().spent));

  /* ---------- history (the existing activity pattern: ledger + activity rows, plus this section's own log) ---------- */
  const nextId = list => Math.max(0, ...list.map(x => x.id)) + 1;
  const log = (type, amount, status, text) => S.autoLog.unshift({ id: nextId(S.autoLog), date: S.today, type, amount, status, text, ref: 'AR-' + String(Date.now()).slice(-6) });

  /* ---------- validation ---------- */
  function validate(v) {
    const e = {};
    if (!v.on) return e;
    const t = String(v.threshold).trim(), m = String(v.amount).trim(), l = String(v.limit).trim();
    if (!t) e.threshold = 'Enter the balance that triggers a recharge.'; else if (!money(t)) e.threshold = 'Enter a positive amount, for example 10 or 10.50.';
    if (!m) e.amount = 'Enter how much to add each time.'; else if (!money(m)) e.amount = 'Enter a positive amount, for example 20 or 20.50.';
    else if (!e.threshold && +m <= +t) e.amount = `The recharge amount must be greater than the threshold (${$(+t)}).`;
    else if (+m > 5000) e.amount = 'The most you can add in one recharge is $5,000.00.';
    if (!l) e.limit = 'Enter the most that can be recharged in a month.'; else if (!money(l)) e.limit = 'Enter a positive amount, for example 100.';
    else if (!e.amount && m && +l < +m) e.limit = `The monthly limit must be at least the recharge amount (${$(+m)}).`;
    if (!S.methods.length) e.method = 'Add a payment method first. Recharges are charged to a saved card.';
    else if (!method(v.methodId)) e.method = 'Choose a payment method.';
    return e;
  }
  const dirty = () => JSON.stringify(d) !== JSON.stringify(fromSaved());

  /* ---------- the recharge itself ---------- */
  function check(manual) {
    if (busy) return;
    if (!a().on) { if (manual) B.toast('Auto recharge is turned off.', 'info', 'Nothing to run'); return; }
    if (S.credit >= a().threshold) { if (manual) B.toast(`Your balance of ${$(S.credit)} is above the ${$(a().threshold)} threshold, so no recharge is needed.`, 'info', 'Balance is fine'); return; }
    if (a().notify) B.toast(`Your balance of ${$(S.credit)} is below ${$(a().threshold)}.`, 'warn', 'Low credit');
    if (remaining() < a().amount) {
      a().state = 'limit'; log('limit', 0, 'Paused', `Monthly limit reached (${$(a().spent)} of ${$(a().limit)})`);
      B.toast(`${$(a().spent)} of ${$(a().limit)} has been recharged this month, so auto recharge is paused.`, 'warn', 'Monthly limit reached'); return refresh();
    }
    const m = method();
    if (!m) return fail('No payment method is saved.', null);
    busy = true; refresh();
    setTimeout(() => {
      busy = false;
      const err = isExpired(m) ? `${mLabel(m)} has expired.` : m.last4 === '0002' ? 'The bank declined this payment.' : '';
      err ? fail(err, m) : pay(m);
      refresh();
    }, 900);
  }
  function pay(m) {
    const amt = a().amount, ref = 'AR-' + String(Date.now()).slice(-6);
    S.credit = r2(S.credit + amt); a().spent = r2(a().spent + amt); a().state = 'ok'; a().failReason = ''; a().lastRun = S.today;
    S.ledger.push({ id: S.ledger.length + 1, date: S.today, description: 'Auto recharge', ref, debit: 0, credit: amt, type: 'credit' });
    S.activity.unshift({ id: nextId(S.activity), date: S.today, amount: amt, status: 'Paid', description: 'Auto recharge', ref: String(Date.now()).slice(-12) });
    log('recharge', amt, 'Paid', `Recharged ${$(amt)} to ${mLabel(m)}`);
    B.toast(`${$(amt)} was added using ${mLabel(m)}. Balance is now ${$(S.credit)}.`, 'ok', 'Auto recharge complete');
  }
  function fail(reason, m) {
    a().state = 'failed'; a().failReason = reason; a().lastRun = S.today;
    S.activity.unshift({ id: nextId(S.activity), date: S.today, amount: a().amount, status: 'Failed', description: 'Auto recharge failed: ' + reason, ref: String(Date.now()).slice(-12) });
    log('failed', a().amount, 'Failed', reason);
    B.toast(`${reason} Retry the payment or update your payment method.`, 'error', 'Auto recharge failed');
    if (!m) refresh();
  }
  /* The same check runs after any charge that lowers the balance (for example a prorated upgrade). */
  B.autoRechargeCheck = () => { if (a().on) setTimeout(() => check(false), 400); };

  function refresh() { if (P && P.isConnected) draw(); }

  /* ---------- screen ---------- */
  B.autoRecharge = {
    render(panel, back) {
      P = panel; redraw = back; d = fromSaved(); touched = {}; tried = false; saving = false;
      loading = true; P.innerHTML = '<div class="sk-wrap" aria-busy="true"><div class="sk" style="width:40%;height:18px;margin-bottom:14px"></div><div class="sk" style="height:150px;margin-bottom:12px"></div><div class="sk" style="width:70%"></div></div>';
      setTimeout(() => { loading = false; refresh(); }, 280);
    }
  };

  const badgeFor = () => {
    if (!a().on) return B.badge('Disabled', 'muted');
    return a().state === 'failed' ? B.badge('Payment failed', 'bad') : a().state === 'limit' ? B.badge('Limit reached', 'warn') : B.badge('Enabled', 'ok');
  };

  function banner() {
    if (a().state === 'failed') return `<div class="ar-alert bad" role="alert"><div><b>Payment failed.</b> ${esc(a().failReason)} Your balance is ${$(S.credit)}${S.credit < a().threshold ? ', below the recharge threshold' : ''}.</div>
      <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-sm btn-brand" data-ar="retry" ${busy ? 'disabled' : ''}>${busy ? '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Retrying…' : 'Retry payment'}</button><button type="button" class="btn btn-sm btn-brand-o" data-ar="update">Update payment method</button></div></div>`;
    if (a().state === 'limit') return `<div class="ar-alert warn" role="alert"><div><b>Monthly limit reached.</b> ${$(a().spent)} of ${$(a().limit)} has been recharged this month, so no more automatic top-ups until ${B.fmtDate(S.period.next)}.</div>
      <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-sm btn-brand" data-ar="raise">Raise the limit</button><button type="button" class="btn btn-sm btn-brand-o" data-ar="topup">Add credit now</button></div></div>`;
    return '';
  }

  function field(id, label, hint, extra = '') {
    return `<div class="col-12 col-md-6 col-xl-4"><label class="form-label ar-lbl" for="ar_${id}"><span class="ar-li">${B.icon(id === 'limit' ? 'wallet' : 'payment', 15)}</span>${label}</label>
      <div class="input-group"><span class="input-group-text">$</span><input id="ar_${id}" class="form-control" inputmode="decimal" autocomplete="off" value="${esc(d[id])}" ${d.on ? '' : 'disabled'} aria-describedby="ar_${id}_h ar_${id}_e" ${extra}></div>
      <div class="ar-hint" id="ar_${id}_h">${hint}</div><div class="ar-err" id="ar_${id}_e" role="alert"></div></div>`;
  }

  function draw() {
    if (!P || !P.isConnected || loading) return;
    const used = a().limit ? Math.min(100, Math.round(a().spent / a().limit * 100)) : 0, tone = a().state === 'limit' || used >= 100 ? 'bg-warning' : a().state === 'failed' ? 'bg-danger' : '';
    const m = method(d.methodId), lastAmt = S.autoLog.find(x => x.type === 'recharge');
    P.innerHTML = `<div class="d-grid gap-3 ar-page">
      ${banner()}
      <div class="row g-3">
        <div class="col-12 col-xl-8"><section class="bsub ar-card h-100" aria-labelledby="arh">
          <div class="ar-head"><span class="ar-hico">${B.icon('power', 22)}</span><div class="me-auto"><h2 class="ar-title" id="arh">Auto Recharge</h2><p class="ar-sub">Automatically add credits when your balance is low. Keep your service active without interruption.</p></div>
            <label class="ar-sw" for="ar_on"><span class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="ar_on" ${d.on ? 'checked' : ''} ${saving ? 'disabled' : ''}></span>${badgeFor()}</label></div>
          <form id="arForm" novalidate><div class="row g-3 mt-0 ${d.on ? '' : 'ar-off'}">
            <div class="col-12 col-md-6 col-xl-4"><label class="form-label ar-lbl" for="ar_method"><span class="ar-li">${B.icon('card', 15)}</span>Payment Method</label>
              <select id="ar_method" class="form-select" ${d.on && S.methods.length ? '' : 'disabled'} aria-describedby="ar_method_e">${S.methods.length ? S.methods.map(x => `<option value="${x.id}" ${m && m.id === x.id ? 'selected' : ''}>${esc(x.brand)} ending in ${esc(x.last4)}${x.primary ? ' (primary)' : ''}</option>`).join('') : '<option>No card saved</option>'}</select>
              <div class="ar-hint">${S.methods.length ? 'The card that is charged.' : ''}</div><div class="ar-err" id="ar_method_e" role="alert"></div>
              ${!S.methods.length ? '<button type="button" class="btn btn-link btn-sm p-0" data-ar="update">Add a payment method</button>' : ''}</div>
            ${field('threshold', 'Recharge Threshold', 'Recharge when the balance falls below this.')}
            ${field('amount', 'Recharge Amount', 'How much to add each time.')}
            ${field('limit', 'Monthly Limit', 'The most that can be recharged in a billing month.')}
            <div class="col-12 col-xl-8"><div class="ar-note"><span class="ar-ni">${B.icon('info', 16)}</span><label class="flex-grow-1 mb-0" for="ar_notify">Your card will be charged automatically when your balance falls below <b>${$(+d.threshold || a().threshold)}</b>. Notify me when it runs or fails.</label><span class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="ar_notify" aria-label="Low-credit notification" ${d.notify ? 'checked' : ''} ${d.on ? '' : 'disabled'}></span></div></div>
          </div>
          <div class="ar-actions"><button type="button" class="btn btn-link me-auto p-0" data-ar="reset" ${saving ? 'disabled' : ''}>Reset to defaults</button>
            <button type="submit" class="btn btn-brand" id="arSave" ${saving || !dirty() ? 'disabled' : ''}>${saving ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving\u2026' : 'Save Changes'}</button>
            <button type="button" class="btn btn-brand-o" data-ar="cancel" ${saving || !dirty() ? 'disabled' : ''}>Cancel</button></div></form>
        </section></div>
        <div class="col-12 col-xl-4"><section class="bsub ar-card h-100" aria-labelledby="aru">
          <div class="ar-head"><span class="ar-hico sm">${B.icon('statement', 18)}</span><h2 class="ar-title sm me-auto" id="aru">Monthly Auto-Recharge Summary</h2>${a().on ? B.badge('Auto Recharge', 'ok') : ''}</div>
          <div class="ar-tiles">
            <div class="ar-tile"><span class="ar-ti">${B.icon('wallet', 18)}</span><div><div class="ar-tl">Current Balance</div><div class="ar-tv">${$(S.credit)}</div></div></div>
            <div class="ar-tile"><span class="ar-ti">${B.icon('clock', 18)}</span><div><div class="ar-tl">Last Recharge</div><div class="ar-tv sm">${a().lastRun ? B.fmtDate(a().lastRun) : 'Never'}</div>${lastAmt ? `<div class="ar-tl">${$(lastAmt.amount)}</div>` : ''}</div></div>
            <div class="ar-tile"><span class="ar-ti">${B.icon('lock', 18)}</span><div><div class="ar-tl">Monthly Limit</div><div class="ar-tv">${$(a().limit)}</div></div></div></div>
          <div class="d-flex justify-content-between small mt-3 mb-1"><span class="fw-semibold">Recharge Progress</span><span><b>${$(a().spent)}</b> / ${$(a().limit)} (${used}%)</span></div>
          <div class="progress mb-1" role="progressbar" aria-label="Monthly auto-recharge limit used" aria-valuenow="${used}" aria-valuemin="0" aria-valuemax="100" style="height:6px"><div class="progress-bar ${tone}" style="width:${used}%"></div></div>
          <div class="small text-muted mb-3">${$(remaining())} remaining \u00b7 resets on ${B.fmtDate(S.period.next)}</div>
          <button type="button" class="btn ar-check w-100" data-ar="check" ${busy || !a().on ? 'disabled' : ''}>${busy ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Charging\u2026' : `${B.icon('refresh', 16)} Check Balance Now`}</button>
          ${a().on ? '' : '<p class="small text-muted mt-2 mb-0">Turn Auto Recharge on to use this.</p>'}
        </section></div>
      </div>
      <section class="bsub ar-card overflow-hidden p-0" aria-labelledby="arlog"><div class="ar-head p-3 pb-2 mb-0"><span class="ar-hico sm">${B.icon('clock', 18)}</span><div class="me-auto"><h2 class="ar-title sm" id="arlog">Auto Recharge Activity</h2><p class="ar-sub">View your recent auto recharge transactions and activity.</p></div>
          <label class="visually-hidden" for="arRange">Date range</label><select id="arRange" class="form-select form-select-sm ar-range">${[['', 'All time'], ['30', 'Last 30 days'], ['90', 'Last 90 days']].map(o => `<option value="${o[0]}" ${arRange === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
        <div class="px-3 pb-3" id="arTable"></div></section></div>`;
    wire(); paintErrors();
    const adt = B.DataTable(P.querySelector('#arTable'), {
      caption: 'Auto recharge activity', toolbar: false, search: false, compactPager: true, pageSize: 5, idKey: 'id', dateKey: 'date',
      rows: () => S.autoLog, emptyHtml: '<strong>No activity yet</strong><span>Recharges and changes to these settings will show up here.</span>',
      columns: [
        { key: 'date', label: 'Date & Time', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}</span>` },
        { key: 'text', label: 'Event', render: r => `<div class="fw-semibold">${esc({ recharge: 'Recharge', failed: 'Payment failed', limit: 'Limit reached', settings: 'Settings changed' }[r.type])}</div><div class="text-muted small">${esc(r.text)}</div>` },
        { key: 'amount', label: 'Amount', align: 'end', render: r => r.amount ? $(r.amount) : '<span class="text-muted">—</span>' },
        { key: 'status', label: 'Status', render: r => B.badge(r.status, { Paid: 'ok', Saved: 'info', Failed: 'bad', Paused: 'warn' }[r.status] || 'muted') },
        { key: 'ref', label: 'Reference', hide: 'md', render: r => `<span class="mono">${esc(r.ref)}</span>` }
      ]
    });
    const since = v => { if (!v) return ''; const t = new Date(S.today + 'T00:00:00'); t.setDate(t.getDate() - (+v - 1)); return t.toISOString().slice(0, 10); };
    adt.state.from = since(arRange); adt.refresh();
    P.querySelector('#arRange').onchange = e => { arRange = e.target.value; adt.state.from = since(arRange); adt.state.page = 1; adt.refresh(); };
  }

  function paintErrors() {
    const e = validate(d);
    ['threshold', 'amount', 'limit'].forEach(k => {
      const el = P.querySelector('#ar_' + k), msg = P.querySelector(`#ar_${k}_e`); if (!el) return;
      const show = e[k] && (tried || touched[k]); el.classList.toggle('is-invalid', !!show); msg.textContent = show ? e[k] : '';
    });
    const sel = P.querySelector('#ar_method'), mm = P.querySelector('#ar_method_e'), sm = e.method && (tried || touched.method);
    if (sel) sel.classList.toggle('is-invalid', !!sm); if (mm) mm.textContent = sm ? e.method : '';
    const hasErr = Object.keys(e).length; P.querySelector('#arSave') && (P.querySelector('#arSave').dataset.err = hasErr ? '1' : '');
    return e;
  }

  function wire() {
    P.querySelector('#ar_on').onchange = ev => { const want = ev.target.checked; ev.target.checked = !want; toggle(want); };
    ['threshold', 'amount', 'limit'].forEach(k => {
      const el = P.querySelector('#ar_' + k); if (!el) return;
      el.addEventListener('input', () => { d[k] = el.value; touched[k] = true; paintErrors(); sync(); });
      el.addEventListener('blur', () => { touched[k] = true; paintErrors(); });
    });
    P.querySelector('#ar_method')?.addEventListener('change', ev => { d.methodId = +ev.target.value; touched.method = true; paintErrors(); sync(); });
    P.querySelector('#ar_notify')?.addEventListener('change', ev => { d.notify = ev.target.checked; sync(); });
    const sync = () => { const dr = dirty(); P.querySelector('#arSave').disabled = saving || !dr; P.querySelector('[data-ar="cancel"]').disabled = saving || !dr; };
    P.querySelector('#arForm').onsubmit = ev => { ev.preventDefault(); save(); };
    P.querySelectorAll('[data-ar]').forEach(b => b.onclick = () => ({
      cancel: () => { d = fromSaved(); touched = {}; tried = false; draw(); B.toast('Changes discarded.', 'info', 'Cancelled'); },
      reset: () => { d = Object.assign({}, fromSaved(), { threshold: String(DEFAULTS.threshold), amount: String(DEFAULTS.amount), limit: String(DEFAULTS.limit), notify: DEFAULTS.notify, methodId: method() ? method().id : null }); touched = {}; tried = false; draw(); B.toast('Default values restored. Save to apply them.', 'info', 'Reset'); },
      retry: () => check(true), check: () => check(true),
      update: () => { redraw && redraw('methods'); },
      topup: () => { redraw && redraw('credit'); },
      raise: () => { const el = P.querySelector('#ar_limit'); if (el) { el.disabled = false; el.focus(); el.select(); } }
    }[b.dataset.ar] || (() => {}))());
  }

  /* ---------- the on/off switch: asks first, and only flips after the user confirms ---------- */
  function toggle(want) {
    if (saving) return;
    if (!want) {
      const md = B.modal({ title: 'Turn off Auto Recharge?', size: 'modal-md ar-modal', body: `<div class="ar-mi off">${B.icon('power', 26)}</div><h3 class="ar-mt">Turn off Auto Recharge?</h3><p class="ar-mp">Your balance will not be topped up automatically, and calls stop connecting if it reaches $0.00. Do you want to disable Auto Recharge?</p>`,
        footer: '<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Keep Enabled</button><button type="button" class="btn btn-danger" data-ok>Turn Off</button>' });
      md.el.querySelector('[data-ok]').onclick = ev => confirmToggle(md, ev.target, false);
      return;
    }
    if (!d.methodId && method()) d.methodId = method().id;
    tried = true; const e = validate(Object.assign({}, d, { on: true })); paintErrors();
    if (e.method) return B.toast(e.method, 'error', 'No payment method');
    if (Object.keys(e).length) { draw(); return B.toast('Fix the highlighted fields, then turn Auto Recharge on.', 'error', 'Cannot enable yet'); }
    const m = method(d.methodId), shield = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 2.8v5.4c0 4.4-2.9 7.9-7 9.8-4.1-1.9-7-5.4-7-9.8V5.8z"/><path d="M8.8 12.2l2.4 2.4 4-4.6"/></svg>';
    const md = B.modal({ title: 'Enable Auto Recharge?', size: 'modal-md ar-modal',
      body: `<div class="ar-mi">${B.icon('power', 26)}</div><h3 class="ar-mt">Enable Auto Recharge?</h3>
        <p class="ar-mp">Your saved payment method (<b>${esc(m.brand)} ending in ${esc(m.last4)}</b>) will be charged automatically when your balance falls below the threshold.</p>
        <div class="ar-stats"><div><span>Threshold</span><b>${$(+d.threshold)}</b></div><div><span>Recharge Amount</span><b>${$(+d.amount)}</b></div><div><span>Monthly Limit</span><b>${$(+d.limit)}</b></div></div>
        <div class="alert alert-danger d-none mt-3 mb-0" data-err role="alert"></div>`,
      footer: '<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-brand" data-ok>Enable Auto Recharge</button>' });
    md.el.querySelector('[data-ok]').onclick = ev => confirmToggle(md, ev.target, true);
  }

  function confirmToggle(md, btn, on) {
    const box = md.el.querySelector('[data-err]'), m = method(d.methodId);
    if (on && (!m || isExpired(m))) { if (box) { box.textContent = m ? `${mLabel(m)} has expired. Choose another card before enabling Auto Recharge.` : 'Add a payment method first.'; box.classList.remove('d-none'); } return; }
    saving = true; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Processing…';
    setTimeout(() => {
      try {
        if (on) { Object.assign(a(), { on: true, threshold: +d.threshold, amount: +d.amount, limit: +d.limit, methodId: m.id, notify: d.notify }); if (a().state === 'failed') a().state = 'ok'; }
        else { a().on = false; a().state = 'ok'; }
        log('settings', 0, 'Saved', on ? `Turned on: ${$(a().amount)} below ${$(a().threshold)}, limit ${$(a().limit)}` : 'Auto recharge turned off');
        saving = false; d = fromSaved(); touched = {}; tried = false; md.hide(); draw();
        B.toast(on ? `Auto Recharge is on. ${$(a().amount)} is added when the balance falls below ${$(a().threshold)}.` : 'Auto Recharge is off.', 'ok', on ? 'Auto Recharge enabled' : 'Auto Recharge disabled');
      } catch (err) { saving = false; btn.disabled = false; btn.textContent = on ? 'Enable Auto Recharge' : 'Turn Off'; B.toast('We could not change Auto Recharge. Please try again.', 'error', 'Update failed'); }
    }, 700);
  }

  /* ---------- save (with confirmation) ---------- */
  function save() {
    if (saving) return;
    tried = true; const e = paintErrors();
    if (Object.keys(e).length) { const first = P.querySelector('.is-invalid'); first && first.focus(); return B.toast('Fix the highlighted fields and try again.', 'error', 'Cannot save yet'); }
    const m = method(d.methodId), on = d.on;
    const body = on
      ? `<p class="mb-2">When your balance falls below <b>${$(+d.threshold)}</b>, we add <b>${$(+d.amount)}</b> using <b>${esc(mLabel(m))}</b>, up to <b>${$(+d.limit)}</b> a month.</p>
         <p class="small text-muted mb-0">You will ${d.notify ? '' : 'not '}be notified about low credit and recharges.${a().on ? '' : ' Your balance is ' + $(S.credit) + ' now.'}</p>`
      : '<p class="mb-0">Auto recharge will be turned off. Your balance will not be topped up automatically, and calls stop connecting if it reaches $0.00.</p>';
    const md = B.modal({ title: on ? (a().on ? 'Save auto recharge changes?' : 'Turn on auto recharge?') : 'Turn off auto recharge?', size: 'modal-md', body,
      footer: `<button type="button" class="btn btn-brand-o" data-bs-dismiss="modal">Go back</button><button type="button" class="btn ${on ? 'btn-brand' : 'btn-danger'}" data-ok>${on ? 'Confirm and save' : 'Turn off'}</button>` });
    md.el.querySelector('[data-ok]').onclick = ev => {
      if (saving) return; saving = true; ev.target.disabled = true; md.hide(); draw();
      setTimeout(() => {
        try {
          const was = a().on, prev = JSON.stringify([a().threshold, a().amount, a().limit, a().methodId]);
          Object.assign(a(), { on: d.on, threshold: +d.threshold || a().threshold, amount: +d.amount || a().amount, limit: +d.limit || a().limit, methodId: d.methodId || (m && m.id) || null, notify: d.notify });
          if (a().on) { if (a().state === 'limit' && remaining() >= a().amount) a().state = 'ok'; if (a().state === 'failed' && was !== a().on) a().state = 'ok'; } else a().state = 'ok';
          log('settings', 0, 'Saved', !a().on ? 'Auto recharge turned off' : !was ? `Turned on: ${$(a().amount)} below ${$(a().threshold)}, limit ${$(a().limit)}` : `Updated: ${$(a().amount)} below ${$(a().threshold)}, limit ${$(a().limit)}`);
          saving = false; d = fromSaved(); touched = {}; tried = false;
          B.toast(a().on ? `Auto recharge is on. ${$(a().amount)} is added when the balance falls below ${$(a().threshold)}.` : 'Auto recharge is off.', 'ok', 'Settings saved');
          draw(); if (a().on) check(false);
        } catch (err) {
          saving = false; draw(); B.toast('We could not save your settings. Please try again.', 'error', 'Save failed');
        }
      }, 700);
    };
  }

  /* ---------- Summary card ---------- */
  B.autoRechargeCard = sample => {
    const x = a(), m = method(), used = x.limit ? Math.min(100, Math.round(x.spent / x.limit * 100)) : 0;
    const st = !x.on ? ['Off', 'muted'] : x.state === 'failed' ? ['Payment failed', 'bad'] : x.state === 'limit' ? ['Limit reached', 'warn'] : ['Active', 'ok'];
    return `<section class="bsub p-3" aria-labelledby="arc"><div class="d-flex justify-content-between align-items-start gap-2 mb-2"><div><h2 class="sub-title" id="arc">Auto recharge ${B.badge(st[0], st[1])}</h2><p class="sub-desc">Keeps your credit topped up.</p></div></div>
      ${x.on ? `<dl class="kv mb-2"><dt>Threshold</dt><dd>Below ${$(x.threshold)}</dd><dt>Recharge amount</dt><dd>${$(x.amount)}</dd><dt>Payment method</dt><dd>${m ? esc(mLabel(m)) : '<span class="text-muted fw-normal">No card saved</span>'}</dd></dl>
        <div class="d-flex justify-content-between small mb-1"><span class="text-muted">Monthly limit</span><span><b>${$(x.spent)}</b> of ${$(x.limit)}</span></div>
        <div class="progress mb-3" role="progressbar" aria-label="Monthly auto-recharge limit used" aria-valuenow="${used}" aria-valuemin="0" aria-valuemax="100" style="height:6px"><div class="progress-bar ${x.state === 'limit' ? 'bg-warning' : x.state === 'failed' ? 'bg-danger' : ''}" style="width:${used}%"></div></div>`
        : '<p class="text-muted small mb-3">Off. Turn it on to add credit automatically when your balance runs low, so calls never stop.</p>'}
      <button type="button" class="btn btn-brand-o" data-a="ar" ${sample ? 'disabled' : ''}>Manage</button></section>`;
  };
})(window.Billing);
