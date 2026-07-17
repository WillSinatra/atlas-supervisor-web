import type { WorkOrderPriority, WorkOrderStatus } from '@/types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const statusLabels: Record<WorkOrderStatus, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En Progreso',
  ON_HOLD: 'En Espera',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  REOPENED: 'Reabierta',
};

export const statusBadgeVariant: Record<WorkOrderStatus, BadgeVariant> = {
  PENDING: 'neutral',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  ON_HOLD: 'neutral',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  REOPENED: 'danger',
};

export const priorityLabels: Record<WorkOrderPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const priorityBadgeVariant: Record<WorkOrderPriority, BadgeVariant> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};
