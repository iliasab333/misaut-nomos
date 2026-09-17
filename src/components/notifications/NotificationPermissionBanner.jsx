import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IconBell, IconClose } from "@/components/Icons";
import { toast } from "@/lib/toast";
import { requestPermission, isSubscribed } from "@/services/onesignalService";
import { ONESIGNAL_APP_ID } from "@/config/onesignal";

const DISMISSED_KEY = "notif_banner_dismissed";
const DELAY_MS = 2 * 60 * 1000; // 2 minutos

export default function NotificationPermissionBanner({ user }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    // No mostrar si OneSignal no está configurado
    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') return;
    if (!("Notification" in window)) return;
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    const timer = setTimeout(async () => {
      try {
        const subscribed = await isSubscribed();
        if (!subscribed && localStorage.getItem(DISMISSED_KEY) !== "true") {
          setShow(true);
        }
      } catch {
        // Si falla la comprobación, mostrar igualmente si el permiso es 'default'
        if (Notification.permission === "default") setShow(true);
      }
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
  };

  const handleActivate = async () => {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.Notifications.requestPermission();
        if (OneSignal.Notifications.permission) {
          await OneSignal.login(user.id);
          await OneSignal.User.addTags({
            user_type: user.user_type || 'unknown',
            city: user.city || '',
            subscription: user.subscription_status || 'none'
          });
          // sonner admitía `{ title, description }`; el toast de la casa
          // sólo acepta un string, así que el aviso es el título y la
          // descripción se queda en el locale para el detalle de ajustes.
          toast.info(t('notifications.activated_toast'));
        }
      });
    } catch (err) {
      console.error("Error OneSignal:", err);
    }
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-surface border border-c-border rounded-2xl shadow-xl p-4 z-50 animate-fade-in"
      aria-label={t('notifications.banner.ariaLabel')}
    >
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-c-muted hover:text-ink rounded-full hover:bg-soft transition-colors"
        aria-label={t('common.close')}
      >
        <IconClose className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <IconBell className="w-5 h-5 text-c-accent" />
        </div>
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-ink text-sm">{t('notifications.enable_title')}</h3>
          <p className="text-xs text-c-muted mt-1 leading-relaxed">
            {t('notifications.enable_subtitle')}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleActivate}
              className="flex-1 bg-c-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-accent-hover transition-colors"
            >
              {t('notifications.activate')}
            </button>
            <button
              onClick={dismiss}
              className="px-3 text-sm text-c-muted hover:text-ink transition-colors"
            >
              {t('notifications.not_now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
