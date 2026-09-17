import React, { useState, useEffect, useMemo } from 'react';
import { uiLang } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import {
  IconStarOutline, IconArrowLeft, IconSpinner, IconSend, IconCopy, IconCheck, IconMessageSquare,
} from '@/components/Icons';
import Modal from '@/components/Modal';
import { SkeletonList, ErrorState, EmptyState } from '@/components/ListStates';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import SEOHead from '@/components/seo/SEOHead';
import { toast } from '@/lib/toast';
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
        <IconStarOutline
          key={i}
          width={size}
          height={size}
          className={i <= v ? 'fill-star text-star' : 'text-c-border'}
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
  // `reloadKey` sólo existe para que ErrorState pueda repetir el fetch sin
  // recargar la página (regla de ListStates).
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [navigate, reloadKey]);

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
      <div className="min-h-screen bg-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-c-muted hover:text-ink mb-3"
          >
            <IconArrowLeft className="w-4 h-4" />
            {t('reviews.mine.backToDashboard')}
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-ink">{t('reviews.mine.title')}</h1>
              <p className="text-sm text-c-muted mt-1">
                {t('reviews.mine.subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: NAVY }}
            >
              <IconSend className="w-4 h-4" />
              {t('reviews.request.title')}
            </button>
          </div>

          {loading ? (
            <div className="mt-8">
              <SkeletonList count={3} avatar={false} />
            </div>
          ) : err ? (
            <ErrorState
              className="mt-8"
              message={err}
              onRetry={() => { setErr(''); setLoading(true); setReloadKey((k) => k + 1); }}
            />
          ) : (
            <>
              <section className="mt-6 rounded-2xl bg-surface border border-c-border p-5">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <div className="text-4xl font-extrabold text-ink leading-none">
                      {stats.avgGlobal ? stats.avgGlobal.toFixed(1) : '—'}
                    </div>
                    <div className="mt-1.5">
                      <Stars value={stats.avgGlobal} size={16} />
                    </div>
                    <div className="text-xs text-c-muted mt-1">
                      {t('reviews.summary.count', { count: stats.total })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[220px] grid grid-cols-2 gap-x-5 gap-y-2">
                    {stats.subs.map((s) => (
                      <div key={s.key} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-c-muted">{s.label}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                          {s.value ? s.value.toFixed(1) : '—'}
                          <IconStarOutline className="w-3.5 h-3.5 fill-star text-star" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-c-muted mb-2">
                  {t('reviews.mine.latest')}
                </h2>
                {reviews.length === 0 ? (
                  <EmptyState
                    title={t('noReviewsYet')}
                    body={<Trans i18nKey="reviews.mine.emptyState" components={{ 1: <strong /> }} />}
                    ctaLabel={t('reviews.request.title')}
                    onCta={() => setRequestOpen(true)}
                  />
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
    <div className="rounded-2xl bg-surface border border-c-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink text-sm truncate">
              {review.client_name || t('clientLabel')}
            </span>
            {review.client_verified && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-success bg-success/10 border border-success/20 rounded px-1.5 py-0.5">
                {t('proProfile.badges.verified')}
              </span>
            )}
          </div>
          <div className="mt-1">
            <Stars value={review.rating} />
          </div>
        </div>
        <div className="text-[11px] text-c-muted flex-shrink-0">
          {review.created_date
            ? new Date(review.created_date).toLocaleDateString(uiLang(i18n.language) === 'en' ? 'en-US' : 'es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : ''}
        </div>
      </div>

      {review.comment && (
        <p className={`text-sm text-ink mt-2 ${showAll ? '' : 'line-clamp-3'}`}>
          {review.comment}
        </p>
      )}
      {review.comment && review.comment.length > 220 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-[11px] font-semibold text-c-muted hover:text-ink mt-1"
        >
          {showAll ? t('reviews.card.showLess') : t('reviews.card.readAll')}
        </button>
      )}

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5">
        {subratings.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-c-muted">{s.label}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
              {review[s.key] ? Number(review[s.key]).toFixed(1) : '—'}
              <IconStarOutline className="w-3 h-3 fill-star text-star" />
            </span>
          </div>
        ))}
      </div>

      {review.professional_response && (
        <div className="mt-3 rounded-xl bg-soft border border-c-border p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-c-muted mb-1">
            {t('reviews.card.yourResponse')}
          </div>
          <div className="text-sm text-ink whitespace-pre-wrap">
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
    <Modal
      open
      onClose={onClose}
      title={t('reviews.request.title')}
      description={t('reviews.request.subtitle')}
    >
      <div>
        <div>
          {link ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-soft border border-c-border p-3 text-xs text-ink break-all">
                {link}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold border border-c-border text-ink hover:bg-soft"
                >
                  {copied ? <IconCheck className="w-4 h-4 text-success" /> : <IconCopy className="w-4 h-4" />}
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
              <IconSpinner className="w-5 h-5 animate-spin text-c-muted" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-sm text-c-muted">
              {t('reviews.request.noContacts')}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-c-muted mb-2">{t('reviews.request.chooseClient')}</p>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-c-border divide-y divide-c-border">
                {contacts.slice(0, 30).map((c) => {
                  const isSel = selected?.user_id === c.user_id;
                  return (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-soft ${
                        isSel ? 'bg-soft' : ''
                      }`}
                    >
                      <IconMessageSquare className="w-4 h-4 text-c-muted" />
                      <span className="text-sm text-ink flex-1 truncate">{c.name || t('clientLabel')}</span>
                      {isSel && <IconCheck className="w-4 h-4 text-success" />}
                    </button>
                  );
                })}
              </div>
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-lg text-sm font-semibold border border-c-border text-ink hover:bg-soft"
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
                  {submitting ? <IconSpinner className="w-4 h-4 animate-spin" /> : <IconSend className="w-4 h-4" />}
                  {t('reviews.request.generateLink')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
