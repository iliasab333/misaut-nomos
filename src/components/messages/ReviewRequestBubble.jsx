import React from 'react';
import { Star } from 'lucide-react';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// Burbuja para mensajes con quote_request.kind === 'review_request'.
// Muestra una tarjeta con CTA grande "⭐ Dejar una reseña" que abre /valorar/{token}.
// Nunca muestra la URL en crudo.
export default function ReviewRequestBubble({ data, isMe }) {
  if (!data) return null;
  const token = data.token;
  const url = token ? `/valorar/${token}` : data.url || null;
  const professionalName = data.professional_name || 'el profesional';

  return (
    <div
      className="max-w-[320px] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      style={{ marginBottom: 4 }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ background: `${NAVY}0d`, color: NAVY }}
      >
        <Star className="w-4 h-4" style={{ color: GOLD }} fill={GOLD} />
        <span className="text-xs font-bold uppercase tracking-[0.08em]">
          Solicitud de valoración
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-slate-700 leading-relaxed">
          {isMe
            ? 'Has pedido una valoración. El cliente puede dejarla con un solo toque.'
            : `${professionalName} te pide que valores su servicio. Tarda menos de 1 minuto.`}
        </p>
        {!isMe && url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-1.5 w-full h-11 px-4 rounded-xl text-sm font-semibold text-white"
            style={{ background: NAVY }}
          >
            <Star className="w-4 h-4" fill={GOLD} style={{ color: GOLD }} />
            Dejar una reseña
          </a>
        )}
        {isMe && (
          <div className="mt-3 text-[11px] text-slate-500">
            Le has enviado un botón de un solo uso. No comparta el enlace con
            terceros.
          </div>
        )}
      </div>
    </div>
  );
}
