# OTSniffer

Marketing-friendly OT visibility demo using aggregates only.

This is a minimal Flask app (single dependency) with demo data to explore OT exposure trends by industry and country. It avoids raw IP/host details and focuses on safe, aggregated insights suitable for marketing.

## Quickstart\n\n1. Python 3.10+\n2. Install Streamlit\n\n   ```powershell\n   cd "G:\\My Drive\\Ghar Files\\4. B2 Docs\\Tech Projects\\Idea91 OTSniffer"\n   py -3 -m venv .venv\n   .venv\\Scripts\\Activate.ps1\n   pip install -r requirements.txt\n   ```\n\n3. Run the app:\n\n   ```powershell\n   streamlit run streamlit_app.py\n   # open http://localhost:8501\n   ```\n\n## Notes
- Demo mode only; data in `data/demo_data.json`
- Aggregates only (industries, countries, vendors, timeline)
- Exports: CSV for aggregates
- Charts: Chart.js via CDN (no Python deps)

## Next
- Add Shodan aggregate client with `SHODAN_API_KEY` (facets: country, product)
- Saved presets and narrative exports (PNG/PDF)
- Compliance lock to always redact raw details

## Docker

Build and run with Docker:

```powershell
cd "G:\\My Drive\\Ghar Files\\4. B2 Docs\\Tech Projects\\Idea91 OTSniffer"
docker build -t otsniffer:latest .
docker run --rm -p 8501:8501 -e PORT=5000 -e FLASK_DEBUG=0 otsniffer:latest
# open http://localhost:8501
```

Or with Docker Compose:

```powershell
cd "G:\\My Drive\\Ghar Files\\4. B2 Docs\\Tech Projects\\Idea91 OTSniffer"
docker compose up --build
```

