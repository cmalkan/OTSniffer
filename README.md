# OTSniffer (Netlify Deployment)

This project is designed to run on **Netlify** and presents a command-center UI with a Malkan-style dark blue palette.

## Deploy to Netlify

1. Push this repository to GitHub.
2. In Netlify, choose **Add new site** → **Import an existing project**.
3. Select this repo.
4. Netlify build settings (or from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `web`
   - Functions directory: `netlify/functions`
5. Deploy.

## Runtime endpoints (on Netlify)

- `POST /api/analyze`
- `POST /.netlify/functions/analyze`

`/api/analyze` redirects to the Netlify function path.

## UI capabilities

- SBOM JSON input
- Network CSV or PDF-extract text input
- Portfolio KPI snapshot
- Tabs for Risk Ranking, Network Graph data, SBOM VIT, and Shodan
- Optional Shodan component checks if `SHODAN_API_KEY` is configured in Netlify env vars

## Python tests (repository validation)

```bash
pytest -q
```
