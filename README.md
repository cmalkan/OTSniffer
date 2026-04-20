# OTSniffer — Netlify OT Blast Radius Demo

Dense analyst-grade OT cyber simulation demo for Netlify.

## Deployment model (unchanged)
- Single repository
- Single Netlify deployment
- Static frontend under `web/`
- Netlify Functions under `netlify/functions/`
- JSON fixture data under `data/`
- No external backend hosting or local DB dependency

## Frontend route/page structure
- `/index.html` — Operations Dashboard
- `/scenario-explorer.html` — Scenario Explorer
- `/network-graph.html` — Network / Graph View
- `/asset-detail.html` — Asset Detail View
- `/scenario-comparison.html` — Scenario Comparison View

## API route mapping (Netlify redirects)
- `POST /api/analyze` → `/.netlify/functions/analyze`
- `POST /api/simulate/blast-radius` → `/.netlify/functions/simulate-blast-radius`
- `GET /api/simulate/top-scenarios` → `/.netlify/functions/simulate-top-scenarios`
- `GET /api/assets/:assetId/paths` → `/.netlify/functions/assets-paths?assetId=:assetId`
- `GET /api/assets/:assetId/risk` → `/.netlify/functions/assets-risk?assetId=:assetId`
- `GET /api/scenarios/prebuilt` → `/.netlify/functions/scenarios-prebuilt`

## Shared simulation services
- `netlify/functions/_shared/data.js` — fixture loading + indexing
- `netlify/functions/_shared/scoring.js` — explainable scoring factors
- `netlify/functions/_shared/simulation.js` — traversal, attack paths, summaries

## Dense analyst UI coverage
- Operations dashboard: top scenarios, risk distribution, controller summaries, process exposure tables
- Scenario explorer: impacted assets/zones/processes tables, path list, detail drawer, barrier list, vulnerability panel, score breakdown
- Network view: graph panel + controls + selected node/edge metadata + path focus
- Asset view: metadata, vulnerabilities, connections, downstream reachability, scenario membership
- Scenario comparison: side-by-side metrics and score decomposition

## Service packaging (Malkan Solutions LLC)

Four productized tiers. Buyer-facing names; internal T-codes retained for SOW plumbing only. Full spec, value quantification, and funding-source map in [`docs/tiers-and-glossary.md`](docs/tiers-and-glossary.md).

| Code | Buyer name | Duration | Anchor price |
|---|---|---|---|
| T1 | **Evidence Pack** | 1 week | $7,500 |
| T2 | **Impact Map** | 3–4 weeks | $35,000 |
| T3 | **Proven Pathways** | 6–8 weeks | $95,000 |
| T4 | **Posture Watch** | Retainer | $4,500/mo |

## Evidence Toolchain (`otsniff`)

OTSniffer ships with an evidence-graded assessment toolchain under `scripts/otsniff/`. It chains open-source scanners into a normalized findings pipeline that feeds the existing risk engine and blast-radius simulation, so scenario scores are backed by real evidence rather than fixture data.

Pipeline phases:
```
INGEST → STATIC SCAN → EXTERNAL RECON → LAB VALIDATION → ENRICH → SCORE/SIM → REPORT
```

v0.1 ships `scan:secrets` (credential / API-key leak detection with a built-in fallback) and `merge` (idempotent enrichment of a plant fixture). Future phases: supply-chain scan, mesh audit, external attack-surface recon, lab-only credential validation, PDF report.

Normalized finding schema (`scripts/otsniff/schema.mjs`): `{ finding_id, asset_id, finding_type, severity, evidence, source_tool, detected_at, confidence }`.

```bash
# End-to-end demo run (Docker-based):
docker compose -f compose.toolchain.yml run --rm otsniff scan:secrets \
  --target /app/data --out /app/data/findings.json
docker compose -f compose.toolchain.yml run --rm otsniff merge \
  --plant /app/data/plant-demo.json \
  --findings /app/data/findings.json \
  --out /app/data/plant-enriched.json
```

Guardrails: active / lab-only phases (credential validation, path validation) are gated behind `LAB_MODE=1` and never invoked from Netlify Functions.

## Verification
All npm and Python work runs inside Docker via `compose.toolchain.yml`:
```bash
docker compose -f compose.toolchain.yml run --rm node npm run build
docker compose -f compose.toolchain.yml run --rm node npm test
docker compose -f compose.toolchain.yml run --rm py pytest -q
```

Function smoke tests:
```bash
node -e "const h=require('./netlify/functions/simulate-blast-radius.js').handler; h({httpMethod:'POST',body:JSON.stringify({start_asset_id:'a_eng_01',max_depth:6,include_vulnerabilities:true,include_zone_barriers:true,mode:'analyst'})}).then(r=>console.log(r.statusCode, JSON.parse(r.body).severity_label))"
```

## Netlify deployment
1. Push repo to GitHub.
2. Netlify → Add new site → Import existing project.
3. Build settings come from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `web`
   - Functions directory: `netlify/functions`
4. Deploy.

Optional env var:
- `SHODAN_API_KEY` to enable component-level Shodan enrichment.
