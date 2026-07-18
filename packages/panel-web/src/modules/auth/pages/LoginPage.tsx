import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Alert } from '@/shared/components/ui/Alert';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    console.log('[Login] Intentando con:', email);

    const response = await fetch(
      'https://proyectos.dnatech.net.ar/atlas/v1/public/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();
    console.log('[Login] Status:', response.status);
    console.log('[Login] Respuesta:', data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Todos los campos son requeridos');
      return;
    }

    try {
      await handleLogin();
      await login(email, password);
      // navigate('/dashboard');
    } catch (err: any) {
      const message = err?.response?.data?.message?.[0] || 'Error al iniciar sesión';
      setError(Array.isArray(message) ? message[0] : message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Iniciar sesión</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ingresa tus credenciales para acceder
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="supervisor@atlas.com"
          autoComplete="email"
          autoFocus
        />

        <Input
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          autoComplete="current-password"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded border-slate-300 text-atlas-600 focus:ring-atlas-500"
          />
          Recordar sesión
        </label>
        <button type="button" className="text-sm text-atlas-600 hover:text-atlas-700 font-medium">
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        Iniciar sesión
      </Button>
    </form>
  );
}