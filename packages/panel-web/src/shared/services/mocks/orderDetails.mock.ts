import type {
  AuditLog,
  ChecklistItem,
  Photo,
  Signature,
  StatusHistory,
  TimelineEntry,
  WorkOrder,
  WorkOrderDetail,
  WorkOrderMaterial,
} from '@/types';

interface OrderDetailExtras {
  checklistItems: ChecklistItem[];
  materials: WorkOrderMaterial[];
  photos: Photo[];
  signature?: Signature;
  statusHistory: StatusHistory[];
  timeline: TimelineEntry[];
  auditLogs: AuditLog[];
}

// Detalle curado para algunas OT representativas: una completada con evidencia
// completa, y una en curso con evidencia parcial. El resto de las órdenes usa
// un detalle "vacío" por defecto (igual al que devolvería la app del técnico
// antes de subir evidencia), para poder probar el estado vacío en la UI.
const curatedDetails: Record<string, OrderDetailExtras> = {
  'ot-001': {
    checklistItems: [
      { id: 'chk-001', label: 'Verificar señal óptica en ONU', required: true, completed: true, completedAt: '2026-07-15T11:10:00.000Z', completedBy: 'Diego Molina', sortOrder: 1 },
      { id: 'chk-002', label: 'Configurar router WiFi', required: true, completed: true, completedAt: '2026-07-15T11:25:00.000Z', completedBy: 'Diego Molina', sortOrder: 2 },
      { id: 'chk-003', label: 'Prueba de velocidad con el cliente', required: true, completed: true, completedAt: '2026-07-15T11:40:00.000Z', completedBy: 'Diego Molina', sortOrder: 3 },
      { id: 'chk-004', label: 'Explicar uso del equipo al cliente', required: false, completed: true, completedAt: '2026-07-15T11:45:00.000Z', completedBy: 'Diego Molina', sortOrder: 4 },
    ],
    materials: [
      { id: 'wom-001', materialId: 'mat-001', material: { id: 'mat-001', code: 'ONU-HW', name: 'ONU Huawei HG8245', category: 'Equipos', unit: 'unidad', unitPrice: 45000 }, quantity: 1, unitPrice: 45000 },
      { id: 'wom-002', materialId: 'mat-002', material: { id: 'mat-002', code: 'CBL-UTP', name: 'Cable UTP Cat6 (rollo)', category: 'Cableado', unit: 'rollo', unitPrice: 18000 }, quantity: 1, unitPrice: 18000 },
    ],
    photos: [
      { id: 'photo-001', url: 'https://placehold.co/480x360?text=ONU+instalada', thumbnail: 'https://placehold.co/160x120?text=ONU', type: 'installation', label: 'ONU instalada', createdAt: '2026-07-15T11:30:00.000Z' },
      { id: 'photo-002', url: 'https://placehold.co/480x360?text=Prueba+de+velocidad', thumbnail: 'https://placehold.co/160x120?text=Speedtest', type: 'evidence', label: 'Prueba de velocidad', createdAt: '2026-07-15T11:42:00.000Z' },
    ],
    signature: { id: 'sig-001', url: 'https://placehold.co/300x120?text=Firma', name: 'Roberto Fernández', document: 'DNI', documentNumber: '28456123' },
    statusHistory: [
      { id: 'sh-001', toStatus: 'PENDING', changedBy: 'Supervisor', createdAt: '2026-07-14T09:00:00.000Z' },
      { id: 'sh-002', fromStatus: 'PENDING', toStatus: 'ASSIGNED', changedBy: 'Supervisor', createdAt: '2026-07-14T09:30:00.000Z' },
      { id: 'sh-003', fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', changedBy: 'Diego Molina', createdAt: '2026-07-15T10:50:00.000Z' },
      { id: 'sh-004', fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED', changedBy: 'Diego Molina', createdAt: '2026-07-15T11:45:00.000Z' },
    ],
    timeline: [
      { id: 'tl-001', type: 'system', title: 'Orden creada', userId: 'user-supervisor', createdAt: '2026-07-14T09:00:00.000Z' },
      { id: 'tl-002', type: 'system', title: 'Asignada a Cuadrilla Norte', userId: 'user-supervisor', createdAt: '2026-07-14T09:30:00.000Z' },
      { id: 'tl-003', type: 'system', title: 'Técnico inició el trabajo', userId: 'tech-001', createdAt: '2026-07-15T10:50:00.000Z' },
      { id: 'tl-004', type: 'system', title: 'Orden completada', description: 'Instalación finalizada sin observaciones', userId: 'tech-001', createdAt: '2026-07-15T11:45:00.000Z' },
    ],
    auditLogs: [
      { id: 'al-001', action: 'CREATE', entity: 'work_order', entityId: 'ot-001', createdAt: '2026-07-14T09:00:00.000Z' },
      { id: 'al-002', action: 'STATUS_CHANGE', entity: 'work_order', entityId: 'ot-001', metadata: { from: 'IN_PROGRESS', to: 'COMPLETED' }, createdAt: '2026-07-15T11:45:00.000Z' },
    ],
  },
  'ot-007': {
    checklistItems: [
      { id: 'chk-005', label: 'Diagnosticar causa de la falla', required: true, completed: true, completedAt: undefined, completedBy: 'Diego Molina', sortOrder: 1 },
      { id: 'chk-006', label: 'Reemplazar componente defectuoso', required: true, completed: false, sortOrder: 2 },
      { id: 'chk-007', label: 'Confirmar restablecimiento del servicio', required: true, completed: false, sortOrder: 3 },
    ],
    materials: [],
    photos: [
      { id: 'photo-003', url: 'https://placehold.co/480x360?text=Falla+detectada', thumbnail: 'https://placehold.co/160x120?text=Falla', type: 'evidence', label: 'Falla detectada en el nodo', createdAt: '2026-07-17T10:20:00.000Z' },
    ],
    statusHistory: [
      { id: 'sh-005', toStatus: 'PENDING', changedBy: 'Supervisor', createdAt: '2026-07-17T09:00:00.000Z' },
      { id: 'sh-006', fromStatus: 'PENDING', toStatus: 'ASSIGNED', changedBy: 'Supervisor', createdAt: '2026-07-17T09:15:00.000Z' },
      { id: 'sh-007', fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', changedBy: 'Diego Molina', createdAt: '2026-07-17T10:10:00.000Z' },
    ],
    timeline: [
      { id: 'tl-005', type: 'system', title: 'Orden creada como crítica', userId: 'user-supervisor', createdAt: '2026-07-17T09:00:00.000Z' },
      { id: 'tl-006', type: 'system', title: 'Asignada a Cuadrilla Norte', userId: 'user-supervisor', createdAt: '2026-07-17T09:15:00.000Z' },
      { id: 'tl-007', type: 'system', title: 'Técnico llegó al sitio y comenzó el diagnóstico', userId: 'tech-001', createdAt: '2026-07-17T10:10:00.000Z' },
    ],
    auditLogs: [
      { id: 'al-003', action: 'CREATE', entity: 'work_order', entityId: 'ot-007', createdAt: '2026-07-17T09:00:00.000Z' },
    ],
  },
};

function buildDefaultDetail(order: WorkOrder): OrderDetailExtras {
  return {
    checklistItems: [],
    materials: [],
    photos: [],
    signature: undefined,
    statusHistory: [
      { id: `sh-default-${order.id}`, toStatus: order.status, changedBy: 'Supervisor', createdAt: order.createdAt },
    ],
    timeline: [
      { id: `tl-default-${order.id}`, type: 'system', title: 'Orden creada', userId: 'user-supervisor', createdAt: order.createdAt },
    ],
    auditLogs: [
      { id: `al-default-${order.id}`, action: 'CREATE', entity: 'work_order', entityId: order.id, createdAt: order.createdAt },
    ],
  };
}

export function buildOrderDetail(order: WorkOrder): WorkOrderDetail {
  const extras = curatedDetails[order.id] ?? buildDefaultDetail(order);
  return { ...order, ...extras };
}
