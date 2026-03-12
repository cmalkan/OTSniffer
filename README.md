# OTSniffer (Netlify-first)

This project is now **Netlify-first** (not Streamlit-first).

The previous Streamlit runtime error (`ModuleNotFoundError: pypdf`) is avoided by removing that dependency from the active path. The analyzer now runs through:

- `web/index.html` (frontend UI)
- `netlify/functions/analyze.js` (serverless risk API)

## Deploy on Netlify

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import existing project**.
3. Use these settings:
   - Publish directory: `web`
   - Functions directory: `netlify/functions`
4. Deploy.

Optional for live component lookups:
- Add environment variable `SHODAN_API_KEY` in Netlify site settings.

## What the Netlify app supports

- SBOM JSON ingestion
- Network ingestion from:
  - CSV (`source,target,zone_trust,segmentation_strength`)
  - PDF extracted text patterns (e.g., `Level 5 Internet -> L3 DMZ`)
- Portfolio risk scoring
- Asset ranking + VIT score visibility
- Purdue-style graphical network view
- Optional real-time Shodan search per SBOM component

## Local checks

```bash
pytest -q
node -e "const h=require('./netlify/functions/analyze.js').handler; h({httpMethod:'POST',body:JSON.stringify({sbom:{components:[{name:'PLC-1',asset_type:'plc',exposed_to_internet:true,vulnerabilities:[{severity:'critical'}]}]},network_csv:'source,target,zone_trust,segmentation_strength\nInternet,PLC-1,untrusted,0.1'})}).then(r=>console.log(r.statusCode))"
```

## Legacy Streamlit

`dashboard.py` is now a compatibility shim that points users to Netlify deployment.
