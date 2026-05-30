// @ts-check
/**
 * Planning-policy screening.
 *
 * Planning sits *alongside* the Building Regulations: a scheme needs planning
 * permission (and to discharge its conditions) as well as Building Control
 * approval. Many "sustainability" asks (space standards, Biodiversity Net
 * Gain, SuDS, accessible-housing mix, water efficiency, daylight) are imposed
 * through the planning system and local plans rather than the Regs.
 *
 * These checks are necessarily indicative because local plans vary. National
 * baselines (NPPF, the Environment Act BNG duty, the Nationally Described
 * Space Standard) are applied, with clear flags that local policy may go
 * further.
 */

import { finding, rollUp, round } from '../util.js';

/**
 * Nationally Described Space Standard — minimum gross internal area (m²) by
 * bedrooms (b), bedspaces/persons (p) and number of storeys. Columns are
 * [1 storey, 2 storey, 3 storey]. (DLUHC Technical housing standards, 2015.)
 */
const NDSS = {
  '1b1p': [39, 39, 39],
  '1b2p': [50, 58, 58],
  '2b3p': [61, 70, 70],
  '2b4p': [70, 79, 79],
  '3b4p': [74, 84, 90],
  '3b5p': [86, 93, 99],
  '3b6p': [95, 102, 108],
  '4b5p': [90, 97, 103],
  '4b6p': [99, 106, 112],
  '4b7p': [108, 115, 121],
  '4b8p': [117, 124, 130],
  '5b6p': [103, 110, 116],
  '5b7p': [112, 119, 125],
  '6b7p': [116, 123, 129],
};

/**
 * Required NDSS minimum GIA for a dwelling, with a graceful fallback for
 * combinations not in the table.
 * @param {number} bedrooms @param {number} bedspaces @param {number} storeys
 */
export function ndssMinimum(bedrooms, bedspaces, storeys) {
  const key = `${bedrooms}b${bedspaces}p`;
  const col = storeys <= 1 ? 0 : storeys === 2 ? 1 : 2;
  if (NDSS[key]) return NDSS[key][col];
  // Fallback: ~25 m² for a 1p home + ~17 m² per extra bedspace, +floor for
  // extra storeys (circulation), clamped to be sensible.
  const est = 25 + Math.max(0, bedspaces - 1) * 17 + (col >= 1 ? 6 : 0) + (col >= 2 ? 6 : 0);
  return round(est);
}

/**
 * @param {import('../types.js').Project} p
 */
