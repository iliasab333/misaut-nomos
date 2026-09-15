import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Users, Plus, Mail, Phone, Building, ArrowLeft, Search, Edit2, Trash2, IdCard, MapPin, Eye, Tag, Star, Filter, TrendingUp, Euro } from "lucide-react";
import { toast } from "sonner";
import { useTranslation, Trans } from "react-i18next";
import Loader from "@/components/ui/Loader";

export default function CRMPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    client_nif: "",
    company: "",
    address: "",
    status: "lead",
    source: "",
    notes: "",
    estimated_value: "",
    segment: "",
    tags: "",
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

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['clientContacts', user?.id],
    queryFn: () => base44.entities.ClientContact.filter({ professional_id: user.id }),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContact.create({ ...data, professional_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientContacts']);
      setShowDialog(false);
      resetForm();
      toast.success(t('crm.toast.clientCreated'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientContacts']);
      setShowDialog(false);
      resetForm();
      toast.success(t('crm.toast.clientUpdated'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientContacts']);
      setDeleteDialog(null);
      toast.success(t('crm.toast.clientDeleted'));
    },
    onError: () => {
      toast.error(t('crm.toast.clientDeleteError'));
    }
  });

  const resetForm = () => {
    setFormData({
      client_name: "",
      client_email: "",
      client_phone: "",
      client_nif: "",
      company: "",
      address: "",
      status: "lead",
      source: "",
      notes: "",
      estimated_value: "",
      segment: "",
      tags: "",
    });
    setEditingContact(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : 0,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(t => t) : [],
    };

    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: dataToSend });
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      client_name: contact.client_name || "",
      client_email: contact.client_email || "",
      client_phone: contact.client_phone || "",
      client_nif: contact.client_nif || "",
      company: contact.company || "",
      address: contact.address || "",
      status: contact.status || "lead",
      source: contact.source || "",
      notes: contact.notes || "",
      estimated_value: contact.estimated_value || "",
      segment: contact.segment || "",
      tags: contact.tags?.join(", ") || "",
    });
    setShowDialog(true);
  };

  const handleDelete = (contact) => {
    setDeleteDialog(contact);
  };

  const confirmDelete = () => {
    if (deleteDialog) {
      deleteMutation.mutate(deleteDialog.id);
    }
  };

  if (loading) return <Loader />;

  // Obtener todas las etiquetas únicas
  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))].sort();

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.client_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.client_nif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSegment = segmentFilter === "all" || c.segment === segmentFilter;
    const matchesTag = tagFilter === "all" || (c.tags && c.tags.includes(tagFilter));
    return matchesSearch && matchesStatus && matchesSegment && matchesTag;
  });

  // Estadísticas rápidas
  const stats = {
    total: contacts.length,
    leads: contacts.filter(c => c.status === 'lead').length,
    clients: contacts.filter(c => c.status === 'client').length,
    totalValue: contacts.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
  };

  const getStatusBadge = (status) => {
    const colors = {
      lead: "bg-yellow-100 text-yellow-800",
      contacted: "bg-blue-100 text-blue-800",
      negotiating: "bg-purple-100 text-purple-800",
      client: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      vip: "bg-amber-100 text-amber-800",
    };
    const labels = {
      lead: t('crm.status.lead'),
      contacted: t('crm.status.contacted'),
      negotiating: t('crm.status.negotiating'),
      client: t('clientLabel'),
      inactive: t('crm.status.inactive'),
      vip: t('crm.status.vip'),
    };
    return <Badge className={colors[status]}>{labels[status]}</Badge>;
  };

  const handleViewDetails = (contact) => {
    navigate(createPageUrl("ClientDetail") + `?id=${contact.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('crm.list.title')}</h1>
              <p className="text-gray-600 mt-1">{t('crm.list.countSummary', { shown: filteredContacts.length, total: contacts.length })}</p>
            </div>
          </div>
          <div className="flex gap-2">

            <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('crm.actions.newClient')}
            </Button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">{t('crm.list.statTotalContacts')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.leads}</p>
                <p className="text-xs text-gray-500">{t('crm.list.statLeads')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.clients}</p>
                <p className="text-xs text-gray-500">{t('crm.list.statClients')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Euro className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalValue.toLocaleString()}€</p>
                <p className="text-xs text-gray-500">{t('crm.list.statEstimatedValue')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('crm.list.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40 h-11">
                  <SelectValue placeholder={t('crm.form.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('crm.list.filterAll')}</SelectItem>
                  <SelectItem value="lead">{t('crm.status.lead')}</SelectItem>
                  <SelectItem value="contacted">{t('crm.status.contacted')}</SelectItem>
                  <SelectItem value="negotiating">{t('crm.status.negotiating')}</SelectItem>
                  <SelectItem value="client">{t('clientLabel')}</SelectItem>
                  <SelectItem value="vip">{t('crm.status.vip')}</SelectItem>
                  <SelectItem value="inactive">{t('crm.status.inactive')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-full md:w-40 h-11">
                  <SelectValue placeholder={t('crm.form.segment')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('crm.list.filterAll')}</SelectItem>
                  <SelectItem value="residential">{t('crm.segment.residential')}</SelectItem>
                  <SelectItem value="commercial">{t('crm.segment.commercial')}</SelectItem>
                  <SelectItem value="industrial">{t('crm.segment.industrial')}</SelectItem>
                  <SelectItem value="government">{t('crm.segment.governmentShort')}</SelectItem>
                  <SelectItem value="other">{t('crm.segment.other')}</SelectItem>
                </SelectContent>
              </Select>
              {allTags.length > 0 && (
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-full md:w-40 h-11">
                    <SelectValue placeholder={t('crm.form.tag')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('crm.list.filterAllTags')}</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {loadingContacts ? (
          <Loader />
        ) : filteredContacts.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('crm.list.emptyTitle')}</h3>
              <p className="text-gray-600 mb-6">{t('crm.list.emptyDescription')}</p>
              <Button 
                onClick={() => { resetForm(); setShowDialog(true); }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('crm.actions.addFirstClient')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map(contact => (
              <Card key={contact.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900">{contact.client_name}</h3>
                            {getStatusBadge(contact.status)}
                            {contact.rating && (
                              <div className="flex items-center">
                                {[...Array(contact.rating)].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                ))}
                              </div>
                            )}
                          </div>
                          {contact.company && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {contact.company}
                            </p>
                          )}
                          {contact.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contact.tags.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs py-0">
                                  <Tag className="w-2 h-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs py-0">+{contact.tags.length - 3}</Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          {contact.client_email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{contact.client_email}</span>
                            </div>
                          )}
                          {contact.client_phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <span>{contact.client_phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          {contact.client_nif && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <IdCard className="w-4 h-4 flex-shrink-0" />
                              <span>{contact.client_nif}</span>
                            </div>
                          )}
                          {contact.address && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{contact.address}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleViewDetails(contact)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            {t('crm.actions.viewDetails')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(contact)}
                            className="bg-white hover:bg-blue-50 text-blue-700 border-blue-300 font-medium"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDelete(contact)}
                            className="bg-white hover:bg-red-50 text-red-700 border-red-300 font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingContact ? t('crm.actions.editClient') : t('crm.actions.newClient')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.nameRequired')}</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  placeholder={t('crm.form.namePlaceholder')}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('emailField')}</Label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                  placeholder={t('crm.form.emailPlaceholder')}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('phoneField')}</Label>
                <Input
                  value={formData.client_phone}
                  onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                  placeholder="+34 612 345 678"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('nifCif')}</Label>
                <Input
                  value={formData.client_nif}
                  onChange={(e) => setFormData({...formData, client_nif: e.target.value})}
                  placeholder="12345678A"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.company')}</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder={t('crm.form.companyPlaceholder')}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.status')}</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">{t('crm.status.lead')}</SelectItem>
                    <SelectItem value="contacted">{t('crm.status.contacted')}</SelectItem>
                    <SelectItem value="negotiating">{t('crm.status.negotiating')}</SelectItem>
                    <SelectItem value="client">{t('clientLabel')}</SelectItem>
                    <SelectItem value="inactive">{t('crm.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.estimatedValue')}</Label>
                <Input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.source')}</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  placeholder={t('crm.form.sourcePlaceholder')}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.segment')}</Label>
                <Select value={formData.segment || ""} onValueChange={(value) => setFormData({...formData, segment: value})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={t('crm.form.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">{t('crm.segment.residential')}</SelectItem>
                    <SelectItem value="commercial">{t('crm.segment.commercial')}</SelectItem>
                    <SelectItem value="industrial">{t('crm.segment.industrial')}</SelectItem>
                    <SelectItem value="government">{t('crm.segment.government')}</SelectItem>
                    <SelectItem value="other">{t('crm.segment.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">{t('crm.form.tags')}</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder={t('crm.form.tagsPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">{t('clientAddress')}</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder={t('crm.form.addressPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">{t('crm.form.notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder={t('crm.form.notesPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingContact ? t('crm.actions.saveChanges') : t('crm.list.createClient')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('crm.deleteClient.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="crm.list.deleteClientDescription"
                values={{ name: deleteDialog?.client_name }}
                components={{ 1: <strong /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}