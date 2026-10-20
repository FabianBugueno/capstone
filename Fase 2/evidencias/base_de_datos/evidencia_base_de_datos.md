# Evidencia de Base de Datos - PowerGuardian Pro

## 1. Motor de Base de Datos

- **Motor:** TimescaleDB (extension de PostgreSQL 16)
- **Proposito:** Optimizado para series temporales (mediciones electricas)
- **Contenedor:** Docker (timescale/timescaledb:latest-pg16)
- **Puerto:** 5433 (mapeado desde 5432 interno)
- **Base de datos:** pgp_db
- **Volumen persistente:** pgp_db_data

## 2. Esquema de Tablas

### 2.1 Tabla: clientes

| Columna        | Tipo         | Restricciones     |
| :------------- | :----------- | :---------------- |
| id             | INTEGER      | PK, autoincrement |
| nombre         | VARCHAR(150) | NOT NULL          |
| contacto       | VARCHAR(150) |                   |
| fecha_registro | TIMESTAMP    | DEFAULT now()     |

---

### 2.2 Tabla: usuarios

| Columna        | Tipo         | Restricciones                |
| :------------- | :----------- | :--------------------------- |
| id             | INTEGER      | PK, autoincrement            |
| email          | VARCHAR(255) | UNIQUE, NOT NULL             |
| password_hash  | VARCHAR(255) | NOT NULL                     |
| nombre         | VARCHAR(150) | NOT NULL                     |
| rol            | VARCHAR(20)  | NOT NULL                     |
| cliente_id     | INTEGER      | FK -> clientes(id), nullable |
| activo         | BOOLEAN      | DEFAULT true                 |
| fecha_registro | TIMESTAMP    | DEFAULT now()                |

**Roles validos:** admin, tecnico, cliente

---

### 2.3 Tabla: equipos

| Columna        | Tipo         | Restricciones                |
| :------------- | :----------- | :--------------------------- |
| id             | INTEGER      | PK, autoincrement            |
| cliente_id     | INTEGER      | FK -> clientes(id), NOT NULL |
| nombre         | VARCHAR(100) | NOT NULL                     |
| ubicacion      | VARCHAR(200) |                              |
| estado         | VARCHAR(20)  | DEFAULT 'activo'             |
| fecha_registro | TIMESTAMP    | DEFAULT now()                |

**Estados validos:** activo, inactivo, mantencion

---

### 2.4 Tabla: parametros_config

| Columna             | Tipo          | Restricciones                       |
| :------------------ | :------------ | :---------------------------------- |
| id                  | INTEGER       | PK, autoincrement                   |
| equipo_id           | INTEGER       | FK -> equipos(id), UNIQUE, NOT NULL |
| voltaje_max         | NUMERIC(10,2) |                                     |
| voltaje_min         | NUMERIC(10,2) |                                     |
| thd_max             | NUMERIC(5,2)  |                                     |
| corriente_max       | NUMERIC(10,2) |                                     |
| factor_potencia_min | NUMERIC(4,3)  |                                     |
| frecuencia_nominal  | NUMERIC(5,2)  |                                     |

**Relacion:** 1 equipo -> 1 configuracion (1:1)

---

### 2.5 Tabla: mediciones (Hypertable TimescaleDB)

| Columna              | Tipo          | Restricciones                   |
| :------------------- | :------------ | :------------------------------ |
| equipo_id            | INTEGER       | FK -> equipos(id), NOT NULL, PK |
| timestamp            | TIMESTAMP(tz) | NOT NULL, PK                    |
| voltaje_l1           | NUMERIC(10,2) |                                 |
| voltaje_l2           | NUMERIC(10,2) |                                 |
| voltaje_l3           | NUMERIC(10,2) |                                 |
| corriente_l1         | NUMERIC(10,2) |                                 |
| corriente_l2         | NUMERIC(10,2) |                                 |
| corriente_l3         | NUMERIC(10,2) |                                 |
| thd                  | NUMERIC(5,2)  |                                 |
| frecuencia           | NUMERIC(6,2)  |                                 |
| factor_potencia      | NUMERIC(4,3)  |                                 |
| temperatura_gabinete | NUMERIC(5,2)  |                                 |
| estado_medicion      | VARCHAR(20)   | DEFAULT 'normal'                |

