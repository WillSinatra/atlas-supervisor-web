import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Eye, EyeOff, KeyRound, Moon, Sun, UserCircle, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError, usuariosApi } from '@/shared/services/api';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { etiquetasRolAcceso, type Perfil } from '@/types/atlas';

/** Dato de solo lectura del padrón: se corrige desde Empleados, no acá. */
function DatoFijo({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className="text-sm text-slate-900 dark:text-white mt-0.5">{valor || '—'}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { data: perfil, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['perfil'],
    queryFn: () => usuariosApi.miPerfil(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tus datos, tu contraseña y cómo se ve el panel.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError || !perfil ? (
        <div className="card">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudo cargar tu cuenta"
            description={mensajeDeError(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <TarjetaPerfil
            perfil={perfil}
            onGuardado={(actualizado) => {
              refetch();
              // La barra lateral muestra el nombre: que se entere sin recargar.
              if (user) {
                updateUser({ ...user, nombre: actualizado.nombre, email: actualizado.email });
              }
            }}
          />
          <div className="space-y-6">
            <TarjetaPassword />
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Apariencia</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Se guarda en este navegador.
              </p>
              <Button
                variant="secondary"
                icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? 'Pasar a modo día' : 'Pasar a modo noche'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ perfil ---

function TarjetaPerfil({ perfil, onGuardado }: { perfil: Perfil; onGuardado: (p: Perfil) => void }) {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [email, setEmail] = useState(perfil.email);
  const [telefono, setTelefono] = useState(perfil.empleado?.telefono ?? '');
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [guardado, setGuardado] = useState(false);

  // Si la consulta se refresca (o cambia la cuenta), el formulario la sigue.
  useEffect(() => {
    setNombre(perfil.nombre);
    setEmail(perfil.email);
    setTelefono(perfil.empleado?.telefono ?? '');
  }, [perfil]);

  const guardar = useMutation({
    mutationFn: () =>
      usuariosApi.actualizarMiPerfil({
        nombre: nombre.trim(),
        email: email.trim(),
        // Sin empleado del padrón no hay dónde guardarlo: ni se manda.
        ...(perfil.empleado ? { telefono: telefono.trim() || null } : {}),
      }),
    onSuccess: (actualizado) => {
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
      onGuardado(actualizado);
    },
  });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Record<string, string | undefined> = {};
    if (!nombre.trim()) nuevos.nombre = 'Tu nombre no puede quedar vacío.';
    if (!email.trim()) {
      nuevos.email = 'Hace falta un email: es con el que iniciás sesión.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nuevos.email = 'El email no parece válido.';
    }
    if (telefono.trim() && telefono.replace(/\D/g, '').length < 6) {
      nuevos.telefono = 'El teléfono es demasiado corto.';
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    guardar.mutate();
  };

  const cambioDeEmail = email.trim() !== perfil.email;

  return (
    <form onSubmit={enviar} className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-atlas-600" /> Mi perfil
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tus datos de contacto y con qué email entrás.
          </p>
        </div>
        <Badge variant="info">{etiquetasRolAcceso[perfil.rol]}</Badge>
      </div>

      {guardar.isError && (
        <Alert variant="error" title="No se pudo guardar">
          {mensajeDeError(guardar.error)}
        </Alert>
      )}

      {guardado && (
        <Alert variant="success" title="Listo">
          Tus datos quedaron guardados.
        </Alert>
      )}

      <Input
        label="Nombre y apellido"
        value={nombre}
        error={errores.nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <Input
        label="Email"
        type="email"
        value={email}
        error={errores.email}
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      {cambioDeEmail && (
        <Alert variant="warning" title="Vas a cambiar tu email de ingreso">
          La próxima vez vas a tener que iniciar sesión con <strong>{email.trim()}</strong>.
        </Alert>
      )}

      {perfil.empleado ? (
        <Input
          label="Teléfono"
          value={telefono}
          error={errores.telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tu cuenta no está ligada a un empleado del padrón, así que no tiene teléfono. Un administrador puede
          vincularla desde la sección Empleados.
        </p>
      )}

      {perfil.empleado && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <DatoFijo etiqueta="Área" valor={perfil.empleado.area} />
          <DatoFijo etiqueta="Puesto" valor={perfil.empleado.puesto} />
          <DatoFijo etiqueta="Legajo" valor={perfil.empleado.legajo} />
        </div>
      )}
      {perfil.empleado && (
        <p className="text-xs text-slate-400">
          El área, el puesto y el legajo los cambia un administrador desde Empleados.
        </p>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
        <Button type="submit" loading={guardar.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

// -------------------------------------------------------------- contraseña ---

function TarjetaPassword() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [verClaves, setVerClaves] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [listo, setListo] = useState(false);

  const cambiar = useMutation({
    mutationFn: () => usuariosApi.cambiarMiPassword(actual, nueva),
    onSuccess: () => {
      setActual('');
      setNueva('');
      setRepetir('');
      setListo(true);
      setTimeout(() => setListo(false), 4000);
    },
  });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Record<string, string | undefined> = {};
    if (!actual) nuevos.actual = 'Ingresá tu contraseña actual.';
    if (nueva.length < 6) nuevos.nueva = 'La nueva necesita al menos 6 caracteres.';
    if (nueva !== repetir) nuevos.repetir = 'Las dos no coinciden.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    cambiar.mutate();
  };

  const ojo = (
    <button type="button" onClick={() => setVerClaves(!verClaves)} className="text-slate-400 hover:text-slate-600">
      {verClaves ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <form onSubmit={enviar} className="card p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-atlas-600" /> Contraseña
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Para cambiarla hace falta la actual. Si no la recordás, un administrador puede generarte una nueva.
        </p>
      </div>

      {cambiar.isError && (
        <Alert variant="error" title="No se pudo cambiar">
          {mensajeDeError(cambiar.error)}
        </Alert>
      )}

      {listo && (
        <Alert variant="success" title="Contraseña cambiada">
          Usá la nueva la próxima vez que inicies sesión.
        </Alert>
      )}

      <Input
        label="Contraseña actual"
        type={verClaves ? 'text' : 'password'}
        value={actual}
        error={errores.actual}
        autoComplete="current-password"
        rightIcon={ojo}
        onChange={(e) => setActual(e.target.value)}
      />
      <Input
        label="Contraseña nueva"
        type={verClaves ? 'text' : 'password'}
        value={nueva}
        error={errores.nueva}
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
        onChange={(e) => setNueva(e.target.value)}
      />
      <Input
        label="Repetir la nueva"
        type={verClaves ? 'text' : 'password'}
        value={repetir}
        error={errores.repetir}
        autoComplete="new-password"
        onChange={(e) => setRepetir(e.target.value)}
      />

      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
        <Button type="submit" loading={cambiar.isPending} icon={listo ? <Check className="w-4 h-4" /> : undefined}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
