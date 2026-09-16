import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Share2, Heart, MapPin, Star, CheckCircle2, Award,
  MessageCircle, Phone, Zap, Clock, Globe, Euro,
  Instagram, Facebook, Linkedin, Music, X, ChevronLeft, ChevronRight,
  AlertCircle, Image
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReviewSection from "../components/profile/ReviewSection";
import SEOHead from "../components/seo/SEOHead";
import { LocalBusinessSchema } from "../components/seo/StructuredData";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import GuestContactModal from "@/components/GuestContactModal";

const cleanPhone = (phone) => {
  if (!phone) return "";
  let c = phone.replace(/\D/g, "");
  if (!c.startsWith("34") && c.length === 9) c = "34" + c;
  return c;
};

const cleanPhoneForCall = (phone) => {
  if (!phone) return "";
  let c = phone.replace(/[^\d+]/g, "");
  if (!c.startsWith("+")) c = "+34" + c;
  return c;
};

const StarRow = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "fill-yellow-500 text-yellow-500" : "text-gray-200"}`} />
    ))}
  </div>
);

export default function ProfessionalProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [guestModal, setGuestModal] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const professionalId = urlParams.get("id");

  useEffect(() => { loadUser(); }, []);
  useEffect(() => { checkIfFavorite(); }, [user, professionalId]);
  useEffect(() => { if (professionalId && user) trackProfileView(); }, [professionalId, user]);

  const loadUser = async () => {
    try { setUser(await base44.auth.me()); } catch { setUser(null); }
  };

  const checkIfFavorite = async () => {
    if (!user || !professionalId) return;
    try {
      const favs = await base44.entities.Favorite.filter({ client_id: user.id, professional_id: professionalId });
      setIsFavorite(favs.length > 0);
    } catch {}
  };

  const trackProfileView = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const existing = await base44.entities.ProfileMetrics.filter({ professional_id: professionalId, date: today });
      if (existing.length > 0) {
        await base44.entities.ProfileMetrics.update(existing[0].id, { profile_views: (existing[0].profile_views || 0) + 1 });
      } else {
        await base44.entities.ProfileMetrics.create({ professional_id: professionalId, date: today, profile_views: 1, search_appearances: 0, messages_received: 0, contact_clicks: 0 });
      }
    } catch {}
  };

  const trackContactClick = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const m = await base44.entities.ProfileMetrics.filter({ professional_id: professionalId, date: today });
      if (m.length > 0) await base44.entities.ProfileMetrics.update(m[0].id, { contact_clicks: (m[0].contact_clicks || 0) + 1 });
    } catch {}
  };

  const handleToggleFavorite = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    try {
      if (isFavorite) {
        const favs = await base44.entities.Favorite.filter({ client_id: user.id, professional_id: professionalId });
        if (favs[0]) await base44.entities.Favorite.delete(favs[0].id);
        setIsFavorite(false);
        toast.success(t("favorites.toast.removed"));
      } else {
        await base44.entities.Favorite.create({ client_id: user.id, professional_id: professionalId, business_name: profile?.business_name });
        setIsFavorite(true);
        toast.success(t("favorites.toast.added"));
      }
    } catch {}
  };

  // El mensaje va por EMAIL, no por una bandeja interna.
  //
  // Antes esto creaba una fila en `messages` y navegaba a /mensajes. Ese chat
  // se retiró: 10 mensajes en toda la vida de la web, el último hace un mes, y
  // khdemlidaba —la referencia de esta refonte— nunca lo tuvo: allí se
  // contacta por WhatsApp, por teléfono o por el formulario.
  //
  // El botón sigue donde estaba y sigue diciendo lo mismo; lo que cambia es
  // que el profesional recibe un correo (Edge Function `contact-professional`)
  // en vez de una notificación que tenía que ir a buscar. No hace falta tener
  // cuenta para escribir, que era la fricción de antes.
  const handleStartChat = () => {
    trackContactClick();
    setGuestModal(true);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: profile?.business_name, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success(t("proProfile.contact.linkCopied")); }
  };

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["professionalProfile", professionalId],
    queryFn: async () => {
      const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: professionalId });
      return profiles[0];
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: professionalUser } = useQuery({
    queryKey: ["professionalUser", professionalId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: professionalId });
      return users[0];
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", professionalId],
    queryFn: async () => {
      const all = await base44.entities.Review.filter({ professional_id: professionalId });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 2,
  });

  const { data: metrics } = useQuery({
    queryKey: ["profileMetrics", professionalId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const all = await base44.entities.ProfileMetrics.filter({ professional_id: professionalId });
      const recent = all.filter(m => new Date(m.date) >= thirtyDaysAgo);
      return {
        views: recent.reduce((s, m) => s + (m.profile_views || 0), 0),
        searches: recent.reduce((s, m) => s + (m.search_appearances || 0), 0),
        contacts: recent.reduce((s, m) => s + (m.contact_clicks || 0), 0),
      };
    },
    enabled: !!professionalId && user?.id === professionalId,
    staleTime: 1000 * 60 * 5,
  });

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-14 bg-white border-b border-gray-100" />
        <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("profileNotFound")}</h2>
          <p className="text-gray-700 mb-6">{t("profileNotFoundDesc")}</p>
          <Button onClick={() => navigate(createPageUrl("Search"))} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            ← {t("backToSearch")}
          </Button>
        </div>
      </div>
    );
  }

  const photoUrl = professionalUser?.profile_picture || profile.imagen_principal;
  const isOwner = user?.id === professionalId;
  const showPhone = profile.metodos_contacto?.includes("telefono") && profile.telefono_contacto;
  const showWhatsApp = profile.metodos_contacto?.includes("whatsapp") && profile.telefono_contacto;
  const showChat = profile.metodos_contacto?.includes("chat_interno");
  const firstName = profile.business_name?.split(" ")[0] || profile.business_name;
  const isVerified = profile.identity_verified === true;

  const seoCity = profile.ciudad || profile.provincia;
  const seoTitle = t("proProfile.seo.title", { name: profile.business_name, category: profile.categories?.[0] || t("proProfile.seo.defaultCategory"), city: seoCity });
  const seoDescription = profile.descripcion_corta || t("proProfile.seo.description", { name: profile.business_name, city: seoCity });

  return (
    <>
      <SEOHead title={seoTitle} description={seoDescription} keywords={t("proProfile.seo.keywords", { categories: profile.categories?.join(", "), city: profile.ciudad })} type="profile" />
      <LocalBusinessSchema profile={profile} reviews={reviews} professionalUser={professionalUser} />

      <div className="min-h-screen bg-gray-50 pb-24 md:pb-10">

        {/* ── STICKY NAV ── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-sm text-gray-600 flex-1 truncate font-medium">{profile.business_name}</span>
          <button onClick={handleShare} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <Share2 className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={handleToggleFavorite} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
          </button>
        </div>

        {/* ── HERO MINIMALISTA ── */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-6">

            {/* Fila 1: Avatar + info + favorito */}
            <div className="flex items-start gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt={profile.business_name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                  onClick={() => { setSelectedImage(photoUrl); setSelectedImageIndex(-1); }} />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {profile.business_name?.charAt(0)?.toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 truncate">{profile.business_name}</h1>
                {profile.categories?.[0] && <p className="text-sm text-gray-600 mt-0.5">{profile.categories[0]}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 flex-wrap">
                  {(profile.ciudad || profile.provincia) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{[profile.ciudad, profile.provincia].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {profile.average_rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      {profile.average_rating.toFixed(1)} ({profile.total_reviews})
                    </span>
                  )}
                </div>
              </div>

              <button onClick={handleToggleFavorite} className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors">
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
              </button>
            </div>

            {/* Fila 2: Badges minimalistas */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  {t("proProfile.badges.identityVerified")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                  <CheckCircle2 className="w-3 h-3 text-green-600" /> {t("proProfile.badges.verified")}
                </span>
              )}
              {profile.years_experience > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                  <Award className="w-3 h-3 text-gray-400" />
                  {t("proProfile.badges.yearsExperience", { count: profile.years_experience })}
                </span>
              )}
              {profile.tarifa_base > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                  {t("proProfile.badges.fromRate", { price: profile.tarifa_base })}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                <Zap className="w-3 h-3 text-amber-500" /> {t("proProfile.badges.respondsInHour")}
              </span>
            </div>

            {/* Fila 3: Botones de contacto */}
            <div className="flex gap-2 mt-5 flex-wrap">
              {showChat && (
                <button onClick={handleStartChat}
                  className="flex-1 min-w-[140px] bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <MessageCircle className="w-4 h-4" /> {t("proProfile.contact.sendMessage")}
                </button>
              )}

              {showWhatsApp && (
                <>
                  <a href={`https://wa.me/${cleanPhone(profile.telefono_contacto)}?text=${encodeURIComponent(t("proProfile.contact.whatsappPrefill"))}`}
                    target="_blank" rel="noopener noreferrer" onClick={trackContactClick}
                    className="md:hidden w-10 h-10 bg-green-500 hover:bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    aria-label={t("profile_page.whatsapp")}>
                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                  <div className="hidden md:inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-sm font-medium px-3 py-2 rounded-lg">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                    {t("profile_page.whatsapp")}
                  </div>
                </>
              )}

              {showPhone && (
                <>
                  <a href={`tel:${cleanPhoneForCall(profile.telefono_contacto)}`} onClick={trackContactClick}
                    className="md:hidden w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    aria-label={t("callPhone")}>
                    <Phone className="w-4 h-4 text-gray-700" />
                  </a>
                  <button onClick={() => { trackContactClick(); setShowPhoneModal(true); }}
                    className="hidden md:inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="select-all">{profile.telefono_contacto}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTENT GRID ── */}
        <div className="max-w-3xl mx-auto px-4 mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Columna principal 2/3 */}
          <div className="md:col-span-2 space-y-4">

            {(profile.description || profile.descripcion_corta) && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-3">{t("aboutMe")}</h2>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {profile.description || profile.descripcion_corta}
                </p>
              </section>
            )}

            {profile.photos?.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4 text-blue-600" /> {t("workGalleryTitle")}
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {profile.photos.slice(0, 6).map((url, i) => (
                    <div key={i} onClick={() => { setSelectedImage(url); setSelectedImageIndex(i); }}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-gray-100">
                      <img src={url} alt={t("proProfile.gallery.workAlt", { number: i + 1 })} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {profile.services_offered?.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-3">{t("servicesOffered")}</h2>
                <div className="space-y-2">
                  {profile.services_offered.map((s, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{s.name}</h4>
                        {s.description && <p className="text-xs text-gray-600 mt-0.5">{s.description}</p>}
                        {s.duration && <p className="text-xs text-gray-600 mt-0.5">⏱ {s.duration} {s.unit || t("proProfile.services.hourUnit")}</p>}
                      </div>
                      {s.price && <span className="text-blue-600 font-bold text-sm whitespace-nowrap">{s.price}€</span>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Redes sociales */}
            {(profile.website || profile.social_links?.facebook || profile.social_links?.instagram || profile.social_links?.linkedin || profile.social_links?.tiktok) && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-3">{t("socialNetworks")}</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors">
                      <Globe className="w-4 h-4" /> {t("proProfile.social.web")}
                    </a>
                  )}
                  {profile.social_links?.instagram && (
                    <a href={profile.social_links.instagram} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-100 hover:border-pink-300 rounded-xl px-3 py-2 text-sm font-medium text-pink-700 transition-colors">
                      <Instagram className="w-4 h-4" /> {t("proProfile.social.instagram")}
                    </a>
                  )}
                  {profile.social_links?.facebook && (
                    <a href={profile.social_links.facebook} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 hover:border-blue-300 rounded-xl px-3 py-2 text-sm font-medium text-blue-700 transition-colors">
                      <Facebook className="w-4 h-4" /> {t("proProfile.social.facebook")}
                    </a>
                  )}
                  {profile.social_links?.linkedin && (
                    <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 hover:border-blue-300 rounded-xl px-3 py-2 text-sm font-medium text-blue-800 transition-colors">
                      <Linkedin className="w-4 h-4" /> {t("proProfile.social.linkedin")}
                    </a>
                  )}
                  {profile.social_links?.tiktok && (
                    <a href={profile.social_links.tiktok} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors">
                      <Music className="w-4 h-4" /> {t("proProfile.social.tiktok")}
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Estadísticas (solo propietario) */}
            {isOwner && metrics && (
              <section className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-3">{t("statistics30Days")}</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[{ v: metrics.views, l: t("views") }, { v: metrics.searches, l: t("searches") }, { v: metrics.contacts, l: t("contacts") }].map(stat => (
                    <div key={stat.l} className="text-center p-3 bg-white rounded-xl shadow-sm">
                      <p className="text-2xl font-bold text-gray-900">{stat.v}</p>
                      <p className="text-xs text-gray-600 mt-1">{stat.l}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                {t("clientReviews")}
                {reviews.length > 0 && <span className="text-sm font-normal text-gray-600">({reviews.length})</span>}
              </h2>
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-700 font-medium text-sm">{t("noReviewsYet")}</p>
                  <p className="text-gray-600 text-xs mt-1">{t("beFirstToReview")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-gray-900 text-sm">{r.client_name || t("clientLabel")}</span>
                        <StarRow rating={r.rating || 0} />
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
              <ReviewSection professionalId={professionalId} reviews={reviews} currentUser={user} />
            </section>
          </div>

          {/* Columna lateral 1/3 */}
          <div className="space-y-4">

            {(profile.horario_apertura || profile.disponibilidad_tipo) && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-600" /> {t("availability")}
                </h3>
                <p className="text-sm text-gray-700">
                  {profile.disponibilidad_tipo === "laborables" ? t("proProfile.availability.weekdays") :
                   profile.disponibilidad_tipo === "festivos" ? t("proProfile.availability.weekends") :
                   t("availableEveryDay")}
                </p>
                {profile.horario_apertura && profile.horario_cierre && (
                  <p className="text-xs text-gray-600 mt-1">{profile.horario_apertura} – {profile.horario_cierre}</p>
                )}
              </section>
            )}

            {(profile.ciudad || profile.provincia) && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-blue-600" /> {t("serviceArea")}
                </h3>
                <p className="text-sm text-gray-700">{[profile.ciudad, profile.provincia].filter(Boolean).join(", ")}</p>
                {profile.radio_servicio_km > 0 && <p className="text-xs text-gray-600 mt-1">{t("proProfile.serviceArea.radius", { km: profile.radio_servicio_km })}</p>}
                {profile.service_area && <p className="text-xs text-gray-500 mt-1">{profile.service_area}</p>}
              </section>
            )}

            {profile.skills?.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">{t("skills")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s, i) => (
                    <span key={i} className="bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </section>
            )}

            {profile.certifications?.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-amber-500" /> {t("certificationsAndTitles")}
                </h3>
                <ul className="space-y-2">
                  {profile.certifications.map((c, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {profile.formas_pago?.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">{t("proProfile.sections.paymentMethods")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.formas_pago.map((p, i) => (
                    <span key={i} className="bg-gray-50 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200">{p}</span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* ── CTA STICKY MÓVIL ── */}
      {!isOwner && showChat && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-3 md:hidden z-30 shadow-lg">
          <button onClick={handleStartChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all">
            <MessageCircle className="w-5 h-5" /> {t("proProfile.contact.contactWith", { name: firstName })}
          </button>
        </div>
      )}

      {/* ── MODAL TELÉFONO DESKTOP ── */}
      <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("proProfile.phoneModal.title")}</DialogTitle>
            <DialogDescription>{t("proProfile.phoneModal.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 w-full text-center">
              <p className="text-3xl font-bold text-blue-700 tracking-wide">{profile.telefono_contacto}</p>
            </div>
            <Button onClick={() => { navigator.clipboard.writeText(profile.telefono_contacto); setCopiedPhone(true); toast.success(t("proProfile.phoneModal.copied")); setTimeout(() => setCopiedPhone(false), 2000); }}
              variant="outline" className="w-full">
              {copiedPhone ? t("proProfile.phoneModal.copiedButton") : t("proProfile.phoneModal.copyButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── LIGHTBOX ── */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
            <X className="w-6 h-6 text-white" />
          </button>
          {selectedImageIndex >= 0 && profile.photos?.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); const ni = selectedImageIndex === 0 ? profile.photos.length - 1 : selectedImageIndex - 1; setSelectedImageIndex(ni); setSelectedImage(profile.photos[ni]); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); const ni = selectedImageIndex === profile.photos.length - 1 ? 0 : selectedImageIndex + 1; setSelectedImageIndex(ni); setSelectedImage(profile.photos[ni]); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1.5 rounded-full">
                <span className="text-white text-sm">{selectedImageIndex + 1} / {profile.photos.length}</span>
              </div>
            </>
          )}
          <img src={selectedImage} alt={t("proProfile.gallery.enlargedAlt")} className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {guestModal && (
        <GuestContactModal
          professional={profile}
          onClose={() => setGuestModal(false)}
        />
      )}
    </>
  );
}