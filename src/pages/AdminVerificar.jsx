// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  VERIFICAR IDENTIDAD — la pantalla que no existía                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Ocho personas subieron su DNI, su NIE o su pasaporte y nadie podía mirarlos:
// no había pantalla. La más antigua llevaba 87 días esperando y el producto le
// había prometido 24-48 h (`verification.toasts.submitted`). El panel lo
// contaba —«8 verificaciones sin revisar»— y enlazaba a /admin/usuarios, que
// es lo más cerca que se podía llegar: una columna «Verificado» sin ninguna
// forma de ver el documento. Esto es esa pantalla.
//
// Tres decisiones que condicionan todo el fichero:
//
//   1. LAS IMÁGENES NO SE LEEN DESDE AQUÍ. El bucket `credentials` es privado
//      y no tiene ninguna política de `storage.objects`: sólo la clave de
//      servicio puede leerlo, y esa clave no puede bajar al navegador. Así que
//      el listado y la firma de las URLs viven en /api/admin/verificaciones y
//      esta pantalla sólo pinta lo que ese endpoint le da. Por eso no hay un
//      solo `supabase.from('identity_verifications')` aquí.
//
//   2. LAS URLS FIRMADAS DURAN 120 SEGUNDOS. Revisar un DNI lleva más que
//      eso en cuanto hay que ampliar las tres fotos, así que la caducidad no
//      es un caso raro: es el caso normal. Se cuenta el tiempo en pantalla, se
//      avisa antes de que pase y al pasar se cambian las imágenes por un
//      botón de recargar que NO mueve la verificación que se estaba mirando
//      (la posición en la cola es un id, no un índice).
//
//   3. APROBAR PIDE CONFIRMACIÓN Y RECHAZAR PIDE MOTIVO. Aprobar da un
//      distintivo público de confianza y deshacerlo es a mano. Rechazar sin
//      motivo deja a la persona sin saber qué volver a subir, y el motivo es
//      exactamente lo que le pinta `IdentityVerificationWidget` en su panel.
//
// Lo que NO se hace aquí, a propósito: ni un `console.log` de los datos ni de
// las URLs firmadas. Este repositorio es público y esto son documentos de
// identidad de personas reales.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { getProfileSeoUrl } from '@/lib/seoUrl';
import Modal from '@/components/Modal';
import SEOHead from '@/components/seo/SEOHead';
import { SkeletonLine } from '@/components/ListStates';
import { toast } from '@/lib/toast';
import {
  IconShield, IconShieldX, IconAlert, IconArrowRight, IconArrowLeft,
  IconExternal, IconClock, IconRefresh, IconSpinner, IconCheckCircle,
  IconEye, IconPlus, IconMinus, IconSuccess, IconInfo,
} from '@/components/Icons';

const NAVY = '#00255C';
const NAVY_SOFT = 'rgba(0,37,92,0.06)';
const AMBAR = '#B45309';
const AMBAR_SOFT = 'rgba(180,83,9,0.08)';
const VERDE = '#15803D';

// Lo que vive la firma que devuelve el servidor (`expiresIn: 120`). No es una
// preferencia de esta pantalla: es el contrato del endpoint. Si allí cambia,
// cambia aquí.
const SEGUNDOS_FIRMA = 120;
// Cuándo el contador deja de ser informativo y empieza a ser un aviso.
const SEGUNDOS_AVISO = 30;

// El mínimo del motivo de rechazo, EL MISMO que exige el servidor
// (`motivo.length < 5` en api/admin/verificaciones.js). Estaba en 4, y un
// motivo de cuatro letras pasaba el filtro de aquí, salía por la red y volvía
// con un 400 `motivo_obligatorio`: el revisor veía «Escribe el motivo» con el
// motivo escrito delante y sin nada marcado en rojo. Comprobado en el
// navegador antes de cambiarlo.
const MOTIVO_MINIMO = 5;
// El servidor guarda `motivo.slice(0, 500)`. Cortar aquí en vez de allí es la
// diferencia entre que el revisor VEA dónde acaba lo que va a leer la persona
// y que se le pierda media frase sin enterarse.
const MOTIVO_MAXIMO = 500;

// Columnas de la ficha que se piden, y sólo ésas. `professional_profiles`
// tiene 63 columnas entre las que están `iban`, `cif_nif` y los teléfonos de
// contacto: para pintar un nombre y poder abrir la ficha no hace falta
// bajarse nada de eso al navegador. Mismo criterio que AdminDashboard.
const COLUMNAS_FICHA = 'user_id,business_name,ciudad,categories,slug_publico';

/** Días enteros que lleva esperando una fila. Devuelve null si no hay fecha:
 *  `new Date(null)` no es una fecha inválida, es el 1 de enero de 1970, y eso
 *  anunciaba 20.000 días de espera con toda la seguridad del mundo (el mismo
 *  tropiezo que ya costó un aviso falso en el panel). */
