from pydantic import BaseModel
from decimal import Decimal


class ParametrosConfigCreate(BaseModel):
    equipo_id: int
    voltaje_max: Decimal
    voltaje_min: Decimal
    thd_max: Decimal
    corriente_max: Decimal
    factor_potencia_min: Decimal
    frecuencia_nominal: Decimal


class ParametrosConfigResponse(ParametrosConfigCreate):
    id: int

    class Config:
        from_attributes = True
