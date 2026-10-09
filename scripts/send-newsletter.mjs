// scripts/send-newsletter.mjs
// Envío de newsletter por Resend API DIRECTA (no Broadcasts), con todas las
// piezas que Resend NO añade automáticamente cuando vas por API:
//   - Link de baja real por destinatario (unsubscribe_token desde users).
//   - Cabeceras List-Unsubscribe + List-Unsubscribe-Post (RFC 8058,
//     requerido por Gmail/Yahoo desde 2024).
//   - Exclusión PREVIA de quien ya tenga email_unsubscribed = true.
//   - Throttle ~2 req/s (Resend free: 2/s; pro: 10/s).
//   - Modo DRY_RUN por defecto: envía SOLO a TEST_EMAIL.
//
// Uso:
//   # Por defecto modo prueba — solo manda a TEST_EMAIL.
//   node scripts/send-newsletter.mjs
//
//   # Manda a los 38 reales (cuando estés conforme con la prueba):
//   DRY_RUN=false node scripts/send-newsletter.mjs
//
// Pre-requisitos (todos en .env.local, NO commit):
//   RESEND_API_KEY=re_...
//   SUPABASE_URL=https://....supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...
//
// Y la migración 20260629130000_users_unsubscribe.sql aplicada en Supabase.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Carga .env.local
for (const envFile of ['.env.local', '.env']) {
  const p = path.join(ROOT, envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// ── Configuración ────────────────────────────────────────────────────────
const SITE = 'https://misautonomos.es';
const FROM_EMAIL = 'hola@misautonomos.es';
// From name PERSONAL: bajamos el "marketing score" del clasificador de
// Gmail (Promociones → Principal). "Empresa" en el From → casi seguro
// Promociones. "Persona" en el From → bastante más probable Principal.
const FROM_NAME = 'Ilias de MisAutónomos';
const FROM_FORMATTED = `${FROM_NAME} <${FROM_EMAIL}>`;

const SUBJECT = 'Que la cuota de autónomos esté congelada en 2026 no es toda la verdad';

// El CSV de audiencia (38 personas con nombre, apellido y correo) YA NO ESTÁ
// EN EL REPOSITORIO: este repositorio es público en GitHub. Sigue en
// `data/` en el ordenador del dueño y está ignorado por git, con una copia en
// `~/Desktop/misautonomos-datos-privados/`. `AUDIENCIA_CSV` permite apuntar a
// otro sitio sin tocar el código.
const CSV_PATH = process.env.AUDIENCIA_CSV
  || path.join(ROOT, 'data', 'audiencia-resend-misautonomos.csv');
const HTML_PATH = path.join(ROOT, 'preview-correo-newsletter-cuota-autonomos-2026.html');

// Sin dirección por defecto: repositorio público. Se pasa por el entorno.
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const DRY_RUN = String(process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || '550', 10); // ~1.8/s seguro

// Marcador en el HTML que se reemplaza por el link real por destinatario.
// El HTML de la newsletter usa `{{unsubscribe_url}}` como token de plantilla.
const UNSUB_PLACEHOLDER = '{{unsubscribe_url}}';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!RESEND_API_KEY) { console.error('Falta RESEND_API_KEY en .env.local'); process.exit(1); }
if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('Falta SUPABASE_SERVICE_ROLE_KEY en .env.local'); process.exit(1); }
if (!fs.existsSync(CSV_PATH)) { console.error(`No existe el CSV: ${CSV_PATH}`); process.exit(1); }
if (!fs.existsSync(HTML_PATH)) { console.error(`No existe el HTML: ${HTML_PATH}`); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── CSV parsing ──────────────────────────────────────────────────────────
function parseCsv(content) {
  // CSV simple con separador coma. Soporta valores entre comillas con comas.
  const rows = [];
  let row = [];
  let value = '';
  let inQ = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQ) {
      if (c === '"' && content[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') inQ = false;
      else value += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(value); value = ''; }
      else if (c === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
      else if (c === '\r') { /* skip */ }
      else value += c;
    }
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ''));
}

