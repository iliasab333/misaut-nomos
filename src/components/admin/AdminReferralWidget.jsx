import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Gift, Users, Trophy } from "lucide-react";

export default function AdminReferralWidget() {
  const { t } = useTranslation();
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["adminReferralLeaderboard"],
    queryFn: () => base44.entities.ProfessionalProfile.list(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["adminReferrals"],
    queryFn: () => base44.entities.Referral.list(),
    staleTime: 1000 * 60 * 5,
  });

  const top5 = profiles
    .filter(p => (p.referral_count || 0) > 0)
    .sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0))
    .slice(0, 5);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const qualifiedThisMonth = referrals.filter(r => {
    if (!["qualified", "rewarded"].includes(r.status)) return false;
    const d = new Date(r.qualified_at || r.updated_date || r.created_date);
    return d >= firstOfMonth;
  }).length;

  const totalQualified = referrals.filter(r => ["qualified", "rewarded"].includes(r.status)).length;
  const totalPending = referrals.filter(r => r.status === "pending").length;

  const medals = ["🥇", "🥈", "🥉", t("admin.referralWidget.fourth"), t("admin.referralWidget.fifth")];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Gift className="w-4 h-4 text-amber-500" />
        {t("admin.referralWidget.title")}
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4 mt-3">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-800">{qualifiedThisMonth}</p>
          <p className="text-xs text-green-700">{t("admin.referralWidget.qualifiedThisMonth")}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-800">{totalQualified}</p>
          <p className="text-xs text-blue-700">{t("admin.referralWidget.totalQualified")}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-800">{totalPending}</p>
          <p className="text-xs text-amber-700">{t("admin.referralWidget.pending")}</p>
        </div>
      </div>

      {/* Top 5 referidores */}
      <div className="flex items-center gap-1.5 mb-2">
        <Trophy className="w-3.5 h-3.5 text-amber-500" />
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("admin.referralWidget.topReferrers")}</p>
      </div>

      {top5.length === 0 ? (
        <div className="text-center py-4">
          <Users className="w-8 h-8 text-gray-200 mx-auto mb-1" />
          <p className="text-xs text-gray-400">{t("admin.referralWidget.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {top5.map((p, idx) => (
            <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${idx === 0 ? "bg-amber-50 border border-amber-100" : "bg-gray-50"}`}>
              <span className="text-base w-6 text-center flex-shrink-0">{medals[idx]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {p.business_name || t("professionalLabel")}
                </p>
                <p className="text-xs text-gray-500">{p.ciudad || p.provincia || t("admin.referralWidget.defaultLocation")}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{p.referral_count}</p>
                <p className="text-xs text-gray-500">{t("admin.referralWidget.referralsLabel")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}