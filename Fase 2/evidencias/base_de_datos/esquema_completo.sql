-- =============================================
-- PowerGuardian Pro - Esquema de Base de Datos
-- Motor: TimescaleDB (PostgreSQL 16)
-- =============================================

-- Extension TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Tabla: clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(150),
    fecha_registro TIMESTAMP DEFAULT now()
);

-- Tabla: usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id),
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP DEFAULT now()
);

-- Tabla: equipos
CREATE TABLE equipos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'activo',
    fecha_registro TIMESTAMP DEFAULT now()
);

-- Tabla: parametros_config
CREATE TABLE parametros_config (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL UNIQUE REFERENCES equipos(id),
    voltaje_max NUMERIC(10,2),
    voltaje_min NUMERIC(10,2),
    thd_max NUMERIC(5,2),
    corriente_max NUMERIC(10,2),
    factor_potencia_min NUMERIC(4,3),
    frecuencia_nominal NUMERIC(5,2)
);

-- Tabla: mediciones (Hypertable TimescaleDB)
CREATE TABLE mediciones (
    equipo_id INTEGER NOT NULL REFERENCES equipos(id),
    timestamp TIMESTAMPTZ NOT NULL,
    voltaje_l1 NUMERIC(10,2),
    voltaje_l2 NUMERIC(10,2),
    voltaje_l3 NUMERIC(10,2),
    corriente_l1 NUMERIC(10,2),
    corriente_l2 NUMERIC(10,2),
    corriente_l3 NUMERIC(10,2),
    thd NUMERIC(5,2),
    frecuencia NUMERIC(6,2),
    factor_potencia NUMERIC(4,3),
    temperatura_gabinete NUMERIC(5,2),
    estado_medicion VARCHAR(20) DEFAULT 'normal',
    PRIMARY KEY (timestamp, equipo_id)
);

-- Convertir a hypertable para optimizar consultas temporales
SELECT create_hypertable('mediciones', 'timestamp');

-- Indice para consultas por equipo
CREATE INDEX idx_mediciones_equipo_ts ON mediciones (equipo_id, timestamp DESC);

-- Tabla: incidencias
CREATE TABLE incidencias (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL REFERENCES equipos(id),
    timestamp TIMESTAMP NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    nivel VARCHAR(20) NOT NULL,
    estado VARCHAR(20) DEFAULT 'activa',
    descripcion VARCHAR(500),
    valor_medido NUMERIC(10,2),
    umbral_config NUMERIC(10,2),
    fecha_creacion TIMESTAMP DEFAULT now()
);

-- Indice para consultas de incidencias por equipo
CREATE INDEX idx_incidencias_equipo ON incidencias (equipo_id);
