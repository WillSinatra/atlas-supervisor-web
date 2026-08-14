import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { archivosApi } from '@/shared/services/api';
import type { MantenimientoVehiculo } from '@/types/atlas';
import { FotoMantenimiento } from './FotoMantenimiento';

interface MaintenanceDetailModalProps {
  registro: MantenimientoVehiculo | null;
  onClose: () => void;
}

/**
 * La foto viaja como blob autenticado: un <img src> directo a /v1/archivos/{id}
 * da 401 sin el header Authorization. Se resuelve al seleccionarla y se revoca
 * al cambiar de foto o cerrar el modal.
 */
function useArchivoUrl(archivoId: string | null): string | null {
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

/**
 * Detalle de un registro de mantenimiento: galería de fotos con navegación y
 * descripción completa. El contrato actual del endpoint solo trae \`foto_url\`
 * (una sola foto); si el backend suma \`foto_urls\` (array) más adelante, se
 * usa directo para la galería completa.
 */
export function MaintenanceDetailModal({ registro, onClose }: MaintenanceDetailModalProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const fotos = registro?.foto_urls?.length
    ? registro.foto_urls
    : registro?.foto_url
      ? [registro.foto_url]
      : [];

  useEffect(() => {
    setPhotoIndex(0);
  }, [registro?.id]);

  // El Modal base ya cierra con click afuera y con la X; falta el atajo de teclado.
  useEffect(() => {
    if (!registro) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [registro, onClose]);

  const fotoActualId = fotos[photoIndex] ?? null;
  const srcActual = useArchivoUrl(fotoActualId);

  return (
    <Modal open={!!registro} onClose={onClose} title={registro?.tipo ?? ''} size="lg">
      {registro && (
        <div className="space-y-4">
          <div className="-mt-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {new Date(registro.fecha).toLocaleDateString('es-AR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-6 h-6 rounded-full bg-atlas-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {registro.tecnico_nombre.charAt(0)}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Técnico: <strong className="text-slate-900 dark:text-white">{registro.tecnico_nombre}</strong>
              </p>
            </div>
          </div>

          {fotos.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Registro fotográfico</h3>

              <div className="mb-3 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {srcActual ? (
                  <img src={srcActual} alt={`Foto ${photoIndex + 1}`} className="w-full h-64 object-contain" />
                ) : (
                  <div className="w-full h-64 bg-slate-200 dark:bg-slate-700 animate-pulse" />
                )}
              </div>

              {fotos.length > 1 && (
                <>
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                    {fotos.map((foto, idx) => (
                      <button
                        key={`${foto}-${idx}`}
                        type="button"
                        onClick={() => setPhotoIndex(idx)}
                        className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                          idx === photoIndex ? 'border-atlas-600' : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        <FotoMantenimiento fotoUrl={foto} className="w-full h-full" />
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Foto {photoIndex + 1} de {fotos.length}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                        disabled={photoIndex === 0}
                        className="flex items-center gap-1 px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => Math.min(fotos.length - 1, i + 1))}
                        disabled={photoIndex === fotos.length - 1}
                        className="flex items-center gap-1 px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Siguiente <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Descripción del cambio</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {registro.detalle || 'Sin descripción cargada.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            {srcActual && (
              <a href={srcActual} download={`mantenimiento-${registro.id}-${photoIndex + 1}.jpg`}>
                <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>
                  Descargar evidencia
                </Button>
              </a>
            )}
            <Button size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