**Clave primaria compuesta:** (timestamp, equipo_id)
**Hypertable:** Particionada por timestamp para consultas eficientes en series temporales
**Indice:** idx_mediciones_equipo_ts (equipo_id, timestamp)

---

### 2.6 Tabla: incidencias

| Columna        | Tipo          | Restricciones               |
| :------------- | :------------ | :-------------------------- |
| id             | INTEGER       | PK, autoincrement           |
| equipo_id      | INTEGER       | FK -> equipos(id), NOT NULL |
| timestamp      | TIMESTAMP     | NOT NULL                    |
| tipo           | VARCHAR(50)   | NOT NULL                    |
| nivel          | VARCHAR(20)   | NOT NULL                    |
| estado         | VARCHAR(20)   | DEFAULT 'activa'            |
| descripcion    | VARCHAR(500)  |                             |
| valor_medido   | NUMERIC(10,2) |                             |
| umbral_config  | NUMERIC(10,2) |                             |
| fecha_creacion | TIMESTAMP     | DEFAULT now()               |

**Tipos de incidencia:** Sobrevoltaje, Bajo Voltaje, THD Alto, Sobrecorriente, Bajo Factor Potencia, Anomalia ML
**Niveles:** critico, advertencia
**Estados:** activa, reconocida, resuelta

---

## 3. Diagrama Entidad-Relacion

```
+-------------+       +-------------+       +-------------------+
|  clientes   |<------+  usuarios   |       | parametros_config |
+------+------+       +-------------+       +---------+---------+
       |                                              |
       |1:N                                       1:1 |
       |                                              |
+------v------+                               +------v------+
|   equipos   +<------------------------------+ (equipo_id) |
+------+------+                               +-------------+
       |
       |1:N
       |
+------v------+       +----------------+
|  mediciones |       |  incidencias   |
| (hypertable)+------>+ (generadas     |
+-------------+       |  por detector) |
                      +----------------+
```

**Relaciones:**

- clientes 1:N equipos (un cliente tiene muchos equipos)
- clientes 1:N usuarios (un cliente tiene muchos usuarios)
- equipos 1:1 parametros_config (un equipo tiene una configuracion)
- equipos 1:N mediciones (un equipo tiene muchas mediciones)
- equipos 1:N incidencias (un equipo tiene muchas incidencias)

## 4. Consultas SQL de Verificacion

```sql
-- Total de registros por tabla
SELECT 'clientes' as tabla, COUNT(*) FROM clientes
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'equipos', COUNT(*) FROM equipos
UNION ALL SELECT 'parametros_config', COUNT(*) FROM parametros_config
UNION ALL SELECT 'mediciones', COUNT(*) FROM mediciones
UNION ALL SELECT 'incidencias', COUNT(*) FROM incidencias;

-- Verificar que mediciones es una hypertable
SELECT * FROM timescaledb_information.hypertables;

-- Ultimas 5 mediciones
SELECT equipo_id, timestamp, voltaje_l1, thd, factor_potencia
FROM mediciones ORDER BY timestamp DESC LIMIT 5;

-- Incidencias activas por tipo
SELECT tipo, nivel, COUNT(*)
FROM incidencias
WHERE estado = 'activa'
GROUP BY tipo, nivel
ORDER BY COUNT(*) DESC;

-- Mediciones con anomalias (THD > 5 o FP < 0.9)
SELECT COUNT(*) as anomalas,
       COUNT(*) FILTER (WHERE thd > 5) as thd_alto,
       COUNT(*) FILTER (WHERE factor_potencia < 0.9) as fp_bajo
FROM mediciones;
```

## 5. Migraciones Alembic

Las migraciones se gestionan con Alembic y se encuentran en:
`backend/alembic/versions/`

Comandos:

```bash
alembic upgrade head    # Aplicar todas las migraciones
alembic downgrade -1    # Revertir ultima migracion
alembic history         # Ver historial de migraciones
```

## 6. Docker Compose

```yaml
services:
  db:
    image: timescale/timescaledb:latest-pg16
    container_name: pgp_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: [PASSWORD]
      POSTGRES_DB: pgp_db
    ports:
      - "5433:5432"
    volumes:
      - pgp_db_data:/var/lib/postgresql/data

volumes:
  pgp_db_data:
```
