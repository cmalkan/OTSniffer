# OTSniffer

OTSniffer is a Streamlit app for **real-time OT cyber risk analysis** using:

- **SBOM/software exposure** (what is exploitable)
- **Network architecture** (what is reachable)

It scores each asset and shows what to fix first.

## Features

- Command-deck style UI with mission controls in sidebar
- Demo mode (instant run) + file upload mode
- SBOM JSON + network CSV parsing
- Per-asset risk ranking and portfolio metrics
- CSV export of risk ranking
- Optional Shodan connectivity panel (`SHODAN_API_KEY`)

## Install

```bash
pip install -r requirements.txt
```

## Run

```bash
export SHODAN_API_KEY="YOUR_SHODAN_API_KEY"   # optional
streamlit run dashboard.py
```

Open http://localhost:8501

## Inputs

### SBOM JSON

```json
{
  "components": [
    {
      "name": "PLC-1",
      "asset_type": "plc",
      "exposed_to_internet": true,
      "vulnerabilities": [{"severity": "critical"}]
    }
  ]
}
```

### Network CSV

```csv
source,target,zone_trust,segmentation_strength
Internet,PLC-1,untrusted,0.1
```

`zone_trust`: `untrusted|dmz|trusted`  
`segmentation_strength`: `0..1` where `1` means strong segmentation.

## Tests

```bash
pytest -q
```
