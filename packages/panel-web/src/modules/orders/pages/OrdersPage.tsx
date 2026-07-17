import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Map, AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { getOrders, type OrdersFilters } from '@/shared/services/ordersService';
import { getCrews } from '@/shared/services/crewsService';
import { typeLabels } from '@/shared/services/mocks/orders.mock';
import { getSlaState, formatSlaRemaining } from '@/shared/utils/sla';
import { statusLabels, statusBadgeVariant } from '@/shared/constants/orderStatus';
import type { WorkOrder, WorkOrderStatus, WorkOrderType } from '@/types';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [filters, setFilters] = useState<OrdersFilters>({});

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => getOrders(filters),
  });

  const { data: crewsData } = useQuery({
    queryKey: ['crews', 'filter-options'],
    queryFn: () => getCrews({ limit: 100 }),
  });

  const orders = data?.data ?? [];

  const setFilter = <K extends keyof OrdersFilters>(key: K, value: OrdersFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const crewOptions = useMemo(
    () => (crewsData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [crewsData],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Órdenes de Trabajo</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestione y monitoree todas las órdenes de trabajo
          </p>
        </div>
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
            <Map className="w-4 h-4" />
            Mapa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Buscar por OT, título o cliente..."
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
          <Select
            placeholder="Todos los estados"
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
            onChange={(e) => setFilter('status', e.target.value as WorkOrderStatus)}
          />
          <Select
            placeholder="Todos los tipos"
            options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
            onChange={(e) => setFilter('type', e.target.value as WorkOrderType)}
          />
          <Select
            placeholder="Todas las cuadrillas"
            options={crewOptions}
            onChange={(e) => setFilter('crewId', e.target.value)}
          />
          <Input type="date" onChange={(e) => setFilter('dateFrom', e.target.value)} />
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="card p-5">
          <div className="h-96 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2">
            <Map className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mapa interactivo próximamente</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Ubicación de las órdenes de trabajo abiertas</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
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
                  <OrderRow key={order.id} order={order} onClick={() => navigate(`/orders/${order.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
          {data?.meta && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              {data.meta.total} orden{data.meta.total === 1 ? '' : 'es'} en total
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, onClick }: { order: WorkOrder; onClick: () => void }) {
  const slaState = getSlaState(order);
  const isUrgent = slaState === 'overdue' || slaState === 'dueSoon';

  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{order.orderNumber}</td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
        {order.customer?.firstName} {order.customer?.lastName}
      </td>
      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
        {order.address ? `${order.address.street} ${order.address.number ?? ''}, ${order.address.city}` : '—'}
      </td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{typeLabels[order.type]}</td>
      <td className="px-4 py-3">
        <Badge variant={statusBadgeVariant[order.status]}>{statusLabels[order.status]}</Badge>
      </td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{order.crew?.name ?? 'Sin asignar'}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 font-medium ${
          slaState === 'overdue'
            ? 'text-red-600 dark:text-red-400'
            : slaState === 'dueSoon'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
        }`}>
          {isUrgent && <AlertTriangle className="w-3.5 h-3.5" />}
          {formatSlaRemaining(order)}
        </span>
      </td>
    </tr>
  );
}
