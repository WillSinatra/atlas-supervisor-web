import { useState } from 'react';
import { GanttChart } from '../components/GanttChart';
import { useGanttTareas } from '../hooks/useGanttTareas';
import { Calendar, Plus, ZoomIn, ZoomOut } from 'lucide-react';

export default function GanttPage() {
  const [filtros, setFiltros] = useState({
    desde: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    hasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const { data: tareas = [], isLoading, error } = useGanttTareas(filtros);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Gantt de Tareas</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex gap-2 flex-wrap items-center">
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            Agregar
          </button>
          <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
            Expandir todo
          </button>
          <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
            Colapsar todo
          </button>
          <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
            Zoom to fit
          </button>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error al cargar: {(error as any)?.message || 'Error desconocido'}
          </div>
        ) : tareas.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center text-yellow-700">
            Sin tareas en el período seleccionado
          </div>
        ) : (
          <GanttChart tareas={tareas} />
        )}
      </div>
    </div>
  );
}
