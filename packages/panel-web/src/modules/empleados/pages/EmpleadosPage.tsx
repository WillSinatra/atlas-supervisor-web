import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, LayoutGrid, Pencil, Plus, Search, Trash2, Users, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { Tabs } from '@/shared/components/ui/Tabs';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { areasApi, empleadosApi } from '@/shared/services/personal';
import { usandoRespaldoLocal } from '@/shared/services/respaldoLocal';
import { FEATURES } from '@/shared/constants/features';
import { EmpleadoModal } from '@/modules/empleados/components/EmpleadoModal';
import { PanelAreas } from '@/modules/areas/components/PanelAreas';
import {
  etiquetasEstadoEmpleado,
  etiquetasRolAcceso,
  type Empleado,
  type EstadoEmpleado,
} from '@/types/atlas';

const variantEstadoEmpleado: Record<EstadoEmpleado, 'success' | 'neutral'> = {
  activo: 'success',
  inactivo: 'neutral',
};

const pestanas = [
  { id: 'empleados', label: 'Empleados', icon: <Users className="w-4 h-4" /> },
  { id: 'areas', label: 'Áreas', icon: <LayoutGrid className="w-4 h-4" /> },
];

/** Fecha sin hora (YYYY-MM-DD) sin que el huso horario la corra un día. */
function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—';
  const soloFecha = fecha.slice(0, 10);
  const [anio, mes, dia] = soloFecha.split('-').map(Number);
  if (!anio || !mes || !dia) return '—';
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR');
}

/** A qué sistema entra el empleado, o si todavía no tiene cuenta. */
function CeldaAcceso({ empleado }: { empleado: Empleado }) {
  const acceso = empleado.acceso;
  if (!acceso) {
    return <span className="text-xs text-slate-400">Sin acceso</span>;
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        {acceso.panel && <Badge variant="info">Panel</Badge>}
        {acceso.app && <Badge variant="success">App</Badge>}
      </div>
      <span className="text-xs text-slate-400">
        {etiquetasRolAcceso[acceso.rol]}
        {!acceso.activo && ' · suspendida'}
      </span>
    </div>
  );
}

