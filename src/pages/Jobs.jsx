import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  Briefcase,
  Calendar,
  MapPin,
  Euro,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Filter,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import SEOHead from "../components/seo/SEOHead";

export default function JobsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client_contact_id: "",
    client_name: "",
    status: "pending",
    start_date: "",
    end_date: "",
    estimated_hours: "",
    actual_hours: "",
    estimated_cost: "",
    final_cost: "",
    location: "",
    notes: "",
    photos: []
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.user_type !== "professionnel") {
        navigate(createPageUrl("Search"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Search"));
    } finally {
      setLoadingUser(false);
    }
  };

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: async () => {
      const jobsList = await base44.entities.Job.filter({ professional_id: user.id }, '-created_date');
      return jobsList;
    },
    enabled: !!user?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clientContacts', user?.id],
    queryFn: async () => {
      const clientsList = await base44.entities.ClientContact.filter({ professional_id: user.id });
      return clientsList;
    },
    enabled: !!user?.id,
  });

  const createJobMutation = useMutation({
    mutationFn: async (data) => {
      const jobData = {
        ...data,
        professional_id: user.id,
        estimated_hours: data.estimated_hours ? Number(data.estimated_hours) : null,
        actual_hours: data.actual_hours ? Number(data.actual_hours) : null,
        estimated_cost: data.estimated_cost ? Number(data.estimated_cost) : null,
        final_cost: data.final_cost ? Number(data.final_cost) : null,
      };
      return await base44.entities.Job.create(jobData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(t('projects.jobs.created'));
      resetForm();
      setShowJobDialog(false);
    },
    onError: (error) => {
      toast.error(t('projects.jobs.createError'));
    }
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const jobData = {
        ...data,
        estimated_hours: data.estimated_hours ? Number(data.estimated_hours) : null,
        actual_hours: data.actual_hours ? Number(data.actual_hours) : null,
        estimated_cost: data.estimated_cost ? Number(data.estimated_cost) : null,
        final_cost: data.final_cost ? Number(data.final_cost) : null,
      };
      return await base44.entities.Job.update(id, jobData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(t('projects.jobs.updated'));
      resetForm();
      setShowJobDialog(false);
      setEditingJob(null);
    },
    onError: (error) => {
      toast.error(t('projects.jobs.updateError'));
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Job.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(t('projects.jobs.deleted'));
      setShowDeleteDialog(false);
      setJobToDelete(null);
    },
    onError: (error) => {
      toast.error(t('projects.jobs.deleteError'));
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      client_contact_id: "",
      client_name: "",
      status: "pending",
      start_date: "",
      end_date: "",
      estimated_hours: "",
      actual_hours: "",
      estimated_cost: "",
      final_cost: "",
      location: "",
      notes: "",
      photos: []
    });
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title || "",
      description: job.description || "",
      client_contact_id: job.client_contact_id || "",
      client_name: job.client_name || "",
      status: job.status || "pending",
      start_date: job.start_date || "",
      end_date: job.end_date || "",
      estimated_hours: job.estimated_hours?.toString() || "",
      actual_hours: job.actual_hours?.toString() || "",
      estimated_cost: job.estimated_cost?.toString() || "",
      final_cost: job.final_cost?.toString() || "",
      location: job.location || "",
      notes: job.notes || "",
      photos: job.photos || []
    });
    setShowJobDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error(t('projects.jobs.titleRequired'));
      return;
    }

    if (editingJob) {
      updateJobMutation.mutate({ id: editingJob.id, data: formData });
    } else {
      createJobMutation.mutate(formData);
    }
  };

  const handleClientSelect = (clientId) => {
    if (clientId === "manual") {
      setFormData({ ...formData, client_contact_id: "", client_name: "" });
    } else {
      const client = clients.find(c => c.id === clientId);
      setFormData({ 
        ...formData, 
        client_contact_id: clientId,
        client_name: client?.client_name || ""
      });
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('projects.jobs.photoTooLarge', { name: file.name }));
        continue;
      }

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, file_url]
        }));
      } catch (error) {
        toast.error(t('projects.jobs.photoUploadError'));
      }
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === "pending").length,
    in_progress: jobs.filter(j => j.status === "in_progress").length,
    completed: jobs.filter(j => j.status === "completed").length,
    totalRevenue: jobs.filter(j => j.status === "completed").reduce((sum, j) => sum + (j.final_cost || j.estimated_cost || 0), 0)
  };

  // Dentro del componente: las etiquetas se retraducen al cambiar de idioma.
  const STATUS_CONFIG = {
    pending: { label: t('projects.status.pending'), color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
    in_progress: { label: t('projects.status.inProgress'), color: "bg-blue-100 text-blue-800", icon: Clock },
    completed: { label: t('projects.status.completed'), color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    cancelled: { label: t('projects.status.cancelled'), color: "bg-red-100 text-red-800", icon: XCircle }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={t('projects.jobs.seo.title')}
        description={t('projects.jobs.seo.description')}
        noindex={true}
      />
      
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl("ProfessionalDashboard"))}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('projects.jobs.title')}
                </h1>
                <p className="text-sm text-gray-500">
                  {t('projects.jobs.subtitle')}
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setEditingJob(null);
                setShowJobDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('projects.jobs.new')}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-gray-500">{t('total')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-xs text-gray-500">{t('projects.jobs.stats.pending')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.in_progress}</p>
                    <p className="text-xs text-gray-500">{t('projects.jobs.stats.inProgress')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-xs text-gray-500">{t('projects.stats.completed')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Euro className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}€</p>
                    <p className="text-xs text-gray-500">{t('projects.jobs.stats.revenue')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('projects.jobs.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('projects.status.all')}</SelectItem>
                <SelectItem value="pending">{t('projects.status.pending')}</SelectItem>
                <SelectItem value="in_progress">{t('projects.status.inProgress')}</SelectItem>
                <SelectItem value="completed">{t('projects.status.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('projects.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jobs List */}
          {loadingJobs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('projects.jobs.emptyTitle')}
                </h3>
                <p className="text-gray-500 mb-4">
                  {t('projects.jobs.emptyDescription')}
                </p>
                <Button onClick={() => setShowJobDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('projects.jobs.create')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map((job) => {
                const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card key={job.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                <Badge className={statusConfig.color}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              
                              {job.client_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                  <User className="w-4 h-4" />
                                  {job.client_name}
                                </div>
                              )}
                              
                              {job.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{job.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                {job.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {job.location}
                                  </div>
                                )}
                                {job.start_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(job.start_date).toLocaleDateString()}
                                    {job.end_date && ` - ${new Date(job.end_date).toLocaleDateString()}`}
                                  </div>
                                )}
                                {(job.final_cost || job.estimated_cost) && (
                                  <div className="flex items-center gap-1 font-semibold text-green-600">
                                    <Euro className="w-4 h-4" />
                                    {(job.final_cost || job.estimated_cost).toLocaleString()}€
                                  </div>
                                )}
                                {job.photos?.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <ImageIcon className="w-4 h-4" />
                                    {t('projects.jobs.photoCount', { count: job.photos.length })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditJob(job)}>
                              <Edit className="w-4 h-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setJobToDelete(job);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Job Dialog */}
      <Dialog open={showJobDialog} onOpenChange={(open) => {
        if (!open) {
          setShowJobDialog(false);
          setEditingJob(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingJob 
                ? t('projects.jobs.edit')
                : t('projects.jobs.new')}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">{t('projects.jobs.form.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('projects.jobs.form.titlePlaceholder')}
                required
              />
            </div>

            <div>
              <Label>{t('clientLabel')}</Label>
              <Select
                value={formData.client_contact_id || "manual"}
                onValueChange={handleClientSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('projects.jobs.form.selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t('projects.jobs.form.manualClient')}</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.client_contact_id && (
                <Input
                  className="mt-2"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder={t('projects.jobs.form.clientNamePlaceholder')}
                />
              )}
            </div>

            <div>
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('projects.jobs.form.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('projects.status.label')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('projects.status.pending')}</SelectItem>
                    <SelectItem value="in_progress">{t('projects.status.inProgress')}</SelectItem>
                    <SelectItem value="completed">{t('projects.status.completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('projects.status.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">{t('projects.jobs.form.location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder={t('projects.jobs.form.locationPlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">{t('projects.jobs.form.startDate')}</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">{t('projects.jobs.form.endDate')}</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_hours">{t('projects.jobs.form.estimatedHours')}</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="actual_hours">{t('projects.jobs.form.actualHours')}</Label>
                <Input
                  id="actual_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.actual_hours}
                  onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_cost">{t('projects.jobs.form.estimatedCost')}</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="final_cost">{t('projects.jobs.form.finalCost')}</Label>
                <Input
                  id="final_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.final_cost}
                  onChange={(e) => setFormData({ ...formData, final_cost: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{t('projects.jobs.form.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('projects.jobs.form.notesPlaceholder')}
                rows={2}
              />
            </div>

            <div>
              <Label>{t('projects.jobs.form.photos')}</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="text-center">
                    <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-500">
                      {t('projects.jobs.form.addPhotos')}
                    </p>
                  </div>
                </label>
              </div>
              {formData.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={t('projects.jobs.form.photoAlt', { index: index + 1 })}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowJobDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createJobMutation.isPending || updateJobMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {(createJobMutation.isPending || updateJobMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingJob 
                  ? t('projects.jobs.saveChanges')
                  : t('projects.jobs.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('projects.jobs.deleteTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            {t('projects.jobs.deleteConfirm', { title: jobToDelete?.title })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteJobMutation.mutate(jobToDelete?.id)}
              disabled={deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}