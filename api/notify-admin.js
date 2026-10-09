// Vercel Serverless Function: notifica al admin por email cuando ocurre un
// evento relevante (nuevo cliente, nuevo profesional, alta newsletter, etc.).
// Lo invoca el frontend con fetch('/api/notify-admin').
//
// Env vars requeridas:
//   - RESEND_API_KEY       — sin esto, el endpoint responde 200 {skipped:true}.
//   - RESEND_FROM_EMAIL    — opcional. Defaults a onboarding@resend.dev (test).
//   - RESEND_FROM_NAME     — opcional. Defaults a "MisAutónomos".
//   - ADMIN_NOTIFY_EMAIL   — OBLIGATORIA. Sin ella no se envía: no hay valor
//                            por defecto a propósito (ver abajo).

import { htmlLimitado } from './_lib/correo.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ── Duplicados y ráfagas ───────────────────────────────────────────────────
//
// Este endpoint es público, con CORS abierto y sin autenticación, y no tenía
// ni freno ni memoria: comprobado, diez POST idénticos seguidos mandaban diez
// correos. Dos cosas distintas que arreglar:
//
// 1. El doble clic. El alta del boletín y la del usuario se disparan desde un
//    botón; si el visitante lo pulsa dos veces salen dos avisos iguales. Dos
//    minutos de memoria por (evento + asunto + correo del usuario) lo cubren.
// 2. La ráfaga. Cualquiera puede llamar en bucle: con un techo por hora el
//    buzón del dueño no se llena y la cuota de Resend tampoco. El mismo techo
//    que ya tiene `api/aviso-contacto.js`, por el mismo motivo.
//
// Las dos viven en la memoria del proceso, así que no aguantan un arranque en
// frío ni se comparten entre instancias. Para el doble clic basta —los dos
// clics caen en la misma instancia caliente—; contra un atacante decidido
// haría falta un límite por IP en el borde, y eso no se arregla aquí.
const RECIENTES = new Map();
const VENTANA_MS = 2 * 60 * 1000;
const TECHO_POR_HORA = 60;
let enviadosEnLaHora = 0;
let horaEnCurso = 0;

function repetido(clave) {
  const ahora = Date.now();
  for (const [k, t] of RECIENTES) if (ahora - t > VENTANA_MS) RECIENTES.delete(k);
  if (RECIENTES.has(clave)) return true;
  if (RECIENTES.size > 500) RECIENTES.clear();
  RECIENTES.set(clave, ahora);
  return false;
}

function pasaElTecho() {
  const hora = Math.floor(Date.now() / 3600000);
  if (hora !== horaEnCurso) { horaEnCurso = hora; enviadosEnLaHora = 0; }
  if (enviadosEnLaHora >= TECHO_POR_HORA) return false;
  enviadosEnLaHora += 1;
  return true;
}

/**
 * Suelta la reserva cuando el envío NO ha salido.
 *
 * `repetido()` y `pasaElTecho()` apuntan el aviso ANTES de hablar con Resend,
 * y tienen que hacerlo así: los dos clics de un doble clic llegan a la vez y
 * si la marca se pusiera después los dos pasarían. El problema era no
 * deshacerlo: con Resend caído, el primer intento devolvía 502 y el reintento
 * de medio segundo después se respondía `{skipped:true, reason:'repetido'}`.
 * Comprobado — Resend 500 y luego reintento: cero correos, y el aviso del alta
 * perdido durante dos minutos mientras la respuesta decía que todo bien.
 *
 * Un intento que no ha mandado nada tampoco debe gastar cupo del techo.
 */
function soltarReserva(clave) {
  RECIENTES.delete(clave);
  if (enviadosEnLaHora > 0) enviadosEnLaHora -= 1;
}

const SEVERITY_STYLES = {
  low:    { color: '#1FAD4F', bg: '#E8F8EE', label: 'INFO' },
  medium: { color: '#F59E0B', bg: '#FEF3C7', label: 'AVISO' },
  high:   { color: '#DC2626', bg: '#FEE2E2', label: 'CRÍTICO' },
};

