// scripts/audit-ux.mjs
// Auditoría UX del funnel móvil de MisAutónomos contra producción.
// Genera capturas numeradas y un JSON con inputs, campos obligatorios,
// tiempos y CTAs visibles por pantalla.
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = new URL('../audit-ux/', import.meta.url);
const SHOTS_DIR = new URL('../audit-ux/shots/', import.meta.url);
const BASE = 'https://misautonomos.es';

// Perfil móvil real: iPhone 12 (390×844, DPR 2, touch). Añadimos throttle 4G.
const iphone = {
  ...devices['iPhone 12'],
  locale: 'es-ES',
  timezoneId: 'Europe/Madrid',
};

async function ensureDirs() {
  await fs.mkdir(new URL(OUT_DIR), { recursive: true });
  await fs.mkdir(new URL(SHOTS_DIR), { recursive: true });
}

async function throttle(context) {
  // 4G aproximado: ~5 Mbps down, 1.5 Mbps up, 60ms RTT.
  const client = await context.newCDPSession(await context.newPage()).catch(() => null);
  // Nota: en Playwright chromium-headless-shell CDPSession puede no ir para
  // network.emulateNetworkConditions consistentemente; lo dejamos best-effort.
  return client;
}

function nowMs() { return Number(process.hrtime.bigint() / 1000000n); }

async function auditPage(page, num, label, urlPathOrHash) {
  const start = nowMs();
  if (urlPathOrHash) {
    await page.goto(BASE + urlPathOrHash, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    // Esperar network idle corta para renderizar SPA.
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(1200); // permitir hidratación / fuentes
  const loadMs = nowMs() - start;

  const shotFile = `shots/${String(num).padStart(2, '0')}-${label}.png`;
  const shotAbs = new URL(shotFile, OUT_DIR).pathname;
  await page.screenshot({ path: shotAbs, fullPage: true }).catch((e) => console.warn('shot failed', label, e.message));

  // Recopilar datos de la pantalla actual.
  const data = await page.evaluate(() => {
    const q = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0;
    };

    const inputs = q('input, textarea, select')
      .filter((el) => el.type !== 'hidden' && visible(el))
      .map((el) => {
        const label =
          (el.getAttribute('aria-label')) ||
          (el.labels && el.labels[0] && el.labels[0].innerText.trim()) ||
          (el.previousElementSibling && el.previousElementSibling.innerText && el.previousElementSibling.innerText.trim().slice(0, 60)) ||
          el.name || el.id || '';
        return {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || null,
          name: el.getAttribute('name') || null,
          id: el.id || null,
          placeholder: el.getAttribute('placeholder') || null,
          required: el.required || el.getAttribute('aria-required') === 'true',
          disabled: el.disabled || false,
          maxLength: el.maxLength > 0 ? el.maxLength : null,
          autoComplete: el.getAttribute('autocomplete') || null,
          inputMode: el.getAttribute('inputmode') || null,
          enterKeyHint: el.getAttribute('enterkeyhint') || null,
          autoCapitalize: el.getAttribute('autocapitalize') || null,
          spellCheck: el.getAttribute('spellcheck') || null,
          label: label,
        };
      });

    const buttons = q('button, [role="button"], a[href]')
      .filter(visible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || null,
        text: (el.innerText || el.textContent || '').trim().slice(0, 80),
        aria: el.getAttribute('aria-label') || null,
        href: el.tagName === 'A' ? el.getAttribute('href') : null,
        y: Math.round(el.getBoundingClientRect().top),
      }))
      .filter((b) => b.text.length > 0)
      .slice(0, 30);

    // CTA principal visible sin scroll: primer <button> con estilo "primario" en viewport.
    const vpH = window.innerHeight;
    const primaryCandidates = q('button, a')
      .filter(visible)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top >= vpH || r.top < 0) return false;
        const s = getComputedStyle(el);
        const bg = s.backgroundColor;
        // filtramos los que tienen fondo saturado (no transparente / no blanco)
        return bg && !bg.includes('0, 0, 0, 0') && !bg.includes('255, 255, 255');
      })
      .slice(0, 6)
      .map((el) => ({ text: (el.innerText || '').trim().slice(0, 60), y: Math.round(el.getBoundingClientRect().top) }));

    // Cabecera de progreso
    const progress = q('[role="progressbar"], .progress, [class*="progress"]').filter(visible).slice(0, 2)
      .map((el) => ({ text: el.innerText?.trim().slice(0, 60) || '', aria: el.getAttribute('aria-valuenow') || null }));

    // Cookie/banner que podrían tapar CTA
    const banners = q('[class*="cookie"], [id*="cookie"], [class*="banner"]').filter(visible).slice(0, 3)
      .map((el) => ({ text: (el.innerText || '').trim().slice(0, 80), y: Math.round(el.getBoundingClientRect().top) }));

    // Errores visibles
    const errors = q('[role="alert"], [class*="error"], .text-red-500, .text-red-700, .text-red-600')
      .filter(visible)
      .map((el) => (el.innerText || '').trim().slice(0, 120))
      .filter((t) => t && t.length > 2)
      .slice(0, 20);

    return {
      title: document.title,
      url: location.href,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      inputs, buttons, primaryCandidates, progress, banners, errors,
    };
  }).catch((e) => ({ error: e.message }));

  return { num, label, shotFile, loadMs, ...data };
}

