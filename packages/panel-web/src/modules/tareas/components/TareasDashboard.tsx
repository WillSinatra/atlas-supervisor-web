import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { tareasApi } from '@/shared/services/tareas';

export function TareasDashboard() {
  const { data: misTareas = [] } = useQuery({
    queryKey: ['tareas', 'dashboard'],
    queryFn: () => tareasApi.listar({ 
      mias: true, 
      pendientes: true,
      per_page: 100 
    }),
    staleTime: 30 * 1000,
  });

  const { data: misTareasEnCurso = [] } = useQuery({
    queryKey: ['tareas', 'en-curso'],
    queryFn: () => tareasApi.listar({ 
      mias: true, 
      estado: 'en_curso',
      per_page: 100 
    }),
    staleTime: 30 * 1000,
  });

  const { data: completadas = [] } = useQuery({
    queryKey: ['tareas', 'completadas'],
    queryFn: () => tareasApi.listar({ 
      mias: true, 
      estado: 'hecha',
      per_page: 100 
    }),
    staleTime: 30 * 1000,
  });

  const tareasEnCursoArray = Array.isArray(misTareasEnCurso) ? misTareasEnCurso : (misTareasEnCurso?.data ?? []);
  const tareasCompletadasArray = Array.isArray(completadas) ? completadas : (completadas?.data ?? []);
  const tareasPendientesArray = Array.isArray(misTareas) ? misTareas : (misTareas?.data ?? []);

  const contadores = {
    pendiente: tareasPendientesArray.length,
    en_curso: tareasEnCursoArray.length,
    hecha: tareasCompletadasArray.length,
  };

  const tarjetas = [
    {
      label: 'Pendiente',
      valor: contadores.pendiente,
      icon: <Clock className="w-5 h-5" />,
      color: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/50',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgHover: 'hover:from-amber-500/30 hover:to-orange-500/30',
    },
    {
      label: 'En curso',
      valor: contadores.en_curso,
      icon: <RotateCcw className="w-5 h-5" />,
      color: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/50',
      textColor: 'text-blue-600 dark:text-blue-400',
      bgHover: 'hover:from-blue-500/30 hover:to-cyan-500/30',
    },
    {
      label: 'Completada',
      valor: contadores.hecha,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/50',
      textColor: 'text-green-600 dark:text-green-400',
      bgHover: 'hover:from-green-500/30 hover:to-emerald-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {tarjetas.map((tarjeta) => (
        <div
          key={tarjeta.label}
          className={`bg-gradient-to-br ${tarjeta.color} ${tarjeta.bgHover}
            border ${tarjeta.border}
            rounded-lg p-7 backdrop-blur-sm
            transition-all duration-300
            shadow-lg shadow-black/20
            hover:shadow-xl hover:shadow-black/30
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                {tarjeta.label}
              </p>
              <p className={`text-3xl font-bold ${tarjeta.textColor}`}>{tarjeta.valor}</p>
            </div>
            <div className={`${tarjeta.textColor} opacity-80`}>{tarjeta.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
