// Notifica al admin de un evento. Fire-and-forget.
//
// Antes llamaba a una Supabase Edge Function 'notifyAdmin' que NUNCA se llegó
// a desplegar (404 en producción), así que todas las notificaciones —
// new_client, new_professional, newsletter_signup — se tragaban en silencio.
//
// Ahora pega contra /api/notify-admin (Vercel Serverless Function) que envía
// vía Resend. Si RESEND_API_KEY no está en Vercel env, la función responde
// {skipped:true} y nada explota — sigue siendo no-bloqueante.

const ADMIN_EMAIL = 'bigseo.online.com@gmail.com';

export function notifyAdminEvent({ event, title, body = '', data = null, severity = 'low', userEmail = null }) {
  // No notificar acciones del propio admin (evita spam de testing).
  if (userEmail === ADMIN_EMAIL) return;

  try {
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, title, body, data, severity }),
      // keepalive: el evento puede dispararse justo antes de un navigate,
      // y queremos que la petición se complete aunque la página cambie.
      keepalive: true,
    }).catch((err) => console.warn('notifyAdmin failed:', err));
  } catch (err) {
    console.warn('notifyAdmin failed (sync):', err);
  }
}
