import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/Modal";
import { IconAttach, IconSpinner, IconClose } from "@/components/Icons";
import { toast } from "@/lib/toast";
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
    <Modal open={open} onClose={onClose} size="lg" title={t('tickets.create.title')}>
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="ticket-title">
            {t('tickets.create.titleLabel')}
          </label>
          <input
            id="ticket-title"
            className="input"
            placeholder={t('tickets.create.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="ticket-description">
            {t('tickets.create.descriptionLabel')}
          </label>
          <textarea
            id="ticket-description"
            className="textarea"
            placeholder={t('tickets.create.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="ticket-type">
              {t('tickets.create.typeLabel')}
            </label>
            <select
              id="ticket-type"
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {Object.entries(typeConfig).map(([key, labelKey]) => (
                <option key={key} value={key}>
                  {t(labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="ticket-priority">
              {t('admin.soporte.filter.priority')}
            </label>
            <select
              id="ticket-priority"
              className="select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="baja">{t('admin.soporte.priority.low')}</option>
              <option value="media">{t('tickets.priority.medium')}</option>
              <option value="alta">{t('admin.soporte.priority.high')}</option>
              <option value="urgente">{t('admin.soporte.priority.urgent')}</option>
            </select>
          </div>
        </div>

        {professionals.length > 0 && (
          <div>
            <label className="label" htmlFor="ticket-professional">
              {t('tickets.create.relatedPro')}
            </label>
            <select
              id="ticket-professional"
              className="select"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
            >
              <option value="">{t('common.none')}</option>
              {professionals.map((prof) => (
                <option key={prof.user_id} value={prof.user_id}>
                  {prof.business_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="ticket-tags">
            {t('tickets.create.tagsLabel')}
          </label>
          <input
            id="ticket-tags"
            className="input"
            placeholder={t('tickets.create.tagsPlaceholder')}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div>
          <label className="label">
            {t('tickets.create.attachments')}
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((url, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-soft px-2 py-1 rounded">
                <span className="text-xs">{t('tickets.detail.fileN', { index: idx + 1 })}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  className="text-error hover:opacity-80"
                  aria-label={t('common.delete')}
                >
                  <IconClose size={12} />
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
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => document.getElementById('ticket-file-upload').click()}
            disabled={uploadingFile}
          >
            {uploadingFile ? (
              <IconSpinner size={16} />
            ) : (
              <IconAttach size={16} />
            )}
            {t('messages.attach_file')}
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={createTicketMutation.isPending}
        >
          {createTicketMutation.isPending && (
            <IconSpinner size={16} />
          )}
          {t('tickets.create.submit')}
        </button>
      </div>
    </Modal>
  );
}
