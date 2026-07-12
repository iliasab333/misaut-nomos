// Manejo de deep-links en nativo (iOS/Android) + persistencia de sesión Supabase.
//
// Flujo de login en nativo:
//  1. La app abre el navegador del sistema con el flujo OAuth/email.
//  2. Supabase devuelve al usuario a una URL custom-scheme (ej.
//     `com.base690076ad86e673c796768de5.app://login-callback#access_token=...`).
//  3. Capacitor App.addListener('appUrlOpen') captura esa URL y la pasamos a
//     `supabase.auth.exchangeCodeForSession` o `setSession` según el formato.
//
// Persistencia: en navegador usamos localStorage (por defecto en
// supabase-js). En nativo cambiamos al almacén de @capacitor/preferences vía
// `supabase.auth.storage` para que la sesión sobreviva reinicios.

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '@/api/supabaseClient';

// Adaptador de storage para supabase-js v2 (interfaz síncrona-compatible).
// supabase-js admite Storage async; Preferences es async. Devuelve null en
// errores para que la sesión se trate como inexistente.
const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch {
      /* noop */
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch {
      /* noop */
    }
  },
};

// Sólo aplica el storage en nativo. En web mantenemos localStorage por defecto
// para no romper sesiones existentes.
function patchAuthStorage() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // supabase-js v2 expone el storage configurado en construcción; con la
    // sesión ya creada, lo más seguro es persistir manualmente cualquier sesión
    // activa cada vez que cambie.
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const key = `sb-misautonomos-auth-token`;
      if (session) {
        await capacitorStorage.setItem(
          key,
          JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            token_type: session.token_type,
            user: session.user,
          })
        );
      } else {
        await capacitorStorage.removeItem(key);
      }
    });

    // Restaurar sesión al arrancar si hay una guardada por Preferences.
    void (async () => {
      const key = `sb-misautonomos-auth-token`;
      const raw = await capacitorStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token && parsed?.refresh_token) {
          await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
        }
      } catch {
        /* sesión corrupta — ignoramos */
      }
    })();
  } catch (e) {
    console.warn('[deepLinkAuth] patchAuthStorage failed:', e);
  }
}

// Procesa una URL del esquema custom y la traduce a un setSession/exchange.
async function handleDeepLink(url: string) {
  try {
    if (!url) return;
    const u = new URL(url);

    // Soporte tanto querystring (`?code=...`) como fragmento (`#access_token=...`).
    const params = new URLSearchParams(u.search);
    const hashParams = new URLSearchParams(
      (u.hash || '').replace(/^#/, '')
    );

    const code = params.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      await closeBrowserSafely();
      return;
    }
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      await closeBrowserSafely();
      return;
    }

    // Sin tokens reconocibles: log para diagnosticar.
    console.warn('[deepLinkAuth] URL recibida sin tokens reconocibles:', url);
  } catch (e) {
    console.error('[deepLinkAuth] error procesando URL:', e);
  }
}

// Cierra el @capacitor/browser abierto para OAuth. No lanza si no está.
async function closeBrowserSafely() {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch (_e) { /* no importa si no hay browser abierto */ }
}

// Init principal. Llamar UNA vez en el arranque (main.jsx).
export function initDeepLinkAuth() {
  // En web es no-op (deja que Supabase procese ?code=... como hasta ahora).
  if (!Capacitor.isNativePlatform()) return;

  patchAuthStorage();

  // 1) URL inicial (cuando la app se abre desde un deep link en frío).
  void (async () => {
    try {
      const { url } = await App.getLaunchUrl();
      if (url) await handleDeepLink(url);
    } catch {
      /* getLaunchUrl no soportado o sin URL: ignoramos */
    }
  })();

  // 2) Deep links recibidos con la app ya viva.
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url) return;
    await handleDeepLink(url);
  });
}

export default initDeepLinkAuth;
