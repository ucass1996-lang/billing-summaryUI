/* Credit & Payment: Add Credit (top-up + low-balance settings) and Payment Methods. Also exposes B.openCardForm. */
(function (B) {
  const S = B.state, esc = B.esc;
  let host, tab = 'credit', amt = 20, custom = '', cardTab = 'new', nextId = 10;
  const r2 = n => Math.round(n * 100) / 100;
  const AMOUNTS = [20, 50, 100, 150, 200];

  S.lowBalance = S.lowBalance || { on: false, alert: false, alertAt: 10, auto: false, autoBelow: 10, autoAmount: 20 };

  const luhn = d => { let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; };
  const brand = d => /^4/.test(d) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : /^3[47]/.test(d) ? 'Amex' : 'Card';
  const expiryCheck = v => {
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(v);
    if (!m) return 'Enter the expiry date as MM/YY.';
    const mo = +m[1], yr = 2000 + +m[2];
    if (mo < 1 || mo > 12) return 'Enter a valid month (01–12).';
    const t = S.today.split('-'); if (yr < +t[0] || (yr === +t[0] && mo < +t[1])) return 'This card has expired.';
    return '';
  };
  const numberCheck = v => { const d = v.replace(/[\s-]/g, ''); if (!/^\d{13,19}$/.test(d)) return 'Please enter a valid card number.'; return luhn(d) ? '' : 'This card number is not valid.'; };
  const cardFields = () => [
    { name: 'holder', label: 'Name on card', required: true, minLength: 2, maxLength: 60, col: 'col-12', placeholder: 'As it appears on the card', autocomplete: 'cc-name' },
    { name: 'number', label: 'Card Number', required: true, col: 'col-12', placeholder: '•••• •••• •••• ••••', autocomplete: 'cc-number', validate: numberCheck },
    { name: 'exp', label: 'Expiration Date', required: true, placeholder: 'MM / YY', autocomplete: 'cc-exp', validate: expiryCheck },
    { name: 'cvc', label: 'CVC', required: true, placeholder: 'CVC', pattern: /^\d{3,4}$/, patternMsg: 'Security code must be 3 or 4 digits.', autocomplete: 'cc-csc' }
  ];

  const saveCard = (v, primaryIfFirst = true) => {
    const d = v.number.replace(/[\s-]/g, '');
    if (S.methods.some(m => m.last4 === d.slice(-4) && m.brand === brand(d))) return false;
    S.methods.push({ id: ++nextId, brand: brand(d), last4: d.slice(-4), exp: v.exp.replace(/\s/g, ''), holder: v.holder, added: S.today, primary: primaryIfFirst && S.methods.length === 0 });
    return true;
  };

  const BRANDS = '<div class="brand-row"><img src="assets/card-brands.png" width="187" height="33" alt="Accepted cards: Visa, Mastercard, Discover and American Express"></div>';

  /* Add (no method) or edit (existing method) a card. Only the last 4 digits are kept. */
  /* brand tiles and the small icons used in the Add Card popup (inline SVG, nothing external) */
  const TILES = '<div class="ac-brands" aria-label="Accepted cards: Visa, Mastercard, Discover and American Express"><span class="ac-tile ac-visa">VISA</span><span class="ac-tile"><i class="mc1"></i><i class="mc2"></i></span><span class="ac-tile ac-disc">DISCOVER<b></b></span><span class="ac-tile ac-amex">AMERICAN<br>EXPRESS</span></div>';
  const ic = d => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC_USER = ic('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.6-3.6 3.7-5.6 7.5-5.6s6.9 2 7.5 5.6"/>'), IC_CAL = ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    IC_CVV = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 2.8v5.4c0 4.4-2.9 7.9-7 9.8-4.1-1.9-7-5.4-7-9.8V5.8z"/><text x="12" y="14" text-anchor="middle" font-size="5.6" font-weight="700" fill="currentColor" stroke="none">CVV</text></svg>';
  const logoFor = b => ({ Visa: '<span class="ac-tile sm ac-visa">VISA</span>', Mastercard: '<span class="ac-tile sm"><i class="mc1"></i><i class="mc2"></i></span>', Amex: '<span class="ac-tile sm ac-amex">AMEX</span>' }[b] || '<span class="ac-tile sm ac-none"><i class="mc1 off"></i><i class="mc2 off"></i></span>');

  B.openCardForm = (done, method) => {
    const edit = !!method, fid = 'cm' + Date.now();
    const fields = [
      { name: 'holder', label: 'Card Holder Name', required: true, minLength: 2, maxLength: 60, col: 'col-12 col-md-6', placeholder: 'e.g., John Smith', autocomplete: 'cc-name', iconRight: IC_USER },
      edit ? { name: 'number', label: 'Card Number', readonly: true, col: 'col-12 col-md-6', icon: B.icon('card', 20), iconRight: logoFor(method.brand) }
           : { name: 'number', label: 'Card Number', required: true, col: 'col-12 col-md-6', placeholder: '\u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022', autocomplete: 'cc-number', icon: B.icon('card', 20), iconRight: logoFor(''), validate: numberCheck },
      { name: 'exp', label: 'Expiration Date', required: true, col: 'col-12 col-md-6', placeholder: 'MM / YY', autocomplete: 'cc-exp', validate: expiryCheck, iconRight: IC_CAL }
    ];
    if (!edit) fields.push({ name: 'cvc', label: 'CVC', required: true, col: 'col-12 col-md-6', placeholder: '123', pattern: /^\d{3,4}$/, patternMsg: 'Security code must be 3 or 4 digits.', autocomplete: 'cc-csc', iconRight: IC_CVV });
    const values = edit ? { holder: method.holder, number: `${method.brand} \u2022\u2022\u2022\u2022 ${method.last4}`, exp: method.exp } : {};
    const lock = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>';
    const m = B.modal({
      title: edit ? 'Edit Card' : 'Add Card', size: 'modal-lg ac-modal',
      body: `${TILES}<form id="${fid}" novalidate><div class="row g-4">${fields.map(f => B.fieldHtml(f, values[f.name], fid)).join('')}</div><div class="alert alert-danger d-none mt-3 mb-0" data-formerr role="alert"></div></form>`,
      footer: `<div class="ac-foot"><button type="submit" form="${fid}" class="btn btn-brand ac-submit" ${edit ? '' : 'disabled'}>${edit ? 'Save changes' : 'Add Card'}</button><div class="ac-secure">${lock} Secured with 256-bit encryption</div></div>`
    });
    const form = m.el.querySelector('form'), btn = m.el.querySelector('[type=submit]');
    const allValid = () => fields.every(f => !B.validateField(f, String(form.elements[f.name].value || '').trim(), {}));
    B.bindForm(form, fields, v => {
      if (edit) { method.holder = v.holder; method.exp = v.exp.replace(/\s/g, ''); B.toast('Card updated.'); }
      else { if (!saveCard(v)) return { number: 'This card is already saved.' }; B.toast('Card added.'); }
      m.hide(); if (done) done();
    });
    if (!edit) {
      const num = form.elements.number, logo = m.el.querySelector(`#${fid}_number_ir`), exp = form.elements.exp;
      num.addEventListener('input', () => {
        const d = num.value.replace(/\D/g, '').slice(0, 19); num.value = d.replace(/(.{4})/g, '$1 ').trim();
        logo.innerHTML = logoFor(d ? brand(d) : '');
      });
      exp.addEventListener('input', () => { const d = exp.value.replace(/\D/g, '').slice(0, 4); exp.value = d.length > 2 ? d.slice(0, 2) + ' / ' + d.slice(2) : d; });
    }
    form.addEventListener('input', () => { btn.disabled = !allValid(); });
    m.el.addEventListener('shown.bs.modal', () => form.elements.holder.focus());
  };

  B.pages['credit-payment'] = {
    title: 'Credit &amp; Payment',
    desc: 'Top up the balance that pays for usage beyond your plan — calls, SMS and AI — and manage the cards it is charged to.',
    bind() { tab = /tab=auto/.test(location.hash) ? 'auto' : 'credit'; amt = 20; custom = ''; cardTab = 'new'; },
    render(el) { host = el; draw(); }
  };

  function draw() {
    if (!host || !host.isConnected) return;
    host.setAttribute('data-plain', '');
    host.innerHTML = `<div class="bcard overflow-hidden cp-wrap"><div class="tabs" role="tablist" aria-label="Credit and payment">
      <button type="button" role="tab" class="tab ${tab === 'credit' ? 'active' : ''}" aria-selected="${tab === 'credit'}" data-tab="credit">Add Credit</button>
      <button type="button" role="tab" class="tab ${tab === 'methods' ? 'active' : ''}" aria-selected="${tab === 'methods'}" data-tab="methods">Payment Methods</button>
      <button type="button" role="tab" class="tab ${tab === 'auto' ? 'active' : ''}" aria-selected="${tab === 'auto'}" data-tab="auto">Auto Recharge${S.autoRecharge.on ? ' <span class="tab-dot" aria-hidden="true"></span>' : ''}</button>
      ${tab === 'methods' ? `<button type="button" class="btn btn-brand-o ms-auto my-1 d-inline-flex align-items-center gap-2 flex-shrink-0" id="addCardBtn">${B.icon('card', 16)}Add card</button>` : ''}
    </div><div class="p-3" role="tabpanel" id="cpPanel"></div></div>`;
    host.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    const p = host.querySelector('#cpPanel');
    tab === 'credit' ? credit(p) : tab === 'auto' ? B.autoRecharge.render(p, t => { tab = t; draw(); }) : methods(p);
    host.querySelector('#addCardBtn')?.addEventListener('click', () => B.openCardForm(draw));
  }

  /* ---------------- Add Credit ---------------- */
  const lbSummary = () => {
    const L = S.lowBalance, A = S.autoRecharge;
    if (!L.on && !A.on) return 'No alert or auto recharge is set.';
    return [L.on && L.alert ? `Alert below ${B.money(L.alertAt)}` : '', A.on ? `Recharge ${B.money(A.amount)} below ${B.money(A.threshold)}` : ''].filter(Boolean).join(' · ');
  };
  const amountError = () => custom !== '' && !(/^\d+$/.test(custom) && +custom >= 3 && +custom <= 1000) ? 'Enter a whole-dollar amount between $3 and $1,000.' : '';

  function credit(p) {
    const L = S.lowBalance, dis = !L.on ? 'disabled' : '';
    p.innerHTML = `<div class="d-grid gap-3">
      <section class="bsub p-3" style="border-left:3px solid var(--brand)" aria-label="What credit covers">
        <h2 class="sub-title mb-2">Credit covers usage beyond what your plan includes</h2>
        <ul class="small text-muted ps-3 mb-2" style="line-height:1.8"><li>Calls to destinations not bundled with your plan, charged per minute</li><li>Text messages above your monthly allowance, charged per message</li><li>Picture messages, charged per message</li><li>AI call minutes and message replies once the included pool runs out</li><li>Fax pages</li></ul>
        <p class="small text-muted mb-0">Seats and your monthly plan fee are billed separately on Plan — credit is never used for those.</p>
      </section>

      <section class="bsub p-3 d-flex flex-wrap justify-content-between align-items-center gap-2" aria-label="Current balance">
        <div><div class="eyebrow">Current balance</div><div class="fs-4 fw-bold" id="curBal">${B.money(S.credit)}</div></div>
        <span class="sbadge info" id="lbPill" style="font-weight:500">${esc(lbSummary())}</span>
      </section>

      <div class="row g-3">
        <div class="col-12 col-xl-7"><section class="bsub p-3 h-100" aria-labelledby="tn">
          <h2 class="sub-title" id="tn">Top-up Now</h2><p class="sub-desc mb-3">Add to your balance. Anything unused stays on the account.</p>
          <div class="row g-2 mb-3" role="group" aria-label="Top-up amount">${AMOUNTS.map(a => `<div class="col"><button type="button" class="btn w-100 chip-amt ${amt === a && custom === '' ? 'btn-brand' : 'btn-brand-o'}" data-amt="${a}" aria-pressed="${amt === a && custom === ''}">$${a}</button></div>`).join('')}</div>
          <div class="d-flex flex-wrap align-items-center gap-2 mb-1"><label for="custAmt" class="small text-muted mb-0">Or enter an amount</label></div>
          <div class="d-flex align-items-center gap-2 mb-1"><span>$</span><input id="custAmt" class="form-control" style="max-width:120px" inputmode="numeric" placeholder="e.g. 75" value="${esc(custom)}" aria-describedby="custHelp"><span class="small text-muted" id="custHelp">$3–$1000, whole dollars</span></div>
          <div class="invalid-feedback d-block mb-2" id="custErr" role="alert">${esc(amountError())}</div>
          <div class="d-flex justify-content-between bg-light rounded px-3 py-2 small mb-3"><span>New balance after top-up</span><strong id="newBal"></strong></div>

          <div class="tabs px-0 mb-3" role="tablist" aria-label="Card source" style="gap:20px">
            <button type="button" role="tab" class="tab ${cardTab === 'new' ? 'active' : ''}" aria-selected="${cardTab === 'new'}" data-ct="new">New Card</button>
            <button type="button" role="tab" class="tab ${cardTab === 'saved' ? 'active' : ''}" aria-selected="${cardTab === 'saved'}" data-ct="saved">Saved Cards</button></div>
          ${cardTab === 'new' ? `${BRANDS}
          <form id="payForm" novalidate><div class="row g-3" id="payFields"></div>
            <div class="form-check mt-3"><input class="form-check-input" type="checkbox" id="saveCard"><label class="form-check-label small" for="saveCard">Save this card for future payments</label></div>
            <div class="alert alert-danger d-none mt-3 mb-0" data-formerr role="alert"></div>
            <div class="text-end mt-3"><button type="submit" class="btn btn-brand" id="payBtn"></button></div></form>`
          : (S.methods.length ? `<form id="savedForm" novalidate>${S.methods.map((m, i) => `<div class="form-check bsub p-3 ps-5 mb-2"><input class="form-check-input" type="radio" name="sm" id="sm${m.id}" value="${m.id}" ${m.primary || (i === 0 && !S.methods.some(x => x.primary)) ? 'checked' : ''}><label class="form-check-label" for="sm${m.id}">${esc(m.brand)} •••• ${esc(m.last4)} <span class="text-muted small">· expires ${esc(m.exp)}${m.primary ? ' · Primary' : ''}</span></label></div>`).join('')}
            <div class="text-end mt-3"><button type="submit" class="btn btn-brand" id="payBtn"></button></div></form>`
          : '<div class="dt-empty"><strong>No saved cards.</strong><span>Use New Card and tick "Save this card for future payments".</span></div>')}
        </section></div>

        <div class="col-12 col-xl-5"><section class="bsub p-3 h-100" aria-labelledby="lb">
          <div class="d-flex justify-content-between align-items-start gap-3"><div><h2 class="sub-title" id="lb">Low balance settings</h2><p class="sub-desc">Keep calls connected when credits run low.</p></div>
            <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="lbOn" aria-labelledby="lb" ${L.on ? 'checked' : ''}></div></div>
          ${!L.on || (!L.alert && !S.autoRecharge.on) ? `<div class="alert-warn mt-3 py-2 ${L.on ? '' : 'opacity-50'}" style="font-size:12px;color:#973c00">With both off you won't be warned before your balance runs out, and calls will stop connecting at $0.00.</div>` : ''}
          <hr class="my-3">
          <div class="d-flex justify-content-between align-items-start gap-3 ${L.on ? '' : 'opacity-50'}"><div><div class="fw-semibold small">Alert</div><div class="text-muted small">Early warning, so you can top up.</div></div>
            <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="lbAlert" aria-label="Alert" ${L.alert ? 'checked' : ''} ${dis}></div></div>
          ${L.on && L.alert ? `<div class="mt-2"><label class="form-label" for="alertAt">Warn me when the balance falls below ($)</label><input id="alertAt" class="form-control" style="max-width:140px" inputmode="numeric" value="${L.alertAt}"><div class="invalid-feedback" data-e="alertAt"></div></div>` : ''}
          <hr class="my-3">
          <div class="d-flex justify-content-between align-items-center gap-3"><div><div class="fw-semibold small">Recharge automatically ${S.autoRecharge.on ? B.badge('On', 'ok') : B.badge('Off', 'muted')}</div><div class="text-muted small">${S.autoRecharge.on ? `Adds ${B.money(S.autoRecharge.amount)} below ${B.money(S.autoRecharge.threshold)}.` : 'Top up for you before the balance runs out.'}</div></div>
            <button type="button" class="btn btn-brand-o btn-sm flex-shrink-0" id="goAuto">Manage</button></div>
          ${!L.on ? '<div class="small text-muted mt-3 bg-light rounded px-3 py-2">✓ Everything off — no warnings, and no automatic top-ups.</div>' : '<div class="text-end mt-3"><button type="button" class="btn btn-brand" id="lbSave">Save settings</button></div>'}
        </section></div></div></div>`;

    paintAmount(p);
    p.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { cardTab = b.dataset.ct; credit(p); });
    p.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => { amt = +b.dataset.amt; custom = ''; p.querySelector('#custAmt').value = ''; paintAmount(p); });
    p.querySelector('#custAmt').addEventListener('input', e => { custom = e.target.value.trim(); amt = /^\d+$/.test(custom) ? +custom : null; paintAmount(p); });
    wireLowBalance(p);
    p.querySelector('#goAuto')?.addEventListener('click', () => { tab = 'auto'; draw(); });

    const form = p.querySelector('#payForm');
    if (form) {
      const fields = cardFields();
      p.querySelector('#payFields').innerHTML = fields.map((f, i) => B.fieldHtml(f, '', 'pay')).join('');
      B.bindForm(form, fields, v => {
        const err = validAmount(); if (err) return { _form: err };
        if (form.querySelector('#saveCard').checked && !saveCard(v)) B.toast('That card was already saved.');
        topUp(amt, `${brand(v.number.replace(/\D/g, ''))} •••• ${v.number.replace(/\D/g, '').slice(-4)}`);
      });
    }
    if (form) { form.addEventListener('input', () => paintAmount(p)); paintAmount(p); }
    if (B.focusCard && form) { B.focusCard = false; form.elements.holder.focus({ preventScroll: false }); }
    const saved = p.querySelector('#savedForm');
    if (saved) saved.addEventListener('submit', e => {
      e.preventDefault();
      const err = validAmount(); if (err) { B.toast(err, 'error'); return; }
      const m = S.methods.find(x => x.id === +saved.elements.sm.value);
      topUp(amt, `${m.brand} •••• ${m.last4}`);
    });
  }

  function validAmount() { return amt == null || !Number.isInteger(amt) || amt < 3 || amt > 1000 ? 'Choose or enter a whole-dollar amount between $3 and $1,000.' : ''; }

  function paintAmount(p) {
    const ok = !validAmount();
    p.querySelectorAll('[data-amt]').forEach(b => { const on = +b.dataset.amt === amt && custom === ''; b.className = `btn w-100 chip-amt ${on ? 'btn-brand' : 'btn-brand-o'}`; b.setAttribute('aria-pressed', on); });
    p.querySelector('#custErr').textContent = amountError();
    p.querySelector('#custAmt').classList.toggle('is-invalid', !!amountError());
    p.querySelector('#newBal').textContent = ok ? B.money(S.credit + amt) : '—';
    const pay = p.querySelector('#payBtn');
    if (pay) {
      const pf = p.querySelector('#payForm'), cardOk = !pf || !pf.elements.holder || cardFields().every(f => !B.validateField(f, String(pf.elements[f.name].value || '').trim(), {}));
      pay.textContent = ok ? `Pay ${B.money(amt)}` : 'Pay'; pay.disabled = !ok || !cardOk;
    }
  }

  /* adds credit to the balance and records it in the ledger and activity (also used by the quick "Add credits" popup on Usage) */
  B.addCredit = (amount, via) => {
    S.credit = r2(S.credit + amount);
    const ref = 'TU-' + String(Date.now()).slice(-6);
    S.ledger.push({ id: S.ledger.length + 1, date: S.today, description: 'Credit top-up', ref, debit: 0, credit: amount, type: 'credit' });
    S.activity.unshift({ id: Math.max(0, ...S.activity.map(a => a.id)) + 1, date: S.today, amount, status: 'Paid', description: 'Fund top-up', ref: String(Date.now()).slice(-12) });
    B.toast(`${B.money(amount)} added using ${via}.`);
  };
  function topUp(amount, via) {
    B.addCredit(amount, via);
    amt = 20; custom = ''; draw();
  }

  function wireLowBalance(p) {
    const L = S.lowBalance, on = p.querySelector('#lbOn');
    on.onchange = () => { L.on = on.checked; if (!L.on) { L.alert = false; } credit(p); };
    p.querySelector('#lbAlert').onchange = e => { L.alert = e.target.checked; credit(p); };
    p.querySelector('#lbSave')?.addEventListener('click', () => {
      const bad = (id, min, max) => { const el = p.querySelector('#' + id); if (!el) return false; const v = el.value.trim(); const ok = /^\d+$/.test(v) && +v >= min && +v <= max; el.classList.toggle('is-invalid', !ok); const fb = p.querySelector(`[data-e="${id}"]`); if (fb) fb.textContent = ok ? '' : `Enter a whole-dollar amount between $${min} and $${max.toLocaleString('en-US')}.`; return !ok; };
      const errs = [bad('alertAt', 1, 1000)];
      if (errs.some(Boolean)) return;
      if (L.alert) L.alertAt = +p.querySelector('#alertAt').value;
      p.querySelector('#lbPill').textContent = lbSummary();
      B.toast('Low balance settings saved.');
      credit(p);
    });
  }

  /* ---------------- Payment Methods ---------------- */
  const EMPTY_ART = `<svg class="empty-art" width="150" height="110" viewBox="0 0 150 110" aria-hidden="true"><rect x="12" y="14" width="64" height="80" rx="6" transform="rotate(-6 44 54)" fill="#fff" stroke="#c9d0de" stroke-width="2"/><rect x="70" y="10" width="66" height="84" rx="6" transform="rotate(5 103 52)" fill="#fff" stroke="#c9d0de" stroke-width="2"/><g stroke="#d3d9e6" stroke-width="3" stroke-linecap="round"><path d="M92 34h30M92 46h30M92 58h30"/></g><rect x="26" y="34" width="26" height="18" rx="2" fill="#4a5568"/><circle cx="76" cy="74" r="16" fill="#c9ccd3" stroke="#4a5568" stroke-width="3"/><path d="M88 86l16 14" stroke="#4a5568" stroke-width="4" stroke-linecap="round"/></svg>`;

  function methods(p) {
    const has = S.methods.length > 0;
    p.innerHTML = `<div class="d-grid gap-3 pm-wrap">
      <section class="bsub p-3" aria-label="About cards"><div class="info-lines"><div>${B.icon('idcard', 16)}<span>Your primary card will be used for auto purchases.</span></div><div>${B.icon('refreshcw', 16)}<span>You can update or remove cards anytime.</span></div></div></section>
      <div id="pmTable"></div></div>`;

    B.DataTable(p.querySelector('#pmTable'), {
      caption: 'Payment methods', toolbar: false, search: false, compactPager: true, pageSize: 25, idKey: 'id',
      rows: () => S.methods.map(m => Object.assign({}, m, { card: `${m.brand} •••• ${m.last4}`, expYear: '20' + String(m.exp).slice(-2), primaryLabel: m.primary ? 'Yes' : 'No' })),
      emptyHtml: `${EMPTY_ART}<strong>No card saved</strong><span>Add a card so numbers and plan renewals can be paid for without interruption.</span>`,
      columns: [
        { key: 'added', label: 'Date', render: r => `<span class="text-nowrap">${B.fmtDate(r.added)}</span>` },
        { key: 'card', label: 'Last 4 digits' },
        { key: 'expYear', label: 'Expiry year' },
        { key: 'primaryLabel', label: 'Is primary', render: r => r.primary ? B.badge('Yes', 'info') : 'No' },
        { key: '_act', label: 'Action', align: 'end' }
      ],
      actions: r => B.actBtn('edit', r.id, 'edit', `Edit ${r.card}`) + (r.primary ? '' : B.actBtn('prim', r.id, 'star', `Set ${r.card} as primary`)) + B.actBtn('rm', r.id, 'trash', `Remove ${r.card}`, 'danger'),
      onAction: (a, r) => {
        const m = S.methods.find(x => x.id === r.id);
        if (a === 'edit') B.openCardForm(draw, m);
        else if (a === 'prim') { S.methods.forEach(x => x.primary = x.id === m.id); B.toast('Primary card updated.'); draw(); }
        else B.confirm({ title: 'Remove card?', danger: true, okLabel: 'Remove', message: `${m.brand} •••• ${m.last4} will be removed${m.primary && S.methods.length > 1 ? ' and another card becomes primary' : ''}.`,
          onOk: () => { S.methods = S.methods.filter(x => x.id !== m.id); if (m.primary && S.methods.length) S.methods[0].primary = true; if (!S.methods.length) { S.autoRecharge.on = false; S.autoRecharge.state = 'ok'; } B.toast('Card removed.'); draw(); } });
      }
    });

    p.querySelector('[data-retry]')?.addEventListener('click', () => {
      if (!has) return B.openCardForm(draw);
      S.failed = 0;
      S.activity.unshift({ id: Math.max(0, ...S.activity.map(a => a.id)) + 1, date: S.today, amount: 4.0, status: 'Paid', description: 'Payment retry', ref: String(Date.now()).slice(-12) });
      const inv = S.invoices.find(i => i.status === 'Failed'); if (inv) inv.status = 'Paid';
      B.toast('Payment collected.'); draw();
    });
  }
})(window.Billing);
