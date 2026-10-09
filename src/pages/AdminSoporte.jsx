import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconSearch, IconSend, IconLock, IconArrowLeft } from '@/components/Icons';
import { EmptyState } from '@/components/ListStates';
import { toast } from '@/lib/toast';
import SEOHead from '@/components/seo/SEOHead';
import { useTranslation } from 'react-i18next';

const NAVY = '#00255C';
const NAVY_SOFT = 'rgba(0,37,92,0.06)';

// Reciben `t` para que las etiquetas se retraduzcan al cambiar de idioma
// (una constante de módulo se evaluaría una sola vez al importar).
const statusOptions = (t) => [
  { value: 'open',         label: t('admin.soporte.status.open'),        cls: 'badge-warning' },
  { value: 'in_progress',  label: t('admin.soporte.status.inProgress'),  cls: 'badge-accent' },
  { value: 'waiting_user', label: t('admin.soporte.status.waitingUser'), cls: 'badge bg-purple-100 text-purple-800' },
  { value: 'resolved',     label: t('admin.soporte.status.resolved'),    cls: 'badge-success' },
  { value: 'closed',       label: t('admin.soporte.status.closed'),      cls: 'badge-muted' },
];
const priorityOptions = (t) => [
  { value: 'low',    label: t('admin.soporte.priority.low') },
  { value: 'normal', label: t('admin.soporte.priority.normal') },
  { value: 'high',   label: t('admin.soporte.priority.high') },
  { value: 'urgent', label: t('admin.soporte.priority.urgent') },
];

function statusMeta(options, s) { return options.find(o => o.value === s) || options[0]; }
function formatDate(d) { try { return new Date(d).toLocaleString('es-ES'); } catch { return ''; } }

