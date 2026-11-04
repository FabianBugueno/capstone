from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.parametros_config import ParametrosConfig
from app.schemas.parametros_config import ParametrosConfigCreate, ParametrosConfigResponse

router = APIRouter(prefix="/parametros", tags=["Parametros Config"])


@router.post("/", response_model=ParametrosConfigResponse, status_code=201)
def crear_parametros(data: ParametrosConfigCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    existente = db.query(ParametrosConfig).filter(ParametrosConfig.equipo_id == data.equipo_id).first()
    if existente:
        raise HTTPException(status_code=400, detail="Este equipo ya tiene parámetros configurados")
    nuevo = ParametrosConfig(**data.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/{equipo_id}", response_model=ParametrosConfigResponse)
def obtener_parametros(equipo_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    params = db.query(ParametrosConfig).filter(ParametrosConfig.equipo_id == equipo_id).first()
    if not params:
        raise HTTPException(status_code=404, detail="Parámetros no encontrados para este equipo")
    return params


@router.put("/{equipo_id}", response_model=ParametrosConfigResponse)
def actualizar_parametros(equipo_id: int, data: ParametrosConfigCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    params = db.query(ParametrosConfig).filter(ParametrosConfig.equipo_id == equipo_id).first()
    if not params:
        raise HTTPException(status_code=404, detail="Parámetros no encontrados")
    for key, value in data.model_dump().items():
        setattr(params, key, value)
    db.commit()
    db.refresh(params)
    return params
