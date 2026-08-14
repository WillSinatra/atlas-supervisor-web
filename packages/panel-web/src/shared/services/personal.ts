import { api, type RespuestaPaginada } from './api';
import { almacenAreas, almacenEmpleados, esEndpointNoPublicado, paginar } from './respaldoLocal';
import type {
  AccesoGuardado,
  Area,
  CrearAreaInput,
  EditarAreaInput,
  Empleado,
  CrearEmpleadoInput,
  EditarEmpleadoInput,
  EstadoEmpleado,
  GuardarAccesoInput,
} from '@/types/atlas';

/**
 * Áreas de trabajo y padrón de empleados.
 *
 * Los endpoints están implementados en el backend (Pedido 5, ver
 * docs/pedido-5-empleados-y-areas.md). Si la API no responde —backend sin
 * desplegar o migración sin correr— cada método cae al respaldo local en
 * localStorage (ver respaldoLocal.ts). Las pantallas no se enteran: usan estos
 * métodos igual en los dos escenarios.
 */

// ------------------------------------------------------------------ áreas ---

export interface FiltroAreas {
  q?: string;
  /** Sin especificar trae activas e inactivas. */
  activo?: boolean;
}

function coincideArea(area: Area, filtro?: FiltroAreas): boolean {
  if (filtro?.activo !== undefined && area.activo !== filtro.activo) return false;
  if (filtro?.q && !area.nombre.toLowerCase().includes(filtro.q.trim().toLowerCase())) return false;
  return true;
}

export const areasApi = {
  async listar(params?: FiltroAreas) {
    try {
      const { data } = await api.get<RespuestaPaginada<Area>>('/v1/areas', { params });
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      return paginar(almacenAreas.listar((area) => coincideArea(area, params)));
    }
  },

  async crear(payload: CrearAreaInput) {
    try {
      const { data } = await api.post<Area>('/v1/areas', payload);
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      const nombre = payload.nombre.trim();
      if (almacenAreas.listar().some((a) => a.nombre.toLowerCase() === nombre.toLowerCase())) {
        throw new Error('Ya existe un área con ese nombre.');
      }
      return almacenAreas.crear({
        nombre,
        descripcion: payload.descripcion ?? null,
        activo: payload.activo ?? true,
      });
    }
  },

  async actualizar(id: string, payload: EditarAreaInput) {
    try {
      const { data } = await api.patch<Area>(`/v1/areas/${id}`, payload);
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      const nombre = payload.nombre?.trim();
      if (
        nombre &&
        almacenAreas.listar().some((a) => a.id !== id && a.nombre.toLowerCase() === nombre.toLowerCase())
      ) {
        throw new Error('Ya existe un área con ese nombre.');
      }
      return almacenAreas.actualizar(id, { ...payload, nombre });
    }
  },

  /** El backend debe rechazar el borrado si el área tiene empleados (409). */
  async eliminar(id: string) {
    try {
      const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/areas/${id}`);
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      const asignados = almacenEmpleados.listar((emp) => emp.area_id === id).length;
      if (asignados > 0) {
        throw new Error(
          `No se puede eliminar: el área tiene ${asignados} empleado${asignados === 1 ? '' : 's'} asignado${
            asignados === 1 ? '' : 's'
          }. Movelos a otra área primero.`,
        );
      }
      return almacenAreas.eliminar(id);
    }
  },
};

// -------------------------------------------------------------- empleados ---

export interface FiltroEmpleados {
  /** El filtro que hace útil al módulo: quién puede tomar un ticket o una OT. */
  area_id?: string;
  estado?: EstadoEmpleado;
  q?: string;
  /** Solo los que todavía no son técnicos de ninguna cuadrilla. */
  sin_cuadrilla?: boolean;
  /** Solo los que tienen (o no tienen) cuenta para iniciar sesión. */
  con_acceso?: boolean;
  page?: number;
  per_page?: number;
}

function coincideEmpleado(empleado: Empleado, filtro?: FiltroEmpleados): boolean {
  // sin_cuadrilla no se puede resolver acá: las cuadrillas viven en la API.
  // En modo respaldo se listan todos, que es lo más útil de las dos opciones.
  if (filtro?.area_id && empleado.area_id !== filtro.area_id) return false;
  if (filtro?.estado && empleado.estado !== filtro.estado) return false;
  if (filtro?.q) {
    const q = filtro.q.trim().toLowerCase();
    const campos = [empleado.nombre, empleado.legajo, empleado.documento, empleado.puesto, empleado.email, empleado.telefono];
    if (!campos.some((campo) => (campo ?? '').toLowerCase().includes(q))) return false;
  }
  return true;
}

export const empleadosApi = {
  async listar(params?: FiltroEmpleados) {
    try {
      const { data } = await api.get<RespuestaPaginada<Empleado>>('/v1/empleados', { params });
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      return paginar(almacenEmpleados.listar((empleado) => coincideEmpleado(empleado, params)));
    }
  },

  async detalle(id: string) {
    try {
      const { data } = await api.get<Empleado>(`/v1/empleados/${id}`);
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      return almacenEmpleados.obtener(id);
    }
  },

  async crear(payload: CrearEmpleadoInput) {
    try {
      const { data } = await api.post<Empleado>('/v1/empleados', payload);
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      return almacenEmpleados.crear({
        nombre: payload.nombre.trim(),
        area_id: payload.area_id,
        legajo: payload.legajo ?? null,
        documento: payload.documento ?? null,
        puesto: payload.puesto ?? null,
        email: payload.email ?? null,
        telefono: payload.telefono ?? null,
        estado: payload.estado ?? 'activo',
        fecha_ingreso: payload.fecha_ingreso ?? null,
        notas: payload.notas ?? null,
      });
    }
  },

  async actualizar(id: string, payload: EditarEmpleadoInput) {
    try {
      const { data } = await api.patch<Empleado>(`/v1/empleados/${id}`, payload);
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      return almacenEmpleados.actualizar(id, payload);
    }
  },

  async eliminar(id: string) {
    try {
      const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/empleados/${id}`);
      return data;
    } catch (e) {
      if (!esEndpointNoPublicado(e)) throw e;
      return almacenEmpleados.eliminar(id);
    }
  },
};

