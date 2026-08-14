import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Truck, Users, Phone, Pencil, Trash2, Plus, WifiOff, ClipboardList, Package, Wrench } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Modal } from '@/shared/components/ui/Modal';
import { cuadrillasApi, ordenesApi, clientesApi, vehiculosApi, mensajeDeError } from '@/shared/services/api';
import { areasApi, empleadosApi } from '@/shared/services/personal';
import { stockApi } from '@/shared/services/materiales';
import { useBreadcrumbStore } from '@/shared/stores/breadcrumbStore';
import { etiquetasEstado } from '@/types/atlas';
import type { Cuadrilla, EstadoCuadrilla, EstadoOrden, Orden, Tecnico, Vehiculo, MantenimientoVehiculo } from '@/types/atlas';

import { MaintenanceCard } from '../components/MaintenanceCard';
import { MaintenanceDetailModal } from '../components/MaintenanceDetailModal';
import { MaintenanceTaskModal } from '../components/MaintenanceTaskModal';

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

  const [vehiculoRefreshKey, setVehiculoRefreshKey] = useState(0);
  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['cuadrilla', id] });
    setVehiculoRefreshKey((k) => k + 1);
  };

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
          <VehicleCard key={`vehiculo-${vehiculoRefreshKey}`} crewId={crew.id} vehiculo={crew.vehiculo ?? null} onSaved={invalidar} />
          <VehicleMaintenanceCard crew={crew} />
          <MobileStockCard crewId={crew.id} />
        </div>
      </div>
    </div>
  );
}

