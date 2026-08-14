import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Pencil, Plus, Trash2, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { areasApi, empleadosApi } from '@/shared/services/personal';
import type { Area, CrearAreaInput } from '@/types/atlas';

/**
 * Administración del catálogo de áreas (Ventas, Soporte, Administración…).
 *
 * Existe para no volver a tocar código cada vez que la empresa suma un sector:
 * el área que se crea acá aparece sola en el alta de empleados y en los
 * selectores de asignación de tickets y órdenes.
 */
export function PanelAreas() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Area | null>(null);
  const [aEliminar, setAEliminar] = useState<Area | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.listar(),
  });

  const { data: empleadosData } = useQuery({
    queryKey: ['empleados', 'conteo-por-area'],
    queryFn: () => empleadosApi.listar(),
  });

  const conteoPorArea = useMemo(() => {
    const conteo: Record<string, number> = {};
    (empleadosData?.data ?? []).forEach((empleado) => {
      conteo[empleado.area_id] = (conteo[empleado.area_id] ?? 0) + 1;
    });
    return conteo;
  }, [empleadosData]);

  const areas = useMemo(
    () => [...(data?.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [data],
  );

  // El backend manda el total si lo calcula; si no, se cuenta con lo que hay cargado.
  const cantidadEmpleados = (area: Area) => area.empleados_count ?? conteoPorArea[area.id] ?? 0;

  const eliminar = useMutation({
    mutationFn: (id: string) => areasApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setAEliminar(null);
    },
  });

  const abrirAlta = () => {
    setEnEdicion(null);
    setModalAbierto(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Las áreas definen el sector de cada empleado y filtran a quién se le puede asignar trabajo.
        </p>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={abrirAlta} className="flex-shrink-0">
          Agregar área
        </Button>
      </div>

      <AreaModal
        open={modalAbierto}
        area={enEdicion}
        onClose={() => setModalAbierto(false)}
        onGuardado={() => {
          queryClient.invalidateQueries({ queryKey: ['areas'] });
          setModalAbierto(false);
        }}
      />

      <Modal
        open={!!aEliminar}
        onClose={() => {
          setAEliminar(null);
          eliminar.reset();
        }}
        title="Eliminar área"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Seguro que querés eliminar el área <strong>{aEliminar?.nombre}</strong>?
          </p>
          <p className="text-xs text-slate-400">
            Si preferís conservar el historial, marcala como inactiva en lugar de borrarla.
          </p>

          {eliminar.isError && (
            <Alert variant="error" title="No se pudo eliminar el área">
              {mensajeDeError(eliminar.error)}
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAEliminar(null);
                eliminar.reset();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => aEliminar && eliminar.mutate(aEliminar.id)}
              loading={eliminar.isPending}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <div className="card">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudieron cargar las áreas"
            description={mensajeDeError(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : areas.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<LayoutGrid className="w-8 h-8" />}
            title="Sin áreas"
            description="Creá la primera área (Ventas, Soporte, Administración...) para poder cargar empleados."
            action={
              <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={abrirAlta}>
                Agregar área
              </Button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Empleados</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => (
                  <tr
                    key={area.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{area.nombre}</p>
                      {area.descripcion && <p className="text-xs text-slate-400">{area.descripcion}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{cantidadEmpleados(area)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={area.activo ? 'success' : 'neutral'}>
                        {area.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEnEdicion(area);
                            setModalAbierto(true);
                          }}
                          title="Editar"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => setAEliminar(area)}
                          title="Eliminar"
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface AreaModalProps {
  open: boolean;
  /** null = alta; con área = edición. */
  area: Area | null;
  onClose: () => void;
  onGuardado: () => void;
}

function AreaModal({ open, area, onClose, onGuardado }: AreaModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [errorNombre, setErrorNombre] = useState<string | undefined>();

  const guardar = useMutation({
    mutationFn: (payload: CrearAreaInput) =>
      area ? areasApi.actualizar(area.id, payload) : areasApi.crear(payload),
    onSuccess: onGuardado,
  });

  useEffect(() => {
    if (!open) return;
    setNombre(area?.nombre ?? '');
    setDescripcion(area?.descripcion ?? '');
    setActivo(area?.activo ?? true);
    setErrorNombre(undefined);
    guardar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, area]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorNombre('Ingresá el nombre del área.');
      return;
    }
    guardar.mutate({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() === '' ? null : descripcion.trim(),
      activo,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={area ? 'Editar área' : 'Agregar área'} size="sm">
      <form onSubmit={enviar} className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo guardar el área">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}

        <Input
          label="Nombre *"
          placeholder="Ventas, Soporte, Administración..."
          value={nombre}
          error={errorNombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setErrorNombre(undefined);
          }}
        />
        <Input
          label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <Select
          label="Estado"
          options={[
            { value: 'activa', label: 'Activa' },
            { value: 'inactiva', label: 'Inactiva' },
          ]}
          value={activo ? 'activa' : 'inactiva'}
          onChange={(e) => setActivo(e.target.value === 'activa')}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            {area ? 'Guardar cambios' : 'Crear área'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
