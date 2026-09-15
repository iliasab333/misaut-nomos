import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MoreVertical, Gift } from "lucide-react";
import { differenceInDays } from "date-fns";
import GiftUpgradeModal from "@/components/admin/GiftUpgradeModal";

const STATUS_FILTERS = ["todos", "activo", "en_prueba", "expirado", "cancelado"];

function getStatusBadge(estado) {
  const map = {
    activo: "bg-green-100 text-green-700",
    en_prueba: "bg-blue-100 text-blue-700",
    expirado: "bg-red-100 text-red-700",
    cancelado: "bg-gray-100 text-gray-600",
    suspendu: "bg-yellow-100 text-yellow-700",
  };
  return <Badge className={map[estado] || "bg-gray-100 text-gray-600"}>{estado}</Badge>;
}

export default function AdminSubscriptionsTable({ subscriptions, users }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("todos");
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);

  const filtered = useMemo(() => {
    return subscriptions.filter(s => filter === "todos" || s.estado === filter);
  }, [subscriptions, filter]);

  const expiringSoon = subscriptions.filter(s => {
    if (s.estado !== "activo" && s.estado !== "en_prueba") return false;
    try {
      const days = differenceInDays(new Date(s.fecha_expiracion), new Date());
      return days >= 0 && days <= 7;
    } catch { return false; }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{t("admin.subscriptionsTable.title")}</h2>
        {expiringSoon.length > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs px-3 py-1.5 rounded-lg font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("admin.subscriptionsTable.expiringSoon", { count: expiringSoon.length })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {f === "todos" ? t("admin.subscriptionsTable.filterAll") : f}
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.subscriptionsTable.columns.user")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.subscriptionsTable.columns.plan")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.subscriptionsTable.columns.price")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.subscriptionsTable.columns.status")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.subscriptionsTable.columns.start")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.subscriptionsTable.columns.expiry")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t("admin.subscriptionsTable.columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(sub => {
                const userEmail = users.find(u => u.id === sub.user_id)?.email || sub.user_id;
                let expiresInDays = null;
                try { expiresInDays = differenceInDays(new Date(sub.fecha_expiracion), new Date()); } catch { /* fecha inválida: se ignora */ }
                const expiringSoon = expiresInDays !== null && expiresInDays >= 0 && expiresInDays <= 7 && (sub.estado === "activo" || sub.estado === "en_prueba");

                return (
                  <tr key={sub.id} className={`hover:bg-gray-50 ${expiringSoon ? "bg-orange-50" : ""}`}>
                    <td className="px-4 py-3 text-xs text-gray-700">{userEmail}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">
                      {sub.plan_nombre}
                      {sub.gifted_plan_id && sub.gifted_until && new Date(sub.gifted_until) > new Date() && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          <Gift className="w-2.5 h-2.5" />
                          {t("admin.subscriptionsTable.giftBadge", { plan: sub.gifted_plan_name || sub.gifted_plan_id, date: new Date(sub.gifted_until).toLocaleDateString('es-ES', {day:'numeric', month:'numeric'}) })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{sub.plan_precio ? t("admin.subscriptionsTable.pricePerMonth", { price: sub.plan_precio }) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(sub.estado)}
                        {sub.gifted_until && new Date(sub.gifted_until) > new Date() && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            <Gift className="w-2.5 h-2.5" />
                            {t("admin.subscriptionsTable.giftedUntil", { date: new Date(sub.gifted_until).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(sub.fecha_inicio).toLocaleDateString("es-ES")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${expiringSoon ? "text-orange-600 font-semibold" : "text-gray-500"}`}>
                          {new Date(sub.fecha_expiracion).toLocaleDateString("es-ES")}
                        </span>
                        {expiringSoon && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button 
                          onClick={() => {
                            setSelectedSubscriber({ ...sub, name: users.find(u => u.id === sub.user_id)?.full_name, email: users.find(u => u.id === sub.user_id)?.email });
                            setGiftModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded hover:bg-amber-50"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          {t("admin.subscriptionsTable.giftUpgrade")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {giftModalOpen && selectedSubscriber && (
        <GiftUpgradeModal
          subscriber={selectedSubscriber}
          onClose={() => {
            setGiftModalOpen(false);
            setSelectedSubscriber(null);
          }}
          onSuccess={() => {
            setGiftModalOpen(false);
            setSelectedSubscriber(null);
          }}
        />
      )}
    </div>
  );
}
