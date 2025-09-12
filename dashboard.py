"""Minimal OT Sniffer dashboard using Shodan."""

import os
from typing import Dict

import shodan
import streamlit as st


import requests


def main() -> None:
    ## Titles the streamlit webdashboard 
    st.title("OTSniffer Dashboard")
    
    ##  Sets api_key to Shodan api key from docker file
    api_key = os.getenv("SHODAN_API_KEY")
    
    ## If no key error
    if not api_key:
        st.error("Missing SHODAN_API_KEY environment variable")
        return
    
    ## New Shodan class settings the key
    api = shodan.Shodan(api_key)

    if st.button("My-IP", type="secondary"):
        response = requests.get('https://api.shodan.io/tools/myip?key=fnWsFlfN9iHRrFahpW12J2ZgvMX2dOBG')
        st.write(response.text)

if __name__ == "__main__":
    main()
