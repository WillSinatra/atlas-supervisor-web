import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type {
  DashboardData,
  Sla,
  Orden,
  Cliente,
  Domicilio,
  Cuadrilla,
  Usuario,
  Archivo,
  EventoOrden,
} from '../../types/atlas';

/**
 * Cliente HTTP de la API Atlas.
 *
 * La URL sale del .env del front (Vite la incrusta en el build; cambiarla en el
 * server no tiene efecto, hay que recompilar):
 *   VITE_API_URL=https://proyectoatlas.dnatech.net.ar/api
 */
const API_URL =  'https://proyectoatlas.dnatech.net.ar/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// --------------------------------------------------------------- sesión ---
// Se mantienen las mismas claves de localStorage que ya usa el proyecto.

export interface UsuarioSesion {
  id: string;
  rol: 'admin' | 'planificador' | 'despachador' | 'tecnico' | 'operador';
  cuadrilla_id: string | null;
}

export const sesion = {
  getAccess: () => localStorage.getItem('accessToken'),
  getRefresh: () => localStorage.getItem('refreshToken'),
  getUsuario(): UsuarioSesion | null {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
  },
  guardar(accessToken: string, refreshToken: string, usuario: UsuarioSesion) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(usuario));
  },
  limpiar() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};

// Interceptor para agregar token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sesion.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Refresh automático. El access token dura 15 minutos.
 *
 * Importante: la API devuelve { "accessToken": "..." } plano (sin envoltorio
 * "data") y NO rota el refresh token, así que el refresh original se conserva.
 *
 * Las requests que fallan mientras se está renovando quedan en cola y se
 * reintentan con el token nuevo, para no disparar varios refresh en paralelo.
 */
let renovando = false;
let cola: Array<(token: string | null) => void> = [];

