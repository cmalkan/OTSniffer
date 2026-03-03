# Industrial Cyber Risk Simulation (ICRS) - Streamlit MVP

ICRS is a defensive OT risk modeling product for manufacturers. It combines OT topology ingestion, Shodan exposure enrichment, attack propagation simulation, and downtime-to-financial impact estimation.

## 1) System architecture summary

### First-principles decomposition
- **Input reality**: OT assets + trust boundaries + external exposure.
- **Computation core**: Graph propagation probabilities constrained by segmentation and protocol risk.
- **Business output**: Expected downtime and financial exposure ranges.
- **Decision support**: Executive-ready report for repeatable productized engagements.

### Module boundaries
- `app.py`: Streamlit UI only (engagement workflow, forms, rendering).
- `risk_engine.py`: Graph creation, propagation scoring, chokepoints, path ranking, financial model.
- `shodan_integration.py`: Defensive Shodan lookups and exposure normalization.
- `database.py` + `data_models.py`: SQLite persistence abstraction (SQLAlchemy).
- `report_generator.py`: PDF report generation.

This separation keeps business logic out of UI code and enables migration to API services later.

## 2) Features delivered

### Productized engagement workflow
- Create engagement (client/site/cost per hour downtime).
- Load historical engagements from local SQLite.

### OT ingestion
- Upload `assets.csv` with:
  - `id, hostname, ip, type, criticality, vendor, firmware_version, zone`
- Upload `connections.csv` with:
  - `src_asset_id, dst_asset_id, protocol, port, segmentation_boundary`

### Shodan enrichment (defensive only)
- Upload public IP CSV or enter comma-separated IPs.
- Pull open ports, services, vulnerabilities (if available), last update timestamp.
- Risk weighting:
  - High: exposed remote admin patterns (RDP/SSH/Telnet)
  - Medium: exposed web/admin surfaces
  - Low: otherwise
- No scanning beyond Shodan API queries.

### Risk simulation engine
- Directed graph model with NetworkX.
- Initial compromise node selector.
- Propagation scoring via BFS with:
  - segmentation reduction factors
  - remote admin protocol multipliers
- Outputs:
  - node compromise probabilities
  - top 10 propagation paths
  - containment chokepoints

### Downtime + financial model
- Recovery time mapping by criticality.
- Expected downtime = `sum(probability * recovery_hours)`.
- Exposure scenarios:
  - Best case = 0.5x
  - Base case = 1x
  - Worst case = 2x

### Visualizations
- Blast radius graph (Plotly).
- Risk heatmap table.
- External exposure summary.
- Financial summary cards.

### Executive report export
- PDF includes:
  - executive financial summary
  - Shodan findings
  - blast radius snapshot
  - top propagation paths
  - containment recommendations
  - defensive-use disclaimer

## 3) Project layout

```
/app.py
/risk_engine.py
/shodan_integration.py
/data_models.py
/report_generator.py
/database.py
/examples/
/tests/
/requirements.txt
```

## 4) Run locally

1. Use Python 3.11.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set Shodan key:
   ```bash
   export SHODAN_API_KEY="<your_key>"
   ```
4. Start app:
   ```bash
   streamlit run app.py
   ```
5. Open Streamlit URL and:
   - create/load engagement
   - upload `examples/assets.csv`
   - upload `examples/connections.csv`
   - optionally run Shodan with `examples/public_ips.csv`

## 5) Test

```bash
pytest -q
```

## 6) Evolution path (post-MVP)

### Move to FastAPI backend
- Extract services from `risk_engine.py`, `shodan_integration.py`, and `database.py` into API routes.
- Keep Streamlit as client initially, then replace with React or internal portal as needed.
- Add async workers for expensive simulations/report generation.

### Multi-tenant SaaS
- Add tenant/org tables and foreign keys on all engagement-linked entities.
- Enforce tenant scoping in every query.
- Move SQLite to Postgres.

### Enterprise auth
- Add OIDC/SAML SSO (Okta/Azure AD).
- Role model: Analyst, Manager, Executive, Admin.
- Add audit logging and policy controls.

## Safety disclaimer
This software is for authorized defensive risk analysis only.

## 7) Flow test artifacts

A deterministic walkthrough dataset is available under `examples/flow_demo/` to validate the full UI flow.

- Walkthrough guide: `examples/flow_demo/README_FLOW_TEST.md`
- Input files: `01_assets.csv`, `02_connections.csv`, `03_public_ips_template.csv`
- Expected outputs: `expected_risk_heatmap.csv`, `expected_top_paths.csv`, `expected_financials.json`
