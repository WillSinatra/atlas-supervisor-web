import { api, type RespuestaPaginada } from './api';
import type {
  CrearPlantillaInput,
  CrearTareaInput,
  EditarTareaInput,
  EstadoTarea,
  Notificacion,
  Tarea,
  TareaPlantilla,
} from '@/types/atlas';

/**
 * Tareas internas y notificaciones (Pedido 10, ver
 * docs/pedido-10-tareas-internas.md).
 *
 * Sin respaldo en localStorage a propósito, al revés que empleados/áreas: una
 * tarea que le asignás a otro y queda guardada solo en tu navegador no es una
 * tarea, es un papelito. Si la API no está, el error se muestra.
 */

export interface FiltroTareas {
  /** Solo las mías (soy el responsable). */
  mias?: boolean;
  /** Solo las que pedí yo. */
  creadas_por_mi?: boolean;
  /** Las de todo el mundo: solo para admin, planificador y despachador. */
  todas?: boolean;
  empleado_id?: string;
  /** Las dirigidas a un sector (Pedido 11). */
  area_id?: string;
  /** Las del sector que todavía no tomó nadie. */
  sin_tomar?: boolean;
  estado?: EstadoTarea;
  /** Atajo para pendiente + en curso. */
  pendientes?: boolean;
  desde?: string;
  hasta?: string;
  page?: number;
  per_page?: number;
}

export const tareasApi = {
  async listar(params?: FiltroTareas) {
    const { data } = await api.get<RespuestaPaginada<Tarea>>('/v1/tareas', { params });
    return data;
  },

  async detalle(id: string) {
    const { data } = await api.get<Tarea>(`/v1/tareas/${id}`);
    return data;
  },

  async crear(payload: CrearTareaInput) {
    const { data } = await api.post<Tarea>('/v1/tareas', payload);
    return data;
  },

  async actualizar(id: string, payload: EditarTareaInput) {
    const { data } = await api.patch<Tarea>(`/v1/tareas/${id}`, payload);
    return data;
  },

  async eliminar(id: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/tareas/${id}`);
    return data;
  },

  /**
   * Tildar un ítem o cargar el dato que pide. Devuelve la tarea entera para que
   * la pantalla actualice el progreso sin volver a pedirla.
   */
  async marcarItem(itemId: string, payload: { hecho?: boolean; respuesta?: string | null }) {
    const { data } = await api.patch<Tarea>(`/v1/tarea-items/${itemId}`, payload);
    return data;
  },
};

export const plantillasApi = {
  async listar() {
    const { data } = await api.get<{ data: TareaPlantilla[] }>('/v1/tarea-plantillas');
    return data.data;
  },

  async crear(payload: CrearPlantillaInput) {
    const { data } = await api.post<TareaPlantilla>('/v1/tarea-plantillas', payload);
    return data;
  },

  async actualizar(id: string, payload: Partial<CrearPlantillaInput>) {
    const { data } = await api.patch<TareaPlantilla>(`/v1/tarea-plantillas/${id}`, payload);
    return data;
  },

  async eliminar(id: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/tarea-plantillas/${id}`);
    return data;
  },

  /**
   * Adelanta a mano lo que hace el cron: genera las tareas del día. Sirve para
   * no esperar a la próxima corrida después de crear una plantilla.
   */
  async generar(fecha?: string) {
    const { data } = await api.post<{ fecha: string; evaluadas: number; generadas: number }>(
      '/v1/tarea-plantillas/generar',
      fecha ? { fecha } : {},
    );
    return data;
  },
};

export const notificacionesApi = {
  async listar(params?: { no_leidas?: boolean; page?: number; per_page?: number }) {
    const { data } = await api.get<RespuestaPaginada<Notificacion>>('/v1/notificaciones', { params });
    return data;
  },

  /** El número del globito de la campanita. */
  async sinLeer() {
    const { data } = await api.get<{ count: number }>('/v1/notificaciones/no-leidas');
    return data.count;
  },

  async leer(id: string) {
    const { data } = await api.post<{ id: string; leida: boolean }>(`/v1/notificaciones/${id}/leer`);
    return data;
  },

  async leerTodas() {
    const { data } = await api.post<{ actualizadas: number }>('/v1/notificaciones/leer-todas');
    return data;
  },
};
