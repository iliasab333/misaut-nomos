import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paperclip, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// Mapa explícito tipo → clave i18n (la etiqueta se resuelve con t() en render).
const typeConfig = {
  soporte_cliente: "tickets.types.clientSupport",
  soporte_autonomo: "tickets.types.proSupport",
  reclamo: "tickets.types.complaint",
  problema_trabajo: "tickets.types.jobIssue",
  problema_pago: "tickets.types.paymentIssue",
  consulta_general: "tickets.types.generalQuery"
};

export default function CreateTicketDialog({ open, onClose, user, relatedProfessionalId = null }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("consulta_general");
  const [priority, setPriority] = useState("media");
  const [assignedToId, setAssignedToId] = useState(relatedProfessionalId || "");
  const [tags, setTags] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const { data: professionals = [] } = useQuery({
    queryKey: ['allProfessionals'],
    queryFn: async () => {
      const profiles = await base44.entities.ProfessionalProfile.list();
      return profiles;
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData) => {
      console.log('🎫 Creando ticket con datos:', ticketData);
      
      const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
      
      const ticketToCreate = {
        ticket_number: ticketNumber,
        title: ticketData.title,
        description: ticketData.description,
        type: ticketData.type,
        priority: ticketData.priority,
        creator_id: user.id,
        creator_name: user.full_name || user.email,
        creator_type: user.user_type || 'client',
        status: 'abierto',
        last_activity: new Date().toISOString(),
        tags: ticketData.tags || [],
        attachments: ticketData.attachments || [],
      };

      if (ticketData.assigned_to_id) {
        ticketToCreate.assigned_to_id = ticketData.assigned_to_id;
        ticketToCreate.assigned_to_name = ticketData.assigned_to_name;
        ticketToCreate.related_professional_id = ticketData.assigned_to_id;
      }

      console.log('✅ Ticket a crear:', ticketToCreate);
      
      const ticket = await base44.entities.Ticket.create(ticketToCreate);
      console.log('✅ Ticket creado:', ticket);

      await base44.entities.TicketEvent.create({
        ticket_id: ticket.id,
        event_type: 'created',
        user_id: user.id,
        user_name: user.full_name || user.email,
        description: `Ticket creado: ${ticketData.title}`
      });
      console.log('✅ Evento de ticket creado');

      try {
        console.log('📧 Enviando notificaciones...');
        
        const adminNotif = await base44.functions.invoke('sendTicketNotification', {
          ticketId: ticket.id,
          recipientId: 'admin',
          type: 'new_ticket',
          message: ticketData.description
        });
        console.log('✅ Respuesta notificación admin:', adminNotif.data);

        if (ticketData.assigned_to_id) {
          const profNotif = await base44.functions.invoke('sendTicketNotification', {
            ticketId: ticket.id,
            recipientId: ticketData.assigned_to_id,
            type: 'new_ticket',
            message: ticketData.description
          });
          console.log('✅ Respuesta notificación profesional:', profNotif.data);
        }
      } catch (notifError) {
        console.error('⚠️ Error enviando notificaciones:', notifError);
        console.error('Detalles del error:', notifError.response?.data || notifError.message);
      }

      return ticket;
    },
    onSuccess: (data) => {
      console.log('🎉 Ticket creado exitosamente:', data);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success(t('tickets.create.created'));
      resetForm();
      onClose();
    },
    onError: (error) => {
      console.error('❌ Error creando ticket:', error);
      toast.error(t('tickets.create.createError', { message: error.message }));
    }
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("consulta_general");
    setPriority("media");
    setAssignedToId(relatedProfessionalId || "");
    setTags("");
    setAttachments([]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments([...attachments, file_url]);
      toast.success(t('tickets.create.fileAttached'));
    } catch (error) {
      toast.error(t('tickets.toast.uploadError'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    console.log('📝 Iniciando creación de ticket...');
    console.log('Título:', title);
    console.log('Descripción:', description);
    console.log('Usuario:', user);

    if (!title.trim() || !description.trim()) {
      toast.error(t('tickets.create.fillTitleDescription'));
      return;
    }

    if (!user || !user.id) {
      toast.error(t('tickets.create.notAuthenticated'));
      console.error('❌ Usuario no disponible:', user);
      return;
    }

    const selectedProfessional = professionals.find(p => p.user_id === assignedToId);

    const ticketData = {
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      assigned_to_id: assignedToId || null,
      assigned_to_name: selectedProfessional?.business_name || null,
      related_professional_id: assignedToId || null,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      attachments: attachments || []
    };

    console.log('📤 Enviando ticket con datos:', ticketData);
    createTicketMutation.mutate(ticketData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('tickets.create.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('tickets.create.titleLabel')}
            </label>
            <Input
              placeholder={t('tickets.create.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('tickets.create.descriptionLabel')}
            </label>
            <Textarea
              placeholder={t('tickets.create.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('tickets.create.typeLabel')}
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([key, labelKey]) => (
                    <SelectItem key={key} value={key}>
                      {t(labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('admin.soporte.filter.priority')}
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">{t('admin.soporte.priority.low')}</SelectItem>
                  <SelectItem value="media">{t('tickets.priority.medium')}</SelectItem>
                  <SelectItem value="alta">{t('admin.soporte.priority.high')}</SelectItem>
                  <SelectItem value="urgente">{t('admin.soporte.priority.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {professionals.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('tickets.create.relatedPro')}
              </label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('tickets.create.selectPro')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>{t('common.none')}</SelectItem>
                  {professionals.map((prof) => (
                    <SelectItem key={prof.user_id} value={prof.user_id}>
                      {prof.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('tickets.create.tagsLabel')}
            </label>
            <Input
              placeholder={t('tickets.create.tagsPlaceholder')}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('tickets.create.attachments')}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((url, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                  <span className="text-xs">{t('tickets.detail.fileN', { index: idx + 1 })}</span>
                  <button
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <input
              type="file"
              className="hidden"
              id="ticket-file-upload"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('ticket-file-upload').click()}
              disabled={uploadingFile}
            >
              {uploadingFile ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4 mr-2" />
              )}
              {t('messages.attach_file')}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTicketMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createTicketMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {t('tickets.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
