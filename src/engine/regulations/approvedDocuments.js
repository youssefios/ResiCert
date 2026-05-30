// @ts-check
/**
 * Reference catalogue of the Approved Documents to the Building Regulations
 * 2010 (England), as they apply to dwellings. Editions reflect the position in
 * force during 2024–2025 (the 2021 energy/ventilation/overheating uplift and
 * the 2022 fire amendments).
 *
 * This is *reference metadata* — the actual pass/fail logic lives in
 * `evaluate.js`. Keeping the catalogue separate lets the UI show the full list
 * of parts (including those ResiCert only checks qualitatively) and lets us
 * flag nation-specific divergence.
 *
 * NOTE: Wales uses its own Approved Documents (with a different Part L/F),
 * Scotland uses the Technical Handbooks (Sections 1–7) and Northern Ireland
 * uses its Technical Booklets. Where ResiCert is run for those nations the
 * England thresholds are shown as indicative and clearly flagged.
 */

/**
 * @typedef {Object} ApprovedDocument
 * @property {string} part            Part letter, e.g. "L".
 * @property {string} title
 * @property {string} edition         Edition / amendment in force.
 * @property {string} scope           What it covers for dwellings.
 * @property {boolean} dwellingScoped Whether it routinely applies to new dwellings.
 * @property {string} [notes]
 */

/** @type {ApprovedDocument[]} */
export const APPROVED_DOCUMENTS = [
  {
    part: 'A', title: 'Structure', edition: '2004 (2013 amends)',
    scope: 'Loading, ground movement, disproportionate collapse.',
    dwellingScoped: true,
  },
  {
    part: 'B', title: 'Fire safety', edition: '2019 (2022 & 2023 amends)',
    scope: 'Means of escape, internal/external fire spread, access for the fire service. Volume 1 = dwellings.',
    dwellingScoped: true,
    notes: 'Combustible cladding ban (Reg 7(2)) >18m; sprinklers in new blocks of flats >11m; second-staircase guidance for tall residential.',
  },
  {
    part: 'C', title: 'Site preparation & resistance to contaminants and moisture', edition: '2004 (2013 amends)',
    scope: 'Contaminated land, subsoil drainage, damp & weather resistance.',
    dwellingScoped: true,
  },
  {
    part: 'D', title: 'Toxic substances', edition: '1992 (2013 amends)',
    scope: 'Cavity insulation off-gassing (formaldehyde).',
    dwellingScoped: true,
  },
  {
    part: 'E', title: 'Resistance to the passage of sound', edition: '2003 (2015 amends)',
    scope: 'Airborne & impact sound between dwellings and within (flats/attached).',
    dwellingScoped: true,
    notes: 'Separating walls/floors: airborne ≥45 dB DnT,w+Ctr; impact ≤62 dB L\'nT,w.',
  },
  {
    part: 'F', title: 'Ventilation', edition: '2021',
    scope: 'Whole-dwelling and local extract ventilation; indoor air quality.',
    dwellingScoped: true,
    notes: 'Volume 1 = dwellings. Tighter airtightness (<5 m³/h·m²) requires deliberate ventilation provision.',
  },
  {
    part: 'G', title: 'Sanitation, hot water safety & water efficiency', edition: '2015 (2016 amends)',
    scope: 'Water efficiency (G2), hot water safety, sanitary provision.',
    dwellingScoped: true,
    notes: 'New dwellings ≤125 L/person/day; optional ≤110 L/p/d where set by planning condition.',
  },
  {
    part: 'H', title: 'Drainage & waste disposal', edition: '2015',
    scope: 'Foul & surface water drainage, solid waste storage.',
    dwellingScoped: true,
  },
  {
    part: 'J', title: 'Combustion appliances & fuel storage', edition: '2010 (2013 amends)',
    scope: 'Flues, air supply, CO alarms for combustion appliances.',
    dwellingScoped: true,
  },
  {
    part: 'K', title: 'Protection from falling, collision & impact', edition: '2013',
    scope: 'Stairs, ramps, guarding, glazing safety.',
    dwellingScoped: true,
  },
  {
    part: 'L', title: 'Conservation of fuel and power', edition: '2021 (Vol 1 dwellings)',
    scope: 'Fabric & primary energy performance, CO2 emissions, fixed services.',
    dwellingScoped: true,
    notes: '~31% CO2 reduction vs 2013. Future Homes Standard 2025 targets ~75–80% & removes fossil-fuel heating.',
  },
  {
    part: 'M', title: 'Access to and use of buildings', edition: '2015 (2016 amends)',
    scope: 'M4(1) visitable (mandatory); M4(2) accessible & adaptable / M4(3) wheelchair (optional, planning-set).',
    dwellingScoped: true,
  },
  {
    part: 'O', title: 'Overheating', edition: '2021',
    scope: 'Limiting solar gains and providing means to remove heat in new residential.',
    dwellingScoped: true,
    notes: 'New for 2021. Simplified method (glazing/opening limits, higher-risk locations) or dynamic CIBSE TM59 modelling.',
  },
  {
    part: 'P', title: 'Electrical safety', edition: '2013',
    scope: 'Design, installation & certification of fixed electrics in dwellings.',
    dwellingScoped: true,
  },
  {
    part: 'Q', title: 'Security', edition: '2015',
    scope: 'Security of easily accessible doors and windows in new dwellings.',
    dwellingScoped: true,
    notes: 'Doorsets/windows to PAS 24 or equivalent.',
  },
  {
    part: 'R', title: 'Physical infrastructure for high-speed electronic communications', edition: '2022',
    scope: 'In-building gigabit-ready physical infrastructure (R1) and connection (R2).',
    dwellingScoped: true,
  },
  {
    part: 'S', title: 'Infrastructure for charging electric vehicles', edition: '2021',
    scope: 'EV charge points / cable routes for new dwellings with associated parking.',
    dwellingScoped: true,
  },
  {
    part: '7', title: 'Materials and workmanship (Regulation 7)', edition: '2013 (2018 amends)',
    scope: 'Adequacy/fitness of materials; combustibility of external walls >18m (Reg 7(2)).',
    dwellingScoped: true,
  },
];

/** Look up a single Approved Document by part letter. @param {string} part */
export function getApprovedDocument(part) {
  return APPROVED_DOCUMENTS.find((d) => d.part.toLowerCase() === String(part).toLowerCase());
}
