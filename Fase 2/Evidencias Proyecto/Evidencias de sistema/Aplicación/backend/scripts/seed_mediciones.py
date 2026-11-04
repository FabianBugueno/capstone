import requests
import random
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000"

# 1. Login
print("Haciendo login...")
login = requests.post(f"{BASE_URL}/auth/login", data={
    "username": "admin@pgp.cl",
    "password": "admin123"
})

if login.status_code != 200:
    print(f"Error en login: {login.text}")
    exit(1)

token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Token obtenido OK")

equipos_response = requests.get(f"{BASE_URL}/equipos/", headers=headers)
if equipos_response.status_code != 200:
    print(f"Error al obtener equipos: {equipos_response.status_code} {equipos_response.text}")
    exit(1)

equipos = equipos_response.json()
if not equipos:
    print("No hay equipos. Crea un equipo antes de ejecutar el seed.")
    exit(1)

equipo_id = equipos[0]["id"]
print(f"Usando equipo {equipo_id}: {equipos[0]['nombre']}")

# 2. Configurar parametros (umbrales)
print("Configurando umbrales...")
params = {
    "equipo_id": equipo_id,
    "voltaje_max": 240,
    "voltaje_min": 210,
    "thd_max": 5.0,
    "corriente_max": 100,
    "factor_potencia_min": 0.90,
    "frecuencia_nominal": 50
}
r = requests.post(f"{BASE_URL}/parametros/", json=params, headers=headers)
if r.status_code in [200, 201]:
    print("Parametros creados OK")
elif r.status_code == 400:
    print("Parametros ya existen")
else:
    print(f"Error configurando parametros: {r.status_code} {r.text}")
    exit(1)

# 3. Enviar mediciones normales + anomalas
print("Enviando mediciones...")
base_time = datetime.now() - timedelta(hours=2)
creadas = 0
anomalas = 0

for i in range(50):
    ts = base_time + timedelta(minutes=i * 2)

    if i < 35:
        # Mediciones normales
        medicion = {
            "equipo_id": equipo_id,
            "timestamp": ts.isoformat(),
            "voltaje_l1": round(random.uniform(218, 232), 1),
            "voltaje_l2": round(random.uniform(218, 232), 1),
            "voltaje_l3": round(random.uniform(218, 232), 1),
            "corriente_l1": round(random.uniform(40, 80), 1),
            "corriente_l2": round(random.uniform(40, 80), 1),
            "corriente_l3": round(random.uniform(40, 80), 1),
            "thd": round(random.uniform(2.0, 4.5), 1),
            "frecuencia": round(random.uniform(49.9, 50.1), 2),
            "factor_potencia": round(random.uniform(0.92, 0.98), 2),
            "temperatura_gabinete": round(random.uniform(30, 45), 1),
            "estado_medicion": "normal"
        }
    else:
        # Mediciones con anomalias
        medicion = {
            "equipo_id": equipo_id,
            "timestamp": ts.isoformat(),
            "voltaje_l1": round(random.uniform(245, 260), 1),
            "voltaje_l2": round(random.uniform(245, 260), 1),
            "voltaje_l3": round(random.uniform(200, 208), 1),
            "corriente_l1": round(random.uniform(105, 130), 1),
            "corriente_l2": round(random.uniform(40, 80), 1),
            "corriente_l3": round(random.uniform(40, 80), 1),
            "thd": round(random.uniform(6.0, 12.0), 1),
            "frecuencia": round(random.uniform(49.8, 50.2), 2),
            "factor_potencia": round(random.uniform(0.75, 0.88), 2),
            "temperatura_gabinete": round(random.uniform(50, 65), 1),
            "estado_medicion": "anomalia"
        }
        anomalas += 1

    r = requests.post(f"{BASE_URL}/mediciones/", json=medicion, headers=headers)
    if r.status_code in [200, 201]:
        creadas += 1
    else:
        print(f"Error al enviar medicion {i + 1}: {r.status_code} {r.text}")
        exit(1)

print(f"Mediciones creadas: {creadas} ({anomalas} con anomalias)")

# 4. Verificar incidencias generadas
r = requests.get(f"{BASE_URL}/incidencias/activas/count", headers=headers)
print(f"Incidencias activas: {r.json()}")

r = requests.get(f"{BASE_URL}/incidencias/?estado=activa", headers=headers)
for inc in r.json()[:5]:
    print(f"  [{inc['nivel']}] {inc['tipo']}: {inc['descripcion']}")
