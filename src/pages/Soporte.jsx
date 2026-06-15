import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const STATUS = {
  open:         { label: 'Abierto',        bg: '#FEF3C7', color: '#92400E' },
  in_progress:  { label: 'En curso',       bg: '#DBEAFE', color: '#1E40AF' },
  waiting_user: { label: 'Esperando tu respuesta', bg: '#F3E8FF', color: '#6B21A8' },
  resolved:     { label: 'Resuelto',       bg: '#D1FAE5', color: '#065F46' },
  closed:       { label: 'Cerrado',        bg: '#E5E7EB', color: '#374151' },
};
const statusMeta = (s) => STATUS[s] || { label: s || '—', bg: '#E5E7EB', color: '#374151' };
const formatDate = (d) => { try { return new Date(d).toLocaleString('es-ES'); } catch { return ''; } };

const TYPES = [
  { value: 'question', label: 'Pregunta' },
  { value: 'bug', label: 'Problema técnico' },
  { value: 'billing', label: 'Facturación' },
  { value: 'feature', label: 'Sugerencia / mejora' },
  { value: 'other', label: 'Otro' },
];
const PRIORITIES = [
  { value: 'low',    label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

function CreateTicketDialog({ user, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('question');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    // Evitar que el form recargue la página y que el click se trate como
    // "fuera del modal" (que cierra el dialog).
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    console.log('[soporte] submit click', { title, type, priority, descLen: description?.length });

    const t = (title || '').trim();
    const d = (description || '').trim();
    if (!t) { toast.error('Pon un título corto'); return; }
    if (d.length < 10) { toast.error('Cuéntanos un poco más en la descripción'); return; }

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
        toast.error('No estás logueado. Vuelve a iniciar sesión.');
        return;
      }

      // 2) Insert estricto con SOLO las columnas permitidas.
      const payload = {
        title: t,
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
        toast.error(error.message || 'No se pudo abrir el ticket');
        return;
      }

      console.log('[soporte] ticket creado:', data?.id);
      toast.success('✓ Ticket creado');
      try { onCreated?.(data); } catch (_e) { /* el padre no debe romper el flujo */ }
      try { onClose?.(); } catch (_e) {}
    } catch (err) {
      console.error('[tickets.insert] exception:', err);
      toast.error(err?.message || 'Error inesperado al abrir el ticket');
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
          <h2 className="font-semibold text-slate-900">Abrir un ticket</h2>
          <p className="text-xs text-slate-500 mt-0.5">Soporte humano. Te respondemos en menos de 24 h laborables.</p>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Asunto</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. No me llegan los emails de la newsletter"
              className="mt-1.5 w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Tipo</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 w-full h-10 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Prioridad</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1.5 w-full h-10 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Descripción</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Cuéntanos qué pasa, qué esperabas y desde cuándo. Cuanto más concreto, mejor."
              className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-10 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg">
              Cancelar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Abrir ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Soporte() {
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
    if (statusFilter !== 'all') arr = arr.filter((t) => t.status === statusFilter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter((t) =>
        (t.title || '').toLowerCase().includes(needle) ||
        (t.description || '').toLowerCase().includes(needle)
      );
    }
    return arr;
  }, [tickets, q, statusFilter]);

  const onCreated = (t) => {
    qc.invalidateQueries({ queryKey: ['soporte:tickets', user?.id] });
    navigate(`/soporte/${t.id}`);
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
      <SEOHead title="Soporte · MisAutónomos" noindex />
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <InboxTabs user={user} unreadChats={0} />

          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                Soporte
              </h1>
              <p className="text-sm text-slate-500 mt-1">Tus tickets y respuestas del equipo.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenDialog(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: NAVY }}
            >
              <Plus className="w-4 h-4" /> Abrir ticket
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
                  placeholder="Buscar en tus tickets…"
                  className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="all">Estado: todos</option>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {isLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Cargando tickets…</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: NAVY_SOFT, color: NAVY }}>
                  <MessageCircle className="w-5 h-5" />
                </div>
                <p className="mt-4 font-semibold text-slate-900">Aún no tienes tickets</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                  Cuando abras uno, lo verás aquí y nuestro equipo te responderá por hilo.
                </p>
                <button
                  type="button"
                  onClick={() => setOpenDialog(true)}
                  className="mt-5 inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: NAVY }}
                >
                  <Plus className="w-4 h-4" /> Abrir mi primer ticket
                </button>
              </div>
            ) : (
              <ul>
                {filtered.map((t) => {
                  const meta = statusMeta(t.status);
                  return (
                    <li key={t.id} className="border-t border-slate-100 first:border-t-0">
                      <Link
                        to={`/soporte/${t.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] text-slate-500 font-mono">#{t.number || t.id.slice(-6)}</span>
                            <span className="inline-flex text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 truncate">{t.title || 'Sin título'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{formatDate(t.updated_date || t.created_date)}</p>
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
                ¿Una duda rápida? También puedes mirar el{' '}
                <Link to="/ayuda" className="font-semibold underline underline-offset-2" style={{ color: NAVY }}>centro de ayuda</Link>{' '}o leer las{' '}
                <Link to="/preguntas-frecuentes" className="font-semibold underline underline-offset-2" style={{ color: NAVY }}>preguntas frecuentes</Link>.
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
