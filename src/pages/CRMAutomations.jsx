import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  ArrowLeft,
  Plus,
  Zap,
  Tag,
  Bell,
  Mail,
  Calendar,
  Users,
  Edit2,
  Trash2,
  Play,
  Pause,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  TrendingUp,
  Gift,
  Briefcase,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Loader from "@/components/ui/Loader";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Los catálogos reciben `t`: a nivel de módulo se evaluarían una sola vez al
// importar y no se retraducirían al cambiar de idioma.
const getTriggerTypes = (t) => ({
  client_created: { label: t('crm.automations.triggerTypes.clientCreated'), icon: Users, color: "bg-blue-100 text-blue-700" },
  status_changed: { label: t('crm.automations.triggerTypes.statusChanged'), icon: RefreshCw, color: "bg-purple-100 text-purple-700" },
  job_completed: { label: t('crm.automations.triggerTypes.jobCompleted'), icon: Briefcase, color: "bg-green-100 text-green-700" },
  jobs_count: { label: t('crm.automations.triggerTypes.jobsCount'), icon: TrendingUp, color: "bg-amber-100 text-amber-700" },
  days_inactive: { label: t('crm.automations.triggerTypes.daysInactive'), icon: Clock, color: "bg-red-100 text-red-700" },
  birthday: { label: t('crm.automations.triggerTypes.birthday'), icon: Gift, color: "bg-pink-100 text-pink-700" },
  contract_end: { label: t('crm.automations.triggerTypes.contractEnd'), icon: Calendar, color: "bg-orange-100 text-orange-700" },
});

const getActionTypes = (t) => ({
  add_tag: { label: t('crm.automations.actionTypes.addTag'), icon: Tag },
  remove_tag: { label: t('crm.automations.actionTypes.removeTag'), icon: Tag },
  change_status: { label: t('crm.automations.actionTypes.changeStatus'), icon: RefreshCw },
  change_segment: { label: t('crm.automations.actionTypes.changeSegment'), icon: Users },
  create_reminder: { label: t('crm.automations.actionTypes.createReminder'), icon: Bell },
  create_activity: { label: t('crm.automations.actionTypes.createActivity'), icon: CheckCircle },
});

