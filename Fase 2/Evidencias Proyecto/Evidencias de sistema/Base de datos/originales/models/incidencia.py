from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class Incidencia(Base):
    __tablename__ = "incidencias"

    id = Column(Integer, primary_key=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    tipo = Column(String(50), nullable=False)
    nivel = Column(String(20), nullable=False)
    estado = Column(String(20), default="activa")
    descripcion = Column(String(500))
    valor_medido = Column(Numeric(10, 2))
    umbral_config = Column(Numeric(10, 2))
    fecha_creacion = Column(DateTime, server_default=func.now())
    reconocida_por = Column(String(150))
    reconocida_en = Column(DateTime(timezone=True))
    resuelta_por = Column(String(150))
    resuelta_en = Column(DateTime(timezone=True))
    nota_resolucion = Column(String(500))