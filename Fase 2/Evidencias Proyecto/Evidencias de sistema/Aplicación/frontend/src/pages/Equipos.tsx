import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import DetalleEquipo, { type Equipo } from "../components/DetalleEquipo";

const botonFila = (color: string) => ({
  padding: "4px 10px",
  fontSize: "12px",
  background: "transparent",
  border: `1px solid ${color}`,
  borderRadius: "4px",
  color,
  fontWeight: 600,
  cursor: "pointer",
});

interface EquipoForm {
  cliente_id: number;
  nombre: string;
  ubicacion: string;
  estado: string;
}

export default function Equipos() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detalle, setDetalle] = useState<Equipo | null>(null);
  const [baja, setBaja] = useState<Equipo | null>(null);
  // estables: los modales registran Escape con estas funciones
  const cerrarDetalle = useCallback(() => setDetalle(null), []);
  const cerrarBaja = useCallback(() => setBaja(null), []);
  const [form, setForm] = useState<EquipoForm>({
    cliente_id: 1,
    nombre: "",
    ubicacion: "",
    estado: "activo",
  });

  const fetchEquipos = () => {
    api
      .get("/equipos/")
      .then((res) => setEquipos(res.data))
      .catch(() => setError("Error cargando equipos"));
  };

  useEffect(() => {
    fetchEquipos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/equipos/", form);
      setSuccess("Equipo creado exitosamente");
      setForm({ cliente_id: 1, nombre: "", ubicacion: "", estado: "activo" });
      setShowForm(false);
      fetchEquipos();
    } catch {
      setError("Error al crear equipo");
    }
  };

  const darDeBaja = async (eq: Equipo) => {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/equipos/${eq.id}`);
      setSuccess(`Equipo "${eq.nombre}" dado de baja`);
      fetchEquipos();
    } catch {
      setError("Error al dar de baja el equipo");
    } finally {
      setBaja(null);
    }
  };

  const estadoBadge = (estado: string) => {
    if (estado === "activo") return "pgp-badge pgp-badge-ok";
    if (estado === "mantencion") return "pgp-badge pgp-badge-warn";
    return "pgp-badge pgp-badge-err";
  };

  const inputStyle = {
    width: "100%",
    padding: "6px 10px",
    background: "var(--bg-deep)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    color: "var(--txt1)",
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <Layout>
      <div
        className="pgp-fade-in"
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        {error && <div className="pgp-alert pgp-alert-err">{error}</div>}
        {success && <div className="pgp-alert pgp-alert-ok">{success}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "5px 14px",
              background: showForm ? "transparent" : "var(--accent)",
              border: showForm ? "1px solid var(--border2)" : "none",
              borderRadius: "4px",
              color: showForm ? "var(--txt1)" : "#fff",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 700,
              }}
          >
            {showForm ? "Cancelar" : "Nuevo Equipo"}
          </button>
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--txt3)" }}>
            {equipos.length} equipo(s) registrado(s)
          </span>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="pgp-card">
            <div className="pgp-card-title">Crear Nuevo Equipo</div>
            <div className="pgp-grid-2" style={{ gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--txt3)", display: "block", marginBottom: "3px" }}>
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  style={inputStyle}
                  placeholder="Panel Solar Planta Norte"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--txt3)", display: "block", marginBottom: "3px" }}>
                  Ubicación
                </label>
                <input
                  type="text"
                  value={form.ubicacion}
                  onChange={(e) =>
                    setForm({ ...form, ubicacion: e.target.value })
                  }
                  style={inputStyle}
                  placeholder="Santiago, Chile"
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--txt3)", display: "block", marginBottom: "3px" }}>
                  Cliente ID
                </label>
                <input
                  type="number"
                  value={form.cliente_id}
                  onChange={(e) =>
                    setForm({ ...form, cliente_id: Number(e.target.value) })
                  }
                  min={1}
                  style={{ ...inputStyle, fontVariantNumeric: "tabular-nums" }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--txt3)", display: "block", marginBottom: "3px" }}>
                  Estado
                </label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option
                    value="activo"
                    style={{ background: "var(--bg-deep)" }}
                  >
                    Activo
                  </option>
                  <option
                    value="inactivo"
                    style={{ background: "var(--bg-deep)" }}
                  >
                    Inactivo
                  </option>
                  <option
                    value="mantencion"
                    style={{ background: "var(--bg-deep)" }}
                  >
                    En Mantencion
                  </option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              style={{
                marginTop: "10px",
                padding: "7px 20px",
                background: "var(--accent)",
                border: "none",
                borderRadius: "4px",
                color: "#fff",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 700,
                }}
            >
              Crear Equipo
            </button>
          </form>
        )}

        {/* Tabla */}
        <div className="pgp-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="pgp-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Fecha Registro</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "var(--txt3)",
                    }}
                  >
                    No hay equipos registrados
                  </td>
                </tr>
              ) : (
                equipos.map((eq) => (
                  <tr key={eq.id}>
                    <td className="mono">{eq.id}</td>
                    <td style={{ color: "var(--txt1)", fontWeight: 600 }}>
                      {eq.nombre}
                    </td>
                    <td>{eq.ubicacion || "-"}</td>
                    <td>
                      <span className={estadoBadge(eq.estado)}>
                        {eq.estado.charAt(0).toUpperCase() + eq.estado.slice(1)}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px" }}>
                      {new Date(eq.fecha_registro).toLocaleDateString("es-CL")}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button onClick={() => setDetalle(eq)} style={botonFila("var(--accent)")} aria-label={`Ver detalles de ${eq.nombre}`}>
                          Ver detalles
                        </button>
                        <button onClick={() => setBaja(eq)} style={botonFila("var(--danger)")} aria-label={`Eliminar ${eq.nombre}`}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {detalle && <DetalleEquipo equipo={detalle} onClose={cerrarDetalle} />}
      {baja && <ConfirmarBaja equipo={baja} onConfirm={() => darDeBaja(baja)} onClose={cerrarBaja} />}
    </Layout>
  );
}

function ConfirmarBaja({ equipo, onConfirm, onClose }: { equipo: Equipo; onConfirm: () => void; onClose: () => void }) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cancelarRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pgp-modal-velo" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="baja-titulo"
        aria-describedby="baja-desc"
        onClick={(e) => e.stopPropagation()}
        className="pgp-card pgp-fade-in"
        style={{ width: "min(420px, 100%)", display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <h2 id="baja-titulo" style={{ fontSize: "16px", fontWeight: 700, color: "var(--txt1)", margin: 0 }}>
          ¿Eliminar "{equipo.nombre}"?
        </h2>
        <p id="baja-desc" style={{ fontSize: "13px", color: "var(--txt2)", margin: 0 }}>
          El equipo deja de aparecer en el sistema y de generar mediciones. Su historial de mediciones e incidencias se conserva.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button ref={cancelarRef} onClick={onClose} style={{ ...botonFila("var(--border2)"), color: "var(--txt2)" }}>
            Cancelar
          </button>
          <button
            onClick={() => {
              setEnviando(true);
              onConfirm();
            }}
            disabled={enviando}
            style={{ ...botonFila("var(--danger)"), background: "var(--danger)", color: "#fff", opacity: enviando ? 0.6 : 1 }}
          >
            {enviando ? "Eliminando..." : "Eliminar equipo"}
          </button>
        </div>
      </div>
    </div>
  );
}