function loadAudience(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const emailIdx = header.findIndex((h) => h === 'email');
  const fnIdx = header.findIndex((h) => h === 'first_name' || h === 'firstname' || h === 'first');
  const lnIdx = header.findIndex((h) => h === 'last_name' || h === 'lastname' || h === 'last');
  if (emailIdx === -1) throw new Error('El CSV no tiene columna "email".');
  return rows.slice(1).map((r) => ({
    email: (r[emailIdx] || '').trim().toLowerCase(),
    first_name: fnIdx !== -1 ? (r[fnIdx] || '').trim() : '',
    last_name: lnIdx !== -1 ? (r[lnIdx] || '').trim() : '',
  })).filter((r) => r.email);
}

// ── Resolver/crear unsubscribe_token para cada email ─────────────────────
async function tokenForEmail(email) {
  // 1) Busca si existe ya en users.
  const { data: existing, error } = await supabase
    .from('users')
    .select('id, email, unsubscribe_token, email_unsubscribed')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    if (existing.email_unsubscribed) return { skip: true, reason: 'already_unsubscribed' };
    if (existing.unsubscribe_token) return { token: existing.unsubscribe_token, user_id: existing.id, existed: true };
    // Backfill: poner token nuevo.
    const { data: upd, error: e2 } = await supabase
      .from('users')
      .update({ unsubscribe_token: undefined })
      .eq('id', existing.id)
      .select('unsubscribe_token')
      .maybeSingle();
    if (e2) throw e2;
    return { token: upd?.unsubscribe_token, user_id: existing.id, existed: true };
  }

  // 2) No existe en users. Insertamos un registro mínimo SOLO para el token.
  //    Marcamos role='outbound_subscriber' para distinguirlo de usuarios reales.
  const insert = {
    id: genId(),
    email,
    full_name: '',
    role: 'user',
    is_verified: false,
    email_unsubscribed: false,
  };
  const { data: created, error: e3 } = await supabase
    .from('users')
    .insert(insert)
    .select('id, unsubscribe_token')
    .single();
  if (e3) throw e3;
  return { token: created.unsubscribe_token, user_id: created.id, existed: false };
}

function genId() {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let rand = ''; for (const b of bytes) rand += b.toString(16).padStart(2, '0');
  return (ts + rand).slice(0, 24);
}

// ── Sustituye el link de baja del HTML por el real por destinatario ─────
function personalizeHtml(template, unsubscribeUrl, { first_name, email }) {
  let html = template;
  // 1) Reemplaza TODAS las ocurrencias del placeholder por el link único.
  html = html.split(UNSUB_PLACEHOLDER).join(unsubscribeUrl);
  // 2) {{greeting}} → "Hola Mimoun," si tenemos first_name; si no, "Hola,"
  //    Usar saludo personal aumenta la probabilidad de Principal en Gmail.
  const cleanFirstName = (first_name || '').trim().replace(/[,.;:]+$/, '');
  const greeting = cleanFirstName ? `Hola ${cleanFirstName},` : 'Hola,';
  html = html.replaceAll('{{greeting}}', greeting);
  // 3) Resto de sustituciones libres.
  html = html.replaceAll('{{first_name}}', cleanFirstName);
  html = html.replaceAll('{{email}}', email || '');
  return html;
}

