import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search as SearchIcon, Send, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const NAVY_SOFT = 'rgba(0,37,92,0.06)';

const STATUS_OPTIONS = [
  { value: 'open',         label: 'Abierto',        bg: '#FEF3C7', color: '#92400E' },
  { value: 'in_progress',  label: 'En curso',       bg: '#DBEAFE', color: '#1E40AF' },
  { value: 'waiting_user', label: 'Esperando user', bg: '#F3E8FF', color: '#6B21A8' },
  { value: 'resolved',     label: 'Resuelto',       bg: '#D1FAE5', color: '#065F46' },
  { value: 'closed',       label: 'Cerrado',        bg: '#E5E7EB', color: '#374151' },
];
const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

function statusMeta(s) { return STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0]; }
function formatDate(d) { try { return new Date(d).toLocaleString('es-ES'); } catch { return ''; } }

function TicketList({ tickets, activeId, onSelect, q, setQ, status, setStatus, type, setType, priority, setPriority }) {
  return (
    <aside className="w-full md:w-[360px] md:flex-shrink-0 border-r border-slate-100 bg-white flex flex-col">
      <div className="p-4 border-b border-slate-100 space-y-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título o nº ticket…"
            className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 px-2 text-[12px] border border-slate-200 rounded-md bg-white">
            <option value="all">Estado</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-8 px-2 text-[12px] border border-slate-200 rounded-md bg-white">
            <option value="all">Prioridad</option>
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-8 px-2 text-[12px] border border-slate-200 rounded-md bg-white">
            <option value="all">Tipo</option>
            <option value="bug">Bug</option>
            <option value="question">Pregunta</option>
            <option value="feature">Mejora</option>
            <option value="billing">Facturación</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <p className="px-4 py-8 text-sm text-center text-slate-400">Sin tickets.</p>
        ) : tickets.map((t) => {
          const meta = statusMeta(t.status);
          const isActive = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 flex flex-col gap-1 transition ${isActive ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-mono">#{t.number || t.id.slice(-6)}</span>
                <span className="inline-flex text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
              </div>
              <p className="text-[14px] font-medium text-slate-900 truncate">{t.title || 'Sin título'}</p>
              {(() => {
                const name = (t.creator_name || '').trim();
                const email = (t.creator_email || t.user_email || '').trim();
                const who = name || email || '';
                return who ? (
                  <p className="text-[11px] text-slate-500 truncate">{who}</p>
                ) : null;
              })()}
              <p className="text-[11px] text-slate-400">{formatDate(t.updated_date || t.created_date)}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function TicketDetail({ ticket, onClose, refresh }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);

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
      toast.success('Estado actualizado');
      refresh();
    } catch (e) { toast.error('Error: ' + e.message); }
  };
  const setPriority = async (priority) => {
    try {
      await base44.entities.Ticket.update(ticket.id, { priority });
      await base44.entities.TicketEvent.create({
        ticket_id: ticket.id, event_type: 'priority_change', payload: { to: priority }, created_by: 'admin',
      });
      toast.success('Prioridad actualizada');
      refresh();
    } catch (e) { toast.error('Error: ' + e.message); }
  };

  const send = async (e) => {
    e?.preventDefault?.();
    const body = reply.trim();
    if (!body) return;
    try {
      await base44.entities.TicketMessage.create({
        ticket_id: ticket.id,
        sender_type: 'admin',
        body,
        is_internal: internal,
      });
      await base44.entities.Ticket.update(ticket.id, { updated_date: new Date().toISOString() });
      setReply(''); setInternal(false);
      qc.invalidateQueries({ queryKey: ['admin:ticket:messages', ticket.id] });
      refresh();
    } catch (err) { toast.error('No se ha podido enviar: ' + err.message); }
  };

  const meta = statusMeta(ticket.status);
  const visibleMessages = messages.filter(m => !m.is_internal);
  const internalNotes = messages.filter(m => m.is_internal);

  return (
    <section className="flex-1 flex flex-col bg-white">
      <header className="p-4 border-b border-slate-100 flex items-start gap-3">
        <button type="button" onClick={onClose} className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-slate-500 font-mono">#{ticket.number || ticket.id.slice(-6)}</span>
            <span className="inline-flex text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
            {ticket.priority && <span className="text-[11px] text-slate-500">prioridad: {ticket.priority}</span>}
          </div>
          <h2 className="text-[16px] font-semibold text-slate-900 truncate">{ticket.title || 'Sin título'}</h2>
          {(() => {
            const name = (ticket.creator_name || '').trim();
            const email = (ticket.creator_email || ticket.user_email || '').trim();
            const fallbackId = ticket.user_id || ticket.creator_id || '';
            const primary = name || email || fallbackId;
            const showSecondary = !!(name && email);
            return (
              <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                <span className="text-slate-700 font-medium">{primary}</span>
                {showSecondary && (
                  <span className="text-slate-400"> · {email}</span>
                )}
                <span> · {formatDate(ticket.created_date)}</span>
              </p>
            );
          })()}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <select value={ticket.status} onChange={(e) => setStatus(e.target.value)} className="h-8 px-2 text-[12px] border border-slate-200 rounded-md bg-white">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={ticket.priority || 'normal'} onChange={(e) => setPriority(e.target.value)} className="h-8 px-2 text-[12px] border border-slate-200 rounded-md bg-white">
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ticket.description && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-700 whitespace-pre-wrap">
            {ticket.description}
          </div>
        )}
        {visibleMessages.map((m) => {
          const isAdmin = m.sender_type === 'admin';
          return (
            <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${isAdmin ? 'text-white' : 'bg-slate-100 text-slate-900'}`} style={isAdmin ? { background: NAVY } : null}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/70' : 'text-slate-500'}`}>{formatDate(m.created_date)}</p>
              </div>
            </div>
          );
        })}

        {internalNotes.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700 my-3">Notas internas (no visibles al usuario)</p>
            {internalNotes.map((m) => (
              <div key={m.id} className="my-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="text-[10px] mt-1 text-amber-700/70">{formatDate(m.created_date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={send} className="border-t border-slate-100 p-3 bg-white">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder={internal ? 'Nota interna…' : 'Responder al usuario…'}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Nota interna</span>
          </label>
          <button
            type="submit"
            disabled={!reply.trim()}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: NAVY }}
          >
            <Send className="w-3.5 h-3.5" />
            Enviar
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AdminSoportePage() {
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
    if (status !== 'all') arr = arr.filter(t => t.status === status);
    if (type !== 'all') arr = arr.filter(t => t.type === type);
    if (priority !== 'all') arr = arr.filter(t => t.priority === priority);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter(t =>
        (t.title || '').toLowerCase().includes(needle) ||
        (t.number || '').toString().includes(needle) ||
        t.id.toLowerCase().includes(needle)
      );
    }
    return arr;
  }, [tickets, q, status, type, priority]);

  useEffect(() => {
    if (!activeId && filtered.length > 0) setActiveId(filtered[0].id);
  }, [filtered, activeId]);

  const active = tickets.find(t => t.id === activeId) || null;
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin:tickets'] });

  return (
    <>
      <SEOHead title="Soporte · Admin" noindex />
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-0 md:px-6 py-0 md:py-8">
          <div className="md:rounded-2xl md:border md:border-slate-200 bg-white overflow-hidden flex flex-col md:flex-row md:h-[calc(100vh-160px)] md:min-h-[640px]">
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
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 p-8">
                Selecciona un ticket para ver el detalle.
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