function diasEsperando(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/** El endpoint puede devolver la lista pelada o envuelta en un objeto. Se
 *  aceptan las dos formas para que esta pantalla no se quede en blanco por
 *  una llave de más en la respuesta. */
function filasDe(json) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return [];
  for (const clave of ['verificaciones', 'data', 'items', 'rows']) {
    if (Array.isArray(json[clave])) return json[clave];
  }
  return [];
}

/** Las URLs firmadas llegan absolutas. Si alguna llegara como el `signedURL`
 *  pelado que devuelve el API de Storage (`/object/sign/…`), se resuelve
 *  contra el origen de Storage en vez de pedírsela a misautonomos.es, que
 *  daría un 404 y una imagen rota sin explicación. */
function urlAbsoluta(valor) {
  if (typeof valor !== 'string' || !valor) return null;
  if (/^https?:\/\//i.test(valor)) return valor;
  const base = supabase?.storage?.url;
  if (!base) return null;
  return `${base}${valor.startsWith('/') ? '' : '/'}${valor}`;
}

/** Mensaje de un error del servidor, corto y sin volcar la respuesta entera.
 *
 *  El endpoint contesta con CÓDIGOS (`{ error: 'no_autorizado' }`), no con
 *  frases: enseñar «no_autorizado» en pantalla es enseñar el código fuente a
 *  quien está revisando un DNI. Así que los conocidos se traducen, y cuando
 *  el servidor manda además un `mensaje` —lo hace en los fallos a medias de
 *  aprobar y rechazar, donde lo importante es QUÉ ha quedado escrito y qué
 *  hacer— ese texto gana a todo lo demás, porque dice más que cualquier
 *  genérico nuestro. */
async function mensajeDeError(res, porDefecto, traducir) {
  try {
    const texto = await res.text();
    const json = texto ? JSON.parse(texto) : null;
    const explicado = json?.mensaje;
    if (typeof explicado === 'string' && explicado.trim()) return explicado.slice(0, 400);
    const codigo = typeof json?.error === 'string' ? json.error : '';
    const conocido = {
      sin_sesion: 'admin.verify.errors.noSession',
      sesion_invalida: 'admin.verify.errors.noSession',
      no_autorizado: 'admin.verify.errors.notAllowed',
      sin_configurar: 'admin.verify.errors.notConfigured',
      no_se_pudo_validar_la_sesion: 'admin.verify.errors.unavailable',
      no_se_pudo_comprobar_el_rol: 'admin.verify.errors.unavailable',
      motivo_obligatorio: 'admin.verify.reject.motiveRequired',
      no_encontrada: 'admin.verify.errors.notFound',
    }[codigo];
    if (conocido) return traducir(conocido);
    // Un código que no conocemos: mejor el genérico con su número que una
    // palabra con guiones bajos que no significa nada para quien la lee.
  } catch {
    // Cuerpo vacío o que no es JSON: nos quedamos con el código.
  }
  return porDefecto;
}

/** El token de la sesión, que es lo único que el endpoint acepta como prueba
 *  de quién pregunta. */
async function tokenDeSesion() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// ── piezas de interfaz ──────────────────────────────────────────────────────

function Dato({ etiqueta, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted">{etiqueta}</p>
      <p className="text-sm text-ink mt-0.5 break-words">{children}</p>
    </div>
  );
}

/** Un documento. Grande, y ampliable: un DNI en miniatura no se comprueba.
 *  Cuando la firma ha caducado no se pinta la <img> —pediría una URL que ya
 *  devuelve 400 y dejaría el icono de imagen rota— sino el aviso.
 *
 *  `avisoAusente` pinta el hueco en color de aviso en vez de en gris: un
 *  documento que falta cuando NO podía faltar no es un dato neutro, es algo
 *  que hay que mirar antes de decidir. */
function Documento({ etiqueta, url, caducado, ausente, textoAusente, avisoAusente, onAmpliar, t }) {
  const [fallo, setFallo] = useState(false);

  // Cada recarga trae una URL nueva; el fallo anterior ya no vale.
  useEffect(() => { setFallo(false); }, [url]);

  return (
    <figure className="card rounded-2xl p-3">
      <figcaption className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted">{etiqueta}</span>
        {url && !caducado && !fallo && (
          <button
            type="button"
            onClick={onAmpliar}
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: NAVY }}
          >
            <IconEye className="w-3.5 h-3.5" />{t('admin.verify.docs.zoom')}
          </button>
        )}
      </figcaption>

      {ausente ? (
        <p
          className={`text-sm rounded-xl px-3 py-8 text-center ${avisoAusente ? 'font-medium' : 'text-c-muted bg-soft'}`}
          style={avisoAusente ? { background: AMBAR_SOFT, color: AMBAR } : undefined}
        >
          {textoAusente}
        </p>
      ) : caducado ? (
        <p className="text-sm text-c-muted bg-soft rounded-xl px-3 py-8 text-center">
          {t('admin.verify.expiry.expiredShort')}
        </p>
      ) : fallo || !url ? (
        <p className="text-sm text-c-muted bg-soft rounded-xl px-3 py-8 text-center">{t('admin.verify.docs.failed')}</p>
      ) : (
        <button
          type="button"
          onClick={onAmpliar}
          className="block w-full rounded-xl overflow-hidden bg-soft"
          aria-label={`${t('admin.verify.docs.zoom')} — ${etiqueta}`}
        >
          <img
            src={url}
            alt={etiqueta}
            onError={() => setFallo(true)}
            className="w-full max-h-[22rem] object-contain"
          />
        </button>
      )}
    </figure>
  );
}

