import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import { optimizeSupabaseImage } from '@/lib/supabaseImage';
import { getReviewRequest, submitReview } from '@/lib/reviewRpc';
import { toast } from 'sonner';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// /valorar/:token — página móvil-first de una sola pantalla.
// 1) Resuelve el token con get_review_request (RPC).
// 2) Si valid, muestra foto + business_name + formulario con rating
//    obligatorio (1–5) y subratings opcionales.
// 3) Envía con submit_review(token, ...). Maneja errores conocidos.
export default function LeaveReviewPage() {
  const { token: paramToken } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [reason, setReason] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [clientName, setClientName] = useState('');
  const [sub, setSub] = useState({
    comunicacion: 0,
    calidad: 0,
    rapidez: 0,
    precio_satisfaccion: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!paramToken) {
        setReason('no_existe');
        setLoading(false);
        return;
      }
      try {
        const data = await getReviewRequest(paramToken);
        if (cancelled) return;
        if (!data || data.valid === false) {
          setReason(data?.reason || 'no_existe');
          setInfo(null);
        } else {
          setInfo(data);
        }
      } catch (e) {
        if (!cancelled) setReason(e?.message || 'no_existe');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramToken]);

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!rating) {
      toast.error('Pon una nota global');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitReview({
        token: paramToken,
        rating,
        comment: comment.trim() || null,
        comunicacion: sub.comunicacion || null,
        calidad: sub.calidad || null,
        rapidez: sub.rapidez || null,
        precio_satisfaccion: sub.precio_satisfaccion || null,
        client_name: clientName.trim() || null,
      });
      if (res?.ok === false) {
        const r = res?.reason || 'error';
        if (r === 'ya_valorado' || r === 'token_caducado' || r === 'no_existe') {
          setReason(r);
        } else {
          toast.error('No se ha podido enviar la valoración.');
        }
        return;
      }
      setSubmitted(true);
    } catch (e) {
      const m = (e?.message || '').toLowerCase();
      if (m.includes('ya_valorado')) setReason('ya_valorado');
      else if (m.includes('caducado') || m.includes('expir')) setReason('token_caducado');
      else if (m.includes('no_existe') || m.includes('invalid')) setReason('no_existe');
      else toast.error(e?.message || 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  };

  const photo = info?.photo
    ? optimizeSupabaseImage(info.photo, { width: 200, height: 200 })
    : null;
  const businessName = info?.business_name || 'el profesional';

  return (
    <>
      <SEOHead title="Dejar una reseña — MisAutónomos" noindex />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-6 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : reason ? (
            <InvalidTokenView
              reason={reason}
              onHome={() => navigate('/')}
            />
          ) : submitted ? (
            <SubmittedView
              businessName={businessName}
              onHome={() => navigate('/')}
            />
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                {photo ? (
                  <img
                    src={photo}
                    alt={businessName}
                    width="72"
                    height="72"
                    className="w-[72px] h-[72px] rounded-full object-cover border border-slate-200"
                    loading="eager"
                  />
                ) : (
                  <InitialsAvatar name={businessName} size={72} />
                )}
                <h1 className="text-xl font-extrabold text-slate-900 mt-3">
                  Valora a {businessName}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Tu opinión ayuda a otras personas. Tarda menos de un minuto.
                </p>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <Field label="Tu valoración" required>
                  <RatingRow value={rating} onChange={setRating} big />
                </Field>

                <Field label="Comentario (opcional)">
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Cuenta cómo fue la experiencia."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                  />
                </Field>

                <Field label="Tu nombre (opcional)">
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Cómo aparecerá tu valoración"
                    autoComplete="name"
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                  />
                </Field>

                <details className="rounded-xl border border-slate-200 bg-white p-3">
                  <summary className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    Detallar valoración (opcional)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <SubratingRow
                      label="Comunicación"
                      value={sub.comunicacion}
                      onChange={(v) => setSub((s) => ({ ...s, comunicacion: v }))}
                    />
                    <SubratingRow
                      label="Calidad"
                      value={sub.calidad}
                      onChange={(v) => setSub((s) => ({ ...s, calidad: v }))}
                    />
                    <SubratingRow
                      label="Rapidez"
                      value={sub.rapidez}
                      onChange={(v) => setSub((s) => ({ ...s, rapidez: v }))}
                    />
                    <SubratingRow
                      label="Precio / Satisfacción"
                      value={sub.precio_satisfaccion}
                      onChange={(v) => setSub((s) => ({ ...s, precio_satisfaccion: v }))}
                    />
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={submitting || !rating}
                  className="w-full h-12 rounded-xl text-base font-semibold text-white disabled:opacity-60"
                  style={{ background: NAVY }}
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                    </span>
                  ) : (
                    'Enviar valoración'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function RatingRow({ value, onChange, big }) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        const size = big ? 36 : 22;
        return (
          <button
            type="button"
            key={n}
            onClick={() => onChange(n)}
            className="p-1 -m-1 rounded"
            aria-label={`${n} estrellas`}
          >
            <Star
              width={size}
              height={size}
              className={active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
            />
          </button>
        );
      })}
    </div>
  );
}

function SubratingRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <RatingRow value={value} onChange={onChange} />
    </div>
  );
}

function InvalidTokenView({ reason, onHome }) {
  const map = {
    ya_usado: {
      title: 'Esta valoración ya se envió',
      body: 'Este enlace de valoración solo puede usarse una vez. Si tienes que volver a opinar, pídele a tu profesional uno nuevo.',
    },
    ya_valorado: {
      title: 'Ya has enviado tu valoración',
      body: 'Este enlace ya ha recibido una reseña. Gracias por tu opinión.',
    },
    caducado: {
      title: 'El enlace ha caducado',
      body: 'Por seguridad, los enlaces de valoración tienen una duración limitada. Pídele al profesional uno nuevo.',
    },
    token_caducado: {
      title: 'El enlace ha caducado',
      body: 'Por seguridad, los enlaces de valoración tienen una duración limitada. Pídele al profesional uno nuevo.',
    },
    no_existe: {
      title: 'Enlace no encontrado',
      body: 'No hemos podido reconocer este enlace. Revisa que esté completo o pide otro al profesional.',
    },
  };
  const v = map[reason] || map.no_existe;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <div
        className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
        style={{ background: '#FEF3C7', color: '#92400E' }}
      >
        <AlertCircle className="w-6 h-6" />
      </div>
      <h1 className="font-semibold text-slate-900 mt-3">{v.title}</h1>
      <p className="text-sm text-slate-600 mt-1">{v.body}</p>
      <button
        type="button"
        onClick={onHome}
        className="mt-5 inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-semibold text-white"
        style={{ background: NAVY }}
      >
        Ir a MisAutónomos
      </button>
    </div>
  );
}

function SubmittedView({ businessName, onHome }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <div
        className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(0,37,92,0.06)' }}
      >
        <CheckCircle2 className="w-6 h-6" style={{ color: NAVY }} />
      </div>
      <h1 className="font-semibold text-slate-900 mt-3">¡Gracias por tu reseña!</h1>
      <p className="text-sm text-slate-600 mt-1">
        Tu opinión sobre {businessName} ya está publicada.
      </p>
      <button
        type="button"
        onClick={onHome}
        className="mt-5 inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-semibold text-white"
        style={{ background: NAVY }}
      >
        Ir a MisAutónomos
      </button>
    </div>
  );
}
