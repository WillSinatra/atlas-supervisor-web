import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Plan {
  id: string;
  nombre: string;
  velocidad: number;
  precio: number;
  tipo: string;
}

interface FormData {
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  cliente_dni: string;
  cliente_direccion: string;
  cliente_cuit: string;
  cliente_condicion_fiscal: string;
  plan_id: string;
}

export default function CrearAltaRapida() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [form, setForm] = useState<FormData>({
    cliente_nombre: '',
    cliente_email: '',
    cliente_telefono: '',
    cliente_dni: '',
    cliente_direccion: '',
    cliente_cuit: '',
    cliente_condicion_fiscal: '',
    plan_id: '',
  });

  useEffect(() => {
    cargarPlanes();
  }, []);

  const cargarPlanes = async () => {
    try {
      setLoadingPlanes(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/v1/planes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlanes(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error cargando planes:', err);
      setError('No se pudieron cargar los planes');
    } finally {
      setLoadingPlanes(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validarFormulario = (): boolean => {
    const required = ['cliente_nombre', 'cliente_telefono', 'cliente_direccion', 'plan_id'];
    for (const field of required) {
      if (!form[field as keyof FormData]) {
        setError(`El campo es requerido: ${field.replace('cliente_', '')}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/v1/altas-rapidas', form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('¡Alta rápida creada exitosamente!');
      
      setForm({
        cliente_nombre: '',
        cliente_email: '',
        cliente_telefono: '',
        cliente_dni: '',
        cliente_direccion: '',
        cliente_cuit: '',
        cliente_condicion_fiscal: '',
        plan_id: '',
      });

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear la alta rápida';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-lg p-8 transition-colors">
      {/* Toast Éxito */}
      {success && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg border border-green-300 dark:border-green-800/30 transition-colors">
          ✓ {success}
        </div>
      )}

      {/* Toast Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg border border-red-300 dark:border-red-800/30 transition-colors">
          ✗ {error}
        </div>
      )}

      {/* Datos del Cliente */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Datos del Cliente</h2>
        <div className="grid grid-cols-1 gap-4">
          {/* Nombre Completo */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              name="cliente_nombre"
              value={form.cliente_nombre}
              onChange={handleChange}
              placeholder="Juan Pérez"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              required
            />
          </div>

          {/* DNI */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              DNI
            </label>
            <input
              type="text"
              name="cliente_dni"
              value={form.cliente_dni}
              onChange={handleChange}
              placeholder="30123456"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              Email
            </label>
            <input
              type="email"
              name="cliente_email"
              value={form.cliente_email}
              onChange={handleChange}
              placeholder="juan@gmail.com"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              Teléfono *
            </label>
            <input
              type="tel"
              name="cliente_telefono"
              value={form.cliente_telefono}
              onChange={handleChange}
              placeholder="1155667788"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              required
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              Dirección *
            </label>
            <input
              type="text"
              name="cliente_direccion"
              value={form.cliente_direccion}
              onChange={handleChange}
              placeholder="Av. Siempre Viva 742"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              required
            />
          </div>

          {/* CUIT */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              CUIT
            </label>
            <input
              type="text"
              name="cliente_cuit"
              value={form.cliente_cuit}
              onChange={handleChange}
              placeholder="20-12345678-9"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
            />
          </div>

          {/* Condición Fiscal */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              Condición Fiscal
            </label>
            <select
              name="cliente_condicion_fiscal"
              value={form.cliente_condicion_fiscal}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
            >
              <option value="">Seleccionar condición</option>
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributista">Monotributista</option>
              <option value="consumidor_final">Consumidor Final</option>
              <option value="no_inscripto">No Inscripto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plan Seleccionado */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Plan Seleccionado</h2>
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
            Plan *
          </label>
          <select
            name="plan_id"
            value={form.plan_id}
            onChange={handleChange}
            disabled={loadingPlanes}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            required
          >
            <option value="">
              {loadingPlanes ? 'Cargando planes...' : 'Seleccionar plan'}
            </option>
            {planes.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre} - {plan.velocidad} Mbps - ${plan.precio.toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        {form.plan_id && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800/30 transition-colors">
            {(() => {
              const plan = planes.find(p => p.id === form.plan_id);
              return plan ? (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">{plan.nombre}</span> - 
                  <span className="font-semibold"> ${plan.precio.toLocaleString()}</span>
                </p>
              ) : null;
            })()}
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => setForm({
            cliente_nombre: '',
            cliente_email: '',
            cliente_telefono: '',
            cliente_dni: '',
            cliente_direccion: '',
            cliente_cuit: '',
            cliente_condicion_fiscal: '',
            plan_id: '',
          })}
          className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar Alta Rápida'}
        </button>
      </div>
    </form>
  );
}