/** El visor. Dos tamaños y nada más: ajustado a la pantalla, que es como se
 *  mira la foto entera, y ampliado con desplazamiento, que es como se lee el
 *  número de un documento.
 *
 *  NO se queda con una copia de la URL: recibe la que esté viva en ese
 *  momento y el mismo `caducado` que los recuadros de abajo. Antes guardaba
 *  la URL del momento en que se abrió, y eso daba dos escenas malas, las dos
 *  vistas en el navegador: ampliar un DNI, pasar de los dos minutos ahí
 *  dentro y seguir viendo la foto como si el enlace valiera —y si la imagen
 *  no había llegado a cargarse, el hueco roto sin nada que pulsar, porque el
 *  botón de recargar se queda detrás del modal—. Ahora, al caducar, el visor
 *  dice lo mismo que la pantalla y trae su propio botón de recargar.
 *
 *  El ampliado va en `style` y no en clases de Tailwind, y no por capricho:
 *  `src/index.css` tiene un cinturón anti-CLS,
 *  `img:not([width]):not([height]) { max-width: 100% }`, cuya especificidad
 *  (0,2,1) gana a la de cualquier utilidad (`.max-w-none`, 0,1,0) — el
 *  `@layer` de Tailwind v3 es una directiva de compilación, no una capa de
 *  cascada de verdad, así que el orden no lo salva. Con clases, el botón de
 *  ampliar quedaba de adorno: comprobado en el navegador, la imagen seguía
 *  midiendo exactamente lo mismo. El `style` en línea gana a las dos. */
function Visor({ abierto, onClose, etiqueta, url, caducado, recargando, onRecargar, t }) {
  const [real, setReal] = useState(false);
  const [fallo, setFallo] = useState(false);
  useEffect(() => { if (!abierto) setReal(false); }, [abierto]);
  // Cada recarga trae una URL nueva: el fallo de la anterior ya no cuenta.
  useEffect(() => { setFallo(false); }, [url]);

  const recargar = (
    <button type="button" className="btn-primary btn-sm" onClick={onRecargar} disabled={recargando}>
      {recargando
        ? <><IconSpinner className="w-4 h-4 mr-1 animate-spin" />{t('admin.verify.expiry.reloading')}</>
        : <><IconRefresh className="w-4 h-4 mr-1" />{t('admin.verify.expiry.reload')}</>}
    </button>
  );

  return (
    <Modal open={abierto} onClose={onClose} title={etiqueta} size="xl">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {!caducado && !fallo && url && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setReal((v) => !v)}>
            {real ? <><IconMinus className="w-4 h-4 mr-1" />{t('admin.verify.viewer.fit')}</>
              : <><IconPlus className="w-4 h-4 mr-1" />{t('admin.verify.viewer.full')}</>}
          </button>
        )}
        {real && !caducado && !fallo && <span className="text-xs text-c-muted">{t('admin.verify.viewer.panHint')}</span>}
        {(caducado || fallo || !url) && recargar}
      </div>
      <div className={`bg-soft rounded-xl ${real && !caducado && !fallo ? 'overflow-auto max-h-[70vh]' : ''}`}>
        {caducado ? (
          <div className="px-3 py-10 text-center">
            <IconClock className="w-6 h-6 mx-auto mb-2" style={{ color: AMBAR }} />
            <p className="text-sm font-semibold" style={{ color: AMBAR }}>{t('admin.verify.expiry.expiredTitle')}</p>
            <p className="text-xs text-c-muted mt-1">{t('admin.verify.expiry.expiredBody')}</p>
          </div>
        ) : fallo || !url ? (
          <p className="text-sm text-c-muted px-3 py-10 text-center">{t('admin.verify.docs.failed')}</p>
        ) : (
          <img
            src={url}
            alt={etiqueta}
            onError={() => setFallo(true)}
            className={real ? '' : 'w-full max-h-[70vh] object-contain'}
            // `minWidth: 200%` y no el tamaño natural a secas: una foto de
            // documento hecha con el móvil viene enorme y se amplía sola,
            // pero una recortada puede venir más pequeña que el visor, y
            // «tamaño real» que ENCOGE la imagen no sirve para leer nada.
            style={real ? { width: 'auto', minWidth: '200%', maxWidth: 'none' } : undefined}
          />
        )}
      </div>
    </Modal>
  );
}