/** Una línea "etiqueta: valor" de las tarjetas en modo lectura. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | number | null }) {
  return (
    <p className="text-slate-700 dark:text-slate-300">
      <span className="text-slate-500 dark:text-slate-400">{etiqueta}: </span>
      {valor === null || valor === undefined || valor === '' ? '—' : valor}
    </p>
  );
}

function DatosGeneralesCard({ crew, onSaved }: { crew: Cuadrilla; onSaved: () => void }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nombre: crew.nombre,
    codigo: crew.codigo ?? '',
    especialidad: crew.especialidad ?? '',
    zona: crew.zona ?? '',
    estado: crew.estado,
  });

  const desdeCrew = () => ({
    nombre: crew.nombre,
    codigo: crew.codigo ?? '',
    especialidad: crew.especialidad ?? '',
    zona: crew.zona ?? '',
    estado: crew.estado,
  });

  useEffect(() => {
    setForm(desdeCrew());
    // Los campos se rearman cuando llega la cuadrilla de nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crew]);

  const guardar = useMutation({
    mutationFn: () =>
      cuadrillasApi.actualizar(crew.id, {
        nombre: form.nombre.trim(),
        codigo: form.codigo.trim() || null,
        especialidad: form.especialidad.trim() || null,
        zona: form.zona.trim() || null,
        estado: form.estado,
      }),
    onSuccess: () => {
      onSaved();
      setEditando(false);
    },
  });

  const setCampo = (campo: keyof typeof form, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  // Lo que la cuadrilla puede tomar sale de las áreas de sus técnicos, no de un
  // campo cargado a mano: si cambia la gente, cambia solo.
  const areas = crew.areas ?? [];

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
          <Input label="Nombre" value={form.nombre} onChange={(e) => setCampo('nombre', e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Código" value={form.codigo} onChange={(e) => setCampo('codigo', e.target.value)} />
            <Select
              label="Estado"
              options={Object.entries(etiquetasEstadoCuadrilla).map(([value, label]) => ({ value, label }))}
              value={form.estado}
              onChange={(e) => setCampo('estado', e.target.value)}
            />
            <Input
              label="Especialidad"
              placeholder="Fibra, inalámbrico, obra..."
              value={form.especialidad}
              onChange={(e) => setCampo('especialidad', e.target.value)}
            />
            <Input
              label="Zona"
              placeholder="Centro, norte, ruta 5..."
              value={form.zona}
              onChange={(e) => setCampo('zona', e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setForm(desdeCrew());
                guardar.reset();
                setEditando(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => guardar.mutate()}
              loading={guardar.isPending}
              disabled={form.nombre.trim() === ''}
            >
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 text-sm">
          <Dato etiqueta="Nombre" valor={crew.nombre} />
          <Dato etiqueta="Código" valor={crew.codigo} />
          <Dato etiqueta="Especialidad" valor={crew.especialidad} />
          <Dato etiqueta="Zona" valor={crew.zona} />
          {crew.areas !== undefined && (
            <div className="pt-2">
              <p className="text-slate-500 dark:text-slate-400 mb-1">Trabajos que puede tomar</p>
              {areas.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Sale de las áreas de sus técnicos. Todavía no tiene ninguno del padrón.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {areas.map((area) => (
                    <Badge key={area.id} variant="info">
                      {area.nombre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TechnicianRow({ tecnico, onChanged }: { tecnico: Tecnico; onChanged: () => void }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(tecnico.nombre);
  const [telefono, setTelefono] = useState(tecnico.telefono ?? '');

  // Los técnicos que salen del padrón se editan en Empleados: acá solo se
  // quitan de la cuadrilla. La edición a mano queda para las filas viejas,
  // cargadas antes de que existiera el padrón.
  const delPadron = !!tecnico.empleado_id;

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

  if (editando && !delPadron) {
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
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      {eliminar.isError && (
        <div className="mb-2">
          <Alert variant="error">{mensajeDeError(eliminar.error)}</Alert>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-atlas-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {tecnico.nombre.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tecnico.nombre}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {/* Todas sus áreas, no solo la principal: es lo que dice qué
                  trabajos puede tomar la cuadrilla. */}
              {(tecnico.areas?.length ? tecnico.areas.map((a) => a.nombre) : [tecnico.area]).map(
                (nombre) => nombre && <Badge key={nombre} variant="info">{nombre}</Badge>,
              )}
              {tecnico.puesto && <span>{tecnico.puesto}</span>}
              {tecnico.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {tecnico.telefono}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!delPadron && (
            <button
              onClick={() => setEditando(true)}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
              title="Editar técnico"
            >
              <Pencil className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          )}
          <button
            onClick={() => eliminar.mutate()}
            disabled={eliminar.isPending}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title={delPadron ? 'Quitar de la cuadrilla' : 'Eliminar técnico'}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
      {delPadron && (
        <p className="mt-2 text-[11px] text-slate-400">
          Del padrón — nombre y teléfono se editan en Empleados.
        </p>
      )}
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
  const [areaFiltro, setAreaFiltro] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');
  const limiteAlcanzado = cantidadActual >= MAX_TECNICOS;

  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.listar({ activo: true }),
    enabled: abierto,
  });

  // Solo empleados activos que todavía no son técnicos de ninguna cuadrilla:
  // así no se asigna dos veces a la misma persona.
  const { data: empleadosData, isFetching } = useQuery({
    queryKey: ['empleados', 'sin-cuadrilla', areaFiltro],
    queryFn: () =>
      empleadosApi.listar({
        estado: 'activo',
        sin_cuadrilla: true,
        area_id: areaFiltro || undefined,
        per_page: 200,
      }),
    enabled: abierto,
  });

  const agregar = useMutation({
    mutationFn: () => cuadrillasApi.agregarTecnico(crewId, { empleado_id: empleadoId }),
    onSuccess: () => {
      onAdded();
      setEmpleadoId('');
      setAreaFiltro('');
      setAbierto(false);
    },
  });

  const cerrar = () => {
    setEmpleadoId('');
    setAreaFiltro('');
    agregar.reset();
    setAbierto(false);
  };

  const opciones = (empleadosData?.data ?? []).map((emp) => ({
    value: emp.id,
    label: [emp.nombre, emp.area?.nombre, emp.puesto].filter(Boolean).join(' · '),
  }));

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
    <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 space-y-3">
      {agregar.isError && <Alert variant="error">{mensajeDeError(agregar.error)}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select
          label="Área"
          placeholder="Todas las áreas"
          options={(areasData?.data ?? []).map((area) => ({ value: area.id, label: area.nombre }))}
          value={areaFiltro}
          onChange={(e) => {
            setAreaFiltro(e.target.value);
            setEmpleadoId('');
          }}
        />
        <Select
          label="Empleado"
          placeholder={isFetching ? 'Cargando...' : 'Seleccionar empleado'}
          options={opciones}
          value={empleadoId}
          disabled={isFetching || opciones.length === 0}
          onChange={(e) => setEmpleadoId(e.target.value)}
        />
      </div>

      {!isFetching && opciones.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No hay empleados libres{areaFiltro ? ' en esta área' : ''}: los del padrón ya están en alguna cuadrilla. Se dan
          de alta desde la sección Empleados.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={cerrar}>
          Cancelar
        </Button>
        <Button size="sm" onClick={() => agregar.mutate()} loading={agregar.isPending} disabled={empleadoId === ''}>
          Agregar
        </Button>
      </div>
    </div>
  );
}

