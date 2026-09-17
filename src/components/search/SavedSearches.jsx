import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/Modal";
import { IconBookmark, IconTrash } from "@/components/Icons";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

export default function SavedSearches({ user, currentFilters, resultsCount, onLoadSearch }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [searchName, setSearchName] = React.useState("");
  const nameInputRef = React.useRef(null);

  // Modal enfoca su primer control (la ✕ de la cabecera) en un efecto
  // propio; al ser hijo, ese efecto corre ANTES que este, así que aquí
  // recuperamos el foco para el campo del nombre — el comportamiento que
  // daba `autoFocus` con el Dialog de Radix.
  React.useEffect(() => {
    if (!showSaveDialog) return;
    nameInputRef.current?.focus();
  }, [showSaveDialog]);

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.SavedSearch.filter({ user_id: user.id }, '-created_date', 10);
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.SavedSearch.create({
        user_id: user.id,
        search_name: data.name,
        filters: currentFilters,
        results_count: resultsCount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      setShowSaveDialog(false);
      setSearchName("");
      toast.success(t('search.saved.savedToast'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.SavedSearch.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      toast.success(t('search.saved.deletedToast'));
    },
  });

  const hasActiveFilters = currentFilters.category !== "all" ||
                          currentFilters.provincia !== "all" ||
                          currentFilters.ciudad !== "all" ||
                          currentFilters.minRating > 0 ||
                          currentFilters.availability !== "all";

  if (!user || savedSearches.length === 0 && !hasActiveFilters) return null;

  return (
    <div className="mb-4">
      {savedSearches.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {savedSearches.map((search) => (
            <div key={search.id} className="card p-3 flex items-center gap-3 bg-purple-50 border-purple-200 flex-shrink-0">
              <button
                onClick={() => onLoadSearch(search.filters)}
                aria-label={t('search.saved.loadAria', { name: search.search_name })}
                className="flex items-center gap-2 hover:text-purple-700 transition-colors"
              >
                <IconBookmark size={16} className="text-purple-600" aria-hidden="true" />
                <span className="text-sm font-medium">{search.search_name}</span>
                <span className="badge-outline">
                  {search.results_count}
                </span>
              </button>
              <button
                type="button"
                aria-label={t('search.saved.deleteAria', { name: search.search_name })}
                className="btn-icon shrink-0 text-c-muted hover:bg-error/10 hover:text-error"
                onClick={() => deleteMutation.mutate(search.id)}
              >
                <IconTrash size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {hasActiveFilters && user && (
        <button
          type="button"
          onClick={() => setShowSaveDialog(true)}
          className="btn btn-sm bg-surface border border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          <IconBookmark size={16} />
          {t('search.saved.saveThis')}
        </button>
      )}

      <Modal
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        title={t('search.saved.title')}
      >
        <div className="space-y-4 py-4">
          <label htmlFor="saved-search-name" className="sr-only">{t('search.saved.namePlaceholder')}</label>
          <input
            id="saved-search-name"
            className="input"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder={t('search.saved.namePlaceholder')}
            ref={nameInputRef}
          />
          <div className="bg-soft p-3 rounded-lg text-sm text-ink">
            <p className="font-medium mb-1">{t('search.saved.filtersIntro')}</p>
            <ul className="space-y-1 text-xs">
              {currentFilters.category !== "all" && <li>{t('search.saved.filterCategory', { value: currentFilters.category })}</li>}
              {currentFilters.provincia !== "all" && <li>{t('search.saved.filterProvince', { value: currentFilters.provincia })}</li>}
              {currentFilters.ciudad !== "all" && <li>{t('search.saved.filterCity', { value: currentFilters.ciudad })}</li>}
              {currentFilters.minRating > 0 && <li>{t('search.saved.filterMinRating', { value: currentFilters.minRating })}</li>}
              {currentFilters.availability !== "all" && <li>{t('search.saved.filterAvailability', { value: currentFilters.availability })}</li>}
            </ul>
            <p className="mt-2 text-purple-700 font-medium">{t('search.saved.resultsFound', { count: resultsCount })}</p>
          </div>
        </div>
        <div className="mt-2 flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => setShowSaveDialog(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate({ name: searchName })}
            disabled={!searchName.trim() || saveMutation.isPending}
            className="btn bg-purple-600 text-white hover:bg-purple-700"
          >
            {t('search.saved.title')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
