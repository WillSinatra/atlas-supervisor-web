import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Phone, Mail, ClipboardList, Home, WifiOff } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { clientesApi, mensajeDeError } from '@/shared/services/api';
import { etiquetasEstado } from '@/types/atlas';
import type { EstadoOrden } from '@/types/atlas';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantEstadoOrden: Record<EstadoOrden, BadgeVariant> = {
  pendiente: 'neutral',
  asignada: 'info',
  aceptada: 'info',
  en_proceso: 'warning',
  completada: 'success',
  cancelada: 'danger',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: customer,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesApi.detalle(id!),
    enabled: !!id,
  });

  const { data: ordenes } = useQuery({
    queryKey: ['cliente', id, 'ordenes'],
    queryFn: () => clientesApi.historial(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/customers')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex items-center justify-center h-80">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudo cargar el cliente"
            description={isError ? mensajeDeError(error) : 'Cliente no encontrado.'}
          />
        </div>
      </div>
    );
  }

  const domicilios = customer.domicilios ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => navigate('/customers')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{customer.nombre}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Domicilios */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-atlas-600" /> Domicilios
            </h3>
            {domicilios.length === 0 ? (
              <EmptyState icon={<Home className="w-8 h-8" />} title="Sin domicilios" description="Este cliente no tiene domicilios cargados." />
            ) : (
              <div className="space-y-2">
                {domicilios.map((addr) => (
                  <div key={addr.id} className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{addr.direccion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de OTs */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-atlas-600" /> Historial de órdenes de trabajo
            </h3>
            {!ordenes || ordenes.length === 0 ? (
              <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="Sin órdenes de trabajo" description="Este cliente todavía no tiene OTs registradas." />
            ) : (
              <div className="space-y-2">
                {ordenes.map((orden) => (
                  <div
                    key={orden.id}
                    onClick={() => navigate(`/orders/${orden.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{orden.numero} · {orden.tipo}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{orden.titulo ?? 'Sin título'}</p>
                    </div>
                    <Badge variant={variantEstadoOrden[orden.estado]}>{etiquetasEstado[orden.estado]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Contacto</h3>
            <div className="space-y-2 text-sm">
              {customer.telefono && (
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400" /> {customer.telefono}
                </p>
              )}
              {customer.email && (
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-slate-400" /> {customer.email}
                </p>
              )}
              {!customer.telefono && !customer.email && (
                <p className="text-slate-400">Sin datos de contacto</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
