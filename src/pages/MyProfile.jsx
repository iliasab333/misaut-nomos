import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Save, X, Upload, Loader2, CheckCircle, CreditCard, Briefcase, MapPin, Clock, Euro, AlertCircle, Globe, Facebook, Instagram, Linkedin, Camera, Award, BarChart3, Music, MessageSquare, Phone, Eye, EyeOff, Pencil, Star, ChevronDown, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileSelect from "@/components/ui/MobileSelect";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import ProfilePictureUpload from "../components/profile/ProfilePictureUpload";
import ProfileCompleteness from "../components/profile/ProfileCompleteness";
import { useLanguage } from "../components/ui/LanguageSwitcher";
import InvoicingSettingsForm from "../components/invoicing/InvoicingSettingsForm";
import SkillsSection from "../components/profile/SkillsSection";
import PortfolioSection from "../components/profile/PortfolioSection";
import FAQSection from "../components/profile/FAQSection";
import AIAssistantPro from "../components/ai/AIAssistantPro";
import ServicesSection from "../components/profile/ServicesSection";
import AvailabilityCalendar from "../components/profile/AvailabilityCalendar";
import IdentityVerificationWidget from "../components/verification/IdentityVerificationWidget";
import VerificationBanner from "../components/trust/VerificationBanner";
import DeleteAccountButton from "../components/account/DeleteAccountButton";

