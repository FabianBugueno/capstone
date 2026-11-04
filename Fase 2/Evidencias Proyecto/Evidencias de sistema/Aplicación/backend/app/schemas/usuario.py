from pydantic import BaseModel, EmailStr
from datetime import datetime

class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    rol: str
    cliente_id: int | None = None

class UsuarioResponse(BaseModel):
    id: int
    email: str
    nombre: str
    rol: str
    cliente_id: int | None
    activo: bool
    fecha_registro: datetime


    class Config:
        from_attributes = True