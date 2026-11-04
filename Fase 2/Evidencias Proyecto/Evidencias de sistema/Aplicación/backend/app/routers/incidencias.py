from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.incidencia import Incidencia
from app.schemas.incidencias import IncidenciaOut, IncidenciaUpdate
from app.services.en_vivo import publicar

router = APIRouter(prefix="/incidencias", tags=["Incidencias"])


@router.get("/", response_model=list[IncidenciaOut])
def listar_incidencias(
    equipo_id: Optional[int] = None,
    estado: Optional[str] = None,
    nivel: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(Incidencia)

    if equipo_id:
        query = query.filter(Incidencia.equipo_id == equipo_id)
    if estado:
        query = query.filter(Incidencia.estado == estado)
    if nivel:
        query = query.filter(Incidencia.nivel == nivel)

    return query.order_by(Incidencia.timestamp.desc()).limit(200).all()


@router.get("/activas/count")
def contar_activas(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    total = db.query(Incidencia).filter(Incidencia.estado == "activa").count()
    criticas = db.query(Incidencia).filter(
        Incidencia.estado == "activa",
        Incidencia.nivel == "critico"
    ).count()
    return {"total_activas": total, "criticas": criticas}


@router.put("/{incidencia_id}", response_model=IncidenciaOut)
def actualizar_estado(
    incidencia_id: int,
    datos: IncidenciaUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    inc = db.query(Incidencia).filter(Incidencia.id == incidencia_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")

    if datos.estado not in ["activa", "reconocida", "resuelta"]:
        raise HTTPException(status_code=400, detail="Estado inválido")

    inc.estado = datos.estado
    db.commit()
    db.refresh(inc)
    publicar("incidencia", {"equipo_id": inc.equipo_id, "nuevas": 0})
    return inc
