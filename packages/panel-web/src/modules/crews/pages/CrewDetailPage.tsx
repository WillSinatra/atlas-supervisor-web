import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Package, ClipboardList, Users } from 'lucide-react';
import { ConnectingState } from '@/shared/components/ui/NotConnectedState';

export default function CrewDetailPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/crews')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Detalle de cuadrilla</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Técnicos */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-atlas-600" /> Técnicos asignados
            </h3>
            <ConnectingState />
          </div>

          {/* Stock móvil */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-atlas-600" /> Stock móvil actual
            </h3>
            <ConnectingState />
          </div>

          {/* Historial de OTs cerradas */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-atlas-600" /> Historial de OTs cerradas
            </h3>
            <ConnectingState />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-atlas-600" /> Vehículo
            </h3>
            <ConnectingState />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Zona</h3>
            <ConnectingState />
          </div>
        </div>
      </div>
    </div>
  );
}
