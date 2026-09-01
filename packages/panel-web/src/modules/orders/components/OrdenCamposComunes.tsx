import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { slasApi } from '@/shared/services/api';
import { prioridadLabels, fallaLabels, FALLAS } from '@/shared/constants/ordenLabels';
import type { Falla } from '@/shared/constants/ordenLabels';
import type { PrioridadOrden } from '@/types/atlas';

// Campos que comparten el alta y la edición de una orden: los únicos que
// PATCH /v1/ordenes/:id acepta (titulo, descripcion, prioridad, falla, sla_id,
// fecha_programada). tipo/cliente_id/domicilio_id solo se cargan al crear.
export interface CamposComunesValues {
  titulo: string;
  descripcion: string;
  prioridad: PrioridadOrden | '';
  falla: Falla | '';
  sla_id: string;
  fecha_programada: string;
  hora_programada: string;
  zona?: string;
  posicion?: number;
  caja?: string;
  precinto?: string;
  sn?: string;
}

interface Props {
  values: CamposComunesValues;
  onChange: <K extends keyof CamposComunesValues>(key: K, value: CamposComunesValues[K]) => void;
  errors?: Partial<Record<keyof CamposComunesValues, string>>;
  mostrarFalla: boolean;
  prioridadRequerida?: boolean;
}

export function OrdenCamposComunes({ values, onChange, errors, mostrarFalla, prioridadRequerida }: Props) {
  const { data: slas } = useQuery({
    queryKey: ['slas'],
    queryFn: () => slasApi.listar(),
  });

  const slaOptions = useMemo(() => (slas ?? []).map((s) => ({ value: s.id, label: s.nombre })), [slas]);

  return (
    <>
      <Select
        label={prioridadRequerida ? 'Prioridad *' : 'Prioridad'}
        placeholder="Seleccionar prioridad"
        value={values.prioridad}
        error={errors?.prioridad}
        options={Object.entries(prioridadLabels).map(([value, label]) => ({ value, label }))}
        onChange={(e) => onChange('prioridad', e.target.value as PrioridadOrden)}
      />

      <Input
        label="Título"
        value={values.titulo}
        error={errors?.titulo}
        onChange={(e) => onChange('titulo', e.target.value)}
      />

      <div className="w-full">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
        <textarea
          className="input min-h-[80px]"
          value={values.descripcion}
          onChange={(e) => onChange('descripcion', e.target.value)}
        />
      </div>

      {mostrarFalla && (
        <Select
          label="Falla"
         placeholder="Seleccionar falla"
          value={values.falla}
          options={FALLAS.map((f) => ({ value: f, label: fallaLabels[f] }))}
          onChange={(e) => onChange('falla', e.target.value as Falla)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="SLA"
          placeholder={slaOptions.length === 0 ? 'Sin SLAs configurados' : 'Seleccionar SLA'}
          value={values.sla_id}
          options={slaOptions}
          disabled={slaOptions.length === 0}
          onChange={(e) => onChange('sla_id', e.target.value)}
        />
        <Input
          label="Fecha programada"
          type="datetime-local"
          value={values.fecha_programada}
          onChange={(e) => onChange('fecha_programada', e.target.value)}
        />
        <Input
          label="Hora programada"
          type="time"
          value={values.hora_programada}
          onChange={(e) => onChange('hora_programada', e.target.value)}
        />
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">📋 Datos técnicos</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Opcional. Lo que se sepa de la instalación.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Input
            label="Zona"
            value={values.zona}
            error={errors?.zona}
            onChange={(e) => onChange('zona', e.target.value)}
          />
          <Input
            label="Posición"
            value={values.posicion}
            error={errors?.posicion}
	    onChange={(e) => onChange('posicion', parseInt(e.target.value) || 0)}
          />
          <Input
            label="Caja"
            value={values.caja}
            error={errors?.caja}
            onChange={(e) => onChange('caja', e.target.value)}
          />
          <Input
            label="Precinto"
            value={values.precinto}
            error={errors?.precinto}
            onChange={(e) => onChange('precinto', e.target.value)}
          />
          <Input
            label="SN"
            value={values.sn}
            error={errors?.sn}
            onChange={(e) => onChange('sn', e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
