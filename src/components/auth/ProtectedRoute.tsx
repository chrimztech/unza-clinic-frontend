import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccessPath, getDefaultPathForRole } from "@/lib/navigation";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">Loading session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.forcePasswordChange) {
    if (location.pathname !== "/change-password") {
      return <Navigate to="/change-password" replace />;
    }
  }

  if (!canAccessPath(user, location.pathname)) {
    return <Navigate to={getDefaultPathForRole(user)} replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">Loading session...</div>;
  }

  if (user?.forcePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (user) {
    return <Navigate to={getDefaultPathForRole(user)} replace />;
  }

  return <>{children}</>;
}
