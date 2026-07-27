import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Truck, Users, Phone, Pencil, Trash2, Plus, WifiOff, ClipboardList, Package } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Modal } from '@/shared/components/ui/Modal';
import { cuadrillasApi, ordenesApi, clientesApi, mensajeDeError } from '@/shared/services/api';
import { useBreadcrumbStore } from '@/shared/stores/breadcrumbStore';
import { etiquetasEstado } from '@/types/atlas';
import type { Cuadrilla, EstadoCuadrilla, EstadoOrden, Orden, Tecnico, Vehiculo } from '@/types/atlas';

const etiquetasEstadoCuadrilla: Record<EstadoCuadrilla, string> = {
  disponible: 'Disponible',
  ocupada: 'Ocupada',
  fuera_de_servicio: 'Fuera de servicio',
};

const variantEstadoCuadrilla: Record<EstadoCuadrilla, 'success' | 'warning' | 'danger'> = {
  disponible: 'success',
  ocupada: 'warning',
  fuera_de_servicio: 'danger',
};

const variantEstadoOrden: Record<EstadoOrden, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  pendiente: 'neutral',
  asignada: 'info',
  aceptada: 'info',
  en_proceso: 'warning',
  completada: 'success',
  cancelada: 'danger',
};

const MAX_TECNICOS = 2;

// Numeración Cuadrilla-NNN derivada en el frontend a partir del orden de creación
// (creado_en) dentro de GET /v1/cuadrillas. NO se persiste ni se manda al backend —
// es solo para el breadcrumb. Cuando el backend agregue el campo codigo real
// (Pedido 4), migrar esto a usar ese valor y borrar este cálculo.
function useCrewBreadcrumb(id: string | undefined, crew: Cuadrilla | undefined) {
  const setLabel = useBreadcrumbStore((state) => state.setLabel);
  const clearLabel = useBreadcrumbStore((state) => state.clearLabel);

  const { data: todasLasCuadrillas } = useQuery({
    queryKey: ['cuadrillas', 'para-breadcrumb'],
    queryFn: () => cuadrillasApi.listar(),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id || !crew || !todasLasCuadrillas) return;

    const ordenadas = [...todasLasCuadrillas.data].sort(
      (a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime(),
    );
    const indice = ordenadas.findIndex((c) => c.id === id);
    const codigoDerivado = indice >= 0 ? `Cuadrilla-${String(indice + 1).padStart(3, '0')}` : crew.nombre;

    const path = `/crews/${id}`;
    setLabel(path, codigoDerivado);
    return () => clearLabel(path);
  }, [id, crew, todasLasCuadrillas, setLabel, clearLabel]);
}

export default function CrewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: crew,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['cuadrilla', id],
    queryFn: () => cuadrillasApi.detalle(id!),
    enabled: !!id,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['cuadrilla', id] });

  useCrewBreadcrumb(id, crew);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError || !crew) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/crews')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex items-center justify-center h-80">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudo cargar la cuadrilla"
            description={isError ? mensajeDeError(error) : 'Cuadrilla no encontrada.'}
          />
        </div>
      </div>
    );
  }

  const tecnicos = crew.tecnicos ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate('/crews')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{crew.nombre}</h1>
        </div>
        <Badge variant={variantEstadoCuadrilla[crew.estado]} className="sm:ml-auto">
          {etiquetasEstadoCuadrilla[crew.estado]}
        </Badge>
        <DeleteCrewButton crewId={crew.id} crewName={crew.nombre} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DatosGeneralesCard crew={crew} onSaved={invalidar} />

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-atlas-600" /> Técnicos asignados
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{tecnicos.length}/{MAX_TECNICOS}</span>
            </div>

            {tecnicos.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Esta cuadrilla todavía no tiene técnicos asignados.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {tecnicos.map((tecnico) => (
                  <TechnicianRow key={tecnico.id} tecnico={tecnico} onChanged={invalidar} />
                ))}
              </div>
            )}

            <AddTechnicianForm crewId={crew.id} cantidadActual={tecnicos.length} onAdded={invalidar} />
          </div>

          <CrewOrdersHistoryCard crewId={crew.id} />
        </div>

        <div className="space-y-6">
          <VehicleCard crewId={crew.id} vehiculo={crew.vehiculo ?? null} onSaved={invalidar} />
          <MobileStockCard />
        </div>
      </div>
    </div>
  );
}

