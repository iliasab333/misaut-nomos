// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  PANEL — lo que hay que atender, cómo va el sitio y dónde se gestiona   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Tres preguntas en ese orden. La versión anterior contestaba sólo a la
// segunda —ocho cifras y tres rankings de reparto— y no enlazaba a ninguna de
// las otras siete pantallas del panel: se llegaba a ellas por el menú lateral
// o escribiendo la URL. Lo primero que se ve ahora es lo único sobre lo que
// hay que hacer algo, con el enlace al sitio donde se hace.
//
// Dos cosas se hacen aquí a mano, y las dos por un motivo medido:
//
//   1. Se lee con `supabase.from(…).select('columnas')` y NO con
//      `base44.entities.X.list()`. El adaptador hace `select('*')`, y
//      `professional_profiles` tiene 63 columnas entre las que están `iban`,
//      `cif_nif`, `email_contacto` y `telefono_contacto`. Pintar el nombre y
//      la ciudad de 56 fichas no justifica bajarse al navegador el IBAN de
//      56 autónomos. Es el mismo cliente que ya usan AdminNewsletter o
//      Soporte, no uno nuevo.
//
//   2. Se pagina a mano. PostgREST devuelve como máximo 1000 filas por
//      respuesta y el `limit` que se le pida NO sube ese techo (comprobado:
//      `limit=20000` devuelve 1000). `profile_metrics` lleva 1.312 filas en
//      los últimos 60 días —886 sólo en los últimos 30—, así que leerlo de
//      una sola petición perdía filas en silencio y las cifras salían bajas
//      sin que nada avisara.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { getProfileSeoUrl } from '@/lib/seoUrl';
import {
  IconUsers, IconBriefcase, IconEye, IconPointerClick, IconShield, IconTicket,
  IconCamera, IconStar, IconBook, IconMail, IconSend, IconWhatsApp,
  IconHeadphones, IconArrowRight, IconExternal, IconSuccess, IconAlert,
} from '@/components/Icons';
import { SkeletonLine } from '@/components/ListStates';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const NAVY_SOFT = 'rgba(0,37,92,0.06)';
const AMBAR = '#B45309';
const AMBAR_SOFT = 'rgba(180,83,9,0.08)';

// Sólo las columnas que se pintan (el motivo, arriba). De ellas, `user_id`
// está aquí por una trampa que cuesta una cifra equivocada: las dos
// tablas que se cruzan con las fichas NO usan el mismo identificador.
// `profile_metrics.professional_id` es el id de la FICHA, y
// `reviews.professional_id` es el id del USUARIO dueño de la ficha (así lo
// escribe ReviewSection y así lo lee Autonomo, que le pasa `profile.user_id`).
// Cruzar las valoraciones por `id` da cero coincidencias y el panel anunciaba
// 56 fichas sin valorar de 56.
const COLUMNAS_FICHA = 'id,user_id,business_name,ciudad,categories,slug_publico,visible_en_busqueda,onboarding_completed,imagen_principal,created_date';
const COLUMNAS_METRICA = 'professional_id,date,profile_views,contact_clicks';

const TOPE_POSTGREST = 1000;
const DIAS_A_LEER = 60; // 30 del periodo + 30 del anterior, para comparar
const TOPE_LISTA = 10;  // cuántas fichas frías se enseñan; el texto lo dice

/** Lee una tabla entera en páginas de 1000. `construir` debe devolver una
 *  consulta con un orden estable: sin `order` el reparto entre páginas lo
 *  decide el planificador y una fila puede salir dos veces o ninguna. */
async function todasLasFilas(construir) {
  const acumulado = [];
  for (let desde = 0; ; desde += TOPE_POSTGREST) {
    const { data, error } = await construir().range(desde, desde + TOPE_POSTGREST - 1);
    if (error) throw error;
    acumulado.push(...(data || []));
    if (!data || data.length < TOPE_POSTGREST) return acumulado;
  }
}

/** Un contador sin traerse las filas: `head: true` pide sólo la cabecera. */
async function contar(tabla, afinar = (q) => q) {
  const { count, error } = await afinar(supabase.from(tabla).select('id', { count: 'exact', head: true }));
  if (error) throw error;
  return count || 0;
}

// El día de `profile_metrics` lo pone la base con `current_date`, que en
// Supabase es UTC. Calcular aquí el día con la hora local haría que entre
// medianoche y las dos de la mañana en España «hoy» fuera el día siguiente y
// la columna saliera a cero.
function diaUTC(hace = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - hace);
  return d.toISOString().slice(0, 10);
}

