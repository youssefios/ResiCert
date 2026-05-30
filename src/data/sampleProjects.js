// @ts-check
/**
 * A few illustrative projects used to seed the UI's "load example" menu, the
 * sample CLI script and the tests. They span the spectrum from a code-minimum
 * gas house to a net-zero apartment scheme.
 */

import { defaultProject } from '../engine/types.js';

/** @returns {import('../engine/types.js').Project} */
function baseline() {
  return { ...defaultProject(), name: 'Code-minimum gas house (baseline)' };
}

/** @type {Record<string, import('../engine/types.js').Project>} */
export const SAMPLE_PROJECTS = {
  'baseline-house': baseline(),

  'best-practice-house': {
    ...defaultProject(),
    name: 'Best-practice all-electric house',
    region: 'south-west',
    builtForm: 'detached',
    bedrooms: 4, bedspaces: 6, gia: 120,
    uWall: 0.15, uRoof: 0.10, uFloor: 0.11, uWindow: 1.1,
    airPermeability: 3, thermalBridging: 0.04, glazingRatio: 0.2,
    heatingSystem: 'ashp', ventilationSystem: 'mvhr',
    waterUseLpd: 95, pvKwp: 4, batteryStorage: true,
    solarShading: true, daylightFactorAvg: 2.2, accessibleM4_2: true,
    primaryStructure: 'timber-frame', embodiedCarbonA1A5: 480,
    responsiblySourcedMaterials: true, recycledContent: true,
    suds: true, rainwaterHarvesting: true,
    biodiversityNetGainPct: 20, cycleStorage: true,
    targetCertifications: ['hqm', 'passivhaus'],
  },

  'passivhaus-house': {
    ...defaultProject(),
    name: 'Passivhaus-aspiring house',
    builtForm: 'detached',
    bedrooms: 4, bedspaces: 6, gia: 130,
    uWall: 0.12, uRoof: 0.10, uFloor: 0.10, uWindow: 0.8,
    airPermeability: 0.6, thermalBridging: 0.02, glazingRatio: 0.18,
    heatingSystem: 'ashp', ventilationSystem: 'mvhr',
    waterUseLpd: 90, pvKwp: 5, batteryStorage: true,
    solarShading: true, daylightFactorAvg: 2.0,
    primaryStructure: 'timber-frame', embodiedCarbonA1A5: 450,
    responsiblySourcedMaterials: true, recycledContent: true,
    suds: true, biodiversityNetGainPct: 15,
    targetCertifications: ['passivhaus'],
  },

  'btr-apartment-block': {
    ...defaultProject(),
    name: 'Build-to-rent apartment block (London)',
    region: 'london',
    dwellingType: 'flat', builtForm: 'apartment-block',
    waterStressedArea: true,
    units: 80, storeys: 8, topStoreyHeightM: 24,
    bedrooms: 2, bedspaces: 3, gia: 61,
    uWall: 0.16, uRoof: 0.12, uFloor: 0.12, uWindow: 1.2,
    airPermeability: 3, thermalBridging: 0.05, glazingRatio: 0.3,
    heatingSystem: 'heat-network', ventilationSystem: 'mvhr',
    waterUseLpd: 105, pvKwp: 30, batteryStorage: false,
    solarShading: true, crossVentilation: false, daylightFactorAvg: 1.7,
    accessibleM4_2: true, wheelchairM4_3: true,
    separatingSoundDnTw: 50, impactSoundLnTw: 58,
    primaryStructure: 'masonry', embodiedCarbonA1A5: 720,
    responsiblySourcedMaterials: true,
    suds: true, biodiversityNetGainPct: 12, affordableHousingPct: 35,
    cycleStorage: true, parkingSpaces: 0,
    gigabitInfrastructure: true, gigabitConnection: true, evChargePoint: false,
    targetCertifications: ['breeam', 'well', 'wiredscore-home'],
  },

  'noncompliant-refurb': {
    ...defaultProject(),
    name: 'Poor refurbishment (non-compliant example)',
    projectType: 'major-refurbishment',
    builtForm: 'mid-terrace',
    uWall: 0.45, uRoof: 0.25, uFloor: 0.30, uWindow: 2.2,
    airPermeability: 12, glazingRatio: 0.28,
    heatingSystem: 'gas-boiler', ventilationSystem: 'natural',
    waterUseLpd: 145, pvKwp: 0, evChargePoint: false,
    gigabitInfrastructure: false, gigabitConnection: false,
    pas24SecureDoors: false, daylightFactorAvg: 1.0,
    embodiedCarbonA1A5: 850, suds: false, biodiversityNetGainPct: 0,
  },
};

/** @returns {string[]} */
export const SAMPLE_KEYS = Object.keys(SAMPLE_PROJECTS);
