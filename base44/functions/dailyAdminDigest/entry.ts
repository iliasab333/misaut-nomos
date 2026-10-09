import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Repositorio público: la dirección sale a una variable de entorno.
const ADMIN_EMAIL = Deno.env.get('ADMIN_NOTIFY_EMAIL') || '';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Métricas internas (BD)
    const [newUsers, newSubscribers, newMessages, newReviews, newSubscriptions] = await Promise.all([
      base44.asServiceRole.entities.User.list().catch(() => []),
      base44.asServiceRole.entities.NewsletterSubscriber.list().catch(() => []),
      base44.asServiceRole.entities.Message.list().catch(() => []),
      base44.asServiceRole.entities.Review.list().catch(() => []),
      base44.asServiceRole.entities.Subscription.list().catch(() => []),
    ]).then(([users, subs, msgs, revs, subscriptions]) => {
      const inRange = (item) => {
        const d = new Date(item.created_date);
        return d >= yesterday && d <= yesterdayEnd;
      };
      return [
        users.filter(inRange),
        subs.filter(inRange),
        msgs.filter(inRange),
        revs.filter(inRange),
        subscriptions.filter(inRange),
      ];
    });

    const newClients = newUsers.filter(u => u.user_type === 'client').length;
    const newPros = newUsers.filter(u => u.user_type === 'professionnel').length;

    // Search Console
    let searchConsoleData = null;
    try {
      const scResp = await fetch(new URL('/searchConsoleAnalysis', req.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('authorization') || ''
        },
        body: JSON.stringify({ startDate: dateStr, endDate: dateStr })
      });
      if (scResp.ok) searchConsoleData = await scResp.json();
    } catch (e) {
      console.warn('Search Console no disponible:', e.message);
    }

    const fmtDate = yesterday.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const scSection = searchConsoleData ? `
      <h3 style="margin:24px 0 8px;font-size:15px;font-weight:700;color:#0F172A;">🔍 Search Console</h3>
      <table width="100%" cellpadding="6" style="font-size:13px;border-collapse:collapse;color:#334155;">
        <tr><td>Clicks</td><td align="right"><strong>${searchConsoleData.totalClicks || 0}</strong></td></tr>
        <tr><td>Impresiones</td><td align="right"><strong>${searchConsoleData.totalImpressions || 0}</strong></td></tr>
        <tr><td>CTR</td><td align="right"><strong>${((searchConsoleData.avgCtr || 0) * 100).toFixed(2)}%</strong></td></tr>
        <tr><td>Posición media</td><td align="right"><strong>${(searchConsoleData.avgPosition || 0).toFixed(1)}</strong></td></tr>
      </table>
      ${searchConsoleData.topQueries?.length ? `
        <p style="margin:12px 0 4px;font-size:13px;color:#475569;font-weight:600;">Top búsquedas:</p>
        <ul style="margin:0;padding-left:20px;font-size:12px;color:#334155;">
          ${searchConsoleData.topQueries.slice(0, 5).map(q => `<li>${q.query} — ${q.clicks} clicks (pos. ${Number(q.position || 0).toFixed(1)})</li>`).join('')}
        </ul>
      ` : ''}
    ` : '<p style="color:#94A3B8;font-size:13px;margin-top:16px;">Search Console no disponible hoy.</p>';

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px 16px;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
    <tr><td style="padding:20px 24px;background:#0F172A;color:#FFFFFF;">
      <strong style="font-size:16px;">📊 Resumen diario MisAutónomos</strong><br>
      <span style="font-size:13px;color:#CBD5E1;">${fmtDate}</span>
    </td></tr>
    <tr><td style="padding:24px;">
      <h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0F172A;">📈 Crecimiento</h3>
      <table width="100%" cellpadding="6" style="font-size:13px;border-collapse:collapse;color:#334155;">
        <tr><td>Nuevos clientes</td><td align="right"><strong>${newClients}</strong></td></tr>
        <tr><td>Nuevos profesionales</td><td align="right"><strong>${newPros}</strong></td></tr>
        <tr><td>Nuevos suscriptores newsletter</td><td align="right"><strong>${newSubscribers.length}</strong></td></tr>
        <tr><td>Mensajes</td><td align="right"><strong>${newMessages.length}</strong></td></tr>
        <tr><td>Valoraciones</td><td align="right"><strong>${newReviews.length}</strong></td></tr>
        <tr style="background:#FEF3C7;"><td><strong>💰 Nuevas suscripciones de pago</strong></td><td align="right"><strong>${newSubscriptions.length}</strong></td></tr>
      </table>
      ${scSection}
    </td></tr>
    <tr><td style="padding:12px 24px;border-top:1px solid #E2E8F0;background:#F8FAFC;font-size:11px;color:#94A3B8;">
      Generado automáticamente · misautonomos.es
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
        from: 'MisAutónomos Admin <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `[MisAutónomos] 📊 Resumen ${fmtDate}`,
        html
      })
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      return Response.json({ error: 'Email failed', detail: errText }, { status: 500 });
    }

    return Response.json({
      success: true,
      summary: {
        newClients,
        newPros,
        newSubscribers: newSubscribers.length,
        newMessages: newMessages.length,
        newReviews: newReviews.length,
        newSubscriptions: newSubscriptions.length
      }
    });
  } catch (err) {
    console.error('dailyAdminDigest error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});