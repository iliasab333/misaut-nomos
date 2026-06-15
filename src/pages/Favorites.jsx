import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppData } from "@/lib/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Loader2, Star, X, MapPin } from "lucide-react";
import { useLanguage } from "../components/ui/LanguageSwitcher";
import SEOHead from "../components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import OptimizedImage from "../components/ui/OptimizedImage";
import { optimizeSupabaseImage } from "@/lib/supabaseImage";

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

  const professionalIds = useMemo(() => rawFavorites.map(fav => fav.professional_id), [rawFavorites]);

  const { data: profilesData = {}, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['favoriteProfessionalsData', professionalIds.join(',')],
    queryFn: async () => {
      if (professionalIds.length === 0) return { profiles: [], users: [] };
      const [profiles, users] = await Promise.all([
        base44.entities.ProfessionalProfile.filter({}).then(all => 
          all.filter(p => professionalIds.includes(p.user_id))
        ),
        base44.entities.User.filter({}).then(all => 
          all.filter(u => professionalIds.includes(u.id))
        )
      ]);
      return { profiles, users };
    },
    enabled: professionalIds.length > 0,
    staleTime: 60000,
  });

  const isInitialLoading = isLoadingFavorites || isLoadingProfiles;

  const { profiles = [], users = [] } = profilesData;

  const displayFavorites = useMemo(() => 
    rawFavorites.filter(fav => profiles.some(p => p.user_id === fav.professional_id)),
    [rawFavorites, profiles]
  );

  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId) => base44.entities.Favorite.delete(favoriteId),
    onMutate: async (favoriteId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] });
      const previous = queryClient.getQueryData(['favorites', user?.id]);
      queryClient.setQueryData(['favorites', user?.id], (old = []) =>
        old.filter(f => f.id !== favoriteId)
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

  const handleRemoveFavorite = (favoriteId) => {
    removeFavoriteMutation.mutate(favoriteId);
  };

  const handleStartChat = (professionalId, professionalName) => {
    const conversationId = [user.id, professionalId].sort().join('_');
    navigate(createPageUrl("Messages") + `?conversation=${conversationId}&professional=${professionalId}`);
  };

  if (!user) {
    base44.auth.redirectToLogin();
    return null;
  }

  return (
    <>
      <SEOHead
        title={`${t('myFavorites')} - MisAutónomos`}
        description="Gestiona tus profesionales favoritos guardados"
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('myFavorites')}</h1>
            <p className="text-gray-600">{t('addFavorites')}</p>
          </div>

          {displayFavorites.length === 0 ? (
            <Card className="p-12 text-center border-0 shadow-lg">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('noFavorites')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('addFavorites')}
              </p>
              <Button
                onClick={() => navigate(createPageUrl("Search"))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t('searchFreelancers')}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayFavorites.map((favorite) => {
                const profile = profiles.find(p => p.user_id === favorite.professional_id);
                const profileUser = users.find(u => u.id === favorite.professional_id);

                if (!profile) return null;

                return (
                  <Card
                    key={favorite.id}
                    className="overflow-hidden hover:shadow-xl transition-shadow border-0 bg-white"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <Avatar className="w-12 h-12 border-2 border-blue-600 cursor-pointer"
                          onClick={() => navigate(createPageUrl("ProfessionalProfile") + `?id=${profile.user_id}`)}
                        >
                          {profileUser?.profile_picture ? (
                            <OptimizedImage
                              src={optimizeSupabaseImage(profileUser.profile_picture, { width: 96 })}
                              alt={profile.business_name || "Professional profile picture"}
                              className="w-full h-full"
                              objectFit="cover"
                              width={48}
                              height={48}
                            />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold">
                              {profile.business_name ? profile.business_name.charAt(0) : 'P'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <h3
                            className="font-bold text-lg text-gray-900 cursor-pointer hover:text-blue-700 transition-colors"
                            onClick={() => navigate(createPageUrl("ProfessionalProfile") + `?id=${profile.user_id}`)}
                          >
                            {profile.business_name}
                          </h3>
                          {profile.average_rating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              <span className="text-sm font-semibold">{profile.average_rating.toFixed(1)}</span>
                              <span className="text-xs text-gray-500">({profile.total_reviews})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {profile.categories?.slice(0, 2).map((cat, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {t(cat)}
                          </Badge>
                        ))}
                      </div>

                      {profile.service_area && (
                        <div className="flex items-center gap-2 mb-4">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{profile.service_area}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFavorite(favorite.id)}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {t('remove')}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleStartChat(favorite.professional_id, profile.business_name)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {t('contact')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}