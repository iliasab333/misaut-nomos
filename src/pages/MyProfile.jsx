import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Modal from "@/components/Modal";
import MobileSelect from "@/components/MobileSelect";
import { SkeletonBlock, SkeletonList } from "@/components/ListStates";
import {
  IconUser,
  IconBuilding,
  IconSave,
  IconClose,
  IconUpload,
  IconSpinner,
  IconCheckCircle,
  IconBriefcase,
  IconMapPin,
  IconClock,
  IconEuro,
  IconAlert,
  IconGlobe,
  IconCamera,
  IconAward,
  IconChart,
  IconMessageSquare,
  IconPhone,
  IconEye,
  IconEyeOff,
  IconStarOutline,
  IconWhatsApp,
} from "@/components/Icons";
import { toast } from "@/lib/toast";
import ProfilePictureUpload from "../components/profile/ProfilePictureUpload";
import ProfileCompleteness from "../components/profile/ProfileCompleteness";
import { useTranslation, Trans } from "react-i18next";
import SkillsSection from "../components/profile/SkillsSection";
import PortfolioSection from "../components/profile/PortfolioSection";
import FAQSection from "../components/profile/FAQSection";
import ServicesSection from "../components/profile/ServicesSection";
import AvailabilityCalendar from "../components/profile/AvailabilityCalendar";
import IdentityVerificationWidget from "../components/verification/IdentityVerificationWidget";
import VerificationBanner from "../components/trust/VerificationBanner";
import DeleteAccountButton from "../components/account/DeleteAccountButton";

const provincias = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila",
  "Badajoz", "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria",
  "Castellón", "Ciudad Real", "Córdoba", "Cuenca", "Gerona", "Granada",
  "Guadalajara", "Guipúzcoa", "Huelva", "Huesca", "Islas Baleares",
  "Jaén", "La Coruña", "La Rioja", "Las Palmas", "León", "Lérida",
  "Lugo", "Madrid", "Málaga", "Murcia", "Navarra", "Orense", "Palencia",
  "Pontevedra", "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla",
  "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid",
  "Vizcaya", "Zamora", "Zaragoza"
];

const ciudadesPorProvincia = {
  "Madrid": ["Madrid", "Alcalá de Henares", "Móstoles", "Fuenlabrada", "Leganés", "Getafe", "Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas"],
  "Barcelona": ["Barcelona", "Hospitalet de Llobregat", "Badalona", "Terrassa", "Sabadell", "Mataró", "Santa Coloma de Gramenet"],
  "Valencia": ["Valencia", "Gandía", "Torrent", "Paterna", "Sagunto", "Alzira"],
  "Sevilla": ["Sevilla", "Dos Hermanas", "Alcalá de Guadaíra", "Utrera", "Mairena del Aljarafe"],
  "Málaga": ["Málaga", "Marbella", "Mijas", "Vélez-Málaga", "Fuengirola", "Torremolinos", "Estepona"],
  "Alicante": ["Alicante", "Elche", "Torrevieja", "Orihuela", "Benidorm", "Alcoy"],
  "Murcia": ["Murcia", "Cartagena", "Lorca", "Molina de Segura", "Alcantarilla"],
  "Vizcaya": ["Bilbao", "Barakaldo", "Getxo", "Portugalete", "Santurtzi"],
  "Zaragoza": ["Zaragoza", "Calatayud", "Utebo", "Ejea de los Caballeros"],
  "Las Palmas": ["Las Palmas de Gran Canaria", "Telde", "Santa Lucía", "Arucas"],
  "Islas Baleares": ["Palma", "Calvià", "Manacor", "Llucmajor", "Ibiza"],
};