const isSubscriptionActive = (estado, fechaExpiracion) => {
  if (!estado) return false;
  
  const normalizedState = estado.toLowerCase().trim();
  const validStates = ["activo", "active", "en_prueba", "trialing", "trial_active", "actif"];
  
  if (validStates.includes(normalizedState)) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiration = new Date(fechaExpiracion);
      expiration.setHours(0, 0, 0, 0);
      
      if (isNaN(expiration.getTime())) return true;
      return expiration >= today;
    } catch (error) {
      return true;
    }
  }
  
  if (normalizedState === "cancelado" || normalizedState === "canceled") {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiration = new Date(fechaExpiracion);
      expiration.setHours(0, 0, 0, 0);
      
      if (isNaN(expiration.getTime())) return false;
      return expiration >= today;
    } catch (error) {
      return false;
    }
  }
  
  return false;
};

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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isVerifyingSubscription, setIsVerifyingSubscription] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  
  const MAX_POLLING_ATTEMPTS = 10;
  const reactivationSuccess = searchParams.get("reactivation");
  const onboardingPending = searchParams.get("onboarding");
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
  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_id: user.id });
      return subs.length > 0 ? subs[0] : null;
    },
    enabled: !!user && !isVerifyingSubscription,
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['myProfile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: user.id });
      return profiles[0];
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

  const { data: invoicingSettings } = useQuery({
    queryKey: ['invoicingSettings', user?.id],
    queryFn: async () => {
      const settings = await base44.entities.InvoicingSettings.filter({ professional_id: user.id });
      return settings[0] || null;
    },
    enabled: !!user && !!profile,
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

  // ================== SUBSCRIPTION POLLING ==================
  useEffect(() => {
    if (reactivationSuccess === "success" || onboardingPending === "pending") {
      setIsVerifyingSubscription(true);
      startSubscriptionPolling();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (onboardingCompleted) {
      toast.success('🎉 ¡Enhorabuena! Tu perfil está publicado y visible para clientes.', {
        duration: 8000
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } else if (reactivationSuccess === "canceled") {
      toast.info("Reactivación cancelada. Puedes intentarlo de nuevo cuando quieras.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [reactivationSuccess, onboardingPending, onboardingCompleted]);

  const startSubscriptionPolling = async () => {
    for (let attempt = 1; attempt <= MAX_POLLING_ATTEMPTS; attempt++) {
      try {
        const currentUser = await loadUser();
        if (!currentUser) throw new Error("User not loaded during polling");
        
        await queryClient.invalidateQueries({ queryKey: ['subscription', currentUser.id] });
        const result = await queryClient.fetchQuery({
          queryKey: ['subscription', currentUser.id],
          queryFn: async () => {
            const subs = await base44.entities.Subscription.filter({ user_id: currentUser.id });
            return subs[0] || null;
          },
          staleTime: 0,
          gcTime: 0,
        });
        
        if (result && isSubscriptionActive(result.estado, result.fecha_expiracion)) {
          setIsVerifyingSubscription(false);
          
          if (reactivationSuccess === "success") {
            toast.success("🎉 ¡Tu suscripción ha sido reactivada! Tu perfil ya es visible en búsquedas.", {
              duration: 6000
            });
          } else if (onboardingPending === "pending") {
            toast.success("✅ ¡Pago confirmado! Ahora completa tu perfil profesional.", {
              duration: 8000
            });
            setTimeout(() => navigate(createPageUrl("ProfileOnboarding")), 2000);
          }
          
          queryClient.invalidateQueries({ queryKey: ['myProfile'] });
          return;
        }
        
        if (attempt === 5 && currentUser) {
          try {
            const syncResponse = await base44.functions.invoke('syncStripeSubscription', { user_id: currentUser.id });
            
            if (syncResponse.data.ok) {
              await loadUser();
              await queryClient.invalidateQueries({ queryKey: ['subscription'] });
              await queryClient.refetchQueries({ queryKey: ['subscription'] });
              
              if (syncResponse.data.needs_onboarding) {
                toast.success("✅ ¡Suscripción activada! Completa tu perfil profesional.", { duration: 8000 });
                setTimeout(() => navigate(createPageUrl("ProfileOnboarding")), 2000);
              } else {
                toast.success("🎉 ¡Tu suscripción está activa!", { duration: 6000 });
              }
              
              setIsVerifyingSubscription(false);
              return;
            }
          } catch (syncError) {
            console.error('❌ Error en sincronización forzada:', syncError);
          }
        }
        
        if (attempt < MAX_POLLING_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Error en intento ${attempt}:`, error);
        if (attempt < MAX_POLLING_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    setIsVerifyingSubscription(false);
    toast.error(
      <div>
        <p className="font-semibold">No se pudo verificar tu suscripción</p>
        <p className="text-sm mt-1">Por favor, contacta con soporte: soporte@misautonomos.es</p>
      </div>,
      { duration: 15000 }
    );
  };

  // ================== MUTATIONS ==================
  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      toast.success(t('personalDataUpdated'));
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
      toast.success(t('professionalProfileUpdated'));
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
      toast.success(visible ? t('profileNowVisible') : t('profileNowHidden'));
    },
  });

  const saveInvoicingSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (invoicingSettings) {
        return await base44.entities.InvoicingSettings.update(invoicingSettings.id, data);
      } else {
        return await base44.entities.InvoicingSettings.create({
          ...data,
          professional_id: user.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoicingSettings']);
      toast.success(t('invoicingSettingsSaved') || 'Datos de facturación guardados');
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
        toast.error(t('exceedsSize').replace('{filename}', file.name));
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

      toast.success(t('photosAdded').replace('{count}', validFiles.length));
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error(t('errorUploadingPhotos'));
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
        toast.success(t('photoRemoved'));
      } catch (error) {
        console.error("Error removing photo:", error);
        toast.error(t('errorRemovingPhoto'));
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
      toast.success('Tu cuenta ha sido eliminada correctamente');
      setTimeout(() => {
        base44.auth.logout(createPageUrl("Search"));
      }, 1500);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Error al eliminar la cuenta. Contacta con soporte.');
      setDeletingAccount(false);
    }
  };

  // ================== COMPUTED VALUES ==================
  const isProfessional = (profile && profile.onboarding_completed) || user?.user_type === "professionnel";
  
  const getSubscriptionStatus = () => {
    if (!subscription) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expirationDate = new Date(subscription.fecha_expiracion);
    expirationDate.setHours(0, 0, 0, 0);
    
    const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
    const isActive = isSubscriptionActive(subscription.estado, subscription.fecha_expiracion);
    const normalizedState = subscription.estado.toLowerCase();
    
    if (normalizedState === "en_prueba" || normalizedState === "trialing" || normalizedState === "trial_active") {
      return {
        text: "Periodo de prueba",
        badge: "🟡",
        color: "bg-blue-100 text-blue-800 border border-blue-300",
        details: isActive ? `${daysLeft} días de prueba restantes` : "Prueba finalizada",
        isActive: isActive,
        showUpgrade: true,
        showReactivate: false
      };
    }
    
    if (normalizedState === "activo" || normalizedState === "active" || normalizedState === "actif") {
      return {
        text: "Suscripción activa",
        badge: "🟢",
        color: "bg-green-100 text-green-800 border border-green-300",
        details: `Renovación: ${expirationDate.toLocaleDateString('es-ES')}`,
        isActive: true,
        showUpgrade: false,
        showReactivate: false
      };
    }
    
    if (normalizedState === "cancelado" || normalizedState === "canceled") {
      return {
        text: isActive ? "Suscripción cancelada" : "Suscripción finalizada",
        badge: isActive ? "⚪" : "🔴",
        color: isActive 
          ? "bg-yellow-100 text-yellow-800 border border-yellow-300" 
          : "bg-red-100 text-red-800 border border-red-300",
        details: isActive 
          ? `Activo hasta ${expirationDate.toLocaleDateString('es-ES')} (no se renovará)`
          : "Tu perfil está oculto",
        isActive: isActive,
        showUpgrade: false,
        showReactivate: true
      };
    }
    
    return {
      text: isActive ? "Suscripción activa" : "Suscripción inactiva",
      badge: isActive ? "🟢" : "🔴",
      color: isActive 
        ? "bg-green-100 text-green-800 border border-green-300"
        : "bg-red-100 text-red-800 border border-red-300",
      details: isActive ? `Válido hasta ${expirationDate.toLocaleDateString('es-ES')}` : "Reactiva tu plan para aparecer en búsquedas",
      isActive: isActive,
      showUpgrade: false,
      showReactivate: !isActive
    };
  };

  const subscriptionStatus = getSubscriptionStatus();
  const isProfileVisible = profile?.visible_en_busqueda === true && 
                           subscriptionStatus?.isActive && 
                           profile?.onboarding_completed === true;

  // ================== LOADING STATES ==================
  const isInitialLoading = !user || loadingProfile || (loadingSubscription && !isVerifyingSubscription);

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      </div>
    );
  }

  if (isVerifyingSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl bg-white">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verificando tu suscripción</h2>
              <p className="text-gray-600">Estamos confirmando tu pago y activando tu cuenta...</p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">Esto tardará solo unos segundos</p>
                <p className="text-xs text-blue-700 mt-2">Por favor, no cierres esta ventana mientras procesamos tu pago.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ================== MAIN RENDER ==================
  return (
    <div className="min-h-screen bg-white md:bg-gray-50 pb-20 md:pb-8">
      {/* HEADER MINIMALISTA */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">{t('myProfileTitle') || 'Mi Perfil'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{isProfessional ? (t('manageYourProfile') || 'Gestiona tu perfil público') : (t('manageYourInformation') || 'Gestiona tu información')}</p>
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
                {isProfileVisible ? <Eye className="w-3.5 h-3.5"/> : <EyeOff className="w-3.5 h-3.5"/>}
                {isProfileVisible ? (t('publishedProfile') || 'Perfil publicado') : (t('hiddenProfile') || 'Perfil oculto')}
              </span>
            )}
            {profile?.slug_publico && isProfessional && (
              <a
                href={`/autonomo/${profile.slug_publico}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Eye className="w-3.5 h-3.5"/>
                Ver perfil público
              </a>
            )}
            <button
              onClick={handleSave}
              disabled={updateUserMutation.isPending || updateProfileMutation.isPending}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: '#00255C' }}
            >
              {updateProfileMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
              <span className="hidden sm:inline">{t('saveChanges') || 'Guardar cambios'}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-3 md:px-4 pt-4">

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t('profileUpdatedSuccess')}
            </AlertDescription>
          </Alert>
        )}

        {/* CTA FOR NON-PROFESSIONALS */}
        {!isProfessional && user && (
          <Card className="mb-6 shadow-lg border-0 bg-gradient-to-r from-orange-50 to-orange-100">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base md:text-lg text-gray-900">{t('wantOfferServices')}</h3>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      {t('becomeProfessionalAppear')}
                    </p>
                    <Link to={createPageUrl("DashboardProInfo")} className="text-blue-600 hover:text-blue-700 text-xs md:text-sm font-medium mt-2 inline-block">
                      Ver todo lo que incluye el Dashboard Pro →
                    </Link>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl("PricingPlans"))}
                  className="bg-orange-500 hover:bg-orange-600 w-full md:w-auto"
                  size="sm"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  {t('viewPlans')}
                </Button>
              </div>
            </CardContent>
          </Card>
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
              <p className="font-bold text-gray-900 text-sm">Añade una foto principal a tu perfil</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Los perfiles con foto reciben <strong>3× más contactos</strong>. Sube una foto en la pestaña <strong>Trabajos</strong> para activarla.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("portfolio")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
            >
              Añadir foto
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
            { value: 'personal', icon: User, label: t('tabPersonal') || 'Información' },
            ...(!isProfessional ? [{ value: 'reviews', icon: Star, label: 'Mis reseñas', badge: myReviewsAsClient.length > 0 ? myReviewsAsClient.length : null }] : []),
            ...(isProfessional ? [
              { value: 'business', icon: Building2, label: t('tabProfile') || 'Perfil público' },
              { value: 'skills', icon: Award, label: t('tabSkills') || 'Especialidades' },
              { value: 'services', icon: Briefcase, label: t('tabServices') || 'Servicios' },
              { value: 'portfolio', icon: Camera, label: t('tabPortfolio') || 'Trabajos' },
              { value: 'availability', icon: Clock, label: t('tabAvailability') || 'Disponibilidad' },
              { value: 'faq', icon: BarChart3, label: t('tabFAQ') || 'FAQ' },
              { value: 'invoicing', icon: Euro, label: t('tabInvoicing') || 'Facturación' },
            ] : [])
          ];
          return (
            <div className="md:grid md:grid-cols-[240px_1fr] md:gap-5 md:items-start">
              {/* Sidebar */}
              <aside className="mb-4 md:mb-0">
                {/* Móvil: <select> */}
                <div className="md:hidden">
                  <label htmlFor="profile-section-select" className="block text-[10px] uppercase tracking-[0.1em] font-bold text-slate-500 mb-1.5">
                    Sección
                  </label>
                  <select
                    id="profile-section-select"
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                  >
                    {tabsConfig.map((tab) => (
                      <option key={tab.value} value={tab.value}>{tab.label}</option>
                    ))}
                  </select>
                </div>
                {/* Desktop: nav vertical */}
                <nav className="hidden md:block rounded-2xl bg-white border border-slate-200 p-1.5 md:sticky" style={{ top: 88 }}>
                  {tabsConfig.map(({ value, icon: Icon, label, badge }) => {
                    const active = activeTab === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setActiveTab(value)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition mb-0.5 last:mb-0 ${active ? 'text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        style={active ? { background: '#00255C', boxShadow: '0 1px 2px rgba(0,37,92,0.25)' } : undefined}
                      >
                        <Icon className={`w-4 h-4 ${active ? '' : 'text-slate-500'}`} />
                        <span className={`flex-1 text-left ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                        {badge != null && (
                          <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>{badge}</span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </aside>
              {/* Content */}
              <div className="min-w-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

          {/* ==================== TAB: PERSONAL ==================== */}
          <TabsContent value="personal">
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg flex items-center gap-2 text-gray-900 font-semibold">
                  <User className="w-5 h-5 text-blue-700" />
                  {t('personalInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label className="text-sm">{t('email')}</Label>
                  <Input value={user.email} disabled className="bg-gray-50 mt-1 text-gray-700 disabled:opacity-100 disabled:cursor-default" />
                </div>

                <div>
                  <Label className="text-sm">{t('fullNameLabel')}</Label>
                  <Input
                    value={userData.full_name || ""}
                    onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Teléfono</Label>
                    <Input
                      value={userData.phone || ""}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="+34 612 345 678"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Ciudad</Label>
                    <div className="mt-1">
                      <MobileSelect
                        value={userData.city || ""}
                        onValueChange={(value) => setUserData({ ...userData, city: value })}
                        placeholder="Selecciona tu ciudad"
                        disabled={!isEditing}
                        label="Ciudad"
                      >
                        {Object.values(ciudadesPorProvincia).flat().sort().map((ciudad) => (
                          <SelectItem key={ciudad} value={ciudad}>{ciudad}</SelectItem>
                        ))}
                      </MobileSelect>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">{t('accountType')}</Label>
                  <div className="mt-1">
                    <Badge className="bg-blue-100 text-blue-900">
                      {isProfessional ? 'Profesional' : 'Cliente'}
                    </Badge>
                  </div>
                </div>

                {/* VISIBILITY TOGGLE - SOLO PARA PROFESIONALES */}
                {isProfessional && profile && subscriptionStatus?.isActive && (
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-base font-bold text-gray-900 mb-2 block">
                              Disponibilidad
                            </Label>
                            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                              {profile.visible_en_busqueda 
                                ? 'Perfil activo y visible para clientes'
                                : t('profilePausedHidden')}
                            </p>
                          </div>
                          <Switch
                            checked={profile.visible_en_busqueda}
                            onCheckedChange={(checked) => toggleVisibilityMutation.mutate(checked)}
                            disabled={toggleVisibilityMutation.isPending}
                            className="data-[state=checked]:bg-green-600 mt-1 flex-shrink-0"
                          />
                        </div>

                        {profile.visible_en_busqueda ? (
                          <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs md:text-sm font-semibold text-green-900 mb-1">
                                  Activo y visible
                                </p>
                                <p className="text-xs text-green-800">
                                  Los clientes pueden ver tu perfil
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs md:text-sm font-semibold text-amber-900 mb-1">
                                  {t('profilePaused')}
                                </p>
                                <p className="text-xs text-amber-800">
                                  {t('usefulIfBusy')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* VERIFICACIÓN DE IDENTIDAD */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span>🛡️</span> Verificación de identidad
                  </p>
                  <IdentityVerificationWidget user={user} />
                </div>

                {/* DELETE ACCOUNT */}
                <div className="pt-6 border-t border-gray-200 flex flex-col items-center gap-2">
                  <DeleteAccountButton className="w-full justify-center" redirectTo="/" />
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Esta acción es irreversible y eliminará todos tus datos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB: MIS RESEÑAS (CLIENTE) ==================== */}
          {!isProfessional && (
            <TabsContent value="reviews">
              <Card className="shadow-sm border-0 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2 text-gray-900 font-semibold">
                    <Star className="w-5 h-5 text-amber-500" />
                    Reseñas que he dejado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myReviewsAsClient.length === 0 ? (
                    <div className="text-center py-10">
                      <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Aún no has dejado ninguna valoración.</p>
                      <p className="text-gray-400 text-xs mt-1">Cuando tengas conversaciones con autónomos, podrás valorar su trabajo aquí.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myReviewsAsClient.map((review) => (
                        <div key={review.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                {new Date(review.created_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <div className="flex gap-0.5 mb-2">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                                ))}
                              </div>
                              {review.comment && (
                                <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                              )}
                            </div>
                          </div>
                          {review.professional_response && (
                            <div className="mt-3 ml-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
                              <p className="text-xs font-semibold text-blue-700 mb-1">Respuesta del profesional</p>
                              <p className="text-sm text-gray-700">{review.professional_response}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ==================== TAB: BUSINESS ==================== */}
          {isProfessional && (
            <TabsContent value="business">
              <div className="space-y-4">
                {/* Identidad profesional */}
                <Card className="shadow-sm border-0 bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 text-gray-900 font-semibold">
                      <Building2 className="w-5 h-5 text-blue-700" />
                      {t('professionalIdentity')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm">{t('professionalNameRequired')}</Label>
                      <Input
                        value={profileData.business_name}
                        onChange={(e) => setProfileData({ ...profileData, business_name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Tu Empresa S.L."
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-2 text-sm">
                          {profileData.cif_nif ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                          NIF / CIF / NIE *
                        </Label>
                        <Input
                          value={profileData.cif_nif || ""}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            setProfileData({ ...profileData, cif_nif: value });
                          }}
                          disabled={!isEditing}
                          placeholder="12345678A"
                          maxLength={9}
                          className="mt-1"
                        />
                        {isEditing && profileData.cif_nif && profileData.cif_nif.length > 0 && profileData.cif_nif.length < 8 && (
                          <p className="text-xs text-amber-600 mt-1">Mínimo 8 caracteres</p>
                        )}
                      </div>
                      <div>
                        <Label className="flex items-center gap-2 text-sm">
                          {profileData.years_experience ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                          {t('yearsExperience')}
                        </Label>
                        <Input
                          type="number"
                          value={profileData.years_experience}
                          onChange={(e) => setProfileData({ ...profileData, years_experience: e.target.value })}
                          disabled={!isEditing}
                          placeholder="5"
                          min="0"
                          max="50"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        {profileData.email_contacto ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                        {t('emailContact')}
                      </Label>
                      <Input
                        type="email"
                        value={profileData.email_contacto}
                        onChange={(e) => setProfileData({ ...profileData, email_contacto: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        {profileData.telefono_contacto ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                        {t('phoneContact')}
                      </Label>
                      <Input
                        value={profileData.telefono_contacto}
                        onChange={(e) => setProfileData({ ...profileData, telefono_contacto: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+34 612 345 678"
                        className="mt-1"
                      />
                    </div>

                    {/* Métodos de contacto */}
                    <div>
                      <Label className="flex items-center gap-2 mb-3 text-sm">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        {t('visibleContactMethods')}
                      </Label>
                      <p className="text-xs text-gray-500 mb-3">{t('selectHowClientsContact')}</p>
                      
                      <div className="space-y-2">
                        {/* Chat interno */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900 text-xs md:text-sm">{t('internalChat')}</p>
                              <p className="text-xs text-gray-500">{t('alwaysActive')}</p>
                            </div>
                          </div>
                          <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                        </div>

                        {/* WhatsApp */}
                        <div 
                          onClick={() => {
                            if (!isEditing) return;
                            if (!profileData.telefono_contacto) {
                              toast.error(t('addPhoneFirstWhatsApp'));
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
                            isEditing ? 'cursor-pointer hover:bg-gray-50 active:scale-98' : ''
                          } ${
                            profileData.metodos_contacto?.includes('whatsapp') 
                              ? 'bg-green-50 border-green-300' 
                              : 'bg-white border-gray-200'
                          } ${!profileData.telefono_contacto ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 text-white fill-current">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-xs md:text-sm">WhatsApp</p>
                              <p className="text-xs text-gray-500">{t('requiresPhone')}</p>
                            </div>
                          </div>
                          {profileData.metodos_contacto?.includes('whatsapp') ? (
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                          )}
                        </div>

                        {/* Teléfono */}
                        <div 
                          onClick={() => {
                            if (!isEditing) return;
                            if (!profileData.telefono_contacto) {
                              toast.error(t('addPhoneFirstCall'));
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
                            isEditing ? 'cursor-pointer hover:bg-gray-50 active:scale-98' : ''
                          } ${
                            profileData.metodos_contacto?.includes('telefono') 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'bg-white border-gray-200'
                          } ${!profileData.telefono_contacto ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-xs md:text-sm">{t('phoneCall')}</p>
                              <p className="text-xs text-gray-500">{t('requiresPhone')}</p>
                            </div>
                          </div>
                          {profileData.metodos_contacto?.includes('telefono') ? (
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        {profileData.iban ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                        {t('ibanForInvoices')}
                      </Label>
                      <Input
                        value={profileData.iban || ""}
                        onChange={(e) => setProfileData({ ...profileData, iban: e.target.value.toUpperCase() })}
                        disabled={!isEditing}
                        placeholder="ES91 2100 0418 4502 0005 1332"
                        maxLength={34}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('ibanHelp')}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Servicios y descripción */}
                <Card className="shadow-sm border-0 bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg text-gray-900 font-semibold">{t('servicesAndDescription')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm">{t('serviceCategory')}</Label>
                      {!isEditing ? (
                        <div className="mt-2 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <Badge className="bg-blue-100 text-blue-900 text-sm">
                            {profileData.categories[0] ? t(profileData.categories[0]) : t('noCategory')}
                          </Badge>
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
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              {profileData.categories.includes(cat.name) ? (
                                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                              )}
                              <span className="text-xs md:text-sm">{t(cat.name) || cat.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {profileData.categories.includes("Otro tipo de servicio profesional") && (
                      <div>
                        <Label className="text-sm">{t('specifyYourService')}</Label>
                        <Input
                          value={profileData.activity_other}
                          onChange={(e) => setProfileData({ ...profileData, activity_other: e.target.value })}
                          disabled={!isEditing}
                          placeholder={t('specifyServicePlaceholder')}
                          className="mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-sm">{t('servicesDescription')}</Label>
                      {!isEditing && profileData.descripcion_corta ? (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs md:text-sm text-gray-700">{profileData.descripcion_corta}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Textarea
                            value={profileData.descripcion_corta}
                            onChange={(e) => setProfileData({ ...profileData, descripcion_corta: e.target.value.slice(0, 220) })}
                            disabled={!isEditing}
                            className="h-24 mt-2"
                            placeholder="Describe brevemente tus servicios..."
                          />
                          <p className="text-xs text-gray-500 mt-1">{profileData.descripcion_corta.length}/220</p>
                          
                          {isEditing && (
                            <div className="mt-3">
                              <AIAssistantPro
                                type="description"
                                context={{
                                  category: profileData.categories[0] || "Servicio profesional",
                                  experience: profileData.years_experience || "varios",
                                  location: profileData.ciudad || profileData.provincia || "tu zona"
                                }}
                                onApply={(suggestion) => {
                                  setProfileData({ ...profileData, descripcion_corta: suggestion.slice(0, 220) });
                                }}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Ubicación */}
                <Card className="shadow-sm border-0 bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 text-gray-900 font-semibold">
                      <MapPin className="w-5 h-5 text-blue-700" />
                      {t('locationLabel')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-2 text-sm">
                          {profileData.provincia ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                          {t('province')}
                        </Label>
                        <div className="mt-1">
                          <MobileSelect
                            value={profileData.provincia}
                            onValueChange={(value) => setProfileData({ ...profileData, provincia: value, ciudad: "" })}
                            placeholder={t('selectProvincePlaceholder')}
                            disabled={!isEditing}
                            label="Provincia"
                          >
                            {provincias.map((prov) => (
                              <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                            ))}
                          </MobileSelect>
                        </div>
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 text-sm">
                          {profileData.ciudad ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                          {t('city')}
                        </Label>
                        <div className="mt-1">
                          <MobileSelect
                            value={profileData.ciudad}
                            onValueChange={(value) => setProfileData({ ...profileData, ciudad: value })}
                            placeholder={profileData.provincia ? t('selectCityPlaceholder') : t('firstChooseProvince')}
                            disabled={!isEditing || !profileData.provincia}
                            label="Ciudad"
                          >
                            {(profileData.provincia ? ciudadesPorProvincia[profileData.provincia] || [] : []).map((ciudad) => (
                              <SelectItem key={ciudad} value={ciudad}>{ciudad}</SelectItem>
                            ))}
                          </MobileSelect>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tarifas y pagos */}
                <Card className="shadow-sm border-0 bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 text-gray-900 font-semibold">
                      <Euro className="w-5 h-5 text-blue-700" />
                      {t('ratesAndPayments')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        {profileData.tarifa_base ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                        {t('baseRateOptionalLabel')}
                      </Label>
                      <Input
                        type="number"
                        value={profileData.tarifa_base}
                        onChange={(e) => setProfileData({ ...profileData, tarifa_base: e.target.value })}
                        disabled={!isEditing}
                        placeholder="35"
                        min="0"
                        className="mt-1"
                      />
                      
                      {isEditing && (
                        <div className="mt-3">
                          <AIAssistantPro
                            type="pricing"
                            context={{
                              service: profileData.activity_other || profileData.categories[0] || "Servicio profesional",
                              category: profileData.categories[0] || "Servicio profesional",
                              location: profileData.ciudad || profileData.provincia || "España",
                              experience: profileData.years_experience || "media"
                            }}
                            onApply={() => {}}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        {profileData.formas_pago.length > 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                        {t('acceptedPaymentMethodsLabel')}
                      </Label>
                      {!isEditing ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profileData.formas_pago.map((forma) => (
                            <Badge key={forma} className="bg-purple-100 text-purple-900 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {t(forma.toLowerCase())}
                            </Badge>
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
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              {profileData.formas_pago.includes(forma) ? (
                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                              )}
                              <span className="text-xs md:text-sm">{t(forma.toLowerCase())}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ==================== TAB: SKILLS ==================== */}
          {isProfessional && (
            <TabsContent value="skills">
              <SkillsSection
                skills={profileData.skills || []}
                certifications={profileData.certifications || []}
                yearsExperience={profileData.years_experience}
                isEditing={isEditing}
                onSkillsChange={(skills) => setProfileData({ ...profileData, skills })}
                onCertificationsChange={(certifications) => setProfileData({ ...profileData, certifications })}
                onYearsChange={(years) => setProfileData({ ...profileData, years_experience: years })}
              />
            </TabsContent>
          )}

          {/* ==================== TAB: SERVICES ==================== */}
          {isProfessional && (
            <TabsContent value="services">
              <ServicesSection
                services={profileData.services_offered || []}
                isEditing={isEditing}
                onServicesChange={(services) => setProfileData({ ...profileData, services_offered: services })}
              />
            </TabsContent>
          )}

          {/* ==================== TAB: PORTFOLIO ==================== */}
          {isProfessional && (
            <TabsContent value="portfolio">
              <div className="space-y-4">
                {/* Portfolio de trabajos */}
                <PortfolioSection
                  portfolioItems={profileData.portfolio_items || []}
                  isEditing={isEditing}
                  onPortfolioChange={(items) => setProfileData({ ...profileData, portfolio_items: items })}
                  categories={categories.map(c => c.name)}
                />

                {/* Galería de fotos */}
                <Card className="shadow-sm border-0 bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 text-gray-900 font-semibold">
                      <Camera className="w-5 h-5 text-blue-700" />
                      {t('photoGalleryTitle')} ({profileData.photos.length}/10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs md:text-sm text-gray-600">{t('additionalWorkPhotos')}</p>

                    {isEditing && profileData.photos.length < 10 && (
                      <label className="cursor-pointer block">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 md:p-8 text-center hover:border-blue-500 transition-colors active:scale-98">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                          />
                          {uploadingPhoto ? (
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-700" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-xs md:text-sm text-gray-600">{t('clickToAddPhotos').replace('{count}', profileData.photos.length)}</p>
                              <p className="text-xs text-gray-500 mt-1">{t('selectMultiple')}</p>
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
                            alt={t('photoNumber').replace('{number}', idx + 1)}
                            className="w-full h-24 md:h-32 object-cover rounded-lg shadow-md"
                          />
                          {isEditing && (
                            <button
                              onClick={() => removePhoto(idx)}
                              className="absolute top-1 right-1 md:top-2 md:right-2 bg-red-500 text-white p-1 md:p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg active:scale-90"
                            >
                              <X className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                          )}
                          {idx === 0 && (
                            <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-blue-600 text-white text-xs px-2 py-0.5 md:py-1 rounded font-semibold">
                              {t('mainPhotoLabel')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Redes sociales */}
                <Card className="shadow-sm border-0 bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 text-gray-900 font-semibold">
                      <Globe className="w-5 h-5 text-blue-700" />
                      {t('socialNetworksLabel')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="flex items-center gap-2 text-xs text-gray-600">
                          {profileData.website ? <CheckCircle className="w-3 h-3 text-green-600" /> : <div className="w-3 h-3" />}
                          {t('sitioWeb')}
                        </Label>
                        <Input
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          disabled={!isEditing}
                          placeholder="https://tuweb.com"
                          className="h-10 mt-1"
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 text-xs text-gray-600">
                          {profileData.social_links?.instagram ? <CheckCircle className="w-3 h-3 text-green-600" /> : <div className="w-3 h-3" />}
                          Instagram
                        </Label>
                        <Input
                          value={profileData.social_links.instagram}
                          onChange={(e) => setProfileData({ 
                            ...profileData, 
                            social_links: { ...profileData.social_links, instagram: e.target.value }
                          })}
                          disabled={!isEditing}
                          placeholder="@tuperfil"
                          className="h-10 mt-1"
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 text-xs text-gray-600">
                          {profileData.social_links?.facebook ? <CheckCircle className="w-3 h-3 text-green-600" /> : <div className="w-3 h-3" />}
                          Facebook
                        </Label>
                        <Input
                          value={profileData.social_links.facebook}
                          onChange={(e) => setProfileData({ 
                            ...profileData, 
                            social_links: { ...profileData.social_links, facebook: e.target.value }
                          })}
                          disabled={!isEditing}
                          placeholder="tupagina"
                          className="h-10 mt-1"
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 text-xs text-gray-600">
                          {profileData.social_links?.tiktok ? <CheckCircle className="w-3 h-3 text-green-600" /> : <div className="w-3 h-3" />}
                          TikTok
                        </Label>
                        <Input
                          value={profileData.social_links.tiktok}
                          onChange={(e) => setProfileData({ 
                            ...profileData, 
                            social_links: { ...profileData.social_links, tiktok: e.target.value }
                          })}
                          disabled={!isEditing}
                          placeholder="@tuperfil"
                          className="h-10 mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ==================== TAB: AVAILABILITY ==================== */}
          {isProfessional && (
            <TabsContent value="availability">
              <AvailabilityCalendar
                disponibilidadTipo={profileData.disponibilidad_tipo}
                horarioApertura={profileData.horario_apertura}
                horarioCierre={profileData.horario_cierre}
                horariorDias={profileData.horario_dias}
                isEditing={isEditing}
                onChange={(data) => setProfileData({ ...profileData, ...data })}
              />
            </TabsContent>
          )}

          {/* ==================== TAB: FAQ ==================== */}
          {isProfessional && (
            <TabsContent value="faq">
              <FAQSection
                faqItems={profileData.faq_items || []}
                isEditing={isEditing}
                onFAQChange={(items) => setProfileData({ ...profileData, faq_items: items })}
              />
            </TabsContent>
          )}

          {/* ==================== TAB: INVOICING ==================== */}
          {isProfessional && (
            <TabsContent value="invoicing">
              <InvoicingSettingsForm
                settings={invoicingSettings}
                onSave={(data) => saveInvoicingSettingsMutation.mutate(data)}
              />
            </TabsContent>
          )}
                </Tabs>
              </div>
            </div>
          );
        })()}

        {/* SAVE BAR — sticky en móvil */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-4 py-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          <button
            onClick={handleSave}
            disabled={updateUserMutation.isPending || updateProfileMutation.isPending}
            className="w-full h-12 rounded-xl text-base font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: '#00255C' }}
          >
            {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            {t('saveChanges') || 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* DELETE ACCOUNT DIALOG */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta acción es permanente e irreversible. Se eliminarán:
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>Tu perfil profesional completo</li>
                <li>Todos tus mensajes y conversaciones</li>
                <li>Tu historial de clientes y trabajos</li>
                <li>Facturas y presupuestos</li>
                <li>Valoraciones recibidas</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Sí, eliminar mi cuenta'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}