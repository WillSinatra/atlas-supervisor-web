import { useEffect, useState } from 'react';
import { ExternalLink, MapPin, Navigation, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { MapaPunto } from '@/shared/components/MapaPunto';
import {
  formatearCoordenadas,
  motivosCoordenadas,
  parsearCoordenadas,
  urlComoLlegar,
  urlGoogleMaps,
  type Coordenadas,
} from '@/shared/utils/geo';

interface TarjetaUbicacionProps {
  direccion?: string | null;
  lat: number | null;
  lng: number | null;
  /** Sin esto la tarjeta es de solo lectura (no aparece el botón de cargar). */
  onGuardar?: (coordenadas: Coordenadas | null) => Promise<unknown> | void;
  guardando?: boolean;
  error?: string | null;
  titulo?: string;
  /** Texto del estado vacío: cambia entre una OT y un domicilio de cliente. */
  vacioDescripcion?: string;
}

/**
 * La ubicación de un domicilio: el mapa con el pin si hay coordenadas, y si no
 * el mismo cartel de siempre pero con un botón para cargarlas.
 *
 * Se comparte entre la orden de trabajo y la ficha del cliente porque en los dos
 * lados el problema es el mismo: la dirección está escrita, pero nadie sabe
 * dónde queda hasta que alguien saca el punto del mapa.
 */
export function TarjetaUbicacion({
  direccion,
  lat,
  lng,
  onGuardar,
  guardando,
  error,
  titulo = 'Ubicación',
  vacioDescripcion = 'Todavía no tiene coordenadas cargadas.',
}: TarjetaUbicacionProps) {
  const [abierto, setAbierto] = useState(false);
  const tieneCoordenadas = lat != null && lng != null;
  const editable = typeof onGuardar === 'function';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" /> {titulo}
        </h3>
        {editable && tieneCoordenadas && (
          <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setAbierto(true)}>
            Cambiar
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-3">
          <Alert variant="error" title="No se pudo guardar">
            {error}
          </Alert>
        </div>
      )}

      {tieneCoordenadas ? (
        <>
          <MapaPunto lat={lat} lng={lng} />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={urlGoogleMaps(lat, lng)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-atlas-600 hover:text-atlas-700 dark:text-atlas-400 inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver en Google Maps
            </a>
            <a
              href={urlComoLlegar(lat, lng)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-atlas-600 hover:text-atlas-700 dark:text-atlas-400 inline-flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5" /> Cómo llegar
            </a>
            <span className="text-xs text-slate-400 font-mono">{formatearCoordenadas(lat, lng)}</span>
          </div>
        </>
      ) : (
        <div className="h-44 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-center px-4">
          <Navigation className="w-6 h-6 text-slate-300 dark:text-slate-600" />
          <p className="text-xs text-slate-400 dark:text-slate-500">{vacioDescripcion}</p>
          {editable && (
            <Button variant="secondary" size="sm" icon={<MapPin className="w-4 h-4" />} onClick={() => setAbierto(true)}>
              Cargar ubicación
            </Button>
          )}
        </div>
      )}

      {direccion && <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">{direccion}</p>}

      {editable && (
        <ModalCoordenadas
          open={abierto}
          actuales={tieneCoordenadas ? { lat, lng } : null}
          guardando={!!guardando}
          onClose={() => setAbierto(false)}
          onGuardar={async (coordenadas) => {
            await onGuardar!(coordenadas);
            setAbierto(false);
          }}
        />
      )}
    </div>
  );
}

/** Pegar el link de Google Maps, o las coordenadas a mano. */
export function ModalCoordenadas({
  open,
  actuales,
  guardando,
  onClose,
  onGuardar,
}: {
  open: boolean;
  actuales: Coordenadas | null;
  guardando: boolean;
  onClose: () => void;
  onGuardar: (coordenadas: Coordenadas | null) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTexto(actuales ? formatearCoordenadas(actuales.lat, actuales.lng) : '');
    setTocado(false);
  }, [open, actuales]);

  const resultado = parsearCoordenadas(texto);
  const mostrarError = tocado && texto.trim() !== '' && !resultado.ok;

  return (
    <Modal open={open} onClose={onClose} title="Ubicación del domicilio" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Link de Google Maps o coordenadas
          </label>
          <textarea
            className="input min-h-[76px] font-mono text-sm"
            placeholder={'https://www.google.com/maps/@-37.3217,-59.1332,17z\n-37.3217, -59.1332'}
            value={texto}
            autoFocus
            onChange={(e) => {
              setTexto(e.target.value);
              setTocado(true);
            }}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            En el teléfono: mantené apretado el punto en Google Maps, tocá <strong>Compartir</strong> y pegá acá lo
            que copia. En la computadora alcanza con el link de la barra de direcciones.
          </p>
        </div>

        {mostrarError && (
          <Alert variant="warning" title="No pude leer las coordenadas">
            {motivosCoordenadas[resultado.motivo]}
          </Alert>
        )}

        {resultado.ok && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Así queda:{' '}
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {formatearCoordenadas(resultado.coordenadas.lat, resultado.coordenadas.lng)}
              </span>
            </p>
            <MapaPunto lat={resultado.coordenadas.lat} lng={resultado.coordenadas.lng} className="h-56" />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div>
            {actuales && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                disabled={guardando}
                onClick={() => onGuardar(null)}
              >
                Quitar ubicación
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={guardando}
              disabled={!resultado.ok}
              onClick={() => resultado.ok && onGuardar(resultado.coordenadas)}
            >
              Guardar ubicación
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
