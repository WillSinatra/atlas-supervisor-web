import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Map as MapIcon, Search, Plus } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ordenesApi, clientesApi, cuadrillasApi, mensajeDeError } from '@/shared/services/api';
import {
  estadoOrdenLabels,
  estadoOrdenBadgeVariant,
  prioridadLabels,
  prioridadBadgeVariant,
  tipoOrdenLabels,
} from '@/shared/constants/ordenLabels';
import type { EstadoOrden, PrioridadOrden } from '@/types/atlas';
import type { TipoOrden } from '@/shared/constants/ordenLabels';
import type { Orden } from '@/types/atlas';

interface OrdenesFilters {
  page?: number;
  per_page?: number;
  q?: string;
  estado?: EstadoOrden;
  prioridad?: PrioridadOrden;
  tipo?: TipoOrden;
  cuadrilla_id?: string;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [filters, setFilters] = useState<OrdenesFilters>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ordenes', filters],
    queryFn: () => ordenesApi.listar(filters as Record<string, string | number>),
  });

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas', 'filtro'],
    queryFn: () => cuadrillasApi.listar(),
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'lookup'],
    queryFn: () => clientesApi.listar({ per_page: 200 }),
  });

  const ordenes = data?.data ?? [];

  const setFilter = <K extends keyof OrdenesFilters>(key: K, value: OrdenesFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const cuadrillaOptions = useMemo(
    () => (cuadrillasData?.data ?? []).map((c) => ({ value: c.id, label: c.nombre })),
    [cuadrillasData],
  );

  const cuadrillaPorId = useMemo(() => {
    const map = new Map<string, string>();
    (cuadrillasData?.data ?? []).forEach((c) => map.set(c.id, c.nombre));
    return map;
  }, [cuadrillasData]);

  const clientePorId = useMemo(() => {
    const map = new Map<string, string>();
    (clientesData?.data ?? []).forEach((c) => map.set(c.id, c.nombre));
    return map;
  }, [clientesData]);

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
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/orders/nueva')}>
            Nueva orden
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Buscar por número o título..."
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </div>
          <Select
            placeholder="Todos los estados"
            options={Object.entries(estadoOrdenLabels).map(([value, label]) => ({ value, label }))}
            onChange={(e) => setFilter('estado', e.target.value as EstadoOrden)}
          />
          <Select
            placeholder="Todos los tipos"
            options={Object.entries(tipoOrdenLabels).map(([value, label]) => ({ value, label }))}
            onChange={(e) => setFilter('tipo', e.target.value as TipoOrden)}
          />
          <Select
            placeholder="Todas las cuadrillas"
            options={cuadrillaOptions}
            onChange={(e) => setFilter('cuadrilla_id', e.target.value)}
          />
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
        <div className="card">
          <EmptyState
            icon={<Search className="w-8 h-8" />}
            title="No se pudo cargar el listado"
            description={mensajeDeError(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : ordenes.length === 0 ? (
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
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Cuadrilla</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((orden) => (
                  <OrdenRow
                    key={orden.id}
                    orden={orden}
                    clienteNombre={clientePorId.get(orden.cliente_id)}
                    cuadrillaNombre={orden.cuadrilla_id ? cuadrillaPorId.get(orden.cuadrilla_id) : undefined}
                    onClick={() => navigate(`/orders/${orden.id}`)}
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

function OrdenRow({
  orden,
  clienteNombre,
  cuadrillaNombre,
  onClick,
}: {
  orden: Orden;
  clienteNombre?: string;
  cuadrillaNombre?: string;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{orden.numero}</td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{orden.titulo ?? '—'}</td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{clienteNombre ?? orden.cliente_id}</td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{tipoOrdenLabels[orden.tipo as TipoOrden] ?? orden.tipo}</td>
      <td className="px-4 py-3">
        <Badge variant={prioridadBadgeVariant[orden.prioridad]}>{prioridadLabels[orden.prioridad]}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={estadoOrdenBadgeVariant[orden.estado]}>{estadoOrdenLabels[orden.estado]}</Badge>
      </td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{cuadrillaNombre ?? 'Sin asignar'}</td>
    </tr>
  );
}
