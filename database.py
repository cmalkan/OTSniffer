"""Database access layer for ICRS.

Uses SQLAlchemy when available; otherwise falls back to sqlite3 so the app can
run in constrained environments.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pandas as pd

DB_PATH = Path("icrs.db")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS engagements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            site_name TEXT NOT NULL,
            cost_per_hour REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engagement_id INTEGER,
            asset_id TEXT,
            hostname TEXT, ip TEXT, asset_type TEXT,
            criticality INTEGER, vendor TEXT,
            firmware_version TEXT, zone TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engagement_id INTEGER,
            src_asset_id TEXT, dst_asset_id TEXT,
            protocol TEXT, port INTEGER,
            segmentation_boundary INTEGER
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS exposures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engagement_id INTEGER,
            ip TEXT, open_ports TEXT, services TEXT,
            vulnerabilities TEXT, last_update TEXT,
            risk_label TEXT, risk_weight INTEGER,
            status TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS simulation_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engagement_id INTEGER,
            heatmap_json TEXT,
            top_paths_json TEXT,
            chokepoints_json TEXT,
            financials_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS report_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engagement_id INTEGER,
            path TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


def get_session() -> None:
    return None


def save_engagement(_session, client_name: str, site_name: str, cost_per_hour: float) -> int:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO engagements(client_name, site_name, cost_per_hour) VALUES(?,?,?)",
        (client_name, site_name, cost_per_hour),
    )
    conn.commit()
    engagement_id = cur.lastrowid
    conn.close()
    return int(engagement_id)


def list_engagements(_session) -> list[dict]:
    conn = _connect()
    rows = conn.execute("SELECT id, client_name, site_name, cost_per_hour FROM engagements ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_assets(_session, engagement_id: int, df: pd.DataFrame) -> None:
    conn = _connect()
    conn.execute("DELETE FROM assets WHERE engagement_id=?", (engagement_id,))
    for _, row in df.iterrows():
        conn.execute(
            """INSERT INTO assets(engagement_id,asset_id,hostname,ip,asset_type,criticality,vendor,firmware_version,zone)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            (
                engagement_id,
                str(row["id"]),
                str(row.get("hostname", "")),
                str(row.get("ip", "")),
                str(row.get("type", "")),
                int(row.get("criticality", 3)),
                str(row.get("vendor", "")),
                str(row.get("firmware_version", "")),
                str(row.get("zone", "")),
            ),
        )
    conn.commit()
    conn.close()


def save_connections(_session, engagement_id: int, df: pd.DataFrame) -> None:
    conn = _connect()
    conn.execute("DELETE FROM connections WHERE engagement_id=?", (engagement_id,))
    for _, row in df.iterrows():
        conn.execute(
            """INSERT INTO connections(engagement_id,src_asset_id,dst_asset_id,protocol,port,segmentation_boundary)
               VALUES(?,?,?,?,?,?)""",
            (
                engagement_id,
                str(row["src_asset_id"]),
                str(row["dst_asset_id"]),
                str(row.get("protocol", "")),
                int(row.get("port", 0)),
                1 if str(row.get("segmentation_boundary", "false")).lower() == "true" else 0,
            ),
        )
    conn.commit()
    conn.close()


def save_exposure(_session, engagement_id: int, df: pd.DataFrame) -> None:
    conn = _connect()
    conn.execute("DELETE FROM exposures WHERE engagement_id=?", (engagement_id,))
    for _, row in df.iterrows():
        conn.execute(
            """INSERT INTO exposures(engagement_id,ip,open_ports,services,vulnerabilities,last_update,risk_label,risk_weight,status)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            (
                engagement_id,
                row.get("ip", ""),
                row.get("open_ports", ""),
                row.get("services", ""),
                row.get("vulnerabilities", ""),
                row.get("last_update", ""),
                row.get("risk_label", "unknown"),
                int(row.get("risk_weight", 0)),
                row.get("status", "ok"),
            ),
        )
    conn.commit()
    conn.close()


def save_risk_results(_session, engagement_id: int, heatmap_df: pd.DataFrame, top_paths: list[dict], chokepoints: list[dict], financials: dict) -> None:
    conn = _connect()
    conn.execute(
        """INSERT INTO simulation_results(engagement_id,heatmap_json,top_paths_json,chokepoints_json,financials_json)
           VALUES(?,?,?,?,?)""",
        (
            engagement_id,
            json.dumps(heatmap_df.to_dict(orient="records")),
            json.dumps(top_paths),
            json.dumps(chokepoints),
            json.dumps(financials),
        ),
    )
    conn.commit()
    conn.close()


def save_report_record(_session, engagement_id: int, path: str) -> None:
    conn = _connect()
    conn.execute("INSERT INTO report_records(engagement_id,path) VALUES(?,?)", (engagement_id, path))
    conn.commit()
    conn.close()


def load_engagement_data(_session, engagement_id: int) -> dict:
    conn = _connect()
    assets = conn.execute("SELECT asset_id,hostname,ip,asset_type,criticality,vendor,firmware_version,zone FROM assets WHERE engagement_id=?", (engagement_id,)).fetchall()
    connections = conn.execute("SELECT src_asset_id,dst_asset_id,protocol,port,segmentation_boundary FROM connections WHERE engagement_id=?", (engagement_id,)).fetchall()
    exposure = conn.execute("SELECT ip,open_ports,services,vulnerabilities,last_update,risk_label,risk_weight,status FROM exposures WHERE engagement_id=?", (engagement_id,)).fetchall()
    conn.close()

    assets_df = pd.DataFrame([
        {
            "id": r["asset_id"],
            "hostname": r["hostname"],
            "ip": r["ip"],
            "type": r["asset_type"],
            "criticality": r["criticality"],
            "vendor": r["vendor"],
            "firmware_version": r["firmware_version"],
            "zone": r["zone"],
        }
        for r in assets
    ])
    connections_df = pd.DataFrame([
        {
            "src_asset_id": r["src_asset_id"],
            "dst_asset_id": r["dst_asset_id"],
            "protocol": r["protocol"],
            "port": r["port"],
            "segmentation_boundary": bool(r["segmentation_boundary"]),
        }
        for r in connections
    ])
    exposure_df = pd.DataFrame([dict(r) for r in exposure])
    return {"assets": assets_df, "connections": connections_df, "exposure": exposure_df}
