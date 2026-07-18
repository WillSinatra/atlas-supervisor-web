import type { CustomerAddress } from '@/types';
import { mockCustomers } from './customers.mock';

const daysAgo = (d: number) => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString();
};

export interface CostMaterialLine {
  materialId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CostEntry {
  id: string;
  orderNumber: string;
  crewId: string;
  date: string;
  laborCost: number;
  materials: CostMaterialLine[];
}

// Costos operativos del período: materiales + mano de obra por OT cerrada. Es un
// dataset propio de Reportes (orders.mock no modela costos), con fechas repartidas
// en los últimos ~90 días para que el filtro de rango afecte realmente el resultado.
export const mockCostEntries: CostEntry[] = [
  { id: 'cost-001', orderNumber: 'OT-0101', crewId: 'crew-001', date: daysAgo(2), laborCost: 18000, materials: [{ materialId: 'mat-001', name: 'ONU Huawei HG8245', quantity: 1, unitPrice: 45000 }] },
  { id: 'cost-002', orderNumber: 'OT-0102', crewId: 'crew-002', date: daysAgo(4), laborCost: 22000, materials: [{ materialId: 'mat-003', name: 'Splitter óptico 1x8', quantity: 2, unitPrice: 9500 }] },
  { id: 'cost-003', orderNumber: 'OT-0103', crewId: 'crew-003', date: daysAgo(7), laborCost: 15000, materials: [{ materialId: 'mat-005', name: 'Router WiFi TP-Link', quantity: 1, unitPrice: 32000 }] },
  { id: 'cost-004', orderNumber: 'OT-0104', crewId: 'crew-001', date: daysAgo(9), laborCost: 20000, materials: [{ materialId: 'mat-002', name: 'Cable UTP Cat6 (rollo)', quantity: 1, unitPrice: 18000 }, { materialId: 'mat-004', name: 'Conectores RJ45 (caja x100)', quantity: 1, unitPrice: 6200 }] },
  { id: 'cost-005', orderNumber: 'OT-0105', crewId: 'crew-004', date: daysAgo(12), laborCost: 17000, materials: [{ materialId: 'mat-006', name: 'Cable Drop fibra (rollo)', quantity: 1, unitPrice: 21000 }] },
  { id: 'cost-006', orderNumber: 'OT-0106', crewId: 'crew-002', date: daysAgo(15), laborCost: 25000, materials: [{ materialId: 'mat-001', name: 'ONU Huawei HG8245', quantity: 1, unitPrice: 45000 }] },
  { id: 'cost-007', orderNumber: 'OT-0107', crewId: 'crew-001', date: daysAgo(19), laborCost: 16000, materials: [{ materialId: 'mat-003', name: 'Splitter óptico 1x8', quantity: 1, unitPrice: 9500 }] },
  { id: 'cost-008', orderNumber: 'OT-0108', crewId: 'crew-003', date: daysAgo(22), laborCost: 19000, materials: [{ materialId: 'mat-005', name: 'Router WiFi TP-Link', quantity: 1, unitPrice: 32000 }] },
  { id: 'cost-009', orderNumber: 'OT-0109', crewId: 'crew-004', date: daysAgo(26), laborCost: 21000, materials: [{ materialId: 'mat-002', name: 'Cable UTP Cat6 (rollo)', quantity: 2, unitPrice: 18000 }] },
  { id: 'cost-010', orderNumber: 'OT-0110', crewId: 'crew-002', date: daysAgo(29), laborCost: 18000, materials: [{ materialId: 'mat-004', name: 'Conectores RJ45 (caja x100)', quantity: 2, unitPrice: 6200 }] },
  { id: 'cost-011', orderNumber: 'OT-0111', crewId: 'crew-001', date: daysAgo(35), laborCost: 20000, materials: [{ materialId: 'mat-001', name: 'ONU Huawei HG8245', quantity: 1, unitPrice: 45000 }] },
  { id: 'cost-012', orderNumber: 'OT-0112', crewId: 'crew-003', date: daysAgo(48), laborCost: 15000, materials: [{ materialId: 'mat-006', name: 'Cable Drop fibra (rollo)', quantity: 1, unitPrice: 21000 }] },
  { id: 'cost-013', orderNumber: 'OT-0113', crewId: 'crew-004', date: daysAgo(63), laborCost: 17000, materials: [{ materialId: 'mat-005', name: 'Router WiFi TP-Link', quantity: 1, unitPrice: 32000 }] },
  { id: 'cost-014', orderNumber: 'OT-0114', crewId: 'crew-002', date: daysAgo(80), laborCost: 23000, materials: [{ materialId: 'mat-003', name: 'Splitter óptico 1x8', quantity: 3, unitPrice: 9500 }] },
];

export interface SatisfactionRating {
  id: string;
  crewId: string;
  customerId: string;
  date: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

// Encuestas de satisfacción post-cierre de OT. Ratings mixtos a propósito (no todo
// 5 estrellas) para que la distribución se vea real y no "forzada".
export const mockSatisfactionRatings: SatisfactionRating[] = [
  { id: 'sat-001', crewId: 'crew-001', customerId: 'cus-001', date: daysAgo(2), rating: 5 },
  { id: 'sat-002', crewId: 'crew-002', customerId: 'cus-002', date: daysAgo(4), rating: 4 },
  { id: 'sat-003', crewId: 'crew-003', customerId: 'cus-003', date: daysAgo(6), rating: 5 },
  { id: 'sat-004', crewId: 'crew-001', customerId: 'cus-004', date: daysAgo(8), rating: 3 },
  { id: 'sat-005', crewId: 'crew-004', customerId: 'cus-005', date: daysAgo(11), rating: 4 },
  { id: 'sat-006', crewId: 'crew-002', customerId: 'cus-006', date: daysAgo(14), rating: 5 },
  { id: 'sat-007', crewId: 'crew-003', customerId: 'cus-007', date: daysAgo(17), rating: 2 },
  { id: 'sat-008', crewId: 'crew-001', customerId: 'cus-002', date: daysAgo(21), rating: 4 },
  { id: 'sat-009', crewId: 'crew-004', customerId: 'cus-003', date: daysAgo(40), rating: 5 },
  { id: 'sat-010', crewId: 'crew-002', customerId: 'cus-001', date: daysAgo(55), rating: 3 },
];

export interface ComplaintEntry {
  id: string;
  addressId: string;
  customerId: string;
  date: string;
}

// Reclamos por domicilio en el período; usados para detectar reincidencias (3+).
// Solo addr-003 llega a 3 reclamos dentro de los últimos 30 días a propósito —
// el resto queda por debajo del umbral para no forzar el mock.
export const mockComplaints: ComplaintEntry[] = [
  { id: 'cla-001', addressId: 'addr-003', customerId: 'cus-003', date: daysAgo(3) },
  { id: 'cla-002', addressId: 'addr-003', customerId: 'cus-003', date: daysAgo(10) },
  { id: 'cla-003', addressId: 'addr-003', customerId: 'cus-003', date: daysAgo(18) },
  { id: 'cla-004', addressId: 'addr-006', customerId: 'cus-006', date: daysAgo(9) },
  { id: 'cla-005', addressId: 'addr-006', customerId: 'cus-006', date: daysAgo(50) },
  { id: 'cla-006', addressId: 'addr-001', customerId: 'cus-001', date: daysAgo(20) },
];

export function findAddress(customerId: string, addressId: string): CustomerAddress | undefined {
  return mockCustomers.find((c) => c.id === customerId)?.addresses.find((a) => a.id === addressId);
}
