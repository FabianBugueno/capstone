// El JWT dura ACCESS_TOKEN_EXPIRE_MINUTES (backend/.env); vencido, todas las consultas dan 401.

export function tokenVigente(): boolean {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp !== "number" || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function cerrarSesion() {
  localStorage.removeItem("token");
  if (window.location.pathname !== "/login") window.location.assign("/login");
}
