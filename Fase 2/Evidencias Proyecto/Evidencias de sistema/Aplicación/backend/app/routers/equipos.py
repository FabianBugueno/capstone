from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.equipo import Equipo
from app.schemas.equipo import EquipoCreate, EquipoResponse

router = APIRouter(prefix="/equipos", tags=["Equipos"])


@router.post("/", response_model=EquipoResponse, status_code=status.HTTP_201_CREATED)
def crear_equipo(data: EquipoCreate, db: Session = Depends(get_db),
user=Depends(get_current_user)):
    nuevo = Equipo(**data.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/", response_model=list[EquipoResponse])
def listar_equipos(db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Los dados de baja conservan su historial pero no se listan
    return db.query(Equipo).filter(Equipo.estado != "eliminado").all()

@router.get("/{equipo_id}", response_model=EquipoResponse)
def obtener_equipo(equipo_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    equipo =  db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return equipo


@router.delete("/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
def dar_de_baja_equipo(equipo_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Baja logica: el equipo sale de listas y del simulador; mediciones e incidencias se conservan."""
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    equipo.estado = "eliminado"
    db.commit()
