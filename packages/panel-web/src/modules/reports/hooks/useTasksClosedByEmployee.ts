import { useQuery } from '@tanstack/react-query';
import api from '@/shared/services/api';

export interface TaskClosedStats {
  empleado_id: string;
  empleado_nombre: string;
  area: string;
  tareas_completadas: number;
  tarea_ids: string[];
}

export function useTasksClosedByEmployee(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['tareas-cerradas-por-empleado', { dateFrom, dateTo }],
    queryFn: async () => {
      const res = await api.get('/v1/tareas', {
        params: {
          todas: true,
          estado: 'hecha',
          desde: dateFrom,
          hasta: dateTo,
          per_page: 1000,
        },
      });
      
      // Agrupar por empleado
      const grouped = (res.data.data || []).reduce((acc: Record<string, TaskClosedStats>, task: any) => {
        const empId = task.empleado?.id || 'sin-asignar';
        const empNombre = task.empleado?.nombre || 'Sin asignar';
        const area = task.area?.nombre || 'Sin área';
        
        if (!acc[empId]) {
          acc[empId] = {
            empleado_id: empId,
            empleado_nombre: empNombre,
            area,
            tareas_completadas: 0,
            tarea_ids: [],
          };
        }
        
        acc[empId].tareas_completadas += 1;
        acc[empId].tarea_ids.push(task.id);
        
        return acc;
      }, {});
      
      return (Object.values(grouped) as TaskClosedStats[]).sort((a, b) => b.tareas_completadas - a.tareas_completadas);
    },
    staleTime: 1000 * 60 * 5,
  });
}
