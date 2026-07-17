import type { CrewStatus, TechnicianStatus } from '@/types';

// 5 estados reales según Tomo II (RF-CUA-002), en español snake_case.
export const crewStatusLabels: Record<CrewStatus, string> = {
  disponible: 'Disponible',
  en_viaje: 'En viaje',
  trabajando: 'Trabajando',
  en_pausa: 'En pausa',
  fuera_de_servicio: 'Fuera de servicio',
};

// Mismos colores que ya usan las cards "Cuadrillas Disponibles" (verde) y
// "Cuadrillas Ocupadas" (ámbar) del Dashboard; en_viaje y trabajando distinguidos
// porque son operativamente distintos (viajando hacia el domicilio vs. ejecutando el trabajo).
export const crewStatusBadgeVariant: Record<CrewStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  disponible: 'success',
  en_viaje: 'info',
  trabajando: 'warning',
  en_pausa: 'neutral',
  fuera_de_servicio: 'danger',
};

export const technicianStatusLabels: Record<TechnicianStatus, string> = {
  AVAILABLE: 'Disponible',
  BUSY: 'Ocupado',
  ON_BREAK: 'En descanso',
  OFFLINE: 'Fuera de servicio',
};

export const technicianStatusBadgeVariant: Record<TechnicianStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  AVAILABLE: 'success',
  BUSY: 'warning',
  ON_BREAK: 'neutral',
  OFFLINE: 'danger',
};