function TicketList({ tickets, activeId, onSelect, q, setQ, status, setStatus, type, setType, priority, setPriority }) {
  const { t } = useTranslation();
  const STATUS_OPTIONS = statusOptions(t);
  const PRIORITY_OPTIONS = priorityOptions(t);
  return (
    <aside className="w-full md:w-[360px] md:flex-shrink-0 border-r border-c-border bg-surface flex flex-col">
      <div className="p-4 border-b border-c-border space-y-2">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-c-muted pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('admin.soporte.searchPlaceholder')}
            className="input pl-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="select text-[12px]">
            <option value="all">{t('admin.soporte.filter.status')}</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="select text-[12px]">
            <option value="all">{t('admin.soporte.filter.priority')}</option>
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="select text-[12px]">
            <option value="all">{t('admin.soporte.filter.type')}</option>
            <option value="bug">{t('admin.soporte.type.bug')}</option>
            <option value="question">{t('admin.soporte.type.question')}</option>
            <option value="feature">{t('admin.soporte.type.feature')}</option>
            <option value="billing">{t('supportChat.ticketTypeBilling')}</option>
            <option value="other">{t('admin.soporte.type.other')}</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <EmptyState className="m-4" title={t('admin.soporte.emptyState')} />
        ) : tickets.map((tk) => {
          const meta = statusMeta(STATUS_OPTIONS, tk.status);
          const isActive = tk.id === activeId;
          return (
            <button
              key={tk.id}
              type="button"
              onClick={() => onSelect(tk.id)}
              className={`w-full text-left px-4 py-3 border-b border-c-border flex flex-col gap-1 transition ${isActive ? 'bg-soft' : 'hover:bg-soft'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-c-muted font-mono">#{tk.number || tk.id.slice(-6)}</span>
                <span className={`${meta.cls} text-[10px] uppercase tracking-[0.06em]`}>{meta.label}</span>
              </div>
              <p className="text-[14px] font-medium text-ink truncate">{tk.title || t('admin.soporte.untitled')}</p>
              {(() => {
                const name = (tk.creator_name || '').trim();
                const email = (tk.creator_email || tk.user_email || '').trim();
                const who = name || email || '';
                return who ? (
                  <p className="text-[11px] text-c-muted truncate">{who}</p>
                ) : null;
              })()}
              <p className="text-[11px] text-c-muted">{formatDate(tk.updated_date || tk.created_date)}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function TicketDetail({ ticket, onClose, refresh }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const STATUS_OPTIONS = statusOptions(t);
  const PRIORITY_OPTIONS = priorityOptions(t);

  const { data: messages = [] } = useQuery({
    queryKey: ['admin:ticket:messages', ticket.id],
    queryFn: () => base44.entities.TicketMessage.filter({ ticket_id: ticket.id }, 'created_date', 500),
    enabled: !!ticket.id,
    staleTime: 10_000,
  });

  const setStatus = async (status) => {
    try {
      await base44.entities.Ticket.update(ticket.id, { status });
      await base44.entities.TicketEvent.create({
        ticket_id: ticket.id, event_type: 'status_change', payload: { to: status }, created_by: 'admin',
      });
      toast.success(t('statusUpdated'));
      refresh();
    } catch (e) { toast.error(t('admin.soporte.errorGeneric', { message: e.message })); }
  };
  const setPriority = async (priority) => {
    try {
      await base44.entities.Ticket.update(ticket.id, { priority });
      await base44.entities.TicketEvent.create({
        ticket_id: ticket.id, event_type: 'priority_change', payload: { to: priority }, created_by: 'admin',
      });
      toast.success(t('admin.soporte.priorityUpdated'));
      refresh();
    } catch (e) { toast.error(t('admin.soporte.errorGeneric', { message: e.message })); }
  };

  const send = async (e) => {
    e?.preventDefault?.();
    const body = reply.trim();
    if (!body) return;
    try {
      await base44.entities.TicketMessage.create({
        ticket_id: ticket.id,
        sender_type: 'admin',
        // `content`, NO `body`. La columna de `ticket_messages` se llama
        // `content`; escribir `body` devolvía 400 de PostgREST, el `catch` lo
        // convertía en un aviso y la fila no se guardaba nunca. Por eso la
        // tabla tenía CERO filas: ni el admin ni el autónomo habían podido
        // responder jamás a un ticket.
        content: body,
        is_internal: internal,
      });
      await base44.entities.Ticket.update(ticket.id, { updated_date: new Date().toISOString() });

      // Y AHORA SE LE AVISA. Hasta hoy, responder escribía la fila y nada más:
      // la persona sólo se enteraba si volvía a la web por su cuenta y abría
      // el ticket. `ticket_messages` tenía CERO filas — nadie había respondido
      // nunca a nadie —, así que el camino completo no se había recorrido.
      //
      // Las notas internas no se avisan: son para uno mismo.
      // Va DESPUÉS de guardar y sin `await` que bloquee la pantalla: si el
      // correo falla, la respuesta ya está escrita y el admin no debe quedarse
      // esperando. El fallo se avisa, pero sin deshacer nada.
      if (!internal) {
        (async () => {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data?.session?.access_token || '';
            const r = await fetch('/api/admin/aviso-respuesta', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ ticketId: ticket.id }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) toast.error(t('admin.soporte.noticeFailed'));
            else if (d.enviado === false) toast(t('admin.soporte.noticeSkipped', { reason: d.motivo || '' }));
            else toast.success(t('admin.soporte.noticeSent'));
          } catch {
            toast.error(t('admin.soporte.noticeFailed'));
          }
        })();
      }

      setReply(''); setInternal(false);
      qc.invalidateQueries({ queryKey: ['admin:ticket:messages', ticket.id] });
      refresh();
    } catch (err) { toast.error(t('admin.soporte.sendError', { message: err.message })); }
  };

  const meta = statusMeta(STATUS_OPTIONS, ticket.status);
  const visibleMessages = messages.filter(m => !m.is_internal);
  const internalNotes = messages.filter(m => m.is_internal);

  return (
    <section className="flex-1 flex flex-col bg-surface">
      <header className="p-4 border-b border-c-border flex items-start gap-3">
        <button type="button" onClick={onClose} className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-soft" aria-label={t('common.back')}>
          <IconArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-c-muted font-mono">#{ticket.number || ticket.id.slice(-6)}</span>
            <span className={`${meta.cls} text-[10px] uppercase tracking-[0.06em]`}>{meta.label}</span>
            {ticket.priority && <span className="text-[11px] text-c-muted">{t('admin.soporte.priorityLabel', { priority: ticket.priority })}</span>}
          </div>
          <h2 className="text-[16px] font-semibold text-ink truncate">{ticket.title || t('admin.soporte.untitled')}</h2>
          {(() => {
            const name = (ticket.creator_name || '').trim();
            const email = (ticket.creator_email || ticket.user_email || '').trim();
            const fallbackId = ticket.user_id || ticket.creator_id || '';
            const primary = name || email || fallbackId;
            const showSecondary = !!(name && email);
            return (
              <p className="text-[12px] text-c-muted mt-0.5 truncate">
                <span className="text-ink font-medium">{primary}</span>
                {showSecondary && (
                  <span className="text-c-muted"> · {email}</span>
                )}
                <span> · {formatDate(ticket.created_date)}</span>
              </p>
            );
          })()}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <select value={ticket.status} onChange={(e) => setStatus(e.target.value)} className="select text-[12px]">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={ticket.priority || 'normal'} onChange={(e) => setPriority(e.target.value)} className="select text-[12px]">
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ticket.description && (
          <div className="rounded-xl border border-c-border bg-soft p-3 text-sm text-ink whitespace-pre-wrap">
            {ticket.description}
          </div>
        )}
        {visibleMessages.map((m) => {
          const isAdmin = m.sender_type === 'admin';
          return (
            <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${isAdmin ? 'text-white' : 'bg-soft text-ink'}`} style={isAdmin ? { background: NAVY } : null}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/70' : 'text-c-muted'}`}>{formatDate(m.created_date)}</p>
              </div>
            </div>
          );
        })}

        {internalNotes.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-warning my-3">{t('admin.soporte.internalNotesTitle')}</p>
            {internalNotes.map((m) => (
              <div key={m.id} className="my-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="text-[10px] mt-1 text-warning/70">{formatDate(m.created_date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={send} className="border-t border-c-border p-3 bg-surface">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder={internal ? t('admin.soporte.internalNotePlaceholder') : t('admin.soporte.replyPlaceholder')}
          className="textarea text-sm"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input type="checkbox" className="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            <span className="inline-flex items-center gap-1"><IconLock className="w-3 h-3" /> {t('admin.soporte.internalNote')}</span>
          </label>
          <button
            type="submit"
            disabled={!reply.trim()}
            className="btn-primary btn-sm text-xs font-semibold"
            style={{ background: NAVY }}
          >
            <IconSend className="w-3.5 h-3.5" />
            {t('messages.send')}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AdminSoportePage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [priority, setPriority] = useState('all');
  const [activeId, setActiveId] = useState(null);

  const { data: tickets = [] } = useQuery({
    queryKey: ['admin:tickets'],
    queryFn: () => base44.entities.Ticket.list('-updated_date', 2000),
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    let arr = tickets;
    if (status !== 'all') arr = arr.filter(tk => tk.status === status);
    if (type !== 'all') arr = arr.filter(tk => tk.type === type);
    if (priority !== 'all') arr = arr.filter(tk => tk.priority === priority);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter(tk =>
        (tk.title || '').toLowerCase().includes(needle) ||
        (tk.number || '').toString().includes(needle) ||
        tk.id.toLowerCase().includes(needle)
      );
    }
    return arr;
  }, [tickets, q, status, type, priority]);

  useEffect(() => {
    if (!activeId && filtered.length > 0) setActiveId(filtered[0].id);
  }, [filtered, activeId]);

  const active = tickets.find(tk => tk.id === activeId) || null;
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin:tickets'] });

  return (
    <>
      <SEOHead title={t('admin.soporte.seoTitle')} noindex />
      <main className="min-h-screen bg-canvas">
        <div className="max-w-7xl mx-auto px-0 md:px-6 py-0 md:py-8">
          <div className="md:rounded-2xl md:border md:border-c-border bg-surface overflow-hidden flex flex-col md:flex-row md:h-[calc(100vh-160px)] md:min-h-[640px]">
            <TicketList
              tickets={filtered}
              activeId={activeId}
              onSelect={setActiveId}
              q={q} setQ={setQ}
              status={status} setStatus={setStatus}
              type={type} setType={setType}
              priority={priority} setPriority={setPriority}
            />
            {active ? (
              <TicketDetail ticket={active} onClose={() => setActiveId(null)} refresh={refresh} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-c-muted p-8">
                {t('admin.soporte.selectTicket')}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
