import asyncio
# pyrefly: ignore [missing-import]
import httpx
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import HTMLResponse
import os

from ecenarios import ESCENARIOS, generar_mixto


app = FastAPI(
    title="PGP Simulador Electrico",
    version="1.0.0",
    description="Simulador de datos trifasicos para PowerGuardian Pro",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Estado global del simulador ──

class EstadoSim:
    def __init__(self):
        self.activo = False
        self.escenario = "mixto"
        self.equipo_id = 2
        self.intervalo = 5
        self.backend_url = "http://127.0.0.1:8000"
        self.token = None
        self.contador = 0
        self.errores = 0
        self.ultimo_envio = None
        self.historial = []
        self._task = None

estado = EstadoSim()


# ── Schemas ──

class ConfigSim(BaseModel):
    escenario: str = "mixto"
    equipo_id: int = 2
    intervalo: int = 5
    backend_url: str = "http://127.0.0.1:8000"
    email: str = "admin@pgp.cl"
    password: str = "admin123"


class LoteConfig(BaseModel):
    escenario: str = "mixto"
    equipo_id: int = 2
    cantidad: int = 200


# ── Funciones internas ──

async def autenticar(email: str, password: str):
    """Obtiene JWT del backend principal."""
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{estado.backend_url}/auth/login",
            data={"username": email, "password": password},
        )
        if res.status_code == 200:
            estado.token = res.json()["access_token"]
            return True
    return False


async def enviar_medicion(datos: dict):
    """Envia una medicion al backend principal."""
    if not estado.token:
        return False

    headers = {"Authorization": f"Bearer {estado.token}"}
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{estado.backend_url}/mediciones/",
            json=datos,
            headers=headers,
        )
        return res.status_code in [200, 201]


async def loop_simulacion():
    """Loop principal que genera y envia datos periodicamente."""
    t = 0
    while estado.activo:
        if estado.escenario == "mixto":
            nombre, datos = generar_mixto(float(t))
        elif estado.escenario in ESCENARIOS:
            nombre = estado.escenario
            datos = ESCENARIOS[nombre](float(t))
        else:
            nombre = "normal"
            datos = ESCENARIOS["normal"](float(t))

        datos["equipo_id"] = estado.equipo_id
        datos["timestamp"] = datetime.now().isoformat()

        exito = await enviar_medicion(datos)
        if exito:
            estado.contador += 1
        else:
            estado.errores += 1

        estado.ultimo_envio = datetime.now().isoformat()

        registro = {
            "n": estado.contador,
            "escenario": nombre,
            "timestamp": estado.ultimo_envio,
            "v_l1": datos["voltaje_l1"],
            "thd": datos["thd"],
            "fp": datos["factor_potencia"],
            "exito": exito,
        }
        estado.historial.append(registro)
        if len(estado.historial) > 100:
            estado.historial = estado.historial[-100:]

        t += 1
        await asyncio.sleep(estado.intervalo)


# ── Endpoints ──

@app.get("/")
def info():
    """Estado actual del simulador."""
    return {
        "nombre": "PGP Simulador Electrico",
        "activo": estado.activo,
        "escenario": estado.escenario,
        "equipo_id": estado.equipo_id,
        "intervalo_seg": estado.intervalo,
        "mediciones_enviadas": estado.contador,
        "errores": estado.errores,
        "ultimo_envio": estado.ultimo_envio,
        "backend": estado.backend_url,
        "escenarios_disponibles": list(ESCENARIOS.keys()) + ["mixto"],
    }


@app.post("/iniciar")
async def iniciar(config: ConfigSim):
    """Inicia la simulacion continua."""
    if estado.activo:
        return {"mensaje": "Simulador ya esta activo", "activo": True}

    estado.escenario = config.escenario
    estado.equipo_id = config.equipo_id
    estado.intervalo = config.intervalo
    estado.backend_url = config.backend_url

    auth = await autenticar(config.email, config.password)
    if not auth:
        return {"error": "No se pudo autenticar con el backend"}

    estado.activo = True
    estado.contador = 0
    estado.errores = 0
    estado._task = asyncio.create_task(loop_simulacion())

    return {
        "mensaje": "Simulacion iniciada",
        "escenario": config.escenario,
        "equipo_id": config.equipo_id,
        "intervalo": config.intervalo,
    }


@app.post("/detener")
def detener():
    """Detiene la simulacion."""
    if not estado.activo:
        return {"mensaje": "Simulador no esta activo"}

    estado.activo = False
    if estado._task:
        estado._task.cancel()
        estado._task = None

    return {
        "mensaje": "Simulacion detenida",
        "mediciones_enviadas": estado.contador,
        "errores": estado.errores,
    }


@app.post("/escenario/{nombre}")
def cambiar_escenario(nombre: str):
    """Cambia el escenario en caliente (sin detener)."""
    if nombre not in list(ESCENARIOS.keys()) + ["mixto"]:
        return {"error": f"Escenario '{nombre}' no existe"}

    estado.escenario = nombre
    return {"mensaje": f"Escenario cambiado a '{nombre}'", "activo": estado.activo}


@app.post("/lote")
async def generar_lote(config: LoteConfig):
    """Genera un lote de mediciones de una sola vez (no continuo)."""
    if not estado.token:
        auth = await autenticar("admin@pgp.cl", "admin123")
        if not auth:
            return {"error": "No se pudo autenticar"}

    creadas = 0
    errores = 0

    for i in range(config.cantidad):
        if config.escenario == "mixto":
            _, datos = generar_mixto(float(i))
        else:
            datos = ESCENARIOS.get(config.escenario, ESCENARIOS["normal"])(float(i))

        datos["equipo_id"] = config.equipo_id
        datos["timestamp"] = datetime.now().isoformat()

        if await enviar_medicion(datos):
            creadas += 1
        else:
            errores += 1

    return {
        "mensaje": f"Lote completado",
        "creadas": creadas,
        "errores": errores,
        "escenario": config.escenario,
    }


@app.get("/historial")
def ver_historial():
    """Ultimas 100 mediciones enviadas."""
    return {"total": len(estado.historial), "registros": estado.historial}

@app.get("/panel", response_class=HTMLResponse)
def panel():
    """Panel visual del simulador."""
    html_path = os.path.join(os.path.dirname(__file__), "panel.html")
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/health")
def health():
    return {"status": "ok", "servicio": "simulador"}
