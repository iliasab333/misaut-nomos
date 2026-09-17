import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconStarOutline, IconSuccess, IconSpinner, IconAlert } from '@/components/Icons';
import SEOHead from '@/components/seo/SEOHead';
import InitialsAvatar from '@/components/InitialsAvatar';
import { optimizeSupabaseImage } from '@/lib/supabaseImage';
import { getReviewRequest, submitReview } from '@/lib/reviewRpc';
import { toast } from '@/lib/toast';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
      toast.error(t('reviews.leave.ratingRequired'));
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
          toast.error(t('reviews.leave.submitError'));
        }
        return;
      }
      setSubmitted(true);
    } catch (e) {
      const m = (e?.message || '').toLowerCase();
      if (m.includes('ya_valorado')) setReason('ya_valorado');
      else if (m.includes('caducado') || m.includes('expir')) setReason('token_caducado');
      else if (m.includes('no_existe') || m.includes('invalid')) setReason('no_existe');
      else toast.error(e?.message || t('reviews.leave.sendError'));
    } finally {
      setSubmitting(false);
    }
  };

  const photo = info?.photo
    ? optimizeSupabaseImage(info.photo, { width: 200, height: 200 })
    : null;
  const businessName = info?.business_name || t('reviews.leave.defaultProfessional');

  return (
    <>
      <SEOHead title={t('reviews.leave.seoTitle')} noindex />
      <div className="min-h-screen bg-soft">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-6 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <IconSpinner className="w-6 h-6 animate-spin text-c-muted" />
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
                    className="w-[72px] h-[72px] rounded-full object-cover border border-c-border"
                    loading="eager"
                  />
                ) : (
                  <InitialsAvatar name={businessName} size={72} />
                )}
                <h1 className="text-xl font-extrabold text-ink mt-3">
                  {t('reviews.leave.title', { name: businessName })}
                </h1>
                <p className="text-sm text-c-muted mt-1">
                  {t('reviews.leave.subtitle')}
                </p>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <Field label={t('reviews.leave.ratingLabel')} required>
                  <RatingRow value={rating} onChange={setRating} big />
                </Field>

                <Field label={t('reviews.leave.commentLabel')}>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('reviews.leave.commentPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-c-border rounded-lg resize-y focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                  />
                </Field>

                <Field label={t('reviews.leave.nameLabel')}>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={t('reviews.leave.namePlaceholder')}
                    autoComplete="name"
                    className="w-full h-10 px-3 text-sm border border-c-border rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                  />
                </Field>

                <details className="rounded-xl border border-c-border bg-surface p-3">
                  <summary className="text-sm font-semibold text-ink cursor-pointer select-none">
                    {t('reviews.leave.detailsSummary')}
                  </summary>
                  <div className="mt-3 space-y-3">
                    <SubratingRow
                      label={t('reviews.criteria.communication')}
                      value={sub.comunicacion}
                      onChange={(v) => setSub((s) => ({ ...s, comunicacion: v }))}
                    />
                    <SubratingRow
                      label={t('reviews.criteria.quality')}
                      value={sub.calidad}
                      onChange={(v) => setSub((s) => ({ ...s, calidad: v }))}
                    />
                    <SubratingRow
                      label={t('reviews.criteria.speed')}
                      value={sub.rapidez}
                      onChange={(v) => setSub((s) => ({ ...s, rapidez: v }))}
                    />
                    <SubratingRow
                      label={t('reviews.criteria.priceSatisfaction')}
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
                      <IconSpinner className="w-4 h-4 animate-spin" /> {t('reviews.form.sending')}
                    </span>
                  ) : (
                    t('reviews.form.submit')
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
      <span className="text-xs font-semibold uppercase tracking-[0.06em] text-c-muted">
        {label} {required && <span className="text-error">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function RatingRow({ value, onChange, big }) {
  const { t } = useTranslation();
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
            aria-label={t('reviews.leave.starsAria', { count: n })}
          >
            <IconStarOutline
              width={size}
              height={size}
              className={active ? 'fill-star text-star' : 'text-c-border'}
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
      <span className="text-sm text-ink">{label}</span>
      <RatingRow value={value} onChange={onChange} />
    </div>
  );
}

function InvalidTokenView({ reason, onHome }) {
  const { t } = useTranslation();
  const map = {
    ya_usado: {
      title: t('reviews.invalid.alreadyUsedTitle'),
      body: t('reviews.invalid.alreadyUsedBody'),
    },
    ya_valorado: {
      title: t('reviews.invalid.alreadyReviewedTitle'),
      body: t('reviews.invalid.alreadyReviewedBody'),
    },
    caducado: {
      title: t('reviews.invalid.expiredTitle'),
      body: t('reviews.invalid.expiredBody'),
    },
    token_caducado: {
      title: t('reviews.invalid.expiredTitle'),
      body: t('reviews.invalid.expiredBody'),
    },
    no_existe: {
      title: t('reviews.invalid.notFoundTitle'),
      body: t('reviews.invalid.notFoundBody'),
    },
  };
  const v = map[reason] || map.no_existe;
  return (
    <div className="rounded-2xl border border-c-border bg-surface p-6 text-center">
      <div
        className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
        style={{ background: '#FEF3C7', color: '#92400E' }}
      >
        <IconAlert className="w-6 h-6" />
      </div>
      <h1 className="font-semibold text-ink mt-3">{v.title}</h1>
      <p className="text-sm text-c-muted mt-1">{v.body}</p>
      <button
        type="button"
        onClick={onHome}
        className="mt-5 inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-semibold text-white"
        style={{ background: NAVY }}
      >
        {t('reviews.leave.goHome')}
      </button>
    </div>
  );
}

function SubmittedView({ businessName, onHome }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-c-border bg-surface p-6 text-center">
      <div
        className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(0,37,92,0.06)' }}
      >
        <IconSuccess className="w-6 h-6" style={{ color: NAVY }} />
      </div>
      <h1 className="font-semibold text-ink mt-3">{t('reviews.leave.thanksTitle')}</h1>
      <p className="text-sm text-c-muted mt-1">
        {t('reviews.leave.thanksBody', { name: businessName })}
      </p>
      <button
        type="button"
        onClick={onHome}
        className="mt-5 inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-semibold text-white"
        style={{ background: NAVY }}
      >
        {t('reviews.leave.goHome')}
      </button>
    </div>
  );
}
