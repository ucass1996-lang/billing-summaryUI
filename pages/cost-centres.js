/* Cost Centres: create / edit (validated) / view details. */
(function (B) {
  const S = B.state, esc = B.esc;
  let dt, nextNo = 105;

  const fields = editing => [
    { name: 'name', label: 'Cost Centre Name', required: true, minLength: 2, maxLength: 40,
      validate: v => S.costCentres.some(c => c.name.toLowerCase() === v.toLowerCase() && (!editing || c.id !== editing.id)) ? 'A cost centre with this name already exists.' : '' },
    { name: 'department', label: 'Department', required: true, maxLength: 60 },
    { name: 'users', label: 'Users', type: 'number', required: true, integer: true, min: 0, max: 10000, minMsg: 'Users cannot be negative.', numMsg: 'Please enter a valid number of users.',
      /* allocation: active cost centres cannot claim more users than there are assigned licences */
      validate: (v, all) => {
        if (all && all.status !== 'Active') return '';
        const others = S.costCentres.filter(c => c.status === 'Active' && (!editing || c.id !== editing.id)).reduce((n, c) => n + c.users, 0), room = Math.max(0, B.calc.assigned() - others);
        return Number(v) > room ? `Only ${room} assigned licence${room === 1 ? ' is' : 's are'} left to allocate (${B.calc.assigned()} assigned, ${others} already allocated).` : '';
      } },
    { name: 'spend', label: 'Monthly Spend ($)', type: 'number', required: true, money: true, min: 0, max: 1000000, numMsg: 'Please enter a valid amount.' },
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
  ];

  function open(c) {
    B.form({ title: c ? `Edit ${c.code}` : 'Create cost centre', submitLabel: c ? 'Save changes' : 'Create', fields: fields(c),
      values: c ? { name: c.name, department: c.department, users: c.users, spend: c.spend.toFixed(2), status: c.status } : { users: 0, spend: '0.00', status: 'Active' },
      onSubmit: v => {
        const data = { name: v.name, department: v.department, users: Number(v.users), spend: Number(v.spend), status: v.status };
        if (c) { Object.assign(c, data); B.toast('Cost centre updated.'); }
        else { S.costCentres.push(Object.assign({ id: nextNo, code: 'CC-' + nextNo }, data)); nextNo++; B.toast('Cost centre created.'); }
        dt.refresh();
      } });
  }

  function archive(c) {
    B.confirm({ title: `Archive ${c.name}?`, okLabel: 'Archive', danger: true, message: `${c.code} stops receiving allocations and no longer counts against your licences. You can restore it at any time.`,
      onOk: () => { c.status = 'Inactive'; B.toast(`${c.name} archived.`); dt.refresh(); } });
  }
  function restore(c) {
    const others = S.costCentres.filter(x => x.status === 'Active' && x.id !== c.id).reduce((n, x) => n + x.users, 0);
    if (others + c.users > B.calc.assigned()) return B.toast(`${c.name} cannot be restored: its ${c.users} user(s) exceed the unallocated assigned licences.`, 'error');
    c.status = 'Active'; B.toast(`${c.name} restored.`); dt.refresh();
  }
  function remove(c) {
    if (c.users > 0) return B.toast(`${c.name} still has ${c.users} user(s). Move them to another cost centre before deleting it.`, 'error');
    B.confirm({ title: `Delete ${c.name}?`, okLabel: 'Delete', danger: true, message: `${c.code} will be permanently removed. This cannot be undone.`,
      onOk: () => { S.costCentres.splice(S.costCentres.indexOf(c), 1); B.toast(`${c.name} deleted.`); dt.refresh(); } });
  }

  B.pages['cost-centres'] = {
    title: 'Cost Centres',
    desc: 'Allocate monthly billing across your internal business units.',
    actions: '<button type="button" class="btn btn-brand" id="newCc">Create Cost Centre</button>',
    bind(root) { root.querySelector('#newCc').onclick = () => open(); },
    render(el) {
      el.innerHTML = '<section class="bcard p-3"><div id="cTable"></div></section>';
      dt = B.DataTable(el.querySelector('#cTable'), {
        caption: 'Cost centres', rows: () => S.costCentres, amountKey: 'spend', searchKeys: ['code', 'name', 'department'], searchPlaceholder: 'Search cost centres',
        filters: [{ key: 'status', label: 'Status', options: ['Active', 'Inactive'] }], emptyText: 'No cost centres found.',
        columns: [
          { key: 'name', label: 'Cost centre', render: r => `<div class="fw-semibold">${esc(r.name)}</div><div class="mono text-muted">${esc(r.code)}</div>` },
          { key: 'department', label: 'Department', hide: 'sm' },
          { key: 'users', label: 'Users' },
          { key: 'spend', label: 'Monthly spend', render: r => `${B.money(r.spend)}` },
          { key: 'status', label: 'Status', render: r => B.badge(r.status, B.statusKind(r.status)) },
          { key: '_act', label: 'Actions', align: 'end' }
        ],
        actions: r => B.actBtn('edit', r.id, 'edit', `Edit ${r.name}`) + B.actBtn('view', r.id, 'eye', `View details for ${r.name}`)
          + (r.status === 'Active' ? B.actBtn('archive', r.id, 'pause', `Archive ${r.name}`) : B.actBtn('restore', r.id, 'play', `Restore ${r.name}`)) + B.actBtn('delete', r.id, 'trash', `Delete ${r.name}`, 'danger'),
        onAction: (a, r) => a === 'edit' ? open(r) : a === 'archive' ? archive(r) : a === 'restore' ? restore(r) : a === 'delete' ? remove(r) : B.info(`${r.code} · ${r.name}`, `<dl class="kv"><dt>Department</dt><dd>${esc(r.department)}</dd><dt>Users</dt><dd>${r.users}</dd><dt>Monthly spend</dt><dd>${B.money(r.spend)}</dd><dt>Spend per user</dt><dd>${r.users ? B.money(r.spend / r.users) : '—'}</dd><dt>Status</dt><dd>${B.badge(r.status, B.statusKind(r.status))}</dd></dl>`)
      });
    }
  };
})(window.Billing);
