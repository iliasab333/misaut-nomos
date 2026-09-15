import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search as SearchIcon, MessageCircle, Loader2, AlertCircle, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import SEOHead from '@/components/seo/SEOHead';
import InboxTabs from '@/components/messages/InboxTabs';

const NAVY = '#00255C';
const NAVY_SOFT = 'rgba(0,37,92,0.06)';

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

function CreateTicketDialog({ user, onClose, onCreated }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('question');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const TYPES = [
    { value: 'question', label: t('admin.soporte.type.question') },
    { value: 'bug', label: t('supportChat.ticketTypeTechnical') },
    { value: 'billing', label: t('supportChat.ticketTypeBilling') },
    { value: 'feature', label: t('support.types.feature') },
    { value: 'other', label: t('admin.soporte.type.other') },
  ];
  const PRIORITIES = [
    { value: 'low',    label: t('admin.soporte.priority.low') },
    { value: 'normal', label: t('admin.soporte.priority.normal') },
    { value: 'high',   label: t('admin.soporte.priority.high') },
    { value: 'urgent', label: t('admin.soporte.priority.urgent') },
  ];

  const submit = async (e) => {
    // Evitar que el form recargue la página y que el click se trate como
    // "fuera del modal" (que cierra el dialog).
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    console.log('[soporte] submit click', { title, type, priority, descLen: description?.length });

    const titleTrim = (title || '').trim();
    const d = (description || '').trim();
    if (!titleTrim) { toast.error(t('support.create.titleRequired')); return; }
    if (d.length < 10) { toast.error(t('support.create.descriptionTooShort')); return; }

    setSubmitting(true);
    try {
      // 1) Resolver el id de public.users por auth_user_id = auth.uid()
      //    SIN pasar por helpers externos para evitar cualquier punto que
      //    pueda lanzar y bloquear el insert.
      let appUserId = null;
      try {
        const { data: au } = await supabase.auth.getUser();
        const authUid = au?.user?.id || null;
        console.log('[soporte] auth.uid =', authUid);
        if (authUid) {
          const { data: row, error: rowErr } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', authUid)
            .maybeSingle();
          if (rowErr) console.warn('[soporte] users lookup error:', rowErr);
          if (row?.id) appUserId = row.id;
        }
      } catch (lookupErr) {
        console.warn('[soporte] error resolviendo public.users.id:', lookupErr);
      }
      if (!appUserId && user?.id) appUserId = user.id; // fallback

      if (!appUserId) {
        toast.error(t('support.create.notLoggedIn'));
        return;
      }

      // 2) Insert estricto con SOLO las columnas permitidas.
      const payload = {
        title: titleTrim,
        type,
        priority,
        description: d,
        user_id: appUserId,
      };
      console.log('[soporte] insert payload:', payload);

      const { data, error } = await supabase
        .from('tickets')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[tickets.insert] error:', error);
        toast.error(error.message || t('support.create.openError'));
        return;
      }

      console.log('[soporte] ticket creado:', data?.id);
      toast.success(t('support.create.created'));
      try { onCreated?.(data); } catch (_e) { /* el padre no debe romper el flujo */ }
      try { onClose?.(); } catch (_e) {}
    } catch (err) {
      console.error('[tickets.insert] exception:', err);
      toast.error(err?.message || t('support.create.unexpectedError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{t('support.create.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('support.create.subtitle')}</p>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{t('supportChat.ticketSubject')}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('support.create.subjectPlaceholder')}
              className="mt-1.5 w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.soporte.filter.type')}</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 w-full h-10 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                {TYPES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.soporte.filter.priority')}</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1.5 w-full h-10 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{t('description')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder={t('support.create.descriptionPlaceholder')}
              className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-10 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('support.page.openTicket')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Soporte() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then((u) => setUser(u))
      .catch(() => { window.location.href = '/login?next=/soporte'; });
  }, []);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['soporte:tickets', user?.id],
    queryFn: () => base44.entities.Ticket.filter({ user_id: user.id }, '-updated_date', 500),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let arr = tickets;
    if (statusFilter !== 'all') arr = arr.filter((tk) => tk.status === statusFilter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter((tk) =>
        (tk.title || '').toLowerCase().includes(needle) ||
        (tk.description || '').toLowerCase().includes(needle)
      );
    }
    return arr;
  }, [tickets, q, statusFilter]);

  const onCreated = (created) => {
    qc.invalidateQueries({ queryKey: ['soporte:tickets', user?.id] });
    navigate(`/soporte/${created.id}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SEOHead title={t('support.page.seoTitle')} noindex />
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <InboxTabs user={user} unreadChats={0} />

          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                {t('nav.support')}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{t('support.page.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenDialog(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: NAVY }}
            >
              <Plus className="w-4 h-4" /> {t('support.page.openTicket')}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="p-3 md:p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('support.page.searchPlaceholder')}
                  className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="all">{t('support.page.allStatuses')}</option>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{t(v.key)}</option>)}
              </select>
            </div>

            {isLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">{t('support.page.loading')}</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: NAVY_SOFT, color: NAVY }}>
                  <MessageCircle className="w-5 h-5" />
                </div>
                <p className="mt-4 font-semibold text-slate-900">{t('supportChat.noTicketsYet')}</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                  {t('support.page.emptyHint')}
                </p>
                <button
                  type="button"
                  onClick={() => setOpenDialog(true)}
                  className="mt-5 inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: NAVY }}
                >
                  <Plus className="w-4 h-4" /> {t('support.page.openFirst')}
                </button>
              </div>
            ) : (
              <ul>
                {filtered.map((tk) => {
                  const meta = statusMeta(tk.status, t);
                  return (
                    <li key={tk.id} className="border-t border-slate-100 first:border-t-0">
                      <Link
                        to={`/soporte/${tk.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] text-slate-500 font-mono">#{tk.number || tk.id.slice(-6)}</span>
                            <span className="inline-flex text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 truncate">{tk.title || t('admin.soporte.untitled')}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{formatDate(tk.updated_date || tk.created_date)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: NAVY }} />
              <span>
                <Trans
                  i18nKey="support.page.helpHint"
                  components={{
                    help: <Link to="/ayuda" className="font-semibold underline underline-offset-2" style={{ color: NAVY }} />,
                    faq: <Link to="/preguntas-frecuentes" className="font-semibold underline underline-offset-2" style={{ color: NAVY }} />,
                  }}
                />
              </span>
            </p>
          </div>
        </div>
      </main>

      {openDialog && (
        <CreateTicketDialog
          user={user}
          onClose={() => setOpenDialog(false)}
          onCreated={onCreated}
        />
      )}
    </>
  );
}
