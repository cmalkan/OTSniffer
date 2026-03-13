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

## Verification
```bash
npm run build
npm test
pytest -q
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
