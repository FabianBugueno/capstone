from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.core.database import Base


class PrediccionML(Base):
    __tablename__ = "predicciones_ml"

    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now(), index=True)
    clase_predicha = Column(String(50), nullable=True)
    probabilidad = Column(Numeric(5, 4), nullable=True)
    riesgo_falla = Column(Numeric(5, 4), nullable=True)
    horizonte_estimado_min = Column(Integer, nullable=True)
    modelo_version = Column(String(20), nullable=True)

    __table_args__ = (
        Index("ix_predicciones_ml_equipo_timestamp", "equipo_id", "timestamp"),
    )