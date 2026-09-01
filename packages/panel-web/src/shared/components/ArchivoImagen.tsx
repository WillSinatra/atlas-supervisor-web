import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { archivosApi } from '@/shared/services/api';

/**
 * Imágenes guardadas en la API.
 *
 * La descarga exige el header Authorization, así que un `<img src="/v1/...">`
 * directo devuelve 401: hay que bajarlas como blob y armar un object URL. Eso
 * es lo que resuelve `useArchivoUrl`, y por qué mostrar una imagen del sistema
 * no es tan simple como poner la ruta.
 */

/**
 * El object URL de un archivo, revocado al desmontar.
 *
 * Ojo con la limpieza: leer `src` del estado dentro del cleanup no sirve —en
 * ese momento todavía vale lo de antes— y los blobs quedan colgados en memoria.
 * Por eso la URL creada se guarda en una variable del propio efecto.
 */
export function useArchivoUrl(archivoId: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!archivoId) {
      setSrc(null);
      return;
    }

    let vigente = true;
    let creado: string | null = null;

    archivosApi.urlDeArchivo(archivoId).then((u) => {
      if (!vigente) {
        // Se desmontó mientras descargaba: no queda nadie que lo use.
        URL.revokeObjectURL(u);
        return;
      }
      creado = u;
      setSrc(u);
    });

    return () => {
      vigente = false;
      if (creado) URL.revokeObjectURL(creado);
    };
  }, [archivoId]);

  return src;
}

export function ArchivoImagen({
  archivoId,
  alt,
  className,
  onClick,
}: {
  archivoId: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const src = useArchivoUrl(archivoId);

  if (!src) return <div className={`bg-slate-200 dark:bg-slate-700 animate-pulse ${className ?? ''}`} />;

  if (!onClick) return <img src={src} alt={alt} className={className} />;

  return (
    <button
      type="button"
      onClick={onClick}
      title="Ampliar"
      className="block w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-atlas-500 rounded"
    >
      <img src={src} alt={alt} className={className} />
    </button>
  );
}

/** La imagen en grande. Fondo claro fijo: una firma es trazo oscuro sobre transparente. */
export function VisorImagen({
  archivoId,
  titulo,
  onClose,
}: {
  archivoId: string | null;
  titulo: string;
  onClose: () => void;
}) {
  return (
    <Modal open={!!archivoId} onClose={onClose} title={titulo} size="xl">
      {archivoId && (
        <div className="flex items-center justify-center bg-white rounded-lg p-2">
          <ArchivoImagen
            archivoId={archivoId}
            alt={titulo}
            className="max-h-[70vh] max-w-full w-auto object-contain"
          />
        </div>
      )}
    </Modal>
  );
}

/**
 * Un adjunto que NO es una imagen: hoy, el PDF de un comprobante.
 *
 * Se ofrece para bajar y no se abre embebido a propósito. La API lo sirve con
 * `Content-Disposition: attachment` porque un PDF puede traer JavaScript y, a
 * diferencia del SVG, no se puede sanear sin corromper el comprobante. Abrirlo
 * en una pestaña con un blob del panel le daría justamente el origen que la API
 * le está negando. Bajado, se abre en el lector de la persona, fuera de la
 * sesión de Atlas.
 */
export function ArchivoDocumento({
  archivoId,
  nombre,
  tamano,
  className,
}: {
  archivoId: string;
  nombre?: string | null;
  tamano?: number;
  className?: string;
}) {
  const src = useArchivoUrl(archivoId);

  // El nombre que puso quien lo subió puede ser larguísimo —el de WhatsApp trae
  // el id del mensaje adentro—, así que se recorta por el medio y se conserva la
  // extensión, que es lo que dice qué es el archivo.
  const etiqueta = (() => {
    const n = (nombre ?? '').trim() || 'comprobante.pdf';
    return n.length > 28 ? `${n.slice(0, 14)}…${n.slice(-10)}` : n;
  })();

  const kb = typeof tamano === 'number' && tamano > 0
    ? `${Math.max(1, Math.round(tamano / 1024))} KB`
    : null;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 p-3 text-center bg-slate-50 dark:bg-slate-800/60 ${className ?? ''}`}
    >
      <FileText className="w-7 h-7 text-atlas-600 shrink-0" />
      <span
        className="text-xs font-medium text-slate-700 dark:text-slate-200 break-all leading-tight"
        title={nombre ?? undefined}
      >
        {etiqueta}
      </span>
      {kb && <span className="text-[11px] text-slate-500 dark:text-slate-400">{kb}</span>}

      {src ? (
        <a
          href={src}
          download={nombre ?? 'comprobante.pdf'}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-atlas-600 hover:text-atlas-700 hover:underline focus:outline-none focus:ring-2 focus:ring-atlas-500 rounded"
        >
          <Download className="w-3.5 h-3.5" /> Descargar
        </a>
      ) : (
        <span className="mt-1 text-xs text-slate-400">Cargando…</span>
      )}
    </div>
  );
}

/** ¿Este adjunto se puede mostrar como imagen? */
export function esImagen(mime?: string | null): boolean {
  return typeof mime === 'string' && mime.startsWith('image/');
}
