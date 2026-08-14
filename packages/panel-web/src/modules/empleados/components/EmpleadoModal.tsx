import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Copy, KeyRound, Monitor, Smartphone } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { mensajeDeError } from '@/shared/services/api';
import { accesoApi, empleadosApi } from '@/shared/services/personal';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
  etiquetasEstadoEmpleado,
  etiquetasRolAcceso,
  type Area,
  type CrearEmpleadoInput,
  type Empleado,
  type EstadoEmpleado,
  type RolUsuario,
} from '@/types/atlas';

interface EmpleadoModalProps {
  open: boolean;
  /** null = alta; con empleado = edición. */
  empleado: Empleado | null;
  areas: Area[];
  /**
   * Si la API ya sabe de accesos (migración del Pedido 9 corrida). Cuando es
   * false la sección de acceso ni se muestra: no tendría a dónde guardar.
   */
  accesoDisponible: boolean;
  /**
   * Si la API acepta varias áreas por persona (Pedido 11). Mismo criterio: con
   * false no se ofrece elegirlas, porque no habría dónde guardarlas.
   */
  multiareaDisponible: boolean;
  onClose: () => void;
  onGuardado: () => void;
}

interface FormState {
  nombre: string;
  legajo: string;
  documento: string;
  puesto: string;
  /** El sector al que pertenece. */
  area_id: string;
  /** Las demás áreas en las que trabaja. La principal no va acá: se agrega sola. */
  area_ids: string[];
  email: string;
  telefono: string;
  estado: EstadoEmpleado;
  fecha_ingreso: string;
  notas: string;
}

/** La cuenta con la que esta persona inicia sesión. */
interface AccesoState {
  habilitado: boolean;
  panel: boolean;
  app: boolean;
  rol: RolUsuario;
  email: string;
  activo: boolean;
  generar: boolean;
  password: string;
}

const formVacio: FormState = {
  nombre: '',
  legajo: '',
  documento: '',
  puesto: '',
  area_id: '',
  area_ids: [],
  email: '',
  telefono: '',
  estado: 'activo',
  fecha_ingreso: '',
  notas: '',
};

const accesoVacio: AccesoState = {
  habilitado: false,
  panel: true,
  app: false,
  rol: 'operador',
  email: '',
  activo: true,
  generar: true,
  password: '',
};

function desdeEmpleado(empleado: Empleado | null): FormState {
  if (!empleado) return { ...formVacio };
  return {
    nombre: empleado.nombre,
    legajo: empleado.legajo ?? '',
    documento: empleado.documento ?? '',
    puesto: empleado.puesto ?? '',
    area_id: empleado.area_id,
    // La principal se saca de la lista: en el formulario va aparte, y el backend
    // la vuelve a agregar al guardar.
    area_ids: (empleado.areas ?? []).map((area) => area.id).filter((id) => id !== empleado.area_id),
    email: empleado.email ?? '',
    telefono: empleado.telefono ?? '',
    estado: empleado.estado,
    fecha_ingreso: empleado.fecha_ingreso?.slice(0, 10) ?? '',
    notas: empleado.notas ?? '',
  };
}

function desdeAcceso(empleado: Empleado | null): AccesoState {
  const acceso = empleado?.acceso;
  if (!acceso) {
    return { ...accesoVacio, email: empleado?.email ?? '' };
  }
  return {
    habilitado: true,
    panel: acceso.panel,
    app: acceso.app,
    rol: acceso.rol,
    email: acceso.email,
    activo: acceso.activo,
    // En la edición la contraseña no se toca salvo que se pida expresamente.
    generar: false,
    password: '',
  };
}

/** '' se manda como null para que el backend distinga "sin dato" de "vacío". */
const oNulo = (valor: string) => (valor.trim() === '' ? null : valor.trim());

