"""SQLAlchemy ORM models for ICRS persistence."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Engagement(Base):
    __tablename__ = "engagements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_name: Mapped[str] = mapped_column(String(200), nullable=False)
    site_name: Mapped[str] = mapped_column(String(200), nullable=False)
    cost_per_hour: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    engagement_id: Mapped[int] = mapped_column(ForeignKey("engagements.id"), index=True)
    asset_id: Mapped[str] = mapped_column(String(100), index=True)
    hostname: Mapped[str] = mapped_column(String(255), default="")
    ip: Mapped[str] = mapped_column(String(64), default="")
    asset_type: Mapped[str] = mapped_column(String(100), default="")
    criticality: Mapped[int] = mapped_column(Integer, default=3)
    vendor: Mapped[str] = mapped_column(String(100), default="")
    firmware_version: Mapped[str] = mapped_column(String(100), default="")
    zone: Mapped[str] = mapped_column(String(100), default="")


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    engagement_id: Mapped[int] = mapped_column(ForeignKey("engagements.id"), index=True)
    src_asset_id: Mapped[str] = mapped_column(String(100))
    dst_asset_id: Mapped[str] = mapped_column(String(100))
    protocol: Mapped[str] = mapped_column(String(50), default="")
    port: Mapped[int] = mapped_column(Integer, default=0)
    segmentation_boundary: Mapped[bool] = mapped_column(Boolean, default=False)


class Exposure(Base):
    __tablename__ = "exposures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    engagement_id: Mapped[int] = mapped_column(ForeignKey("engagements.id"), index=True)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    open_ports: Mapped[str] = mapped_column(String(500), default="")
    services: Mapped[str] = mapped_column(String(1000), default="")
    vulnerabilities: Mapped[str] = mapped_column(String(1000), default="")
    last_update: Mapped[str] = mapped_column(String(100), default="")
    risk_label: Mapped[str] = mapped_column(String(50), default="unknown")
    risk_weight: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(255), default="ok")


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    engagement_id: Mapped[int] = mapped_column(ForeignKey("engagements.id"), index=True)
    heatmap_json: Mapped[dict] = mapped_column(JSON)
    top_paths_json: Mapped[list] = mapped_column(JSON)
    chokepoints_json: Mapped[list] = mapped_column(JSON)
    financials_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReportRecord(Base):
    __tablename__ = "report_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    engagement_id: Mapped[int] = mapped_column(ForeignKey("engagements.id"), index=True)
    path: Mapped[str] = mapped_column(String(400), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
