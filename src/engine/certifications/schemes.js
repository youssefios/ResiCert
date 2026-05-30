// @ts-check
/**
 * Catalogue of "aspirational" (voluntary) certification schemes, each with the
 * logic ResiCert uses to (a) decide whether it is applicable to *residential*
 * and (b) give an indicative readiness pre-screen from the project data.
 *
 * Mandatory/statutory items (Building Regs, EPC) are handled elsewhere — this
 * file is only voluntary schemes a client might pursue on top.
 *
 * Applicability is deliberately conservative: schemes aimed at commercial /
 * non-domestic stock (e.g. NABERS UK Design for Performance, currently offices)
 * are marked not-applicable to residential, per the brief ("only if applicable
 * to resi").
 */

/**
 * @typedef {Object} ReadinessFactor
 * @property {string} label
 * @property {boolean} met
 * @property {string} note
 *
 * @typedef {Object} SchemeReadiness
 * @property {number} score          0–100 indicative alignment.
 * @property {ReadinessFactor[]} factors
 * @property {string[]} recommendations
 *
 * @typedef {Object} ReadinessContext
 * @property {import('../types.js').Project} project
 * @property {ReturnType<import('../energy/model.js').runEnergyModel>} model
 * @property {{score:number, band:string}} epc
 * @property {{pillars:any, meetsAllPillars:boolean, zeroCarbon:boolean, tier:string}} edge
 * @property {boolean} regulationsCompliant
 *
 * @typedef {Object} Scheme
 * @property {string} id
 * @property {string} name
 * @property {string} owner          Scheme operator.
 * @property {string} focus          Primary theme.
 * @property {'both'|'multi-unit'|'single-home'} bestFor
 * @property {string} summary
 * @property {(p: import('../types.js').Project) => {applicable: boolean, reason: string}} applicability
 * @property {(ctx: ReadinessContext) => SchemeReadiness} readiness
 */

/** Helper: is this a multi-unit residential development? */
export function isMultiUnit(/** @type {import('../types.js').Project} */ p) {
  return p.units > 1 || p.builtForm === 'apartment-block'
    || p.dwellingType === 'flat' || p.dwellingType === 'maisonette';
}

/** Build a readiness result from factors (score = % of factors met, weighted equally). */
function readinessFrom(/** @type {ReadinessFactor[]} */ factors, /** @type {string[]} */ recommendations = []) {
  const met = factors.filter((f) => f.met).length;
  const score = factors.length ? Math.round((met / factors.length) * 100) : 0;
  return { score, factors, recommendations };
}

