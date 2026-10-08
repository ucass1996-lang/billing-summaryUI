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

  let P, redraw, d, touched = {}, tried = false, saving = false, busy = false, loading = false;
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
    if (!a().on) return B.badge('Off', 'muted');
    return a().state === 'failed' ? B.badge('Payment failed', 'bad') : a().state === 'limit' ? B.badge('Limit reached', 'warn') : B.badge('Active', 'ok');
  };

  function banner() {
    if (a().state === 'failed') return `<div class="ar-alert bad" role="alert"><div><b>Payment failed.</b> ${esc(a().failReason)} Your balance is ${$(S.credit)}${S.credit < a().threshold ? ', below the recharge threshold' : ''}.</div>
      <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-sm btn-brand" data-ar="retry" ${busy ? 'disabled' : ''}>${busy ? '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Retrying…' : 'Retry payment'}</button><button type="button" class="btn btn-sm btn-brand-o" data-ar="update">Update payment method</button></div></div>`;
    if (a().state === 'limit') return `<div class="ar-alert warn" role="alert"><div><b>Monthly limit reached.</b> ${$(a().spent)} of ${$(a().limit)} has been recharged this month, so no more automatic top-ups until ${B.fmtDate(S.period.next)}.</div>
      <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-sm btn-brand" data-ar="raise">Raise the limit</button><button type="button" class="btn btn-sm btn-brand-o" data-ar="topup">Add credit now</button></div></div>`;
    return '';
  }

  function field(id, label, hint, extra = '') {
    return `<div class="col-12 col-sm-6"><label class="form-label" for="ar_${id}">${label}</label>
      <div class="input-group"><span class="input-group-text">$</span><input id="ar_${id}" class="form-control" inputmode="decimal" autocomplete="off" value="${esc(d[id])}" ${d.on ? '' : 'disabled'} aria-describedby="ar_${id}_h ar_${id}_e" ${extra}></div>
      <div class="ar-hint" id="ar_${id}_h">${hint}</div><div class="ar-err" id="ar_${id}_e" role="alert"></div></div>`;
  }

  function draw() {
    if (!P || !P.isConnected || loading) return;
    const used = a().limit ? Math.min(100, Math.round(a().spent / a().limit * 100)) : 0, tone = a().state === 'limit' || used >= 100 ? 'bg-warning' : a().state === 'failed' ? 'bg-danger' : '';
    const m = method(d.methodId);
    P.innerHTML = `<div class="d-grid gap-3">
      ${banner()}
      <div class="row g-3">
        <div class="col-12 col-xl-7"><section class="bsub p-3 h-100" aria-labelledby="arh">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-1"><div><h2 class="sub-title" id="arh">Auto recharge settings ${badgeFor()}</h2><p class="sub-desc">Add credit for you when the balance runs low, so calls and messages keep going.</p></div>
            <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="ar_on" aria-labelledby="arh" ${d.on ? 'checked' : ''} ${saving ? 'disabled' : ''}></div></div>
          <form id="arForm" novalidate><div class="row g-3 mt-0 ${d.on ? '' : 'ar-off'}">
            ${field('threshold', 'Recharge threshold', 'Recharge when the balance falls below this.')}
            ${field('amount', 'Recharge amount', 'How much to add each time.')}
            <div class="col-12 col-sm-6"><label class="form-label" for="ar_method">Payment method</label>
              <select id="ar_method" class="form-select" ${d.on && S.methods.length ? '' : 'disabled'} aria-describedby="ar_method_e">${S.methods.length ? S.methods.map(x => `<option value="${x.id}" ${m && m.id === x.id ? 'selected' : ''}>${esc(mLabel(x))}${x.primary ? ' (primary)' : ''}</option>`).join('') : '<option>No card saved</option>'}</select>
              <div class="ar-hint">${S.methods.length ? 'The card that is charged.' : ''}</div><div class="ar-err" id="ar_method_e" role="alert"></div>
              ${!S.methods.length ? '<button type="button" class="btn btn-link btn-sm p-0" data-ar="update">Add a payment method</button>' : ''}</div>
            ${field('limit', 'Monthly auto-recharge limit', 'The most that can be recharged in a billing month.')}
            <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="ar_notify" ${d.notify ? 'checked' : ''} ${d.on ? '' : 'disabled'}><label class="form-check-label" for="ar_notify"><b>Low-credit notification</b><span class="d-block small text-muted">Tell me when my balance falls below the threshold, and when a recharge runs or fails.</span></label></div></div>
          </div>
          <div class="ar-actions"><button type="submit" class="btn btn-brand" id="arSave" ${saving || !dirty() ? 'disabled' : ''}>${saving ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving…' : 'Save changes'}</button>
            <button type="button" class="btn btn-brand-o" data-ar="cancel" ${saving || !dirty() ? 'disabled' : ''}>Cancel</button>
            <button type="button" class="btn btn-link ms-auto" data-ar="reset" ${saving ? 'disabled' : ''}>Reset to defaults</button></div></form>
        </section></div>
        <div class="col-12 col-xl-5"><section class="bsub p-3 h-100" aria-labelledby="aru">
          <h2 class="sub-title" id="aru">This month</h2><p class="sub-desc">Recharged so far against your monthly limit.</p>
          <div class="d-flex justify-content-between align-items-end mt-2"><div class="ar-big">${$(a().spent)}</div><div class="text-muted small">of ${$(a().limit)} limit</div></div>
          <div class="progress my-2" role="progressbar" aria-label="Monthly auto-recharge limit used" aria-valuenow="${used}" aria-valuemin="0" aria-valuemax="100" style="height:8px"><div class="progress-bar ${tone}" style="width:${used}%"></div></div>
          <dl class="kv mb-3"><dt>Remaining this month</dt><dd>${$(remaining())}</dd><dt>Resets on</dt><dd>${B.fmtDate(S.period.next)}</dd><dt>Current balance</dt><dd>${$(S.credit)}</dd><dt>Last run</dt><dd>${a().lastRun ? B.fmtDate(a().lastRun) : 'Never'}</dd></dl>
          <button type="button" class="btn btn-brand-o w-100" data-ar="check" ${busy || !a().on ? 'disabled' : ''}>${busy ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Charging…' : 'Check balance now'}</button>
          ${a().on ? '' : '<p class="small text-muted mt-2 mb-0">Turn auto recharge on and save to use this.</p>'}
        </section></div>
      </div>
      <section class="bsub overflow-hidden" aria-labelledby="arlog"><div class="p-3 pb-0"><h2 class="sub-title" id="arlog">Auto recharge activity</h2><p class="sub-desc">Recharges, failed payments, limit pauses and changes to these settings.</p></div><div id="arTable"></div></section></div>`;
    wire(); paintErrors();
    B.DataTable(P.querySelector('#arTable'), {
      caption: 'Auto recharge activity', toolbar: false, search: false, compactPager: true, pageSize: 5, idKey: 'id',
      rows: () => S.autoLog, emptyHtml: '<strong>No activity yet</strong><span>Recharges and changes to these settings will show up here.</span>',
      columns: [
        { key: 'date', label: 'Date', render: r => `<span class="text-nowrap">${B.fmtDate(r.date)}</span>` },
        { key: 'text', label: 'Event', render: r => `<div class="fw-semibold">${esc({ recharge: 'Recharge', failed: 'Payment failed', limit: 'Limit reached', settings: 'Settings changed' }[r.type])}</div><div class="text-muted small">${esc(r.text)}</div>` },
        { key: 'amount', label: 'Amount', align: 'end', render: r => r.amount ? $(r.amount) : '<span class="text-muted">—</span>' },
        { key: 'status', label: 'Status', render: r => B.badge(r.status, { Paid: 'ok', Saved: 'info', Failed: 'bad', Paused: 'warn' }[r.status] || 'muted') },
        { key: 'ref', label: 'Reference', hide: 'md', render: r => `<span class="mono">${esc(r.ref)}</span>` }
      ]
    });
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
    P.querySelector('#ar_on').onchange = ev => { d.on = ev.target.checked; if (d.on && !d.methodId && method()) d.methodId = method().id; touched = {}; draw(); };
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
