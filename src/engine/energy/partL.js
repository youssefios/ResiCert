// @ts-check
/**
 * Part L 2021 target-rate screening and Future Homes Standard (FHS) readiness.
 *
 * Part L compliance for a new dwelling requires the *actual* rates to be no
 * worse than the *target* rates derived from a notional dwelling of the same
 * geometry:
 *   - DER ≤ TER   (CO2 emission rate, kgCO2/m²/yr)
 *   - DPER ≤ TPER (primary energy rate, kWh/m²/yr)
 *   - DFEE ≤ TFEE (fabric energy efficiency)
 * plus the limiting fabric/services standards (checked in regulations).
 *
 * We approximate the target rates by running the same model on a "notional"
 * version of the dwelling (notional fabric + the actual geometry), and compare
 * to the modelled actual rates.
 */

import { finding, rollUp, round } from '../util.js';
import { runEnergyModel } from './model.js';

/** Notional-dwelling fabric/services used to derive the target rate. */
function notionalProject(/** @type {import('../types.js').Project} */ p) {
  return {
    ...p,
    uWall: 0.18, uRoof: 0.11, uFloor: 0.13, uWindow: 1.2,
    airPermeability: 5, thermalBridging: 0.05,
    // Part L 2021 notional uses a gas boiler + a PV allocation related to
    // ground-floor area; we approximate with a modest PV array and MEV.
    heatingSystem: /** @type {const} */ ('gas-boiler'),
    ventilationSystem: p.ventilationSystem === 'natural' ? /** @type {const} */ ('natural') : p.ventilationSystem,
    pvKwp: round((p.gia / Math.max(1, p.storeys)) * 0.04, 2),
  };
}

/**
 * @param {import('../types.js').Project} p
 * @param {ReturnType<typeof runEnergyModel>} [actual]
 */
export function assessPartL(p, actual = runEnergyModel(p)) {
  /** @type {import('../util.js').Finding[]} */
  const findings = [];

  if (p.projectType !== 'new-build' && p.projectType !== 'change-of-use') {
    findings.push(finding('partL-scope', 'Part L target rates', 'not-applicable',
      'Full new-dwelling target-rate compliance applies to new builds (and material changes of use). For refurbishment/extension, elemental and consequential-improvement rules apply instead.',
      { reference: 'Approved Document L Vol 1 (2021)' }));
    return { findings, status: rollUp(findings), ter: null, der: round(actual.co2PerM2, 1), tper: null, dper: round(actual.primaryPerM2) };
  }

  const target = runEnergyModel(notionalProject(p));
  const ter = round(target.co2PerM2, 1);
  const der = round(actual.co2PerM2, 1);
  const tper = round(target.primaryPerM2);
  const dper = round(actual.primaryPerM2);

  findings.push(finding('partL-der', 'Part L — CO₂ emission rate (DER ≤ TER)',
    der <= ter ? 'pass' : 'fail',
    `Modelled DER ${der} vs TER ${ter} kgCO₂/m²·yr.`,
    {
      requirement: 'Dwelling Emission Rate must not exceed the Target Emission Rate.',
      recommendation: der <= ter ? undefined : 'Improve fabric, switch to a heat pump, or add PV to bring DER below TER.',
      reference: 'Approved Document L Vol 1 (2021)',
    }));

  findings.push(finding('partL-per', 'Part L — primary energy rate (DPER ≤ TPER)',
    dper <= tper ? 'pass' : 'fail',
    `Modelled DPER ${dper} vs TPER ${tper} kWh/m²·yr.`,
    {
      requirement: 'Dwelling Primary Energy Rate must not exceed the Target Primary Energy Rate.',
      recommendation: dper <= tper ? undefined : 'Reduce delivered energy (fabric/heat pump) and/or add on-site renewables.',
      reference: 'Approved Document L Vol 1 (2021)',
    }));

  // Future Homes Standard readiness: low-carbon heating + strong fabric + a
  // big CO2 reduction relative to the 2021 target.
  const fhsCarbonCut = ter > 0 ? ((ter - der) / ter) * 100 : 0;
  const lowCarbonHeat = p.heatingSystem === 'ashp' || p.heatingSystem === 'gshp' || p.heatingSystem === 'heat-network';
  if (lowCarbonHeat && fhsCarbonCut >= 70) {
    findings.push(finding('fhs', 'Future Homes Standard 2025 readiness', 'pass',
      `Low-carbon heating and ~${round(fhsCarbonCut)}% lower CO₂ than the Part L 2021 target — broadly aligned with the FHS direction (~75–80%).`,
      { reference: 'Future Homes Standard' }));
  } else {
    findings.push(finding('fhs', 'Future Homes Standard 2025 readiness', 'warning',
      `Not yet FHS-aligned: ${lowCarbonHeat ? '' : 'fossil-fuel heating; '}~${round(fhsCarbonCut)}% CO₂ reduction vs the 2021 target (FHS expects ~75–80% and low-carbon heat).`,
      {
        recommendation: 'Adopt a heat pump, strengthen fabric and add PV to meet the Future Homes Standard.',
        reference: 'Future Homes Standard',
      }));
  }

  return { findings, status: rollUp(findings), ter, der, tper, dper };
}
