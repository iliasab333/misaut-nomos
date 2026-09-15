import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Eye, Search, MessageSquare, MousePointerClick, TrendingUp,
  AlertCircle, CheckCircle2, ArrowRight, Image, FileText, Star, Zap
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import SEOHead from "../components/seo/SEOHead";

// Recibe la lista de consejos (ya traducida) en vez de leer una constante de módulo.
function getMissingTips(profile, tips) {
  if (!profile) return tips;
  const missing = [];
  if (!profile.imagen_principal) missing.push(tips[0]);
  if (!profile.description || profile.description.length < 80) missing.push(tips[1]);
  if (!profile.total_reviews || profile.total_reviews === 0) missing.push(tips[2]);
  if (!profile.photos || profile.photos.length < 3) missing.push(tips[3]);
  return missing.slice(0, 4);
}

export default function MiVisibilidadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const u = await base44.auth.me();
      if (!u || u.user_type !== 'professionnel') { navigate(createPageUrl("Search")); return; }
      setUser(u);
    } catch { navigate(createPageUrl("Search")); }
    finally { setLoading(false); }
  };

  const { data: metrics = [] } = useQuery({
    queryKey: ['profileMetrics30d', user?.id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString().split('T')[0];
      const all = await base44.entities.ProfileMetrics.filter({ professional_id: user.id });
      return all
        .filter(m => m.professional_id !== 'system' && m.date >= cutoff)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!user,
    staleTime: 60000 * 5,
  });

  const { data: profile } = useQuery({
    queryKey: ['professionalProfile', user?.id],
    queryFn: async () => {
      const p = await base44.entities.ProfessionalProfile.filter({ user_id: user.id });
      return p[0] || null;
    },
    enabled: !!user,
    staleTime: 60000 * 5,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const s = await base44.entities.Subscription.filter({ user_id: user.id });
      return s[0] || null;
    },
    enabled: !!user,
    staleTime: 60000 * 5,
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  const hasActiveSub = subscription && (subscription.estado === 'activo' || subscription.estado === 'en_prueba');
  const totalViews = metrics.reduce((s, m) => s + (m.profile_views || 0), 0);
  const totalSearches = metrics.reduce((s, m) => s + (m.search_appearances || 0), 0);
  const totalMessages = metrics.reduce((s, m) => s + (m.messages_received || 0), 0);
  const totalClicks = metrics.reduce((s, m) => s + (m.contact_clicks || 0), 0);

  // Antes constante de módulo (TIPS): dentro del componente para que pase por t().
  const TIPS = [
    { icon: Image, label: t('stats.visibility.tips.addPhoto'), key: "imagen_principal", cta: t('stats.visibility.tips.addPhotoCta') },
    { icon: FileText, label: t('stats.visibility.tips.completeDescription'), key: "description", cta: t('editProfile') },
    { icon: Star, label: t('stats.visibility.tips.firstReview'), key: "reviews", cta: t('stats.visibility.tips.firstReviewCta') },
    { icon: Image, label: t('stats.visibility.tips.workPhotos'), key: "photos", cta: t('stats.visibility.tips.workPhotosCta') },
  ];

  const tips = getMissingTips(profile, TIPS);

  // Preparar datos para el gráfico — últimos 30 días
  const today = new Date();
  const chartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const metric = metrics.find(m => m.date === dateStr);
    chartData.push({
      date: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      vistas: metric?.profile_views || 0,
      mensajes: metric?.messages_received || 0,
    });
  }

  const statsCards = [
    { label: t('stats.metrics.profileViews'), value: totalViews, icon: Eye, color: "from-blue-500 to-cyan-500" },
    { label: t('stats.visibility.searchAppearances'), value: totalSearches, icon: Search, color: "from-violet-500 to-purple-500" },
    { label: t('stats.metrics.messagesReceived'), value: totalMessages, icon: MessageSquare, color: "from-emerald-500 to-green-500" },
    { label: t('stats.visibility.contactClicks'), value: totalClicks, icon: MousePointerClick, color: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <SEOHead title={t('stats.visibility.seoTitle')} noindex />
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('stats.visibility.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('stats.periods.last30Days')}</p>
        </div>

        {/* CTA si no tiene suscripción */}
        {!hasActiveSub && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-lg">{t('stats.visibility.noPlanTitle')}</p>
                <p className="text-blue-100 text-sm mt-1">
                  {t('stats.visibility.noPlanText')}
                </p>
              </div>
            </div>
            <Button
              className="mt-4 w-full bg-white text-blue-700 hover:bg-blue-50 font-bold h-11"
              onClick={() => navigate(createPageUrl("PricingPlans"))}
            >
              <Zap className="w-4 h-4 mr-2" />
              {t('stats.visibility.activatePlan')}
            </Button>
          </motion.div>
        )}

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-3">
          {statsCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-4">
                  <div className={`inline-flex w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} items-center justify-center mb-3 shadow-sm`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900">{card.value.toLocaleString('es-ES')}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{card.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* GRÁFICO */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              {t('stats.visibility.chartTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-5">
            {totalViews === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Eye className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-500 text-sm font-medium">{t('stats.visibility.noViewsTitle')}</p>
                <p className="text-gray-400 text-xs mt-1">{t('stats.visibility.noViewsText')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVistas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v, n) => [v, n === 'vistas' ? t('stats.visibility.chartViews') : t('nav.messages')]}
                  />
                  <Area type="monotone" dataKey="vistas" stroke="#3B82F6" strokeWidth={2} fill="url(#colorVistas)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* TIPS PARA MEJORAR */}
        {tips.length > 0 && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-base font-bold text-gray-900">{t('stats.visibility.tipsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <tip.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{tip.label}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-blue-200 text-blue-700 hover:bg-blue-100 flex-shrink-0"
                    onClick={() => {
                      if (tip.key === 'reviews') {
                        const slug = profile?.slug_publico || user?.id;
                        window.open(`/autonomo/${slug}`, '_blank');
                      } else {
                        navigate(createPageUrl("MyProfile"));
                      }
                    }}
                  >
                    {tip.cta} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {tips.length === 0 && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-green-800">{t('stats.visibility.optimized')}</p>
          </div>
        )}

        {/* BOTÓN VER PERFIL PÚBLICO */}
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl border-gray-200 font-semibold"
          onClick={() => {
            const slug = profile?.slug_publico || user?.id;
            window.open(`/autonomo/${slug}`, '_blank');
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          {t('stats.visibility.viewAsClients')}
        </Button>

      </div>
    </div>
  );
}
