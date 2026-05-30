// @ts-check
/**
 * Small, dependency-free numeric / scoring helpers shared across the engine.
 */

/**
 * Clamp `n` into the inclusive range [min, max].
 * @param {number} n @param {number} min @param {number} max
 */
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** Round to `dp` decimal places. @param {number} n @param {number} [dp] */
export const round = (n, dp = 1) => {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/**
 * Percentage improvement of `design` relative to a (higher-is-worse) `baseline`.
 * Positive = better than baseline. Returns 0 if baseline is non-positive.
 * @param {number} baseline @param {number} design
 */
export function savingPct(baseline, design) {
  if (!(baseline > 0)) return 0;
  return round(((baseline - design) / baseline) * 100, 1);
}

/**
 * Map a 0–100 numeric score to a letter band A–G (EPC-style) using standard
 * SAP band boundaries.
 * @param {number} score
 * @returns {string}
 */
export function epcBand(score) {
  if (score >= 92) return 'A';
  if (score >= 81) return 'B';
  if (score >= 69) return 'C';
  if (score >= 55) return 'D';
  if (score >= 39) return 'E';
  if (score >= 21) return 'F';
  return 'G';
}

/**
 * Weighted average of {value, weight} pairs. Ignores entries with weight <= 0.
 * @param {{value:number, weight:number}[]} parts
 */
export function weightedAverage(parts) {
  let num = 0;
  let den = 0;
  for (const p of parts) {
    if (p.weight > 0) {
      num += p.value * p.weight;
      den += p.weight;
    }
  }
  return den > 0 ? num / den : 0;
}

/**
 * The standard ResiCert finding shape used by every assessment module so the
 * UI can render results uniformly.
 *
 * @typedef {('pass'|'fail'|'warning'|'info'|'not-applicable')} Status
 *
 * @typedef {Object} Finding
 * @property {string} id              Stable identifier (e.g. "ADL-fabric").
 * @property {string} title          Human-readable requirement name.
 * @property {Status} status
 * @property {string} detail         What was assessed / why this status.
 * @property {string} [requirement]  The regulatory/standard threshold applied.
 * @property {string} [recommendation] Suggested action when failing/warning.
 * @property {string} [reference]    Source document reference.
 */

/**
 * Convenience constructor for a {@link Finding}.
 * @param {string} id
 * @param {string} title
 * @param {Status} status
 * @param {string} detail
 * @param {Partial<Finding>} [extra]
 * @returns {Finding}
 */
export function finding(id, title, status, detail, extra = {}) {
  return { id, title, status, detail, ...extra };
}

/**
 * Reduce a set of findings to a single roll-up status:
 *  - any 'fail'    -> 'fail'
 *  - else any 'warning' -> 'warning'
 *  - else 'pass' (ignoring info / not-applicable)
 * @param {Finding[]} findings
 * @returns {Status}
 */
export function rollUp(findings) {
  const considered = findings.filter((f) => f.status !== 'info' && f.status !== 'not-applicable');
  if (considered.some((f) => f.status === 'fail')) return 'fail';
  if (considered.some((f) => f.status === 'warning')) return 'warning';
  return 'pass';
}

/**
 * Count findings by status.
 * @param {Finding[]} findings
 */
export function tally(findings) {
  /** @type {Record<Status, number>} */
  const t = { pass: 0, fail: 0, warning: 0, info: 0, 'not-applicable': 0 };
  for (const f of findings) t[f.status] += 1;
  return t;
}
