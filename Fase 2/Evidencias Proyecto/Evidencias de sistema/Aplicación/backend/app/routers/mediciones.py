from email.policy import default
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.medicion import Medicion
from app.schemas.medicion import MedicionCreate, MedicionResponse
from app.services.detector_anomalias import detectar_anomalias
from app.services.en_vivo import publicar_medicion

router = APIRouter(prefix="/mediciones", tags=["Mediciones"])


@router.post("/", response_model=MedicionResponse, status_code=201)
def ingestar_medicion(data: MedicionCreate, db: Session = Depends(get_db),user=Depends(get_current_user)):
    nueva = Medicion(**data.model_dump())
    db.add(nueva)
    db.commit()
    incidencias = detectar_anomalias(db, data.equipo_id, nueva)
    db.refresh(nueva)
    publicar_medicion(nueva, incidencias)
    return nueva

@router.get("/", response_model=list[MedicionResponse])
def consultar_mediciones(
    equipo_id: int,
    desde: datetime = Query(default=None),
    hasta: datetime = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    query = db.query(Medicion).filter(Medicion.equipo_id == equipo_id)
    if desde:
        query = query.filter(Medicion.timestamp >= desde)
    if hasta:
        query = query.filter(Medicion.timestamp <= hasta)
    return query.order_by(Medicion.timestamp.desc()).limit(1000).all()


@router.get("/ultima/{equipo_id}", response_model=MedicionResponse | None)
def ultima_medicion(equipo_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Medicion).filter(Medicion.equipo_id == equipo_id).order_by(Medicion.timestamp.desc()).first()