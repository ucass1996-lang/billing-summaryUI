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
      const foot = $e('#cpFoot'); if (!pick) { foot.hidden = true; return; }
      const p = S.plans.find(x => x.id === pick), kind = kindOf(p), pr = price(p);
      foot.hidden = kind === 'up';   // an upgrade goes straight to the Upgrade Plan popup, so no bar
      if (kind === 'up') return;
      $e('#cpOk').textContent = kind === 'up' ? 'Confirm upgrade' : 'Schedule downgrade';
      const d = Math.round((pr - S.plan.rate) * 100) / 100, imp = Math.round(d * S.seats * 100) / 100, sgn = n => (n > 0 ? '+' : n < 0 ? '-' : '') + $(Math.abs(n));
      const head = `Current <b>${esc(S.plan.name)}</b> ${$(S.plan.rate)} → selected <b>${esc(p.name)}</b> ${$(pr)} per user per month (${d === 0 ? 'no price difference' : sgn(d) + ' per user'}).`;
      if (kind === 'up') {
        $e('#cpMsg').innerHTML = '';
      } else {
        $e('#cpMsg').innerHTML = `${head}<br>Billing impact for ${S.seats} seat${S.seats === 1 ? '' : 's'}: <b>${sgn(imp)}</b> a month. You keep <b>${esc(S.plan.name)}</b> until ${B.fmtDate(S.period.next)}.`;
      }
    }

    $e('#cpCycle').onclick = e => { const b = e.target.closest('[data-cycle]'); if (b) { cycle = b.dataset.cycle; drawCycle(); drawCards(); drawFoot(); } };
    $e('#cpTrack').onclick = e => {
      const b = e.target.closest('[data-pick]'); if (!b || b.disabled) return;
      pick = pick === b.dataset.pick ? null : b.dataset.pick; drawCards(); drawFoot();
      if (pick && kindOf(S.plans.find(x => x.id === pick)) === 'up') $e('#cpOk').click();
    };
    const step = dir => $e('#cpTrack').scrollBy({ left: dir * Math.max(280, $e('#cpTrack').clientWidth * .8), behavior: 'smooth' });
    $e('#cpPrev').onclick = () => step(-1); $e('#cpNext').onclick = () => step(1);
    $e('#cpTrack').addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); step(.4); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-.4); } });
    B.bindPlanMore($e('#cpTrack'), open);
    $e('#cpCancel').onclick = () => { pick = null; drawCards(); drawFoot(); };

    /* An upgrade asks when it should start; a downgrade is always scheduled for the next renewal. */
    function askTiming(p, pr2, go) {
      const extra = pr2.extra, left = pr2.left, total = pr2.total, cur = S.plans.find(x => x.name === S.plan.name);
      /* allowances after an immediate upgrade: what is left now + a prorated grant for what the new plan adds */
      const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
      const unitOf = v => String(v || '').replace(/^[\d,.\s]+/, '').trim();
      const KEYS = [['aiReplies', 'AI replies', null], ['aiMin', 'AI minutes', null], ['sms', 'Text messages', 'sms'], ['numbers', 'Phone numbers', 'numbers'], ['storage', 'Recording storage', 'storage']];
      const rows = KEYS.map(([k, label, ukey]) => {
        const pn = p.inc && p.inc[k], cn = cur && cur.inc && cur.inc[k], unit = unitOf(pn) || unitOf(cn);
        if (/unlimited/i.test(String(pn)) && /unlimited/i.test(String(cn))) return null;
        const curPool = num(cn) * S.seats, newPool = num(pn) * S.seats, u = ukey && S.usage.find(x => x.key === ukey);
        const stay = u ? Math.max(0, u.included - u.used) : curPool, grant = Math.round(Math.max(0, newPool - curPool) * left / total);
        return { label, unit, stay: Math.round(stay), grant, after: Math.round(stay) + grant };
      }).filter(r => r && (r.stay || r.grant));
      const pct = Math.max(0, Math.min(100, Math.round((total - left) / total * 100)));
      const detail = `<div class="up-detail" id="upDetail" hidden>
        <div class="up-period"><div><div class="up-eyebrow">Billing period</div><div class="up-days">${left} day${left === 1 ? '' : 's'} until your plan renews</div></div><div class="up-date">${B.fmtDate(S.period.next)}</div></div>
        <div class="up-bar" role="img" aria-label="${pct}% of this billing period has passed"><i style="width:${pct}%"></i></div>
        <p class="up-sub">${esc(S.plan.cycle || 'Monthly')} billing cycle. Unused plan allowances stack with the new grant. No refund for this period.</p>
        <div class="up-eyebrow up-sec">Allowances after upgrade</div>
        <div class="up-grid" role="table" aria-label="Allowances after upgrade">
          <div class="up-gh" role="row"><span role="columnheader">Included</span><span role="columnheader">Left</span><span role="columnheader">New</span><span role="columnheader" class="after">After</span></div>
          ${rows.length ? rows.map(r => `<div class="up-gr" role="row"><span role="rowheader">${esc(r.label)}<small>${esc(r.unit)}</small></span><span role="cell">${B.num(r.stay)}</span><span role="cell" class="${r.grant ? 'plus' : ''}">${r.grant ? '+' + B.num(r.grant) : '—'}</span><span role="cell" class="after">${B.num(r.after)}</span></div>`).join('') : '<div class="up-gr"><span>No metered allowances change with this plan.</span></div>'}
        </div>
        <p class="up-foot">Left = what you still have today. New = prorated grant from the upgraded plan. After = both combined.</p>
        <div class="up-sum"><div><span>Plan charge (prorated)</span><b>${$(extra)}</b></div><div><span>Tax</span><b>${$(0)}</b></div><div class="due"><span>Due today</span><b>${$(extra)}</b></div></div></div>`;
      const note = 'Plan leftovers expire with this period. Add-on balances still run until they are used up. New plan allowances start next cycle.';
      const md = B.modal({ title: 'Upgrade Plan', size: 'modal-lg up-modal',
        body: `<div class="up-hero"><div class="up-hl"><div class="up-hn">${B.icon('plan', 16)} ${esc(p.name)}</div><div class="up-amt" id="upAmt">${$(0)}</div><div class="up-due" id="upDue">Due today \u00b7 nothing is charged until ${B.fmtDate(S.period.next)}</div></div>
          <svg class="up-art" viewBox="0 0 70 80" aria-hidden="true" focusable="false"><rect x="8" y="4" width="48" height="62" rx="7" fill="#fff" stroke="#c9d9fb" stroke-width="2"/><path d="M18 20h28M18 30h28M18 40h16" stroke="#cfdcf8" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="56" r="11" fill="#2f6bff"/><path d="M45 56l4 4 7-8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <dl class="up-meta"><dt>From</dt><dd>${esc(S.plan.name)} \u00b7 ${$(S.plan.rate)}/user</dd><dt>To</dt><dd>${esc(p.name)} \u00b7 ${$(price(p))}/user</dd><dt>Memo</dt><dd>${S.seats} seat${S.seats === 1 ? '' : 's'}, ${esc(S.plan.cycle || 'Monthly')} billing</dd></dl>
          <div class="up-or"><span>When should the upgrade start?</span></div>
          <div class="up-opts" role="radiogroup" aria-label="When should the upgrade start?">
          <label class="up-opt on"><input type="radio" name="upw" value="cycle" checked><span><b>At end of billing cycle</b><small>No charge today. New plan and allowances start on your next renewal date.</small></span></label>
          <label class="up-opt"><input type="radio" name="upw" value="now"><span><b>Upgrade immediately</b><small>Prorated charge today${extra > 0 ? ` (${$(extra)})` : ''}. Allowances stack as shown below.</small></span></label></div>
          <div class="up-note" id="upNote" aria-live="polite">${note}</div>${detail}`,
        footer: '<button type="button" class="btn btn-link up-cancel" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-brand-o up-ok" data-ok>Confirm</button>' });
      m.el.classList.add('cp-under');   // the plan picker stays out of sight while this popup is open
      const mode = () => md.el.querySelector('input[name=upw]:checked').value;
      md.el.querySelectorAll('input[name=upw]').forEach(r => r.onchange = () => {
        md.el.querySelectorAll('.up-opt').forEach(o => o.classList.toggle('on', o.querySelector('input').checked));
        const now = mode() === 'now'; md.el.querySelector('#upAmt').textContent = $(now ? extra : 0); md.el.querySelector('#upDue').textContent = now ? 'Due today \u00b7 prorated for the days left' : `Due today \u00b7 nothing is charged until ${B.fmtDate(S.period.next)}`; md.el.querySelector('#upNote').hidden = now; md.el.querySelector('#upDetail').hidden = !now;
        md.el.querySelector('.up-ok').textContent = now && extra > 0 ? `Pay ${$(extra)} and upgrade` : 'Confirm';
      });
      let confirmed = false;
      md.el.querySelector('[data-ok]').onclick = () => { if (go(mode())) { confirmed = true; md.hide(); } };
      md.el.addEventListener('hidden.bs.modal', () => { m.el.classList.remove('cp-under'); if (!confirmed) { pick = null; drawCards(); drawFoot(); } });
    }

    $e('#cpOk').onclick = () => {
      const p = S.plans.find(x => x.id === pick);
      if (!p) return B.toast('Select a plan first.', 'error', 'No plan selected');
      const kind = kindOf(p), pr = price(p), next = { name: p.name, rate: pr, cycle: cycle === 'annual' ? 'Annual' : 'Monthly', concurrent: S.plan.concurrent, freeCredit: S.plan.freeCredit };
      if (kind === 'current') return B.toast('You are already on this plan.', 'error', 'Nothing to change');
      if (S.seats > limitOf(p)) return B.toast(`${p.name} allows up to ${limitOf(p)} licences and you have ${S.seats}.`, 'error', 'Too many licences');
      const finish = (mode) => {
        let extra = 0, left = 0, total = 0;
        if (mode === 'now') {
          ({ extra, left, total } = prorate(p));
          if (left <= 0) { B.toast('This billing period has ended. Reload the page and try again.', 'error', 'Cannot upgrade'); return false; }
          if (extra > 0 && extra > S.credit && !S.methods.length) { B.toast(`The prorated charge of ${$(extra)} is more than your credit balance of ${$(S.credit)}. Add a card or top up credit first.`, 'error', 'Payment needed'); return false; }
          const ref = 'UP-' + String(Date.now()).slice(-6), viaCredit = extra <= S.credit;
          if (extra > 0) {
            if (viaCredit) S.credit = r2(S.credit - extra);
            S.ledger.push({ id: S.ledger.length + 1, date: S.today, description: `Upgrade to ${p.name} (prorated)`, ref, debit: extra, credit: 0, type: 'charge' });
            if (!viaCredit) S.ledger.push({ id: S.ledger.length + 1, date: S.today, description: 'Card payment', ref, debit: 0, credit: extra, type: 'payment' });
            S.activity.unshift({ id: Math.max(0, ...S.activity.map(a => a.id)) + 1, date: S.today, amount: extra, status: 'Paid', description: `Plan upgrade to ${p.name} (prorated)`, ref: String(Date.now()).slice(-12) });
          }
          S.plan = next; S.scheduledPlan = null; if (viaCredit && extra > 0 && B.autoRechargeCheck) B.autoRechargeCheck();
          B.toast(extra > 0 ? `You are now on ${p.name}. The prorated charge of ${$(extra)} has been paid.` : `You are now on ${p.name}.`, 'ok', 'Upgrade confirmed');
        } else if (mode === 'cycle') {
          S.scheduledPlan = Object.assign({}, next, { effective: S.period.next, upgrade: true });
          B.toast(`${p.name} starts on ${B.fmtDate(S.period.next)}. Nothing is charged today.`, 'info', 'Upgrade scheduled');
        } else {
          S.scheduledPlan = Object.assign({}, next, { effective: S.period.next });
          B.toast(`${p.name} starts on ${B.fmtDate(S.period.next)}.`, 'info', 'Downgrade scheduled');
        }
        const k = kind === 'up' ? (mode === 'now' ? 'up' : 'sched') : 'down';
        B.lastPlanChange = { kind: k, name: p.name, rate: pr, cycle: next.cycle, effective: k === 'up' ? null : S.period.next, extra, left, total };
        m.hide(); if (typeof done === 'function') done();
        return true;
      };
      if (kind === 'up') return askTiming(p, prorate(p), finish);
      finish('down');
    };

    const pre = preId && S.plans.find(x => x.id === preId);
    if (pre && kindOf(pre) !== 'current') { pick = pre.id; setTimeout(() => { const el = $e(`[data-pick="${pre.id}"]`); if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' }); }, 120); }
    drawCycle(); drawCards(); drawFoot();
    if (pre && kindOf(pre) === 'up') setTimeout(() => { const ok = $e('#cpOk'); if (ok && pick === pre.id) ok.click(); }, 350);   // from Compare plans: go straight to the Upgrade Plan popup
  };
})(window.Billing);
