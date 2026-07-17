import type { Crew, CrewDetail, PaginatedResponse } from '@/types';
import { mockCrews, mockInventoryByCrew } from './mocks/crews.mock';
import { mockOrders } from './mocks/orders.mock';
import { simulateDelay } from './mocks/delay';

export interface CrewsFilters {
  page?: number;
  limit?: number;
  status?: Crew['status'];
  zone?: string;
}

export async function getCrews(filters: CrewsFilters = {}): Promise<PaginatedResponse<Crew>> {
  const { page = 1, limit = 20, status, zone } = filters;

  let result = [...mockCrews];
  if (status) result = result.filter((c) => c.status === status);
  if (zone) result = result.filter((c) => c.zone === zone);

  const total = result.length;
  const start = (page - 1) * limit;
  const data = result.slice(start, start + limit);

  return simulateDelay({
    data,
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getCrewById(id: string): Promise<CrewDetail> {
  const crew = mockCrews.find((c) => c.id === id);
  if (!crew) throw new Error('Cuadrilla no encontrada');

  const workOrders = mockOrders.filter((o) => o.crewId === id);
  const inventory = mockInventoryByCrew[id] ?? [];

  return simulateDelay({ ...crew, inventory, workOrders });
}
