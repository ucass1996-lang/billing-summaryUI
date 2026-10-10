/* Add-ons: catalogue (grouped cards) + Manage tab. Changes flow into the Billing Summary estimate. */
(function (B) {
  const S = B.state, C = B.calc, esc = B.esc;
  let host, tab = 'catalogue', dt;
  const collapsed = new Set();

  const groupOf = a => /^per (seat|user|supervisor)$/i.test(a.unit) ? 'licence' : /number/i.test(a.unit) ? 'number' : 'workspace';
  const GROUPS = [
    ['licence', 'Per licence', 'Charged per seat, and billed with that seat.'],
    ['number', 'Per number', 'Charged per number, and billed with the number.'],
    ['workspace', 'Per workspace', 'Charged once for the whole workspace, whatever the number of users.']
  ];
  const SAVES = {
    'AI Copilot': 'Agents spend less time typing notes: suggestions and call summaries are written for them.',
    'Screen Capture': 'Review how a call was handled, not only what was said, for coaching and disputes.',
    'Voice Biometrics': 'Callers are verified in seconds, so agents skip the security questions.',
    'Additional Phone Numbers': 'Give each team or campaign its own direct dial number.',
    'Toll-free Number': 'Customers call you free of charge, which helps support lines.',
    'Number Porting': 'Keep the numbers customers already know when you move carrier.',
    'AI Assistant': 'Summaries, transcripts and agent assist across the workspace.',
    'Call Recording': 'Keep recordings for training, quality and compliance.',
    'Advanced Analytics': 'Custom dashboards and scheduled reports instead of manual exports.',
    'Priority Support': 'A named engineer and a 15-minute response when something breaks.',
    'Voicemail Transcription': 'Read a voicemail in seconds instead of listening to every message.',
    'SMS Bundle': 'A fixed block of messages, so busy months do not tip into per-message overage.',
    'Extra Meeting Capacity': 'Run larger all-hands and webinars without splitting them across rooms.',
    'Additional Storage': 'Room for more recordings and files before you reach the plan limit.',
    'Call Whisper & Barge': 'Supervisors coach agents live without the caller hearing.',
    'Digital Signage Display': 'Queue times and targets visible to the whole floor.',
    'Extra International Minutes': 'Call customers and colleagues abroad without running out of international minutes.',
    'AI Voice Agent': 'Routine calls are answered and summarised by AI, so people handle the calls that need them.',
    'AI Chat Agent': 'Chat questions get an instant first answer before they reach a person.',
    'Internet Fax': 'Send and receive faxes from your inbox, with no fax machine or extra line.',
    'Spam Monitoring': 'Find out early when a number is flagged as spam, so customers still pick up.',
    'Messaging Compliance Pack': 'Brand and campaign registration handled, so your texts are not blocked.',
    'Conference Room Device': 'Meeting rooms get a dedicated phone, ready for calls and video meetings.',
    'Large Meeting': 'Host all-hands and webinars beyond the normal meeting size.'
  };

  B.pages['add-ons'] = {
    title: 'Add-ons',
    desc: 'Extras you can add to your plan, and what you already hold. They are billed with the plan each period.',
    bind() { tab = 'catalogue'; },
    render(el) { host = el; draw(); }
  };

  function draw() {
    if (!host || !host.isConnected) return;
    host.innerHTML = `<div class="bcard overflow-hidden"><div class="tabs" role="tablist" aria-label="Add-ons views">
      <button type="button" role="tab" class="tab ${tab === 'catalogue' ? 'active' : ''}" aria-selected="${tab === 'catalogue'}" data-tab="catalogue">Add-ons</button>
      <button type="button" role="tab" class="tab" aria-selected="false" data-tab="usage">Usage</button>
    </div><div class="p-3" role="tabpanel" id="aoPanel"></div></div>`;
    host.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab === 'usage') return B.go('usage'); tab = b.dataset.tab; draw(); });
    const p = host.querySelector('#aoPanel');
    tab === 'catalogue' ? catalogue(p) : manage(p);
  }

  /* ---------- catalogue ---------- */
  /* small category tag + icon for each add-on (first keyword wins) */
  const KINDS = [[/\bai\b|copilot|assistant|transcription/i, 'AI', 'pink', 'bell'], [/analytics|biometric/i, 'Insights', 'violet', 'usage'], [/record|capture|whisper|barge|international/i, 'Calls', 'blue', 'phone'],
    [/storage/i, 'Cloud', 'teal', 'modules'], [/number|porting|toll|spam|fax/i, 'Numbers', 'green', 'phone'], [/sms|message/i, 'Messaging', 'amber', 'bell'], [/meeting|conference/i, 'Meetings', 'violet', 'user'],
    [/support/i, 'Care', 'teal', 'info'], [/signage|display/i, 'Display', 'slate', 'summary']];
  const kindOf = n => { for (const k of KINDS) if (k[0].test(n)) return k; return [null, 'Add-on', 'slate', 'addons']; };
  const GICON = { licence: 'licences', number: 'phone', workspace: 'modules' };

  function card(a) {
    const soon = a.status === 'Coming soon', on = a.status === 'Active', open = !collapsed.has(a.id), k = kindOf(a.name);
    const badge = soon ? B.badge('Coming soon', 'muted') : on ? B.badge(`On your plan \u00b7 ${a.qty}`, 'info') : B.badge('Not on your plan', 'ok');
    const tag = `<span class="ad-tag ad-${k[2]}">${k[1]}</span>`;
    const price = soon ? `<div class="ad-prow"><div class="ad-price soon">Pricing to be announced</div>${tag}</div>`
      : `<div class="ad-prow"><div class="ad-price"><b>${B.money(a.price)}</b><span>${esc(a.unit)}, ${esc(a.freq.toLowerCase())}</span></div>${tag}</div>`;
    const rows = soon
      ? `<div class="ad-det"><div class="ad-h">What it saves you</div><div class="ad-t">${esc(SAVES[a.name] || a.description)}</div></div>
         <div class="ad-det"><div class="ad-h">How it is charged</div><div class="ad-t">Pricing will be shown here when it launches.</div></div>
         <div class="ad-det"><div class="ad-h">Availability</div><div class="ad-t">This add-on is not available to order yet.</div></div>`
      : `<div class="ad-det"><div class="ad-h">What it saves you</div><div class="ad-t">${esc(SAVES[a.name] || a.description)}</div></div>
         <div class="ad-det"><div class="ad-h">How it is charged</div><div class="ad-t">${esc(a.freq)} charge, billed with the plan.</div></div>
         <div class="ad-det"><div class="ad-h">${on ? 'On your plan' : 'Add to your plan'}</div><div class="ad-t">${on ? `${a.qty} held, ${B.money(a.qty * a.price)} each period.` : 'Charged in proportion for the rest of this period, then on the plan each period.'}</div></div>`;
    const act = soon ? '<button type="button" class="btn btn-brand-o" disabled>Coming soon</button>'
      : on ? `<button type="button" class="btn btn-brand-o" data-manage="${a.id}">Manage</button><button type="button" class="btn btn-link ad-rm" data-remove="${a.id}">Remove</button>`
      : `<button type="button" class="btn btn-brand" data-add="${a.id}" aria-label="Add ${esc(a.name)} to your plan">${B.icon('plus', 15)} Add to your plan</button>`;
    return `<article class="ad-card ad-${k[2]} ${on ? 'is-on' : ''} ${soon ? 'is-soon' : ''}" aria-label="${esc(a.name)}">
      <div class="ad-top"><span class="ad-ico ad-${k[2]}">${B.icon(k[3], 18)}</span><div class="ad-tt"><div class="ad-name">${esc(a.name)}</div><div class="ad-desc">${esc(a.description)}</div></div>${badge}</div>
      ${price}
      ${open ? `<div class="ad-dets">${rows}</div>` : ''}
      <div class="ad-foot"><button type="button" class="ad-toggle" data-toggle="${a.id}" aria-expanded="${open}">${open ? 'Hide details' : 'Show details'}</button><div class="ad-acts">${act}</div></div></article>`;
  }

  function catalogue(p) {
    host.setAttribute('data-plain', '');
    const act = S.addons.filter(x => x.status === 'Active'), avail = S.addons.filter(x => x.status === 'Available'), soonN = S.addons.filter(x => x.status === 'Coming soon').length;
    const kpi = (cls, ico, label, val, note) => `<div class="col-6 col-xl-3"><div class="tile pl-t ${cls}"><span class="pl-ti">${B.icon(ico, 20)}</span><div class="pl-tb"><div class="eyebrow">${label}</div><div class="t-val">${val}</div><div class="t-note">${note}</div></div></div></div>`;
    p.innerHTML = `<div class="d-grid gap-3 ad-page">
      <div class="row g-3 pl-kpis" aria-label="Add-ons at a glance">
        ${kpi('pl-g', 'addons', 'On your plan', act.length, act.length === 1 ? 'add-on active' : 'add-ons active')}
        ${kpi('pl-b', 'wallet', 'Add-ons each month', B.money(act.reduce((n, x) => n + x.qty * x.price, 0)), 'Billed with the plan')}
        ${kpi('pl-v', 'cart', 'Available to add', avail.length, 'Ready to order today')}
        ${kpi('pl-a', 'clock', 'Coming soon', soonN, 'Not available to order yet')}
      </div>
      <section class="ad-intro" aria-label="About add-ons">
        <div class="ad-intro-h"><div class="ad-intro-t">What this page does for you ${B.badge('Flat prices', 'warn')}</div><div class="ad-desc">Each add-on shows what it saves you, how it is charged and how to add it.</div></div>
        <div class="ad-intro-g">
          <div class="ad-i"><span class="ad-ico ad-blue">${B.icon('addons', 18)}</span><div><div class="ad-h">Add extras where you need them</div><div class="ad-t">Pick them per licence, per number or for the whole workspace. Nothing is added until you press Add.</div></div></div>
          <div class="ad-i"><span class="ad-ico ad-violet">${B.icon('modules', 18)}</span><div><div class="ad-h">Looking for the modules your plan already includes?</div><div class="ad-t">Voice, video meetings, chat and more are turned on or off separately, and many are part of the plan already.</div><button type="button" class="btn btn-brand-o btn-sm mt-2" data-go="modules-access">Modules &amp; access</button></div></div>
          <div class="ad-i"><span class="ad-ico ad-teal">${B.icon('usage', 18)}</span><div><div class="ad-h">Looking for what a call allowance costs?</div><div class="ad-t">Usage beyond your included minutes, messages and tokens is billed separately at the rates shown with your usage.</div><button type="button" class="btn btn-brand-o btn-sm mt-2" data-go="usage">Usage &amp; rates</button></div></div>
        </div></section>
      <div class="ad-note" role="note"><span>${B.icon('info', 16)}</span><div>Add-ons are billed with your plan each period. One added part-way through a period is charged in proportion for the days left, and removing one takes effect from the next period.</div></div>
      ${GROUPS.map(g => {
        const items = S.addons.filter(a => groupOf(a) === g[0]);
        return items.length ? `<section class="ad-group" aria-label="${g[1]}"><div class="ad-gh"><span class="ad-gi">${B.icon(GICON[g[0]], 18)}</span><div><h2>${g[1]} <span class="ad-count">${items.length}</span></h2><p>${g[2]}</p></div></div><div class="ad-grid">${items.map(card).join('')}</div></section>` : '';
      }).join('')}</div>`;
    p.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.go) return B.go(t.dataset.go);
      if (t.dataset.toggle) { const id = +t.dataset.toggle; collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id); return catalogue(p); }
      const id = +(t.dataset.add || t.dataset.manage || t.dataset.remove || 0); if (!id) return;
      const ad = S.addons.find(x => x.id === id);
      if (t.dataset.remove) return removeAddon(ad);
      openQty(ad, !!t.dataset.add);
    };
  }

  function openQty(ad, adding) {
    if (adding) return buy(ad, draw);
    B.form({ title: `${adding ? 'Add' : 'Manage'} ${ad.name}`, submitLabel: adding ? 'Add to plan' : 'Save', size: 'modal-md', values: { qty: adding ? 1 : ad.qty },
      intro: `${B.money(ad.price)} ${esc(ad.unit)}, billed ${ad.freq.toLowerCase()}.`,
      fields: [{ name: 'qty', label: 'Quantity', type: 'number', required: true, integer: true, gt: 0, gtMsg: 'Quantity must be greater than 0.', max: 100, col: 'col-12' }],
      impact: v => impactFor(ad, v.qty, adding ? 0 : ad.qty),
      onSubmit: v => { ad.qty = Number(v.qty); ad.status = 'Active'; B.toast(adding ? `${ad.name} added.` : `${ad.name} updated.`); draw(); } });
  }
  function impactFor(ad, qty, had) {
    const q = Number(qty); if (!/^\d+$/.test(String(qty)) || q < 1 || q > 100) return '';
    const delta = Math.round((q - had) * ad.price * 100) / 100;
    return B.impact([['Price', `${B.money(ad.price)} ${esc(ad.unit)}`], ['This add-on each month', B.money(q * ad.price)], ['Change to next bill', `${delta >= 0 ? '+' : '-'}${B.money(Math.abs(delta))}`], ['All add-ons each month', B.money(C.addonsTotal() + delta)]]);
  }
  /* Add an add-on from anywhere: pick it, choose a quantity, see the price, confirm. */
  B.openAddAddon = done => {
    const avail = S.addons.filter(a => a.status === 'Available');
    if (!avail.length) return B.toast('Every available add-on is already on your plan.', 'error');
    buy(avail[0], typeof done === 'function' ? done : draw, avail);
  };

  /* ---------- purchase popup: quantity, prorated price, then pay from the wallet, a saved card or a new card ---------- */
  const day = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;
  const r2 = n => Math.round(n * 100) / 100;
  const luhn = d => { let t = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } t += n; alt = !alt; } return t % 10 === 0; };
  const brandOf = d => /^4/.test(d) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : /^3[47]/.test(d) ? 'Amex' : 'Card';
  const expired = e => { const m = /^(\d{2})\/(\d{2})$/.exec(String(e).replace(/\s/g, '')); if (!m) return true; const t = S.today.split('-'); return +m[1] < 1 || +m[1] > 12 || 2000 + +m[2] < +t[0] || (2000 + +m[2] === +t[0] && +m[1] < +t[1]); };

  function buy(first, done, list) {
    const $ = B.money, total = Math.max(1, day(S.period.next) - day(S.period.start)), left = Math.max(0, Math.min(total, day(S.period.next) - day(S.today)));
    let cur = first, qty = 1, pay = null, busy = false, saved = null;
    const due = () => r2(qty * cur.price * left / total);
    const qtyOk = () => Number.isInteger(qty) && qty >= 1 && qty <= 500;
    const word = () => String(cur.unit).replace(/^per\s+/i, '');
    const kk = () => kindOf(cur.name);
    const hero = () => `<span class="bo-hi ad-${kk()[2]}">${B.icon(kk()[3], 20)}</span><div><div class="bo-hn">${esc(cur.name)}</div><div class="bo-hs">${B.money(cur.price)} ${esc(cur.unit)}, ${esc(cur.freq.toLowerCase())}</div></div>`;
    const body = `<div class="bo-hero" id="boHero"></div>${list && list.length > 1 ? `<div class="mb-3"><label class="form-label" for="boAdd">Add-on</label><select id="boAdd" class="form-select">${list.map(a => `<option value="${a.id}">${esc(a.name)} \u2013 ${B.money(a.price)} ${esc(a.unit)}</option>`).join('')}</select></div>` : ''}
      <div class="bo-qty"><div><div class="bo-qt" id="boQt"></div><div class="bo-qs" id="boQs"></div></div>
        <div class="bo-step"><button type="button" class="bo-m" data-q="-1" aria-label="Decrease quantity">\u2212</button><input id="boQ" inputmode="numeric" value="1" aria-label="Quantity" autocomplete="off"><button type="button" class="bo-p" data-q="1" aria-label="Increase quantity">+</button></div></div>
      <div class="bo-err" id="boQe" role="alert"></div>
      <div class="bo-sum" id="boSum"></div>
      <p class="bo-note">${B.icon('info', 14)} Charged today for the rest of this billing period, from a card or the wallet. From the next period the add-on is on your plan bill.</p>
      <div class="bo-or"><span>Choose how to pay</span></div><div class="bo-tiles" role="tablist" aria-label="Payment method"><button type="button" role="tab" class="bo-tile" data-pt="new">${B.icon('card', 20)}<span>Card</span></button><button type="button" role="tab" class="bo-tile" data-pt="saved">${B.icon('idcard', 20)}<span>Saved cards</span></button><button type="button" role="tab" class="bo-tile" data-pt="wallet">${B.icon('wallet', 20)}<span>Wallet</span></button></div>
      <div id="boPanel"></div>`;
    const m = B.modal({ title: `Add ${cur.name}`, size: 'modal-lg bo-modal', body,
      footer: '<button type="button" class="btn btn-link bo-cancel" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-brand bo-pay" id="boGo"></button>' });
    const q = sel => m.el.querySelector(sel), go = q('#boGo');
    const usable = () => S.methods.filter(x => !expired(x.exp));

    const drawSum = () => {
      q('#boHero').innerHTML = hero();
      q('#boQt').textContent = `How many ${word()}s?`; q('#boQs').textContent = `Up to 500. Charged ${cur.unit}.`;
      q('#boQe').textContent = qtyOk() ? '' : 'Enter a whole number from 1 to 500.';
      const d = qtyOk() ? due() : 0, row = (t, sub, v, cls = '') => `<div class="bo-r ${cls}"><div><div class="bo-rt">${t}</div>${sub ? `<div class="bo-rs">${sub}</div>` : ''}</div><div class="bo-rv">${v}</div></div>`;
      q('#boSum').innerHTML = `${row(`${qtyOk() ? qty : 0} \u00d7 ${esc(cur.name)}, rest of this period`, `${left} day${left === 1 ? '' : 's'} left of ${total}, at ${$(cur.price)} ${esc(cur.unit)} a month`, $(d))}
        ${row('Tax (0.00%)', '', $(0))}
        <div class="bo-due"><span>Total due today</span><b>${$(d)}</b></div>
        ${row('Then, each month', 'Added to the plan bill from the next period, before tax', $(qtyOk() ? r2(qty * cur.price) : 0), 'then')}`;
    };
    const drawPanel = () => {
      const d = qtyOk() ? due() : 0, pn = q('#boPanel');
      m.el.querySelectorAll('[data-pt]').forEach(b => { const on = b.dataset.pt === pay; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
      if (pay === 'wallet') {
        pn.innerHTML = `<div class="bo-wallet"><div><span>Wallet balance</span><b>${$(S.credit)}</b></div><div><span>Due today</span><b>${$(d)}</b></div><div class="bo-wl"><span>Balance after payment</span><b class="${S.credit - d < 0 ? 'text-danger' : 'text-brand'}">${$(r2(S.credit - d))}</b></div></div>
          ${S.credit < d ? '<div class="bo-err mt-2">Your wallet balance is not enough. Add credit or choose a card.</div>' : ''}`;
      } else if (pay === 'saved') {
        pn.innerHTML = S.methods.length ? `<div class="bo-cards">${S.methods.map((x, i) => { const ex = expired(x.exp); return `<label class="bo-card ${ex ? 'off' : ''}"><input type="radio" name="boSm" value="${x.id}" ${ex ? 'disabled' : ''} ${saved === x.id || (saved == null && !ex && i === S.methods.findIndex(y => !expired(y.exp))) ? 'checked' : ''}><span class="fw-semibold">${esc(x.brand)} \u2022\u2022\u2022\u2022 ${esc(x.last4)}</span><span class="text-muted small ms-auto">${ex ? 'Expired' : 'Expires ' + esc(x.exp)}${x.primary ? ' \u00b7 primary' : ''}</span></label>`; }).join('')}</div>`
          : '<p class="bo-empty">No saved cards yet. Use the New Card tab to pay with a card.</p>';
        const r = pn.querySelector('[name=boSm]:checked'); if (r) saved = +r.value;
      } else {
        pn.innerHTML = `<div class="bo-ci-h">Card Information</div>
          <div class="bo-cg"><div class="bo-cr"><input id="boNum" class="bo-in" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234" aria-label="Card number"><img class="bo-brands-i" src="assets/card-brands.png" alt="Accepted cards: Visa, Mastercard, Discover and American Express"></div>
            <div class="bo-cr2"><input id="boExp" class="bo-in" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" aria-label="Expiry date"><div class="bo-cvc"><input id="boCvc" class="bo-in" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" aria-label="Security code"><span class="bo-cvi">${B.icon('card', 18)}</span></div></div></div>
          <div class="bo-ci-h mt-3">Name on card</div><input id="boHolder" class="form-control bo-name" autocomplete="cc-name" placeholder="As it appears on the card" aria-label="Name on card">
          <div class="bo-err mt-2" id="boCe" role="alert"></div>`;
        const num = q('#boNum'), exp = q('#boExp');
        num.addEventListener('input', () => { num.value = num.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim(); });
        exp.addEventListener('input', () => { const v = exp.value.replace(/\D/g, '').slice(0, 4); exp.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v; });
      }
      drawBtn();
    };
    const drawBtn = () => {
      const d = qtyOk() ? due() : 0;
      go.disabled = busy || !qtyOk() || left <= 0 || (pay === 'wallet' && S.credit < d) || (pay === 'saved' && !usable().length);
      go.innerHTML = busy ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Processing\u2026' : pay === 'wallet' ? `Pay ${$(d)} from wallet` : pay === 'saved' ? `Pay ${$(d)} with saved card` : `Pay ${$(d)}`;
    };
    pay = S.credit >= due() ? 'wallet' : usable().length ? 'saved' : 'new';
    drawSum(); drawPanel();

    const setQty = v => { qty = v; drawSum(); if (pay !== 'new') drawPanel(); else drawBtn(); };
    m.el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const n = Math.min(500, Math.max(1, (qtyOk() ? qty : 1) + +b.dataset.q)); q('#boQ').value = n; setQty(n); });
    q('#boQ').addEventListener('input', e => { const v = e.target.value.trim(); setQty(/^\d+$/.test(v) ? +v : NaN); });
    m.el.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { pay = b.dataset.pt; drawPanel(); });
    m.el.addEventListener('change', e => { if (e.target.name === 'boSm') saved = +e.target.value; });
    q('#boAdd')?.addEventListener('change', e => { cur = list.find(a => String(a.id) === e.target.value); m.el.querySelector('.modal-title').textContent = `Add ${cur.name}`; drawSum(); if (pay !== 'new') drawPanel(); else drawBtn(); });

    go.onclick = () => {
      if (busy || !qtyOk()) return;
      let via = pay, label = 'wallet';
      if (pay === 'new') {
        const holder = q('#boHolder').value.trim(), num = q('#boNum').value.replace(/\D/g, ''), exp = q('#boExp').value.replace(/\s/g, ''), cvc = q('#boCvc').value.trim();
        const err = holder.length < 2 ? 'Enter the name on the card.' : !/^\d{13,19}$/.test(num) || !luhn(num) ? 'Enter a valid card number.' : !/^\d{2}\/\d{2}$/.test(exp) || expired(exp) ? 'Enter a valid expiry date (MM/YY) that has not passed.' : !/^\d{3,4}$/.test(cvc) ? 'Security code must be 3 or 4 digits.' : '';
        if (err) { q('#boCe').textContent = err; return; }
        label = `${brandOf(num)} \u2022\u2022\u2022\u2022 ${num.slice(-4)}`;
      } else if (pay === 'saved') {
        const c = S.methods.find(x => x.id === saved); if (!c || expired(c.exp)) return B.toast('Choose a card that has not expired.', 'error', 'No card selected');
        label = `${c.brand} \u2022\u2022\u2022\u2022 ${c.last4}`;
      }
      busy = true; drawBtn();
      setTimeout(() => {
        const d = due(), ref = 'AO-' + String(Date.now()).slice(-6);
        if (via === 'wallet') S.credit = r2(S.credit - d);
        S.ledger.push({ id: S.ledger.length + 1, date: S.today, description: `Add-on: ${cur.name} \u00d7 ${qty} (prorated)`, ref, debit: d, credit: 0, type: 'charge' });
        if (via !== 'wallet') S.ledger.push({ id: S.ledger.length + 1, date: S.today, description: 'Card payment', ref, debit: 0, credit: d, type: 'payment' });
        S.activity.unshift({ id: Math.max(0, ...S.activity.map(a => a.id)) + 1, date: S.today, amount: d, status: 'Paid', description: `Add-on purchase: ${cur.name} (prorated)`, ref: String(Date.now()).slice(-12) });
        cur.qty = qty; cur.status = 'Active';
        B.toast(`${cur.name} added. ${$(d)} was paid ${via === 'wallet' ? 'from your wallet' : 'with ' + label}.`, 'ok', 'Add-on added');
        m.hide(); if (via === 'wallet' && B.autoRechargeCheck) B.autoRechargeCheck(); if (done) done();
      }, 700);
    };
  }

  function removeAddon(ad) {
    B.confirm({ title: `Remove ${ad.name}?`, danger: true, okLabel: 'Remove', message: 'It stops being billed from the next period.', onOk: () => { ad.status = 'Available'; ad.qty = 0; B.toast(`${ad.name} removed.`); draw(); } });
  }

  /* ---------- manage ---------- */
  function manage(p) {
    p.innerHTML = `<div class="row g-3 mb-3">
        <div class="col-6 col-lg-3"><div class="tile"><div class="eyebrow">Active add-ons</div><div class="t-val">${C.activeAddons().length}</div></div></div>
        <div class="col-6 col-lg-3"><div class="tile"><div class="eyebrow">Monthly cost</div><div class="t-val">${B.money(C.addonsTotal())}</div></div></div></div>
      <div id="aTable"></div>`;
    dt = B.DataTable(p.querySelector('#aTable'), {
      caption: 'Add-ons', rows: () => S.addons.map(a => Object.assign({}, a, { amount: a.qty * a.price })), amountKey: 'price', searchKeys: ['name', 'description', 'status'], searchPlaceholder: 'Search add-ons',
      filters: [{ key: 'status', label: 'Status', options: ['Active', 'Available', 'Coming soon'] }], emptyText: 'No add-ons found.',
      columns: [
        { key: 'name', label: 'Name', render: r => `<div class="fw-semibold">${esc(r.name)}</div><div class="text-muted small d-md-none">${esc(r.description)}</div>` },
        { key: 'description', label: 'Description', hide: 'md' },
        { key: 'qty', label: 'Quantity' },
        { key: 'price', label: 'Price', render: r => `${B.money(r.price)} <span class="text-muted small">${esc(r.unit)}</span>` },
        { key: 'freq', label: 'Billing frequency', hide: 'lg' },
        { key: 'status', label: 'Status', render: r => B.badge(r.status, r.status === 'Coming soon' ? 'muted' : B.statusKind(r.status)) },
        { key: '_act', label: 'Actions', align: 'end' }
      ],
      actions: r => r.status === 'Active'
        ? B.actBtn('manage', r.id, 'sliders', `Manage ${r.name}`) + B.actBtn('remove', r.id, 'trash', `Remove ${r.name}`, 'danger')
        : r.status === 'Coming soon' ? '<span class="text-muted small">Coming soon</span>' : B.actBtn('add', r.id, 'plus', `Add ${r.name}`),
      onAction: (a, row) => { const ad = S.addons.find(x => x.id === row.id); a === 'remove' ? removeAddon(ad) : openQty(ad, a === 'add'); }
    });
  }
})(window.Billing);
