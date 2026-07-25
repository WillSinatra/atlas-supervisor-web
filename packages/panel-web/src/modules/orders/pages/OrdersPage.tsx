import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Map as MapIcon, AlertTriangle, Search, Plus } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ordenesApi, clientesApi, cuadrillasApi, mensajeDeError } from '@/shared/services/api';
import { getOrdenSlaState, formatOrdenSlaRemaining } from '@/shared/utils/sla';
import { etiquetasEstado } from '@/types/atlas';
import type { Cliente, EstadoOrden, Orden } from '@/types/atlas';
import { CreateTicketModal } from '../components/CreateTicketModal';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantEstadoOrden: Record<EstadoOrden, BadgeVariant> = {
  pendiente: 'neutral',
  asignada: 'info',
  aceptada: 'info',
  en_proceso: 'warning',
  completada: 'success',
  cancelada: 'danger',
};

// Filtros que el backend real acepta (GET /v1/ordenes). `search` y `prioridad`
// no son parámetros soportados por la API, así que se aplican en cliente sobre
// la página ya traída (ver más abajo).
interface OrdersServerFilters {
  estado?: EstadoOrden;
  cuadrilla_id?: string;
  tipo?: string;
  fecha_desde?: string;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [filters, setFilters] = useState<OrdersServerFilters>({});
  const [search, setSearch] = useState('');
  const [createTicketOpen, setCreateTicketOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ordenes', filters],
    queryFn: () => ordenesApi.listar(filters as Record<string, string>),
  });

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas', 'filter-options'],
    queryFn: () => cuadrillasApi.listar(),
  });

  const cuadrillas = cuadrillasData?.data ?? [];
  const cuadrillaNombrePorId = useMemo(
    () => new Map(cuadrillas.map((c) => [c.id, c.nombre])),
    [cuadrillas],
  );

  const setFilter = <K extends keyof OrdersServerFilters>(key: K, value: OrdersServerFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  // El backend no soporta filtro de texto libre ni de prioridad: se filtran acá
  // los resultados de la página actual (no busca en todo el histórico).
  const orders = useMemo(() => {
    let result = data?.data ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (o) => o.numero.toLowerCase().includes(q) || (o.titulo ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Órdenes de Trabajo</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestione y monitoree todas las órdenes de trabajo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateTicketOpen(true)}>
            Crear Ticket
            <Badge variant="info" className="ml-1">
              Beta
            </Badge>
          </Button>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Table className="w-4 h-4" />
              Tabla
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Mapa
            </button>
          </div>
        </div>
      </div>

      <CreateTicketModal open={createTicketOpen} onClose={() => setCreateTicketOpen(false)} />

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Buscar por OT o título..."
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            placeholder="Todos los estados"
            options={Object.entries(etiquetasEstado).map(([value, label]) => ({ value, label }))}
            onChange={(e) => setFilter('estado', e.target.value as EstadoOrden)}
          />
          <Input
            placeholder="Tipo (sin catálogo real)"
            onChange={(e) => setFilter('tipo', e.target.value)}
          />
          <Select
            placeholder="Todas las cuadrillas"
            options={cuadrillas.map((c) => ({ value: c.id, label: c.nombre }))}
            onChange={(e) => setFilter('cuadrilla_id', e.target.value)}
          />
          <Input type="date" onChange={(e) => setFilter('fecha_desde', e.target.value)} />
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="card p-5">
          <div className="h-96 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2">
            <MapIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mapa interactivo próximamente</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Ubicación de las órdenes de trabajo abiertas</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <div className="card p-5">
          <Alert variant="error" title="No se pudieron cargar las órdenes">
            {mensajeDeError(error)}
          </Alert>
        </div>
      ) : orders.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Search className="w-8 h-8" />}
            title="Sin resultados"
            description="No hay órdenes de trabajo que coincidan con los filtros aplicados."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Domicilio</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Cuadrilla</th>
                  <th className="px-4 py-3">SLA restante</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    cuadrillaNombre={order.cuadrilla_id ? cuadrillaNombrePorId.get(order.cuadrilla_id) : undefined}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {data?.pagination && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              {data.pagination.total} orden{data.pagination.total === 1 ? '' : 'es'} en total
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderRow({
  order,
  cuadrillaNombre,
  onClick,
}: {
  order: Orden;
  cuadrillaNombre: string | undefined;
  onClick: () => void;
}) {
  // Cacheado por react-query: filas con el mismo cliente_id no repiten la llamada.
  const { data: cliente } = useQuery<Cliente>({
    queryKey: ['cliente', order.cliente_id],
    queryFn: () => clientesApi.detalle(order.cliente_id),
  });

  const domicilio = cliente?.domicilios?.find((d) => d.id === order.domicilio_id);
  const slaState = getOrdenSlaState(order);
  const isUrgent = slaState === 'overdue' || slaState === 'dueSoon';

  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{order.numero}</td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{cliente?.nombre ?? '…'}</td>
      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{domicilio?.direccion ?? '—'}</td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{order.tipo}</td>
      <td className="px-4 py-3">
        <Badge variant={variantEstadoOrden[order.estado]}>{etiquetasEstado[order.estado]}</Badge>
      </td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{cuadrillaNombre ?? 'Sin asignar'}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 font-medium ${
          slaState === 'overdue'
            ? 'text-red-600 dark:text-red-400'
            : slaState === 'dueSoon'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
        }`}>
          {isUrgent && <AlertTriangle className="w-3.5 h-3.5" />}
          {formatOrdenSlaRemaining(order)}
        </span>
      </td>
    </tr>
  );
}
