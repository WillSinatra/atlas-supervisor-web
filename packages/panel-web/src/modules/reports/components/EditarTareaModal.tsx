import { useState } from 'react';
import { api } from '@/shared/services/api';

interface Props {
  open: boolean;
  tarea: any;
  onClose: () => void;
  onSave: () => void;
}

export function EditarTareaModal({ open, tarea, onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    titulo: tarea?.titulo || '',
    fecha_inicio: tarea?.fecha_inicio?.split('T')[0] || '',
    fecha_fin: tarea?.fecha_fin?.split('T')[0] || '',
    progreso: tarea?.progress || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const payload = {
    titulo: formData.titulo,
    fecha_inicio: formData.fecha_inicio,
    fecha_fin: formData.fecha_fin,
    progreso: formData.progreso,
    estado: formData.progreso === 100 ? 'hecha' : formData.progreso > 0 ? 'en_curso' : 'pendiente',
 };

const handleSave = async () => {
  setLoading(true);
  setError('');
  try {
    const payload = {
      titulo: formData.titulo,
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      progreso: formData.progreso,
      estado: formData.progreso === 100 ? 'hecha' : formData.progreso > 0 ? 'en_curso' : 'pendiente',
    };
    await api.patch(`/v1/tareas/${tarea.id}`, payload);
    onSave();
    onClose();
    // Recargar página para ver cambios
    setTimeout(() => window.location.reload(), 500);
  } catch (err: any) {
    setError(err.response?.data?.message || 'Error al guardar');
  } finally {
    setLoading(false);
  }
};

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96 border border-gray-700">
        <h2 className="text-lg font-bold mb-4 text-white">Editar Tarea</h2>
        
        {error && <div className="mb-4 p-2 bg-red-900 text-red-200 rounded text-sm">{error}</div>}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
            <input 
              type="text" 
              value={formData.titulo} 
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Inicio</label>
            <input 
              type="date" 
              value={formData.fecha_inicio} 
              onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Fin</label>
            <input 
              type="date" 
              value={formData.fecha_fin} 
              onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Progreso (%)</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              value={formData.progreso} 
              onChange={(e) => setFormData({...formData, progreso: parseInt(e.target.value)})}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
