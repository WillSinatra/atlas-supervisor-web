import type { SLABrief, WorkOrder, WorkOrderPriority, WorkOrderType } from '@/types';
import { mockCustomers } from './customers.mock';
import { mockCrews } from './crews.mock';

// Las fechas se calculan en relación al momento de carga (Date.now()), para que
// las órdenes "vencidas" y "por vencer" sigan siendo válidas sin importar cuándo se corra el mock.
const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

const slaByPriority: Record<WorkOrderPriority, SLABrief> = {
  CRITICAL: { name: 'Crítico', responseTime: 30, resolveTime: 120 },
  HIGH: { name: 'Alta', responseTime: 60, resolveTime: 240 },
  MEDIUM: { name: 'Media', responseTime: 120, resolveTime: 480 },
  LOW: { name: 'Baja', responseTime: 240, resolveTime: 1440 },
};

// Los 5 tipos reales según Tomo II, Sección 5. "OTHER" se deja como comodín
// defensivo de UI (no forma parte de los 5 tipos oficiales).
const typeLabels: Record<WorkOrderType, string> = {
  INSTALLATION: 'Instalación',
  REPAIR: 'Reparación',
  MAINTENANCE: 'Mantenimiento',
  REMOVAL: 'Baja',
  UPGRADE: 'Upgrade',
  OTHER: 'Otro',
};

function customerBrief(id: string) {
  const c = mockCustomers.find((cust) => cust.id === id)!;
  return { id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone };
}

function addressBrief(customerId: string) {
  const c = mockCustomers.find((cust) => cust.id === customerId)!;
  const a = c.addresses[0];
  return { street: a.street, number: a.number, city: a.city, neighborhood: a.neighborhood };
}

// La OT hereda la coordenada del domicilio principal del cliente (mismo dato que usaría el backend real).
function customerCoords(customerId: string) {
  const c = mockCustomers.find((cust) => cust.id === customerId)!;
  const a = c.addresses[0];
  return { latitude: a.latitude, longitude: a.longitude };
}

function crewBrief(id?: string) {
  if (!id) return undefined;
  const c = mockCrews.find((crew) => crew.id === id)!;
  return { id: c.id, name: c.name, code: c.code };
}

export { typeLabels };

