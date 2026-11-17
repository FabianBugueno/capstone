from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.incidencia import Incidencia
from app.schemas.incidencias import IncidenciaLote, IncidenciaOut, IncidenciaUpdate
from app.services.en_vivo import publicar

router = APIRouter(prefix="/incidencias", tags=["Incidencias"])

# Ciclo de vida: activa -> reconocida -> resuelta (se puede resolver sin reconocer antes)
ORIGENES = {
    "reconocida": ("activa",),
    "resuelta": ("activa", "reconocida"),
}


def puede_pasar(actual: str, destino: str) -> bool:
    return actual in ORIGENES.get(destino, ())


def campos_transicion(destino: str, usuario: str, nota: Optional[str]) -> dict:
    ahora = datetime.now(timezone.utc)
    if destino == "reconocida":
        return {"estado": destino, "reconocida_por": usuario, "reconocida_en": ahora}
    return {"estado": destino, "resuelta_por": usuario, "resuelta_en": ahora, "nota_resolucion": nota or None}


def filtrar(query, equipo_id=None, estados=None, niveles=None):
    if equipo_id:
        query = query.filter(Incidencia.equipo_id == equipo_id)
    if estados:
        query = query.filter(Incidencia.estado.in_(estados))
    if niveles:
        query = query.filter(Incidencia.nivel.in_(niveles))
    return query


@router.get("/", response_model=list[IncidenciaOut])
def listar_incidencias(
    response: Response,
    equipo_id: Optional[int] = None,
    estado: Optional[list[str]] = Query(default=None),
    nivel: Optional[list[str]] = Query(default=None),
    limite: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = filtrar(db.query(Incidencia), equipo_id, estado, nivel)
    # Total del filtro para paginar en el cliente
    response.headers["X-Total-Count"] = str(query.count())
    return query.order_by(Incidencia.timestamp.desc(), Incidencia.id.desc()).offset(offset).limit(limite).all()


@router.get("/resumen")
def resumen_incidencias(
    equipo_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Conteo agrupado por estado, nivel y tipo (contadores y grafico de la vista de incidencias)."""
    filas = (
        filtrar(db.query(Incidencia.estado, Incidencia.nivel, Incidencia.tipo, func.count(Incidencia.id)), equipo_id)
        .group_by(Incidencia.estado, Incidencia.nivel, Incidencia.tipo)
        .all()
    )
    return [{"estado": e, "nivel": n, "tipo": t, "total": c} for e, n, t, c in filas]


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


# Debe declararse antes de /{incidencia_id} para que "lote" no se lea como id
@router.put("/lote")
def actualizar_lote(
    datos: IncidenciaLote,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if datos.ids is None and not datos.estados:
        raise HTTPException(status_code=400, detail="Indica ids o un filtro de estados")
    query = db.query(Incidencia)
    if datos.ids is not None:
        query = query.filter(Incidencia.id.in_(datos.ids))
    else:
        query = filtrar(query, datos.equipo_id, datos.estados, datos.niveles)
    # Solo cambian las que admiten la transicion; el resto se informa como omitidas
    candidatas = query.count()
    actualizadas = query.filter(Incidencia.estado.in_(ORIGENES[datos.estado])).update(
        campos_transicion(datos.estado, user.nombre, datos.nota), synchronize_session=False
    )
    db.commit()
    if actualizadas:
        publicar("incidencia", {"equipo_id": None, "nuevas": 0})
    return {"actualizadas": actualizadas, "omitidas": candidatas - actualizadas}


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

    if not puede_pasar(inc.estado, datos.estado):
        raise HTTPException(status_code=400, detail=f"No se puede pasar de '{inc.estado}' a '{datos.estado}'")

    for campo, valor in campos_transicion(datos.estado, user.nombre, datos.nota).items():
        setattr(inc, campo, valor)
    db.commit()
    db.refresh(inc)
    publicar("incidencia", {"equipo_id": inc.equipo_id, "nuevas": 0})
    return inc
