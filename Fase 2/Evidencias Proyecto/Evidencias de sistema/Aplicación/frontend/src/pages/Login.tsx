import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import useTema from "../hooks/useTema";
import {
  IconoArmonicos,
  IconoCompensacion,
  IconoCortocircuito,
  IconoIncidencias,
  IconoLuna,
  IconoParametros,
  IconoSol,
} from "../components/Iconos";

const CAPACIDADES = [
  { icono: <IconoParametros />, texto: "Tensiones, corrientes y potencias trifásicas en vivo" },
  { icono: <IconoArmonicos />, texto: "THD y espectro armónico según IEC 61000 / IEEE 519" },
  { icono: <IconoCompensacion />, texto: "Compensación activa del factor de potencia" },
  { icono: <IconoCortocircuito />, texto: "Cortocircuito, arco eléctrico y protecciones" },
  { icono: <IconoIncidencias />, texto: "Alertas automáticas por equipo con seguimiento" },
];

// Tres fases desfasadas 120°: un solo trazo por fase que se desplaza con CSS (sin JS ni canvas)
function OndaTrifasica() {
  const fase = (desfase: number) => {
    let d = "";
    for (let x = 0; x <= 800; x += 8) {
      const y = 40 + 26 * Math.sin((x / 200) * Math.PI * 2 + desfase);
      d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)} `;
    }
    return d;
  };
  return (
    <svg className="pgp-login-onda" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
      <g className="pgp-login-onda-mov">
        <path d={fase(0)} stroke="var(--phase-1)" />
        <path d={fase(2.094)} stroke="var(--phase-2)" />
        <path d={fase(4.189)} stroke="var(--phase-3)" />
      </g>
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [tema, alternarTema] = useTema();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const res = await api.post("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch {
      setError("Email o contraseña incorrectos. Revisa los datos e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pgp-login">
      <aside className="pgp-login-brand">
        <div>
          <div className="pgp-login-marca">
            <span className="pgp-login-sello" aria-hidden="true">
              <IconoParametros />
            </span>
            <span>INDUC TECH</span>
          </div>
          <h1>PowerGuardian Pro</h1>
          <p>Sistema inteligente de monitoreo y diagnóstico de calidad energética para industria y minería.</p>
        </div>

        <OndaTrifasica />

        <ul className="pgp-login-caps">
          {CAPACIDADES.map((c) => (
            <li key={c.texto}>
              {c.icono}
              {c.texto}
            </li>
          ))}
        </ul>

        <div className="pgp-login-normas" aria-label="Normas de referencia">
          <span>IEC 61000</span>
          <span>IEEE 519</span>
          <span>IEC 60909</span>
          <span>NFPA 70E</span>
        </div>
      </aside>

      <main className="pgp-login-main">
        <button
          className="pgp-theme-btn"
          onClick={alternarTema}
          aria-label={tema === "claro" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
          title={tema === "claro" ? "Modo oscuro" : "Modo claro"}
        >
          {tema === "claro" ? <IconoLuna /> : <IconoSol />}
        </button>

        <form onSubmit={handleSubmit} className="pgp-login-form">
          <h2>Iniciar sesión</h2>
          <p>Ingresa con tu cuenta para ver el estado de tus equipos.</p>

          {error && (
            <div className="pgp-alert pgp-alert-err" role="alert" style={{ marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@pgp.cl"
            required
          />

          <label htmlFor="login-pass">Contraseña</label>
          <input
            id="login-pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button type="submit" disabled={loading}>
            {loading && <span className="pgp-login-spinner" aria-hidden="true" />}
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="pgp-login-pie">Las mediciones llegan en vivo a cada pantalla, sin recargar.</p>
        </form>
      </main>
    </div>
  );
}
