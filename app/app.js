// Migraine Days Log. Everything stays in this browser: no network calls, no third-party scripts.
(() => {
  const C = window.Counts;
  const STORE = 'mdl.v1';
  const SALES_URL = '../#get'; // the buy section of the landing page
  // ponytail: one shared unlock code, checked by hash. Anyone can share it.
  // Move to Payhip per-buyer license keys if sharing ever shows up in the numbers.
  const UNLOCK_HASH = '8885777f04e4f99c0a3919cf614c8923841f8bc55b310bcad605f233ba364dbc';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DISCLAIMER = 'This log counts what you enter. It is not medical or legal advice and does not diagnose anything.';

  const now = new Date();
  const todayKey = C.key(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const S = Object.assign({ days: {}, prev: [], unlocked: false, lastBackup: 0, demo: false, baseline: '' }, read());
  const ui = { tab: 'today', date: todayKey, y: now.getFullYear(), m: now.getMonth() + 1, span: 3, format: 'doctor' };

  function read() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(S)); }
    catch { alert('This entry could not be saved. Your browser may be in private mode or out of storage. Download a backup from More.'); }
  }
  // Reports and averages only use complete months, so a half-finished month never drags an average down.
  const lastFull = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const END = { y: lastFull.getFullYear(), m: lastFull.getMonth() + 1 };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel) => document.querySelector(sel);
  const view = $('#view');
  const full = () => S.unlocked || S.demo; // demo data shows the paid screens so people can see them before buying
  const monthName = (c) => `${MONTHS[c.m - 1]} ${c.y}`;
  const niceDate = (k) => { const [y, m, d] = k.split('-').map(Number); return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`; };

  // ---------- Today ----------
  function today() {
    const e = S.days[ui.date];
    const pressed = (t) => `aria-pressed="${e?.t === t}"`;
    const detail = e && e.t !== 'none' ? `
      <div class="card">
        <label for="pain">Worst pain today: <b id="painOut">${e.pain ?? 'not set'}</b> / 10</label>
        <input id="pain" type="range" min="0" max="10" step="1" value="${e.pain ?? 5}">
        <label class="check"><input type="checkbox" id="med" ${e.med ? 'checked' : ''}> Took medication for it</label>
        <input type="text" id="medName" placeholder="Which one? (optional)" value="${esc(e.medName)}" ${e.med ? '' : 'hidden'}>
        <label class="check"><input type="checkbox" id="rest" ${e.rest ? 'checked' : ''}> Had to stop and lie down</label>
        <label class="check"><input type="checkbox" id="missed" ${e.missed ? 'checked' : ''}> Missed work or school</label>
        <label for="hours">About how many hours did it last? (optional)</label>
        <input type="number" id="hours" min="0" max="72" step="0.5" inputmode="decimal" value="${e.hours ?? ''}">
        <label for="note">Note (optional)</label>
        <textarea id="note" rows="2">${esc(e.note)}</textarea>
      </div>` : '';
    view.innerHTML = `
      ${backupNudge()}
      ${S.demo ? '<div class="card notice">You are looking at made-up DEMO data. Anything you add now gets mixed in with it. <button id="endDemo">Remove demo data and start my log</button></div>' : ''}
      <h2>${ui.date === todayKey ? 'How was today?' : niceDate(ui.date)}</h2>
      <label for="date" class="muted">Logging for</label>
      <input type="date" id="date" value="${ui.date}" max="${todayKey}">
      <div class="pick">
        <button class="none" data-t="none" ${pressed('none')}>No headache</button>
        <button class="headache" data-t="headache" ${pressed('headache')}>Headache</button>
        <button class="migraine" data-t="migraine" ${pressed('migraine')}>Migraine</button>
      </div>
      <p class="muted">Whether a day counts as a migraine is your call, or your doctor's definition. Log the clear days too. A day with no entry is counted as "not logged", never as headache-free.</p>
      ${detail}
      ${e ? '<p class="muted">Saved on this device. <button id="clearDay" class="noprint">Clear this day</button></p>' : ''}`;

    $('#date').onchange = (ev) => { if (ev.target.value && ev.target.value <= todayKey) { ui.date = ev.target.value; render(); } };
    view.querySelectorAll('.pick button').forEach((b) => (b.onclick = () => {
      const t = b.dataset.t;
      S.days[ui.date] = t === 'none' ? { t } : { ...S.days[ui.date], t };
      save(); render();
    }));
    if ($('#endDemo')) $('#endDemo').onclick = () => { Object.assign(S, { days: {}, prev: [], demo: false, baseline: '' }); save(); render(); };
    if ($('#clearDay')) $('#clearDay').onclick = () => { delete S.days[ui.date]; save(); render(); };
    if (!detail) return;
    const set = (k, v) => { S.days[ui.date][k] = v; save(); };
    $('#pain').oninput = (ev) => { $('#painOut').textContent = ev.target.value; set('pain', Number(ev.target.value)); };
    $('#med').onchange = (ev) => { set('med', ev.target.checked); $('#medName').hidden = !ev.target.checked; };
    $('#medName').oninput = (ev) => set('medName', ev.target.value);
    $('#rest').onchange = (ev) => set('rest', ev.target.checked);
    $('#missed').onchange = (ev) => set('missed', ev.target.checked);
    $('#hours').oninput = (ev) => set('hours', ev.target.value === '' ? undefined : Number(ev.target.value));
    $('#note').oninput = (ev) => set('note', ev.target.value);
  }

  function backupNudge() {
    const hasData = Object.keys(S.days).length > 0 && !S.demo;
    if (!hasData || Date.now() - S.lastBackup < 7 * 864e5) return '';
    return `<div class="card notice noprint">It has been a while since your last backup. Your log lives only on this device, so a backup file is the safety net. <button data-go="more">Back up now</button></div>`;
  }

  // ---------- Calendar ----------
  function monthNav() {
    const atNow = ui.y === now.getFullYear() && ui.m === now.getMonth() + 1;
    return `<div class="row noprint"><button id="prevM" aria-label="Previous month">&larr;</button>
      <h2 style="text-align:center;flex:3;margin:0">${MONTHS[ui.m - 1]} ${ui.y}</h2>
      <button id="nextM" aria-label="Next month" ${atNow ? 'disabled' : ''}>&rarr;</button></div>`;
  }
  function wireMonthNav() {
    const step = (n) => { const d = new Date(ui.y, ui.m - 1 + n, 1); ui.y = d.getFullYear(); ui.m = d.getMonth() + 1; render(); };
    $('#prevM').onclick = () => step(-1);
    $('#nextM').onclick = () => step(1);
  }
  function calendar() {
    const lead = new Date(ui.y, ui.m - 1, 1).getDay();
    const mark = { none: '', headache: 'H', migraine: 'M' };
    let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<div class="dow">${d}</div>`).join('') + '<div></div>'.repeat(lead);
    for (let d = 1; d <= C.daysIn(ui.y, ui.m); d++) {
      const k = C.key(ui.y, ui.m, d);
      const e = S.days[k];
      const future = k > todayKey;
      const label = `${niceDate(k)}: ${e ? (e.t === 'none' ? 'no headache' : e.t) : 'not logged'}`;
      cells += `<button class="${e ? e.t : ''} ${future ? 'future' : ''}" data-day="${k}" ${future ? 'disabled' : ''} aria-label="${label}">${d}<small>${e ? mark[e.t] : ''}</small></button>`;
    }
    view.innerHTML = `${monthNav()}<div class="cal" style="margin-top:12px">${cells}</div>
      <div class="legend"><span><i style="background:var(--none)"></i>No headache</span><span><i style="background:var(--headache)"></i>H Headache</span><span><i style="background:var(--migraine)"></i>M Migraine</span><span><i></i>Not logged</span></div>
      <p class="muted">Tap a day to add or change it.</p>`;
    wireMonthNav();
    view.querySelectorAll('[data-day]').forEach((b) => (b.onclick = () => { ui.date = b.dataset.day; go('today'); }));
  }

  // ---------- Numbers ----------
  const COLS = {
    headacheDays: 'Headache days', migraineDays: 'Migraine days', medDays: 'Medication days',
    severeDays: 'Severe days (pain 7+)', restDays: 'Had to lie down', missedDays: 'Missed work or school',
  };
  const VA_COLS = { migraineDays: 'Migraine days', migRestDays: 'Had to stop and lie down', migMissedDays: 'Missed work or school', migMedDays: 'Took medication' };
  const colName = (c) => VA_COLS[c] && ui.tab === 'report' && ui.format === 'va' ? VA_COLS[c] : COLS[c];
  function monthTable(months, cols) {
    const avg = C.averages(months);
    return `<div class="scroll"><table><thead><tr><th>Month</th>${cols.map((c) => `<th>${colName(c)}</th>`).join('')}<th>Days logged</th></tr></thead><tbody>
      ${months.map((c) => `<tr><td>${monthName(c)}</td>${cols.map((f) => `<td>${c[f]}</td>`).join('')}<td>${c.logged} of ${c.daysInMonth}</td></tr>`).join('')}
      <tr><td><b>Average per month</b></td>${cols.map((f) => `<td><b>${avg[f]}</b></td>`).join('')}<td></td></tr></tbody></table></div>`;
  }
  function lockCard(what) {
    return `<div class="card notice noprint"><b>${what} is part of the full log.</b>
      <p class="muted">One payment, no subscription. Your free daily log and calendar keep working either way.</p>
      <div class="row"><a href="${SALES_URL}"><button class="primary">See the full log</button></a><button data-go="more">I have a code</button></div></div>`;
  }
  // "Then and now": the first 3 months of the log (or 3 months from a start the user picks) against the last 3 complete months.
  function baselineBlock() {
    const first = Object.keys(S.days).sort()[0];
    if (!first) return '';
    const start = S.baseline || first.slice(0, 7);
    const [by, bm] = start.split('-').map(Number);
    const end = new Date(by, bm + 1, 1); // third month of the starting period
    const base = C.lastMonths(S.days, end.getFullYear(), end.getMonth() + 1, 3);
    const recent = C.lastMonths(S.days, END.y, END.m, 3);
    const picker = `<h3>Then and now</h3>
      <label for="baseline" class="noprint">Starting period begins (3 months from here)</label>
      <input type="month" id="baseline" class="noprint" value="${start}">`;
    const ym = (c) => c.y * 12 + c.m;
    if (ym(base[2]) >= ym(recent[0])) return `${picker}<p class="muted">This comparison appears once the starting period and the last 3 complete months no longer overlap, which takes six complete months of log.</p>`;
    const a = C.averages(base), b = C.averages(recent);
    const line = (label, f) => {
      const p = C.pctChange(a[f], b[f]);
      const change = p === null ? 'nothing to compare' : p === 0 ? 'no change' : `${Math.abs(p)}% ${p < 0 ? 'fewer' : 'more'}`;
      return `<tr><td>${label}</td><td>${a[f]}</td><td>${b[f]}</td><td>${change}</td></tr>`;
    };
    return `${picker}
      <div class="scroll"><table><thead><tr><th>Average per month</th><th>Starting period (${monthName(base[0])} to ${monthName(base[2])})</th><th>Last 3 complete months</th><th>Change</th></tr></thead>
      <tbody>${line('Headache days', 'headacheDays')}${line('Migraine days', 'migraineDays')}${line('Medication days', 'medDays')}</tbody></table></div>
      <p class="muted">The starting period is the first months you logged unless you change it. It is only a pre-treatment baseline if you were logging before the treatment began. Months with unlogged days make these averages less reliable.</p>`;
  }
  function wireBaseline() {
    if ($('#baseline')) $('#baseline').onchange = (ev) => { S.baseline = ev.target.value; save(); render(); };
  }
  function numbers() {
    const c = C.monthCounts(S.days, ui.y, ui.m);
    const stat = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;
    const more = full()
      ? `<h3>Last ${ui.span} complete months</h3>${spanPicker()}${monthTable(C.lastMonths(S.days, END.y, END.m, ui.span), Object.keys(COLS))}<p class="muted">The month in progress is left out so it does not pull the averages down.</p>${baselineBlock()}`
      : lockCard('Month-by-month history, averages and the then-and-now comparison');
    view.innerHTML = `${monthNav()}
      <div class="stats" style="margin-top:12px">
        ${stat(c.headacheDays, 'Headache days')}${stat(c.migraineDays, 'Migraine days')}
        ${stat(c.medDays, 'Days you took medication')}${stat(c.severeDays, 'Severe days (pain 7+)')}
        ${stat(c.restDays, 'Days you had to lie down')}${stat(c.missedDays, 'Days you missed work or school')}
        ${stat(c.headacheFree, 'Headache-free days')}${stat(`${c.logged}/${c.daysInMonth}`, 'Days logged')}
      </div>
      <p class="muted">Migraine days are also counted as headache days. Your doctor may ask about any of these numbers.</p>
      ${more}`;
    wireMonthNav(); wireSpan(); wireBaseline();
  }
  function spanPicker() {
    return `<div class="row noprint">${[3, 6, 12].map((n) => `<button data-span="${n}" aria-pressed="${ui.span === n}" ${ui.span === n ? 'class="primary"' : ''}>${n} months</button>`).join('')}</div>`;
  }
  function wireSpan() {
    view.querySelectorAll('[data-span]').forEach((b) => (b.onclick = () => { ui.span = Number(b.dataset.span); render(); }));
  }

  // ---------- Report ----------
  const FORMATS = {
    doctor: { name: 'Doctor visit', title: 'Headache and migraine summary', cols: ['headacheDays', 'migraineDays', 'medDays', 'severeDays', 'missedDays'] },
    insurance: { name: 'Insurance', title: 'Headache and migraine day counts', cols: ['headacheDays', 'migraineDays', 'medDays'] },
    va: { name: 'VA claim', title: 'Migraine log summary', cols: ['migraineDays', 'migRestDays', 'migMissedDays', 'migMedDays'] },
  };
  function report() {
    if (!full()) {
      view.innerHTML = `<h2>Report</h2><p>A printable summary of your log for a doctor visit, an insurance form or a VA claim: month-by-month counts, averages, a then-and-now comparison and the preventives you have tried.</p>${lockCard('The printable report')}`;
      return;
    }
    const f = FORMATS[ui.format];
    const isVa = ui.format === 'va';
    const months = C.lastMonths(S.days, END.y, END.m, ui.span);
    const list = C.attacks(S.days, END.y, END.m, ui.span).filter((a) => !isVa || a.t === 'migraine');
    const yes = (v) => (v ? 'Yes' : '');
    const attackRows = list.map((a) => `<tr><td>${niceDate(a.date)}</td><td>${a.t === 'migraine' ? 'Migraine' : 'Headache'}</td><td>${a.pain ?? ''}</td><td>${a.hours ?? ''}</td><td>${yes(a.rest)}</td><td>${yes(a.missed)}</td><td class="wrap">${esc([a.med ? a.medName || 'medication' : '', a.note].filter(Boolean).join('. '))}</td></tr>`).join('');
    const attackTable = `<h3>${isVa ? 'Each migraine day' : 'Each headache and migraine day'}</h3><div class="scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Pain</th><th>Hours</th><th>Had to lie down</th><th>Missed work or school</th><th>Medication and notes</th></tr></thead><tbody>${attackRows || '<tr><td colspan="7">None logged in this period.</td></tr>'}</tbody></table></div>`;
    const prevTable = `<h3>Preventive treatments tried</h3>${S.prev.length ? `<div class="scroll"><table><thead><tr><th>Treatment</th><th>Dose</th><th>Started</th><th>Stopped</th><th>Why stopped</th></tr></thead><tbody>${S.prev.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.dose)}</td><td>${esc(p.start)}</td><td>${esc(p.stop)}</td><td class="wrap">${esc(p.why)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">None entered. Add them under More.</p>'}`;
    const va = `<h3>How the VA rating schedule describes migraine</h3>
      <p class="muted">38 CFR § 4.124a, Diagnostic Code 8100, quoted as published:</p>
      <blockquote>50%: With very frequent completely prostrating and prolonged attacks productive of severe economic inadaptability<br>
      30%: With characteristic prostrating attacks occurring on an average once a month over last several months<br>
      10%: With characteristic prostrating attacks averaging one in 2 months over last several months<br>
      0%: With less frequent attacks</blockquote>
      <p class="muted">The regulation does not define "prostrating". This log records the migraine days the person had to stop and lie down, in their own words. It does not predict or suggest a rating; VA decides that. VA-recognized Veterans Service Organizations have accredited representatives who help with claims for free.</p>`;
    const extra = { doctor: `${baselineBlock()}${prevTable}${attackTable}<h3>Questions for my doctor</h3><div class="box"></div>`, insurance: `${baselineBlock()}${prevTable}`, va: `${attackTable}${va}` }[ui.format];
    view.innerHTML = `
      <div class="noprint"><h2>Report</h2>
        <div class="row">${Object.entries(FORMATS).map(([k, v]) => `<button data-format="${k}" ${ui.format === k ? 'class="primary"' : ''}>${v.name}</button>`).join('')}</div>
        <div style="height:8px"></div>${spanPicker()}
        <p><button class="primary" id="print">Print or save as PDF</button></p></div>
      <div class="card">
        <h2>${f.title}${S.demo ? ' (DEMO DATA)' : ''}</h2>
        <p class="muted">${monthName(months[0])} to ${monthName(months[months.length - 1])}. Complete months only. Self-reported by the person named below; entries can be added or changed after the day. Printed ${niceDate(todayKey)}.</p>
        <p>Name: ____________________________ &nbsp; Date of birth: ______________</p>
        ${monthTable(months, f.cols)}
        <p class="muted">${isVa ? 'Every column counts migraine days only.' : 'A migraine day is also counted as a headache day.'} Days with no entry are shown as not logged and are not counted as headache-free.</p>
        ${extra}
        <p class="muted">${DISCLAIMER}</p>
      </div>`;
    wireSpan(); wireBaseline();
    view.querySelectorAll('[data-format]').forEach((b) => (b.onclick = () => { ui.format = b.dataset.format; render(); }));
    $('#print').onclick = () => window.print();
  }

  // ---------- More ----------
  function more() {
    const prev = full() ? `
      <h3>Preventive treatments tried</h3>
      ${S.prev.map((p, i) => `<div class="card"><b>${esc(p.name)}</b> ${esc(p.dose)}<br><span class="muted">${esc(p.start)} to ${esc(p.stop || 'now')}${p.why ? `. Stopped: ${esc(p.why)}` : ''}</span><br><button data-del="${i}">Remove</button></div>`).join('')}
      <form id="prevForm" class="card">
        <label for="pName">Treatment</label><input type="text" id="pName" required>
        <label for="pDose">Dose (optional)</label><input type="text" id="pDose">
        <div class="row"><div><label for="pStart">Started</label><input type="month" id="pStart"></div><div><label for="pStop">Stopped</label><input type="month" id="pStop"></div></div>
        <label for="pWhy">Why it was stopped</label>
        <select id="pWhy"><option value="">Still taking it</option><option>Side effects</option><option>Did not help</option><option>Insurance or cost</option><option>Other</option></select>
        <p><button class="primary">Add treatment</button></p>
      </form>` : '';
    view.innerHTML = `
      <h2>More</h2>
      ${S.unlocked ? '<p class="card notice">Full log unlocked on this device. Thank you.</p>' : `<div class="card"><b>Unlock the full log</b>
        <label for="code">Code from your purchase email</label><input type="text" id="code" autocomplete="off" autocapitalize="characters">
        <p class="row"><button class="primary" id="unlock">Unlock</button><a href="${SALES_URL}"><button>Get the full log</button></a></p><p id="codeMsg" class="muted" role="status"></p></div>`}
      ${prev}
      <h3>Backup</h3>
      <p class="muted">Your entries are saved only in this browser on this device. We never receive them, so we can't restore them for you. They can be erased if you clear browsing data, use private mode or switch browser or phone, and on iPhone if you don't open the log for a while. Download a backup every week. Backup, export and printed files are not encrypted, so keep them somewhere private.</p>
      <div class="row"><button class="primary" id="backup">Download backup</button><button id="restoreBtn">Restore from file</button></div>
      <input type="file" id="restore" accept="application/json,.json" hidden>
      ${full() ? '<p><button id="csv">Export days as a spreadsheet (CSV)</button></p>' : ''}
      <p class="muted" id="backupMsg" role="status">${S.lastBackup ? `Last backup: ${new Date(S.lastBackup).toLocaleDateString()}` : 'No backup yet.'}</p>
      <h3>Keep it on your home screen</h3>
      <p class="muted">In your browser menu choose "Add to Home Screen". The log then opens like an app, works offline, and iPhone is less likely to clear its data.</p>
      <h3>Try it with sample data</h3>
      <p class="muted">Fills six months with made-up entries, labeled DEMO everywhere, so you can see the report before logging anything.</p>
      <div class="row"><button id="demo" ${Object.keys(S.days).length && !S.demo ? 'disabled' : ''}>Load DEMO data</button><button class="danger" id="wipe">Delete all data</button></div>
      <p class="muted">${DISCLAIMER} It never suggests a treatment. If a headache is sudden, severe or different from your usual, get medical help.</p>`;

    if ($('#unlock')) $('#unlock').onclick = async () => {
      const code = $('#code').value.trim().toUpperCase();
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
      const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (hex === UNLOCK_HASH) { S.unlocked = true; save(); render(); } else $('#codeMsg').textContent = 'That code did not match. Check the purchase email and try again.';
    };
    if ($('#prevForm')) $('#prevForm').onsubmit = (ev) => {
      ev.preventDefault();
      S.prev.push({ name: $('#pName').value.trim(), dose: $('#pDose').value.trim(), start: $('#pStart').value, stop: $('#pStop').value, why: $('#pWhy').value });
      save(); render();
    };
    view.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { S.prev.splice(Number(b.dataset.del), 1); save(); render(); }));
    $('#backup').onclick = () => { S.lastBackup = Date.now(); save(); download(`migraine-log-backup-${todayKey}.json`, JSON.stringify(S), 'application/json'); render(); };
    $('#restoreBtn').onclick = () => $('#restore').click();
    $('#restore').onchange = async (ev) => {
      try {
        const data = JSON.parse(await ev.target.files[0].text());
        if (!data?.days || typeof data.days !== 'object') throw new Error('not a backup');
        if (Object.keys(S.days).length && !confirm('Replace what is on this device with the backup file?')) return;
        Object.assign(S, { days: data.days, prev: Array.isArray(data.prev) ? data.prev : [], baseline: data.baseline || '', demo: !!data.demo, unlocked: S.unlocked || !!data.unlocked, lastBackup: Date.now() });
        save(); render();
      } catch { $('#backupMsg').textContent = 'That file is not a Migraine Days Log backup.'; }
    };
    if ($('#csv')) $('#csv').onclick = () => {
      const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = Object.keys(S.days).sort().map((k) => { const e = S.days[k]; return [k, e.t, e.pain, e.hours, e.med ? 'yes' : '', e.medName, e.rest ? 'yes' : '', e.missed ? 'yes' : '', e.note].map(q).join(','); });
      download(`migraine-log-${todayKey}.csv`, ['date,type,pain,hours,medication,medication name,had to lie down,missed work or school,note', ...rows].join('\n'), 'text/csv');
    };
    $('#demo').onclick = () => { S.days = demoDays(); S.demo = true; save(); render(); };
    $('#wipe').onclick = () => { if (confirm('Delete every entry on this device? This cannot be undone.')) { Object.assign(S, { days: {}, prev: [], demo: false, baseline: '', lastBackup: 0 }); save(); render(); } };
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Six months of made-up entries that improve over time, for screenshots. Fixed seed so it always looks the same.
  function demoDays() {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out = {};
    for (let back = 180; back >= 1; back--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
      const r = rnd(), early = back > 90;
      const pM = early ? 0.3 : 0.12, pH = early ? 0.15 : 0.08;
      const k = C.key(d.getFullYear(), d.getMonth() + 1, d.getDate());
      if (rnd() < 0.04) continue; // a few unlogged days, like a real log
      if (r < pM) { const pain = 5 + Math.floor(rnd() * 5); out[k] = { t: 'migraine', pain, med: rnd() < 0.8, medName: 'DEMO medication', rest: pain >= 7, missed: pain >= 8, hours: 4 + Math.floor(rnd() * 10) }; }
      else if (r < pM + pH) out[k] = { t: 'headache', pain: 2 + Math.floor(rnd() * 4), med: rnd() < 0.4, medName: 'DEMO medication' };
      else out[k] = { t: 'none' };
    }
    return out;
  }

  // ---------- Shell ----------
  const VIEWS = { today, calendar, numbers, report, more };
  function render() {
    $('#demoTag').hidden = !S.demo;
    document.querySelectorAll('.tabs button').forEach((b) => (b.dataset.tab === ui.tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    VIEWS[ui.tab]();
    view.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
  }
  function go(tab) { ui.tab = tab; render(); view.focus(); window.scrollTo(0, 0); }
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => go(b.dataset.tab)));

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
  render();
})();
