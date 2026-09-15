import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  MessageCircle,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  Phone,
  MapPin,
  Tag,
  Star,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────

const DAILY_SOFT_CAP = 25;

const TEMPLATE = (
  'Hola {nombre} 👋 Soy Ilias, de MisAutónomos. Estamos arrancando el directorio de {oficio} en {ciudad} y quiero que tu negocio aparezca entre los primeros. ' +
  'Es gratis de verdad: sin tarjeta ni permanencia. Tendrás una ficha verificada que puedes compartir por WhatsApp con cualquier cliente, + herramientas para llevar agenda, presupuestos y facturas. ' +
  '¿Te paso el enlace para darte de alta en 2 min? Si no te interesa, dímelo y no te vuelvo a escribir 🙏'
);

// Mapeo slug → texto legible para sustituir {oficio} en la plantilla.
// Coherente con scripts/outreach.mjs.
const CATEGORY_LABELS = {
  'fontanero': 'fontanería',
  'electricista': 'electricistas',
  'cerrajero': 'cerrajería',
  'albanil-reformas': 'albañilería y reformas',
  'pintor': 'pintura',
  'carpintero': 'carpintería',
  'autonomo-limpieza': 'limpieza',
  'climatizacion-calefaccion': 'climatización y calefacción',
  'jardinero': 'jardinería',
  'asesoria-gestoria': 'asesoría y gestoría',
  'abogado': 'abogados',
  'informatico-a-domicilio-soporte-it': 'informática a domicilio',
  'marketing-digital-diseno-web': 'marketing digital y diseño web',
  'peluqueria-estetica-domicilio': 'peluquería y estética a domicilio',
  'persianas-toldos': 'persianas y toldos',
  'transportista': 'transporte',
  'empresa-multiservicios': 'multiservicios',
};

