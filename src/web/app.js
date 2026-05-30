// ResiCert front-end — vanilla ES modules, no build step.
// Builds the project form from a field config, calls the JSON API and renders
// the certification report.

const $ = (sel, root = document) => root.querySelector(sel);

// ---- Field configuration (mirrors src/engine/types.js) --------------------
const OPT = {
  nation: ['england', 'wales', 'scotland', 'northern-ireland'],
  region: ['london', 'south-east', 'south-west', 'east', 'east-midlands',
    'west-midlands', 'yorkshire', 'north-west', 'north-east', 'wales', 'scotland', 'northern-ireland'],
  dwellingType: ['house', 'flat', 'maisonette', 'bungalow'],
  builtForm: ['detached', 'semi-detached', 'mid-terrace', 'end-terrace', 'apartment-block'],
  projectType: ['new-build', 'major-refurbishment', 'change-of-use', 'extension'],
  heatingSystem: ['gas-boiler', 'ashp', 'gshp', 'direct-electric', 'hydrogen-ready', 'heat-network', 'biomass'],
  ventilationSystem: ['mvhr', 'mev', 'dev', 'natural'],
  primaryStructure: ['masonry', 'timber-frame', 'clt', 'light-steel', 'icf'],
};

const FIELDS = [
  ['Context', [
    ['name', 'Project name', 'text'],
    ['reference', 'Reference', 'text'],
    ['nation', 'Nation', 'select'],
    ['region', 'Region', 'select'],
    ['dwellingType', 'Dwelling type', 'select'],
    ['builtForm', 'Built form', 'select'],
    ['projectType', 'Project type', 'select'],
    ['units', 'Number of dwellings', 'number'],
    ['storeys', 'Storeys', 'number'],
    ['topStoreyHeightM', 'Top storey height (m)', 'number'],
    ['bedrooms', 'Bedrooms', 'number'],
    ['bedspaces', 'Bedspaces (persons)', 'number'],
    ['gia', 'Gross internal area (m²)', 'number'],
    ['waterStressedArea', 'Water-stressed area', 'check'],
  ]],
  ['Fabric', [
    ['uWall', 'Wall U-value (W/m²K)', 'number'],
    ['uRoof', 'Roof U-value', 'number'],
    ['uFloor', 'Floor U-value', 'number'],
    ['uWindow', 'Window U-value', 'number'],
    ['airPermeability', 'Air permeability (m³/h·m²)', 'number'],
    ['thermalBridging', 'Thermal bridging (y-value)', 'number'],
    ['glazingRatio', 'Glazing ratio (0–1)', 'number'],
    ['primaryStructure', 'Primary structure', 'select'],
  ]],
  ['Services & energy', [
    ['heatingSystem', 'Heating system', 'select'],
    ['ventilationSystem', 'Ventilation', 'select'],
    ['waterUseLpd', 'Water use (L/person/day)', 'number'],
    ['pvKwp', 'Solar PV (kWp)', 'number'],
    ['batteryStorage', 'Battery storage', 'check'],
    ['evChargePoint', 'EV charge point', 'check'],
    ['gigabitInfrastructure', 'Gigabit-ready infrastructure', 'check'],
    ['gigabitConnection', 'Gigabit connection', 'check'],
    ['sapEpcScore', 'SAP/EPC score (optional)', 'number'],
  ]],
  ['Health, comfort & access', [
    ['crossVentilation', 'Cross ventilation', 'check'],
    ['solarShading', 'Solar shading', 'check'],
    ['daylightFactorAvg', 'Avg daylight factor (%)', 'number'],
    ['accessibleM4_2', 'M4(2) accessible', 'check'],
    ['wheelchairM4_3', 'M4(3) wheelchair', 'check'],
    ['pas24SecureDoors', 'PAS 24 secure doors', 'check'],
    ['separatingSoundDnTw', 'Separating airborne sound (dB)', 'number'],
    ['impactSoundLnTw', 'Separating impact sound (dB)', 'number'],
  ]],
  ['Materials & water', [
    ['embodiedCarbonA1A5', 'Embodied carbon A1–A5 (kgCO₂e/m²)', 'number'],
    ['responsiblySourcedMaterials', 'Responsibly sourced materials', 'check'],
    ['recycledContent', 'Recycled content', 'check'],
    ['suds', 'Sustainable drainage (SuDS)', 'check'],
    ['rainwaterHarvesting', 'Rainwater harvesting', 'check'],
    ['greywaterReuse', 'Greywater reuse', 'check'],
  ]],
  ['Planning', [
    ['biodiversityNetGainPct', 'Biodiversity Net Gain (%)', 'number'],
    ['affordableHousingPct', 'Affordable housing (%)', 'number'],
    ['cycleStorage', 'Cycle storage', 'check'],
    ['parkingSpaces', 'Parking spaces', 'number'],
  ]],
];