export function assessPlanning(p) {
  /** @type {import('../util.js').Finding[]} */
  const findings = [];

  // --- Space standards (NDSS) --------------------------------------------
  const minGia = ndssMinimum(p.bedrooms, p.bedspaces, p.storeys);
  if (p.gia < minGia) {
    findings.push(finding('ndss', 'Space standards (NDSS)', 'fail',
      `GIA ${p.gia} m² is below the ${minGia} m² minimum for a ${p.bedrooms}-bed / ${p.bedspaces}-person, ${p.storeys}-storey dwelling.`,
      {
        requirement: `Nationally Described Space Standard minimum ${minGia} m² (where adopted by the local plan).`,
        recommendation: 'Increase floor area or revise the bed/person mix; many authorities apply NDSS as a planning condition.',
        reference: 'Technical housing standards — NDSS (2015)',
      }));
  } else {
    findings.push(finding('ndss', 'Space standards (NDSS)', 'pass',
      `GIA ${p.gia} m² meets the ${minGia} m² NDSS minimum for this dwelling.`,
      { reference: 'Technical housing standards — NDSS (2015)' }));
  }

  // --- Biodiversity Net Gain (statutory) ---------------------------------
  if (p.biodiversityNetGainPct < 10) {
    findings.push(finding('bng', 'Biodiversity Net Gain', 'fail',
      `Proposed BNG of ${p.biodiversityNetGainPct}% is below the statutory minimum 10%.`,
      {
        requirement: 'Mandatory 10% Biodiversity Net Gain for most new development (Environment Act 2021).',
        recommendation: 'Deliver ≥10% measurable net gain on-site, or via off-site units / statutory credits, secured for 30 years.',
        reference: 'Environment Act 2021; Biodiversity Metric',
      }));
  } else {
    findings.push(finding('bng', 'Biodiversity Net Gain', 'pass',
      `Proposed BNG of ${p.biodiversityNetGainPct}% meets/exceeds the statutory 10% minimum.`,
      { reference: 'Environment Act 2021' }));
  }

  // --- Sustainable drainage (SuDS) ---------------------------------------
  findings.push(finding('suds', 'Sustainable drainage (SuDS)',
    p.suds ? 'pass' : 'warning',
    p.suds
      ? 'Sustainable drainage proposed, consistent with the surface-water drainage hierarchy.'
      : 'No SuDS indicated. The NPPF / local policy expects sustainable drainage and the drainage hierarchy to be followed for new development.',
    {
      requirement: 'NPPF + non-statutory technical standards for SuDS; LLFA consultation on major development.',
      recommendation: p.suds ? undefined : 'Incorporate SuDS (permeable paving, attenuation, green roofs) and demonstrate greenfield run-off rates.',
      reference: 'NPPF; SuDS technical standards',
    }));

  // --- Accessible & adaptable housing mix --------------------------------
  if (p.accessibleM4_2 || p.wheelchairM4_3) {
    findings.push(finding('access-mix', 'Accessible housing (M4(2)/M4(3))', 'pass',
      `Scheme provides ${p.wheelchairM4_3 ? 'M4(3) wheelchair-user' : 'M4(2) accessible & adaptable'} homes, supporting local accessible-housing policy.`,
      { reference: 'Local plan accessibility policy; Approved Document M' }));
  } else {
    findings.push(finding('access-mix', 'Accessible housing (M4(2)/M4(3))', 'warning',
      'No M4(2)/M4(3) provision indicated. Many local plans require a proportion of accessible & adaptable (M4(2)) and some wheelchair (M4(3)) homes.',
      {
        recommendation: 'Check the local plan; design the required proportion of M4(2)/M4(3) dwellings.',
        reference: 'Local plan accessibility policy',
      }));
  }

  // --- Daylight & sunlight (BRE) -----------------------------------------
  findings.push(finding('daylight', 'Daylight & sunlight (BRE)',
    p.daylightFactorAvg >= 1.5 ? 'pass' : 'warning',
    `Average daylight factor ${p.daylightFactorAvg}% ${p.daylightFactorAvg >= 1.5 ? 'meets' : 'is below'} a typical ~1.5–2% adequacy guide for living spaces.`,
    {
      requirement: 'BRE guidance (BR 209) / BS EN 17037 daylight provision; assessed against neighbours and within the scheme.',
      recommendation: p.daylightFactorAvg >= 1.5 ? undefined : 'Increase glazing/room proportions or revise massing to improve internal daylight.',
      reference: 'BRE BR 209; BS EN 17037',
    }));

  // --- Cycle storage & parking (NPPF / local) ----------------------------
  findings.push(finding('cycle', 'Cycle storage',
    p.cycleStorage ? 'pass' : 'warning',
    p.cycleStorage
      ? 'Secure cycle storage provided, supporting sustainable-transport policy.'
      : 'No secure cycle storage indicated; most local plans require it for new homes.',
    { reference: 'NPPF; local parking standards' }));

  // --- Affordable housing (informational, policy-dependent) --------------
  findings.push(finding('affordable', 'Affordable housing', 'info',
    p.units > 1
      ? `Scheme of ${p.units} units with ${p.affordableHousingPct}% affordable indicated. Most authorities seek 30–50% on qualifying sites (threshold typically 10+ units); confirm against the local plan and viability.`
      : 'Single dwelling — affordable-housing requirements generally do not apply (below the policy threshold).',
    { reference: 'NPPF; local affordable-housing policy' }));

  return {
    findings,
    status: rollUp(findings),
    ndssMinimum: minGia,
  };
}