function categoryLabel(slug) {
  if (!slug) return 'profesionales';
  return CATEGORY_LABELS[slug] || slug.replace(/-/g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────
// Normalización de teléfono a +34XXXXXXXXX
// ─────────────────────────────────────────────────────────────────────────

function normalizePhoneEs(raw) {
  if (!raw) return null;
  // Elimina todo lo que no sea dígito y un + inicial.
  let digits = String(raw).replace(/[^\d+]/g, '');
  // Si ya empieza por +34, quita el + y sigue.
  if (digits.startsWith('+')) digits = digits.slice(1);

  // Si empieza por 34 + 9 dígitos válidos (móvil 6/7/8/9 o fijo 8/9), bien.
  if (digits.length === 11 && digits.startsWith('34')) {
    const rest = digits.slice(2);
    if (/^[6789]\d{8}$/.test(rest)) return `+34${rest}`;
  }

  // Si son 9 dígitos directos y arrancan por 6/7/8/9, prefija 34.
  if (digits.length === 9 && /^[6789]\d{8}$/.test(digits)) {
    return `+34${digits}`;
  }

  // 00 internacional. Solo aceptamos España.
  if (digits.startsWith('0034') && digits.length === 13) {
    const rest = digits.slice(4);
    if (/^[6789]\d{8}$/.test(rest)) return `+34${rest}`;
  }

  return null;
}

function fillTemplate(template, lead) {
  const nombre = (lead.business_name || '').trim();
  const oficio = categoryLabel(lead.category_slug);
  const ciudad = (lead.city || '').trim() || 'tu zona';
  return template
    .replaceAll('{nombre}', nombre)
    .replaceAll('{oficio}', oficio)
    .replaceAll('{ciudad}', ciudad);
}

function waMeLink(phoneIntl, message) {
  // wa.me espera el número SIN '+' ni espacios.
  const number = phoneIntl.replace(/[^\d]/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Hooks de datos
// ─────────────────────────────────────────────────────────────────────────

function useAdminGuard() {
  const [state, setState] = useState({ loading: true, user: null });
  useEffect(() => {
    let cancelled = false;
    base44.auth.me()
      .then((u) => {
        if (cancelled) return;
        if (u?.role !== 'admin') {
          window.location.href = '/buscar';
          return;
        }
        setState({ loading: false, user: u });
      })
      .catch(() => {
        if (!cancelled) window.location.href = '/login';
      });
    return () => { cancelled = true; };
  }, []);
  return state;
}

// Devuelve los leads en cola: status='nuevo' Y phone IS NOT NULL Y opt_out=false.
// Carga un buffer de 100 y avanzamos por el array en memoria.
function useQueue(enabled) {
  return useQuery({
    queryKey: ['outreach-wa-queue'],
    queryFn: async () => {
      const all = await base44.entities.OutboundLead.filter(
        { status: 'nuevo', opt_out: false },
        'discovered_at',
        100,
      );
      // Sólo los que tienen phone no nulo. (El backend filter no admite "not null",
      // así que filtramos aquí.)
      return (all || []).filter((l) => l.phone && String(l.phone).trim());
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// Contador "enviados hoy" = leads marcados como contactado vía whatsapp en HOY (zona horaria local).
function useSentTodayCount(enabled) {
  return useQuery({
    queryKey: ['outreach-wa-sent-today'],
    queryFn: async () => {
      // Filtramos amplio (últimos 200 contactados con whatsapp) y contamos los de hoy.
      const list = await base44.entities.OutboundLead.filter(
        { status: 'contactado', contact_channel: 'whatsapp' },
        '-contacted_at',
        200,
      );
      const today = new Date();
      const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
      return (list || []).filter((l) => {
        if (!l.contacted_at) return false;
        const t = new Date(l.contacted_at);
        return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
      }).length;
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────

export default function AdminOutreachWhatsAppPage() {
  const guard = useAdminGuard();

  if (guard.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <AdminLayout activeSection="outreach">
      <OutreachWaContent />
    </AdminLayout>
  );
}

function OutreachWaContent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queueQ = useQueue(true);
  const sentTodayQ = useSentTodayCount(true);

  // Índice del lead actual dentro del buffer de cola.
  const [idx, setIdx] = useState(0);
  const [message, setMessage] = useState('');
  const [waOpened, setWaOpened] = useState(false);

  // Si el buffer cambia (refetch), reseteamos índice.
  useEffect(() => {
    setIdx(0);
    setWaOpened(false);
  }, [queueQ.data]);

  const leads = useMemo(() => queueQ.data || [], [queueQ.data]);
  const current = leads[idx] || null;
  const normalizedPhone = useMemo(() => current ? normalizePhoneEs(current.phone) : null, [current]);

  // Cuando cambia el lead actual, rellena el textarea.
  useEffect(() => {
    if (current) setMessage(fillTemplate(TEMPLATE, current));
    else setMessage('');
    setWaOpened(false);
  }, [current?.id]);

  // ── Si phone no normalizable, mark 'sin_telefono_valido' (lo guardamos en notes
  //    y descartamos status='descartado' para que no vuelva a aparecer) y avanza.
  useEffect(() => {
    if (!current) return;
    if (normalizedPhone) return;
    // Auto-skip: marca y pasa.
    autoSkipNoPhone(current).then(() => {
      queryClient.invalidateQueries({ queryKey: ['outreach-wa-queue'] });
      setIdx((i) => Math.min(i + 1, leads.length));
    });
  }, [current, normalizedPhone, queryClient, leads.length]);

  const markContactedMut = useMutation({
    mutationFn: async (lead) => {
      return await base44.entities.OutboundLead.update(lead.id, {
        status: 'contactado',
        contact_channel: 'whatsapp',
        contacted_at: new Date().toISOString(),
        last_outreach_attempts: (lead.last_outreach_attempts || 0) + 1,
      });
    },
    onSuccess: () => {
      toast.success(t('admin.outreach.contacted'));
      queryClient.invalidateQueries({ queryKey: ['outreach-wa-sent-today'] });
      advance();
    },
    onError: (err) => toast.error(t('admin.outreach.updateError', { message: err.message || t('admin.outreach.updateErrorFallback') })),
  });

  const discardMut = useMutation({
    mutationFn: async (lead) => {
      return await base44.entities.OutboundLead.update(lead.id, {
        status: 'descartado',
        notes: lead.notes ? `${lead.notes}\n[descartado manual desde admin]` : '[descartado manual desde admin]',
      });
    },
    onSuccess: () => {
      toast.success(t('admin.outreach.discarded'));
      advance();
    },
    onError: (err) => toast.error(t('admin.outreach.updateError', { message: err.message || t('admin.outreach.updateErrorFallback') })),
  });

  const advance = useCallback(() => {
    setWaOpened(false);
    setIdx((i) => i + 1);
    // Cuando hemos vaciado el buffer, refetch para recargar lo siguiente.
    setTimeout(() => {
      if (idx + 1 >= leads.length - 1) {
        queryClient.invalidateQueries({ queryKey: ['outreach-wa-queue'] });
      }
    }, 0);
  }, [idx, leads.length, queryClient]);

  const handleOpenWa = () => {
    if (!current || !normalizedPhone) return;
    const url = waMeLink(normalizedPhone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    setWaOpened(true);
  };

  const sentToday = sentTodayQ.data ?? 0;
  const overCap = sentToday >= DAILY_SOFT_CAP;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
      {/* Header */}
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
          {t('admin.outreach.eyebrow')}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900" style={{ letterSpacing: '-0.02em' }}>
          {t('admin.outreach.title')}
        </h1>
        <p className="mt-2 text-slate-500 text-sm">
          {t('admin.outreach.subtitle')}
        </p>
      </header>

      {/* Contador del día */}
      <div className={`rounded-2xl border px-4 py-3 mb-6 flex items-center justify-between ${overCap ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-700 font-medium">{t('admin.outreach.sentToday')}</span>
          <span className={`text-base font-bold ${overCap ? 'text-amber-700' : 'text-slate-900'}`}>{sentTodayQ.isLoading ? '…' : sentToday}</span>
          <span className="text-slate-400">{t('admin.outreach.recommendedCap', { cap: DAILY_SOFT_CAP })}</span>
        </div>
        <button
          type="button"
          onClick={() => { queryClient.invalidateQueries({ queryKey: ['outreach-wa-queue'] }); queryClient.invalidateQueries({ queryKey: ['outreach-wa-sent-today'] }); }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          aria-label={t('admin.outreach.reloadQueue')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('admin.outreach.reload')}
        </button>
      </div>

      {overCap && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">{t('admin.outreach.capReached.title')}</p>
            <p>{t('admin.outreach.capReached.text', { sent: sentToday, cap: DAILY_SOFT_CAP })}</p>
          </div>
        </div>
      )}

      {/* Estado de carga */}
      {queueQ.isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t('admin.outreach.loadingQueue')}</p>
        </div>
      )}

      {!queueQ.isLoading && queueQ.isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8">
          <p className="text-sm text-rose-800">{t('admin.outreach.queueError', { message: String(queueQ.error?.message || queueQ.error) })}</p>
        </div>
      )}

      {!queueQ.isLoading && !queueQ.isError && !current && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 mb-1">{t('admin.outreach.empty.title')}</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            <Trans
              i18nKey="admin.outreach.empty.text"
              components={[<code key="status" />, <code key="script" />]}
            />
          </p>
        </div>
      )}

      {/* Lead actual */}
      {current && normalizedPhone && (
        <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Cabecera del lead */}
          <header className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.01em' }}>
                  {current.business_name || t('admin.outreach.leadNoName')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('admin.outreach.leadPosition', { index: idx + 1, total: leads.length })}
                </p>
              </div>
              {current.user_ratings_total > 0 && (
                <div className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-1 flex-shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {Number(current.rating || 0).toFixed(1)} <span className="text-slate-400">({current.user_ratings_total})</span>
                </div>
              )}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="inline-flex items-center gap-1.5 text-slate-600">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>{categoryLabel(current.category_slug)}</span>
              </div>
              {current.city && (
                <div className="inline-flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{current.city}</span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{normalizedPhone}</span>
              </div>
              {current.website && (
                <a href={current.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline truncate">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{stripUrl(current.website)}</span>
                </a>
              )}
            </dl>
            {current.address && (
              <p className="text-xs text-slate-400 mt-2">{current.address}</p>
            )}
          </header>

          {/* Mensaje editable */}
          <div className="px-6 py-5">
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 mb-2">
              {t('admin.outreach.messageLabel')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={9}
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00255C]/15 focus:border-[#00255C] resize-y"
              placeholder={t('admin.outreach.messagePlaceholder')}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              {t('admin.outreach.templateHint')}
            </p>
          </div>

          {/* Acción principal */}
          <div className="px-6 pb-5">
            <button
              type="button"
              onClick={handleOpenWa}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-white font-semibold text-[15px] transition-colors"
              style={{ backgroundColor: '#1FAD4F' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#168D40')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1FAD4F')}
            >
              <WhatsAppIcon className="w-5 h-5" />
              {waOpened ? t('admin.outreach.openWhatsAppAgain') : t('admin.outreach.openWhatsApp')}
            </button>
            {!waOpened && (
              <p className="mt-2 text-[11px] text-center text-slate-400">
                {t('admin.outreach.openHint')}
              </p>
            )}
          </div>

          {/* Acciones de resultado */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={markContactedMut.isPending}
              onClick={() => markContactedMut.mutate(current)}
              className="inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white font-semibold text-sm transition-colors"
              style={{ backgroundColor: '#00255C' }}
              onMouseEnter={(e) => !markContactedMut.isPending && (e.currentTarget.style.backgroundColor = '#001A45')}
              onMouseLeave={(e) => !markContactedMut.isPending && (e.currentTarget.style.backgroundColor = '#00255C')}
            >
              {markContactedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t('admin.outreach.markContacted')}
            </button>
            <button
              type="button"
              disabled={discardMut.isPending}
              onClick={() => discardMut.mutate(current)}
              className="inline-flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {discardMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              {t('admin.outreach.discard')}
            </button>
          </div>
        </article>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

async function autoSkipNoPhone(lead) {
  try {
    await base44.entities.OutboundLead.update(lead.id, {
      status: 'descartado',
      notes: lead.notes ? `${lead.notes}\n[sin_telefono_valido]` : '[sin_telefono_valido]',
    });
  } catch (e) {
    console.warn('No se pudo marcar lead sin teléfono válido:', e);
  }
}

function stripUrl(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
}

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
