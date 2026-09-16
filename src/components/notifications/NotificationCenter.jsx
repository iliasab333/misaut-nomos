import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, Mail, Star, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function NotificationCenter({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

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
        '/SubscriptionManagement': '/suscripcion',
        '/subscriptionmanagement': '/suscripcion',
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
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'new_review':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'review_reminder':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'subscription_expiring':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'subscription_expired':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'profile_approved':
        return <CheckCheck className="w-4 h-4 text-green-500" />;
      case 'system_update':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', padding: 0 }}
          className="relative w-14 h-14 flex items-center justify-center rounded-lg text-gray-700 active:bg-gray-100"
          aria-label={t('notifications.title')}
        >
          <Bell className="w-5 h-5 pointer-events-none" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-4 w-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full pointer-events-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-base font-bold">{t('notifications.title')}</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-7 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              {t('notifications.center.markAllRead')}
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">{t('notifications.center.loading')}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">{t('notifications.empty')}</p>
              <p className="text-xs">{t('notifications.emptyHint')}</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {format(new Date(notification.created_date), "d MMM HH:mm", { locale: es })}
                      </p>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={() => {
                  navigate('/notificaciones');
                  setIsOpen(false);
                }}
              >
                {t('notifications.center.viewAll')}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}