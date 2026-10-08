import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// === FROM CENTRALIZADO — NO modificar sin actualizar también DNS Resend ===
const CANONICAL_EMAIL_FROM = "MisAutónomos <hola@misautonomos.es>";
const CANONICAL_REPLY_TO = "hola@misautonomos.es";
// === FIN FROM CENTRALIZADO ===

// === EMAIL BLOCKLIST TEMPORAL — vence 2026-05-01 23:59 UTC ===
// La dirección que había aquí escrita a mano era de un autónomo REAL y este
// repositorio es público: se saca a `EMAIL_BLOCKLIST` (variable de entorno,
// direcciones separadas por comas). Vacía no bloquea a nadie, que es lo que
// hacía esta función antes de que existiera la lista.
const EMAIL_BLOCKLIST = (Deno.env.get("EMAIL_BLOCKLIST") || "")
  .split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
const BLOCKLIST_EXPIRES_AT = new Date("2026-05-01T23:59:00Z");
function isBlockedRecipient(toEmail) {
  if (new Date() > BLOCKLIST_EXPIRES_AT) return false;
  if (!toEmail) return false;
  const normalized = String(toEmail).trim().toLowerCase();
  return EMAIL_BLOCKLIST.some(blocked => blocked.toLowerCase() === normalized);
}
// === FIN BLOCKLIST ===

// FROM/REPLY_TO: usar siempre la constante canónica, ignorar env vars de dominio incorrecto
const EMAIL_FROM = CANONICAL_EMAIL_FROM;
const EMAIL_REPLY_TO = CANONICAL_REPLY_TO;
const APP_URL = Deno.env.get('VITE_APP_URL') || 'https://misautonomos.es';

