import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  ListChecks,
  Users,
  UserCircle,
  Briefcase,
  Package,
  BarChart3,
  Settings,
  ShieldCheck,
  CheckSquare,
  CheckCircle2,
  Wrench,
  Zap,
} from 'lucide-react';

export interface ItemNavegacion {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Roles a los que se les oculta este ítem del menú y se les bloquea la ruta. */
  ocultarPara?: string[];
  /**
   * Identificador de sección que manda el backend en `empleado.secciones`
   * (ver EmpleadoModal). `undefined` = no se filtra por sección, siempre
   * visible (Dashboard y Configuración).
   */
  value?: string;
}

export const navigation: ItemNavegacion[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Órdenes de Trabajo', href: '/orders', icon: ClipboardList, value: 'ordenes' },
  { name: 'Tickets', href: '/tickets', icon: FileText, value: 'tickets' },
  // Módulo nuevo, en pruebas. Cuando reemplace al anterior, este pasa a ser
  // "Tickets" y el de arriba se borra.
  { name: 'Inbox', href: '/soporte', icon: ShieldCheck, ocultarPara: ['panolero', 'tecnico'], value: 'soporte' },
  // Tareas internas: las ve todo el mundo, incluido el pañol y quien limpia.
  { name: 'Tareas', href: '/tareas', icon: ListChecks, value: 'tareas' },
  { name: 'Alta Rápida', href: '/altas-rapidas', icon: Zap, value: 'altas_rapidas' },
  { name: 'Validar Altas', href: '/validar-altas', icon: CheckCircle2, value: 'validar_altas' },  
//  { name: 'Crear OT', href: '/crear-ot', icon: Wrench, value: 'crear_ot' },
  { name: 'Cuadrillas', href: '/crews', icon: Users, value: 'cuadrillas' },
  { name: 'Empleados', href: '/empleados', icon: Briefcase, ocultarPara: ['panolero', 'planificador'], value: 'empleados' },
  { name: 'Materiales', href: '/materiales', icon: Package, ocultarPara: ['planificador'], value: 'materiales' },
  // Plantillas de checklist: define lo que el técnico releva en el sitio.
  { name: 'Checklists', href: '/checklists', icon: CheckSquare, ocultarPara: ['panolero', 'tecnico', 'operador'], value: 'checklists' },
  { name: 'Clientes', href: '/customers', icon: UserCircle, value: 'clientes' },
  { name: 'Reportes', href: '/reports', icon: BarChart3, ocultarPara: ['panolero', 'planificador'], value: 'reportes' },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

/** Un ítem sin ocultarPara (ej. Dashboard) nunca bloquea la ruta. */
export function rutaOcultaParaRol(pathname: string, rol: string | undefined): boolean {
  const item = navigation.find((item) => pathname.startsWith(item.href));
  if (!item) return false;
  return !!item.ocultarPara?.includes(rol ?? '');
}

/**
 * Filtro por secciones habilitadas (independiente del rol). Con `secciones`
 * vacío o ausente no filtra nada: es el estado "todavía no configurado", y en
 * ese caso el único filtro que corre es el de rol de arriba.
 *
 * El admin siempre pasa, sin mirar `secciones`: es quien configura las
 * secciones de todos los demás, así que una lista mal armada en su propio
 * empleado no puede dejarlo afuera del panel.
 */
export function rutaVisiblePorSecciones(
  secciones: string[] | undefined,
  pathname: string,
  rol?: string,
): boolean {
  if (rol === 'admin') return true;
  if (!secciones || secciones.length === 0) return true;
  const item = navigation.find((item) => pathname.startsWith(item.href));
  if (!item || !item.value) return true;
  return secciones.includes(item.value);
}