/** Marcador del vehículo: verde si está en marcha, rojo si está apagado. */
const iconoVehiculo = (encendido: boolean | null) =>
  L.divIcon({
    className: 'bg-transparent',
    html: `<div style="font-size:20px;line-height:1;white-space:nowrap">${encendido ? '🟢' : '🔴'}🚙</div>`,
    iconSize: [36, 24],
    iconAnchor: [18, 12],
  });

function VehicleCard({
  crewId,
  vehiculo,
  onSaved,
}: {
  crewId: string;
  vehiculo: Vehiculo | null;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [marca, setMarca] = useState(vehiculo?.marca ?? '');
  const [modelo, setModelo] = useState(vehiculo?.modelo ?? '');
  const [patente, setPatente] = useState(vehiculo?.patente ?? '');
  const [anio, setAnio] = useState(vehiculo?.anio ? String(vehiculo.anio) : '');
  const [color, setColor] = useState(vehiculo?.color ?? '');

  // Con el vehículo ya cargado la tarjeta muestra los datos, no el formulario:
  // los campos vacíos daban a entender que faltaba completarlos.
  const hayVehiculo = !!(vehiculo && (vehiculo.patente || vehiculo.marca || vehiculo.modelo));
  const [editando, setEditando] = useState(!hayVehiculo);

  useEffect(() => {
    setMarca(vehiculo?.marca ?? '');
    setModelo(vehiculo?.modelo ?? '');
    setPatente(vehiculo?.patente ?? '');
    setAnio(vehiculo?.anio ? String(vehiculo.anio) : '');
    setColor(vehiculo?.color ?? '');
    setEditando(!(vehiculo && (vehiculo.patente || vehiculo.marca || vehiculo.modelo)));
  }, [vehiculo]);

  // La flota del GPS sirve para dos cosas: elegir la patente y ubicar el
  // vehículo en el mapa. Se refresca sola cada 30 s, igual que el caché del back.
  const { data: flota, isError: flotaFallo } = useQuery({
    queryKey: ['flota-gps'],
    queryFn: () => vehiculosApi.listar(),
    refetchInterval: 30_000,
  });

  const guardar = useMutation({
    mutationFn: () =>
      cuadrillasApi.actualizarVehiculo(crewId, {
        marca,
        modelo,
        patente,
        anio: anio ? Number(anio) : null,
        color,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flota-gps'] });
      onSaved();
      setEditando(false);
    },
  });

  const unidades = flota?.vehiculos ?? [];
  // Se ofrecen las unidades libres y la que ya tiene esta cuadrilla. Las que
  // están en otra no aparecen: una patente pertenece a una sola cuadrilla.
  const disponibles = unidades.filter((u) => !u.cuadrilla || u.cuadrilla.id === crewId);
  const tomadas = unidades.length - disponibles.length;
  const opcionesPatente = disponibles.map((u) => ({ value: u.patente, label: u.patente }));
  // Una patente cargada a mano que el GPS no reporta se conserva en la lista
  // para no borrarla sin querer al guardar.
  if (patente && !opcionesPatente.some((o) => o.value === patente)) {
    opcionesPatente.unshift({ value: patente, label: `${patente} (fuera de la flota)` });
  }

  const enMapa = unidades.find((u) => u.patente === patente) ?? null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-atlas-600" /> Vehículo
        </h3>
        {!editando && (
          <Button variant="ghost" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => setEditando(true)}>
            Editar
          </Button>
        )}
      </div>

      {guardar.isError && (
        <div className="mb-3">
          <Alert variant="error" title="No se pudo guardar el vehículo">
            {mensajeDeError(guardar.error)}
          </Alert>
        </div>
      )}

      {enMapa ? (
        <div className="mb-4">
          <div className="h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
            {/* La key remonta el mapa al cambiar de unidad; dentro de la misma,
                el marcador se mueve solo con cada refresco. */}
            <MapContainer
              key={enMapa.patente}
              center={[enMapa.lat, enMapa.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[enMapa.lat, enMapa.lng]} icon={iconoVehiculo(enMapa.encendido)}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold mb-1">{enMapa.patente}</p>
                    <p>{enMapa.encendido ? '🟢 En marcha' : '🔴 Apagado'}</p>
                    {enMapa.velocidad !== null && <p>Velocidad: {enMapa.velocidad} km/h</p>}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className={enMapa.encendido ? 'text-emerald-600 dark:text-emerald-400' : undefined}>
              {enMapa.encendido ? 'En marcha' : 'Apagado'}
            </span>
            {enMapa.velocidad !== null && <span>{enMapa.velocidad} km/h</span>}
            {enMapa.minutos_desde_reporte !== null && (
              <span>
                Reportó hace {enMapa.minutos_desde_reporte} min
                {flota?.fuente === 'cache_vencida' ? ' (GPS sin responder)' : ''}
              </span>
            )}
          </div>
        </div>
      ) : patente ? (
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {flotaFallo
            ? 'No se pudo consultar el servicio de posiciones.'
            : 'El GPS todavía no reportó posición para esta patente.'}
        </p>
      ) : null}

      {editando ? (
        <div className="space-y-3">
          <Select
            label="Patente (flota GPS)"
            placeholder={unidades.length === 0 ? 'Sin unidades disponibles' : 'Seleccionar unidad'}
            options={opcionesPatente}
            value={patente}
            onChange={(e) => setPatente(e.target.value)}
          />
          {tomadas > 0 && (
            <p className="-mt-1 text-[11px] text-slate-400">
              {tomadas} unidad{tomadas === 1 ? '' : 'es'} no figura{tomadas === 1 ? '' : 'n'}: ya está
              {tomadas === 1 ? '' : 'n'} asignada{tomadas === 1 ? '' : 's'} a otra cuadrilla.
            </p>
          )}
          <Input label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          <Input label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          <Input label="Año" type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
          <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} />
          <div className="flex justify-end gap-2 pt-1">
            {hayVehiculo && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMarca(vehiculo?.marca ?? '');
                  setModelo(vehiculo?.modelo ?? '');
                  setPatente(vehiculo?.patente ?? '');
                  setAnio(vehiculo?.anio ? String(vehiculo.anio) : '');
                  setColor(vehiculo?.color ?? '');
                  guardar.reset();
                  setEditando(false);
                }}
              >
                Cancelar
              </Button>
            )}
            <Button size="sm" onClick={() => guardar.mutate()} loading={guardar.isPending}>
              Guardar vehículo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 text-sm">
          <Dato etiqueta="Patente" valor={patente} />
          <Dato etiqueta="Marca" valor={marca} />
          <Dato etiqueta="Modelo" valor={modelo} />
          <Dato etiqueta="Año" valor={anio} />
          <Dato etiqueta="Color" valor={color} />
        </div>
      )}
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

