import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconEye, IconMessageSquare, IconStar, IconStarOutline, IconPointerClick,
  IconArrowRight, IconCamera, IconShield, IconSparkles, IconSuccess,
  IconCircle, IconClose, IconChart, IconUser,
} from '@/components/Icons';
import { supabase } from '@/api/supabaseClient';
import SEOHead from '@/components/seo/SEOHead';
import PullToRefresh from '@/components/PullToRefresh';
import { ErrorState, SkeletonLine, SkeletonBlock } from '@/components/ListStates';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

const BANNER_DISMISS_KEY = 'pro_dashboard_banner_dismissed';

// Recibe `t`: vive fuera del componente y debe retraducirse en cada render.
function greetingFor(hour, t) {
  if (hour < 13) return t('dashboard.pro.greeting.morning');
  if (hour < 20) return t('dashboard.pro.greeting.afternoon');
  return t('dashboard.pro.greeting.evening');
}

function fmt(n) {
  return Number(n || 0).toLocaleString('es-ES');
}

export default function ProfessionalDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [data, setData] = useState(null);
  const [bannerDismissedAt, setBannerDismissedAt] = useState(() => {
    try {
      return sessionStorage.getItem(BANNER_DISMISS_KEY) || '';
    } catch {
      return '';
    }
  });

  const fetchDashboard = async () => {
    setErr('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) {
      navigate('/login');
      return null;
    }
    const { data: rpc, error } = await supabase.rpc('get_my_dashboard');
    if (error) throw new Error(error.message || t('dashboard.pro.errors.loadFailed'));
    return rpc || null;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rpc = await fetchDashboard();
        if (!cancelled) setData(rpc);
      } catch (e) {
        if (!cancelled) setErr(e?.message || t('dashboard.pro.errors.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reintento desde ErrorState: repite el fetch sin recargar la página.
  const reload = async () => {
    setLoading(true);
    setErr('');
    try {
      const rpc = await fetchDashboard();
      setData(rpc);
    } catch (e) {
      setErr(e?.message || t('dashboard.pro.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const rpc = await fetchDashboard();
      setData(rpc);
    } catch (e) {
      setErr(e?.message || t('dashboard.pro.errors.refreshError'));
    }
  };

  const banner = useMemo(() => {
    if (!data) return null;
    const completeness = data.completeness || {};
    if (!completeness.has_photo) {
      return {
        id: 'photo',
        icon: IconCamera,
        title: t('dashboard.pro.banner.photo.title'),
        body: t('dashboard.pro.banner.photo.body'),
        cta: t('myProfile.photoBanner.cta'),
        action: () => navigate('/mi-perfil?section=photo'),
      };
    }
    if (!data.is_verified) {
      return {
        id: 'verify',
        icon: IconShield,
        title: t('verification.idle.title'),
        body: t('dashboard.pro.banner.verify.body'),
        cta: t('dashboard.pro.banner.verify.cta'),
        action: () => navigate('/mi-perfil?section=verify'),
      };
    }
    if ((completeness.percent || 0) < 100) {
      return {
        id: 'complete',
        icon: IconSparkles,
        title: t('dashboard.pro.banner.complete.title'),
        body: t('dashboard.pro.banner.complete.body'),
        cta: t('dashboard.pro.banner.complete.cta'),
        action: () => navigate('/mi-perfil'),
      };
    }
    return null;
  }, [data, navigate, t]);

  const showBanner =
    !!banner && bannerDismissedAt !== `${banner.id}:${todayKey()}`;

  const dismissBanner = () => {
    if (!banner) return;
    const v = `${banner.id}:${todayKey()}`;
    try {
      sessionStorage.setItem(BANNER_DISMISS_KEY, v);
    } catch { /* sessionStorage inaccesible: modo privado */ }
    setBannerDismissedAt(v);
  };

  const stats = useMemo(() => {
    const d = data || {};
    const avg = Number(d.average_rating || 0);
    const reviews = Number(d.total_reviews || 0);
    return [
      {
        key: 'views',
        label: t('dashboard.pro.stats.views'),
        value: fmt(d.views_month),
        icon: IconEye,
        accent: NAVY,
        bg: 'rgba(0,37,92,0.06)',
        onClick: () => navigate('/mis-estadisticas'),
      },
      {
        key: 'unread',
        label: t('dashboard.pro.stats.unread'),
        value: fmt(d.unread_messages),
        icon: IconMessageSquare,
        accent: '#0B5394',
        bg: 'rgba(11,83,148,0.06)',
        alert: Number(d.unread_messages || 0) > 0,
        onClick: () => navigate('/mensajes'),
      },
      {
        key: 'rating',
        label: t('dashboard.average_rating'),
        value: avg ? avg.toFixed(1) : '—',
        sub: reviews
          ? t('dashboard.pro.stats.reviewsCount', { count: reviews, n: fmt(reviews) })
          : t('dashboard.pro.stats.noReviews'),
        icon: IconStarOutline,
        accent: GOLD,
        bg: 'rgba(245,193,61,0.12)',
        onClick: () => navigate('/mis-valoraciones'),
      },
      {
        key: 'clicks',
        label: t('dashboard.pro.stats.contactClicks'),
        value: fmt(d.contact_clicks_30d),
        icon: IconPointerClick,
        accent: '#1E8A3D',
        bg: 'rgba(30,138,61,0.08)',
        onClick: () => navigate('/mis-estadisticas'),
      },
    ];
  }, [data, navigate, t]);

  const completenessItems = useMemo(() => {
    const c = data?.completeness || {};
    return [
      { key: 'photo', label: t('dashboard.pro.completeness.photo'), done: !!c.has_photo },
      { key: 'desc', label: t('dashboard.completion.fullDescription'), done: !!c.has_description },
      { key: 'photos3', label: t('dashboard.pro.completeness.workPhotos'), done: !!c.has_3_work_photos },
    ];
  }, [data, t]);

  const completenessPct = data?.completeness?.percent ?? 0;
  const greetingName = data?.greeting_name || t('dashboard.pro.header.defaultName');
  const hour = new Date().getHours();
  const greeting = greetingFor(hour, t);

  if (loading) {
    return (
      <div className="min-h-screen bg-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
          <SkeletonBlock lines={2} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-2xl bg-surface border border-c-border p-3.5 sm:p-4" aria-hidden="true">
                <SkeletonLine width={36} height={36} />
                <SkeletonLine className="mt-3" width="55%" height={24} />
                <SkeletonLine className="mt-2" width="80%" height={11} />
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-surface border border-c-border p-4 sm:p-5">
            <SkeletonBlock lines={4} />
          </div>
        </div>
      </div>
    );
  }

  // Error sin datos: una salida, no un callejón.
  if (err && !data) {
    return (
      <div className="min-h-screen bg-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
          <ErrorState message={err} onRetry={reload} />
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <SEOHead title={t('dashboard.pro.seoTitle')} noindex />
      <div className="min-h-screen bg-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">

          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-end justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-c-muted">
                <Trans
                  i18nKey="dashboard.pro.header.greetingLine"
                  values={{ greeting, name: greetingName }}
                  components={{ b: <span className="font-semibold text-ink" /> }}
                />
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mt-0.5">
                {t('dashboard.pro.header.title')}
              </h1>
            </div>
            {data?.is_verified && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md"
                style={{ background: `${NAVY}10`, color: NAVY }}
              >
                <IconShield className="w-3.5 h-3.5" />
                {t('proProfile.badges.verified')}
              </span>
            )}
          </motion.div>

          {err && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-warning p-3 text-sm flex items-center justify-between gap-3">
              <span className="min-w-0">{err}</span>
              <button type="button" className="btn-secondary btn-sm shrink-0" onClick={reload}>
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* BANNER siguiente paso */}
          {showBanner && (
            <NextStepBanner banner={banner} onDismiss={dismissBanner} />
          )}

          {/* STATS GRID — 2x2 móvil, 4 en desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <StatCard key={s.key} stat={s} delay={i * 0.04} />
            ))}
          </div>

          {/* COMPLETITUD */}
          <CompletenessCard
            percent={completenessPct}
            items={completenessItems}
            isComplete={completenessPct === 100}
            onCta={() => navigate('/mi-perfil')}
          />

          {/* CTA SUTIL */}
          <RankingHint
            isVerified={!!data?.is_verified}
            percent={completenessPct}
          />

          {/* ACCESOS RÁPIDOS */}
          <QuickActions
            navigate={navigate}
            unread={Number(data?.unread_messages || 0)}
            pendingReviews={Number(data?.pending_review_requests || 0)}
          />

        </div>
      </div>
    </PullToRefresh>
  );
}

function NextStepBanner({ banner, onDismiss }) {
  const { t } = useTranslation();
  const Icon = banner.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-c-border bg-surface overflow-hidden"
    >
      <div className="p-4 sm:p-5 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl inline-flex items-center justify-center flex-shrink-0"
          style={{ background: `${NAVY}0d`, color: NAVY }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ color: NAVY }}
            >
              {t('dashboard.pro.nextStep.label')}
            </span>
            <span
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: GOLD }}
            />
          </div>
          <p className="text-sm font-semibold text-ink">{banner.title}</p>
          <p className="text-xs text-c-muted mt-0.5">{banner.body}</p>
          <button
            type="button"
            onClick={banner.action}
            className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: NAVY }}
          >
            {banner.cta}
            <IconArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="w-8 h-8 inline-flex items-center justify-center rounded-md text-c-muted hover:bg-soft -mt-1 -mr-1"
          aria-label={t('dashboard.pro.nextStep.dismiss')}
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function StatCard({ stat, delay = 0 }) {
  const Icon = stat.icon;
  return (
    <motion.button
      type="button"
      onClick={stat.onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="relative text-left rounded-2xl bg-surface border border-c-border p-3.5 sm:p-4 hover:border-slate-300 hover:shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl inline-flex items-center justify-center"
          style={{ background: stat.bg, color: stat.accent }}
        >
          <Icon className="w-4 h-4" />
        </div>
        {stat.alert && (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl sm:text-[28px] font-extrabold text-ink leading-none">
          {stat.value}
        </span>
        {stat.key === 'rating' && stat.value !== '—' && (
          <IconStar className="w-4 h-4 fill-star text-star" />
        )}
      </div>
      <p className="text-[11px] sm:text-xs text-c-muted mt-1 leading-tight">
        {stat.label}
      </p>
      {stat.sub && (
        <p className="text-[11px] text-c-muted mt-0.5">{stat.sub}</p>
      )}
    </motion.button>
  );
}

function CompletenessCard({ percent, items, isComplete, onCta }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.25 }}
      className="rounded-2xl bg-surface border border-c-border p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <IconSparkles className="w-4 h-4" style={{ color: NAVY }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ color: NAVY }}
            >
              {t('dashboard.completion.title')}
            </span>
          </div>
          <p className="text-xs text-c-muted">
            {isComplete
              ? t('dashboard.pro.completeness.optimized')
              : t('dashboard.pro.completeness.eachStep')}
          </p>
        </div>
        <span className="text-2xl sm:text-3xl font-extrabold text-ink leading-none">
          {percent}
          <span className="text-sm sm:text-base text-c-muted font-bold">%</span>
        </span>
      </div>

      <div className="relative h-2 bg-soft rounded-full overflow-hidden mb-4">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, ${NAVY}, ${GOLD})` }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <ul className="space-y-2 mb-4">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-sm">
            {it.done ? (
              <IconSuccess className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <IconCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />
            )}
            <span className={it.done ? 'text-ink' : 'text-c-muted'}>
              {it.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onCta}
        className="w-full h-11 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-1.5"
        style={{ background: NAVY }}
      >
        {isComplete ? t('dashboard.pro.completeness.editProfile') : t('dashboard.pro.completeness.completeProfile')}
        <IconArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function RankingHint({ isVerified, percent }) {
  const { t } = useTranslation();
  if (isVerified && percent >= 100) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.22, duration: 0.25 }}
      className="rounded-xl border border-c-border bg-surface px-4 py-3 flex items-start gap-2.5"
    >
      <div
        className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0"
        style={{ background: `${GOLD}26`, color: '#7A5B00' }}
      >
        <IconSparkles className="w-3.5 h-3.5" />
      </div>
      <p className="text-xs text-c-muted leading-relaxed">
        {t('dashboard.pro.rankingHint')}
      </p>
    </motion.div>
  );
}

function QuickActions({ navigate, unread, pendingReviews }) {
  const { t } = useTranslation();
  const items = [
    {
      key: 'profile',
      label: t('nav.myProfile'),
      icon: IconUser,
      onClick: () => navigate('/mi-perfil'),
    },
    {
      key: 'stats',
      label: t('nav.statistics'),
      icon: IconChart,
      onClick: () => navigate('/mis-estadisticas'),
    },
    {
      key: 'reviews',
      label: t('nav.reviews'),
      icon: IconStarOutline,
      onClick: () => navigate('/mis-valoraciones'),
      badge: pendingReviews > 0 ? pendingReviews : null,
    },
    {
      key: 'messages',
      label: t('nav.messages'),
      icon: IconMessageSquare,
      onClick: () => navigate('/mensajes'),
      badge: unread > 0 ? unread : null,
    },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.26, duration: 0.25 }}
    >
      <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-c-muted mb-2">
        {t('dashboard.pro.quickActions.title')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {items.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              className="relative rounded-xl border border-c-border bg-surface px-3 py-3 flex flex-col items-start gap-1.5 hover:border-slate-300 hover:shadow-sm transition text-left"
            >
              <span
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center"
                style={{ background: `${NAVY}0d`, color: NAVY }}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-ink">{a.label}</span>
              {a.badge != null && (
                <span
                  className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white inline-flex items-center justify-center"
                  style={{ background: NAVY }}
                >
                  {a.badge > 9 ? '9+' : a.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
