import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Logo } from '@/shared/components/Logo';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Atlas Supervisor
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Gestión de operaciones de campo
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <Outlet />
        </div>
      </div>
    </div>
  );
}