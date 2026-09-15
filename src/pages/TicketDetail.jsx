import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Tag,
  FileText,
  Loader2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import SEOHead from "../components/seo/SEOHead";

// Mapa explícito estado → clave i18n (la etiqueta se resuelve con t() en render).
const statusConfig = {
  abierto: { icon: Clock, color: "bg-blue-500", key: "admin.soporte.status.open" },
  en_progreso: { icon: AlertCircle, color: "bg-amber-500", key: "tickets.status.inProgress" },
  resuelto: { icon: CheckCircle, color: "bg-green-500", key: "admin.soporte.status.resolved" },
  cerrado: { icon: XCircle, color: "bg-gray-500", key: "admin.soporte.status.closed" }
};

export default function TicketDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const ticketId = urlParams.get("id");
  const locale = i18n.language;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { data: ticket, isLoading: loadingTicket } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const tickets = await base44.entities.Ticket.filter({ id: ticketId });
      return tickets[0] || null;
    },
    enabled: !!ticketId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['ticketMessages', ticketId],
    queryFn: async () => {
      const msgs = await base44.entities.TicketMessage.filter({ ticket_id: ticketId });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!ticketId,
    refetchInterval: 3000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['ticketEvents', ticketId],
    queryFn: async () => {
      const evts = await base44.entities.TicketEvent.filter({ ticket_id: ticketId });
      return evts.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!ticketId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments = [] }) => {
      const message = await base44.entities.TicketMessage.create({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_type: user.user_type || 'client',
        content,
        attachments,
        is_internal: false
      });

      await base44.entities.Ticket.update(ticketId, {
        last_activity: new Date().toISOString()
      });

      await base44.entities.TicketEvent.create({
        ticket_id: ticketId,
        event_type: 'message_added',
        user_id: user.id,
        user_name: user.full_name || user.email,
        description: `${user.full_name || user.email} añadió un mensaje`
      });

      const recipientId = ticket.creator_id === user.id ? ticket.assigned_to_id : ticket.creator_id;
      if (recipientId) {
        await base44.functions.invoke('sendTicketNotification', {
          ticketId: ticketId,
          recipientId: recipientId,
          type: 'new_message',
          message: content
        });
      }

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketMessages', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticketEvents', ticketId] });
      setMessageContent("");
      scrollToBottom();
      toast.success(t('admin.campaigns.manage.chat.sent'));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.entities.Ticket.update(ticketId, {
        status: newStatus,
        last_activity: new Date().toISOString(),
        ...(newStatus === 'resuelto' && { resolved_date: new Date().toISOString() }),
        ...(newStatus === 'cerrado' && { closed_date: new Date().toISOString() })
      });

      await base44.entities.TicketEvent.create({
        ticket_id: ticketId,
        event_type: 'status_changed',
        user_id: user.id,
        user_name: user.full_name || user.email,
        description: `Estado cambiado a: ${newStatus}`,
        old_value: ticket.status,
        new_value: newStatus
      });

      // Notificar al admin cuando un usuario cierra el ticket
      if (newStatus === 'cerrado' && user.role !== 'admin') {
        try {
          await base44.functions.invoke('sendTicketNotification', {
            ticketId: ticketId,
            recipientId: 'admin',
            type: 'status_changed',
            newStatus: 'cerrado'
          });
          console.log('✅ Notificación de cierre enviada al admin');
        } catch (error) {
          console.error('⚠️ Error enviando notificación al admin:', error);
        }
      }

      // Notificar al creador si no es quien cambió el estado
      if (ticket.creator_id !== user.id) {
        try {
          await base44.functions.invoke('sendTicketNotification', {
            ticketId: ticketId,
            recipientId: ticket.creator_id,
            type: 'status_changed',
            newStatus: newStatus
          });
        } catch (error) {
          console.error('⚠️ Error enviando notificación al usuario:', error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticketEvents', ticketId] });
      toast.success(t('statusUpdated'));
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendMessageMutation.mutate({ content: messageContent });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Ticket.update(ticketId, {
        attachments: [...(ticket.attachments || []), file_url],
        last_activity: new Date().toISOString()
      });

      await base44.entities.TicketEvent.create({
        ticket_id: ticketId,
        event_type: 'attachment_added',
        user_id: user.id,
        user_name: user.full_name || user.email,
        description: `Archivo adjunto añadido: ${file.name}`
      });

      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticketEvents', ticketId] });
      toast.success(t('tickets.detail.fileUploaded'));
    } catch (error) {
      toast.error(t('tickets.toast.uploadError'));
    } finally {
      setUploadingFile(false);
    }
  };

  const getStatusLabel = (status) => {
    return statusConfig[status] ? t(statusConfig[status].key) : undefined;
  };

  if (loadingTicket || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            {t('tickets.detail.notFound')}
          </h2>
          <Button onClick={() => navigate(createPageUrl("Tickets"))}>
            {t('tickets.detail.backToTickets')}
          </Button>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusConfig[ticket.status]?.icon;

  return (
    <>
      <SEOHead 
        title={t('tickets.detail.seoTitle', { number: ticket.ticket_number })}
        description={ticket.title}
        noindex={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Tickets"))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('tickets.detail.backToTickets')}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="font-mono">
                          {ticket.ticket_number}
                        </Badge>
                        <Badge className={`${statusConfig[ticket.status]?.color} text-white`}>
                          {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {ticket.title}
                      </h1>
                      <p className="text-gray-700">
                        {ticket.description}
                      </p>
                    </div>
                  </div>

                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {t('tickets.detail.attachments')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ticket.attachments.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            {t('tickets.detail.fileN', { index: idx + 1 })}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('tickets.detail.conversation')}
                  </h2>
                  
                  <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === user.id;
                      const isAdmin = msg.sender_type === 'admin';
                      
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] ${isOwn ? 'bg-blue-600 text-white' : isAdmin ? 'bg-amber-50 border border-amber-200' : 'bg-gray-100'} rounded-lg p-4`}>
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4" />
                              <span className="text-sm font-semibold">
                                {msg.sender_name}
                              </span>
                              {isAdmin && (
                                <Badge variant="secondary" className="text-xs">{t('admin.usersTable.adminBadge')}</Badge>
                              )}
                            </div>
                            <p className={`text-sm ${isOwn ? 'text-white' : 'text-gray-800'}`}>
                              {msg.content}
                            </p>
                            <p className={`text-xs mt-2 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                              {new Date(msg.created_date).toLocaleString(locale)}
                            </p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2">
                                {msg.attachments.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`text-xs flex items-center gap-1 ${isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:underline'}`}
                                  >
                                    <FileText className="w-3 h-3" />
                                    {t('tickets.detail.attachmentN', { index: idx + 1 })}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {ticket.status !== 'cerrado' && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder={t('tickets.detail.messagePlaceholder')}
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile}
                          >
                            {uploadingFile ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Paperclip className="w-4 h-4 mr-2" />
                            )}
                            {t('tickets.detail.attach')}
                          </Button>
                        </div>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!messageContent.trim() || sendMessageMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {sendMessageMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          {t('messages.send')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {t('tickets.detail.info')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">
                        {t('admin.soporte.filter.status')}
                      </label>
                      {user.role === 'admin' ? (
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => updateStatusMutation.mutate(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="abierto">{getStatusLabel('abierto')}</SelectItem>
                            <SelectItem value="en_progreso">{getStatusLabel('en_progreso')}</SelectItem>
                            <SelectItem value="resuelto">{getStatusLabel('resuelto')}</SelectItem>
                            <SelectItem value="cerrado">{getStatusLabel('cerrado')}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : ticket.creator_id === user.id && ticket.status !== 'cerrado' ? (
                        <div className="space-y-2">
                          <Badge className={`${statusConfig[ticket.status]?.color} text-white w-full justify-center py-2`}>
                            {StatusIcon && <StatusIcon className="w-4 h-4 mr-1" />}
                            {getStatusLabel(ticket.status)}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate('cerrado')}
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2" />
                            )}
                            {t('tickets.detail.closeTicket')}
                          </Button>
                        </div>
                      ) : (
                        <Badge className={`${statusConfig[ticket.status]?.color} text-white w-full justify-center py-2`}>
                          {StatusIcon && <StatusIcon className="w-4 h-4 mr-1" />}
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 block mb-1">
                        {t('admin.soporte.filter.type')}
                      </label>
                      <Badge variant="outline" className="w-full justify-center py-2">
                        {typeConfig[ticket.type] ? t(typeConfig[ticket.type]) : null}
                      </Badge>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 block mb-1">
                        {t('tickets.detail.createdBy')}
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {ticket.creator_name}
                      </p>
                    </div>

                    {ticket.assigned_to_name && (
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">
                          {t('tickets.detail.assignedTo')}
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {ticket.assigned_to_name}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm text-gray-600 block mb-1">
                        {t('tickets.detail.created')}
                      </label>
                      <p className="text-sm text-gray-900 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(ticket.created_date).toLocaleDateString(locale)}
                      </p>
                    </div>

                    {ticket.tags && ticket.tags.length > 0 && (
                      <div>
                        <label className="text-sm text-gray-600 block mb-2">
                          {t('tickets.detail.tags')}
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {ticket.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {t('tickets.detail.timeline')}
                  </h3>
                  
                  <div className="space-y-3">
                    {events.map((event, idx) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                          {idx < events.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-gray-900">
                            {event.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.created_date).toLocaleString(locale)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Mapa explícito tipo → clave i18n.
const typeConfig = {
  soporte_cliente: "tickets.types.clientSupport",
  soporte_autonomo: "tickets.types.proSupport",
  reclamo: "tickets.types.complaint",
  problema_trabajo: "tickets.types.jobIssue",
  problema_pago: "tickets.types.paymentIssue",
  consulta_general: "tickets.types.generalQuery"
};
