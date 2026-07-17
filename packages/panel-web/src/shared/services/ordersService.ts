import type { PaginatedResponse, WorkOrder, WorkOrderDetail } from '@/types';
import { mockOrders } from './mocks/orders.mock';
import { buildOrderDetail } from './mocks/orderDetails.mock';
import { simulateDelay } from './mocks/delay';

// NOTA: esta capa hoy sirve datos mock. Cuando el backend esté disponible, cada
// función se reemplaza internamente por una llamada a `api` (mismo nombre, misma
// firma, mismo tipo de retorno) y ninguna pantalla que la consuma necesita cambios.

export interface OrdersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkOrder['status'];
  priority?: WorkOrder['priority'];
  type?: WorkOrder['type'];
  crewId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Mutable en memoria para que asignar/cambiar estado se refleje en la sesión actual.
const ordersStore: WorkOrder[] = [...mockOrders];

export async function getOrders(filters: OrdersFilters = {}): Promise<PaginatedResponse<WorkOrder>> {
  const { page = 1, limit = 20, search, status, priority, type, crewId, customerId, dateFrom, dateTo } = filters;

  let result = [...ordersStore];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        `${o.customer?.firstName} ${o.customer?.lastName}`.toLowerCase().includes(q),
    );
  }
  if (status) result = result.filter((o) => o.status === status);
  if (priority) result = result.filter((o) => o.priority === priority);
  if (type) result = result.filter((o) => o.type === type);
  if (crewId) result = result.filter((o) => o.crewId === crewId);
  if (customerId) result = result.filter((o) => o.customerId === customerId);
  if (dateFrom) result = result.filter((o) => o.scheduledDate && o.scheduledDate >= dateFrom);
  if (dateTo) result = result.filter((o) => o.scheduledDate && o.scheduledDate <= dateTo);

  result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = result.length;
  const start = (page - 1) * limit;
  const data = result.slice(start, start + limit);

  return simulateDelay({
    data,
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getOrderById(id: string): Promise<WorkOrderDetail> {
  const order = ordersStore.find((o) => o.id === id);
  if (!order) throw new Error('Orden de trabajo no encontrada');
  return simulateDelay(buildOrderDetail(order));
}

export async function assignOrderToCrew(orderId: string, crewId: string, crewName: string): Promise<WorkOrder> {
  const order = ordersStore.find((o) => o.id === orderId);
  if (!order) throw new Error('Orden de trabajo no encontrada');
  order.crewId = crewId;
  order.crew = { id: crewId, name: crewName, code: crewName };
  order.status = 'ASSIGNED';
  order.updatedAt = new Date().toISOString();
  return simulateDelay(order);
}

export interface OrderEditableFields {
  title: string;
  priority: WorkOrder['priority'];
  description?: string;
  notes?: string;
}

// Edición de los datos generales de la OT (botón "Editar" en el detalle). No reemplaza
// ni modifica `updateOrderStatus`/`assignOrderToCrew`, que siguen cubriendo sus propios flujos.
export async function updateOrder(orderId: string, patch: OrderEditableFields): Promise<WorkOrder> {
  const order = ordersStore.find((o) => o.id === orderId);
  if (!order) throw new Error('Orden de trabajo no encontrada');
  order.title = patch.title;
  order.priority = patch.priority;
  order.description = patch.description;
  order.notes = patch.notes;
  order.updatedAt = new Date().toISOString();
  return simulateDelay(order);
}

export async function updateOrderStatus(orderId: string, status: WorkOrder['status'], reason?: string): Promise<WorkOrder> {
  const order = ordersStore.find((o) => o.id === orderId);
  if (!order) throw new Error('Orden de trabajo no encontrada');
  order.status = status;
  if (status === 'COMPLETED') order.completedAt = new Date().toISOString();
  if (status === 'CANCELLED') {
    order.cancelledAt = new Date().toISOString();
    order.cancellationReason = reason;
  }
  order.updatedAt = new Date().toISOString();
  return simulateDelay(order);
}