export default async function handler(req, res) {
  // CORS abierto: lo llama el propio frontend desde misautonomos.es.
  // No es un secreto; si lo descubren no pueden hacer daño (el remitente
  // y destinatario son fijos del servidor).
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // No hacemos ruido — el frontend es fire-and-forget. Devolvemos 200 con
    // {skipped:true} para que se vea en los logs sin generar errores en cliente.
    console.warn('[notify-admin] RESEND_API_KEY missing — skipping send');
    return res.status(200).json({ skipped: true, reason: 'no_api_key' });
  }

  // Sin valor por defecto. Aquí había escrita la dirección personal del dueño,
  // y este repositorio es PÚBLICO en GitHub. La variable ya está puesta en
  // Vercel (producción); si falta, es mejor no enviar y decirlo en los logs que
  // volver a publicar una dirección en el código.
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) {
    console.warn('[notify-admin] ADMIN_NOTIFY_EMAIL sin configurar — no se envía');
    return res.status(200).json({ skipped: true, reason: 'no_admin_email' });
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.RESEND_FROM_NAME || 'MisAutónomos';

  // Vercel parsea JSON automáticamente; si no, req.body es string.
  const payload = typeof req.body === 'string'
    ? safeJSON(req.body)
    : (req.body || {});

  const { event, title, body = '', data = null, severity = 'low', userEmail = null } = payload;

  // No avisarse a uno mismo: el admin prueba cosas y no necesita un correo por
  // cada una. La comparación vive AQUÍ y no en el navegador, que es de donde
  // vino: allí obligaba a escribir la dirección en un bundle público.
  if (userEmail && adminEmail && String(userEmail).trim().toLowerCase() === adminEmail.trim().toLowerCase()) {
    return res.status(200).json({ skipped: true, reason: 'es_el_propio_admin' });
  }
  if (!event || !title) {
    return res.status(400).json({ error: 'missing_event_or_title' });
  }

  // El doble clic no es un evento nuevo. Se mira después de descartar al
  // propio admin y antes de montar nada: así un botón pulsado dos veces
  // produce un aviso, no dos.
  const reserva = `${event}|${title}|${userEmail || ''}`;
  if (repetido(reserva)) {
    return res.status(200).json({ skipped: true, reason: 'repetido' });
  }
  if (!pasaElTecho()) {
    console.warn(`[notify-admin] techo de ${TECHO_POR_HORA} avisos/hora alcanzado`);
    return res.status(200).json({ skipped: true, reason: 'techo_horario' });
  }

  const sev = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low;
  const dataPretty = data ? JSON.stringify(data, null, 2) : '';

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:24px 24px 20px;">
          <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${sev.bg};color:${sev.color};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${sev.label} · ${escapeHtml(event)}</div>
          <h1 style="margin:16px 0 4px;font-size:18px;font-weight:600;line-height:1.3;color:#00255C;letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
          ${body ? `<div style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.55;">${htmlLimitado(body)}</div>` : ''}
          ${dataPretty ? `<pre style="margin:16px 0 0;padding:12px;background:#F3F4F6;border-radius:10px;font-size:12px;color:#1F2937;line-height:1.45;overflow-x:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(dataPretty)}</pre>` : ''}
        </td></tr>
        <tr><td style="padding:0 24px 22px;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">Notificación automática · <a href="https://misautonomos.es" style="color:#00255C;text-decoration:none;">misautonomos.es</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `${sev.label}: ${title}`,
    body ? String(body).replace(/<[^>]+>/g, '') : '',
    dataPretty,
  ].filter(Boolean).join('\n\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [adminEmail],
        subject: `[${sev.label}] ${title}`,
        html,
        text,
      }),
    });

    const responseText = await r.text();
    if (!r.ok) {
      // El detalle de Resend va al LOG, no a la respuesta: este endpoint es
      // público y el cuerpo de un error de Resend suele repetir el campo `to`,
      // o sea la dirección del dueño. Quien llama no necesita saber por qué
      // falló; el que mira los logs de Vercel, sí.
      console.error('[notify-admin] resend error', r.status, responseText);
      // No ha salido: se suelta la reserva para que el reintento pase.
      soltarReserva(reserva);
      return res.status(502).json({ error: 'resend_failed', status: r.status });
    }

    let parsed = {};
    try { parsed = JSON.parse(responseText); } catch (_e) { /* noop */ }
    return res.status(200).json({ ok: true, id: parsed.id || null });
  } catch (e) {
    console.error('[notify-admin] exception', e);
    soltarReserva(reserva);
    return res.status(500).json({ error: 'exception' });
  }
}

function safeJSON(s) { try { return JSON.parse(s); } catch (_e) { return {}; } }
