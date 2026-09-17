import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  IconArrowLeft, IconShare, IconHeart, IconMapPin, IconStarOutline, IconSuccess, IconAward,
  IconMessageCircle, IconPhone, IconZap, IconClock, IconGlobe,
  IconInstagram, IconFacebook, IconLinkedin, IconMusic, IconClose, IconChevronLeft, IconChevronRight,
  IconAlert, IconImage, IconWhatsApp
} from "@/components/Icons";
import Modal from "@/components/Modal";
import ReviewSection from "../components/profile/ReviewSection";
import SEOHead from "../components/seo/SEOHead";
import { LocalBusinessSchema } from "../components/seo/StructuredData";
import { toast } from "@/lib/toast";
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
      <IconStarOutline key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "fill-star text-star" : "text-c-border"}`} />
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
      <div className="min-h-screen bg-soft">
        <div className="h-14 bg-surface border-b border-c-border" />
        <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
          <div className="skeleton h-28 w-full rounded-2xl" />
          <div className="skeleton h-56 w-full rounded-2xl" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-soft flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm border border-c-border p-8 text-center">
          <IconAlert className="w-16 h-16 text-c-muted/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ink mb-2">{t("profileNotFound")}</h2>
          <p className="text-ink mb-6">{t("profileNotFoundDesc")}</p>
          <button type="button" onClick={() => navigate(createPageUrl("Search"))} className="btn-primary">
            ← {t("backToSearch")}
          </button>
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

      <div className="min-h-screen bg-soft pb-24 md:pb-10">

        {/* ── STICKY NAV ── */}
        <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-c-border px-4 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label={t("common.back")} className="w-9 h-9 rounded-full hover:bg-soft flex items-center justify-center transition-colors">
            <IconArrowLeft className="w-5 h-5 text-ink" />
          </button>
          <span className="text-sm text-c-muted flex-1 truncate font-medium">{profile.business_name}</span>
          <button onClick={handleShare} aria-label={t("profile_page.share_profile")} className="w-9 h-9 rounded-full hover:bg-soft flex items-center justify-center transition-colors">
            <IconShare className="w-4 h-4 text-c-muted" />
          </button>
          <button onClick={handleToggleFavorite} aria-label={isFavorite ? t("profile_page.saved_favorite") : t("profile_page.save_favorite")} className="w-9 h-9 rounded-full hover:bg-soft flex items-center justify-center transition-colors">
            <IconHeart className={`w-4 h-4 ${isFavorite ? "fill-error text-error" : "text-c-muted"}`} />
          </button>
        </div>

        {/* ── HERO MINIMALISTA ── */}
        <div className="bg-surface border-b border-c-border">
          <div className="max-w-3xl mx-auto px-4 py-6">

            {/* Fila 1: Avatar + info + favorito */}
            <div className="flex items-start gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt={profile.business_name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                  onClick={() => { setSelectedImage(photoUrl); setSelectedImageIndex(-1); }} />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-c-accent flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {profile.business_name?.charAt(0)?.toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-ink truncate">{profile.business_name}</h1>
                {profile.categories?.[0] && <p className="text-sm text-c-muted mt-0.5">{profile.categories[0]}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-c-muted flex-wrap">
                  {(profile.ciudad || profile.provincia) && (
                    <span className="flex items-center gap-1">
                      <IconMapPin className="w-3 h-3" />{[profile.ciudad, profile.provincia].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {profile.average_rating > 0 && (
                    <span className="flex items-center gap-1">
                      <IconStarOutline className="w-3 h-3 fill-star text-star" />
                      {profile.average_rating.toFixed(1)} ({profile.total_reviews})
                    </span>
                  )}
                </div>
              </div>

              <button onClick={handleToggleFavorite} aria-label={isFavorite ? t("profile_page.saved_favorite") : t("profile_page.save_favorite")} className="w-9 h-9 rounded-lg hover:bg-soft flex items-center justify-center flex-shrink-0 transition-colors">
                <IconHeart className={`w-4 h-4 ${isFavorite ? "fill-error text-error" : "text-c-muted"}`} />
              </button>
            </div>

            {/* Fila 2: Badges minimalistas */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs text-c-accent bg-c-accent/10 px-2 py-1 rounded-md border border-c-accent/30">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  {t("proProfile.badges.identityVerified")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-c-muted bg-soft px-2 py-1 rounded-md">
                  <IconSuccess className="w-3 h-3 text-success" /> {t("proProfile.badges.verified")}
                </span>
              )}
              {profile.years_experience > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-c-muted bg-soft px-2 py-1 rounded-md">
                  <IconAward className="w-3 h-3 text-c-muted" />
                  {t("proProfile.badges.yearsExperience", { count: profile.years_experience })}
                </span>
              )}
              {profile.tarifa_base > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-c-muted bg-soft px-2 py-1 rounded-md">
                  {t("proProfile.badges.fromRate", { price: profile.tarifa_base })}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-c-muted bg-soft px-2 py-1 rounded-md">
                <IconZap className="w-3 h-3 text-warning" /> {t("proProfile.badges.respondsInHour")}
              </span>
            </div>

            {/* Fila 3: Botones de contacto */}
            <div className="flex gap-2 mt-5 flex-wrap">
              {showChat && (
                <button onClick={handleStartChat}
                  className="flex-1 min-w-[140px] bg-ink hover:opacity-90 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <IconMessageCircle className="w-4 h-4" /> {t("proProfile.contact.sendMessage")}
                </button>
              )}

              {showWhatsApp && (
                <>
                  <a href={`https://wa.me/${cleanPhone(profile.telefono_contacto)}?text=${encodeURIComponent(t("proProfile.contact.whatsappPrefill"))}`}
                    target="_blank" rel="noopener noreferrer" onClick={trackContactClick}
                    className="md:hidden w-10 h-10 bg-whatsapp hover:bg-whatsapp-hover rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    aria-label={t("profile_page.whatsapp")}>
                    <IconWhatsApp className="w-4 h-4 text-white" />
                  </a>
                  <div className="hidden md:inline-flex items-center gap-1.5 bg-success/10 border border-success/20 text-success text-sm font-medium px-3 py-2 rounded-lg">
                    <IconWhatsApp className="w-3.5 h-3.5" />
                    {t("profile_page.whatsapp")}
                  </div>
                </>
              )}

              {showPhone && (
                <>
                  <a href={`tel:${cleanPhoneForCall(profile.telefono_contacto)}`} onClick={trackContactClick}
                    className="md:hidden w-10 h-10 bg-soft hover:bg-c-border rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    aria-label={t("callPhone")}>
                    <IconPhone className="w-4 h-4 text-ink" />
                  </a>
                  <button onClick={() => { trackContactClick(); setShowPhoneModal(true); }}
                    className="hidden md:inline-flex items-center gap-1.5 bg-soft border border-c-border text-ink text-sm font-medium px-3 py-2 rounded-lg hover:bg-c-border transition-colors">
                    <IconPhone className="w-3.5 h-3.5 text-c-muted" />
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
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h2 className="text-base font-bold text-ink mb-3">{t("aboutMe")}</h2>
                <p className="text-ink text-sm leading-relaxed whitespace-pre-line">
                  {profile.description || profile.descripcion_corta}
                </p>
              </section>
            )}

            {profile.photos?.length > 0 && (
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                  <IconImage className="w-4 h-4 text-c-accent" /> {t("workGalleryTitle")}
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {profile.photos.slice(0, 6).map((url, i) => (
                    <div key={i} onClick={() => { setSelectedImage(url); setSelectedImageIndex(i); }}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-soft">
                      <img src={url} alt={t("proProfile.gallery.workAlt", { number: i + 1 })} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {profile.services_offered?.length > 0 && (
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h2 className="text-base font-bold text-ink mb-3">{t("servicesOffered")}</h2>
                <div className="space-y-2">
                  {profile.services_offered.map((s, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-c-border hover:border-c-accent/30 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-semibold text-ink text-sm">{s.name}</h4>
                        {s.description && <p className="text-xs text-c-muted mt-0.5">{s.description}</p>}
                        {s.duration && <p className="text-xs text-c-muted mt-0.5">⏱ {s.duration} {s.unit || t("proProfile.services.hourUnit")}</p>}
                      </div>
                      {s.price && <span className="text-c-accent font-bold text-sm whitespace-nowrap">{s.price}€</span>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Redes sociales */}
            {(profile.website || profile.social_links?.facebook || profile.social_links?.instagram || profile.social_links?.linkedin || profile.social_links?.tiktok) && (
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h2 className="text-base font-bold text-ink mb-3">{t("socialNetworks")}</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-soft border border-c-border hover:border-ink rounded-xl px-3 py-2 text-sm font-medium text-ink transition-colors">
                      <IconGlobe className="w-4 h-4" /> {t("proProfile.social.web")}
                    </a>
                  )}
                  {profile.social_links?.instagram && (
                    <a href={profile.social_links.instagram} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-100 hover:border-pink-300 rounded-xl px-3 py-2 text-sm font-medium text-pink-700 transition-colors">
                      <IconInstagram className="w-4 h-4" /> {t("proProfile.social.instagram")}
                    </a>
                  )}
                  {profile.social_links?.facebook && (
                    <a href={profile.social_links.facebook} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-c-accent/10 border border-c-accent/20 hover:border-c-accent/40 rounded-xl px-3 py-2 text-sm font-medium text-c-accent transition-colors">
                      <IconFacebook className="w-4 h-4" /> {t("proProfile.social.facebook")}
                    </a>
                  )}
                  {profile.social_links?.linkedin && (
                    <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-c-accent/10 border border-c-accent/20 hover:border-c-accent/40 rounded-xl px-3 py-2 text-sm font-medium text-c-accent transition-colors">
                      <IconLinkedin className="w-4 h-4" /> {t("proProfile.social.linkedin")}
                    </a>
                  )}
                  {profile.social_links?.tiktok && (
                    <a href={profile.social_links.tiktok} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-soft border border-c-border hover:border-ink rounded-xl px-3 py-2 text-sm font-medium text-ink transition-colors">
                      <IconMusic className="w-4 h-4" /> {t("proProfile.social.tiktok")}
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Estadísticas (solo propietario) */}
            {isOwner && metrics && (
              <section className="bg-c-accent/10 rounded-2xl border border-c-accent/20 p-5">
                <h2 className="text-base font-bold text-ink mb-3">{t("statistics30Days")}</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[{ v: metrics.views, l: t("views") }, { v: metrics.searches, l: t("searches") }, { v: metrics.contacts, l: t("contacts") }].map(stat => (
                    <div key={stat.l} className="text-center p-3 bg-surface rounded-xl shadow-sm">
                      <p className="text-2xl font-bold text-ink">{stat.v}</p>
                      <p className="text-xs text-c-muted mt-1">{stat.l}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section className="bg-surface rounded-2xl border border-c-border p-5">
              <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                <IconStarOutline className="w-4 h-4 fill-star text-star" />
                {t("clientReviews")}
                {reviews.length > 0 && <span className="text-sm font-normal text-c-muted">({reviews.length})</span>}
              </h2>
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <IconStarOutline className="w-10 h-10 text-c-border mx-auto mb-2" />
                  <p className="text-ink font-medium text-sm">{t("noReviewsYet")}</p>
                  <p className="text-c-muted text-xs mt-1">{t("beFirstToReview")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r.id} className="border border-c-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-ink text-sm">{r.client_name || t("clientLabel")}</span>
                        <StarRow rating={r.rating || 0} />
                      </div>
                      {r.comment && <p className="text-sm text-c-muted leading-relaxed">{r.comment}</p>}
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
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h3 className="font-bold text-ink mb-3 flex items-center gap-2 text-sm">
                  <IconClock className="w-4 h-4 text-c-accent" /> {t("availability")}
                </h3>
                <p className="text-sm text-ink">
                  {profile.disponibilidad_tipo === "laborables" ? t("proProfile.availability.weekdays") :
                   profile.disponibilidad_tipo === "festivos" ? t("proProfile.availability.weekends") :
                   t("availableEveryDay")}
                </p>
                {profile.horario_apertura && profile.horario_cierre && (
                  <p className="text-xs text-c-muted mt-1">{profile.horario_apertura} – {profile.horario_cierre}</p>
                )}
              </section>
            )}

            {(profile.ciudad || profile.provincia) && (
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h3 className="font-bold text-ink mb-3 flex items-center gap-2 text-sm">
                  <IconMapPin className="w-4 h-4 text-c-accent" /> {t("serviceArea")}
                </h3>
                <p className="text-sm text-ink">{[profile.ciudad, profile.provincia].filter(Boolean).join(", ")}</p>
                {profile.radio_servicio_km > 0 && <p className="text-xs text-c-muted mt-1">{t("proProfile.serviceArea.radius", { km: profile.radio_servicio_km })}</p>}
                {profile.service_area && <p className="text-xs text-c-muted mt-1">{profile.service_area}</p>}
              </section>
            )}

            {profile.skills?.length > 0 && (
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h3 className="font-bold text-ink mb-3 text-sm">{t("skills")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s, i) => (
                    <span key={i} className="bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </section>
            )}

            {profile.certifications?.length > 0 && (
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h3 className="font-bold text-ink mb-3 flex items-center gap-2 text-sm">
                  <IconAward className="w-4 h-4 text-warning" /> {t("certificationsAndTitles")}
                </h3>
                <ul className="space-y-2">
                  {profile.certifications.map((c, i) => (
                    <li key={i} className="text-sm text-ink flex items-start gap-2">
                      <IconSuccess className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {profile.formas_pago?.length > 0 && (
              <section className="bg-surface rounded-2xl border border-c-border p-5">
                <h3 className="font-bold text-ink mb-3 text-sm">{t("proProfile.sections.paymentMethods")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.formas_pago.map((p, i) => (
                    <span key={i} className="bg-soft text-c-muted text-xs font-medium px-2.5 py-1 rounded-full border border-c-border">{p}</span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* ── CTA STICKY MÓVIL ── */}
      {!isOwner && showChat && (
        <div className="fixed bottom-0 inset-x-0 bg-surface border-t border-c-border p-3 md:hidden z-30 shadow-lg">
          <button onClick={handleStartChat}
            className="w-full bg-c-accent hover:bg-accent-hover text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all">
            <IconMessageCircle className="w-5 h-5" /> {t("proProfile.contact.contactWith", { name: firstName })}
          </button>
        </div>
      )}

      {/* ── MODAL TELÉFONO DESKTOP ── */}
      <Modal
        open={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        title={t("proProfile.phoneModal.title")}
        description={t("proProfile.phoneModal.description")}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-c-accent/10 rounded-xl border border-c-accent/20 w-full text-center">
            <p className="text-3xl font-bold text-c-accent tracking-wide">{profile.telefono_contacto}</p>
          </div>
          <button type="button"
            onClick={() => { navigator.clipboard.writeText(profile.telefono_contacto); setCopiedPhone(true); toast.success(t("proProfile.phoneModal.copied")); setTimeout(() => setCopiedPhone(false), 2000); }}
            className="btn-secondary w-full">
            {copiedPhone ? t("proProfile.phoneModal.copiedButton") : t("proProfile.phoneModal.copyButton")}
          </button>
        </div>
      </Modal>

      {/* ── LIGHTBOX ── */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button onClick={() => setSelectedImage(null)} aria-label={t("common.close")} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
            <IconClose className="w-6 h-6 text-white" />
          </button>
          {selectedImageIndex >= 0 && profile.photos?.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); const ni = selectedImageIndex === 0 ? profile.photos.length - 1 : selectedImageIndex - 1; setSelectedImageIndex(ni); setSelectedImage(profile.photos[ni]); }}
                aria-label={t("home.whyTrust.previous")}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10">
                <IconChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); const ni = selectedImageIndex === profile.photos.length - 1 ? 0 : selectedImageIndex + 1; setSelectedImageIndex(ni); setSelectedImage(profile.photos[ni]); }}
                aria-label={t("common.next")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10">
                <IconChevronRight className="w-6 h-6 text-white" />
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