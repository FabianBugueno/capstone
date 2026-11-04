import asyncio
import json
import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.core.database import Sessionlocal
from app.models.equipo import Equipo
from app.models.medicion import Medicion
from app.models.parametros_config import ParametrosConfig
from app.schemas.medicion import MedicionResponse
from app.services.detector_anomalias import detectar_anomalias
from app.services.escenarios import ESCENARIOS, generar_mixto

log = logging.getLogger("pgp.en_vivo")

# ── Difusion de eventos a los clientes conectados (SSE) ──
# shortcut: broker en memoria, solo sirve con un proceso de uvicorn; con varios workers usar Redis/pg NOTIFY.

_suscriptores: set[asyncio.Queue] = set()
_loop: asyncio.AbstractEventLoop | None = None


def suscribir() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=200)
    _suscriptores.add(q)
    return q


def desuscribir(q: asyncio.Queue):
    _suscriptores.discard(q)


def _entregar(mensaje: str):
    for q in list(_suscriptores):
        try:
            q.put_nowait(mensaje)
        except asyncio.QueueFull:
            pass  # cliente lento: se pierde este evento, no se bloquea al resto


def publicar(evento: str, datos: dict):
    """Seguro de llamar desde el event loop o desde hilos (rutas sync de FastAPI)."""
    if _loop is None:
        return
    mensaje = f"event: {evento}\ndata: {json.dumps(datos)}\n\n"
    _loop.call_soon_threadsafe(_entregar, mensaje)


def publicar_medicion(medicion: Medicion, incidencias: list):
    publicar("medicion", MedicionResponse.model_validate(medicion).model_dump(mode="json"))
    if incidencias:
        publicar("incidencia", {"equipo_id": medicion.equipo_id, "nuevas": len(incidencias)})


# ── Simulador integrado: genera mediciones para todos los equipos activos ──

class EstadoSimulador:
    def __init__(self):
        self.activo = settings.SIMULADOR_ACTIVO
        self.escenario = settings.SIMULADOR_ESCENARIO
        self.intervalo = settings.SIMULADOR_INTERVALO
        self.generadas = 0
        self.ultimo_error: str | None = None


simulador = EstadoSimulador()


def _generar(t: float) -> dict:
    if simulador.escenario in ESCENARIOS:
        return ESCENARIOS[simulador.escenario](t)
    return generar_mixto(t)[1]


# Umbrales por defecto para equipos sin configuracion: sin ellos el detector no genera incidencias
UMBRALES_DEFECTO = dict(
    voltaje_max=240, voltaje_min=210, thd_max=5, corriente_max=100,
    factor_potencia_min=0.9, frecuencia_nominal=50,
)
_con_umbrales: set[int] = set()


def _asegurar_umbrales(db, equipo_id: int):
    if equipo_id in _con_umbrales:
        return
    if not db.query(ParametrosConfig.id).filter(ParametrosConfig.equipo_id == equipo_id).first():
        db.add(ParametrosConfig(equipo_id=equipo_id, **UMBRALES_DEFECTO))
        db.commit()
        log.info("Simulador: umbrales por defecto creados para equipo %s", equipo_id)
    _con_umbrales.add(equipo_id)


def _tick(t: int):
    db = Sessionlocal()
    try:
        equipos = db.query(Equipo.id).filter(Equipo.estado == "activo").all()
        ahora = datetime.now(timezone.utc)
        for (equipo_id,) in equipos:
            _asegurar_umbrales(db, equipo_id)
            medicion = Medicion(equipo_id=equipo_id, timestamp=ahora, **_generar(float(t)))
            db.add(medicion)
            db.commit()
            incidencias = detectar_anomalias(db, equipo_id, medicion)
            db.refresh(medicion)
            publicar_medicion(medicion, incidencias)
            simulador.generadas += 1
        simulador.ultimo_error = None
    finally:
        db.close()


async def loop_simulador():
    global _loop
    _loop = asyncio.get_running_loop()
    t = 0
    while True:
        if simulador.activo:
            try:
                await asyncio.to_thread(_tick, t)
            except Exception as e:  # la BD puede caerse; el loop debe seguir vivo
                simulador.ultimo_error = f"{type(e).__name__}: {e}"[:200]
                log.warning("Simulador: %s", simulador.ultimo_error)
            t += 1
        await asyncio.sleep(simulador.intervalo)
