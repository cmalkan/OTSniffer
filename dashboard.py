"""OTSniffer Streamlit app: real-time OT risk analysis from SBOM + network architecture."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import pandas as pd
import requests
import shodan
import streamlit as st

from risk_engine import compute_risk, parse_network_csv, parse_sbom_json


DEMO_SBOM = {
    "components": [
        {
            "name": "PLC-Line-01",
            "version": "3.1.0",
            "asset_type": "plc",
            "exposed_to_internet": True,
            "vulnerabilities": [{"severity": "critical"}, {"severity": "high"}],
        },
        {
            "name": "SCADA-Master",
            "version": "9.4",
            "asset_type": "scada",
            "exposed_to_internet": False,
            "vulnerabilities": [{"severity": "high"}],
        },
        {
            "name": "HMI-Packaging",
            "version": "2.0",
            "asset_type": "hmi",
            "vulnerabilities": [{"severity": "medium"}],
        },
        {
            "name": "Patch-Server",
            "version": "1.6",
            "asset_type": "other",
            "vulnerabilities": [{"severity": "low"}],
        },
    ]
}

DEMO_NETWORK = (
    "source,target,zone_trust,segmentation_strength\n"
    "Internet,PLC-Line-01,untrusted,0.1\n"
    "DMZ,SCADA-Master,dmz,0.45\n"
    "SCADA-Master,HMI-Packaging,trusted,0.7\n"
    "IT,Patch-Server,trusted,0.8\n"
)


def _init_page() -> None:
    st.set_page_config(page_title="OTSniffer", page_icon="⚡", layout="wide")
    st.markdown(
        """
        <style>
        .block-container {padding-top: 1.5rem;}
        .big-text {font-size: 1.05rem; color: #9aa4b2;}
        </style>
        """,
        unsafe_allow_html=True,
    )
    st.title("⚡ OTSniffer Command Deck")
    st.markdown(
        '<p class="big-text">Build software that sees reality: risk = exploitability × reachability × criticality.</p>',
        unsafe_allow_html=True,
    )


def _render_sidebar() -> tuple[bool, bool]:
    with st.sidebar:
        st.header("Mission Controls")
        use_demo = st.toggle("Use demo data", value=True)
        show_raw = st.toggle("Show raw parsed data", value=False)
        st.divider()
        st.caption(f"UTC: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}")
    return use_demo, show_raw


def _shodan_panel() -> None:
    api_key = os.getenv("SHODAN_API_KEY")
    with st.expander("Shodan connectivity", expanded=False):
        if not api_key:
            st.info("`SHODAN_API_KEY` not set. Risk engine works offline without Shodan.")
            return

        st.success("Shodan key detected via environment variable.")
        if st.button("Check external IP via Shodan", type="secondary"):
            try:
                response = requests.get(
                    "https://api.shodan.io/tools/myip", params={"key": api_key}, timeout=10
                )
                response.raise_for_status()
                st.write(f"External IP: `{response.text.strip()}`")
            except requests.RequestException as exc:
                st.error(f"Shodan IP lookup failed: {exc}")

        try:
            shodan.Shodan(api_key)
        except shodan.APIError as exc:
            st.warning(f"Shodan API client initialization error: {exc}")


def _load_inputs(use_demo: bool) -> tuple[str | None, str | None]:
    if use_demo:
        return json.dumps(DEMO_SBOM), DEMO_NETWORK

    c1, c2 = st.columns(2)
    with c1:
        sbom_file = st.file_uploader("Upload SBOM JSON", type=["json"])
    with c2:
        network_file = st.file_uploader("Upload network architecture CSV", type=["csv"])

    sbom_text = sbom_file.getvalue().decode("utf-8") if sbom_file else None
    network_text = network_file.getvalue().decode("utf-8") if network_file else None
    return sbom_text, network_text


def _risk_badge(score: float) -> str:
    if score >= 75:
        return "🔴 Critical"
    if score >= 50:
        return "🟠 High"
    if score >= 30:
        return "🟡 Elevated"
    return "🟢 Controlled"


def _render_results(assets: list[dict], links: list[dict], show_raw: bool) -> None:
    context = compute_risk(assets, links)

    st.subheader("Portfolio risk snapshot")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Overall Risk", f"{context.summary.overall_score}/100", _risk_badge(context.summary.overall_score))
    c2.metric("Max Asset Risk", f"{context.summary.max_asset_score}/100")
    c3.metric("Internet-Exposed Assets", context.summary.internet_exposed_count)
    c4.metric("Weak Untrusted Links", context.summary.critical_link_count)

    assets_df = pd.DataFrame(context.assets)
    links_df = pd.DataFrame(context.links)

    t1, t2, t3 = st.tabs(["Top Risk Assets", "Network Paths", "Export"])
    with t1:
        st.dataframe(assets_df, use_container_width=True, hide_index=True)
        if not assets_df.empty:
            top = assets_df.iloc[0]
            st.warning(
                f"Priority action: isolate/patch `{top['name']}` first (score {top['risk_score']})."
            )

    with t2:
        st.dataframe(links_df, use_container_width=True, hide_index=True)

    with t3:
        csv_bytes = assets_df.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="Download risk ranking (CSV)",
            data=csv_bytes,
            file_name="otsniffer_risk_ranking.csv",
            mime="text/csv",
        )

    if show_raw:
        st.subheader("Raw parsed inputs")
        r1, r2 = st.columns(2)
        with r1:
            st.json(assets)
        with r2:
            st.json(links)


def main() -> None:
    _init_page()
    use_demo, show_raw = _render_sidebar()
    _shodan_panel()

    st.subheader("Input pipeline")
    st.write("Feed SBOM + network architecture into the engine to get prioritized mitigation targets.")

    sbom_text, network_text = _load_inputs(use_demo)
    if not sbom_text or not network_text:
        st.info("Upload both SBOM JSON and network CSV, or enable demo data in the sidebar.")
        return

    try:
        assets = parse_sbom_json(sbom_text)
    except Exception as exc:  # noqa: BLE001
        st.error(f"SBOM parsing error: {exc}")
        return

    try:
        links = parse_network_csv(network_text)
    except Exception as exc:  # noqa: BLE001
        st.error(f"Network parsing error: {exc}")
        return

    if not assets:
        st.warning("No components were parsed from SBOM input.")
        return

    _render_results(assets, links, show_raw)


if __name__ == "__main__":
    main()
