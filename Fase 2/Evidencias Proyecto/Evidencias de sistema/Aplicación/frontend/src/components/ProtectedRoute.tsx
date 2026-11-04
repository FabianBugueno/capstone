import { Navigate } from "react-router-dom";
import { tokenVigente } from "../api/sesion";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!tokenVigente()) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
