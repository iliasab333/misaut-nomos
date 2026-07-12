// scripts/audit-verify-ctas.mjs
// Verifica los 4 checks del fix "direct CTAs" contra build LOCAL.
import { chromium, devices } from 'playwright';

const BASE = 'http://127.0.0.1:4173';
const VP = { width: 390, height: 844 };

const iphone = { ...devices['iPhone 12'], locale: 'es-ES', timezoneId: 'Europe/Madrid' };

function visible(el) {
  const r = el.getBoundingClientRect();
  const st = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...iphone });
  const page = await context.newPage();
  const results = [];

  function log(check, ok, detail = '') {
    results.push({ check, ok, detail });
    console.log(`${ok ? '✓' : '✗'} ${check}${detail ? ' — ' + detail : ''}`);
  }

  async function dismissCookieBanner() {
    // Preacepta cookies para que el banner "Usamos cookies" no intercepte clicks.
    try {
      await page.evaluate(() => {
        try { localStorage.setItem('cookieConsent', 'accepted'); } catch (_e) {}
        try { localStorage.setItem('cookieConsent:v1', JSON.stringify({ analytics: true, marketing: true, timestamp: Date.now() })); } catch (_e) {}
      });
      const acceptBtn = page.getByRole('button', { name: /Aceptar todo|Aceptar todas|Aceptar/i }).first();
      if (await acceptBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        await acceptBtn.click({ timeout: 1500 });
      }
    } catch (_e) {}
  }

  // ── Check 1: Home hero CTA visible sin scroll (390×844) ───────────────
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await dismissCookieBanner();

  const heroCta = await page.evaluate(() => {
    const vpH = window.innerHeight;
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const primary = buttons.find((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width < 40 || r.height < 30) return false;
      if (r.top < 0 || r.top >= vpH) return false;
      const bg = st.backgroundColor;
      const hasBg = bg && !bg.includes('rgba(0, 0, 0, 0)') && !bg.includes('rgb(255, 255, 255)');
      const txt = (el.innerText || '').toLowerCase();
      return hasBg && (txt.includes('buscar') || txt.includes('hazte') || txt.includes('empezar') || txt.includes('crear'));
    });
    if (!primary) return null;
    return {
      text: primary.innerText.trim().slice(0, 60),
      y: Math.round(primary.getBoundingClientRect().top),
      viewportHeight: vpH,
    };
  });
  log('home móvil: CTA primario visible sin scroll (390×844)',
    !!heroCta && heroCta.y >= 0 && heroCta.y < heroCta.viewportHeight,
    heroCta ? `"${heroCta.text}" en y=${heroCta.y}px (vp=${heroCta.viewportHeight})` : 'ningún CTA within-vp');

  await page.screenshot({ path: 'audit-ux/verify-01-home.png', fullPage: false });

  // ── Check 2: header CTA "Hazte autónomo" → /registro?tipo=autonomo ────
  const headerHref = await page.evaluate(() => {
    // desktop header viene oculto en 390px; miramos rutas de todos los links visibles
    const links = Array.from(document.querySelectorAll('a')).filter((a) => {
      const t = (a.innerText || '').toLowerCase();
      return t.includes('hazte') && t.includes('autónomo');
    });
    if (!links.length) return null;
    // Encontramos al primero visible o al menos su href
    return links.map((a) => ({ href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 40) }));
  });
  const headerLandsOnRegister = Array.isArray(headerHref) &&
    headerHref.every((l) => (l.href || '').includes('/registro?tipo=autonomo'));
  log('home: todos los "Hazte autónomo" apuntan a /registro?tipo=autonomo',
    headerLandsOnRegister,
    JSON.stringify(headerHref));

  // ── Check 3: /precios CTA → /registro?tipo=autonomo ──────────────────
  await page.goto(BASE + '/precios', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await dismissCookieBanner();

  const priciosClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    return btns
      .filter((el) => {
        const t = (el.innerText || '').toLowerCase();
        return t.includes('empezar') || t.includes('crear') || t.includes('registrarme') || t.includes('hazte') || t.includes('gratis');
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.innerText.trim().slice(0, 40),
        href: el.tagName === 'A' ? el.getAttribute('href') : null,
        onClickInline: el.getAttribute('onclick'),
      }))
      .slice(0, 6);
  });
  // Ejecutamos click en el primer visible con label de CTA de alta.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const buttonToClick = page.getByRole('button', { name: /Crear mi perfil gratis/i }).first();
  let priciosLandedOn = null;
  try {
    if (await buttonToClick.isVisible({ timeout: 3000 })) {
      await Promise.all([
        page.waitForURL(/\/(registro|login)/, { timeout: 8000 }),
        buttonToClick.click({ timeout: 3000 }),
      ]);
      priciosLandedOn = new URL(page.url()).pathname + (new URL(page.url()).search || '');
    }
  } catch (_e) { priciosLandedOn = `err: ${_e.message}`; }
  log('/precios: el CTA principal aterriza en /registro o /login con role=profesional',
    priciosLandedOn && (priciosLandedOn.includes('tipo=autonomo') || (priciosLandedOn.includes('/login') && priciosLandedOn.includes('role=profesional'))),
    `landed=${priciosLandedOn}`);

  // ── Check 4: /registro?tipo=autonomo → botón Google visible sin scroll ─
  await page.goto(BASE + '/registro?tipo=autonomo', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);

  const currentUrl = new URL(page.url());
  const landedOnLogin = currentUrl.pathname.includes('/login') && currentUrl.search.includes('role=profesional');
  log('/registro?tipo=autonomo → /login?mode=signup&role=profesional',
    landedOnLogin,
    currentUrl.pathname + currentUrl.search);

  const googleVisible = await page.evaluate(() => {
    const vpH = window.innerHeight;
    const btns = Array.from(document.querySelectorAll('button, a'));
    const gbtn = btns.find((el) => {
      const t = (el.innerText || '').toLowerCase();
      return t.includes('google');
    });
    if (!gbtn) return null;
    const r = gbtn.getBoundingClientRect();
    return { text: gbtn.innerText.trim().slice(0, 40), y: Math.round(r.top), viewportHeight: vpH, visibleAboveFold: r.top >= 0 && r.top < vpH };
  });
  log('/registro?tipo=autonomo móvil: botón "Google" visible sin scroll',
    !!googleVisible && googleVisible.visibleAboveFold,
    googleVisible ? `y=${googleVisible.y}px (vp=${googleVisible.viewportHeight})` : 'no encontrado');

  await page.screenshot({ path: 'audit-ux/verify-02-registro-tipo-autonomo.png', fullPage: false });

  // ── Check 5: role preselect (Soy autónomo) visualmente ─────────────────
  const rolePreselected = await page.evaluate(() => {
    // El fix oculta la card selector cuando hay ?role=. Debe existir el
    // botón "Registrarse con Google" y no debe haber dos RoleCards.
    const roleCards = Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').toLowerCase();
      return t.includes('soy autónomo') || t.includes('busco profesionales');
    });
    return { roleCardsCount: roleCards.length };
  });
  log('/registro?tipo=autonomo móvil: rol preseleccionado (RoleCards ocultas)',
    rolePreselected.roleCardsCount === 0,
    JSON.stringify(rolePreselected));

  // ── Check 6 (extra): 1 clic desde home → registro con role preseleccionado ─
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await dismissCookieBanner();
  // Localizamos el primer link visible con texto Hazte autónomo (llegando al fold).
  const oneClick = page.getByRole('link', { name: /Hazte autónomo/i }).first();
  let oneClickLanded = null;
  try {
    if (await oneClick.count() > 0) {
      await oneClick.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await oneClick.click({ timeout: 3000 });
      // /registro es un puente sin UI que redirige a /login. Esperamos al final.
      await page.waitForURL(/\/login\?/, { timeout: 8000 });
      oneClickLanded = new URL(page.url()).pathname + new URL(page.url()).search;
    }
  } catch (_e) { oneClickLanded = `err: ${_e.message}`; }
  log('home: 1 clic en "Hazte autónomo" → /login con role=profesional',
    oneClickLanded && oneClickLanded.includes('/login') && oneClickLanded.includes('role=profesional'),
    oneClickLanded || 'no navegó');

  await browser.close();

  // Resumen
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks OK`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
