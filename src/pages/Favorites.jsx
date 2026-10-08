import React, { useMemo } from "react";
import { getProfileSeoUrl } from '@/lib/seoUrl';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppData } from "@/lib/AppContext";
import { IconHeart, IconMessageSquare, IconStarOutline, IconMapPin, IconVerified, IconClose } from "@/components/Icons";
import { useTranslation } from "react-i18next";
import SEOHead from "../components/seo/SEOHead";
import OptimizedImage from "@/components/OptimizedImage";
import { optimizeSupabaseImage } from "@/lib/supabaseImage";

const NAVY = '#00255C';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAppData();

  const { data: rawFavorites = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Favorite.filter({ client_id: user.id });
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const professionalIds = useMemo(() => rawFavorites.map((fav) => fav.professional_id), [rawFavorites]);

  const { data: profilesData = {}, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['favoriteProfessionalsData', professionalIds.join(',')],
    queryFn: async () => {
      if (professionalIds.length === 0) return { profiles: [], users: [] };
      const [profiles, users] = await Promise.all([
        base44.entities.ProfessionalProfile.filter({}).then((all) =>
          all.filter((p) => professionalIds.includes(p.user_id)),
        ),
        base44.entities.User.filter({}).then((all) =>
          all.filter((u) => professionalIds.includes(u.id)),
        ),
      ]);
      return { profiles, users };
    },
    enabled: professionalIds.length > 0,
    staleTime: 60000,
  });

  const isInitialLoading = isLoadingFavorites || isLoadingProfiles;
  const { profiles = [], users = [] } = profilesData;

  const displayFavorites = useMemo(
    () => rawFavorites.filter((fav) => profiles.some((p) => p.user_id === fav.professional_id)),
    [rawFavorites, profiles],
  );

  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId) => base44.entities.Favorite.delete(favoriteId),
    onMutate: async (favoriteId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] });
      const previous = queryClient.getQueryData(['favorites', user?.id]);
      queryClient.setQueryData(['favorites', user?.id], (old = []) =>
        old.filter((f) => f.id !== favoriteId),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['favorites', user?.id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  const handleRemoveFavorite = (favoriteId) => removeFavoriteMutation.mutate(favoriteId);

  const handleStartChat = (professionalId) => {
    const conversationId = [user.id, professionalId].sort().join('_');
    navigate(createPageUrl("Messages") + `?conversation=${conversationId}&professional=${professionalId}`);
  };

  const handleOpenProfile = (profile) => {
    const slug = profile.slug_publico;
    // `getProfileSeoUrl` y no `/autonomo/${slug}`: la forma de un segmento
    // responde 404 en 53 de las 55 fichas, así que abrir un favorito
    // guardado llevaba a una página de error.
    if (slug) navigate(getProfileSeoUrl(profile));
    else navigate(createPageUrl("ProfessionalProfile") + `?id=${profile.user_id}`);
  };

  if (!user) {
    base44.auth.redirectToLogin();
    return null;
  }

  return (
    <>
      <SEOHead
        title={t('favorites.page.seoTitle')}
        description={t('favorites.page.seoDescription')}
      />

      <main className="min-h-screen bg-canvas">
        <div className="container-page max-w-3xl py-10 md:py-14">
          <header className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-c-muted mb-2">
              {t('favorites.page.eyebrow')}
            </p>
            <h1
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              style={{ color: NAVY, letterSpacing: '-0.02em' }}
            >
              {t('favorites.page.title')}
            </h1>
            <p className="mt-2 text-c-muted text-sm">
              {t('favorites.page.subtitle')}
            </p>
          </header>

          {isInitialLoading ? (
            <ul className="divide-y divide-c-border border-y border-c-border">
              {[0, 1, 2].map((i) => (
                <li key={i} className="py-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-soft animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-soft rounded animate-pulse w-1/3" />
                    <div className="h-2.5 bg-soft rounded animate-pulse w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          ) : displayFavorites.length === 0 ? (
            <div className="border border-c-border rounded-2xl px-6 py-12 text-center">
              <IconHeart className="w-8 h-8 text-c-border mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink mb-1">
                {t('favorites.page.emptyTitle')}
              </h2>
              <p className="text-sm text-c-muted mb-6 max-w-sm mx-auto">
                {t('favorites.page.emptyBody')}
              </p>
              <button
                type="button"
                onClick={() => navigate(createPageUrl("Search"))}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: NAVY }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#001A45')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = NAVY)}
              >
                {t('messages.find_pros_cta')}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-c-border border-y border-c-border">
              {displayFavorites.map((favorite) => {
                const profile = profiles.find((p) => p.user_id === favorite.professional_id);
                const profileUser = users.find((u) => u.id === favorite.professional_id);
                if (!profile) return null;

                const photoUrl =
                  profile.imagen_principal ||
                  (Array.isArray(profile.photos) && profile.photos[0]) ||
                  profileUser?.profile_picture ||
                  null;
                const isVerified = profile.identity_verified === true;
                const optimizedPhoto = optimizeSupabaseImage(photoUrl, { width: 96, height: 96 });
                const categoryLabel = profile.categories?.[0];
                const location = profile.ciudad
                  ? `${profile.ciudad}${profile.provincia && profile.ciudad !== profile.provincia ? `, ${profile.provincia}` : ''}`
                  : profile.provincia;

                return (
                  <li key={favorite.id} className="py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenProfile(profile)}
                        className="flex-shrink-0"
                        aria-label={t('favorites.page.viewProfileOf', { name: profile.business_name })}
                      >
                        <div className="relative flex shrink-0 overflow-hidden rounded-full w-12 h-12 ring-1 ring-c-border">
                          {optimizedPhoto ? (
                            <OptimizedImage
                              src={optimizedPhoto}
                              alt={profile.business_name || t('favorites.page.professionalProfileAlt')}
                              className="w-full h-full"
                              objectFit="cover"
                              width={48}
                              height={48}
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center rounded-full text-white font-semibold" style={{ background: NAVY }}>
                              {profile.business_name ? profile.business_name.charAt(0) : 'P'}
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProfile(profile)}
                          className="text-left block max-w-full"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink text-[15px] truncate">
                              {profile.business_name || t('favorites.page.unnamed')}
                            </span>
                            {isVerified && (
                              <IconVerified className="w-4 h-4 flex-shrink-0" style={{ color: NAVY }} aria-label={t('proProfile.badges.verified')} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-c-muted">
                            {categoryLabel && (
                              <span className="truncate" style={{ color: NAVY }}>{categoryLabel}</span>
                            )}
                            {location && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <IconMapPin className="w-3 h-3" aria-hidden="true" />
                                {location}
                              </span>
                            )}
                            {profile.average_rating > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <IconStarOutline className="w-3 h-3 fill-current text-star" />
                                {profile.average_rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartChat(favorite.professional_id)}
                          className="inline-flex items-center justify-center h-9 px-3 rounded-full text-xs font-semibold text-white transition-colors"
                          style={{ backgroundColor: NAVY }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#001A45')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = NAVY)}
                          aria-label={t('proProfile.contact.contactWith', { name: profile.business_name })}
                        >
                          <IconMessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          {t('profile_card.contact')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFavorite(favorite.id)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-c-muted hover:text-error hover:bg-error/10 transition-colors"
                          aria-label={t('favorites.page.removeAria', { name: profile.business_name })}
                          title={t('favorites.page.remove')}
                        >
                          <IconClose className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
