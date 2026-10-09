// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  El envío de correo del panel, en un solo sitio                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Lo usan el aviso instantáneo de contacto y los tres resúmenes (diario,
// semanal, mensual). Antes cada endpoint se traía su propio `fetch` a Resend y
// su propio HTML; con cuatro correos distintos eso son cuatro maquetas que se
// desincronizan y cuatro sitios donde olvidarse de escapar una comilla.
//
// Variables de entorno (todas en Vercel, producción):
//   RESEND_API_KEY       sin ella no se envía nada y se devuelve {saltado:true}
//   RESEND_FROM_EMAIL    remitente
//   RESEND_FROM_NAME     nombre del remitente
//   ADMIN_NOTIFY_EMAIL   destinatario. SIN VALOR POR DEFECTO, a propósito:
//                        este repositorio es público y antes llevaba la
//                        dirección del dueño escrita en el código.

/**
 * «1 contacto», no «1 contactos». Parece una minucia y no lo es: un correo
 * automático que no concuerda se lee como lo que es, una plantilla, y a la
 * tercera semana deja de abrirse.
 *   plural(1, 'contacto')              → '1 contacto'
 *   plural(3, 'contacto')              → '3 contactos'
 *   plural(2, 'valoración', 'valoraciones') → '2 valoraciones'
 */
export function plural(n, singular, pluralForma = null) {
  const palabra = n === 1 ? singular : (pluralForma || `${singular}s`);
  return `${n} ${palabra}`;
}

export function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const MARINO = '#00255C';
const DORADO = '#F5C13D';

/**
 * La maqueta común. `bloques` es una lista de trozos de HTML ya montados por
 * los ayudantes de abajo — así ningún endpoint escribe `<table>` a mano.
 */
export function plantilla({ titulo, entradilla = '', bloques = [], pie = '' }) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:${MARINO};border-radius:14px 14px 0 0;padding:20px 24px;">
      <div style="color:#fff;font-size:18px;font-weight:700;">${escapar(titulo)}</div>
      ${entradilla ? `<div style="color:rgba(255,255,255,.78);font-size:13px;margin-top:6px;line-height:1.5;">${entradilla}</div>` : ''}
    </div>
    <div style="background:#fff;border-radius:0 0 14px 14px;padding:4px 24px 24px;">
      ${bloques.join('\n')}
    </div>
    <div style="color:#8b93a7;font-size:11px;text-align:center;margin-top:16px;line-height:1.6;">
      ${pie || 'Panel de MisAutónomos · <a href="https://misautonomos.es/admin" style="color:#8b93a7;">abrir el panel</a>'}
    </div>
  </div>
