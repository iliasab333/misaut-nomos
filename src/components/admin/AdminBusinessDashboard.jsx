import React, { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  TrendingUp, Calendar, UserMinus, UserPlus, Euro, Users,
  MoreVertical, AlertTriangle, ExternalLink
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { subMonths, subWeeks, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";

const ACTIVE_PLANS = ["plan_visibility", "plan_adsplus"];

// ─── MetricCard ────────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, subtext, trend, note }) {
  const trendCls = { good: "text-green-600", bad: "text-red-500", neutral: "text-amber-600" }[trend];
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className={`text-xs mt-1 ${trendCls || "text-gray-500"}`}>{subtext}</p>
      {note && <p className="text-[10px] text-gray-400 mt-1 italic">{note}</p>}
    </div>
  );
}

// ─── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const { t } = useTranslation();
  const map = {
    activo: "bg-green-50 text-green-700",
    en_prueba: "bg-blue-50 text-blue-700",
    cancelado: "bg-red-50 text-red-600",
    expirado: "bg-gray-100 text-gray-500",
    suspendu: "bg-amber-50 text-amber-700",
  };
  const labels = {
    activo: t("admin.business.status.active"),
    en_prueba: t("admin.business.status.trial"),
    cancelado: t("admin.business.status.cancelled"),
    expirado: t("admin.business.status.expired"),
    suspendu: t("admin.business.status.suspended"),
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AdminBusinessDashboard({ users, profiles, subscriptions, paymentRecords }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState(".");
  const [menuOpen, setMenuOpen] = useState(null);
  const [loadedAt] = useState(new Date());

  const now = new Date();
  const firstOfMonth = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  // Nombres de plan visibles (antes constante de módulo; ahora dependen del idioma)
  const planNames = useMemo(() => ({
    plan_visibility: t("admin.business.planNames.visibility"),
    plan_adsplus: t("admin.business.planNames.adsPlus"),
  }), [t]);

  // ─── KPI Calculations ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const activeSubs = subscriptions.filter(s => s.estado === "activo" && ACTIVE_PLANS.includes(s.plan_id));
    const mrr = activeSubs.reduce((sum, s) => sum + (s.plan_precio || 0), 0);
    const arr = mrr * 12;

    const cancelledThisMonth = subscriptions.filter(s =>
      s.estado === "cancelado" && new Date(s.updated_date) >= firstOfMonth
    );
    const activeAtStartOfMonth = subscriptions.filter(s =>
      s.estado === "activo" && new Date(s.fecha_inicio) < firstOfMonth
    ).length;
    const churn = activeAtStartOfMonth > 0 ? (cancelledThisMonth.length / activeAtStartOfMonth) * 100 : 0;

    const allTrials = subscriptions.filter(s =>
      ["en_prueba", "activo", "cancelado"].includes(s.estado) && s.plan_id?.startsWith("plan_")
    );
    const convertedTrials = allTrials.filter(s => s.estado === "activo" && ACTIVE_PLANS.includes(s.plan_id));
    const trialConversion = allTrials.length > 0 ? (convertedTrials.length / allTrials.length) * 100 : 0;

    const newThisMonth = users.filter(u =>
      u.user_type === "professionnel" && new Date(u.created_date) >= firstOfMonth
    );
    const newLastMonth = users.filter(u =>
      u.user_type === "professionnel" &&
      new Date(u.created_date) >= lastMonthStart &&
      new Date(u.created_date) < firstOfMonth
    );
    const newChange = newLastMonth.length > 0
      ? ((newThisMonth.length - newLastMonth.length) / newLastMonth.length) * 100
      : 0;

    const arpu = activeSubs.length > 0 ? mrr / activeSubs.length : 0;
    const avgLifetimeMonths = churn > 0 ? 100 / churn : 12;
    const ltv = arpu * avgLifetimeMonths;

    return {
      mrr, arr, churn, activeSubs,
      cancelledThisMonth, trialConversion,
      allTrials, convertedTrials,
      newThisMonth, newLastMonth, newChange,
      arpu, avgLifetimeMonths, ltv
    };
  }, [subscriptions, users, firstOfMonth, lastMonthStart]);

  // ─── MRR History ─────────────────────────────────────────────────────────────
  const mrrHistory = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthEnd = endOfMonth(subMonths(now, 11 - i));
      const activeAtEnd = subscriptions.filter(s =>
        ACTIVE_PLANS.includes(s.plan_id) &&
        new Date(s.fecha_inicio) <= monthEnd &&
        s.estado !== "cancelado" &&
        (s.estado === "activo" || new Date(s.fecha_expiracion) > monthEnd)
      );
      const mrrMonth = activeAtEnd.reduce((sum, s) => sum + (s.plan_precio || 0), 0);
      return {
        month: format(monthEnd, "MMM", { locale: es }),
        mrr: mrrMonth
      };
    });
  }, [subscriptions]);

  // ─── Weekly Registrations ────────────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const weekEnd = subWeeks(now, 11 - i);
      const weekStart = subWeeks(weekEnd, 1);
      const autonomos = users.filter(u =>
        u.user_type === "professionnel" &&
        new Date(u.created_date) >= weekStart &&
        new Date(u.created_date) < weekEnd
      ).length;
      const clientes = users.filter(u =>
        u.user_type === "client" &&
        new Date(u.created_date) >= weekStart &&
        new Date(u.created_date) < weekEnd
      ).length;
      return {
        week: format(weekStart, "dd MMM", { locale: es }),
        autonomos, clientes
      };
    });
  }, [users]);

  // ─── Funnel ───────────────────────────────────────────────────────────────────
  const funnel = useMemo(() => {
    const onboarded = profiles.filter(p => p.onboarding_completed).length;
    const trialActivo = subscriptions.filter(s => s.estado === "en_prueba").length;
    const pagando = kpis.activeSubs.length;
    const retenidos90d = kpis.activeSubs.filter(s => {
      const days = (now - new Date(s.fecha_inicio)) / (1000 * 60 * 60 * 24);
      return days >= 90;
    }).length;
    return [
      { label: t("admin.business.funnel.signups"), value: users.length, color: "#1E40AF" },
      { label: t("admin.business.funnel.onboarded"), value: onboarded, color: "#2563EB" },
      { label: t("admin.business.funnel.activeTrial"), value: trialActivo, color: "#3B82F6" },
      { label: t("admin.business.funnel.paying"), value: pagando, color: "#60A5FA" },
      { label: t("admin.business.funnel.retained90d"), value: retenidos90d, color: "#93C5FD" },
    ];
  }, [users, profiles, subscriptions, kpis, t]);

  // ─── Top Provinces ────────────────────────────────────────────────────────────
  const topProvinces = useMemo(() => {
    const byProvince = {};
    profiles.forEach(p => {
      if (p.provincia) byProvince[p.provincia] = (byProvince[p.provincia] || 0) + 1;
    });
    return Object.entries(byProvince)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [profiles]);

  // ─── Top Categories ──────────────────────────────────────────────────────────
  const topCategories = useMemo(() => {
    const byCategory = {};
    profiles.forEach(p => {
      (p.categories || []).forEach(c => {
        byCategory[c] = (byCategory[c] || 0) + 1;
      });
    });
    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [profiles]);

  // ─── Subscribers Table ───────────────────────────────────────────────────────
  const subscribersData = useMemo(() => {
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
    const paymentsByUser = {};
    paymentRecords.forEach(p => {
      if (!paymentsByUser[p.user_id]) paymentsByUser[p.user_id] = 0;
      if (p.status === "succeeded") paymentsByUser[p.user_id] += p.amount || 0;
    });

    return subscriptions.map(sub => {
      const u = userMap[sub.user_id];
      const prof = profileMap[sub.user_id];
      return {
        id: sub.id,
        userId: sub.user_id,
        name: prof?.business_name || u?.full_name || t("admin.business.noName"),
        email: u?.email || "—",
        plan: sub.plan_id,
        planName: planNames[sub.plan_id] || sub.plan_id,
        fechaInicio: sub.fecha_inicio,
        fechaExpiracion: sub.fecha_expiracion,
        estado: sub.estado,
        totalPagado: paymentsByUser[sub.user_id] || 0,
      };
    });
  }, [subscriptions, users, profiles, paymentRecords, planNames, t]);

  const filteredSubs = useMemo(() => {
    return subscribersData.filter(s => {
      if (filter !== "all" && s.estado !== filter) return false;
      const q = search.toLowerCase();
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subscribersData, filter, search]);

  // ─── Actions ──────────────────────────────────────────────────────────────────
  const extendTrial = async (subId, days = 7) => {
    if (!confirm(t("admin.business.confirmExtend", { days }))) return;
    setMenuOpen(null);
    const sub = subscriptions.find(s => s.id === subId);
    if (!sub) return;
    const newExpiry = new Date(new Date(sub.fecha_expiracion).getTime() + days * 24 * 60 * 60 * 1000);
    await base44.entities.Subscription.update(subId, { fecha_expiracion: newExpiry.toISOString() });
    toast.success(t("admin.business.trialExtended", { days }));
  };

  const cancelSub = async (subId) => {
    if (!confirm(t("admin.business.confirmCancel"))) return;
    setMenuOpen(null);
    await base44.entities.Subscription.update(subId, { estado: "cancelado" });
    toast.success(t("admin.business.subscriptionCancelled"));
  };

  const timeSince = useMemo(() => {
    const mins = Math.floor((new Date() - loadedAt) / 60000);
    return mins === 0 ? t("admin.business.updatedNow") : t("admin.business.updatedAgo", { mins });
  }, [loadedAt, t]);

  const { mrr, arr, churn, activeSubs, cancelledThisMonth, trialConversion,
    allTrials, convertedTrials, newThisMonth, newChange, arpu, avgLifetimeMonths, ltv } = kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t("admin.business.title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("admin.business.subtitle", { time: timeSince })}</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/pagos"
            className="bg-gray-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-gray-800"
          >
            <ExternalLink className="w-3.5 h-3.5" /> {t("admin.business.paymentsLink")}
          </a>
        </div>
      </div>

      {/* Slack warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-amber-900">{t("admin.business.slackAlert.title")}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            <Trans i18nKey="admin.business.slackAlert.description">
              Las métricas se calculan en tiempo real. Para recibir alertas en Slack, añade la variable de entorno <code className="bg-amber-100 px-1 rounded">SLACK_WEBHOOK_URL</code>.
            </Trans>
          </p>
        </div>
        <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="text-xs text-amber-900 underline font-medium whitespace-nowrap">
          {t("admin.business.slackAlert.howTo")}
        </a>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard
          icon={Euro}
          label="MRR"
          value={`€${mrr.toFixed(2)}`}
          subtext={t("admin.business.kpi.activeSubscribers", { count: activeSubs.length })}
        />
        <MetricCard
          icon={Calendar}
          label="ARR"
          value={`€${arr.toFixed(0)}`}
          subtext={t("admin.business.kpi.annualized")}
        />
        <MetricCard
          icon={UserMinus}
          label={t("admin.business.kpi.monthlyChurn")}
          value={`${churn.toFixed(1)}%`}
          subtext={t("admin.business.kpi.cancellationsThisMonth", { count: cancelledThisMonth.length })}
          trend={churn === 0 ? "good" : churn > 5 ? "bad" : "neutral"}
        />
        <MetricCard
          icon={TrendingUp}
          label={t("admin.business.kpi.trialToPaid")}
          value={`${trialConversion.toFixed(1)}%`}
          subtext={t("admin.business.kpi.trialsConverted", { converted: convertedTrials.length, total: allTrials.length })}
          trend={trialConversion >= 15 ? "good" : trialConversion >= 5 ? "neutral" : "bad"}
        />
        <MetricCard
          icon={UserPlus}
          label={t("admin.business.kpi.newThisMonth")}
          value={newThisMonth.length}
          subtext={t("admin.business.kpi.vsLastMonth", { change: `${newChange >= 0 ? "+" : ""}${newChange.toFixed(0)}` })}
          trend={newChange >= 0 ? "good" : "bad"}
        />
        <MetricCard
          icon={Euro}
          label={t("admin.business.kpi.estimatedLtv")}
          value={`€${ltv.toFixed(0)}`}
          subtext={t("admin.business.kpi.arpuLifetime", { arpu: arpu.toFixed(0), months: avgLifetimeMonths.toFixed(0) })}
          note={t("admin.business.kpi.cacNote")}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MRR Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">{t("admin.business.charts.mrrHistory")}</h3>
            <span className="text-xs text-gray-500">{t("admin.business.charts.mrrToday", { amount: mrr.toFixed(0) })}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mrrHistory}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#1E40AF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip formatter={v => [`€${v}`, "MRR"]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Area type="monotone" dataKey="mrr" stroke="#1E40AF" strokeWidth={2} fill="url(#mrrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Registrations */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">{t("admin.business.charts.weeklySignups")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="autonomos" fill="#1E40AF" radius={[4, 4, 0, 0]} name={t("admin.business.charts.professionals")} />
              <Bar dataKey="clientes" fill="#10B981" radius={[4, 4, 0, 0]} name={t("admin.business.charts.clients")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel + Province row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 md:col-span-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">{t("admin.business.funnel.title")}</h3>
          <div className="space-y-2.5">
            {funnel.map((step, i, arr) => {
              const maxValue = arr[0].value || 1;
              const width = (step.value / maxValue) * 100;
              const convPrev = i > 0 && arr[i - 1].value > 0
                ? ((step.value / arr[i - 1].value) * 100).toFixed(0)
                : null;
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{step.label}</span>
                    <span className="text-gray-500">
                      <strong className="text-gray-900">{step.value}</strong>
                      {convPrev && <span className="ml-1 text-[10px] text-gray-400">({convPrev}%)</span>}
                    </span>
                  </div>
                  <div className="h-5 bg-gray-50 rounded overflow-hidden">
                    <div className="h-full rounded transition-all duration-500" style={{ width: `${width}%`, background: step.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Provinces */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 md:col-span-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">{t("admin.business.topProvinces.title")}</h3>
          {topProvinces.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">{t("admin.business.topProvinces.empty")}</p>
          ) : (
            <div className="space-y-2">
              {topProvinces.map(p => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-700 w-24 truncate">{p.name}</span>
                  <div className="flex-1 h-4 bg-gray-50 rounded overflow-hidden">
                    <div className="h-full bg-blue-500 rounded" style={{ width: `${(p.count / topProvinces[0].count) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 w-5 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 md:col-span-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">{t("admin.business.topCategories.title")}</h3>
          {topCategories.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">{t("admin.business.topCategories.empty")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCategories} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h3 className="font-semibold text-gray-900 text-sm">{t("admin.business.subscribers.title", { count: filteredSubs.length })}</h3>
          <input
            placeholder={t("admin.business.subscribers.searchPlaceholder")}
            value={search === "." ? "" : search}
            onChange={e => setSearch(e.target.value || ".")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-[160px] max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="all">{t("admin.business.subscribers.filters.all")}</option>
            <option value="activo">{t("admin.business.subscribers.filters.active")}</option>
            <option value="en_prueba">{t("admin.business.subscribers.filters.trial")}</option>
            <option value="cancelado">{t("admin.business.subscribers.filters.cancelled")}</option>
            <option value="expirado">{t("admin.business.subscribers.filters.expired")}</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 text-xs font-medium text-gray-500">{t("admin.business.subscribers.columns.professional")}</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500">{t("admin.business.subscribers.columns.plan")}</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">{t("admin.business.subscribers.columns.signupDate")}</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">{t("admin.business.subscribers.columns.renewal")}</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500">{t("admin.business.subscribers.columns.status")}</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">{t("admin.business.subscribers.columns.paid")}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">{t("admin.business.subscribers.noResults")}</td>
                </tr>
              ) : filteredSubs.map(s => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">{s.planName}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    {s.fechaInicio ? new Date(s.fechaInicio).toLocaleDateString("es-ES") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    {s.fechaExpiracion ? new Date(s.fechaExpiracion).toLocaleDateString("es-ES") : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.estado} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 text-sm">
                    €{s.totalPagado.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === s.id ? null : s.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === s.id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-lg shadow-lg z-20 w-48 py-1">
                        <a
                          href={`/autonomo/${s.userId}`}
                          className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(null)}
                        >
                          {t("profile_card.view_profile")}
                        </a>
                        <button
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                          onClick={() => extendTrial(s.id, 7)}
                        >
                          {t("admin.business.subscribers.extendDays", { days: 7 })}
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                          onClick={() => extendTrial(s.id, 30)}
                        >
                          {t("admin.business.subscribers.extendDays", { days: 30 })}
                        </button>
                        <hr className="my-1 border-gray-100" />
                        <button
                          className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => cancelSub(s.id)}
                        >
                          {t("admin.business.subscribers.cancelSubscription")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
