import axios from "axios";
import { cerrarSesion } from "./sesion";

const api = axios.create({
  // En producción (Vercel) usará la URL de Render.
  // En local seguirá usando "/api" para que tu entorno de desarrollo no se rompa.
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sesion vencida o invalida: volver al login en vez de dejar la app sin datos
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/")) cerrarSesion();
    return Promise.reject(error);
  },
);

export default api;
