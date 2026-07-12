// src/lib/native/auth.js
// OAuth y confirmación de email adaptados a Capacitor iOS/Android.
// En web: comportamiento actual de supabase-js.
// En nativo:
//   - Google: abrimos el flujo en Safari con @capacitor/browser y volvemos
//     por el deep-link `com.base690076ad86e673c796768de5.app://login-callback`.
//     Google bloquea sign-in dentro de WKWebView desde 2021 (policy WebView),
//     así que ir por navegador externo es OBLIGATORIO.
//   - Apple: usamos @capacitor-community/apple-sign-in (ASAuthorizationController
//     nativo) y le pasamos el identityToken a supabase.auth.signInWithIdToken.
//     Es lo que Apple exige en la review si ofreces cualquier otro OAuth.
//   - emailRedirectTo: en nativo usamos el mismo scheme para que el enlace
//     del correo abra la app y `deepLinkAuth.ts` intercambie el code.

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/api/supabaseClient';

// Bundle ID (igual que en Info.plist CFBundleURLSchemes).
export const APP_URL_SCHEME = 'com.base690076ad86e673c796768de5.app';

export const isNative = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === 'ios';

// Redirect para confirmación de email tras signup.
export function emailRedirectFor(pathAfterConfirm = '/completar-perfil') {
  if (isNative()) {
    return `${APP_URL_SCHEME}://${pathAfterConfirm.replace(/^\//, '')}`;
  }
  return window.location.origin + pathAfterConfirm;
}

// URL para restablecer contraseña.
export function passwordResetRedirect() {
  if (isNative()) return `${APP_URL_SCHEME}://login`;
  return window.location.origin + '/login';
}

// ── Google OAuth ─────────────────────────────────────────────────────────
// En web: signInWithOAuth abre el flujo redirect normal.
// En nativo: pedimos a Supabase la URL de autorización con skipBrowserRedirect,
// la abrimos con @capacitor/browser y esperamos el deep-link de vuelta.
export async function signInWithGoogle() {
  if (!isNative()) {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  const { Browser } = await import('@capacitor/browser');
  const redirectTo = `${APP_URL_SCHEME}://login-callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Supabase no devolvió URL de autorización de Google.');

  await Browser.open({ url: data.url, presentationStyle: 'popover' });
  // deepLinkAuth escucha appUrlOpen; cerramos el navegador al recibir el callback.
  return { data: null, error: null };
}

// ── Apple Sign In ────────────────────────────────────────────────────────
// En web: OAuth clásico contra el provider Apple de Supabase.
// En nativo iOS: ASAuthorizationController → identityToken → signInWithIdToken.
export async function signInWithApple() {
  if (!isNative()) {
    return supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
  }
  if (!isIOS()) {
    // En Android SIWA sí funciona vía OAuth clásico + browser.
    const { Browser } = await import('@capacitor/browser');
    const redirectTo = `${APP_URL_SCHEME}://login-callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data?.url) await Browser.open({ url: data.url, presentationStyle: 'popover' });
    return { data: null, error: null };
  }

  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
  // El nonce se sugiere pero Supabase no lo exige — lo omitimos por
  // simplicidad; con SIWA nativo el propio Apple firma los datos.
  const result = await SignInWithApple.authorize({
    clientId: APP_URL_SCHEME,           // bundle id
    redirectURI: `${APP_URL_SCHEME}://login-callback`,
    scopes: 'email name',
    state: 'siwa',
  });

  const idToken = result?.response?.identityToken;
  if (!idToken) throw new Error('Apple no devolvió identityToken.');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
    // nonce opcional
  });
  if (error) throw error;
  return { data, error: null };
}

// Utilidad para cerrar el navegador Capacitor cuando el deep link llega.
// Se llama desde deepLinkAuth.ts al detectar la vuelta.
export async function closeInAppBrowser() {
  if (!isNative()) return;
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch (_e) { /* browser puede estar cerrado ya */ }
}
