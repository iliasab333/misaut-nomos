import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/use-toast";
import { requestPermission, isSubscribed } from "@/services/onesignalService";
import { ONESIGNAL_APP_ID } from "@/config/onesignal";

const DISMISSED_KEY = "notif_banner_dismissed";
const DELAY_MS = 2 * 60 * 1000; // 2 minutos

export default function NotificationPermissionBanner({ user }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const { toast } = useToast();

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
          toast({
            title: t('notifications.activated_toast'),
            description: t('notifications.banner.activatedDescription'),
          });
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
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50 animate-fade-in"
      aria-label={t('notifications.banner.ariaLabel')}
    >
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        aria-label={t('common.close')}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-gray-900 text-sm">{t('notifications.enable_title')}</h3>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {t('notifications.enable_subtitle')}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleActivate}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('notifications.activate')}
            </button>
            <button
              onClick={dismiss}
              className="px-3 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              {t('notifications.not_now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}