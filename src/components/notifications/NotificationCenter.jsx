import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  IconBell,
  IconCheckCheck,
  IconTrash,
  IconMail,
  IconStarOutline,
  IconAlert,
  IconInfo,
} from "@/components/Icons";
import { SkeletonList, EmptyState } from "@/components/ListStates";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/lib/toast";

export default function NotificationCenter({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // El DropdownMenu de Radix cerraba con click fuera y con Escape; aquí lo
  // hace este efecto. `mousedown` y no `click`: un arrastre que empieza
  // dentro del panel y suelta fuera no debe cerrarlo.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // ✅ Query para cargar notificaciones
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter(
        { user_id: user.id },
        '-created_date',
        50
      );
      return notifs;
    },
    enabled: !!user,
    refetchInterval: 10000, // Refetch cada 10 segundos
    staleTime: 5000,
  });

  // Contar no leídas
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ✅ Marcar como leída
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // ✅ Marcar todas como leídas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      for (const notif of unreadNotifs) {
        await base44.entities.Notification.update(notif.id, { is_read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('notifications.center.allRead'));
    }
  });

  // ✅ Eliminar notificación
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('notifications.toast.deleted'));
    }
  });

  // ✅ Manejar click en notificación
  const handleNotificationClick = (notification) => {
    // Marcar como leída
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Redirigir si tiene link
    if (notification.link) {
      setIsOpen(false);
      // Normalizar URL: si es absoluta, extraer solo el path+search
      let target = notification.link;
      try {
        const url = new URL(target);
        target = url.pathname + url.search + url.hash;
      } catch {
        // ya es relativa, usarla tal cual
      }
      // Corregir rutas legacy que ya no existen
      const LEGACY_MAP = {
        // El chat interno se retiró; una notificación antigua que apuntase
        // ahí llevaría a un 404. Mejor la portada que un callejón.
        '/Messages': '/',
        '/messages': '/',
        '/Notifications': '/notificaciones',
        '/notifications': '/notificaciones',
        '/Dashboard': '/dashboard',
        '/ProfessionalDashboard': '/dashboard',
        // Las suscripciones se retiraron; una notificación antigua que
        // apuntase ahí llevaría a un 404.
        '/SubscriptionManagement': '/',
        '/subscriptionmanagement': '/',
        '/MyProfile': '/mi-perfil',
        '/myprofile': '/mi-perfil',
      };
      const pathOnly = target.split('?')[0];
      if (LEGACY_MAP[pathOnly]) {
        target = LEGACY_MAP[pathOnly] + target.slice(pathOnly.length);
      }
      navigate(target);
    }
  };

  // ✅ Icono según tipo de notificación
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_message':
        return <IconMail className="w-4 h-4 text-c-accent" />;
      case 'new_review':
        return <IconStarOutline className="w-4 h-4 text-star" />;
      case 'review_reminder':
        return <IconStarOutline className="w-4 h-4 text-star" />;
      case 'subscription_expiring':
        return <IconAlert className="w-4 h-4 text-warning" />;
      case 'subscription_expired':
        return <IconAlert className="w-4 h-4 text-error" />;
      case 'profile_approved':
        return <IconCheckCheck className="w-4 h-4 text-success" />;
      case 'system_update':
        return <IconInfo className="w-4 h-4 text-c-accent" />;
      default:
        return <IconBell className="w-4 h-4 text-c-muted" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', padding: 0 }}
        className="relative w-14 h-14 flex items-center justify-center rounded-lg text-ink active:bg-soft"
        aria-label={t('notifications.title')}
      >
        <IconBell className="w-5 h-5 pointer-events-none" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-4 w-4 flex items-center justify-center bg-error text-white text-[9px] font-bold rounded-full pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 md:w-96 card shadow-lg">
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <span className="text-base font-bold text-ink">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="btn-ghost btn-sm text-xs"
              >
                <IconCheckCheck className="w-3 h-3" />
                {t('notifications.center.markAllRead')}
              </button>
            )}
          </div>

          <hr className="separator" />

          <div className="h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-3" role="status" aria-live="polite">
                <span className="sr-only">{t('notifications.center.loading')}</span>
                <SkeletonList count={4} avatar={false} />
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                className="border-0 shadow-none"
                icon={<IconBell size={24} />}
                title={t('notifications.empty')}
                body={t('notifications.emptyHint')}
              />
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-c-border hover:bg-soft transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-c-accent/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-semibold ${!notification.is_read ? 'text-ink' : 'text-c-muted'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-c-accent rounded-full"></span>
                        )}
                      </div>

                      <p className="text-xs text-c-muted mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-c-muted">
                          {format(new Date(notification.created_date), "d MMM HH:mm", { locale: es })}
                        </p>

                        <button
                          type="button"
                          className="btn-icon text-c-muted hover:text-error"
                          aria-label={t('common.delete')}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <>
              <hr className="separator" />
              <div className="p-2">
                <button
                  type="button"
                  className="btn-ghost w-full text-xs"
                  onClick={() => {
                    navigate('/notificaciones');
                    setIsOpen(false);
                  }}
                >
                  {t('notifications.center.viewAll')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