export default function MyProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  
  const onboardingCompleted = searchParams.get("onboarding") === "completed";

  const [userData, setUserData] = useState({
    full_name: "",
    phone: "",
    city: "",
  });

  const [profileData, setProfileData] = useState({
    business_name: "",
    cif_nif: "",
    email_contacto: "",
    telefono_contacto: "",
    iban: "",
    description: "",
    descripcion_corta: "",
    categories: [],
    provincia: "",
    ciudad: "",
    municipio: "",
    service_area: "",
    radio_servicio_km: 10,
    disponibilidad_tipo: "laborables",
    horario_apertura: "09:00",
    horario_cierre: "18:00",
    website: "",
    price_range: "€€",
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
    activity_other: "",
    metodos_contacto: ['chat_interno'],
    years_experience: "",
    certifications: [],
    skills: [],
    portfolio_items: [],
    faq_items: [],
    services_offered: [],
  });

  // ================== LOAD USER ==================
  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setUserData({
        full_name: currentUser.full_name || "",
        phone: currentUser.phone || "",
        city: currentUser.city || "",
      });
      return currentUser;
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin();
      return null;
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // ================== QUERIES ==================
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['myProfile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: user.id });
      // Ver la nota en Autonomo.jsx: undefined hace saltar a React Query v5.
      return profiles[0] ?? null;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const cats = await base44.entities.ServiceCategory.list();
      return cats.filter(c => c.name).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: myReviewsAsClient = [] } = useQuery({
    queryKey: ['myReviewsAsClient', user?.id],
    queryFn: async () => {
      const reviews = await base44.entities.Review.filter({ client_id: user.id });
      return reviews.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user && user.user_type === 'client',
    staleTime: 60000 * 5,
  });

  // ================== SYNC PROFILE DATA ==================
  useEffect(() => {
    if (profile) {
      setProfileData({
        business_name: profile.business_name || "",
        cif_nif: profile.cif_nif || "",
        email_contacto: profile.email_contacto || user?.email || "",
        telefono_contacto: profile.telefono_contacto || user?.phone || "",
        iban: profile.iban || "",
        description: profile.description || "",
        descripcion_corta: profile.descripcion_corta || "",
        categories: profile.categories || [],
        provincia: profile.provincia || "",
        ciudad: profile.ciudad || "",
        municipio: profile.municipio || "",
        service_area: profile.service_area || "",
        radio_servicio_km: profile.radio_servicio_km || 10,
        disponibilidad_tipo: profile.disponibilidad_tipo || "laborables",
        horario_apertura: profile.horario_apertura || "09:00",
        horario_cierre: profile.horario_cierre || "18:00",
        website: profile.website || "",
        price_range: profile.price_range || "€€",
        tarifa_base: profile.tarifa_base || "",
        facturacion: profile.facturacion || "autonomo",
        formas_pago: profile.formas_pago || [],
        photos: profile.photos || [],
        social_links: profile.social_links || {
          facebook: "",
          instagram: "",
          linkedin: "",
          tiktok: ""
        },
        activity_other: profile.activity_other || "",
        metodos_contacto: profile.metodos_contacto || ['chat_interno'],
        years_experience: profile.years_experience || "",
        certifications: profile.certifications || [],
        skills: profile.skills || [],
        portfolio_items: profile.portfolio_items || [],
        faq_items: profile.faq_items || [],
        services_offered: profile.services_offered || [],
      });
    }
  }, [profile, user]);

  // Auto-fill service_area
  useEffect(() => {
    if (profileData.provincia && profileData.ciudad) {
      const area = profileData.municipio 
        ? `${profileData.municipio}, ${profileData.ciudad}, ${profileData.provincia}`
        : `${profileData.ciudad}, ${profileData.provincia}`;
      setProfileData(prev => ({ ...prev, service_area: area }));
    }
  }, [profileData.provincia, profileData.ciudad, profileData.municipio]);

  // ================== ONBOARDING COMPLETADO ==================
  useEffect(() => {
    if (onboardingCompleted) {
      toast.success(t('myProfile.toasts.onboardingCompleted'), {
        duration: 8000
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    }
  }, [onboardingCompleted]);

  // ================== MUTATIONS ==================
  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      toast.success(t('myProfile.toasts.personalDataUpdated'));
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const dataToSave = {
        ...data,
        imagen_principal: user.profile_picture || data.photos?.[0] || data.imagen_principal || ""
      };
      
      if (profile) {
        return await base44.entities.ProfessionalProfile.update(profile.id, dataToSave);
      } else {
        return await base44.entities.ProfessionalProfile.create({
          ...dataToSave,
          user_id: user.id,
          estado_perfil: "activo",
          visible_en_busqueda: true,
          onboarding_completed: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setSuccess(true);
      toast.success(t('myProfile.toasts.professionalProfileUpdated'));
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (visible) => {
      return await base44.entities.ProfessionalProfile.update(profile.id, {
        visible_en_busqueda: visible
      });
    },
    onSuccess: (_, visible) => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      toast.success(visible ? t('myProfile.toasts.profileNowVisible') : t('myProfile.toasts.profileNowHidden'));
    },
  });

  // ================== HANDLERS ==================
  const handleSave = async () => {
    const userDataToUpdate = { ...userData };
    
    if (profile && profileData.business_name) {
      userDataToUpdate.full_name = profileData.business_name;
    }
    
    updateUserMutation.mutate(userDataToUpdate);
    
    if (profile || profileData.business_name) {
      updateProfileMutation.mutate(profileData);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('myProfile.toasts.exceedsSize', { filename: file.name }));
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingPhoto(true);
    const uploadedUrls = [];

    try {
      for (const file of validFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      const updatedPhotos = [...(profileData.photos || []), ...uploadedUrls];
      setProfileData(prev => ({ ...prev, photos: updatedPhotos }));

      if (profile) {
        await base44.entities.ProfessionalProfile.update(profile.id, {
          photos: updatedPhotos,
          imagen_principal: user?.profile_picture || updatedPhotos[0] || ""
        });
        queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      }

      toast.success(t('myProfile.toasts.photosAdded', { number: validFiles.length }));
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error(t('myProfile.toasts.errorUploadingPhotos'));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const removePhoto = async (index) => {
    const newPhotos = [...profileData.photos];
    newPhotos.splice(index, 1);
    setProfileData({ ...profileData, photos: newPhotos });

    if (profile) {
      try {
        await base44.entities.ProfessionalProfile.update(profile.id, {
          photos: newPhotos,
          imagen_principal: user?.profile_picture || newPhotos[0] || ""
        });
        queryClient.invalidateQueries({ queryKey: ['myProfile'] });
        toast.success(t('myProfile.toasts.photoRemoved'));
      } catch (error) {
        console.error("Error removing photo:", error);
        toast.error(t('proProfile.picture.removeError'));
      }
    }
  };

  const selectCategory = (category) => {
    setProfileData({ ...profileData, categories: [category] });
  };

  const toggleFormaPago = (forma) => {
    const formas = profileData.formas_pago;
    if (formas.includes(forma)) {
      setProfileData({ ...profileData, formas_pago: formas.filter(f => f !== forma) });
    } else {
      setProfileData({ ...profileData, formas_pago: [...formas, forma] });
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await base44.functions.invoke('deleteUser', { userId: user.id });
      toast.success(t('myProfile.toasts.accountDeleted'));
      setTimeout(() => {
        base44.auth.logout(createPageUrl("Search"));
      }, 1500);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(t('myProfile.toasts.accountDeleteError'));
      setDeletingAccount(false);
    }
  };

  // ================== COMPUTED VALUES ==================
  const isProfessional = (profile && profile.onboarding_completed) || user?.user_type === "professionnel";
  
  // Mapa explícito valor BD → etiqueta traducida (el valor guardado no cambia).
  const paymentLabels = {
    Tarjeta: t('card'),
    Transferencia: t('bankTransfer'),
    Efectivo: t('cash'),
    Bizum: t('onboarding.location.bizum'),
  };
  const isProfileVisible = profile?.visible_en_busqueda === true && 
                           profile?.onboarding_completed === true;

  // ================== LOADING STATES ==================
  const isInitialLoading = !user || loadingProfile;

  if (isInitialLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <SkeletonBlock lines={2} />
        <SkeletonList count={4} avatar={false} />
      </div>
    );
  }

  // ================== MAIN RENDER ==================
  return (
    <div className="min-h-screen bg-surface md:bg-soft pb-20 md:pb-8">
      {/* HEADER MINIMALISTA */}
      <div className="bg-surface border-b border-c-border">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-ink">{t('myProfileTitle')}</h1>
            <p className="text-sm text-c-muted mt-0.5">{isProfessional ? t('manageYourProfile') : t('myProfile.header.manageYourInformation')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {profile && isProfessional && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: isProfileVisible ? 'rgba(0,37,92,0.08)' : '#F1F5F9',
                  color: isProfileVisible ? '#00255C' : '#475569',
                }}
              >
                {isProfileVisible ? <IconEye className="w-3.5 h-3.5"/> : <IconEyeOff className="w-3.5 h-3.5"/>}
                {isProfileVisible ? t('publishedProfile') : t('hiddenProfile')}
              </span>
            )}
            {profile?.slug_publico && isProfessional && (
              <a
                href={`/autonomo/${profile.slug_publico}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-c-border text-ink hover:bg-soft"
              >
                <IconEye className="w-3.5 h-3.5"/>
                {t('myProfile.header.viewPublicProfile')}
              </a>
            )}
            <button
              onClick={handleSave}
              disabled={updateUserMutation.isPending || updateProfileMutation.isPending}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: '#00255C' }}
            >
              {updateProfileMutation.isPending ? <IconSpinner className="w-3.5 h-3.5 animate-spin"/> : <IconSave className="w-3.5 h-3.5"/>}
              <span className="hidden sm:inline">{t('proProfile.form.saveChanges')}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-3 md:px-4 pt-4">

        {success && (
          <div role="alert" className="card p-4 mb-4 border-l-4 border-l-success flex items-start gap-2">
            <IconCheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-success">
              {t('myProfile.alerts.profileUpdated')}
            </p>
          </div>
        )}

        {/* CTA FOR NON-PROFESSIONALS */}
        {!isProfessional && user && (
          <div className="card mb-6 shadow-lg border-0 bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <IconBriefcase className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base md:text-lg text-ink">{t('myProfile.cta.wantOfferServices')}</h3>
                    <p className="text-xs md:text-sm text-c-muted mt-1">
                      {t('myProfile.cta.becomeProfessionalAppear')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(createPageUrl("ProfileOnboarding"))}
                  className="btn btn-sm text-white bg-orange-500 hover:bg-orange-600 w-full md:w-auto"
                >
                  <IconBriefcase className="w-4 h-4 mr-2" />
                  {t('myProfile.cta.becomeProfessional')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BANNER VERIFICACIÓN */}
        {isProfessional && profile && (
          <div className="mb-4">
            <VerificationBanner profile={profile} />
          </div>
        )}

        {/* BANNER FOTO PRINCIPAL FALTANTE */}
        {isProfessional && profile && !profile.imagen_principal && (
          <div className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📸</span>
            <div className="flex-1">
              <p className="font-bold text-ink text-sm">{t('myProfile.photoBanner.title')}</p>
              <p className="text-xs text-c-muted mt-0.5">
                <Trans i18nKey="myProfile.photoBanner.body" components={{ strong: <strong /> }} />
              </p>
            </div>
            <button
              onClick={() => setActiveTab("portfolio")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
            >
              {t('myProfile.photoBanner.cta')}
            </button>
          </div>
        )}

        {/* PROFILE COMPLETENESS */}
        {isProfessional && profile && (
          <div className="mb-6">
            <ProfileCompleteness profile={profile} user={user} />
          </div>
        )}

        {/* SECCIONES — sidebar vertical (desktop) + select (mobile) */}
        {(() => {
          const tabsConfig = [
            { value: 'personal', icon: IconUser, label: t('tabPersonal') },
            ...(!isProfessional ? [{ value: 'reviews', icon: IconStarOutline, label: t('myProfile.tabs.myReviews'), badge: myReviewsAsClient.length > 0 ? myReviewsAsClient.length : null }] : []),
            ...(isProfessional ? [
              { value: 'business', icon: IconBuilding, label: t('tabProfile') },
              { value: 'skills', icon: IconAward, label: t('tabSkills') },
              { value: 'services', icon: IconBriefcase, label: t('tabServices') },
              { value: 'portfolio', icon: IconCamera, label: t('tabPortfolio') },
              { value: 'availability', icon: IconClock, label: t('tabAvailability') },
              { value: 'faq', icon: IconChart, label: t('tabFAQ') },
            ] : [])
          ];
          return (
            <div className="md:grid md:grid-cols-[240px_1fr] md:gap-5 md:items-start">
              {/* Sidebar */}
              <aside className="mb-4 md:mb-0">
                {/* Móvil: <select> */}
                <div className="md:hidden">
                  <label htmlFor="profile-section-select" className="block text-[10px] uppercase tracking-[0.1em] font-bold text-c-muted mb-1.5">
                    {t('myProfile.sections.label')}
                  </label>
                  <select
                    id="profile-section-select"
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-c-border bg-surface text-sm font-semibold text-ink focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                  >
                    {tabsConfig.map((tab) => (
                      <option key={tab.value} value={tab.value}>{tab.label}</option>
                    ))}
                  </select>
                </div>
                {/* Desktop: nav vertical */}
                <nav role="tablist" aria-orientation="vertical" className="hidden md:block rounded-2xl bg-surface border border-c-border p-1.5 md:sticky" style={{ top: 88 }}>
                  {tabsConfig.map(({ value, icon: Icon, label, badge }) => {
                    const active = activeTab === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveTab(value)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition mb-0.5 last:mb-0 ${active ? 'text-white' : 'text-ink hover:bg-soft'}`}
                        style={active ? { background: '#00255C', boxShadow: '0 1px 2px rgba(0,37,92,0.25)' } : undefined}
                      >
                        <Icon className={`w-4 h-4 ${active ? '' : 'text-c-muted'}`} />
                        <span className={`flex-1 text-left ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                        {badge != null && (
                          <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20 text-white' : 'bg-warning/10 text-warning'}`}>{badge}</span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </aside>
              {/* Content */}
              <div className="min-w-0">
                <div className="space-y-4">

          {/* ==================== TAB: PERSONAL ==================== */}
          {activeTab === "personal" && (
            <div className="card shadow-sm border-0">
              <div className="p-6 pb-3">
                <h3 className="text-base md:text-lg flex items-center gap-2 text-ink font-semibold">
                  <IconUser className="w-5 h-5 text-c-accent" />
                  {t('personalInformation')}
                </h3>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="flex justify-center py-4">
                  <ProfilePictureUpload
                    user={user}
                    currentPicture={user?.profile_picture}
                    onUpdate={(newUrl) => loadUser()}
                    size="lg"
                    allowedForClients={true}
                  />
                </div>

                <div>
                  <label className="label text-sm" htmlFor="mp-email">{t('emailField')}</label>
                  <input id="mp-email" value={user.email} disabled className="input bg-soft mt-1 text-ink disabled:opacity-100 disabled:cursor-default" />
                </div>

                <div>
                  <label className="label text-sm" htmlFor="mp-full-name">{t('fullNameLabel')}</label>
                  <input
                    id="mp-full-name"
                    value={userData.full_name || ""}
                    onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="input mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label text-sm" htmlFor="mp-phone">{t('phoneLabel')}</label>
                    <input
                      id="mp-phone"
                      value={userData.phone || ""}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="+34 612 345 678"
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="label text-sm">{t('cityLabel')}</label>
                    <div className="mt-1">
                      <MobileSelect
                        value={userData.city || ""}
                        onValueChange={(value) => setUserData({ ...userData, city: value })}
                        placeholder={t('myProfile.personal.selectYourCity')}
                        disabled={!isEditing}
                        label={t('cityLabel')}
                      >
                        {Object.values(ciudadesPorProvincia).flat().sort().map((ciudad) => (
                          <option key={ciudad} value={ciudad}>{ciudad}</option>
                        ))}
                      </MobileSelect>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label text-sm">{t('accountType')}</label>
                  <div className="mt-1">
                    <span className="badge bg-blue-100 text-blue-900">
                      {isProfessional ? t('professionalLabel') : t('clientLabel')}
                    </span>
                  </div>
                </div>

                {/* VISIBILITY TOGGLE - SOLO PARA PROFESIONALES */}
                {isProfessional && profile && (
                  <div className="pt-4 mt-4 border-t border-c-border">
                    <div className="card p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <label className="label text-base font-bold text-ink mb-2 block">
                              {t('availability')}
                            </label>
                            <p className="text-xs md:text-sm text-ink leading-relaxed">
                              {profile.visible_en_busqueda 
                                ? t('myProfile.visibility.activeVisible')
                                : t('myProfile.visibility.pausedHidden')}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            role="switch"
                            aria-label={t('availability')}
                            checked={profile.visible_en_busqueda}
                            onChange={(e) => toggleVisibilityMutation.mutate(e.target.checked)}
                            disabled={toggleVisibilityMutation.isPending}
                            className={`switch mt-1 flex-shrink-0 ${profile.visible_en_busqueda ? '!bg-success' : ''}`}
                          />
                        </div>

                        {profile.visible_en_busqueda ? (
                          <div className="p-3 bg-success/10 border-l-4 border-success rounded-lg">
                            <div className="flex items-start gap-2">
                              <IconCheckCircle className="w-4 h-4 md:w-5 md:h-5 text-success mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs md:text-sm font-semibold text-success mb-1">
                                  {t('myProfile.visibility.activeAndVisible')}
                                </p>
                                <p className="text-xs text-success">
                                  {t('myProfile.visibility.clientsCanSee')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-warning/10 border-l-4 border-warning rounded-lg">
                            <div className="flex items-start gap-2">
                              <IconAlert className="w-4 h-4 md:w-5 md:h-5 text-warning mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs md:text-sm font-semibold text-warning mb-1">
                                  {t('myProfile.visibility.paused')}
                                </p>
                                <p className="text-xs text-warning">
                                  {t('myProfile.visibility.usefulIfBusy')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* VERIFICACIÓN DE IDENTIDAD */}
                <div className="pt-4 border-t border-c-border">
                  <p className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                    <span>🛡️</span> {t('myProfile.personal.identityVerification')}
                  </p>
                  <IdentityVerificationWidget user={user} />
                </div>

                {/* DELETE ACCOUNT */}
                <div className="pt-6 border-t border-c-border flex flex-col items-center gap-2">
                  <DeleteAccountButton className="w-full justify-center" redirectTo="/" />
                  <p className="text-xs text-c-muted mt-1 text-center">
                    {t('myProfile.deleteAccount.irreversibleNote')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: MIS RESEÑAS (CLIENTE) ==================== */}
          {!isProfessional && activeTab === "reviews" && (
              <div className="card shadow-sm border-0">
                <div className="p-6 pb-3">
                  <h3 className="text-base md:text-lg flex items-center gap-2 text-ink font-semibold">
                    <IconStarOutline className="w-5 h-5 text-star" />
                    {t('myProfile.reviews.title')}
                  </h3>
                </div>
                <div className="p-6 pt-0">
                  {myReviewsAsClient.length === 0 ? (
                    <div className="text-center py-10">
                      <IconStarOutline className="w-12 h-12 text-c-border mx-auto mb-3" />
                      <p className="text-c-muted text-sm">{t('myProfile.reviews.empty')}</p>
                      <p className="text-c-muted text-xs mt-1">{t('myProfile.reviews.emptyHint')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myReviewsAsClient.map((review) => (
                        <div key={review.id} className="bg-soft rounded-xl p-4 border border-c-border">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-xs text-c-muted mb-1">
                                {new Date(review.created_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <div className="flex gap-0.5 mb-2">
                                {[1,2,3,4,5].map(s => (
                                  <IconStarOutline key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-star text-star' : 'text-c-border'}`} />
                                ))}
                              </div>
                              {review.comment && (
                                <p className="text-sm text-ink leading-relaxed">{review.comment}</p>
                              )}
                            </div>
                          </div>
                          {review.professional_response && (
                            <div className="mt-3 ml-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
                              <p className="text-xs font-semibold text-c-accent mb-1">{t('reviews.card.professionalResponse')}</p>
                              <p className="text-sm text-ink">{review.professional_response}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
          )}

          {/* ==================== TAB: BUSINESS ==================== */}
          {isProfessional && activeTab === "business" && (
              <div className="space-y-4">
                {/* Identidad profesional */}
                <div className="card shadow-sm border-0">
                  <div className="p-6 pb-3">
                    <h3 className="text-base md:text-lg flex items-center gap-2 text-ink font-semibold">
                      <IconBuilding className="w-5 h-5 text-c-accent" />
                      {t('professionalIdentity')}
                    </h3>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div>
                      <label className="label text-sm" htmlFor="mp-business-name">{t('professionalNameRequired')}</label>
                      <input
                        id="mp-business-name"
                        value={profileData.business_name}
                        onChange={(e) => setProfileData({ ...profileData, business_name: e.target.value })}
                        disabled={!isEditing}
                        placeholder={t('myProfile.business.companyPlaceholder')}
                        className="input mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label flex items-center gap-2 text-sm" htmlFor="mp-cif-nif">
                          {profileData.cif_nif ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                          {t('nifCifNie')}
                        </label>
                        <input
                          id="mp-cif-nif"
                          value={profileData.cif_nif || ""}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            setProfileData({ ...profileData, cif_nif: value });
                          }}
                          disabled={!isEditing}
                          placeholder="12345678A"
                          maxLength={9}
                          className="input mt-1"
                        />
                        {isEditing && profileData.cif_nif && profileData.cif_nif.length > 0 && profileData.cif_nif.length < 8 && (
                          <p className="text-xs text-warning mt-1">{t('auth.passwordMinChars')}</p>
                        )}
                      </div>
                      <div>
                        <label className="label flex items-center gap-2 text-sm" htmlFor="mp-years-experience">
                          {profileData.years_experience ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                          {t('yearsExperience')}
                        </label>
                        <input
                          id="mp-years-experience"
                          type="number"
                          value={profileData.years_experience}
                          onChange={(e) => setProfileData({ ...profileData, years_experience: e.target.value })}
                          disabled={!isEditing}
                          placeholder="5"
                          min="0"
                          max="50"
                          className="input mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label flex items-center gap-2 text-sm" htmlFor="mp-email-contacto">
                        {profileData.email_contacto ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                        {t('emailContact')}
                      </label>
                      <input
                        id="mp-email-contacto"
                        type="email"
                        value={profileData.email_contacto}
                        onChange={(e) => setProfileData({ ...profileData, email_contacto: e.target.value })}
                        disabled={!isEditing}
                        className="input mt-1"
                      />
                    </div>

                    <div>
                      <label className="label flex items-center gap-2 text-sm" htmlFor="mp-telefono-contacto">
                        {profileData.telefono_contacto ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                        {t('phoneContact')}
                      </label>
                      <input
                        id="mp-telefono-contacto"
                        value={profileData.telefono_contacto}
                        onChange={(e) => setProfileData({ ...profileData, telefono_contacto: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+34 612 345 678"
                        className="input mt-1"
                      />
                    </div>

                    {/* Métodos de contacto */}
                    <div>
                      <label className="label flex items-center gap-2 mb-3 text-sm">
                        <IconMessageSquare className="w-4 h-4 text-c-accent" />
                        {t('visibleContactMethods')}
                      </label>
                      <p className="text-xs text-c-muted mb-3">{t('selectHowClientsContact')}</p>
                      
                      <div className="space-y-2">
                        {/* Chat interno */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <IconMessageSquare className="w-4 h-4 md:w-5 md:h-5 text-c-accent flex-shrink-0" />
                            <div>
                              <p className="font-medium text-ink text-xs md:text-sm">{t('internalChat')}</p>
                              <p className="text-xs text-c-muted">{t('alwaysActive')}</p>
                            </div>
                          </div>
                          <IconCheckCircle className="w-4 h-4 md:w-5 md:h-5 text-c-accent flex-shrink-0" />
                        </div>

                        {/* WhatsApp */}
                        <div 
                          onClick={() => {
                            if (!isEditing) return;
                            if (!profileData.telefono_contacto) {
                              toast.error(t('myProfile.contact.addPhoneFirstWhatsApp'));
                              return;
                            }
                            const methods = profileData.metodos_contacto || ['chat_interno'];
                            if (methods.includes('whatsapp')) {
                              setProfileData({ 
                                ...profileData, 
                                metodos_contacto: methods.filter(m => m !== 'whatsapp') 
                              });
                            } else {
                              setProfileData({ 
                                ...profileData, 
                                metodos_contacto: [...methods, 'whatsapp'] 
                              });
                            }
                          }}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                            isEditing ? 'cursor-pointer hover:bg-soft active:scale-98' : ''
                          } ${
                            profileData.metodos_contacto?.includes('whatsapp') 
                              ? 'bg-success/10 border-success' 
                              : 'bg-surface border-c-border'
                          } ${!profileData.telefono_contacto ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                              <IconWhatsApp className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-ink text-xs md:text-sm">{t('profile_page.whatsapp')}</p>
                              <p className="text-xs text-c-muted">{t('myProfile.contact.requiresPhone')}</p>
                            </div>
                          </div>
                          {profileData.metodos_contacto?.includes('whatsapp') ? (
                            <IconCheckCircle className="w-4 h-4 md:w-5 md:h-5 text-success flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-c-border rounded-full flex-shrink-0" />
                          )}
                        </div>

                        {/* Teléfono */}
                        <div 
                          onClick={() => {
                            if (!isEditing) return;
                            if (!profileData.telefono_contacto) {
                              toast.error(t('myProfile.contact.addPhoneFirstCall'));
                              return;
                            }
                            const methods = profileData.metodos_contacto || ['chat_interno'];
                            if (methods.includes('telefono')) {
                              setProfileData({ 
                                ...profileData, 
                                metodos_contacto: methods.filter(m => m !== 'telefono') 
                              });
                            } else {
                              setProfileData({ 
                                ...profileData, 
                                metodos_contacto: [...methods, 'telefono'] 
                              });
                            }
                          }}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                            isEditing ? 'cursor-pointer hover:bg-soft active:scale-98' : ''
                          } ${
                            profileData.metodos_contacto?.includes('telefono') 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'bg-surface border-c-border'
                          } ${!profileData.telefono_contacto ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <IconPhone className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-ink text-xs md:text-sm">{t('myProfile.contact.phoneCall')}</p>
                              <p className="text-xs text-c-muted">{t('myProfile.contact.requiresPhone')}</p>
                            </div>
                          </div>
                          {profileData.metodos_contacto?.includes('telefono') ? (
                            <IconCheckCircle className="w-4 h-4 md:w-5 md:h-5 text-c-accent flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-c-border rounded-full flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="label flex items-center gap-2 text-sm" htmlFor="mp-iban">
                        {profileData.iban ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                        {t('myProfile.business.ibanForInvoices')}
                      </label>
                      <input
                        id="mp-iban"
                        value={profileData.iban || ""}
                        onChange={(e) => setProfileData({ ...profileData, iban: e.target.value.toUpperCase() })}
                        disabled={!isEditing}
                        placeholder={t('myProfile.business.ibanPlaceholder')}
                        maxLength={34}
                        className="input mt-1"
                      />
                      <p className="text-xs text-c-muted mt-1">{t('myProfile.business.ibanHelp')}</p>
                    </div>
                  </div>
                </div>

                {/* Servicios y descripción */}
                <div className="card shadow-sm border-0">
                  <div className="p-6 pb-3">
                    <h3 className="text-base md:text-lg text-ink font-semibold">{t('myProfile.services.title')}</h3>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div>
                      <label className="label text-sm">{t('myProfile.services.category')}</label>
                      {!isEditing ? (
                        <div className="mt-2 flex items-center gap-2">
                          <IconCheckCircle className="w-5 h-5 text-success" />
                          <span className="badge bg-blue-100 text-blue-900 text-sm">
                            {profileData.categories[0] || t('myProfile.services.noCategory')}
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 mt-2 max-h-[50vh] overflow-y-auto pr-1">
                          {categories.map((cat) => (
                            <div
                              key={cat.id}
                              onClick={() => selectCategory(cat.name)}
                              className={`flex items-center gap-2 p-3 border-2 rounded-lg transition-all cursor-pointer active:scale-98 ${
                                profileData.categories.includes(cat.name)
                                  ? "border-blue-600 bg-blue-50"
                                  : "border-c-border hover:bg-soft"
                              }`}
                            >
                              {profileData.categories.includes(cat.name) ? (
                                <IconCheckCircle className="w-5 h-5 text-c-accent flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 border-2 border-c-border rounded-full flex-shrink-0" />
                              )}
                              <span className="text-xs md:text-sm">{cat.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {profileData.categories.includes("Otro tipo de servicio profesional") && (
                      <div>
                        <label className="label text-sm" htmlFor="mp-activity-other">{t('onboarding.activity.otherServiceLabel')}</label>
                        <input
                          id="mp-activity-other"
                          value={profileData.activity_other}
                          onChange={(e) => setProfileData({ ...profileData, activity_other: e.target.value })}
                          disabled={!isEditing}
                          placeholder={t('myProfile.services.specifyServicePlaceholder')}
                          className="input mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <label className="label text-sm" htmlFor="mp-descripcion-corta">{t('myProfile.services.description')}</label>
                      {!isEditing && profileData.descripcion_corta ? (
                        <div className="mt-2 p-3 bg-soft rounded-lg border border-c-border">
                          <div className="flex items-start gap-2">
                            <IconCheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                            <p className="text-xs md:text-sm text-ink">{profileData.descripcion_corta}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <textarea
                            id="mp-descripcion-corta"
                            value={profileData.descripcion_corta}
                            onChange={(e) => setProfileData({ ...profileData, descripcion_corta: e.target.value.slice(0, 220) })}
                            disabled={!isEditing}
                            className="textarea mt-2"
                            placeholder={t('onboarding.activity.descriptionPlaceholder')}
                          />
                          <p className="text-xs text-c-muted mt-1">{profileData.descripcion_corta.length}/220</p>
                          
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ubicación */}
                <div className="card shadow-sm border-0">
                  <div className="p-6 pb-3">
                    <h3 className="text-base md:text-lg flex items-center gap-2 text-ink font-semibold">
                      <IconMapPin className="w-5 h-5 text-c-accent" />
                      {t('common.location')}
                    </h3>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label flex items-center gap-2 text-sm">
                          {profileData.provincia ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                          {t('province')}
                        </label>
                        <div className="mt-1">
                          <MobileSelect
                            value={profileData.provincia}
                            onValueChange={(value) => setProfileData({ ...profileData, provincia: value, ciudad: "" })}
                            placeholder={t('onboarding.location.selectProvince')}
                            disabled={!isEditing}
                            label={t('province')}
                          >
                            {provincias.map((prov) => (
                              <option key={prov} value={prov}>{prov}</option>
                            ))}
                          </MobileSelect>
                        </div>
                      </div>

                      <div>
                        <label className="label flex items-center gap-2 text-sm">
                          {profileData.ciudad ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                          {t('city')}
                        </label>
                        <div className="mt-1">
                          <MobileSelect
                            value={profileData.ciudad}
                            onValueChange={(value) => setProfileData({ ...profileData, ciudad: value })}
                            placeholder={profileData.provincia ? t('onboarding.location.selectCity') : t('myProfile.location.firstChooseProvince')}
                            disabled={!isEditing || !profileData.provincia}
                            label={t('cityLabel')}
                          >
                            {(profileData.provincia ? ciudadesPorProvincia[profileData.provincia] || [] : []).map((ciudad) => (
                              <option key={ciudad} value={ciudad}>{ciudad}</option>
                            ))}
                          </MobileSelect>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tarifas y pagos */}
                <div className="card shadow-sm border-0">
                  <div className="p-6 pb-3">
                    <h3 className="text-base md:text-lg flex items-center gap-2 text-ink font-semibold">
                      <IconEuro className="w-5 h-5 text-c-accent" />
                      {t('myProfile.rates.title')}
                    </h3>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div>
                      <label className="label flex items-center gap-2 text-sm" htmlFor="mp-tarifa-base">
                        {profileData.tarifa_base ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                        {t('myProfile.rates.baseRateOptional')}
                      </label>
                      <input
                        id="mp-tarifa-base"
                        type="number"
                        value={profileData.tarifa_base}
                        onChange={(e) => setProfileData({ ...profileData, tarifa_base: e.target.value })}
                        disabled={!isEditing}
                        placeholder="35"
                        min="0"
                        className="input mt-1"
                      />
                      
                    </div>

                    <div>
                      <label className="label flex items-center gap-2 text-sm">
                        {profileData.formas_pago.length > 0 ? <IconCheckCircle className="w-4 h-4 text-success" /> : null}
                        {t('myProfile.rates.acceptedPaymentMethods')}
                      </label>
                      {!isEditing ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profileData.formas_pago.map((forma) => (
                            <span key={forma} className="badge bg-purple-100 text-purple-900 flex items-center gap-1">
                              <IconCheckCircle className="w-3 h-3" />
                              {paymentLabels[forma] || forma}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {["Tarjeta", "Transferencia", "Efectivo", "Bizum"].map((forma) => (
                            <div
                              key={forma}
                              onClick={() => toggleFormaPago(forma)}
                              className={`flex items-center gap-2 p-3 border-2 rounded-lg transition-all cursor-pointer active:scale-98 ${
                                profileData.formas_pago.includes(forma)
                                  ? "border-purple-600 bg-purple-50"
                                  : "border-c-border hover:bg-soft"
                              }`}
                            >
                              {profileData.formas_pago.includes(forma) ? (
                                <IconCheckCircle className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-c-border rounded-full flex-shrink-0" />
                              )}
                              <span className="text-xs md:text-sm">{paymentLabels[forma] || forma}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* ==================== TAB: SKILLS ==================== */}
          {isProfessional && activeTab === "skills" && (
              <SkillsSection
                skills={profileData.skills || []}
                certifications={profileData.certifications || []}
                yearsExperience={profileData.years_experience}
                isEditing={isEditing}
                onSkillsChange={(skills) => setProfileData({ ...profileData, skills })}
                onCertificationsChange={(certifications) => setProfileData({ ...profileData, certifications })}
                onYearsChange={(years) => setProfileData({ ...profileData, years_experience: years })}
              />
          )}

          {/* ==================== TAB: SERVICES ==================== */}
          {isProfessional && activeTab === "services" && (
              <ServicesSection
                services={profileData.services_offered || []}
                isEditing={isEditing}
                onServicesChange={(services) => setProfileData({ ...profileData, services_offered: services })}
              />
          )}

          {/* ==================== TAB: PORTFOLIO ==================== */}
          {isProfessional && activeTab === "portfolio" && (
              <div className="space-y-4">
                {/* Portfolio de trabajos */}
                <PortfolioSection
                  portfolioItems={profileData.portfolio_items || []}
                  isEditing={isEditing}
                  onPortfolioChange={(items) => setProfileData({ ...profileData, portfolio_items: items })}
                  categories={categories.map(c => c.name)}
                />

                {/* Galería de fotos */}
                <div className="card shadow-sm border-0">
                  <div className="p-6 pb-3">
                    <h3 className="text-base md:text-lg flex items-center gap-2 text-ink font-semibold">
                      <IconCamera className="w-5 h-5 text-c-accent" />
                      {t('myProfile.portfolio.galleryTitle')} ({profileData.photos.length}/10)
                    </h3>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <p className="text-xs md:text-sm text-c-muted">{t('myProfile.portfolio.additionalPhotos')}</p>

                    {isEditing && profileData.photos.length < 10 && (
                      <label className="cursor-pointer block">
                        <div className="border-2 border-dashed border-c-border rounded-xl p-6 md:p-8 text-center hover:border-blue-500 transition-colors active:scale-98">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                          />
                          {uploadingPhoto ? (
                            <IconSpinner className="w-8 h-8 animate-spin mx-auto text-c-accent" />
                          ) : (
                            <>
                              <IconUpload className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-c-muted" />
                              <p className="text-xs md:text-sm text-c-muted">{t('myProfile.portfolio.clickToAddPhotos', { current: profileData.photos.length })}</p>
                              <p className="text-xs text-c-muted mt-1">{t('myProfile.portfolio.selectMultiple')}</p>
                            </>
                          )}
                        </div>
                      </label>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                      {profileData.photos.map((photo, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={photo}
                            alt={t('proProfile.portfolio.photoAlt', { number: idx + 1 })}
                            className="w-full h-24 md:h-32 object-cover rounded-lg shadow-md"
                          />
                          {isEditing && (
                            <button
                              type="button"
                              aria-label={t('proProfile.picture.removeAria')}
                              onClick={() => removePhoto(idx)}
                              className="absolute top-1 right-1 md:top-2 md:right-2 bg-error text-white p-1 md:p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg active:scale-90"
                            >
                              <IconClose className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                          )}
                          {idx === 0 && (
                            <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-c-accent text-white text-xs px-2 py-0.5 md:py-1 rounded font-semibold">
                              {t('proProfile.gallery.mainPhoto')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Redes sociales */}
                <div className="card shadow-sm border-0">
                  <div className="p-6 pb-3">
                    <h3 className="text-base md:text-lg flex items-center gap-2 text-ink font-semibold">
                      <IconGlobe className="w-5 h-5 text-c-accent" />
                      {t('myProfile.social.title')}
                    </h3>
                  </div>
                  <div className="p-6 pt-0 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label flex items-center gap-2 text-xs text-c-muted" htmlFor="mp-website">
                          {profileData.website ? <IconCheckCircle className="w-3 h-3 text-success" /> : <div className="w-3 h-3" />}
                          {t('sitioWeb')}
                        </label>
                        <input
                          id="mp-website"
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          disabled={!isEditing}
                          placeholder={t('onboarding.social.websitePlaceholder')}
                          className="input mt-1"
                        />
                      </div>

                      <div>
                        <label className="label flex items-center gap-2 text-xs text-c-muted" htmlFor="mp-social-instagram">
                          {profileData.social_links?.instagram ? <IconCheckCircle className="w-3 h-3 text-success" /> : <div className="w-3 h-3" />}
                          {t('proProfile.social.instagram')}
                        </label>
                        <input
                          id="mp-social-instagram"
                          value={profileData.social_links.instagram}
                          onChange={(e) => setProfileData({ 
                            ...profileData, 
                            social_links: { ...profileData.social_links, instagram: e.target.value }
                          })}
                          disabled={!isEditing}
                          placeholder={t('myProfile.social.handlePlaceholder')}
                          className="input mt-1"
                        />
                      </div>

                      <div>
                        <label className="label flex items-center gap-2 text-xs text-c-muted" htmlFor="mp-social-facebook">
                          {profileData.social_links?.facebook ? <IconCheckCircle className="w-3 h-3 text-success" /> : <div className="w-3 h-3" />}
                          {t('proProfile.social.facebook')}
                        </label>
                        <input
                          id="mp-social-facebook"
                          value={profileData.social_links.facebook}
                          onChange={(e) => setProfileData({ 
                            ...profileData, 
                            social_links: { ...profileData.social_links, facebook: e.target.value }
                          })}
                          disabled={!isEditing}
                          placeholder={t('myProfile.social.facebookPlaceholder')}
                          className="input mt-1"
                        />
                      </div>

                      <div>
                        <label className="label flex items-center gap-2 text-xs text-c-muted" htmlFor="mp-social-tiktok">
                          {profileData.social_links?.tiktok ? <IconCheckCircle className="w-3 h-3 text-success" /> : <div className="w-3 h-3" />}
                          {t('proProfile.social.tiktok')}
                        </label>
                        <input
                          id="mp-social-tiktok"
                          value={profileData.social_links.tiktok}
                          onChange={(e) => setProfileData({ 
                            ...profileData, 
                            social_links: { ...profileData.social_links, tiktok: e.target.value }
                          })}
                          disabled={!isEditing}
                          placeholder={t('myProfile.social.handlePlaceholder')}
                          className="input mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* ==================== TAB: AVAILABILITY ==================== */}
          {isProfessional && activeTab === "availability" && (
              <AvailabilityCalendar
                disponibilidadTipo={profileData.disponibilidad_tipo}
                horarioApertura={profileData.horario_apertura}
                horarioCierre={profileData.horario_cierre}
                horariorDias={profileData.horario_dias}
                isEditing={isEditing}
                onChange={(data) => setProfileData({ ...profileData, ...data })}
              />
          )}

          {/* ==================== TAB: FAQ ==================== */}
          {isProfessional && activeTab === "faq" && (
              <FAQSection
                faqItems={profileData.faq_items || []}
                isEditing={isEditing}
                onFAQChange={(items) => setProfileData({ ...profileData, faq_items: items })}
              />
          )}

                </div>
              </div>
            </div>
          );
        })()}

        {/* SAVE BAR — sticky en móvil */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-c-border px-4 py-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          <button
            onClick={handleSave}
            disabled={updateUserMutation.isPending || updateProfileMutation.isPending}
            className="w-full h-12 rounded-xl text-base font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: '#00255C' }}
          >
            {updateProfileMutation.isPending ? <IconSpinner className="w-4 h-4 animate-spin"/> : <IconSave className="w-4 h-4"/>}
            {t('proProfile.form.saveChanges')}
          </button>
        </div>
      </div>

      {/* DELETE ACCOUNT DIALOG */}
      <Modal
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={t('myProfile.deleteAccount.title')}
        dismissible={false}
      >
        <div className="text-sm text-c-muted">
          {t('myProfile.deleteAccount.body')}
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>{t('myProfile.deleteAccount.items.profile')}</li>
            <li>{t('myProfile.deleteAccount.items.messages')}</li>
            <li>{t('myProfile.deleteAccount.items.history')}</li>
            <li>{t('myProfile.deleteAccount.items.invoices')}</li>
            <li>{t('myProfile.deleteAccount.items.reviews')}</li>
          </ul>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowDeleteDialog(false)}
            disabled={deletingAccount}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-danger-solid"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? (
              <>
                <IconSpinner className="w-4 h-4 mr-2 animate-spin" />
                {t('myProfile.deleteAccount.deleting')}
              </>
            ) : (
              t('myProfile.deleteAccount.confirm')
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}