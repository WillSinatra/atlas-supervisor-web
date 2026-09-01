import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CrearOTModal from './CrearOTModal';

interface Alta {
  id: string;
  cliente: { nombre: string; email: string; telefono: string; dni: string; direccion: string };
  plan: { id: string; nombre: string; precio: number; velocidad: number };
  estado: string;
  creado_en: string;
}

export default function CrearOTContainer() {
  const [altas, setAltas] = useState<Alta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [altaSeleccionada, setAltaSeleccionada] = useState<Alta | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarAltas();
  }, []);

  const cargarAltas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/v1/altas-rapidas?estado=validada_admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAltas(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error cargando altas:', err);
      setError('No se pudieron cargar las altas validadas');
    } finally {
      setLoading(false);
    }
  };

  const altasFiltradas = altas.filter(alta =>
    alta.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    alta.cliente.telefono.includes(busqueda)
  );

  const handleSelectAlta = (alta: Alta) => {
    setAltaSeleccionada(alta);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setAltaSeleccionada(null);
    cargarAltas();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-lg p-8 text-center transition-colors">
        <p className="text-slate-600 dark:text-slate-400">Cargando altas validadas...</p>
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
        <p className="text-slate-600 dark:text-slate-400">No hay altas validadas para crear órdenes</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Cliente</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Plan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Monto</th>
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
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleSelectAlta(alta)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Crear OT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && altaSeleccionada && (
        <CrearOTModal
          alta={altaSeleccionada}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
