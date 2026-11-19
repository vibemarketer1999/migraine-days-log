// Sync merge, pure so test/merge.test.js can check it. local and remote are state-shaped objects.
// Days: the entry with the larger u wins (a deleted day is a tombstone {deleted:true, u}). Missing u counts as 0.
// prev and baseline: whole-value last-write-wins by prevU / baselineU. unlocked: OR. Demo data is never merged (returns null).
(function (root) {
  const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  // On a timestamp tie keep the non-empty value, so two old devices without timestamps do not blank each other.
  const lww = (lv, lu, rv, ru) => (lu !== ru ? (lu > ru ? [lv, lu] : [rv, ru]) : [empty(lv) ? rv : lv, lu]);

  function merge(local, remote) {
    if (local.demo) return null;
    const r = remote || {};
    const days = { ...(r.days || {}) };
    for (const k of Object.keys(local.days || {})) {
      if (!days[k] || (local.days[k].u || 0) >= (days[k].u || 0)) days[k] = local.days[k];
    }
    const [prev, prevU] = lww(local.prev || [], local.prevU || 0, r.prev || [], r.prevU || 0);
    const [baseline, baselineU] = lww(local.baseline || '', local.baselineU || 0, r.baseline || '', r.baselineU || 0);
    return { days, prev, prevU, baseline, baselineU, unlocked: !!(local.unlocked || r.unlocked) };
  }

  const api = { merge };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Merge = api;
})(typeof self !== 'undefined' ? self : this);
