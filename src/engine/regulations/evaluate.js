// @ts-check
/**
 * Evaluate a project against the dwelling-relevant Approved Documents.
 *
 * This is a *pre-assessment* of likely compliance from design data — it is not
 * Building Control sign-off and does not replace a SAP/EPC assessment, a fire
 * engineer, an acoustician or an approved inspector. Thresholds encoded here
 * are the headline limiting values; real compliance depends on full
 * calculation and detailing.
 *
 * Each check returns a {@link Finding}. Mandatory parts that FAIL make the
 * scheme non-certifiable (a building that doesn't meet the Regs can't earn a
 * sustainability certificate on top).
 */

import { finding, rollUp, tally } from '../util.js';
import { APPROVED_DOCUMENTS } from './approvedDocuments.js';

/**
 * England Part L 2021 "limiting fabric parameters" (worst allowable U-values)
 * and the notional-dwelling values used as good-practice targets.
 */
const PART_L = {
  limiting: { wall: 0.26, roof: 0.16, floor: 0.18, window: 1.6, airPermeability: 8 },
  notional: { wall: 0.18, roof: 0.11, floor: 0.13, window: 1.2, airPermeability: 5 },
};

/**
 * @param {import('../types.js').Project} p
 * @returns {{findings: import('../util.js').Finding[], status: import('../util.js').Status, compliant: boolean, tally: ReturnType<typeof tally>, mandatoryFailures: import('../util.js').Finding[]}}
 */
