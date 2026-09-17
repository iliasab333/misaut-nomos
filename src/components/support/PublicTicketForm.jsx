import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import {
  IconSend,
  IconSpinner,
  IconSuccess,
  IconMail,
  IconUser,
  IconMessageSquare,
} from "@/components/Icons";
import { toast } from "@/lib/toast";

// `language` llegaba como prop desde HelpCenter; ahora el idioma lo lleva
// i18next, así que la prop se ignora.
export default function PublicTicketForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "consulta_general",
    title: "",
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");

  const ticketTypes = [
    { value: "consulta_general", label: t('tickets.types.generalQuery') },
    { value: "soporte_cliente", label: t('tickets.public.types.clientHelp') },
    { value: "soporte_autonomo", label: t('tickets.public.types.proHelp') },
    { value: "problema_pago", label: t('tickets.public.types.paymentBilling') },
    { value: "reclamo", label: t('supportChat.ticketTypeComplaint') },
  ];

  const generateTicketNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.title.trim() || !formData.description.trim()) {
      toast.error(t('tickets.public.fillAllFields'));
      return;
    }

    // Validar email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t('tickets.public.invalidEmail'));
      return;
    }

    setSubmitting(true);

    try {
      const newTicketNumber = generateTicketNumber();
      
      // Crear ticket público (sin user_id ya que no están autenticados)
      await base44.entities.Ticket.create({
        ticket_number: newTicketNumber,
        title: formData.title,
        description: `**Nombre:** ${formData.name}\n**Email:** ${formData.email}\n\n${formData.description}`,
        type: formData.type,
        status: "abierto",
        priority: "media",
        creator_id: "public_form",
        creator_name: formData.name,
        creator_type: "visitante",
        tags: ["formulario_publico", formData.email]
      });

      setTicketNumber(newTicketNumber);
      setSubmitted(true);
      
      // Enviar email de confirmación
      try {
        await base44.integrations.Core.SendEmail({
          to: formData.email,
          subject: t('tickets.public.emailSubject', { number: newTicketNumber }),
          body: t('tickets.public.emailBody', { name: formData.name, number: newTicketNumber, title: formData.title })
        });
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
      }

      toast.success(t('tickets.public.sentToast'));
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error(t('tickets.public.sendError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="card border-2 border-success/30 bg-success/10">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconSuccess className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-2xl font-bold text-ink mb-2">
            {t('tickets.public.sentTitle')}
          </h3>
          <p className="text-c-muted mb-4">
            {t('tickets.public.sentBody')}
          </p>
          <div className="bg-surface rounded-lg p-4 inline-block mb-4">
            <p className="text-sm text-c-muted mb-1">
              {t('tickets.public.ticketNumber')}
            </p>
            <p className="text-xl font-mono font-bold text-c-accent">{ticketNumber}</p>
          </div>
          <p className="text-sm text-c-muted">
            {t('tickets.public.saveNumber')}
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setFormData({ name: "", email: "", type: "consulta_general", title: "", description: "" });
            }}
            className="btn-secondary mt-4"
          >
            {t('tickets.public.sendAnother')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-2 border-c-accent/30">
      <div className="p-6 pb-4">
        <h3 className="text-xl font-semibold text-ink flex items-center gap-2">
          <IconMessageSquare className="w-5 h-5 text-c-accent" />
          {t('tickets.public.sendInquiry')}
        </h3>
        <p className="text-sm text-c-muted mt-1.5">
          {t('tickets.public.subtitle')}
        </p>
      </div>
      <div className="p-6 pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-2" htmlFor="public-ticket-name">
                <IconUser className="w-4 h-4" />
                {t('tickets.public.nameLabel')}
              </label>
              <input
                id="public-ticket-name"
                className="input mt-1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('tickets.public.namePlaceholder')}
              />
            </div>
            <div>
              <label className="label flex items-center gap-2" htmlFor="public-ticket-email">
                <IconMail className="w-4 h-4" />
                {t('tickets.public.emailLabel')}
              </label>
              <input
                id="public-ticket-email"
                className="input mt-1"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('tickets.public.emailPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="public-ticket-type">{t('tickets.public.typeLabel')}</label>
            <select
              id="public-ticket-type"
              className="select mt-1"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              {ticketTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="public-ticket-subject">{t('tickets.public.subjectLabel')}</label>
            <input
              id="public-ticket-subject"
              className="input mt-1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('tickets.public.subjectPlaceholder')}
            />
          </div>

          <div>
            <label className="label" htmlFor="public-ticket-message">{t('tickets.public.messageLabel')}</label>
            <textarea
              id="public-ticket-message"
              className="textarea mt-1 h-32"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('tickets.public.messagePlaceholder')}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <IconSpinner size={16} />
                {t('reviews.form.sending')}
              </>
            ) : (
              <>
                <IconSend size={16} />
                {t('tickets.public.sendInquiry')}
              </>
            )}
          </button>

          <p className="text-xs text-c-muted text-center">
            {t('tickets.public.consent')}
          </p>
        </form>
      </div>
    </div>
  );
}
