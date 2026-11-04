from sqlalchemy import Column, Integer, BigInteger, Numeric, String, DateTime, ForeignKey, PrimaryKeyConstraint
from app.core.database import Base


class Medicion(Base):
    __tablename__ = "mediciones"
    __table_args__ = (
        PrimaryKeyConstraint('timestamp', 'equipo_id'),
    )

    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    voltaje_l1 = Column(Numeric(10, 2))
    voltaje_l2 = Column(Numeric(10, 2))
    voltaje_l3 = Column(Numeric(10, 2))
    corriente_l1 = Column(Numeric(10, 2))
    corriente_l2 = Column(Numeric(10, 2))
    corriente_l3 = Column(Numeric(10, 2))
    thd = Column(Numeric(5, 2))
    frecuencia = Column(Numeric(6, 2))
    factor_potencia = Column(Numeric(4, 3))
    temperatura_gabinete = Column(Numeric(5, 2))
    estado_medicion = Column(String(20), default="normal")