async function tryDismissCookieBanner(page) {
  // Intenta cerrar cualquier banner de cookies con botones típicos.
  const selectors = [
    'button:has-text("Aceptar")',
    'button:has-text("Aceptar todo")',
    'button:has-text("Aceptar todas")',
    'button:has-text("De acuerdo")',
    'button:has-text("Vale")',
    '[id*="cookie"] button',
  ];
  for (const sel of selectors) {
    try {
      const el = await page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 })) { await el.click({ timeout: 1000 }); return true; }
    } catch (_e) {}
  }
  return false;
}

async function main() {
  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...iphone });
  const page = await context.newPage();

  const findings = [];
  let num = 1;

  // Flujo A: Home → CTA "Hazte autónomo" → /registro
  findings.push(await auditPage(page, num++, 'home', '/'));
  await tryDismissCookieBanner(page);
  findings.push(await auditPage(page, num++, 'home-after-cookie', ''));

  // Localizar CTA "Hazte autónomo"
  try {
    const cta = page.getByRole('link', { name: /hazte autónomo/i }).first();
    if (await cta.isVisible({ timeout: 4000 })) {
      await cta.click({ timeout: 4000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      findings.push(await auditPage(page, num++, 'clicked-hazte-autonomo', ''));
    }
  } catch (e) { findings.push({ num: num++, label: 'clicked-hazte-autonomo', error: e.message }); }

  // Flujo B: entrar directo a /registro (como los anuncios)
  findings.push(await auditPage(page, num++, 'registro-directo', '/registro'));

  // /login modo signup autónomo (destino real tras /registro)
  findings.push(await auditPage(page, num++, 'login-signup-autonomo',
    '/login?mode=signup&role=profesional&next=%2Fcompletar-perfil'));

  // /login modo signup cliente
  findings.push(await auditPage(page, num++, 'login-signup-cliente',
    '/login?mode=signup&role=cliente&next=%2Fbuscar'));

  // /login modo signin
  findings.push(await auditPage(page, num++, 'login-signin', '/login'));

  // ProfileOnboarding — no podremos pasar sin auth, pero al menos capturamos redirect
  findings.push(await auditPage(page, num++, 'completar-perfil-noauth', '/completar-perfil'));

  // /registro-cliente
  findings.push(await auditPage(page, num++, 'registro-cliente', '/registro-cliente'));

  // Recuperación de contraseña (misma pantalla; ver estado)
  findings.push(await auditPage(page, num++, 'reset-contrasena', '/login'));

  // Flujo D: buscar → intentar contactar sin cuenta
  findings.push(await auditPage(page, num++, 'buscar', '/buscar'));
  // Elegir el primer profesional visible
  try {
    const firstCard = page.locator('a[href*="/autonomo/"]').first();
    if (await firstCard.isVisible({ timeout: 5000 })) {
      const href = await firstCard.getAttribute('href');
      await page.goto(BASE + href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      findings.push(await auditPage(page, num++, 'ficha-profesional', ''));
      // Buscar botón de contacto/mensaje
      const contactBtn = page.getByRole('button', { name: /contactar|enviar mensaje|mensaje|pedir presupuesto/i }).first();
      if (await contactBtn.isVisible({ timeout: 4000 })) {
        await contactBtn.click({ timeout: 4000 });
        await page.waitForTimeout(1500);
        findings.push(await auditPage(page, num++, 'clic-contactar-sin-cuenta', ''));
      }
    }
  } catch (e) {
    findings.push({ num: num++, label: 'ficha-profesional', error: e.message });
  }

  await browser.close();

  // Serializar resultados
  const jsonPath = new URL('findings.json', OUT_DIR);
  await fs.writeFile(jsonPath, JSON.stringify(findings, null, 2), 'utf8');
  console.log(`\n✓ Auditoría completada. ${findings.length} pantallas capturadas.`);
  console.log(`  Capturas:  ${new URL(SHOTS_DIR).pathname}`);
  console.log(`  Datos:     ${new URL(jsonPath).pathname}`);
}

main().catch((e) => { console.error('audit failed', e); process.exit(1); });
