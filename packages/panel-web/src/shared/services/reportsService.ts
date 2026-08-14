import type { CostsReport, CrewProductivity, RecurrenceEntry, SatisfactionReport, SlaComplianceReport, TasksClosedGroup, TasksClosedIndex } from '@/types';
import { mockCostEntries, mockSatisfactionRatings, mockComplaints, findAddress, type ComplaintEntry } from './mocks/reports.mock';
import { mockCustomers } from './mocks/customers.mock';
import { mockCrews } from './mocks/crews.mock';
import { simulateDelay } from './mocks/delay';
import { ordenesApi, cuadrillasApi, slasApi } from './api';
import { tareasApi } from './tareas';
import type { Orden } from '@/types/atlas';

// NOTA: esta capa servía datos 100% mock. SLA compliance y productividad ya
// están contra la API real (GET /v1/ordenes, agregado acá porque no existe
// /v1/reports/*). Costos, recurrencias y satisfacción siguen en mock: no hay
// ningún endpoint de precio unitario, reclamos ni encuestas en la API — mismo
// motivo por el que <CostsSection /> está oculta en ReportsPage.

export interface ReportsFilters {
  dateFrom: string; // yyyy-mm-dd
  dateTo: string; // yyyy-mm-dd
}

function inRange(iso: string, filters: ReportsFilters): boolean {
  const date = iso.slice(0, 10);
  return date >= filters.dateFrom && date <= filters.dateTo;
}

/** Minutos entre dos fechas ISO de la API real. */
function minutesBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}

/**
 * Órdenes completadas en el período, con el nombre de cuadrilla y el SLA ya
 * resueltos. No hay filtro de fecha "hasta" en la API real (solo
 * `fecha_desde`, y filtra por creación, no por cierre) así que se trae un lote
 * grande de completadas y se filtra acá por `completada_en`. Alcanza para el
 * volumen actual; si crece, esto pasa a paginar o a pedir un endpoint de
 * reportes de verdad.
 */
