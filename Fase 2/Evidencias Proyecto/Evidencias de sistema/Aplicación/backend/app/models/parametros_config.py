from sqlalchemy import Column, Integer, Numeric, ForeignKey
from app.core.database import Base


class ParametrosConfig(Base):
    __tablename__ = "parametros_config"

    id = Column(Integer, primary_key=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False, unique=True)
    voltaje_max = Column(Numeric(10, 2))
    voltaje_min = Column(Numeric(10, 2))
    thd_max = Column(Numeric(5, 2))
    corriente_max = Column(Numeric(10, 2))
    factor_potencia_min = Column(Numeric(4, 3))
    frecuencia_nominal = Column(Numeric(5, 2))
