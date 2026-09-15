import React from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// Burbuja para mensajes con quote_request.kind === 'review_request'.
// Muestra una tarjeta con CTA grande "⭐ Dejar una reseña" que abre /valorar/{token}.
// Nunca muestra la URL en crudo.
export default function ReviewRequestBubble({ data, isMe }) {
  const { t } = useTranslation();
  if (!data) return null;
  const token = data.token;
  const url = token ? `/valorar/${token}` : data.url || null;
  const professionalName = data.professional_name || t('messages.professionalFallback');

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
          {t('messages.reviewRequest.title')}
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-slate-700 leading-relaxed">
          {isMe
            ? t('messages.reviewRequest.sentByMe')
            : t('messages.reviewRequest.received', { name: professionalName })}
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
            {t('messages.reviewRequest.leaveReview')}
          </a>
        )}
        {isMe && (
          <div className="mt-3 text-[11px] text-slate-500">
            {t('messages.reviewRequest.singleUseNote')}
          </div>
        )}
      </div>
    </div>
  );
}