const SCHEME_IDS = ['breeam', 'hqm', 'passivhaus', 'well', 'fitwel', 'wiredscore-home', 'smartscore', 'leed-residential', 'building-with-nature'];

const titleCase = (s) => String(s).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let DEFAULTS = {};

// ---- Form build/read ------------------------------------------------------
function buildForm(values) {
  const form = $('#projectForm');
  form.innerHTML = '';
  for (const [group, fields] of FIELDS) {
    const fs = document.createElement('fieldset');
    fs.className = 'fieldset';
    fs.innerHTML = `<legend>${group}</legend>`;
    const grid = document.createElement('div');
    grid.className = 'grid2';
    for (const [key, label, type] of fields) {
      grid.appendChild(buildField(key, label, type, values[key]));
    }
    fs.appendChild(grid);
    form.appendChild(fs);
  }
  // Target certifications (multi-checkbox).
  const fs = document.createElement('fieldset');
  fs.className = 'fieldset';
  fs.innerHTML = '<legend>Target certifications</legend>';
  const grid = document.createElement('div');
  grid.className = 'grid2';
  const targeted = new Set(values.targetCertifications || []);
  for (const id of SCHEME_IDS) {
    const wrap = document.createElement('div');
    wrap.className = 'field check';
    wrap.innerHTML = `<input type="checkbox" id="cert_${id}" data-cert="${id}" ${targeted.has(id) ? 'checked' : ''}/><label for="cert_${id}">${esc(titleCase(id))}</label>`;
    grid.appendChild(wrap);
  }
  fs.appendChild(grid);
  form.appendChild(fs);
}

function buildField(key, label, type, value) {
  const wrap = document.createElement('div');
  if (type === 'check') {
    wrap.className = 'field check';
    wrap.innerHTML = `<input type="checkbox" id="f_${key}" data-key="${key}" ${value ? 'checked' : ''}/><label for="f_${key}">${esc(label)}</label>`;
    return wrap;
  }
  wrap.className = 'field';
  if (type === 'select') {
    const opts = (OPT[key] || []).map((o) => `<option value="${o}" ${o === value ? 'selected' : ''}>${esc(titleCase(o))}</option>`).join('');
    wrap.innerHTML = `<label for="f_${key}">${esc(label)}</label><select id="f_${key}" data-key="${key}">${opts}</select>`;
  } else {
    const t = type === 'number' ? 'number' : 'text';
    const step = type === 'number' ? 'step="any"' : '';
    const v = value === null || value === undefined ? '' : value;
    wrap.innerHTML = `<label for="f_${key}">${esc(label)}</label><input type="${t}" ${step} id="f_${key}" data-key="${key}" value="${esc(v)}"/>`;
  }
  return wrap;
}

