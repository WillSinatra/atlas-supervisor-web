/**
 * Formato de moneda para presupuestos e impresiones.
 * Un solo lugar para que la tabla, el modal y el papel muestren lo mismo.
 */
export function moneda(valor: number): string {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  });
}
