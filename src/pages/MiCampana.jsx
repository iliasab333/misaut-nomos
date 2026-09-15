import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Megaphone, Plus, ChevronRight, CheckCircle, Clock, Zap, BarChart2, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Nombres propios de las redes: no se traducen, pueden vivir fuera del componente.
const PLATFORM_LABELS = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok',
  google_search: 'Google Search', linkedin: 'LinkedIn'
};

export default function MiCampana() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  // Etiquetas de estado y objetivo: antes constantes de módulo, ahora dentro
  // del componente para que se retraduzcan al cambiar de idioma.
  const STATUS_LABELS = {
    draft: { label: t('draft'), color: 'bg-gray-100 text-gray-700' },
    submitted: { label: t('ads.campaign.briefingStatus.submitted'), color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: t('ads.campaign.briefingStatus.inReview'), color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: t('ads.campaign.briefingStatus.approved'), color: 'bg-green-100 text-green-700' },
    live: { label: t('ads.campaign.briefingStatus.live'), color: 'bg-emerald-100 text-emerald-700' },
    completed: { label: t('ads.campaign.briefingStatus.completed'), color: 'bg-gray-100 text-gray-600' },
  };

  const CAMPAIGN_STATUS_LABELS = {
    pending: { label: t('ads.campaign.campaignStatus.pending'), color: 'bg-gray-100 text-gray-600' },
    in_review: { label: t('ads.campaign.campaignStatus.inReview'), color: 'bg-blue-100 text-blue-700' },
    creating: { label: t('ads.campaign.campaignStatus.creating'), color: 'bg-yellow-100 text-yellow-700' },
    live: { label: t('ads.campaign.campaignStatus.live'), color: 'bg-green-100 text-green-700' },
    paused: { label: t('ads.campaign.campaignStatus.paused'), color: 'bg-orange-100 text-orange-700' },
    finished: { label: t('ads.campaign.campaignStatus.finished'), color: 'bg-gray-100 text-gray-500' },
  };

  const GOAL_LABELS = {
    more_calls: t('ads.campaign.goal.moreCalls'), more_leads: t('ads.campaign.goal.moreLeads'),
    more_quotes: t('ads.campaign.goal.moreQuotes'), brand_awareness: t('ads.campaign.goal.brandAwareness'),
    website_traffic: t('ads.campaign.goal.websiteTraffic')
  };

  const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const briefings = await base44.entities.AdsBriefing.filter({
          professional_id: u.id,
          month_year: currentMonthYear
        });
        setBriefing(briefings[0] || null);
      } catch (err) {
        console.error('MiCampana error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const metrics = briefing?.campaign_metrics || {};
  const budgetSpent = metrics.spent_eur || 0;
  const budgetTotal = briefing?.included_budget_eur || 30;
  const budgetPct = Math.min((budgetSpent / budgetTotal) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('ads.campaign.title')}</h1>
            <p className="text-sm text-gray-500 capitalize">{currentMonthLabel}</p>
          </div>
        </div>

        {/* Sin briefing este mes */}
        {!briefing && (
          <Card className="border-0 shadow-md text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {t('ads.campaign.emptyTitle', { month: currentMonthLabel })}
              </h2>
              <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                {t('ads.campaign.emptyDescription')}
              </p>
              <Button
                onClick={() => navigate('/mi-campana/briefing')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('ads.campaign.configureButton')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Con briefing */}
        {briefing && (
          <div className="space-y-4">
            {/* Estado general */}
            <Card className="border-0 shadow-md">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('ads.campaign.briefingStatusLabel')}</p>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[briefing.status]?.color}`}>
                      {STATUS_LABELS[briefing.status]?.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">{t('ads.campaign.campaignStatusLabel')}</p>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${CAMPAIGN_STATUS_LABELS[briefing.campaign_status]?.color}`}>
                      {CAMPAIGN_STATUS_LABELS[briefing.campaign_status]?.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{t('ads.campaign.platformLabel')}</p>
                    <p className="font-semibold text-gray-900">{PLATFORM_LABELS[briefing.platform] || briefing.platform}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{t('ads.campaign.goalLabel')}</p>
                    <p className="font-semibold text-gray-900">{GOAL_LABELS[briefing.goal] || briefing.goal}</p>
                  </div>
                </div>

                {/* Presupuesto */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t('ads.campaign.budgetUsed')}</span>
                    <span>{budgetSpent.toFixed(2)} € / {budgetTotal} €</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => navigate('/mi-campana/briefing')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {t('ads.campaign.editBriefing')}
                </Button>
              </CardContent>
            </Card>

            {/* Material del anuncio */}
            {(briefing.ads_copy || briefing.ads_creative_urls?.length > 0) && (
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    {t('ads.campaign.materialTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {briefing.ads_copy && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">{t('ads.campaign.adCopyLabel')}</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{briefing.ads_copy}</p>
                    </div>
                  )}
                  {briefing.ads_creative_urls?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">{t('ads.campaign.creativesLabel')}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {briefing.ads_creative_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={t('ads.campaign.creativeAlt', { number: i + 1 })} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {!briefing.ads_content_approved && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                      {t('ads.campaign.materialPending')}
                    </div>
                  )}
                  {briefing.ads_content_approved && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {t('ads.campaign.materialApproved')}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Métricas */}
            {briefing.campaign_status === 'live' || briefing.campaign_status === 'finished' ? (
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-600" />
                    {t('ads.campaign.resultsTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: t('ads.campaign.metrics.reach'), value: metrics.reach?.toLocaleString() || '—' },
                      { label: t('ads.campaign.metrics.clicks'), value: metrics.clicks?.toLocaleString() || '—' },
                      { label: t('ads.campaign.metrics.leads'), value: metrics.leads_generated?.toLocaleString() || '—' },
                      { label: t('ads.campaign.metrics.cpc'), value: metrics.cpc ? `${metrics.cpc.toFixed(2)} €` : '—' },
                    ].map(m => (
                      <div key={m.label} className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-gray-900">{m.value}</p>
                        <p className="text-xs text-gray-500">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{t('ads.campaign.metricsPending')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
