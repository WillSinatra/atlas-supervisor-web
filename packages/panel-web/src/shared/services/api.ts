/// <reference types="vite/client" />
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type {
  DashboardData,
  Sla,
  Orden,
  Cliente,
  Domicilio,
  Cuadrilla,
  Usuario,
  Perfil,
  Archivo,
  EventoOrden,
  Tecnico,
  Vehiculo,
  MantenimientoVehiculo,
  FlotaGps,
  TicketBeta,
  CrearOrdenInput,
  EditarOrdenInput,
  ResultadoCascada,
  OfertaDespacho,
} from '../../types/atlas';

/**
 * Cliente HTTP de la API Atlas.
 *
 * La URL sale del .env del front (Vite la incrusta en el build; cambiarla en el
 * server no tiene efecto, hay que recompilar):
 *   VITE_API_URL=https://proyectoatlas.dnatech.net.ar/api
 */
const API_URL = import.meta.env.VITE_API_URL || 'https://proyectoatlas.dnatech.net.ar/api';

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
  rol: 'admin' | 'planificador' | 'despachador' | 'tecnico' | 'operador' | 'panolero';
  cuadrilla_id: string | null;
  /**
   * Desde el Pedido 9 la cuenta cuelga de un empleado del padrón y la API
   * devuelve también estos campos. Son opcionales porque una sesión guardada
   * de antes de ese cambio no los tiene.
   */
  nombre?: string;
  email?: string;
  empleado_id?: string | null;
  acceso_panel?: boolean;
  acceso_app?: boolean;
  /** Para la app móvil: el técnico de cuadrilla ligado a ese empleado. */
  tecnico_id?: string | null;
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

/**
 * Renovación del access token.
 *
 * El access dura 15 minutos, el refresh 30 días, y la API **no rota** el
 * refresh: el original se conserva y sirve para renovar todas las veces que
 * haga falta.
 *
 * Hay dos caminos, y el que importa es el primero:
 *
 * 1. **Antes de que venza.** Cada request mira cuánto le queda al token y, si
 *    está por expirar, lo renueva antes de salir. Trabajando normalmente nunca
 *    se llega a ver un 401.
 * 2. **Después de un 401**, como red de seguridad: si igual salió con el token
 *    vencido (la pestaña estuvo dormida, el reloj se corrió), se renueva y se
 *    reintenta la request original una sola vez.
 *
 * Las renovaciones concurrentes comparten una única promesa: diez requests que
 * salen juntas disparan un solo refresh, no diez.
 */

/** Cuántos segundos le quedan al token, o null si no se puede leer. */
function segundosRestantes(token: string | null): number | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp - Math.floor(Date.now() / 1000) : null;
  } catch {
    return null;
  }
}

/** Margen con el que se renueva por adelantado. */
const MARGEN_RENOVACION = 90;

/** Solo esto significa "tu sesión terminó". Un corte de red NO. */
class SesionVencida extends Error {}

let renovacion: Promise<string> | null = null;

