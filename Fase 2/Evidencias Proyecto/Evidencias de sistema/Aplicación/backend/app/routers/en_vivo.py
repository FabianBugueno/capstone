import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from app.core.security import get_current_user
from app.services.auth_service import decode_access_token
from app.services.escenarios import ESCENARIOS
from app.services.en_vivo import desuscribir, simulador, suscribir

router = APIRouter(tags=["En Vivo"])


@router.get("/en-vivo")
async def stream_en_vivo(request: Request, token: str = Query(...)):
    # EventSource no permite cabeceras, por eso el JWT viaja como query param
    if not decode_access_token(token):
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    async def eventos():
        q = suscribir()
        try:
            yield "retry: 2000\n\n"
            while not await request.is_disconnected():
                try:
                    yield await asyncio.wait_for(q.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"  # mantiene viva la conexion a traves de proxies
        finally:
            desuscribir(q)

    return StreamingResponse(
        eventos(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/simulador/estado")
def estado_simulador(user=Depends(get_current_user)):
    return {
        "activo": simulador.activo,
        "escenario": simulador.escenario,
        "intervalo_seg": simulador.intervalo,
        "mediciones_generadas": simulador.generadas,
        "ultimo_error": simulador.ultimo_error,
        "escenarios_disponibles": list(ESCENARIOS.keys()) + ["mixto"],
    }


@router.post("/simulador/escenario/{nombre}")
def cambiar_escenario(nombre: str, user=Depends(get_current_user)):
    if nombre not in list(ESCENARIOS.keys()) + ["mixto"]:
        raise HTTPException(status_code=404, detail=f"Escenario '{nombre}' no existe")
    simulador.escenario = nombre
    return {"escenario": nombre}