function DatosGeneralesCard({ crew, onSaved }: { crew: Cuadrilla; onSaved: () => void }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(crew.nombre);

  useEffect(() => {
    setNombre(crew.nombre);
  }, [crew.nombre]);

  const guardar = useMutation({
    mutationFn: () => cuadrillasApi.actualizar(crew.id, { nombre }),
    onSuccess: () => {
      onSaved();
      setEditando(false);
    },
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Datos generales</h3>
        {!editando && (
          <Button variant="ghost" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => setEditando(true)}>
            Editar
          </Button>
        )}
      </div>

      {guardar.isError && (
        <div className="mb-3">
          <Alert variant="error" title="No se pudieron guardar los cambios">
            {mensajeDeError(guardar.error)}
          </Alert>
        </div>
      )}

      {editando ? (
        <div className="space-y-3">
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <div title="Disponible cuando el backend lo soporte">
            <Input label="Código" value={crew.codigo ?? ''} disabled />
          </div>
          <div title="Disponible cuando el backend lo soporte">
            <Input label="Especialidad" value={crew.especialidad ?? ''} disabled />
          </div>
          <div title="Disponible cuando el backend lo soporte">
            <Input label="Zona" value={crew.zona ?? ''} disabled />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNombre(crew.nombre);
                guardar.reset();
                setEditando(false);
              }}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={() => guardar.mutate()} loading={guardar.isPending} disabled={nombre.trim() === ''}>
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 text-sm">
          <p className="text-slate-700 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">Nombre: </span>
            {crew.nombre}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">Código: </span>
            {crew.codigo || '—'}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">Especialidad: </span>
            {crew.especialidad || '—'}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">Zona: </span>
            {crew.zona || '—'}
          </p>
        </div>
      )}
    </div>
  );
}

