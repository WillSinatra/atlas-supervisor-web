import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, FileText, Eye } from 'lucide-react';

interface Alta {
  id: string;
  cliente: { nombre: string; email: string; telefono: string; dni: string; direccion: string };
  plan: { id: string; nombre: string; precio: number; velocidad: number };
  comprobante_url: string | null;
  pago_verificado: boolean;
  estado: string;
  creado_en: string;
}

export default function ValidarAltaModal({ alta: initialAlta, onClose }: { alta: Alta; onClose: () => void }) {
  const [alta, setAlta] = useState(initialAlta);
  const [montoPago, setMontoPago] = useState(alta.plan.precio.toString());
  const [pagoVerificado, setPagoVerificado] = useState(alta.pago_verificado);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(alta.comprobante_url ? '/api' + alta.comprobante_url : null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; type: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const muentaCoincide = parseFloat(montoPago) === alta.plan.precio;

  const handleArchivoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const archivo = e.target.files[0];

      try {
        setUploadando(true);
        setError(null);
        const token = localStorage.getItem('accessToken');
        const formData = new FormData();
        formData.append('archivo', archivo);

        const response = await axios.post(
          `/api/v1/altas-rapidas/${alta.id}/comprobante`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );

        setAlta(response.data);
        setPreviewUrl('/api' + response.data.comprobante_url);
        setPreviewFile({ name: archivo.name, type: archivo.type });
        setUploadando(false);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al subir comprobante');
        setUploadando(false);
      }
    }
  };

  const handleValidar = async () => {
    if (!pagoVerificado) { setError('Marca pago verificado'); return; }
    if (!muentaCoincide) { setError('Monto incorrecto'); return; }

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.patch(`/api/v1/altas-rapidas/${alta.id}/validar`, { pago_verificado: true, monto_pago: parseFloat(montoPago) }, { headers: { Authorization: `Bearer ${token}` } });
      setAlta(response.data);
      setPagoVerificado(true);
      setSuccess('¡Pago validado!');
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Validar Alta</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
          </div>

          <div className="p-6 space-y-6">
            {error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded">{error}</div>}
            {success && <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded">{success}</div>}

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Cliente</h3>
              <p className="text-sm text-slate-900 dark:text-white">{alta.cliente.nombre}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{alta.cliente.telefono}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Plan</h3>
              <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded">
                <p className="text-sm text-slate-900 dark:text-white font-semibold">{alta.plan.nombre}</p>
                <p className="text-lg font-bold text-blue-600">${alta.plan.precio.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Comprobante de Pago</h3>
              {previewUrl ? (
                <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded border border-slate-300 dark:border-slate-600">
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold mb-3">✓ Comprobante cargado</p>
                  <button onClick={() => setShowPreviewModal(true)} className="flex items-center gap-2 w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                    <Eye className="w-4 h-4" />
                    Ver Validación
                  </button>
                  {previewFile && <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">📄 {previewFile.name}</p>}
                </div>
              ) : (
                <div className="p-6 bg-slate-700/40 border-2 border-dashed border-yellow-500/60 rounded-lg">
                  <p className="text-sm text-yellow-400 mb-4 font-medium">Sin comprobante. Cargalo aqui:</p>
                  <input type="file" accept="image/*,application/pdf" id="fileComprobante" onChange={handleArchivoSeleccionado} disabled={uploadando} className="hidden" />
                  <label htmlFor="fileComprobante" className="flex items-center justify-center gap-2 w-full px-4 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-900 font-bold rounded-lg cursor-pointer transition-all mb-4 shadow-lg" style={{pointerEvents: uploadando ? 'none' : 'auto', opacity: uploadando ? 0.6 : 1}}>
                    <Upload className="w-5 h-5" />
                    {uploadando ? 'Subiendo...' : 'Seleccionar archivo'}
                  </label>
                  <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                    <FileText className="w-4 h-4" />
                    Ningún archivo seleccionado
                  </div>
                </div>
              )}
            </div>

            {previewUrl && !alta.pago_verificado && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Monto (ARS)</label>
                  <input type="number" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded" />
                  {muentaCoincide ? <p className="text-xs text-green-600 mt-1">✓ OK</p> : <p className="text-xs text-red-600 mt-1">Incorrecto</p>}
                </div>

                <label className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <input type="checkbox" checked={pagoVerificado} onChange={(e) => setPagoVerificado(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500" />
                  <span className="text-base font-medium text-slate-900 dark:text-white">Confirmo que el pago ha sido verificado</span>
                </label>
              </>
            )}

            {previewUrl && alta.pago_verificado && (
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-800 text-center">
                <p className="text-lg font-bold text-green-700 dark:text-green-400">✓ Validado</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">El pago ha sido verificado</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 justify-center">
            <button onClick={onClose} className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            {previewUrl && !alta.pago_verificado && (
              <button onClick={handleValidar} disabled={loading || !pagoVerificado || !muentaCoincide} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 transition-colors">
                {loading ? 'Validando...' : 'Validar Pago'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showPreviewModal && previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Comprobante</h2>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <div className="p-6">
              {(() => {
                const isImage = previewUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(previewUrl);
                return isImage ? (
                  <img src={previewUrl} alt="Comprobante" className="w-full rounded" />
                ) : (
                  <div className="text-center p-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">Archivo PDF</p>
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Descargar PDF</a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
