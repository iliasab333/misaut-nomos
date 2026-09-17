import React, { useEffect, useMemo, useState } from 'react';
import { SkeletonList } from '@/components/ListStates';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconPlus, IconSearch, IconMessageCircle, IconSpinner, IconAlert, IconChevronRight,
} from '@/components/Icons';
import { toast } from '@/lib/toast';
import Modal from '@/components/Modal';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import SEOHead from '@/components/seo/SEOHead';

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
      try { onClose?.(); } catch (_e) { /* cerrar el modal nunca debe romper el flujo */ }
    } catch (err) {
      console.error('[tickets.insert] exception:', err);
      toast.error(err?.message || t('support.create.unexpectedError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('support.create.title')}
      description={t('support.create.subtitle')}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="ticket-subject">{t('supportChat.ticketSubject')}</label>
          <input
            id="ticket-subject"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('support.create.subjectPlaceholder')}
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ticket-type">{t('admin.soporte.filter.type')}</label>
            <select id="ticket-type" value={type} onChange={(e) => setType(e.target.value)} className="select">
              {TYPES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ticket-priority">{t('admin.soporte.filter.priority')}</label>
            <select id="ticket-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="select">
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ticket-description">{t('description')}</label>
          <textarea
            id="ticket-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder={t('support.create.descriptionPlaceholder')}
            className="textarea"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="btn-primary"
            style={{ background: NAVY }}
          >
            {submitting ? <IconSpinner className="w-4 h-4 animate-spin" /> : null}
            {t('support.page.openTicket')}
          </button>
        </div>
      </form>
    </Modal>
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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <IconSpinner className="w-6 h-6 animate-spin text-c-muted" />
      </div>
    );
  }

  return (
    <>
      <SEOHead title={t('support.page.seoTitle')} noindex />
      <main className="min-h-screen bg-surface">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">

          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-ink" style={{ letterSpacing: '-0.02em' }}>
                {t('nav.support')}
              </h1>
              <p className="text-sm text-c-muted mt-1">{t('support.page.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenDialog(true)}
              className="btn-primary btn-sm"
              style={{ background: NAVY }}
            >
              <IconPlus className="w-4 h-4" /> {t('support.page.openTicket')}
            </button>
          </div>

          <div className="rounded-2xl border border-c-border bg-surface">
            <div className="p-3 md:p-4 border-b border-c-border flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-c-muted pointer-events-none" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('support.page.searchPlaceholder')}
                  aria-label={t('common.search')}
                  className="input pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label={t('admin.soporte.filter.status')}
                className="select w-auto"
              >
                <option value="all">{t('support.page.allStatuses')}</option>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{t(v.key)}</option>)}
              </select>
            </div>

            {isLoading ? (
              <div className="p-3" role="status" aria-live="polite">
                <span className="sr-only">{t('support.page.loading')}</span>
                <SkeletonList count={3} avatar={false} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: NAVY_SOFT, color: NAVY }}>
                  <IconMessageCircle className="w-5 h-5" />
                </div>
                <p className="mt-4 font-semibold text-ink">{t('supportChat.noTicketsYet')}</p>
                <p className="text-sm text-c-muted mt-1 max-w-xs mx-auto">
                  {t('support.page.emptyHint')}
                </p>
                <button
                  type="button"
                  onClick={() => setOpenDialog(true)}
                  className="btn-primary btn-sm mt-5"
                  style={{ background: NAVY }}
                >
                  <IconPlus className="w-4 h-4" /> {t('support.page.openFirst')}
                </button>
              </div>
            ) : (
              <ul>
                {filtered.map((tk) => {
                  const meta = statusMeta(tk.status, t);
                  return (
                    <li key={tk.id} className="border-t border-c-border first:border-t-0">
                      <Link
                        to={`/soporte/${tk.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-soft transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] text-c-muted font-mono">#{tk.number || tk.id.slice(-6)}</span>
                            <span className="inline-flex text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-ink truncate">{tk.title || t('admin.soporte.untitled')}</p>
                          <p className="text-xs text-c-muted mt-0.5">{formatDate(tk.updated_date || tk.created_date)}</p>
                        </div>
                        <IconChevronRight className="w-4 h-4 text-c-muted flex-shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-c-border bg-surface p-5 text-sm text-c-muted">
            <p className="flex items-start gap-2">
              <IconAlert className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: NAVY }} />
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
