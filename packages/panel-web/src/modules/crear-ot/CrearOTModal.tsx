import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

interface Alta {
  id: string;
  cliente: { nombre: string; email: string; telefono: string; dni: string; direccion: string };
  plan: { id: string; nombre: string; precio: number; velocidad: number };
  estado: string;
  creado_en: string;
}

interface Cuadrilla {
  id: string;
  nombre: string;
}

export default function CrearOTModal({ alta, onClose }: { alta: Alta; onClose: () => void }) {
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCuadrillas, setLoadingCuadrillas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    cargarCuadrillas();
  }, []);

  const cargarCuadrillas = async () => {
    try {
      setLoadingCuadrillas(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/v1/cuadrillas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCuadrillas(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error cargando cuadrillas:', err);
      setError('No se pudieron cargar las cuadrillas');
    } finally {
      setLoadingCuadrillas(false);
    }
  };

  const handleCrearOT = async () => {
    if (!cuadrillaSeleccionada) {
      setError('Selecciona una cuadrilla');
      return;
    }

    if (!horaProgramada) {
      setError('Selecciona fecha y hora');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      await axios.post(
        `/api/v1/altas-rapidas/${alta.id}/convertir-ot`,
        {
          cuadrilla_id: cuadrillaSeleccionada,
          hora_programada: horaProgramada,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess('¡Orden de trabajo creada exitosamente!');
      setLoading(false);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear la orden';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Crear Orden de Trabajo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded">{error}</div>}
          {success && <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded">{success}</div>}

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Cliente</h3>
            <p className="text-sm text-slate-900 dark:text-white">{alta.cliente.nombre}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{alta.cliente.direccion}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Plan</h3>
            <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded">
              <p className="text-sm text-slate-900 dark:text-white font-semibold">{alta.plan.nombre}</p>
              <p className="text-lg font-bold text-blue-600">${alta.plan.precio.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Cuadrilla *</label>
            <select
              value={cuadrillaSeleccionada}
              onChange={(e) => setCuadrillaSeleccionada(e.target.value)}
              disabled={loadingCuadrillas}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
            >
              <option value="">
                {loadingCuadrillas ? 'Cargando cuadrillas...' : 'Seleccionar cuadrilla'}
              </option>
              {cuadrillas.map(cuadrilla => (
                <option key={cuadrilla.id} value={cuadrilla.id}>
                  {cuadrilla.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Fecha y Hora *</label>
            <input
              type="datetime-local"
              value={horaProgramada}
              onChange={(e) => setHoraProgramada(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 justify-center">
          <button onClick={onClose} className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
          <button onClick={handleCrearOT} disabled={loading || !cuadrillaSeleccionada || !horaProgramada} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
            {loading ? 'Creando...' : 'Crear Orden'}
          </button>
        </div>
      </div>
    </div>
  );
}
