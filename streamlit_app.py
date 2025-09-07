import os
import json
from datetime import datetime, timedelta
from collections import Counter, defaultdict

import streamlit as st
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'demo_data.json')

st.set_page_config(page_title='OTSniffer', layout='wide')

@st.cache_data
def load_data():
    try:
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            payload = json.load(f)
        items = payload.get('items', [])
        df = pd.DataFrame(items)
        df['date'] = pd.to_datetime(df['date'], errors='coerce').dt.date
        df['count'] = pd.to_numeric(df['count'], errors='coerce').fillna(0).astype(int)
        return df
    except Exception:
        return pd.DataFrame(columns=['date','industry','country','vendor','count'])


def aggregates(df):
    total = int(df['count'].sum()) if not df.empty else 0
    by_industry = df.groupby('industry')['count'].sum().sort_values(ascending=False).head(6)
    by_country = df.groupby('country')['count'].sum().sort_values(ascending=False).head(6)
    by_vendor = df.groupby('vendor')['count'].sum().sort_values(ascending=False).head(6)
    tl = df.groupby('date')['count'].sum().sort_index()
    return total, by_industry, by_country, by_vendor, tl


def period_range(period: str, df: pd.DataFrame):
    if df.empty or df['date'].isna().all():
        today = datetime.utcnow().date()
    else:
        today = max([d for d in df['date'] if pd.notna(d)])
    if period == '7d':
        start = today - timedelta(days=6)
    elif period == '90d':
        start = today - timedelta(days=89)
    else:
        start = today - timedelta(days=29)
    return start, today


def filter_df(df, industry, country, start, end):
    if df.empty:
        return df
    m = pd.Series([True]*len(df))
    if industry:
        m &= (df['industry'] == industry)
    if country:
        m &= (df['country'] == country)
    if start:
        m &= (df['date'] >= start)
    if end:
        m &= (df['date'] <= end)
    return df[m]

# Sidebar filters
st.sidebar.title('Filters')
raw = load_data()
industries = sorted([x for x in raw['industry'].dropna().unique()]) if not raw.empty else []
countries = sorted([x for x in raw['country'].dropna().unique()]) if not raw.empty else []

industry = st.sidebar.selectbox('Industry', options=[''] + industries, index=0, format_func=lambda x: 'All' if x=='' else x)
country  = st.sidebar.selectbox('Country',  options=[''] + countries, index=0, format_func=lambda x: 'All' if x=='' else x)
period   = st.sidebar.selectbox('Period',   options=['7d','30d','90d'], index=1, format_func=lambda x: {'7d':'Last 7 days','30d':'Last 30 days','90d':'Last 90 days'}[x])

start, end = period_range(period, raw)
df = filter_df(raw, industry or None, country or None, start, end)

st.title('OTSniffer')
st.caption('Demo mode • Aggregated, redacted data only')

# KPI row
c1, c2, c3 = st.columns(3)

total, by_industry, by_country, by_vendor, tl = aggregates(df)
c1.metric('Total Findings', f'{total:,}')
c2.metric('Top Industry', by_industry.index[0] if len(by_industry) else '-')
c3.metric('Top Country', by_country.index[0] if len(by_country) else '-')

# Charts grid
cA, cB = st.columns(2)
with cA:
    st.subheader('By Industry')
    if len(by_industry):
        st.bar_chart(by_industry)
    else:
        st.info('No data for selection')
with cB:
    st.subheader('By Country')
    if len(by_country):
        st.bar_chart(by_country)
    else:
        st.info('No data for selection')

cC, cD = st.columns(2)
with cC:
    st.subheader('Top Vendors')
    if len(by_vendor):
        st.bar_chart(by_vendor)
    else:
        st.info('No data for selection')
with cD:
    st.subheader('Trend')
    if len(tl):
        st.line_chart(tl)
    else:
        st.info('No data for selection')

# Export
st.divider()
agg_rows = []
for name, series, cat in [
    ('industry', by_industry, 'industry'),
    ('country', by_country, 'country'),
    ('vendor', by_vendor, 'vendor')
]:
    for k, v in series.items():
        agg_rows.append({'category': cat, 'name': k, 'count': int(v)})
agg_df = pd.DataFrame(agg_rows)

csv = agg_df.to_csv(index=False).encode('utf-8')
st.download_button('Download Aggregates (CSV)', csv, file_name='otsniffer_aggregates.csv', mime='text/csv')
