import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  ArrowLeft, 
  Save,
  Plus,
  Trash2,
  Clock,
  FileText,
  Paperclip,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Play,
  Pause,
  X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('id');
  const isNew = searchParams.get('new') === 'true';
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client_name: "",
    status: "planning",
    priority: "medium",
    start_date: "",
    end_date: "",
    budget: "",
    color: "#3B82F6",
    client_visible: true
  });
  const [showPhaseDialog, setShowPhaseDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showTimeLogDialog, setShowTimeLogDialog] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin();
    } finally {
      setLoadingUser(false);
    }
  };

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId && !isNew,
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['phases', projectId],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: projectId }, 'order'),
    enabled: !!projectId && !isNew,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }, 'order'),
    enabled: !!projectId && !isNew,
  });

  const { data: timeLogs = [] } = useQuery({
    queryKey: ['timeLogs', projectId],
    queryFn: () => base44.entities.TimeLog.filter({ project_id: projectId }, '-date'),
    enabled: !!projectId && !isNew,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: () => base44.entities.ClientContact.filter({ professional_id: user.id }),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (project && !isNew) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        client_name: project.client_name || "",
        status: project.status || "planning",
        priority: project.priority || "medium",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        budget: project.budget || "",
        color: project.color || "#3B82F6",
        client_visible: project.client_visible ?? true
      });
    }
  }, [project, isNew]);

  const saveProjectMutation = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        return await base44.entities.Project.create({ ...data, professional_id: user.id });
      } else {
        return await base44.entities.Project.update(projectId, data);
      }
    },
    onSuccess: (savedProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success(t('projects.detail.saved'));
      if (isNew) {
        navigate(createPageUrl("ProjectDetail") + "?id=" + savedProject.id);
      }
    },
    onError: () => toast.error(t('projects.detail.saveError'))
  });

  const createPhaseMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectPhase.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phases'] });
      setShowPhaseDialog(false);
      toast.success(t('projects.phases.created'));
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectTask.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskDialog(false);
      toast.success(t('projects.tasks.created'));
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(t('projects.tasks.updated'));
    }
  });

  const createTimeLogMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeLog.create({ ...data, project_id: projectId, user_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeLogs'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTimeLogDialog(false);
      setSelectedTask(null);
      toast.success(t('projects.time.logged'));
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return {
            url: file_url,
            name: file.name,
            uploaded_at: new Date().toISOString()
          };
        })
      );
      
      const currentAttachments = project?.attachments || [];
      await base44.entities.Project.update(projectId, {
        attachments: [...currentAttachments, ...uploadedFiles]
      });
      
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success(t('projects.files.uploaded'));
    } catch (error) {
      toast.error(t('projects.files.uploadError'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error(t('projects.detail.nameRequired'));
      return;
    }
    saveProjectMutation.mutate(formData);
  };

  if (loadingUser || (loadingProject && !isNew)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isProfessional = user?.user_type === 'professionnel';
  const canEdit = isProfessional && (isNew || project?.professional_id === user.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Projects"))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Button>
          {canEdit && (
            <Button
              onClick={handleSave}
              disabled={saveProjectMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveProjectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t('common.save')}
            </Button>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">{t('projects.detail.tabs.overview')}</TabsTrigger>
            {!isNew && <TabsTrigger value="phases">{t('projects.phases.title')}</TabsTrigger>}
            {!isNew && <TabsTrigger value="tasks">{t('projects.tasks.title')}</TabsTrigger>}
            {!isNew && <TabsTrigger value="time">{t('projects.time.title')}</TabsTrigger>}
            {!isNew && <TabsTrigger value="files">{t('projects.files.title')}</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('projects.detail.infoTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('projects.detail.form.name')}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>{t('clientLabel')}</Label>
                    {canEdit ? (
                      <Select value={formData.client_name} onValueChange={(v) => setFormData({ ...formData, client_name: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('projects.detail.form.selectClient')} />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.client_name}>{client.client_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={formData.client_name} disabled />
                    )}
                  </div>
                </div>

                <div>
                  <Label>{t('description')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>{t('projects.status.label')}</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })} disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">{t('projects.status.planning')}</SelectItem>
                        <SelectItem value="in_progress">{t('projects.status.inProgress')}</SelectItem>
                        <SelectItem value="on_hold">{t('projects.status.onHold')}</SelectItem>
                        <SelectItem value="completed">{t('projects.status.completed')}</SelectItem>
                        <SelectItem value="cancelled">{t('projects.status.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('projects.priority.label')}</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })} disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('projects.priority.low')}</SelectItem>
                        <SelectItem value="medium">{t('projects.priority.medium')}</SelectItem>
                        <SelectItem value="high">{t('projects.priority.high')}</SelectItem>
                        <SelectItem value="urgent">{t('projects.priority.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('projects.detail.form.color')}</Label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 rounded border"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>{t('projects.detail.form.startDate')}</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>{t('projects.detail.form.endDate')}</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>{t('projects.detail.form.budget')}</Label>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {!isNew && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{t('projects.detail.progressTitle')}</span>
                      <span className="font-semibold">{project?.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={project?.progress_percentage || 0} className="h-3" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
                        <p className="text-sm text-gray-600">{t('projects.tasks.title')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{tasks.filter(task => task.status === 'completed').length}</p>
                        <p className="text-sm text-gray-600">{t('projects.detail.stats.completed')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{project?.total_hours_logged || 0}h</p>
                        <p className="text-sm text-gray-600">{t('projects.detail.stats.hours')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{phases.length}</p>
                        <p className="text-sm text-gray-600">{t('projects.phases.title')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {!isNew && (
            <>
              <TabsContent value="phases" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{t('projects.phases.heading')}</h2>
                  {canEdit && (
                    <Button onClick={() => setShowPhaseDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('projects.phases.new')}
                    </Button>
                  )}
                </div>

                {phases.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-600">{t('projects.phases.empty')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {phases.map(phase => (
                      <Card key={phase.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{phase.name}</CardTitle>
                              {phase.description && <p className="text-sm text-gray-600 mt-1">{phase.description}</p>}
                            </div>
                            <Badge>{phase.status === 'completed' ? t('projects.phases.status.completed') : phase.status === 'in_progress' ? t('projects.status.inProgress') : t('projects.status.pending')}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{t('projects.progress')}</span>
                              <span>{phase.progress_percentage}%</span>
                            </div>
                            <Progress value={phase.progress_percentage} />
                            {(phase.start_date || phase.end_date) && (
                              <div className="flex gap-4 text-sm text-gray-600 mt-2">
                                {phase.start_date && <span>{t('projects.phases.startLabel', { date: format(new Date(phase.start_date), 'dd/MM/yyyy') })}</span>}
                                {phase.end_date && <span>{t('projects.phases.endLabel', { date: format(new Date(phase.end_date), 'dd/MM/yyyy') })}</span>}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{t('projects.tasks.title')}</h2>
                  {canEdit && (
                    <Button onClick={() => setShowTaskDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('projects.tasks.new')}
                    </Button>
                  )}
                </div>

                {tasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-600">{t('projects.tasks.empty')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <Card key={task.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <button
                                onClick={() => {
                                  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                                  updateTaskMutation.mutate({ id: task.id, data: { status: newStatus } });
                                }}
                                disabled={!canEdit}
                              >
                                {task.status === 'completed' ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                              <div className="flex-1">
                                <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                  {task.name}
                                </h4>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                )}
                                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                  {task.due_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(task.due_date), 'dd/MM/yyyy')}
                                    </span>
                                  )}
                                  {task.estimated_hours > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {task.logged_hours}h / {task.estimated_hours}h
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowTimeLogDialog(true);
                                }}
                              >
                                <Clock className="w-4 h-4 mr-1" />
                                {t('projects.time.log')}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="time" className="space-y-4">
                <h2 className="text-xl font-bold">{t('projects.time.heading')}</h2>
                
                {timeLogs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">{t('projects.time.empty')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {timeLogs.map(log => (
                      <Card key={log.id}>
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold">{log.hours}h</span>
                                <span className="text-gray-500">-</span>
                                <span className="text-sm text-gray-600">{format(new Date(log.date), 'dd/MM/yyyy')}</span>
                              </div>
                              {log.description && (
                                <p className="text-sm text-gray-700">{log.description}</p>
                              )}
                            </div>
                            {log.billable && (
                              <Badge variant="outline" className="bg-green-50">{t('projects.time.billable')}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{t('projects.files.heading')}</h2>
                  {canEdit && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                      >
                        {uploadingFile ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Paperclip className="w-4 h-4 mr-2" />
                        )}
                        {t('projects.files.attach')}
                      </Button>
                    </>
                  )}
                </div>

                {(!project?.attachments || project.attachments.length === 0) ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">{t('projects.files.empty')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.attachments.map((file, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{format(new Date(file.uploaded_at), 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">{t('view')}</Button>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        <PhaseDialog 
          open={showPhaseDialog}
          onClose={() => setShowPhaseDialog(false)}
          onSave={(data) => createPhaseMutation.mutate(data)}
          saving={createPhaseMutation.isPending}
        />

        <TaskDialog 
          open={showTaskDialog}
          onClose={() => setShowTaskDialog(false)}
          onSave={(data) => createTaskMutation.mutate(data)}
          phases={phases}
          saving={createTaskMutation.isPending}
        />

        <TimeLogDialog 
          open={showTimeLogDialog}
          onClose={() => {
            setShowTimeLogDialog(false);
            setSelectedTask(null);
          }}
          onSave={(data) => createTimeLogMutation.mutate(data)}
          task={selectedTask}
          saving={createTimeLogMutation.isPending}
        />
      </div>
    </div>
  );
}

function PhaseDialog({ open, onClose, onSave, saving }) {
  const { t } = useTranslation();
  const [data, setData] = useState({ name: "", description: "", start_date: "", end_date: "", status: "pending" });

  const handleSave = () => {
    if (!data.name.trim()) {
      toast.error(t('projects.dialogs.nameRequired'));
      return;
    }
    onSave(data);
    setData({ name: "", description: "", start_date: "", end_date: "", status: "pending" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.phases.new')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('projects.dialogs.name')}</Label>
            <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
          </div>
          <div>
            <Label>{t('description')}</Label>
            <Textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('projects.phases.form.startDate')}</Label>
              <Input type="date" value={data.start_date} onChange={(e) => setData({ ...data, start_date: e.target.value })} />
            </div>
            <div>
              <Label>{t('projects.phases.form.endDate')}</Label>
              <Input type="date" value={data.end_date} onChange={(e) => setData({ ...data, end_date: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('projects.phases.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({ open, onClose, onSave, phases, saving }) {
  const { t } = useTranslation();
  const [data, setData] = useState({ 
    name: "", 
    description: "", 
    phase_id: "", 
    status: "pending", 
    priority: "medium",
    due_date: "",
    estimated_hours: ""
  });

  const handleSave = () => {
    if (!data.name.trim()) {
      toast.error(t('projects.dialogs.nameRequired'));
      return;
    }
    onSave(data);
    setData({ name: "", description: "", phase_id: "", status: "pending", priority: "medium", due_date: "", estimated_hours: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.tasks.new')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('projects.dialogs.name')}</Label>
            <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
          </div>
          <div>
            <Label>{t('description')}</Label>
            <Textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} />
          </div>
          <div>
            <Label>{t('projects.tasks.form.phase')}</Label>
            <Select value={data.phase_id} onValueChange={(v) => setData({ ...data, phase_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t('projects.tasks.form.selectPhase')} />
              </SelectTrigger>
              <SelectContent>
                {phases.map(phase => (
                  <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('projects.priority.label')}</Label>
              <Select value={data.priority} onValueChange={(v) => setData({ ...data, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('projects.priority.low')}</SelectItem>
                  <SelectItem value="medium">{t('projects.priority.medium')}</SelectItem>
                  <SelectItem value="high">{t('projects.priority.high')}</SelectItem>
                  <SelectItem value="urgent">{t('projects.priority.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('projects.tasks.form.dueDate')}</Label>
              <Input type="date" value={data.due_date} onChange={(e) => setData({ ...data, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>{t('projects.tasks.form.estimatedHours')}</Label>
            <Input type="number" value={data.estimated_hours} onChange={(e) => setData({ ...data, estimated_hours: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('projects.tasks.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimeLogDialog({ open, onClose, onSave, task, saving }) {
  const { t } = useTranslation();
  const [data, setData] = useState({ 
    task_id: "", 
    description: "", 
    date: new Date().toISOString().split('T')[0],
    hours: "",
    billable: true
  });

  React.useEffect(() => {
    if (task) {
      setData(prev => ({ ...prev, task_id: task.id }));
    }
  }, [task]);

  const handleSave = () => {
    if (!data.hours || parseFloat(data.hours) <= 0) {
      toast.error(t('projects.time.hoursRequired'));
      return;
    }
    onSave(data);
    setData({ task_id: "", description: "", date: new Date().toISOString().split('T')[0], hours: "", billable: true });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.time.log')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {task && (
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm font-medium">{task.name}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('projects.time.form.date')}</Label>
              <Input type="date" value={data.date} onChange={(e) => setData({ ...data, date: e.target.value })} />
            </div>
            <div>
              <Label>{t('projects.time.form.hours')}</Label>
              <Input type="number" step="0.5" value={data.hours} onChange={(e) => setData({ ...data, hours: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>{t('description')}</Label>
            <Textarea 
              value={data.description} 
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder={t('projects.time.form.descriptionPlaceholder')}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="billable"
              checked={data.billable}
              onChange={(e) => setData({ ...data, billable: e.target.checked })}
            />
            <Label htmlFor="billable">{t('projects.time.form.billable')}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('projects.time.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}