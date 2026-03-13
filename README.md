# OTSniffer (Netlify Deployment)

This project is designed to run on **Netlify**.

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

## Netlify notes

- No local database required.
- All compute is handled in serverless function `netlify/functions/analyze.js`.
- Frontend is static `web/index.html`.

## Python tests (repository validation)

```bash
pytest -q
```
