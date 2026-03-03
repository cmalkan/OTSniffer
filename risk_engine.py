"""Risk modeling engine for ICRS.

Designed to run even in constrained environments where optional graphing
libraries are unavailable.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Dict, List

import pandas as pd

try:  # optional dependency for richer visuals/algorithms
    import networkx as nx  # type: ignore
except Exception:  # pragma: no cover
    nx = None

try:  # optional dependency for rich plotting
    import plotly.graph_objects as go  # type: ignore
except Exception:  # pragma: no cover
    go = None

REMOTE_ADMIN_PROTOCOLS = {"rdp", "ssh", "vnc", "telnet", "winrm"}


@dataclass
class SimpleGraph:
    nodes: dict[str, dict]
    out_edges: dict[str, list[tuple[str, dict]]]

    def __init__(self) -> None:
        self.nodes = {}
        self.out_edges = defaultdict(list)

    def add_node(self, node_id: str, **attrs) -> None:
        self.nodes[node_id] = attrs

    def add_edge(self, src: str, dst: str, **attrs) -> None:
        self.out_edges[src].append((dst, attrs))

    def iter_nodes(self):
        return self.nodes.keys()

    def iter_edges(self):
        for src, edges in self.out_edges.items():
            for dst, attrs in edges:
                yield src, dst, attrs


def protocol_multiplier(protocol: str, port: int) -> float:
    p = (protocol or "").lower()
    if p in REMOTE_ADMIN_PROTOCOLS or port in {22, 23, 3389, 5900, 5985, 5986}:
        return 1.3
    if p in {"http", "https"} and port in {80, 443, 8080, 8443}:
        return 1.1
    return 1.0


def connections_to_graph(assets_df: pd.DataFrame, connections_df: pd.DataFrame):
    if nx:
        g = nx.DiGraph()
        for _, row in assets_df.iterrows():
            g.add_node(
                str(row["id"]),
                hostname=row.get("hostname", ""),
                asset_type=row.get("type", "unknown"),
                criticality=int(row.get("criticality", 3)),
                zone=row.get("zone", ""),
            )
        for _, row in connections_df.iterrows():
            g.add_edge(
                str(row["src_asset_id"]),
                str(row["dst_asset_id"]),
                protocol=str(row.get("protocol", "")).lower(),
                port=int(row.get("port", 0)),
                segmentation_boundary=str(row.get("segmentation_boundary", "false")).lower() == "true",
            )
        return g

    g = SimpleGraph()
    for _, row in assets_df.iterrows():
        g.add_node(
            str(row["id"]),
            hostname=row.get("hostname", ""),
            asset_type=row.get("type", "unknown"),
            criticality=int(row.get("criticality", 3)),
            zone=row.get("zone", ""),
        )
    for _, row in connections_df.iterrows():
        g.add_edge(
            str(row["src_asset_id"]),
            str(row["dst_asset_id"]),
            protocol=str(row.get("protocol", "")).lower(),
            port=int(row.get("port", 0)),
            segmentation_boundary=str(row.get("segmentation_boundary", "false")).lower() == "true",
        )
    return g


def _iter_nodes(graph):
    return graph.nodes if nx and hasattr(graph, "nodes") else list(graph.iter_nodes())


def _out_edges(graph, node):
    if nx and hasattr(graph, "out_edges"):
        return graph.out_edges(node, data=True)
    return [(node, dst, attrs) for dst, attrs in graph.out_edges.get(node, [])]


def propagation_bfs(graph, initial_node: str, base_prob: float = 1.0) -> Dict[str, float]:
    scores: Dict[str, float] = {str(n): 0.0 for n in _iter_nodes(graph)}
    scores[str(initial_node)] = base_prob
    q = deque([str(initial_node)])

    while q:
        current = q.popleft()
        current_prob = scores[current]
        for _, neighbor, data in _out_edges(graph, current):
            mult = protocol_multiplier(data.get("protocol", ""), int(data.get("port", 0)))
            boundary_factor = 0.45 if data.get("segmentation_boundary") else 0.9
            candidate = min(current_prob * mult * boundary_factor, 1.0)
            if candidate > scores.get(str(neighbor), 0.0):
                scores[str(neighbor)] = candidate
                q.append(str(neighbor))
    return scores


def compute_top_paths(graph, initial_node: str, limit: int = 10) -> List[dict]:
    initial_node = str(initial_node)

    def dfs(node: str, visited: set[str], path: list[str], score: float):
        if len(path) > 6:
            return
        for _, nxt, attrs in _out_edges(graph, node):
            nxt = str(nxt)
            if nxt in visited:
                continue
            edge_score = protocol_multiplier(attrs.get("protocol", ""), int(attrs.get("port", 0)))
            edge_score *= 0.45 if attrs.get("segmentation_boundary") else 0.9
            new_score = min(score * edge_score, 1.0)
            new_path = path + [nxt]
            paths.append({"path": " -> ".join(new_path), "score": round(new_score, 4)})
            dfs(nxt, visited | {nxt}, new_path, new_score)

    paths: list[dict] = []
    dfs(initial_node, {initial_node}, [initial_node], 1.0)
    return sorted(paths, key=lambda x: x["score"], reverse=True)[:limit]


def compute_chokepoints(graph) -> List[dict]:
    edge_counts: dict[str, int] = defaultdict(int)
    nodes = [str(n) for n in _iter_nodes(graph)]
    for source in nodes:
        for path_obj in compute_top_paths(graph, source, limit=20):
            chain = path_obj["path"].split(" -> ")
            for u, v in zip(chain[:-1], chain[1:]):
                edge_counts[f"{u}->{v}"] += 1
    ranked = sorted(edge_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    max_count = ranked[0][1] if ranked else 1
    return [{"edge": e, "chokepoint_score": round(c / max_count, 4)} for e, c in ranked]


def risk_heatmap(assets_df: pd.DataFrame, node_scores: Dict[str, float]) -> pd.DataFrame:
    df = assets_df.copy()
    df["id"] = df["id"].astype(str)
    df["compromise_probability"] = df["id"].map(node_scores).fillna(0.0)
    df["risk_score"] = df["compromise_probability"] * df["criticality"].astype(float)
    return df.sort_values("risk_score", ascending=False)


def compute_financial_exposure(risk_df: pd.DataFrame, recovery_hours_by_criticality: Dict[int, float], cost_per_hour: float) -> Dict[str, float]:
    expected = 0.0
    for _, row in risk_df.iterrows():
        expected += float(row["compromise_probability"]) * float(recovery_hours_by_criticality.get(int(row["criticality"]), 12.0))
    base = expected * cost_per_hour
    return {
        "expected_downtime_hours": round(expected, 2),
        "best_exposure": round(base * 0.5, 2),
        "base_exposure": round(base, 2),
        "worst_exposure": round(base * 2.0, 2),
    }


def graph_to_plotly(graph, node_scores: Dict[str, float]):
    if not (nx and go):
        edge_rows = []
        for src, dst, attrs in (graph.iter_edges() if hasattr(graph, "iter_edges") else []):
            edge_rows.append({"src": src, "dst": dst, **attrs})
        return edge_rows

    pos = nx.spring_layout(graph, seed=42)
    edge_x, edge_y = [], []
    for src, dst in graph.edges():
        x0, y0 = pos[src]
        x1, y1 = pos[dst]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    edge_trace = go.Scatter(x=edge_x, y=edge_y, mode="lines", line=dict(width=1), hoverinfo="none")
    node_x, node_y, text, color = [], [], [], []
    for n in graph.nodes:
        x, y = pos[n]
        node_x.append(x)
        node_y.append(y)
        score = node_scores.get(n, 0.0)
        color.append(score)
        text.append(f"{n}<br>p={score:.2f}")

    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode="markers+text",
        text=[n for n in graph.nodes],
        hovertext=text,
        hoverinfo="text",
        marker=dict(size=20, color=color, colorscale="YlOrRd", showscale=True),
    )
    return go.Figure(data=[edge_trace, node_trace]).update_layout(title="Blast Radius Graph", showlegend=False)