// ----------------------------------------------------------------- acceso ---

/**
 * La cuenta con la que el empleado inicia sesión (Pedido 9, ver
 * docs/pedido-9-acceso-de-empleados.md).
 *
 * A diferencia del resto del archivo, acá NO hay respaldo en localStorage a
 * propósito: una credencial guardada en el navegador no serviría para entrar a
 * ningún lado, y hacer como que se guardó sería mentirle a quien la crea. Si el
 * endpoint no está, el error se muestra tal cual.
 *
 * Solo admin: la API responde 403 a los demás roles.
 */
export const accesoApi = {
  /** Alta o edición. Devuelve `password_generada` solo si se pidió generarla. */
  async guardar(empleadoId: string, payload: GuardarAccesoInput) {
    const { data } = await api.post<AccesoGuardado>(`/v1/empleados/${empleadoId}/acceso`, payload);
    return data;
  },

  /** Le saca la cuenta. El empleado sigue en el padrón. */
  async revocar(empleadoId: string) {
    const { data } = await api.delete<{ empleado_id: string; revocado: boolean }>(
      `/v1/empleados/${empleadoId}/acceso`,
    );
    return data;
  },

  /** Con { generar: true } devuelve la contraseña nueva una sola vez. */
  async resetearPassword(empleadoId: string, payload: { password?: string; generar?: boolean }) {
    const { data } = await api.post<{
      empleado_id: string;
      actualizado: boolean;
      password_generada?: string;
    }>(`/v1/empleados/${empleadoId}/password`, payload);
    return data;
  },
};
