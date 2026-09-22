import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Modal from "@/components/Modal";
import { SkeletonList, EmptyState } from "@/components/ListStates";
import {
  IconBell,
  IconCheck,
  IconCheckCheck,
  IconCheckSquare,
  IconTrash,
  IconStarOutline,
  IconAlert,
  IconInfo,
  IconSpinner,
  IconSettings,
  IconFile,
  IconMessageSquare,
} from "@/components/Icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/lib/toast";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setNotifPrefs(currentUser.notification_preferences || {
        email_enabled: true,
        push_enabled: true,
        new_messages: true,
        quote_updates: true,
        task_reminders: true,
        invoice_reminders: true,
        subscription_alerts: true,
        task_reminder_hours_before: 24,
        invoice_reminder_days_before: 3
      });
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter(
        { user_id: user.id },
        '-created_date',
        100
      );
      return notifs;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Cargar tareas pendientes
  const { data: upcomingTasks = [] } = useQuery({
    queryKey: ['upcoming-tasks', user?.id],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({
        professional_id: user.id,
        status: 'pending'
      }, 'due_date', 10);
      return tasks.filter(task => new Date(task.due_date) >= new Date());
    },
    enabled: !!user && user.user_type === 'professionnel',
  });

  // Cargar facturas próximas a vencer
  const { data: upcomingInvoices = [] } = useQuery({
    queryKey: ['upcoming-invoices', user?.id],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.filter({
        professional_id: user.id,
        status: 'sent'
      }, 'due_date', 10);
      return invoices.filter(i => new Date(i.due_date) >= new Date());
    },
    enabled: !!user && user.user_type === 'professionnel',
  });

  // Cargar presupuestos pendientes
  const { data: pendingQuotes = [] } = useQuery({
    queryKey: ['pending-quotes', user?.id],
    queryFn: async () => {
      const quotes = await base44.entities.Quote.filter({
        [user.user_type === 'professionnel' ? 'professional_id' : 'client_id']: user.id,
        status: 'enviado'
      }, '-created_date', 10);
      return quotes;
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      for (const notif of unreadNotifs) {
        await base44.entities.Notification.update(notif.id, { is_read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('notifications.toast.allRead'));
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('notifications.toast.deleted'));
    }
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const readNotifs = notifications.filter(n => n.is_read);
      for (const notif of readNotifs) {
        await base44.entities.Notification.delete(notif.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('notifications.toast.deletedMany'));
    }
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs) => {
      await base44.auth.updateMe({ notification_preferences: prefs });
    },
    onSuccess: () => {
      toast.success(t('cookies.settingsSaved'));
      setShowSettings(false);
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_message':
        return <IconMessageSquare className="w-5 h-5 text-c-accent" />;
      case 'new_review':
        return <IconStarOutline className="w-5 h-5 text-star" />;
      case 'review_reminder':
        return <IconStarOutline className="w-5 h-5 text-star" />;
      case 'subscription_expiring':
        return <IconAlert className="w-5 h-5 text-orange-500" />;
      case 'subscription_expired':
        return <IconAlert className="w-5 h-5 text-error" />;
      case 'profile_approved':
        return <IconCheckCheck className="w-5 h-5 text-success" />;
      case 'system_update':
        return <IconInfo className="w-5 h-5 text-c-accent" />;
      default:
        return <IconBell className="w-5 h-5 text-c-muted" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <IconSpinner className="w-8 h-8 animate-spin text-c-accent" />
      </div>
    );
  }

  const isProfessional = user.user_type === 'professionnel';

  return (
    <div className="section-tight">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-ink">{t('notifications.title')}</h1>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="btn-secondary btn-sm"
            >
              <IconSettings size={16} />
              <span className="hidden sm:inline">{t('notifications.page.configure')}</span>
            </button>
          </div>
          <p className="text-xs md:text-sm text-c-muted">{t('notifications.page.subtitle')}</p>
        </div>

        {/* Alertas pendientes */}
        {isProfessional && (upcomingTasks.length > 0 || upcomingInvoices.length > 0 || pendingQuotes.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {upcomingTasks.length > 0 && (
              <div className="card border-0 shadow-sm bg-success/10 border-l-4 border-l-success">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconCheckSquare className="w-4 h-4 text-success" />
                    <h3 className="font-semibold text-sm text-ink">{t('notifications.page.upcomingTasks')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-success">{upcomingTasks.length}</p>
                  <button
                    type="button"
                    className="btn-ghost btn-sm mt-2 px-0 text-xs"
                    onClick={() => navigate(createPageUrl("Calendar"))}
                  >
                    {t('notifications.page.viewCalendar')}
                  </button>
                </div>
              </div>
            )}
            {upcomingInvoices.length > 0 && (
              <div className="card border-0 shadow-sm bg-orange-50 border-l-4 border-l-orange-500">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconFile className="w-4 h-4 text-orange-600" />
                    <h3 className="font-semibold text-sm text-ink">{t('notifications.page.invoicesDue')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{upcomingInvoices.length}</p>
                  <button
                    type="button"
                    className="btn-ghost btn-sm mt-2 px-0 text-xs"
                    onClick={() => navigate(createPageUrl("Invoices"))}
                  >
                    {t('notifications.page.viewInvoices')}
                  </button>
                </div>
              </div>
            )}
            {pendingQuotes.length > 0 && (
              <div className="card border-0 shadow-sm bg-c-accent/10 border-l-4 border-l-c-accent">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconFile className="w-4 h-4 text-c-accent" />
                    <h3 className="font-semibold text-sm text-ink">{t('notifications.page.pendingQuotes')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-c-accent">{pendingQuotes.length}</p>
                  <button
                    type="button"
                    className="btn-ghost btn-sm mt-2 px-0 text-xs"
                    onClick={() => navigate(createPageUrl("Presupuestos"))}
                  >
                    {t('notifications.page.viewQuotes')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div role="tablist" aria-label={t('notifications.title')} className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`${filter === 'all' ? 'chip-active' : 'chip'} justify-center`}
            >
              {t('notifications.page.tabAll', { count: notifications.length })}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'unread'}
              onClick={() => setFilter('unread')}
              className={`${filter === 'unread' ? 'chip-active' : 'chip'} justify-center`}
            >
              {t('notifications.page.tabUnread', { count: unreadCount })}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'read'}
              onClick={() => setFilter('read')}
              className={`${filter === 'read' ? 'chip-active' : 'chip'} justify-center`}
            >
              {t('notifications.page.tabRead', { count: notifications.length - unreadCount })}
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="btn-secondary btn-sm flex-1 md:flex-none"
              >
                <IconCheckCheck size={16} />
                <span className="hidden sm:inline">{t('notifications.page.markAll')}</span>
                <span className="sm:hidden">{t('notifications.page.mark')}</span>
              </button>
            )}

            {notifications.some(n => n.is_read) && (
              <button
                type="button"
                onClick={() => deleteAllReadMutation.mutate()}
                disabled={deleteAllReadMutation.isPending}
                className="btn-secondary btn-sm flex-1 md:flex-none"
              >
                <IconTrash size={16} />
                <span className="hidden sm:inline">{t('notifications.page.deleteRead')}</span>
                <span className="sm:hidden">{t('common.delete')}</span>
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <SkeletonList count={4} avatar={false} />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={<IconBell className="w-6 h-6" />}
            title={
              filter === 'unread' ? t('notifications.page.emptyUnread') :
              filter === 'read' ? t('notifications.page.emptyRead') :
              t('notifications.empty')
            }
            body={t('notifications.emptyHint')}
          />
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`card shadow-sm border-0 cursor-pointer transition-all hover:shadow-md active:scale-98 ${
                  !notification.is_read ? 'bg-c-accent/10 border-l-4 border-l-c-accent' : 'bg-surface'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <h3 className={`text-sm md:text-base font-semibold truncate ${
                          !notification.is_read ? 'text-ink' : 'text-c-muted'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="badge-accent flex-shrink-0 text-xs">{t('notifications.page.newBadge')}</span>
                        )}
                      </div>

                      <p className="text-xs md:text-sm text-c-muted mb-2 md:mb-3 line-clamp-2">
                        {notification.message}
                      </p>

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <p className="text-xs text-c-muted">
                          {format(new Date(notification.created_date), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                        </p>

                        <div className="flex gap-2">
                          {!notification.is_read && (
                            <button
                              type="button"
                              className="btn-ghost btn-sm text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                            >
                              <IconCheck size={12} />
                              {t('notifications.page.mark')}
                            </button>
                          )}

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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Configuración de notificaciones */}
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <IconSettings size={20} />
            {t('notifications.settings.title')}
          </span>
        }
      >
        {notifPrefs && (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-ink">{t('notifications.settings.channels')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="label font-medium mb-0" htmlFor="notif-email">{t('notifications.settings.email')}</label>
                    <p className="text-xs text-c-muted">{t('notifications.settings.emailHint')}</p>
                  </div>
                  <input
                    id="notif-email"
                    type="checkbox"
                    role="switch"
                    className="switch"
                    checked={notifPrefs.email_enabled}
                    onChange={(e) => setNotifPrefs({...notifPrefs, email_enabled: e.target.checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="label font-medium mb-0" htmlFor="notif-push">{t('notifications.settings.push')}</label>
                    <p className="text-xs text-c-muted">{t('notifications.settings.pushHint')}</p>
                  </div>
                  <input
                    id="notif-push"
                    type="checkbox"
                    role="switch"
                    className="switch"
                    checked={notifPrefs.push_enabled}
                    onChange={(e) => setNotifPrefs({...notifPrefs, push_enabled: e.target.checked})}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-c-border pt-6 space-y-4">
              <h3 className="font-semibold text-ink">{t('notifications.settings.alertTypes')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label font-medium mb-0" htmlFor="notif-new-messages">{t('notifications.settings.newMessages')}</label>
                  <input
                    id="notif-new-messages"
                    type="checkbox"
                    role="switch"
                    className="switch"
                    checked={notifPrefs.new_messages}
                    onChange={(e) => setNotifPrefs({...notifPrefs, new_messages: e.target.checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="label font-medium mb-0" htmlFor="notif-quote-updates">{t('notifications.settings.quoteUpdates')}</label>
                  <input
                    id="notif-quote-updates"
                    type="checkbox"
                    role="switch"
                    className="switch"
                    checked={notifPrefs.quote_updates}
                    onChange={(e) => setNotifPrefs({...notifPrefs, quote_updates: e.target.checked})}
                  />
                </div>
                {isProfessional && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="label font-medium mb-0" htmlFor="notif-task-reminders">{t('notifications.settings.taskReminders')}</label>
                      <input
                        id="notif-task-reminders"
                        type="checkbox"
                        role="switch"
                        className="switch"
                        checked={notifPrefs.task_reminders}
                        onChange={(e) => setNotifPrefs({...notifPrefs, task_reminders: e.target.checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="label font-medium mb-0" htmlFor="notif-invoice-reminders">{t('notifications.settings.invoiceDue')}</label>
                      <input
                        id="notif-invoice-reminders"
                        type="checkbox"
                        role="switch"
                        className="switch"
                        checked={notifPrefs.invoice_reminders}
                        onChange={(e) => setNotifPrefs({...notifPrefs, invoice_reminders: e.target.checked})}
                      />
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <label className="label font-medium mb-0" htmlFor="notif-subscription-alerts">{t('notifications.settings.subscriptionAlerts')}</label>
                  <input
                    id="notif-subscription-alerts"
                    type="checkbox"
                    role="switch"
                    className="switch"
                    checked={notifPrefs.subscription_alerts}
                    onChange={(e) => setNotifPrefs({...notifPrefs, subscription_alerts: e.target.checked})}
                  />
                </div>
              </div>
            </div>

            {isProfessional && (
              <div className="border-t border-c-border pt-6 space-y-4">
                <h3 className="font-semibold text-ink">{t('notifications.settings.reminderTimes')}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label" htmlFor="notif-task-hours">{t('notifications.settings.taskHoursBefore')}</label>
                    <input
                      id="notif-task-hours"
                      className="input mt-1"
                      type="number"
                      value={notifPrefs.task_reminder_hours_before}
                      onChange={(e) => setNotifPrefs({...notifPrefs, task_reminder_hours_before: Number(e.target.value)})}
                      min="1"
                      max="168"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="notif-invoice-days">{t('notifications.settings.invoiceDaysBefore')}</label>
                    <input
                      id="notif-invoice-days"
                      className="input mt-1"
                      type="number"
                      value={notifPrefs.invoice_reminder_days_before}
                      onChange={(e) => setNotifPrefs({...notifPrefs, invoice_reminder_days_before: Number(e.target.value)})}
                      min="1"
                      max="30"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button type="button" className="btn-secondary btn-sm" onClick={() => setShowSettings(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => savePreferencesMutation.mutate(notifPrefs)}
            disabled={savePreferencesMutation.isPending}
          >
            {savePreferencesMutation.isPending ? (
              <><IconSpinner size={16} />{t('reviews.card.saving')}</>
            ) : (
              t('cookies.savePreferences')
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
