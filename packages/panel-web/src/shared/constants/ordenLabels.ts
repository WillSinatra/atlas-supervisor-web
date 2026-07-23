import type { EstadoOrden, PrioridadOrden, EstadoCuadrilla } from '@/types/atlas';
import { etiquetasEstado, etiquetasPrioridad } from '@/types/atlas';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const estadoOrdenLabels = etiquetasEstado;

export const estadoOrdenBadgeVariant: Record<EstadoOrden, BadgeVariant> = {
  pendiente: 'neutral',
  asignada: 'info',
  aceptada: 'info',
  en_proceso: 'warning',
  completada: 'success',
  cancelada: 'danger',
};

export const prioridadLabels = etiquetasPrioridad;

export const prioridadBadgeVariant: Record<PrioridadOrden, BadgeVariant> = {
  baja: 'neutral',
  media: 'info',
  alta: 'warning',
  critica: 'danger',
};

// El backend no valida `tipo`: esta lista es la restricción que impone el panel.
export const TIPOS_ORDEN = ['instalacion', 'reparacion', 'mantenimiento', 'baja', 'upgrade'] as const;
export type TipoOrden = (typeof TIPOS_ORDEN)[number];

export const tipoOrdenLabels: Record<TipoOrden, string> = {
  instalacion: 'Instalación',
  reparacion: 'Reparación',
  mantenimiento: 'Mantenimiento',
  baja: 'Baja',
  upgrade: 'Upgrade',
};

// Solo aplica cuando tipo = reparacion.
export const FALLAS = ['sin_senal', 'intermitencia', 'velocidad_baja', 'dano_fisico_equipo', 'otro'] as const;
export type Falla = (typeof FALLAS)[number];

export const fallaLabels: Record<Falla, string> = {
  sin_senal: 'Sin señal',
  intermitencia: 'Intermitencia',
  velocidad_baja: 'Velocidad baja',
  dano_fisico_equipo: 'Daño físico del equipo',
  otro: 'Otro',
};

export const estadoCuadrillaLabels: Record<EstadoCuadrilla, string> = {
  disponible: 'Disponible',
  ocupada: 'Ocupada',
  fuera_de_servicio: 'Fuera de servicio',
};

export const estadoCuadrillaBadgeVariant: Record<EstadoCuadrilla, BadgeVariant> = {
  disponible: 'success',
  ocupada: 'warning',
  fuera_de_servicio: 'danger',
};
