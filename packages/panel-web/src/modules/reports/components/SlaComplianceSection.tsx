import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { getSlaComplianceReport, type ReportsFilters } from '@/shared/services/reportsService';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';

export function SlaComplianceSection({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'sla', filters],
    queryFn: () => getSlaComplianceReport(filters),
  });

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cumplimiento de SLA</h3>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : !data || (data.byCrew.length === 0 && data.byCustomerType.length === 0) ? (
        <EmptyState
          icon={<ShieldCheck className="w-8 h-8" />}
          title="Sin órdenes cerradas"
          description="No hay órdenes completadas con SLA en el período seleccionado."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Por cuadrilla</p>
            {data.byCrew.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos en el período.</p>
            ) : (
              data.byCrew.map((g) => (
                <ProgressBar key={g.id} label={g.name} value={g.complianceRate} sublabel={`${g.withinSla} de ${g.totalOrders} dentro del SLA`} />
              ))
            )}
          </div>
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Por tipo de cliente</p>
            {data.byCustomerType.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos en el período.</p>
            ) : (
              data.byCustomerType.map((g) => (
                <ProgressBar key={g.id} label={g.name} value={g.complianceRate} sublabel={`${g.withinSla} de ${g.totalOrders} dentro del SLA`} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
