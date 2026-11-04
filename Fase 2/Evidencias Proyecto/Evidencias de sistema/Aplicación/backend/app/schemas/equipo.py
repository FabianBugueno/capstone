from pydantic import BaseModel
from datetime import datetime


class EquipoCreate(BaseModel):
    cliente_id: int
    nombre: str
    ubicacion: str | None = None
    estado: str = "activo"


class EquipoResponse(BaseModel):
    id: int
    cliente_id: int
    nombre: str
    ubicacion: str | None
    estado: str
    fecha_registro: datetime

    class Config:
        from_attributes = True
