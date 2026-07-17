import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { getCustomers } from '@/shared/services/customersService';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getCustomers({ search }),
  });

  const customers = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestione la información de clientes
        </p>
      </div>

      <div className="card p-4">
        <Input
          placeholder="Buscar por nombre, documento, teléfono o email..."
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Search className="w-8 h-8" />} title="Sin resultados" description="No hay clientes que coincidan con la búsqueda." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Domicilio principal</th>
                  <th className="px-4 py-3">OTs</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const mainAddress = customer.addresses.find((a) => a.isMain) ?? customer.addresses[0];
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">{customer.firstName} {customer.lastName}</p>
                        {customer.businessName && <p className="text-xs text-slate-500 dark:text-slate-400">{customer.businessName}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {customer.documentType} {customer.documentNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{customer.phone}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {mainAddress ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            {mainAddress.street} {mainAddress.number}, {mainAddress.city}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{customer._count?.workOrders ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data?.meta && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              {data.meta.total} cliente{data.meta.total === 1 ? '' : 's'} en total
            </div>
          )}
        </div>
      )}
    </div>
  );
}
