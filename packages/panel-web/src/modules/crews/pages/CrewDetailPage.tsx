import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Truck, Package, ClipboardList, Phone } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { getCrewById } from '@/shared/services/crewsService';
import { crewStatusLabels, crewStatusBadgeVariant, technicianStatusLabels, technicianStatusBadgeVariant } from '@/shared/constants/crewStatus';
import { statusLabels, statusBadgeVariant } from '@/shared/constants/orderStatus';
import { typeLabels } from '@/shared/services/mocks/orders.mock';

export default function CrewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: crew, isLoading } = useQuery({
    queryKey: ['crew', id],
    queryFn: () => getCrewById(id!),
    enabled: !!id,
  });

  if (isLoading || !crew) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  const closedOrders = crew.workOrders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/crews')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{crew.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{crew.code} · {crew.specialty}</p>
        </div>
        <Badge variant={crewStatusBadgeVariant[crew.status]} className="ml-auto">{crewStatusLabels[crew.status]}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Técnicos */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Técnicos asignados</h3>
            <div className="space-y-2">
              {crew.technicians.map((tech) => (
                <div key={tech.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-atlas-600 flex items-center justify-center text-white text-sm font-medium">
                      {tech.firstName.charAt(0)}{tech.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{tech.firstName} {tech.lastName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {tech.phone}
                      </p>
                    </div>
                  </div>
                  <Badge variant={technicianStatusBadgeVariant[tech.status]}>{technicianStatusLabels[tech.status]}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Stock móvil */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-atlas-600" /> Stock móvil actual
            </h3>
            {crew.inventory.length === 0 ? (
              <EmptyState icon={<Package className="w-8 h-8" />} title="Sin stock cargado" description="Esta cuadrilla no tiene materiales asignados." />
            ) : (
              <div className="space-y-2">
                {crew.inventory.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.material.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{inv.material.code}</p>
                    </div>
                    <span className={`text-sm font-semibold ${inv.quantity < inv.minQuantity ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {inv.quantity} {inv.material.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de OTs cerradas */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-atlas-600" /> Historial de OTs cerradas
            </h3>
            {closedOrders.length === 0 ? (
              <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="Sin OTs cerradas" description="Esta cuadrilla todavía no cerró ninguna orden de trabajo." />
            ) : (
              <div className="space-y-2">
                {closedOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{order.orderNumber} · {typeLabels[order.type]}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{order.customer?.firstName} {order.customer?.lastName}</p>
                    </div>
                    <Badge variant={statusBadgeVariant[order.status]}>{statusLabels[order.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-atlas-600" /> Vehículo
            </h3>
            {crew.vehicle ? (
              <div className="space-y-1.5 text-sm">
                <p className="text-slate-900 dark:text-white font-medium">{crew.vehicle.brand} {crew.vehicle.model}</p>
                <p className="text-slate-500 dark:text-slate-400">Patente: {crew.vehicle.plate}</p>
                {crew.vehicle.year && <p className="text-slate-500 dark:text-slate-400">Año: {crew.vehicle.year}</p>}
                {crew.vehicle.color && <p className="text-slate-500 dark:text-slate-400">Color: {crew.vehicle.color}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sin vehículo asignado</p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Zona</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">{crew.zone ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
