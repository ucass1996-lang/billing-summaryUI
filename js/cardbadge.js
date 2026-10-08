/* Card heading badges: every card gets a small Bootstrap pill beside its heading.
   Headings that already carry a badge (Active, Optional, Your plan...) are left alone.
   Runs as a progressive enhancement, so pages and popups that draw cards later are picked up too. */
(function () {
  /* tone → [label colour, soft background, dot] */
  const TONES = ['blue', 'green', 'amber', 'red', 'violet', 'teal', 'pink', 'slate'];

  /* exact heading (lower case) → [badge, tone] */
  const MAP = {
    'next bill estimate': ['Estimate', 'blue'], 'next bill date': ['Scheduled', 'violet'], 'billing period': ['Monthly', 'teal'], 'licences': ['Seats', 'slate'],
    'total licences': ['Seats', 'slate'], 'assigned': ['In use', 'green'], 'available': ['Free', 'teal'], 'pending': ['Waiting', 'amber'],
    'last payment': ['Paid', 'green'], 'next bill': ['Upcoming', 'blue'], 'renewing on': ['Renewal', 'violet'], 'ends on': ['Ending', 'amber'], 'seats': ['Licences', 'slate'],
    'ai minutes included': ['Minutes', 'pink'], 'ai replies included': ['Replies', 'pink'],
    'opening balance': ['Start', 'slate'], 'charges': ['Debit', 'amber'], 'credits': ['Credit', 'green'], 'payments': ['Received', 'teal'], 'adjustments': ['Manual', 'violet'], 'closing balance': ['Balance', 'blue'],
    'active add-ons': ['Live', 'green'], 'monthly cost': ['Recurring', 'blue'], 'amount paid': ['Paid', 'green'], 'amount due': ['Due', 'red'], 'due date': ['Deadline', 'amber'], 'total tax': ['Tax', 'slate'],
    'phone numbers': ['Numbers', 'blue'], 'extensions': ['Lines', 'violet'], 'channels': ['Capacity', 'amber'], 'storage': ['Cloud', 'teal'], 'meeting capacity': ['Meetings', 'pink'],
    'ai allowances': ['AI', 'pink'], 'what your plan includes': ['Included', 'green'], 'what each plan includes': ['Compare', 'violet'],
    'business phone': ['Plans', 'blue'], 'add-ons': ['Extras', 'teal'], 'how buying works': ['Guide', 'slate'],
    'plan inclusions': ['Included', 'green'], 'where the charges went': ['Breakdown', 'amber'], 'the records themselves': ['Records', 'slate'],
    'current plan': ['Plan', 'blue'], 'next bill due': ['Upcoming', 'blue'], 'billing cycle': ['Recurring', 'teal'], 'available credit': ['Wallet', 'green'], 'outstanding amount': ['Due', 'red'],
    'billing breakdown': ['Charges', 'amber'], 'recent invoices': ['Latest', 'blue'], 'quick actions': ['Shortcuts', 'violet'], 'add-ons on the plan': ['Extras', 'teal'], 'payment details': ['Billing', 'violet'], 'top-up now': ['Instant', 'green'],
    'low balance settings': ['Alerts', 'amber'], 'assigned licences': ['Seats', 'blue'], 'resources': ['Usage', 'teal'], 'transaction ledger': ['Ledger', 'slate'],
    'billing information': ['Account', 'violet'], 'this month': ['Usage', 'teal'], 'auto recharge': ['Auto', 'green'], 'auto recharge activity': ['History', 'slate'], 'available minutes': ['Voice', 'blue'], 'available fax': ['Fax', 'slate'], 'available sms/mms': ['Messaging', 'amber'], 'ai agents': ['AI', 'pink'], 'sell': ['Sales', 'green'], 'contact centre': ['Support', 'amber'], 'support': ['Care', 'teal']
  };
  const CATS = { phone: ['Phone', 'blue'], ai: ['AI', 'pink'], sell: ['Sales', 'green'], cc: ['Contact centre', 'amber'], support: ['Support', 'teal'] };
  /* add-on cards: first matching keyword wins */
  const WORDS = [
    [/\bai\b|copilot|assistant|transcription/, ['AI', 'pink']], [/analytics|biometric/, ['Insights', 'violet']], [/record|capture|whisper|barge/, ['Calls', 'blue']],
    [/storage/, ['Cloud', 'teal']], [/number|porting|toll/, ['Numbers', 'green']], [/sms|message/, ['Messaging', 'amber']], [/meeting/, ['Meetings', 'violet']],
    [/support/, ['Care', 'teal']], [/signage|display/, ['Display', 'slate']]
  ];
  const range = /^last \d+ days$|^this period$/;

  function key(h) {                      // heading text without any badge already in it
    const c = h.cloneNode(true); c.querySelectorAll('.cb, .sbadge, .badge, .ca-row').forEach(n => n.remove());
    return c.textContent.trim().replace(/\s+/g, ' ');
  }
  function lookup(h, text) {
    const t = text.toLowerCase(), card = h.closest('.plan-card, .ao-card, .tile, .res-card, .bsub, .bcard');
    if (card && card.classList.contains('plan-card')) return CATS[card.dataset.cat] || ['Plan', 'blue'];
    if (MAP[t]) return MAP[t];
    if (range.test(t)) return ['Period', 'violet'];
    if (card && card.closest('.ao-group, #view') && card.classList.contains('ao-card')) { for (const [re, b] of WORDS) if (re.test(t)) return b; return ['Add-on', 'slate']; }
    let n = 0; for (const ch of t) n += ch.charCodeAt(0);
    return ['Info', TONES[n % TONES.length]];
  }

  const HEADS = '.tile .eyebrow, .ao-card .ao-name, .res-card > div:first-child > strong, .plan-card h3, .bsub > strong.small, #view .sub-title';

  function put(h) {
    if (h.querySelector('.sbadge, .badge:not(.cb), .sbadge')) { h.classList.add('cb-host'); return; }   // already badged
    const text = key(h); if (!text) return;
    const [label, tone] = lookup(h, text), old = h.querySelector(':scope > .cb');
    if (old && old.dataset.k === text) return;
    const b = old || document.createElement('span');
    b.className = `badge rounded-pill cb cb-${tone}`; b.dataset.k = text;
    b.innerHTML = `<i class="cb-dot" aria-hidden="true"></i>${label.replace(/[&<>]/g, '')}`;
    if (!old) { h.classList.add('cb-host'); h.appendChild(b); }
  }
  function enhance() { document.querySelectorAll(HEADS).forEach(put); }

  let t = 0; const queue = () => { clearTimeout(t); t = setTimeout(enhance, 30); };
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true });
  enhance();
})();
