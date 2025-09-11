import os
from datetime import datetime, timedelta

import streamlit as st
import pandas as pd
from shodan_client import (
    get_aggregates,
    INDUSTRY_PRESETS,
    ShodanClientError,
    get_protocol_list,
    build_protocol_query,
    get_aggregates_for_query,
)

APP_VERSION = 'v0.2.2'

st.set_page_config(page_title='OTSniffer', layout='wide')

# Header with version (right)
left, right = st.columns([6, 1])
with left:
    st.title('OTSniffer')
with right:
    st.caption(APP_VERSION)

# Sidebar controls for Shodan (Live)
st.sidebar.title('Shodan (Live)')
mode = st.sidebar.radio('Search Mode', options=['Industry Preset', 'Protocols'], index=0)

presets = list(INDUSTRY_PRESETS.keys())
default_idx = presets.index('Industrial Automation') if 'Industrial Automation' in presets else 0
if mode == 'Industry Preset':
    preset = st.sidebar.selectbox('Industry Preset', options=presets, index=default_idx)
else:
    preset = None

period = st.sidebar.selectbox(
    'Period', options=['7d', '30d', '90d'], index=1,
    format_func=lambda x: {'7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days'}[x]
)

country_code = st.sidebar.text_input('Country filter (ISO-2, optional)', value='', placeholder='e.g., US, IN')

if mode == 'Protocols':
    protocols = st.sidebar.multiselect('Protocols', options=get_protocol_list(), default=['Modbus TCP', 'Siemens S7'])
else:
    protocols = []

# Time range
today = datetime.utcnow().date()
if period == '7d':
    start = today - timedelta(days=6)
elif period == '90d':
    start = today - timedelta(days=89)
else:
    start = today - timedelta(days=29)

# Run button and auto-run when config changes
run = st.sidebar.button('Run Live Query', type='primary')
sig_parts = [mode, preset or '', period, (country_code or '').strip().upper(), ','.join(protocols)]
sig = '|'.join(sig_parts)
should_run = run or (st.session_state.get('shodan_sig') != sig)

if should_run:
    st.session_state['shodan_sig'] = sig
    with st.spinner('Fetching Shodan aggregates...'):
        try:
            if mode == 'Industry Preset':
                result = get_aggregates(
                    None,
                    preset,
                    datetime.combine(start, datetime.min.time()),
                    datetime.combine(today, datetime.min.time()),
                    country_code.strip(),
                )
                label = preset
            else:
                query = build_protocol_query(protocols, country_code.strip())
                result = get_aggregates_for_query(
                    None,
                    query,
                    datetime.combine(start, datetime.min.time()),
                    datetime.combine(today, datetime.min.time()),
                )
                label = ' + '.join(protocols) if protocols else 'Protocols'
        except Exception as e:
            st.error('Shodan query failed. ' + str(e))
            st.stop()

    total = result.get('total', 0)
    countries = result.get('countries', [])
    vendors = result.get('vendors', [])
    tl = result.get('timeline', {'labels': [], 'values': []})

    by_label = pd.Series([total], index=[label])
    by_country = pd.Series({x['name']: x['count'] for x in countries}) if countries else pd.Series(dtype='int')
    by_vendor = pd.Series({x['name']: x['count'] for x in vendors}) if vendors else pd.Series(dtype='int')
    tl_series = pd.Series(data=tl['values'], index=pd.to_datetime(tl['labels'])) if tl.get('labels') else pd.Series(dtype='int')

    c1, c2, c3 = st.columns(3)
    c1.metric('Total Findings', f'{total:,}')
    c2.metric('Top Industry/Query', label if total > 0 else '-')
    c3.metric('Top Country', by_country.index[0] if len(by_country) else '-')

    cA, cB = st.columns(2)
    with cA:
        st.subheader('By Country')
        if len(by_country):
            st.bar_chart(by_country)
        else:
            st.info('No data for selection')
    with cB:
        st.subheader('Top Vendors')
        if len(by_vendor):
            st.bar_chart(by_vendor)
        else:
            st.info('No data for selection')

    st.subheader('Trend')
    if len(tl_series):
        st.line_chart(tl_series)
    else:
        st.info('No data for selection')

    st.divider()
    agg_rows = []
    for k, v in by_label.items():
        agg_rows.append({'category': 'query', 'name': k, 'count': int(v)})
    for k, v in by_country.items():
        agg_rows.append({'category': 'country', 'name': k, 'count': int(v)})
    for k, v in by_vendor.items():
        agg_rows.append({'category': 'vendor', 'name': k, 'count': int(v)})
    agg_df = pd.DataFrame(agg_rows)
    csv = agg_df.to_csv(index=False).encode('utf-8')
    st.download_button('Download Aggregates (CSV)', csv, file_name='otsniffer_aggregates.csv', mime='text/csv')