function readForm() {
  const out = {};
  for (const el of document.querySelectorAll('[data-key]')) {
    const key = el.dataset.key;
    if (el.type === 'checkbox') out[key] = el.checked;
    else if (el.type === 'number') out[key] = el.value === '' ? null : Number(el.value);
    else out[key] = el.value;
  }
  out.targetCertifications = [...document.querySelectorAll('[data-cert]')].filter((e) => e.checked).map((e) => e.dataset.cert);
  return out;
}

// ---- Assess + render ------------------------------------------------------
async function assess() {
  const btn = $('#assessBtn');
  btn.disabled = true; btn.textContent = 'Assessing…';
  try {
    const res = await fetch('/api/assess', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(readForm()),
    });
    const report = await res.json();
    if (!res.ok) throw new Error(report.error || 'Assessment failed');
    renderReport(report);
  } catch (err) {
    $('#emptyState').hidden = true;
    const r = $('#report'); r.hidden = false;
    r.innerHTML = `<div class="error-box">⚠️ ${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Assess →';
  }
}

function bar(label, value) {
  return `<div class="bar-row"><span>${esc(label)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(0, Math.min(100, value))}%"></span></span><span>${Math.round(value)}</span></div>`;
}

function findingItem(f) {
  return `<li class="finding ${f.status}">
    <div class="ftitle"><span>${esc(f.title)}</span><span class="status-tag ${f.status}">${f.status.replace('-', ' ')}</span></div>
    <p class="fdetail">${esc(f.detail)}</p>
    ${f.requirement ? `<p class="fmeta">Requirement: ${esc(f.requirement)}</p>` : ''}
    ${f.recommendation ? `<p class="frec">➤ ${esc(f.recommendation)}</p>` : ''}
    ${f.reference ? `<p class="fmeta">Ref: ${esc(f.reference)}</p>` : ''}
  </li>`;
}

function findingsList(findings) {
  return `<ul class="findings">${findings.map(findingItem).join('')}</ul>`;
}

function schemeCard(s) {
  const r = s.readiness;
  const factors = (r?.factors || []).map((f) =>
    `<div class="factor"><span class="dot ${f.met ? 'met' : 'no'}"></span><span>${esc(f.label)} — <span class="muted">${esc(f.note)}</span></span></div>`).join('');
  return `<div class="scheme ${s.targeted ? 'targeted' : ''}">
    <h5>${esc(s.name)} ${s.targeted ? '<span class="badge level">targeted</span>' : ''}</h5>
    <div class="owner">${esc(s.owner)} · ${esc(s.focus)} · best for ${esc(s.bestFor)}</div>
    <p class="ssum">${esc(s.summary)}</p>
    <p class="fmeta">${esc(s.reason)}</p>
    ${r ? `<div class="readiness"><span class="bar-track"><span class="bar-fill" style="width:${r.score}%"></span></span><strong>${r.score}%</strong></div>${factors}` : ''}
    ${r?.recommendations?.length ? `<p class="frec">➤ ${esc(r.recommendations[0])}</p>` : ''}
  </div>`;
}

