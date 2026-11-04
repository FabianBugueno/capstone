import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Equipos from "./pages/Equipos";
import Graficos from "./pages/Graficos";
import ProtectedRoute from "./components/ProtectedRoute";
import Incidencias from "./pages/Incidencias";
import FormaOnda from "./pages/FormaOnda";
import ParametrosElectricos from "./pages/ParametrosElectricos";
import Armonicos from "./pages/Armonicos";
import Compensacion from "./pages/Compensacion";
import Cortocircuito from "./pages/Cortocircuito";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipos"
        element={
          <ProtectedRoute>
            <Equipos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/graficos"
        element={
          <ProtectedRoute>
            <Graficos />
          </ProtectedRoute>
        }
      />

      <Route
        path="/parametros-electricos"
        element={
          <ProtectedRoute>
            <ParametrosElectricos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/armonicos"
        element={
          <ProtectedRoute>
            <Armonicos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compensacion"
        element={
          <ProtectedRoute>
            <Compensacion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cortocircuito"
        element={
          <ProtectedRoute>
            <Cortocircuito />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forma-onda"
        element={
          <ProtectedRoute>
            <FormaOnda />
          </ProtectedRoute>
        }
      />

      <Route
        path="/incidencias"
        element={
          <ProtectedRoute>
            <Incidencias />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
