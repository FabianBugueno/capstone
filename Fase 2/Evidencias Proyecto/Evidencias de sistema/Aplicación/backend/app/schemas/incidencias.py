from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class IncidenciaOut(BaseModel):
    id: int
    equipo_id: int
    timestamp: datetime
    tipo: str
    nivel: str
    estado: str
    descripcion: Optional[str] = None
    valor_medido: Optional[float] = None
    umbral_config: Optional[float] = None
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class IncidenciaUpdate(BaseModel):
    estado: str