export default function CRMAutomationsPage() {
  const { t } = useTranslation();
  const TRIGGER_TYPES = getTriggerTypes(t);
  const ACTION_TYPES = getActionTypes(t);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    type: "sequence",
    trigger: { event: "client_created", conditions: {} },
    actions: [{ type: "add_tag", delay_days: 0, params: {} }],
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

  const { data: automations = [], isLoading: loadingAutomations } = useQuery({
    queryKey: ['automations', user?.id],
    queryFn: () => base44.entities.CRMAutomation.filter({ professional_id: user.id }),
    enabled: !!user,
  });

  const { data: executions = [] } = useQuery({
    queryKey: ['executions', user?.id],
    queryFn: () => base44.entities.AutomationExecution.filter({ professional_id: user.id }),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CRMAutomation.create({ ...data, professional_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['automations']);
      setShowDialog(false);
      resetForm();
      toast.success(t('crm.toast.automationCreated'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CRMAutomation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['automations']);
      setShowDialog(false);
      resetForm();
      toast.success(t('crm.toast.automationUpdated'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CRMAutomation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['automations']);
      setDeleteDialog(null);
      toast.success(t('crm.toast.automationDeleted'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.CRMAutomation.update(id, { is_active }),
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries(['automations']);
      toast.success(is_active ? t('crm.toast.automationActivated') : t('crm.toast.automationPaused'));
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "sequence",
      trigger: { event: "client_created", conditions: {} },
      actions: [{ type: "add_tag", delay_days: 0, params: {} }],
    });
    setEditingAutomation(null);
  };

  const handleEdit = (automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      type: automation.type,
      trigger: automation.trigger || { event: "client_created", conditions: {} },
      actions: automation.actions || [{ type: "add_tag", delay_days: 0, params: {} }],
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAutomation) {
      updateMutation.mutate({ id: editingAutomation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { type: "add_tag", delay_days: 0, params: {} }]
    });
  };

  const removeAction = (index) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const updateAction = (index, field, value) => {
    const newActions = [...formData.actions];
    if (field === 'params') {
      newActions[index] = { ...newActions[index], params: { ...newActions[index].params, ...value } };
    } else {
      newActions[index] = { ...newActions[index], [field]: value };
    }
    setFormData({ ...formData, actions: newActions });
  };

  const updateTriggerCondition = (field, value) => {
    setFormData({
      ...formData,
      trigger: {
        ...formData.trigger,
        conditions: { ...formData.trigger.conditions, [field]: value }
      }
    });
  };

  if (loading) return <Loader />;

  const filteredAutomations = automations.filter(a => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return a.is_active;
    if (activeTab === "inactive") return !a.is_active;
    return a.type === activeTab;
  });

  const stats = {
    total: automations.length,
    active: automations.filter(a => a.is_active).length,
    executions: executions.filter(e => e.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl("CRM"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('crm.actions.backToCrm')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('crm.automations.title')}</h1>
              <p className="text-gray-600">{t('crm.automations.subtitle')}</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            {t('crm.automations.newAutomation')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">{t('total')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-gray-500">{t('crm.automations.active')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.executions}</p>
                <p className="text-xs text-gray-500">{t('crm.automations.statExecutions')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs y lista */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="all">{t('crm.automations.tabAll')}</TabsTrigger>
            <TabsTrigger value="active">{t('crm.automations.active')}</TabsTrigger>
            <TabsTrigger value="sequence">{t('crm.automations.tabSequences')}</TabsTrigger>
            <TabsTrigger value="auto_tag">{t('crm.automations.tabAutoTags')}</TabsTrigger>
            <TabsTrigger value="auto_reminder">{t('crm.automations.tabReminders')}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loadingAutomations ? (
              <Loader />
            ) : filteredAutomations.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('crm.automations.emptyTitle')}</h3>
                  <p className="text-gray-600 mb-6">{t('crm.automations.emptyDescription')}</p>
                  <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('crm.automations.createAutomation')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAutomations.map(automation => {
                  const triggerConfig = TRIGGER_TYPES[automation.trigger?.event];
                  const TriggerIcon = triggerConfig?.icon || Zap;
                  
                  return (
                    <Card key={automation.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${triggerConfig?.color || 'bg-gray-100'}`}>
                              <TriggerIcon className="w-6 h-6" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900">{automation.name}</h3>
                                <Badge variant={automation.is_active ? "default" : "secondary"} className={automation.is_active ? "bg-green-100 text-green-800" : ""}>
                                  {automation.is_active ? t('crm.automations.statusActive') : t('crm.automations.statusPaused')}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {automation.type === 'sequence' ? t('crm.automations.typeSequence') :
                                   automation.type === 'auto_tag' ? t('crm.automations.typeAutoTag') : t('crm.automations.typeReminder')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {t('crm.automations.triggerSummary', { trigger: triggerConfig?.label || automation.trigger?.event })}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {t('crm.automations.actionsCount', { count: automation.actions?.length || 0 })} • {t('crm.automations.executedTimes', { count: automation.execution_count || 0 })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Switch
                              checked={automation.is_active}
                              onCheckedChange={(checked) => toggleMutation.mutate({ id: automation.id, is_active: checked })}
                            />
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(automation)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteDialog(automation)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Plantillas predefinidas */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t('crm.automations.quickTemplates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setFormData({
                    name: t('crm.automations.templates.welcome.name'),
                    type: "sequence",
                    trigger: { event: "client_created", conditions: { status: "lead" } },
                    actions: [
                      { type: "create_activity", delay_days: 0, params: { title: t('crm.automations.templates.welcome.activityTitle'), activity_type: "note" } },
                      { type: "create_reminder", delay_days: 3, params: { title: t('crm.automations.templates.welcome.firstFollowup') } },
                      { type: "create_reminder", delay_days: 7, params: { title: t('crm.automations.templates.welcome.secondFollowup') } },
                    ],
                  });
                  setShowDialog(true);
                }}
                className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
              >
                <Mail className="w-8 h-8 text-blue-600 mb-2" />
                <h4 className="font-semibold">{t('crm.automations.templates.welcome.title')}</h4>
                <p className="text-sm text-gray-500">{t('crm.automations.templates.welcome.description')}</p>
              </button>

              <button
                onClick={() => {
                  setFormData({
                    name: t('crm.automations.templates.recurring.name'),
                    type: "auto_tag",
                    trigger: { event: "jobs_count", conditions: { min_jobs: 2 } },
                    actions: [
                      { type: "add_tag", delay_days: 0, params: { tag: t('crm.automations.templates.recurring.tag') } },
                      { type: "change_status", delay_days: 0, params: { status: "vip" } },
                    ],
                  });
                  setShowDialog(true);
                }}
                className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all text-left"
              >
                <Tag className="w-8 h-8 text-amber-600 mb-2" />
                <h4 className="font-semibold">{t('crm.automations.templates.recurring.title')}</h4>
                <p className="text-sm text-gray-500">{t('crm.automations.templates.recurring.description')}</p>
              </button>

              <button
                onClick={() => {
                  setFormData({
                    name: t('crm.automations.templates.birthday.name'),
                    type: "auto_reminder",
                    trigger: { event: "birthday", conditions: {} },
                    actions: [
                      { type: "create_reminder", delay_days: 0, params: { title: t('crm.automations.templates.birthday.reminderTitle') } },
                    ],
                  });
                  setShowDialog(true);
                }}
                className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-all text-left"
              >
                <Gift className="w-8 h-8 text-pink-600 mb-2" />
                <h4 className="font-semibold">{t('crm.automations.templates.birthday.title')}</h4>
                <p className="text-sm text-gray-500">{t('crm.automations.templates.birthday.description')}</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog crear/editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAutomation ? t('crm.automations.editAutomation') : t('crm.automations.newAutomation')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre y tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('crm.form.nameRequired')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('crm.automations.namePlaceholder')}
                  required
                />
              </div>
              <div>
                <Label>{t('crm.form.type')}</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequence">{t('crm.automations.typeSequenceFull')}</SelectItem>
                    <SelectItem value="auto_tag">{t('crm.automations.typeAutoTagFull')}</SelectItem>
                    <SelectItem value="auto_reminder">{t('crm.automations.typeReminderFull')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Disparador */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('crm.automations.trigger')}</Label>
              <Select 
                value={formData.trigger.event} 
                onValueChange={(v) => setFormData({ ...formData, trigger: { ...formData.trigger, event: v, conditions: {} } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Condiciones según el disparador */}
              {formData.trigger.event === "status_changed" && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-xs">{t('crm.automations.previousStatus')}</Label>
                    <Select value={formData.trigger.conditions.from_status || ""} onValueChange={(v) => updateTriggerCondition('from_status', v)}>
                      <SelectTrigger><SelectValue placeholder={t('crm.form.any')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">{t('crm.form.any')}</SelectItem>
                        <SelectItem value="lead">{t('crm.status.lead')}</SelectItem>
                        <SelectItem value="contacted">{t('crm.status.contacted')}</SelectItem>
                        <SelectItem value="negotiating">{t('crm.status.negotiating')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t('crm.automations.newStatus')}</Label>
                    <Select value={formData.trigger.conditions.to_status || ""} onValueChange={(v) => updateTriggerCondition('to_status', v)}>
                      <SelectTrigger><SelectValue placeholder={t('crm.form.select')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">{t('clientLabel')}</SelectItem>
                        <SelectItem value="vip">{t('crm.status.vip')}</SelectItem>
                        <SelectItem value="inactive">{t('crm.status.inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formData.trigger.event === "jobs_count" && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Label className="text-xs">{t('crm.automations.minJobs')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.trigger.conditions.min_jobs || ""}
                    onChange={(e) => updateTriggerCondition('min_jobs', parseInt(e.target.value))}
                    placeholder="2"
                  />
                </div>
              )}

              {formData.trigger.event === "days_inactive" && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Label className="text-xs">{t('crm.automations.triggerTypes.daysInactive')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.trigger.conditions.days || ""}
                    onChange={(e) => updateTriggerCondition('days', parseInt(e.target.value))}
                    placeholder="30"
                  />
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('crm.automations.actions')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAction}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('crm.automations.addAction')}
                </Button>
              </div>

              {formData.actions.map((action, index) => (
                <Card key={index} className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{t('crm.automations.actionNumber', { number: index + 1 })}</Badge>
                      {formData.actions.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAction(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{t('crm.automations.actionType')}</Label>
                        <Select value={action.type} onValueChange={(v) => updateAction(index, 'type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACTION_TYPES).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">{t('crm.automations.delayDays')}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={action.delay_days}
                          onChange={(e) => updateAction(index, 'delay_days', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {/* Parámetros según tipo de acción */}
                    {(action.type === "add_tag" || action.type === "remove_tag") && (
                      <div>
                        <Label className="text-xs">{t('crm.form.tag')}</Label>
                        <Input
                          value={action.params.tag || ""}
                          onChange={(e) => updateAction(index, 'params', { tag: e.target.value })}
                          placeholder={t('crm.automations.tagPlaceholder')}
                        />
                      </div>
                    )}

                    {action.type === "change_status" && (
                      <div>
                        <Label className="text-xs">{t('crm.automations.newStatus')}</Label>
                        <Select value={action.params.status || ""} onValueChange={(v) => updateAction(index, 'params', { status: v })}>
                          <SelectTrigger><SelectValue placeholder={t('crm.form.select')} /></SelectTrigger>
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
                    )}

                    {action.type === "change_segment" && (
                      <div>
                        <Label className="text-xs">{t('crm.automations.newSegment')}</Label>
                        <Select value={action.params.segment || ""} onValueChange={(v) => updateAction(index, 'params', { segment: v })}>
                          <SelectTrigger><SelectValue placeholder={t('crm.form.select')} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="residential">{t('crm.segment.residential')}</SelectItem>
                            <SelectItem value="commercial">{t('crm.segment.commercial')}</SelectItem>
                            <SelectItem value="industrial">{t('crm.segment.industrial')}</SelectItem>
                            <SelectItem value="government">{t('crm.segment.governmentShort')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {action.type === "create_reminder" && (
                      <div>
                        <Label className="text-xs">{t('crm.automations.reminderTitle')}</Label>
                        <Input
                          value={action.params.title || ""}
                          onChange={(e) => updateAction(index, 'params', { title: e.target.value })}
                          placeholder={t('crm.automations.reminderTitlePlaceholder')}
                        />
                      </div>
                    )}

                    {action.type === "create_activity" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{t('crm.automations.activityTitle')}</Label>
                          <Input
                            value={action.params.title || ""}
                            onChange={(e) => updateAction(index, 'params', { title: e.target.value })}
                            placeholder={t('crm.automations.activityTitlePlaceholder')}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t('crm.automations.activityType')}</Label>
                          <Select value={action.params.activity_type || "note"} onValueChange={(v) => updateAction(index, 'params', { activity_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="note">{t('crm.activityType.note')}</SelectItem>
                              <SelectItem value="call">{t('crm.activityType.call')}</SelectItem>
                              <SelectItem value="email">{t('emailField')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingAutomation ? t('common.save') : t('crm.automations.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog eliminar */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('crm.automations.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('crm.automations.deleteDescription', { name: deleteDialog?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteDialog.id)} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}