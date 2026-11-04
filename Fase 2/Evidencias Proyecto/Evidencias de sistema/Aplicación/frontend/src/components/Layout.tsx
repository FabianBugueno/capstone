import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useTema from "../hooks/useTema";
import {
  IconoArmonicos,
  IconoCompensacion,
  IconoCortocircuito,
  IconoEquipos,
  IconoIncidencias,
  IconoLuna,
  IconoMenu,
  IconoOnda,
  IconoPanel,
  IconoParametros,
  IconoSalir,
  IconoSol,
  IconoTendencias,
} from "./Iconos";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: "Panel Principal", path: "/dashboard", group: "Dashboard", icon: <IconoPanel />, sub: "Estado general y lecturas en vivo del equipo" },
  { label: "Parámetros Eléctricos", path: "/parametros-electricos", group: "Monitoreo Trifásico", icon: <IconoParametros />, sub: "Potencias, corrientes, tensiones y línea de distribución" },
  { label: "Análisis Armónicos / THD", path: "/armonicos", group: "Monitoreo Trifásico", icon: <IconoArmonicos />, sub: "Espectro armónico estimado · IEC 61000 / IEEE 519" },
  { label: "Forma de Onda Trifásica", path: "/forma-onda", group: "Monitoreo Trifásico", icon: <IconoOnda />, sub: "Osciloscopio en vivo y control del simulador" },
  { label: "Tendencias Eléctricas", path: "/graficos", group: "Monitoreo Trifásico", icon: <IconoTendencias />, sub: "Últimas 60 mediciones del equipo" },
  { label: "Compensación Activa", path: "/compensacion", group: "Compensación", icon: <IconoCompensacion />, sub: "Correccion del factor de potencia" },
  { label: "Cortocircuito / Protección", path: "/cortocircuito", group: "Compensación", icon: <IconoCortocircuito />, sub: "IEC 60909 · NFPA 70E · curvas de protección" },
  { label: "Equipos", path: "/equipos", group: "Gestión", icon: <IconoEquipos />, sub: "Registro y estado de los equipos monitoreados" },
  { label: "Incidencias", path: "/incidencias", group: "Alertas", icon: <IconoIncidencias />, sub: "Alertas detectadas y su seguimiento" },
];

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tema, alternarTema] = useTema();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const grouped = navItems.reduce(
    (acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, typeof navItems>,
  );

  const actual = navItems.find((i) => i.path === location.pathname);

  return (
    <div className="pgp-app">
      {menuAbierto && <div className="pgp-velo" onClick={() => setMenuAbierto(false)} />}
      <aside className={`pgp-sidebar ${menuAbierto ? "abierto" : ""}`}>
        <div className="pgp-brand">
          <div className="pgp-brand-name">PowerGuardian Pro</div>
          <div className="pgp-brand-sub">Gestión de calidad energética</div>
          <div className="pgp-brand-ver">
            <span className="pgp-dot pgp-dot-ok"></span> v1.0 · Operativo
          </div>
          <div className="pgp-brand-company">INDUC TECH</div>
        </div>

        <nav className="pgp-nav" aria-label="Navegación principal">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="pgp-nav-group">
              <div className="pgp-nav-group-label">{group}</div>
              {items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    setMenuAbierto(false);
                    navigate(item.path);
                  }}
                  className={`pgp-nav-item ${location.pathname === item.path ? "active" : ""}`}
                  aria-current={location.pathname === item.path ? "page" : undefined}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="pgp-sidebar-footer">
          <button className="pgp-sidebar-btn" onClick={logout}>
            <IconoSalir /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="pgp-main">
        <header className="pgp-topbar">
          <button className="pgp-theme-btn pgp-menu-btn" onClick={() => setMenuAbierto(true)} aria-label="Abrir menu">
            <IconoMenu />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="pgp-topbar-title">{actual?.label ?? "PowerGuardian Pro"}</h1>
            <p className="pgp-topbar-sub">
              {actual?.sub ?? "Sistema Inteligente de Monitoreo y Diagnóstico de Calidad Energética"}
            </p>
          </div>
          <div className="pgp-topbar-right">
            <span className="pgp-badge pgp-badge-ok">
              <span className="pgp-dot pgp-dot-ok pgp-dot-pulse"></span>Sistema activo
            </span>
            <span className="pgp-badge pgp-badge-info">IEC 61000</span>
            <span className="pgp-topbar-time" aria-label="Hora actual">{timeStr}</span>
            <button
              className="pgp-theme-btn"
              onClick={alternarTema}
              aria-label={tema === "claro" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
              title={tema === "claro" ? "Modo oscuro" : "Modo claro"}
            >
              {tema === "claro" ? <IconoLuna /> : <IconoSol />}
            </button>
          </div>
        </header>

        <main className="pgp-content">{children}</main>
      </div>
    </div>
  );
}
