"""Risk analysis engine for OT assets using SBOM + network architecture inputs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List
import csv
import io
import json


@dataclass
class RiskSummary:
    overall_score: float
    max_asset_score: float
    internet_exposed_count: int
    vulnerable_component_count: int
    critical_link_count: int


@dataclass
class RiskContext:
    assets: List[Dict[str, Any]]
    links: List[Dict[str, Any]]
    summary: RiskSummary


SEVERITY_WEIGHTS = {
    "critical": 1.0,
    "high": 0.75,
    "medium": 0.45,
    "low": 0.2,
}


CRITICAL_ASSET_TYPES = {"plc", "scada", "hmi", "historians", "safety-system", "dcs"}


def _normalize_severity(value: str | None) -> str:
    if not value:
        return "medium"
    cleaned = value.strip().lower()
    return cleaned if cleaned in SEVERITY_WEIGHTS else "medium"


def _to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y"}
    return False


def parse_sbom_json(sbom_text: str) -> List[Dict[str, Any]]:
    """Parse a minimal CycloneDX-like SBOM JSON into normalized components.

    Expected minimal fields per component:
      - name
      - version (optional)
      - vulnerabilities (optional list of dicts with severity)
      - exposed_to_internet (optional bool)
      - asset_type (optional)
    """
    data = json.loads(sbom_text)

    raw_components = data.get("components", []) if isinstance(data, dict) else []
    components: List[Dict[str, Any]] = []

    for comp in raw_components:
        vulns = comp.get("vulnerabilities", [])
        normalized_vulns = [
            {"severity": _normalize_severity(v.get("severity"))}
            for v in vulns
            if isinstance(v, dict)
        ]

        components.append(
            {
                "name": comp.get("name", "unknown"),
                "version": comp.get("version", "n/a"),
                "asset_type": str(comp.get("asset_type", "other")).lower(),
                "exposed_to_internet": _to_bool(comp.get("exposed_to_internet", False)),
                "vulnerabilities": normalized_vulns,
            }
        )

    return components


def parse_network_csv(network_csv_text: str) -> List[Dict[str, Any]]:
    """Parse network architecture CSV edges.

    Required columns: source,target,zone_trust,segmentation_strength
    zone_trust: untrusted|dmz|trusted
    segmentation_strength: float 0-1 where 1 = strong segmentation
    """
    reader = csv.DictReader(io.StringIO(network_csv_text))
    links: List[Dict[str, Any]] = []

    for row in reader:
        if not row.get("source") or not row.get("target"):
            continue
        trust = (row.get("zone_trust") or "trusted").strip().lower()
        if trust not in {"untrusted", "dmz", "trusted"}:
            trust = "trusted"

        try:
            segmentation = float(row.get("segmentation_strength") or 0.5)
        except ValueError:
            segmentation = 0.5

        links.append(
            {
                "source": row["source"],
                "target": row["target"],
                "zone_trust": trust,
                "segmentation_strength": max(0.0, min(segmentation, 1.0)),
            }
        )

    return links


def _vulnerability_score(vulns: Iterable[Dict[str, Any]]) -> float:
    weighted = sum(SEVERITY_WEIGHTS[_normalize_severity(v.get("severity"))] for v in vulns)
    return min(weighted, 3.0)


def _asset_criticality(asset_type: str) -> float:
    return 1.0 if asset_type in CRITICAL_ASSET_TYPES else 0.4


def compute_risk(assets: List[Dict[str, Any]], links: List[Dict[str, Any]]) -> RiskContext:
    """Compute a blended risk score based on software vulnerabilities and network exposure."""
    link_adjacency: Dict[str, List[Dict[str, Any]]] = {}
    for link in links:
        link_adjacency.setdefault(link["target"], []).append(link)

    enriched_assets: List[Dict[str, Any]] = []

    for asset in assets:
        base = 10.0 * _asset_criticality(asset.get("asset_type", "other"))
        vuln = 20.0 * (_vulnerability_score(asset.get("vulnerabilities", [])) / 3.0)
        exposure = 25.0 if asset.get("exposed_to_internet") else 0.0

        inbound = link_adjacency.get(asset.get("name", ""), [])
        network_risk = 0.0
        for link in inbound:
            trust_factor = {"untrusted": 1.0, "dmz": 0.6, "trusted": 0.2}[link["zone_trust"]]
            segmentation_penalty = 1.0 - link["segmentation_strength"]
            network_risk += 15.0 * trust_factor * segmentation_penalty

        score = min(base + vuln + exposure + network_risk, 100.0)

        enriched_assets.append(
            {
                **asset,
                "risk_score": round(score, 2),
                "inbound_links": len(inbound),
            }
        )

    if not enriched_assets:
        summary = RiskSummary(0.0, 0.0, 0, 0, 0)
        return RiskContext([], links, summary)

    overall = sum(a["risk_score"] for a in enriched_assets) / len(enriched_assets)
    max_asset = max(a["risk_score"] for a in enriched_assets)
    internet_exposed_count = sum(1 for a in enriched_assets if a["exposed_to_internet"])
    vulnerable_component_count = sum(1 for a in enriched_assets if a["vulnerabilities"])
    critical_link_count = sum(1 for l in links if l["zone_trust"] == "untrusted" and l["segmentation_strength"] < 0.5)

    summary = RiskSummary(
        overall_score=round(overall, 2),
        max_asset_score=round(max_asset, 2),
        internet_exposed_count=internet_exposed_count,
        vulnerable_component_count=vulnerable_component_count,
        critical_link_count=critical_link_count,
    )

    enriched_assets.sort(key=lambda x: x["risk_score"], reverse=True)
    return RiskContext(enriched_assets, links, summary)