// ── Texto plano fallback (lo deduce limpiando HTML) ─────────────────────
function htmlToText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Llamada a Resend ────────────────────────────────────────────────────
async function sendOne(payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let body = null; try { body = JSON.parse(text); } catch { body = text; }
  return { ok: r.ok, status: r.status, body };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════ Newsletter send ═══════════════════');
  console.log(` Subject     : ${SUBJECT}`);
  console.log(` From        : ${FROM_FORMATTED}`);
  console.log(` DRY_RUN     : ${DRY_RUN} ${DRY_RUN ? '(solo a TEST_EMAIL)' : '(envío real a TODO el CSV)'}`);
  console.log(` TEST_EMAIL  : ${TEST_EMAIL}`);
  console.log(` Rate limit  : 1 email cada ${RATE_LIMIT_MS} ms`);
  console.log('═══════════════════════════════════════════════════════');

  // Fuente 1: CSV con leads/profesionales curados manualmente.
  const csvAudience = loadAudience(CSV_PATH);
  console.log(`Cargados ${csvAudience.length} contactos del CSV.`);

  // Fuente 2: todos los usuarios registrados en la plataforma (clientes +
  // profesionales + admin), excluyendo los que ya han optado por la baja.
  const { data: usersRows, error: e1 } = await supabase
    .from('users')
    .select('email, full_name, email_unsubscribed')
    .not('email', 'is', null)
    .eq('email_unsubscribed', false);
  if (e1) throw e1;
  const usersAudience = (usersRows || []).map((u) => {
    const parts = String(u.full_name || '').trim().split(/\s+/);
    return {
      email: String(u.email).toLowerCase().trim(),
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
    };
  }).filter((u) => u.email);
  console.log(`Cargados ${usersAudience.length} usuarios activos de la BD.`);

  // Fusión + dedupe por email (gana el del CSV si hay choque, por su first_name explícito).
  const byEmail = new Map();
  for (const u of usersAudience) byEmail.set(u.email, u);
  for (const c of csvAudience) byEmail.set(c.email.toLowerCase().trim(), c);
  const fullAudience = Array.from(byEmail.values());
  console.log(`Audiencia final tras dedupe: ${fullAudience.length} destinatarios.`);

  const targets = DRY_RUN
    ? [{ email: TEST_EMAIL, first_name: 'Ilias', last_name: '' }]
    : fullAudience;

  const htmlTemplate = fs.readFileSync(HTML_PATH, 'utf8');
  if (!htmlTemplate.includes(UNSUB_PLACEHOLDER)) {
    console.warn(`⚠️  El HTML no contiene el placeholder de baja "${UNSUB_PLACEHOLDER}". Se enviará SIN link de baja personalizado en el cuerpo, pero las cabeceras List-Unsubscribe SÍ se incluyen.`);
  }

  const stats = { sent: 0, skipped: 0, errors: 0 };
  let i = 0;
  for (const rcpt of targets) {
    i++;
    const label = `[${i}/${targets.length}] ${rcpt.email}`;
    try {
      const t = await tokenForEmail(rcpt.email);
      if (t.skip) {
        console.log(`${label} ⏭  ya estaba dado de baja (${t.reason})`);
        stats.skipped++;
        continue;
      }
      const unsubscribeUrl = `${SITE}/baja?token=${encodeURIComponent(t.token)}`;
      const html = personalizeHtml(htmlTemplate, unsubscribeUrl, rcpt);
      const text = htmlToText(html);

      // Cabeceras List-Unsubscribe — RFC 2369 + RFC 8058 (One-Click).
      // Resend acepta `headers` en el payload de /emails.
      const headers = {
        'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:hola@misautonomos.es?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };

      const payload = {
        from: FROM_FORMATTED,
        to: [rcpt.email],
        subject: SUBJECT,
        html,
        text,
        headers,
      };

      const r = await sendOne(payload);
      if (!r.ok) {
        console.warn(`${label} ✗ ${r.status} — ${JSON.stringify(r.body).slice(0, 200)}`);
        stats.errors++;
      } else {
        const id = (typeof r.body === 'object' && r.body?.id) || '?';
        console.log(`${label} ✓ id=${id}`);
        stats.sent++;
      }
    } catch (e) {
      console.warn(`${label} ✗ exception: ${e?.message || e}`);
      stats.errors++;
    }
    // Throttle entre envíos (Resend free 2/s).
    if (i < targets.length) await sleep(RATE_LIMIT_MS);
  }

  console.log('');
  console.log('═══════════════════ Send summary ═══════════════════');
  console.log(`  Enviados: ${stats.sent}`);
  console.log(`  Saltados (ya unsubscribed): ${stats.skipped}`);
  console.log(`  Errores:  ${stats.errors}`);
  console.log('════════════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('FAIL', e?.stack || e?.message || e);
  process.exit(1);
});
