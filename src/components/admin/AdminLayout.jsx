import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  IconDashboard, IconUsers, IconBriefcase, IconCard,
  IconBarChart, IconTicket, IconSettings, IconChevronRight, IconGift,
  IconShieldPlain, IconMegaphone, IconMail, IconMessageCircle
} from "@/components/Icons";

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const active = activeSection || currentSection;

  // Antes constante de módulo (NAV_ITEMS); dentro para que las etiquetas sigan al idioma
  const navItems = [
    { id: "dashboard", label: t("admin.layout.nav.dashboard"), icon: IconDashboard, emoji: "📊" },
    { id: "users", label: t("admin.layout.nav.users"), icon: IconUsers, emoji: "👥" },
    { id: "pending", label: t("admin.layout.nav.pending"), icon: IconBriefcase, emoji: "🔧" },
    { id: "subscriptions", label: t("admin.layout.nav.subscriptions"), icon: IconCard, emoji: "💳" },
    { id: "outreach", label: t("admin.layout.nav.outreach"), icon: IconMessageCircle, emoji: "💬" },
    { id: "gifts", label: t("admin.layout.nav.gifts"), icon: IconGift, emoji: "🎁" },
    { id: "audit", label: t("admin.layout.nav.audit"), icon: IconShieldPlain, emoji: "📋" },
    { id: "ads_briefings", label: t("admin.layout.nav.adsBriefings"), icon: IconMegaphone, emoji: "📢" },
    { id: "referrals", label: t("admin.layout.nav.referrals"), icon: IconGift, emoji: "🤝" },
    { id: "emails", label: t("admin.layout.nav.emails"), icon: IconMail, emoji: "📧" },
    { id: "metrics", label: t("admin.layout.nav.metrics"), icon: IconBarChart, emoji: "📈" },
    { id: "support", label: t("admin.layout.nav.support"), icon: IconTicket, emoji: "🎫" },
    { id: "verifications", label: t("admin.layout.nav.verifications"), icon: IconSettings, emoji: "🛡️" },
  ];

  const handleSectionChange = (id) => {
    if (typeof onSectionChange === 'function') {
      onSectionChange(id);
    } else {
      const route = SECTION_ROUTES[id];
      if (route) navigate(route);
    }
  };

  return (
    <div className="min-h-screen bg-soft flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-c-border flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-c-border">
          <h1 className="font-bold text-lg text-ink">{t("admin.layout.title")}</h1>
          <p className="text-xs text-c-muted mt-0.5">MisAutónomos</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                active === item.id
                  ? "bg-c-accent text-white"
                  : "text-ink hover:bg-soft"
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              <span className="flex-1">{item.label}</span>
              {item.id === "support" && openTickets > 0 && (
                <span className="badge-error bg-error text-white text-xs px-1.5 py-0 min-w-[20px] justify-center">
                  {openTickets}
                </span>
              )}
              {item.id === "pending" && (
                <IconChevronRight className="w-4 h-4 opacity-50" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile top tabs */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex overflow-x-auto bg-surface border-b border-c-border px-2 py-2 gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active === item.id ? "bg-c-accent text-white" : "text-ink bg-soft"
              }`}
            >
              {item.emoji} {item.label}
              {item.id === "support" && openTickets > 0 && (
                <span className="bg-error text-white rounded-full text-[10px] px-1">{openTickets}</span>
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
