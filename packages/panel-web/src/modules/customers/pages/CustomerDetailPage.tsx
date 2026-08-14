import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ClipboardList,
  Home,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { clientesApi, mensajeDeError } from '@/shared/services/api';
import { MapaPunto } from '@/shared/components/MapaPunto';
import { ModalCoordenadas } from '@/shared/components/TarjetaUbicacion';
import { formatearCoordenadas, urlGoogleMaps, type Coordenadas } from '@/shared/utils/geo';
import { useAuth } from '@/shared/contexts/AuthContext';
import { ClienteModal } from '@/modules/customers/components/ClienteModal';
import { etiquetasEstado } from '@/types/atlas';
import type { Domicilio, EstadoOrden } from '@/types/atlas';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantEstadoOrden: Record<EstadoOrden, BadgeVariant> = {
  pendiente: 'neutral',
  asignada: 'info',
  aceptada: 'info',
  en_proceso: 'warning',
  completada: 'success',
  cancelada: 'danger',
};

/** Los mismos roles que acepta la API para escribir clientes. */
const ROLES_ABM = ['admin', 'planificador', 'despachador', 'operador'];

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [editando, setEditando] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [aQuitar, setAQuitar] = useState<Domicilio | null>(null);

  const puedeEditar = ROLES_ABM.includes(user?.rol ?? '');

  const {
    data: customer,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesApi.detalle(id!),
    enabled: !!id,
  });

  const { data: ordenes } = useQuery({
    queryKey: ['cliente', id, 'ordenes'],
    queryFn: () => clientesApi.historial(id!),
    enabled: !!id,
  });

  const eliminarCliente = useMutation({
    mutationFn: () => clientesApi.eliminar(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      navigate('/customers');
    },
  });

  const quitarDomicilio = useMutation({
    mutationFn: (domicilioId: string) => clientesApi.eliminarDomicilio(domicilioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
      setAQuitar(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/customers')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex items-center justify-center h-80">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudo cargar el cliente"
            description={isError ? mensajeDeError(error) : 'Cliente no encontrado.'}
          />
        </div>
      </div>
    );
  }

  const domicilios = customer.domicilios ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/customers')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{customer.nombre}</h1>
          </div>
        </div>
        {puedeEditar && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button variant="secondary" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => setEditando(true)}>
              Editar
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setConfirmarBaja(true)}>
              Eliminar
            </Button>
          </div>
        )}
      </div>

      <ClienteModal
        open={editando}
        cliente={customer}
        onClose={() => setEditando(false)}
        onGuardado={() => {
          queryClient.invalidateQueries({ queryKey: ['cliente', id] });
          queryClient.invalidateQueries({ queryKey: ['clientes'] });
          setEditando(false);
        }}
      />

      <Modal
        open={confirmarBaja}
        onClose={() => {
          setConfirmarBaja(false);
          eliminarCliente.reset();
        }}
        title="Eliminar cliente"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Seguro que querés eliminar a <strong>{customer.nombre}</strong>? Se van también sus domicilios.
          </p>
          {eliminarCliente.isError && (
            <Alert variant="error" title="No se pudo eliminar">
              {mensajeDeError(eliminarCliente.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmarBaja(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" loading={eliminarCliente.isPending} onClick={() => eliminarCliente.mutate()}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!aQuitar}
        onClose={() => {
          setAQuitar(null);
          quitarDomicilio.reset();
        }}
        title="Quitar domicilio"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Quitar <strong>{aQuitar?.direccion}</strong> de este cliente?
          </p>
          {quitarDomicilio.isError && (
            <Alert variant="error" title="No se pudo quitar">
              {mensajeDeError(quitarDomicilio.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAQuitar(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={quitarDomicilio.isPending}
              onClick={() => aQuitar && quitarDomicilio.mutate(aQuitar.id)}
            >
              Quitar
            </Button>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TarjetaDomicilios
            clienteId={customer.id}
            domicilios={domicilios}
            puedeEditar={puedeEditar}
            onQuitar={setAQuitar}
            onAgregado={() => queryClient.invalidateQueries({ queryKey: ['cliente', id] })}
          />

          {/* Historial de OTs */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-atlas-600" /> Historial de órdenes de trabajo
            </h3>
            {!ordenes || ordenes.length === 0 ? (
              <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="Sin órdenes de trabajo" description="Este cliente todavía no tiene OTs registradas." />
            ) : (
              <div className="space-y-2">
                {ordenes.map((orden) => (
                  <div
                    key={orden.id}
                    onClick={() => navigate(`/orders/${orden.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{orden.numero} · {orden.tipo}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{orden.titulo ?? 'Sin título'}</p>
                    </div>
                    <Badge variant={variantEstadoOrden[orden.estado]}>{etiquetasEstado[orden.estado]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Contacto</h3>
            <div className="space-y-2 text-sm">
              {customer.telefono && (
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400" /> {customer.telefono}
                </p>
              )}
              {customer.email && (
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-slate-400" /> {customer.email}
                </p>
              )}
              {!customer.telefono && !customer.email && (
                <p className="text-slate-400">Sin datos de contacto</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- domicilios ---

function TarjetaDomicilios({
  clienteId,
  domicilios,
  puedeEditar,
  onQuitar,
  onAgregado,
}: {
  clienteId: string;
  domicilios: Domicilio[];
  puedeEditar: boolean;
  onQuitar: (domicilio: Domicilio) => void;
  onAgregado: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [errorDireccion, setErrorDireccion] = useState<string | undefined>();

  // Cargar las coordenadas después es el caso normal: primero se anota la
  // dirección y recién más tarde alguien saca el punto del mapa.
  const [aUbicar, setAUbicar] = useState<Domicilio | null>(null);
  const ubicar = useMutation({
    mutationFn: ({ domicilioId, coordenadas }: { domicilioId: string; coordenadas: Coordenadas | null }) =>
      clientesApi.actualizarDomicilio(domicilioId, {
        lat: coordenadas?.lat ?? null,
        lng: coordenadas?.lng ?? null,
      }),
    onSuccess: () => {
      onAgregado();
      setAUbicar(null);
    },
  });

  const agregar = useMutation({
    mutationFn: () =>
      clientesApi.agregarDomicilio(clienteId, {
        direccion: direccion.trim(),
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
      }),
    onSuccess: () => {
      setDireccion('');
      setLat('');
      setLng('');
      setAbierto(false);
      onAgregado();
    },
  });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!direccion.trim()) {
      setErrorDireccion('Ingresá la dirección.');
      return;
    }
    if ((lat.trim() && Number.isNaN(Number(lat))) || (lng.trim() && Number.isNaN(Number(lng)))) {
      setErrorDireccion('Las coordenadas tienen que ser números.');
      return;
    }
    setErrorDireccion(undefined);
    agregar.mutate();
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Home className="w-5 h-5 text-atlas-600" /> Domicilios
        </h3>
        {puedeEditar && (
          <Button
            variant="secondary"
            size="sm"
            icon={abierto ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            onClick={() => {
              setAbierto(!abierto);
              agregar.reset();
            }}
          >
            {abierto ? 'Cancelar' : 'Agregar'}
          </Button>
        )}
      </div>

      {abierto && (
        <form onSubmit={enviar} className="mb-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
          {agregar.isError && (
            <Alert variant="error" title="No se pudo agregar">
              {mensajeDeError(agregar.error)}
            </Alert>
          )}
          <Input
            label="Dirección *"
            placeholder="Calle 123, Localidad"
            value={direccion}
            error={errorDireccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitud" placeholder="-37.3217" value={lat} onChange={(e) => setLat(e.target.value)} />
            <Input label="Longitud" placeholder="-59.1332" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Las coordenadas son opcionales, pero sin ellas el domicilio no se ubica en el mapa.
          </p>
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={agregar.isPending}>
              Agregar domicilio
            </Button>
          </div>
        </form>
      )}

      {domicilios.length === 0 ? (
        <EmptyState icon={<Home className="w-8 h-8" />} title="Sin domicilios" description="Este cliente no tiene domicilios cargados." />
      ) : (
        <div className="space-y-3">
          {domicilios.map((addr) => {
            const ubicado = addr.lat !== null && addr.lng !== null;
            return (
              <div
                key={addr.id}
                className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-700/50">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{addr.direccion}</p>
                    {ubicado && (
                      <a
                        href={urlGoogleMaps(addr.lat!, addr.lng!)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-atlas-600 hover:text-atlas-700 dark:text-atlas-400 font-mono"
                      >
                        {formatearCoordenadas(addr.lat!, addr.lng!)}
                      </a>
                    )}
                  </div>
                  {puedeEditar && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<MapPin className="w-3.5 h-3.5" />}
                        onClick={() => setAUbicar(addr)}
                      >
                        {ubicado ? 'Cambiar' : 'Ubicar'}
                      </Button>
                      <button
                        onClick={() => onQuitar(addr)}
                        title="Quitar domicilio"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>

                {ubicado ? (
                  <MapaPunto lat={addr.lat!} lng={addr.lng!} className="h-40" />
                ) : (
                  <p className="px-3 py-4 text-xs text-slate-400 text-center">
                    Sin coordenadas: no se puede ubicar en el mapa ni calcular qué cuadrilla está más cerca.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalCoordenadas
        open={!!aUbicar}
        actuales={aUbicar && aUbicar.lat !== null && aUbicar.lng !== null ? { lat: aUbicar.lat, lng: aUbicar.lng } : null}
        guardando={ubicar.isPending}
        onClose={() => setAUbicar(null)}
        onGuardar={async (coordenadas) => {
          if (aUbicar) await ubicar.mutateAsync({ domicilioId: aUbicar.id, coordenadas });
        }}
      />
    </div>
  );
}