const soloFecha = (iso) => (typeof iso === 'string' ? iso.slice(0, 10) : '');
const enRango = (dia, desde, hasta) => !!dia && dia >= desde && dia <= hasta;
const esPublicada = (p) => p.visible_en_busqueda === true && p.onboarding_completed === true;
const num = (n) => Number(n || 0).toLocaleString('es-ES');

// ── piezas de interfaz ──────────────────────────────────────────────────────

function Tarea({ icon: Icon, titulo, detalle, enlace, etiquetaEnlace }) {
  return (
    <li className="card rounded-2xl p-4 flex items-start gap-3">
      <span
        className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl"
        style={{ background: AMBAR_SOFT, color: AMBAR }}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{titulo}</p>
        {detalle && <p className="text-xs text-c-muted mt-0.5">{detalle}</p>}
        <Link
          to={enlace}
          className="inline-flex items-center gap-1 text-xs font-semibold mt-2 hover:underline"
          style={{ color: NAVY }}
        >
          {etiquetaEnlace}<IconArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </li>
  );
}

/** Una cifra del periodo y su comparación con el periodo anterior. El delta
 *  se pinta en texto y no con un icono de color: en un móvil a pleno sol una
 *  flecha verde y una roja son la misma flecha gris. */
function Cifra({ icon: Icon, etiqueta, valor, anterior, textoAnterior }) {
  const delta = valor - anterior;
  const signo = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg mt-0.5"
        style={{ background: NAVY_SOFT, color: NAVY }}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted">{etiqueta}</p>
        <p className="text-2xl font-semibold text-ink tabular-nums leading-tight mt-0.5">{num(valor)}</p>
        <p className="text-xs text-c-muted mt-0.5">
          {delta !== 0 && (
            <span className="font-semibold" style={{ color: delta > 0 ? '#15803D' : AMBAR }}>
              {signo}{num(Math.abs(delta))}{' '}
            </span>
          )}
          {textoAnterior}
        </p>
      </div>
    </div>
  );
}

function Seccion({ icon: Icon, nombre, descripcion, contador, enlace }) {
  return (
    <Link to={enlace} className="card rounded-2xl p-4 flex items-start gap-3 hover:shadow-md transition">
      <span
        className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl"
        style={{ background: NAVY_SOFT, color: NAVY }}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{nombre}</p>
        <p className="text-xs text-c-muted mt-0.5">{descripcion}</p>
        {contador && <p className="text-xs font-semibold mt-1.5 tabular-nums" style={{ color: NAVY }}>{contador}</p>}
      </div>
      <IconArrowRight className="w-4 h-4 text-c-muted flex-shrink-0 mt-2" />
    </Link>
  );
}

