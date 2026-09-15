import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, TrendingDown } from "lucide-react";
import { subDays } from "date-fns";

export default function AdminMetrics({ metrics, profiles, messages }) {
  const { t } = useTranslation();
  // Filter out "system" entries
  const validMetrics = useMemo(() => metrics.filter(m => m.professional_id && m.professional_id !== "system"), [metrics]);

  // Top 5 by profile views
  const topByViews = useMemo(() => {
    const byPro = {};
    validMetrics.forEach(m => {
      byPro[m.professional_id] = (byPro[m.professional_id] || 0) + (m.profile_views || 0);
    });
    return Object.entries(byPro)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, views]) => ({ id, views, profile: profiles.find(p => p.user_id === id) }));
  }, [validMetrics, profiles]);

  // Top 5 by messages received
  const topByMessages = useMemo(() => {
    const byPro = {};
    messages.forEach(m => {
      if (m.recipient_id) byPro[m.recipient_id] = (byPro[m.recipient_id] || 0) + 1;
    });
    return Object.entries(byPro)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count, profile: profiles.find(p => p.user_id === id) }));
  }, [messages, profiles]);

  // Pros with no activity in 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const inactiveProfiles = useMemo(() => {
    const activeIds = new Set(
      validMetrics
        .filter(m => {
          try { return new Date(m.date) >= thirtyDaysAgo; } catch { return false; }
        })
        .map(m => m.professional_id)
    );
    return profiles.filter(p => p.visible_en_busqueda && !activeIds.has(p.user_id));
  }, [validMetrics, profiles]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">{t("admin.metrics.title")}</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              {t("admin.metrics.topViews")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topByViews.length === 0 ? (
              <p className="text-sm text-gray-400">{t("admin.metrics.noMetrics")}</p>
            ) : (
              <div className="space-y-2">
                {topByViews.map(({ id, views, profile }, i) => (
                  <div key={id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                      <span className="text-sm text-gray-800 font-medium">{profile?.business_name || id.slice(0, 8) + "..."}</span>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700">{t("admin.metrics.viewsCount", { count: views })}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500" />
              {t("admin.metrics.topMessages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topByMessages.length === 0 ? (
              <p className="text-sm text-gray-400">{t("admin.metrics.noMessages")}</p>
            ) : (
              <div className="space-y-2">
                {topByMessages.map(({ id, count, profile }, i) => (
                  <div key={id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                      <span className="text-sm text-gray-800 font-medium">{profile?.business_name || id.slice(0, 8) + "..."}</span>
                    </div>
                    <Badge className="bg-green-50 text-green-700">{t("admin.metrics.messagesCount", { count })}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            {t("admin.metrics.inactiveTitle", { count: inactiveProfiles.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inactiveProfiles.length === 0 ? (
            <p className="text-sm text-gray-400">{t("admin.metrics.allActive")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inactiveProfiles.slice(0, 20).map(p => (
                <Badge key={p.id} variant="outline" className="text-gray-500">
                  {p.business_name || t("admin.metrics.noName")}
                </Badge>
              ))}
              {inactiveProfiles.length > 20 && (
                <Badge variant="outline" className="text-gray-400">{t("admin.metrics.more", { count: inactiveProfiles.length - 20 })}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}