async function renovarAccess(): Promise<string> {
  if (renovacion) return renovacion;

  renovacion = (async () => {
    const refreshToken = sesion.getRefresh();
    if (!refreshToken) throw new SesionVencida('No hay refresh token');

    try {
      // Con axios pelado a propósito: si usara la instancia, entraría de nuevo
      // en este mismo interceptor.
      const { data } = await axios.post<{ accessToken: string }>(
        `${API_URL}/v1/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
      );
      localStorage.setItem('accessToken', data.accessToken);
      return data.accessToken;
    } catch (e) {
      const estado = (e as AxiosError).response?.status;
      // La sesión solo está muerta si el server lo dijo. Un corte de red o un
      // 500 pasajero no pueden echar a nadie: eso era lo que dejaba a la gente
      // afuera en medio del trabajo.
      if (estado === 401 || estado === 403) {
        throw new SesionVencida('El refresh token ya no sirve');
      }
      throw e;
    }
  })();

  try {
    return await renovacion;
  } finally {
    renovacion = null;
  }
}

function cerrarSesionYSalir(): void {
  sesion.limpiar();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

const esEndpointDeAuth = (url?: string): boolean =>
  !!url && (url.includes('/auth/login') || url.includes('/auth/refresh'));

// Cada request lleva el token; y si está por vencerse, primero lo renueva.
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = sesion.getAccess();

  if (token && !esEndpointDeAuth(config.url)) {
    const restan = segundosRestantes(token);
    if (restan !== null && restan < MARGEN_RENOVACION) {
      try {
        token = await renovarAccess();
      } catch (e) {
        if (e instanceof SesionVencida) {
          cerrarSesionYSalir();
        }
        // Si fue la red, se manda igual con el token que hay: puede que todavía
        // sirva, y si no, el 401 de abajo lo reintenta.
      }
    }
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _reintentada?: boolean }) | undefined;

    if (error.response?.status !== 401 || !original || original._reintentada || esEndpointDeAuth(original.url)) {
      return Promise.reject(error);
    }

    original._reintentada = true;

    try {
      const token = await renovarAccess();
      if (original.headers) {
        original.headers.Authorization = `Bearer ${token}`;
      }
      return await api(original);
    } catch (e) {
      if (e instanceof SesionVencida) {
        cerrarSesionYSalir();
      }
      return Promise.reject(error);
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
  if (err?.response?.data?.message) return err.response.data.message;
  // Los errores que arma el propio panel (validaciones del respaldo local, por
  // ejemplo) ya traen un mensaje en español: mostrarlo en vez del genérico.
  if (!err?.isAxiosError && e instanceof Error && e.message) return e.message;
  return 'No se pudo conectar con el servidor.';
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
    }>('/v1/auth/login', {
      ...credenciales,
      // El panel web y la app del técnico son dos sistemas distintos: cada
      // cuenta declara a cuál entra. Si no tiene habilitado este, la API
      // responde 403 con el motivo (en vez de dejar entrar a cualquiera).
      sistema: 'panel',
    });
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
  async crear(payload: CrearOrdenInput) {
    const { data } = await api.post<Orden & { duplicado?: boolean }>('/v1/ordenes', payload);
    return data;
  },
  async actualizar(id: string, payload: EditarOrdenInput) {
    const { data } = await api.patch<Orden>(`/v1/ordenes/${id}`, payload);
    return data;
  },
  /**
   * Arranca la cascada: le ofrece la orden a la cuadrilla disponible más
   * cercana y, si no responde, el cron se la pasa a la siguiente.
   *
   * Devuelve 200 aunque no haya ofrecido: `motivo` explica por qué (fuera de
   * horario, domicilio sin coordenadas, nadie cerca).
   */
  /** Cómo va la cascada: a quién se le ofreció y qué contestó. */
  async ofertas(id: string) {
    const { data } = await api.get<{ orden_id: string; ofertas: OfertaDespacho[] }>(
      `/v1/ordenes/${id}/ofertas`,
    );
    return data.ofertas;
  },
  async dispararCascada(id: string) {
    const { data } = await api.post<ResultadoCascada>(`/v1/ordenes/${id}/despacho/cascada`);
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

// ------------------------------------------------------------ tickets beta ---

export const ticketsBetaApi = {
  async crear(payload: Partial<TicketBeta>) {
    const { data } = await api.post<TicketBeta>("/v1/tickets-beta", payload);
    return data;
  },
  async listar(params?: Record<string, string | number>) {
    const { data } = await api.get<RespuestaPaginada<TicketBeta>>("/v1/tickets-beta", { params });
    return data;
  },
  /** Corregir un ticket ya cargado. Se puede tocar todo, estado incluido. */
  async actualizar(id: string, payload: Partial<TicketBeta>) {
    const { data } = await api.patch<TicketBeta>(`/v1/tickets-beta/${id}`, payload);
    return data;
  },
  /**
   * Cierra el reclamo sin generar orden de trabajo: es el desenlace normal
   * cuando N2 lo resuelve por teléfono. La resolución se agrega a la
   * descripción, no la pisa.
   */
  async resolver(id: string, resolucion: string) {
    const { data } = await api.post<TicketBeta>(`/v1/tickets-beta/${id}/resolver`, { resolucion });
    return data;
  },
  async reabrir(id: string) {
    const { data } = await api.post<TicketBeta>(`/v1/tickets-beta/${id}/reabrir`);
    return data;
  },
};

// --------------------------------------------------------------- archivos ---

/**
 * El id del archivo, venga solo o dentro de su ruta.
 *
 * La API devuelve el id pelado en el listado de fotos, pero guarda la ruta
 * completa en `orden.firma_cliente` y `orden.foto_despues`. Las dos formas
 * llegan al panel, así que se normalizan acá en vez de en cada llamador.
 */
function idODesdeRuta(valor: string): string {
  const limpio = valor.trim().replace(/\/+$/, '');
  return limpio.includes('/') ? limpio.slice(limpio.lastIndexOf('/') + 1) : limpio;
}

export const archivosApi = {
  /**
   * Adjunta una imagen al ticket. Se pueden subir varias: la foto que manda el
   * cliente suele explicar el reclamo mejor que la descripción.
   */
  async subirFotoTicket(ticketId: string, archivo: File) {
    const form = new FormData();
    form.append('archivo', archivo);
    const { data } = await api.post<Archivo>(`/v1/tickets-beta/${ticketId}/fotos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async fotosDeTicket(ticketId: string) {
    const { data } = await api.get<{ ticket_id: string; fotos: Archivo[] }>(
      `/v1/tickets-beta/${ticketId}/fotos`,
    );
    return data.fotos;
  },

  /** Solo adjuntos de ticket: la evidencia de una orden no se borra. */
  async eliminar(archivoId: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(
      `/v1/archivos/${archivoId}`,
    );
    return data;
  },

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
   *
   * Acepta tanto el id pelado como la ruta completa: `orden.firma_cliente` y
   * `orden.foto_despues` guardan la **URL** del archivo (`/v1/archivos/{id}`),
   * no el id —el campo está definido como "referencia/URL"—, y pasarlos tal
   * cual armaba `/v1/archivos//v1/archivos/{id}` y devolvía 404.
   */
  async urlDeArchivo(idORuta: string) {
    const id = idODesdeRuta(idORuta);
    const { data } = await api.get<Blob>(`/v1/archivos/${id}`, { responseType: 'blob' });
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
  /** Corregir la dirección o cargarle las coordenadas a un domicilio ya creado. */
  async actualizarDomicilio(
    domicilioId: string,
    payload: { direccion?: string; lat?: number | null; lng?: number | null },
  ) {
    const { data } = await api.patch<Domicilio>(`/v1/domicilios/${domicilioId}`, payload);
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
  // codigo, especialidad y zona ya se pueden editar: el PATCH del backend los
  // acepta desde el Pedido 11. Antes tiraban 400 y por eso el panel los mostraba
  // deshabilitados.
  async actualizar(
    id: string,
    payload: Partial<{
      nombre: string;
      estado: string;
      codigo: string | null;
      especialidad: string | null;
      zona: string | null;
      lat: number;
      lng: number;
    }>,
  ) {
    const { data } = await api.patch<Cuadrilla>(`/v1/cuadrillas/${id}`, payload);
    return data;
  },
  async eliminar(id: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/cuadrillas/${id}`);
    return data;
  },
  // Con empleado_id el técnico sale del padrón (forma nueva). El alta a mano
  // con nombre suelto se mantiene por compatibilidad.
  async agregarTecnico(
    cuadrillaId: string,
    payload: { empleado_id?: string; nombre?: string; telefono?: string },
  ) {
    const { data } = await api.post<Tecnico>(`/v1/cuadrillas/${cuadrillaId}/tecnicos`, payload);
    return data;
  },
  async actualizarTecnico(id: string, payload: Partial<Pick<Tecnico, "nombre" | "telefono" | "estado">>) {
    const { data } = await api.patch<Tecnico>(`/v1/tecnicos/${id}`, payload);
    return data;
  },
  async eliminarTecnico(id: string) {
    const { data } = await api.delete<{ id: string; eliminado: boolean }>(`/v1/tecnicos/${id}`);
    return data;
  },
  async actualizarVehiculo(cuadrillaId: string, payload: Partial<Omit<Vehiculo, "id" | "cuadrilla_id">>) {
    const { data } = await api.patch<Vehiculo>(`/v1/cuadrillas/${cuadrillaId}/vehiculo`, payload);
    return data;
  },
  /** Historial de servicios/reparaciones cargados por los técnicos al vehículo, más reciente primero. */
  async mantenimientos(cuadrillaId: string) {
    const { data } = await api.get<{
      cuadrilla_id: string;
      cuadrilla_nombre: string;
      data: MantenimientoVehiculo[];
    }>(`/v1/cuadrillas/${cuadrillaId}/mantenimientos`);
    return data.data;
  },
};

// -------------------------------------------------------- flota vehicular ---

export const vehiculosApi = {
  /**
   * Posiciones del GPS externo, normalizadas y cacheadas por la API (la llama
   * el backend, no el navegador). Cada unidad ya viene con la cuadrilla a la
   * que pertenece, si la patente coincide con alguna.
   */
  async listar() {
    const { data } = await api.get<FlotaGps>('/v1/vehiculos');
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
  /**
   * Mi cuenta. A diferencia del resto de usuariosApi, estos dos no son solo
   * para admin: cualquiera puede ver y editar lo suyo (nombre, email y
   * teléfono). El teléfono va al padrón de empleados, que es donde vive.
   */
  async miPerfil() {
    const { data } = await api.get<Perfil>('/v1/usuarios/me');
    return data;
  },
  async actualizarMiPerfil(payload: { nombre?: string; email?: string; telefono?: string | null }) {
    const { data } = await api.patch<Perfil>('/v1/usuarios/me', payload);
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
 *   reportsApi.*  ·  settingsApi.*
 *
 * Las notificaciones SÍ existen desde el Pedido 10, pero viven en
 * services/tareas.ts (`notificacionesApi`, en español como el resto de la API).
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
