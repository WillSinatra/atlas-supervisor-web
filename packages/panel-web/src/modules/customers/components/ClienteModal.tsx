import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { clientesApi, mensajeDeError } from '@/shared/services/api';
import type { Cliente } from '@/types/atlas';

interface ClienteModalProps {
  open: boolean;
  /** null = alta; con cliente = edición. */
  cliente: Cliente | null;
  onClose: () => void;
  onGuardado: (cliente: Cliente) => void;
}

interface FormState {
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  lat: string;
  lng: string;
}

const formVacio: FormState = { nombre: '', telefono: '', email: '', direccion: '', lat: '', lng: '' };

/** '' se manda como null para que el backend distinga "sin dato" de "vacío". */
const oNulo = (valor: string) => (valor.trim() === '' ? null : valor.trim());

export function ClienteModal({ open, cliente, onClose, onGuardado }: ClienteModalProps) {
  const [form, setForm] = useState<FormState>(formVacio);
  const [errores, setErrores] = useState<Partial<Record<keyof FormState, string>>>({});

  const guardar = useMutation({
    mutationFn: async () => {
      if (cliente) {
        return clientesApi.actualizar(cliente.id, {
          nombre: form.nombre.trim(),
          telefono: oNulo(form.telefono),
          email: oNulo(form.email),
        });
      }
      // En el alta el primer domicilio viaja junto con el cliente: la API lo
      // inserta en la misma transacción.
      const direccion = oNulo(form.direccion);
      return clientesApi.crear({
        nombre: form.nombre.trim(),
        telefono: oNulo(form.telefono),
        email: oNulo(form.email),
        ...(direccion
          ? {
              domicilio: {
                direccion,
                lat: form.lat.trim() ? Number(form.lat) : null,
                lng: form.lng.trim() ? Number(form.lng) : null,
              },
            }
          : {}),
      });
    },
    onSuccess: onGuardado,
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      cliente
        ? { ...formVacio, nombre: cliente.nombre, telefono: cliente.telefono ?? '', email: cliente.email ?? '' }
        : { ...formVacio },
    );
    setErrores({});
    guardar.reset();
    // El formulario se rearma cada vez que se abre el modal o cambia el cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente]);

  const setCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const validar = (): boolean => {
    const nuevos: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombre.trim()) nuevos.nombre = 'Ingresá el nombre del cliente.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nuevos.email = 'El email no parece válido.';
    }
    if (form.telefono.trim() && form.telefono.replace(/\D/g, '').length < 6) {
      nuevos.telefono = 'El teléfono es demasiado corto.';
    }
    for (const campo of ['lat', 'lng'] as const) {
      const valor = form[campo].trim();
      if (valor && Number.isNaN(Number(valor))) {
        nuevos[campo] = 'Tiene que ser un número.';
      }
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    guardar.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={cliente ? 'Editar cliente' : 'Nuevo cliente'} size="lg">
      <form onSubmit={enviar} className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo guardar el cliente">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Nombre o razón social *"
              value={form.nombre}
              error={errores.nombre}
              onChange={(e) => setCampo('nombre', e.target.value)}
            />
          </div>
          <Input
            label="Teléfono"
            value={form.telefono}
            error={errores.telefono}
            onChange={(e) => setCampo('telefono', e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            error={errores.email}
            onChange={(e) => setCampo('email', e.target.value)}
          />
        </div>

        {!cliente && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Primer domicilio</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Opcional. Es el domicilio donde se va a hacer el trabajo; después se pueden agregar más desde la
                ficha del cliente.
              </p>
            </div>
            <Input
              label="Dirección"
              placeholder="Calle 123, Localidad"
              value={form.direccion}
              onChange={(e) => setCampo('direccion', e.target.value)}
            />
            {form.direccion.trim() !== '' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Latitud"
                  placeholder="-37.3217"
                  value={form.lat}
                  error={errores.lat}
                  onChange={(e) => setCampo('lat', e.target.value)}
                />
                <Input
                  label="Longitud"
                  placeholder="-59.1332"
                  value={form.lng}
                  error={errores.lng}
                  onChange={(e) => setCampo('lng', e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            {cliente ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
