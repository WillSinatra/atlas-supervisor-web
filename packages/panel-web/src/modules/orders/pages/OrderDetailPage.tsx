import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Camera,
  PenTool,
  ClipboardCheck,
  Navigation,
  Pencil,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { getOrderById, assignOrderToCrew, updateOrder, type OrderEditableFields } from '@/shared/services/ordersService';
import { getCrews } from '@/shared/services/crewsService';
import { getOrderTypeFields } from '@/shared/services/mocks/orderTypeFields.mock';
import { typeLabels } from '@/shared/services/mocks/orders.mock';
import { statusLabels, statusBadgeVariant, priorityLabels, priorityBadgeVariant } from '@/shared/constants/orderStatus';
import { crewStatusLabels, crewStatusBadgeVariant } from '@/shared/constants/crewStatus';
import { haversineDistanceKm } from '@/shared/utils/geo';
import { formatSlaRemaining, getSlaState } from '@/shared/utils/sla';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrderById(id!),
    enabled: !!id,
  });

  const { data: crewsData } = useQuery({
    queryKey: ['crews', 'assignment-candidates'],
    queryFn: () => getCrews({ limit: 100 }),
  });

  const assignMutation = useMutation({
    mutationFn: (crewId: string) => {
      const crew = crewsData?.data.find((c) => c.id === crewId);
      return assignOrderToCrew(id!, crewId, crew?.name ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<OrderEditableFields | null>(null);

  const editMutation = useMutation({
    mutationFn: (patch: OrderEditableFields) => updateOrder(id!, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setEditOpen(false);
    },
  });

  const openEdit = () => {
    if (!order) return;
    setEditForm({ title: order.title, priority: order.priority, description: order.description, notes: order.notes });
    setEditOpen(true);
  };

  const candidateCrews = useMemo(() => {
    if (!order || !crewsData) return [];
    const orderLat = order.latitude;
    const orderLng = order.longitude;
    return [...crewsData.data]
      .map((crew) => ({
        crew,
        distanceKm:
          orderLat != null && orderLng != null && crew.latitude != null && crew.longitude != null
            ? haversineDistanceKm(orderLat, orderLng, crew.latitude, crew.longitude)
            : null,
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [order, crewsData]);

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  const hasEvidence = order.checklistItems.length > 0 || order.photos.length > 0 || !!order.signature;
  const slaState = getSlaState(order);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{order.orderNumber}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{order.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Datos generales */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Datos generales</h3>
              <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={openEdit}>
                Editar
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Tipo" value={typeLabels[order.type]} />
              <Field label="Estado" value={<Badge variant={statusBadgeVariant[order.status]}>{statusLabels[order.status]}</Badge>} />
              <Field label="Prioridad" value={<Badge variant={priorityBadgeVariant[order.priority]}>{priorityLabels[order.priority]}</Badge>} />
              <Field label="Cliente" value={`${order.customer?.firstName} ${order.customer?.lastName}`} />
              <Field
                label="Domicilio"
                value={order.address ? `${order.address.street} ${order.address.number ?? ''}, ${order.address.city}` : '—'}
              />
              <Field
                label="SLA restante"
                value={
                  <span className={slaState === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' : slaState === 'dueSoon' ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                    {formatSlaRemaining(order)}
                  </span>
                }
              />
            </div>
            {order.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Notas</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Campos específicos del tipo */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Datos de {typeLabels[order.type].toLowerCase()}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getOrderTypeFields(order).map((f) => (
                <Field key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          </div>

          {/* Línea de tiempo */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Línea de tiempo</h3>
            <ol className="space-y-4">
              {order.timeline.map((entry, idx) => (
                <li key={entry.id} className="relative pl-6">
                  {idx < order.timeline.length - 1 && (
                    <span className="absolute left-[5px] top-4 bottom-[-16px] w-px bg-slate-200 dark:bg-slate-700" />
                  )}
                  <span className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-atlas-600" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{entry.title}</p>
                  {entry.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.description}</p>}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.createdAt).toLocaleString('es-AR')}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Evidencia */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Evidencia</h3>
            {!hasEvidence ? (
              <EmptyState
                icon={<Camera className="w-8 h-8" />}
                title="Sin evidencia cargada"
                description="El técnico todavía no subió fotos, firma ni checklist desde la app móvil."
              />
            ) : (
              <div className="space-y-5">
                {order.checklistItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5" /> Checklist
                    </p>
                    <ul className="space-y-1.5">
                      {order.checklistItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                          )}
                          <span className={item.completed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {order.photos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Fotos
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {order.photos.map((photo) => (
                        <div key={photo.id} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                          <img src={photo.thumbnail ?? photo.url} alt={photo.label ?? 'Evidencia'} className="w-full h-24 object-cover" />
                          {photo.label && <p className="text-xs text-slate-500 px-2 py-1 truncate">{photo.label}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {order.signature && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5" /> Firma del cliente
                    </p>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 inline-block bg-white">
                      <img src={order.signature.url} alt="Firma" className="h-16" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{order.signature.name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel de asignación */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Asignación</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {order.crew ? `Asignada a ${order.crew.name}` : 'Sin cuadrilla asignada'}
            </p>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Cuadrillas candidatas por cercanía
            </p>
            <div className="space-y-2">
              {candidateCrews.map(({ crew, distanceKm }) => (
                <div
                  key={crew.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{crew.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={crewStatusBadgeVariant[crew.status]}>{crewStatusLabels[crew.status]}</Badge>
                      {distanceKm != null && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> {distanceKm.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={crew.id === order.crewId || crew.status !== 'disponible' || assignMutation.isPending}
                    loading={assignMutation.isPending && assignMutation.variables === crew.id}
                    onClick={() => assignMutation.mutate(crew.id)}
                  >
                    {crew.id === order.crewId ? 'Asignada' : 'Asignar'}
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Propuesta con cascada
              </p>
              <Button variant="outline" size="sm" disabled className="w-full">
                Próximamente
              </Button>
              <p className="text-xs text-slate-400 mt-2">
                Envía la OT a varias cuadrillas en simultáneo y asigna a la primera que acepte.
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-atlas-600" /> Ubicación
            </h3>
            <div className="h-32 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center">
              <p className="text-xs text-slate-400">Mapa próximamente</p>
            </div>
          </div>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar orden de trabajo" size="md">
        {editForm && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate(editForm);
            }}
          >
            <Input
              label="Título"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
            <Select
              label="Prioridad"
              value={editForm.priority}
              options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as OrderEditableFields['priority'] })}
            />
            <Input
              label="Descripción"
              value={editForm.description ?? ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <Input
              label="Notas"
              value={editForm.notes ?? ''}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={editMutation.isPending}>
                Guardar cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  );
}
