import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, CheckCircle, Mail, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";

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
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {t('tickets.public.sentTitle')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('tickets.public.sentBody')}
          </p>
          <div className="bg-white rounded-lg p-4 inline-block mb-4">
            <p className="text-sm text-gray-600 mb-1">
              {t('tickets.public.ticketNumber')}
            </p>
            <p className="text-xl font-mono font-bold text-blue-600">{ticketNumber}</p>
          </div>
          <p className="text-sm text-gray-500">
            {t('tickets.public.saveNumber')}
          </p>
          <Button 
            onClick={() => {
              setSubmitted(false);
              setFormData({ name: "", email: "", type: "consulta_general", title: "", description: "" });
            }}
            variant="outline"
            className="mt-4"
          >
            {t('tickets.public.sendAnother')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          {t('tickets.public.sendInquiry')}
        </CardTitle>
        <p className="text-sm text-gray-600">
          {t('tickets.public.subtitle')}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('tickets.public.nameLabel')}
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('tickets.public.namePlaceholder')}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t('tickets.public.emailLabel')}
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('tickets.public.emailPlaceholder')}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>{t('tickets.public.typeLabel')}</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ticketTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t('tickets.public.subjectLabel')}</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('tickets.public.subjectPlaceholder')}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{t('tickets.public.messageLabel')}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('tickets.public.messagePlaceholder')}
              className="mt-1 h-32"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 h-12"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('reviews.form.sending')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('tickets.public.sendInquiry')}
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            {t('tickets.public.consent')}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
