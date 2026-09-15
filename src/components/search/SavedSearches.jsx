import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function SavedSearches({ user, currentFilters, resultsCount, onLoadSearch }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [searchName, setSearchName] = React.useState("");

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
            <Card key={search.id} className="p-3 flex items-center gap-3 bg-purple-50 border-purple-200 flex-shrink-0">
              <button
                onClick={() => onLoadSearch(search.filters)}
                aria-label={t('search.saved.loadAria', { name: search.search_name })}
                className="flex items-center gap-2 hover:text-purple-700 transition-colors"
              >
                <Bookmark className="w-4 h-4 text-purple-600" aria-hidden="true" />
                <span className="text-sm font-medium">{search.search_name}</span>
                <Badge variant="outline" className="text-xs">
                  {search.results_count}
                </Badge>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('search.saved.deleteAria', { name: search.search_name })}
                className="h-6 w-6 hover:bg-red-100 hover:text-red-600"
                onClick={() => deleteMutation.mutate(search.id)}
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {hasActiveFilters && user && (
        <Button
          onClick={() => setShowSaveDialog(true)}
          variant="outline"
          size="sm"
          className="border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          {t('search.saved.saveThis')}
        </Button>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('search.saved.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder={t('search.saved.namePlaceholder')}
              autoFocus
            />
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ name: searchName })}
              disabled={!searchName.trim() || saveMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {t('search.saved.title')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}