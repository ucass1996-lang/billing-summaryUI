/* Mock data for the Billing module (no backend). All pages read and update this one store. */
window.Billing = window.Billing || { pages: {} };
(function (B) {
  const S = B.state = {
    today: '2026-10-07',
    plan: { name: 'Ultimate', rate: 1.0, cycle: 'Monthly', concurrent: 4, freeCredit: 20 },
    minuteRates: [
      { dest: 'Canada', type: 'Landline', rate: 0.052, unit: 'Minutes' },
      { dest: 'USA', type: 'Mobile', rate: 0.005, unit: 'Minutes' },
      { dest: 'USA', type: 'Landline', rate: 0.005, unit: 'Minutes' }
    ],
    messageRates: [
      { dest: 'Canada', type: 'Mobile', rate: 0.0275, unit: 'SMS' },
      { dest: 'United States', type: 'Mobile', rate: 0.0078, unit: 'SMS' },
      { dest: 'Canada', type: 'Mobile', rate: 0.0275, unit: 'MMS' },
      { dest: 'United States', type: 'Mobile', rate: 0.0078, unit: 'MMS' }
    ],
    faxRates: [
      { dest: 'Canada', type: 'Landline', rate: 0.06, unit: 'Pages' },
      { dest: 'United States', type: 'Landline', rate: 0.015, unit: 'Pages' }
    ],
    seats: 3,
    credit: 89.82,
    creditUsed: 10.18,
    failed: 4.0,
    period: { start: '2026-10-05', end: '2026-11-05', next: '2026-11-06' },
    methods: [],
    billingInfo: { company: 'Acme Corp HQ', email: 'billing@acme.example', phone: '', address: '', country: 'United States', taxId: '', contact: 'Jogeshwari', billedTo: 'NA' },
    /* issuer shown at the top of invoices, and where tax is assessed */
    seller: { address: '132 Maple St # B Frostburg, MD 21532-1826 USA', email: 'support@mycountrymobile.com' },
    taxLocation: 'Mumbai, MH, IN',

    licences: [
      { id: 1, user: 'Sarah Jenkins', email: 'sarah.jenkins@acme.example', tier: 'Ultimate Seat', status: 'Active', assigned: '2026-01-12' },
      { id: 2, user: 'Alex Rivera', email: 'alex.rivera@acme.example', tier: 'Ultimate Seat', status: 'Active', assigned: '2026-02-15' },
      { id: 3, user: 'Michael Chang', email: 'michael.chang@acme.example', tier: 'Ultimate Seat', status: 'Active', assigned: '2026-03-01' }
    ],

    resources: [
      { label: 'Phone numbers', used: 2, limit: 5, unit: '' },
      { label: 'Extensions', used: 3, limit: 25, unit: '' },
      { label: 'Channels', used: 3, limit: 4, unit: '' },
      { label: 'Storage', used: 92, limit: 100, unit: 'GB' },
      { label: 'Meeting capacity', used: 12, limit: 50, unit: 'participants' }
    ],

    usage: [
      { key: 'users', label: 'Users', included: 3, used: 3, unit: 'seats', rate: 1 },
      { key: 'voice', label: 'Voice minutes', included: 10000, used: 8450, unit: 'min', rate: 0.02 },
      { key: 'sms', label: 'SMS', included: 5000, used: 2100, unit: 'messages', rate: 0.01 },
      { key: 'meetings', label: 'Meetings', included: 500, used: 180, unit: 'hours', rate: 0.5 },
      { key: 'numbers', label: 'Phone numbers', included: 5, used: 2, unit: 'numbers', rate: 1 },
      { key: 'storage', label: 'Storage', included: 100, used: 92, unit: 'GB', rate: 0.1 },
      { key: 'ai', label: 'AI usage', included: 50000, used: 54200, unit: 'tokens', rate: 0.001 }
    ],

    addons: [
      { id: 1, name: 'Additional Phone Numbers', description: 'Extra direct dial numbers, billed per number.', price: 1.0, unit: 'per number', qty: 0, freq: 'Monthly', status: 'Available' },
      { id: 2, name: 'AI Assistant', description: 'Call summaries, transcripts and agent assist.', price: 15.0, unit: 'per workspace', qty: 0, freq: 'Monthly', status: 'Available' },
      { id: 3, name: 'Call Recording', description: 'Cloud call recording with 100 GB storage.', price: 5.0, unit: 'per 100 GB', qty: 0, freq: 'Monthly', status: 'Available' },
      { id: 4, name: 'Additional Storage', description: 'Extra storage in 50 GB blocks.', price: 2.0, unit: 'per 50 GB', qty: 0, freq: 'Monthly', status: 'Available' },
      { id: 5, name: 'Advanced Analytics', description: 'Custom dashboards and scheduled reports.', price: 10.0, unit: 'per workspace', qty: 0, freq: 'Monthly', status: 'Available' }
    ],

    modules: [
      { id: 1, name: 'Voice', status: 'Enabled', users: 3, usage: '8,450 min', impact: 0, note: 'Included in plan' },
      { id: 2, name: 'Video Meetings', status: 'Enabled', users: 3, usage: '180 hrs', impact: 0, note: 'Included in plan' },
      { id: 3, name: 'Chat', status: 'Enabled', users: 3, usage: '1,240 msgs', impact: 0, note: 'Included in plan' },
      { id: 4, name: 'SMS', status: 'Enabled', users: 3, usage: '2,100 msgs', impact: 0, note: 'Pay as you go' },
      { id: 5, name: 'Call Recording', status: 'Available', users: 0, usage: '—', impact: 5, note: '+$5.00 / month' },
      { id: 6, name: 'Analytics', status: 'Available', users: 0, usage: '—', impact: 10, note: '+$10.00 / month' },
      { id: 7, name: 'Contact Centre', status: 'Disabled', users: 0, usage: '—', impact: 25, note: '+$25.00 / month' },
      { id: 8, name: 'AI', status: 'Trial', users: 3, usage: '54,200 tokens', impact: 15, note: 'Trial ends in 6 days' },
      { id: 9, name: 'CRM Integration', status: 'Disabled', users: 0, usage: '—', impact: 8, note: '+$8.00 / month' }
    ],

    costCentres: [
      { id: 1, code: 'CC-101', name: 'Sales', department: 'Sales & Business Development', users: 1, spend: 1.0, status: 'Active' },
      { id: 2, code: 'CC-102', name: 'Support', department: 'Customer Support', users: 1, spend: 1.0, status: 'Active' },
      { id: 3, code: 'CC-103', name: 'Development', department: 'Software Engineering', users: 1, spend: 1.0, status: 'Active' },
      { id: 4, code: 'CC-104', name: 'Marketing', department: 'Marketing', users: 0, spend: 0, status: 'Inactive' }
    ],

    invoices: [
      { id: 'INV-2026-010', period: '5 Sep – 5 Oct 2026', date: '2026-10-05', amount: 4.0, status: 'Failed' },
      { id: 'INV-2026-009', period: '5 Aug – 5 Sep 2026', date: '2026-09-05', amount: 7.67, status: 'Paid', payments: [{ name: 'Credit applied', amount: 2, type: 'credit' }, { name: 'Paid by Credit Card ending 3339', amount: 5.67, type: 'payment' }] },
      { id: 'INV-2026-008', period: '5 Jul – 5 Aug 2026', date: '2026-08-05', amount: 3.0, status: 'Paid', taxes: [{ name: 'GST', rate: 5, amount: 0.1 }, { name: 'State levy', rate: 2, amount: 0.04 }], payments: [{ name: 'Paid by Credit Card ending 3339', amount: 3, type: 'payment' }, { name: 'Refund to Credit Card ending 3339', amount: -0.5, type: 'refund' }] },
      { id: 'INV-2026-007', period: '5 Jun – 5 Jul 2026', date: '2026-07-05', amount: 3.0, status: 'Paid', lines: [{ name: 'Ultimate', sub: '2 × $1.00 a seat', qty: '2 × $1.00', amount: 2 }, { name: 'Additional Phone Numbers', sub: '1 × $1.00 / mo', qty: '1 × $1.00', amount: 1 }] },
      { id: 'INV-2026-006', period: '5 May – 5 Jun 2026', date: '2026-06-05', amount: 3.0, status: 'Paid' },
      { id: 'INV-2026-005', period: '5 Apr – 5 May 2026', date: '2026-05-05', amount: 3.0, status: 'Paid' },
      { id: 'INV-2026-004', period: '5 Mar – 5 Apr 2026', date: '2026-04-05', amount: 3.0, status: 'Paid' },
      { id: 'INV-2026-003', period: '5 Feb – 5 Mar 2026', date: '2026-03-05', amount: 2.0, status: 'Paid' },
      { id: 'INV-2026-002', period: '5 Jan – 5 Feb 2026', date: '2026-02-05', amount: 1.0, status: 'Paid' },
      { id: 'INV-2026-001', period: '5 Dec – 5 Jan 2026', date: '2026-01-05', amount: 1.0, status: 'Paid' },
      { id: 'INV-2025-012', period: '5 Nov – 5 Dec 2025', date: '2025-12-05', amount: 1.0, status: 'Paid' },
      { id: 'INV-2025-011', period: '5 Oct – 5 Nov 2025', date: '2025-11-05', amount: 0.0, status: 'Paid' }
    ],

    ledger: [
      { id: 1, date: '2026-08-20', description: 'Promotional credit applied', ref: 'CR-88219', debit: 0, credit: 100, type: 'credit' },
      { id: 2, date: '2026-09-03', description: 'Added member', ref: 'INV-2026-009', debit: 1.67, credit: 0, type: 'charge' },
      { id: 3, date: '2026-09-04', description: 'Plan renewal', ref: 'INV-2026-009', debit: 6.0, credit: 0, type: 'charge' },
      { id: 4, date: '2026-10-05', description: 'AI token overage', ref: 'INV-2026-010', debit: 2.51, credit: 0, type: 'charge' }
    ],

    activity: [
      ['2026-10-05', 3.0, 'Paid', 'Plan renewal', '901791189897'],
      ['2026-10-05', 2.0, 'Failed', 'Renewal skipped · no card', '111791159000'],
      ['2026-10-05', 2.0, 'Failed', 'Renewal skipped · no card', '611791159000'],
      ['2026-10-04', 2.0, 'Failed', 'Renewal skipped · no card', '971791872600'],
      ['2026-10-04', 2.0, 'Failed', 'Renewal skipped · no card', '391791872600'],
      ['2026-09-10', 50.0, 'Paid', 'Fund top-up', '431789834876'],
      ['2026-09-04', 2.0, 'Failed', 'Plan renewal failed: the payment could not be processed.', '741788480608'],
      ['2026-09-04', 6.0, 'Paid', 'Plan renewal', '631788480606'],
      ['2026-09-04', 2.0, 'Failed', 'Plan renewal failed: the payment could not be processed.', '211788480604'],
      ['2026-09-03', 1.67, 'Paid', 'Added Member', '251788437958'],
      ['2026-08-26', 15.0, 'Paid', 'License purchase', '521787740415'],
      ['2026-08-22', 20.0, 'Paid', 'Fund top-up', '311787394872'],
      ['2026-08-05', 20.0, 'Paid', 'Fund top-up', '661785933158'],
      ['2026-08-04', 49.99, 'Paid', 'Plan renewal', '101785801625'],
      ['2026-08-03', 0.0, 'Paid', 'DID Purchase', '631785763911'],
      ['2026-08-03', 0.0, 'Paid', 'Trial plan purchased', '381785763758']
    ].map((r, i) => ({ id: i + 1, date: r[0], amount: r[1], status: r[2], description: r[3], ref: r[4] })),

    planCats: [['phone', 'Business phone'], ['ai', 'AI agents'], ['sell', 'Sell'], ['cc', 'Contact centre'], ['support', 'Support']],
    plans: [
      {
        "id": "ultimate",
        "cat": "phone",
        "name": "Ultimate",
        "desc": "Our most complete business phone plan, with the highest allowances.",
        "monthly": 1,
        "annual": 1,
        "unit": "seat",
        "features": [
          "Unlimited calling in Canada and United States, per seat",
          "1,000 texts a month, per seat",
          "4 phone numbers included",
          "Local, mobile, toll-free numbers",
          "100 GB recording storage",
          "$20 calling credit to start",
          "750 AI voice minutes a month, per seat, then $0.03 a minute after",
          "6,000 AI chat replies a month, per seat, then $0.01 a reply after",
          "300 transcription minutes a month, per seat",
          "Extra recording storage at $2.49 a GB a month",
          "Auto attendant, call routing, voicemail and texting"
        ],
        "popular": false,
        "inc": {
          "minutes": "Unlimited minutes",
          "sms": "1,000 messages",
          "numbers": "4 numbers",
          "storage": "100 GB",
          "aiMin": "750 minutes",
          "aiReplies": "6,000 replies"
        }
      },
      {
        "id": "phone-standard",
        "cat": "phone",
        "name": "Business phone Standard",
        "desc": "A complete business phone for a growing team.",
        "monthly": 1,
        "annual": 1,
        "unit": "seat",
        "features": [
          "Unlimited calling to the US and Canada",
          "2,000 landline minutes a month across 20 European countries",
          "100 texts and 50 picture messages a month",
          "One local number and 5 GB of call recording",
          "Auto attendant, voicemail and up to 3 departments",
          "AI call summaries, video meetings and desk phones"
        ],
        "popular": false,
        "inc": {
          "minutes": "Unlimited minutes",
          "sms": "100 messages",
          "numbers": "1 number",
          "storage": "5 GB",
          "aiMin": "None",
          "aiReplies": "1,000 replies"
        },
        "list": 20,
        "save": "Save 95%"
      },
      {
        "id": "ai-chat",
        "cat": "ai",
        "name": "AI chat agent",
        "desc": "A chat agent that answers from your own documents, day and night.",
        "monthly": 30,
        "annual": 24.0,
        "unit": "seat",
        "features": [
          "1,000 replies included, then $0.01 a reply",
          "Web chat and Telegram",
          "Answers from your own documents and FAQs",
          "No-code builder",
          "Connector library for hundreds of business apps",
          "Conversation analytics"
        ],
        "popular": false
      },
      {
        "id": "phone-pro",
        "cat": "phone",
        "name": "Business phone Pro",
        "desc": "Everything in Standard, with more numbers, sites and integrations.",
        "monthly": 32,
        "annual": 25.6,
        "unit": "seat",
        "features": [
          "Everything in Standard",
          "500 texts and 100 picture messages a month",
          "Extra and international numbers, extensions and hold queues",
          "Up to 25 departments and multiple sites",
          "CRM, Teams and Zapier integrations, API and webhooks",
          "Always-on recording and call quality reports"
        ],
        "popular": true,
        "inc": {
          "minutes": "Unlimited minutes",
          "sms": "500 messages",
          "numbers": "2 numbers",
          "storage": "50 GB",
          "aiMin": "250 minutes",
          "aiReplies": "3,000 replies"
        }
      },
      {
        "id": "ai-voice",
        "cat": "ai",
        "name": "AI voice agent",
        "desc": "A voice agent that answers, routes and takes messages.",
        "monthly": 45,
        "annual": 36.0,
        "unit": "seat",
        "features": [
          "100 voice minutes included, then $0.15 a minute",
          "Answers, routes and takes messages",
          "Hands off to a person with the transcript",
          "Recording and transcript on every call",
          "Test it before you launch it"
        ],
        "popular": false
      },
      {
        "id": "sell-essentials",
        "cat": "sell",
        "name": "Sell Essentials",
        "desc": "Outbound calling for small sales teams, with the compliance rules built in.",
        "monthly": 45,
        "annual": 36.0,
        "unit": "seat",
        "features": [
          "Predictive campaigns, with overflow and abandon rate limits",
          "Calling hours, do-not-call and retry rules",
          "Contact lists, groups and imports",
          "Call notes, dispositions and callback scheduling",
          "2,000 calling minutes included"
        ],
        "popular": false
      },
      {
        "id": "cc-essentials",
        "cat": "cc",
        "name": "Contact centre Essentials",
        "desc": "Queues and reports for a small support group.",
        "monthly": 65,
        "annual": 52.0,
        "unit": "seat",
        "features": [
          "Everything in Business phone Pro",
          "Domestic calling minutes included",
          "Automatic call distribution and skills-based queues",
          "Queue reports and dashboards"
        ],
        "popular": false
      },
      {
        "id": "cc-advanced",
        "cat": "cc",
        "name": "Contact centre Advanced",
        "desc": "A contact centre that starts to answer by itself.",
        "monthly": 95,
        "annual": 76.0,
        "unit": "seat",
        "features": [
          "Everything in Essentials",
          "AI chat agent with a no-code builder",
          "AI voice agent and call summaries",
          "AI-powered survey flows"
        ],
        "popular": true
      },
      {
        "id": "support-essentials",
        "cat": "support",
        "name": "Support Essentials",
        "desc": "A shared inbox and queues for a support group.",
        "monthly": 95,
        "annual": 76.0,
        "unit": "seat",
        "features": [
          "Queues, routing and a shared inbox",
          "Email and web chat in one place",
          "Reports and dashboards"
        ],
        "popular": false
      },
      {
        "id": "sell-advanced",
        "cat": "sell",
        "name": "Sell Advanced",
        "desc": "Faster dialling for busy teams.",
        "monthly": 99,
        "annual": 79.2,
        "unit": "seat",
        "features": [
          "Everything in Sell Essentials",
          "Progressive campaigns",
          "Answering machine detection"
        ],
        "popular": true
      },
      {
        "id": "cc-premium",
        "cat": "cc",
        "name": "Contact centre Premium",
        "desc": "A full contact centre with every channel in one queue.",
        "monthly": 125,
        "annual": 100.0,
        "unit": "seat",
        "features": [
          "Everything in Advanced",
          "Web chat and Telegram together",
          "Callback scheduling",
          "Routing by number, hours and skill",
          "Coverage, adherence and wallboards",
          "Custom data retention and priority support"
        ],
        "popular": false
      },
      {
        "id": "support-advanced",
        "cat": "support",
        "name": "Support Advanced",
        "desc": "Adds an AI agent that answers chats on its own.",
        "monthly": 135,
        "annual": 108.0,
        "unit": "seat",
        "features": [
          "Everything in Support Essentials",
          "An AI agent that answers chats on its own",
          "Hands the conversation to a person the moment it should"
        ],
        "popular": true
      },
      {
        "id": "sell-premium",
        "cat": "sell",
        "name": "Sell Premium",
        "desc": "Top dialling speed with priority queueing.",
        "monthly": 155,
        "annual": 124.0,
        "unit": "seat",
        "features": [
          "Everything in Sell Advanced",
          "Priority queueing",
          "Minimum number of agents before predictive dialling",
          "Higher abandon-rate headroom"
        ],
        "popular": false
      },
      {
        "id": "support-premium",
        "cat": "support",
        "name": "Support Premium",
        "desc": "Every messaging channel in the same queue.",
        "monthly": 170,
        "annual": 136.0,
        "unit": "seat",
        "features": [
          "Everything in Support Advanced",
          "WhatsApp, Facebook, Instagram and Telegram in the same queue"
        ],
        "popular": false
      }
    ]
  };

  /* usage history (deterministic demo records) */
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const kinds = [
    ['Voice', 'min', '10,000 min / month', 200, 1500],
    ['SMS', 'messages', '5,000 messages / month', 40, 400],
    ['Meetings', 'hours', '500 hours / month', 4, 40],
    ['Storage', 'GB', '100 GB', 1, 6],
    ['AI', 'tokens', '50,000 tokens / month', 2000, 9000]
  ];
  const hist = [];
  const iso = t => new Date(t).toISOString().slice(0, 10);
  for (let t = Date.UTC(2026, 9, 6); t >= Date.UTC(2026, 8, 5); t -= 864e5) {   // 6 Oct back to 5 Sep
    kinds.forEach(k => {
      const qty = Math.round(k[3] + rnd() * (k[4] - k[3]));
      hist.push({ date: iso(t), type: k[0], unit: k[1], qty, included: k[2], overage: 0, charge: 0 });
    });
  }
  const ai = hist.find(h => h.date === '2026-10-06' && h.type === 'AI');
  ai.qty = 4200; ai.overage = 4200; ai.charge = 4.2;
  S.usageHistory = hist.map((h, i) => Object.assign({ id: i + 1 }, h));

  /* ---- extra dummy records (none of these change the Summary figures) ---- */
  S.invoices.unshift(
    { id: 'INV-2026-013', period: '5 Oct – 5 Nov 2026', date: '2026-10-07', amount: 8.0, status: 'Draft' },
    { id: 'INV-2026-011', period: '5 Sep – 5 Oct 2026', date: '2026-10-06', amount: 12.5, status: 'Pending' });
  S.invoices.splice(S.invoices.findIndex(i => i.id === 'INV-2026-009'), 0,
    { id: 'INV-2026-012', period: '5 Aug – 5 Sep 2026', date: '2026-09-20', amount: 45.0, status: 'Overdue' });
  const pick = (a, i) => a[i % a.length];

  // older invoices, newest first, after the existing ones
  const amounts = [1, 2, 3, 3, 4.5, 3, 6, 3, 2, 3, 5, 3];
  let seqByYear = { 2025: 10, 2024: 12 };
  for (let y = 2025, m = 9, n = 0; y >= 2024 && n < 22; n++) {
    const id = `INV-${y}-${String(seqByYear[y]--).padStart(3, '0')}`;
    const d = new Date(Date.UTC(y, m, 5)), p = new Date(Date.UTC(y, m - 1, 5));
    const f = x => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    S.invoices.push({ id, period: `${f(p)} – ${f(d)} ${d.getUTCFullYear()}`, date: iso(d.getTime()), amount: pick(amounts, n), status: (n === 6 || n === 15) ? 'Failed' : 'Paid' });
    if (--m < 0) { m = 11; y--; }
  }

  // more account activity (Invoice history tab on the Summary)
  const acts = [['Plan renewal', 3], ['Fund top-up', 20], ['Added Member', 1.67], ['License purchase', 15], ['DID Purchase', 1], ['Usage charges', 2.35]];
  for (let n = 0; n < 24; n++) {
    const d = new Date(Date.UTC(2026, 6, 30 - n * 4)), a = pick(acts, n);
    S.activity.push({ id: S.activity.length + 1, date: iso(d.getTime()), amount: a[1], status: n % 9 === 4 ? 'Failed' : 'Paid', description: a[0], ref: String(700000000000 + n * 7919317 + 1234567).slice(0, 12) });
  }

  // earlier ledger months that net to zero, so the closing balance stays $89.82
  const early = [];
  for (let m = 0; m < 7; m++) {
    const mo = String(m + 1).padStart(2, '0');
    early.push({ date: `2026-${mo}-01`, description: 'Fund top-up', ref: `TU-${2000 + m}`, debit: 0, credit: 5, type: 'credit' });
    early.push({ date: `2026-${mo}-05`, description: 'Plan renewal', ref: `INV-2026-0${String(m + 1).padStart(2, '0')}`, debit: 3, credit: 0, type: 'charge' });
    early.push({ date: `2026-${mo}-06`, description: 'Usage charges', ref: `US-${3000 + m}`, debit: 2, credit: 0, type: 'charge' });
  }
  S.ledger = early.concat(S.ledger).map((r, i) => Object.assign(r, { id: i + 1 }));

  // former / suspended licence holders (do not count as assigned)
  ['Priya Nair', 'Daniel Okafor', 'Mei Lin', 'Tomás Herrera', 'Hannah Brooks'].forEach((n, i) => S.licences.push({
    id: 10 + i, user: n, email: n.toLowerCase().replace(/[^a-z]+/g, '.') + '@acme.example', tier: 'Ultimate Seat', status: 'Suspended', assigned: `2025-0${i + 3}-1${i}` }));

  // more cost centres
  [['Finance', 'Finance & Accounting', 0, 0, 'Active'], ['HR', 'People Operations', 0, 0, 'Active'], ['Legal', 'Legal & Compliance', 0, 0, 'Inactive'],
   ['Operations', 'Business Operations', 0, 0, 'Active'], ['Customer Success', 'Customer Success', 0, 0, 'Active'], ['Product', 'Product Management', 0, 0, 'Active'],
   ['Design', 'Design & UX', 0, 0, 'Inactive'], ['IT Helpdesk', 'Information Technology', 0, 0, 'Active'], ['Procurement', 'Procurement', 0, 0, 'Inactive'],
   ['Field Services', 'Field Operations', 0, 0, 'Active'], ['Partnerships', 'Partner Management', 0, 0, 'Active']].forEach((c, i) =>
    S.costCentres.push({ id: 5 + i, code: 'CC-' + (105 + i), name: c[0], department: c[1], users: c[2], spend: c[3], status: c[4] }));

  // more catalogue add-ons (all "Available", so the estimate is unchanged)
  [['SMS Bundle', '1,000 extra SMS messages every month.', 8, 'per 1,000 SMS'], ['Toll-free Number', 'A toll-free number with call forwarding.', 4, 'per number'],
   ['Extra Meeting Capacity', 'Raise the meeting limit by 100 participants.', 12, 'per 100 seats'], ['Voicemail Transcription', 'Voicemails delivered as text to email.', 3, 'per user'],
   ['Priority Support', '15-minute response with a named engineer.', 49, 'per workspace'], ['Number Porting', 'Move numbers from another carrier.', 10, 'one-time per number'],
   ['Call Whisper & Barge', 'Supervisor listen, whisper and barge-in.', 6, 'per supervisor'], ['Digital Signage Display', 'Show queue stats on wallboards.', 7, 'per display']]
    .forEach((a, i) => S.addons.push({ id: 6 + i, name: a[0], description: a[1], price: a[2], unit: a[3], qty: 0, freq: i === 5 ? 'One-time' : 'Monthly', status: 'Available' }));

  // per-licence add-ons and one that is not available yet
  [['AI Copilot', 'Live suggestions and call summaries for each agent.', 10, 'per seat', 'Available'],
   ['Screen Capture', 'Record the agent screen alongside the call.', 6, 'per seat', 'Available'],
   ['Voice Biometrics', 'Verify callers by voice instead of security questions.', 12, 'per seat', 'Coming soon']]
    .forEach((a, i) => S.addons.push({ id: 14 + i, name: a[0], description: a[1], price: a[2], unit: a[3], qty: 0, freq: 'Monthly', status: a[4] }));

  // who each invoice was raised to (company or cost centre)
  const customers = ['Acme Corp HQ', 'Acme Sales (CC-101)', 'Acme Support (CC-102)', 'Acme Development (CC-103)'];
  S.invoices.forEach((i, n) => { i.customer = customers[n % customers.length]; });

  /* derived values used by several pages */
  B.calc = {
    assigned: () => S.licences.filter(l => l.status === 'Active').length,
    pending: () => S.licences.filter(l => l.status === 'Pending').length,
    available: () => Math.max(0, S.seats - S.licences.filter(l => l.status === 'Active' || l.status === 'Pending').length),
    activeAddons: () => S.addons.filter(a => a.status === 'Active'),
    addonsTotal: () => S.addons.filter(a => a.status === 'Active').reduce((s, a) => s + a.qty * a.price, 0),
    seatsTotal: () => S.seats * S.plan.rate,
    estimate: () => B.calc.seatsTotal() + B.calc.addonsTotal(),
    /* invoices still waiting to be paid */
    outstanding: () => S.invoices.filter(i => ['Failed', 'Pending', 'Overdue'].includes(i.status)),
    outstandingTotal: () => Math.round(B.calc.outstanding().reduce((s, i) => s + i.amount, 0) * 100) / 100,
    /* allowance overage (used beyond included) priced at each meter's rate */
    overage: () => S.usage.filter(u => u.used > u.included).map(u => ({ name: u.label, qty: u.used - u.included, unit: u.unit, amount: Math.round((u.used - u.included) * u.rate * 100) / 100 })),
    usageCharges: () => Math.round(B.calc.overage().reduce((s, o) => s + o.amount, 0) * 100) / 100,
    /* the next bill, line by line (assigned seats = plan charge, unassigned seats = licence charge) */
    breakdown: () => {
      const r2 = n => Math.round(n * 100) / 100, taxRate = 0.07;
      const plan = r2(B.calc.assigned() * S.plan.rate), licence = r2(Math.max(0, S.seats - B.calc.assigned()) * S.plan.rate);
      const addons = r2(B.calc.addonsTotal()), usage = B.calc.usageCharges(), discount = 0;
      const subtotal = r2(plan + licence + addons + usage - discount), tax = r2(subtotal * taxRate);
      return { plan, licence, addons, usage, discount, subtotal, tax, taxRate, total: r2(subtotal + tax) };
    },
    ledgerRows: () => {
      let bal = 0;
      return S.ledger.map(r => { bal = Math.round((bal + r.credit - r.debit) * 100) / 100; return Object.assign({}, r, { balance: bal }); });
    }
  };
})(window.Billing);
