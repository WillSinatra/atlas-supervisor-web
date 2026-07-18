import { useQuery } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { getRecurrencesReport, type ReportsFilters } from '@/shared/services/reportsService';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { Badge } from '@/shared/components/ui/Badge';

export function RecurrencesSection({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'recurrences', filters],
    queryFn: () => getRecurrencesReport(filters),
  });

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Reincidencias (3+ reclamos)</h3>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<RefreshCcw className="w-8 h-8" />}
          title="Sin reincidencias"
          description="Ningún domicilio registró 3 o más reclamos en el período seleccionado."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Domicilio</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Reclamos</th>
                <th className="px-4 py-3">Último reclamo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.addressId} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.addressLabel}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.customerName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="danger">{r.claimsCount}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(r.lastClaimDate).toLocaleDateString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
