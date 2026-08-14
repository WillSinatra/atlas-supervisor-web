import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ClipboardList, MapPin, Settings2, UserRound, Users } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { BuscadorCliente } from '@/shared/components/BuscadorCliente';
import { cuadrillasApi, clientesApi, ticketsBetaApi, mensajeDeError } from '@/shared/services/api';
import { tipoOrdenLabels } from '@/shared/constants/ordenLabels';
import { urlGoogleMaps } from '@/shared/utils/geo';
import {
  etiquetasMotivoTicket,
  etiquetasPrioridad,
  type Cliente,
  type PrioridadOrden,
  type TicketBeta,
} from '@/types/atlas';

interface CreateTicketModalProps {
  open: boolean;
  /** null = alta; con ticket = edición. */
  ticket?: TicketBeta | null;
  onClose: () => void;
}

interface FormState {
  // Cuando NO es un cliente del sistema, estos tres se escriben a mano.
  nombreSuelto: string;
  telefonoSuelto: string;
  direccionSuelta: string;
  domicilio_id: string;
  tipo: string;
  /** Por qué reclama: junto con el tipo define qué verificación le toca a N2. */
  motivo: string;
  cuadrilla_id: string;
  prioridad: PrioridadOrden;
  fecha_visita: string;
  hora_visita: string;
  descripcion: string;
  zona: string;
  posicion: string;
  caja: string;
  precinto: string;
  sn: string;
  url_mapa: string;
}

const formInicial: FormState = {
  nombreSuelto: '',
  telefonoSuelto: '',
  direccionSuelta: '',
  domicilio_id: '',
  tipo: '',
  motivo: '',
  cuadrilla_id: '',
  prioridad: 'baja',
  fecha_visita: '',
  hora_visita: '',
  descripcion: '',
  zona: '',
  posicion: '',
  caja: '',
  precinto: '',
  sn: '',
  url_mapa: '',
};

