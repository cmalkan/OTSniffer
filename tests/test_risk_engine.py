import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

import pandas as pd

from risk_engine import (
    compute_financial_exposure,
    connections_to_graph,
    propagation_bfs,
)


def test_propagation_boundary_reduces_probability():
    assets = pd.DataFrame(
        [
            {"id": "A", "criticality": 5},
            {"id": "B", "criticality": 4},
            {"id": "C", "criticality": 3},
        ]
    )
    conns = pd.DataFrame(
        [
            {
                "src_asset_id": "A",
                "dst_asset_id": "B",
                "protocol": "ssh",
                "port": 22,
                "segmentation_boundary": "false",
            },
            {
                "src_asset_id": "B",
                "dst_asset_id": "C",
                "protocol": "rdp",
                "port": 3389,
                "segmentation_boundary": "true",
            },
        ]
    )

    g = connections_to_graph(assets, conns)
    scores = propagation_bfs(g, "A")

    assert scores["A"] == 1.0
    assert scores["B"] > scores["C"]
    assert 0.0 < scores["C"] < 1.0


def test_financial_model_outputs_expected_cases():
    df = pd.DataFrame(
        [
            {"id": "A", "criticality": 5, "compromise_probability": 1.0},
            {"id": "B", "criticality": 3, "compromise_probability": 0.5},
        ]
    )
    recovery = {5: 10.0, 3: 4.0}
    res = compute_financial_exposure(df, recovery, cost_per_hour=1000.0)

    assert res["expected_downtime_hours"] == 12.0
    assert res["base_exposure"] == 12000.0
    assert res["best_exposure"] == 6000.0
    assert res["worst_exposure"] == 24000.0
