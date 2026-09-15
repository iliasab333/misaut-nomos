import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Euro,
  Star,
  Edit2,
  Trash2,
  Plus,
  FileText,
  Briefcase,
  MessageSquare,
  Clock,
  Bell,
  CheckCircle,
  Tag,
  History,
  Receipt,
  StickyNote,
  PhoneCall,
  Send,
  Users,
  TrendingUp,
  AlertCircle,
  Pin,
  X,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation, Trans } from "react-i18next";
import Loader from "@/components/ui/Loader";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ClientDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("id");
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [deleteActivityId, setDeleteActivityId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [formData, setFormData] = useState({});
  const [activityForm, setActivityForm] = useState({
    type: "note",
    title: "",
    description: "",
    is_reminder: false,
    reminder_date: "",
    is_pinned: false,
    amount: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.user_type !== 'professionnel') {
        navigate(createPageUrl("Search"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Search"));
    } finally {
      setLoading(false);
    }
  };

  // Cargar cliente
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.ClientContact.filter({ id: clientId });
      return clients[0];
    },
    enabled: !!clientId && !!user,
  });

  // Cargar actividades del cliente
  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['clientActivities', clientId],
    queryFn: () => base44.entities.ClientActivity.filter({ client_id: clientId }),
    enabled: !!clientId && !!user,
  });

  // Cargar trabajos del cliente
  const { data: jobs = [] } = useQuery({
    queryKey: ['clientJobs', clientId],
    queryFn: () => base44.entities.Job.filter({ client_contact_id: clientId }),
    enabled: !!clientId && !!user,
  });

  // Cargar facturas del cliente
  const { data: invoices = [] } = useQuery({
    queryKey: ['clientInvoices', clientId],
    queryFn: () => base44.entities.Invoice.filter({ client_contact_id: clientId }),
    enabled: !!clientId && !!user,
  });

  // Mutaciones
  const updateClientMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContact.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['client', clientId]);
      setShowEditDialog(false);
      toast.success(t('crm.toast.clientUpdated'));
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: () => base44.entities.ClientContact.delete(clientId),
    onSuccess: () => {
      toast.success(t('crm.toast.clientDeleted'));
      navigate(createPageUrl("CRM"));
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientActivity.create({
      ...data,
      professional_id: user.id,
      client_id: clientId,
      amount: data.amount ? parseFloat(data.amount) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientActivities', clientId]);
      setShowActivityDialog(false);
      resetActivityForm();
      toast.success(t('crm.toast.activityAdded'));
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientActivity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientActivities', clientId]);
      setShowActivityDialog(false);
      setEditingActivity(null);
      resetActivityForm();
      toast.success(t('crm.toast.activityUpdated'));
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientActivity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientActivities', clientId]);
      setDeleteActivityId(null);
      toast.success(t('crm.toast.activityDeleted'));
    },
  });

  const toggleReminderMutation = useMutation({
    mutationFn: ({ id, completed }) => base44.entities.ClientActivity.update(id, { reminder_completed: completed }),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientActivities', clientId]);
      toast.success(t('crm.toast.reminderUpdated'));
    },
  });

  const resetActivityForm = () => {
    setActivityForm({
      type: "note",
      title: "",
      description: "",
      is_reminder: false,
      reminder_date: "",
      is_pinned: false,
      amount: ""
    });
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setActivityForm({
      type: activity.type,
      title: activity.title,
      description: activity.description || "",
      is_reminder: activity.is_reminder || false,
      reminder_date: activity.reminder_date ? activity.reminder_date.split('T')[0] : "",
      is_pinned: activity.is_pinned || false,
      amount: activity.amount || ""
    });
    setShowActivityDialog(true);
  };

  const handleSubmitActivity = (e) => {
    e.preventDefault();
    const data = {
      ...activityForm,
      reminder_date: activityForm.is_reminder && activityForm.reminder_date 
        ? new Date(activityForm.reminder_date).toISOString() 
        : undefined
    };
    
    if (editingActivity) {
      updateActivityMutation.mutate({ id: editingActivity.id, data });
    } else {
      createActivityMutation.mutate(data);
    }
  };

  const openEditClient = () => {
    setFormData({
      client_name: client.client_name || "",
      client_email: client.client_email || "",
      client_phone: client.client_phone || "",
      client_nif: client.client_nif || "",
      company: client.company || "",
      address: client.address || "",
      city: client.city || "",
      postal_code: client.postal_code || "",
      status: client.status || "lead",
      source: client.source || "",
      notes: client.notes || "",
      estimated_value: client.estimated_value || "",
      segment: client.segment || "",
      preferred_contact_method: client.preferred_contact_method || "any",
      rating: client.rating || "",
      tags: client.tags?.join(", ") || "",
      next_followup_date: client.next_followup_date || "",
      birthday: client.birthday || ""
    });
    setShowEditDialog(true);
  };

  const handleSubmitClient = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined,
      rating: formData.rating ? parseInt(formData.rating) : undefined,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(t => t) : [],
      last_contact_date: new Date().toISOString()
    };
    updateClientMutation.mutate(data);
  };

  if (loading || loadingClient) return <Loader />;
  
  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('crm.detail.notFoundTitle')}</h2>
            <p className="text-gray-600 mb-4">{t('crm.detail.notFoundDescription')}</p>
            <Button onClick={() => navigate(createPageUrl("CRM"))}>
              {t('crm.actions.backToCrm')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular estadísticas
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const pendingReminders = activities.filter(a => a.is_reminder && !a.reminder_completed);
  const pinnedNotes = activities.filter(a => a.is_pinned);

  const getStatusBadge = (status) => {
    const config = {
      lead: { color: "bg-yellow-100 text-yellow-800", label: t('crm.status.lead') },
      contacted: { color: "bg-blue-100 text-blue-800", label: t('crm.status.contacted') },
      negotiating: { color: "bg-purple-100 text-purple-800", label: t('crm.status.negotiating') },
      client: { color: "bg-green-100 text-green-800", label: t('clientLabel') },
      inactive: { color: "bg-gray-100 text-gray-800", label: t('crm.status.inactive') },
      vip: { color: "bg-amber-100 text-amber-800", label: t('crm.status.vip') },
    };
    const c = config[status] || config.lead;
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  const getActivityIcon = (type) => {
    const icons = {
      note: <StickyNote className="w-4 h-4" />,
      call: <PhoneCall className="w-4 h-4" />,
      email: <Send className="w-4 h-4" />,
      meeting: <Users className="w-4 h-4" />,
      reminder: <Bell className="w-4 h-4" />,
      payment: <Euro className="w-4 h-4" />,
      job_completed: <CheckCircle className="w-4 h-4" />,
      quote_sent: <FileText className="w-4 h-4" />,
      invoice_sent: <Receipt className="w-4 h-4" />,
      other: <MessageSquare className="w-4 h-4" />
    };
    return icons[type] || icons.other;
  };

  const getActivityTypeLabel = (type) => {
    const labels = {
      note: t('crm.activityType.note'),
      call: t('crm.activityType.call'),
      email: t('emailField'),
      meeting: t('crm.activityType.meeting'),
      reminder: t('crm.activityType.reminder'),
      payment: t('crm.activityType.payment'),
      job_completed: t('crm.activityType.jobCompleted'),
      quote_sent: t('crm.activityType.quoteSent'),
      invoice_sent: t('crm.activityType.invoiceSent'),
      other: t('crm.activityType.other')
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl("CRM"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('crm.actions.backToCrm')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditClient}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </Button>
          </div>
        </div>

        {/* Información del cliente */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{client.client_name}</h1>
                  {getStatusBadge(client.status)}
                  {client.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < client.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  )}
                </div>
                
                {client.company && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {client.company}
                  </p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {client.client_email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${client.client_email}`} className="hover:text-blue-600">{client.client_email}</a>
                    </div>
                  )}
                  {client.client_phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${client.client_phone}`} className="hover:text-blue-600">{client.client_phone}</a>
                    </div>
                  )}
                  {(client.address || client.city) && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {[client.address, client.city].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
                
                {client.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats rápidos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:w-auto">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{jobs.length}</p>
                  <p className="text-xs text-blue-600">{t('crm.detail.jobs')}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{totalPaid.toFixed(0)}€</p>
                  <p className="text-xs text-green-600">{t('crm.detail.paid')}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{invoices.length}</p>
                  <p className="text-xs text-purple-600">{t('nav.invoices')}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{pendingReminders.length}</p>
                  <p className="text-xs text-amber-600">{t('crm.detail.reminders')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white shadow-sm p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg">{t('crm.detail.tabOverview')}</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg">{t('crm.detail.tabHistory')}</TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-lg">{t('crm.detail.tabJobs', { count: jobs.length })}</TabsTrigger>
            <TabsTrigger value="invoices" className="rounded-lg">{t('crm.detail.tabInvoices', { count: invoices.length })}</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-lg">{t('crm.form.notes')}</TabsTrigger>
          </TabsList>

          {/* Tab: Resumen */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notas fijadas */}
              {pinnedNotes.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pin className="w-5 h-5 text-amber-600" />
                      {t('crm.detail.pinnedNotes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pinnedNotes.map(note => (
                      <div key={note.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="font-medium text-gray-900">{note.title}</h4>
                        {note.description && (
                          <p className="text-sm text-gray-600 mt-1">{note.description}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recordatorios pendientes */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-600" />
                      {t('crm.detail.reminders')}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => {
                      resetActivityForm();
                      setActivityForm(prev => ({ ...prev, type: "reminder", is_reminder: true }));
                      setShowActivityDialog(true);
                    }}>
                      <Plus className="w-4 h-4 mr-1" />
                      {t('crm.detail.add')}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingReminders.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">{t('crm.detail.noPendingReminders')}</p>
                  ) : (
                    <div className="space-y-2">
                      {pendingReminders.map(reminder => (
                        <div key={reminder.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            checked={reminder.reminder_completed}
                            onCheckedChange={(checked) => toggleReminderMutation.mutate({ id: reminder.id, completed: checked })}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{reminder.title}</p>
                            {reminder.reminder_date && (
                              <p className="text-xs text-gray-500">
                                {format(new Date(reminder.reminder_date), "d MMM yyyy", { locale: es })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Información adicional */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    {t('crm.detail.info')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {client.client_nif && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crm.detail.nifCif')}</span>
                      <span className="font-medium">{client.client_nif}</span>
                    </div>
                  )}
                  {client.segment && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crm.form.segment')}</span>
                      <Badge variant="outline">{client.segment}</Badge>
                    </div>
                  )}
                  {client.source && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crm.detail.source')}</span>
                      <span className="font-medium">{client.source}</span>
                    </div>
                  )}
                  {client.preferred_contact_method && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crm.detail.preferredContact')}</span>
                      <span className="font-medium capitalize">{client.preferred_contact_method}</span>
                    </div>
                  )}
                  {client.next_followup_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crm.detail.nextFollowup')}</span>
                      <span className="font-medium">{format(new Date(client.next_followup_date), "d MMM yyyy", { locale: es })}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notas generales */}
              {client.notes && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      {t('crm.form.notes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Historial */}
          <TabsContent value="history">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    {t('crm.detail.activityHistory')}
                  </span>
                  <Button onClick={() => { resetActivityForm(); setShowActivityDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('crm.detail.addActivity')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingActivities ? (
                  <Loader />
                ) : activities.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t('crm.detail.noActivities')}</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {activities
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .map(activity => (
                          <div key={activity.id} className="relative pl-10">
                            <div className="absolute left-2 w-5 h-5 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center">
                              {getActivityIcon(activity.type)}
                            </div>
                            <Card className="border shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs">
                                        {getActivityTypeLabel(activity.type)}
                                      </Badge>
                                      {activity.is_pinned && (
                                        <Pin className="w-3 h-3 text-amber-500" />
                                      )}
                                      {activity.is_reminder && !activity.reminder_completed && (
                                        <Bell className="w-3 h-3 text-blue-500" />
                                      )}
                                    </div>
                                    <h4 className="font-medium text-gray-900">{activity.title}</h4>
                                    {activity.description && (
                                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                                    )}
                                    {activity.amount && (
                                      <p className="text-sm font-medium text-green-600 mt-1">{activity.amount}€</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">
                                      {format(new Date(activity.created_date), t('crm.detail.dateTimeFormat'), { locale: es })}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => handleEditActivity(activity)}>
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => setDeleteActivityId(activity.id)}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Trabajos */}
          <TabsContent value="jobs">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    {t('crm.detail.jobs')}
                  </span>
                  <Button onClick={() => navigate(createPageUrl("Jobs") + `?client_id=${clientId}`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('crm.detail.newJob')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t('crm.detail.noJobs')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map(job => (
                      <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <h4 className="font-medium text-gray-900">{job.title}</h4>
                          {job.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">{job.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            {job.start_date && <span>{t('crm.detail.jobStart', { date: format(new Date(job.start_date), "d MMM", { locale: es }) })}</span>}
                            {job.final_cost && <span className="text-green-600 font-medium">{job.final_cost}€</span>}
                          </div>
                        </div>
                        <Badge className={
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {job.status === 'completed' ? t('crm.detail.jobStatus.completed') :
                           job.status === 'in_progress' ? t('crm.detail.jobStatus.inProgress') :
                           job.status === 'cancelled' ? t('crm.detail.jobStatus.cancelled') : t('crm.detail.jobStatus.pending')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Facturas */}
          <TabsContent value="invoices">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-purple-600" />
                    {t('nav.invoices')}
                  </span>
                  <Button onClick={() => navigate(createPageUrl("Invoices") + `?client_id=${clientId}`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newInvoice')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t('crm.detail.noInvoices')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate(createPageUrl("Invoices") + `?id=${invoice.id}`)}>
                        <div>
                          <h4 className="font-medium text-gray-900">{invoice.invoice_number}</h4>
                          <p className="text-sm text-gray-500">
                            {invoice.issue_date && format(new Date(invoice.issue_date), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-lg">{invoice.total?.toFixed(2)}€</span>
                          <Badge className={
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            invoice.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {invoice.status === 'paid' ? t('paid') :
                             invoice.status === 'sent' ? t('sent') :
                             invoice.status === 'overdue' ? t('overdue') :
                             invoice.status === 'cancelled' ? t('cancelled') : t('draft')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {/* Resumen */}
                    <Separator className="my-4" />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('crm.detail.totalInvoiced')}</span>
                      <span className="font-bold">{totalInvoiced.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('crm.detail.totalCollected')}</span>
                      <span className="font-bold text-green-600">{totalPaid.toFixed(2)}€</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Notas */}
          <TabsContent value="notes">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-amber-600" />
                    {t('crm.detail.internalNotes')}
                  </span>
                  <Button onClick={() => { resetActivityForm(); setActivityForm(prev => ({ ...prev, type: "note" })); setShowActivityDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('crm.actions.addNote')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.filter(a => a.type === 'note').length === 0 ? (
                  <div className="text-center py-8">
                    <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t('crm.detail.noNotes')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activities
                      .filter(a => a.type === 'note')
                      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.created_date) - new Date(a.created_date))
                      .map(note => (
                        <Card key={note.id} className={`border ${note.is_pinned ? 'border-amber-300 bg-amber-50' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {note.is_pinned && <Pin className="w-4 h-4 text-amber-500" />}
                                <h4 className="font-medium">{note.title}</h4>
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditActivity(note)}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteActivityId(note.id)}>
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            {note.description && (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-3">
                              {format(new Date(note.created_date), "d MMM yyyy", { locale: es })}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Editar Cliente */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('crm.detail.editClientTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitClient} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('crm.form.nameRequired')}</Label>
                <Input value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} required />
              </div>
              <div>
                <Label>{t('emailField')}</Label>
                <Input type="email" value={formData.client_email} onChange={(e) => setFormData({...formData, client_email: e.target.value})} />
              </div>
              <div>
                <Label>{t('phoneField')}</Label>
                <Input value={formData.client_phone} onChange={(e) => setFormData({...formData, client_phone: e.target.value})} />
              </div>
              <div>
                <Label>{t('crm.detail.nifCif')}</Label>
                <Input value={formData.client_nif} onChange={(e) => setFormData({...formData, client_nif: e.target.value})} />
              </div>
              <div>
                <Label>{t('crm.form.company')}</Label>
                <Input value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
              </div>
              <div>
                <Label>{t('crm.form.status')}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">{t('crm.status.lead')}</SelectItem>
                    <SelectItem value="contacted">{t('crm.status.contacted')}</SelectItem>
                    <SelectItem value="negotiating">{t('crm.status.negotiating')}</SelectItem>
                    <SelectItem value="client">{t('clientLabel')}</SelectItem>
                    <SelectItem value="vip">{t('crm.status.vip')}</SelectItem>
                    <SelectItem value="inactive">{t('crm.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('crm.form.segment')}</Label>
                <Select value={formData.segment || ""} onValueChange={(v) => setFormData({...formData, segment: v})}>
                  <SelectTrigger><SelectValue placeholder={t('crm.form.selectPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">{t('crm.segment.residential')}</SelectItem>
                    <SelectItem value="commercial">{t('crm.segment.commercial')}</SelectItem>
                    <SelectItem value="industrial">{t('crm.segment.industrial')}</SelectItem>
                    <SelectItem value="government">{t('crm.segment.government')}</SelectItem>
                    <SelectItem value="other">{t('crm.segment.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('crm.detail.rating')}</Label>
                <Select value={formData.rating?.toString() || ""} onValueChange={(v) => setFormData({...formData, rating: v})}>
                  <SelectTrigger><SelectValue placeholder={t('crm.detail.ratingPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">⭐ 1</SelectItem>
                    <SelectItem value="2">⭐⭐ 2</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ 3</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ 4</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('crm.detail.preferredContact')}</Label>
                <Select value={formData.preferred_contact_method || "any"} onValueChange={(v) => setFormData({...formData, preferred_contact_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t('crm.form.any')}</SelectItem>
                    <SelectItem value="email">{t('emailField')}</SelectItem>
                    <SelectItem value="phone">{t('phoneField')}</SelectItem>
                    <SelectItem value="whatsapp">{t('profile_page.whatsapp')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('crm.form.estimatedValue')}</Label>
                <Input type="number" value={formData.estimated_value} onChange={(e) => setFormData({...formData, estimated_value: e.target.value})} />
              </div>
              <div>
                <Label>{t('crm.detail.source')}</Label>
                <Input value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} />
              </div>
              <div>
                <Label>{t('crm.detail.nextFollowup')}</Label>
                <Input type="date" value={formData.next_followup_date} onChange={(e) => setFormData({...formData, next_followup_date: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>{t('clientAddress')}</Label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('city')}</Label>
                <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              </div>
              <div>
                <Label>{t('postalCode')}</Label>
                <Input value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>{t('crm.form.tags')}</Label>
              <Input value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} placeholder={t('crm.detail.tagsPlaceholder')} />
            </div>
            <div>
              <Label>{t('crm.form.notes')}</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={updateClientMutation.isPending}>
                {updateClientMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Actividad */}
      <Dialog open={showActivityDialog} onOpenChange={(open) => { setShowActivityDialog(open); if (!open) { setEditingActivity(null); resetActivityForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivity ? t('crm.detail.editActivity') : t('crm.detail.newActivity')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitActivity} className="space-y-4">
            <div>
              <Label>{t('crm.form.type')}</Label>
              <Select value={activityForm.type} onValueChange={(v) => setActivityForm({...activityForm, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">{t('crm.activityType.note')}</SelectItem>
                  <SelectItem value="call">{t('crm.activityType.call')}</SelectItem>
                  <SelectItem value="email">{t('emailField')}</SelectItem>
                  <SelectItem value="meeting">{t('crm.activityType.meeting')}</SelectItem>
                  <SelectItem value="reminder">{t('crm.activityType.reminder')}</SelectItem>
                  <SelectItem value="payment">{t('crm.activityType.paymentReceived')}</SelectItem>
                  <SelectItem value="quote_sent">{t('crm.activityType.quoteSent')}</SelectItem>
                  <SelectItem value="other">{t('crm.activityType.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('crm.detail.titleRequired')}</Label>
              <Input value={activityForm.title} onChange={(e) => setActivityForm({...activityForm, title: e.target.value})} required />
            </div>
            <div>
              <Label>{t('description')}</Label>
              <Textarea value={activityForm.description} onChange={(e) => setActivityForm({...activityForm, description: e.target.value})} rows={3} />
            </div>
            {(activityForm.type === 'payment' || activityForm.type === 'quote_sent') && (
              <div>
                <Label>{t('crm.detail.amount')}</Label>
                <Input type="number" value={activityForm.amount} onChange={(e) => setActivityForm({...activityForm, amount: e.target.value})} />
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={activityForm.is_reminder} onCheckedChange={(checked) => setActivityForm({...activityForm, is_reminder: checked})} />
                <Label className="cursor-pointer">{t('crm.detail.isReminder')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={activityForm.is_pinned} onCheckedChange={(checked) => setActivityForm({...activityForm, is_pinned: checked})} />
                <Label className="cursor-pointer">{t('crm.detail.pinNote')}</Label>
              </div>
            </div>
            {activityForm.is_reminder && (
              <div>
                <Label>{t('crm.detail.reminderDate')}</Label>
                <Input type="date" value={activityForm.reminder_date} onChange={(e) => setActivityForm({...activityForm, reminder_date: e.target.value})} />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowActivityDialog(false); setEditingActivity(null); resetActivityForm(); }}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createActivityMutation.isPending || updateActivityMutation.isPending}>
                {(createActivityMutation.isPending || updateActivityMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingActivity ? t('common.save') : t('crm.detail.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar Cliente */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('crm.deleteClient.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="crm.detail.deleteClientDescription"
                values={{ name: client?.client_name }}
                components={{ 1: <strong /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteClientMutation.mutate()} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Eliminar Actividad */}
      <AlertDialog open={!!deleteActivityId} onOpenChange={() => setDeleteActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('crm.detail.deleteActivityTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('crm.detail.deleteActivityDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteActivityMutation.mutate(deleteActivityId)} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}