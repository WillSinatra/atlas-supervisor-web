import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, UploadCloud, X } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { cuadrillasApi, ticketsBetaApi, mensajeDeError } from '@/shared/services/api';
import { etiquetasPrioridad, etiquetasEstado, type PrioridadOrden, type EstadoOrden, type TicketBeta } from '@/types/atlas';
import { typeLabels } from '@/shared/services/mocks/orders.mock';

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  cliente: string;
  telefono: string;
  direccion: string;
  zona: string;
  posicion: string;
  tipo: string;
  cuadrilla_id: string;
  prioridad: PrioridadOrden;
  estado: string;
  fecha_visita: string;
  hora: string;
  caja: string;
  precinto: string;
  sn: string;
  url_mapa: string;
  descripcion: string;
}

const formInicial: FormState = {
  cliente: '',
  telefono: '',
  direccion: '',
  zona: '',
  posicion: '',
  tipo: '',
  cuadrilla_id: '',
  prioridad: 'baja',
  estado: '',
  fecha_visita: '',
  hora: '',
  caja: '',
  precinto: '',
  sn: '',
  url_mapa: '',
  descripcion: '',
};

/**
 * Modal beta "Crear Ticket" — solo el flujo de "Datos". Materiales y Firma se
 * sacaron por completo: ese flujo lo cubre la app del técnico, no se duplica acá.
 *
 * El botón de rayo junto a SN no tiene funcionalidad definida: se deja inerte
 * hasta que se aclare qué debe hacer.
 *
 * Envía como multipart/form-data a POST /v1/tickets-beta para poder incluir
 * las imágenes de soporte en el mismo request (el contrato no define un
 * endpoint aparte para archivos de este ticket beta).
 */
