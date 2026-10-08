import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// === EMAIL BLOCKLIST TEMPORAL — vence 2026-05-01 23:59 UTC ===
// La dirección que había aquí escrita a mano era de un autónomo REAL y este
// repositorio es público: se saca a `EMAIL_BLOCKLIST` (variable de entorno,
// direcciones separadas por comas). Vacía no bloquea a nadie, que es lo que
// hacía esta función antes de que existiera la lista.
const EMAIL_BLOCKLIST_NP = (Deno.env.get("EMAIL_BLOCKLIST") || "")
  .split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
const BLOCKLIST_EXPIRES_AT_NP = new Date("2026-05-01T23:59:00Z");
function isBlockedRecipientNP(toEmail) {
  if (new Date() > BLOCKLIST_EXPIRES_AT_NP) return false;
  if (!toEmail) return false;
  return EMAIL_BLOCKLIST_NP.some(b => b.toLowerCase() === String(toEmail).trim().toLowerCase());
}
// === FIN BLOCKLIST ===

const APP_URL = Deno.env.get('VITE_APP_URL') || 'https://misautonomos.es';

/**
 * Anonimiza el nombre del remitente según el tipo de chat
 */
function getSenderDisplayName(sender, chatCategory = 'client') {
  if (!sender) return 'Un usuario';
  const isAdmin = sender.role === 'admin' || sender.is_admin === true;
  if (isAdmin) {
    return chatCategory === 'support' ? 'Equipo MisAutónomos' : 'Equipo MisAutónomos';
  }
  return sender.full_name || 'Un usuario';
}

/**
 * Notifica al profesional cuando un cliente envía un mensaje
 * Se dispara solo si el destinatario es un profesional
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    if (event?.type !== 'create') {
      return Response.json({ ok: true, skipped: 'not_create' });
    }

    const msg = data;
    if (!msg?.recipient_id || !msg?.sender_id || !msg?.content) {
      return Response.json({ ok: true, skipped: 'invalid_message' });
    }

    // [email-quote-guard v1] Solo enviar este email verde si es una solicitud de presupuesto real
    const isQuoteRequest = msg.quote_request
                           && typeof msg.quote_request === 'object'
                           && Object.keys(msg.quote_request).length > 0;
    const isBriefingConversation = typeof msg.conversation_id === 'string'
                                   && msg.conversation_id.startsWith('briefing_');

    if (!isQuoteRequest || isBriefingConversation) {
      console.log('[email-quote-guard v1] SKIP quote email. quote_request:', msg.quote_request, 'conversation_id:', msg.conversation_id);
      return Response.json({ ok: true, skipped: 'not_a_quote_request' });
    }
    console.log('[email-quote-guard v1] SEND quote email. message:', msg.id);

    // Obtener datos del profesional destinatario
    const recipientUsers = await base44.asServiceRole.entities.User.filter({
      id: msg.recipient_id
    });
    const recipient = recipientUsers?.[0];

    // Verificar que es profesional
    if (recipient?.user_type !== 'professionnel') {
      return Response.json({ ok: true, skipped: 'recipient_not_professional' });
    }

    if (!recipient?.email) {
      return Response.json({ ok: true, skipped: 'no_recipient_email' });
    }

    // Obtener nombre del cliente y anonimizar si es admin
    let clientName = msg.client_name || msg.sender_name || 'Un cliente';
    let senderObj = null;
    try {
      const senders = await base44.asServiceRole.entities.User.filter({
        id: msg.sender_id
      });
      senderObj = senders?.[0];
      clientName = getSenderDisplayName(senderObj, 'client');
    } catch (e) {
      console.warn('Could not resolve client name:', e.message);
    }

    // URL del chat
    const ctaUrl = `${APP_URL}/mensajes?conv=${msg.conversation_id || ''}`;

    // HTML del email
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva solicitud de presupuesto</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <tr><td style="padding:24px 32px;background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:white;">
          <h1 style="margin:0;font-size:20px;font-weight:700;">📩 Nueva solicitud</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1f2937;">Tienes un nuevo mensaje</h2>
          
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563;">
            Hola ${recipient.full_name || 'Profesional'},
          </p>

          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563;">
            <strong>${clientName}</strong> te ha escrito pidiendo presupuesto o más información:
          </p>

          <!-- Message Preview -->
          <div style="background:#f3f4f6;border-left:4px solid #10b981;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;word-wrap:break-word;">
              "${msg.content}"
            </p>
          </div>

          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
            Responde rápidamente para cerrar más trabajos.
          </p>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0;">
            <a href="${ctaUrl}" style="display:inline-block;background:#10b981;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
              Ver mensaje y responder
            </a>
          </div>

          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
            Accede a la plataforma para responder al cliente.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
          <p style="margin:0;">© 2026 MisAutónomos | misautonomos.es</p>
          <p style="margin:8px 0 0;">Has recibido este email porque tienes una cuenta en MisAutónomos.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Enviar email
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no configurada');
      return Response.json({ ok: true, skipped: 'no_resend_key' });
    }

    if (isBlockedRecipientNP(recipient.email)) {
      console.log('[email-blocklist v1] BLOCKED send to:', recipient.email, 'subject: nueva_solicitud_presupuesto', 'template: notifyProfessionalNewMessage');
      return Response.json({ ok: true, skipped: 'blocklist' });
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MisAutónomos <hola@misautonomos.es>',
        reply_to: 'hola@misautonomos.es',
        to: recipient.email,
        subject: `📩 Tienes una nueva solicitud de presupuesto`,
        html
      })
    });

    if (!resendResp.ok) {
      const error = await resendResp.json();
      console.error('Email send failed:', error);
      return Response.json({ ok: true, status: 'email_failed' }, { status: 200 });
    }

    const result = await resendResp.json();
    console.log(`✅ Email sent to ${recipient.email} for new message from ${clientName}:`, result.id);

    return Response.json({ 
      ok: true, 
      status: 'email_sent',
      messageId: result.id
    });

  } catch (error) {
    console.error('notifyProfessionalNewMessage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});