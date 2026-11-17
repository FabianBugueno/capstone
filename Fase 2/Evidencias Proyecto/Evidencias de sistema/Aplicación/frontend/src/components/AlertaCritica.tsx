import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useEnVivo, { type CriticaVivo } from "../hooks/useEnVivo";
import { IconoIncidencias, IconoSilencio, IconoVolumen } from "./Iconos";

/**
 * Burbuja de alertas criticas (esquina inferior derecha, montada en el Layout).
 *
 * Escucha el evento "critica" del canal en vivo. No tapa la pagina: muestra un
 * contador de alertas sin revisar y, al pulsarla, un panel con el detalle.
 */

interface Aviso extends CriticaVivo {
  id: string;
}

// Mismo equipo + tipo no debe re-sonar cada segundo: el backend ya agrupa por
// ventana de 60 s, aqui se agrega una demora extra para no atoscar al usuario.
const DEMORA_REPETICION_MS = 120_000;
const MAX_AVISOS = 20;

function tonoSuave() {
  // Un solo tono senoidal grave y bajo de volumen, sin archivos de audio
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const ahora = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 523;
    gain.gain.setValueAtTime(0.0001, ahora);
    gain.gain.exponentialRampToValueAtTime(0.05, ahora + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ahora);
    osc.stop(ahora + 0.65);
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Sin audio disponible: la burbuja igual aparece
  }
}

function formatoHora(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AlertaCritica() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [sinRevisar, setSinRevisar] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [silenciado, setSilenciado] = useState(() => {
    try {
      return localStorage.getItem("alertasSilenciadas") === "1";
    } catch {
      return false;
    }
  });
  const alternarSonido = () =>
    setSilenciado((s) => {
      try {
        localStorage.setItem("alertasSilenciadas", s ? "0" : "1");
      } catch {
        // sin almacenamiento: la preferencia dura solo esta sesion
      }
      return !s;
    });
  const navigate = useNavigate();
  const ultimosRef = useRef<Map<string, number>>(new Map());
  const ultimoTonoRef = useRef(0);

  useEnVivo({
    critica: (d) => {
      const clave = `${d.equipo_id}-${d.tipo}`;
      const ahora = Date.now();
      const ultimo = ultimosRef.current.get(clave) ?? 0;
      if (ahora - ultimo < DEMORA_REPETICION_MS) return;
      ultimosRef.current.set(clave, ahora);

      setAvisos((prev) => [{ ...d, id: `${clave}-${ahora}` }, ...prev].slice(0, MAX_AVISOS));
      if (!abierto) setSinRevisar((n) => n + 1);

      // Sonido: solo si la pestana esta visible y no acaba de sonar
      if (!silenciado && document.visibilityState === "visible" && ahora - ultimoTonoRef.current > 5_000) {
        ultimoTonoRef.current = ahora;
        tonoSuave();
      }
    },
  });

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  if (avisos.length === 0) return null;

  const alternar = () => {
    setAbierto((a) => !a);
    setSinRevisar(0);
  };
  const limpiar = () => {
    setAvisos([]);
    setSinRevisar(0);
    setAbierto(false);
  };

  return (
    <div className="pgp-burbuja">
      {/* Anuncio para lectores de pantalla sin robar el foco */}
      <span className="sr-only" aria-live="polite">
        {sinRevisar > 0 ? `${sinRevisar} alerta(s) crítica(s) sin revisar` : ""}
      </span>

      {abierto && (
        <div className="pgp-burbuja-panel pgp-card" role="dialog" aria-label="Alertas críticas">
          <div className="pgp-burbuja-cab">
            <span>Alertas críticas · {avisos.length}</span>
            <button className="pgp-burbuja-texto" onClick={limpiar}>
              Limpiar
            </button>
          </div>
          <ul className="pgp-burbuja-lista">
            {avisos.map((a) => (
              <li key={a.id}>
                <div className="pgp-burbuja-fila">
                  <strong>{a.equipo ?? `Equipo ${a.equipo_id}`}</strong>
                  <span className="pgp-burbuja-hora">{formatoHora(a.timestamp)}</span>
                </div>
                <div className="pgp-burbuja-msg">{a.descripcion ?? a.tipo}</div>
                {(a.valor_medido != null || a.umbral != null) && (
                  <div className="pgp-burbuja-datos">
                    {a.valor_medido != null && <span>Medido: <strong>{a.valor_medido}</strong></span>}
                    {a.umbral != null && <span>Límite: <strong>{a.umbral}</strong></span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="pgp-burbuja-pie">
            <button
              className="pgp-burbuja-ver"
              onClick={() => {
                setAbierto(false);
                navigate("/incidencias?estado=activa");
              }}
            >
              Ver incidencias
            </button>
            <button
              className="pgp-burbuja-sonido"
              onClick={alternarSonido}
              aria-pressed={silenciado}
              aria-label={silenciado ? "Activar sonido de alertas" : "Silenciar sonido de alertas"}
              title={silenciado ? "Activar sonido" : "Silenciar"}
            >
              {silenciado ? <IconoSilencio /> : <IconoVolumen />}
            </button>
          </div>
        </div>
      )}

      <button
        className="pgp-burbuja-btn"
        onClick={alternar}
        aria-expanded={abierto}
        aria-label={`Alertas críticas: ${avisos.length}${sinRevisar ? `, ${sinRevisar} sin revisar` : ""}`}
        title="Alertas críticas"
      >
        <IconoIncidencias />
        {sinRevisar > 0 && <span className="pgp-burbuja-num">{sinRevisar > 9 ? "9+" : sinRevisar}</span>}
      </button>
    </div>
  );
}