/**
 * Lo que la cuadrilla tiene arriba del vehículo. Sube con cada remito de
 * entrega y baja con lo que se consume en las órdenes.
 */
function MobileStockCard({ crewId }: { crewId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stock-cuadrilla', crewId],
    queryFn: () => stockApi.deCuadrilla(crewId),
  });

  const stock = data ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Package className="w-4 h-4 text-atlas-600" /> Stock móvil actual
        </h3>
        {stock.length > 0 && <span className="text-xs text-slate-400">{stock.length} ítems</span>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">{mensajeDeError(error)}</p>
      ) : stock.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Package className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin materiales cargados</p>
          <p className="text-xs text-slate-400">
            Se cargan desde Materiales → Remitos, con una entrega a esta cuadrilla.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {stock.map((item) => (
            <div
              key={item.material_id}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"
            >
              <div className="min-w-0">
                <p className="text-sm text-slate-900 dark:text-white truncate">{item.nombre}</p>
                {item.codigo && <p className="text-xs text-slate-400">{item.codigo}</p>}
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex-shrink-0">
                {item.cantidad} <span className="text-xs font-normal text-slate-400">{item.unidad}</span>
              </span>
            </div>
          ))}
        </div>
      )}
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


/** Historial de servicios que los técnicos cargaron al vehículo de la cuadrilla. */
function VehicleMaintenanceCard({ crew }: { crew: Cuadrilla }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mantenimientos-cuadrilla', crew.id],
    queryFn: () => cuadrillasApi.mantenimientos(crew.id),
  });

  const [seleccionado, setSeleccionado] = useState<MantenimientoVehiculo | null>(null);
  const [tareaAbierta, setTareaAbierta] = useState(false);
  const registros = data ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-atlas-600" /> Mantenimiento del vehículo
        </h3>
        {registros.length > 0 && <span className="text-xs text-slate-400">{registros.length} ítems</span>}
      </div>

      <div className="mb-3">
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setTareaAbierta(true)}
        >
          Nueva tarea de mantenimiento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">{mensajeDeError(error)}</p>
      ) : registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin registros de mantenimiento</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {registros.map((registro) => (
            <MaintenanceCard key={registro.id} registro={registro} onOpen={() => setSeleccionado(registro)} />
          ))}
        </div>
      )}

      <MaintenanceDetailModal registro={seleccionado} onClose={() => setSeleccionado(null)} />
      <MaintenanceTaskModal
        crew={crew}
        open={tareaAbierta}
        onClose={() => setTareaAbierta(false)}
        onCreada={() => setTareaAbierta(false)}
      />
    </div>
  );
}
