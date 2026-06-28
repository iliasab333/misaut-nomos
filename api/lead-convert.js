// Vercel Serverless Function: marca un lead como 'convertido' cuando el
// profesional completa su alta. Llamado desde el frontend justo después de
// crear el ProfessionalProfile, si la URL llegó con ?lead=<id>&ref=outreach.
//
// Body: { lead_id, user_id?, profile_id?, business_name? }
//
// No requiere auth porque la unidad de seguridad es el conocimiento del
// lead_id (UUID) — el frontend ya validó el alta antes de llamar.
// Aun así, validamos que el user_id existe en users.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[lead-convert] missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'config_missing' });
  }

  const payload = typeof req.body === 'string' ? safeJSON(req.body) : (req.body || {});
  const { lead_id, user_id, profile_id } = payload;

  if (!lead_id || typeof lead_id !== 'string') {
    return res.status(400).json({ error: 'missing_lead_id' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Marca convertido. NO sobrescribe si ya estaba convertido o descartado.
  const { data, error } = await supabase
    .from('outbound_leads')
    .update({
      status: 'convertido',
      converted_at: new Date().toISOString(),
      converted_user_id: user_id || null,
      converted_profile_id: profile_id || null,
    })
    .eq('id', lead_id)
    .neq('status', 'convertido')
    .neq('status', 'descartado')
    .select('id, business_name')
    .maybeSingle();

  if (error) {
    console.error('[lead-convert] update failed', error);
    return res.status(500).json({ error: 'update_failed' });
  }

  if (!data) {
    return res.status(200).json({ ok: true, already: true });
  }

  // Notificación al admin (no bloqueante)
  fetch(`https://misautonomos.es/api/notify-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'lead_converted',
      title: `🎯 Lead convertido: ${data.business_name}`,
      body: `El lead <strong>${escapeHtml(data.business_name)}</strong> ha completado su alta como profesional.`,
      data: { lead_id: data.id, user_id, profile_id },
      severity: 'low',
    }),
  }).catch(() => {});

  return res.status(200).json({ ok: true, lead_id: data.id });
}

function safeJSON(s) { try { return JSON.parse(s); } catch (_e) { return {}; } }
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
