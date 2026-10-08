/* Modules & Access: enable / disable / trial UCaaS modules. */
(function (B) {
  const S = B.state, esc = B.esc;
  let dt;

  const actionsFor = r => ({
    Enabled: [['disable', 'Disable', 'pause', 'danger']],
    Disabled: [['enable', 'Enable', 'power', '']],
    Available: [['trial', 'Start trial of', 'play', ''], ['enable', 'Enable', 'power', '']],
    Trial: [['enable', 'Enable', 'power', ''], ['disable', 'End trial of', 'pause', 'danger']]
  }[r.status] || []);

  B.pages['modules-access'] = {
    title: 'Modules & Access',
    desc: 'Turn UCaaS modules on or off and see what each one adds to your bill.',
    render(el) {
      el.innerHTML = '<section class="bcard p-3"><div id="mTable"></div></section>';
      dt = B.DataTable(el.querySelector('#mTable'), {
        caption: 'Modules', rows: () => S.modules, searchKeys: ['name', 'status', 'usage', 'note'], searchPlaceholder: 'Search modules',
        filters: [{ key: 'status', label: 'Status', options: ['Enabled', 'Disabled', 'Trial', 'Available'] }],
        emptyText: 'No modules found.',
        columns: [
          { key: 'name', label: 'Module', render: r => `<span class="fw-semibold">${esc(r.name)}</span>` },
          { key: 'status', label: 'Status', render: r => B.badge(r.status, B.statusKind(r.status)) },
          { key: 'users', label: 'Users', hide: 'sm' },
          { key: 'usage', label: 'Usage', hide: 'md' },
          { key: 'impact', label: 'Billing impact', render: r => esc(r.note) },
          { key: '_act', label: 'Actions', align: 'end' }
        ],
        actions: r => actionsFor(r).map(a => B.actBtn(a[0], r.id, a[2], `${a[1]} ${r.name}`, a[3])).join(''),
        onAction: (a, r) => {
          const set = (status, users, msg) => { r.status = status; r.users = users; if (status === 'Trial') r.note = 'Trial ends in 14 days'; else if (status !== 'Enabled' && r.impact) r.note = `+${B.money(r.impact)} / month`; B.toast(msg); dt.refresh(); };
          const n = B.calc.assigned();
          if (a === 'trial') B.confirm({ title: `Start ${r.name} trial?`, okLabel: 'Start trial', message: 'The trial is free for 14 days. You can disable it at any time.', onOk: () => set('Trial', n, `${r.name} trial started.`) });
          if (a === 'enable') B.confirm({ title: `Enable ${r.name}?`, okLabel: 'Enable', message: r.impact ? `This adds ${B.money(r.impact)} per month from the next billing period.` : 'This module is included in your plan.', onOk: () => set('Enabled', n, `${r.name} enabled.`) });
          if (a === 'disable') B.confirm({ title: `Disable ${r.name}?`, danger: true, okLabel: 'Disable', message: `Users will lose access to ${r.name} immediately.`, onOk: () => set('Disabled', 0, `${r.name} disabled.`) });
        }
      });
    }
  };
})(window.Billing);