/** @type {Scheme[]} */
export const SCHEMES = [
  {
    id: 'breeam',
    name: 'BREEAM',
    owner: 'BRE',
    focus: 'Whole-building sustainability',
    bestFor: 'multi-unit',
    summary: 'Multi-issue sustainability assessment (energy, water, materials, health, management, ecology). For housing, BREEAM is most used on multi-residential and mixed-use; single new homes are typically steered to the Home Quality Mark.',
    applicability: (p) => isMultiUnit(p)
      ? { applicable: true, reason: 'Multi-residential / apartment scheme — BREEAM New Construction (residential) applies.' }
      : { applicable: true, reason: 'Applicable, but for an individual new home the Home Quality Mark is usually the better fit.' },
    readiness: (ctx) => {
      const { project: p, edge, epc } = ctx;
      const f = [
        { label: 'Energy (Ene)', met: epc.score >= 81, note: `EPC ~${epc.band}; BREEAM rewards low energy/CO₂.` },
        { label: 'Water (Wat)', met: edge.pillars.water.saving >= 20, note: `Water saving ${edge.pillars.water.saving}%.` },
        { label: 'Materials (Mat)', met: p.responsiblySourcedMaterials, note: 'Responsible sourcing supports Mat credits.' },
        { label: 'Health & wellbeing (Hea)', met: p.daylightFactorAvg >= 1.5 && (p.solarShading || p.crossVentilation), note: 'Daylight & comfort credits.' },
        { label: 'Land use & ecology (LE)', met: p.biodiversityNetGainPct >= 10, note: `BNG ${p.biodiversityNetGainPct}%.` },
        { label: 'Pollution / surface water', met: p.suds, note: 'SuDS supports Pol credits.' },
      ];
      return readinessFrom(f, [
        'Appoint a licensed BREEAM Assessor at concept stage to pre-assess and target a rating (Very Good / Excellent).',
        'Lock in low water fittings, responsible sourcing (BES 6001) and a robust energy strategy early.',
      ]);
    },
  },
  {
    id: 'hqm',
    name: 'Home Quality Mark (HQM)',
    owner: 'BRE',
    focus: 'New-home quality & sustainability',
    bestFor: 'both',
    summary: "BRE's residential-specific mark (part of the BREEAM family) for new homes — covers environmental footprint, running costs, health & wellbeing and digital connectivity, rated in stars.",
    applicability: () => ({ applicable: true, reason: 'Purpose-built for new residential — applies to houses and apartments.' }),
    readiness: (ctx) => {
      const { project: p, epc, edge } = ctx;
      const f = [
        { label: 'Energy & running cost', met: epc.score >= 81, note: `EPC ~${epc.band}.` },
        { label: 'Water efficiency', met: p.waterUseLpd <= 110, note: `${p.waterUseLpd} L/p/day.` },
        { label: 'Health & wellbeing', met: p.daylightFactorAvg >= 1.5, note: 'Daylight, sound, air quality.' },
        { label: 'Digital connectivity', met: p.gigabitConnection, note: 'Gigabit connection.' },
        { label: 'Construction impacts', met: edge.pillars.materials.saving >= 20, note: `Embodied carbon saving ${edge.pillars.materials.saving}%.` },
      ];
      return readinessFrom(f, [
        'Register with BRE and appoint an HQM Assessor; HQM is well suited to volume housebuilding.',
        'Improve water fittings to ≤110 L/p/day and confirm a gigabit connection to lift the star rating.',
      ]);
    },
  },
  {
    id: 'passivhaus',
    name: 'Passivhaus / EnerPHit',
    owner: 'Passive House Institute',
    focus: 'Ultra-low energy fabric & comfort',
    bestFor: 'both',
    summary: 'Rigorous fabric-first energy standard: very low space-heating demand, excellent airtightness and continuous ventilation with heat recovery. EnerPHit is the retrofit variant.',
    applicability: () => ({ applicable: true, reason: 'Applies to any dwelling — individual homes and apartment blocks.' }),
    readiness: (ctx) => {
      const { project: p, model } = ctx;
      const f = [
        { label: 'Space-heat demand ≤15 kWh/m²·yr', met: model.spaceHeatIntensity <= 20, note: `Modelled ~${model.spaceHeatIntensity} kWh/m²·yr (indicative; PHPP needed).` },
        { label: 'Airtightness ≤0.6 ach (≈1 m³/h·m²)', met: p.airPermeability <= 1.5, note: `${p.airPermeability} m³/h·m² @50Pa.` },
        { label: 'MVHR with heat recovery', met: p.ventilationSystem === 'mvhr', note: `Ventilation: ${p.ventilationSystem}.` },
        { label: 'High-performance glazing (U≤0.8)', met: p.uWindow <= 0.85, note: `Window U ${p.uWindow}.` },
        { label: 'Continuous insulation (walls U≤0.15)', met: p.uWall <= 0.15, note: `Wall U ${p.uWall}.` },
      ];
      return readinessFrom(f, [
        'Model in PHPP from the outset; Passivhaus is fabric-led and hard to retrofit into a design.',
        'Target airtightness ≤0.6 ach, MVHR, triple glazing and thermal-bridge-free detailing.',
      ]);
    },
  },
  {
    id: 'well',
    name: 'WELL Building Standard',
    owner: 'IWBI',
    focus: 'Occupant health & wellbeing',
    bestFor: 'multi-unit',
    summary: 'Health-focused standard (air, water, nourishment, light, movement, thermal & acoustic comfort, mind, community). For residential it is applied to multifamily buildings and their common areas.',
    applicability: (p) => isMultiUnit(p)
      ? { applicable: true, reason: 'Multifamily residential — WELL v2 (and WELL Residential) applies to homes and common areas.' }
      : { applicable: false, reason: 'WELL targets multi-occupant/multifamily buildings; limited applicability to a single private dwelling.' },
    readiness: (ctx) => {
      const { project: p } = ctx;
      const f = [
        { label: 'Air — good ventilation', met: p.ventilationSystem === 'mvhr' || p.ventilationSystem === 'mev', note: 'Continuous mechanical ventilation / filtration.' },
        { label: 'Water — quality & efficiency', met: p.waterUseLpd <= 110, note: 'Efficient fittings; water-quality strategy.' },
        { label: 'Light — daylight', met: p.daylightFactorAvg >= 2, note: `Daylight factor ${p.daylightFactorAvg}%.` },
        { label: 'Thermal comfort — overheating control', met: p.solarShading || p.crossVentilation, note: 'Shading / cross ventilation.' },
        { label: 'Sound — acoustic comfort', met: p.separatingSoundDnTw >= 50, note: 'Enhanced acoustic separation.' },
      ];
      return readinessFrom(f, [
        'Engage a WELL AP; many WELL features (air quality monitoring, water testing, biophilia) are operational and need a management plan.',
        'Prioritise ventilation/filtration, daylight and acoustic comfort in common areas and homes.',
      ]);
    },
  },
  {
    id: 'fitwel',
    name: 'Fitwel',
    owner: 'Center for Active Design',
    focus: 'Health (cost-effective)',
    bestFor: 'multi-unit',
    summary: 'Health-promoting building certification with a Multifamily Residential scorecard — emphasises active design, access to amenities, and community.',
    applicability: (p) => isMultiUnit(p)
      ? { applicable: true, reason: 'Fitwel has a Multifamily Residential scorecard.' }
      : { applicable: false, reason: 'Fitwel residential scorecards target multifamily buildings, not single private homes.' },
    readiness: (ctx) => {
      const { project: p } = ctx;
      const f = [
        { label: 'Active design (cycle storage)', met: p.cycleStorage, note: 'Secure cycle storage / active travel.' },
        { label: 'Outdoor space / ecology', met: p.biodiversityNetGainPct >= 10, note: 'Green space supports wellbeing credits.' },
        { label: 'Indoor air quality', met: p.ventilationSystem !== 'natural', note: 'Mechanical ventilation.' },
        { label: 'Daylight & views', met: p.daylightFactorAvg >= 1.5, note: `Daylight ${p.daylightFactorAvg}%.` },
      ];
      return readinessFrom(f, [
        'Fitwel is relatively low-cost and operationally focused — suits multifamily and BTR.',
        'Provide active-design features, shared amenities and good IAQ.',
      ]);
    },
  },
  {
    id: 'wiredscore-home',
    name: 'WiredScore Home',
    owner: 'WiredScore',
    focus: 'Digital connectivity',
    bestFor: 'multi-unit',
    summary: 'Rates the digital connectivity of residential buildings — broadband resilience, mobile coverage and in-home infrastructure. Aimed at multi-residential (BTR, apartments).',
    applicability: (p) => isMultiUnit(p)
      ? { applicable: true, reason: 'WiredScore Home rates connectivity of multi-residential buildings.' }
      : { applicable: false, reason: 'Designed for multi-residential buildings; not generally certified for a single house.' },
    readiness: (ctx) => {
      const { project: p } = ctx;
      const f = [
        { label: 'Gigabit-capable connection', met: p.gigabitConnection, note: 'Full-fibre / gigabit service.' },
        { label: 'In-building infrastructure', met: p.gigabitInfrastructure, note: 'Ducting/containment to each home.' },
        { label: 'Provider diversity / resilience', met: p.gigabitConnection, note: 'Multiple ISPs / resilient routes (verify).' },
      ];
      return readinessFrom(f, [
        'Design diverse fibre entry and adequate riser/containment for multiple providers.',
        'Confirm mobile coverage strategy (in-building) for the development.',
      ]);
    },
  },
  {
    id: 'smartscore',
    name: 'SmartScore',
    owner: 'WiredScore',
    focus: 'Smart-building technology',
    bestFor: 'multi-unit',
    summary: 'Certifies smart-building functionality and user outcomes (sustainability, wellbeing, operations). For residential it applies to multi-residential / BTR with building-wide systems.',
    applicability: (p) => isMultiUnit(p)
      ? { applicable: true, reason: 'Multi-residential / BTR with building-wide smart systems can pursue SmartScore.' }
      : { applicable: false, reason: 'Requires building-wide smart systems — not relevant to a single dwelling.' },
    readiness: (ctx) => {
      const { project: p } = ctx;
      const f = [
        { label: 'Energy monitoring/metering', met: p.batteryStorage || p.pvKwp > 0, note: 'Smart energy systems present.' },
        { label: 'Connectivity backbone', met: p.gigabitInfrastructure, note: 'Network infrastructure for smart systems.' },
        { label: 'EV / future-proofing', met: p.evChargePoint, note: 'EV charging integration.' },
      ];
      return readinessFrom(f, [
        'Define the smart use-cases (energy, access, comfort) and a shared data/network architecture early.',
      ]);
    },
  },
  {
    id: 'leed-residential',
    name: 'LEED (Residential: BD+C Homes / Multifamily)',
    owner: 'USGBC',
    focus: 'Whole-building sustainability (US)',
    bestFor: 'both',
    summary: 'Globally recognised green-building rating with residential pathways. In the UK it is less common than BREEAM/HQM but used where international recognition is wanted.',
    applicability: () => ({ applicable: true, reason: 'LEED has residential pathways (Homes and Multifamily); applicable but UK-uncommon vs BREEAM/HQM.' }),
    readiness: (ctx) => {
      const { project: p, epc, edge } = ctx;
      const f = [
        { label: 'Energy & atmosphere', met: epc.score >= 81, note: `EPC ~${epc.band}.` },
        { label: 'Water efficiency', met: edge.pillars.water.saving >= 20, note: `Water saving ${edge.pillars.water.saving}%.` },
        { label: 'Materials & resources', met: p.recycledContent || p.responsiblySourcedMaterials, note: 'Material credits.' },
        { label: 'Sustainable sites', met: p.suds, note: 'Rainwater/site management.' },
      ];
      return readinessFrom(f, [
        'Only pursue where international recognition is valued; otherwise BREEAM/HQM map better to UK practice.',
      ]);
    },
  },
  {
    id: 'building-with-nature',
    name: 'Building with Nature',
    owner: 'Building with Nature CIC',
    focus: 'Green infrastructure & ecology',
    bestFor: 'multi-unit',
    summary: 'UK benchmark for high-quality green infrastructure across wildlife, water and wellbeing — suited to residential-led masterplans and larger developments.',
    applicability: (p) => p.units >= 5
      ? { applicable: true, reason: 'Site-scale green-infrastructure benchmark — suits residential developments/masterplans.' }
      : { applicable: false, reason: 'Aimed at developments with meaningful external/green infrastructure; limited value for one or two dwellings.' },
    readiness: (ctx) => {
      const { project: p } = ctx;
      const f = [
        { label: 'Biodiversity Net Gain', met: p.biodiversityNetGainPct >= 10, note: `BNG ${p.biodiversityNetGainPct}%.` },
        { label: 'Sustainable drainage', met: p.suds, note: 'Multifunctional SuDS.' },
        { label: 'Access to nature / wellbeing', met: p.biodiversityNetGainPct >= 20, note: 'Generous, accessible green space.' },
      ];
      return readinessFrom(f, [
        'Integrate green infrastructure as multifunctional (ecology + water + wellbeing) from masterplanning.',
      ]);
    },
  },
  {
    id: 'nabers-uk',
    name: 'NABERS UK',
    owner: 'BRE / NABERS',
    focus: 'Measured operational performance',
    bestFor: 'multi-unit',
    summary: 'Rates measured in-use energy performance. In the UK it currently covers offices (Design for Performance); a residential scheme is not established.',
    applicability: () => ({ applicable: false, reason: 'NABERS UK currently targets non-domestic (offices). Not applicable to residential at present.' }),
    readiness: () => readinessFrom([], ['Not applicable to residential — monitor for a future residential scheme.']),
  },
];

/** Look up a scheme by id. @param {string} id */
export function getScheme(id) {
  return SCHEMES.find((s) => s.id === id);
}
