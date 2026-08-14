import { api, type RespuestaPaginada } from './api';
import type {
  Material,
  CrearMaterialInput,
  EditarMaterialInput,
  AjusteStock,
  Remito,
  CrearRemitoInput,
  StockCuadrillaItem,
  ConsumoOrden,
  ItemRemitoInput,
  Presupuesto,
  CrearPresupuestoInput,
} from '@/types/atlas';

/**
 * Materiales y movimientos de stock (Pedido 7).
 *
 * El depósito lleva stock por cantidad; cada cuadrilla tiene su propio stock
 * cargado por remitos. Las series de los equipos no son un inventario aparte:
 * quedan registradas en la línea del remito con la que se entregaron.
 */

// ------------------------------------------------------------- catálogo ---

export interface FiltroMateriales {
  q?: string;
  categoria?: string;
  activo?: boolean;
  /** Solo los que están en el mínimo o por debajo. */
  bajo_stock?: boolean;
  page?: number;
  per_page?: number;
}

export const materialesApi = {
  async listar(params?: FiltroMateriales) {
    const { data } = await api.get<RespuestaPaginada<Material>>('/v1/materiales', { params });
    return data;
  },

  async categorias() {
    const { data } = await api.get<{ data: string[] }>('/v1/materiales/categorias');
    return data.data;
  },

  /**
   * Resuelve lo que salió del lector. Devuelve null cuando el código no es un
   * producto: en las etiquetas de los modems conviven el código del producto y
   * el número de serie, así que un código desconocido se interpreta como serie.
   */
  async buscarPorCodigo(codigo: string) {
    const { data } = await api.get<{ material: Material | null }>('/v1/materiales/buscar', {
      params: { codigo },
    });
    return data.material;
  },

  async crear(payload: CrearMaterialInput) {
    const { data } = await api.post<Material>('/v1/materiales', payload);
    return data;
  },

  async actualizar(id: string, payload: EditarMaterialInput) {
    const { data } = await api.patch<Material>(`/v1/materiales/${id}`, payload);
    return data;
  },

  async eliminar(id: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/materiales/${id}`);
    return data;
  },

  /** Recuento masivo: fija el stock de varios materiales de una sola vez. */
  async actualizarStock(ajustes: AjusteStock[]) {
    const { data } = await api.post<{ actualizados: number }>('/v1/materiales/stock', { ajustes });
    return data;
  },

  /**
   * Le arma un código de barras al material que no tiene ninguno: es lo que
   * hace falta para poder etiquetar lo que se compró suelto.
   *
   * Sin `forzar`, si ya tiene uno se devuelve el mismo — pedirlo dos veces no
   * rompe nada ni cambia la etiqueta ya impresa.
   */
  async generarCodigoBarras(id: string, forzar = false) {
    const { data } = await api.post<Material>(`/v1/materiales/${id}/codigo-barras`, { forzar });
    return data;
  },

  /** Lo mismo para todos los que no tienen; con `ids`, solo para esos. */
  async generarCodigosFaltantes(ids?: string[]) {
    const { data } = await api.post<{ generados: number; data: Material[] }>(
      '/v1/materiales/codigos-barras',
      ids ? { material_ids: ids } : {},
    );
    return data;
  },
};

// -------------------------------------------------------------- remitos ---

export interface FiltroRemitos {
  tipo?: string;
  destino_tipo?: string;
  estado?: string;
  cuadrilla_id?: string;
  empleado_id?: string;
  /** Busca el remito en el que se entregó ese número de serie. */
  serie?: string;
  q?: string;
  page?: number;
  per_page?: number;
}

export const remitosApi = {
  async listar(params?: FiltroRemitos) {
    const { data } = await api.get<RespuestaPaginada<Remito>>('/v1/remitos', { params });
    return data;
  },

  async detalle(id: string) {
    const { data } = await api.get<Remito>(`/v1/remitos/${id}`);
    return data;
  },

  async crear(payload: CrearRemitoInput) {
    const { data } = await api.post<Remito>('/v1/remitos', payload);
    return data;
  },

  /** Corrige un remito emitido: conserva número y fecha, recalcula el stock. */
  async actualizar(id: string, payload: Partial<CrearRemitoInput>) {
    const { data } = await api.patch<Remito>(`/v1/remitos/${id}`, payload);
    return data;
  },

  async anular(id: string) {
    const { data } = await api.post<Remito>(`/v1/remitos/${id}/anular`);
    return data;
  },
};

// --------------------------------------------------------- presupuestos ---

export interface FiltroPresupuestos {
  estado?: string;
  q?: string;
  page?: number;
  per_page?: number;
}

export const presupuestosApi = {
  async listar(params?: FiltroPresupuestos) {
    const { data } = await api.get<RespuestaPaginada<Presupuesto>>('/v1/presupuestos', { params });
    return data;
  },

  async detalle(id: string) {
    const { data } = await api.get<Presupuesto>(`/v1/presupuestos/${id}`);
    return data;
  },

  async crear(payload: CrearPresupuestoInput) {
    const { data } = await api.post<Presupuesto>('/v1/presupuestos', payload);
    return data;
  },

  async actualizar(id: string, payload: Partial<CrearPresupuestoInput>) {
    const { data } = await api.patch<Presupuesto>(`/v1/presupuestos/${id}`, payload);
    return data;
  },

  /** Hace efectiva la salida: descuenta del stock general del depósito. */
  async despachar(id: string) {
    const { data } = await api.post<Presupuesto>(`/v1/presupuestos/${id}/despachar`);
    return data;
  },

  async anular(id: string) {
    const { data } = await api.post<Presupuesto>(`/v1/presupuestos/${id}/anular`);
    return data;
  },
};

// ---------------------------------------------------------------- stock ---

export const stockApi = {
  /** Lo que la cuadrilla tiene arriba del vehículo. */
  async deCuadrilla(cuadrillaId: string) {
    const { data } = await api.get<{ cuadrilla_id: string; data: StockCuadrillaItem[] }>(
      `/v1/cuadrillas/${cuadrillaId}/stock`,
    );
    return data.data;
  },

  async materialesDeOrden(ordenId: string) {
    const { data } = await api.get<{ orden_id: string; data: ConsumoOrden[] }>(
      `/v1/ordenes/${ordenId}/materiales`,
    );
    return data.data;
  },

  /** Registra consumo y lo descuenta del stock de la cuadrilla de la orden. */
  async agregarMaterialAOrden(ordenId: string, items: ItemRemitoInput[]) {
    const { data } = await api.post<{ orden_id: string; data: ConsumoOrden[] }>(
      `/v1/ordenes/${ordenId}/materiales`,
      { items },
    );
    return data.data;
  },

  async quitarMaterialDeOrden(consumoId: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(
      `/v1/orden-materiales/${consumoId}`,
    );
    return data;
  },
};
