import type { AxiosError } from 'axios';
import type { Area, Empleado } from '@/types/atlas';

/**
 * Red de contención para Empleados y Áreas.
 *
 * Los endpoints /v1/empleados y /v1/areas existen (Pedido 5), pero si la API
 * responde 404 —backend sin desplegar, migración sin correr— las pantallas caen
 * acá en vez de quedar inservibles: los datos quedan en localStorage y la UI lo
 * avisa. Es un puente, no una base de datos: vive en el navegador de quien lo
 * cargó y no se comparte con el resto del equipo.
 *
 * En cuanto la API responde bien, el respaldo queda sin uso solo. Para sacarlo
 * del todo, borrar este archivo y los try/catch de personal.ts.
 */

const CLAVE_AREAS = 'atlas.respaldo.areas';
const CLAVE_EMPLEADOS = 'atlas.respaldo.empleados';

/** Se prende en cuanto una pantalla lee o escribe del respaldo, para poder avisarlo en la UI. */
let respaldoUsado = false;

export function usandoRespaldoLocal(): boolean {
  return respaldoUsado;
}

/**
 * Distingue "el backend todavía no tiene este endpoint" de un error real.
 *
 * 404/405/501 y la falta de respuesta (red caída o CORS) se atienden con el
 * respaldo. Un 401 o un 500 se dejan pasar: son problemas que hay que ver.
 */
export function esEndpointNoPublicado(e: unknown): boolean {
  const err = e as AxiosError;
  if (!err?.isAxiosError) return false;
  const estado = err.response?.status;
  if (estado === undefined) return true;
  return estado === 404 || estado === 405 || estado === 501;
}

/** Envoltorio paginado equivalente al de la API, con todo en una sola página. */
export function paginar<T>(items: T[]) {
  return {
    data: items,
    pagination: { page: 1, per_page: items.length, total: items.length, total_pages: 1 },
  };
}

export interface RegistroLocal {
  id: string;
  creado_en: string;
  actualizado_en: string;
}

type DatosNuevos<T> = Omit<T, 'id' | 'creado_en' | 'actualizado_en'>;

function nuevoId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Descarta las claves en undefined para que un PATCH parcial no borre campos. */
function soloDefinidos<T extends object>(datos: T): Partial<T> {
  return Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor !== undefined)) as Partial<T>;
}

class AlmacenLocal<T extends RegistroLocal> {
  constructor(
    private readonly clave: string,
    private readonly semilla: () => DatosNuevos<T>[] = () => [],
  ) {}

  private leer(): T[] {
    const crudo = localStorage.getItem(this.clave);
    if (crudo) {
      try {
        return JSON.parse(crudo) as T[];
      } catch {
        // Dato corrupto: se regenera desde la semilla en vez de romper la pantalla.
      }
    }
    const inicial = this.semilla().map((datos) => this.armarRegistro(datos));
    this.escribir(inicial);
    return inicial;
  }

  private escribir(items: T[]): void {
    localStorage.setItem(this.clave, JSON.stringify(items));
  }

  private armarRegistro(datos: DatosNuevos<T>): T {
    const momento = new Date().toISOString();
    return {
      ...(datos as Record<string, unknown>),
      id: nuevoId(),
      creado_en: momento,
      actualizado_en: momento,
    } as unknown as T;
  }

  listar(filtro?: (item: T) => boolean): T[] {
    respaldoUsado = true;
    const items = this.leer();
    return filtro ? items.filter(filtro) : items;
  }

  obtener(id: string): T {
    const item = this.listar().find((i) => i.id === id);
    if (!item) throw new Error('No se encontró el registro.');
    return item;
  }

  crear(datos: DatosNuevos<T>): T {
    respaldoUsado = true;
    const items = this.leer();
    const nuevo = this.armarRegistro(datos);
    this.escribir([...items, nuevo]);
    return nuevo;
  }

  actualizar(id: string, datos: Partial<DatosNuevos<T>>): T {
    respaldoUsado = true;
    const items = this.leer();
    const indice = items.findIndex((i) => i.id === id);
    if (indice === -1) throw new Error('No se encontró el registro.');
    const actualizado = {
      ...(items[indice] as Record<string, unknown>),
      ...(soloDefinidos(datos) as Record<string, unknown>),
      actualizado_en: new Date().toISOString(),
    } as unknown as T;
    this.escribir(items.map((item, i) => (i === indice ? actualizado : item)));
    return actualizado;
  }

  eliminar(id: string): { id: string; eliminado: boolean } {
    respaldoUsado = true;
    const items = this.leer();
    if (!items.some((i) => i.id === id)) throw new Error('No se encontró el registro.');
    this.escribir(items.filter((i) => i.id !== id));
    return { id, eliminado: true };
  }
}

/** Áreas de arranque, para que el filtro por área sirva desde el primer día. */
const AREAS_SEMILLA = ['Ventas', 'Soporte', 'Administración', 'Instalaciones'];

export const almacenAreas = new AlmacenLocal<Area>(CLAVE_AREAS, () =>
  AREAS_SEMILLA.map((nombre) => ({ nombre, descripcion: null, activo: true })),
);

export const almacenEmpleados = new AlmacenLocal<Empleado>(CLAVE_EMPLEADOS);
