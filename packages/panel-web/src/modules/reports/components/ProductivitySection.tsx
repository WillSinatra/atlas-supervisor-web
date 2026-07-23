import type { DateRange } from '@/shared/components/ui/DateRangeFilter';
import { ConnectingState } from '@/shared/components/ui/NotConnectedState';

export function ProductivitySection(_props: { filters: DateRange }) {
  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Productividad por cuadrilla</h3>
      <ConnectingState />
    </div>
  );
}