function renderReport(report) {
  $('#emptyState').hidden = true;
  const el = $('#report'); el.hidden = false;
  const s = report.summary;
  const sc = report.score;
  const en = report.energy;
  const levelOk = sc.certifiable;

  const html = `
    <div class="verdict">
      <div class="score-ring" style="--val:${sc.overall}"><span>${sc.overall}</span></div>
      <div class="verdict-main">
        <h3>${esc(report.project.name || 'Project')}</h3>
        <span class="badge ${levelOk ? 'level' : 'notok'}">${esc(sc.level)}</span>
        ${sc.zeroCarbon ? '<span class="badge zero">Zero Carbon (operational)</span>' : ''}
        <div class="kpis">
          <div class="kpi"><div class="k">EPC (indicative)</div><div class="v"><span class="epc-band epc-${s.epcBand}">${s.epcBand}</span> ${s.epcScore}</div></div>
          <div class="kpi"><div class="k">Operational CO₂</div><div class="v">${s.co2PerM2} <small>kg/m²·yr</small></div></div>
          <div class="kpi"><div class="k">Energy use</div><div class="v">${s.euiKwhM2} <small>kWh/m²·yr</small></div></div>
          <div class="kpi"><div class="k">EDGE tier</div><div class="v">${esc(s.edgeTier)}</div></div>
          <div class="kpi"><div class="k">Building Regs</div><div class="v">${s.regulationsCompliant ? '✅ pass' : '❌ fail'}</div></div>
        </div>
      </div>
    </div>

    <h4 class="section">Score breakdown</h4>
    <div class="bars">
      ${bar('Energy & carbon', sc.breakdown.energy)}
      ${bar('Water', sc.breakdown.water)}
      ${bar('Materials', sc.breakdown.materials)}
      ${bar('Health & comfort', sc.breakdown.health)}
      ${bar('Place & planning', sc.breakdown.place)}
      ${bar('Connectivity', sc.breakdown.connectivity)}
    </div>

    <h4 class="section">EDGE-style resource savings (≥20% each to certify)</h4>
    <div class="bars">
      ${edgeBar('Energy', en.edge.pillars.energy)}
      ${edgeBar('Water', en.edge.pillars.water)}
      ${edgeBar('Materials (embodied)', en.edge.pillars.materials)}
    </div>

    <h4 class="section">Building Regulations & Approved Documents</h4>
    ${findingsList(report.regulations.findings)}

    <h4 class="section">Energy — Part L & Future Homes Standard</h4>
    ${findingsList(en.partL.findings)}

    <h4 class="section">Planning policy</h4>
    ${findingsList(report.planning.findings)}

    <h4 class="section">Applicable aspirational certifications</h4>
    <div class="schemes">${report.certifications.applicable.map(schemeCard).join('')}</div>
    ${report.certifications.notApplicable.length ? `<p class="muted" style="margin-top:12px">Not applicable to this residential project:</p>
      <div class="na-list">${report.certifications.notApplicable.map((s) => `<span class="na-pill" title="${esc(s.reason)}">${esc(s.name)}</span>`).join('')}</div>` : ''}

    <h4 class="section">Prioritised recommendations</h4>
    <ul class="recs">${report.recommendations.length
      ? report.recommendations.map((r) => `<li class="rec"><span class="prio ${r.priority}">${r.priority}</span><span><strong>${esc(r.area)}:</strong> ${esc(r.action)}</span></li>`).join('')
      : '<li class="muted">No outstanding recommendations — strong scheme.</li>'}</ul>
  `;
  el.innerHTML = html;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function edgeBar(label, pillar) {
  const v = Math.max(0, Math.min(100, pillar.saving));
  return `<div class="bar-row"><span>${esc(label)}</span><span class="bar-track"><span class="bar-fill" style="width:${v}%;${pillar.saving >= 20 ? '' : 'background:linear-gradient(90deg,#e0a32e,#e0563f)'}"></span></span><span>${pillar.saving}%</span></div>`;
}

// ---- Bootstrap ------------------------------------------------------------
async function init() {
  try {
    DEFAULTS = await (await fetch('/api/default-project')).json();
  } catch { DEFAULTS = {}; }
  buildForm(DEFAULTS);

  // Sample loader
  try {
    const samples = await (await fetch('/api/samples')).json();
    const sel = $('#sample');
    sel.innerHTML = '<option value="">— load an example —</option>'
      + Object.entries(samples).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
    sel.addEventListener('change', () => {
      if (samples[sel.value]) buildForm({ ...DEFAULTS, ...samples[sel.value] });
    });
  } catch { /* samples optional */ }

  $('#assessBtn').addEventListener('click', assess);
  $('#disclaimer').textContent = 'ResiCert is an indicative pre-assessment for early design & education — not a SAP/EPC calculation, Building Control approval, or formal certification. Verify against current local requirements.';
}

init();