/** Casilla de verificación con la misma pinta que el resto del panel. */
function Casilla({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm ${
        disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 dark:text-slate-300 cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-atlas-600 focus:ring-atlas-500"
      />
      {children}
    </label>
  );
}

export function EmpleadoModal({
  open,
  empleado,
  areas,
  accesoDisponible,
  multiareaDisponible,
  onClose,
  onGuardado,
}: EmpleadoModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(formVacio);
  const [acceso, setAcceso] = useState<AccesoState>(accesoVacio);
  const [errores, setErrores] = useState<Partial<Record<string, string>>>({});
  /** Contraseña recién generada: se muestra una vez y no vuelve a estar disponible. */
  const [credencial, setCredencial] = useState<{ email: string; password: string } | null>(null);
  const [avisoSinCuadrilla, setAvisoSinCuadrilla] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Crear cuentas es cosa de administradores: la API responde 403 a los demás,
  // así que ni se les muestra la sección.
  const puedeGestionarAcceso = accesoDisponible && user?.rol === 'admin';
  const teniaAcceso = !!empleado?.acceso;

  const guardar = useMutation({
    mutationFn: async () => {
      const payload: CrearEmpleadoInput = {
        nombre: form.nombre.trim(),
        area_id: form.area_id,
        ...(multiareaDisponible ? { area_ids: form.area_ids } : {}),
        legajo: oNulo(form.legajo),
        documento: oNulo(form.documento),
        puesto: oNulo(form.puesto),
        email: oNulo(form.email),
        telefono: oNulo(form.telefono),
        estado: form.estado,
        fecha_ingreso: oNulo(form.fecha_ingreso),
        notas: oNulo(form.notas),
      };

      const guardado = empleado
        ? await empleadosApi.actualizar(empleado.id, payload)
        : await empleadosApi.crear(payload);

      if (!puedeGestionarAcceso) {
        return { passwordGenerada: undefined, email: '', sinCuadrilla: false };
      }

      // Sacarle el tilde a "puede iniciar sesión" le saca la cuenta.
      if (!acceso.habilitado) {
        if (teniaAcceso) await accesoApi.revocar(guardado.id);
        return { passwordGenerada: undefined, email: '', sinCuadrilla: false };
      }

      const resultado = await accesoApi.guardar(guardado.id, {
        email: acceso.email.trim(),
        rol: acceso.rol,
        acceso_panel: acceso.panel,
        acceso_app: acceso.app,
        activo: acceso.activo,
        ...(acceso.generar
          ? { generar: true }
          : acceso.password
            ? { password: acceso.password }
            : {}),
      });

      return {
        passwordGenerada: resultado.password_generada,
        email: resultado.email,
        // Un técnico sin cuadrilla entra a la app pero no ve ninguna orden.
        sinCuadrilla: resultado.rol === 'tecnico' && !resultado.cuadrilla_id,
      };
    },
    onSuccess: (resultado) => {
      setAvisoSinCuadrilla(resultado.sinCuadrilla);
      if (resultado.passwordGenerada) {
        // La contraseña generada se muestra una sola vez: el modal se queda
        // abierto hasta que la persona la copie.
        setCredencial({ email: resultado.email, password: resultado.passwordGenerada });
        return;
      }
      onGuardado();
    },
  });

  useEffect(() => {
    if (!open) return;
    setForm(desdeEmpleado(empleado));
    setAcceso(desdeAcceso(empleado));
    setErrores({});
    setCredencial(null);
    setAvisoSinCuadrilla(false);
    setCopiado(false);
    guardar.reset();
    // El formulario se rearma cada vez que se abre el modal o cambia el empleado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empleado]);

  const setCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const setAccesoCampo = <K extends keyof AccesoState>(campo: K, valor: AccesoState[K]) => {
    setAcceso((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined, sistemas: undefined }));
  };

  // Un área inactiva no se ofrece para asignar, pero si el empleado ya la tiene
  // se mantiene visible para no perderla al editar cualquier otro campo.
  const areasElegibles = areas.filter(
    (area) => area.activo || area.id === form.area_id || form.area_ids.includes(area.id),
  );
  const opcionesArea = areasElegibles.map((area) => ({
    value: area.id,
    label: area.activo ? area.nombre : `${area.nombre} (inactiva)`,
  }));

  // Cambiar el área principal la saca de las secundarias: estaría dos veces.
  const elegirPrincipal = (id: string) => {
    setForm((prev) => ({ ...prev, area_id: id, area_ids: prev.area_ids.filter((otra) => otra !== id) }));
    setErrores((prev) => ({ ...prev, area_id: undefined }));
  };

  const alternarArea = (id: string, marcada: boolean) =>
    setForm((prev) => ({
      ...prev,
      area_ids: marcada ? [...prev.area_ids, id] : prev.area_ids.filter((otra) => otra !== id),
    }));

  const validar = (): boolean => {
    const nuevos: Partial<Record<string, string>> = {};
    if (!form.nombre.trim()) nuevos.nombre = 'Ingresá el nombre y apellido.';
    if (!form.area_id) nuevos.area_id = 'Seleccioná un área.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nuevos.email = 'El email no parece válido.';
    }
    if (form.telefono.trim() && form.telefono.replace(/\D/g, '').length < 6) {
      nuevos.telefono = 'El teléfono es demasiado corto.';
    }

    if (puedeGestionarAcceso && acceso.habilitado) {
      if (!acceso.panel && !acceso.app) {
        nuevos.sistemas = 'Elegí al menos un sistema: panel web o app móvil.';
      }
      const emailAcceso = acceso.email.trim();
      if (!emailAcceso) {
        nuevos.emailAcceso = 'Hace falta un email para iniciar sesión.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAcceso)) {
        nuevos.emailAcceso = 'El email no parece válido.';
      }
      if (!acceso.generar) {
        if (!teniaAcceso && !acceso.password) {
          nuevos.password = 'Definí una contraseña o pedí que se genere sola.';
        } else if (acceso.password && acceso.password.length < 6) {
          nuevos.password = 'La contraseña necesita al menos 6 caracteres.';
        }
      }
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    guardar.mutate();
  };

  const copiarCredencial = async () => {
    if (!credencial) return;
    try {
      await navigator.clipboard.writeText(`Usuario: ${credencial.email}\nContraseña: ${credencial.password}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: la contraseña igual está a la vista.
    }
  };

  const titulo = empleado ? 'Editar empleado' : 'Agregar empleado';

  // --- Pantalla de credenciales: reemplaza al formulario después de generar ---
  if (credencial) {
    return (
      <Modal open={open} onClose={onGuardado} title="Acceso creado" size="lg">
        <div className="space-y-4">
          <Alert variant="warning" title="Anotá la contraseña ahora">
            Es la única vez que se muestra. Después queda cifrada y no hay forma de volver a verla: si se
            pierde, se genera una nueva.
          </Alert>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Usuario</p>
              <p className="font-mono text-sm text-slate-900 dark:text-white break-all">{credencial.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Contraseña</p>
              <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white tracking-wider">
                {credencial.password}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              onClick={copiarCredencial}
            >
              {copiado ? 'Copiado' : 'Copiar usuario y contraseña'}
            </Button>
          </div>

          {avisoSinCuadrilla && (
            <Alert variant="warning" title="Todavía no está en ninguna cuadrilla">
              Con rol Técnico va a poder entrar a la app, pero no va a ver órdenes hasta que lo agregues como
              técnico de una cuadrilla (sección Cuadrillas).
            </Alert>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
            <Button type="button" onClick={onGuardado}>
              Listo
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={titulo} size="lg">
      <form onSubmit={enviar} className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo guardar">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}

        {areas.length === 0 && (
          <Alert variant="warning" title="Todavía no hay áreas">
            Creá al menos un área en la pestaña Áreas: sin área no se puede dar de alta un empleado.
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre y apellido *"
            value={form.nombre}
            error={errores.nombre}
            onChange={(e) => setCampo('nombre', e.target.value)}
          />
          <Select
            label={multiareaDisponible ? 'Área principal *' : 'Área *'}
            placeholder="Seleccionar área"
            options={opcionesArea}
            value={form.area_id}
            error={errores.area_id}
            onChange={(e) => elegirPrincipal(e.target.value)}
          />
          <Input
            label="Puesto"
            placeholder="Vendedor, Administrativo, Supervisor..."
            value={form.puesto}
            onChange={(e) => setCampo('puesto', e.target.value)}
          />
          <Input label="Legajo" value={form.legajo} onChange={(e) => setCampo('legajo', e.target.value)} />
          <Input
            label="Documento"
            value={form.documento}
            onChange={(e) => setCampo('documento', e.target.value)}
          />
          <Input
            label="Teléfono"
            value={form.telefono}
            error={errores.telefono}
            onChange={(e) => setCampo('telefono', e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            error={errores.email}
            onChange={(e) => setCampo('email', e.target.value)}
          />
          <Input
            label="Fecha de ingreso"
            type="date"
            value={form.fecha_ingreso}
            onChange={(e) => setCampo('fecha_ingreso', e.target.value)}
          />
          <Select
            label="Estado"
            options={Object.entries(etiquetasEstadoEmpleado).map(([value, label]) => ({ value, label }))}
            value={form.estado}
            onChange={(e) => setCampo('estado', e.target.value as EstadoEmpleado)}
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas</label>
            <textarea
              className="input min-h-[80px]"
              value={form.notas}
              onChange={(e) => setCampo('notas', e.target.value)}
            />
          </div>
        </div>

        {/* --------------------------------------------- otras áreas de trabajo */}
        {multiareaDisponible && areasElegibles.length > 1 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Qué otros trabajos hace?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Una cuadrilla puede tomar soportes, instalaciones y retiros porque su gente está en
                esas áreas. Marcá acá todo lo que esta persona sabe hacer, además de su área principal.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {areasElegibles.map((area) => {
                const esPrincipal = area.id === form.area_id;
                return (
                  <Casilla
                    key={area.id}
                    checked={esPrincipal || form.area_ids.includes(area.id)}
                    disabled={esPrincipal}
                    onChange={(valor) => alternarArea(area.id, valor)}
                  >
                    {area.nombre}
                    {esPrincipal && <span className="text-xs text-slate-400"> · principal</span>}
                    {!area.activo && <span className="text-xs text-slate-400"> · inactiva</span>}
                  </Casilla>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------ acceso al sistema */}
        {puedeGestionarAcceso && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="flex items-start gap-2">
              <KeyRound className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
              <div className="flex-1">
                <Casilla
                  checked={acceso.habilitado}
                  onChange={(valor) => setAccesoCampo('habilitado', valor)}
                >
                  <span className="font-medium">Puede iniciar sesión</span>
                </Casilla>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                  La cuenta es este mismo empleado: no hace falta crear un usuario aparte.
                </p>
              </div>
            </div>

            {acceso.habilitado && (
              <div className="space-y-4 pl-6">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    ¿A qué sistema entra?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                    <Casilla checked={acceso.panel} onChange={(v) => setAccesoCampo('panel', v)}>
                      <span className="flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-slate-400" /> Panel web
                      </span>
                    </Casilla>
                    <Casilla checked={acceso.app} onChange={(v) => setAccesoCampo('app', v)}>
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-slate-400" /> App móvil del técnico
                      </span>
                    </Casilla>
                  </div>
                  {errores.sistemas && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errores.sistemas}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email de ingreso *"
                    type="email"
                    value={acceso.email}
                    error={errores.emailAcceso}
                    placeholder={form.email || 'nombre@empresa.com'}
                    onChange={(e) => setAccesoCampo('email', e.target.value)}
                  />
                  <Select
                    label="Rol"
                    options={Object.entries(etiquetasRolAcceso).map(([value, label]) => ({ value, label }))}
                    value={acceso.rol}
                    onChange={(e) => setAccesoCampo('rol', e.target.value as RolUsuario)}
                  />
                </div>

                {acceso.rol === 'tecnico' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    La cuadrilla sale sola de aquella en la que ya es técnico. Si todavía no está en ninguna,
                    agregalo desde Cuadrillas: sin eso la app no le muestra órdenes.
                  </p>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</p>
                  <Casilla checked={acceso.generar} onChange={(v) => setAccesoCampo('generar', v)}>
                    {teniaAcceso ? 'Generar una nueva y mostrarla una vez' : 'Generarla automáticamente'}
                  </Casilla>
                  {!acceso.generar && (
                    <Input
                      type="password"
                      value={acceso.password}
                      error={errores.password}
                      autoComplete="new-password"
                      placeholder={teniaAcceso ? 'Dejala vacía para no cambiarla' : 'Mínimo 6 caracteres'}
                      onChange={(e) => setAccesoCampo('password', e.target.value)}
                    />
                  )}
                </div>

                {teniaAcceso && (
                  <Casilla checked={!acceso.activo} onChange={(v) => setAccesoCampo('activo', !v)}>
                    Suspender la cuenta (no puede entrar, pero no se pierde)
                  </Casilla>
                )}
              </div>
            )}

            {teniaAcceso && !acceso.habilitado && (
              <Alert variant="warning" title="Se le va a sacar el acceso">
                Al guardar se elimina la cuenta de <strong>{empleado?.acceso?.email}</strong>. El empleado
                queda en el padrón, pero no va a poder iniciar sesión. Se puede volver a dar de alta después.
              </Alert>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending} disabled={areas.length === 0}>
            {empleado ? 'Guardar cambios' : 'Crear empleado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
