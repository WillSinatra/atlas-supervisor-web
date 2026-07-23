import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Home } from 'lucide-react';
import { ConnectingState } from '@/shared/components/ui/NotConnectedState';

export default function CustomerDetailPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Detalle de cliente</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Domicilios */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-atlas-600" /> Domicilios
            </h3>
            <ConnectingState />
          </div>

          {/* Historial de OTs */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-atlas-600" /> Historial de órdenes de trabajo
            </h3>
            <ConnectingState />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Contacto</h3>
            <ConnectingState />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Documento</h3>
            <ConnectingState />
          </div>
        </div>
      </div>
    </div>
  );
}
