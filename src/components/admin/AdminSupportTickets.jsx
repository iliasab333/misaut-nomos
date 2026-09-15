import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ExternalLink, AlertCircle, Clock } from "lucide-react";

const PRIORITY_COLORS = {
  urgente: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-yellow-100 text-yellow-700",
  baja: "bg-gray-100 text-gray-600",
};

const STATUS_COLORS = {
  abierto: "bg-blue-100 text-blue-700",
  en_progreso: "bg-purple-100 text-purple-700",
  resuelto: "bg-green-100 text-green-700",
  cerrado: "bg-gray-100 text-gray-600",
};

export default function AdminSupportTickets({ tickets }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("abierto");

  const openTickets = tickets.filter(t => t.status === "abierto" || t.status === "en_progreso");
  const filtered = filter === "todos" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{t("admin.supportTickets.title")}</h2>
        <div className="flex items-center gap-2">
          {openTickets.length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              {t("admin.supportTickets.unresolved", { count: openTickets.length })}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl("AdminTickets"))}>
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            {t("admin.supportTickets.viewAll")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["abierto", "en_progreso", "resuelto", "cerrado", "todos"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {s === "todos" ? t("admin.supportTickets.filterAll") : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>{t("admin.supportTickets.empty")}</p>
          </div>
        ) : (
          filtered.slice(0, 50).map(ticket => (
            <Card key={ticket.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl("TicketDetail") + `/${ticket.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={PRIORITY_COLORS[ticket.priority] || "bg-gray-100 text-gray-600"}>
                        {ticket.priority}
                      </Badge>
                      <Badge className={STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-600"}>
                        {ticket.status?.replace("_", " ")}
                      </Badge>
                      {ticket.ticket_number && (
                        <span className="text-xs text-gray-400">{ticket.ticket_number}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ticket.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{new Date(ticket.created_date).toLocaleDateString("es-ES")}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ticket.creator_name || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}