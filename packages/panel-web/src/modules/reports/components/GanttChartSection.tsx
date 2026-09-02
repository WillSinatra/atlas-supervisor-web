import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/services/api';
import { EditarTareaModal } from './EditarTareaModal';

const formatDate = (d: Date) => d.toLocaleDateString('es-AR');

interface Props {
  desde?: string;
  hasta?: string;
}

export function GanttChartSection({ desde, hasta }: Props) {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: tareas = [], isLoading, refetch } = useQuery({
    queryKey: ['tareas', desde, hasta],
    queryFn: async () => {
      const params = new URLSearchParams({ todas: 'true' });
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      const { data } = await api.get(`/v1/tareas?${params}`);
      return Array.isArray(data) ? data : data.data || [];
    },
  });

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  if (isLoading) return <div className="p-4 text-gray-400">Cargando...</div>;
  if (tareas.length === 0) return <div className="p-4 text-gray-400">Sin tareas</div>;

  const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const getProgress = (estado: string) => {
    if (estado === 'hecha') return 100;
    if (estado === 'en_curso') return 50;
    return 0;
  };

  return (
    <>
      <div className="w-full p-4">
        <div className="overflow-x-auto border border-gray-700 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700 sticky top-0">
                <th className="text-left px-3 py-3 w-40 font-semibold text-gray-300">Tarea</th>
                <th className="text-left px-3 py-3 w-24 font-semibold text-gray-300">Inicio</th>
                <th className="text-left px-3 py-3 w-24 font-semibold text-gray-300">Vence</th>
                <th className="text-left px-3 py-3 w-20 font-semibold text-gray-300">Responsable</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-300">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {tareas.slice(0, 10).map((t: any, idx: number) => {
                const start = new Date(t.creado_en);
                const end = new Date(t.vence_el);
                const progress = getProgress(t.estado);
                const responsable = t.empleado?.nombre || 'Sin asignar';

                return (
                  <tr key={t.id} className="border-b border-gray-700 hover:bg-gray-800 transition">
                    <td className="px-3 py-3 text-gray-300 truncate font-medium">{t.titulo?.substring(0, 30) || 'Sin título'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(start)}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(end)}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{responsable}</td>
                    <td className="px-3 py-3">
                      <div
                        onClick={() => handleTaskClick(t)}
                        className="h-8 rounded overflow-hidden border border-gray-600 cursor-pointer hover:opacity-80 transition flex items-center"
                        style={{
                          backgroundColor: '#1f2937',
                          backgroundImage: `linear-gradient(to right, ${colors[idx % colors.length]} ${progress}%, #374151 ${progress}%)`,
                        }}
                        title={`${t.titulo}: ${progress}% - ${t.estado}`}
                      >
                        {progress > 15 && <span className="ml-2 text-white font-bold text-xs">{progress}%</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <EditarTareaModal
        open={modalOpen}
        tarea={selectedTask}
        onClose={() => setModalOpen(false)}
        onSave={() => refetch()}
      />
    </>
  );
}
