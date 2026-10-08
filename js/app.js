/* Shell: top bar (nav, quick search, balance, clock), Admin Hub sidebar, fixed header band, hash router. */
(function (B) {
  const S = B.state;
  const NAV = [
    ['summary', 'Summary', 'listBox'], ['usage', 'Usage', 'listBox'], ['plan', 'Plan', 'listBox'],
    ['licences-resources', 'Licences & resources', 'listBox'],
    ['credit-payment', 'Credit & payment', 'cart'], ['invoices', 'Invoices', 'invoicePen'],
    ['statement', 'Statement', 'listBox'], ['add-ons', 'Add-ons', 'listBox'],
    ['cost-centres', 'Cost centres', 'listBox'], ['modules-access', 'Modules & access', 'pagePlain']
  ];
  const SEARCH_WORDS = { summary: 'billing overview next bill', usage: 'minutes sms ai storage', plan: 'subscription seats renewal cancel', 'licences-resources': 'licenses seats users numbers', 'credit-payment': 'card top up balance wallet payment', invoices: 'bills receipts download', statement: 'ledger transactions', 'modules-access': 'features voice chat sms', 'add-ons': 'extras store', 'cost-centres': 'departments spend' };
  const $ = id => document.getElementById(id);
  const nav = $('sideNav'), pageHead = $('pageHead'), view = $('view'), mainCol = $('mainCol');

  /* ---- top bar ---- */
  $('navOpen').innerHTML = B.icon('menu', 22);
  $('tsIcon').innerHTML = B.icon('search', 15);
  $('bellBtn').innerHTML = B.icon('bell', 17);
  $('avatar').innerHTML = B.icon('user', 18);
  $('topNav').innerHTML = [['Dashboard', 'home'], ['Directory', 'userCircle'], ['Interactions', 'phone'], ['Analytics', 'usage'], ['Settings', 'settings', true]]
    .map(n => `<a href="#/summary" class="tn-item ${n[2] ? 'active' : ''}" data-top="${n[0]}" ${n[2] ? 'aria-current="true"' : ''}>${B.icon(n[1], 16)}<span>${n[0]}</span></a>`).join('');
  $('topNav').addEventListener('click', e => {
    const a = e.target.closest('[data-top]'); if (!a) return; e.preventDefault();
    if (a.dataset.top !== 'Settings') B.toast(`${a.dataset.top} is outside the Billing module.`);
  });
  $('bellBtn').onclick = () => B.toast("You're all caught up. No new notifications.");

  const pad = n => String(n).padStart(2, '0');
  function tick() {
    const d = new Date();
    $('clockPill').innerHTML = `${B.icon('clock', 15)}<span>${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}</span>`;
    $('walletPill').innerHTML = `${B.icon('wallet', 16)}<span>${B.money(S.credit)}</span>`;
  }
  tick(); setInterval(tick, 1000);

  /* ---- quick search: jump to a Billing page (Ctrl/⌘ + K focuses it) ---- */
  const qs = $('qs'), list = $('qsList'); let hits = [], active = -1;
  function renderHits() {
    list.innerHTML = hits.length ? hits.map((h, i) => `<li role="option" id="qs${i}" data-key="${h[0]}" class="${i === active ? 'on' : ''}" aria-selected="${i === active}">${B.icon(h[2], 15)}<span>${h[1]}</span></li>`).join('') : '<li class="none">No Billing pages match.</li>';
    list.hidden = false; qs.setAttribute('aria-expanded', 'true');
  }
  function closeHits() { list.hidden = true; qs.setAttribute('aria-expanded', 'false'); active = -1; }
  function go(key) { closeHits(); qs.value = ''; qs.blur(); B.go(key); }
  qs.addEventListener('input', () => {
    const q = qs.value.trim().toLowerCase(); if (!q) return closeHits();
    hits = NAV.filter(n => (n[1] + ' ' + (SEARCH_WORDS[n[0]] || '')).toLowerCase().includes(q)); active = hits.length ? 0 : -1; renderHits();
  });
  qs.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); active = (active + 1) % hits.length; renderHits(); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); active = (active - 1 + hits.length) % hits.length; renderHits(); }
    else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); go(hits[active][0]); }
    else if (e.key === 'Escape') { qs.value = ''; closeHits(); qs.blur(); }
  });
  list.addEventListener('mousedown', e => { const li = e.target.closest('[data-key]'); if (li) { e.preventDefault(); go(li.dataset.key); } });
  qs.addEventListener('blur', () => setTimeout(closeHits, 120));
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); qs.focus(); qs.select(); } });

  /* ---- sidebar ---- */
  const GROUPS = [
    ['overview', 'Overview', 'home', ['summary']],
    ['subscription', 'Subscription', 'pricing', ['plan', 'licences-resources', 'add-ons']],
    ['usage-costs', 'Usage & Costs', 'costs', ['usage', 'credit-payment', 'cost-centres']],
    ['financial', 'Financial', 'invoices', ['invoices', 'statement']],
    ['admin', 'Administration', 'lock', ['modules-access']]
  ];
  const groupOf = key => GROUPS.find(g => g[3].includes(key));
  B.crumbs = key => { const g = groupOf(key), n = NAV.find(x => x[0] === key); return ['Billing', g && g[1], n && n[1]].filter(Boolean); };
  nav.innerHTML = GROUPS.map(g => `<div class="ng" data-g="${g[0]}">
    <button type="button" class="ng-btn" id="ngb_${g[0]}" aria-expanded="false" aria-controls="ngs_${g[0]}">${B.icon(g[2], 16)}<span>${g[1]}</span><i class="ng-chev">${B.icon('chev', 14)}</i></button>
    <div class="ng-sub" id="ngs_${g[0]}" role="group" aria-labelledby="ngb_${g[0]}" hidden>${g[3].map(k => { const n = NAV.find(x => x[0] === k); return `<a class="nav-row" href="#/${k}" data-key="${k}">${B.icon(n[2], 15)}<span>${n[1]}</span></a>`; }).join('')}</div></div>`).join('');
  const setGroup = (id, open) => { const b = $('ngb_' + id); b.setAttribute('aria-expanded', open); $('ngs_' + id).hidden = !open; };
  nav.addEventListener('click', e => { const b = e.target.closest('.ng-btn'); if (b) setGroup(b.closest('.ng').dataset.g, b.getAttribute('aria-expanded') !== 'true'); });
  $('sgIcon').innerHTML = B.icon('docSmall', 16);
  $('sgChev').innerHTML = B.icon('chev', 16);
  $('billingToggle').onclick = () => {
    const t = $('billingToggle'), open = t.getAttribute('aria-expanded') !== 'true';
    t.setAttribute('aria-expanded', open); nav.hidden = !open;
  };

  function openNav() { document.body.classList.add('nav-open'); $('navOpen').setAttribute('aria-expanded', 'true'); }
  function closeNav() { document.body.classList.remove('nav-open'); $('navOpen').setAttribute('aria-expanded', 'false'); }
  $('navOpen').onclick = openNav; $('navClose').onclick = closeNav; $('navBackdrop').onclick = closeNav;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  window.addEventListener('resize', () => { if (window.innerWidth >= 992) closeNav(); });

  /* ---- router ---- */
  function route() {
    const path = (location.hash.replace(/^#\/?/, '') || 'summary').split('?')[0];
    const key = B.pages[path] ? path : 'summary';
    const page = B.pages[key], label = NAV.find(n => n[0] === key)[1];
    B._tok++;
    nav.querySelectorAll('[data-key]').forEach(a => { const on = a.dataset.key === key; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    document.title = `${label} · Billing · UCaaS`;
    pageHead.innerHTML = B.head(Object.assign({ key }, page));
    const grp = groupOf(key); nav.querySelectorAll('.ng').forEach(n => n.classList.toggle('has-active', !!grp && n.dataset.g === grp[0])); GROUPS.forEach(g => setGroup(g[0], !!grp && g[0] === grp[0]));
    view.innerHTML = '<div id="pageBody"></div>';
    if (page.bind) page.bind(mainCol);
    B.mount($('pageBody'), el => page.render(el));
    closeNav(); view.scrollTop = 0; mainCol.scrollTop = 0; view.focus({ preventScroll: true });
    tick();
  }
  B.go = k => { location.hash = '#/' + k; };
  window.addEventListener('hashchange', route);
  route();
})(window.Billing);
