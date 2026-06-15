import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Headphones } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const NAVY = '#00255C';

// Tabs Mensajes / Soporte para la bandeja del usuario.
//   Mensajes → chat cliente↔profesional (tabla `messages`, esta página).
//   Soporte  → tickets (tabla `tickets`, otra página: /soporte).
// Contador de "Soporte" = tickets abiertos (status ∈ open/in_progress/waiting_user)
// cuyo updated_date > last_seen_by_user. Versión simple: cuenta tickets abiertos.
export default function InboxTabs({ user, unreadChats = 0 }) {
  const { pathname } = useLocation();
  const isMensajes = pathname.startsWith('/mensajes') || pathname.startsWith('/messages');
  const [ticketsOpen, setTicketsOpen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    (async () => {
      try {
        const all = await base44.entities.Ticket.filter({ user_id: user.id }, '-updated_date', 200);
        if (cancelled) return;
        const open = (all || []).filter((t) => ['open', 'in_progress', 'waiting_user'].includes(t.status)).length;
        setTicketsOpen(open);
      } catch (_e) { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const Tab = ({ active, icon: Icon, label, href, count }) => (
    <a
      href={href}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }`}
      style={active ? { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : null}
    >
      <Icon className="w-3.5 h-3.5" style={active ? { color: NAVY } : null} />
      {label}
      {count > 0 && (
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
          style={{ background: active ? NAVY : '#ef4444' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </a>
  );

  return (
    <div className="inline-flex w-full p-1 rounded-xl bg-slate-100 mb-3">
      <Tab active={isMensajes} icon={MessageSquare} label="Mensajes" href="/mensajes" count={unreadChats} />
      <Tab active={!isMensajes} icon={Headphones} label="Soporte" href="/soporte" count={ticketsOpen} />
    </div>
  );
}
