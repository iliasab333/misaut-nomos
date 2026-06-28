// scripts/outreach.mjs
// Outreach a leads en estado 'nuevo': WhatsApp si hay phone, si no email.
//
// Reglas:
//   - MAX_OUTREACH_POR_RUN = 30 (no quemar dominio ni número).
//   - Cada mensaje incluye remitente + opt-out link (token).
//   - Leads con opt_out = true se ignoran.
//   - Si solo hay phone (sin Twilio/WA Business configurado): se genera un
//     wa.me link, se marca 'pending_wa' y se deja el link en notes para
//     envío manual desde el dashboard admin.
//   - Si hay email: envío automático vía Resend (ya en producción) y
//     status → 'contactado'.
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=... RESEND_API_KEY=... node scripts/outreach.mjs
//   ...con flags opcionales:
//     --limit=30
//     --dry-run        (no envía ni escribe, solo loguea)
//     --only-email     (ignora leads con phone)
//     --only-wa        (solo procesa los con phone)

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

for (const envFile of ['.env.local', '.env']) {
  const p = path.join(ROOT, envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const MAX_OUTREACH_POR_RUN = parseInt(process.env.MAX_OUTREACH_POR_RUN || '30', 10);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notificaciones@misautonomos.es';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'MisAutónomos';
const SITE = 'https://misautonomos.es';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[outreach] Falta SUPABASE_SERVICE_ROLE_KEY — abort');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const DRY_RUN = !!args['dry-run'];
const LIMIT = parseInt(args.limit || MAX_OUTREACH_POR_RUN, 10);
const ONLY_EMAIL = !!args['only-email'];
const ONLY_WA = !!args['only-wa'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CATEGORY_LABELS = {
  'fontanero': 'fontanero/a',
  'electricista': 'electricista',
  'cerrajero': 'cerrajero/a',
  'albanil-reformas': 'albañil / reformas',
  'pintor': 'pintor/a',
  'carpintero': 'carpintero/a',
  'autonomo-limpieza': 'profesional de limpieza',
  'climatizacion-calefaccion': 'profesional de climatización',
};

function categoryLabel(slug) {
  return CATEGORY_LABELS[slug] || slug;
}

// ──────────────────────────────────────────────────────────────────────────
// Plantillas — texto claro, breve, con identificación y opt-out
// ──────────────────────────────────────────────────────────────────────────

function altaUrl(leadId, source = 'outreach') {
  return `${SITE}/para-autonomos?ref=${source}&lead=${leadId}`;
}

function optOutUrl(token) {
  return `${SITE}/api/lead-opt-out?token=${encodeURIComponent(token)}`;
}

function buildWhatsAppText(lead) {
  const cat = categoryLabel(lead.category_slug);
  const ciudad = lead.city || 'tu zona';
  const url = altaUrl(lead.id, 'whatsapp');
  const optOut = optOutUrl(lead.opt_out_token);
  return [
    `Hola ${lead.business_name}, te escribo de MisAutónomos.`,
    ``,
    `Te he encontrado buscando ${cat} en ${ciudad} y queríamos invitarte a crear tu perfil gratis en nuestra plataforma. Aparecerás en búsquedas de clientes de tu zona, sin comisiones por trabajo y sin permanencia.`,
    ``,
    `Si te interesa: ${url}`,
    ``,
    `Si no quieres que te volvamos a contactar, responde STOP o entra en ${optOut} — somos respetuosos con tu tiempo.`,
    ``,
    `— Equipo MisAutónomos · ${SITE}`,
  ].join('\n');
}

function buildEmailHtml(lead) {
  const cat = categoryLabel(lead.category_slug);
  const ciudad = lead.city || 'tu zona';
  const url = altaUrl(lead.id, 'email');
  const optOut = optOutUrl(lead.opt_out_token);
  const businessNameEsc = escapeHtml(lead.business_name);
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#fff;border:1px solid #E5E7EB;border-radius:14px;">
        <tr><td style="padding:28px 24px;">
          <p style="margin:0 0 14px;font-size:15px;color:#374151;">Hola <strong>${businessNameEsc}</strong>,</p>
          <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.55;">Te escribo desde <strong>MisAutónomos</strong>. Te encontramos buscando ${escapeHtml(cat)} en <strong>${escapeHtml(ciudad)}</strong> y queríamos invitarte a crear tu perfil <strong>gratis</strong> en la plataforma.</p>
          <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;color:#374151;line-height:1.55;">
            <li>Aparecerás en las búsquedas de tu zona.</li>
            <li>Contacto directo con los clientes — sin intermediarios.</li>
            <li>Sin comisiones por trabajo, sin permanencia, sin tarjeta.</li>
          </ul>
          <p style="margin:0 0 22px;text-align:center;">
            <a href="${url}" style="display:inline-block;background:#00255C;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px;">Crear mi perfil gratis</a>
          </p>
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">Si prefieres no recibir más mensajes nuestros, <a href="${optOut}" style="color:#9CA3AF;">date de baja en un clic</a>. No usamos tu número, solo este email.</p>
        </td></tr>
        <tr><td style="padding:0 24px 22px;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">MisAutónomos · ${SITE}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildEmailText(lead) {
  const cat = categoryLabel(lead.category_slug);
  const ciudad = lead.city || 'tu zona';
  const url = altaUrl(lead.id, 'email');
  const optOut = optOutUrl(lead.opt_out_token);
  return [
    `Hola ${lead.business_name},`,
    ``,
    `Te escribo desde MisAutónomos. Te encontramos buscando ${cat} en ${ciudad} y queríamos invitarte a crear tu perfil gratis.`,
    ``,
    `Apareces en búsquedas de tu zona, contacto directo con clientes, sin comisiones por trabajo y sin permanencia.`,
    ``,
    `Crear perfil: ${url}`,
    ``,
    `Si prefieres no recibir más mensajes, date de baja: ${optOut}`,
    ``,
    `— Equipo MisAutónomos · ${SITE}`,
  ].join('\n');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ──────────────────────────────────────────────────────────────────────────
// Resend
// ──────────────────────────────────────────────────────────────────────────

async function sendEmailViaResend({ to, subject, html, text }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`Resend ${r.status}: ${body.slice(0, 200)}`);
  return JSON.parse(body);
}

// ──────────────────────────────────────────────────────────────────────────
// WhatsApp: build wa.me link + texto pre-rellenado. Por defecto, NO se envía
// automáticamente (requiere Twilio/Meta) — se marca el lead 'pending_wa'
// y se deja el link en notes para que el operador haga clic desde el admin.
// ──────────────────────────────────────────────────────────────────────────

function normalizePhoneForWA(phone) {
  if (!phone) return null;
  let n = String(phone).replace(/\D/g, '');
  // España: si tiene 9 dígitos sin 34, prefija 34.
  if (n.length === 9 && !n.startsWith('34')) n = '34' + n;
  if (n.length < 11 || n.length > 15) return null;
  return n;
}

function buildWaMeLink(phone, text) {
  const n = normalizePhoneForWA(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[outreach] límite por run: ${LIMIT} · DRY_RUN=${DRY_RUN}`);

  let query = supabase
    .from('outbound_leads')
    .select('id, business_name, category_slug, city, phone, email, website, opt_out_token, status, opt_out')
    .eq('status', 'nuevo')
    .eq('opt_out', false)
    .order('discovered_at', { ascending: true })
    .limit(LIMIT);

  const { data: leads, error } = await query;
  if (error) throw error;

  if (!leads.length) {
    console.log('[outreach] no hay leads en estado "nuevo" para procesar.');
    return;
  }

  console.log(`[outreach] ${leads.length} leads a procesar`);

  const stats = { wa_pending: 0, email_sent: 0, discarded: 0, errors: 0 };

  for (const lead of leads) {
    try {
      // Prioridad: WhatsApp si hay teléfono (a menos que --only-email).
      if (lead.phone && !ONLY_EMAIL) {
        const text = buildWhatsAppText(lead);
        const waLink = buildWaMeLink(lead.phone, text);
        if (!waLink) {
          // teléfono no normalizable → caer a email si existe
          if (lead.email) {
            await processEmail(lead, stats);
          } else {
            await markDiscarded(lead, 'phone invalid, no email');
            stats.discarded++;
          }
          continue;
        }

        if (DRY_RUN) {
          console.log(`  [WA] ${lead.business_name} → ${waLink.slice(0, 60)}…`);
          stats.wa_pending++;
          continue;
        }

        const { error: e1 } = await supabase
          .from('outbound_leads')
          .update({
            status: 'pending_wa',
            contact_channel: 'whatsapp_manual',
            notes: `wa_link: ${waLink}`,
            last_outreach_attempts: 1,
          })
          .eq('id', lead.id);
        if (e1) throw e1;
        stats.wa_pending++;
        console.log(`  [WA pending] ${lead.business_name} (${lead.city})`);
        continue;
      }

      // Sin teléfono, intentar email
      if (lead.email && !ONLY_WA) {
        await processEmail(lead, stats);
        continue;
      }

      // Sin canal viable
      await markDiscarded(lead, 'no phone, no email');
      stats.discarded++;
    } catch (e) {
      console.warn(`  ! lead ${lead.id} (${lead.business_name}): ${e.message}`);
      stats.errors++;
    }
  }

  console.log('');
  console.log('═══════════════════ Outreach summary ═══════════════════');
  console.log(`  WhatsApp pending (envío manual): ${stats.wa_pending}`);
  console.log(`  Email enviado:                   ${stats.email_sent}`);
  console.log(`  Descartado (sin canal):          ${stats.discarded}`);
  console.log(`  Errores:                         ${stats.errors}`);
  console.log('════════════════════════════════════════════════════════════');
}

async function processEmail(lead, stats) {
  const html = buildEmailHtml(lead);
  const text = buildEmailText(lead);
  const subject = `Hola ${lead.business_name}, invitación a MisAutónomos`;

  if (DRY_RUN) {
    console.log(`  [EMAIL] ${lead.email} (${lead.business_name})`);
    stats.email_sent++;
    return;
  }

  await sendEmailViaResend({ to: lead.email, subject, html, text });
  const { error } = await supabase
    .from('outbound_leads')
    .update({
      status: 'contactado',
      contact_channel: 'email',
      contacted_at: new Date().toISOString(),
      last_outreach_attempts: 1,
    })
    .eq('id', lead.id);
  if (error) throw error;
  stats.email_sent++;
  console.log(`  [EMAIL sent] ${lead.email} (${lead.business_name})`);
}

async function markDiscarded(lead, reason) {
  if (DRY_RUN) return;
  await supabase
    .from('outbound_leads')
    .update({ status: 'descartado', notes: `discarded: ${reason}` })
    .eq('id', lead.id);
}

main().catch((e) => {
  console.error('[outreach] FAIL', e);
  process.exit(1);
});
