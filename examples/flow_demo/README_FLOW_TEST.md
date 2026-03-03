# ICRS Flow Test Artifacts (v0.4.0)

Use this folder to run a deterministic end-to-end UI walkthrough.

## Files
- `01_assets.csv`: OT assets for demo plant.
- `02_connections.csv`: trust-boundary connections for simulation.
- `03_public_ips_template.csv`: optional Shodan input IPs.
- `expected_risk_heatmap.csv`: expected risk ranking after simulation.
- `expected_top_paths.csv`: expected top propagation paths.
- `expected_financials.json`: expected downtime + exposure outputs.

## UI Walkthrough
1. Start app:
   ```bash
   streamlit run app.py
   ```
2. In sidebar Project Setup:
   - Client Name: `Demo Manufacturing`
   - Site / Plant: `Plant-A`
   - Downtime cost per hour: `25000`
   - Click **Start New Engagement**.
3. Step 1 — Input System Reality:
   - Upload `01_assets.csv`
   - Upload `02_connections.csv`
   - Click **Save OT Topology**
4. (Optional) Shodan:
   - Upload `03_public_ips_template.csv`
   - Click **Run Shodan Enrichment** (requires `SHODAN_API_KEY`)
5. Step 2 — Run Risk Simulation:
   - Initial compromise asset: `FW1`
   - Top paths to show: `10`
   - Keep default recovery assumptions
   - Click **Compute Risk**
6. Step 3 — compare output with expected files:
   - Risk heatmap table vs `expected_risk_heatmap.csv`
   - Top propagation paths vs `expected_top_paths.csv`
   - KPI cards vs `expected_financials.json`
7. Step 4 — export:
   - Click **Generate Executive ... Report**
   - Download and store report artifact.

## Notes
- Expected files are generated from current engine logic and default assumptions.
- Shodan enrichment is optional and depends on API/network access.
- This is authorized defensive analysis workflow only.
