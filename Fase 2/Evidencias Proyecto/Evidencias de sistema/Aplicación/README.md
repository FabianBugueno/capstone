# PowerGuardian Pro

Sistema inteligente de monitoreo y diagnostico de calidad de energia electrica para industria y mineria.

**Desarrollado para INDUC TECH** | Proyecto Capstone

---

## Requisitos Previos

Antes de comenzar, asegurate de tener instalado:

| Software           | Version minima | Descarga                                        |
| :----------------- | :------------- | :---------------------------------------------- |
| **Python**         | 3.11+          | https://www.python.org/downloads/               |
| **Node.js**        | 18+            | https://nodejs.org/                             |
| **Docker Desktop** | 4.0+           | https://www.docker.com/products/docker-desktop/ |
| **Git**            | 2.40+          | https://git-scm.com/                            |

---

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/pgp-powerguardian.git
cd pgp-powerguardian
```

---

## Paso 2: Levantar la Base de Datos (Docker)

El proyecto usa **TimescaleDB** (extension de PostgreSQL para series temporales) en un contenedor Docker.

```bash
docker-compose up -d
```

Esto levanta un contenedor llamado `pgp_db` con:

- **Puerto:** 5433 (mapeado al 5432 interno)
- **Base de datos:** pgp_db
- **Usuario:** postgres
- **Password:** [PASSWORD]
- **Volumen:** pgp_db_data (persistente)

Para verificar que esta corriendo:

```bash
docker ps
```

Deberias ver el contenedor `pgp_db` con estado `Up`.

---

## Paso 3: Configurar el Backend

### 3.1 Crear entorno virtual

```bash
cd backend
python -m venv venv
```

### 3.2 Activar entorno virtual

**Windows (PowerShell):**

```powershell
venv\Scripts\Activate.ps1
```

**Windows (CMD):**

```cmd
venv\Scripts\activate.bat
```

**Linux/Mac:**

```bash
source venv/bin/activate
```

### 3.3 Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3.4 Verificar archivo .env

El archivo `backend/.env` debe contener:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@localhost:5433/pgp_db

SECRET_KEY=ClaveUltraSecretaParaProyectoCapstonePoweGuardian
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Si no existe, crealo con esos valores.

### 3.5 Aplicar migraciones de base de datos

```bash
alembic upgrade head
```

Esto crea las 5 tablas: `clientes`, `usuarios`, `equipos`, `parametros_config`, `mediciones` (hypertable) e `incidencias`.

Tambien activa una politica de retencion de TimescaleDB: las `mediciones` de mas de 7 dias se borran automaticamente (un job diario). Las `incidencias` se conservan.

### 3.6 Iniciar el backend

```bash
uvicorn app.main:app --reload
```

El backend quedara disponible en `http://127.0.0.1:8000`.

Para verificar:

- Abrir `http://127.0.0.1:8000/health` — debe responder `{"status": "ok", "version": "0.1.0"}`
- Documentacion Swagger: `http://127.0.0.1:8000/docs`

---

## Paso 4: Configurar el Frontend

Abrir **otra terminal** (dejar el backend corriendo).

### 4.1 Instalar dependencias

```bash
cd frontend
npm install
```

### 4.2 Iniciar el frontend

```bash
npm run dev
```

El frontend quedara disponible en `http://localhost:5173`.

El proxy de Vite redirige las llamadas `/api/*` al backend en el puerto 8000 automaticamente.

---

## Paso 5: Crear Datos Iniciales

### 5.1 Registrar un usuario

Desde Postman, Swagger (`/docs`) o la terminal. El esquema requiere enviar también el campo `rol`.

**PowerShell:**

```powershell
$body = @{
    email = "admin@pgp.cl"
    password = "admin123"
    nombre = "Administrador"
    rol = "admin"
    cliente_id = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/register" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

Reemplaza `cliente_id` por el ID devuelto al crear el cliente.

**Linux/macOS o Git Bash:**

```bash
curl -X POST http://127.0.0.1:8000/auth/register -H "Content-Type: application/json" -d '{"email": "admin@pgp.cl", "password": "admin123", "nombre": "Administrador", "rol": "admin", "cliente_id": 1}'
```

**Nota:** Primero necesitas crear un cliente en la BD. Puedes hacerlo via SQL:

```sql
INSERT INTO clientes (nombre) VALUES ('INDUC TECH') RETURNING id;
```

### 5.2 Crear un equipo desde el frontend

1. Abrir `http://localhost:5173`
2. Hacer login con `admin@pgp.cl` / `admin123`
3. Ir a **Equipos** en el sidebar
4. Click en **Nuevo Equipo** y completar el formulario

