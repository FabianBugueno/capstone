from app.schemas.usuario import UsuarioResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends
from app.routers import auth
from app.core.security import get_current_user
from app.schemas.usuario import UsuarioResponse
from app.routers import equipos
from app.routers import parametros
from app.routers import mediciones
from app.routers import dashboard
from app.routers import incidencias
from app.routers import en_vivo
import asyncio
from contextlib import asynccontextmanager
from app.services.en_vivo import loop_simulador



@asynccontextmanager
async def lifespan(app: FastAPI):
    tarea = asyncio.create_task(loop_simulador())
    yield
    tarea.cancel()


app = FastAPI(
    lifespan=lifespan,
    title="PowerGuardian Pro API",
    version="0.1.0",
    description="Sistema de monitoreo y diagnostico de calidad de energia electrica"
)

app.include_router(auth.router)
app.include_router(equipos.router)
app.include_router(parametros.router)
app.include_router(mediciones.router)
app.include_router(dashboard.router)
app.include_router(incidencias.router)
app.include_router(en_vivo.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite peticiones desde cualquier origen temporalmente
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos HTTP (GET, POST, PUT, etc.)
    allow_headers=["*"],  # Permite todos los encabezados
)

@app.get("/health")
def health_check():
    return{"status": "ok", "version": "0.1.0"}


@app.get("/me", response_model=UsuarioResponse)
def get_me(current_user = Depends(get_current_user)):
    return current_user