export function CreateTicketModal({ open, onClose }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(formInicial);
  const [imagenes, setImagenes] = useState<File[]>([]);

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas', 'para-ticket-beta'],
    queryFn: () => cuadrillasApi.listar(),
    enabled: open,
  });

  const crear = useMutation({
    mutationFn: () => {
      const cuerpo = new FormData();
      cuerpo.append('cliente', form.cliente);
      if (form.telefono) cuerpo.append('telefono', form.telefono);
      cuerpo.append('direccion', form.direccion);
      if (form.zona) cuerpo.append('zona', form.zona);
      if (form.posicion) cuerpo.append('posicion', form.posicion);
      cuerpo.append('tipo', form.tipo);
      cuerpo.append('cuadrilla_id', form.cuadrilla_id);
      cuerpo.append('prioridad', form.prioridad);
      if (form.estado) cuerpo.append('estado', form.estado);
      if (form.fecha_visita) cuerpo.append('fecha_visita', form.fecha_visita);
      if (form.hora) cuerpo.append('hora', form.hora);
      if (form.caja) cuerpo.append('caja', form.caja);
      if (form.precinto) cuerpo.append('precinto', form.precinto);
      if (form.sn) cuerpo.append('sn', form.sn);
      if (form.url_mapa) cuerpo.append('url_mapa', form.url_mapa);
      if (form.descripcion) cuerpo.append('descripcion', form.descripcion);
      imagenes.forEach((archivo) => cuerpo.append('imagenes', archivo));
      return ticketsBetaApi.crear(cuerpo as unknown as Partial<TicketBeta>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets-beta'] });
      cerrarYResetear();
    },
  });

  const cerrarYResetear = () => {
    setForm(formInicial);
    setImagenes([]);
    crear.reset();
    onClose();
  };

  const setCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const cuadrillaOptions = (cuadrillasData?.data ?? []).map((c) => ({ value: c.id, label: c.nombre }));
  const puedeGuardar =
    form.cliente.trim() !== '' && form.direccion.trim() !== '' && form.tipo !== '' && form.cuadrilla_id !== '';

  return (
    <Modal open={open} onClose={cerrarYResetear} size="xl">
      <div className="flex items-center gap-2 mb-5">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Crear Ticket</h3>
        <Badge variant="info">Beta</Badge>
      </div>

      {crear.isError && (
        <div className="mb-4">
          <Alert variant="error" title="No se pudo crear el ticket">
            {mensajeDeError(crear.error)}
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
        <Input label="Cliente" required value={form.cliente} onChange={(e) => setCampo('cliente', e.target.value)} />
        <Input label="Teléfono" value={form.telefono} onChange={(e) => setCampo('telefono', e.target.value)} />
        <Input
          label="Dirección"
          required
          value={form.direccion}
          onChange={(e) => setCampo('direccion', e.target.value)}
        />
        <Input label="Zona" value={form.zona} onChange={(e) => setCampo('zona', e.target.value)} />
        <Input label="Posición" value={form.posicion} onChange={(e) => setCampo('posicion', e.target.value)} />
        <Select
          label="Tipo"
          placeholder="Seleccionar tipo"
          options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
          value={form.tipo}
          onChange={(e) => setCampo('tipo', e.target.value)}
        />
        <Select
          label="Asignado (cuadrilla)"
          placeholder="Seleccionar cuadrilla"
          options={cuadrillaOptions}
          value={form.cuadrilla_id}
          onChange={(e) => setCampo('cuadrilla_id', e.target.value)}
        />
        <Select
          label="Prioridad"
          options={Object.entries(etiquetasPrioridad).map(([value, label]) => ({ value, label }))}
          value={form.prioridad}
          onChange={(e) => setCampo('prioridad', e.target.value as PrioridadOrden)}
        />
        <Select
          label="Estado"
          placeholder="Sin definir"
          options={Object.entries(etiquetasEstado).map(([value, label]) => ({ value, label }))}
          value={form.estado}
          onChange={(e) => setCampo('estado', e.target.value as EstadoOrden | '')}
        />
        <Input
          type="date"
          label="Fecha visita"
          value={form.fecha_visita}
          onChange={(e) => setCampo('fecha_visita', e.target.value)}
        />
        <Input type="time" label="Hora" value={form.hora} onChange={(e) => setCampo('hora', e.target.value)} />
        <Input label="Caja" value={form.caja} onChange={(e) => setCampo('caja', e.target.value)} />
        <Input label="Precinto" value={form.precinto} onChange={(e) => setCampo('precinto', e.target.value)} />
        <Input
          label="SN"
          value={form.sn}
          onChange={(e) => setCampo('sn', e.target.value)}
          rightIcon={
            <button
              type="button"
              title="Función todavía sin definir"
              className="pointer-events-auto text-slate-300 dark:text-slate-600 cursor-not-allowed"
              disabled
            >
              <Zap className="w-4 h-4" />
            </button>
          }
        />
        <Input label="URL del mapa" value={form.url_mapa} onChange={(e) => setCampo('url_mapa', e.target.value)} />
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
          <textarea
            className="input min-h-[90px]"
            value={form.descripcion}
            onChange={(e) => setCampo('descripcion', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Imágenes de soporte
          </label>
          <ImageDropzone imagenes={imagenes} onChange={setImagenes} />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="secondary" onClick={cerrarYResetear}>
          Cancelar
        </Button>
        <Button onClick={() => crear.mutate()} loading={crear.isPending} disabled={!puedeGuardar}>
          Crear Ticket
        </Button>
      </div>
    </Modal>
  );
}

function ImageDropzone({ imagenes, onChange }: { imagenes: File[]; onChange: (archivos: File[]) => void }) {
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = imagenes.map((archivo) => URL.createObjectURL(archivo));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [imagenes]);

  const agregarArchivos = (nuevos: FileList | null) => {
    if (!nuevos || nuevos.length === 0) return;
    const soloImagenes = Array.from(nuevos).filter((archivo) => archivo.type.startsWith('image/'));
    onChange([...imagenes, ...soloImagenes]);
  };

  const quitarArchivo = (index: number) => {
    onChange(imagenes.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setArrastrando(false);
          agregarArchivos(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          arrastrando
            ? 'border-atlas-500 bg-atlas-50 dark:bg-atlas-900/10'
            : 'border-slate-300 dark:border-slate-600 hover:border-atlas-400'
        }`}
      >
        <UploadCloud className="w-7 h-7 text-slate-400" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Arrastrá imágenes acá o hacé click para elegir
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">PNG, JPG — podés seleccionar varias</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            agregarArchivos(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {imagenes.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {imagenes.map((archivo, index) => (
            <div key={`${archivo.name}-${index}`} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src={previews[index]} alt={archivo.name} className="w-full h-20 object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  quitarArchivo(index);
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Quitar imagen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
