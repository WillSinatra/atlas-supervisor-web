import type { WorkOrder } from '@/types';

export type SlaState = 'overdue' | 'dueSoon' | 'onTrack' | 'closed';

const OPEN_STATUSES: WorkOrder['status'][] = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'REOPENED'];
const DUE_SOON_WINDOW_MS = 2 * 60 * 60 * 1000; // 2hs, mismo criterio que usa el dashboard

/** Mismo criterio que el backend: activa + scheduledDate vencida = "overdue"; activa + vence en <2hs = "dueSoon". */
export function getSlaState(order: WorkOrder, now: Date = new Date()): SlaState {
  if (!OPEN_STATUSES.includes(order.status) || !order.scheduledDate) {
    return 'closed';
  }
  const scheduled = new Date(order.scheduledDate).getTime();
  if (scheduled < now.getTime()) return 'overdue';
  if (scheduled - now.getTime() <= DUE_SOON_WINDOW_MS) return 'dueSoon';
  return 'onTrack';
}

export function formatSlaRemaining(order: WorkOrder, now: Date = new Date()): string {
  const state = getSlaState(order, now);
  if (state === 'closed') return '—';
  if (!order.scheduledDate) return '—';

  const diffMs = new Date(order.scheduledDate).getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const hours = Math.floor(absMs / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  const label = days > 0 ? `${days}d ${remHours}h` : `${hours}h`;
  return state === 'overdue' ? `Vencida hace ${label}` : `Vence en ${label}`;
}
