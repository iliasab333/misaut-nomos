// Vercel Serverless Function: baja de la newsletter por token.
// Endpoint público — no requiere login. El token va en la URL del email.
// Sirve también para clientes de email que llaman al "List-Unsubscribe" por
// HTTP POST (RFC 8058 — Gmail/Yahoo lo usan automáticamente).
//
// Servido en /baja vía el rewrite de vercel.json (`/baja` → `/api/baja`).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const token = (req.query && req.query.token) || '';

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  }

  if (!token || token.length < 16) {
    return errorHtml(res, 400, 'Enlace no válido', 'El enlace de baja no es correcto o ha expirado. Si no esperabas recibir correos de MisAutónomos, escríbenos a hola@misautonomos.es.');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[baja] missing SUPABASE_SERVICE_ROLE_KEY');
    return errorHtml(res, 500, 'Error temporal', 'No se ha podido procesar tu baja ahora mismo. Vuelve a intentarlo más tarde o escríbenos a hola@misautonomos.es.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('users')
    .update({ email_unsubscribed: true })
    .eq('unsubscribe_token', token)
    .select('id, email, email_unsubscribed')
    .maybeSingle();

  if (error) {
    console.error('[baja] update failed', error);
    return errorHtml(res, 500, 'Error temporal', 'No se ha podido procesar tu baja. Inténtalo de nuevo más tarde.');
  }

  if (!data) {
    return errorHtml(res, 404, 'Enlace caducado', 'Este enlace ya se ha usado o no es válido. Si sigues recibiendo correos nuestros y no los quieres, escríbenos a hola@misautonomos.es.');
  }

  // POST One-Click (RFC 8058 — Gmail/Yahoo no esperan HTML).
  if (req.method === 'POST') {
    return res.status(200).json({ ok: true });
  }

  // ── GET: página de confirmación bonita ───────────────────────────────
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(SUCCESS_HTML);
}

// ─────────────────────────────────────────────────────────────────────────
// HTML de confirmación (proporcionado por el equipo)
// ─────────────────────────────────────────────────────────────────────────
const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Baja confirmada · MisAutónomos</title>
<style>
  body{margin:0;background:#eef1f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0c2a4d;}
  .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
  .card{background:#fff;max-width:460px;width:100%;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(10,37,64,.08);}
  .logo{font-size:20px;font-weight:800;letter-spacing:-.3px;margin-bottom:28px;}
  .logo span{color:#f5b700;}
  .check{width:56px;height:56px;border-radius:50%;background:#eaf7ee;color:#1a9e54;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 20px;}
  h1{font-size:22px;margin:0 0 12px;}
  p{font-size:15px;line-height:1.6;color:#3a4658;margin:0 0 10px;}
  .muted{font-size:13px;color:#9aa5b4;margin-top:22px;}
  .muted a{color:#0c2a4d;}
  .btn{display:inline-block;margin-top:22px;background:#f5b700;color:#0c2a4d;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:10px;font-size:15px;}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">Mis<span>Autónomos</span></div>
      <div class="check">✓</div>
      <h1>Te has dado de baja</h1>
      <p>Hecho. No volverás a recibir nuestros correos.</p>
      <p>Tu cuenta y tu perfil siguen activos con normalidad; esto solo afecta a los correos informativos.</p>
      <a class="btn" href="/">Volver a MisAutónomos</a>
      <p class="muted">¿Ha sido un error? Puedes volver a activarlos desde los ajustes de tu cuenta o escribiéndonos a <a href="mailto:hola@misautonomos.es">hola@misautonomos.es</a>.</p>
    </div>
  </div>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────
// Páginas de error (token inválido / caducado / sistema caído)
// ─────────────────────────────────────────────────────────────────────────
function errorHtml(res, status, title, message) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(title)} · MisAutónomos</title>
<style>
  body{margin:0;background:#eef1f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0c2a4d;}
  .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
  .card{background:#fff;max-width:460px;width:100%;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(10,37,64,.08);}
  .logo{font-size:20px;font-weight:800;letter-spacing:-.3px;margin-bottom:28px;}
  .logo span{color:#f5b700;}
  h1{font-size:22px;margin:0 0 12px;}
  p{font-size:15px;line-height:1.6;color:#3a4658;margin:0 0 10px;}
  .btn{display:inline-block;margin-top:22px;background:#0c2a4d;color:#fff;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:10px;font-size:15px;}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">Mis<span>Autónomos</span></div>
      <h1>${escapeHtml(title)}</h1>
      <p>${message}</p>
      <a class="btn" href="/">Volver a MisAutónomos</a>
    </div>
  </div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(status).send(html);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
