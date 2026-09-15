import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Eye,
  MessageSquare,
  Search,
  TrendingUp,
  Star,
  Crown,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Sparkles
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PremiumDashboard({ metrics = [], subscription, profile }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const hasActiveSubscription = subscription && 
    ['activo', 'active', 'en_prueba', 'trialing'].some(s => 
      subscription.estado?.toLowerCase().includes(s)
    );

  const last30DaysMetrics = useMemo(() => {
    if (!Array.isArray(metrics)) return { views: 0, messages: 0, searches: 0, contacts: 0 };
    if (!metrics || metrics.length === 0) {
      return {
        totalViews: 0,
        totalMessages: 0,
        totalSearches: 0,
        totalContacts: 0,
        avgViewsPerDay: 0,
        trend: 0
      };
    }

    const sortedMetrics = [...metrics].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ).slice(0, 30);

    const totalViews = sortedMetrics.reduce((sum, m) => sum + (m.profile_views || 0), 0);
    const totalMessages = sortedMetrics.reduce((sum, m) => sum + (m.messages_received || 0), 0);
    const totalSearches = sortedMetrics.reduce((sum, m) => sum + (m.search_appearances || 0), 0);
    const totalContacts = sortedMetrics.reduce((sum, m) => sum + (m.contact_clicks || 0), 0);

    const recent15 = sortedMetrics.slice(0, 15);
    const previous15 = sortedMetrics.slice(15, 30);
    
    const recentAvg = recent15.reduce((sum, m) => sum + (m.profile_views || 0), 0) / 15;
    const previousAvg = previous15.reduce((sum, m) => sum + (m.profile_views || 0), 0) / 15;
    
    const trend = previousAvg > 0 
      ? ((recentAvg - previousAvg) / previousAvg) * 100 
      : recentAvg > 0 ? 100 : 0;

    return {
      totalViews,
      totalMessages,
      totalSearches,
      totalContacts,
      avgViewsPerDay: totalViews / 30,
      trend: Math.round(trend)
    };
  }, [metrics]);

  const profileCompleteness = useMemo(() => {
    if (!profile) return { percentage: 0, missing: [] };
    
    const checks = [
      { key: 'business_name', label: t('premium.dashboard.checks.businessName'), weight: 10 },
      { key: 'descripcion_corta', label: t('premium.dashboard.checks.shortDescription'), weight: 15 },
      { key: 'description', label: t('premium.dashboard.checks.fullDescription'), weight: 10 },
      { key: 'categories', label: t('premium.dashboard.checks.categories'), weight: 10, check: (v) => v && v.length > 0 },
      { key: 'photos', label: t('premium.dashboard.checks.workPhotos'), weight: 15, check: (v) => v && v.length >= 3 },
      { key: 'telefono_contacto', label: t('phoneLabel'), weight: 10 },
      { key: 'service_area', label: t('premium.dashboard.checks.serviceArea'), weight: 10 },
      { key: 'formas_pago', label: t('premium.dashboard.checks.paymentMethods'), weight: 10, check: (v) => v && v.length > 0 },
      { key: 'years_experience', label: t('yearsExperience'), weight: 5 },
      { key: 'certifications', label: t('profile_page.certifications_title'), weight: 5, check: (v) => v && v.length > 0 }
    ];

    let completed = 0;
    const missing = [];

    checks.forEach(check => {
      const value = profile[check.key];
      const isComplete = check.check 
        ? check.check(value)
        : value !== undefined && value !== null && value !== '';
      
      if (isComplete) {
        completed += check.weight;
      } else {
        missing.push({ label: check.label, weight: check.weight });
      }
    });

    return { percentage: completed, missing };
  }, [profile, t]);

  const premiumFeatures = [
    {
      icon: Star,
      title: t('premium.dashboard.features.featuredProfile'),
      description: t('premium.dashboard.features.featuredProfileText'),
      active: hasActiveSubscription
    },
    {
      icon: Crown,
      title: t('premium.dashboard.features.badge'),
      description: t('premium.dashboard.features.badgeText'),
      active: hasActiveSubscription
    },
    {
      icon: BarChart3,
      title: t('premium.dashboard.features.advancedStats'),
      description: t('premium.dashboard.features.advancedStatsText'),
      active: hasActiveSubscription
    },
    {
      icon: Sparkles,
      title: t('premium.dashboard.features.moreVisibility'),
      description: t('premium.dashboard.features.moreVisibilityText'),
      active: hasActiveSubscription
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('premium.dashboard.title')}</h2>
              <p className="text-blue-100">
                {hasActiveSubscription 
                  ? t('premium.dashboard.activeSubtitle')
                  : t('premium.dashboard.inactiveSubtitle')}
              </p>
            </div>
            {hasActiveSubscription && (
              <Badge className="bg-amber-500 text-amber-900 text-lg px-4 py-2">
                <Crown className="w-5 h-5 mr-2" />
                {t('premium.dashboard.badge')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {hasActiveSubscription ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-8 h-8 text-blue-600" />
                {last30DaysMetrics.trend !== 0 && (
                  <Badge className={last30DaysMetrics.trend > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {last30DaysMetrics.trend > 0 ? '+' : ''}{last30DaysMetrics.trend}%
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900">{last30DaysMetrics.totalViews}</p>
              <p className="text-sm text-gray-600">{t('premium.dashboard.metrics.views')}</p>
              <p className="text-xs text-gray-500 mt-1">
                {t('premium.dashboard.metrics.perDay', { views: Math.round(last30DaysMetrics.avgViewsPerDay) })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{last30DaysMetrics.totalMessages}</p>
              <p className="text-sm text-gray-600">{t('premium.dashboard.metrics.messages')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('premium.dashboard.metrics.last30Days')}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{last30DaysMetrics.totalSearches}</p>
              <p className="text-sm text-gray-600">{t('premium.dashboard.metrics.searches')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('premium.dashboard.metrics.last30Days')}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{last30DaysMetrics.totalContacts}</p>
              <p className="text-sm text-gray-600">{t('premium.dashboard.metrics.contacts')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('premium.dashboard.metrics.contactsHint')}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('premium.dashboard.locked.title')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('premium.dashboard.locked.text')}
            </p>
            <Button 
              onClick={() => navigate(createPageUrl("PricingPlans"))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('premium.dashboard.locked.viewPlans')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              {t('premium.dashboard.completeness.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  {t('premium.dashboard.completeness.percent', { percent: profileCompleteness.percentage })}
                </span>
                <span className="text-sm text-gray-500">
                  {profileCompleteness.percentage >= 90 ? t('premium.dashboard.completeness.excellent') : 
                   profileCompleteness.percentage >= 70 ? t('premium.dashboard.completeness.good') : 
                   t('premium.dashboard.completeness.addMore')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    profileCompleteness.percentage >= 90 ? 'bg-green-500' :
                    profileCompleteness.percentage >= 70 ? 'bg-blue-500' :
                    'bg-amber-500'
                  }`}
                  style={{ width: `${profileCompleteness.percentage}%` }}
                />
              </div>
            </div>

            {profileCompleteness.missing.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {t('premium.dashboard.completeness.missingIntro')}
                </p>
                {profileCompleteness.missing.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    {item.label}
                  </div>
                ))}
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate(createPageUrl("MyProfile"))}
            >
              {t('editProfile')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              {t('premium.dashboard.benefits.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {premiumFeatures.map((feature, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    feature.active ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    feature.active ? 'bg-blue-100' : 'bg-gray-200'
                  }`}>
                    <feature.icon className={`w-5 h-5 ${
                      feature.active ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                      {feature.active && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {!hasActiveSubscription && (
              <Button 
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-800"
                onClick={() => navigate(createPageUrl("PricingPlans"))}
              >
                <Crown className="w-4 h-4 mr-2" />
                {t('premium.dashboard.benefits.activate')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            {t('dashboard.tips_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">{t('premium.dashboard.tips.photosTitle')}</h4>
              <p className="text-sm text-blue-800">
                {t('premium.dashboard.tips.photosText')}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">{t('premium.dashboard.tips.replyTitle')}</h4>
              <p className="text-sm text-green-800">
                {t('premium.dashboard.tips.replyText')}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">{t('premium.dashboard.tips.reviewsTitle')}</h4>
              <p className="text-sm text-amber-800">
                {t('premium.dashboard.tips.reviewsText')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
