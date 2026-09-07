import { useQuery, useMutation } from '@tanstack/react-query';
import { tareasApi } from '@/shared/services/tareas';
import { empleadosApi } from '@/shared/services/personal';
import { Button } from '@/shared/components/ui/Button';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Tarea } from '@/types/atlas';

export function AsignarEmpleadoMenu({ tarea, onAsignado }: { tarea: Tarea; onAsignado: () => void }) {
  const [abierto, setAbierto] = useState(false);

  const { data: empleados = { data: [] } } = useQuery<any>({
    queryKey: ['empleados', tarea.area?.id],
    queryFn: () =>
      empleadosApi.listar({
        area_id: tarea.area?.id,
        estado: 'activo',
        per_page: 100,
      }),
    enabled: !!tarea.area?.id,
  });

  const asignar = useMutation({
    mutationFn: (empleadoId: string) =>
      tareasApi.actualizar(tarea.id, { empleado_id: empleadoId }),
    onSuccess: () => {
      onAsignado();
      setAbierto(false);
    },
  });

  const lista = empleados?.data ?? [];

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="secondary"
        icon={<ChevronDown className="w-4 h-4" />}
        onClick={() => setAbierto(!abierto)}
      >
        Asignar
      </Button>
      {abierto && (
        <div className="absolute top-full mt-1 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 min-w-48">
          {lista.length === 0 ? (
            <div className="p-2 text-xs text-slate-400">Sin empleados en esta área</div>
          ) : (
            <div className="py-1">
              {lista.map((emp: any) => (
                <button
                  key={emp.id}
                  onClick={() => asignar.mutate(emp.id)}
                  disabled={asignar.isPending}
                  className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  {emp.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
