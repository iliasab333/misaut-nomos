// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  LA ÚNICA PUERTA A LOS DOCUMENTOS DE IDENTIDAD                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Detrás de este fichero hay DNIs, NIEs y pasaportes de personas reales, con
// su selfie al lado. Ocho personas los subieron y llevan hasta tres meses
// esperando; esta función es lo que permite por fin mirarlos, y es también lo
// único que impide que los mire cualquier otro.
//
// ── Por qué esto vive en el servidor y no en el navegador ──────────────────
// El bucket `credentials` es privado y NO tiene ninguna política de
// `storage.objects`: con la clave anónima, ni un admin con sesión puede leer
// un objeto ni firmar una URL. Sólo la clave de servicio puede. Y la clave de
// servicio no puede salir al bundle —es acceso total a la base, sin RLS—, así
// que la firma se hace aquí, y aquí se queda la clave.
//
// ── El orden de las comprobaciones, que es lo que de verdad protege ────────
//   1. Hay un `Authorization: Bearer <token>` → si no, 401.
//   2. El token es válido DE VERDAD: se pregunta a Supabase
//      (`GET /auth/v1/user` con la clave anónima) → si no, 401. No se
//      descodifica el JWT a mano: un JWT se lee sin la firma, y «leer» no es
//      «verificar».
//   3. Ese uid de auth tiene `role = 'admin'` en `public.users`, consultado
//      con la clave de SERVICIO → si no, 403.
// Nada de lo que manda el cliente decide si es admin. Un `{"admin":true}` en
// el cuerpo, una cabecera inventada o un `user_id` elegido a mano no cambian
// una sola de las tres respuestas.
//
// ── Variables de entorno ───────────────────────────────────────────────────
//   SUPABASE_URL (o VITE_SUPABASE_URL)        la base
//   SUPABASE_SERVICE_ROLE_KEY                 OBLIGATORIA. Nunca `VITE_`.
//   SUPABASE_ANON_KEY (o VITE_SUPABASE_ANON_KEY)  para validar el token; es
//                                             pública, ya va en el bundle.

import { avisarVerificada } from '../_lib/avisoVerificacion.js';

const BASE = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANONIMA = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Los segundos que vive una URL firmada. Corto a propósito: el revisor abre
// la imagen, decide y sigue. Una URL firmada es un enlace que funciona sin
// sesión para quien lo tenga —si se queda en un historial, en un portapapeles
// o en una captura, es el DNI de alguien al otro lado—, así que caduca antes
// de que llegue a ningún sitio. Si el revisor tarda, recarga la lista.
const SEGUNDOS_DE_VIDA = 120;

// Los estados que se pueden pedir, y el filtro de PostgREST de cada uno.
//
// Es un Map y no un objeto literal por la misma razón que la lista de canales
// de `api/aviso-contacto.js`: en un objeto, `{}['constructor']` devuelve algo,
// y un `?estado=constructor` se colaría como estado válido con un filtro
// basura detrás. Un Map sólo conoce las claves que se le han puesto.
const ESTADOS = new Map([
  ['pending', 'status=eq.pending'],
  ['approved', 'status=eq.approved'],
  ['rejected', 'status=eq.rejected'],
  ['todas', ''],
]);

// Tope de filas por respuesta. No es paginación de verdad —con ocho filas
// pendientes no hace falta—, es un techo: cada fila cuesta tres peticiones de
// firma, y una lista sin límite convierte un `?estado=todas` en una ráfaga de
// cientos de llamadas a Storage.
const TECHO_FILAS = 50;

// Un id de esta tabla son 24 hexadecimales (el formato que heredamos de
// Base44). Se comprueba antes de preguntar a la base: así un id con comas o
// paréntesis no llega nunca a construir un filtro de PostgREST.
const ID_VALIDO = /^[0-9a-f]{24}$/i;

// Lo que tiene que medir el motivo de un rechazo.
//
// El MÍNIMO no lo decide este fichero: lo decide la pantalla, que es la que se
// lo dice al revisor. `AdminVerificar.jsx` deja pulsar Rechazar con cuatro
// caracteres; cuando aquí el mínimo era cinco, un motivo tan de verdad como
// «foto» o «roto» pasaba la validación de la pantalla, volvía con un 400 y el
// revisor leía «escribe el motivo» con su motivo escrito delante. Sin nada que
// cambiar, y esa persona otra vez sin respuesta.
//
// El MÁXIMO está porque esto se guarda y se le enseña tal cual a quien ha sido
// rechazado. Antes se recortaba a 500 a escondidas: lo que leía la persona era
// una frase cortada por la mitad, y el revisor no se enteraba de que su
// explicación no había llegado entera.
const MOTIVO_MINIMO = 4;
const MOTIVO_MAXIMO = 1000;

