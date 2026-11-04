from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombre = Column(String(150), nullable=False)
    rol = Column(String(20), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    activo = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, server_default=func.now())