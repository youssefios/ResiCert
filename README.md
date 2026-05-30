# ResiCert 🏡

**A UK residential sustainability & compliance certification system — an EDGE-style tool adapted for the UK.**

ResiCert takes a residential project's design data and produces an indicative
certification report covering:

1. **UK Building Regulations & Approved Documents** (England Parts A–S + Reg 7)
   — the mandatory compliance baseline.
2. **Energy / EPC & Part L** — an EDGE-style three-pillar resource-efficiency
   assessment (energy, water, embodied carbon), an indicative EPC band, Part L
   2021 target-rate screening and **Future Homes Standard** readiness.
3. **Planning policy** — Nationally Described Space Standard, Biodiversity Net
   Gain, SuDS, accessible-housing mix, daylight, cycle storage.
4. **Aspirational (voluntary) certifications** — BREEAM, Home Quality Mark,
   Passivhaus, WELL, Fitwel, WiredScore Home, SmartScore, LEED Residential and
   Building with Nature — **shown only when applicable to residential**, each
   with a readiness pre-screen. Schemes that are not residential (e.g. NABERS
   UK, currently offices) are explicitly flagged as not applicable.

It then rolls everything into a single **ResiCert score (0–100)** and an award
level.

> ⚠️ **Disclaimer.** ResiCert is an *indicative pre-assessment* for early-stage
> design and education. It is **not** a SAP/EPC calculation, **not** Building
> Control approval, and **not** a substitute for accredited assessors (SAP,
> BREEAM, Passivhaus, fire, acoustics) or formal certification. Building
> Regulations and planning requirements differ across England, Wales, Scotland
> and Northern Ireland and change over time — always verify against the current
> local requirements.

---

## Running it

ResiCert is intentionally **zero-dependency** — it runs on a stock Node.js
(≥ 20) with nothing to `npm install`. This keeps it usable in locked-down /
offline environments.

```bash
# Start the web app
npm start
# → ResiCert running → http://127.0.0.1:3000

# Or with auto-reload during development
npm run dev

# Run the test suite (Node's built-in test runner)
npm test

# Run the engine over the bundled sample projects from the CLI
npm run assess:sample
node scripts/assess-sample.js btr-apartment-block
node scripts/assess-sample.js ./my-project.json
```

Then open **http://127.0.0.1:3000**, load one of the example projects (or fill
in your own), and press **Assess**.

---

## How the award works

Two gates apply before any award is given:

1. **Building Regulations compliance.** A scheme that fails a mandatory
   Approved Document is reported as **Not certifiable** until resolved — you
   can't put a sustainability badge on a building that fails the law.
2. **The EDGE efficiency bar.** Following IFC's EDGE logic, a scheme must
   achieve **≥ 20 % saving in each** of energy, water and embodied carbon
   (materials) versus the UK base case to move beyond *Compliant*.

| Level | Requirement (indicative) |
|---|---|
| **Not certifiable** | Fails one or more mandatory Building Regs |
| **Compliant (not yet certified)** | Meets the Regs but not the 3×20 % efficiency bar |
| **Certified** | Regs + 3×20 % efficiency, overall score ≥ 50 |
| **Silver** | overall ≥ 65 |
| **Gold** | overall ≥ 78 |
| **Platinum** | overall ≥ 90 |
| **… — Zero Carbon** | as above **and** net-zero regulated operational carbon |

The overall score is a weighted average of six sub-scores: energy & carbon
(30 %), water (15 %), materials (15 %), health & comfort (15 %), place &
planning (15 %), connectivity (10 %).

---

## Architecture

```
src/
  server.js                     Zero-dependency HTTP server (static + JSON API)
  engine/
    index.js                    runAssessment() orchestrator
    types.js                    Canonical Project model + defaults + normalisation
    util.js                     Scoring/finding helpers
    scoring.js                  Overall score & award level
    regulations/
      approvedDocuments.js      Reference catalogue of Approved Documents A–S
      evaluate.js               Compliance checks (Part L, F, G, O, M, S, R, Q, E, B …)
    energy/
      model.js                  Transparent simplified energy model
      epc.js                    Indicative EPC band/score
      partL.js                  Part L 2021 target rates + Future Homes Standard
      edge.js                   EDGE-style energy/water/materials savings
    planning/
      policy.js                 NDSS, BNG, SuDS, accessibility, daylight, cycle
    certifications/
      schemes.js                Scheme catalogue + applicability + readiness
      applicability.js          Selects applicable schemes for the project
  data/
    sampleProjects.js           Example projects (baseline → net-zero block)
  web/                          Vanilla single-page UI (no framework)
scripts/
  assess-sample.js              CLI smoke test
test/                           node:test suites
```

### JSON API

| Method & path | Purpose |
|---|---|
| `POST /api/assess` | Body = a `Project` (partial OK) → full report |
| `GET /api/default-project` | A fully-populated default `Project` |
| `GET /api/samples` | The sample-project library |
| `GET /api/schemes` | Certification scheme catalogue |
| `GET /api/approved-documents` | Approved Documents reference list |

---

## What's modelled (and what isn't)

**Modelled quantitatively:** Part L limiting fabric values; Part L 2021 target
emission/primary-energy rates (via a notional dwelling); Part F ventilation
suitability vs airtightness; Part G2 water efficiency (125 / 110 L·p⁻¹·day⁻¹);
Part O overheating (simplified-method screening); Part M/S/R/Q/E/B triggers;
indicative EPC; EDGE energy/water/materials savings; NDSS space standards; BNG;
scheme readiness.

**Reference / qualitative only (confirm in detailed design & Building
Control):** Parts A, C, D, H, J, K, P and Regulation 7.

**Out of scope:** a full SAP 10 / Home Energy Model calculation, dynamic
thermal modelling (CIBSE TM59), full fire-engineering, acoustic testing, and
the detailed local-plan policies that vary by authority. The energy model is a
documented steady-state approximation for early-design screening only.

### Devolved nations

ResiCert encodes the **England** Approved Documents in detail. For Wales,
Scotland (Technical Handbooks) and Northern Ireland (Technical Booklets) the
England thresholds are applied as *indicative only* and clearly flagged.

---

## Licence

MIT.
