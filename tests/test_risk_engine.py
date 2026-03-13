import json

from risk_engine import compute_risk, parse_network_csv, parse_network_pdf_text, parse_sbom_json


def test_compute_risk_prioritizes_exposed_plc_with_critical_vuln():
    sbom = {
        "components": [
            {
                "name": "PLC-1",
                "asset_type": "plc",
                "exposed_to_internet": True,
                "vulnerabilities": [{"severity": "critical"}],
            },
            {
                "name": "Workstation-1",
                "asset_type": "other",
                "exposed_to_internet": False,
                "vulnerabilities": [{"severity": "low"}],
            },
        ]
    }
    links_csv = (
        "source,target,zone_trust,segmentation_strength\n"
        "Internet,PLC-1,untrusted,0.1\n"
        "Office,Workstation-1,trusted,0.8\n"
    )

    assets = parse_sbom_json(json.dumps(sbom))
    links = parse_network_csv(links_csv)
    result = compute_risk(assets, links)

    assert result.assets[0]["name"] == "PLC-1"
    assert result.summary.internet_exposed_count == 1
    assert result.summary.overall_score > 0
    assert "vit_score" in result.assets[0]


def test_parse_network_csv_clamps_segmentation_bounds():
    links = parse_network_csv(
        "source,target,zone_trust,segmentation_strength\n"
        "A,B,untrusted,2.7\n"
        "C,D,dmz,-2\n"
    )

    assert links[0]["segmentation_strength"] == 1.0
    assert links[1]["segmentation_strength"] == 0.0


def test_parse_network_pdf_text_extracts_purdue_like_paths():
    text = """
    Level 5 Corp -> L3 DMZ
    L3 DMZ -> SCADA-Master
    SCADA-Master -> PLC-1
    """
    links = parse_network_pdf_text(text)

    assert len(links) == 3
    assert any(link["zone_trust"] == "untrusted" for link in links)
    assert any(link["source"] == "SCADA-Master" and link["target"] == "PLC-1" for link in links)
