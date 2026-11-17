import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RiesgoEquipoResponse } from "../api/ml";

const NIVEL_TONO: Record<string, string> = { bajo: "ok", moderado: "warn", alto: "err", critico: "err" };

// Bloque propio de la prediccion ML en el panel principal, al lado de la franja de estado
export function PanelPrediccion({ riesgo }: { riesgo: RiesgoEquipoResponse }) {
  const [detalle, setDetalle] = useState(false);
  // estable: el riesgo se refresca cada 10 s y el modal no debe re-enfocar Cerrar en cada refresco
  const cerrarDetalle = useCallback(() => setDetalle(false), []);
  const pct = Math.round(riesgo.riesgo_falla * 100);
  const elevado = riesgo.nivel_alerta !== "bajo";
  const tono = NIVEL_TONO[riesgo.nivel_alerta] ?? "warn";

  return (
    <section className={`pgp-estado pgp-estado-${tono} pgp-pred`} aria-label="Predicción de falla con Machine Learning">
      <div className="pgp-pred-fila">
        <div className="pgp-pred-riesgo">
          <div className="pgp-pred-cab">
            <span className="pgp-pred-titulo">Predicción ML</span>
            <span className="pgp-estado-tag pgp-pred-nivel">{riesgo.nivel_alerta}</span>
          </div>
          <div className="pgp-pred-valor">
            <span className="pgp-pred-pct">{pct} %</span>
            <span className="pgp-pred-sub">riesgo de falla</span>
          </div>
          <div className="pgp-pred-barra" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Riesgo de falla">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="pgp-pred-horizonte">
          <span className="pgp-pred-sub">{elevado ? "Falla estimada" : "Sin falla anticipada"}</span>
          <strong>
            {elevado ? (riesgo.horizonte_estimado_min !== null ? `~${riesgo.horizonte_estimado_min} min` : "Inminente") : "Operación estable"}
          </strong>
          {elevado && <span className="pgp-pred-sub">hacia: {riesgo.clase_predominante_reciente}</span>}
          <button className="pgp-pred-link" onClick={() => setDetalle(true)} aria-haspopup="dialog">
            Detalle del modelo
          </button>
        </div>
      </div>
      {detalle && <ModalPrediccion riesgo={riesgo} tono={tono} onClose={cerrarDetalle} />}
    </section>
  );
}

// Portal a body: dentro del panel, las animaciones con transform romperian el position: fixed
function ModalPrediccion({ riesgo, tono, onClose }: { riesgo: RiesgoEquipoResponse; tono: string; onClose: () => void }) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const pct = Math.round(riesgo.riesgo_falla * 100);
  const elevado = riesgo.nivel_alerta !== "bajo";

  useEffect(() => {
    cerrarRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="pgp-modal-velo" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-prediccion-titulo"
        onClick={(e) => e.stopPropagation()}
        className={`pgp-card pgp-fade-in pgp-modal pgp-estado-${tono}`}
      >
        <header className="pgp-modal-cab">
          <div>
            <h2 id="modal-prediccion-titulo">Predicción de falla · Machine Learning</h2>
            <p>Estimación sobre las últimas {riesgo.mediciones_analizadas} mediciones del equipo; no es una falla confirmada.</p>
          </div>
          <button ref={cerrarRef} onClick={onClose} className="pgp-modal-cerrar" aria-label="Cerrar detalle del modelo">
            Cerrar
          </button>
        </header>

        <div className="pgp-pred-fila">
          <div className="pgp-pred-riesgo">
            <div className="pgp-pred-cab">
              <span className="pgp-pred-titulo">Riesgo de falla</span>
              <span className="pgp-estado-tag pgp-pred-nivel">{riesgo.nivel_alerta}</span>
            </div>
            <span className="pgp-pred-pct">{pct} %</span>
            <div className="pgp-pred-barra" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Riesgo de falla">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="pgp-pred-horizonte">
            <span className="pgp-pred-sub">{elevado ? "Falla estimada" : "Sin falla anticipada"}</span>
            <strong>
              {elevado ? (riesgo.horizonte_estimado_min !== null ? `~${riesgo.horizonte_estimado_min} min` : "Inminente") : "Operación estable"}
            </strong>
            <span className="pgp-pred-sub">hacia: {riesgo.clase_predominante_reciente}</span>
          </div>
        </div>

        {riesgo.diagnostico && (
          <>
            <h3 className="pgp-modal-sub">Diagnóstico</h3>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--txt1)" }}>{riesgo.diagnostico.titulo}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--txt2)" }}>{riesgo.diagnostico.descripcion}</p>
            {riesgo.diagnostico.indicadores_anomalos_actuales.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {riesgo.diagnostico.indicadores_anomalos_actuales.map((ind) => (
                  <span key={ind} className="pgp-estado-tag">{ind}</span>
                ))}
              </div>
            )}
            <p className="pgp-alert pgp-alert-info" style={{ marginTop: "10px" }}>
              <strong>Acción:</strong> {riesgo.diagnostico.accion_recomendada}
            </p>
          </>
        )}

        <h3 className="pgp-modal-sub">Factores del modelo</h3>
        <DetallePrediccion riesgo={riesgo} />
      </div>
    </div>,
    document.body,
  );
}

function DetallePrediccion({ riesgo }: { riesgo: RiesgoEquipoResponse }) {
  const f = riesgo.factores_contribuyentes;
  const pct = (v: number) => `${(v * 100).toFixed(0)} %`;
  const datos: [string, string][] = [
    ["Clase predominante", riesgo.clase_predominante_reciente],
    ["Deterioro", pct(f.tendencia_degradacion)],
    ["Severidad", pct(f.severidad_isolation_forest)],
    ["Lecturas anómalas", pct(f.proporcion_anomala_ventana)],
    ["Prob. de falla instantánea", pct(f.probabilidad_falla_instantanea)],
    ["Mediciones analizadas", String(riesgo.mediciones_analizadas)],
    ["Versión del modelo", riesgo.modelo_version],
  ];

  return (
    <dl className="pgp-estado-detalle">
      {datos.map(([etiqueta, valor]) => (
        <div key={etiqueta}>
          <dt>{etiqueta}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
