from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func


from app.core.database import Base

class Equipo(Base):
    __tablename__ = "equipos"

    id = Column(Integer, primary_key=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    nombre = Column(String(100), nullable=False)
    ubicacion = Column(String(200))
    estado = Column(String(20), default="activo")
    fecha_registro = Column(DateTime, server_default=func.now())