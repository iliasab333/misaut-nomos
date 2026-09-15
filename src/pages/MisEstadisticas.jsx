import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, Search as SearchIcon, MessageSquare, MousePointerClick, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// Sólo las claves de la BD viven fuera del componente; las etiquetas visibles
// se construyen dentro con t() (ver METRICS en el componente).
const METRIC_KEYS = ['profile_views', 'search_appearances', 'contact_clicks', 'messages_received'];

function sumByKey(rows, key) {
  return (rows || []).reduce((acc, r) => acc + Number(r?.[key] || 0), 0);
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function MisEstadisticasPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [rows7, setRows7] = useState([]);
  const [rows30, setRows30] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const { data: sess } = await supabase.auth.getSession();
        const session = sess?.session;
        if (!session) {
          navigate('/login');
          return;
        }
        // Resolver perfil profesional vía base44 (gestiona auth_user_id internamente)
        const me = await base44.auth.me().catch(() => null);
        if (!me || me.user_type !== 'professionnel') {
          navigate('/dashboard');
          return;
        }
        const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: me.id });
        const profile = profiles?.[0] || null;
        if (!profile) {
          setErr(t('stats.overview.noProfileError'));
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setProfileId(profile.id);

        const from7 = dateNDaysAgo(7);
        const from30 = dateNDaysAgo(30);

        // Consultamos por professional_id = profile.id (RPC track_profile_metric)
        // y, por compatibilidad, también por user_id (datos antiguos).
        const ids = [profile.id, me.id].filter(Boolean);

        const { data: d30, error: e30 } = await supabase
          .from('profile_metrics')
          .select('date,profile_views,search_appearances,messages_received,contact_clicks,professional_id')
          .in('professional_id', ids)
          .gte('date', from30)
          .order('date', { ascending: true });
        if (e30) throw e30;

        if (cancelled) return;
        const all30 = d30 || [];
        const all7 = all30.filter((r) => r.date >= from7);
        setRows30(all30);
        setRows7(all7);
      } catch (e) {
        if (!cancelled) setErr(e?.message || t('stats.overview.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const totals7 = useMemo(
    () => Object.fromEntries(METRIC_KEYS.map((k) => [k, sumByKey(rows7, k)])),
    [rows7]
  );
  const totals30 = useMemo(
    () => Object.fromEntries(METRIC_KEYS.map((k) => [k, sumByKey(rows30, k)])),
    [rows30]
  );

  // Serie diaria 30d para mini gráfico
  const daily = useMemo(() => {
    const map = new Map();
    for (const r of rows30) {
      const d = r.date;
      const prev = map.get(d) || { date: d, total: 0 };
      prev.total +=
        Number(r.profile_views || 0) +
        Number(r.search_appearances || 0) +
        Number(r.contact_clicks || 0) +
        Number(r.messages_received || 0);
      map.set(d, prev);
    }
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, total: map.get(key)?.total || 0 });
    }
    return days;
  }, [rows30]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.total));

  // Antes constante de módulo: dentro del componente para que se retraduzca.
  const METRICS = [
    { key: 'profile_views', label: t('stats.metrics.profileViews'), icon: Eye, accent: NAVY },
    { key: 'search_appearances', label: t('stats.overview.searchAppearances'), icon: SearchIcon, accent: '#0B5394' },
    { key: 'contact_clicks', label: t('stats.overview.contactClicks'), icon: MousePointerClick, accent: GOLD },
    { key: 'messages_received', label: t('stats.metrics.messagesReceived'), icon: MessageSquare, accent: '#1E8A3D' },
  ];

  return (
    <>
      <SEOHead title={t('stats.overview.seoTitle')} noindex />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('stats.overview.backToDashboard')}
          </button>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{t('stats.overview.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('stats.overview.subtitle')}
          </p>

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
              <section className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 mb-2">
                  {t('stats.periods.last7Days')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {METRICS.map((m) => (
                    <StatCard key={`7-${m.key}`} m={m} value={totals7[m.key]} />
                  ))}
                </div>
              </section>

              <section className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 mb-2">
                  {t('stats.periods.last30Days')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {METRICS.map((m) => (
                    <StatCard key={`30-${m.key}`} m={m} value={totals30[m.key]} />
                  ))}
                </div>
              </section>

              <section className="mt-6 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t('stats.overview.dailyActivity')}
                  </h3>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-end gap-1 h-40">
                  {daily.map((d) => {
                    const pct = Math.round((d.total / maxDaily) * 100);
                    return (
                      <div
                        key={d.date}
                        title={`${d.date}: ${d.total}`}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${Math.max(2, pct)}%`,
                          background: d.total > 0 ? NAVY : '#E2E8F0',
                          opacity: d.total > 0 ? 0.9 : 1,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                  <span>{t('stats.overview.axisStart')}</span>
                  <span>{t('stats.overview.axisEnd')}</span>
                </div>
              </section>

              {totals30.profile_views === 0 &&
                totals30.search_appearances === 0 &&
                totals30.contact_clicks === 0 &&
                totals30.messages_received === 0 && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                    {t('stats.overview.noData')}
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ m, value }) {
  const Icon = m.icon;
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div
        className="inline-flex w-9 h-9 rounded-xl items-center justify-center mb-3"
        style={{ background: `${m.accent}14`, color: m.accent }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-extrabold text-slate-900 leading-none">
        {Number(value || 0).toLocaleString('es-ES')}
      </div>
      <div className="text-xs text-slate-500 mt-1">{m.label}</div>
    </div>
  );
}
