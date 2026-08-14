import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Barcode, Plus, Search, Trash2, X } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { cuadrillasApi, mensajeDeError } from '@/shared/services/api';
import { empleadosApi } from '@/shared/services/personal';
import { materialesApi, remitosApi } from '@/shared/services/materiales';
import type { CrearRemitoInput, DestinoRemito, Material, TipoRemito } from '@/types/atlas';

interface RemitoModalProps {
  open: boolean;
  /** null = remito nuevo; con id = corrección de uno existente. */
  remitoId: string | null;
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
  series: string[];
}

const etiquetasDestino: Record<DestinoRemito, string> = {
  cuadrilla: 'Cuadrilla',
  empleado: 'Empleado',
  externo: 'Persona externa',
};

/**
 * Alta y corrección de remitos.
 *
 * El campo de escaneo resuelve solo el caso de los equipos: primero busca el
 * código contra el catálogo y, si no es un producto conocido, lo toma como
 * número de serie de la última línea que todavía espera series. Es lo que pasa
 * con las etiquetas de los modems, donde conviven los dos códigos.
 */
export function RemitoModal({ open, remitoId, onClose, onGuardado }: RemitoModalProps) {
  const [tipo, setTipo] = useState<TipoRemito>('entrega');
  const [destinoTipo, setDestinoTipo] = useState<DestinoRemito>('cuadrilla');
  const [cuadrillaId, setCuadrillaId] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');
  const [personaNombre, setPersonaNombre] = useState('');
  const [personaDocumento, setPersonaDocumento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);

  const [escaneo, setEscaneo] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const inputEscaneo = useRef<HTMLInputElement>(null);

  const { data: remito, isFetching: cargandoRemito } = useQuery({
    queryKey: ['remito', remitoId],
    queryFn: () => remitosApi.detalle(remitoId!),
    enabled: open && !!remitoId,
  });

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas', 'para-remito'],
    queryFn: () => cuadrillasApi.listar(),
    enabled: open,
  });

  const { data: empleadosData } = useQuery({
    queryKey: ['empleados', 'para-remito'],
    queryFn: () => empleadosApi.listar({ estado: 'activo', per_page: 200 }),
    enabled: open && destinoTipo === 'empleado',
  });

  const { data: resultados } = useQuery({
    queryKey: ['materiales', 'buscar', textoBusqueda],
    queryFn: () => materialesApi.listar({ q: textoBusqueda, activo: true, per_page: 8 }),
    enabled: open && textoBusqueda.trim().length >= 2,
  });

  const limpiar = () => {
    setTipo('entrega');
    setDestinoTipo('cuadrilla');
    setCuadrillaId('');
    setEmpleadoId('');
    setPersonaNombre('');
    setPersonaDocumento('');
    setObservaciones('');
    setLineas([]);
    setEscaneo('');
    setTextoBusqueda('');
    setAviso(null);
    setErrorLocal(null);
  };

  // Al abrir: form vacío si es nuevo, o los datos del remito si es corrección.
  useEffect(() => {
    if (!open) return;
    if (!remitoId) {
      limpiar();
      return;
    }
    if (!remito) return;
    setTipo(remito.tipo);
    setDestinoTipo(remito.destino_tipo);
    setCuadrillaId(remito.cuadrilla_id ?? '');
    setEmpleadoId(remito.empleado_id ?? '');
    setPersonaNombre(remito.persona_nombre ?? '');
    setPersonaDocumento(remito.persona_documento ?? '');
    setObservaciones(remito.observaciones ?? '');
    setLineas(
      (remito.items ?? []).map((i) => ({
        material_id: i.material_id,
        nombre: i.nombre ?? '',
        codigo: i.codigo ?? null,
        unidad: i.unidad ?? 'unidad',
        requiere_serie: !!i.requiere_serie,
        cantidad: i.cantidad,
        series: i.series ?? [],
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, remitoId, remito]);

  const guardar = useMutation({
    mutationFn: (payload: CrearRemitoInput) =>
      remitoId ? remitosApi.actualizar(remitoId, payload) : remitosApi.crear(payload),
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
          series: [],
        },
      ];
    });
    setTextoBusqueda('');
  };

  /** Suma la serie a la última línea que todavía tenga lugar. */
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
      // No es un producto: se interpreta como número de serie.
      if (!agregarSerieSuelta(codigo)) {
        setAviso(
          `"${codigo}" no es un material del catálogo. Si es un número de serie, primero agregá el equipo y después escaneá la serie.`,
        );
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

  const enviar = () => {
    setErrorLocal(null);
    if (lineas.length === 0) {
      setErrorLocal('Agregá al menos un material.');
      return;
    }
    const faltanSeries = lineas.find((l) => l.requiere_serie && l.series.length !== l.cantidad);
    if (faltanSeries) {
      setErrorLocal(
        `${faltanSeries.nombre} lleva número de serie: cargá ${faltanSeries.cantidad} y llevás ${faltanSeries.series.length}.`,
      );
      return;
    }

    guardar.mutate({
      tipo,
      destino_tipo: destinoTipo,
      cuadrilla_id: destinoTipo === 'cuadrilla' ? cuadrillaId : undefined,
      empleado_id: destinoTipo === 'empleado' ? empleadoId : undefined,
      persona_nombre: destinoTipo === 'externo' ? personaNombre : undefined,
      persona_documento: destinoTipo === 'externo' ? personaDocumento : undefined,
      observaciones: observaciones || undefined,
      items: lineas.map((l) => ({ material_id: l.material_id, cantidad: l.cantidad, series: l.series })),
    });
  };

  const unidadesTotal = lineas.reduce((suma, l) => suma + l.cantidad, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={remitoId ? `Corregir remito ${remito?.numero ?? ''}` : 'Nuevo remito'}
      size="xl"
    >
      <div className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo guardar el remito">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}
        {errorLocal && <Alert variant="warning">{errorLocal}</Alert>}
        {remitoId && (
          <Alert variant="info">
            Se corrige el remito existente: mantiene su número y su fecha, y el stock se recalcula con la diferencia.
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="Tipo"
            options={[
              { value: 'entrega', label: 'Entrega (sale del depósito)' },
              { value: 'devolucion', label: 'Devolución (vuelve al depósito)' },
            ]}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRemito)}
          />
          <Select
            label="Destino"
            options={Object.entries(etiquetasDestino).map(([value, label]) => ({ value, label }))}
            value={destinoTipo}
            onChange={(e) => setDestinoTipo(e.target.value as DestinoRemito)}
          />
          {destinoTipo === 'cuadrilla' && (
            <div className="sm:col-span-2">
              <Select
                label="Cuadrilla *"
                placeholder="Seleccionar cuadrilla"
                options={(cuadrillasData?.data ?? []).map((c) => ({ value: c.id, label: c.nombre }))}
                value={cuadrillaId}
                onChange={(e) => setCuadrillaId(e.target.value)}
              />
            </div>
          )}
          {destinoTipo === 'empleado' && (
            <div className="sm:col-span-2">
              <Select
                label="Empleado *"
                placeholder="Seleccionar empleado"
                options={(empleadosData?.data ?? []).map((emp) => ({
                  value: emp.id,
                  label: [emp.nombre, emp.area?.nombre].filter(Boolean).join(' · '),
                }))}
                value={empleadoId}
                onChange={(e) => setEmpleadoId(e.target.value)}
              />
            </div>
          )}
          {destinoTipo === 'externo' && (
            <>
              <Input
                label="Quién retira *"
                value={personaNombre}
                onChange={(e) => setPersonaNombre(e.target.value)}
              />
              <Input
                label="Documento"
                value={personaDocumento}
                onChange={(e) => setPersonaDocumento(e.target.value)}
              />
            </>
          )}
        </div>

        {/* Carga de líneas */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              ref={inputEscaneo}
              label="Escanear código"
              placeholder="Pasá el lector o tipeá el código y Enter"
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
                      <span className="text-xs text-slate-400 flex-shrink-0">stock {material.stock_actual}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {aviso && <Alert variant="warning">{aviso}</Alert>}

          {lineas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Todavía no hay materiales en este remito.
            </p>
          ) : (
            <div className="space-y-2">
              {lineas.map((linea, indice) => (
                <div key={linea.material_id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{linea.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {[linea.codigo, linea.unidad].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number"
                        min={1}
                        className="input py-1 w-20 text-sm"
                        value={linea.cantidad}
                        onChange={(e) =>
                          actualizarLinea(indice, { cantidad: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setLineas((prev) => prev.filter((_, i) => i !== indice))}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Quitar del remito"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {linea.requiere_serie && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        Series ({linea.series.length}/{linea.cantidad}) — escaneá o escribí y Enter
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
                              title="Quitar serie"
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

        <Input
          label="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lineas.length} línea{lineas.length === 1 ? '' : 's'} · {unidadesTotal} unidad
            {unidadesTotal === 1 ? '' : 'es'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={enviar}
              loading={guardar.isPending || cargandoRemito}
              disabled={lineas.length === 0}
            >
              {remitoId ? 'Guardar corrección' : 'Emitir remito'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