function Cargando({ t }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_21rem] gap-6" aria-busy="true" aria-label={t('common.loading')}>
      <div className="space-y-4" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card rounded-2xl p-3">
            <SkeletonLine width="5rem" height={12} />
            <div className="mt-2"><SkeletonLine width="100%" height={220} /></div>
          </div>
        ))}
      </div>
      <div className="card rounded-2xl p-5 space-y-4" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <SkeletonLine width="4rem" height={10} />
            <div className="mt-1"><SkeletonLine width="9rem" height={14} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── página ──────────────────────────────────────────────────────────────────

export default function AdminVerificarPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [idElegida, setIdElegida] = useState(null);
  // Cuál de los tres documentos está abierto en el visor ('anverso' |
  // 'reverso' | 'selfie'), NO su URL: la URL se busca al pintar, así el visor
  // sigue a las recargas y a la caducidad en vez de quedarse con una copia.
  const [visorClave, setVisorClave] = useState(null);
  const [confirmarAprobar, setConfirmarAprobar] = useState(false);
  const [abrirRechazo, setAbrirRechazo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [faltaMotivo, setFaltaMotivo] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  // Quién mira, ANTES de pedir nada. Aquí no es una cuestión de pintar ceros
  // como en el panel: el endpoint devuelve documentos de identidad firmados, y
  // una pantalla que lanza la petición y luego enseña el error ya ha pedido
  // los datos. Todas las lecturas cuelgan de `esAdmin`.
  const sesionQ = useQuery({
    queryKey: ['verificar:sesion'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 60_000,
  });
  const esAdmin = sesionQ.data?.role === 'admin';

  // La cola. Sin caché: lo que guarda son URLs firmadas que caducan en dos
  // minutos, así que conservarlas para «la próxima vez» sólo serviría para
  // enseñar imágenes muertas.
  const colaQ = useQuery({
    enabled: esAdmin,
    queryKey: ['verificar:pendientes'],
    queryFn: async () => {
      const token = await tokenDeSesion();
      if (!token) throw new Error(t('admin.verify.errors.noSession'));
      const res = await fetch('/api/admin/verificaciones?estado=pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(await mensajeDeError(res, t('admin.verify.errors.server', { status: res.status }), t));
      }
      return filasDe(await res.json());
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // La que más lleva esperando, primero: es la que más falta hace atender y es
  // el orden con el que se cuenta la deuda en el panel.
  const filas = useMemo(() => {
    const lista = [...(colaQ.data || [])];
    lista.sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')));
    return lista;
  }, [colaQ.data]);

  // El nombre de la ficha no viene en la tabla de verificaciones, y contrastar
  // un documento sin saber a qué negocio pertenece es media comprobación. Si
  // el endpoint ya lo manda, se usa el suyo; si no, se busca por `user_id`
  // (que es la columna que relaciona las dos tablas, no `id`).
  const idsUsuario = useMemo(
    () => [...new Set(filas.map((f) => f.user_id).filter(Boolean))].sort(),
    [filas],
  );
  const fichasQ = useQuery({
    enabled: esAdmin && idsUsuario.length > 0,
    queryKey: ['verificar:fichas', idsUsuario.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select(COLUMNAS_FICHA)
        .in('user_id', idsUsuario);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });
  const fichaPorUsuario = useMemo(() => {
    const mapa = new Map();
    for (const f of fichasQ.data || []) mapa.set(f.user_id, f);
    return mapa;
  }, [fichasQ.data]);

  // Dónde estaba el revisor. Se guarda el id, no el índice: así una recarga de
  // las imágenes (que vuelve a pedir la lista entera) no le cambia la
  // verificación debajo del dedo. La POSICIÓN se recuerda aparte y sólo sirve
  // para lo contrario: cuando la fila elegida desaparece porque acaba de
  // decidirse, quedarse en el mismo sitio de la cola equivale a pasar a la
  // siguiente.
  const posicionRef = useRef(0);
  const indiceElegido = filas.findIndex((f) => f.id === idElegida);
  const indice = indiceElegido >= 0 ? indiceElegido : Math.min(posicionRef.current, Math.max(0, filas.length - 1));
  const actual = filas[indice] || null;
  const idActual = actual?.id || null;

  useEffect(() => {
    if (indiceElegido >= 0) posicionRef.current = indiceElegido;
    else if (actual) setIdElegida(actual.id);
  }, [indiceElegido, actual]);

  // Al cambiar de verificación, el formulario de rechazo no se hereda: un
  // motivo escrito para otra persona es peor que ninguno.
  useEffect(() => {
    setMotivo('');
    setFaltaMotivo(false);
    setAbrirRechazo(false);
    setConfirmarAprobar(false);
    setVisorClave(null);
  }, [idActual]);

  // El reloj de la caducidad. Sólo corre cuando hay imágenes que caducar.
  const firmadoEn = colaQ.dataUpdatedAt || 0;
  useEffect(() => {
    if (!firmadoEn || filas.length === 0) return undefined;
    setAhora(Date.now());
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, [firmadoEn, filas.length]);

  const restante = firmadoEn ? Math.max(0, SEGUNDOS_FIRMA - Math.floor((ahora - firmadoEn) / 1000)) : 0;
  const caducado = firmadoEn > 0 && restante === 0;

  const decidir = useMutation({
    mutationFn: async ({ id, decision, motivo: razon }) => {
      const token = await tokenDeSesion();
      if (!token) throw new Error(t('admin.verify.errors.noSession'));
      const res = await fetch('/api/admin/verificaciones', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, motivo: razon || null }),
      });
      if (!res.ok) {
        throw new Error(await mensajeDeError(res, t('admin.verify.errors.decision'), t));
      }
      return true;
    },
    onSuccess: (_ok, variables) => {
      toast.success(variables.decision === 'aprobar'
        ? t('admin.verify.approve.done')
        : t('admin.verify.reject.done'));
      setConfirmarAprobar(false);
      setAbrirRechazo(false);
      setMotivo('');
      // La fila decidida sale de la cola, y el contador de pendientes del
      // panel deja de ser verdad en el mismo momento.
      colaQ.refetch();
      queryClient.invalidateQueries({ queryKey: ['panel:pendientes'] });
    },
    onError: (e) => toast.error(e?.message || t('admin.verify.errors.decision')),
  });

  const atajos = [
    t('admin.verify.reject.shortcuts.blurry'),
    t('admin.verify.reject.shortcuts.expired'),
    t('admin.verify.reject.shortcuts.selfie'),
    t('admin.verify.reject.shortcuts.back'),
  ];

  // Un atajo añade su línea al motivo en vez de pisarlo: lo normal es que
  // falle más de una cosa («borrosa» y «falta el reverso»), y el texto sigue
  // siendo editable porque es lo que va a leer la persona.
  const sumarAtajo = (texto) => {
    setFaltaMotivo(false);
    setMotivo((actualTexto) => {
      if (actualTexto.includes(texto)) return actualTexto;
      return actualTexto.trim() ? `${actualTexto.trim()}\n${texto}` : texto;
    });
  };

  const nombreDocumento = {
    dni: t('admin.verify.docTypes.dni'),
    nie: t('admin.verify.docTypes.nie'),
    passport: t('admin.verify.docTypes.passport'),
  };

  // Las tres firmadas. El endpoint las manda en `imagenes`; se acepta
  // también `urls`, que es como estaba escrito el contrato, para que un
  // cambio de nombre allí no deje esta pantalla sin documentos que mirar.
  const urls = actual?.imagenes || actual?.urls || {};
  // La ficha, de dos sitios y en este orden: la que manda el endpoint (es la
  // misma consulta que hace él, con su `identity_verified`) y, para el
  // enlace, la que se lee aquí — porque `slug_publico` no viaja en la
  // respuesta y adivinarlo a partir del nombre da enlaces a ninguna parte.
  const fichaServidor = actual?.ficha || null;
  const ficha = actual ? fichaPorUsuario.get(actual.user_id) : null;
  const nombreFicha = fichaServidor?.nombre || ficha?.business_name || null;
  // `dias_esperando` lo calcula el servidor con su reloj; si no viniera, se
  // calcula aquí. Que falte no puede dejar el dato en blanco: es el que
  // explica por qué existe esta pantalla.
  const dias = Number.isFinite(actual?.dias_esperando)
    ? actual.dias_esperando
    : diasEsperando(actual?.created_date);
  const yaTieneDistintivo = fichaServidor?.identity_verified === true;
  const esPasaporte = actual?.document_type === 'passport';
  const urlAnverso = urlAbsoluta(urls.anverso);
  const urlReverso = urlAbsoluta(urls.reverso);
  const urlSelfie = urlAbsoluta(urls.selfie);

  // Los tres documentos en una sola lista: de aquí salen los recuadros y de
  // aquí saca el visor la URL VIVA del que se está mirando.
  //
  // Lo importante es qué dice un hueco. Antes decía «No se ha subido», y eso
  // es algo que NO PUEDE haber pasado: `IdentityVerificationWidget` no deja
  // enviar la solicitud sin anverso (`toasts.frontRequired`), sin selfie
  // (`selfieRequired`) ni, salvo pasaporte, sin reverso (`backRequired`). Si
  // el servidor no manda una de las tres, es que no ha podido FIRMARLA —el
  // objeto ya no está, o Storage no ha contestado—, y entonces «no se ha
  // subido» es una acusación falsa contra la persona que está esperando: el
  // revisor lee eso, pulsa el atajo «Falta el reverso del documento» y
  // rechaza a alguien por una avería del almacén. Que un hueco se vea como
  // un aviso y diga de quién es la culpa cuesta una frase.
  const documentos = useMemo(() => ([
    { clave: 'anverso', etiqueta: t('admin.verify.docs.front'), url: urlAnverso,
      textoAusente: t('admin.verify.docs.unreadable'), avisoAusente: true },
    { clave: 'reverso', etiqueta: t('admin.verify.docs.back'), url: urlReverso,
      // Un pasaporte no tiene reverso, así que ahí el hueco es lo normal y no
      // hay nada que mirar: decirlo evita rechazar por nada.
      textoAusente: esPasaporte ? t('admin.verify.docs.backNotNeeded') : t('admin.verify.docs.unreadable'),
      avisoAusente: !esPasaporte },
    { clave: 'selfie', etiqueta: t('admin.verify.docs.selfie'), url: urlSelfie,
      textoAusente: t('admin.verify.docs.unreadable'), avisoAusente: true },
  ]), [t, urlAnverso, urlReverso, urlSelfie, esPasaporte]);

  const docVisor = documentos.find((d) => d.clave === visorClave) || null;

  const confirmarRechazo = () => {
    if (motivo.trim().length < MOTIVO_MINIMO) {
      setFaltaMotivo(true);
      return;
    }
    decidir.mutate({ id: actual.id, decision: 'rechazar', motivo: motivo.trim() });
  };

  const cargando = sesionQ.isLoading || (esAdmin && colaQ.isLoading);

  return (
    <>
      <SEOHead title={t('admin.verify.seoTitle')} noindex />
      <main className="min-h-screen bg-canvas">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <header className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink" style={{ letterSpacing: '-0.02em' }}>
              {t('admin.verify.title')}
            </h1>
            <p className="text-sm text-c-muted mt-1">{t('admin.verify.subtitle')}</p>
          </header>

          {!cargando && !esAdmin && (
            <div className="card rounded-2xl p-5 flex items-start gap-3">
              <IconAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: AMBAR }} />
              <div>
                <p className="text-sm font-semibold text-ink">{t('admin.verify.notAdmin')}</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-2 hover:underline"
                  style={{ color: NAVY }}
                >
                  {t('admin.verify.goHome')}<IconArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {esAdmin && (
            <>
              {/* El recordatorio de con qué se está trabajando, arriba y
                  siempre: son documentos de identidad de personas reales. */}
              <div className="card rounded-2xl p-4 mb-6 flex items-start gap-3">
                <IconInfo className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: NAVY }} />
                <p className="text-xs text-c-muted">{t('admin.verify.privacy')}</p>
              </div>

              {colaQ.error && (
                <div className="card rounded-2xl p-5 mb-6 flex items-start gap-3">
                  <IconAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: AMBAR }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t('admin.verify.errors.list')}</p>
                    <p className="text-xs text-c-muted mt-1 break-words">{colaQ.error.message}</p>
                    <button
                      type="button"
                      className="btn-secondary btn-sm mt-3"
                      onClick={() => colaQ.refetch()}
                      disabled={colaQ.isFetching}
                    >
                      {colaQ.isFetching
                        ? <><IconSpinner className="w-4 h-4 mr-1 animate-spin" />{t('common.loading')}</>
                        : <><IconRefresh className="w-4 h-4 mr-1" />{t('common.retry')}</>}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Un fallo al recargar NO borra la cola que ya estaba en pantalla.
              Antes sí: `colaQ.error` tapaba todo el contenido, así que un
              toque en «Recargar imágenes» con mala cobertura —el caso normal
              revisando desde el móvil— se llevaba por delante la verificación
              que estabas mirando y te dejaba con una tarjeta de error. Y no
              hacía falta: los datos siguen en memoria, el aviso ya está
              puesto arriba con su botón de reintentar, y si las imágenes han
              caducado los recuadros lo dicen solos. Sólo cuando no hay NADA
              que enseñar manda la tarjeta de error. */}
          {cargando ? <Cargando t={t} /> : !esAdmin ? null : (colaQ.error && filas.length === 0) ? null : filas.length === 0 ? (
            <div className="card rounded-2xl p-8 text-center">
              <IconSuccess className="w-10 h-10 mx-auto mb-3" style={{ color: VERDE }} />
              <p className="text-sm font-semibold text-ink">{t('admin.verify.empty.title')}</p>
              <p className="text-sm text-c-muted mt-1">{t('admin.verify.empty.body')}</p>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 text-xs font-semibold mt-4 hover:underline"
                style={{ color: NAVY }}
              >
                {t('admin.verify.backToPanel')}<IconArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <>
              {/* La cola: cuántas quedan, en cuál estamos y cómo moverse. */}
              <div className="card rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {t('admin.verify.queue.position', { n: indice + 1, total: filas.length })}
                  </p>
                  <p className="text-xs text-c-muted mt-0.5">{t('admin.verify.queue.order')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={indice <= 0}
                    onClick={() => setIdElegida(filas[indice - 1].id)}
                  >
                    <IconArrowLeft className="w-4 h-4 mr-1" />{t('admin.verify.queue.prev')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={indice >= filas.length - 1}
                    onClick={() => setIdElegida(filas[indice + 1].id)}
                  >
                    {t('admin.verify.queue.next')}<IconArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>

              {/* Tres piezas y dos lecturas distintas de las mismas tres.
                  En el móvil, de arriba abajo: quién es y cuánto lleva
                  esperando, los documentos, y al final los dos botones —las
                  acciones las últimas, para no tener Aprobar al alcance del
                  pulgar antes de haber visto una sola foto—. En el
                  escritorio, los documentos a la izquierda ocupando las dos
                  filas y los datos arriba a la derecha: contrastar una cosa
                  con la otra sin perder ninguna de vista. De ahí el sitio
                  explícito (`col-start` / `row-start`) en vez de dejar que
                  el orden del móvil decida también la rejilla. */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_21rem] gap-6 items-start">
                <section className="order-2 lg:col-start-1 lg:row-start-1 lg:row-span-2 space-y-4">
                  {/* El contador de la firma. Informativo mientras sobra
                      tiempo, aviso cuando queda poco, y botón cuando ya no
                      queda: recargar no mueve la verificación. */}
                  <div
                    className="card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                    style={caducado || restante <= SEGUNDOS_AVISO ? { background: AMBAR_SOFT } : undefined}
                  >
                    <p className="text-xs flex items-center gap-2" style={{ color: caducado || restante <= SEGUNDOS_AVISO ? AMBAR : undefined }}>
                      <IconClock className="w-4 h-4 flex-shrink-0" />
                      <span className="tabular-nums">
                        {caducado ? t('admin.verify.expiry.expiredTitle') : t('admin.verify.expiry.left', { s: restante })}
                      </span>
                    </p>
                    <button
                      type="button"
                      className={caducado ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                      onClick={() => colaQ.refetch()}
                      disabled={colaQ.isFetching}
                    >
                      {colaQ.isFetching
                        ? <><IconSpinner className="w-4 h-4 mr-1 animate-spin" />{t('admin.verify.expiry.reloading')}</>
                        : <><IconRefresh className="w-4 h-4 mr-1" />{t('admin.verify.expiry.reload')}</>}
                    </button>
                  </div>
                  {caducado && (
                    <p className="text-xs text-c-muted px-1">{t('admin.verify.expiry.expiredBody')}</p>
                  )}

                  {documentos.map((d) => (
                    <Documento
                      key={d.clave}
                      t={t}
                      etiqueta={d.etiqueta}
                      url={d.url}
                      caducado={caducado}
                      ausente={!d.url}
                      textoAusente={d.textoAusente}
                      avisoAusente={d.avisoAusente}
                      onAmpliar={() => setVisorClave(d.clave)}
                    />
                  ))}
                </section>

                <aside className="order-1 lg:col-start-2 lg:row-start-1">
                  <div className="card rounded-2xl p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl"
                        style={{ background: NAVY_SOFT, color: NAVY }}
                      >
                        <IconShield className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink break-words">
                          {actual?.user_name || t('admin.verify.fields.noName')}
                        </p>
                        <p className="text-xs text-c-muted mt-0.5">
                          {nombreDocumento[actual?.document_type] || t('admin.verify.docTypes.unknown')}
                        </p>
                      </div>
                    </div>

                    {/* La espera, con el color del aviso: es el dato por el que
                        existe esta pantalla. */}
                    <div className="rounded-xl p-3" style={{ background: AMBAR_SOFT }}>
                      <p className="text-sm font-semibold" style={{ color: AMBAR }}>
                        {dias === null
                          ? t('admin.verify.fields.waitingUnknown')
                          : t('admin.verify.waiting', { count: dias })}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: AMBAR }}>{t('admin.verify.promise')}</p>
                    </div>

                    {/* Pendiente de revisar y con el distintivo ya puesto no
                        es un estado normal: sólo puede venir de una
                        aprobación anterior que se quedó a medias. Decirlo
                        antes de decidir evita «aprobar» algo que ya estaba
                        dado y, sobre todo, rechazar sin saber que la ficha
                        lleva el sello verde puesto desde hace semanas. */}
                    {yaTieneDistintivo && (
                      <p className="text-xs rounded-xl p-3" style={{ background: NAVY_SOFT, color: NAVY }}>
                        {t('admin.verify.fields.alreadyBadged')}
                      </p>
                    )}

                    <Dato etiqueta={t('admin.verify.fields.email')}>
                      {actual?.user_email || '—'}
                    </Dato>

                    <Dato etiqueta={t('admin.verify.fields.profile')}>
                      {nombreFicha ? (
                        ficha ? (
                          <a
                            href={getProfileSeoUrl(ficha)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <span className="break-words">{nombreFicha}</span>
                            <IconExternal className="w-3 h-3 flex-shrink-0 text-c-muted" />
                          </a>
                        ) : nombreFicha
                      ) : (
                        // Una de las ocho pendientes no tiene ficha: aprobarla
                        // no pinta ningún distintivo en ninguna parte, y eso
                        // hay que saberlo antes de aprobar, no después.
                        <span className="text-c-muted">{t('admin.verify.fields.noProfile')}</span>
                      )}
                    </Dato>

                    <Dato etiqueta={t('admin.verify.fields.submitted')}>
                      {actual?.created_date
                        ? new Date(actual.created_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '—'}
                    </Dato>
                  </div>
                </aside>

                <aside className="order-3 lg:col-start-2 lg:row-start-2">
                  <div className="card rounded-2xl p-5 space-y-3">
                    <button
                      type="button"
                      className="btn-primary w-full"
                      disabled={decidir.isPending}
                      onClick={() => setConfirmarAprobar(true)}
                    >
                      <IconCheckCircle className="w-4 h-4 mr-2" />{t('admin.verify.approve.cta')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary w-full border-error/40 text-error hover:bg-error/10"
                      disabled={decidir.isPending}
                      onClick={() => setAbrirRechazo(true)}
                    >
                      <IconShieldX className="w-4 h-4 mr-2" />{t('admin.verify.reject.cta')}
                    </button>
                    <p className="text-xs text-c-muted">{t('admin.verify.actionsHint')}</p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <Visor
        t={t}
        abierto={!!docVisor}
        onClose={() => setVisorClave(null)}
        etiqueta={docVisor?.etiqueta || ''}
        url={docVisor?.url || null}
        caducado={caducado}
        recargando={colaQ.isFetching}
        onRecargar={() => colaQ.refetch()}
      />

      {/* Aprobar da un distintivo público de confianza: un toque de más en el
          móvil no debería darlo. */}
      <Modal
        open={confirmarAprobar}
        onClose={() => setConfirmarAprobar(false)}
        title={t('admin.verify.approve.confirmTitle')}
      >
        {/* A quién se está aprobando. El correo entra como segundo nombre
            porque hay filas sin `user_name`, y «Esto marca la ficha de Sin
            nombre declarado» no identifica a nadie en una confirmación que
            existe precisamente para que el revisor compruebe a quién le está
            dando el distintivo. */}
        <p className="text-sm text-c-muted">
          {t('admin.verify.approve.confirmBody', {
            name: actual?.user_name || actual?.user_email || t('admin.verify.fields.noName'),
          })}
        </p>
        {!nombreFicha && (
          <p className="text-sm mt-3 rounded-xl p-3" style={{ background: AMBAR_SOFT, color: AMBAR }}>
            {t('admin.verify.approve.noProfileWarning')}
          </p>
        )}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => setConfirmarAprobar(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={decidir.isPending}
            onClick={() => decidir.mutate({ id: actual.id, decision: 'aprobar' })}
          >
            {decidir.isPending
              ? <><IconSpinner className="w-4 h-4 mr-2 animate-spin" />{t('admin.verify.saving')}</>
              : <><IconCheckCircle className="w-4 h-4 mr-2" />{t('admin.verify.approve.confirmCta')}</>}
          </button>
        </div>
      </Modal>

      {/* Rechazar exige motivo, y lleva un formulario escrito: un toque fuera
          no debe tirarlo (`dismissible={false}`). */}
      <Modal
        open={abrirRechazo}
        onClose={() => setAbrirRechazo(false)}
        title={t('admin.verify.reject.title')}
        dismissible={false}
      >
        <p className="text-sm text-c-muted">{t('admin.verify.reject.notice')}</p>

        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted mt-5 mb-2">
          {t('admin.verify.reject.shortcutsLabel')}
        </p>
        <div className="flex flex-wrap gap-2">
          {atajos.map((texto) => (
            <button
              key={texto}
              type="button"
              className="btn-secondary btn-sm text-left"
              onClick={() => sumarAtajo(texto)}
            >
              {texto}
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-c-muted mt-5 mb-2" htmlFor="motivo-rechazo">
          {t('admin.verify.reject.motiveLabel')}
        </label>
        <textarea
          id="motivo-rechazo"
          className={`textarea ${faltaMotivo ? 'input-error' : ''}`}
          value={motivo}
          maxLength={MOTIVO_MAXIMO}
          onChange={(e) => { setMotivo(e.target.value); setFaltaMotivo(false); }}
          placeholder={t('admin.verify.reject.motivePlaceholder')}
        />
        {faltaMotivo && <p className="text-xs text-error mt-1">{t('admin.verify.reject.motiveRequired')}</p>}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => setAbrirRechazo(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary bg-error hover:bg-error"
            disabled={decidir.isPending}
            onClick={confirmarRechazo}
          >
            {decidir.isPending
              ? <><IconSpinner className="w-4 h-4 mr-2 animate-spin" />{t('admin.verify.saving')}</>
              : <><IconShieldX className="w-4 h-4 mr-2" />{t('admin.verify.reject.confirmCta')}</>}
          </button>
        </div>
      </Modal>
    </>
  );
}
