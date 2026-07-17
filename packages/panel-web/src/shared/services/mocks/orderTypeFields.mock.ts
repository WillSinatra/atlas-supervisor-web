import type { WorkOrder } from '@/types';

export interface TypeField {
  label: string;
  value: string;
}

// Campos por tipo de OT según Tomo II, Sección 5 (los 5 tipos reales: instalación,
// reparación, mantenimiento, baja, upgrade). Los valores concretos son mock —el
// contrato solo define qué campos existen, no datos reales— generados de forma
// determinística por orden para que la maqueta se vea variada.
function pick<T>(options: T[], seed: string): T {
  // djb2 hash: buena dispersión incluso para strings casi idénticos (ej. "ot-003" vs "ot-007").
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return options[Math.abs(hash) % options.length];
}

function pickBool(seed: string): boolean {
  return pick([true, false], seed);
}

// La ejecución (nro. de serie, resultado de prueba, diagnóstico en sitio) recién
// existe una vez que el técnico arrancó el trabajo, no en PENDING/ASSIGNED.
function isInExecution(order: WorkOrder): boolean {
  return order.status !== 'PENDING' && order.status !== 'ASSIGNED';
}

export function getOrderTypeFields(order: WorkOrder): TypeField[] {
  switch (order.type) {
    case 'INSTALLATION': {
      const fields: TypeField[] = [
        { label: 'Plan contratado', value: pick(['Fibra 300 Mb', 'Fibra 500 Mb', 'Fibra 1000 Mb'], order.id) },
        { label: 'Equipo a instalar', value: pick(['ONT', 'Router'], order.id + 'e') },
        {
          label: 'Fecha/hora comprometida',
          value: order.scheduledDate ? new Date(order.scheduledDate).toLocaleString('es-AR') : '—',
        },
      ];
      if (isInExecution(order)) {
        fields.push(
          { label: 'Nro. de serie instalado', value: pick(['ONT-88231', 'ONT-77120', 'ONT-90456'], order.id + 's') },
          { label: 'Resultado prueba de señal', value: pick(['OK', 'Falla'], order.id + 't') },
        );
      }
      return fields;
    }
    case 'REPAIR': {
      const fields: TypeField[] = [
        {
          label: 'Tipo de falla',
          value: pick(['Sin señal', 'Intermitencia', 'Velocidad baja', 'Daño físico de equipo', 'Otro'], order.id),
        },
        {
          label: 'Diagnóstico técnico en sitio',
          value: isInExecution(order) ? order.diagnosis || 'Se detectó falla en el tramo de acometida' : 'Pendiente de diagnóstico en sitio',
        },
      ];
      if (isInExecution(order) && pickBool(order.id + 'reemplazo')) {
        fields.push(
          { label: 'Nro. serie retirado', value: pick(['ONT-51120', 'ONT-52233', 'ONT-53344'], order.id + 'ret') },
          { label: 'Nro. serie nuevo', value: pick(['ONT-88231', 'ONT-77120', 'ONT-90456'], order.id + 'nue') },
        );
      }
      return fields;
    }
    case 'MAINTENANCE':
      return [
        { label: 'Contrato de nivel de servicio (SLA)', value: pick(['Sí', 'No'], order.id) },
        { label: 'Checklist de inspección', value: 'Incluye ítems adicionales respecto al checklist estándar' },
      ];
    case 'REMOVAL': {
      const motivo = pick(['Mudanza', 'Cambio de proveedor', 'Insatisfacción', 'Otro'], order.id);
      return [
        // Nota: "motivo de baja" es obligatorio antes de cerrar la OT según Tomo II;
        // acá siempre viene cargado porque el mock lo genera, pero la validación de
        // "no dejar cerrar sin motivo" es una regla de formulario a implementar en el alta real.
        { label: 'Motivo de baja', value: motivo },
        { label: 'Nros. de serie retirados', value: pick(['ONT-51120', 'ONT-52233, Router-10021'], order.id + 'ret') },
      ];
    }
    case 'UPGRADE': {
      const requiereCambioEquipo = pickBool(order.id);
      const fields: TypeField[] = [
        { label: 'Plan anterior', value: pick(['Fibra 300 Mb', 'Fibra 500 Mb'], order.id + 'a') },
        { label: 'Plan nuevo', value: pick(['Fibra 500 Mb', 'Fibra 1000 Mb'], order.id + 'n') },
        { label: 'Requiere cambio de equipo', value: requiereCambioEquipo ? 'Sí' : 'No' },
      ];
      if (!requiereCambioEquipo) {
        fields.push({ label: 'Nota', value: 'Puede pasar directo a Completada sin pasar por En Camino/En Sitio' });
      }
      return fields;
    }
    default:
      return [{ label: 'Detalle', value: order.description || 'Sin detalle adicional' }];
  }
}
