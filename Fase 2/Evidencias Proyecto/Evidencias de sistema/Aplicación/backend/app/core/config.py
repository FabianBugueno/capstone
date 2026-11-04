from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # Simulador integrado: arranca con el backend y genera datos para los equipos activos
    SIMULADOR_ACTIVO: bool = True
    SIMULADOR_ESCENARIO: str = "mixto"
    SIMULADOR_INTERVALO: float = 1.0

    class Config:
        env_file = ".env"


settings = Settings()
