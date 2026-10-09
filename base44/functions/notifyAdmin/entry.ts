import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Repositorio público: la dirección sale a una variable de entorno.
const ADMIN_EMAIL = Deno.env.get('ADMIN_NOTIFY_EMAIL') || '';

Deno.serve(async (req) => {
  try {
    const { event, title, body, data, severity = 'low' } = await req.json();

    if (!event || !title) {
      return Response.json({ error: 'Missing event or title' }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY no configurada');
      return Response.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:24px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr><td style="padding:16px 24px;border-bottom:1px solid #E2E8F0;background:#0F172A;color:#FFFFFF;">
          <span style="font-weight:700;font-size:14px;">MisAutónomos · Admin</span>
        </td></tr>
        <tr><td style="padding:24px;">
          <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0F172A;">${title}</h2>
          <div style="font-size:14px;line-height:1.6;color:#334155;">${body || ''}</div>
          ${data ? `<pre style="margin:16px 0 0;background:#F1F5F9;padding:12px;border-radius:8px;font-size:12px;color:#475569;white-space:pre-wrap;word-break:break-word;">${JSON.stringify(data, null, 2)}</pre>` : ''}
        </td></tr>
        <tr><td style="padding:12px 24px;border-top:1px solid #E2E8F0;background:#F8FAFC;font-size:11px;color:#94A3B8;">
          Evento: <code>${event}</code> · ${new Date().toISOString()}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MisAutónomos <hola@misautonomos.es>',
        reply_to: 'hola@misautonomos.es',
        to: [ADMIN_EMAIL],
        subject: `[MisAutónomos] ${title}`,
        html
      })
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      console.error('❌ Resend error:', errText);
      return Response.json({ error: 'Email send failed', detail: errText }, { status: 500 });
    }

    // Guardar en AdminAlert para histórico (no bloquea si falla)
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AdminAlert.create({
        type: event,
        severity,
        message: title + (body ? ' — ' + String(body).replace(/<[^>]*>/g, '').substring(0, 200) : ''),
      });
    } catch (alertErr) {
      console.warn('AdminAlert no creado:', alertErr.message);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('❌ notifyAdmin error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});