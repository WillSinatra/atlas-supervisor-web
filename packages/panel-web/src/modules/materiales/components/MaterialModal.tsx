import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Barcode } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { mensajeDeError } from '@/shared/services/api';
import { materialesApi } from '@/shared/services/materiales';
import { CodigoBarras } from '@/shared/components/CodigoBarras';
import type { CrearMaterialInput, Material } from '@/types/atlas';

interface MaterialModalProps {
  open: boolean;
  /** null = alta; con material = edición. */
  material: Material | null;
  categorias: string[];
  onClose: () => void;
  onGuardado: () => void;
}

interface FormState {
  nombre: string;
  codigo: string;
  codigo_barras: string;
  categoria: string;
  unidad: string;
  detalle: string;
  stock_actual: string;
  stock_minimo: string;
  precio_unitario: string;
  activo: boolean;
  requiere_serie: boolean;
}

const formVacio: FormState = {
  nombre: '',
  codigo: '',
  codigo_barras: '',
  categoria: '',
  unidad: 'unidad',
  detalle: '',
  stock_actual: '0',
  stock_minimo: '0',
  precio_unitario: '0',
  activo: true,
  requiere_serie: false,
};

const unidades = ['unidad', 'metro', 'caja', 'rollo', 'par', 'litro', 'kilo'];

function desdeMaterial(material: Material | null): FormState {
  if (!material) return { ...formVacio };
  return {
    nombre: material.nombre,
    codigo: material.codigo ?? '',
    codigo_barras: material.codigo_barras ?? '',
    categoria: material.categoria ?? '',
    unidad: material.unidad,
    detalle: material.detalle ?? '',
    stock_actual: String(material.stock_actual),
    stock_minimo: String(material.stock_minimo),
    precio_unitario: String(material.precio_unitario),
    activo: material.activo,
    requiere_serie: material.requiere_serie,
  };
}

const oNulo = (valor: string) => (valor.trim() === '' ? null : valor.trim());

export function MaterialModal({ open, material, categorias, onClose, onGuardado }: MaterialModalProps) {
  const [form, setForm] = useState<FormState>(formVacio);
  const [errores, setErrores] = useState<Partial<Record<keyof FormState, string>>>({});
  const [generarAlGuardar, setGenerarAlGuardar] = useState(false);

  const guardar = useMutation({
    mutationFn: (payload: CrearMaterialInput) =>
      material ? materialesApi.actualizar(material.id, payload) : materialesApi.crear(payload),
    onSuccess: onGuardado,
  });

  // Lo que se compra suelto no viene con código de fábrica. El código lo tiene
  // que armar el servidor: es el único que puede garantizar que no se repita.
  const generarCodigo = useMutation({
    mutationFn: async () => {
      if (material) return (await materialesApi.generarCodigoBarras(material.id)).codigo_barras;
      // En el alta todavía no hay a qué material pegárselo, así que se pide al
      // guardar (el backend lo genera con generar_codigo_barras).
      return null;
    },
    onSuccess: (codigo) => {
      if (codigo) setCampo('codigo_barras', codigo);
    },
  });

  useEffect(() => {
    if (!open) return;
    setForm(desdeMaterial(material));
    setErrores({});
    setGenerarAlGuardar(false);
    guardar.reset();
    generarCodigo.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, material]);

  const setCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombre.trim()) nuevos.nombre = 'Ingresá el nombre del material.';
    if (form.stock_actual !== '' && Number.isNaN(Number(form.stock_actual))) {
      nuevos.stock_actual = 'Tiene que ser un número.';
    }
    if (form.stock_minimo !== '' && Number.isNaN(Number(form.stock_minimo))) {
      nuevos.stock_minimo = 'Tiene que ser un número.';
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    guardar.mutate({
      nombre: form.nombre.trim(),
      codigo: oNulo(form.codigo),
      codigo_barras: oNulo(form.codigo_barras),
      // Solo en el alta: en la edición hay un botón que lo genera al instante.
      ...(!material && generarAlGuardar && !form.codigo_barras.trim()
        ? { generar_codigo_barras: true }
        : {}),
      categoria: oNulo(form.categoria),
      unidad: form.unidad || 'unidad',
      detalle: oNulo(form.detalle),
      stock_actual: Number(form.stock_actual || 0),
      stock_minimo: Number(form.stock_minimo || 0),
      precio_unitario: Number(form.precio_unitario || 0),
      activo: form.activo,
      requiere_serie: form.requiere_serie,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={material ? 'Editar material' : 'Agregar material'} size="lg">
      <form onSubmit={enviar} className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo guardar el material">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Nombre *"
              value={form.nombre}
              error={errores.nombre}
              onChange={(e) => setCampo('nombre', e.target.value)}
            />
          </div>
          <Input
            label="Código interno"
            placeholder="El del pañol"
            value={form.codigo}
            onChange={(e) => setCampo('codigo', e.target.value)}
          />
          <div>
            <Input
              label="Código de barras"
              placeholder="El que trae el producto"
              value={form.codigo_barras}
              onChange={(e) => setCampo('codigo_barras', e.target.value)}
            />
            {form.codigo_barras.trim() ? (
              <div className="mt-2 w-full max-w-[220px]">
                <CodigoBarras valor={form.codigo_barras.trim()} alto={26} />
              </div>
            ) : material ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                icon={<Barcode className="w-4 h-4" />}
                loading={generarCodigo.isPending}
                onClick={() => generarCodigo.mutate()}
              >
                Generar uno
              </Button>
            ) : (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generarAlGuardar}
                  onChange={(e) => setGenerarAlGuardar(e.target.checked)}
                />
                Generar uno al guardar
              </label>
            )}
            {generarCodigo.isError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {mensajeDeError(generarCodigo.error)}
              </p>
            )}
          </div>
          <Input
            label="Categoría"
            list="categorias-material"
            value={form.categoria}
            onChange={(e) => setCampo('categoria', e.target.value)}
          />
          <datalist id="categorias-material">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Select
            label="Unidad"
            options={unidades.map((u) => ({ value: u, label: u }))}
            value={form.unidad}
            onChange={(e) => setCampo('unidad', e.target.value)}
          />
          <Input
            label="Stock actual"
            type="number"
            value={form.stock_actual}
            error={errores.stock_actual}
            onChange={(e) => setCampo('stock_actual', e.target.value)}
          />
          <Input
            label="Stock mínimo"
            type="number"
            placeholder="0 = sin alerta"
            value={form.stock_minimo}
            error={errores.stock_minimo}
            onChange={(e) => setCampo('stock_minimo', e.target.value)}
          />
          <Input
            label="Precio unitario"
            type="number"
            step="0.01"
            value={form.precio_unitario}
            onChange={(e) => setCampo('precio_unitario', e.target.value)}
          />
          <Select
            label="Estado"
            options={[
              { value: 'activo', label: 'Activo' },
              { value: 'inactivo', label: 'Inactivo' },
            ]}
            value={form.activo ? 'activo' : 'inactivo'}
            onChange={(e) => setCampo('activo', e.target.value === 'activo')}
          />
          <div className="sm:col-span-2">
            <Input label="Detalle" value={form.detalle} onChange={(e) => setCampo('detalle', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.requiere_serie}
                onChange={(e) => setCampo('requiere_serie', e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium text-slate-900 dark:text-white">Lleva número de serie</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Para modems, ONTs y equipos similares. Al entregarlos, el remito va a exigir una serie por unidad.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            {material ? 'Guardar cambios' : 'Crear material'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
