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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Plus, Mail, Phone, Building, Search, Edit2, Trash2,
  Eye, FileText, MessageSquare, StickyNote
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation, Trans } from "react-i18next";
import SEOHead from "../components/seo/SEOHead";

const EMPTY_FORM = {
  client_name: "", client_email: "", client_phone: "",
  client_nif: "", company: "", address: "", city: "",
  status: "lead", notes: "",
};

export default function MisClientesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [noteDialog, setNoteDialog] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Dentro del componente: las etiquetas pasan por t() y se retraducen al cambiar de idioma.
  const STATUS_MAP = {
    lead: { label: t('crm.status.lead'), color: "bg-yellow-100 text-yellow-800" },
    contacted: { label: t('crm.status.contacted'), color: "bg-blue-100 text-blue-800" },
    negotiating: { label: t('crm.status.negotiating'), color: "bg-purple-100 text-purple-800" },
    client: { label: t('clientLabel'), color: "bg-green-100 text-green-800" },
    inactive: { label: t('crm.status.inactive'), color: "bg-gray-100 text-gray-600" },
    vip: { label: t('crm.status.vip'), color: "bg-amber-100 text-amber-800" },
  };

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const u = await base44.auth.me();
      if (!u || u.user_type !== 'professionnel') { navigate(createPageUrl("Search")); return; }
      setUser(u);
    } catch { navigate(createPageUrl("Search")); }
    finally { setLoading(false); }
  };

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['clientContacts', user?.id],
    queryFn: () => base44.entities.ClientContact.filter({ professional_id: user.id }),
    enabled: !!user,
    staleTime: 60000 * 2,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContact.create({ ...data, professional_id: user.id }),
    onSuccess: () => { queryClient.invalidateQueries(['clientContacts']); closeDialog(); toast.success(t('crm.toast.clientAdded')); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientContact.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['clientContacts']); closeDialog(); toast.success(t('crm.toast.clientUpdated')); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientContact.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['clientContacts']); setDeleteDialog(null); toast.success(t('crm.toast.clientDeleted')); },
  });

  const closeDialog = () => { setShowDialog(false); setEditingContact(null); setFormData(EMPTY_FORM); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (c) => {
    setEditingContact(c);
    setFormData({
      client_name: c.client_name || "", client_email: c.client_email || "",
      client_phone: c.client_phone || "", client_nif: c.client_nif || "",
      company: c.company || "", address: c.address || "",
      city: c.city || "", status: c.status || "lead", notes: c.notes || "",
    });
    setShowDialog(true);
  };

  const handleSaveNote = async () => {
    if (!noteDialog) return;
    await base44.entities.ClientContact.update(noteDialog.id, { notes: noteText });
    queryClient.invalidateQueries(['clientContacts']);
    setNoteDialog(null);
    toast.success(t('crm.toast.noteSaved'));
  };

  const handleNewInvoice = (c) => {
    navigate(createPageUrl("Invoices") + `?new=true&client=${encodeURIComponent(c.client_name)}&email=${encodeURIComponent(c.client_email || '')}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  const filtered = contacts.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || c.client_name?.toLowerCase().includes(q) ||
      c.client_email?.toLowerCase().includes(q) || c.client_phone?.includes(q) ||
      c.company?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <SEOHead title={t('crm.myClients.seoTitle')} noindex />
      <div className="max-w-4xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{t('crm.myClients.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('crm.myClients.savedCount', { count: contacts.length })}</p>
          </div>
          <Button
            onClick={() => { setFormData(EMPTY_FORM); setEditingContact(null); setShowDialog(true); }}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('crm.actions.newClient')}
          </Button>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('crm.myClients.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl">
              <SelectValue placeholder={t('crm.form.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('crm.myClients.allStatuses')}</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* LISTA */}
        {loadingContacts ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-blue-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {searchTerm || statusFilter !== "all" ? t('crm.myClients.noResultsTitle') : t('crm.myClients.emptyTitle')}
              </h3>
              <p className="text-gray-500 text-sm mb-5">
                {searchTerm || statusFilter !== "all"
                  ? t('crm.myClients.noResultsHint')
                  : t('crm.myClients.emptyDescription')}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button
                  onClick={() => { setFormData(EMPTY_FORM); setShowDialog(true); }}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" /> {t('crm.actions.addFirstClient')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(c => (
              <Card key={c.id} className="border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-base">
                        {c.client_name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{c.client_name}</h3>
                        <Badge className={`text-xs ${STATUS_MAP[c.status]?.color || "bg-gray-100 text-gray-600"}`}>
                          {STATUS_MAP[c.status]?.label || c.status}
                        </Badge>
                      </div>
                      {c.company && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                          <Building className="w-3 h-3" /> {c.company}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-1">
                        {c.client_email && (
                          <a href={`mailto:${c.client_email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <Mail className="w-3.5 h-3.5" /> {c.client_email}
                          </a>
                        )}
                        {c.client_phone && (
                          <a href={`tel:${c.client_phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <Phone className="w-3.5 h-3.5" /> {c.client_phone}
                          </a>
                        )}
                      </div>
                      {c.notes && (
                        <p className="text-xs text-gray-400 mt-1.5 italic line-clamp-1">📝 {c.notes}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setNoteDialog(c); setNoteText(c.notes || ""); }}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-yellow-100 hover:text-yellow-700 transition-colors flex items-center justify-center"
                        title={t('crm.actions.addNote')}
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleNewInvoice(c)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-amber-100 hover:text-amber-700 transition-colors flex items-center justify-center"
                        title={t('newInvoice')}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(createPageUrl("ClientDetail") + `?id=${c.id}`)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center justify-center"
                        title={t('crm.actions.viewDetails')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center justify-center"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteDialog(c)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* DIALOG CREAR/EDITAR */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) closeDialog(); else setShowDialog(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingContact ? t('crm.actions.editClient') : t('crm.actions.newClient')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.nameRequired')}</Label>
                <Input
                  value={formData.client_name}
                  onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder={t('crm.form.namePlaceholder')}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.status')}</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('emailField')}</Label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={e => setFormData({ ...formData, client_email: e.target.value })}
                  placeholder={t('crm.form.emailPlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('phoneField')}</Label>
                <Input
                  value={formData.client_phone}
                  onChange={e => setFormData({ ...formData, client_phone: e.target.value })}
                  placeholder="+34 612 345 678"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('crm.form.company')}</Label>
                <Input
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  placeholder={t('crm.myClients.companyPlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t('nifCif')}</Label>
                <Input
                  value={formData.client_nif}
                  onChange={e => setFormData({ ...formData, client_nif: e.target.value })}
                  placeholder="12345678A"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm font-semibold">{t('clientAddress')}</Label>
                <Input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('crm.myClients.addressPlaceholder')}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">{t('crm.form.notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder={t('crm.myClients.notesPlaceholder')}
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingContact ? t('crm.actions.saveChanges') : t('crm.myClients.addClient')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG NOTA RÁPIDA */}
      <Dialog open={!!noteDialog} onOpenChange={v => { if (!v) setNoteDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('crm.myClients.noteFor', { name: noteDialog?.client_name })}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={4}
            placeholder={t('crm.myClients.quickNotePlaceholder')}
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveNote} className="bg-blue-600 hover:bg-blue-700">{t('crm.myClients.saveNote')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG ELIMINAR */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('crm.deleteClient.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="crm.myClients.deleteClientDescription"
                values={{ name: deleteDialog?.client_name }}
                components={{ 1: <strong /> }}
              />
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