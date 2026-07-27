import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Check } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { ordenesApi, clientesApi, camposInvalidos, mensajeDeError } from '@/shared/services/api';
import { tipoOrdenLabels } from '@/shared/constants/ordenLabels';
import type { TipoOrden } from '@/shared/constants/ordenLabels';
import { OrdenCamposComunes, type CamposComunesValues } from '@/modules/orders/components/OrdenCamposComunes';
import type { CrearOrdenInput, PrioridadOrden, Cliente } from '@/types/atlas';

interface FormState extends CamposComunesValues {
  tipo: TipoOrden | '';
  cliente_id: string;
  domicilio_id: string;
}

const initialForm: FormState = {
  tipo: '',
  prioridad: '',
  cliente_id: '',
  domicilio_id: '',
  titulo: '',
  descripcion: '',
  falla: '',
  sla_id: '',
  fecha_programada: '',
};

export default function NuevaOrdenPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(initialForm);
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
