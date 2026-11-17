from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional


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
    reconocida_por: Optional[str] = None
    reconocida_en: Optional[datetime] = None
    resuelta_por: Optional[str] = None
    resuelta_en: Optional[datetime] = None
    nota_resolucion: Optional[str] = None

    class Config:
        from_attributes = True


class IncidenciaUpdate(BaseModel):
    estado: Literal["reconocida", "resuelta"]
    nota: Optional[str] = Field(default=None, max_length=500)


class IncidenciaLote(BaseModel):
    """Cambio de estado masivo: por ids, o por filtro (estados/niveles/equipo) si no se envian ids."""
    estado: Literal["reconocida", "resuelta"]
    nota: Optional[str] = Field(default=None, max_length=500)
    ids: Optional[list[int]] = Field(default=None, max_length=1000)
    estados: Optional[list[str]] = None
    niveles: Optional[list[str]] = None