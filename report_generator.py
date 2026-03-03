"""Executive report generation for ICRS.

Uses ReportLab + Matplotlib when available; falls back to a text report in
restricted environments.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

try:  # optional graphics stack
    import matplotlib.pyplot as plt  # type: ignore
    import networkx as nx  # type: ignore
except Exception:  # pragma: no cover
    plt = None
    nx = None

try:
    from reportlab.lib.pagesizes import letter  # type: ignore
    from reportlab.lib.styles import getSampleStyleSheet  # type: ignore
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table  # type: ignore
except Exception:  # pragma: no cover
    letter = None


def report_format() -> str:
    return "pdf" if letter is not None else "txt"


def _graph_snapshot(graph, node_scores: dict[str, float], output_img: Path) -> bool:
    if not (plt and nx and hasattr(graph, "nodes")):
        return False
    plt.figure(figsize=(8, 5))
    pos = nx.spring_layout(graph, seed=42)
    node_colors = [node_scores.get(n, 0.0) for n in graph.nodes()]
    nx.draw(graph, pos, with_labels=True, node_color=node_colors, cmap=plt.cm.OrRd, node_size=900)
    plt.title("Blast Radius")
    plt.tight_layout()
    plt.savefig(output_img)
    plt.close()
    return True


def build_executive_report(
    report_path: Path,
    engagement_id: int,
    exposure_df: pd.DataFrame,
    top_paths: list[dict],
    chokepoints: list[dict],
    financials: dict,
    graph,
    node_scores: dict[str, float],
) -> None:
    report_path.parent.mkdir(exist_ok=True)

    if letter is None:
        content = [
            f"ICRS Executive Report - Engagement #{engagement_id}",
            "",
            f"Expected downtime: {financials['expected_downtime_hours']} hours",
            f"Base exposure: ${financials['base_exposure']:,.0f}",
            "",
            "Top Propagation Paths:",
        ]
        content += [f"- {p['path']} (score={p['score']})" for p in top_paths[:10]] or ["- None"]
        content += ["", "Containment Chokepoints:"]
        content += [f"- {c['edge']} (score={c['chokepoint_score']})" for c in chokepoints[:10]] or ["- None"]
        content += ["", "Shodan Exposure:", exposure_df.head(10).to_csv(index=False) if not exposure_df.empty else "No data"]
        content += ["\nDisclaimer: Authorized defensive analysis only."]
        report_path.write_text("\n".join(content), encoding="utf-8")
        return

    img_path = report_path.with_suffix(".png")
    has_graph_image = _graph_snapshot(graph, node_scores, img_path)

    doc = SimpleDocTemplate(str(report_path), pagesize=letter)
    styles = getSampleStyleSheet()
    story = [Paragraph(f"ICRS Executive Report - Engagement #{engagement_id}", styles["Title"]), Spacer(1, 12)]
    story.append(
        Paragraph(
            f"Executive Summary: Expected downtime is <b>{financials['expected_downtime_hours']}</b> hours; base-case financial exposure is <b>${financials['base_exposure']:,.0f}</b>.",
            styles["BodyText"],
        )
    )
    story.append(Spacer(1, 12))
    story.append(Paragraph("External Exposure Findings (Shodan)", styles["Heading2"]))
    if exposure_df.empty:
        story.append(Paragraph("No exposure data available.", styles["BodyText"]))
    else:
        story.append(Table([list(exposure_df.columns)] + exposure_df.head(8).astype(str).values.tolist(), repeatRows=1))
    story.append(Spacer(1, 12))
    if has_graph_image:
        story.append(Paragraph("Blast Radius Graph", styles["Heading2"]))
        story.append(Image(str(img_path), width=500, height=300))
        story.append(Spacer(1, 12))
    story.append(Paragraph("Top Propagation Paths", styles["Heading2"]))
    if top_paths:
        story.append(Table([["Path", "Score"]] + [[p["path"], str(p["score"])] for p in top_paths[:10]], repeatRows=1))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Containment Recommendations", styles["Heading2"]))
    story.append(Paragraph("Prioritize OT/IT segmentation and harden remote access interfaces.", styles["BodyText"]))
    if chokepoints:
        story.append(Table([["Edge", "Chokepoint Score"]] + [[c["edge"], str(c["chokepoint_score"])] for c in chokepoints[:5]], repeatRows=1))
    story.append(Spacer(1, 18))
    story.append(Paragraph("Disclaimer: Authorized defensive analysis only.", styles["Italic"]))
    doc.build(story)
