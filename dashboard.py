"""Legacy Streamlit entrypoint.

Netlify + Next.js is now the primary UI path. This file remains only as a compatibility shim.
"""

import streamlit as st


def main() -> None:
    st.set_page_config(page_title="OTSniffer (legacy)", page_icon="⚡")
    st.title("OTSniffer")
    st.info("Streamlit is deprecated for this project. Use the Next.js Netlify app instead.")
    st.code(
        """Netlify deploy quickstart:
1) Push repo to GitHub
2) Import project in Netlify
3) Build command: npm run build
4) Netlify plugin: @netlify/plugin-nextjs (from netlify.toml)
"""
    )


if __name__ == "__main__":
    main()
