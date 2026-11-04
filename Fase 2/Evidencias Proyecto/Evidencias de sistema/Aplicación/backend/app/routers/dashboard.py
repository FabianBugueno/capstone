from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.medicion import Medicion
from app.models.equipo import Equipo

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/resumen/{equipo_id}")
def resumen_equipo(equipo_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ultima = db.query(Medicion).filter(
        Medicion.equipo_id == equipo_id
    ).order_by(Medicion.timestamp.desc()).first()

    total_mediciones = db.query(func.count()).select_from(Medicion).filter(
        Medicion.equipo_id == equipo_id
    ).scalar()

    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()

    return {
        "equipo": {
            "id": equipo.id if equipo else None,
            "nombre": equipo.nombre if equipo else None,
            "estado": equipo.estado if equipo else None
        },
        "total_mediciones": total_mediciones,
        "ultima_medicion": {
            "timestamp": ultima.timestamp if ultima else None,
            "voltaje_l1": ultima.voltaje_l1 if ultima else None,
            "voltaje_l2": ultima.voltaje_l2 if ultima else None,
            "voltaje_l3": ultima.voltaje_l3 if ultima else None,
            "thd": ultima.thd if ultima else None,
            "frecuencia": ultima.frecuencia if ultima else None,
            "factor_potencia": ultima.factor_potencia if ultima else None,
            "temperatura_gabinete": ultima.temperatura_gabinete if ultima else None
        }
    }


@router.get("/estado-general")
def estado_general(db: Session = Depends(get_db), user=Depends(get_current_user)):
    total_equipos = db.query(func.count()).select_from(Equipo).scalar()
    equipos_activos = db.query(func.count()).select_from(Equipo).filter(Equipo.estado == "activo").scalar()
    total_mediciones = db.query(func.count()).select_from(Medicion).scalar()

    return {
        "total_equipos": total_equipos,
        "equipos_activos": equipos_activos,
        "total_mediciones": total_mediciones
    }
