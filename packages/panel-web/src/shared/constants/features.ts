/**
 * Interruptores de funciones que dependen de una versión del backend.
 *
 * empleadoEnOrdenes — Nueva Orden muestra los selectores de Área y Responsable
 * y manda `area_id` / `empleado_id` en el alta. Necesita el backend del
 * Pedido 5 desplegado y su migración corrida (ver
 * docs/pedido-5-empleados-y-areas.md).
 *
 * Si hubiera que volver atrás, poner false: la orden se crea igual, sin
 * responsable. El panel adelantado no rompe nada — POST /v1/ordenes ignora los
 * campos que no conoce.
 *
 * accesoEmpleados — la ficha del empleado permite darle acceso al panel y/o a
 * la app móvil, en lugar de crear un usuario aparte (Pedido 9, ver
 * docs/pedido-9-acceso-de-empleados.md). Además de esta bandera, la sección se
 * muestra solo si la API ya devuelve el campo `acceso` (o sea, si la migración
 * corrió) y si quien mira es admin.
 *
 * En false la sección desaparece y las cuentas se siguen administrando por
 * /v1/usuarios: nadie pierde el acceso que ya tenía.
 */
export const FEATURES: { empleadoEnOrdenes: boolean; accesoEmpleados: boolean } = {
  empleadoEnOrdenes: true,
  accesoEmpleados: true,
};
