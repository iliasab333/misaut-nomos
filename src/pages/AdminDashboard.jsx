import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Eye, MousePointerClick, Search as SearchIcon, MessageSquare,
  Mail, Briefcase, TrendingUp,
} from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const NAVY_SOFT = 'rgba(0,37,92,0.06)';
const GOLD = '#F5C13D';

function toISODate(d) { return d.toISOString().slice(0, 10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: NAVY_SOFT, color: NAVY }}>
          <Icon className="w-4 h-4" />
        </span>
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900 tabular-nums">{value.toLocaleString('es-ES')}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function Breakdown({ title, items, total, accent = NAVY }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map(({ key, count }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={key || 'sin'}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-800 truncate pr-3">{key || 'Sin asignar'}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{count}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#EEF2F8' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState(30);

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin:users'],
    queryFn: () => base44.entities.User.list('-created_date', 5000),
    staleTime: 60_000,
  });
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['admin:profiles'],
    queryFn: () => base44.entities.ProfessionalProfile.list('-created_date', 5000),
    staleTime: 60_000,
  });
  const { data: subscribers = [] } = useQuery({
    queryKey: ['admin:newsletter'],
    queryFn: () => base44.entities.NewsletterSubscriber.list('-created_date', 10000),
    staleTime: 60_000,
  });
  const { data: messages = [] } = useQuery({
    queryKey: ['admin:messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 5000),
    staleTime: 60_000,
  });
  const { data: metrics = [] } = useQuery({
    queryKey: ['admin:metrics', range],
    queryFn: async () => {
      const since = toISODate(daysAgo(range));
      const all = await base44.entities.ProfileMetrics.filter(
        { date: { $gte: since } }, '-date', 20000
      );
      return Array.isArray(all) ? all : [];
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    const sinceDate = daysAgo(range);
    const isInRange = (d) => d && new Date(d) >= sinceDate;
    const newUsers = users.filter((u) => isInRange(u.created_date)).length;
    const activeProfiles = profiles.filter(
      (p) => p.visible_en_busqueda === true && p.onboarding_completed === true
    ).length;
    const subsActive = subscribers.filter((s) => s.status === 'confirmed').length;
    const msgsInRange = messages.filter((m) => isInRange(m.created_date)).length;
    const sumMetric = (k) => metrics.reduce((s, m) => s + (Number(m[k]) || 0), 0);

    return {
      users: users.length,
      activeProfiles,
      newUsers,
      subsActive,
      msgsInRange,
      views: sumMetric('profile_views'),
      appearances: sumMetric('search_appearances'),
      contactClicks: sumMetric('contact_clicks'),
      messagesReceived: sumMetric('messages_received'),
    };
  }, [users, profiles, subscribers, messages, metrics, range]);

  const topMap = (selector) => {
    const map = new Map();
    profiles.forEach((p) => {
      if (!p.visible_en_busqueda || !p.onboarding_completed) return;
      const v = selector(p);
      (Array.isArray(v) ? v : [v]).forEach((k) => {
        if (!k) return;
        map.set(k, (map.get(k) || 0) + 1);
      });
    });
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const byCategory = useMemo(() => topMap((p) => p.categories || []), [profiles]);
  const byProvincia = useMemo(() => topMap((p) => p.provincia), [profiles]);
  const byCiudad = useMemo(() => topMap((p) => p.ciudad), [profiles]);

  const loading = loadingUsers || loadingProfiles;

  return (
    <>
      <SEOHead title="Métricas · Admin" noindex />
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                Métricas
              </h1>
              <p className="text-sm text-slate-500 mt-1">Datos en directo de la plataforma.</p>
            </div>
            <div className="inline-flex p-1 rounded-xl bg-slate-100">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRange(d)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    range === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
                  <div className="h-3 w-20 rounded bg-slate-100" />
                  <div className="h-7 w-16 rounded bg-slate-100 mt-4" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Usuarios" value={stats.users} sub={`${stats.newUsers} nuevos ${range}d`} />
                <StatCard icon={Briefcase} label="Profesionales activos" value={stats.activeProfiles} sub={`${profiles.length} totales`} />
                <StatCard icon={Mail} label="Suscriptores" value={stats.subsActive} sub={`${subscribers.length} totales`} />
                <StatCard icon={MessageSquare} label="Mensajes" value={stats.msgsInRange} sub={`últimos ${range}d`} />
              </div>

              <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 mt-10 mb-3">Actividad ({range}d)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Eye} label="Vistas de perfil" value={stats.views} />
                <StatCard icon={SearchIcon} label="Apariciones en búsqueda" value={stats.appearances} />
                <StatCard icon={MousePointerClick} label="Clics de contacto" value={stats.contactClicks} />
                <StatCard icon={TrendingUp} label="Mensajes recibidos" value={stats.messagesReceived} />
              </div>

              <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 mt-10 mb-3">Reparto de profesionales activos</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Breakdown title="Top categorías" items={byCategory} total={stats.activeProfiles} accent={NAVY} />
                <Breakdown title="Top provincias" items={byProvincia} total={stats.activeProfiles} accent={NAVY} />
                <Breakdown title="Top ciudades" items={byCiudad} total={stats.activeProfiles} accent={GOLD} />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
