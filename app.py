"""Streamlit UI for Industrial Cyber Risk Simulation (ICRS) MVP.

First-principles UX: Inputs -> Simulation -> Dollars -> Decision.
"""

from __future__ import annotations

import io
import os
from pathlib import Path

import pandas as pd
import streamlit as st

from database import (
    get_session,
    init_db,
    list_engagements,
    load_engagement_data,
    save_assets,
    save_connections,
    save_engagement,
    save_exposure,
    save_report_record,
    save_risk_results,
)
from report_generator import build_executive_report, report_format
from risk_engine import (
    compute_chokepoints,
    compute_financial_exposure,
    compute_top_paths,
    connections_to_graph,
    graph_to_plotly,
    propagation_bfs,
    risk_heatmap,
)
from shodan_integration import enrich_ip_list

st.set_page_config(page_title="ICRS", layout="wide")

APP_VERSION = "v0.4.0"

ASSET_COLUMNS = ["id", "hostname", "ip", "type", "criticality", "vendor", "firmware_version", "zone"]
CONNECTION_COLUMNS = ["src_asset_id", "dst_asset_id", "protocol", "port", "segmentation_boundary"]


def _parse_csv(uploaded_file: io.BytesIO | None) -> pd.DataFrame:
    if not uploaded_file:
        return pd.DataFrame()
    return pd.read_csv(uploaded_file)


def _validate_columns(df: pd.DataFrame, expected: list[str], dataset_name: str) -> tuple[bool, str]:
    missing = [c for c in expected if c not in df.columns]
    if missing:
        return False, f"{dataset_name} missing columns: {', '.join(missing)}"
    return True, ""


def _workflow_guide() -> None:
    st.info(
        """
**What is an engagement?**
An **engagement** is one analysis project for one client site (ex: `Acme - Plant 3`) with one downtime cost model.

**Flow (do this top to bottom):**
1. Create or load engagement (left sidebar)
2. Upload OT topology (assets + connections)
3. Optionally enrich public IPs with Shodan
4. Run simulation from an initial compromise node
5. Review downtime + financial exposure
6. Export executive report
        """
    )


def _engagement_panel(session) -> int | None:
    st.sidebar.header("Project Setup")
    st.sidebar.caption("Engagement = one client-site risk analysis run")

    client_name = st.sidebar.text_input("Client Name")
    site_name = st.sidebar.text_input("Site / Plant")
    cost_per_hour = st.sidebar.number_input("Downtime cost per hour ($)", min_value=0.0, value=25000.0, step=1000.0)

    if st.sidebar.button("Start New Engagement", use_container_width=True):
        if not client_name or not site_name:
            st.sidebar.error("Client and site are required.")
        else:
            engagement_id = save_engagement(session, client_name, site_name, cost_per_hour)
            st.session_state["engagement_id"] = engagement_id
            st.session_state["cost_per_hour"] = cost_per_hour
            st.sidebar.success(f"Started engagement #{engagement_id}")

    engagements = list_engagements(session)
    if engagements:
        selected = st.sidebar.selectbox(
            "Load Existing Engagement",
            options=engagements,
            format_func=lambda x: f"#{x['id']} | {x['client_name']} @ {x['site_name']}",
        )
        if st.sidebar.button("Load Engagement", use_container_width=True):
            st.session_state["engagement_id"] = selected["id"]
            st.session_state["cost_per_hour"] = selected["cost_per_hour"]

    return st.session_state.get("engagement_id")


