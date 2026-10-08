/* Change plan popup (opened from the Plan page): solid blue "current" card, white plan cards, sideways scroll.
   B.openChangePlan(done) */
(function (B) {
  const S = B.state, esc = B.esc, $ = B.money;
  S.scheduledPlan = S.scheduledPlan || null;

  const limitOf = p => B.planLimit(p);

  B.openChangePlan = function (done, preId) {
    let cycle = S.plan.cycle === 'Annual' ? 'annual' : 'monthly', pick = null;
    const open = new Set();
    const price = p => cycle === 'annual' ? p.annual : p.monthly;
    const kindOf = p => p.name === S.plan.name ? 'current' : price(p) < S.plan.rate ? 'down' : 'up';
    /* Prorated upgrade charge: the monthly price difference x seats, for the days left in this billing period. */
    const day = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;
    const r2 = n => Math.round(n * 100) / 100;
    const prorate = p => {
      const total = Math.max(1, day(S.period.next) - day(S.period.start)), left = Math.max(0, Math.min(total, day(S.period.next) - day(S.today)));
      const diff = r2(price(p) - S.plan.rate);
      return { total, left, diff, extra: r2(diff * S.seats * left / total) };
    };

    const m = B.modal({
      title: 'Change plan', size: 'modal-xl', bare: true,
      body: `<div class="cp">
        <header class="cp-head"><h2 class="cp-title" aria-hidden="true">Change plan</h2>
          <p class="cp-sub">Pick a plan and billing cycle. A downgrade takes effect when your current billing period ends.</p></header>
        <div class="cp-bar"><span>Billing cycle</span><div class="cp-seg" role="group" aria-label="Billing cycle" id="cpCycle"></div></div>
        <div class="cp-hint"><span id="cpHint"></span>
          <span class="cp-arrows"><button type="button" class="btn-ico" id="cpPrev" aria-label="Scroll plans left">${B.icon('chev', 15)}</button><button type="button" class="btn-ico" id="cpNext" aria-label="Scroll plans right">${B.icon('chev', 15)}</button></span></div>
        <div class="cp-track" id="cpTrack" tabindex="0" role="region" aria-label="Plans. Scroll sideways to compare."></div>
        <div class="cp-foot" id="cpFoot" hidden><div class="cp-foot-msg" id="cpMsg" aria-live="polite"></div>
          <div class="d-flex gap-2"><button type="button" class="btn btn-brand-o" id="cpCancel">Cancel</button><button type="button" class="btn btn-brand" id="cpOk">Confirm</button></div></div>
      </div>`
    });
    m.el.classList.add('cp-modal');
    const $e = s => m.el.querySelector(s);

    function drawCycle() {
      $e('#cpCycle').innerHTML = ['monthly', 'annual'].map(c => `<button type="button" class="${cycle === c ? 'on' : ''}" data-cycle="${c}" aria-pressed="${cycle === c}">${c === 'monthly' ? 'Monthly' : 'Annually'}</button>`).join('');
    }

    function drawCards() {
      $e('#cpHint').textContent = `Scroll sideways to compare all ${S.plans.length} plans`;
      $e('#cpTrack').innerHTML = S.plans.map(p => {
        const kind = kindOf(p), pr = price(p), cur = kind === 'current', tooBig = S.seats > limitOf(p), chosen = pick === p.id;
        const label = cur ? 'Current plan' : tooBig ? 'Too many licences' : chosen ? 'Selected' : kind === 'up' ? 'Upgrade' : 'Downgrade';
        return `<article class="cp-card ${cur ? 'cur' : ''} ${chosen ? 'chosen' : ''}" data-cat="${p.cat}" aria-label="${esc(p.name)}">
          <div class="cp-top"><h3 class="cp-name">${esc(p.name)}</h3>${cur ? '<span class="cp-flag">Current</span>' : ''}</div>
          ${p.save && !cur ? `<div class="cp-save">${esc(p.save)}</div>` : ''}
          <div class="cp-price"><span class="cp-amt">${$(pr)}</span>${p.list && !cur ? `<s class="cp-was">${$(p.list)}</s>` : ''}</div>
          <div class="cp-per">month · per user</div>
          <button type="button" class="btn cp-btn ${cur ? 'is-cur' : chosen ? 'btn-brand' : 'btn-brand-o'}" data-pick="${p.id}" ${cur || tooBig ? 'disabled' : ''} aria-pressed="${chosen}">${label}</button>
          ${tooBig ? `<div class="cp-warn">You have ${S.seats} licences. Remove some first.</div>` : ''}
          <div class="pf-h">Includes:</div>${B.planMore(p, open.has(p.id), 'cp-inc')}</article>`;
      }).join('');
    }

    function drawFoot() {
      const foot = $e('#cpFoot'); foot.hidden = !pick; if (!pick) return;
      const p = S.plans.find(x => x.id === pick), kind = kindOf(p), pr = price(p);
      $e('#cpOk').textContent = kind === 'up' ? 'Confirm upgrade' : 'Schedule downgrade';
      const d = Math.round((pr - S.plan.rate) * 100) / 100, imp = Math.round(d * S.seats * 100) / 100, sgn = n => (n > 0 ? '+' : n < 0 ? '-' : '') + $(Math.abs(n));
      const head = `Current <b>${esc(S.plan.name)}</b> ${$(S.plan.rate)} → selected <b>${esc(p.name)}</b> ${$(pr)} per user per month (${d === 0 ? 'no price difference' : sgn(d) + ' per user'}).`;
      if (kind === 'up') {
        const pr2 = prorate(p), line = (k, v, cls = '') => `<div class="cp-s ${cls}"><span>${k}</span><b>${v}</b></div>`;
        const pay = pr2.extra <= S.credit ? `Paid from your credit balance (${$(S.credit)} available).` : S.methods.length ? 'Charged to your card on file.' : '';
        $e('#cpMsg').innerHTML = `<div class="cp-sum" role="group" aria-label="Upgrade summary">
          ${line('Current plan', `${esc(S.plan.name)} · ${$(S.plan.rate)}/month`)}
          ${line('New plan', `${esc(p.name)}`)}
          ${line('Upgrade date', `${B.fmtDate(S.today)} (today)`)}
          ${line('Plan starts', 'Immediately')}
          ${line(`Prorated extra charge`, pr2.extra > 0 ? $(pr2.extra) : 'None', 'hl')}
          ${line('New monthly price', `${$(pr)}/month`)}</div>
          <div class="cp-calc">${pr2.diff > 0 ? `${S.seats} seat${S.seats === 1 ? '' : 's'} × ${$(pr2.diff)} difference × ${pr2.left} of ${pr2.total} days left in this billing period.` : 'No price difference, so there is nothing extra to pay.'}
          ${pay ? ' ' + pay : '<span class="text-danger">Add a card or top up credit to pay this charge.</span>'}</div>`;
      } else {
        $e('#cpMsg').innerHTML = `${head}<br>Billing impact for ${S.seats} seat${S.seats === 1 ? '' : 's'}: <b>${sgn(imp)}</b> a month. You keep <b>${esc(S.plan.name)}</b> until ${B.fmtDate(S.period.next)}.`;
      }
    }

    $e('#cpCycle').onclick = e => { const b = e.target.closest('[data-cycle]'); if (b) { cycle = b.dataset.cycle; drawCycle(); drawCards(); drawFoot(); } };
    $e('#cpTrack').onclick = e => { const b = e.target.closest('[data-pick]'); if (b && !b.disabled) { pick = pick === b.dataset.pick ? null : b.dataset.pick; drawCards(); drawFoot(); } };
    const step = dir => $e('#cpTrack').scrollBy({ left: dir * Math.max(280, $e('#cpTrack').clientWidth * .8), behavior: 'smooth' });
    $e('#cpPrev').onclick = () => step(-1); $e('#cpNext').onclick = () => step(1);
    $e('#cpTrack').addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); step(.4); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-.4); } });
    B.bindPlanMore($e('#cpTrack'), open);
    $e('#cpCancel').onclick = () => { pick = null; drawCards(); drawFoot(); };

    $e('#cpOk').onclick = () => {
      const p = S.plans.find(x => x.id === pick);
      if (!p) return B.toast('Select a plan first.', 'error', 'No plan selected');
      const kind = kindOf(p), pr = price(p), next = { name: p.name, rate: pr, cycle: cycle === 'annual' ? 'Annual' : 'Monthly', concurrent: S.plan.concurrent, freeCredit: S.plan.freeCredit };
      if (kind === 'current') return B.toast('You are already on this plan.', 'error', 'Nothing to change');
      if (S.seats > limitOf(p)) return B.toast(`${p.name} allows up to ${limitOf(p)} licences and you have ${S.seats}.`, 'error', 'Too many licences');
      let extra = 0, left = 0, total = 0;
      if (kind === 'up') {
        ({ extra, left, total } = prorate(p));
        if (left <= 0) return B.toast('This billing period has ended. Reload the page and try again.', 'error', 'Cannot upgrade');
        if (extra > 0 && extra > S.credit && !S.methods.length) return B.toast(`The prorated charge of ${$(extra)} is more than your credit balance of ${$(S.credit)}. Add a card or top up credit first.`, 'error', 'Payment needed');
        const ref = 'UP-' + String(Date.now()).slice(-6), viaCredit = extra <= S.credit;
        if (extra > 0) {
          if (viaCredit) S.credit = r2(S.credit - extra);
          S.ledger.push({ id: S.ledger.length + 1, date: S.today, description: `Upgrade to ${p.name} (prorated)`, ref, debit: extra, credit: 0, type: 'charge' });
          if (!viaCredit) S.ledger.push({ id: S.ledger.length + 1, date: S.today, description: 'Card payment', ref, debit: 0, credit: extra, type: 'payment' });
          S.activity.unshift({ id: Math.max(0, ...S.activity.map(a => a.id)) + 1, date: S.today, amount: extra, status: 'Paid', description: `Plan upgrade to ${p.name} (prorated)`, ref: String(Date.now()).slice(-12) });
        }
        S.plan = next; S.scheduledPlan = null; if (viaCredit && extra > 0 && B.autoRechargeCheck) B.autoRechargeCheck();
        B.toast(extra > 0 ? `You are now on ${p.name}. The prorated charge of ${$(extra)} has been paid.` : `You are now on ${p.name}.`, 'ok', 'Upgrade confirmed');
      } else {
        S.scheduledPlan = Object.assign({}, next, { effective: S.period.next });
        B.toast(`${p.name} starts on ${B.fmtDate(S.period.next)}.`, 'info', 'Downgrade scheduled');
      }
      B.lastPlanChange = { kind, name: p.name, rate: pr, cycle: next.cycle, effective: kind === 'up' ? null : S.period.next, extra, left, total };
      m.hide(); if (typeof done === 'function') done();
    };

    const pre = preId && S.plans.find(x => x.id === preId);
    if (pre && kindOf(pre) !== 'current') { pick = pre.id; setTimeout(() => { const el = $e(`[data-pick="${pre.id}"]`); if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' }); }, 120); }
    drawCycle(); drawCards(); drawFoot();
  };
})(window.Billing);
