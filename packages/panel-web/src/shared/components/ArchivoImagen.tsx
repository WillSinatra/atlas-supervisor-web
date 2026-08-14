import { useEffect, useState } from 'react';
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