</body></html>`;
}

/** Una fila de cifra grande con su etiqueta, y la comparación si se da. */
export function cifras(items) {
  const celdas = items.map((i) => {
    const d = i.delta;
    const flecha = d == null || d === 0 ? '' :
      `<span style="font-size:12px;color:${d > 0 ? '#1FAD4F' : '#DC2626'};"> ${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</span>`;
    return `<td style="padding:12px 8px;text-align:center;vertical-align:top;">
      <div style="font-size:26px;font-weight:700;color:${MARINO};line-height:1.1;">${escapar(String(i.valor))}${flecha}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.06em;">${escapar(i.etiqueta)}</div>
    </td>`;
  });
  return `<table style="width:100%;border-collapse:collapse;margin:18px 0 6px;"><tr>${celdas.join('')}</tr></table>`;
}

/** Un apartado con título y, dentro, filas de texto. */
export function seccion(titulo, filas, vacio = 'Nada.') {
  const cuerpo = filas.length
    ? filas.map((f) => `<div style="padding:9px 0;border-bottom:1px solid #eef0f4;font-size:14px;line-height:1.5;">${f}</div>`).join('')
    : `<div style="padding:9px 0;font-size:14px;color:#9aa1ae;">${escapar(vacio)}</div>`;
  return `<div style="margin-top:22px;">
    <div style="font-size:12px;font-weight:700;color:${MARINO};text-transform:uppercase;letter-spacing:.07em;padding-bottom:4px;border-bottom:2px solid ${DORADO};">${escapar(titulo)}</div>
    ${cuerpo}
  </div>`;
}

/** Un aviso que hay que mirar. Se usa poco a propósito: si todo es urgente, nada lo es. */
export function alerta(texto) {
  return `<div style="margin-top:18px;background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px 14px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.55;">${texto}</div>`;
}

/** `created_at` de Resend viene como «2026-10-09 10:56:51.367000+00», que no es
 *  ISO. V8 hoy lo parsea, pero de eso no se puede depender: si un día deja de
 *  hacerlo, un candado que no sabe leer la fecha tiene que fallar hacia enviar,
 *  nunca hacia callar. */
function fecha(s) {
  const d = new Date(String(s || ''));
  if (!Number.isNaN(d.getTime())) return d;
  const n = new Date(String(s || '').replace(' ', 'T').replace(/\+(\d{2})$/, '+$1:00'));
  return Number.isNaN(n.getTime()) ? null : n;
}

/**
 * ¿Ya salió este correo?
 *
 * Vercel reintenta un cron que tarda o devuelve error, y en el plan Hobby la
 * hora programada se cumple con ±59 min de margen, así que la misma ventana
 * puede dispararse dos veces. Sin candado eso son dos correos idénticos en el
 * buzón del dueño — comprobado: dos ejecuciones seguidas de `informe-diario`
 * mandaban dos veces «resumen del jueves, 8 de octubre».
 *
 * El candado se le pregunta a Resend, que es el único sitio que las dos
 * ejecuciones comparten: la memoria del proceso no sirve (cada arranque en
 * frío la estrena) y una tabla nueva en la base sería un cambio de esquema
 * para esto. Se busca en los últimos 100 envíos un asunto que contenga la
 * `marca` del periodo: «jueves, 8 de octubre», «del 2 al 8 de octubre»,
 * «septiembre de 2026». La marca identifica el periodo, así que si aparece es
 * que el correo de ese periodo ya se mandó.
 *
 * Si la consulta falla se devuelve `comprobado:false` y el que llama ENVÍA. Un
 * informe repetido es una molestia; un informe que no llega porque el candado
 * no pudo comprobarse es un día de datos perdido.
 */
export async function yaSalio({ marca, destino, diasAtras = 35 }) {
  const clave = process.env.RESEND_API_KEY;
  if (!clave || !marca || !destino) return { ya: false, comprobado: false, motivo: 'faltan_datos' };
  try {
    const r = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${clave}` },
    });
    if (!r.ok) return { ya: false, comprobado: false, motivo: `resend_${r.status}` };
    const d = await r.json();
    const corte = Date.now() - diasAtras * 86400000;
    const quien = String(destino).trim().toLowerCase();
    const previo = (d.data || []).find((e) => {
      if (!String(e.subject || '').includes(marca)) return false;
      if (!(e.to || []).some((t) => String(t).trim().toLowerCase() === quien)) return false;
      const f = fecha(e.created_at);
      // Sin fecha legible no se cuenta como previo: el correo SALE. Es lo que
      // promete el comentario de `fecha()` y antes el código hacía justo lo
      // contrario —`!f` daba el envío por hecho y callaba el informe—, que es
      // el único fallo de los dos que no se nota.
      return f ? f.getTime() >= corte : false;
    });
    return previo
      ? { ya: true, comprobado: true, id: previo.id, cuando: previo.created_at }
      : { ya: false, comprobado: true };
  } catch (e) {
    return { ya: false, comprobado: false, motivo: e?.message || String(e) };
  }
}

