import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppData } from "@/lib/AppContext";
import { Heart, MessageSquare, Star, MapPin, BadgeCheck, X } from "lucide-react";
import { useLanguage } from "../components/ui/LanguageSwitcher";
import SEOHead from "../components/seo/SEOHead";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import OptimizedImage from "../components/ui/OptimizedImage";
import { optimizeSupabaseImage } from "@/lib/supabaseImage";

const NAVY = '#00255C';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
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
    if (slug) navigate(`/autonomo/${slug}`);
    else navigate(createPageUrl("ProfessionalProfile") + `?id=${profile.user_id}`);
  };

  if (!user) {
    base44.auth.redirectToLogin();
    return null;
  }

  return (
    <>
      <SEOHead
        title={`${t('myFavorites') || 'Mis favoritos'} · MisAutónomos`}
        description="Tus profesionales guardados"
      />

      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
          <header className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
              Mi cuenta
            </p>
            <h1
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              style={{ color: NAVY, letterSpacing: '-0.02em' }}
            >
              Mis favoritos
            </h1>
            <p className="mt-2 text-slate-500 text-sm">
              Los autónomos que has guardado. Toca el corazón en cualquier perfil para añadirlos.
            </p>
          </header>

          {isInitialLoading ? (
            <ul className="divide-y divide-slate-100 border-y border-slate-100">
              {[0, 1, 2].map((i) => (
                <li key={i} className="py-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded animate-pulse w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          ) : displayFavorites.length === 0 ? (
            <div className="border border-slate-200 rounded-2xl px-6 py-12 text-center">
              <Heart className="w-8 h-8 text-slate-300 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Aún no tienes favoritos
              </h2>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Cuando guardes un autónomo, aparecerá aquí para que puedas volver a contactarle en un toque.
              </p>
              <button
                type="button"
                onClick={() => navigate(createPageUrl("Search"))}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: NAVY }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#001A45')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = NAVY)}
              >
                Buscar autónomos
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 border-y border-slate-100">
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
                const optimizedPhoto = optimizeSupabaseImage(photoUrl, { width: 96 });
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
                        aria-label={`Ver perfil de ${profile.business_name}`}
                      >
                        <Avatar className="w-12 h-12 ring-1 ring-slate-200">
                          {optimizedPhoto ? (
                            <OptimizedImage
                              src={optimizedPhoto}
                              alt={profile.business_name || 'Perfil profesional'}
                              className="w-full h-full"
                              objectFit="cover"
                              width={48}
                              height={48}
                            />
                          ) : (
                            <AvatarFallback className="text-white font-semibold" style={{ background: NAVY }}>
                              {profile.business_name ? profile.business_name.charAt(0) : 'P'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProfile(profile)}
                          className="text-left block max-w-full"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 text-[15px] truncate">
                              {profile.business_name || 'Sin nombre'}
                            </span>
                            {isVerified && (
                              <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: NAVY }} aria-label="Verificado" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            {categoryLabel && (
                              <span className="truncate" style={{ color: NAVY }}>{categoryLabel}</span>
                            )}
                            {location && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3" aria-hidden="true" />
                                {location}
                              </span>
                            )}
                            {profile.average_rating > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current text-amber-400" />
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
                          aria-label={`Contactar con ${profile.business_name}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          Contactar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFavorite(favorite.id)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          aria-label={`Quitar a ${profile.business_name} de favoritos`}
                          title="Quitar de favoritos"
                        >
                          <X className="w-4 h-4" />
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
