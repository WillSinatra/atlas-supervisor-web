/**
 * Atlas API — tipos del contrato (en español).
 * Ubicación sugerida: src/types/atlas.ts
 */

// ------------------------------------------------------------ enumerados ---

export type EstadoOrden =
  | 'pendiente'
  | 'asignada'
  | 'aceptada'
  | 'en_proceso'
  | 'completada'
  | 'cancelada';

export type PrioridadOrden = 'baja' | 'media' | 'alta' | 'critica';

export type EstadoCuadrilla = 'disponible' | 'ocupada' | 'fuera_de_servicio';

export type RolUsuario = 'admin' | 'planificador' | 'despachador' | 'tecnico' | 'operador';

export type TipoArchivo = 'firma' | 'foto' | 'foto_antes' | 'foto_despues';

/** Fecha ISO 8601 en UTC, p. ej. "2026-07-18T13:53:25Z". */
export type FechaIso = string;

export interface ReferenciaBasica {
  id: string;
  nombre: string;
}

// --------------------------------------------------------------- modelos ---

export interface Orden {
  id: string;
  /** Número legible autogenerado: "OT-000001" */
  numero: string;
  titulo: string | null;
  tipo: string;
  prioridad: PrioridadOrden;
  estado: EstadoOrden;
  cliente_id: string;
  domicilio_id: string;
  cuadrilla_id: string | null;
  falla: string | null;
  descripcion: string | null;
  ticket_externo_id: string | null;
  origen: string;
  sla_id: string | null;
  fecha_programada: FechaIso | null;
  firma_cliente: string | null;
  foto_despues: string | null;
  motivo_cancelacion: string | null;
  ticket_externo_actualizado: boolean;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
  asignada_en: FechaIso | null;
  aceptada_en: FechaIso | null;
  llegada_en: FechaIso | null;
  completada_en: FechaIso | null;
  cancelada_en: FechaIso | null;
}

export interface EventoOrden {
  id: string;
  tipo_evento: string;
  descripcion: string | null;
  usuario_id: string | null;
  datos: Record<string, unknown> | null;
  creado_en: FechaIso;
}

export interface Domicilio {
  id: string;
  direccion: string;
  lat: number | null;
  lng: number | null;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
  /** Presente en detalle y al crear */
  domicilios?: Domicilio[];
}

export interface Cuadrilla {
  id: string;
  nombre: string;
  estado: EstadoCuadrilla;
  lat: number | null;
  lng: number | null;
  ubicacion_actualizada_en: FechaIso | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  cuadrilla_id: string | null;
  activo: boolean;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
}

export interface Archivo {
  id: string;
  orden_id?: string;
  tipo: TipoArchivo;
  nombre_original?: string | null;
  mime: string;
  tamano: number;
  /** Ruta relativa de la API: "/v1/archivos/{id}" */
  url: string;
  creado_en: FechaIso;
}

export interface Sla {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Minutos */
  tiempo_resolucion: number;
  tiempo_respuesta: number | null;
  prioridad: PrioridadOrden | null;
  activo: boolean;
}

// ------------------------------------------------------------- dashboard ---

export interface DashboardTarjetas {
  ordenes_pendientes: number;
  ordenes_en_proceso: number;
  /** asignada + aceptada */
  ordenes_asignadas: number;
  completadas_hoy: number;
  /** Abiertas cuya fecha_programada ya pasó */
  ordenes_vencidas: number;
  cuadrillas_disponibles: number;
  cuadrillas_ocupadas: number;
  cuadrillas_fuera_servicio: number;
}

export interface ConteoPorPrioridad {
  prioridad: PrioridadOrden;
  cantidad: number;
}

export interface ConteoPorEstado {
  estado: EstadoOrden;
  cantidad: number;
}

export interface DashboardGraficos {
  /** Siempre las 4 prioridades, incluso en cero. Solo OT abiertas. */
  ordenes_por_prioridad: ConteoPorPrioridad[];
  /** Siempre los 6 estados, incluso en cero. Todas las OT. */
  ordenes_por_estado: ConteoPorEstado[];
}

export interface OrdenReciente {
  id: string;
  numero: string;
  titulo: string | null;
  tipo: string;
  estado: EstadoOrden;
  prioridad: PrioridadOrden;
  creado_en: FechaIso;
  fecha_programada: FechaIso | null;
  cliente: ReferenciaBasica;
  /** null cuando todavía no tiene cuadrilla asignada */
  cuadrilla: ReferenciaBasica | null;
}

export interface SlaResumen {
  id: string;
  nombre: string;
  tiempo_resolucion: number;
}

export interface AlertaSla {
  id: string;
  numero: string;
  titulo: string | null;
  estado: EstadoOrden;
  prioridad: PrioridadOrden;
  fecha_programada: FechaIso;
  /** Negativo si el compromiso ya venció */
  minutos_restantes: number;
  vencida: boolean;
  sla: SlaResumen;
  cliente: ReferenciaBasica;
  cuadrilla_nombre: string | null;
}

export interface EventoActividad {
  id: string;
  orden_id: string;
  orden_numero: string;
  orden_titulo: string | null;
  tipo_evento: string;
  descripcion: string | null;
  usuario_nombre: string | null;
  creado_en: FechaIso;
}

export interface DashboardData {
  tarjetas: DashboardTarjetas;
  graficos: DashboardGraficos;
  ordenes_recientes: OrdenReciente[];
  alertas_sla: AlertaSla[];
  actividad: EventoActividad[];
  generado_en: FechaIso;
}

// ------------------------------------------------------ presentación UI ---

export const coloresEstado: Record<EstadoOrden, string> = {
  pendiente: 'bg-slate-400',
  asignada: 'bg-blue-500',
  aceptada: 'bg-indigo-500',
  en_proceso: 'bg-amber-500',
  completada: 'bg-emerald-500',
  cancelada: 'bg-red-500',
};

export const etiquetasEstado: Record<EstadoOrden, string> = {
  pendiente: 'Pendiente',
  asignada: 'Asignada',
  aceptada: 'Aceptada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export const etiquetasPrioridad: Record<PrioridadOrden, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

/**
 * Convierte los minutos que devuelve la alerta de SLA en un texto legible.
 * Negativo = ya venció.
 */
export function textoVencimiento(minutos: number): string {
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;
  const lapso = horas > 0 ? `${horas} h ${resto} min` : `${resto} min`;
  return minutos < 0 ? `Vencida hace ${lapso}` : `Vence en ${lapso}`;
}