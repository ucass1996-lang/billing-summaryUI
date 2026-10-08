/* Licences & Resources: seat counts, assignment table, resource capacity. */
(function (B) {
  const S = B.state, C = B.calc, esc = B.esc;
  let host, dt, nextId = 100;

  B.pages['licences-resources'] = {
    title: 'Licences & Resources',
    desc: 'Manage seat allocations and the capacity included with your plan.',
    render(el) { host = el; draw(); }
  };

  function draw() {
    const tiles = [['Total licences', S.seats, ''], ['Assigned', C.assigned(), ''], ['Available', C.available(), C.available() ? '' : 'None spare'], ['Pending', C.pending(), '']];
    host.innerHTML = `<div class="row g-3 mb-4">${tiles.map(t => `<div class="col-6 col-lg-3"><div class="tile"><div class="eyebrow">${t[0]}</div><div class="t-val">${t[1]}</div>${t[2] ? `<div class="t-note">${t[2]}</div>` : ''}</div></div>`).join('')}</div>
      <section class="bcard p-3 mb-4" aria-labelledby="lh"><h2 class="sub-title mb-1" id="lh">Assigned licences</h2><p class="sub-desc mb-3">Each licence is ${B.money(S.plan.rate)} per month on the ${esc(S.plan.name)} plan.</p><div id="lTable"></div></section>
      <section aria-labelledby="rh"><h2 class="sub-title mb-2" id="rh">Resources</h2><div class="row g-3">${S.resources.map(r => {
        const pct = B.pct(r.used, r.limit), bar = pct > 100 ? 'over' : pct >= 85 ? 'near' : '';
        return `<div class="col-12 col-md-6 col-xl-4"><div class="bsub res-card p-3 h-100"><div class="d-flex justify-content-between mb-2"><strong>${esc(r.label)}</strong><span class="text-muted small">${pct}%${pct >= 85 ? ' · near limit' : ''}</span></div>
          <div class="progress mb-2" role="progressbar" aria-label="${esc(r.label)}" aria-valuenow="${Math.min(pct, 100)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${bar}" style="width:${Math.min(pct, 100)}%"></div></div>
          <div class="small text-muted">${B.num(r.used)} of ${B.num(r.limit)} ${esc(r.unit)} used</div></div></div>`;
      }).join('')}</div></section>`;
    { const k = [...host.children]; B.sectionTabs({ anchor: k[0], groups: [[k[0], k[1]], [k[2]]], labels: ['Licences', 'Resources'], key: 'licences' }); }
    dt = B.DataTable(host.querySelector('#lTable'), {
      caption: 'Assigned licences', rows: () => S.licences.map(l => Object.assign({}, l, { cost: S.plan.rate })),
      searchKeys: ['user', 'email', 'tier', 'status'], searchPlaceholder: 'Search user or email', dateKey: 'assigned',
      filters: [{ key: 'status', label: 'Status', options: ['Active', 'Pending', 'Suspended'] }],
      emptyText: 'No licences assigned yet.',
      columns: [
        { key: 'user', label: 'User', render: r => `<div class="fw-semibold">${esc(r.user)}</div><div class="text-muted small">${esc(r.email)}</div>` },
        { key: 'tier', label: 'Licence', hide: 'sm' },
        { key: 'status', label: 'Status', render: r => B.badge(r.status, B.statusKind(r.status)) },
        { key: 'assigned', label: 'Assigned date', hide: 'md', render: r => B.fmtDate(r.assigned) },
        { key: 'cost', label: 'Cost', align: 'end', render: r => `${B.money(r.cost)}/mo` },
        { key: '_act', label: 'Actions', align: 'end' }
      ],
      actions: r => B.actBtn('revoke', r.id, 'trash', `Revoke licence for ${r.user}`, 'danger'),
      onAction: (a, r) => B.confirm({ title: 'Revoke licence?', danger: true, okLabel: 'Revoke', message: `${r.user} will lose access and the licence becomes available to assign again.`,
        onOk: () => { S.licences = S.licences.filter(l => l.id !== r.id); B.toast('Licence revoked.'); draw(); } })
    });
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