const CAMPOS = [
  'id', 'user_id', 'user_email', 'user_name', 'status', 'document_type',
  'document_front_url', 'document_back_url', 'selfie_url',
  'rejection_reason', 'reviewed_by', 'reviewed_date', 'created_date',
].join(',');

// ── Hablar con Supabase ─────────────────────────────────────────────────────
// Con `fetch` contra PostgREST, igual que `api/_lib/datos.js`: una dependencia
// menos en una función serverless y las consultas se leen tal cual se envían.

function cabecerasDeServicio(extra = {}) {
  return { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`, ...extra };
}

async function postgrest(ruta, opciones = {}) {
  const r = await fetch(`${BASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: cabecerasDeServicio(opciones.headers || {}),
  });
  if (!r.ok) {
    // El texto de PostgREST puede traer el valor que falló, y aquí los
    // valores son correos y uuids de personas: se recorta y se queda en la
    // excepción, que el manejador convierte en un mensaje genérico.
    throw new Error(`PostgREST ${r.status} en ${ruta.split('?')[0]}: ${(await r.text()).slice(0, 160)}`);
  }
  // Un PATCH sin `return=representation` responde 204 y sin cuerpo.
  if (r.status === 204) return [];
  return r.json();
}

// Un respiro entre dos intentos de firma.
const espera = (ms) => new Promise((seguir) => { setTimeout(seguir, ms); });

/**
 * Una URL firmada para un objeto del bucket privado, y QUÉ pasa cuando no hay.
 *
 * La ruta NO viene nunca del cliente: se lee de la fila por `id`. Si viniera
 * del cuerpo de la petición, un admin —o alguien que le robase la sesión—
 * podría pedir la firma de cualquier objeto del bucket, incluido el de otra
 * persona, o pasearse con `../`.
 *
 * Devuelve `{ url, estado }` y no una cadena suelta, porque un hueco en esa
 * pantalla significa DOS cosas que se deciden de forma distinta:
 *
 *   · `no_aportado`   la fila no tiene ruta: ahí esa persona no subió nada.
 *                     Es el caso normal del pasaporte, que no tiene reverso.
 *   · `no_disponible` la fila SÍ tiene ruta y el objeto no se ha podido
 *                     firmar: el fichero se ha perdido o Storage no contesta.
 *                     No es culpa de la persona.
 *
 * Mientras las dos cosas salían como `null`, las dos se leían igual: «falta el
 * documento». Y eso es justo lo que hace que se rechace a alguien que sí lo
 * subió, por un fallo nuestro. El servidor sabe cuál de las dos es —tiene la
 * fila delante—, así que lo dice en vez de tirar el dato.
 *
 * Nunca lanza: que un objeto se haya perdido no debe tumbar la lista entera y
 * dejar sin revisar a las otras siete personas.
 */
