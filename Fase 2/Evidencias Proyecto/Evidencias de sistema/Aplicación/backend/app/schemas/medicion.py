from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class MedicionCreate(BaseModel):
    equipo_id: int
    timestamp: datetime
    voltaje_l1: Decimal | None = None
    voltaje_l2: Decimal | None = None
    voltaje_l3: Decimal | None = None
    corriente_l1: Decimal | None = None
    corriente_l2: Decimal | None = None
    corriente_l3: Decimal | None = None
    thd: Decimal | None = None
    frecuencia: Decimal | None = None
    factor_potencia: Decimal | None = None
    temperatura_gabinete: Decimal | None = None
    estado_medicion: str = "normal"


class MedicionResponse(MedicionCreate):
    class Config:
        from_attributes = True