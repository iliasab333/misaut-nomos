// Notifica al admin de un evento. Fire-and-forget.
//
// Antes llamaba a una Supabase Edge Function 'notifyAdmin' que NUNCA se llegó
// a desplegar (404 en producción), así que todas las notificaciones —
// new_client, new_professional, newsletter_signup — se tragaban en silencio.
//
// Ahora pega contra /api/notify-admin (Vercel Serverless Function) que envía
// vía Resend. Si RESEND_API_KEY no está en Vercel env, la función responde
// {skipped:true} y nada explota — sigue siendo no-bloqueante.

// AQUÍ ESTABA ESCRITA LA DIRECCIÓN DEL DUEÑO, en código de navegador.
// Comprobado: viajaba en `assets/notifyAdmin-*.js`, servido a cualquiera.
//
// Servía para no avisarse a uno mismo cuando el admin prueba algo. Esa
// comprobación se hace ahora en el servidor (`api/notify-admin.js`), que es el
// único sitio donde la dirección tiene que estar: `userEmail` viaja en el
// cuerpo de la petición y allí se compara con `ADMIN_NOTIFY_EMAIL`.

export function notifyAdminEvent({ event, title, body = '', data = null, severity = 'low', userEmail = null }) {

  try {
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `userEmail` va al servidor para que ÉL decida si es el admin probando.
      body: JSON.stringify({ event, title, body, data, severity, userEmail }),
      // keepalive: el evento puede dispararse justo antes de un navigate,
      // y queremos que la petición se complete aunque la página cambie.
      keepalive: true,
    }).catch((err) => console.warn('notifyAdmin failed:', err));
  } catch (err) {
    console.warn('notifyAdmin failed (sync):', err);
  }
}
