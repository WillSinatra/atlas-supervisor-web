import { ChevronRight } from 'lucide-react';
import type { MantenimientoVehiculo } from '@/types/atlas';

interface MaintenanceCardProps {
  registro: MantenimientoVehiculo;
  onOpen: () => void;
}

/** Tarjeta compacta de un registro de mantenimiento en la lista de la cuadrilla. */
export function MaintenanceCard({ registro, onOpen }: MaintenanceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors border border-slate-200 dark:border-slate-600"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{registro.tipo}</h4>

          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-4 h-4 rounded-full bg-atlas-600 flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0">
              {registro.tecnico_nombre.charAt(0)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {new Date(registro.fecha).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              · {registro.tecnico_nombre}
            </p>
          </div>

          {registro.detalle && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">{registro.detalle}</p>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      </div>
    </button>
  );
}
