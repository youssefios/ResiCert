// @ts-check
/**
 * Decide which voluntary certification schemes are applicable to *this*
 * residential project, run the readiness pre-screen for the applicable ones,
 * and surface those the client has chosen to target.
 */

import { SCHEMES } from './schemes.js';

/**
 * @param {import('./schemes.js').ReadinessContext} ctx
 */
export function assessCertifications(ctx) {
  const { project: p } = ctx;
  const applicable = [];
  const notApplicable = [];

  for (const scheme of SCHEMES) {
    const { applicable: isApp, reason } = scheme.applicability(p);
    const base = {
      id: scheme.id,
      name: scheme.name,
      owner: scheme.owner,
      focus: scheme.focus,
      bestFor: scheme.bestFor,
      summary: scheme.summary,
      reason,
      targeted: p.targetCertifications.includes(scheme.id),
    };
    if (isApp) {
      const readiness = scheme.readiness(ctx);
      applicable.push({ ...base, applicable: true, readiness });
    } else {
      notApplicable.push({ ...base, applicable: false, readiness: null });
    }
  }

  // Sort applicable schemes by readiness score (best aligned first), but keep
  // any client-targeted schemes pinned to the top.
  applicable.sort((a, b) => {
    if (a.targeted !== b.targeted) return a.targeted ? -1 : 1;
    return (b.readiness?.score ?? 0) - (a.readiness?.score ?? 0);
  });

  // A short "suggested next step" list: applicable schemes the client is not
  // yet targeting but is already reasonably aligned with (readiness ≥ 50).
  const suggestions = applicable
    .filter((s) => !s.targeted && (s.readiness?.score ?? 0) >= 50)
    .slice(0, 3)
    .map((s) => ({ id: s.id, name: s.name, score: s.readiness?.score ?? 0 }));

  return {
    applicable,
    notApplicable,
    suggestions,
    targeted: applicable.filter((s) => s.targeted),
  };
}