function ListaFichas({ titulo, nota, fichas, vacia, render }) {
  return (
    <div className="card rounded-2xl p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted">{titulo}</h3>
      {/* La nota cuenta cuántas hay y cuántas se enseñan: con la lista vacía
          no cuenta nada y contradecía al texto de «no hay ninguna». */}
      {nota && fichas.length > 0 && <p className="text-xs text-c-muted mt-1">{nota}</p>}
      {fichas.length === 0 ? (
        <p className="text-sm text-c-muted mt-4">{vacia}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {fichas.map((f) => (
            <li key={f.id} className="flex items-baseline justify-between gap-3">
              <a
                href={getProfileSeoUrl(f)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-ink hover:underline truncate inline-flex items-center gap-1"
                style={{ color: NAVY }}
              >
                <span className="truncate">{f.business_name || '—'}</span>
                <IconExternal className="w-3 h-3 flex-shrink-0 text-c-muted" />
              </a>
              <span className="text-xs text-c-muted flex-shrink-0 tabular-nums">{render(f)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Cargando() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card rounded-2xl p-5">
          <SkeletonLine width="6rem" height={12} />
          <div className="mt-4"><SkeletonLine width="4rem" height={28} /></div>
          <div className="mt-3"><SkeletonLine width="8rem" height={12} /></div>
        </div>
      ))}
    </div>
  );
}

// ── página ──────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { t } = useTranslation();

  // Quién mira, antes de leer nada. No es que la RLS no proteja los datos
  // —`is_admin()` los cierra en el servidor y es ahí donde se decide—: es que
  // los cierra devolviendo CERO FILAS y ningún error, y cero filas aquí se
  // pintan igual que «no ha pasado nada». Sin esta comprobación un visitante
  // cualquiera veía en /admin «0 usuarios», «0 visitas frente a 0 ayer» y
  // diez autónomos con nombre y apellido bajo el titular «publicadas y sin
  // una sola visita en 7 días», que de él no es ni cierto ni suyo.
  const sesionQ = useQuery({
    queryKey: ['panel:sesion'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 60_000,
  });
  const esAdmin = sesionQ.data?.role === 'admin';

  const fichasQ = useQuery({
    enabled: esAdmin,
    queryKey: ['panel:fichas'],
    queryFn: () => todasLasFilas(() => supabase
      .from('professional_profiles')
      .select(COLUMNAS_FICHA)
      .order('created_date', { ascending: false })
      .order('id')),
    staleTime: 60_000,
  });

  const metricasQ = useQuery({
    enabled: esAdmin,
    queryKey: ['panel:metricas'],
    queryFn: () => todasLasFilas(() => supabase
      .from('profile_metrics')
      .select(COLUMNAS_METRICA)
      .gte('date', diaUTC(DIAS_A_LEER - 1))
      .order('date', { ascending: true })
      .order('professional_id')),
    staleTime: 60_000,
  });

  const pendientesQ = useQuery({
    enabled: esAdmin,
    queryKey: ['panel:pendientes'],
    queryFn: async () => {
      const [verificaciones, tickets, valoraciones] = await Promise.all([
        todasLasFilas(() => supabase
          .from('identity_verifications')
          .select('id,created_date')
          .eq('status', 'pending')
          .order('created_date', { ascending: true })),
        // Un ticket está «abierto» si NO está cerrado, y no al revés: en esta
        // base conviven dos vocabularios de estado —AdminTickets escribe
        // `abierto`/`en_progreso` y AdminSoporte `open`/`in_progress`—, así que
        // contar por la lista de estados abiertos deja tickets fuera. Por lo
        // cerrado se cuentan todos.
        //
        // El `status.is.null` del `or` no es defensa de más: `status` admite
        // nulos y en SQL `null not in (…)` no es cierto, es desconocido, así
        // que un ticket sin estado se caía del filtro y no lo contaba nadie
        // —justo el que más falta hace ver—. Se ordena por `id` porque
        // `created_date` también es nulable y el orden tiene que ser estable
        // entre páginas.
        todasLasFilas(() => supabase
          .from('tickets')
          .select('id')
          .or('status.is.null,status.not.in.(resuelto,cerrado,resolved,closed)')
          .order('id')),
        todasLasFilas(() => supabase
          .from('reviews')
          .select('professional_id')
          .order('id')),
      ]);
      return { verificaciones, ticketsAbiertos: tickets.length, valoraciones };
    },
    staleTime: 60_000,
  });

  const contadoresQ = useQuery({
    enabled: esAdmin,
    queryKey: ['panel:contadores'],
    queryFn: async () => {
      const [usuarios, posts, suscriptores] = await Promise.all([
        contar('users'),
        contar('blog_posts', (q) => q.eq('status', 'published')),
        contar('newsletter_subscribers', (q) => q.eq('status', 'confirmed')),
      ]);
      return { usuarios, posts, suscriptores };
    },
    staleTime: 60_000,
  });

  const fichas = fichasQ.data || [];
  const metricas = metricasQ.data || [];
  const pendientes = pendientesQ.data;
  const contadores = contadoresQ.data;

  // Un periodo de n días terminado hoy, y el de n días justo anterior.
  const periodos = useMemo(() => [1, 7, 30].map((dias) => {
    const hasta = diaUTC(0);
    const desde = diaUTC(dias - 1);
    const antesHasta = diaUTC(dias);
    const antesDesde = diaUTC(dias * 2 - 1);

    const sumar = (d1, d2) => {
      const total = { visitas: 0, contactos: 0 };
      for (const m of metricas) {
        if (!enRango(m.date, d1, d2)) continue;
        total.visitas += Number(m.profile_views || 0);
        total.contactos += Number(m.contact_clicks || 0);
      }
      return total;
    };
    const nuevas = (d1, d2) => fichas.filter((p) => enRango(soloFecha(p.created_date), d1, d2)).length;

    return {
      dias,
      actual: { ...sumar(desde, hasta), fichas: nuevas(desde, hasta) },
      anterior: { ...sumar(antesDesde, antesHasta), fichas: nuevas(antesDesde, antesHasta) },
    };
  }), [metricas, fichas]);

  // Visitas por ficha en los últimos 7 días: de aquí salen las dos listas.
  const semana = useMemo(() => {
    const desde = diaUTC(6), hasta = diaUTC(0);
    const porFicha = new Map();
    for (const m of metricas) {
      if (!enRango(m.date, desde, hasta)) continue;
      porFicha.set(m.professional_id, (porFicha.get(m.professional_id) || 0) + Number(m.profile_views || 0));
    }
    const publicadas = fichas.filter(esPublicada);
    const masVistas = publicadas
      .map((p) => ({ ...p, visitas: porFicha.get(p.id) || 0 }))
      .filter((p) => p.visitas > 0)
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 5);
    const sinVisitas = publicadas.filter((p) => !(porFicha.get(p.id) > 0));
    return { masVistas, sinVisitas };
  }, [metricas, fichas]);

  const tareas = useMemo(() => {
    if (!pendientes) return [];
    const lista = [];

    if (pendientes.verificaciones.length) {
      // La edad sólo se dice cuando hay algo que decir: con una verificación
      // llegada hoy salía «lleva 0 días esperando, y el producto promete
      // 24-48 h», que es un reproche por nada. Y la fecha se mira antes de
      // restarla: `new Date(null)` no es una fecha inválida, es el 1 de enero
      // de 1970, así que una verificación sin fecha anunciaba 20.735 días de
      // espera con toda la seguridad del mundo.
      const masVieja = pendientes.verificaciones[0];
      const nacida = masVieja.created_date ? new Date(masVieja.created_date).getTime() : NaN;
      const dias = Math.floor((Date.now() - nacida) / 86_400_000);
      lista.push({
        clave: 'verificaciones',
        icon: IconShield,
        titulo: t('admin.dashboard.pending.verifications', { count: pendientes.verificaciones.length }),
        detalle: Number.isFinite(dias) && dias >= 1
          ? t('admin.dashboard.pending.verificationsAge', { count: dias })
          : null,
        // Ya hay pantalla propia de revisión de identidad. Antes esto
        // enlazaba a /admin/usuarios —el listado de fichas con su columna
        // «Verificado»—, que era lo más cerca que se podía llegar: enseñaba
        // que faltaba revisar sin dejar ver ni un documento.
        enlace: '/admin/verificar',
        etiquetaEnlace: t('admin.dashboard.pending.goVerify'),
      });
    }
    if (pendientes.ticketsAbiertos) {
      lista.push({
        clave: 'tickets',
        icon: IconTicket,
        titulo: t('admin.dashboard.pending.tickets', { count: pendientes.ticketsAbiertos }),
        detalle: t('admin.dashboard.pending.ticketsHint'),
        enlace: '/admin/soporte',
        etiquetaEnlace: t('admin.dashboard.pending.goSupport'),
      });
    }

    const publicadas = fichas.filter(esPublicada);
    const sinFoto = publicadas.filter((p) => !p.imagen_principal).length;
    if (sinFoto) {
      lista.push({
        clave: 'sinFoto',
        icon: IconCamera,
        titulo: t('admin.dashboard.pending.noPhoto', { count: sinFoto }),
        detalle: t('admin.dashboard.pending.noPhotoHint'),
        enlace: '/admin/usuarios',
        etiquetaEnlace: t('admin.dashboard.pending.goUsers'),
      });
    }

    // Ojo al identificador: las valoraciones se guardan contra el usuario
    // dueño de la ficha, no contra la ficha. Ver COLUMNAS_FICHA.
    const conValoracion = new Set(pendientes.valoraciones.map((r) => r.professional_id));
    const sinValorar = publicadas.filter((p) => !conValoracion.has(p.user_id)).length;
    if (sinValorar) {
      lista.push({
        clave: 'sinValorar',
        icon: IconStar,
        titulo: t('admin.dashboard.pending.noReviews', { count: sinValorar }),
        detalle: t('admin.dashboard.pending.noReviewsHint'),
        enlace: '/admin/usuarios',
        etiquetaEnlace: t('admin.dashboard.pending.goUsers'),
      });
    }
    return lista;
  }, [pendientes, fichas, t]);

  const secciones = [
    {
      clave: 'verificar', icon: IconShield, enlace: '/admin/verificar',
      nombre: t('admin.dashboard.sections.verify.name'),
      descripcion: t('admin.dashboard.sections.verify.desc'),
      contador: pendientes
        ? t('admin.dashboard.sections.verify.count', { count: pendientes.verificaciones.length })
        : null,
    },
    {
      clave: 'usuarios', icon: IconUsers, enlace: '/admin/usuarios',
      nombre: t('admin.dashboard.sections.users.name'),
      descripcion: t('admin.dashboard.sections.users.desc'),
      contador: contadores
        ? t('admin.dashboard.sections.users.count', { users: num(contadores.usuarios), profiles: num(fichas.length) })
        : null,
    },
    {
      clave: 'soporte', icon: IconHeadphones, enlace: '/admin/soporte',
      nombre: t('admin.dashboard.sections.support.name'),
      descripcion: t('admin.dashboard.sections.support.desc'),
      contador: pendientes ? t('admin.dashboard.sections.support.count', { count: pendientes.ticketsAbiertos }) : null,
    },
    {
      clave: 'tickets', icon: IconTicket, enlace: '/admin/tickets',
      nombre: t('admin.dashboard.sections.tickets.name'),
      descripcion: t('admin.dashboard.sections.tickets.desc'),
      contador: pendientes ? t('admin.dashboard.sections.tickets.count', { count: pendientes.ticketsAbiertos }) : null,
    },
    {
      clave: 'blog', icon: IconBook, enlace: '/admin/blog',
      nombre: t('admin.dashboard.sections.blog.name'),
      descripcion: t('admin.dashboard.sections.blog.desc'),
      contador: contadores ? t('admin.dashboard.sections.blog.count', { count: contadores.posts }) : null,
    },
    {
      clave: 'newsletter', icon: IconMail, enlace: '/admin/newsletter',
      nombre: t('admin.dashboard.sections.newsletter.name'),
      descripcion: t('admin.dashboard.sections.newsletter.desc'),
      contador: contadores ? t('admin.dashboard.sections.newsletter.count', { count: contadores.suscriptores }) : null,
    },
    {
      clave: 'emails', icon: IconSend, enlace: '/admin/emails',
      nombre: t('admin.dashboard.sections.emails.name'),
      descripcion: t('admin.dashboard.sections.emails.desc'),
      contador: null,
    },
    {
      clave: 'outreach', icon: IconWhatsApp, enlace: '/admin/outreach-whatsapp',
      nombre: t('admin.dashboard.sections.outreach.name'),
      descripcion: t('admin.dashboard.sections.outreach.desc'),
      contador: null,
    },
  ];

  const cargando = sesionQ.isLoading || fichasQ.isLoading || metricasQ.isLoading || pendientesQ.isLoading;
  const fallo = fichasQ.error || metricasQ.error || pendientesQ.error || contadoresQ.error;

  // Una lectura que falla deja la lista vacía, no lanza nada, y una lista
  // vacía aquí se pinta igual que «no hay nada que atender» o «no ha entrado
  // nadie»: ceros con pinta de dato bueno, justo debajo del aviso rojo que
  // dice lo contrario. Cada bloque se calla si le ha fallado su lectura.
  const tareasFiables = !!pendientes && !fichasQ.error;
  const pulsoFiable = !metricasQ.error && !fichasQ.error;

  // «Se muestran las 10 primeras» sólo es verdad cuando hay más de 10. Con 2
  // la frase sobraba y con 0 se leía «0 fichas. Se muestran las 10 primeras»
  // justo encima de «todas han recibido alguna visita».
  const notaFrias = [
    t('admin.dashboard.week.coldNote', { count: semana.sinVisitas.length }),
    semana.sinVisitas.length > TOPE_LISTA ? t('admin.dashboard.week.coldTruncated', { shown: TOPE_LISTA }) : '',
  ].filter(Boolean).join(' ');

  const nombrePeriodo = (dias) => (
    dias === 1 ? t('admin.dashboard.pulse.today')
      : t('admin.dashboard.pulse.lastDays', { days: dias })
  );
  const textoAnterior = (dias, valor) => (
    dias === 1 ? t('admin.dashboard.pulse.vsYesterday', { value: num(valor) })
      : t('admin.dashboard.pulse.vsPrevious', { days: dias, value: num(valor) })
  );

  return (
    <>
      <SEOHead title={t('admin.dashboard.seoTitle')} noindex />
      <main className="min-h-screen bg-canvas">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <header className="mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink" style={{ letterSpacing: '-0.02em' }}>
              {t('admin.dashboard.title')}
            </h1>
            <p className="text-sm text-c-muted mt-1">{t('admin.dashboard.subtitle')}</p>
          </header>

          {!cargando && !esAdmin && (
            <div className="card rounded-2xl p-5 flex items-start gap-3">
              <IconAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: AMBAR }} />
              <div>
                <p className="text-sm font-semibold text-ink">{t('admin.dashboard.notAdmin')}</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-2 hover:underline"
                  style={{ color: NAVY }}
                >
                  {t('admin.dashboard.goHome')}<IconArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {esAdmin && fallo && (
            <div className="card rounded-2xl p-5 mb-8 flex items-start gap-3">
              <IconAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: AMBAR }} />
              <div>
                <p className="text-sm font-semibold text-ink">{t('admin.dashboard.errorTitle')}</p>
                <p className="text-xs text-c-muted mt-1">{fallo.message || String(fallo)}</p>
              </div>
            </div>
          )}

          {cargando ? <Cargando /> : !esAdmin ? null : (
            <>
              {/* 1 — Lo que espera a que alguien actúe, arriba del todo. */}
              <section className="mb-10">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted mb-3">
                  {t('admin.dashboard.pending.title')}
                </h2>
                {tareas.length > 0 ? (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tareas.map((tarea) => <Tarea key={tarea.clave} {...tarea} />)}
                  </ul>
                ) : tareasFiables ? (
                  <div className="card rounded-2xl p-5 flex items-start gap-3">
                    <IconSuccess className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#15803D' }} />
                    <p className="text-sm text-ink">{t('admin.dashboard.pending.allClear')}</p>
                  </div>
                ) : (
                  <div className="card rounded-2xl p-5">
                    <p className="text-sm text-c-muted">{t('admin.dashboard.unavailable')}</p>
                  </div>
                )}
              </section>

              {/* 2 y 3 — El pulso y las dos caras de la semana. Los dos
                  bloques salen de las mismas métricas, así que o se pintan
                  los dos o se calla el aviso una sola vez. */}
              {!pulsoFiable ? (
                <div className="card rounded-2xl p-5 mb-10">
                  <p className="text-sm text-c-muted">{t('admin.dashboard.unavailable')}</p>
                </div>
              ) : (
                <>
                  <section className="mb-10">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted mb-3">
                      {t('admin.dashboard.pulse.title')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {periodos.map(({ dias, actual, anterior }) => (
                        <div key={dias} className="card rounded-2xl p-5">
                          <p className="text-sm font-semibold text-ink mb-4">{nombrePeriodo(dias)}</p>
                          <div className="space-y-4">
                            <Cifra
                              icon={IconEye}
                              etiqueta={t('admin.dashboard.pulse.views')}
                              valor={actual.visitas}
                              anterior={anterior.visitas}
                              textoAnterior={textoAnterior(dias, anterior.visitas)}
                            />
                            <Cifra
                              icon={IconPointerClick}
                              etiqueta={t('admin.dashboard.pulse.contacts')}
                              valor={actual.contactos}
                              anterior={anterior.contactos}
                              textoAnterior={textoAnterior(dias, anterior.contactos)}
                            />
                            <Cifra
                              icon={IconBriefcase}
                              etiqueta={t('admin.dashboard.pulse.newProfiles')}
                              valor={actual.fichas}
                              anterior={anterior.fichas}
                              textoAnterior={textoAnterior(dias, anterior.fichas)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-c-muted mt-3">{t('admin.dashboard.pulse.caveat')}</p>
                  </section>

                  <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ListaFichas
                      titulo={t('admin.dashboard.week.topTitle')}
                      fichas={semana.masVistas}
                      vacia={t('admin.dashboard.week.topEmpty')}
                      render={(f) => t('admin.dashboard.week.viewsCount', { count: f.visitas })}
                    />
                    <ListaFichas
                      titulo={t('admin.dashboard.week.coldTitle')}
                      nota={notaFrias}
                      fichas={semana.sinVisitas.slice(0, TOPE_LISTA)}
                      vacia={t('admin.dashboard.week.coldEmpty')}
                      render={(f) => f.ciudad || '—'}
                    />
                  </section>
                </>
              )}

              {/* 4 — Desde dónde se gestiona cada cosa. */}
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted mb-3">
                  {t('admin.dashboard.sections.title')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {secciones.map(({ clave, ...resto }) => <Seccion key={clave} {...resto} />)}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