export default function EmpleadosPage() {
  const queryClient = useQueryClient();
  const [pestana, setPestana] = useState('empleados');
  const [busqueda, setBusqueda] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoEmpleado | ''>('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Empleado | null>(null);
  const [aEliminar, setAEliminar] = useState<Empleado | null>(null);

  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.listar(),
  });
  const areas = areasData?.data ?? [];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['empleados', areaFiltro, estadoFiltro],
    queryFn: () =>
      empleadosApi.listar({
        area_id: areaFiltro || undefined,
        estado: estadoFiltro || undefined,
        // El máximo que acepta la API. Si algún día el padrón lo supera, acá
        // hay que agregar paginado en la tabla.
        per_page: 200,
      }),
  });

  // La búsqueda se resuelve en el cliente para no pegarle a la API en cada tecla,
  // igual que en Cuadrillas.
  const empleados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (data?.data ?? [])
      .filter(
        (emp) =>
          !q ||
          [emp.nombre, emp.legajo, emp.documento, emp.puesto, emp.email, emp.telefono].some((campo) =>
            (campo ?? '').toLowerCase().includes(q),
          ),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [data, busqueda]);

  // La API contesta con el campo `acceso` recién cuando corrió la migración del
  // Pedido 9. Si falta en algún empleado, esta API todavía no sabe de accesos y
  // la columna y la sección del modal se esconden. (Con el padrón vacío se
  // asume que sí: el error del alta, si lo hubiera, se muestra igual.)
  const accesoDisponible =
    FEATURES.accesoEmpleados && (data?.data ?? []).every((emp) => emp.acceso !== undefined);

  const nombreDeArea = (empleado: Empleado) =>
    empleado.area?.nombre ?? areas.find((area) => area.id === empleado.area_id)?.nombre ?? '—';

  // Mismo criterio que con los accesos: si la API todavía no devuelve la lista
  // de áreas, no se ofrece elegirlas porque no habría dónde guardarlas.
  const multiareaDisponible = (data?.data ?? []).every((emp) => emp.areas !== undefined);

  /** Las áreas secundarias, para no repetir la principal en la tabla. */
  const otrasAreas = (empleado: Empleado) =>
    (empleado.areas ?? []).filter((area) => area.id !== empleado.area_id);

  const eliminar = useMutation({
    mutationFn: (id: string) => empleadosApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      setAEliminar(null);
    },
  });

  const abrirAlta = () => {
    setEnEdicion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (empleado: Empleado) => {
    setEnEdicion(empleado);
    setModalAbierto(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Empleados</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Padrón de personal y áreas de trabajo. El área define a quién se le puede asignar un ticket o una orden.
          </p>
        </div>
        {pestana === 'empleados' && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={abrirAlta} className="self-start sm:self-auto">
            Agregar empleado
          </Button>
        )}
      </div>

      {usandoRespaldoLocal() && (
        <Alert variant="warning" title="Datos guardados en este navegador">
          No se pudo llegar a <code>/v1/empleados</code> y <code>/v1/areas</code> — puede faltar desplegar el backend o
          correr su migración. Mientras tanto lo que cargues se guarda solo en esta computadora y no lo ve el resto del
          equipo.
        </Alert>
      )}

      <EmpleadoModal
        open={modalAbierto}
        empleado={enEdicion}
        areas={areas}
        accesoDisponible={accesoDisponible}
        multiareaDisponible={multiareaDisponible}
        onClose={() => setModalAbierto(false)}
        onGuardado={() => {
          queryClient.invalidateQueries({ queryKey: ['empleados'] });
          setModalAbierto(false);
        }}
      />

      <Modal
        open={!!aEliminar}
        onClose={() => {
          setAEliminar(null);
          eliminar.reset();
        }}
        title="Eliminar empleado"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Seguro que querés eliminar a <strong>{aEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
          </p>

          {aEliminar?.acceso && (
            <Alert variant="warning" title="También pierde el acceso">
              Junto con la persona se elimina su cuenta <strong>{aEliminar.acceso.email}</strong>: deja de poder
              iniciar sesión.
            </Alert>
          )}

          {eliminar.isError && (
            <Alert variant="error" title="No se pudo eliminar">
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

      <Tabs tabs={pestanas} activeTab={pestana} onTabChange={setPestana}>
        {(tabId) =>
          tabId === 'areas' ? (
            <PanelAreas />
          ) : (
            <div className="space-y-4">
              <div className="card p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Buscar por nombre, legajo, puesto..."
                    leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <Select
                    placeholder="Todas las áreas"
                    options={areas.map((area) => ({ value: area.id, label: area.nombre }))}
                    value={areaFiltro}
                    onChange={(e) => setAreaFiltro(e.target.value)}
                  />
                  <Select
                    placeholder="Todos los estados"
                    options={Object.entries(etiquetasEstadoEmpleado).map(([value, label]) => ({ value, label }))}
                    value={estadoFiltro}
                    onChange={(e) => setEstadoFiltro((e.target.value || '') as EstadoEmpleado | '')}
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
                </div>
              ) : isError ? (
                <div className="card">
                  <EmptyState
                    icon={<WifiOff className="w-8 h-8" />}
                    title="No se pudieron cargar los empleados"
                    description={mensajeDeError(error)}
                    action={
                      <Button variant="secondary" onClick={() => refetch()}>
                        Reintentar
                      </Button>
                    }
                  />
                </div>
              ) : empleados.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={<Briefcase className="w-8 h-8" />}
                    title="Sin empleados"
                    description={
                      areas.length === 0
                        ? 'Primero creá un área en la pestaña Áreas, después cargá el personal.'
                        : 'No hay empleados que coincidan con los filtros aplicados.'
                    }
                    action={
                      areas.length > 0 ? (
                        <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={abrirAlta}>
                          Agregar empleado
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          <th className="px-4 py-3">Empleado</th>
                          <th className="px-4 py-3">Área</th>
                          <th className="px-4 py-3">Puesto</th>
                          <th className="px-4 py-3">Contacto</th>
                          <th className="px-4 py-3">Ingreso</th>
                          <th className="px-4 py-3">Estado</th>
                          {accesoDisponible && <th className="px-4 py-3">Acceso</th>}
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empleados.map((empleado) => (
                          <tr
                            key={empleado.id}
                            className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900 dark:text-white">{empleado.nombre}</p>
                              {empleado.legajo && (
                                <p className="text-xs text-slate-400">Legajo {empleado.legajo}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="info">{nombreDeArea(empleado)}</Badge>
                                {/* Las secundarias en gris: dicen qué más puede hacer
                                    sin confundirse con el sector al que pertenece. */}
                                {otrasAreas(empleado).map((area) => (
                                  <Badge key={area.id} variant="neutral">
                                    {area.nombre}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{empleado.puesto || '—'}</td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {empleado.telefono && <p>{empleado.telefono}</p>}
                              {empleado.email && <p className="text-xs">{empleado.email}</p>}
                              {!empleado.telefono && !empleado.email && '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {formatearFecha(empleado.fecha_ingreso)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={variantEstadoEmpleado[empleado.estado]}>
                                {etiquetasEstadoEmpleado[empleado.estado]}
                              </Badge>
                            </td>
                            {accesoDisponible && (
                              <td className="px-4 py-3">
                                <CeldaAcceso empleado={empleado} />
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => abrirEdicion(empleado)}
                                  title="Editar"
                                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  <Pencil className="w-4 h-4 text-slate-500" />
                                </button>
                                <button
                                  onClick={() => setAEliminar(empleado)}
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
                  <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                    {data?.pagination && data.pagination.total > empleados.length
                      ? `${empleados.length} de ${data.pagination.total} empleados`
                      : `${empleados.length} empleado${empleados.length === 1 ? '' : 's'}`}
                  </div>
                </div>
              )}
            </div>
          )
        }
      </Tabs>
    </div>
  );
}
