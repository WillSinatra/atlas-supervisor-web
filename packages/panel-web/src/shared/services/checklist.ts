import { api } from './api';
import type {
  ChecklistOrden,
  ItemChecklistOrden,
  ItemChecklistTicket,
  ItemPlantillaInput,
  PlantillaChecklist,
  TipoItemChecklist,
  VerificacionTicket,
} from '@/types/atlas';

/**
 * Checklist de la orden de trabajo (Pedido 12).
 *
 * Los ítems no se cargan orden por orden: salen de una plantilla por tipo de OT
 * y se copian al crearla. Lo que se ve acá es esa copia, que es la que el
 * técnico completa desde la app.
 */

// ------------------------------------------------------------- por orden ---

export const checklistApi = {
  async deOrden(ordenId: string) {
    const { data } = await api.get<ChecklistOrden>(`/v1/ordenes/${ordenId}/checklist`);
    return data;
  },

  /**
   * Completa un ítem. El panel tiene los uuid a mano, así que va por id; la app
   * usa el PATCH por clave.
   */
  async actualizarItem(itemId: string, cambios: { hecho?: boolean; respuesta?: string | null }) {
    const { data } = await api.patch<ItemChecklistOrden>(`/v1/orden-checklist-items/${itemId}`, cambios);
    return data;
  },

  /** Un ítem que la plantilla no traía, solo para esta orden. */
  async agregarAOrden(
    ordenId: string,
    item: { texto: string; tipo?: TipoItemChecklist; obligatorio?: boolean },
  ) {
    const { data } = await api.post<ItemChecklistOrden>(`/v1/ordenes/${ordenId}/checklist`, item);
    return data;
  },

  async quitarItem(itemId: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(
      `/v1/orden-checklist-items/${itemId}`,
    );
    return data;
  },
};

// ------------------------------------------ verificación del ticket (N2) ---

/**
 * Lo que N2 descarta antes de mandar un técnico. Es un relevamiento distinto
 * al de la OT: diagnóstico remoto contra trabajo en el domicilio.
 */
export const verificacionApi = {
  async deTicket(ticketId: string) {
    const { data } = await api.get<VerificacionTicket>(`/v1/tickets-beta/${ticketId}/checklist`);
    return data;
  },

  /** Responde un ítem. El panel tiene los uuid, así que va por id. */
  async actualizarItem(itemId: string, cambios: { hecho?: boolean; respuesta?: string | null }) {
    const { data } = await api.patch<ItemChecklistTicket>(
      `/v1/ticket-checklist-items/${itemId}`,
      cambios,
    );
    return data;
  },

  /** Responde varios de una vez, por clave. */
  async responder(ticketId: string, respuestas: Record<string, unknown>) {
    const { data } = await api.patch<VerificacionTicket>(
      `/v1/tickets-beta/${ticketId}/checklist`,
      { items: respuestas },
    );
    return data;
  },
};

// ------------------------------------------------------------ plantillas ---

export const plantillasChecklistApi = {
  async listar(params?: {
    tipo_orden?: string;
    /** 'orden' = lo releva el técnico; 'ticket' = lo verifica N2. Sin esto, ambos. */
    ambito?: 'orden' | 'ticket';
    incluir_inactivas?: boolean;
  }) {
    const { data } = await api.get<{ data: PlantillaChecklist[] }>('/v1/checklist-plantillas', {
      params: {
        tipo_orden: params?.tipo_orden,
        ambito: params?.ambito,
        incluir_inactivas: params?.incluir_inactivas ? '1' : undefined,
      },
    });
    return data.data;
  },

  async detalle(id: string) {
    const { data } = await api.get<PlantillaChecklist>(`/v1/checklist-plantillas/${id}`);
    return data;
  },

  /**
   * Alta. Si ya había una plantilla activa para ese tipo, la API la desactiva y
   * esta la reemplaza: la anterior queda como histórico.
   */
  async crear(payload: {
    tipo_orden: string;
    /** Sin esto la API asume 'orden', que es como se comportaba antes. */
    ambito?: 'orden' | 'ticket';
    nombre?: string;
    items: ItemPlantillaInput[];
  }) {
    const { data } = await api.post<PlantillaChecklist>('/v1/checklist-plantillas', payload);
    return data;
  },

  /** Con `items` se reemplaza la lista entera: es como se guarda lo editado. */
  async actualizar(
    id: string,
    payload: { nombre?: string; activo?: boolean; items?: ItemPlantillaInput[] },
  ) {
    const { data } = await api.patch<PlantillaChecklist>(`/v1/checklist-plantillas/${id}`, payload);
    return data;
  },

  /** No borra: desactiva. Las OT que la usaron conservan sus ítems. */
  async desactivar(id: string) {
    const { data } = await api.delete<{ id: string; activo: boolean }>(`/v1/checklist-plantillas/${id}`);
    return data;
  },
};
