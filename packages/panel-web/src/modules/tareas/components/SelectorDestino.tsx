import { useQuery } from '@tanstack/react-query';
import { Building2, User } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { areasApi, empleadosApi } from '@/shared/services/personal';

export type TipoDestino = 'empleado' | 'area';

interface SelectorDestinoProps {
  tipo: TipoDestino;
  empleadoId: string;
  areaId: string;
  onTipo: (tipo: TipoDestino) => void;
  onEmpleado: (id: string) => void;
  onArea: (id: string) => void;
  error?: string;
  /** Se consultan las listas solo cuando el formulario está a la vista. */
  activo: boolean;
}

/**
 * A quién va la tarea: una persona o un sector entero.
 *
 * La tarea de sector nace sin responsable y la puede hacer cualquiera del área.
 * Es lo que resuelve los casos que no tienen un dueño fijo —el parte del NOC, la
 * limpieza— sin tener que reasignarlos cada vez que cambia el turno.
 */
export function SelectorDestino({
  tipo,
  empleadoId,
  areaId,
  onTipo,
  onEmpleado,
  onArea,
  error,
  activo,
}: SelectorDestinoProps) {
  const { data: empleadosData } = useQuery({
    queryKey: ['empleados', 'activos'],
    queryFn: () => empleadosApi.listar({ estado: 'activo', per_page: 200 }),
    enabled: activo,
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas', 'activas'],
    queryFn: () => areasApi.listar({ activo: true }),
    enabled: activo,
  });

  const empleados = empleadosData?.data ?? [];
  const areas = areasData?.data ?? [];

  const opcion = (valor: TipoDestino, etiqueta: string, icono: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onTipo(valor)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
        tipo === valor
          ? 'bg-white dark:bg-slate-800 text-atlas-700 dark:text-atlas-300 shadow-sm font-medium'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icono}
      {etiqueta}
    </button>
  );

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        ¿Quién la hace? *
      </label>
      <div className="flex gap-1 p-1 mb-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
        {opcion('empleado', 'Una persona', <User className="w-4 h-4" />)}
        {opcion('area', 'Un área', <Building2 className="w-4 h-4" />)}
      </div>

      {tipo === 'empleado' ? (
        <Select
          placeholder="Elegir persona"
          options={empleados.map((e) => ({ value: e.id, label: e.nombre }))}
          value={empleadoId}
          error={error}
          onChange={(e) => onEmpleado(e.target.value)}
        />
      ) : (
        <>
          <Select
            placeholder="Elegir área"
            options={areas.map((a) => ({ value: a.id, label: a.nombre }))}
            value={areaId}
            error={error}
            onChange={(e) => onArea(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Le llega a todo el sector y la completa cualquiera. Al tomarla queda a nombre de quien la
            haya agarrado, pero el resto la sigue viendo.
          </p>
        </>
      )}
    </div>
  );
}
