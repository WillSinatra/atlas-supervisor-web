import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Barcode, Search, Trash2, X } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { mensajeDeError } from '@/shared/services/api';
import { materialesApi, presupuestosApi } from '@/shared/services/materiales';
import { moneda } from '@/shared/utils/moneda';
import type { CrearPresupuestoInput, Material } from '@/types/atlas';

interface PresupuestoModalProps {
  open: boolean;
  /** null = presupuesto nuevo; con id = edición. */
  presupuestoId: string | null;
  onClose: () => void;
  onGuardado: () => void;
}

interface Linea {
  material_id: string;
  nombre: string;
  codigo: string | null;
  unidad: string;
  requiere_serie: boolean;
  cantidad: number;
  precio_unitario: number;
  series: string[];
}

/**
 * Alta y edición de presupuestos.
 *
 * A diferencia del remito, acá cada línea lleva precio: se propone el del
 * catálogo y se puede pisar a mano, porque lo que vale es el precio con el que
 * se cotizó. Nada de esto toca el stock: eso pasa al despachar.
 */
export function PresupuestoModal({ open, presupuestoId, onClose, onGuardado }: PresupuestoModalProps) {
  const [destinatario, setDestinatario] = useState('');
  const [documento, setDocumento] = useState('');
  const [contacto, setContacto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);

  const [escaneo, setEscaneo] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const inputEscaneo = useRef<HTMLInputElement>(null);

  const { data: presupuesto, isFetching } = useQuery({
    queryKey: ['presupuesto', presupuestoId],
    queryFn: () => presupuestosApi.detalle(presupuestoId!),
    enabled: open && !!presupuestoId,
  });

  const { data: resultados } = useQuery({
    queryKey: ['materiales', 'buscar', textoBusqueda],
    queryFn: () => materialesApi.listar({ q: textoBusqueda, activo: true, per_page: 8 }),
    enabled: open && textoBusqueda.trim().length >= 2,
  });

  const limpiar = () => {
    setDestinatario('');
    setDocumento('');
    setContacto('');
    setObservaciones('');
    setLineas([]);
    setEscaneo('');
    setTextoBusqueda('');
    setAviso(null);
    setErrorLocal(null);
  };

  useEffect(() => {
    if (!open) return;
    if (!presupuestoId) {
      limpiar();
      return;
    }
    if (!presupuesto) return;
    setDestinatario(presupuesto.destinatario);
    setDocumento(presupuesto.documento ?? '');
    setContacto(presupuesto.contacto ?? '');
    setObservaciones(presupuesto.observaciones ?? '');
    setLineas(
      (presupuesto.items ?? []).map((i) => ({
        material_id: i.material_id,
        nombre: i.nombre ?? '',
        codigo: i.codigo ?? null,
        unidad: i.unidad ?? 'unidad',
        requiere_serie: !!i.requiere_serie,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        series: i.series ?? [],
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presupuestoId, presupuesto]);

  const guardar = useMutation({
    mutationFn: (payload: CrearPresupuestoInput) =>
      presupuestoId ? presupuestosApi.actualizar(presupuestoId, payload) : presupuestosApi.crear(payload),
    onSuccess: onGuardado,
  });

  const agregarMaterial = (material: Material) => {
    setLineas((prev) => {
      const existente = prev.findIndex((l) => l.material_id === material.id);
      if (existente >= 0) {
        const copia = [...prev];
        copia[existente] = { ...copia[existente], cantidad: copia[existente].cantidad + 1 };
        return copia;
      }
      return [
        ...prev,
        {
          material_id: material.id,
          nombre: material.nombre,
          codigo: material.codigo,
          unidad: material.unidad,
          requiere_serie: material.requiere_serie,
          cantidad: 1,
          // Se propone el precio del catálogo; después se puede pisar.
          precio_unitario: material.precio_unitario,
          series: [],
        },
      ];
    });
    setTextoBusqueda('');
  };

  const agregarSerieSuelta = (serie: string): boolean => {
    let agregada = false;
    setLineas((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const linea = prev[i];
        if (linea.requiere_serie && linea.series.length < linea.cantidad && !linea.series.includes(serie)) {
          const copia = [...prev];
          copia[i] = { ...linea, series: [...linea.series, serie] };
          agregada = true;
          return copia;
        }
      }
      return prev;
    });
    return agregada;
  };

  const procesarEscaneo = async () => {
    const codigo = escaneo.trim();
    if (codigo === '') return;
    setEscaneo('');
    setAviso(null);
    setBuscando(true);
    try {
      const material = await materialesApi.buscarPorCodigo(codigo);
      if (material) {
        agregarMaterial(material);
        return;
      }
      if (!agregarSerieSuelta(codigo)) {
        setAviso(`"${codigo}" no es un material del catálogo.`);
      }
    } catch (e) {
      setAviso(mensajeDeError(e));
    } finally {
      setBuscando(false);
      inputEscaneo.current?.focus();
    }
  };

  const actualizarLinea = (indice: number, cambios: Partial<Linea>) => {
    setLineas((prev) => prev.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));
  };

  const total = lineas.reduce((suma, l) => suma + l.cantidad * l.precio_unitario, 0);

  const enviar = () => {
    setErrorLocal(null);
    if (destinatario.trim() === '') {
      setErrorLocal('Poné a nombre de quién va el presupuesto.');
      return;
    }
    if (lineas.length === 0) {
      setErrorLocal('Agregá al menos un material.');
      return;
    }
    guardar.mutate({
      destinatario: destinatario.trim(),
      documento: documento || undefined,
      contacto: contacto || undefined,
      observaciones: observaciones || undefined,
      items: lineas.map((l) => ({
        material_id: l.material_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        series: l.series,
      })),
    });
  };

  const yaDespachado = presupuesto?.estado === 'despachado';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={presupuestoId ? `Editar presupuesto ${presupuesto?.numero ?? ''}` : 'Nuevo presupuesto'}
      size="xl"
    >
      <div className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo guardar el presupuesto">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}
        {errorLocal && <Alert variant="warning">{errorLocal}</Alert>}
        {yaDespachado && (
          <Alert variant="info">
            Este presupuesto ya fue despachado: al guardar, el stock se ajusta con la diferencia.
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Destinatario *"
            placeholder="Nombre o razón social"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
          />
          <Input label="Documento / CUIT" value={documento} onChange={(e) => setDocumento(e.target.value)} />
          <Input
            label="Contacto"
            placeholder="Teléfono o email"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              ref={inputEscaneo}
              label="Escanear código"
              placeholder="Pasá el lector o tipeá y Enter"
              leftIcon={<Barcode className="w-4 h-4 text-slate-400" />}
              value={escaneo}
              disabled={buscando}
              onChange={(e) => setEscaneo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void procesarEscaneo();
                }
              }}
            />
            <div className="relative">
              <Input
                label="Buscar material"
                placeholder="Por nombre o código..."
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                value={textoBusqueda}
                onChange={(e) => setTextoBusqueda(e.target.value)}
              />
              {textoBusqueda.trim().length >= 2 && (resultados?.data ?? []).length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-56 overflow-y-auto">
                  {(resultados?.data ?? []).map((material) => (
                    <button
                      type="button"
                      key={material.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between gap-2"
                      onClick={() => agregarMaterial(material)}
                    >
                      <span className="truncate">
                        <span className="font-medium text-slate-900 dark:text-white">{material.nombre}</span>
                        {material.codigo && <span className="text-slate-400"> · {material.codigo}</span>}
                      </span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {moneda(material.precio_unitario)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {aviso && <Alert variant="warning">{aviso}</Alert>}

          {lineas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Todavía no hay materiales en el presupuesto.</p>
          ) : (
            <div className="space-y-2">
              {lineas.map((linea, indice) => (
                <div key={linea.material_id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{linea.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {[linea.codigo, linea.unidad].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-end gap-2 flex-shrink-0">
                      <div className="w-20">
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Cant.</label>
                        <input
                          type="number"
                          min={1}
                          className="input py-1 text-sm"
                          value={linea.cantidad}
                          onChange={(e) =>
                            actualizarLinea(indice, { cantidad: Math.max(1, Number(e.target.value) || 1) })
                          }
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                          Precio unit.
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input py-1 text-sm"
                          value={linea.precio_unitario}
                          onChange={(e) =>
                            actualizarLinea(indice, { precio_unitario: Math.max(0, Number(e.target.value) || 0) })
                          }
                        />
                      </div>
                      <div className="w-28 text-right">
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Subtotal</label>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white py-1">
                          {moneda(linea.cantidad * linea.precio_unitario)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLineas((prev) => prev.filter((_, i) => i !== indice))}
                        className="p-1.5 mb-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Quitar del presupuesto"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {linea.requiere_serie && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        Series ({linea.series.length}/{linea.cantidad}) — hacen falta para despachar
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {linea.series.map((serie) => (
                          <Badge key={serie} variant="info" className="gap-1">
                            {serie}
                            <button
                              type="button"
                              onClick={() =>
                                actualizarLinea(indice, { series: linea.series.filter((s) => s !== serie) })
                              }
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        {linea.series.length < linea.cantidad && (
                          <input
                            className="input py-1 text-sm w-44"
                            placeholder="Número de serie"
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              const valor = (e.target as HTMLInputElement).value.trim();
                              if (valor === '' || linea.series.includes(valor)) return;
                              actualizarLinea(indice, { series: [...linea.series, valor] });
                              (e.target as HTMLInputElement).value = '';
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Input label="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lineas.length} línea{lineas.length === 1 ? '' : 's'}
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{moneda(total)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={enviar} loading={guardar.isPending || isFetching} disabled={lineas.length === 0}>
              {presupuestoId ? 'Guardar cambios' : 'Crear presupuesto'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
