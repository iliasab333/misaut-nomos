import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Loader2, Send, Copy, Check, MessageSquare, X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import SEOHead from '@/components/seo/SEOHead';
import { toast } from 'sonner';
import { useTranslation, Trans } from 'react-i18next';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// Recibe `t` para que las etiquetas se retraduzcan al cambiar de idioma.
const subratingsFor = (t) => [
  { key: 'rapidez', label: t('reviews.criteria.speed') },
  { key: 'comunicacion', label: t('reviews.criteria.communication') },
  { key: 'calidad', label: t('reviews.criteria.quality') },
  { key: 'precio_satisfaccion', label: t('reviews.criteria.priceSatisfaction') },
];

function avg(arr, key) {
  const valid = arr.map((r) => Number(r?.[key] || 0)).filter((n) => n > 0);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function Stars({ value, size = 14 }) {
  const v = Math.round(Number(value) || 0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= v ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
        />
      ))}
    </span>
  );
}

export default function MisValoracionesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [me, setMe] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess?.session) {
          navigate('/login');
          return;
        }
        const u = await base44.auth.me().catch(() => null);
        if (!u || u.user_type !== 'professionnel') {
          navigate('/dashboard');
          return;
        }
        if (cancelled) return;
        setMe(u);

        const list = await base44.entities.Review.filter(
          { professional_id: u.id },
          '-created_date',
          200
        );
        if (cancelled) return;
        setReviews(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || t('reviews.mine.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const subratings = useMemo(() => subratingsFor(t), [t]);

  const stats = useMemo(() => {
    const visibles = reviews.filter((r) => !r.is_reported);
    const total = visibles.length;
    const avgGlobal = avg(visibles, 'rating');
    const subs = subratings.map((s) => ({ ...s, value: avg(visibles, s.key) }));
    return { total, avgGlobal, subs };
  }, [reviews, subratings]);

  return (
    <>
      <SEOHead title={t('reviews.mine.seoTitle')} noindex />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('reviews.mine.backToDashboard')}
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{t('reviews.mine.title')}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {t('reviews.mine.subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: NAVY }}
            >
              <Send className="w-4 h-4" />
              {t('reviews.request.title')}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : err ? (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm">
              {err}
            </div>
          ) : (
            <>
              <section className="mt-6 rounded-2xl bg-white border border-slate-200 p-5">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <div className="text-4xl font-extrabold text-slate-900 leading-none">
                      {stats.avgGlobal ? stats.avgGlobal.toFixed(1) : '—'}
                    </div>
                    <div className="mt-1.5">
                      <Stars value={stats.avgGlobal} size={16} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t('reviews.summary.count', { count: stats.total })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[220px] grid grid-cols-2 gap-x-5 gap-y-2">
                    {stats.subs.map((s) => (
                      <div key={s.key} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">{s.label}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          {s.value ? s.value.toFixed(1) : '—'}
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 mb-2">
                  {t('reviews.mine.latest')}
                </h2>
                {reviews.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                    <Trans i18nKey="reviews.mine.emptyState">
                      Todavía no tienes valoraciones. Pulsa <strong>Pedir valoración</strong> para
                      invitar a tus clientes a opinar.
                    </Trans>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <ReviewCard key={r.id} review={r} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {requestOpen && me && (
          <RequestReviewModal
            me={me}
            onClose={() => setRequestOpen(false)}
          />
        )}
      </div>
    </>
  );
}

function ReviewCard({ review }) {
  const { t, i18n } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const subratings = subratingsFor(t);
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm truncate">
              {review.client_name || t('clientLabel')}
            </span>
            {review.client_verified && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                {t('proProfile.badges.verified')}
              </span>
            )}
          </div>
          <div className="mt-1">
            <Stars value={review.rating} />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 flex-shrink-0">
          {review.created_date
            ? new Date(review.created_date).toLocaleDateString(i18n.language, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : ''}
        </div>
      </div>

      {review.comment && (
        <p className={`text-sm text-slate-700 mt-2 ${showAll ? '' : 'line-clamp-3'}`}>
          {review.comment}
        </p>
      )}
      {review.comment && review.comment.length > 220 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 mt-1"
        >
          {showAll ? t('reviews.card.showLess') : t('reviews.card.readAll')}
        </button>
      )}

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5">
        {subratings.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">{s.label}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
              {review[s.key] ? Number(review[s.key]).toFixed(1) : '—'}
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </span>
          </div>
        ))}
      </div>

      {review.professional_response && (
        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            {t('reviews.card.yourResponse')}
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">
            {review.professional_response}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestReviewModal({ me, onClose }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const msgs = await base44.entities.Message.filter(
          { recipient_id: me.id },
          '-created_date',
          200
        );
        const sent = await base44.entities.Message.filter(
          { sender_id: me.id },
          '-created_date',
          200
        );
        const all = [...(msgs || []), ...(sent || [])];

        const byClient = new Map();
        for (const m of all) {
          const otherId = m.sender_id === me.id ? m.recipient_id : m.sender_id;
          if (!otherId || otherId === me.id) continue;
          if (!byClient.has(otherId)) {
            byClient.set(otherId, {
              user_id: otherId,
              name:
                m.sender_id === me.id ? m.professional_name : m.client_name || t('clientLabel'),
              conversation_id: m.conversation_id,
              last: m.created_date,
            });
          } else {
            const prev = byClient.get(otherId);
            if (!prev.last || new Date(m.created_date) > new Date(prev.last)) {
              prev.last = m.created_date;
              prev.conversation_id = m.conversation_id || prev.conversation_id;
            }
          }
        }

        const arr = Array.from(byClient.values()).sort(
          (a, b) => new Date(b.last || 0) - new Date(a.last || 0)
        );
        if (!cancelled) setContacts(arr);
      } catch {
        if (!cancelled) setContacts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me.id]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { createReviewRequest } = await import('@/lib/reviewRpc');
      const res = await createReviewRequest({
        conversation_id: selected.conversation_id || '',
        client_id: selected.user_id,
      });
      const token = res?.token;
      if (!token) throw new Error('No se recibió el token');
      const url = res?.url
        ? res.url.startsWith('http')
          ? res.url
          : `${window.location.origin}${res.url.startsWith('/') ? res.url : '/' + res.url}`
        : `${window.location.origin}/valorar/${token}`;
      setLink(url);
      toast.success(t('reviews.request.created'));
    } catch (e) {
      toast.error(e?.message || t('reviews.request.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">{t('reviews.request.title')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('reviews.request.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {link ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 break-all">
                {link}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('reviews.request.copied') : t('reviews.request.copyLink')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-semibold text-white"
                  style={{ background: NAVY }}
                >
                  {t('reviews.request.done')}
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-sm text-slate-600">
              {t('reviews.request.noContacts')}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">{t('reviews.request.chooseClient')}</p>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {contacts.slice(0, 30).map((c) => {
                  const isSel = selected?.user_id === c.user_id;
                  return (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-slate-50 ${
                        isSel ? 'bg-slate-50' : ''
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-800 flex-1 truncate">{c.name || t('clientLabel')}</span>
                      {isSel && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={!selected || submitting}
                  onClick={submit}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: NAVY }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t('reviews.request.generateLink')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
