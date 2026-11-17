-- =====================================================================
-- Power Guardian Pro (PGP) - Esquema de base de datos
-- Motor      : PostgreSQL 16 + TimescaleDB
-- Base       : pgp_db  (usuario: postgres, puerto 5433 -> 5432 en docker)
-- Origen     : generado a partir de las migraciones Alembic del proyecto
--              backend/alembic/versions/
-- Uso        : psql -h localhost -p 5433 -U postgres -d pgp_db -f pgp_db_esquema.sql
-- =====================================================================

\set ON_ERROR_STOP on

-- Extension requerida por TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ---------------------------------------------------------------------
-- Tabla: clientes
-- Migracion: e16ebc79e8ce_crear_tablas_clientes_y_usuarios.py
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    contacto       VARCHAR(150),
    fecha_registro TIMESTAMP DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabla: usuarios
-- Migracion: e16ebc79e8ce_crear_tablas_clientes_y_usuarios.py
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id             SERIAL PRIMARY KEY,
    email          VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    rol            VARCHAR(20) NOT NULL,
    cliente_id     INTEGER REFERENCES clientes (id),
    activo         BOOLEAN,
    fecha_registro TIMESTAMP DEFAULT now(),
    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

-- ---------------------------------------------------------------------
-- Tabla: equipos
-- Migracion: 6aabcd312ed2_crear_tabla_equipos.py
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipos (
    id             SERIAL PRIMARY KEY,
    cliente_id     INTEGER NOT NULL REFERENCES clientes (id),
    nombre         VARCHAR(100) NOT NULL,
    ubicacion      VARCHAR(200),
    estado         VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabla: parametros_config (umbrales de medicion por equipo)
-- Migracion: f469bf3fe3ec_crear_tabla_parametros_config.py
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parametros_config (
    id                   SERIAL PRIMARY KEY,
    equipo_id            INTEGER NOT NULL UNIQUE REFERENCES equipos (id),
    voltaje_max          NUMERIC(10, 2),
    voltaje_min          NUMERIC(10, 2),
    thd_max              NUMERIC(5, 2),
    corriente_max        NUMERIC(10, 2),
    factor_potencia_min  NUMERIC(4, 3),
    frecuencia_nominal   NUMERIC(5, 2)
);

-- ---------------------------------------------------------------------
-- Tabla: mediciones (serie de tiempo, hypertable de TimescaleDB)
-- Migracion: 3144b78988b7_crear_tabla_mediciones.py
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mediciones (
    equipo_id             INTEGER NOT NULL REFERENCES equipos (id),
    timestamp             TIMESTAMPTZ NOT NULL,
    voltaje_l1            NUMERIC(10, 2),
    voltaje_l2            NUMERIC(10, 2),
    voltaje_l3            NUMERIC(10, 2),
    corriente_l1          NUMERIC(10, 2),
    corriente_l2          NUMERIC(10, 2),
    corriente_l3          NUMERIC(10, 2),
    thd                   NUMERIC(5, 2),
    frecuencia            NUMERIC(6, 2),
    factor_potencia       NUMERIC(4, 3),
    temperatura_gabinete  NUMERIC(5, 2),
    estado_medicion       VARCHAR(20),
    PRIMARY KEY (timestamp, equipo_id)
);

-- ---------------------------------------------------------------------
-- Tabla: incidencias
-- Migraciones: a1b2c3d4e5f6_crear_tabla_incidencias.py
--              d3e4f5a6b7c8_trazabilidad_incidencias.py (quien y cuando reconoce o resuelve)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidencias (
    id               SERIAL PRIMARY KEY,
    equipo_id        INTEGER NOT NULL REFERENCES equipos (id),
    timestamp        TIMESTAMP NOT NULL,
    tipo             VARCHAR(50) NOT NULL,
    nivel            VARCHAR(20) NOT NULL,
    estado           VARCHAR(20) DEFAULT 'activa',
    descripcion      VARCHAR(500),
    valor_medido     NUMERIC(10, 2),
    umbral_config    NUMERIC(10, 2),
    fecha_creacion   TIMESTAMP DEFAULT now(),
    reconocida_por   VARCHAR(150),
    reconocida_en    TIMESTAMPTZ,
    resuelta_por     VARCHAR(150),
    resuelta_en      TIMESTAMPTZ,
    nota_resolucion  VARCHAR(500)
);

-- ---------------------------------------------------------------------
-- Tabla: predicciones_ml (resultados del modelo de prediccion de fallas)
-- Migracion: c2d3e4f5a6b7_crear_tabla_predicciones_ml.py
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predicciones_ml (
    id                      SERIAL PRIMARY KEY,
    equipo_id               INTEGER NOT NULL REFERENCES equipos (id),
    timestamp               TIMESTAMPTZ NOT NULL DEFAULT now(),
    clase_predicha          VARCHAR(50),
    probabilidad            NUMERIC(5, 4),
    riesgo_falla            NUMERIC(5, 4),
    horizonte_estimado_min  INTEGER,
    modelo_version          VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS ix_predicciones_ml_equipo_id        ON predicciones_ml (equipo_id);
CREATE INDEX IF NOT EXISTS ix_predicciones_ml_timestamp        ON predicciones_ml (timestamp);
CREATE INDEX IF NOT EXISTS ix_predicciones_ml_equipo_timestamp ON predicciones_ml (equipo_id, timestamp);

-- ---------------------------------------------------------------------
-- Politicas de TimescaleDB
-- Migracion: b7c8d9e0f1a2_retencion_mediciones_7_dias.py
-- ---------------------------------------------------------------------
-- Convierte mediciones en una hypertable particionada por "timestamp"
SELECT create_hypertable('mediciones', 'timestamp', if_not_exists => TRUE);

-- Borra los datos de mediciones con mas de 7 dias
SELECT add_retention_policy('mediciones', INTERVAL '7 days', if_not_exists => TRUE);

-- =====================================================================
-- Fin del esquema
-- =====================================================================
