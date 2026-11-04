import type { ReactNode } from "react";

// Set de iconos propio: trazo de 1.75 px en grilla de 24, mismo peso en toda la app
function Icono({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconoPanel = () => (
  <Icono>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Icono>
);

export const IconoParametros = () => (
  <Icono>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </Icono>
);

export const IconoArmonicos = () => (
  <Icono>
    <path d="M4 20V10M9 20V4M14 20v-7M19 20v-4" />
  </Icono>
);

export const IconoOnda = () => (
  <Icono>
    <path d="M2 12c2.5-6 5-6 7.5 0s5 6 7.5 0 3.5-4 5-3" />
  </Icono>
);

export const IconoTendencias = () => (
  <Icono>
    <path d="M3 3v18h18" />
    <path d="m7 15 4-4 3 3 5-6" />
  </Icono>
);

export const IconoCompensacion = () => (
  <Icono>
    <path d="M12 3v18M5 21h14" />
    <path d="M5 7h14" />
    <path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
  </Icono>
);

export const IconoCortocircuito = () => (
  <Icono>
    <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" />
    <path d="m13 8-3 4h4l-3 4" />
  </Icono>
);

export const IconoEquipos = () => (
  <Icono>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
  </Icono>
);

export const IconoIncidencias = () => (
  <Icono>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Icono>
);

export const IconoSalir = () => (
  <Icono size={16}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Icono>
);

export const IconoSol = () => (
  <Icono>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icono>
);

export const IconoLuna = () => (
  <Icono>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Icono>
);

export const IconoMenu = () => (
  <Icono>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icono>
);
