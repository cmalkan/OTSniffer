import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from collections import defaultdict

import requests

SHODAN_COUNT_URL = 'https://api.shodan.io/shodan/host/count'

# Hard-coded default API key as requested (note: not recommended for security)
DEFAULT_API_KEY = '8R4eNN77YGIKwpyQd0hnEZr8DHBXfAtc'


class ShodanClientError(Exception):
    """Sanitized error for Shodan client without exposing secrets/URLs"""
    pass


def _resolve_api_key(explicit: Optional[str]) -> str:
    return explicit or os.getenv('SHODAN_API_KEY') or DEFAULT_API_KEY


def shodan_count(api_key: Optional[str], query: str, facets: str = '') -> Dict:
    key = _resolve_api_key(api_key)
    params = {'key': key, 'query': query, 'minify': True}
    if facets:
        params['facets'] = facets
    try:
        r = requests.get(SHODAN_COUNT_URL, params=params, timeout=45)
        status = r.status_code
        try:
            payload = r.json()
        except Exception:
            payload = {}
        if status >= 400:
            if status == 401:
                raise ShodanClientError('Unauthorized: Invalid SHODAN_API_KEY')
            if status == 402:
                raise ShodanClientError('Payment required or usage limit reached')
            if status == 403:
                raise ShodanClientError('Forbidden: Access denied for this API key')
            if status == 429:
                raise ShodanClientError('Rate limit exceeded. Please retry later')
            msg = payload.get('error') if isinstance(payload, dict) else None
            raise ShodanClientError(f'Shodan API error (status {status})' + (f': {msg}' if msg else ''))
        return payload if payload else r.json()
    except ShodanClientError:
        raise
    except requests.Timeout:
        raise ShodanClientError('Network timeout contacting Shodan API')
    except requests.RequestException:
        raise ShodanClientError('Network error contacting Shodan API')
    except ValueError:
        raise ShodanClientError('Invalid JSON in Shodan response')


def daterange(start_date: datetime, end_date: datetime):
    for n in range((end_date - start_date).days + 1):
        yield start_date + timedelta(n)


# Port lists per preset for splitting heavy queries
PRESET_PORTS = {
    'Industrial Automation': [102, 44818, 502, 2404, 20000, 47808],
    'Building Automation': [47808],
    'Energy (ICS/SCADA)': [2404, 20000],
    'Healthcare (BMS/OT)': [47808],
}

# Default simplified query templates (no tag filter to reduce load)
INDUSTRY_PRESETS = {
    'Industrial Automation': '(port:102 OR port:44818 OR port:502 OR port:2404 OR port:20000 OR port:47808)',
    'Building Automation': '(port:47808 OR "bacnet")',
    'Energy (ICS/SCADA)': '(port:2404 OR port:20000)',
    'Healthcare (BMS/OT)': '(port:47808)',
}


def build_query(preset: str, country_code: str = '') -> str:
    base = INDUSTRY_PRESETS.get(preset, INDUSTRY_PRESETS['Industrial Automation']).strip()
    if country_code:
        return f"{base} country:{country_code}"
    return base


def merge_facet_counts(payloads: List[Dict], facet: str, topn: int = 10) -> List[Dict[str, int]]:
    agg = defaultdict(int)
    for p in payloads:
        for item in p.get('facets', {}).get(facet, []):
            agg[str(item.get('value', '-'))] += int(item.get('count', 0))
    # sort and trim
    return [{ 'name': k, 'count': v } for k, v in sorted(agg.items(), key=lambda kv: kv[1], reverse=True)[:topn]]


def split_count_by_ports(api_key: Optional[str], ports: List[int], country_code: str, facet_spec: str = '') -> Tuple[int, List[Dict], List[Dict]]:
    total = 0
    facet_payloads: List[Dict] = []
    for port in ports:
        q = f"port:{port}"
        if country_code:
            q = f"{q} country:{country_code}"
        try:
            payload = shodan_count(api_key, q, facets=facet_spec)
            total += int(payload.get('total', 0))
            facet_payloads.append(payload)
            time.sleep(0.2)
        except ShodanClientError:
            # Skip this port on error
            continue
    countries = merge_facet_counts(facet_payloads, 'country') if facet_spec else []
    vendors = merge_facet_counts(facet_payloads, 'product') if facet_spec and 'product' in facet_spec else []
    return total, countries, vendors


def timeline_counts(api_key: Optional[str], base_query: str, start: datetime, end: datetime, sleep_sec: float = 0.3) -> Tuple[List[str], List[int]]:
    labels, values = [], []
    for day in daterange(start, end):
        q = f"{base_query} after:{day.strftime('%Y-%m-%d')} before:{(day + timedelta(days=1)).strftime('%Y-%m-%d')}"
        try:
            data = shodan_count(api_key, q)
            total = int(data.get('total', 0))
        except ShodanClientError:
            total = 0
        labels.append(day.strftime('%Y-%m-%d'))
        values.append(total)
        time.sleep(sleep_sec)
    return labels, values