export function evaluateRegulations(p) {
  /** @type {import('../util.js').Finding[]} */
  const findings = [];
  // True when the dwelling shares a separating wall/floor with another dwelling
  // (so Part E between-dwelling resistance applies).
  const isFlatOrAttached = p.dwellingType === 'flat' || p.dwellingType === 'maisonette'
    || p.builtForm === 'apartment-block' || p.builtForm === 'mid-terrace'
    || p.builtForm === 'semi-detached' || p.builtForm === 'end-terrace';

  // --- Part L: Conservation of fuel and power -----------------------------
  {
    const lim = PART_L.limiting;
    const fabricIssues = [];
    if (p.uWall > lim.wall) fabricIssues.push(`wall ${p.uWall} > ${lim.wall}`);
    if (p.uRoof > lim.roof) fabricIssues.push(`roof ${p.uRoof} > ${lim.roof}`);
    if (p.uFloor > lim.floor) fabricIssues.push(`floor ${p.uFloor} > ${lim.floor}`);
    if (p.uWindow > lim.window) fabricIssues.push(`window ${p.uWindow} > ${lim.window}`);
    if (p.airPermeability > lim.airPermeability) {
      fabricIssues.push(`air permeability ${p.airPermeability} > ${lim.airPermeability}`);
    }
    if (fabricIssues.length) {
      findings.push(finding('L-fabric', 'Part L — limiting fabric standards', 'fail',
        `Element(s) exceed Part L 2021 limiting values: ${fabricIssues.join('; ')}.`, {
          requirement: 'Worst-case U-values: wall ≤0.26, roof ≤0.16, floor ≤0.18, window ≤1.6 W/m²K; air permeability ≤8 m³/h·m².',
          recommendation: 'Improve the listed elements at least to limiting values; aim for notional values to pass the overall target rate.',
          reference: 'Approved Document L Vol 1 (2021), Table 1.2',
        }));
    } else {
      const meetsNotional = p.uWall <= PART_L.notional.wall && p.uRoof <= PART_L.notional.roof
        && p.uFloor <= PART_L.notional.floor && p.uWindow <= PART_L.notional.window;
      findings.push(finding('L-fabric', 'Part L — limiting fabric standards',
        meetsNotional ? 'pass' : 'warning',
        meetsNotional
          ? 'All elements meet or beat the notional-dwelling fabric values (good practice).'
          : 'Elements meet limiting values but not all reach notional-dwelling values; the overall target emission/primary-energy rate may be hard to meet without compensation (e.g. PV).',
        {
          requirement: 'Notional fabric: wall ≤0.18, roof ≤0.11, floor ≤0.13, window ≤1.2 W/m²K; air permeability ≤5.',
          reference: 'Approved Document L Vol 1 (2021)',
        }));
    }

    // Fossil-fuel heating note re: Future Homes Standard direction of travel.
    if (p.heatingSystem === 'gas-boiler') {
      findings.push(finding('L-heating', 'Part L — heating system & Future Homes Standard', 'warning',
        'Gas boiler specified. Compliant under Part L 2021 but not aligned with the Future Homes Standard 2025, which is expected to effectively end new fossil-fuel heating.',
        {
          requirement: 'Part L 2021 permits gas; FHS 2025 expected to require low-carbon heating (e.g. heat pump) + ~75–80% CO2 reduction.',
          recommendation: 'Consider an air-source heat pump to future-proof and unlock higher ResiCert ratings.',
          reference: 'Future Homes Standard consultation',
        }));
    }
  }

  // --- Part F: Ventilation ------------------------------------------------
  {
    const tight = p.airPermeability <= 5;
    if (tight && p.ventilationSystem === 'natural') {
      findings.push(finding('F-vent', 'Part F — ventilation provision', 'warning',
        `At ${p.airPermeability} m³/h·m² the dwelling is relatively airtight; natural (background + intermittent) ventilation may be insufficient for indoor air quality.`,
        {
          requirement: 'Approved Document F (2021): airtight dwellings (≈≤5) generally need continuous mechanical extract (MEV) or MVHR.',
          recommendation: 'Specify continuous MEV or MVHR and verify whole-dwelling extract rates.',
          reference: 'Approved Document F Vol 1 (2021)',
        }));
    } else {
      findings.push(finding('F-vent', 'Part F — ventilation provision', 'pass',
        `Ventilation strategy (${p.ventilationSystem}) is appropriate for an air permeability of ${p.airPermeability} m³/h·m².`,
        { reference: 'Approved Document F Vol 1 (2021)' }));
    }
  }

  // --- Part G2: Water efficiency -----------------------------------------
  {
    const optionalTrigger = p.waterStressedArea;
    const limit = optionalTrigger ? 110 : 125;
    if (p.waterUseLpd > limit) {
      findings.push(finding('G2-water', 'Part G2 — water efficiency', 'fail',
        `Designed water use ${p.waterUseLpd} L/p/day exceeds the ${limit} L/p/day requirement.`,
        {
          requirement: optionalTrigger
            ? 'Optional tighter requirement 110 L/p/day (water-stressed area / planning condition).'
            : 'Mandatory 125 L/p/day for new dwellings.',
          recommendation: 'Specify low-flow taps/showers, ≤6/4 L dual-flush WCs and ≤8 L/min showers.',
          reference: 'Approved Document G (2015), Reg 36',
        }));
    } else {
      findings.push(finding('G2-water', 'Part G2 — water efficiency', 'pass',
        `Designed water use ${p.waterUseLpd} L/p/day meets the ${limit} L/p/day requirement.`,
        { reference: 'Approved Document G (2015)' }));
    }
  }

  // --- Part O: Overheating (new dwellings) -------------------------------
  if (p.projectType === 'new-build' || p.projectType === 'change-of-use') {
    const higherRisk = p.region === 'london';
    const glazingHigh = p.glazingRatio > 0.25;
    if (glazingHigh && !p.solarShading && !p.crossVentilation) {
      findings.push(finding('O-overheat', 'Part O — overheating', 'fail',
        `High glazing ratio (${Math.round(p.glazingRatio * 100)}%) with no solar shading and no cross ventilation${higherRisk ? ' in a higher-risk location (London)' : ''}.`,
        {
          requirement: 'Limit unwanted solar gains and provide an adequate means to remove heat (simplified method limits, or dynamic CIBSE TM59).',
          recommendation: 'Add external shading / reduce glazing, and provide cross ventilation; or demonstrate compliance via TM59 dynamic modelling.',
          reference: 'Approved Document O (2021)',
        }));
    } else if (glazingHigh && (!p.solarShading || !p.crossVentilation)) {
      findings.push(finding('O-overheat', 'Part O — overheating', 'warning',
        `Glazing ratio ${Math.round(p.glazingRatio * 100)}% with partial mitigation. May require dynamic (TM59) verification${higherRisk ? ' given the higher-risk location' : ''}.`,
        {
          requirement: 'Approved Document O simplified method or dynamic thermal modelling.',
          recommendation: 'Confirm shading and openable areas meet the simplified-method limits, or model with TM59.',
          reference: 'Approved Document O (2021)',
        }));
    } else {
      findings.push(finding('O-overheat', 'Part O — overheating', 'pass',
        'Solar gains and heat-removal provisions appear reasonable for the location and glazing.',
        { reference: 'Approved Document O (2021)' }));
    }
  } else {
    findings.push(finding('O-overheat', 'Part O — overheating', 'not-applicable',
      'Part O applies to new dwellings (and certain changes of use); not assessed for this project type.',
      { reference: 'Approved Document O (2021)' }));
  }

  // --- Part M: Access -----------------------------------------------------
  {
    // M4(1) is the mandatory baseline everywhere; M4(2)/M4(3) only where the
    // planning authority sets the optional requirement.
    if (p.wheelchairM4_3) {
      findings.push(finding('M-access', 'Part M — access', 'pass',
        'Designed to M4(3) wheelchair-user standard (exceeds the M4(1) baseline).',
        { reference: 'Approved Document M Vol 1 (2015)' }));
    } else if (p.accessibleM4_2) {
      findings.push(finding('M-access', 'Part M — access', 'pass',
        'Designed to M4(2) accessible & adaptable standard (exceeds the M4(1) baseline).',
        { reference: 'Approved Document M Vol 1 (2015)' }));
    } else {
      findings.push(finding('M-access', 'Part M — access', 'pass',
        'Assumed to meet the mandatory M4(1) "visitable dwelling" baseline. Confirm whether the local plan requires M4(2)/M4(3) on a proportion of units.',
        {
          requirement: 'M4(1) mandatory; M4(2)/M4(3) where set by planning condition.',
          recommendation: 'Check the local plan accessibility policy — many authorities require a % of M4(2) and some M4(3) homes.',
          reference: 'Approved Document M Vol 1 (2015)',
        }));
    }
  }

  // --- Part S: EV charging ------------------------------------------------
  {
    const hasParking = p.parkingSpaces > 0;
    if (hasParking && !p.evChargePoint) {
      findings.push(finding('S-ev', 'Part S — EV charging', 'fail',
        'Associated parking is provided but no EV charge point is specified.',
        {
          requirement: 'New dwelling with an associated parking space must have a charge point.',
          recommendation: 'Provide a 7 kW charge point per dwelling with associated parking (or cable route where exempt).',
          reference: 'Approved Document S (2021)',
        }));
    } else {
      findings.push(finding('S-ev', 'Part S — EV charging',
        hasParking ? 'pass' : 'not-applicable',
        hasParking
          ? 'EV charge point provided for the associated parking space.'
          : 'No associated parking — charge-point requirement does not apply (consider cable routes / communal provision).',
        { reference: 'Approved Document S (2021)' }));
    }
  }

  // --- Part R: Gigabit infrastructure ------------------------------------
  {
    if (!p.gigabitInfrastructure) {
      findings.push(finding('R-comms', 'Part R — gigabit-ready infrastructure', 'fail',
        'In-building physical infrastructure for gigabit-capable connection not provided.',
        {
          requirement: 'R1: provide gigabit-ready in-building physical infrastructure; R2: connect where available within the £2,000 cap.',
          recommendation: 'Provide ducting/containment to each dwelling and a gigabit connection where the cost cap allows.',
          reference: 'Approved Document R (2022)',
        }));
    } else {
      findings.push(finding('R-comms', 'Part R — gigabit-ready infrastructure',
        p.gigabitConnection ? 'pass' : 'warning',
        p.gigabitConnection
          ? 'Gigabit-ready infrastructure and a gigabit-capable connection are provided.'
          : 'Gigabit-ready infrastructure provided; confirm a connection is made where available within the cost cap.',
        { reference: 'Approved Document R (2022)' }));
    }
  }

  // --- Part Q: Security ---------------------------------------------------
  {
    findings.push(finding('Q-security', 'Part Q — security',
      p.pas24SecureDoors ? 'pass' : 'fail',
      p.pas24SecureDoors
        ? 'Easily accessible doors/windows specified to PAS 24 (or equivalent).'
        : 'Easily accessible doorsets/windows are not confirmed to PAS 24.',
      {
        requirement: 'Easily accessible doors and windows to PAS 24:2016 (or equivalent security standard).',
        recommendation: 'Specify PAS 24 certified doorsets and ground-floor / accessible windows.',
        reference: 'Approved Document Q (2015)',
      }));
  }

  // --- Part E: Sound (flats / attached dwellings) ------------------------
  if (isFlatOrAttached) {
    const airOk = p.separatingSoundDnTw >= 45;
    const impactOk = p.impactSoundLnTw <= 62;
    if (!airOk || !impactOk) {
      findings.push(finding('E-sound', 'Part E — sound insulation', 'fail',
        `Separating element performance below standard: ${!airOk ? `airborne ${p.separatingSoundDnTw} < 45 dB` : ''}${(!airOk && !impactOk) ? '; ' : ''}${!impactOk ? `impact ${p.impactSoundLnTw} > 62 dB` : ''}.`,
        {
          requirement: 'Airborne ≥45 dB DnT,w+Ctr; impact ≤62 dB L\'nT,w (purpose-built dwellings).',
          recommendation: 'Upgrade separating wall/floor build-ups; arrange pre-completion testing or use Robust Details.',
          reference: 'Approved Document E (2003, 2015 amends)',
        }));
    } else {
      findings.push(finding('E-sound', 'Part E — sound insulation', 'pass',
        `Separating element performance meets standard (airborne ${p.separatingSoundDnTw} dB, impact ${p.impactSoundLnTw} dB).`,
        { reference: 'Approved Document E (2003, 2015 amends)' }));
    }
  } else {
    findings.push(finding('E-sound', 'Part E — sound insulation', 'not-applicable',
      'No separating walls/floors with other dwellings (detached house) — Part E resistance between dwellings does not apply (internal sound provisions still apply).',
      { reference: 'Approved Document E' }));
  }

  // --- Part B: Fire safety (height-driven triggers) ----------------------
  {
    const h = p.topStoreyHeightM;
    const isResiBlock = p.builtForm === 'apartment-block' || p.dwellingType === 'flat';
    /** @type {string[]} */
    const notes = [];
    let status = /** @type {import('../util.js').Status} */ ('pass');
    if (h > 18) {
      notes.push('Top storey >18 m: combustible materials banned in external walls (Reg 7(2)); enhanced fire-safety design required.');
      status = 'warning';
    }
    if (isResiBlock && h > 11) {
      notes.push('New block of flats >11 m: sprinkler/AFSS provision required (AD B 2019).');
      status = 'warning';
    }
    if (h > 18) {
      notes.push('Tall residential: provide/justify staircase strategy in line with current guidance.');
    }
    findings.push(finding('B-fire', 'Part B — fire safety',
      status,
      notes.length
        ? notes.join(' ')
        : 'Standard dwelling fire-safety provisions apply (means of escape, internal/external spread, fire-service access). Detailed design by a competent person required.',
      {
        requirement: 'Approved Document B Vol 1 (dwellings). Height triggers: 11 m sprinklers (flats), 18 m combustible-cladding ban & staircase strategy.',
        recommendation: status === 'warning' ? 'Engage a fire engineer; confirm cladding combustibility, sprinklers and escape strategy.' : undefined,
        reference: 'Approved Document B Vol 1 (2019, 2022/2023 amends); Reg 7(2)',
      }));
  }

  // --- Qualitative "expected to comply" parts ----------------------------
  // These need detailing/calculation we don't capture, so we record them as
  // informational reminders rather than asserting a pass.
  for (const part of ['A', 'C', 'D', 'H', 'J', 'K', 'P', '7']) {
    const doc = APPROVED_DOCUMENTS.find((d) => d.part === part);
    if (!doc) continue;
    findings.push(finding(`reg-${part}`, `Part ${doc.part} — ${doc.title}`, 'info',
      `${doc.scope} Compliance to be confirmed through detailed design and Building Control — not quantitatively assessed by ResiCert.`,
      { reference: `Approved Document ${doc.part} (${doc.edition})` }));
  }

  // --- Nation divergence flag --------------------------------------------
  if (p.nation !== 'england') {
    findings.push(finding('nation-divergence', 'Devolved standards apply', 'warning',
      `This project is in ${labelNation(p.nation)}, which uses its own standards (${standardsName(p.nation)}). ResiCert applies the England Approved Documents as indicative only — verify against the local standards.`,
      { reference: standardsName(p.nation) }));
  }

  const mandatoryFailures = findings.filter((f) => f.status === 'fail');
  return {
    findings,
    status: rollUp(findings),
    compliant: mandatoryFailures.length === 0,
    tally: tally(findings),
    mandatoryFailures,
  };
}

/** @param {string} n */
function labelNation(n) {
  return { wales: 'Wales', scotland: 'Scotland', 'northern-ireland': 'Northern Ireland', england: 'England' }[n] || n;
}
/** @param {string} n */
function standardsName(n) {
  return {
    wales: 'Welsh Approved Documents',
    scotland: 'Scottish Technical Handbooks',
    'northern-ireland': 'NI Technical Booklets',
    england: 'Approved Documents (England)',
  }[n] || 'local standards';
}
