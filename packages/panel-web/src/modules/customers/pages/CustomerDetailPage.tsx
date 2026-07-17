import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Phone, Mail, ClipboardList, Home } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { getCustomerById } from '@/shared/services/customersService';
import { statusLabels, statusBadgeVariant } from '@/shared/constants/orderStatus';
import { typeLabels } from '@/shared/services/mocks/orders.mock';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerById(id!),
    enabled: !!id,
  });

  if (isLoading || !customer) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{customer.firstName} {customer.lastName}</h1>
          {customer.businessName && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{customer.businessName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Domicilios */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-atlas-600" /> Domicilios
            </h3>
            {customer.addresses.length === 0 ? (
              <EmptyState icon={<Home className="w-8 h-8" />} title="Sin domicilios" description="Este cliente no tiene domicilios cargados." />
            ) : (
              <div className="space-y-2">
                {customer.addresses.map((addr) => (
                  <div key={addr.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {addr.street} {addr.number}{addr.complement ? `, ${addr.complement}` : ''}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {addr.neighborhood ? `${addr.neighborhood}, ` : ''}{addr.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {addr.label && <span className="text-xs text-slate-400">{addr.label}</span>}
                      {addr.isMain && <Badge variant="info">Principal</Badge>}
                    </div>
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
            {customer.workOrders.length === 0 ? (
              <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="Sin órdenes de trabajo" description="Este cliente todavía no tiene OTs registradas." />
            ) : (
              <div className="space-y-2">
                {customer.workOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{order.orderNumber} · {typeLabels[order.type]}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{order.crew?.name ?? 'Sin asignar'}</p>
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
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Contacto</h3>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-slate-400" /> {customer.phone}
              </p>
              {customer.email && (
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-slate-400" /> {customer.email}
                </p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Documento</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">{customer.documentType} {customer.documentNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