const procesarCola = (token: string | null) => {
  cola.forEach((resolver) => resolver(token));
  cola = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (renovando) {
      return new Promise((resolve, reject) => {
        cola.push((token) => {
          if (!token) return reject(error);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    renovando = true;

    try {
      const refreshToken = sesion.getRefresh();
      if (!refreshToken) throw new Error('No refresh token');

      // Respuesta: { accessToken: "..." }
      const { data } = await axios.post<{ accessToken: string }>(
        `${API_URL}/v1/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );

      localStorage.setItem('accessToken', data.accessToken);
      procesarCola(data.accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      }
      return api(originalRequest);
    } catch {
      procesarCola(null);
      sesion.limpiar();
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      renovando = false;
    }
  },
);

// --------------------------------------------------------------- errores ---

export interface ApiError {
  error: string;
  message: string;
  detalles?: string[];
}

/** Mensaje legible del envoltorio de error de la API. */
export function mensajeDeError(e: unknown): string {
  const err = e as AxiosError<ApiError>;
  return err.response?.data?.message ?? 'No se pudo conectar con el servidor.';
}

/** Campos que la API marcó como inválidos (VALIDATION_ERROR). */
export function camposInvalidos(e: unknown): string[] {
  const err = e as AxiosError<ApiError>;
  return err.response?.data?.detalles ?? [];
}

// -------------------------------------------------------------- paginado ---

export interface Paginacion {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface RespuestaPaginada<T> {
  data: T[];
  pagination: Paginacion;
}

// ------------------------------------------------------------------ auth ---

export const authApi = {
  /** Guarda los tokens y devuelve { accessToken, refreshToken, user }. */
  async login(credenciales: { email: string; password: string }) {
    const { data } = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: UsuarioSesion;
    }>('/v1/auth/login', credenciales);
    sesion.guardar(data.accessToken, data.refreshToken, data.user);
    return data;
  },
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/v1/auth/refresh', { refreshToken }),
  /** No hay endpoint de logout: la sesión se cierra descartando los tokens. */
  logout() {
    sesion.limpiar();
  },
};

// ------------------------------------------------------------- dashboard ---

export const dashboardApi = {
  /**
   * Resumen del panel. La respuesta NO viene envuelta en { data: ... }:
   * este método ya devuelve el objeto DashboardData listo para usar.
   */
  async get(params?: { ventana_sla?: number; recientes?: number; actividad?: number }) {
    const { data } = await api.get<DashboardData>('/v1/dashboard', { params });
    return data;
  },
};

export const slasApi = {
  async listar() {
    const { data } = await api.get<{ data: Sla[] }>('/v1/slas');
    return data.data;
  },
};

// ---------------------------------------------------------------- órdenes ---

export const ordenesApi = {
  async listar(params?: Record<string, string | number>) {
    const { data } = await api.get<RespuestaPaginada<Orden>>('/v1/ordenes', { params });
    return data;
  },
  async detalle(id: string) {
    const { data } = await api.get<Orden & { linea_tiempo: EventoOrden[] }>(`/v1/ordenes/${id}`);
    return data;
  },
  async crear(payload: Partial<Orden>) {
    const { data } = await api.post<Orden>('/v1/ordenes', payload);
    return data;
  },
  async actualizar(id: string, payload: Partial<Orden>) {
    const { data } = await api.patch<Orden>(`/v1/ordenes/${id}`, payload);
    return data;
  },
  async asignar(id: string, cuadrilla_id: string) {
    const { data } = await api.post<Orden>(`/v1/ordenes/${id}/assign`, { cuadrilla_id });
    return data;
  },
  async aceptar(id: string) {
    const { data } = await api.post<Orden>(`/v1/ordenes/${id}/accept`);
    return data;
  },
  async rechazar(id: string, motivo: string) {
    const { data } = await api.post<Orden>(`/v1/ordenes/${id}/reject`, { motivo });
    return data;
  },
  async checkin(id: string, coords?: { lat: number; lng: number }) {
    const { data } = await api.post<Orden>(`/v1/ordenes/${id}/checkin`, coords ?? {});
    return data;
  },
  async completar(id: string, payload: Record<string, unknown> = {}) {
    const { data } = await api.post<Orden>(`/v1/ordenes/${id}/complete`, payload);
    return data;
  },
  async cancelar(id: string, motivo: string) {
    const { data } = await api.post<Orden>(`/v1/ordenes/${id}/cancel`, { motivo });
    return data;
  },
};

// --------------------------------------------------------------- archivos ---

export const archivosApi = {
  async subirFirma(ordenId: string, archivo: File) {
    const form = new FormData();
    form.append('archivo', archivo);
    const { data } = await api.post<Archivo>(`/v1/ordenes/${ordenId}/firma`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async subirFoto(
    ordenId: string,
    archivo: File,
    tipo: 'foto' | 'foto_antes' | 'foto_despues' = 'foto',
  ) {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('tipo', tipo);
    const { data } = await api.post<Archivo>(`/v1/ordenes/${ordenId}/fotos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async listarFotos(ordenId: string) {
    const { data } = await api.get<{ orden_id: string; fotos: Archivo[] }>(
      `/v1/ordenes/${ordenId}/fotos`,
    );
    return data.fotos;
  },
  /**
   * La descarga exige el header Authorization, así que un <img src="/v1/archivos/x">
   * directo devuelve 401. Se baja como blob y se arma un object URL.
   * Acordate de revocarlo con URL.revokeObjectURL() al desmontar.
   */
  async urlDeArchivo(archivoId: string) {
    const { data } = await api.get<Blob>(`/v1/archivos/${archivoId}`, { responseType: 'blob' });
    return URL.createObjectURL(data);
  },
};

// --------------------------------------------------------------- clientes ---

export const clientesApi = {
  async listar(params?: { q?: string; page?: number; per_page?: number }) {
    const { data } = await api.get<RespuestaPaginada<Cliente>>('/v1/clientes', { params });
    return data;
  },
  async detalle(id: string) {
    const { data } = await api.get<Cliente>(`/v1/clientes/${id}`);
    return data;
  },
  async crear(payload: Partial<Cliente> & { domicilio?: Partial<Domicilio> }) {
    const { data } = await api.post<Cliente>('/v1/clientes', payload);
    return data;
  },
  async actualizar(id: string, payload: Partial<Cliente>) {
    const { data } = await api.patch<Cliente>(`/v1/clientes/${id}`, payload);
    return data;
  },
  async eliminar(id: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/clientes/${id}`);
    return data;
  },
  async historial(id: string) {
    const { data } = await api.get<{ cliente_id: string; ordenes: Orden[] }>(
      `/v1/clientes/${id}/ordenes`,
    );
    return data.ordenes;
  },
  async domicilios(id: string) {
    const { data } = await api.get<{ cliente_id: string; domicilios: Domicilio[] }>(
      `/v1/clientes/${id}/domicilios`,
    );
    return data.domicilios;
  },
  async agregarDomicilio(id: string, payload: Partial<Domicilio>) {
    const { data } = await api.post<Domicilio>(`/v1/clientes/${id}/domicilios`, payload);
    return data;
  },
  async eliminarDomicilio(domicilioId: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(
      `/v1/domicilios/${domicilioId}`,
    );
    return data;
  },
};

// ------------------------------------------------------------- cuadrillas ---

export const cuadrillasApi = {
  async listar(params?: { estado?: string }) {
    const { data } = await api.get<RespuestaPaginada<Cuadrilla>>('/v1/cuadrillas', { params });
    return data;
  },
  async detalle(id: string) {
    const { data } = await api.get<Cuadrilla>(`/v1/cuadrillas/${id}`);
    return data;
  },
  async crear(payload: Partial<Cuadrilla>) {
    const { data } = await api.post<Cuadrilla>('/v1/cuadrillas', payload);
    return data;
  },
  async actualizar(id: string, payload: Partial<Cuadrilla>) {
    const { data } = await api.patch<Cuadrilla>(`/v1/cuadrillas/${id}`, payload);
    return data;
  },
  async eliminar(id: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/cuadrillas/${id}`);
    return data;
  },
};

// --------------------------------------------------------------- usuarios ---

export const usuariosApi = {
  async listar(params?: { rol?: string; activo?: boolean; page?: number; per_page?: number }) {
    const { data } = await api.get<RespuestaPaginada<Usuario>>('/v1/usuarios', { params });
    return data;
  },
  async detalle(id: string) {
    const { data } = await api.get<Usuario>(`/v1/usuarios/${id}`);
    return data;
  },
  async crear(payload: Partial<Usuario> & { password: string }) {
    const { data } = await api.post<Usuario>('/v1/usuarios', payload);
    return data;
  },
  async actualizar(id: string, payload: Partial<Usuario> & { password?: string }) {
    const { data } = await api.patch<Usuario>(`/v1/usuarios/${id}`, payload);
    return data;
  },
  async eliminar(id: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/usuarios/${id}`);
    return data;
  },
  /** Cambio de la contraseña propia (cualquier usuario autenticado). */
  async cambiarMiPassword(password_actual: string, password_nueva: string) {
    const { data } = await api.post<{ actualizado: boolean }>('/v1/usuarios/me/password', {
      password_actual,
      password_nueva,
    });
    return data;
  },
  /** Reset por admin. Con { generar: true } devuelve la contraseña una sola vez. */
  async resetearPassword(id: string, payload: { password?: string; generar?: boolean }) {
    const { data } = await api.post<{
      id: string;
      actualizado: boolean;
      password_generada?: string;
    }>(`/v1/usuarios/${id}/password`, payload);
    return data;
  },
};

/* ---------------------------------------------------------------------------
 * Compatibilidad con los nombres anteriores.
 *
 * Se mantienen para que las pantallas que todavía importan `ordersApi`,
 * `crewsApi`, `customersApi` o `usersApi` sigan compilando mientras se migran.
 * Apuntan a los endpoints reales, pero los datos ya vienen en español: cada
 * pantalla hay que adaptarla igual.
 *
 * NO existen en la API y quedaron fuera a propósito:
 *   authApi.register / logout(server) / profile
 *   ordersApi.stats · crewsApi.map · crewsApi.updateLocation
 *   customersApi.byDocument
 *   reportsApi.*  ·  settingsApi.*  ·  notificationsApi.*
 * Las pantallas que los usen van a fallar hasta que se implementen en el back.
 * ------------------------------------------------------------------------- */
export const ordersApi = ordenesApi;
export const crewsApi = cuadrillasApi;
export const customersApi = clientesApi;
export const usersApi = usuariosApi;
/* Módulos todavía no implementados en el backend.
 * Devuelven valores vacíos para que la UI compile y no rompa. */
const vacioPaginado = async () => ({
  data: { data: [], pagination: { page: 1, per_page: 0, total: 0, total_pages: 0 } },
});

export const notificationsApi = {
  list: async (_params?: Record<string, unknown>) => ({
    data: { data: [], pagination: { page: 1, per_page: 0, total: 0, total_pages: 0 } },
  }),
  unreadCount: async () => ({ data: { count: 0 } }),
  markAsRead: async (_id: string) => ({ data: { ok: true } }),
  markAllAsRead: async () => ({ data: { ok: true } }),
};

export const reportsApi = {
  kpi: vacioPaginado,
  productivity: vacioPaginado,
  sla: vacioPaginado,
  materials: vacioPaginado,
};

export const settingsApi = {
  configs: vacioPaginado,
  config: vacioPaginado,
  setConfig: vacioPaginado,
  slas: async () => ({ data: await slasApi.listar() }),
  createSla: vacioPaginado,
  auditLogs: vacioPaginado,
};
export default api;