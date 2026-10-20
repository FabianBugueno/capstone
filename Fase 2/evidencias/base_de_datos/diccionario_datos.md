# Diccionario de Datos - PowerGuardian Pro

## 1. clientes
Almacena las empresas clientes del sistema.

| Campo          | Tipo         | Nulo | Descripcion                        |
|:---------------|:-------------|:----:|:-----------------------------------|
| id             | INTEGER      | No   | Identificador unico (autoincrement)|
| nombre         | VARCHAR(150) | No   | Razon social del cliente           |
| contacto       | VARCHAR(150) | Si   | Datos de contacto                  |
| fecha_registro | TIMESTAMP    | No   | Fecha de alta en el sistema        |

## 2. usuarios
Usuarios con acceso a la plataforma.

| Campo          | Tipo         | Nulo | Descripcion                        |
|:---------------|:-------------|:----:|:-----------------------------------|
| id             | INTEGER      | No   | Identificador unico                |
| email          | VARCHAR(255) | No   | Email (login), debe ser unico      |
| password_hash  | VARCHAR(255) | No   | Hash bcrypt de la contrasena       |
| nombre         | VARCHAR(150) | No   | Nombre completo                    |
| rol            | VARCHAR(20)  | No   | Rol: admin, tecnico, cliente       |
| cliente_id     | INTEGER      | Si   | FK al cliente asociado             |
| activo         | BOOLEAN      | No   | Estado de la cuenta                |
| fecha_registro | TIMESTAMP    | No   | Fecha de creacion                  |

## 3. equipos
Paneles electricos monitoreados.

| Campo          | Tipo         | Nulo | Descripcion                        |
|:---------------|:-------------|:----:|:-----------------------------------|
| id             | INTEGER      | No   | Identificador unico                |
| cliente_id     | INTEGER      | No   | FK al cliente propietario          |
| nombre         | VARCHAR(100) | No   | Nombre del equipo                  |
| ubicacion      | VARCHAR(200) | Si   | Ubicacion fisica                   |
| estado         | VARCHAR(20)  | No   | activo / inactivo / mantencion     |
| fecha_registro | TIMESTAMP    | No   | Fecha de alta                      |

## 4. parametros_config
Umbrales de operacion por equipo para deteccion de anomalias.

| Campo               | Tipo         | Nulo | Descripcion                        |
|:--------------------|:-------------|:----:|:-----------------------------------|
| id                  | INTEGER      | No   | Identificador unico                |
| equipo_id           | INTEGER      | No   | FK al equipo (UNIQUE - relacion 1:1)|
| voltaje_max         | NUMERIC(10,2)| Si   | Voltaje maximo permitido (V)       |
| voltaje_min         | NUMERIC(10,2)| Si   | Voltaje minimo permitido (V)       |
| thd_max             | NUMERIC(5,2) | Si   | THD maximo permitido (%)           |
| corriente_max       | NUMERIC(10,2)| Si   | Corriente maxima permitida (A)     |
| factor_potencia_min | NUMERIC(4,3) | Si   | Factor potencia minimo (cos phi)   |
| frecuencia_nominal  | NUMERIC(5,2) | Si   | Frecuencia nominal esperada (Hz)   |

## 5. mediciones
Datos electricos trifasicos en tiempo real (Hypertable TimescaleDB).

| Campo                | Tipo          | Nulo | Descripcion                        |
|:---------------------|:--------------|:----:|:-----------------------------------|
| equipo_id            | INTEGER       | No   | FK al equipo, parte de PK          |
| timestamp            | TIMESTAMPTZ   | No   | Momento de la medicion, parte de PK|
| voltaje_l1           | NUMERIC(10,2) | Si   | Voltaje fase L1 (V)               |
| voltaje_l2           | NUMERIC(10,2) | Si   | Voltaje fase L2 (V)               |
| voltaje_l3           | NUMERIC(10,2) | Si   | Voltaje fase L3 (V)               |
| corriente_l1         | NUMERIC(10,2) | Si   | Corriente fase L1 (A)             |
| corriente_l2         | NUMERIC(10,2) | Si   | Corriente fase L2 (A)             |
| corriente_l3         | NUMERIC(10,2) | Si   | Corriente fase L3 (A)             |
| thd                  | NUMERIC(5,2)  | Si   | Distorsion armonica total (%)      |
| frecuencia           | NUMERIC(6,2)  | Si   | Frecuencia de red (Hz)            |
| factor_potencia      | NUMERIC(4,3)  | Si   | Factor de potencia (cos phi)       |
| temperatura_gabinete | NUMERIC(5,2)  | Si   | Temperatura interna (C)           |
| estado_medicion      | VARCHAR(20)   | No   | normal / advertencia / alerta / critico |

## 6. incidencias
Alertas generadas automaticamente por el detector de anomalias.

| Campo          | Tipo          | Nulo | Descripcion                        |
|:---------------|:--------------|:----:|:-----------------------------------|
| id             | INTEGER       | No   | Identificador unico                |
| equipo_id      | INTEGER       | No   | FK al equipo afectado              |
| timestamp      | TIMESTAMP     | No   | Momento de la anomalia             |
| tipo           | VARCHAR(50)   | No   | Sobrevoltaje / Bajo Voltaje / THD Alto / Sobrecorriente / Bajo Factor Potencia / Anomalia ML |
| nivel          | VARCHAR(20)   | No   | critico / advertencia              |
| estado         | VARCHAR(20)   | No   | activa / reconocida / resuelta     |
| descripcion    | VARCHAR(500)  | Si   | Detalle de la anomalia             |
| valor_medido   | NUMERIC(10,2) | Si   | Valor que disparo la alerta        |
| umbral_config  | NUMERIC(10,2) | Si   | Umbral configurado superado        |
| fecha_creacion | TIMESTAMP     | No   | Fecha de registro de la incidencia |