### 5.3 Ejecutar seed de mediciones

```bash
cd backend
python scripts/seed_mediciones.py
```

Esto crea:

- Parametros de umbrales para el equipo
- 50 mediciones (35 normales + 15 con anomalias)
- Incidencias detectadas automaticamente

---

## Estructura del Proyecto

```
pgp-powerguardian/
├── docker-compose.yml          # TimescaleDB en Docker
├── README.md
├── backend/
│   ├── .env                    # Variables de entorno
│   ├── requirements.txt        # Dependencias Python
│   ├── alembic.ini             # Config Alembic
│   ├── alembic/
│   │   └── versions/           # Migraciones de BD
│   ├── app/
│   │   ├── main.py             # Punto de entrada FastAPI
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic Settings
│   │   │   ├── database.py     # SQLAlchemy engine + session
│   │   │   └── security.py     # JWT + hashing
│   │   ├── models/             # Modelos SQLAlchemy
│   │   │   ├── cliente.py
│   │   │   ├── usuario.py
│   │   │   ├── equipo.py
│   │   │   ├── medicion.py
│   │   │   ├── parametros_config.py
│   │   │   └── incidencia.py
│   │   ├── schemas/            # Schemas Pydantic
│   │   ├── routers/            # Endpoints REST
│   │   │   ├── auth.py
│   │   │   ├── equipos.py
│   │   │   ├── parametros.py
│   │   │   ├── mediciones.py
│   │   │   ├── dashboard.py
│   │   │   └── incidencias.py
│   │   └── services/
│   │       └── detector_anomalias.py
│   └── scripts/
│       └── seed_mediciones.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts          # Proxy /api -> backend
│   └── src/
│       ├── index.css           # Sistema de diseno SCADA
│       ├── App.tsx             # Rutas
│       ├── api/axios.ts        # Axios con JWT interceptor
│       ├── components/
│       │   ├── Layout.tsx      # Sidebar + topbar
│       │   └── ProtectedRoute.tsx
│       └── pages/
│           ├── Login.tsx
│           ├── Dashboard.tsx
│           ├── Equipos.tsx
│           ├── Graficos.tsx
│           └── Incidencias.tsx
└── prototipo/
    └── prototipo.html          # Prototipo visual HTML
```

---

## Endpoints de la API

| Metodo | Ruta                       | Descripcion                 |
| :----: | :------------------------- | :-------------------------- |
|  GET   | /health                    | Estado del servidor         |
|  POST  | /auth/register             | Registrar usuario           |
|  POST  | /auth/login                | Login (retorna JWT)         |
|  GET   | /me                        | Usuario autenticado         |
|  GET   | /equipos/                  | Listar equipos              |
|  POST  | /equipos/                  | Crear equipo                |
|  GET   | /parametros/{equipo_id}    | Obtener config              |
|  POST  | /parametros/               | Crear config                |
|  PUT   | /parametros/{equipo_id}    | Actualizar config           |
|  GET   | /mediciones/               | Listar mediciones (filtros) |
|  POST  | /mediciones/               | Registrar medicion          |
|  GET   | /mediciones/ultima/{id}    | Ultima medicion             |
|  GET   | /dashboard/estado-general  | Resumen general             |
|  GET   | /dashboard/resumen/{id}    | Resumen por equipo          |
|  GET   | /incidencias/              | Listar incidencias          |
|  GET   | /incidencias/activas/count | Contar alertas activas      |
|  PUT   | /incidencias/{id}          | Actualizar estado           |

Todos los endpoints (excepto /auth/\* y /health) requieren JWT en header `Authorization: Bearer <token>`.

---

## Stack Tecnologico

| Capa          | Tecnologia                  |
| :------------ | :-------------------------- |
| Backend       | Python 3.11 + FastAPI       |
| ORM           | SQLAlchemy 2.x              |
| Migraciones   | Alembic                     |
| Base de datos | TimescaleDB (PostgreSQL 16) |
| Contenedores  | Docker + Docker Compose     |
| Frontend      | React 19 + TypeScript       |
| Bundler       | Vite 8                      |
| Estilos       | TailwindCSS 4 + CSS custom  |
| Graficos      | Recharts                    |
| Autenticacion | JWT (python-jose)           |

---

## Comandos Utiles

```bash
# Levantar base de datos
docker-compose up -d

# Detener base de datos
docker-compose down

# Ver logs del contenedor
docker logs pgp_db

# Crear nueva migracion Alembic
cd backend
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
alembic upgrade head

# Revertir ultima migracion
alembic downgrade -1

# Backend en modo desarrollo
uvicorn app.main:app --reload

# Frontend en modo desarrollo
cd frontend
npm run dev
```
