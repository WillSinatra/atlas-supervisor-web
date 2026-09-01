import { TicketBeta } from '@/types/atlas';

interface TicketCardProps {
  ticket: TicketBeta;
  onTomar?: (id: string) => void;
  onSoltar?: (id: string) => void;
  isTomandoLoading?: boolean;
  usuarioEmpleadoId?: string;
}

export function TicketCard({
  ticket,
  onTomar,
  onSoltar,
  isTomandoLoading = false,
  usuarioEmpleadoId,
}: TicketCardProps) {
  const bgColor = ticket.color_asignado || '#2E3B52';
  const isTomadomPorMi = ticket.tomado_por_id === usuarioEmpleadoId;

  return (
    <div
      className="p-4 rounded border-l-4 transition-all hover:shadow-lg"
      style={{
        backgroundColor: bgColor,
        borderLeftColor: ticket.color_asignado || '#666',
        opacity: ticket.estado === 'en_proceso' ? 0.9 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-bold text-white text-lg">{ticket.cliente}</h3>
          <p className="text-xs text-gray-300 mt-1">{ticket.tipo}</p>
        </div>
        {ticket.estado === 'nuevo' && (
          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
            Nuevo
          </span>
        )}
        {ticket.estado === 'en_proceso' && (
          <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-semibold">
            En Proceso
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-400 text-xs">TELÉFONO</p>
          <p className="text-white font-semibold">{ticket.cliente_telefono || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">DIRECCIÓN</p>
          <p className="text-white font-semibold">{ticket.direccion}</p>
        </div>
        {ticket.zona && (
          <div>
            <p className="text-gray-400 text-xs">ZONA</p>
            <p className="text-white font-semibold">{ticket.zona}</p>
          </div>
        )}
      </div>

      {ticket.descripcion && (
        <div className="mt-3">
          <p className="text-gray-400 text-xs">QUÉ REPORTÓ</p>
          <p className="text-white text-sm mt-1">{ticket.descripcion}</p>
        </div>
      )}

      {ticket.tomado_por_id && (
        <div className="mt-3 bg-black bg-opacity-40 p-2 rounded">
          <p className="text-xs text-gray-300">
            👤 Tomado por: <strong className="text-white">{ticket.tomado_por_nombre}</strong>
          </p>
          {ticket.tomado_en && (
            <p className="text-xs text-gray-400 mt-1">
              🕐 {new Date(ticket.tomado_en).toLocaleString('es-AR')}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2 flex-wrap">
        {ticket.estado === 'nuevo' && !ticket.tomado_por_id && onTomar && (
          <button
            onClick={() => onTomar(ticket.id)}
            disabled={isTomandoLoading}
            className="flex-1 min-w-[120px] bg-white text-blue-600 font-bold py-2 px-3 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            {isTomandoLoading ? '⏳' : '✋'} Tomar
          </button>
        )}

        {isTomadomPorMi && ticket.estado === 'en_proceso' && onSoltar && (
          <button
            onClick={() => onSoltar(ticket.id)}
            disabled={isTomandoLoading}
            className="flex-1 min-w-[120px] bg-orange-600 text-white font-bold py-2 px-3 rounded hover:bg-orange-700 disabled:opacity-50"
          >
            🔓 Soltar
          </button>
        )}

        <button className="flex-1 min-w-[120px] bg-blue-600 text-white font-bold py-2 px-3 rounded hover:bg-blue-700">
          ✏️ Editar
        </button>

        {ticket.estado === 'en_proceso' && (
          <button className="flex-1 min-w-[120px] bg-green-600 text-white font-bold py-2 px-3 rounded hover:bg-green-700">
            ✔️ Resolver
          </button>
        )}
      </div>
    </div>
  );
}
