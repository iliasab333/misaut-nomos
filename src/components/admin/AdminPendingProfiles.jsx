import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MapPin, Briefcase, Calendar } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminPendingProfiles({ profiles }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const pending = profiles.filter(p => p.estado_perfil === "pendiente");

  const handleApprove = async (profile) => {
    try {
      await base44.entities.ProfessionalProfile.update(profile.id, {
        estado_perfil: "activo",
        visible_en_busqueda: true,
      });
      toast.success(t("admin.pendingProfiles.toast.approved", { name: profile.business_name }));
      queryClient.invalidateQueries({ queryKey: ['professionalProfiles'] });
    } catch {
      toast.error(t("admin.pendingProfiles.toast.approveError"));
    }
  };

  const handleReject = async (profile) => {
    try {
      await base44.entities.ProfessionalProfile.update(profile.id, {
        estado_perfil: "suspendido",
        visible_en_busqueda: false,
      });
      toast.success(t("admin.pendingProfiles.toast.rejected", { name: profile.business_name }));
      queryClient.invalidateQueries({ queryKey: ['professionalProfiles'] });
    } catch {
      toast.error(t("admin.pendingProfiles.toast.rejectError"));
    }
  };

  if (pending.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">{t("admin.pendingProfiles.empty.title")}</p>
        <p className="text-sm">{t("admin.pendingProfiles.empty.description")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-gray-900">{t("admin.pendingProfiles.title")}</h2>
        <Badge className="bg-orange-100 text-orange-700">{pending.length}</Badge>
      </div>
      {pending.map(profile => (
        <Card key={profile.id} className="border border-orange-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900">{profile.business_name || t("admin.pendingProfiles.noName")}</h3>
                <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
                  {profile.categories?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {profile.categories[0]}
                    </span>
                  )}
                  {profile.provincia && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {profile.ciudad ? `${profile.ciudad}, ${profile.provincia}` : profile.provincia}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(profile.created_date).toLocaleDateString("es-ES")}
                  </span>
                </div>
                {profile.descripcion_corta && (
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{profile.descripcion_corta}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(profile)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t("admin.pendingProfiles.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => handleReject(profile)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {t("common.reject")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}