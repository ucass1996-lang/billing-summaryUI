/* Card actions: every summary-style card carries its own visible action button (e.g. "Buy licences →"),
   coloured to match the card. Cards also change colour on hover/focus. No popups. */
(function (B) {
  const S = B.state, esc = B.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const click = sel => () => { const el = $(sel); if (el) el.click(); else B.toast('That action is not available on this page.', 'error'); };
  const go = key => () => B.go(key);
  const TONES = { brand: '#2563eb', ok: '#0f9d78', info: '#4f46e5', warn: '#d97706', bad: '#dc2626', accent: '#c2670a', muted: '#64748b',
    phone: '#2563eb', ai: '#7c3aed', sell: '#0d9488', cc: '#ea580c', support: '#db2777' };

  /* card label -> [tone, button text, what it does] */
  const TILE = {
    'current plan': ['brand', 'Change plan', () => B.go('plan')],
    'next bill due': ['accent', 'View details', () => B.billDetails && B.billDetails()],
    'billing cycle': ['info', 'View plan', go('plan')],
    'available credit': ['ok', 'Top up', go('credit-payment')],
    'outstanding amount': ['bad', 'View invoices', go('invoices')],
    'next bill estimate': ['accent', 'View invoices', go('invoices')],
    'next bill date': ['info', 'See your plan', go('plan')],
    'billing period': ['info', 'View statement', go('statement')],
    'licences': ['ok', 'Manage licences', go('licences-resources')],
    'last payment': ['ok', 'Download invoice', click('#dlInv')],
    'next bill': ['accent', 'Open summary', go('summary')],
    'renewing on': ['info', 'Change plan', click('[data-chg]')],
    'ends on': ['info', 'Change plan', click('[data-chg]')],
    'seats': ['ok', 'Manage licences', go('licences-resources')],
    'ai minutes included': ['ai', 'Available minutes', click('[data-rates="minutes"]')],
    'ai replies included': ['ai', 'See usage', go('usage')],
    'total licences': ['brand', 'Buy licences', () => B.buySeats && B.buySeats()],
    'assigned': ['ok', 'Assign licence', () => B.assignLicence && B.assignLicence()],
    'available': ['info', 'Assign licence', () => B.assignLicence && B.assignLicence()],
    'pending': ['warn', 'View licences', () => { const t = $('#lTable'); t && t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }],
    'opening balance': ['muted', 'Download statement', click('#dl')],
    'charges': ['bad', 'Download statement', click('#dl')],
    'credits': ['ok', 'Download statement', click('#dl')],
    'payments': ['ok', 'Download statement', click('#dl')],
    'adjustments': ['warn', 'Download statement', click('#dl')],
    'closing balance': ['brand', 'Print statement', click('#pr')],
    'active add-ons': ['brand', 'Browse add-ons', () => { const el = $('[data-tab="catalogue"]'); if (el) el.click(); else B.go('add-ons'); }],
    'monthly cost': ['brand', 'Browse add-ons', click('[data-tab="catalogue"]')]
  };

  const ARROW = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const CARDS = '.tile, .res-card, .plan-card, .cp-card, .ao-group .ao-card';

  function toneOf(card) {
    if (card.classList.contains('tile')) return (TILE[($('.eyebrow', card)?.textContent || '').trim().toLowerCase()] || ['brand'])[0];
    if (card.classList.contains('res-card')) return 'brand';
    if (card.dataset.cat) return card.dataset.cat;
    if (card.classList.contains('ao-card')) { const t = ($('.sbadge', card)?.textContent || '').toLowerCase(); return t.includes('soon') ? 'muted' : t.includes('on your plan') && !t.includes('not') ? 'info' : 'ok'; }
    return 'brand';
  }

  /* tiles and resource cards get a real button; plan and add-on cards already have their own */
  function addButton(card) {
    let label, run;
    if (card.classList.contains('tile')) { const t = TILE[($('.eyebrow', card)?.textContent || '').trim().toLowerCase()]; if (!t) return; label = t[1]; run = t[2]; }
    else if (card.classList.contains('res-card')) { label = 'Add more'; run = go('add-ons'); }
    else return;
    const row = document.createElement('div'); row.className = 'ca-row';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ca-btn';
    btn.innerHTML = `<span>${esc(label)}</span>${ARROW}`;
    btn.setAttribute('aria-label', `${label}: ${$('.eyebrow, strong', card)?.textContent.trim() || ''}`.trim());
    btn.addEventListener('click', e => { e.stopPropagation(); run(); });
    row.appendChild(btn); card.appendChild(row); card.classList.add('has-ca');
  }

  function enhance(root) {
    root.querySelectorAll(CARDS).forEach(card => {
      if (card.dataset.ca) return; card.dataset.ca = '1';
      if (card.closest('[data-plain]')) return;
      card.classList.add('hv-card');
      const col = TONES[toneOf(card)] || TONES.brand; card.style.setProperty('--hv', col);
      addButton(card);
    });
  }

  new MutationObserver(() => enhance(document.body)).observe(document.body, { childList: true, subtree: true });
  enhance(document.body);
})(window.Billing);