const rawMockOrders: WorkOrder[] = [
  {
    id: 'ot-001',
    orderNumber: 'OT-0001',
    title: 'Instalación de internet residencial',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    type: 'INSTALLATION',
    customerId: 'cus-001',
    customer: customerBrief('cus-001'),
    address: addressBrief('cus-001'),
    crewId: 'crew-001',
    crew: crewBrief('crew-001'),
    createdById: 'user-supervisor',
    sla: slaByPriority.MEDIUM,
    scheduledDate: daysFromNow(-2),
    startedAt: daysFromNow(-2),
    completedAt: daysFromNow(-2),
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-2),
  },
  {
    id: 'ot-002',
    orderNumber: 'OT-0002',
    title: 'Reparación de intermitencia en señal',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    type: 'REPAIR',
    customerId: 'cus-002',
    customer: customerBrief('cus-002'),
    address: addressBrief('cus-002'),
    crewId: 'crew-002',
    crew: crewBrief('crew-002'),
    createdById: 'user-supervisor',
    sla: slaByPriority.HIGH,
    scheduledDate: hoursFromNow(3),
    startedAt: hoursFromNow(-1),
    createdAt: daysFromNow(-1),
    updatedAt: hoursFromNow(-1),
  },
  {
    id: 'ot-003',
    orderNumber: 'OT-0003',
    title: 'Mantenimiento preventivo de nodo',
    status: 'PENDING',
    priority: 'LOW',
    type: 'MAINTENANCE',
    customerId: 'cus-003',
    customer: customerBrief('cus-003'),
    address: addressBrief('cus-003'),
    createdById: 'user-supervisor',
    sla: slaByPriority.LOW,
    scheduledDate: daysFromNow(1),
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ot-004',
    orderNumber: 'OT-0004',
    title: 'Reparación por corte total de servicio',
    status: 'ASSIGNED',
    priority: 'HIGH',
    type: 'REPAIR',
    customerId: 'cus-004',
    customer: customerBrief('cus-004'),
    address: addressBrief('cus-004'),
    crewId: 'crew-003',
    crew: crewBrief('crew-003'),
    createdById: 'user-supervisor',
    sla: slaByPriority.HIGH,
    scheduledDate: hoursFromNow(-3), // vencida
    createdAt: daysFromNow(-1),
    updatedAt: hoursFromNow(-3),
  },
  {
    id: 'ot-005',
    orderNumber: 'OT-0005',
    title: 'Instalación de segundo punto de red',
    status: 'ASSIGNED',
    priority: 'MEDIUM',
    type: 'INSTALLATION',
    customerId: 'cus-005',
    customer: customerBrief('cus-005'),
    address: addressBrief('cus-005'),
    crewId: 'crew-004',
    crew: crewBrief('crew-004'),
    createdById: 'user-supervisor',
    sla: slaByPriority.MEDIUM,
    scheduledDate: hoursFromNow(1), // por vencer
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ot-006',
    orderNumber: 'OT-0006',
    title: 'Baja de servicio por mudanza',
    status: 'PENDING',
    priority: 'LOW',
    type: 'REMOVAL',
    customerId: 'cus-006',
    customer: customerBrief('cus-006'),
    address: addressBrief('cus-006'),
    createdById: 'user-supervisor',
    sla: slaByPriority.LOW,
    scheduledDate: daysFromNow(2),
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ot-007',
    orderNumber: 'OT-0007',
    title: 'Falla crítica de nodo en zona norte',
    status: 'IN_PROGRESS',
    priority: 'CRITICAL',
    type: 'MAINTENANCE',
    customerId: 'cus-007',
    customer: customerBrief('cus-007'),
    address: addressBrief('cus-007'),
    crewId: 'crew-001',
    crew: crewBrief('crew-001'),
    createdById: 'user-supervisor',
    sla: slaByPriority.CRITICAL,
    scheduledDate: hoursFromNow(-0.5), // vencida
    startedAt: hoursFromNow(-0.5),
    createdAt: hoursFromNow(-2),
    updatedAt: hoursFromNow(-0.5),
  },
  {
    id: 'ot-008',
    orderNumber: 'OT-0008',
    title: 'Reparación de router en comodato',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    type: 'REPAIR',
    customerId: 'cus-001',
    customer: customerBrief('cus-001'),
    address: addressBrief('cus-001'),
    crewId: 'crew-002',
    crew: crewBrief('crew-002'),
    createdById: 'user-supervisor',
    sla: slaByPriority.MEDIUM,
    scheduledDate: daysFromNow(-1),
    startedAt: daysFromNow(-1),
    completedAt: daysFromNow(-1),
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ot-009',
    orderNumber: 'OT-0009',
    title: 'Upgrade de plan contratado',
    status: 'PENDING',
    priority: 'LOW',
    type: 'UPGRADE',
    customerId: 'cus-002',
    customer: customerBrief('cus-002'),
    address: addressBrief('cus-002'),
    createdById: 'user-supervisor',
    sla: slaByPriority.LOW,
    scheduledDate: daysFromNow(5),
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ot-010',
    orderNumber: 'OT-0010',
    title: 'Instalación demorada por falta de materiales',
    status: 'ON_HOLD',
    priority: 'LOW',
    type: 'INSTALLATION',
    customerId: 'cus-003',
    customer: customerBrief('cus-003'),
    address: addressBrief('cus-003'),
    crewId: 'crew-003',
    crew: crewBrief('crew-003'),
    createdById: 'user-supervisor',
    sla: slaByPriority.LOW,
    scheduledDate: daysFromNow(-1), // vencida
    notes: 'A la espera de stock de ONU',
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ot-011',
    orderNumber: 'OT-0011',
    title: 'Reparación cancelada por el cliente',
    status: 'CANCELLED',
    priority: 'MEDIUM',
    type: 'REPAIR',
    customerId: 'cus-004',
    customer: customerBrief('cus-004'),
    address: addressBrief('cus-004'),
    crewId: 'crew-004',
    crew: crewBrief('crew-004'),
    createdById: 'user-supervisor',
    sla: slaByPriority.MEDIUM,
    scheduledDate: daysFromNow(-1),
    cancelledAt: daysFromNow(-1),
    cancellationReason: 'El cliente resolvió el problema por su cuenta',
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ot-012',
    orderNumber: 'OT-0012',
    title: 'Mantenimiento de splitter óptico',
    status: 'ASSIGNED',
    priority: 'HIGH',
    type: 'MAINTENANCE',
    customerId: 'cus-005',
    customer: customerBrief('cus-005'),
    address: addressBrief('cus-005'),
    crewId: 'crew-001',
    crew: crewBrief('crew-001'),
    createdById: 'user-supervisor',
    sla: slaByPriority.HIGH,
    scheduledDate: hoursFromNow(1.5), // por vencer
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ot-013',
    orderNumber: 'OT-0013',
    title: 'Reclamo reabierto por falla recurrente',
    status: 'REOPENED',
    priority: 'CRITICAL',
    type: 'REPAIR',
    customerId: 'cus-006',
    customer: customerBrief('cus-006'),
    address: addressBrief('cus-006'),
    crewId: 'crew-002',
    crew: crewBrief('crew-002'),
    createdById: 'user-supervisor',
    sla: slaByPriority.CRITICAL,
    scheduledDate: hoursFromNow(-5), // vencida
    createdAt: daysFromNow(-4),
    updatedAt: hoursFromNow(-5),
  },
];

export const mockOrders: WorkOrder[] = rawMockOrders.map((order) => ({
  ...customerCoords(order.customerId),
  ...order,
}));
