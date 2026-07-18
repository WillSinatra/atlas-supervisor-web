import type { CostsReport, CrewProductivity, RecurrenceEntry, SatisfactionReport, SlaComplianceReport, WorkOrder } from '@/types';
import { mockCostEntries, mockSatisfactionRatings, mockComplaints, findAddress, type ComplaintEntry } from './mocks/reports.mock';
import { mockOrders } from './mocks/orders.mock';
import { mockCrews } from './mocks/crews.mock';
import { mockCustomers } from './mocks/customers.mock';
import { simulateDelay } from './mocks/delay';

// NOTA: esta capa hoy sirve datos mock. Cuando el backend esté disponible, cada
// función se reemplaza internamente por una llamada a `api` (mismo nombre, misma
// firma, mismo tipo de retorno) y ninguna pantalla que la consuma necesita cambios.

export interface ReportsFilters {
  dateFrom: string; // yyyy-mm-dd
  dateTo: string; // yyyy-mm-dd
}

function inRange(iso: string, filters: ReportsFilters): boolean {
  const date = iso.slice(0, 10);
  return date >= filters.dateFrom && date <= filters.dateTo;
}

export async function getCostsReport(filters: ReportsFilters): Promise<CostsReport> {
  const entries = mockCostEntries.filter((e) => inRange(e.date, filters));

  const entryTotal = (e: (typeof entries)[number]) =>
    e.laborCost + e.materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);

  const totalPeriod = entries.reduce((sum, e) => sum + entryTotal(e), 0);

  const byCrewMap = new Map<string, number>();
  for (const e of entries) byCrewMap.set(e.crewId, (byCrewMap.get(e.crewId) ?? 0) + entryTotal(e));
  const byCrew = [...byCrewMap.entries()]
    .map(([crewId, total]) => ({ id: crewId, name: mockCrews.find((c) => c.id === crewId)?.name ?? crewId, total }))
    .sort((a, b) => b.total - a.total);

  const byMaterialMap = new Map<string, { name: string; total: number }>();
  for (const e of entries) {
    for (const m of e.materials) {
      const prev = byMaterialMap.get(m.materialId);
      const lineTotal = m.quantity * m.unitPrice;
      byMaterialMap.set(m.materialId, { name: m.name, total: (prev?.total ?? 0) + lineTotal });
    }
  }
  const byMaterial = [...byMaterialMap.entries()]
    .map(([id, v]) => ({ id, name: v.name, total: v.total }))
    .sort((a, b) => b.total - a.total);

  return simulateDelay({ totalPeriod, byCrew, byMaterial });
}

export async function getProductivityReport(filters: ReportsFilters): Promise<CrewProductivity[]> {
  const closedOrders = mockOrders.filter(
    (o) => o.status === 'COMPLETED' && o.completedAt && inRange(o.completedAt, filters),
  );

  const result = mockCrews.map((crew) => {
    const crewOrders = closedOrders.filter((o) => o.crewId === crew.id);
    const totalMinutes = crewOrders.reduce((sum, o) => {
      const start = o.startedAt ?? o.createdAt;
      const end = o.completedAt!;
      return sum + (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    }, 0);
    return {
      id: crew.id,
      name: crew.name,
      code: crew.code,
      specialty: crew.specialty,
      completedOrders: crewOrders.length,
      averageTime: crewOrders.length ? Math.round(totalMinutes / crewOrders.length) : 0,
    };
  });

  return simulateDelay(result);
}

function customerType(customerId: string): 'Residencial' | 'Empresarial' {
  const customer = mockCustomers.find((c) => c.id === customerId);
  return customer?.businessName ? 'Empresarial' : 'Residencial';
}

export async function getSlaComplianceReport(filters: ReportsFilters): Promise<SlaComplianceReport> {
  const closedOrders = mockOrders.filter(
    (o) => o.status === 'COMPLETED' && o.completedAt && o.sla && inRange(o.completedAt, filters),
  );

  const isWithinSla = (o: WorkOrder) => {
    const start = new Date(o.startedAt ?? o.createdAt).getTime();
    const end = new Date(o.completedAt!).getTime();
    const minutes = (end - start) / 60000;
    return minutes <= o.sla!.resolveTime;
  };

  const crewMap = new Map<string, { name: string; total: number; within: number }>();
  const typeMap = new Map<string, { name: string; total: number; within: number }>();

  for (const o of closedOrders) {
    const within = isWithinSla(o);

    const crewId = o.crewId ?? 'sin-asignar';
    const crewEntry = crewMap.get(crewId) ?? { name: o.crew?.name ?? 'Sin asignar', total: 0, within: 0 };
    crewEntry.total += 1;
    if (within) crewEntry.within += 1;
    crewMap.set(crewId, crewEntry);

    const type = customerType(o.customerId);
    const typeEntry = typeMap.get(type) ?? { name: type, total: 0, within: 0 };
    typeEntry.total += 1;
    if (within) typeEntry.within += 1;
    typeMap.set(type, typeEntry);
  }

  const toGroups = (map: Map<string, { name: string; total: number; within: number }>) =>
    [...map.entries()]
      .map(([id, v]) => ({
        id,
        name: v.name,
        totalOrders: v.total,
        withinSla: v.within,
        complianceRate: v.total ? Math.round((v.within / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders);

  return simulateDelay({ byCrew: toGroups(crewMap), byCustomerType: toGroups(typeMap) });
}

export async function getRecurrencesReport(filters: ReportsFilters): Promise<RecurrenceEntry[]> {
  const complaints = mockComplaints.filter((c) => inRange(c.date, filters));

  const byAddress = new Map<string, ComplaintEntry[]>();
  for (const c of complaints) {
    const list = byAddress.get(c.addressId) ?? [];
    list.push(c);
    byAddress.set(c.addressId, list);
  }

  const result: RecurrenceEntry[] = [];
  for (const [addressId, list] of byAddress) {
    if (list.length < 3) continue;
    const customer = mockCustomers.find((c) => c.id === list[0].customerId);
    const address = findAddress(list[0].customerId, addressId);
    const lastClaimDate = [...list].map((c) => c.date).sort().at(-1)!;
    result.push({
      addressId,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Desconocido',
      addressLabel: address ? `${address.street} ${address.number ?? ''}, ${address.neighborhood ?? address.city}` : addressId,
      claimsCount: list.length,
      lastClaimDate,
    });
  }

  return simulateDelay(result.sort((a, b) => b.claimsCount - a.claimsCount));
}

export async function getSatisfactionReport(filters: ReportsFilters): Promise<SatisfactionReport> {
  const ratings = mockSatisfactionRatings.filter((r) => inRange(r.date, filters));

  const distribution: SatisfactionReport['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) distribution[r.rating] += 1;

  const average = ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

  return simulateDelay({ average: Math.round(average * 10) / 10, totalRatings: ratings.length, distribution });
}
