import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/contexts/AuthContext';
import { rutaOcultaParaRol, rutaVisiblePorSecciones } from '@/shared/config/navigation';
import { usuariosApi } from '@/shared/services/api';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  // Misma queryKey que DashboardLayout y SettingsPage: comparten la cache.
  const { data: perfil } = useQuery({
    queryKey: ['perfil'],
    queryFn: () => usuariosApi.miPerfil(),
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Bloquea el acceso directo por URL a secciones que el rol no puede ver,
  // aunque no aparezcan en el menú lateral.
  if (rutaOcultaParaRol(location.pathname, user?.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Mismo bloqueo, pero por secciones habilitadas para el empleado en vez de
  // por rol. Con secciones vacías/ausentes no restringe nada (ver función).
  if (!rutaVisiblePorSecciones(perfil?.empleado?.secciones, location.pathname, user?.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}