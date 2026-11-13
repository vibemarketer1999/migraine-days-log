// All counting lives here so test/counts.test.js can check every number the app shows.
// A day entry: { t: 'none' | 'headache' | 'migraine', pain, med, rest, hours, missed, note }
// Rule that must never break: a day with no entry is "not logged". It is never headache-free.
(function (root) {
  const pad = (n) => String(n).padStart(2, '0');
  const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const daysIn = (y, m) => new Date(y, m, 0).getDate(); // m is 1-12

  function monthCounts(days, y, m) {
    const c = {
      y, m, daysInMonth: daysIn(y, m), logged: 0, headacheDays: 0, migraineDays: 0,
      headacheFree: 0, medDays: 0, severeDays: 0, missedDays: 0, restDays: 0,
      migMedDays: 0, migMissedDays: 0, migRestDays: 0, // migraine days only, for the VA layout
    };
    for (let d = 1; d <= c.daysInMonth; d++) {
      const e = days[key(y, m, d)];
      if (!e) continue;
      c.logged++;
      if (e.t === 'none') { c.headacheFree++; continue; }
      c.headacheDays++; // a migraine day is also a headache day
      if (e.t === 'migraine') c.migraineDays++;
      if (e.med) c.medDays++;
      if (e.pain >= 7) c.severeDays++;
      if (e.missed) c.missedDays++;
      if (e.rest) c.restDays++;
      if (e.t === 'migraine') {
        if (e.med) c.migMedDays++;
        if (e.missed) c.migMissedDays++;
        if (e.rest) c.migRestDays++;
      }
    }
    c.notLogged = c.daysInMonth - c.logged;
    return c;
  }

  // The n calendar months ending at (y, m), oldest first.
  function lastMonths(days, y, m, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const dt = new Date(y, m - 1 - i, 1);
      out.push(monthCounts(days, dt.getFullYear(), dt.getMonth() + 1));
    }
    return out;
  }

  const FIELDS = ['headacheDays', 'migraineDays', 'medDays', 'severeDays', 'missedDays', 'restDays', 'migMedDays', 'migMissedDays', 'migRestDays'];

  // Per-month averages, rounded to one decimal.
  function averages(months) {
    const a = {};
    for (const f of FIELDS) {
      a[f] = months.length ? Math.round((months.reduce((s, c) => s + c[f], 0) / months.length) * 10) / 10 : 0;
    }
    return a;
  }

  // Percent change from baseline to now. null when the baseline is 0 (nothing to compare against).
  function pctChange(baseline, now) {
    if (!baseline) return null;
    return Math.round(((now - baseline) / baseline) * 100);
  }

  // A month counts as complete when every day has an entry.
  const isComplete = (c) => c.notLogged === 0;

  // Individual attack days in the n months ending at (y, m), oldest first.
  function attacks(days, y, m, n) {
    const first = new Date(y, m - n, 1);
    const from = key(first.getFullYear(), first.getMonth() + 1, 1);
    const to = key(y, m, daysIn(y, m));
    return Object.keys(days).sort()
      .filter((k) => k >= from && k <= to && days[k].t !== 'none')
      .map((k) => ({ date: k, ...days[k] }));
  }

  const api = { key, daysIn, monthCounts, lastMonths, averages, pctChange, isComplete, attacks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Counts = api;
})(typeof self !== 'undefined' ? self : this);
