import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ValidarAltaModal from './ValidarAltaModal';
import { Lock, ArrowRight } from 'lucide-react';

interface Alta {
  id: string;
  cliente: { nombre: string; email: string; telefono: string; dni: string; direccion: string };
  plan: { id: string; nombre: string; precio: number; velocidad: number };
  comprobante_url: string | null;
  pago_verificado: boolean;
  estado: string;
  creado_en: string;
}

export default function ValidarAltasContainer() {
  const [altas, setAltas] = useState<Alta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [altaSeleccionada, setAltaSeleccionada] = useState<Alta | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroComprobante, setFiltroComprobante] = useState<'todos' | 'pendiente' | 'cargado'>('todos');
  const [convirtiendo, setConvirtiendo] = useState(false);

  useEffect(() => {
    cargarAltas();
  }, []);

  const cargarAltas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/v1/altas-rapidas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAltas(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error cargando altas:', err);
      setError('No se pudieron cargar las altas');
    } finally {
      setLoading(false);
    }
  };

  const altasFiltradas = altas.filter(alta => {
    const coincideNombre = alta.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          alta.cliente.telefono.includes(busqueda);
    const coincideFiltro = 
      filtroComprobante === 'todos' ||
      (filtroComprobante === 'pendiente' && !alta.comprobante_url) ||
      (filtroComprobante === 'cargado' && alta.comprobante_url);
    return coincideNombre && coincideFiltro;
  });

  const handleSelectAlta = (alta: Alta) => {
    setAltaSeleccionada(alta);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setAltaSeleccionada(null);
    cargarAltas();
  };

  const handleConvertirOT = async (alta: Alta) => {
    setConvirtiendo(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    window.location.href = `/orders/nueva?alta_id=${alta.id}`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-lg p-8 text-center transition-colors">
        <p className="text-slate-600 dark:text-slate-400">Cargando altas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 p-4 rounded-lg border border-red-300 dark:border-red-800/30">
        {error}
      </div>
    );
  }

  if (altasFiltradas.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-lg p-8 text-center transition-colors">
        <p className="text-slate-600 dark:text-slate-400">No hay altas para validar</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
        />
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setFiltroComprobante('todos')}
            className={`px-4 py-2 rounded-full font-semibold transition-all ${
              filtroComprobante === 'todos'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title="Mostrar todos"
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroComprobante('pendiente')}
            className={`px-4 py-2 rounded-full font-semibold transition-all ${
              filtroComprobante === 'pendiente'
                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/50'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title="Pendiente"
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltroComprobante('cargado')}
            className={`px-4 py-2 rounded-full font-semibold transition-all ${
              filtroComprobante === 'cargado'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/50'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title="Cargado"
          >
            Cargados
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Cliente</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Plan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Monto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Comprobante</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900 dark:text-white">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {altasFiltradas.map(alta => (
                <tr key={alta.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="font-medium text-slate-900 dark:text-white">{alta.cliente.nombre}</p>
                      <p className="text-slate-500 dark:text-slate-400">{alta.cliente.telefono}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="font-medium text-slate-900 dark:text-white">{alta.plan.nombre}</p>
                      <p className="text-slate-500 dark:text-slate-400">{alta.plan.velocidad} Mbps</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      ${alta.plan.precio.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {alta.comprobante_url ? (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Cargado</span>
                    ) : (
                      <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">⚠ Pendiente</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleSelectAlta(alta)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        Validar
                      </button>
                      <button
                        onClick={() => handleConvertirOT(alta)}
                        disabled={!alta.comprobante_url}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!alta.comprobante_url && <Lock className="w-4 h-4" />}
                        {alta.comprobante_url && <ArrowRight className="w-4 h-4" />}
                        Convertir a OT
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && altaSeleccionada && (
        <ValidarAltaModal
          alta={altaSeleccionada}
          onClose={handleModalClose}
        />
      )}

      {convirtiendo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 flex flex-col items-center gap-4 shadow-2xl animate-fadeIn">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">Convirtiendo a Orden de Trabajo...</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Por favor espera</p>
          </div>
        </div>
      )}
    </>
  );
}