// Templates HTML simples (inline para evitar file I/O en Deno serverless)
const templates = {
  welcome: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a MisAutónomos</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; color: white; margin: 0; }
    .body { padding: 40px 30px; }
    .body h2 { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
    .body p { margin: 15px 0; color: #6b7280; }
    .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { padding: 20px 30px; background: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">MisAutónomos</h1>
    </div>
    <div class="body">
      <h2>¡Bienvenido, {{name}}!</h2>
      <p>Gracias por registrarte en MisAutónomos. Nos alegra mucho tenerte con nosotros.</p>
      <p>{{message}}</p>
      <a href="{{app_url}}" class="cta-button">Ir a MisAutónomos</a>
    </div>
    <div class="footer">
      <p>© 2026 MisAutónomos. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`,

  gift_received: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Has recibido Plan Ads+!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; color: white; margin: 0; }
    .body { padding: 40px 30px; }
    .body h2 { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
    .body p { margin: 15px 0; color: #6b7280; }
    .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { padding: 20px 30px; background: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">🎉 ¡Plan Ads+ Gratis!</h1>
    </div>
    <div class="body">
      <div class="badge">Plan Premium - {{days}} días</div>
      <h2>¡Felicidades, {{name}}!</h2>
      <p>Has recibido <strong>{{days}} días gratis</strong> de nuestro Plan Ads+ Premium.</p>
      <p>Tu acceso expira el <strong>{{expiry_date}}</strong>.</p>
      <a href="{{app_url}}/dashboard" class="cta-button">Ver mi Plan Ads+</a>
    </div>
    <div class="footer">
      <p>© 2026 MisAutónomos. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`,

  review_request: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nos gustaría tu opinión</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; color: white; margin: 0; }
    .body { padding: 40px 30px; }
    .body h2 { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
    .body p { margin: 15px 0; color: #6b7280; }
    .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { padding: 20px 30px; background: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">⭐ Tu opinión importa</h1>
    </div>
    <div class="body">
      <h2>Hola {{client_name}},</h2>
      <p>Hemos visto que recientemente contactaste con {{professional_name}}.</p>
      <p>Nos gustaría mucho saber qué tal fue tu experiencia. ¿Te toma solo 2 minutos! ⏱️</p>
      <a href="{{review_link}}" class="cta-button">Dejar opinión</a>
    </div>
    <div class="footer">
      <p>© 2026 MisAutónomos. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`
};

function interpolateTemplate(html, vars = {}) {
  let result = html;
  Object.entries(vars).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  });
  return result;
}

function addUnsubscribeFooter(html, category, unsubscribeToken) {
  if (category !== 'marketing') return html;

  const unsubscribeUrl = `${APP_URL}/NewsletterUnsubscribe?token=${unsubscribeToken}`;
  const footer = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
      <p>Este es un email de marketing. Si no deseas recibir más emails de este tipo, <a href="${unsubscribeUrl}" style="color: #3b82f6; text-decoration: underline;">darte de baja aquí</a>.</p>
    </div>
  `;

  if (html.includes('</body>')) {
    return html.replace('</body>', footer + '\n</body>');
  }
  return html + footer;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      to,
      subject,
      template = 'welcome',
      vars = {},
      category = 'transactional',
      metadata = {}
    } = await req.json();

    const toArray = Array.isArray(to) ? to : [to];
    const results = [];

    for (const toEmail of toArray) {
      try {
        // Comprobar blocklist temporal
        if (isBlockedRecipient(toEmail)) {
          console.log('[email-blocklist v1] BLOCKED send to:', toEmail, 'subject:', subject, 'template:', template || 'unknown');
          await base44.asServiceRole.entities.EmailLog.create({
            to_email: toEmail,
            user_id: user.id,
            subject,
            template: template || 'blocked-by-blocklist',
            category,
            status: 'skipped',
            error_message: 'Bloqueado por blocklist temporal',
            sent_at: new Date().toISOString()
          }).catch(e => console.error('[email-blocklist v1] No se pudo registrar en EmailLog:', e));
          results.push({ email: toEmail, status: 'skipped', reason: 'blocklist' });
          continue;
        }

        // Comprobar unsubscribed si es marketing
        if (category === 'marketing') {
          const subs = await base44.asServiceRole.entities.NewsletterSubscriber.filter({
            email: toEmail,
            status: 'unsubscribed'
          });

          if (subs && subs.length > 0) {
            await base44.asServiceRole.entities.EmailLog.create({
              to_email: toEmail,
              user_id: user.id,
              subject,
              template,
              category,
              status: 'skipped',
              metadata: { reason: 'unsubscribed', ...metadata }
            });
            results.push({ email: toEmail, status: 'skipped' });
            continue;
          }
        }

        // Renderizar template
        // Si el template es 'raw_html', se usa directamente el campo html de vars
        let html;
        if (template === 'raw_html' && vars.__html) {
          html = vars.__html;
        } else {
          html = templates[template] || templates.welcome;
          html = interpolateTemplate(html, {
            app_url: APP_URL,
            ...vars
          });
        }

        // Token de unsubscribe
        let unsubscribeToken = null;
        if (category === 'marketing') {
          unsubscribeToken = btoa(`${toEmail}:${Date.now()}`);
          html = addUnsubscribeFooter(html, category, unsubscribeToken);
        }

        // Enviar con Resend API directo
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: toEmail,
            reply_to: EMAIL_REPLY_TO,
            subject,
            html
          })
        });

        if (!resendResponse.ok) {
          const error = await resendResponse.json();
          throw new Error(error.message || 'Failed to send email');
        }

        const response = await resendResponse.json();

        // Log
        const emailLog = await base44.asServiceRole.entities.EmailLog.create({
          to_email: toEmail,
          user_id: user.id,
          subject,
          template,
          category,
          status: 'sent',
          resend_message_id: response.id,
          sent_at: new Date().toISOString(),
          metadata: { unsubscribeToken, ...metadata }
        });

        results.push({
          email: toEmail,
          status: 'sent',
          messageId: response.id,
          logId: emailLog.id
        });
      } catch (error) {
        console.error(`Failed to send email to ${toEmail}:`, error);

        await base44.asServiceRole.entities.EmailLog.create({
          to_email: toEmail,
          user_id: user.id,
          subject,
          template,
          category,
          status: 'failed',
          error_message: error.message,
          metadata
        });

        results.push({
          email: toEmail,
          status: 'failed',
          error: error.message
        });
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error('sendEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});