async function firmar(ruta) {
  // Sin ruta en la fila no hay nada que firmar, y tampoco nada que reprochar.
  if (typeof ruta !== 'string' || !ruta.trim()) return { url: null, estado: 'no_aportado' };
  const limpia = ruta.trim().replace(/^\/+/, '');
  // Lo que guardó el widget son rutas dentro del bucket («<uuid>/<id>-anverso.jpg»).
  // Si alguna fila antigua todavía guarda una URL completa, no se firma: no es
  // una ruta y además significaría que ese documento vivió en el bucket público.
  if (/^https?:\/\//i.test(limpia)) {
    console.error('[admin/verificaciones] una fila guarda una URL entera donde debería haber una ruta del bucket');
    return { url: null, estado: 'no_disponible' };
  }
  // Travesía de directorios: lo que no vale es un TRAMO que sea «..» o «.», no
  // los dos puntos en sí.
  //
  // Esto empezó siendo un `limpia.includes('..')`, y con eso una de las ocho
  // personas aparecía sin selfie: su fichero se llama «…(2).jp..jpeg» —dos
  // puntos dentro del propio nombre, cosa del móvil que lo subió—. El fichero
  // estaba ahí, intacto; lo que fallaba era esta comprobación. Y un hueco en
  // esa pantalla no se lee como «error», se lee como «no lo subió», que es
  // justo el motivo por el que se rechaza a alguien sin culpa.
  const tramos = limpia.split('/');
  if (tramos.some((t) => t === '' || t === '.' || t === '..')) {
    console.error('[admin/verificaciones] una ruta del bucket trae un tramo que no se puede firmar');
    return { url: null, estado: 'no_disponible' };
  }
  const destino = `${BASE}/storage/v1/object/sign/credentials/${tramos.map(encodeURIComponent).join('/')}`;
  for (let intento = 1; intento <= 2; intento += 1) {
    try {
      const r = await fetch(destino, {
        method: 'POST',
        headers: cabecerasDeServicio({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ expiresIn: SEGUNDOS_DE_VIDA }),
      });
      if (r.ok) {
        const { signedURL } = await r.json();
        if (typeof signedURL === 'string' && signedURL) {
          // Storage devuelve «/object/sign/...»; el navegador lo necesita absoluto.
          return { url: `${BASE}/storage/v1${signedURL.startsWith('/') ? '' : '/'}${signedURL}`, estado: 'ok' };
        }
      }
      // Sólo el código, nunca la ruta ni el cuerpo: lo que hay detrás de esa
      // ruta es el DNI de alguien y esto va a los logs de Vercel.
      //
      // Y se reintenta sólo lo que puede salir bien a la segunda. Un 400 o un
      // 404 de Storage es «ese objeto no está»: volver a preguntarlo da la
      // misma respuesta y hace esperar al revisor por nada, con las demás
      // personas de la cola esperando detrás. Un 429 o un 5xx sí es Storage ocupado, y ahí la segunda
      // vuelta —con un respiro de por medio— suele traer la firma.
      const reintentable = r.status === 429 || r.status >= 500;
      if (!reintentable || intento === 2) {
        console.error(`[admin/verificaciones] Storage no ha firmado un objeto (HTTP ${r.status})`);
        break;
      }
      await espera(150);
    } catch {
      // A propósito sin el objeto de la excepción: el mensaje de un fallo de
      // red de `fetch` lleva la URL dentro, y esa URL es la ruta del documento.
      if (intento === 2) {
        console.error('[admin/verificaciones] la firma de un objeto ha fallado por red');
        break;
      }
      await espera(150);
    }
  }
  return { url: null, estado: 'no_disponible' };
}


// ── El portero ──────────────────────────────────────────────────────────────

/**
 * Quién llama. Devuelve `{ ok:true, admin }` sólo si el token es válido y ese
 * usuario es admin; si no, el estado y el motivo que hay que responder.
 */
