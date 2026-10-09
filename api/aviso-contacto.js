// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  AVISO DE CONTACTO — en cuanto alguien pulsa Llamar, WhatsApp o el form  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Lo llama el navegador desde la ficha pública, desde los mismos tres
// manejadores que registran la métrica. Es el único correo del panel que no es
// un resumen: llega suelto, con una cosa dentro, porque un contacto que se
// contesta a los diez minutos vale mucho más que el mismo contacto contado
// mañana a las 07:00 en el informe diario — que lo seguirá contando igual.
//
// El cliente manda SÓLO `{ profileId, canal }`. El nombre, el oficio, la
// ciudad y el enlace se leen aquí de la base con la clave de servicio: si el
// correo se montara con lo que llega del navegador, cualquiera podría hacer
// que el panel avisara de un contacto con la ficha y el texto que quisiera.
//
// Variables de entorno: las mismas que los resúmenes (ver api/_lib/correo.js).
// Sin RESEND_API_KEY o sin ADMIN_NOTIFY_EMAIL el endpoint responde 200 y no
// envía: el visitante nunca debe notar que esto existe.

import { hayBase, nombresDeFichas, urlFicha } from './_lib/datos.js';
import { enviarCorreo, plantilla, seccion, escapar } from './_lib/correo.js';

// Los tres canales que de verdad hay en una ficha, y cómo se llaman en el
// correo. Es lista blanca, no traducción: lo que no esté aquí no se envía.
const CANALES = {
  telefono: { titulo: 'Contacto por teléfono', verbo: 'ha pulsado Llamar' },
  whatsapp: { titulo: 'Contacto por WhatsApp', verbo: 'ha pulsado WhatsApp' },
  formulario: { titulo: 'Contacto por el formulario', verbo: 'ha abierto el formulario de contacto' },
};

// Un móvil que no acaba de abrir el marcador manda el mismo clic dos o tres
// veces. Esto no protege de nadie que quiera llenar el buzón a propósito —
// para eso haría falta un límite por IP en el borde —, sólo evita el correo
// duplicado del doble toque, que es el caso real.
const RECIENTES = new Map();
const VENTANA_MS = 90 * 1000;

function repetido(clave) {
  const ahora = Date.now();
  for (const [k, t] of RECIENTES) if (ahora - t > VENTANA_MS) RECIENTES.delete(k);
  if (RECIENTES.has(clave)) return true;
  // La función se recicla sola; el tope es por si una ráfaga la mantiene
  // caliente con muchas fichas distintas.
  if (RECIENTES.size > 500) RECIENTES.clear();
  RECIENTES.set(clave, ahora);
  return false;
}

export default function handler(req, res) {
  // CORS abierto, como api/notify-admin.js: lo llama el propio sitio y no hay
  // nada que proteger en la respuesta — ni confirma si la ficha existe.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  return avisar(req, res);
}

async function avisar(req, res) {
  // En Vercel `req.body` ya viene parseado; en local o con otro content-type
  // llega como texto.
  const cuerpo = typeof req.body === 'string' ? leerJSON(req.body) : (req.body || {});
  const profileId = String(cuerpo.profileId || '');
  const canal = String(cuerpo.canal || '');

  const etiqueta = CANALES[canal];
  // Un id con caracteres raros no es un id: se corta antes de preguntar a la
  // base, aunque `nombresDeFichas` ya lo codifique.
  if (!etiqueta || !/^[A-Za-z0-9_-]{6,64}$/.test(profileId)) {
    return res.status(400).json({ error: 'profileId_o_canal_invalido' });
  }

  if (!hayBase()) {
    console.warn('[aviso-contacto] sin SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    return res.status(200).json({ saltado: true, motivo: 'sin_base' });
  }

  try {
    const fichas = await nombresDeFichas([profileId]);
    const p = fichas.get(profileId);
    // Id que no existe: 200 y a callar. Puede ser una ficha recién borrada o
    // alguien probando ids a mano; en ninguno de los dos casos hay correo.
    if (!p) return res.status(200).json({ saltado: true, motivo: 'ficha_desconocida' });

    if (repetido(`${profileId}|${canal}`)) {
      return res.status(200).json({ saltado: true, motivo: 'repetido' });
    }

    const nombre = escapar(p.business_name || 'ficha sin nombre');
    const oficio = p.categories?.[0] ? escapar(p.categories[0]) : 'sin oficio';
    const ciudad = p.ciudad ? escapar(p.ciudad) : 'sin ciudad';
    // Hora de Madrid, no UTC: el que lee el correo vive en esa hora y en
    // verano la diferencia son dos horas, suficiente para que «a las 9:40»
    // parezca de madrugada.
    const hora = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
    });

    const html = plantilla({
      titulo: etiqueta.titulo,
      entradilla: `Alguien ${etiqueta.verbo} a las ${escapar(hora)}.`,
      bloques: [
        seccion('La ficha', [
          `<a href="${urlFicha(p)}" style="color:#00255C;font-weight:600;">${nombre}</a> — ${oficio} en ${ciudad}`,
        ]),
      ],
      pie: 'Aviso automático de MisAutónomos · <a href="https://misautonomos.es/admin" style="color:#8b93a7;">abrir el panel</a>',
    });

    const envio = await enviarCorreo({ asunto: `${etiqueta.titulo} · ${p.business_name || 'ficha sin nombre'}`, html });
    // Aquí NO se devuelve 502 aunque Resend falle, al contrario que en los
    // crons: el `fetch` del navegador es fire-and-forget y un error sólo
    // ensuciaría la consola del visitante. El fallo se ve en los logs.
    if (envio.ok === false) {
      console.error('[aviso-contacto] resend', envio);
      return res.status(200).json({ ok: false, envio });
    }
    return res.status(200).json({ ok: true, envio, canal });
  } catch (e) {
    console.error('[aviso-contacto]', e);
    return res.status(200).json({ ok: false, error: e?.message || String(e) });
  }
}

function leerJSON(s) { try { return JSON.parse(s); } catch { return {}; } }
