import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bell, Check, CheckCheck, CheckSquare, Trash2, Mail, Star, AlertCircle, Info, Loader2, Settings, FileText, Clock, MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

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
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'new_review':
        return <Star className="w-5 h-5 text-amber-500" />;
      case 'review_reminder':
        return <Star className="w-5 h-5 text-amber-500" />;
      case 'subscription_expiring':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'subscription_expired':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'profile_approved':
        return <CheckCheck className="w-5 h-5 text-green-500" />;
      case 'system_update':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      </div>
    );
  }

  const isProfessional = user.user_type === 'professionnel';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 md:p-8 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('notifications.title')}</h1>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="bg-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('notifications.page.configure')}</span>
            </Button>
          </div>
          <p className="text-xs md:text-sm text-gray-600">{t('notifications.page.subtitle')}</p>
        </div>

        {/* Alertas pendientes */}
        {isProfessional && (upcomingTasks.length > 0 || upcomingInvoices.length > 0 || pendingQuotes.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {upcomingTasks.length > 0 && (
              <Card className="border-0 shadow-sm bg-green-50 border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare className="w-4 h-4 text-green-600" />
                    <h3 className="font-semibold text-sm text-gray-900">{t('notifications.page.upcomingTasks')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{upcomingTasks.length}</p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-2 h-7 text-xs"
                    onClick={() => navigate(createPageUrl("Calendar"))}
                  >
                    {t('notifications.page.viewCalendar')}
                  </Button>
                </CardContent>
              </Card>
            )}
            {upcomingInvoices.length > 0 && (
              <Card className="border-0 shadow-sm bg-orange-50 border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <h3 className="font-semibold text-sm text-gray-900">{t('notifications.page.invoicesDue')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{upcomingInvoices.length}</p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-2 h-7 text-xs"
                    onClick={() => navigate(createPageUrl("Invoices"))}
                  >
                    {t('notifications.page.viewInvoices')}
                  </Button>
                </CardContent>
              </Card>
            )}
            {pendingQuotes.length > 0 && (
              <Card className="border-0 shadow-sm bg-blue-50 border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-sm text-gray-900">{t('notifications.page.pendingQuotes')}</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{pendingQuotes.length}</p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-2 h-7 text-xs"
                    onClick={() => navigate(createPageUrl("Presupuestos"))}
                  >
                    {t('notifications.page.viewQuotes')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="all">
                {t('notifications.page.tabAll', { count: notifications.length })}
              </TabsTrigger>
              <TabsTrigger value="unread">
                {t('notifications.page.tabUnread', { count: unreadCount })}
              </TabsTrigger>
              <TabsTrigger value="read">
                {t('notifications.page.tabRead', { count: notifications.length - unreadCount })}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2 w-full md:w-auto">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="flex-1 md:flex-none bg-white"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('notifications.page.markAll')}</span>
                <span className="sm:hidden">{t('notifications.page.mark')}</span>
              </Button>
            )}
            
            {notifications.some(n => n.is_read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteAllReadMutation.mutate()}
                disabled={deleteAllReadMutation.isPending}
                className="flex-1 md:flex-none bg-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('notifications.page.deleteRead')}</span>
                <span className="sm:hidden">{t('common.delete')}</span>
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="shadow-sm border-0">
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {filter === 'unread' ? t('notifications.page.emptyUnread') : 
                 filter === 'read' ? t('notifications.page.emptyRead') : 
                 t('notifications.empty')}
              </h2>
              <p className="text-gray-600">
                {t('notifications.emptyHint')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`shadow-sm border-0 cursor-pointer transition-all hover:shadow-md active:scale-98 ${
                  !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-white'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <h3 className={`text-sm md:text-base font-semibold truncate ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <Badge className="bg-blue-600 flex-shrink-0 text-xs">{t('notifications.page.newBadge')}</Badge>
                        )}
                      </div>

                      <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 line-clamp-2">
                        {notification.message}
                      </p>

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <p className="text-xs text-gray-400">
                          {format(new Date(notification.created_date), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                        </p>

                        <div className="flex gap-2">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              {t('notifications.page.mark')}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Configuración de notificaciones */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t('notifications.settings.title')}
            </DialogTitle>
          </DialogHeader>

          {notifPrefs && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">{t('notifications.settings.channels')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">{t('notifications.settings.email')}</Label>
                      <p className="text-xs text-gray-500">{t('notifications.settings.emailHint')}</p>
                    </div>
                    <Switch
                      checked={notifPrefs.email_enabled}
                      onCheckedChange={(v) => setNotifPrefs({...notifPrefs, email_enabled: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">{t('notifications.settings.push')}</Label>
                      <p className="text-xs text-gray-500">{t('notifications.settings.pushHint')}</p>
                    </div>
                    <Switch
                      checked={notifPrefs.push_enabled}
                      onCheckedChange={(v) => setNotifPrefs({...notifPrefs, push_enabled: v})}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-gray-900">{t('notifications.settings.alertTypes')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{t('notifications.settings.newMessages')}</Label>
                    <Switch
                      checked={notifPrefs.new_messages}
                      onCheckedChange={(v) => setNotifPrefs({...notifPrefs, new_messages: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{t('notifications.settings.quoteUpdates')}</Label>
                    <Switch
                      checked={notifPrefs.quote_updates}
                      onCheckedChange={(v) => setNotifPrefs({...notifPrefs, quote_updates: v})}
                    />
                  </div>
                  {isProfessional && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{t('notifications.settings.taskReminders')}</Label>
                        <Switch
                          checked={notifPrefs.task_reminders}
                          onCheckedChange={(v) => setNotifPrefs({...notifPrefs, task_reminders: v})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{t('notifications.settings.invoiceDue')}</Label>
                        <Switch
                          checked={notifPrefs.invoice_reminders}
                          onCheckedChange={(v) => setNotifPrefs({...notifPrefs, invoice_reminders: v})}
                        />
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{t('notifications.settings.subscriptionAlerts')}</Label>
                    <Switch
                      checked={notifPrefs.subscription_alerts}
                      onCheckedChange={(v) => setNotifPrefs({...notifPrefs, subscription_alerts: v})}
                    />
                  </div>
                </div>
              </div>

              {isProfessional && (
                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">{t('notifications.settings.reminderTimes')}</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">{t('notifications.settings.taskHoursBefore')}</Label>
                      <Input
                        type="number"
                        value={notifPrefs.task_reminder_hours_before}
                        onChange={(e) => setNotifPrefs({...notifPrefs, task_reminder_hours_before: Number(e.target.value)})}
                        className="mt-1"
                        min="1"
                        max="168"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t('notifications.settings.invoiceDaysBefore')}</Label>
                      <Input
                        type="number"
                        value={notifPrefs.invoice_reminder_days_before}
                        onChange={(e) => setNotifPrefs({...notifPrefs, invoice_reminder_days_before: Number(e.target.value)})}
                        className="mt-1"
                        min="1"
                        max="30"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={() => savePreferencesMutation.mutate(notifPrefs)}
              disabled={savePreferencesMutation.isPending}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savePreferencesMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('reviews.card.saving')}</>
              ) : (
                t('cookies.savePreferences')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