/** Encabezado de sección, para que el formulario se lea de arriba a abajo. */
function Seccion({
  icono,
  titulo,
  ayuda,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-slate-400">{icono}</span>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{titulo}</h4>
          {ayuda && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ayuda}</p>}
        </div>
      </div>
      <div className="pl-7 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Alta rápida de un ticket.
 *
 * El cliente sale del padrón: se busca y se elige, con lo que la dirección y el
 * teléfono vienen solos y bien escritos. Para el trabajo que no es de un cliente
 * —una obra, un tercero, algo interno— está el interruptor, y ahí se escribe a
 * mano sin que nada sea obligatorio.
 *
 * Lo que asigna el trabajo es la **cuadrilla**. El responsable no se elige acá:
 * sale de la cuadrilla.
 */
export function CreateTicketModal({ open, ticket = null, onClose }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(formInicial);
  const [esCliente, setEsCliente] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas', 'para-ticket'],
    queryFn: () => cuadrillasApi.listar(),
    enabled: open,
  });

  const { data: domicilios } = useQuery({
    queryKey: ['domicilios', cliente?.id],
    queryFn: () => clientesApi.domicilios(cliente!.id),
    enabled: open && !!cliente,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    guardar.reset();

    if (!ticket) {
      setForm(formInicial);
      setEsCliente(true);
      setCliente(null);
      return;
    }

    // Editando: el ticket guarda el nombre y la dirección como texto suelto, no
    // un cliente_id, así que no hay forma de saber si salió del padrón. Se
    // muestran los campos a mano con lo que hay; si hace falta, se puede pasar
    // a buscar el cliente y se pisan.
    setEsCliente(false);
    setCliente(null);
    setForm({
      ...formInicial,
      nombreSuelto: ticket.cliente ?? '',
      telefonoSuelto: ticket.cliente_telefono ?? '',
      direccionSuelta: ticket.direccion ?? '',
      tipo: ticket.tipo ?? '',
      motivo: ticket.motivo ?? '',
      cuadrilla_id: ticket.cuadrilla_id ?? '',
      prioridad: (ticket.prioridad as PrioridadOrden) ?? 'baja',
      fecha_visita: ticket.fecha_visita ?? '',
      hora_visita: (ticket.hora_visita ?? '').slice(0, 5),
      descripcion: ticket.descripcion ?? '',
      zona: ticket.zona ?? '',
      posicion: ticket.posicion ?? '',
      caja: ticket.caja ?? '',
      precinto: ticket.precinto ?? '',
      sn: ticket.sn ?? '',
      url_mapa: ticket.url_mapa ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticket]);

  const setCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setError(null);
  };

  const domicilioElegido = (domicilios ?? []).find((d) => d.id === form.domicilio_id) ?? null;

  const guardar = useMutation({
    mutationFn: () => {
      // JSON, no multipart: la API lee el cuerpo con Request::json(). Y los
      // nombres son los que espera —cliente_telefono y hora_visita—, que es
      // por lo que el alta venía fallando con 400.
      const nombre = esCliente ? cliente?.nombre ?? '' : form.nombreSuelto.trim();
      const telefono = esCliente ? cliente?.telefono ?? '' : form.telefonoSuelto.trim();
      const direccion = esCliente ? domicilioElegido?.direccion ?? '' : form.direccionSuelta.trim();

      // Si el domicilio del padrón tiene coordenadas, el link al mapa sale solo.
      const mapa =
        form.url_mapa.trim() ||
        (domicilioElegido?.lat != null && domicilioElegido?.lng != null
          ? urlGoogleMaps(domicilioElegido.lat, domicilioElegido.lng)
          : '');

      const cuerpo: Record<string, string> = {
        cliente: nombre,
        direccion,
        tipo: form.tipo,
        cuadrilla_id: form.cuadrilla_id,
        prioridad: form.prioridad,
      };
      // Si salió del padrón, se guarda el vínculo además del texto: así al
      // convertirlo en orden no hay que volver a buscar al cliente.
      if (esCliente && cliente) {
        cuerpo.cliente_id = cliente.id;
        if (form.domicilio_id) cuerpo.domicilio_id = form.domicilio_id;
      }
      const opcionales: Record<string, string> = {
        // Va acá y no arriba porque puede quedar vacío: este bloque descarta
        // solo lo que no tiene valor.
        motivo: form.motivo,
        cliente_telefono: telefono,
        zona: form.zona.trim(),
        posicion: form.posicion.trim(),
        caja: form.caja.trim(),
        precinto: form.precinto.trim(),
        sn: form.sn.trim(),
        url_mapa: mapa,
        descripcion: form.descripcion.trim(),
        fecha_visita: form.fecha_visita,
        hora_visita: form.hora_visita,
      };
      for (const [clave, valor] of Object.entries(opcionales)) {
        if (valor !== '') cuerpo[clave] = valor;
      }

      const payload = cuerpo as unknown as Partial<TicketBeta>;
      return ticket ? ticketsBetaApi.actualizar(ticket.id, payload) : ticketsBetaApi.crear(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets-beta'] });
      onClose();
    },
  });

  const enviar = () => {
    if (!form.tipo) return setError('Elegí el tipo de trabajo.');
    // if (form.cuadrilla_id) return setError('Elegí la cuadrilla que lo va a hacer.');
    if (esCliente && !cliente) return setError('Buscá y elegí el cliente, o marcá que no es un cliente del sistema.');
    if (esCliente && !form.domicilio_id) return setError('Elegí a cuál de sus domicilios va la visita.');
    guardar.mutate();
  };

  const cuadrillaOptions = (cuadrillasData?.data ?? []).map((c) => ({ value: c.id, label: c.nombre }));

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {ticket ? 'Editar ticket' : 'Nuevo ticket'}
        </h3>
        <Badge variant="info">Beta</Badge>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Captura rápida de un trabajo. Después se puede convertir en orden de trabajo.
      </p>

      {(guardar.isError || error) && (
        <div className="mb-4">
          <Alert variant="error" title={ticket ? 'No se pudo guardar' : 'No se pudo crear el ticket'}>
            {error ?? mensajeDeError(guardar.error)}
          </Alert>
        </div>
      )}

      {/* El scroll va acá adentro, con un poco de aire a la derecha, para que la
          barra no quede pegada al borde del modal ni tape los campos. */}
      <div className="space-y-6 max-h-[62vh] overflow-y-auto pr-3 -mr-2">
        <Seccion
          icono={<UserRound className="w-4 h-4" />}
          titulo="¿Para quién es?"
          ayuda="Buscá el cliente en el sistema y la dirección viene sola."
        >
          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!esCliente}
              onChange={(e) => {
                setEsCliente(!e.target.checked);
                setCliente(null);
                setCampo('domicilio_id', '');
              }}
              className="rounded border-slate-300 text-atlas-600 focus:ring-atlas-500"
            />
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              No es un cliente del sistema
            </span>
          </label>

          {esCliente ? (
            <>
              <BuscadorCliente cliente={cliente} onSeleccionar={setCliente} />
              <Select
                label="Domicilio *"
                placeholder={cliente ? 'Seleccionar domicilio' : 'Elegí un cliente primero'}
                options={(domicilios ?? []).map((d) => ({ value: d.id, label: d.direccion }))}
                value={form.domicilio_id}
                disabled={!cliente}
                onChange={(e) => setCampo('domicilio_id', e.target.value)}
              />
              {cliente && (domicilios ?? []).length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Este cliente no tiene domicilios cargados. Agregale uno desde su ficha.
                </p>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                placeholder="Quién pide el trabajo"
                value={form.nombreSuelto}
                onChange={(e) => setCampo('nombreSuelto', e.target.value)}
              />
              <Input
                label="Teléfono"
                value={form.telefonoSuelto}
                onChange={(e) => setCampo('telefonoSuelto', e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Dirección"
                  placeholder="Dónde hay que ir"
                  value={form.direccionSuelta}
                  onChange={(e) => setCampo('direccionSuelta', e.target.value)}
                />
              </div>
              <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                Ninguno es obligatorio: cargá lo que tengas.
              </p>
            </div>
          )}
        </Seccion>

        <Seccion
          icono={<ClipboardList className="w-4 h-4" />}
          titulo="El trabajo"
          ayuda="Qué hay que hacer y para cuándo."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipo *"
              placeholder="Seleccionar tipo"
              options={Object.entries(tipoOrdenLabels).map(([value, label]) => ({ value, label }))}
              value={form.tipo}
              onChange={(e) => setCampo('tipo', e.target.value)}
            />
            <Select
              label="Motivo del reclamo"
              placeholder="Sin especificar"
              options={Object.entries(etiquetasMotivoTicket).map(([value, label]) => ({ value, label }))}
              value={form.motivo}
              onChange={(e) => setCampo('motivo', e.target.value)}
            />
            <Select
              label="Prioridad"
              options={Object.entries(etiquetasPrioridad).map(([value, label]) => ({ value, label }))}
              value={form.prioridad}
              onChange={(e) => setCampo('prioridad', e.target.value as PrioridadOrden)}
            />
            <Input
              type="date"
              label="Fecha de visita"
              value={form.fecha_visita}
              onChange={(e) => setCampo('fecha_visita', e.target.value)}
            />
            <Input
              type="time"
              label="Hora"
              value={form.hora_visita}
              onChange={(e) => setCampo('hora_visita', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
            <textarea
              className="input min-h-[90px]"
              placeholder="Qué reportó, qué hay que revisar..."
              value={form.descripcion}
              onChange={(e) => setCampo('descripcion', e.target.value)}
            />
          </div>
        </Seccion>

        <Seccion
          icono={<Users className="w-4 h-4" />}
          titulo="Quién lo hace"
          ayuda="La cuadrilla es lo que asigna el trabajo. El responsable sale de ella."
        >
          <Select
            label="Cuadrilla *"
            placeholder="Seleccionar cuadrilla"
            options={cuadrillaOptions}
            value={form.cuadrilla_id}
            onChange={(e) => setCampo('cuadrilla_id', e.target.value)}
          />
        </Seccion>

        <Seccion
          icono={<Settings2 className="w-4 h-4" />}
          titulo="Datos técnicos"
          ayuda="Opcional. Lo que ya se sepa de la instalación."
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Input label="Zona" value={form.zona} onChange={(e) => setCampo('zona', e.target.value)} />
            <Input label="Posición" value={form.posicion} onChange={(e) => setCampo('posicion', e.target.value)} />
            <Input label="Caja" value={form.caja} onChange={(e) => setCampo('caja', e.target.value)} />
            <Input label="Precinto" value={form.precinto} onChange={(e) => setCampo('precinto', e.target.value)} />
            <Input label="SN" value={form.sn} onChange={(e) => setCampo('sn', e.target.value)} />
          </div>
          <Input
            label="Link del mapa"
            placeholder={
              domicilioElegido?.lat != null ? 'Sale solo de las coordenadas del domicilio' : 'https://maps.google.com/...'
            }
            leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
            value={form.url_mapa}
            onChange={(e) => setCampo('url_mapa', e.target.value)}
          />
        </Seccion>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={enviar} loading={guardar.isPending}>
          {ticket ? 'Guardar cambios' : 'Crear ticket'}
        </Button>
      </div>
    </Modal>
  );
}
