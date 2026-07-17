import type { Customer, CustomerDetail, PaginatedResponse } from '@/types';
import { mockCustomers } from './mocks/customers.mock';
import { mockOrders } from './mocks/orders.mock';
import { simulateDelay } from './mocks/delay';

export interface CustomersFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export async function getCustomers(filters: CustomersFilters = {}): Promise<PaginatedResponse<Customer>> {
  const { page = 1, limit = 20, search } = filters;

  let result = [...mockCustomers];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.businessName?.toLowerCase().includes(q) ||
        c.documentNumber?.includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q),
    );
  }

  const total = result.length;
  const start = (page - 1) * limit;
  const data = result.slice(start, start + limit);

  return simulateDelay({
    data,
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getCustomerById(id: string): Promise<CustomerDetail> {
  const customer = mockCustomers.find((c) => c.id === id);
  if (!customer) throw new Error('Cliente no encontrado');

  const workOrders = mockOrders.filter((o) => o.customerId === id);
  return simulateDelay({ ...customer, workOrders });
}
