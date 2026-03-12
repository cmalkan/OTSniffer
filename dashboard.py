"""Legacy Streamlit entrypoint.

Netlify is now the primary UI path. This file remains only as a compatibility shim.
"""

import streamlit as st


def main() -> None:
    st.set_page_config(page_title="OTSniffer (legacy)", page_icon="⚡")
    st.title("OTSniffer")
    st.info("Streamlit is deprecated for this project. Use the Netlify UI (`web/` + `netlify/functions/`) instead.")
    st.code(
        """Netlify deploy quickstart:
1) Push repo to GitHub
2) Import project in Netlify
3) Publish dir: web
4) Functions dir: netlify/functions
"""
    )


if __name__ == "__main__":
    main()