function TechnicianRow({ tecnico, onChanged }: { tecnico: Tecnico; onChanged: () => void }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(tecnico.nombre);
  const [telefono, setTelefono] = useState(tecnico.telefono ?? '');

  const guardar = useMutation({
    mutationFn: () => cuadrillasApi.actualizarTecnico(tecnico.id, { nombre, telefono }),
    onSuccess: () => {
      onChanged();
      setEditando(false);
    },
  });

  const eliminar = useMutation({
    mutationFn: () => cuadrillasApi.eliminarTecnico(tecnico.id),
    onSuccess: onChanged,
  });

  if (editando) {
    return (
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 space-y-2">
        {guardar.isError && <Alert variant="error">{mensajeDeError(guardar.error)}</Alert>}
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNombre(tecnico.nombre);
              setTelefono(tecnico.telefono ?? '');
              guardar.reset();
              setEditando(false);
            }}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={() => guardar.mutate()} loading={guardar.isPending}>
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-atlas-600 flex items-center justify-center text-white text-sm font-medium">
          {tecnico.nombre.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{tecnico.nombre}</p>
          {tecnico.telefono && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Phone className="w-3 h-3" /> {tecnico.telefono}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setEditando(true)}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
          title="Editar técnico"
        >
          <Pencil className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
        <button
          onClick={() => eliminar.mutate()}
          disabled={eliminar.isPending}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Eliminar técnico"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}

function AddTechnicianForm({
  crewId,
  cantidadActual,
  onAdded,
}: {
  crewId: string;
  cantidadActual: number;
  onAdded: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const limiteAlcanzado = cantidadActual >= MAX_TECNICOS;

  const agregar = useMutation({
    mutationFn: () => cuadrillasApi.agregarTecnico(crewId, { nombre, telefono: telefono || undefined }),
    onSuccess: () => {
      onAdded();
      setNombre('');
      setTelefono('');
      setAbierto(false);
    },
  });

  if (!abierto) {
    return (
      <div title={limiteAlcanzado ? `Una cuadrilla admite hasta ${MAX_TECNICOS} técnicos` : undefined}>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          disabled={limiteAlcanzado}
          onClick={() => setAbierto(true)}
        >
          Agregar técnico
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 space-y-2">
      {agregar.isError && <Alert variant="error">{mensajeDeError(agregar.error)}</Alert>}
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setNombre('');
            setTelefono('');
            agregar.reset();
            setAbierto(false);
          }}
        >
          Cancelar
        </Button>
        <Button size="sm" onClick={() => agregar.mutate()} loading={agregar.isPending} disabled={nombre.trim() === ''}>
          Agregar
        </Button>
      </div>
    </div>
  );
}

function VehicleCard({
  crewId,
  vehiculo,
  onSaved,
}: {
  crewId: string;
  vehiculo: Vehiculo | null;
  onSaved: () => void;
}) {
  const [marca, setMarca] = useState(vehiculo?.marca ?? '');
  const [modelo, setModelo] = useState(vehiculo?.modelo ?? '');
  const [patente, setPatente] = useState(vehiculo?.patente ?? '');
  const [anio, setAnio] = useState(vehiculo?.anio ? String(vehiculo.anio) : '');
  const [color, setColor] = useState(vehiculo?.color ?? '');

  useEffect(() => {
    setMarca(vehiculo?.marca ?? '');
    setModelo(vehiculo?.modelo ?? '');
    setPatente(vehiculo?.patente ?? '');
    setAnio(vehiculo?.anio ? String(vehiculo.anio) : '');
    setColor(vehiculo?.color ?? '');
  }, [vehiculo]);

  const guardar = useMutation({
    mutationFn: () =>
      cuadrillasApi.actualizarVehiculo(crewId, {
        marca,
        modelo,
        patente,
        anio: anio ? Number(anio) : null,
        color,
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
        <Truck className="w-4 h-4 text-atlas-600" /> Vehículo
      </h3>

      {guardar.isError && (
        <div className="mb-3">
          <Alert variant="error" title="No se pudo guardar el vehículo">
            {mensajeDeError(guardar.error)}
          </Alert>
        </div>
      )}

      <div className="space-y-3">
        <Input label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
        <Input label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
        <Input label="Patente" value={patente} onChange={(e) => setPatente(e.target.value)} />
        <Input label="Año" type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
        <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={() => guardar.mutate()} loading={guardar.isPending}>
            Guardar vehículo
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteCrewButton({ crewId, crewName }: { crewId: string; crewName: string }) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const eliminar = useMutation({
    mutationFn: () => cuadrillasApi.eliminar(crewId),
    onSuccess: () => navigate('/crews'),
  });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Trash2 className="w-4 h-4 text-red-500" />}
        onClick={() => setAbierto(true)}
      >
        Eliminar cuadrilla
      </Button>

      <Modal open={abierto} onClose={() => { setAbierto(false); eliminar.reset(); }} title="Eliminar cuadrilla" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Estás seguro de que querés eliminar <strong>{crewName}</strong>? Esta acción no se puede deshacer.
          </p>

          {eliminar.isError && (
            <Alert variant="error" title="No se pudo eliminar la cuadrilla">
              {mensajeDeError(eliminar.error)}
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setAbierto(false); eliminar.reset(); }}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => eliminar.mutate()}
              loading={eliminar.isPending}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function MobileStockCard() {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
        <Package className="w-4 h-4 text-atlas-600" /> Stock móvil actual
      </h3>
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <Package className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Conectando con el catálogo — disponible en breve
        </p>
      </div>
    </div>
  );
}

function CrewOrdersHistoryCard({ crewId }: { crewId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ordenes', 'por-cuadrilla', crewId],
    queryFn: () => ordenesApi.listar({ cuadrilla_id: crewId }),
  });

  const ordenes = data?.data ?? [];

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-atlas-600" /> Órdenes de esta cuadrilla
      </h3>

      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <Alert variant="error" title="No se pudieron cargar las órdenes">
          {mensajeDeError(error)}
        </Alert>
      ) : ordenes.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Esta cuadrilla todavía no tiene órdenes de trabajo asociadas.
        </p>
      ) : (
        <div className="space-y-2">
          {ordenes.map((orden) => (
            <OrderHistoryRow key={orden.id} orden={orden} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderHistoryRow({ orden }: { orden: Orden }) {
  const { data: cliente } = useQuery({
    queryKey: ['cliente', orden.cliente_id],
    queryFn: () => clientesApi.detalle(orden.cliente_id),
  });

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {orden.numero} · {orden.tipo}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {cliente?.nombre ?? 'Cargando cliente…'}
        </p>
      </div>
      <Badge variant={variantEstadoOrden[orden.estado]}>{etiquetasEstado[orden.estado]}</Badge>
    </div>
  );
}
