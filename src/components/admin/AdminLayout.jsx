import React from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, CreditCard,
  BarChart2, Ticket, Settings, ChevronRight, Gift, Shield, Megaphone, Mail, MessageCircle
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, emoji: "📊" },
  { id: "users", label: "Usuarios", icon: Users, emoji: "👥" },
  { id: "pending", label: "Pendientes", icon: Briefcase, emoji: "🔧" },
  { id: "subscriptions", label: "Suscripciones", icon: CreditCard, emoji: "💳" },
  { id: "outreach", label: "Outreach WhatsApp", icon: MessageCircle, emoji: "💬" },
  { id: "gifts", label: "Regalos", icon: Gift, emoji: "🎁" },
  { id: "audit", label: "Auditoría", icon: Shield, emoji: "📋" },
  { id: "ads_briefings", label: "Briefings Ads+", icon: Megaphone, emoji: "📢" },
  { id: "referrals", label: "Referidos", icon: Gift, emoji: "🤝" },
  { id: "emails", label: "Emails", icon: Mail, emoji: "📧" },
  { id: "metrics", label: "Métricas", icon: BarChart2, emoji: "📈" },
  { id: "support", label: "Soporte", icon: Ticket, emoji: "🎫" },
  { id: "verifications", label: "Verificaciones", icon: Settings, emoji: "🛡️" },
];

const SECTION_ROUTES = {
  dashboard: "/admin",
  users: "/admin",
  pending: "/admin",
  subscriptions: "/admin",
  outreach: "/admin/outreach-whatsapp",
  gifts: "/admin/regalos",
  emails: "/admin",
  metrics: "/admin",
  support: "/admin/soporte",
  verifications: "/admin",
  referrals: "/admin/referidos",
};

export default function AdminLayout({ activeSection, currentSection, onSectionChange, openTickets = 0, children }) {
  const navigate = useNavigate();
  const active = activeSection || currentSection;

  const handleSectionChange = (id) => {
    if (typeof onSectionChange === 'function') {
      onSectionChange(id);
    } else {
      const route = SECTION_ROUTES[id];
      if (route) navigate(route);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="font-bold text-lg text-gray-900">⚙️ Admin Panel</h1>
          <p className="text-xs text-gray-500 mt-0.5">MisAutónomos</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                active === item.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              <span className="flex-1">{item.label}</span>
              {item.id === "support" && openTickets > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 min-w-[20px] text-center">
                  {openTickets}
                </Badge>
              )}
              {item.id === "pending" && (
                <ChevronRight className="w-4 h-4 opacity-50" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile top tabs */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex overflow-x-auto bg-white border-b border-gray-200 px-2 py-2 gap-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active === item.id ? "bg-blue-600 text-white" : "text-gray-600 bg-gray-100"
              }`}
            >
              {item.emoji} {item.label}
              {item.id === "support" && openTickets > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[10px] px-1">{openTickets}</span>
              )}
            </button>
          ))}
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}