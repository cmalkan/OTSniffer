"""Minimal OT Sniffer dashboard using Shodan."""

import os
from typing import Dict

import shodan
import streamlit as st


# Common critical infrastructure queries for quick exploration.
INDUSTRY_QUERIES: Dict[str, str] = {
    "Energy": "tag:ics energy",
    "Water": "tag:ics water",
    "Healthcare": "tag:ics medical",
    "Transportation": "tag:ics transportation",
    "Manufacturing": "tag:ics manufacturing",
}


def main() -> None:
    st.title("OTSniffer Dashboard")

    api_key = os.getenv("SHODAN_API_KEY")
    if not api_key:
        st.error("Missing SHODAN_API_KEY environment variable")
        return

    api = shodan.Shodan(api_key)

    industry = st.selectbox("Industry", list(INDUSTRY_QUERIES))
    country = st.text_input("Country code", placeholder="e.g. US")

    if st.button("Search"):
        query = INDUSTRY_QUERIES[industry]
        if country:
            query += f" country:{country}"
        try:
            results = api.search(query, limit=20)
            st.write(f"Results found: {results['total']}")
            for match in results.get("matches", []):
                ip = match.get("ip_str")
                org = match.get("org") or "N/A"
                product = match.get("product") or "N/A"
                st.write(f"{ip} — {org} — {product}")
        except shodan.APIError as exc:
            st.error(str(exc))


if __name__ == "__main__":
    main()
