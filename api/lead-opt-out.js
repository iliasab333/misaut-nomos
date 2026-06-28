// Vercel Serverless Function: baja de un lead outreach por token.
// Endpoint público — SOLO requiere el token, NO requiere login.
//
// Usado en los enlaces "darme de baja" de los correos/WhatsApp outreach.
// Marca outbound_leads.opt_out = true para que no vuelva a recibir mensajes.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const token = (req.query && req.query.token) || '';
  if (!token || token.length < 16) {
    return sendHtml(res, 400, 'Token inválido', 'El enlace de baja no es válido o ha expirado.');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[lead-opt-out] missing SUPABASE_SERVICE_ROLE_KEY');
    return sendHtml(res, 500, 'Error', 'No se ha podido procesar tu baja. Por favor escríbenos a soporte@misautonomos.es.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('outbound_leads')
    .update({ opt_out: true, opt_out_at: new Date().toISOString(), status: 'opt_out' })
    .eq('opt_out_token', token)
    .select('id, business_name')
    .maybeSingle();

  if (error) {
    console.error('[lead-opt-out] update failed', error);
    return sendHtml(res, 500, 'Error', 'No se ha podido procesar tu baja. Inténtalo de nuevo más tarde.');
  }

  if (!data) {
    return sendHtml(res, 404, 'Baja ya procesada', 'Este enlace ya se ha usado o ha expirado. No volverás a recibir mensajes nuestros.');
  }

  return sendHtml(res, 200, 'Baja confirmada', `Hemos eliminado a ${escapeHtml(data.business_name)} de nuestros contactos outreach. No volverás a recibir mensajes de invitación.`);
}

function sendHtml(res, status, title, body) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)} · MisAutónomos</title><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}.card{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:32px;max-width:480px;box-shadow:0 1px 2px rgba(0,0,0,0.04);}h1{color:#00255C;font-size:20px;margin:0 0 10px;letter-spacing:-0.01em;}p{color:#374151;font-size:14px;line-height:1.55;margin:0 0 16px;}a{color:#00255C;font-weight:500;}</style></head><body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p><a href="https://misautonomos.es">Volver a MisAutónomos</a></p></div></body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(status).send(html);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
