import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';

// Mapa explícito estado → clave i18n (la etiqueta se resuelve con t() en render).
const STATUS = {
  open:         { key: 'admin.soporte.status.open',       bg: '#FEF3C7', color: '#92400E' },
  in_progress:  { key: 'admin.soporte.status.inProgress', bg: '#DBEAFE', color: '#1E40AF' },
  waiting_user: { key: 'support.status.waitingUser',      bg: '#F3E8FF', color: '#6B21A8' },
  resolved:     { key: 'admin.soporte.status.resolved',   bg: '#D1FAE5', color: '#065F46' },
  closed:       { key: 'admin.soporte.status.closed',     bg: '#E5E7EB', color: '#374151' },
};
const statusMeta = (s, t) => (STATUS[s]
  ? { label: t(STATUS[s].key), bg: STATUS[s].bg, color: STATUS[s].color }
  : { label: s || '—', bg: '#E5E7EB', color: '#374151' });
const formatDate = (d) => { try { return new Date(d).toLocaleString('es-ES'); } catch { return ''; } };

export default function SoporteTicket() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => { window.location.href = `/login?next=/soporte/${id}`; });
  }, [id]);

  const { data: ticket } = useQuery({
    queryKey: ['soporte:ticket', id],
    queryFn: () => base44.entities.Ticket.get(id),
    enabled: !!id && !!user,
    staleTime: 15_000,
  });

  // Como medida de seguridad client-side, si la fila no es del usuario, lo
  // devolvemos al listado. (RLS en BD ya debería filtrarlo, pero por si.)
  useEffect(() => {
    if (user && ticket && ticket.user_id && ticket.user_id !== user.id) {
      toast.error(t('support.ticket.noAccess'));
      navigate('/soporte', { replace: true });
    }
  }, [user, ticket, navigate, t]);

  const { data: messages = [] } = useQuery({
    queryKey: ['soporte:ticket:messages', id],
    queryFn: () => base44.entities.TicketMessage.filter({ ticket_id: id }, 'created_date', 500),
    enabled: !!id && !!user,
    staleTime: 10_000,
  });

  // Solo los mensajes públicos (las notas internas del admin no se ven).
  const publicMessages = messages.filter((m) => !m.is_internal);

  const send = async (e) => {
    e?.preventDefault?.();
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      await base44.entities.TicketMessage.create({
        ticket_id: id,
        sender_type: 'user',
        body,
        is_internal: false,
      });
      // Si el ticket estaba esperando al usuario, ya respondió → vuelve a "abierto"
      // para que aparezca en la cola del admin.
      const next = (ticket?.status === 'waiting_user' || ticket?.status === 'resolved')
        ? 'open' : (ticket?.status || 'open');
      await base44.entities.Ticket.update(id, {
        status: next,
        updated_date: new Date().toISOString(),
      });
      try {
        await base44.entities.TicketEvent.create({
          ticket_id: id,
          event_type: 'user_reply',
          payload: { previous_status: ticket?.status },
          created_by: 'user',
        });
      } catch (_e) { /* opcional */ }
      setReply('');
      qc.invalidateQueries({ queryKey: ['soporte:ticket', id] });
      qc.invalidateQueries({ queryKey: ['soporte:ticket:messages', id] });
    } catch (err) {
      toast.error(t('support.ticket.sendError', { message: err?.message || '' }));
    } finally {
      setSending(false);
    }
  };

  if (!user || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const meta = statusMeta(ticket.status, t);
  const canReply = !['closed'].includes(ticket.status);

  return (
    <>
      <SEOHead title={t('support.ticket.seoTitle', { title: ticket.title || t('support.ticket.defaultTitle') })} noindex />
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Link to="/soporte" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="w-4 h-4" /> {t('support.ticket.backToTickets')}
          </Link>

          {/* Cabecera */}
          <header className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-slate-500 font-mono">#{ticket.number || ticket.id.slice(-6)}</span>
              <span className="inline-flex text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
            </div>
            <h1 className="text-[18px] font-semibold text-slate-900">{ticket.title || t('admin.soporte.untitled')}</h1>
            <p className="text-[12px] text-slate-500 mt-1">{t('support.ticket.openedOn', { date: formatDate(ticket.created_date) })}</p>
            {ticket.description && (
              <p className="mt-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border-t border-slate-100 pt-4">
                {ticket.description}
              </p>
            )}
          </header>

          {/* Hilo */}
          <section className="mt-5 space-y-3">
            {publicMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 text-center">
                {t('support.ticket.waitingTeam')}
              </div>
            ) : publicMessages.map((m) => {
              const isMe = m.sender_type === 'user';
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm"
                    style={isMe
                      ? { background: NAVY, color: 'white' }
                      : { background: 'white', color: '#0f172a', border: '1px solid #E2E8F0' }}
                  >
                    {!isMe && <p className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: NAVY }}>{t('supportChat.supportTeam')}</p>}
                    <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-slate-500'}`}>{formatDate(m.created_date)}</p>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Respuesta del usuario */}
          {canReply ? (
            <form onSubmit={send} className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                placeholder={t('support.ticket.replyPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">{t('support.ticket.replyHint')}</p>
                <button
                  type="submit"
                  disabled={!reply.trim() || sending}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: NAVY }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t('messages.send')}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 text-center">
              <Trans
                i18nKey="support.ticket.closedHint"
                components={{ support: <Link to="/soporte" className="font-semibold underline underline-offset-2" style={{ color: NAVY }} /> }}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