async function quienLlama(req) {
  const cabecera = req.headers?.authorization || '';
  const token = /^Bearer\s+(.+)$/i.exec(cabecera)?.[1]?.trim() || '';
  if (!token) return { ok: false, estado: 401, error: 'sin_sesion' };

  // 1. ¿El token es auténtico? Lo dice Supabase, no nosotros.
  let auth;
  try {
    const r = await fetch(`${BASE}/auth/v1/user`, {
      headers: { apikey: ANONIMA, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { ok: false, estado: 401, error: 'sesion_invalida' };
    auth = await r.json();
  } catch {
    return { ok: false, estado: 503, error: 'no_se_pudo_validar_la_sesion' };
  }
  const uid = typeof auth?.id === 'string' ? auth.id : '';
  if (!uid) return { ok: false, estado: 401, error: 'sesion_invalida' };

  // 2. ¿Ese uid es admin? Se busca SÓLO por `auth_user_id`, nunca por
  //    `users.id`: cuatro filas de `users` tienen un `id` distinto de su
  //    `auth_user_id`, así que cruzar por `id` sería cruzar dos espacios de
  //    identificadores distintos y podría dar el rol de otra persona.
  let filas;
  try {
    filas = await postgrest(`users?select=id,email,role,disabled&auth_user_id=eq.${encodeURIComponent(uid)}&limit=2`);
  } catch (e) {
    console.error('[admin/verificaciones] fallo al comprobar el rol:', e.message);
    return { ok: false, estado: 503, error: 'no_se_pudo_comprobar_el_rol' };
  }
  // Una sesión válida sin ficha en `public.users`, o con el rol de siempre, no
  // es un error del que informar con detalle: es un no.
  const admin = filas.find((u) => u?.role === 'admin' && u.disabled !== true);
  if (!admin) return { ok: false, estado: 403, error: 'no_autorizado' };

  return { ok: true, admin: { uid, id: admin.id, email: admin.email || null } };
}

// ── El listado ──────────────────────────────────────────────────────────────

async function listar(req, res, admin) {
  const pedido = typeof req.query?.estado === 'string' ? req.query.estado : 'pending';
  if (!ESTADOS.has(pedido)) {
    return res.status(400).json({ error: 'estado_invalido', admitidos: [...ESTADOS.keys()] });
  }
  const filtro = ESTADOS.get(pedido);

  // Las más viejas primero. No es un detalle de orden: la primera de la lista
  // es la persona que lleva más tiempo esperando, y es a quien hay que
  // contestar antes.
  const verificaciones = await postgrest(
    `identity_verifications?select=${CAMPOS}${filtro ? `&${filtro}` : ''}`
    + `&order=created_date.asc&limit=${TECHO_FILAS}`,
  );

  // A quién está mirando el revisor. Sin esto, la pantalla es un documento de
  // identidad y un correo: cruzando por `user_id` sale el nombre de la ficha,
  // y si el distintivo ya está puesto —que es lo que delata una aprobación a
  // medias de un intento anterior—.
  const fichas = new Map();
  const usuarios = [...new Set(verificaciones.map((v) => v.user_id).filter((u) => typeof u === 'string' && /^[0-9a-fA-F-]{10,40}$/.test(u)))];
  if (usuarios.length) {
    const p = await postgrest(
      'professional_profiles?select=id,user_id,business_name,ciudad,categories,identity_verified,identity_verified_at'
      + `&user_id=in.(${usuarios.map(encodeURIComponent).join(',')})`,
    );
    for (const f of p) if (!fichas.has(f.user_id)) fichas.set(f.user_id, f);
  }

  // De cuatro en cuatro, no las cincuenta de golpe. Cada fila son tres firmas;
  // `?estado=todas` con el tope lleno serían 150 peticiones simultáneas a
  // Storage, y ahí es donde empieza a decir que no. Doce a la vez va rápido y
  // no se atraganta.
  const lista = [];
  for (let i = 0; i < verificaciones.length; i += 4) {
    const grupo = await Promise.all(verificaciones.slice(i, i + 4).map(async (v) => {
      const [anverso, reverso, selfie] = await Promise.all([
        firmar(v.document_front_url),
        firmar(v.document_back_url),
        firmar(v.selfie_url),
      ]);
      // Un hueco que es cosa NUESTRA (ruta puesta y objeto que no se firma) no
      // se puede pintar igual que uno que es de la persona: por el primero no
      // se rechaza a nadie.
      const estadoImagenes = { anverso: anverso.estado, reverso: reverso.estado, selfie: selfie.estado };
      const ficha = fichas.get(v.user_id) || null;
      return {
        id: v.id,
        user_id: v.user_id,
        user_email: v.user_email,
        user_name: v.user_name,
        status: v.status,
        document_type: v.document_type,
        rejection_reason: v.rejection_reason,
        reviewed_by: v.reviewed_by,
        reviewed_date: v.reviewed_date,
        created_date: v.created_date,
        dias_esperando: diasDesde(v.created_date),
        // Las columnas `*_url` NO se devuelven. Lo único que sale es la URL
        // firmada, que lleva la ruta dentro porque Storage firma una ruta y no
        // hay otra forma de pedirle el fichero; lo que no sale es la ruta
        // suelta y reutilizable, que seguiría siendo válida mañana. Y lo que
        // nunca entra es una ruta del cliente: la de aquí viene de la fila.
        imagenes: { anverso: anverso.url, reverso: reverso.url, selfie: selfie.url },
        // Para cada una: 'ok', 'no_aportado' (no subió nada ahí) o
        // 'no_disponible' (sí lo subió y no se ha podido mostrar).
        imagenes_estado: estadoImagenes,
        // El resumen, para que la pantalla pueda avisar sin mirar tres campos:
        // si esto es true, hay algo que esta persona subió y el revisor NO
        // está viendo, así que no se puede rechazar por eso.
        huecos_tecnicos: Object.values(estadoImagenes).includes('no_disponible'),
        ficha: ficha && {
          id: ficha.id,
          nombre: ficha.business_name,
          ciudad: ficha.ciudad || null,
          categoria: ficha.categories?.[0] || null,
          identity_verified: ficha.identity_verified === true,
          identity_verified_at: ficha.identity_verified_at || null,
        },
      };
    }));
    lista.push(...grupo);
  }

  return res.status(200).json({
    ok: true,
    estado: pedido,
    total: lista.length,
    tope: TECHO_FILAS,
    caducan_en_segundos: SEGUNDOS_DE_VIDA,
    revisor: admin.email ? { email: admin.email } : {},
    verificaciones: lista,
  });
}

/** El enlace público de la ficha de quien se acaba de verificar, para que el
 *  correo le lleve a ver su propio distintivo. Devuelve null si no se puede
 *  construir: un botón «Ver mi ficha» que lleva a un 404 es peor que no tener
 *  botón. */
function enlaceDeFicha(ficha) {
  if (!ficha) return null;
  const limpia = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const nombre = limpia(ficha.slug_publico) || limpia(ficha.business_name);
  if (!nombre) return null;
  const cat = ficha.categories?.[0], ciudad = ficha.ciudad;
  return cat && ciudad
    ? `https://misautonomos.es/autonomo/${limpia(cat)}-en-${limpia(ciudad)}/${nombre}`
    : `https://misautonomos.es/autonomo/${nombre}`;
}

function diasDesde(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

// ── La decisión ─────────────────────────────────────────────────────────────

async function resolver(req, res, admin) {
  const cuerpo = typeof req.body === 'string' ? leerJSON(req.body) : (req.body || {});
  const id = typeof cuerpo?.id === 'string' ? cuerpo.id.trim() : '';
  const decision = typeof cuerpo?.decision === 'string' ? cuerpo.decision.trim() : '';
  const motivo = typeof cuerpo?.motivo === 'string' ? cuerpo.motivo.trim() : '';

  if (!ID_VALIDO.test(id)) return res.status(400).json({ error: 'id_invalido' });
  if (decision !== 'aprobar' && decision !== 'rechazar') {
    return res.status(400).json({ error: 'decision_invalida', admitidas: ['aprobar', 'rechazar'] });
  }
  // Rechazar sin decir por qué deja a la persona esperando otra vez, sin saber
  // si el problema era el reflejo del plástico o la foto cortada. El motivo es
  // obligatorio porque es lo único que puede arreglar su siguiente intento.
  //
  // Los dos avisos llevan `mensaje`: la pantalla pinta ese texto tal cual
  // (`mensajeDeError` en AdminVerificar.jsx le da prioridad sobre sus propios
  // genéricos), así que es la única forma de que el revisor lea qué pasa de
  // verdad en vez de un «escribe el motivo» que no le dice nada nuevo.
  if (decision === 'rechazar' && motivo.length < MOTIVO_MINIMO) {
    return res.status(400).json({
      error: 'motivo_obligatorio',
      mensaje: motivo
        ? `El motivo tiene que decir QUÉ falla —«la foto está borrosa», «falta el reverso»—, porque es lo que esa persona va a leer para volver a intentarlo. Con menos de ${MOTIVO_MINIMO} caracteres no se entiende.`
        : 'Escribe el motivo del rechazo: es lo único que le dice a esa persona qué tiene que volver a subir.',
    });
  }
  if (decision === 'rechazar' && motivo.length > MOTIVO_MAXIMO) {
    return res.status(400).json({
      error: 'motivo_demasiado_largo',
      mensaje: `El motivo se le enseña tal cual a esa persona y no caben más de ${MOTIVO_MAXIMO} caracteres (has escrito ${motivo.length}). Recórtalo y vuelve a enviarlo: guardarlo a medias sería enseñarle una frase sin terminar.`,
    });
  }

  const [fila] = await postgrest(`identity_verifications?select=id,user_id,status&id=eq.${id}&limit=1`);
  if (!fila) return res.status(404).json({ error: 'no_encontrada' });

  const ahora = new Date().toISOString();
  // Quién revisó. El correo del admin, no el uuid: dentro de un año, «revisado
  // por 7c1f…» no le dice nada a nadie. Es un dato de la base, no del repo.
  const revisor = admin.email || admin.uid;
  const anterior = fila.status;

  if (decision === 'aprobar') {
    // ── El orden de las dos escrituras no es casual ──────────────────────
    // Primero el DISTINTIVO y después el estado. Si falla la segunda queda una
    // ficha con distintivo y una verificación todavía pendiente: sigue en la
    // lista del revisor, que vuelve a pulsar Aprobar y lo arregla —y la
    // persona ya tiene lo que pidió. Al revés, la verificación quedaría
    // «aprobada», fuera de la lista de pendientes, y la persona seguiría sin
    // distintivo sin que nadie se enterara nunca. De los dos estados a medias,
    // éste es el que se ve.
    let distintivo;
    try {
      // `select=id` con `return=representation`: de la respuesta sólo se usa
      // el NÚMERO de filas, y sin esto PostgREST devuelve las 63 columnas de
      // la ficha —`iban`, `cif_nif`, los teléfonos— a la memoria de esta
      // función para contar hasta uno.
      const fichas = await postgrest(
        `professional_profiles?user_id=eq.${encodeURIComponent(fila.user_id)}&select=id`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({ identity_verified: true, identity_verified_at: ahora }),
        },
      );
      // Cero filas no es un fallo: una de las personas que subió su documento
      // no tiene ficha publicada. Se aprueba igual —el documento es válido o
      // no lo es, independientemente de que haya ficha— pero hay que DECIRLO,
      // porque el distintivo que el revisor cree haber puesto no existe.
      distintivo = fichas.length ? 'puesto' : 'sin_ficha';
    } catch (e) {
      console.error(`[admin/verificaciones] ${id}: el distintivo no se pudo poner:`, e.message);
      return res.status(502).json({
        ok: false,
        error: 'distintivo_no_escrito',
        mensaje: 'No se ha podido marcar la ficha como verificada, así que NO se ha aprobado nada. '
          + 'Vuelve a intentarlo: la verificación sigue pendiente y la persona sigue sin distintivo.',
      });
    }

    try {
      await postgrest(`identity_verifications?id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          rejection_reason: null,
          reviewed_by: revisor,
          reviewed_date: ahora,
        }),
      });
    } catch (e) {
      console.error(`[admin/verificaciones] ${id}: distintivo puesto pero estado sin guardar:`, e.message);
      return res.status(502).json({
        ok: false,
        parcial: true,
        distintivo,
        error: 'estado_no_guardado',
        mensaje: 'El distintivo SÍ está puesto en la ficha, pero la verificación ha quedado como pendiente. '
          + 'Vuelve a pulsar Aprobar sobre la misma fila: repetirlo no hace daño y deja las dos cosas de acuerdo.',
      });
    }

    console.log(`[admin/verificaciones] ${id} aprobada (distintivo: ${distintivo})`);

    // Y SE LE DICE. Aprobar en silencio es hacer que alguien enseñe su DNI,
    // espere semanas y no se entere de que ha servido.
    //
    // Va DESPUÉS de las dos escrituras y con su propio try: la aprobación ya
    // está hecha y es lo que importa. Si el correo falla se anota y se sigue;
    // nunca al revés — un fallo de Resend no puede deshacer una aprobación.
    let aviso = { enviado: false, motivo: 'no intentado' };
    try {
      let ficha = null;
      try {
        const fs = await postgrest(
          `professional_profiles?user_id=eq.${encodeURIComponent(fila.user_id)}`
          + `&select=business_name,slug_publico,ciudad,categories&limit=1`,
        );
        ficha = fs?.[0] || null;
      } catch { /* sin ficha, el correo lo dice de otra manera */ }
      aviso = await avisarVerificada({
        nombre: fila.user_name,
        correo: fila.user_email,
        tieneFicha: distintivo === 'puesto',
        urlFicha: enlaceDeFicha(ficha),
      });
    } catch (e) {
      console.error(`[admin/verificaciones] ${id}: aprobada pero sin avisar:`, e.message);
    }

    return res.status(200).json({ ok: true, id, decision, anterior, estado: 'approved', distintivo, aviso });
  }

  // ── Rechazar ───────────────────────────────────────────────────────────
  // Aquí el distintivo no se toca... salvo si estaba puesto, que sólo puede
  // venir de una aprobación anterior: entonces hay que quitarlo, porque un
  // rechazo que deja el sello verde en la ficha no es un rechazo. El filtro
  // `identity_verified=is.true` hace que sea un no-op en el caso normal, sin
  // una lectura previa y sin pisar la fecha de nadie.
  let distintivo = 'intacto';
  try {
    const fichas = await postgrest(
      `professional_profiles?user_id=eq.${encodeURIComponent(fila.user_id)}&identity_verified=is.true&select=id`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        // La fecha se va con el distintivo: «verificado el 3 de octubre» en una
        // ficha que no está verificada es un dato falso esperando a confundir.
        body: JSON.stringify({ identity_verified: false, identity_verified_at: null }),
      },
    );
    if (fichas.length) distintivo = 'retirado';
  } catch (e) {
    console.error(`[admin/verificaciones] ${id}: no se pudo retirar el distintivo:`, e.message);
    return res.status(502).json({
      ok: false,
      error: 'distintivo_no_retirado',
      mensaje: 'La ficha tenía el distintivo de verificada y no se ha podido quitar, así que NO se ha '
        + 'guardado el rechazo. Vuelve a intentarlo.',
    });
  }

  try {
    await postgrest(`identity_verifications?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'rejected',
        // Lo escribe el admin y lo lee la persona rechazada. Se guarda tal
        // cual y ENTERO —lo que no cabía se ha rechazado antes con un aviso,
        // en vez de cortarlo aquí sin decírselo a nadie—. El escapado es de
        // quien lo pinte, que sabe si va a HTML o a texto.
        rejection_reason: motivo,
        reviewed_by: revisor,
        reviewed_date: ahora,
      }),
    });
  } catch (e) {
    console.error(`[admin/verificaciones] ${id}: rechazo sin guardar:`, e.message);
    return res.status(502).json({
      ok: false,
      parcial: distintivo === 'retirado',
      distintivo,
      error: 'estado_no_guardado',
      mensaje: distintivo === 'retirado'
        ? 'Se ha retirado el distintivo de la ficha pero el rechazo no se ha guardado. Vuelve a intentarlo.'
        : 'El rechazo no se ha guardado. Vuelve a intentarlo.',
    });
  }

  console.log(`[admin/verificaciones] ${id} rechazada (distintivo: ${distintivo})`);
  return res.status(200).json({ ok: true, id, decision, anterior, estado: 'rejected', distintivo });
}

function leerJSON(s) { try { return JSON.parse(s); } catch { return {}; } }

// ── El manejador ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // NADA de CORS, al contrario que `api/notify-admin.js` y
  // `api/aviso-contacto.js`, que son públicos y abren el origen. Aquí no se
  // manda `Access-Control-Allow-Origin` a propósito: lo llama el panel desde
  // el mismo origen, y sin esa cabecera el navegador no deja que una página de
  // otro dominio lea la respuesta. Una capa más entre un DNI y un tercero.
  //
  // `no-store` porque el cuerpo lleva URLs firmadas: ni el navegador ni un
  // intermediario deben guardarlas en disco. `no-referrer` porque si el panel
  // enlaza o abre una de esas URLs, la cabecera Referer no debe contar a
  // Storage —ni a nadie— desde qué pantalla se hizo.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'metodo_no_permitido' });
  }

  // Sin configuración no se abre la puerta: un endpoint que se queda sin la
  // clave de servicio y responde «no hay nada» es peor que uno que dice que
  // está mal montado. Mismo criterio que `api/_lib/guardia.js` con CRON_SECRET.
  if (!BASE || !SERVICIO || !ANONIMA) {
    console.error('[admin/verificaciones] faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o la clave anónima');
    return res.status(500).json({ error: 'sin_configurar' });
  }

  const quien = await quienLlama(req);
  if (!quien.ok) {
    // Un 403 aquí es alguien con sesión intentando entrar en los documentos de
    // otros. Se anota que ha pasado, sin el uid ni el correo: el aviso sirve
    // igual y no deja identidades en los logs de Vercel.
    if (quien.estado === 403) console.warn('[admin/verificaciones] 403: sesión válida sin rol de admin');
    return res.status(quien.estado).json({ error: quien.error });
  }

  try {
    return req.method === 'GET'
      ? await listar(req, res, quien.admin)
      : await resolver(req, res, quien.admin);
  } catch (e) {
    // El mensaje de la excepción puede traer trozos de la respuesta de
    // PostgREST, y ahí dentro hay correos. Al log, recortado; al cliente, un
    // error genérico.
    console.error('[admin/verificaciones] fallo inesperado:', String(e?.message || e).slice(0, 200));
    return res.status(500).json({ error: 'fallo_interno' });
  }
}