async function ordenesCompletadasEnPeriodo(filters: ReportsFilters) {
  const [ordenesRes, cuadrillasRes, slas] = await Promise.all([
    ordenesApi.listar({ estado: 'completada', per_page: 500 }),
    cuadrillasApi.listar(),
    slasApi.listar(),
  ]);

  const nombrePorCuadrilla = new Map(cuadrillasRes.data.map((c) => [c.id, c.nombre]));
  const slaPorId = new Map(slas.map((s) => [s.id, s]));

  const ordenes = ordenesRes.data.filter((o): o is Orden & { completada_en: string } =>
    !!o.completada_en && inRange(o.completada_en, filters),
  );

  return { ordenes, nombrePorCuadrilla, slaPorId };
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

/**
 * Todas las órdenes creadas en el período (cualquier estado), para calcular
 * productividad real por cuadrilla. La API real solo filtra por
 * `fecha_desde` (y por creación, no por cierre), así que se trae un lote
 * grande y se filtra acá por `creado_en`.
 */
async function ordenesCreadasEnPeriodo(filters: ReportsFilters) {
  const [ordenesRes, cuadrillasRes] = await Promise.all([
    ordenesApi.listar({ per_page: 500 }),
    cuadrillasApi.listar(),
  ]);

  const nombrePorCuadrilla = new Map(cuadrillasRes.data.map((c) => [c.id, c.nombre]));
  const ordenes = ordenesRes.data.filter((o) => inRange(o.creado_en, filters));

  return { ordenes, nombrePorCuadrilla };
}

const ESTADOS_ORDEN = ['pendiente', 'asignada', 'aceptada', 'en_proceso', 'completada', 'cancelada'] as const;

export async function getProductivityReport(filters: ReportsFilters): Promise<CrewProductivity[]> {
  const { ordenes, nombrePorCuadrilla } = await ordenesCreadasEnPeriodo(filters);

  const porCuadrilla = new Map<string, Orden[]>();
  for (const o of ordenes) {
    const key = o.cuadrilla_id ?? 'sin-asignar';
    const list = porCuadrilla.get(key) ?? [];
    list.push(o);
    porCuadrilla.set(key, list);
  }

  const result: CrewProductivity[] = [...porCuadrilla.entries()].map(([cuadrillaId, ords]) => {
    const completadas = ords.filter((o) => o.estado === 'completada' && o.completada_en);
    const totalMinutes = completadas.reduce((sum, o) => sum + minutesBetween(o.creado_en, o.completada_en!), 0);

    const breakdown = ESTADOS_ORDEN.reduce((acc, estado) => {
      acc[estado] = ords.filter((o) => o.estado === estado).length;
      return acc;
    }, {} as CrewProductivity['breakdown']);

    return {
      id: cuadrillaId,
      name: nombrePorCuadrilla.get(cuadrillaId) ?? 'Sin asignar',
      code: '',
      completedOrders: completadas.length,
      averageTime: completadas.length ? Math.round(totalMinutes / completadas.length) : 0,
      totalOrders: ords.length,
      productivityRate: ords.length ? Math.round((completadas.length / ords.length) * 100) : 0,
      breakdown,
    };
  });

  return result.sort((a, b) => b.totalOrders - a.totalOrders);
}

export async function getSlaComplianceReport(filters: ReportsFilters): Promise<SlaComplianceReport> {
  const { ordenes, nombrePorCuadrilla, slaPorId } = await ordenesCompletadasEnPeriodo(filters);
  const ordenesConSla = ordenes.filter((o) => o.sla_id && slaPorId.has(o.sla_id));

  const isWithinSla = (o: Orden) => {
    const sla = slaPorId.get(o.sla_id!)!;
    return minutesBetween(o.creado_en, o.completada_en!) <= sla.tiempo_resolucion;
  };

  const crewMap = new Map<string, { name: string; total: number; within: number }>();

  for (const o of ordenesConSla) {
    const within = isWithinSla(o);
    const crewId = o.cuadrilla_id ?? 'sin-asignar';
    const crewEntry = crewMap.get(crewId) ?? { name: nombrePorCuadrilla.get(crewId) ?? 'Sin asignar', total: 0, within: 0 };
    crewEntry.total += 1;
    if (within) crewEntry.within += 1;
    crewMap.set(crewId, crewEntry);
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

  // No hay campo de tipo de cliente (empresa/residencial) en /v1/clientes:
  // no se inventa el dato, se deja vacío hasta que la API lo tenga.
  return { byCrew: toGroups(crewMap), byCustomerType: [] };
}

/**
 * Índice de tareas internas cerradas (Pedido 10). A diferencia de las OT, la
 * tarea no tiene cuadrilla — se agrupa por área y por empleado, que son los
 * únicos destinos reales que tiene (ver SelectorDestino). `todas: true`
 * porque acá interesa el total del equipo, no solo lo mío.
 */
export async function getTasksClosedIndex(filters: ReportsFilters): Promise<TasksClosedIndex> {
  const res = await tareasApi.listar({ todas: true, per_page: 500 });
  const tareas = res.data.filter((t) => inRange(t.creado_en, filters));

  const total = tareas.length;
  const cerradas = tareas.filter((t) => t.estado === 'hecha');
  const avgItemsPerTask = total ? tareas.reduce((sum, t) => sum + t.items_total, 0) / total : 0;

  const group = (getKey: (t: (typeof tareas)[number]) => { id: string; name: string } | null): TasksClosedGroup[] => {
    const map = new Map<string, { name: string; total: number; closed: number }>();
    for (const t of tareas) {
      const key = getKey(t);
      if (!key) continue;
      const entry = map.get(key.id) ?? { name: key.name, total: 0, closed: 0 };
      entry.total += 1;
      if (t.estado === 'hecha') entry.closed += 1;
      map.set(key.id, entry);
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, name: v.name, total: v.total, closed: v.closed, rate: v.total ? Math.round((v.closed / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  };

  return {
    total,
    closed: cerradas.length,
    rate: total ? Math.round((cerradas.length / total) * 100) : 0,
    avgItemsPerTask: Math.round(avgItemsPerTask * 10) / 10,
    byArea: group((t) => (t.area ? { id: t.area.id, name: t.area.nombre } : null)),
    byEmployee: group((t) => (t.empleado ? { id: t.empleado.id, name: t.empleado.nombre } : null)),
  };
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
