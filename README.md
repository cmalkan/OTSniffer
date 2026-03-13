# OTSniffer — Netlify OT Blast Radius Demo

Netlify-first OT cyber simulation demo focused on **post-DMZ operational impact**.

## Architecture (single Netlify deployment)

- Static frontend: `web/index.html`
- Serverless APIs: `netlify/functions/*.js`
- Shared simulation engine modules:
  - `netlify/functions/_shared/data.js`
  - `netlify/functions/_shared/simulation.js`
  - `netlify/functions/_shared/scoring.js`
- Demo plant fixture: `data/plant-demo.json`

No local DB, no separate backend hosting.

## API contracts

### POST `/api/simulate/blast-radius`
Request:

```json
{
  "start_asset_id": "a_eng_01",
  "max_depth": 6,
  "include_vulnerabilities": true,
  "include_zone_barriers": true,
  "mode": "analyst"
}
```

Response includes:
- start asset metadata
- impacted assets / zones / process functions
- controller reachability
- attack paths and explanations
- segmentation barriers encountered
- exploitable vulnerabilities
- blast radius, risk, operational impact, confidence, severity
- analyst + executive summaries

### GET `/api/simulate/top-scenarios`
Returns ranked scenarios (engineering workstation, HMI, etc.) with risk and impact summaries.

### GET `/api/assets/:assetId/paths`
Returns path drilldowns from the selected compromised asset.

### GET `/api/assets/:assetId/risk`
Returns risk/severity summary for the selected compromised asset.

### GET `/api/scenarios/prebuilt`
Returns deterministic prebuilt scenario definitions from fixture data.

## Netlify deployment

1. Push repo to GitHub.
2. Netlify → Add new site → Import existing project.
3. Build settings from `netlify.toml`:
   - build command: `npm run build`
   - publish directory: `web`
   - functions directory: `netlify/functions`
4. Deploy.

Optional env var:
- `SHODAN_API_KEY` (enables component-level Shodan check enrichment)

## Verification

```bash
npm run build
npm test
pytest -q
```

Function smoke test:

```bash
node -e "const h=require('./netlify/functions/simulate-blast-radius.js').handler; h({httpMethod:'POST',body:JSON.stringify({start_asset_id:'a_eng_01',max_depth:6,include_vulnerabilities:true,include_zone_barriers:true,mode:'analyst'})}).then(r=>console.log(r.statusCode, JSON.parse(r.body).severity_label))"
```

## Month 3 UI readiness

APIs are intentionally verbose to support dense analyst UX:
- table views
- path drilldowns
- scenario comparisons
- scoring decomposition panels
- explorable rationale metadata