def _input_stage(session, engagement_id: int) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    st.header("Step 1 — Input System Reality")
    st.caption("Upload OT assets + trust boundaries. Add optional external exposure context via Shodan.")

    left, right = st.columns(2)
    with left:
        st.subheader("A) OT topology")
        assets_file = st.file_uploader("Upload assets CSV", type=["csv"], key="assets")
        conns_file = st.file_uploader("Upload connections CSV", type=["csv"], key="connections")
        st.caption("Required columns: assets(id, hostname, ip, type, criticality, vendor, firmware_version, zone)")
        st.caption("Required columns: connections(src_asset_id, dst_asset_id, protocol, port, segmentation_boundary)")

        if st.button("Save OT Topology", type="primary", use_container_width=True):
            assets_df = _parse_csv(assets_file)
            conns_df = _parse_csv(conns_file)
            if assets_df.empty or conns_df.empty:
                st.error("Upload both assets and connections CSV.")
            else:
                ok_assets, msg_assets = _validate_columns(assets_df, ASSET_COLUMNS, "assets")
                ok_conns, msg_conns = _validate_columns(conns_df, CONNECTION_COLUMNS, "connections")
                if not ok_assets:
                    st.error(msg_assets)
                if not ok_conns:
                    st.error(msg_conns)
                if ok_assets and ok_conns:
                    save_assets(session, engagement_id, assets_df[ASSET_COLUMNS])
                    save_connections(session, engagement_id, conns_df[CONNECTION_COLUMNS])
                    st.success("OT topology saved.")

    with right:
        st.subheader("B) External exposure context (optional)")
        ip_file = st.file_uploader("Upload public IP CSV", type=["csv"], key="ips")
        manual_ips = st.text_area("Or enter comma-separated IPs")
        if st.button("Run Shodan Enrichment", use_container_width=True):
            ips: list[str] = []
            if ip_file:
                uploaded_df = pd.read_csv(ip_file)
                first_col = uploaded_df.columns[0]
                ips.extend(uploaded_df[first_col].dropna().astype(str).tolist())
            if manual_ips.strip():
                ips.extend([x.strip() for x in manual_ips.split(",") if x.strip()])

            if not ips:
                st.warning("Provide at least one public IP.")
            else:
                api_key = os.getenv("SHODAN_API_KEY")
                if not api_key:
                    st.error("SHODAN_API_KEY not set.")
                else:
                    exposure_df = enrich_ip_list(ips, api_key)
                    save_exposure(session, engagement_id, exposure_df)
                    st.success(f"Enriched {len(exposure_df)} IPs.")

    stored = load_engagement_data(session, engagement_id)
    assets_df, conns_df, exposure_df = stored["assets"], stored["connections"], stored["exposure"]

    k1, k2, k3 = st.columns(3)
    k1.metric("Assets loaded", int(len(assets_df)))
    k2.metric("Connections loaded", int(len(conns_df)))
    k3.metric("External IP records", int(len(exposure_df)))

    with st.expander("Preview loaded data"):
        if not assets_df.empty:
            st.markdown("**Assets**")
            st.dataframe(assets_df, use_container_width=True)
        if not conns_df.empty:
            st.markdown("**Connections**")
            st.dataframe(conns_df, use_container_width=True)
        if not exposure_df.empty:
            st.markdown("**External exposure**")
            st.dataframe(exposure_df, use_container_width=True)

    return assets_df, conns_df, exposure_df


