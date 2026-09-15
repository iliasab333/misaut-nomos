import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, ChevronRight } from "lucide-react";
import CampaignManageModal from "@/components/admin/CampaignManageModal";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  live: "bg-emerald-100 text-emerald-700",
  completed: "bg-gray-100 text-gray-500",
};

const CAMPAIGN_STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-500",
  in_review: "bg-blue-100 text-blue-700",
  creating: "bg-yellow-100 text-yellow-700",
  live: "bg-emerald-100 text-emerald-700",
  paused: "bg-orange-100 text-orange-700",
  finished: "bg-gray-100 text-gray-400",
};

const PLATFORM_LABELS = {
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
  google_search: "Google Search", linkedin: "LinkedIn",
};

export default function AdminAdsBriefings({ users = [] }) {
  const { t } = useTranslation();
  const [selectedBriefing, setSelectedBriefing] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // Antes constantes de módulo (STATUS_LABELS / CAMPAIGN_STATUS_LABELS); dentro para que sigan al idioma
  const statusLabels = {
    draft: t("admin.adsBriefings.status.draft"),
    submitted: t("admin.adsBriefings.status.submitted"),
    in_progress: t("admin.adsBriefings.status.inProgress"),
    approved: t("admin.adsBriefings.status.approved"),
    live: t("admin.adsBriefings.status.live"),
    completed: t("admin.adsBriefings.status.completed"),
  };
  const campaignStatusLabels = {
    pending: t("admin.adsBriefings.campaignStatus.pending"),
    in_review: t("admin.adsBriefings.campaignStatus.inReview"),
    creating: t("admin.adsBriefings.campaignStatus.creating"),
    live: t("admin.adsBriefings.campaignStatus.live"),
    paused: t("admin.adsBriefings.campaignStatus.paused"),
    finished: t("admin.adsBriefings.campaignStatus.finished"),
  };

  const { data: briefings = [], isLoading, refetch } = useQuery({
    queryKey: ["adsBriefings"],
    queryFn: () => base44.entities.AdsBriefing.list("-created_date", 200),
    staleTime: 1000 * 60,
  });

  const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const filtered = briefings.filter(b =>
    filterStatus === "all" || b.status === filterStatus
  );

  const getUserName = (professionalId) => {
    const u = users.find(u => u.id === professionalId);
    return u?.full_name || professionalId?.slice(0, 8) + "…";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t("admin.adsBriefings.title")}</h2>
          <p className="text-xs text-gray-500">{t("admin.adsBriefings.subtitle", { count: briefings.length, month: currentMonthYear })}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-4">
        {["all", "submitted", "in_progress", "approved", "live", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterStatus === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {s === "all" ? t("admin.adsBriefings.filterAll") : statusLabels[s]}
            {s !== "all" && (
              <span className="ml-1 opacity-60">
                ({briefings.filter(b => b.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-gray-400 text-sm">
            {t("admin.adsBriefings.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <Card
              key={b.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedBriefing(b)}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">
                      {b.professional_name || getUserName(b.professional_id)}
                    </span>
                    <span className="text-xs text-gray-400">{b.month_year}</span>
                    <span className="text-xs text-gray-500">{PLATFORM_LABELS[b.platform] || b.platform}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status]}`}>
                      {statusLabels[b.status]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAMPAIGN_STATUS_COLORS[b.campaign_status]}`}>
                      {campaignStatusLabels[b.campaign_status]}
                    </span>
                    {b.ads_content_approved && (
                      <span className="text-xs text-green-600 font-medium">{t("admin.adsBriefings.clientApproved")}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de gestión */}
      {selectedBriefing && (
        <CampaignManageModal
          briefing={selectedBriefing}
          users={users}
          onClose={() => setSelectedBriefing(null)}
          onUpdated={() => { refetch(); setSelectedBriefing(null); }}
        />
      )}
    </div>
  );
}