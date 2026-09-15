import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Users, MapPin, Target, TrendingUp, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function InsightsOnboarding({ onComplete, user }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    // Paso 1
    client_type: "",
    average_ticket: "",
    monthly_revenue: "",
    
    // Paso 2
    ideal_age_ranges: [],
    ideal_gender: "",
    ideal_interests: [],
    
    // Paso 3
    client_social_networks: [],
    geographic_scope: "",
    
    // Paso 4
    current_channels: [],
    biggest_challenge: "",
    
    // Paso 5
    six_month_goal: "",
    differentiation: ""
  });

  // Antes constante de módulo (STEPS): dentro del componente para que pase por t().
  const STEPS = [
    { id: 1, title: t('ads.insights.steps.clientTypeTitle'), subtitle: t('ads.insights.steps.clientTypeSubtitle'), icon: Users },
    { id: 2, title: t('ads.insights.steps.idealProfileTitle'), subtitle: t('ads.insights.steps.idealProfileSubtitle'), icon: Target },
    { id: 3, title: t('ads.insights.steps.whereTitle'), subtitle: t('ads.insights.steps.whereSubtitle'), icon: MapPin },
    { id: 4, title: t('ads.insights.steps.channelsTitle'), subtitle: t('ads.insights.steps.channelsSubtitle'), icon: TrendingUp },
    { id: 5, title: t('ads.insights.steps.goalsTitle'), subtitle: t('ads.insights.steps.goalsSubtitle'), icon: Star }
  ];

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error(t('ads.shared.noSessionError'));
      return;
    }
    setSaving(true);
    
    try {
      // Mapear valores del formulario a los enums de la entidad ClientInsights
      const clientTypeMap = { particulares: 'particular', empresas: 'company', ambos: 'both' };
      const genderMap = { hombres: 'men', mujeres: 'women', ambos: 'both' };
      const geoMap = { local: 'local_city', provincial: 'provincial', regional: 'regional', nacional: 'national', online: 'online_anywhere' };
      const goalMap = { new_clients: 'new_clients', loyalty: 'retain_existing', increase_ticket: 'increase_ticket', expand_zone: 'expand_geography', new_services: 'new_services' };

      await base44.entities.ClientInsights.create({
        professional_id: user.id,   // campo requerido
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        // Paso 1
        client_type: clientTypeMap[formData.client_type] || 'both',
        average_ticket_range: formData.average_ticket || '',
        monthly_revenue_range: formData.monthly_revenue || '',

        // Paso 2
        client_age_range: formData.ideal_age_ranges,
        client_gender: genderMap[formData.ideal_gender] || 'both',
        client_interests: formData.ideal_interests,

        // Paso 3
        preferred_platforms: formData.client_social_networks,
        service_area_type: geoMap[formData.geographic_scope] || 'local_city',

        // Paso 4
        client_sources_now: formData.current_channels,
        biggest_challenge: formData.biggest_challenge,

        // Paso 5
        business_goal_next_6m: goalMap[formData.six_month_goal] || 'new_clients',
        unique_selling_point: formData.differentiation,
      });
      
      console.log('[InsightsOnboarding] ✅ ClientInsights creado para professional_id:', user.id);
      toast.success(t('ads.insights.saved'));
      onComplete();
    } catch (error) {
      console.error("Error saving insights:", error);
      toast.error(t('ads.insights.saveError', { message: error?.message || t('ads.insights.saveErrorFallback') }));
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base">{t('ads.insights.clientTypeQuestion')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                {[
                  { id: 'particulares', label: t('ads.insights.clientType.individuals'), desc: 'B2C' },
                  { id: 'empresas', label: t('ads.insights.clientType.companies'), desc: 'B2B' },
                  { id: 'ambos', label: t('ads.insights.both'), desc: 'B2B + B2C' }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, client_type: option.id })}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.client_type === option.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-sm">{option.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>{t('ads.insights.avgTicketLabel')}</Label>
              <select
                value={formData.average_ticket}
                onChange={(e) => setFormData({ ...formData, average_ticket: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">{t('ads.insights.select')}</option>
                <option value="<50">{t('ads.insights.ticket.under50')}</option>
                <option value="50-100">50€ - 100€</option>
                <option value="100-250">100€ - 250€</option>
                <option value="250-500">250€ - 500€</option>
                <option value="500-1000">500€ - 1000€</option>
                <option value="1000+">{t('ads.insights.ticket.over1000')}</option>
              </select>
            </div>

            <div>
              <Label>{t('ads.insights.revenueLabel')}</Label>
              <select
                value={formData.monthly_revenue}
                onChange={(e) => setFormData({ ...formData, monthly_revenue: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">{t('ads.insights.select')}</option>
                <option value="<1000">{t('ads.insights.revenue.under1000')}</option>
                <option value="1000-2500">1.000€ - 2.500€</option>
                <option value="2500-5000">2.500€ - 5.000€</option>
                <option value="5000-10000">5.000€ - 10.000€</option>
                <option value="10000+">{t('ads.insights.revenue.over10000')}</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base">{t('ads.insights.ageLabel')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {[
                  '18-25', '25-35', '35-45', '45-55', '55-65', '65+'
                ].map(range => (
                  <label
                    key={range}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer ${
                      formData.ideal_age_ranges.includes(range)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.ideal_age_ranges.includes(range)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, ideal_age_ranges: [...formData.ideal_age_ranges, range] });
                        } else {
                          setFormData({ ...formData, ideal_age_ranges: formData.ideal_age_ranges.filter(r => r !== range) });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">{range}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>{t('ads.insights.genderLabel')}</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'hombres', label: t('ads.insights.gender.men') },
                  { id: 'mujeres', label: t('ads.insights.gender.women') },
                  { id: 'ambos', label: t('ads.insights.both') }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, ideal_gender: option.id })}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      formData.ideal_gender === option.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>{t('ads.insights.interestsLabel')}</Label>
              <p className="text-xs text-gray-500 mt-1">{t('ads.insights.interestsHint')}</p>
              <Input
                value={formData.ideal_interests.join(", ")}
                onChange={(e) => setFormData({ ...formData, ideal_interests: e.target.value.split(",").map(i => i.trim()).filter(Boolean) })}
                placeholder={t('ads.insights.interestsPlaceholder')}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base">{t('ads.insights.networksQuestion')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {[
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'facebook', label: 'Facebook' },
                  { id: 'tiktok', label: 'TikTok' },
                  { id: 'linkedin', label: 'LinkedIn' },
                  { id: 'youtube', label: 'YouTube' },
                  { id: 'google', label: 'Google' },
                  { id: 'whatsapp', label: 'WhatsApp' }
                ].map(network => (
                  <label
                    key={network.id}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer ${
                      formData.client_social_networks.includes(network.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.client_social_networks.includes(network.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, client_social_networks: [...formData.client_social_networks, network.id] });
                        } else {
                          setFormData({ ...formData, client_social_networks: formData.client_social_networks.filter(n => n !== network.id) });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">{network.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>{t('ads.insights.scopeLabel')}</Label>
              <select
                value={formData.geographic_scope}
                onChange={(e) => setFormData({ ...formData, geographic_scope: e.target.value })}
                className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">{t('ads.insights.select')}</option>
                <option value="local">{t('ads.insights.scope.local')}</option>
                <option value="provincial">{t('ads.insights.scope.provincial')}</option>
                <option value="regional">{t('ads.insights.scope.regional')}</option>
                <option value="nacional">{t('ads.insights.scope.national')}</option>
                <option value="online">{t('ads.insights.scope.online')}</option>
              </select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base">{t('ads.insights.channelsQuestion')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {[
                  { id: 'word_of_mouth', label: t('ads.insights.channel.wordOfMouth') },
                  { id: 'google', label: 'Google Search' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'facebook', label: 'Facebook' },
                  { id: 'tiktok', label: 'TikTok' },
                  { id: 'linkedin', label: 'LinkedIn' },
                  { id: 'misautonomos', label: 'MisAutónomos' },
                  { id: 'website', label: t('ads.insights.channel.website') },
                  { id: 'physical_store', label: t('ads.insights.channel.physicalStore') },
                  { id: 'other', label: t('ads.insights.channel.other') }
                ].map(channel => (
                  <label
                    key={channel.id}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer ${
                      formData.current_channels.includes(channel.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.current_channels.includes(channel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, current_channels: [...formData.current_channels, channel.id] });
                        } else {
                          setFormData({ ...formData, current_channels: formData.current_channels.filter(c => c !== channel.id) });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">{channel.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>{t('ads.insights.challengeLabel')}</Label>
              <Textarea
                value={formData.biggest_challenge}
                onChange={(e) => setFormData({ ...formData, biggest_challenge: e.target.value })}
                placeholder={t('ads.insights.challengePlaceholder')}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base">{t('ads.insights.goalQuestion')}</Label>
              <div className="space-y-2 mt-2">
                {[
                  { id: 'new_clients', label: t('ads.insights.goal.newClients') },
                  { id: 'loyalty', label: t('ads.insights.goal.loyalty') },
                  { id: 'increase_ticket', label: t('ads.insights.goal.increaseTicket') },
                  { id: 'expand_zone', label: t('ads.insights.goal.expandZone') },
                  { id: 'new_services', label: t('ads.insights.goal.newServices') }
                ].map(goal => (
                  <label
                    key={goal.id}
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer ${
                      formData.six_month_goal === goal.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="six_month_goal"
                      checked={formData.six_month_goal === goal.id}
                      onChange={() => setFormData({ ...formData, six_month_goal: goal.id })}
                      className="mt-1 w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">{goal.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>{t('ads.insights.differentiationLabel')}</Label>
              <p className="text-xs text-gray-500 mt-1">{t('ads.insights.differentiationHint')}</p>
              <Textarea
                value={formData.differentiation}
                onChange={(e) => setFormData({ ...formData, differentiation: e.target.value })}
                placeholder={t('ads.insights.differentiationPlaceholder')}
                rows={2}
                className="mt-2"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-medium text-gray-500">{t('ads.insights.stepOf', { step })}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className={`h-1 w-8 rounded-full transition-colors ${
                n <= step ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        {STEPS[step - 1].title}
      </h2>
      <p className="text-sm text-gray-500 mb-5">{STEPS[step - 1].subtitle}</p>

      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-5 border-t border-gray-100">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
          className="text-sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('ads.insights.back')}
        </Button>
        {step < 5 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium"
          >
            {t('common.next')}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            {saving ? t('ads.insights.saving') : t('ads.insights.finish')}
          </Button>
        )}
      </div>
    </div>
  );
}