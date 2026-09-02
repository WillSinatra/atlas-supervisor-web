import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/services/api';

interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
}

export function useGanttTareas(filtros: any = {}) {
  return useQuery({
    queryKey: ['gantt-tareas', filtros],
    queryFn: async () => {
      try {
        const { data } = await api.get('/v1/reportes/gantt-tareas', { params: filtros });
        
        // Transformar datos del backend al formato de Frappe Gantt
        const tareas = (Array.isArray(data) ? data : data.data || []).map((t: any) => ({
          id: t.id,
          name: `${t.nombre}${t.responsable ? ` • ${t.responsable}` : ''}`,
          start: t.inicio,
          end: t.fin,
          progress: t.progreso || 0,
          dependencies: t.dependencias?.join(',') || '',
          type: t.progreso === 100 ? 'milestone' : 'task'
        }));

        return tareas;
      } catch (error) {
        console.error('Error fetching gantt tasks:', error);
        return [];
      }
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000
  });
}
