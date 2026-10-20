# Evidencia de Aplicacion - PowerGuardian Pro

## 1. Arquitectura del Sistema

PowerGuardian Pro es un sistema de monitoreo de calidad de energia electrica compuesto por 3 servicios independientes:

```
+------------------+     +-----------------+     +-------------------+
|    Frontend      |     |     Backend     |     |    Simulador      |
|  React + Vite    +---->+  FastAPI + SA   +<----+  FastAPI + httpx  |
|  Puerto 5173     |     |  Puerto 8000    |     |  Puerto 8001      |
+------------------+     +--------+--------+     +-------------------+
                                  |
                         +--------v--------+
                         |   TimescaleDB   |
                         |  PostgreSQL 16  |
                         |  Puerto 5433    |
                         +-----------------+
```

## 2. Stack Tecnologico

| Capa            | Tecnologia                               |
| :-------------- | :--------------------------------------- |
| Frontend        | React 19 + TypeScript + Vite 8           |
| Estilos         | TailwindCSS 4 + CSS custom (SCADA theme) |
| Graficos        | Recharts                                 |
| Backend         | Python 3.11 + FastAPI                    |
| ORM             | SQLAlchemy 2.x                           |
| Migraciones     | Alembic                                  |
| Base de datos   | TimescaleDB (PostgreSQL 16)              |
| Contenedores    | Docker + Docker Compose                  |
| Autenticacion   | JWT (python-jose)                        |
| Simulador       | FastAPI + httpx                          |
| ML (deteccion)  | scikit-learn (Isolation Forest)          |
| Deploy Frontend | Vercel                                   |
| Deploy Backend  | Render                                   |

## 3. Paginas de la Aplicacion

### 3.1 Login

- Formulario con email y contrasena
- Validacion de credenciales contra el backend
- Token JWT almacenado en localStorage
- Redireccion al Dashboard tras autenticacion exitosa

### 3.2 Dashboard

- 4 tarjetas KPI: Total Equipos, Equipos Activos, Total Mediciones, Alertas Activas
- Selector de equipo monitoreado (dropdown dinamico)
- Estado operacional del equipo con indicador visual
- Panel de indicadores PGP: Voltajes L1/L2/L3, THD, Factor Potencia, Frecuencia
- Grafico de tendencia Voltaje L1 (Recharts)
- 3 Gauges SVG: Factor Potencia, THD (%), Frecuencia (Hz)
- Tabla de ultimas 10 mediciones con formato numerico

### 3.3 Graficos

- 4 graficos de linea con Recharts:
  - Voltajes trifasicos (L1, L2, L3) vs tiempo
  - THD (%) vs tiempo
  - Frecuencia (Hz) vs tiempo
  - Factor de Potencia vs tiempo
- Selector de equipo
- Formato de fecha DD/MM HH:MM

### 3.4 Equipos

- Tabla con lista de equipos registrados
- Badges de estado con colores (activo=verde, inactivo=rojo, mantencion=amarillo)
- Formulario para crear nuevo equipo
- Campos: nombre, ubicacion, cliente_id, estado

### 3.5 Incidencias

- Lista de alertas generadas automaticamente por el detector de anomalias
- Filtros por estado: Todas, Activas, Reconocidas, Resueltas
- Cada incidencia muestra: tipo, nivel, descripcion, valor medido vs umbral, fecha
- Botones para cambiar estado: RECONOCER / RESOLVER
- Indicadores visuales por nivel (critico=rojo, advertencia=amarillo)

### 3.6 Simulador Electrico (servicio independiente)

- Panel visual estilo SCADA con forma de onda trifasica animada (Canvas)
- 4 Gauges SVG: Factor Potencia, THD, Frecuencia, Temperatura
- Lecturas en tiempo real: Tensiones (VA, VB, VC), Corrientes (IA, IB, IC)
- Controles: Iniciar/Detener simulacion, selector de escenario, intervalo
- 8 escenarios: Normal, THD Alto, FP Bajo, Sobrecarga, Sobrevoltaje, Bajo Voltaje, Desbalance, Falla Critica
- Generacion de lotes (200 mediciones de una vez)
- Log de actividad en tiempo real

## 4. API REST - Endpoints

| Metodo | Ruta                       | Descripcion                    |
| :----: | :------------------------- | :----------------------------- |
|  POST  | /auth/register             | Registrar usuario              |
|  POST  | /auth/login                | Login (retorna JWT)            |
|  GET   | /me                        | Perfil del usuario autenticado |
|  GET   | /equipos/                  | Listar equipos                 |
|  POST  | /equipos/                  | Crear equipo                   |
|  GET   | /parametros/{equipo_id}    | Obtener configuracion          |
|  POST  | /parametros/               | Crear configuracion            |
|  PUT   | /parametros/{equipo_id}    | Actualizar configuracion       |
|  GET   | /mediciones/               | Listar mediciones (filtros)    |
|  POST  | /mediciones/               | Registrar medicion + deteccion |
|  GET   | /mediciones/ultima/{id}    | Ultima medicion                |
|  GET   | /dashboard/estado-general  | Resumen KPIs                   |
|  GET   | /dashboard/resumen/{id}    | Resumen por equipo             |
|  GET   | /incidencias/              | Listar incidencias             |
|  GET   | /incidencias/activas/count | Contar alertas activas         |
|  PUT   | /incidencias/{id}          | Actualizar estado incidencia   |
|  POST  | /ml/entrenar               | Entrenar modelo ML             |
|  GET   | /ml/estado                 | Estado del modelo              |
|  GET   | /health                    | Health check                   |

Todos los endpoints (excepto /auth/\* y /health) requieren JWT en header Authorization: Bearer <token>.

## 5. Detector de Anomalias

### 5.1 Motor de Reglas (basado en umbrales)

El sistema compara cada medicion contra los parametros configurados del equipo:

| Condicion                 | Tipo                 | Nivel               |
| :------------------------ | :------------------- | :------------------ |
| Voltaje > voltaje_max     | Sobrevoltaje         | critico             |
| Voltaje < voltaje_min     | Bajo Voltaje         | critico             |
| THD > thd_max             | THD Alto             | advertencia/critico |
| Corriente > corriente_max | Sobrecorriente       | critico             |
| FP < factor_potencia_min  | Bajo Factor Potencia | advertencia         |

### 5.2 Machine Learning (Isolation Forest)

- Modelo: Isolation Forest (scikit-learn)
- Features: 9 variables electricas + 4 derivadas (desbalance V, desbalance I, dev. frecuencia, potencia)
- Entrenamiento con datos historicos normales
- Deteccion automatica de outliers sin umbrales manuales
- Diagnostico legible de la anomalia detectada

## 6. Diseno Visual

El frontend utiliza un tema SCADA industrial personalizado:

- Fondo oscuro: #050E1A
- Acentos cyan: #00C8E8
- Tipografia monoespaciada para valores numericos
- Gauges SVG animados
- Gradientes en encabezados
- Micro-animaciones CSS (fade-in, pulse en indicadores)
- Sin emojis - solo iconos SVG
