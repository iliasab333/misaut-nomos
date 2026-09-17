import React, { useState, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import i18n from '@/i18n';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { SkeletonBlock, SkeletonList } from "@/components/ListStates";
import { toast } from "@/lib/toast";
import {
  IconSpinner,
  IconChevronRight,
  IconChevronLeft,
  IconCheckCircle,
  IconUpload,
  IconClose,
  IconInstagram,
  IconFacebook,
  IconGlobe,
  IconMusic,
  IconCheck,
  IconLightbulb,
} from "@/components/Icons";
import { PROVINCIAS, CIUDADES_POR_PROVINCIA } from "../components/utils/locationsData";
import OnboardingTooltip from "../components/onboarding/OnboardingTooltip";
import OnboardingChecklist from "../components/onboarding/OnboardingChecklist";
import OnboardingTutorial from "../components/onboarding/OnboardingTutorial";
import ProfilePreview from "../components/onboarding/ProfilePreview";
import { pickPhoto, isNative, hapticSuccess, haptic, kv } from "@/lib/native";

// Categorías se cargan dinámicamente desde BD

export default function ProfileOnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    // Paso 1: Identidad
    business_name: "",
    cif_nif: "",
    email_contacto: "",
    telefono_contacto: "",
    metodos_contacto: ["chat_interno"],

    // Paso 2: Actividad
    categories: [],
    activity_other: "",
    descripcion_corta: "",
    years_experience: "",

    // Paso 3: Ubicación + Precios + Portfolio + Redes
    provincia: "",
    ciudad: "",
    tarifa_base: "",
    facturacion: "autonomo",
    formas_pago: [],
    photos: [],
    social_links: {
      facebook: "",
      instagram: "",
      linkedin: "",
      tiktok: ""
    },
    website: "",

    // Consentimientos
    acepta_terminos: false,
    acepta_politica_privacidad: false,
    consiente_contacto_clientes: false
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showTutorial, setShowTutorial] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const cats = await base44.entities.ServiceCategory.list();
      return cats
        .filter(c => c.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    },
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    loadUser();
  }, []);

  // Autosave del formulario con debounce de 800 ms.
  // Web: localStorage. iOS/Android: @capacitor/preferences (persiste en el
  // contenedor de la app, no lo purga WKWebView).
  useEffect(() => {
    if (loading || !user?.id) return;
    const key = `mn:profile-onboarding:v1:${user.id}`;
    const timer = setTimeout(() => {
      const snapshot = { formData, currentStep, savedAt: Date.now() };
      kv.set(key, JSON.stringify(snapshot));
    }, 800);
    return () => clearTimeout(timer);
  }, [formData, currentStep, loading, user?.id]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Admin: nunca debe quedarse atrapado en el alta de profesional.
      if (currentUser?.role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }
      // Modelo freemium: cualquier usuario logueado (incluido un cliente que
      // pulsa "Hazte autónomo / plan 0€") puede iniciar el alta de profesional.
      // Convertimos el user_type a 'professionnel' al entrar para que el resto
      // de la app (Layout, guards, caché) lo trate como pro sin redirecciones
      // raras al cuestionario.
      const userType = currentUser?.user_type;
      const isPro = userType === 'professionnel' || userType === 'profesional' || userType === 'professional';
      if (!isPro && currentUser) {
        try {
          await base44.auth.updateMe({ user_type: 'professionnel' });
          currentUser.user_type = 'professionnel';
          sessionStorage.removeItem('current_user');
          setUser(currentUser);
        } catch (e) {
          console.warn('No se pudo marcar user_type=professionnel al entrar al onboarding:', e);
        }
      }

      const profiles = await base44.entities.ProfessionalProfile.filter({
        user_id: currentUser.id
      });

      if (profiles.length > 0 && profiles[0].onboarding_completed) {
        navigate(createPageUrl("MyProfile"), { replace: true });
        return;
      }

      if (profiles.length > 0) {
        setFormData({
          business_name: profiles[0].business_name || "",
          cif_nif: profiles[0].cif_nif || "",
          email_contacto: profiles[0].email_contacto || currentUser.email,
          telefono_contacto: profiles[0].telefono_contacto || currentUser.phone || "",
          metodos_contacto: profiles[0].metodos_contacto || ["chat_interno"],
          categories: profiles[0].categories || [],
          activity_other: profiles[0].activity_other || "",
          descripcion_corta: profiles[0].descripcion_corta || "",
          years_experience: profiles[0].years_experience || "",
          provincia: profiles[0].provincia || "",
          ciudad: profiles[0].ciudad || "",
          tarifa_base: profiles[0].tarifa_base || "",
          facturacion: profiles[0].facturacion || "autonomo",
          formas_pago: profiles[0].formas_pago || [],
          photos: profiles[0].photos || [],
          social_links: profiles[0].social_links || {
            facebook: "",
            instagram: "",
            linkedin: "",
            tiktok: ""
          },
          website: profiles[0].website || "",
          acepta_terminos: profiles[0].acepta_terminos || false,
          acepta_politica_privacidad: profiles[0].acepta_politica_privacidad || false,
          consiente_contacto_clientes: profiles[0].consiente_contacto_clientes || false
        });
      } else {
        // No hay perfil en BD todavía. Si hay borrador guardado (web: localStorage,
        // nativo: @capacitor/preferences) lo restauramos para que un usuario que se
        // fue a WhatsApp o cerró la app recupere lo escrito.
        let restored = null;
        try {
          const key = `mn:profile-onboarding:v1:${currentUser.id}`;
          const raw = await kv.get(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.formData) restored = parsed;
          }
        } catch (_e) { /* modo privado / cuota llena */ }

        if (restored) {
          setFormData(prev => ({ ...prev, ...restored.formData }));
          if (Number.isFinite(restored.currentStep) && restored.currentStep >= 1 && restored.currentStep <= 3) {
            setCurrentStep(restored.currentStep);
          }
          toast.success(t('onboarding.toasts.draftRestored'), { duration: 3500 });
        } else {
          setFormData(prev => ({
            ...prev,
            email_contacto: currentUser.email,
            telefono_contacto: currentUser.phone || ""
          }));
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin();
    }
  };

  const validateStep1 = () => {
    const errors = {};
    
    if (!formData.business_name || formData.business_name.trim().length < 2) {
      errors.business_name = t('onboarding.validation.nameMinLength');
    }

    // NIF/CIF ya no se pide en el onboarding: se pide en /mi-perfil
    // (sección Facturación) o antes de emitir la primera factura.
    // Si el usuario ya lo tenía guardado se conserva; si no, se omite.

    if (!formData.email_contacto || !formData.email_contacto.includes("@")) {
      errors.email_contacto = t('onboarding.validation.emailInvalid');
    }

    if (!formData.telefono_contacto || formData.telefono_contacto.replace(/\D/g, '').length < 9) {
      errors.telefono_contacto = t('onboarding.validation.phoneMinDigits');
    }

    if (formData.metodos_contacto.length === 0) {
      errors.metodos_contacto = t('onboarding.validation.contactMethodRequired');
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error(errors[firstErrorField]);
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const errors = {};
    
    if (formData.categories.length === 0) {
      errors.categories = t('onboarding.validation.categoryRequired');
    }

    if (formData.categories.includes("Otro tipo de servicio profesional") && !formData.activity_other) {
      errors.activity_other = t('onboarding.validation.otherServiceRequired');
    }

    if (!formData.descripcion_corta || formData.descripcion_corta.trim().length < 20) {
      errors.descripcion_corta = t('onboarding.validation.descriptionMinLength');
    }

    if (!formData.years_experience || formData.years_experience === "" || parseInt(formData.years_experience) < 0) {
      errors.years_experience = t('onboarding.validation.yearsRequired');
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error(errors[firstErrorField]);
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    const errors = {};
    
    if (!formData.provincia) {
      errors.provincia = t('onboarding.validation.provinceRequired');
    }

    if (!formData.ciudad) {
      errors.ciudad = t('onboarding.validation.cityRequired');
    }

    if (formData.formas_pago.length === 0) {
      errors.formas_pago = t('onboarding.validation.paymentRequired');
    }

    // Las fotos ya no bloquean la publicación: se mantiene el CTA para subirlas
    // como recomendación en el paso 3, y en el perfil publicado se muestra un
    // banner "Añade una foto y multiplica x3 tus contactos".

    if (!formData.acepta_terminos) {
      errors.acepta_terminos = t('onboarding.validation.termsRequired');
    }

    if (!formData.acepta_politica_privacidad) {
      errors.acepta_politica_privacidad = t('onboarding.validation.privacyRequired');
    }

    if (!formData.consiente_contacto_clientes) {
      errors.consiente_contacto_clientes = t('onboarding.validation.contactConsentRequired');
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error(errors[firstErrorField]);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;

    haptic('light');
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    haptic('light');
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setSaving(true);

    try {
      const service_area = formData.ciudad 
        ? `${formData.ciudad}, ${formData.provincia}`
        : formData.provincia;

      const existingProfiles = await base44.entities.ProfessionalProfile.filter({
        user_id: user.id
      });

      const existingProfile = existingProfiles[0];

      // Con el modelo freemium el perfil es visible directamente al completar el onboarding
      const shouldBeVisible = true;
      const hasActiveSubscription = true;

      const profileData = {
        user_id: user.id,
        business_name: formData.business_name,
        cif_nif: formData.cif_nif,
        email_contacto: formData.email_contacto,
        telefono_contacto: formData.telefono_contacto,
        metodos_contacto: formData.metodos_contacto,
        categories: formData.categories,
        activity_other: formData.activity_other,
        descripcion_corta: formData.descripcion_corta,
        description: formData.descripcion_corta,
        years_experience: parseInt(formData.years_experience) || 0,
        provincia: formData.provincia,
        ciudad: formData.ciudad || "",
        municipio: "",
        service_area: service_area,
        radio_servicio_km: 25,
        disponibilidad_tipo: "ambos",
        horario_apertura: "09:00",
        horario_cierre: "18:00",
        tarifa_base: formData.tarifa_base ? parseFloat(formData.tarifa_base) : 0,
        facturacion: formData.facturacion,
        formas_pago: formData.formas_pago,
        photos: formData.photos,
        social_links: formData.social_links,
        website: formData.website,
        imagen_principal: user.profile_picture || formData.photos[0] || "",
        price_range: "€€",
        average_rating: 0,
        total_reviews: 0,
        estado_perfil: "activo",
        visible_en_busqueda: true,
        fecha_publicacion: new Date().toISOString(),
        onboarding_completed: true,
        acepta_terminos: formData.acepta_terminos,
        acepta_politica_privacidad: formData.acepta_politica_privacidad,
        consiente_contacto_clientes: formData.consiente_contacto_clientes,
        slug_publico: formData.business_name.toLowerCase().replace(/\s+/g, '-'),
        certifications: [],
        // Capturar código de referido desde localStorage si existe y no ha expirado
        referred_by_code: (() => {
          try {
            const code = localStorage.getItem('referral_code');
            const expires = parseInt(localStorage.getItem('referral_expires') || '0');
            return (code && Date.now() < expires) ? code : '';
          } catch { return ''; }
        })(),
      };

      let savedProfile;
      if (existingProfile) {
        savedProfile = await base44.entities.ProfessionalProfile.update(existingProfile.id, profileData);
      } else {
        savedProfile = await base44.entities.ProfessionalProfile.create(profileData);
      }

      // ✅ SIEMPRE actualizar user_type a professionnel al completar onboarding
      await base44.auth.updateMe({
        user_type: "professionnel",
        full_name: formData.business_name
      });

      // ✅ Si el alta proviene de un outreach (URL ?ref=outreach&lead=...),
      // marcamos el lead como convertido para atribución del motor de oferta.
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const leadId = urlParams.get('lead');
        const ref = urlParams.get('ref');
        if (leadId && (ref === 'outreach' || ref === 'email' || ref === 'whatsapp')) {
          fetch('/api/lead-convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: leadId,
              user_id: user.id,
              profile_id: savedProfile?.id,
            }),
            keepalive: true,
          }).catch(() => {});
        }
      } catch (_e) { /* noop */ }

      // El perfil ya se crea activo y visible directamente (modelo freemium)

      // ✅ Limpiar cache para que el Layout detecte los cambios inmediatamente
      sessionStorage.removeItem('current_user');

      // ✅ Procesar código de referido si existe en localStorage
      try {
        const referralCode = localStorage.getItem('referral_code');
        const referralExpires = parseInt(localStorage.getItem('referral_expires') || '0');
        if (referralCode && Date.now() < referralExpires) {
          const result = await base44.functions.invoke('applyReferral', { referral_code: referralCode });
          if (result.data?.ok) {
            localStorage.removeItem('referral_code');
            localStorage.removeItem('referral_referrer_name');
            localStorage.removeItem('referral_expires');
            toast.success(t('onboarding.toasts.referralBonus'));
          }
        }
      } catch (refErr) {
        console.log('Referral apply failed (non-critical):', refErr);
      }

      // ✅ Generar código de referido para el nuevo profesional
      try {
        await base44.functions.invoke('generateReferralCode', {});
      } catch (codeErr) {
        console.log('Referral code generation failed (non-critical):', codeErr);
      }

      // ✅ Auto-suscribir a newsletter (fire-and-forget, idempotente)
      import('@/lib/newsletterAutoSubscribe').then(({ autoSubscribeToNewsletter }) => {
        autoSubscribeToNewsletter({
          email: user.email,
          name: formData.business_name || user.full_name || '',
          userTypeInterest: 'autonomo',
          source: 'auto_signup_professional',
          extraTags: ['professional']
        });
      }).catch(() => {});
      // Notificar admin nuevo profesional
      import('@/lib/notifyAdmin').then(({ notifyAdminEvent }) => {
        notifyAdminEvent({
          event: 'new_professional',
          title: '🛠️ Nuevo profesional registrado',
          body: `<strong>${formData.business_name}</strong> ha completado su perfil. Categorías: ${(formData.categories || []).join(', ')} · Ciudad: ${formData.ciudad || 'no indicada'}.`,
          data: {
            email: user.email,
            business_name: formData.business_name,
            categories: formData.categories,
            ciudad: formData.ciudad,
            user_id: user.id
          },
          userEmail: user.email
        });
      }).catch(() => {});

      toast.success(t('onboarding.toasts.published'), { duration: 5000 });
      hapticSuccess();
      // Autosave: limpiar el borrador porque ya está publicado en BD.
      kv.remove(`mn:profile-onboarding:v1:${user.id}`);
      setTimeout(() => {
        // Flujo: /registro → /completar-perfil → /dashboard.
        // Antes acababa en /precios: el perfil se publicaba y acto seguido se
        // le enseñaba una tabla de planes. Ya no hay planes — el perfil es
        // gratis y visible desde el primer minuto, como en khdemlidaba — así
        // que el sitio natural al terminar es su propio panel.
        navigate(createPageUrl("ProfessionalDashboard"));
      }, 1500);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(t('onboarding.toasts.saveError', { message: error.message }));
      setSaving(false);
    }
  };

  // Auto-suscripción a newsletter tras registro
  const autoSubscribeNewsletter = async (userData) => {
    try {
      const { NewsletterSubscriber } = await import('@/api/entities');
      const email = userData.email.toLowerCase().trim();
      
      // Comprobar si ya está suscrito
      const existing = await NewsletterSubscriber.filter({ email }).limit(1);
      
      if (existing.length > 0) {
        // Si estaba dado de baja, reactivar
        if (existing[0].status === 'unsubscribed') {
          await NewsletterSubscriber.update(existing[0].id, {
            status: 'confirmed',
            unsubscribed_at: null,
            confirmed_at: new Date().toISOString(),
            source: 'auto_signup',
            name: userData.name || existing[0].name
          });
        }
        return;
      }
      
      // Crear suscripción automática
      const unsubToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await NewsletterSubscriber.create({
        email: email,
        name: userData.name || '',
        status: 'confirmed',
        language: i18n.language?.split('-')[0] || 'es',
        source: 'auto_signup',
        user_type_interest: userData.user_type === 'professionnel' ? 'autonomo' : userData.user_type === 'client' ? 'cliente' : 'ambos',
        confirmation_token: Math.random().toString(36).substring(2),
        unsubscribe_token: unsubToken,
        confirmed_at: new Date().toISOString(),
        tags: ['auto_signup']
      });
    } catch (err) {
      console.error('Auto newsletter subscribe failed:', err);
    }
  };

  // Convierte un dataURL (base64) a File para reaprovechar UploadFile.
  const dataUrlToFile = (dataUrl, format = 'image/jpeg', name = 'foto.jpg') => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || format;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new File([u8], name, { type: mime });
  };

  const uploadFileToBackend = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('proProfile.picture.tooLarge'));
      return null;
    }
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  // Web: callback del <input type="file">.
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadFileToBackend(file);
      if (!url) return;
      setFormData({ ...formData, photos: [...formData.photos, url] });
      toast.success(t('onboarding.toasts.photoAdded'));
      hapticSuccess();
    } catch (error) {
      toast.error(t('onboarding.toasts.photoUploadError'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Nativo: abre la action sheet "Cámara / Galería / Cancelar" de iOS.
  const handlePhotoUploadNative = async () => {
    const result = await pickPhoto({ source: 'prompt' });
    if (!result?.dataUrl) return;
    setUploadingPhoto(true);
    try {
      const file = dataUrlToFile(result.dataUrl, result.format || 'image/jpeg', `foto-${Date.now()}.${(result.format || 'jpeg').replace('image/', '')}`);
      const url = await uploadFileToBackend(file);
      if (!url) return;
      setFormData({ ...formData, photos: [...formData.photos, url] });
      toast.success(t('onboarding.toasts.photoAdded'));
      hapticSuccess();
    } catch (error) {
      toast.error(t('onboarding.toasts.photoUploadError'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...formData.photos];
    newPhotos.splice(index, 1);
    setFormData({ ...formData, photos: newPhotos });
  };

  const toggleCategory = (category) => {
    setFormData({ ...formData, categories: [category] });
  };

  const toggleFormaPago = (forma) => {
    const formas = formData.formas_pago;
    if (formas.includes(forma)) {
      setFormData({
        ...formData,
        formas_pago: formas.filter(f => f !== forma)
      });
    } else {
      setFormData({
        ...formData,
        formas_pago: [...formas, forma]
      });
    }
  };

  const toggleMetodoContacto = (metodo) => {
    if (metodo === 'chat_interno') return;
    
    const metodos = formData.metodos_contacto;
    if (metodos.includes(metodo)) {
      setFormData({
        ...formData,
        metodos_contacto: metodos.filter(m => m !== metodo)
      });
    } else {
      setFormData({
        ...formData,
        metodos_contacto: [...metodos, metodo]
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonBlock lines={2} />
          <SkeletonList count={3} avatar={false} />
        </div>
      </div>
    );
  }

  const progress = (currentStep / 3) * 100;

  // Mapa explícito valor BD → etiqueta traducida (el valor guardado no cambia).
  const paymentLabels = {
    Tarjeta: t('card'),
    Transferencia: t('bankTransfer'),
    Efectivo: t('cash'),
    Bizum: t('onboarding.location.bizum'),
  };

  return (
    <>
      <OnboardingTutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          
          {/* Tutorial Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="btn-secondary border-2 border-blue-200 hover:bg-blue-50 gap-2"
            >
              <IconLightbulb className="w-4 h-4 text-star" />
              {t('onboarding.header.howItWorks')}
            </button>
          </div>

          {/* Checklist del paso actual */}
          <OnboardingChecklist currentStep={currentStep} formData={formData} />

          {/* Preview del perfil en vivo */}
          {currentStep >= 2 && <ProfilePreview formData={formData} currentUser={user} />}

          <div className="card shadow-xl border-0 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 pb-8">
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold mb-2">{t('onboarding.success.stepCompleteProfile')}</h1>
              <p className="text-blue-100">{t('onboarding.progress.step', { current: currentStep, total: 3 })}</p>
            </div>
            <div className="w-full bg-blue-400/30 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="p-6 md:p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-ink mb-2">{t('professionalIdentity')}</h2>
                  <p className="text-sm text-c-muted">{t('onboarding.identity.subtitle')}</p>
                </div>

                <div id="business_name">
                  <OnboardingTooltip content={t('onboarding.identity.nameTooltip')}>
                    <label className="label" htmlFor="po-business-name">{t('professionalNameRequired')}</label>
                  </OnboardingTooltip>
                  <p className="text-xs text-c-muted mb-2">{t('onboarding.identity.nameHint')}</p>
                  <input
                    id="po-business-name"
                    value={formData.business_name}
                    onChange={(e) => {
                      setFormData({ ...formData, business_name: e.target.value });
                      setFieldErrors({ ...fieldErrors, business_name: null });
                    }}
                    placeholder={t('onboarding.identity.namePlaceholder')}
                    autoCapitalize="words"
                    autoComplete="organization"
                    enterKeyHint="next"
                    className={`input ${fieldErrors.business_name ? 'input-error' : formData.business_name.length >= 2 ? 'border-success' : ''}`}
                  />
                  {fieldErrors.business_name && (
                    <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.business_name}</p>
                  )}
                  {!fieldErrors.business_name && formData.business_name.length > 0 && formData.business_name.length < 2 && (
                    <p className="text-xs text-error mt-1">{t('onboarding.validation.minTwoChars')}</p>
                  )}
                  {formData.business_name.length >= 2 && (
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <IconCheck className="w-3 h-3" /> {t('onboarding.validation.correct')}
                    </p>
                  )}
                </div>

                <div id="email_contacto">
                  <label className="label" htmlFor="po-email-contacto">{t('onboarding.identity.emailLabel')}</label>
                  <input
                    id="po-email-contacto"
                    type="email"
                    value={formData.email_contacto}
                    onChange={(e) => {
                      setFormData({ ...formData, email_contacto: e.target.value });
                      setFieldErrors({ ...fieldErrors, email_contacto: null });
                    }}
                    placeholder={t('auth.email_placeholder')}
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="next"
                    className={`input ${fieldErrors.email_contacto ? 'input-error' : formData.email_contacto.includes('@') && formData.email_contacto.includes('.') ? 'border-success' : ''}`}
                  />
                  {fieldErrors.email_contacto && (
                    <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.email_contacto}</p>
                  )}
                  {!fieldErrors.email_contacto && formData.email_contacto.length > 0 && !formData.email_contacto.includes('@') && (
                    <p className="text-xs text-error mt-1">{t('onboarding.validation.invalidEmail')}</p>
                  )}
                  {formData.email_contacto.includes('@') && formData.email_contacto.includes('.') && (
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <IconCheck className="w-3 h-3" /> {t('onboarding.validation.correct')}
                    </p>
                  )}
                </div>

                <div id="telefono_contacto">
                  <label className="label" htmlFor="po-telefono-contacto">{t('onboarding.identity.phoneLabel')}</label>
                  <input
                    id="po-telefono-contacto"
                    type="tel"
                    value={formData.telefono_contacto}
                    onChange={(e) => {
                      setFormData({ ...formData, telefono_contacto: e.target.value });
                      setFieldErrors({ ...fieldErrors, telefono_contacto: null });
                    }}
                    placeholder="+34 612 345 678"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="next"
                    className={`input ${fieldErrors.telefono_contacto ? 'input-error' : formData.telefono_contacto.replace(/\D/g, '').length >= 9 ? 'border-success' : ''}`}
                  />
                  {fieldErrors.telefono_contacto && (
                    <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.telefono_contacto}</p>
                  )}
                  {!fieldErrors.telefono_contacto && formData.telefono_contacto.length > 0 && formData.telefono_contacto.replace(/\D/g, '').length < 9 && (
                    <p className="text-xs text-error mt-1">{t('onboarding.validation.minNineDigits')}</p>
                  )}
                  {formData.telefono_contacto.replace(/\D/g, '').length >= 9 && (
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <IconCheck className="w-3 h-3" /> {t('onboarding.validation.correct')}
                    </p>
                  )}
                </div>

                <div>
                  <OnboardingTooltip content={t('onboarding.identity.contactTooltip')}>
                    <label className="label mb-3 block">{t('visibleContactMethods')}</label>
                  </OnboardingTooltip>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-soft rounded-lg border border-c-border">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="checkbox pointer-events-none"
                        onChange={() => {}}
                      />
                      <span className="text-sm font-medium text-ink">{t('onboarding.identity.directChatAlwaysOn')}</span>
                    </div>

                    <div 
                      className="flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-blue-50"
                      onClick={() => toggleMetodoContacto('telefono')}
                      style={{
                        borderColor: formData.metodos_contacto.includes('telefono') ? '#3B82F6' : '#E5E7EB',
                        backgroundColor: formData.metodos_contacto.includes('telefono') ? '#EFF6FF' : 'white'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.metodos_contacto.includes('telefono')}
                        onChange={() => {}}
                        className="checkbox pointer-events-none"
                      />
                      <span className="text-sm font-medium text-ink">{t('phoneLabel')}</span>
                    </div>

                    <div 
                      className="flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-blue-50"
                      onClick={() => toggleMetodoContacto('whatsapp')}
                      style={{
                        borderColor: formData.metodos_contacto.includes('whatsapp') ? '#3B82F6' : '#E5E7EB',
                        backgroundColor: formData.metodos_contacto.includes('whatsapp') ? '#EFF6FF' : 'white'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.metodos_contacto.includes('whatsapp')}
                        onChange={() => {}}
                        className="checkbox pointer-events-none"
                      />
                      <span className="text-sm font-medium text-ink">{t('profile_page.whatsapp')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-ink mb-2">{t('onboarding.activity.title')}</h2>
                  <p className="text-sm text-c-muted">{t('onboarding.activity.subtitle')}</p>
                </div>

                <div id="categories">
                  <OnboardingTooltip content={t('onboarding.activity.categoryTooltip')}>
                    <label className="label mb-3 block">{t('onboarding.activity.categoryLabel')}</label>
                  </OnboardingTooltip>
                  {fieldErrors.categories && (
                    <p className="text-sm text-error mb-2 font-semibold">{fieldErrors.categories}</p>
                  )}
                  {categories.length === 0 ? (
                    <div className="text-center py-4">
                      <IconSpinner className="w-6 h-6 animate-spin mx-auto text-c-accent" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          onClick={() => toggleCategory(cat.name)}
                          className="flex items-center gap-3 p-4 border-2 rounded-lg transition-all cursor-pointer hover:bg-blue-50"
                          style={{
                            borderColor: formData.categories.includes(cat.name) ? '#3B82F6' : '#E5E7EB',
                            backgroundColor: formData.categories.includes(cat.name) ? '#EFF6FF' : 'white'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.categories.includes(cat.name)}
                            onChange={() => {}}
                            className="checkbox pointer-events-none flex-shrink-0"
                          />
                          <span className="text-sm font-medium text-ink flex-1">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formData.categories.includes("Otro tipo de servicio profesional") && (
                  <div id="activity_other">
                    <label className="label" htmlFor="po-activity-other">{t('onboarding.activity.otherServiceLabel')}</label>
                    <input
                      id="po-activity-other"
                      value={formData.activity_other}
                      onChange={(e) => {
                        setFormData({ ...formData, activity_other: e.target.value });
                        setFieldErrors({ ...fieldErrors, activity_other: null });
                      }}
                      placeholder={t('onboarding.activity.otherServicePlaceholder')}
                      autoCapitalize="sentences"
                      enterKeyHint="next"
                      className={`input ${fieldErrors.activity_other ? 'input-error' : ''}`}
                    />
                    {fieldErrors.activity_other && (
                      <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.activity_other}</p>
                    )}
                  </div>
                )}

                <div id="years_experience">
                  <label className="label" htmlFor="po-years-experience">{t('onboarding.activity.yearsLabel')}</label>
                  <input
                    id="po-years-experience"
                    type="number"
                    value={formData.years_experience}
                    onChange={(e) => {
                      setFormData({ ...formData, years_experience: e.target.value });
                      setFieldErrors({ ...fieldErrors, years_experience: null });
                    }}
                    placeholder="5"
                    min="0"
                    max="50"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    enterKeyHint="next"
                    className={`input ${fieldErrors.years_experience ? 'input-error' : formData.years_experience !== '' && parseInt(formData.years_experience) >= 0 ? 'border-success' : ''}`}
                  />
                  {fieldErrors.years_experience && (
                    <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.years_experience}</p>
                  )}
                  {!fieldErrors.years_experience && formData.years_experience === '' && (
                    <p className="text-xs text-error mt-1">{t('onboarding.validation.required')}</p>
                  )}
                  {formData.years_experience !== '' && parseInt(formData.years_experience) >= 0 && (
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <IconCheck className="w-3 h-3" /> {t('onboarding.validation.correct')}
                    </p>
                  )}
                </div>

                <div id="descripcion_corta">
                  <OnboardingTooltip content={t('onboarding.activity.descriptionTooltip')}>
                    <label className="label" htmlFor="po-descripcion-corta">{t('onboarding.activity.descriptionLabel')}</label>
                  </OnboardingTooltip>
                  <p className="text-xs text-c-muted mb-2">{t('onboarding.activity.descriptionHint')}</p>
                  <textarea
                    id="po-descripcion-corta"
                    value={formData.descripcion_corta}
                    onChange={(e) => {
                      setFormData({ ...formData, descripcion_corta: e.target.value });
                      setFieldErrors({ ...fieldErrors, descripcion_corta: null });
                    }}
                    placeholder={t('onboarding.activity.descriptionPlaceholder')}
                    autoCapitalize="sentences"
                    enterKeyHint="enter"
                    className={`textarea h-32 resize-none ${fieldErrors.descripcion_corta ? 'input-error' : ''}`}
                  />
                  {fieldErrors.descripcion_corta && (
                    <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.descripcion_corta}</p>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${formData.descripcion_corta.length < 20 ? 'text-error' : 'text-success'}`}>
                      {t('onboarding.activity.minCharsCounter', { current: formData.descripcion_corta.length, min: 20 })}
                    </p>
                    {formData.descripcion_corta.length >= 20 && (
                      <IconCheck className="w-4 h-4 text-success" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-ink mb-2">{t('onboarding.location.title')}</h2>
                  <p className="text-sm text-c-muted">{t('onboarding.location.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div id="provincia">
                    <label className="label" htmlFor="po-provincia">{t('onboarding.location.provinceLabel')}</label>
                    <select
                      id="po-provincia"
                      className={`select ${fieldErrors.provincia ? 'input-error' : ''}`}
                      value={formData.provincia}
                      onChange={(e) => {
                        setFormData({ ...formData, provincia: e.target.value, ciudad: "" });
                        setFieldErrors({ ...fieldErrors, provincia: null });
                      }}
                      aria-label={t('onboarding.location.provinceLabel')}
                    >
                      <option value="">{t('onboarding.location.selectProvince')}</option>
                      {PROVINCIAS.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                    {fieldErrors.provincia && (
                      <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.provincia}</p>
                    )}
                  </div>

                  <div id="ciudad">
                    <label className="label" htmlFor="po-ciudad">{t('onboarding.location.cityLabel')}</label>
                    <select
                      id="po-ciudad"
                      className={`select ${fieldErrors.ciudad ? 'input-error' : formData.ciudad ? 'border-success' : ''}`}
                      value={formData.ciudad}
                      onChange={(e) => {
                        setFormData({ ...formData, ciudad: e.target.value });
                        setFieldErrors({ ...fieldErrors, ciudad: null });
                      }}
                      disabled={!formData.provincia}
                      aria-label={t('onboarding.location.cityLabel')}
                    >
                      <option value="">{formData.provincia ? t('onboarding.location.selectCity') : t('onboarding.location.selectProvinceFirst')}</option>
                      {formData.provincia && CIUDADES_POR_PROVINCIA[formData.provincia]?.map((ciudad) => (
                        <option key={ciudad} value={ciudad}>{ciudad}</option>
                      ))}
                    </select>
                    {fieldErrors.ciudad && (
                      <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.ciudad}</p>
                    )}
                    {!fieldErrors.ciudad && formData.ciudad && (
                      <p className="text-xs text-success mt-1 flex items-center gap-1">
                        <IconCheck className="w-3 h-3" /> {t('onboarding.validation.correct')}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="po-tarifa-base">{t('onboarding.location.baseRateLabel')}</label>
                  <input
                    id="po-tarifa-base"
                    type="number"
                    value={formData.tarifa_base}
                    onChange={(e) => setFormData({ ...formData, tarifa_base: e.target.value })}
                    placeholder="35"
                    min="0"
                    inputMode="decimal"
                    enterKeyHint="next"
                    className="input"
                  />
                </div>

                <div id="formas_pago">
                  <OnboardingTooltip content={t('onboarding.location.paymentTooltip')}>
                    <label className="label mb-3 block">{t('onboarding.location.paymentMethodsLabel')}</label>
                  </OnboardingTooltip>
                  {fieldErrors.formas_pago && (
                    <p className="text-sm text-error mb-2 font-semibold">{fieldErrors.formas_pago}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {["Tarjeta", "Transferencia", "Efectivo", "Bizum"].map((forma) => (
                      <div
                        key={forma}
                        onClick={() => toggleFormaPago(forma)}
                        className="flex items-center gap-2 p-3 border-2 rounded-lg transition-all cursor-pointer hover:bg-purple-50"
                        style={{
                          borderColor: formData.formas_pago.includes(forma) ? '#9333EA' : '#E5E7EB',
                          backgroundColor: formData.formas_pago.includes(forma) ? '#FAF5FF' : 'white'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.formas_pago.includes(forma)}
                          onChange={() => {}}
                          className="checkbox w-4 h-4 pointer-events-none"
                        />
                        <span className="text-sm font-medium text-ink">{paymentLabels[forma] || forma}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div id="photos">
                  <OnboardingTooltip content={t('onboarding.portfolio.tooltip')}>
                    <label className="label mb-3 block">{t('onboarding.portfolio.title')} <span className="text-c-muted font-normal">{t('onboarding.portfolio.recommended')}</span></label>
                  </OnboardingTooltip>
                  {fieldErrors.photos && (
                    <p className="text-sm text-error mb-2 font-semibold">{fieldErrors.photos}</p>
                  )}
                  {formData.photos.length < 10 && (
                    isNative() ? (
                      // Nativo: botón que abre la action sheet de iOS / Android (Cámara / Galería).
                      <button
                        type="button"
                        onClick={handlePhotoUploadNative}
                        disabled={uploadingPhoto}
                        className="w-full border-2 border-dashed border-c-border rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-transparent"
                      >
                        {uploadingPhoto ? (
                          <IconSpinner className="w-8 h-8 animate-spin mx-auto text-c-accent" />
                        ) : (
                          <>
                            <IconUpload className="w-8 h-8 mx-auto mb-2 text-c-muted" />
                            <p className="text-sm text-c-muted">{t('onboarding.portfolio.addPhoto', { current: formData.photos.length, max: 10 })}</p>
                          </>
                        )}
                      </button>
                    ) : (
                      // Web: input file clásico.
                      <label className="cursor-pointer block">
                        <div className="border-2 border-dashed border-c-border rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                          />
                          {uploadingPhoto ? (
                            <IconSpinner className="w-8 h-8 animate-spin mx-auto text-c-accent" />
                          ) : (
                            <>
                              <IconUpload className="w-8 h-8 mx-auto mb-2 text-c-muted" />
                              <p className="text-sm text-c-muted">{t('onboarding.portfolio.clickToAddPhoto', { current: formData.photos.length, max: 10 })}</p>
                            </>
                          )}
                        </div>
                      </label>
                    )
                  )}

                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {formData.photos.map((photo, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={photo}
                            alt={t('proProfile.portfolio.photoAlt', { number: idx + 1 })}
                            className="w-full h-24 object-cover rounded-lg border-2 border-green-200"
                          />
                          <button
                            type="button"
                            aria-label={t('proProfile.picture.removeAria')}
                            onClick={() => {
                              removePhoto(idx);
                              setFieldErrors({ ...fieldErrors, photos: null });
                            }}
                            className="absolute top-1 right-1 bg-error text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <IconClose className="w-4 h-4" />
                          </button>
                          {idx === 0 && (
                            <div className="absolute bottom-1 left-1 bg-c-accent text-white text-xs px-2 py-1 rounded font-semibold">
                              {t('proProfile.gallery.mainPhoto')}
                            </div>
                          )}
                          <div className="absolute top-1 left-1 bg-success text-white p-1 rounded-full">
                            <IconCheck className="w-3 h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.photos.length > 0 && (
                    <p className="text-xs text-success mt-2 flex items-center gap-1">
                      <IconCheck className="w-3 h-3" /> {t('onboarding.portfolio.photosAdded', { number: formData.photos.length })}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label mb-3 block">{t('onboarding.social.title')}</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <IconInstagram className="w-5 h-5 text-pink-600" />
                      <input
                        type="url"
                        aria-label={t('proProfile.social.instagram')}
                        value={formData.social_links.instagram}
                        onChange={(e) => setFormData({
                          ...formData,
                          social_links: { ...formData.social_links, instagram: e.target.value }
                        })}
                        placeholder={t('onboarding.social.instagramPlaceholder')}
                        inputMode="url"
                        autoComplete="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="next"
                        className="input"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <IconFacebook className="w-5 h-5 text-c-accent" />
                      <input
                        type="url"
                        aria-label={t('proProfile.social.facebook')}
                        value={formData.social_links.facebook}
                        onChange={(e) => setFormData({
                          ...formData,
                          social_links: { ...formData.social_links, facebook: e.target.value }
                        })}
                        placeholder={t('onboarding.social.facebookPlaceholder')}
                        inputMode="url"
                        autoComplete="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="next"
                        className="input"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <IconGlobe className="w-5 h-5 text-c-muted" />
                      <input
                        type="url"
                        aria-label={t('sitioWeb')}
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder={t('onboarding.social.websitePlaceholder')}
                        inputMode="url"
                        autoComplete="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="next"
                        className="input"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <IconMusic className="w-5 h-5 text-ink" />
                      <input
                        type="url"
                        aria-label={t('proProfile.social.tiktok')}
                        value={formData.social_links.tiktok}
                        onChange={(e) => setFormData({
                          ...formData,
                          social_links: { ...formData.social_links, tiktok: e.target.value }
                        })}
                        placeholder={t('onboarding.social.tiktokPlaceholder')}
                        inputMode="url"
                        autoComplete="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="done"
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-soft border border-c-border rounded-xl p-5 space-y-3" id="acepta_terminos">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-ink">{t('onboarding.consents.title')}</h3>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        acepta_terminos: true,
                        acepta_politica_privacidad: true,
                        consiente_contacto_clientes: true
                      })}
                      className="btn-secondary btn-sm text-xs"
                    >
                      <IconCheck className="w-3 h-3 mr-1" />
                      {t('onboarding.consents.acceptAll')}
                    </button>
                  </div>
                  
                  <div 
                    className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => {
                      setFormData({ ...formData, acepta_terminos: !formData.acepta_terminos });
                      setFieldErrors({ ...fieldErrors, acepta_terminos: null });
                    }}
                    style={{
                      borderColor: fieldErrors.acepta_terminos ? '#EF4444' : formData.acepta_terminos ? '#10B981' : '#E5E7EB',
                      backgroundColor: formData.acepta_terminos ? '#F0FDF4' : 'white'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.acepta_terminos}
                      onChange={() => {}}
                      className="checkbox mt-0.5 pointer-events-none"
                    />
                    <span className="text-sm text-ink flex-1">
                      <Trans
                        i18nKey="onboarding.consents.acceptTerms"
                        components={{ terms: <a href="/terminos" target="_blank" className="text-c-accent underline font-medium" onClick={(e) => e.stopPropagation()} /> }}
                      />
                      {fieldErrors.acepta_terminos && (
                        <span className="block text-error font-semibold mt-1">{fieldErrors.acepta_terminos}</span>
                      )}
                    </span>
                  </div>

                  <div 
                    className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => setFormData({ ...formData, acepta_politica_privacidad: !formData.acepta_politica_privacidad })}
                    style={{
                      borderColor: formData.acepta_politica_privacidad ? '#10B981' : '#E5E7EB',
                      backgroundColor: formData.acepta_politica_privacidad ? '#F0FDF4' : 'white'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.acepta_politica_privacidad}
                      onChange={() => {}}
                      className="checkbox mt-0.5 pointer-events-none"
                    />
                    <span className="text-sm text-ink flex-1">
                      <Trans
                        i18nKey="onboarding.consents.acceptPrivacy"
                        components={{ privacy: <a href="/privacidad" target="_blank" className="text-c-accent underline font-medium" onClick={(e) => e.stopPropagation()} /> }}
                      />
                    </span>
                  </div>

                  <div 
                    className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => setFormData({ ...formData, consiente_contacto_clientes: !formData.consiente_contacto_clientes })}
                    style={{
                      borderColor: formData.consiente_contacto_clientes ? '#10B981' : '#E5E7EB',
                      backgroundColor: formData.consiente_contacto_clientes ? '#F0FDF4' : 'white'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.consiente_contacto_clientes}
                      onChange={() => {}}
                      className="checkbox mt-0.5 pointer-events-none"
                    />
                    <span className="text-sm text-ink flex-1">
                      {t('onboarding.consents.allowContact')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-secondary btn-lg flex-1 font-bold border-2"
                  disabled={saving}
                >
                  <IconChevronLeft className="w-5 h-5 mr-2" />
                  {t('home.whyTrust.previous')}
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary btn-lg flex-1 font-bold shadow-lg"
                >
                  {t('common.next')}
                  <IconChevronRight className="w-5 h-5 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="btn btn-lg flex-1 text-white bg-success hover:opacity-90 font-bold shadow-lg"
                >
                  {saving ? (
                    <>
                      <IconSpinner className="w-5 h-5 mr-2 animate-spin" />
                      {t('onboarding.nav.publishing')}
                    </>
                  ) : (
                    <>
                      <IconCheckCircle className="w-5 h-5 mr-2" />
                      {t('onboarding.nav.publish')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