/**
 * Manda el correo. Devuelve SIEMPRE una de estas cuatro cosas:
 *   { ok:true,  id }                    salió
 *   { ok:true,  duplicado:true, id }    ya estaba enviado, no se repite
 *   { ok:false, motivo }                falta configuración: nada ha salido
 *   { ok:false, estado, error }         Resend ha dicho no
 *
 * Antes los dos primeros fallos devolvían `{saltado:true}` sin `ok`, y los
 * crons comprobaban `envio.ok === false`: con la clave o el destinatario sin
 * poner, los cuatro respondían HTTP 200 y `ok:true` sin haber enviado nada.
 * Un cron en verde que no manda correo es el fallo que nadie encuentra.
 *
 * `marca` activa el candado anti-duplicado de arriba. Sin ella no se consulta
 * nada: el aviso de contacto no la usa porque son dos intentos distintos y
 * los dos tienen que llegar.
 */
export async function enviarCorreo({ asunto, html, para = null, marca = null }) {
  const clave = process.env.RESEND_API_KEY;
  const destino = para || process.env.ADMIN_NOTIFY_EMAIL;
  if (!clave) return { ok: false, motivo: 'sin_RESEND_API_KEY' };
  if (!destino) return { ok: false, motivo: 'sin_ADMIN_NOTIFY_EMAIL' };

  if (marca) {
    const previo = await yaSalio({ marca, destino });
    if (previo.ya) {
      console.warn(`[correo] «${marca}» ya se envió (${previo.cuando}); no se repite`);
      return { ok: true, duplicado: true, id: previo.id, cuando: previo.cuando };
    }
    if (!previo.comprobado) console.warn(`[correo] candado sin comprobar (${previo.motivo}): se envía igual`);
  }

  const remitente = `${process.env.RESEND_FROM_NAME || 'MisAutónomos'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: remitente, to: [destino], subject: asunto, html }),
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Se devuelve el error en vez de lanzarlo: el que llama decide. Un cron
    // que no puede enviar debe responder 502 y verse en los logs de Vercel,
    // no morir en silencio como hacía el alta de newsletter.
    return { ok: false, estado: r.status, error: cuerpo?.message || JSON.stringify(cuerpo).slice(0, 300) };
  }
  return { ok: true, id: cuerpo?.id || null };
}

/**
 * HTML de confianza limitada: se escapa todo y se devuelven vivas sólo las
 * tres etiquetas que usan los avisos sueltos para resaltar un nombre.
 *
 * `api/notify-admin.js` es público y sin autenticación, y metía el campo
 * `body` en el correo tal cual llegaba del navegador. Comprobado: un POST de
 * un desconocido colocaba un `<a href>` a su sitio y un `<img>` rastreador en
 * un correo con el remitente verificado del dueño. Lista blanca, no lista
 * negra: lo que no esté aquí sale como texto.
 */
export function htmlLimitado(s) {
  return escapar(s)
    .replace(/&lt;(\/?)(strong|b|em|i)&gt;/g, '<$1$2>')
    .replace(/&lt;br\s*\/?&gt;/g, '<br>');
}

/**
 * La respuesta de un cron que no ha podido enviar, sin la dirección del dueño
 * dentro.
 *
 * `enviarCorreo` devuelve en `error` el cuerpo del fallo de Resend, y ese
 * cuerpo repite el campo `to` —«Invalid `to` field: duenyo@…»—. Los cuatro
 * crons lo metían tal cual en `detalle`, así que el buzón del dueño acababa en
 * el cuerpo de una respuesta HTTP y en el historial de ejecuciones. El guardia
 * del cron evita que lo lea un desconocido, pero la dirección no tiene por qué
 * estar ahí para empezar: al log, que es donde sirve para depurar.
 */
export function sinRastro(envio, etiqueta = 'cron') {
  console.error(`[${etiqueta}] no enviado`, envio);
  return { error: 'no_enviado', motivo: envio?.motivo || null, estado: envio?.estado || null };
}
