import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Instagram, Facebook, Search, Upload, X, Check, ChevronLeft, Linkedin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Icono TikTok custom
function TikTokIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

export default function BriefingMensualPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [professionalProfile, setProfessionalProfile] = useState(null);
  const [insights, setInsights] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [existingBriefingId, setExistingBriefingId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    platform: "",
    goal: "",
    top_services: [],
    service_area: "",
    special_offer: "",
    images_provided: [],
    best_testimonials: "",
    additional_notes: ""
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      const [profiles, insightsData, existingBriefings] = await Promise.all([
        base44.entities.ProfessionalProfile.filter({ user_id: currentUser.id }),
        base44.entities.ClientInsights.filter({ professional_id: currentUser.id }),
        base44.entities.AdsBriefing.filter({ professional_id: currentUser.id, month_year: currentMonthYear })
      ]);
      
      const profile = profiles[0] || null;
      setProfessionalProfile(profile);

      if (insightsData.length > 0) {
        setInsights(insightsData[0]);
      }

      // Si ya existe un briefing este mes → modo edición
      if (existingBriefings.length > 0) {
        const b = existingBriefings[0];
        setExistingBriefingId(b.id);
        setIsEditMode(true);
        setFormData({
          platform: b.platform || "",
          goal: b.goal || "",
          top_services: b.top_services || [],
          service_area: b.service_area || "",
          special_offer: b.special_offer || "",
          images_provided: b.images_provided || [],
          best_testimonials: b.best_testimonials || "",
          additional_notes: b.additional_notes || ""
        });
      } else if (profile) {
        setFormData(prev => ({
          ...prev,
          service_area: profile.service_area || '',
          top_services: profile.services_offered?.map(s => s.name) || []
        }));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.platform || !formData.goal) {
      toast.error(t('ads.briefing.selectPlatformAndGoal'));
      return;
    }

    if (!user) {
      toast.error(t('ads.shared.noSessionError'));
      return;
    }
    
    setSaving(true);
    
    try {
      const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const professionalName = professionalProfile?.business_name || user?.full_name || user?.email;

      const briefingData = {
        professional_id: user.id,
        professional_name: professionalName,
        month_year: currentMonthYear,
        platform: formData.platform,
        goal: formData.goal,
        top_services: Array.isArray(formData.top_services) ? formData.top_services : [],
        service_area: formData.service_area || '',
        special_offer: formData.special_offer || '',
        images_provided: Array.isArray(formData.images_provided) ? formData.images_provided : [],
        best_testimonials: formData.best_testimonials || '',
        additional_notes: formData.additional_notes || '',
        included_budget_eur: 30,
        status: 'submitted',
        campaign_status: 'pending',
        submitted_at: new Date().toISOString()
      };

      if (isEditMode && existingBriefingId) {
        await base44.entities.AdsBriefing.update(existingBriefingId, briefingData);
      } else {
        await base44.entities.AdsBriefing.create(briefingData);
      }

      // Notificar al admin por email (correo interno al equipo, en español: no se traduce)
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'hola@misautonomos.es';
      const platformLabelsMap = {
        instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok',
        google_search: 'Google Search', linkedin: 'LinkedIn'
      };
      const goalLabelsMap = {
        more_calls: 'Más llamadas', more_leads: 'Más contactos por mensaje',
        more_quotes: 'Más solicitudes de presupuesto', brand_awareness: 'Notoriedad',
        website_traffic: 'Tráfico a mi perfil'
      };
      try {
        await base44.integrations.Core.SendEmail({
          to: 'hola@misautonomos.es',
          subject: `📋 Nuevo briefing Ads+ de ${professionalName}`,
          body: `
<h2>Nuevo briefing de campaña Ads+</h2>
<p><strong>Profesional:</strong> ${professionalName}</p>
<p><strong>Mes:</strong> ${currentMonthYear}</p>
<p><strong>Red:</strong> ${platformLabelsMap[formData.platform] || formData.platform}</p>
<p><strong>Objetivo:</strong> ${goalLabelsMap[formData.goal] || formData.goal}</p>
<p><strong>Zona:</strong> ${formData.service_area || '—'}</p>
<p><strong>Oferta especial:</strong> ${formData.special_offer || '—'}</p>
<p><strong>Servicios a destacar:</strong> ${formData.top_services.join(', ') || '—'}</p>
<p><strong>Testimonio:</strong> ${formData.best_testimonials || '—'}</p>
<p><strong>Notas:</strong> ${formData.additional_notes || '—'}</p>
<p><strong>Imágenes aportadas:</strong> ${formData.images_provided.length > 0 ? formData.images_provided.map(url => `<a href="${url}">${url}</a>`).join('<br>') : 'Ninguna'}</p>
<br><a href="https://misautonomos.es/admin">Ver en el panel de administración →</a>
          `
        });
      } catch (emailError) {
        console.warn('Email al admin falló, pero el briefing fue guardado:', emailError);
      }
      
      toast.success(isEditMode ? t('ads.briefing.updatedSuccess') : t('ads.briefing.submittedSuccess'));
      navigate("/mi-campana");
    } catch (error) {
      console.error("Error submitting briefing:", error);
      toast.error(t('ads.briefing.saveError', { message: error?.message || JSON.stringify(error) }));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('ads.briefing.imageTooLarge'));
      return;
    }

    setUploadingFiles(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        images_provided: [...prev.images_provided, file_url]
      }));
      toast.success(t('ads.briefing.photoAdded'));
    } catch (error) {
      toast.error(t('ads.briefing.uploadError'));
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = (index) => {
    setFormData(prev => {
      const newFiles = [...prev.images_provided];
      newFiles.splice(index, 1);
      return { ...prev, images_provided: newFiles };
    });
  };

  const toggleService = (serviceName) => {
    setFormData(prev => ({
      ...prev,
      top_services: prev.top_services.includes(serviceName)
        ? prev.top_services.filter(s => s !== serviceName)
        : [...prev.top_services, serviceName]
    }));
  };

  // Los nombres de las redes son marcas: van literales.
  const platforms = [
    { id: 'instagram', label: 'Instagram', icon: Instagram, hint: t('ads.briefing.platforms.instagramHint'), color: 'from-pink-600 to-purple-600' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, hint: t('ads.briefing.platforms.facebookHint'), color: 'from-blue-600 to-blue-800' },
    { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, hint: t('ads.briefing.platforms.tiktokHint'), color: 'from-gray-800 to-black' },
    { id: 'google_search', label: 'Google', icon: Search, hint: t('ads.briefing.platforms.googleHint'), color: 'from-green-600 to-blue-600' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, hint: t('ads.briefing.platforms.linkedinHint'), color: 'from-blue-700 to-blue-900' }
  ];

  // Función de recomendación basada en ClientInsights
  const recommendPlatform = (insights) => {
    if (!insights) return null;
    const { client_type, client_age_range, preferred_platforms, service_area_type } = insights;
    
    // Si cliente es empresa → LinkedIn prioritario
    if (client_type === 'company') {
      return { platform: 'linkedin', reason: t('ads.briefing.recommendation.company') };
    }
    
    // Si cliente joven (18-30) → TikTok o Instagram
    const ages = client_age_range || [];
    if (ages.includes('18-25') && !ages.includes('45-55')) {
      return { platform: 'tiktok', reason: t('ads.briefing.recommendation.young') };
    }
    
    // Si ámbito local + intención compra → Google
    if (service_area_type === 'local_city' && client_type === 'particular') {
      return { platform: 'google_search', reason: t('ads.briefing.recommendation.local') };
    }
    
    // Si ya lo usa habitualmente y tiene presencia → potenciar esa red
    if (preferred_platforms?.includes('instagram')) {
      return { platform: 'instagram', reason: t('ads.briefing.recommendation.instagram') };
    }
    
    // Default para particulares adultos
    return { platform: 'facebook', reason: t('ads.briefing.recommendation.default') };
  };

  const recommendedPlatform = recommendPlatform(insights);
  const platformLabels = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    google_search: 'Google Search',
    linkedin: 'LinkedIn'
  };

  const goals = [
    { id: 'more_calls', label: t('ads.briefing.goal.moreCalls'), desc: t('ads.briefing.goal.moreCallsDesc') },
    { id: 'more_leads', label: t('ads.briefing.goal.moreLeads'), desc: t('ads.briefing.goal.moreLeadsDesc') },
    { id: 'more_quotes', label: t('ads.briefing.goal.moreQuotes'), desc: t('ads.briefing.goal.moreQuotesDesc') },
    { id: 'brand_awareness', label: t('ads.briefing.goal.brandAwareness'), desc: t('ads.briefing.goal.brandAwarenessDesc') },
    { id: 'website_traffic', label: t('ads.briefing.goal.websiteTraffic'), desc: t('ads.briefing.goal.websiteTrafficDesc') }
  ];

  const currentMonthLabel = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/mi-campana")}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('ads.briefing.backToCampaign')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? t('ads.briefing.editTitle') : t('ads.briefing.createTitle')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode ? t('ads.briefing.editSubtitle') : t('ads.briefing.createSubtitle')}
          </p>
          {isEditMode && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <Trans
                i18nKey="ads.briefing.editingNotice"
                values={{ month: currentMonthLabel }}
                components={{ strong: <strong /> }}
              />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Recomendación automática */}
          {recommendedPlatform && !formData.platform && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
              <div className="text-xs text-amber-900">
                <Trans
                  i18nKey="ads.briefing.recommendation.text"
                  values={{ platform: platformLabels[recommendedPlatform.platform], reason: recommendedPlatform.reason }}
                  components={{ strong: <strong /> }}
                />
              </div>
            </div>
          )}

          {/* 1. Elegir red */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t('ads.briefing.platformQuestion')}
              </CardTitle>
              <p className="text-xs text-gray-500">
                {t('ads.briefing.platformHint')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {platforms.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, platform: p.id })}
                    className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl transition-colors ${
                      formData.platform === p.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${p.color}`}>
                      <p.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{p.label}</span>
                    <span className="text-[10px] text-gray-500 text-center leading-tight">{p.hint}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Objetivo */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t('ads.briefing.goalQuestion')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {goals.map(g => (
                  <label
                    key={g.id}
                    className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.goal === g.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={g.id}
                      checked={formData.goal === g.id}
                      onChange={e => setFormData({ ...formData, goal: e.target.value })}
                      className="mt-1 w-4 h-4 text-gray-900"
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{g.label}</p>
                      <p className="text-xs text-gray-500">{g.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3. Servicios a destacar */}
          {professionalProfile?.services_offered?.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  {t('ads.briefing.servicesQuestion')}
                </CardTitle>
                <p className="text-xs text-gray-500">
                  {t('ads.briefing.servicesHint')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                {professionalProfile.services_offered.map(service => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.name)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      formData.top_services.includes(service.name)
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {service.name}
                  </button>
                ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. Zona geográfica */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t('ads.briefing.areaTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="text"
                value={formData.service_area}
                onChange={e => setFormData({ ...formData, service_area: e.target.value })}
                placeholder={t('ads.briefing.areaPlaceholder')}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* 5. Oferta especial */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t('ads.briefing.offerQuestion')}
              </CardTitle>
              <p className="text-xs text-gray-500">
                {t('ads.briefing.offerHint')}
              </p>
            </CardHeader>
            <CardContent>
              <Input
                type="text"
                value={formData.special_offer}
                onChange={e => setFormData({ ...formData, special_offer: e.target.value })}
                placeholder={t('ads.briefing.offerPlaceholder')}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* 6. Material adicional */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t('ads.briefing.mediaQuestion')}
              </CardTitle>
              <p className="text-xs text-gray-500">
                {t('ads.briefing.mediaHint')}
              </p>
            </CardHeader>
            <CardContent>
              {formData.images_provided.length < 5 && (
                <label className="cursor-pointer block mb-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFiles}
                    />
                    {uploadingFiles ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {t('ads.briefing.addMedia', { current: formData.images_provided.length })}
                        </p>
                      </>
                    )}
                  </div>
                </label>
              )}

              {formData.images_provided.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {formData.images_provided.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={t('ads.briefing.mediaAlt', { number: idx + 1 })}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 7. Testimonios */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t('ads.briefing.testimonialQuestion')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.best_testimonials}
                onChange={e => setFormData({ ...formData, best_testimonials: e.target.value })}
                placeholder={t('ads.briefing.testimonialPlaceholder')}
                rows={3}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Presupuesto explícito */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-900">{t('ads.briefing.budgetTitle')}</span>
              <span className="text-lg font-bold text-blue-900">30,00 €</span>
            </div>
            <p className="text-xs text-blue-700">
              {t('ads.briefing.budgetHint')}
            </p>
          </div>

          {/* Notas adicionales */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t('ads.briefing.notesTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.additional_notes}
                onChange={e => setFormData({ ...formData, additional_notes: e.target.value })}
                placeholder={t('ads.briefing.notesPlaceholder')}
                rows={2}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={saving || !formData.platform || !formData.goal}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 text-base"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                {isEditMode ? t('ads.briefing.updating') : t('ads.shared.sending')}
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                {isEditMode ? t('ads.briefing.updateButton') : t('ads.briefing.submitButton')}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
