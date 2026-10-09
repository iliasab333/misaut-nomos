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

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
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
          ${body ? `<div style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.55;">${body}</div>` : ''}
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
      console.error('[notify-admin] resend error', r.status, responseText);
      return res.status(502).json({ error: 'resend_failed', status: r.status, details: responseText });
    }

    let parsed = {};
    try { parsed = JSON.parse(responseText); } catch (_e) { /* noop */ }
    return res.status(200).json({ ok: true, id: parsed.id || null });
  } catch (e) {
    console.error('[notify-admin] exception', e);
    return res.status(500).json({ error: 'exception', details: String(e?.message || e) });
  }
}

function safeJSON(s) { try { return JSON.parse(s); } catch (_e) { return {}; } }
