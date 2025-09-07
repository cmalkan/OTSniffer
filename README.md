# OTSniffer

Marketing-friendly OT visibility demo using aggregates only.

This is a minimal Flask app (single dependency) with demo data to explore OT exposure trends by industry and country. It avoids raw IP/host details and focuses on safe, aggregated insights suitable for marketing.

## Quickstart

1. Python 3.10+
2. Create a virtual env and install deps:

   Windows (PowerShell):
   ```powershell
   cd "G:\My Drive\Ghar Files\4. B2 Docs\Tech Projects\Idea91 OTSniffer"
   py -3 -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Run the app:
   ```powershell
   python app.py
   # open http://localhost:5000
   ```

## Notes
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
docker run --rm -p 5000:5000 -e PORT=5000 -e FLASK_DEBUG=0 otsniffer:latest
# open http://localhost:5000
```

Or with Docker Compose:

```powershell
cd "G:\\My Drive\\Ghar Files\\4. B2 Docs\\Tech Projects\\Idea91 OTSniffer"
docker compose up --build
```