def _simulation_stage(session, engagement_id: int, assets_df: pd.DataFrame, conns_df: pd.DataFrame):
    st.header("Step 2 — Run Risk Simulation")
    st.caption("Choose initial compromise and compute blast radius -> downtime -> financial exposure.")

    if assets_df.empty or conns_df.empty:
        st.info("Complete Step 1 first (save OT topology).")
        return None

    controls_left, controls_right = st.columns([2, 1])
    with controls_left:
        initial_node = st.selectbox("Initial compromise asset", assets_df["id"].astype(str).tolist())
    with controls_right:
        path_limit = st.slider("Top paths to show", min_value=5, max_value=20, value=10, step=1)

    default_recovery = {1: 4.0, 2: 8.0, 3: 16.0, 4: 36.0, 5: 72.0}
    with st.expander("Recovery-time assumptions (hours by criticality)"):
        cols = st.columns(5)
        recovery_map = {}
        for idx, c in enumerate([1, 2, 3, 4, 5]):
            recovery_map[c] = cols[idx].number_input(f"C{c}", min_value=0.0, value=float(default_recovery[c]), step=1.0)

    if not st.button("Compute Risk", type="primary", use_container_width=True):
        return None

    graph = connections_to_graph(assets_df, conns_df)
    node_scores = propagation_bfs(graph, str(initial_node))
    top_paths = compute_top_paths(graph, str(initial_node), limit=path_limit)
    chokepoints = compute_chokepoints(graph)
    heatmap_df = risk_heatmap(assets_df, node_scores)

    financials = compute_financial_exposure(
        heatmap_df[["id", "criticality", "compromise_probability"]],
        recovery_map,
        st.session_state.get("cost_per_hour", 0.0),
    )

    save_risk_results(session, engagement_id, heatmap_df, top_paths, chokepoints, financials)

    st.header("Step 3 — Decision Output")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Expected downtime (hrs)", f"{financials['expected_downtime_hours']:.1f}")
    m2.metric("Best-case exposure", f"${financials['best_exposure']:,.0f}")
    m3.metric("Base-case exposure", f"${financials['base_exposure']:,.0f}")
    m4.metric("Worst-case exposure", f"${financials['worst_exposure']:,.0f}")

    gv = graph_to_plotly(graph, node_scores)
    if hasattr(gv, "to_dict"):
        st.plotly_chart(gv, use_container_width=True)
    else:
        st.warning("Graph package unavailable; displaying edge list fallback.")
        st.dataframe(pd.DataFrame(gv), use_container_width=True)

    a, b, c = st.columns(3)
    with a:
        st.subheader("Risk heatmap")
        st.dataframe(heatmap_df[["id", "hostname", "criticality", "compromise_probability", "risk_score"]], use_container_width=True)
    with b:
        st.subheader("Top propagation paths")
        st.dataframe(pd.DataFrame(top_paths), use_container_width=True)
    with c:
        st.subheader("Containment chokepoints")
        st.dataframe(pd.DataFrame(chokepoints), use_container_width=True)

    return {
        "graph": graph,
        "node_scores": node_scores,
        "top_paths": top_paths,
        "chokepoints": chokepoints,
        "financials": financials,
    }


def _report_stage(session, engagement_id: int, exposure_df: pd.DataFrame, simulation_result: dict | None) -> None:
    st.header("Step 4 — Export Executive Artifact")
    st.caption("Generate a board-ready report with quantified downside and defensive recommendations.")

    if not simulation_result:
        st.info("Complete Step 2 first (compute risk) to enable export.")
        return

    ext = report_format()
    if st.button(f"Generate Executive {ext.upper()} Report", use_container_width=True):
        output_dir = Path("reports")
        output_dir.mkdir(exist_ok=True)
        report_path = output_dir / f"engagement_{engagement_id}_executive_report.{ext}"
        build_executive_report(
            report_path=report_path,
            engagement_id=engagement_id,
            exposure_df=exposure_df,
            top_paths=simulation_result["top_paths"],
            chokepoints=simulation_result["chokepoints"],
            financials=simulation_result["financials"],
            graph=simulation_result["graph"],
            node_scores=simulation_result["node_scores"],
        )
        save_report_record(session, engagement_id, str(report_path))
        st.success(f"Report generated: {report_path}")

        with open(report_path, "rb") as f:
            st.download_button(
                "Download report",
                data=f,
                file_name=report_path.name,
                mime="application/pdf" if report_path.suffix == ".pdf" else "text/plain",
                use_container_width=True,
            )


def main() -> None:
    init_db()
    st.title("Industrial Cyber Risk Simulation (ICRS)")
    st.markdown(f"**Release:** `{APP_VERSION}`")
    st.caption("Defensive OT risk computation: attack propagation -> downtime -> dollars.")
    st.sidebar.caption(f"ICRS {APP_VERSION}")

    _workflow_guide()

    session = get_session()
    engagement_id = _engagement_panel(session)
    if not engagement_id:
        st.info("Start or load an engagement from the sidebar.")
        return

    st.success(f"Active engagement #{engagement_id}")
    assets_df, conns_df, exposure_df = _input_stage(session, engagement_id)
    simulation_result = _simulation_stage(session, engagement_id, assets_df, conns_df)
    _report_stage(session, engagement_id, exposure_df, simulation_result)


if __name__ == "__main__":
    main()
