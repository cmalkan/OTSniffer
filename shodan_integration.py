"""Shodan integration layer for external exposure intelligence."""

from __future__ import annotations

from datetime import datetime
from typing import Iterable

import pandas as pd
import shodan


HIGH_PORTS = {22, 23, 3389}
MEDIUM_WEB_PORTS = {80, 443, 8080, 8443}


def _score_exposure(open_ports: list[int], services: list[str]) -> tuple[str, int]:
    ports = set(open_ports)
    services_lower = {s.lower() for s in services}
    if ports & HIGH_PORTS or services_lower & {"rdp", "ssh", "telnet"}:
        return "high", 85
    if ports & MEDIUM_WEB_PORTS or services_lower & {"http", "https"}:
        return "medium", 55
    return "low", 20


def enrich_ip_list(ips: Iterable[str], api_key: str) -> pd.DataFrame:
    api = shodan.Shodan(api_key)
    rows = []
    for ip in ips:
        try:
            host = api.host(ip)
            ports = host.get("ports", [])
            services = [item.get("product") or item.get("_shodan", {}).get("module", "") for item in host.get("data", [])]
            vulns = list((host.get("vulns") or {}).keys()) if isinstance(host.get("vulns"), dict) else (host.get("vulns") or [])
            risk_label, risk_weight = _score_exposure(ports, services)
            rows.append(
                {
                    "ip": ip,
                    "open_ports": ",".join(map(str, ports)),
                    "services": ",".join(filter(None, services)),
                    "vulnerabilities": ",".join(vulns),
                    "last_update": host.get("last_update", ""),
                    "risk_label": risk_label,
                    "risk_weight": risk_weight,
                    "status": "ok",
                }
            )
        except shodan.APIError as exc:
            rows.append(
                {
                    "ip": ip,
                    "open_ports": "",
                    "services": "",
                    "vulnerabilities": "",
                    "last_update": datetime.utcnow().isoformat(),
                    "risk_label": "unknown",
                    "risk_weight": 0,
                    "status": f"error: {exc}",
                }
            )
    return pd.DataFrame(rows)
