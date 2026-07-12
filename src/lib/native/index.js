// src/lib/native/index.js
// Helpers nativos para iOS/Android via Capacitor. En web son no-ops o
// fallbacks usando la API web, así el mismo código funciona en los 3
// entornos sin if's repetidos en cada componente.

import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';

// ── Camera (foto + galería) ──────────────────────────────────────────────
// Devuelve { dataUrl, webPath, format } o null si el usuario cancela.
export async function pickPhoto({ source = 'prompt' } = {}) {
  if (!isNative()) {
    // Fallback web: input file que el caller resuelve.
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result, format: file.type, file });
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  try {
    const sourceMap = { camera: CameraSource.Camera, gallery: CameraSource.Photos, prompt: CameraSource.Prompt };
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: sourceMap[source] || CameraSource.Prompt,
      promptLabelHeader: 'Subir foto',
      promptLabelPhoto: 'Galería',
      promptLabelPicture: 'Cámara',
    });
    return { dataUrl: photo.dataUrl, format: photo.format };
  } catch (e) {
    if (e?.message?.includes('cancelled') || e?.message?.includes('User cancelled')) return null;
    console.warn('[native] camera:', e?.message || e);
    return null;
  }
}

// ── Geolocation (lat/lon del usuario) ────────────────────────────────────
export async function getLocation({ timeoutMs = 10000 } = {}) {
  if (!isNative()) {
    // Fallback navegador.
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(null),
        { timeout: timeoutMs, enableHighAccuracy: false },
      );
    });
  }
  const { Geolocation } = await import('@capacitor/geolocation');
  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location === 'denied') return null;
    if (perm.location !== 'granted') {
      const req = await Geolocation.requestPermissions();
      if (req.location !== 'granted') return null;
    }
    const pos = await Geolocation.getCurrentPosition({ timeout: timeoutMs, enableHighAccuracy: false });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
  } catch (e) {
    console.warn('[native] geolocation:', e?.message || e);
    return null;
  }
}

// ── Share Sheet nativo ──────────────────────────────────────────────────
export async function shareUrl({ title, text, url, dialogTitle = 'Compartir' }) {
  if (!isNative()) {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return true; }
      catch (_) { return false; }
    }
    // Último recurso: copiar al portapapeles.
    try { await navigator.clipboard.writeText(url || text || ''); return true; }
    catch (_) { return false; }
  }
  const { Share } = await import('@capacitor/share');
  try {
    await Share.share({ title, text, url, dialogTitle });
    return true;
  } catch (e) {
    if (e?.message?.includes('cancelled')) return false;
    console.warn('[native] share:', e?.message || e);
    return false;
  }
}

// ── Haptics (vibración nativa en interacciones clave) ───────────────────
export async function haptic(style = 'light') {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] || ImpactStyle.Light });
  } catch (_) { /* noop */ }
}

export async function hapticSuccess() {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch (_) { /* noop */ }
}

// ── StatusBar (color y estilo del texto de la barra de estado) ──────────
// style: 'light' → letras blancas (fondo oscuro); 'dark' → letras negras.
export async function setStatusBarStyle(style = 'dark') {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: style === 'light' ? Style.Light : Style.Dark });
  } catch (_) { /* noop */ }
}

export async function setStatusBarBackground(hex = '#FFFFFF') {
  if (!isNative()) return;
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: hex });
  } catch (_) { /* Android-only en la práctica */ }
}

// ── KV store portátil ───────────────────────────────────────────────────
// En web: localStorage. En nativo: @capacitor/preferences (guardado en el
// contenedor de la app, sobrevive a limpiezas del WKWebView).
export const kv = {
  async get(key) {
    if (!isNative()) {
      try { return localStorage.getItem(key); } catch (_e) { return null; }
    }
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value ?? null;
    } catch (_e) { return null; }
  },
  async set(key, value) {
    if (!isNative()) {
      try { localStorage.setItem(key, value); } catch (_e) {}
      return;
    }
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
    } catch (_e) {}
  },
  async remove(key) {
    if (!isNative()) {
      try { localStorage.removeItem(key); } catch (_e) {}
      return;
    }
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
    } catch (_e) {}
  },
};

// ── Network (estado online/offline) ─────────────────────────────────────
export async function getNetworkStatus() {
  if (!isNative()) {
    return { connected: navigator.onLine !== false, connectionType: 'unknown' };
  }
  const { Network } = await import('@capacitor/network');
  return await Network.getStatus();
}

export async function onNetworkChange(callback) {
  if (!isNative()) {
    const handler = () => callback({ connected: navigator.onLine !== false, connectionType: 'unknown' });
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => { window.removeEventListener('online', handler); window.removeEventListener('offline', handler); };
  }
  const { Network } = await import('@capacitor/network');
  const sub = await Network.addListener('networkStatusChange', callback);
  return () => sub.remove();
}

// ── Push Notifications (APNs nativo) ────────────────────────────────────
// Registra el dispositivo y devuelve el token APNs. Sin auto-suscripción
// al canal — el caller decide qué hacer con el token (mandarlo a OneSignal
// o a tu backend para asociarlo al user_id).
let pushInitialized = false;

export async function initPushNotifications({ onToken, onMessage } = {}) {
  if (!isNative() || pushInitialized) return false;
  pushInitialized = true;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === 'granted';
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === 'granted';
    }
    if (!granted) {
      console.log('[push] permission denied');
      return false;
    }

    await PushNotifications.register();

    await PushNotifications.addListener('registration', (token) => {
      console.log('[push] APNs token:', token.value);
      onToken?.(token.value);
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registrationError:', err);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notif) => {
      onMessage?.(notif);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      // Tap en notificación: nav a la pantalla relevante si vino data.url
      const data = action?.notification?.data;
      if (data?.url) {
        try { window.location.href = data.url; } catch (_) { /* noop */ }
      }
    });

    return true;
  } catch (e) {
    console.warn('[push] init failed:', e?.message || e);
    return false;
  }
}
