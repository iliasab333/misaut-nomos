import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ONESIGNAL_APP_ID = 'e178adb2-38e8-4397-9239-833be611ed27';

// === EMAIL BLOCKLIST TEMPORAL — vence 2026-05-01 23:59 UTC ===
// La dirección que había aquí escrita a mano era de un autónomo REAL y este
// repositorio es público: se saca a `EMAIL_BLOCKLIST` (variable de entorno,
// direcciones separadas por comas). Vacía no bloquea a nadie, que es lo que
// hacía esta función antes de que existiera la lista.
const EMAIL_BLOCKLIST_OM = (Deno.env.get("EMAIL_BLOCKLIST") || "")
  .split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
const BLOCKLIST_EXPIRES_AT_OM = new Date("2026-05-01T23:59:00Z");
function isBlockedRecipientOM(toEmail) {
  if (new Date() > BLOCKLIST_EXPIRES_AT_OM) return false;
  if (!toEmail) return false;
  return EMAIL_BLOCKLIST_OM.some(b => b.toLowerCase() === String(toEmail).trim().toLowerCase());
}
// === FIN BLOCKLIST ===
const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';

/**
 * Anonimiza el nombre del remitente según el tipo de chat
 */
function getSenderDisplayName(sender, chatCategory = 'client') {
  if (!sender) return 'Un usuario';
  const isAdmin = sender.role === 'admin' || sender.is_admin === true;
  if (isAdmin) {
    if (chatCategory === 'ads_briefing') return 'Equipo Plan Ads+';
    if (chatCategory === 'support') return 'Equipo MisAutónomos';
    return 'Equipo MisAutónomos';
  }
  return sender.full_name || 'Un usuario';
}

async function sendPush(recipientId, title, body, url) {
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!apiKey) {
    console.warn('ONESIGNAL_REST_API_KEY no configurada — push omitido');
    return;
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: [recipientId] },
    target_channel: 'push',
    headings: { en: title, es: title },
    contents: { en: body, es: body },
    url: url || 'https://misautonomos.es/mensajes',
    chrome_web_icon: 'https://misautonomos.es/logo-192.png',
    ttl: 86400,
  };

  const res = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    console.error('OneSignal error:', JSON.stringify(result));
  } else {
    console.log(`Push enviado a ${recipientId}: recipients=${result.recipients}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Payload de la automación entity
    const { event, data } = body;

    // Solo procesar eventos de creación de mensajes
    if (event?.type !== 'create') {
      return Response.json({ ok: true, skipped: 'not_create' });
    }

    const msg = data;
    if (!msg?.recipient_id || !msg?.sender_id || !msg?.content) {
      return Response.json({ ok: true, skipped: 'invalid_message' });
    }

    // Obtener datos del remitente para validar anonimización
    let senderName = msg.professional_name || msg.client_name || 'Alguien';
    let senderObj = null;

    try {
      const users = await base44.asServiceRole.entities.User.filter({ id: msg.sender_id });
      senderObj = users?.[0];
      
      // Si es admin, usar nombre anónimo según tipo de chat
      if (senderObj?.role === 'admin') {
        senderName = getSenderDisplayName(senderObj, msg.conversation_type || 'client');
      } else {
        // Si no es admin, intentar obtener nombre real
        const profiles = await base44.asServiceRole.entities.ProfessionalProfile.filter({ user_id: msg.sender_id });
        if (profiles[0]?.business_name) {
          senderName = profiles[0].business_name;
        } else if (senderObj?.full_name) {
          senderName = senderObj.full_name;
        }
      }
    } catch (e) {
      console.warn('Could not resolve sender:', e.message);
    }

    const preview = msg.content?.length > 80 ? msg.content.slice(0, 80) + '...' : (msg.content || '🎤 Mensaje de voz');
    // Link relativo para notificaciones in-app (navigate), absoluto solo para push/email
    const convPath = msg.conversation_id
      ? `/mensajes?conv=${msg.conversation_id}`
      : '/mensajes';
    const convUrl = `https://misautonomos.es${convPath}`;

    // Crear notificación en BD — usar ruta relativa para que navigate() funcione en el cliente
    base44.asServiceRole.entities.Notification.create({
      user_id: msg.recipient_id,
      type: 'new_message',
      title: `💬 Mensaje de ${senderName}`,
      message: preview,
      link: convPath,
      is_read: false,
      priority: 'medium',
      metadata: { conversationId: msg.conversation_id, senderId: msg.sender_id },
    }).catch(e => console.error('Notification create error:', e.message));

    // Enviar push
    await sendPush(
      msg.recipient_id,
      `💬 Mensaje de ${senderName}`,
      preview,
      convUrl
    );

    // Enviar email al destinatario
    try {
      const recipients = await base44.asServiceRole.entities.User.filter({ id: msg.recipient_id });
      const recipient = recipients?.[0];
      if (recipient?.email) {
        if (isBlockedRecipientOM(recipient.email)) {
          console.log('[email-blocklist v1] BLOCKED send to:', recipient.email, 'subject: new_message', 'template: onNewMessage');
        } else {
          const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
          if (RESEND_API_KEY) {
            const displaySenderName = msg.sender_name || senderName;
            const safeContent = (msg.content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 500);
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #E2E8F0;background:#0F172A;color:#FFFFFF;">
          <span style="font-weight:700;font-size:18px;">MisAutónomos</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0F172A;">💬 Nuevo mensaje de ${displaySenderName}</h2>
          <div style="background:#F8FAFC;border-radius:12px;padding:16px 20px;margin:16px 0;border-left:4px solid #3B82F6;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">${safeContent}</p>
          </div>
          <p style="font-size:14px;color:#64748B;margin:16px 0;">Responde directamente desde la plataforma:</p>
          <a href="${convUrl}" style="display:inline-block;background:#0F172A;color:#FFFFFF;font-weight:600;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:10px;">Ver mensaje y responder</a>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #E2E8F0;background:#F8FAFC;font-size:11px;color:#94A3B8;">
          Recibes este email porque alguien te ha escrito en MisAutónomos.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
            const resendResp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'MisAutónomos <hola@misautonomos.es>',
              reply_to: 'hola@misautonomos.es',
                to: [recipient.email],
                subject: `💬 ${displaySenderName} te ha escrito en MisAutónomos`,
                html
              })
            });
            if (!resendResp.ok) {
              console.error('Email send failed:', await resendResp.text());
            } else {
              console.log('✅ Email enviado a', recipient.email);
            }
          }
        } // end else (not blocked)
      }
    } catch (emailErr) {
      console.warn('Email notification failed (non-blocking):', emailErr.message);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('onNewMessage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});