def get_aggregates(api_key: Optional[str], preset: str, start: datetime, end: datetime, country_code: str = '') -> Dict:
    # First try combined query with facets (country then product)
    q = build_query(preset, country_code)
    payload = None
    for facets in ('country:10,product:10', 'country:10', ''):
        try:
            payload = shodan_count(api_key, q, facets=facets)
            break
        except ShodanClientError:
            payload = None
            continue

    if payload is None:
        # Split by ports and aggregate to avoid timeouts
        ports = PRESET_PORTS.get(preset, PRESET_PORTS['Industrial Automation'])
        total, countries, vendors = split_count_by_ports(api_key, ports, country_code, facet_spec='country:10')
        # Try to fetch vendors separately with light facet per port
        try:
            _, _, vendors = split_count_by_ports(api_key, ports, country_code, facet_spec='product:10')
        except Exception:
            vendors = []
        # Timeline: prefer combined per-day; if that fails, sum over top ports (limit to 2 to keep fast)
        try:
            labels, values = timeline_counts(api_key, build_query(preset, country_code), start, end)
        except Exception:
            top_ports = PRESET_PORTS.get(preset, [502, 102])[:2]
            labels = []
            values = []
            for day in daterange(start, end):
                day_total = 0
                for port in top_ports:
                    dq = f"port:{port}"
                    if country_code:
                        dq = f"{dq} country:{country_code}"
                    dq = f"{dq} after:{day.strftime('%Y-%m-%d')} before:{(day + timedelta(days=1)).strftime('%Y-%m-%d')}"
                    try:
                        dres = shodan_count(api_key, dq)
                        day_total += int(dres.get('total', 0))
                    except ShodanClientError:
                        pass
                    time.sleep(0.2)
                labels.append(day.strftime('%Y-%m-%d'))
                values.append(day_total)
        return {
            'total': total,
            'countries': countries,
            'vendors': vendors,
            'timeline': {'labels': labels, 'values': values},
            'preset': preset,
            'query': q,
        }

    # If combined query succeeded
    total = int(payload.get('total', 0))
    countries = [{'name': x.get('value', '-'), 'count': int(x.get('count', 0))} for x in payload.get('facets', {}).get('country', [])]
    vendors = [{'name': x.get('value', '-'), 'count': int(x.get('count', 0))} for x in payload.get('facets', {}).get('product', [])]

    # Timeline preferred: combined per-day
    try:
        labels, values = timeline_counts(api_key, q, start, end)
    except ShodanClientError:
        # Fallback to tag-only to at least show shape (may be high)
        labels, values = timeline_counts(api_key, '(tag:ics)', start, end)

    return {
        'total': total,
        'countries': countries,
        'vendors': vendors,
        'timeline': {'labels': labels, 'values': values},
        'preset': preset,
        'query': q,
    }

# Protocol search helpers
PROTOCOL_QUERIES = {
    'Modbus TCP': 'port:502',
    'Siemens S7': 'port:102',
    'EtherNet/IP (CIP)': 'port:44818',
    'IEC 60870-5-104': 'port:2404',
    'DNP3': 'port:20000',
    'BACnet': 'port:47808 OR "bacnet"',
    'OPC UA': 'port:4840',
    'MQTT': 'port:1883 OR port:8883',
    'SNMP': 'port:161',
    'Tridium Fox': 'port:1911 OR port:4911'
}

def get_protocol_list() -> List[str]:
    return sorted(PROTOCOL_QUERIES.keys())

def build_protocol_query(protocols: List[str], country_code: str = '') -> str:
    parts = []
    for p in protocols:
        q = PROTOCOL_QUERIES.get(p)
        if q:
            parts.append(f"({q})")
    base = ' OR '.join(parts) if parts else '(port:502)'
    if country_code:
        return f"({base}) country:{country_code}"
    return f"({base})"

def get_aggregates_for_query(api_key: Optional[str], query: str, start: datetime, end: datetime) -> Dict:
    # facet fallback
    payload = None
    for facets in ('country:10,product:10', 'country:10', ''):
        try:
            payload = shodan_count(api_key, query, facets=facets)
            break
        except ShodanClientError:
            payload = None
            continue
    if payload is None:
        total = 0
        countries = []
        vendors = []
    else:
        total = int(payload.get('total', 0))
        countries = [{'name': x.get('value', '-'), 'count': int(x.get('count', 0))} for x in payload.get('facets', {}).get('country', [])]
        vendors = [{'name': x.get('value', '-'), 'count': int(x.get('count', 0))} for x in payload.get('facets', {}).get('product', [])]
    try:
        labels, values = timeline_counts(api_key, query, start, end)
    except ShodanClientError:
        labels, values = [], []
    return {
        'total': total,
        'countries': countries,
        'vendors': vendors,
        'timeline': {'labels': labels, 'values': values},
        'preset': 'Custom Query',
        'query': query,
    }
