import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Check } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { ordenesApi, clientesApi, cuadrillasApi, camposInvalidos, mensajeDeError } from '@/shared/services/api';
import { FALLAS, tipoOrdenLabels } from '@/shared/constants/ordenLabels';
import type { Falla, TipoOrden } from '@/shared/constants/ordenLabels';
import { OrdenCamposComunes, type CamposComunesValues } from '@/modules/orders/components/OrdenCamposComunes';
import type { CrearOrdenInput, PrioridadOrden, Cliente } from '@/types/atlas';

interface FormState extends CamposComunesValues {
  tipo: TipoOrden | '';
  cliente_id: string;
  domicilio_id: string;
  cuadrilla_id: string;
}

/** ¿Ese motivo es una de las fallas que maneja el panel? */
function esFalla(valor: string | undefined): valor is Falla {
  return valor !== undefined && (FALLAS as readonly string[]).includes(valor);
}

const initialForm: FormState = {
  tipo: '',
  prioridad: '',
  cliente_id: '',
  domicilio_id: '',
  cuadrilla_id: '',
  titulo: '',
  descripcion: '',
  falla: '',
  sla_id: '',
  fecha_programada: '',
};

export default function NuevaOrdenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const desdeTicket = (
    location.state as {
      desdeTicket?: {
        tipo?: string;
        descripcion?: string;
        clienteNombre?: string;
        cuadrillaId?: string;
        clienteId?: string;
        domicilioId?: string;
        /**
         * Lo que el ticket sabe del cliente aunque no esté en el padrón. Con
         * esto se lo busca solo, y si no aparece se ofrece darlo de alta sin
         * volver a tipear nada.
         */
        clienteTelefono?: string;
        direccion?: string;
        /** El motivo del reclamo es la `falla` de la orden: mismo vocabulario. */
        falla?: string;
        /**
         * Con esto la API vuelve a chequear la verificación de N2 y rechaza la
         * creación si quedó algo pendiente. El botón deshabilitado en la
         * bandeja es comodidad; el control de verdad está del otro lado.
         */
        ticketBetaId?: string;
      };
    } | null
  )?.desdeTicket;
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    tipo: (desdeTicket?.tipo as TipoOrden) ?? '',
    descripcion: desdeTicket?.descripcion ?? '',
    // Si el ticket ya venía con cuadrilla, la orden nace con ella: volver a
    // elegirla a mano era el paso de más que sobraba.
    cuadrilla_id: desdeTicket?.cuadrillaId ?? '',
    cliente_id: desdeTicket?.clienteId ?? '',
    domicilio_id: desdeTicket?.domicilioId ?? '',
    // El motivo con el que N2 clasificó el reclamo ya es la falla de la orden.
    // Se valida en vez de confiar: el motivo del ticket es texto libre y puede
    // venir de una integración con un valor que el panel no conoce.
    falla: esFalla(desdeTicket?.falla) ? desdeTicket.falla : '',
  }));
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<{ id: string; numero: string } | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const { data: clientesEncontrados, isFetching: buscandoClientes } = useQuery({
    queryKey: ['clientes', 'buscar', clienteQuery],
    queryFn: () => clientesApi.listar({ q: clienteQuery, per_page: 8 }),
    enabled: clienteQuery.trim().length >= 2,
  });

  const { data: domiciliosData, isFetching: cargandoDomicilios } = useQuery({
    queryKey: ['domicilios', form.cliente_id],
    queryFn: () => clientesApi.domicilios(form.cliente_id),
    enabled: !!form.cliente_id,
  });

  const domicilioOptions = (domiciliosData ?? []).map((d) => ({ value: d.id, label: d.direccion }));

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas'],
    queryFn: () => cuadrillasApi.listar(),
  });

  // Viniendo de un ticket ligado al padrón, se trae el cliente y se deja
  // seleccionado: el cartel decía "orden para tal cliente" y abajo el formulario
  // igual lo pedía de nuevo, que es exactamente lo que no tenía sentido.
  const { data: clienteDelTicket } = useQuery({
    queryKey: ['cliente', desdeTicket?.clienteId],
    queryFn: () => clientesApi.detalle(desdeTicket!.clienteId!),
    enabled: !!desdeTicket?.clienteId,
  });

  useEffect(() => {
    if (clienteDelTicket && !clienteSeleccionado) {
      setClienteSeleccionado(clienteDelTicket);
      setClienteQuery(clienteDelTicket.nombre);
    }
  }, [clienteDelTicket, clienteSeleccionado]);

  /**
   * El ticket no siempre viene ligado al padrón: los que entran por el bot o el
   * portal traen el nombre y la dirección como texto suelto. En vez de dejar el
   * formulario vacío para que alguien busque a mano lo que el ticket ya dice,
   * se lo busca solo.
   *
   * El teléfono va primero porque es lo que menos se repite; el nombre después.
   */
  const claveBusqueda = (desdeTicket?.clienteTelefono || desdeTicket?.clienteNombre || '').trim();
  const buscarAutomatico = !!desdeTicket && !desdeTicket.clienteId && claveBusqueda.length >= 3;

  const { data: candidatos, isFetching: buscandoCandidatos } = useQuery({
    queryKey: ['clientes', 'auto', claveBusqueda],
    queryFn: () => clientesApi.listar({ q: claveBusqueda, per_page: 5 }),
    enabled: buscarAutomatico,
  });

  // Un solo resultado es casi siempre el cliente: se elige solo. Con varios se
  // muestran para que decida una persona, porque acertar por nombre es
  // justamente lo que sale mal.
  const [autoResuelto, setAutoResuelto] = useState(false);
  useEffect(() => {
    if (!buscarAutomatico || autoResuelto || clienteSeleccionado) return;
    const encontrados = candidatos?.data ?? [];
    if (encontrados.length === 1) {
      seleccionarCliente(encontrados[0]);
      setAutoResuelto(true);
    }
  }, [candidatos, buscarAutomatico, autoResuelto, clienteSeleccionado]);

  /**
   * Da de alta al cliente con lo que ya trae el ticket, junto con su domicilio,
   * y lo deja seleccionado. Es el caso de quien llama por primera vez: los
   * datos están, solo faltaba que alguien los volviera a escribir.
   */
  const altaCliente = useMutation({
    mutationFn: () =>
      clientesApi.crear({
        nombre: desdeTicket?.clienteNombre ?? '',
        telefono: desdeTicket?.clienteTelefono || undefined,
        domicilio: desdeTicket?.direccion ? { direccion: desdeTicket.direccion } : undefined,
      }),
    onSuccess: (cliente) => {
      seleccionarCliente(cliente);
      setAutoResuelto(true);
      // El domicilio recién creado tiene que aparecer en el selector.
      queryClient.invalidateQueries({ queryKey: ['domicilios', cliente.id] });
      const primero = cliente.domicilios?.[0];
      if (primero) setField('domicilio_id', primero.id);
    },
  });

  const sugerencias = candidatos?.data ?? [];
  const sinCandidatos = buscarAutomatico && !buscandoCandidatos && sugerencias.length === 0;
  const variosCandidatos = buscarAutomatico && !clienteSeleccionado && sugerencias.length > 1;

  const seleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setField('cliente_id', cliente.id);
    setField('domicilio_id', '');
    setClienteQuery(cliente.nombre);
    setClienteDropdownOpen(false);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CrearOrdenInput) => ordenesApi.crear(payload),
    onSuccess: (orden) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      if (orden.duplicado) {
        setDuplicado({ id: orden.id, numero: orden.numero });
        return;
      }
      navigate(`/orders/${orden.id}`);
    },
    onError: (err) => {
      const detalles = camposInvalidos(err);
      if (detalles.length > 0) {
        const nuevosErrores: Partial<Record<keyof FormState, string>> = {};
        detalles.forEach((campo) => {
          if (campo in initialForm) {
            nuevosErrores[campo as keyof FormState] = 'Este campo es obligatorio.';
          }
        });
        setErrors(nuevosErrores);
        setGeneralError(null);
      } else {
        setGeneralError(mensajeDeError(err));
      }
    },
  });

  const validar = (): boolean => {
    const nuevosErrores: Partial<Record<keyof FormState, string>> = {};
    if (!form.tipo) nuevosErrores.tipo = 'Seleccioná un tipo de orden.';
    if (!form.prioridad) nuevosErrores.prioridad = 'Seleccioná una prioridad.';
    if (!form.cliente_id) nuevosErrores.cliente_id = 'Buscá y seleccioná un cliente.';
    if (!form.domicilio_id) nuevosErrores.domicilio_id = 'Seleccioná un domicilio del cliente.';
    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setDuplicado(null);
    if (!validar()) return;

    const payload: CrearOrdenInput = {
      tipo: form.tipo as TipoOrden,
      prioridad: form.prioridad as PrioridadOrden,
      cliente_id: form.cliente_id,
      domicilio_id: form.domicilio_id,
      titulo: form.titulo || undefined,
      descripcion: form.descripcion || undefined,
      falla: form.tipo === 'reparacion' && form.falla ? form.falla : undefined,
      sla_id: form.sla_id || undefined,
      fecha_programada: form.fecha_programada ? new Date(form.fecha_programada).toISOString() : undefined,
      cuadrilla_id: form.cuadrilla_id || undefined,
      ticket_beta_id: desdeTicket?.ticketBetaId,
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nueva orden de trabajo</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Se crea con origen manual, sin ticket del sistema externo asociado
          </p>
        </div>
      </div>

      {desdeTicket && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          Creando orden desde el ticket de <strong>{desdeTicket.clienteNombre}</strong>.{' '}
          {desdeTicket.clienteId
            ? 'El cliente y el domicilio ya vienen cargados.'
            : 'Ese ticket no estaba ligado a un cliente del padrón, así que hay que elegirlo acá.'}
        </div>
      )}

      {duplicado && (
        <Alert variant="warning" title="Orden duplicada" onClose={() => setDuplicado(null)}>
          Ya existe una orden equivalente ({duplicado.numero}). No se creó una nueva.{' '}
          <button
            type="button"
            className="underline font-medium"
            onClick={() => navigate(`/orders/${duplicado.id}`)}
          >
            Ver orden existente
          </button>
        </Alert>
      )}

      {generalError && (
        <Alert variant="error" title="No se pudo crear la orden" onClose={() => setGeneralError(null)}>
          {generalError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="card p-5 space-y-5">
        <Select
          label="Tipo *"
          placeholder="Seleccionar tipo"
          value={form.tipo}
          error={errors.tipo}
          options={Object.entries(tipoOrdenLabels).map(([value, label]) => ({ value, label }))}
          onChange={(e) => setField('tipo', e.target.value as TipoOrden)}
        />

        <div className="relative">
          <Input
            label="Cliente *"
            placeholder="Buscar por nombre, teléfono o email..."
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            error={errors.cliente_id}
            value={clienteQuery}
            onChange={(e) => {
              setClienteQuery(e.target.value);
              setClienteDropdownOpen(true);
              if (clienteSeleccionado) {
                setClienteSeleccionado(null);
                setField('cliente_id', '');
                setField('domicilio_id', '');
              }
            }}
            onFocus={() => setClienteDropdownOpen(true)}
          />
          {clienteDropdownOpen && clienteQuery.trim().length >= 2 && !clienteSeleccionado && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-56 overflow-y-auto">
              {buscandoClientes ? (
                <p className="px-3 py-2 text-sm text-slate-400">Buscando...</p>
              ) : (clientesEncontrados?.data ?? []).length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">Sin resultados</p>
              ) : (
                clientesEncontrados!.data.map((cliente) => (
                  <button
                    type="button"
                    key={cliente.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
                    onClick={() => seleccionarCliente(cliente)}
                  >
                    <span>
                      <span className="font-medium text-slate-900 dark:text-white">{cliente.nombre}</span>
                      {cliente.telefono && <span className="text-slate-400"> · {cliente.telefono}</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          {clienteSeleccionado && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Cliente seleccionado
            </p>
          )}

          {/* Viniendo de un ticket sin cliente del padrón: se resuelve acá, sin
              obligar a buscar de nuevo lo que el ticket ya dice. */}
          {buscandoCandidatos && !clienteSeleccionado && (
            <p className="mt-1 text-xs text-slate-400">Buscando al cliente en el padrón…</p>
          )}

          {variosCandidatos && (
            <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                Hay más de un cliente que coincide con «{claveBusqueda}». Elegí cuál es:
              </p>
              {sugerencias.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                  onClick={() => {
                    seleccionarCliente(c);
                    setAutoResuelto(true);
                  }}
                >
                  <span className="font-medium text-slate-900 dark:text-white">{c.nombre}</span>
                  {c.telefono && <span className="text-slate-400"> · {c.telefono}</span>}
                </button>
              ))}
            </div>
          )}

          {sinCandidatos && !clienteSeleccionado && (
            <div className="mt-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <b>{desdeTicket?.clienteNombre || 'El cliente del ticket'}</b> no está en el padrón.
              </p>
              {(desdeTicket?.clienteTelefono || desdeTicket?.direccion) && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {[desdeTicket?.clienteTelefono, desdeTicket?.direccion].filter(Boolean).join(' · ')}
                </p>
              )}
              {altaCliente.isError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {mensajeDeError(altaCliente.error)}
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                loading={altaCliente.isPending}
                disabled={!desdeTicket?.clienteNombre}
                onClick={() => altaCliente.mutate()}
              >
                Darlo de alta con estos datos
              </Button>
            </div>
          )}
        </div>

        <Select
          label="Domicilio *"
          placeholder={
            !form.cliente_id ? 'Elegí un cliente primero' : cargandoDomicilios ? 'Cargando...' : 'Seleccionar domicilio'
          }
          value={form.domicilio_id}
          error={errors.domicilio_id}
          options={domicilioOptions}
          disabled={!form.cliente_id || cargandoDomicilios}
          onChange={(e) => setField('domicilio_id', e.target.value)}
        />

        {/* El responsable no se elige: sale de esta cuadrilla. */}
        <div>
          <Select
            label="Cuadrilla"
            placeholder="Asignar después"
            value={form.cuadrilla_id}
            options={(cuadrillasData?.data ?? []).map((c) => ({ value: c.id, label: c.nombre }))}
            onChange={(e) => setField('cuadrilla_id', e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Si la elegís, la orden nace asignada y el responsable sale de esa cuadrilla. Si la dejás vacía, queda
            pendiente y se asigna desde el detalle.
          </p>
        </div>

        <OrdenCamposComunes
          values={form}
          onChange={(key, value) => setField(key, value as FormState[typeof key])}
          errors={errors}
          mostrarFalla={form.tipo === 'reparacion'}
          prioridadRequerida
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={() => navigate('/orders')}>
            Cancelar
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Crear orden
          </Button>
        </div>
      </form>
    </div>
  );
}
