import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Modal from "@/components/Modal";
import { SkeletonLine } from "@/components/ListStates";
import {
  IconSearch,
  IconClock,
  IconCheckCircle,
  IconError,
  IconAlert,
  IconMessageSquare,
  IconNote,
  IconUserCog,
  IconRefresh,
  IconSpinner
} from "@/components/Icons";
import { toast } from "@/lib/toast";

// Icono y color por estado. La etiqueta visible sale de `statusLabels` (t())
// dentro del componente; `text` se conserva sólo para la descripción del
// TicketEvent que se persiste en la BD, que sigue en español como hasta ahora.
const statusConfig = {
  abierto: { icon: IconClock, color: "bg-c-accent", text: "Abierto" },
  en_progreso: { icon: IconAlert, color: "bg-warning", text: "En progreso" },
  resuelto: { icon: IconCheckCircle, color: "bg-success", text: "Resuelto" },
  cerrado: { icon: IconError, color: "bg-c-muted", text: "Cerrado" }
};

export default function AdminTicketsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [assignToEmail, setAssignToEmail] = useState("");

  const statusLabels = {
    abierto: t('admin.tickets.status.open'),
    en_progreso: t('admin.tickets.status.inProgress'),
    resuelto: t('admin.tickets.status.resolved'),
    cerrado: t('admin.tickets.status.closed'),
  };

  const typeLabels = {
    soporte_cliente: t('admin.tickets.types.clientSupport'),
    soporte_autonomo: t('admin.tickets.types.proSupport'),
    reclamo: t('admin.tickets.types.complaint'),
    problema_trabajo: t('admin.tickets.types.jobIssue'),
    problema_pago: t('admin.tickets.types.paymentIssue'),
    consulta_general: t('admin.tickets.types.generalQuery'),
  };

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['adminTickets'],
    queryFn: async () => {
      console.log('🔍 Cargando tickets para admin...');
      const allTickets = await base44.entities.Ticket.list();
      console.log('📋 Total tickets encontrados:', allTickets.length);
      console.log('Tickets:', allTickets);
      return allTickets.sort((a, b) => 
        new Date(b.last_activity || b.created_date) - new Date(a.last_activity || a.created_date)
      );
    },
    enabled: !!user && user.role === 'admin',
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: messageCounts = {} } = useQuery({
    queryKey: ['ticketMessageCounts'],
    queryFn: async () => {
      const allMessages = await base44.entities.TicketMessage.list();
      const counts = {};
      allMessages.forEach(msg => {
        counts[msg.ticket_id] = (counts[msg.ticket_id] || 0) + 1;
      });
      return counts;
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ ticketId, note }) => {
      await base44.entities.Ticket.update(ticketId, {
        internal_notes: note,
        last_activity: new Date().toISOString()
      });

      await base44.entities.TicketEvent.create({
        ticket_id: ticketId,
        event_type: 'note_added',
        user_id: 'admin',
        user_name: 'Administración',
        description: 'Nota interna añadida'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
      toast.success(t('admin.tickets.noteAdded'));
      setShowNoteDialog(false);
      setInternalNote("");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }) => {
      const ticket = tickets.find(t => t.id === ticketId);
      
      await base44.entities.Ticket.update(ticketId, {
        status,
        last_activity: new Date().toISOString(),
        ...(status === 'resuelto' && { resolved_date: new Date().toISOString() }),
        ...(status === 'cerrado' && { closed_date: new Date().toISOString() })
      });

      await base44.entities.TicketEvent.create({
        ticket_id: ticketId,
        event_type: 'status_changed',
        user_id: 'admin',
        user_name: 'Administración',
        description: `Estado cambiado a: ${statusConfig[status]?.text}`,
        old_value: ticket.status,
        new_value: status
      });

      if (ticket.creator_id) {
        await base44.functions.invoke('sendTicketNotification', {
          ticketId: ticketId,
          recipientId: ticket.creator_id,
          type: 'status_changed',
          newStatus: status
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
      toast.success(t('statusUpdated'));
    },
  });

  const assignTicketMutation = useMutation({
    mutationFn: async ({ ticketId, adminEmail }) => {
      const admins = await base44.entities.User.filter({ email: adminEmail, role: 'admin' });
      
      if (admins.length === 0) {
        throw new Error(t('admin.tickets.assign.adminNotFound'));
      }

      const admin = admins[0];
      
      await base44.entities.Ticket.update(ticketId, {
        admin_assigned_id: admin.id,
        admin_assigned_name: admin.full_name || admin.email,
        last_activity: new Date().toISOString()
      });

      await base44.entities.TicketEvent.create({
        ticket_id: ticketId,
        event_type: 'assigned',
        user_id: 'admin',
        user_name: 'Administración',
        description: `Ticket asignado a ${admin.full_name || admin.email}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
      toast.success(t('admin.tickets.assign.success'));
      setShowAssignDialog(false);
      setAssignToEmail("");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;
    const matchesType = filterType === "all" || ticket.type === filterType;
    const matchesSearch = !searchTerm || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.creator_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  const stats = {
    total: tickets.length,
    abiertos: tickets.filter(t => t.status === 'abierto').length,
    en_progreso: tickets.filter(t => t.status === 'en_progreso').length,
    resueltos: tickets.filter(t => t.status === 'resuelto').length,
    cerrados: tickets.filter(t => t.status === 'cerrado').length,
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IconSpinner size={32} className="animate-spin text-c-accent" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md p-8 text-center">
          <IconAlert size={64} className="text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-2">{t('admin.tickets.accessDenied.title')}</h2>
          <p className="text-c-muted mb-4">{t('admin.tickets.accessDenied.text')}</p>
          <button type="button" className="btn-primary" onClick={() => navigate(createPageUrl("Tickets"))}>
            {t('admin.tickets.accessDenied.backToTickets')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink mb-2">
              {t('admin.tickets.title')}
            </h1>
            <p className="text-c-muted">{t('admin.tickets.subtitle', { total: tickets.length })}</p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['adminTickets'] })}
          >
            <IconRefresh size={16} />
            {t('admin.tickets.refresh')}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card">
            <div className="p-4">
              <p className="text-sm text-c-muted mb-1">{t('total')}</p>
              <p className="text-2xl font-bold text-ink">{stats.total}</p>
            </div>
          </div>
          <div className="card">
            <div className="p-4">
              <p className="text-sm text-c-muted mb-1">{t('admin.tickets.stats.open')}</p>
              <p className="text-2xl font-bold text-c-accent">{stats.abiertos}</p>
            </div>
          </div>
          <div className="card">
            <div className="p-4">
              <p className="text-sm text-c-muted mb-1">{t('admin.tickets.status.inProgress')}</p>
              <p className="text-2xl font-bold text-warning">{stats.en_progreso}</p>
            </div>
          </div>
          <div className="card">
            <div className="p-4">
              <p className="text-sm text-c-muted mb-1">{t('admin.tickets.stats.resolved')}</p>
              <p className="text-2xl font-bold text-success">{stats.resueltos}</p>
            </div>
          </div>
          <div className="card">
            <div className="p-4">
              <p className="text-sm text-c-muted mb-1">{t('admin.tickets.stats.closed')}</p>
              <p className="text-2xl font-bold text-c-muted">{stats.cerrados}</p>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-c-muted pointer-events-none" />
                <input
                  className="input pl-10"
                  placeholder={t('admin.tickets.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label={t('admin.tickets.searchPlaceholder')}
                />
              </div>

              <select
                className="select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label={t('admin.tickets.filters.statusPlaceholder')}
              >
                <option value="all">{t('admin.tickets.filters.allStatuses')}</option>
                <option value="abierto">{statusLabels.abierto}</option>
                <option value="en_progreso">{statusLabels.en_progreso}</option>
                <option value="resuelto">{statusLabels.resuelto}</option>
                <option value="cerrado">{statusLabels.cerrado}</option>
              </select>

              <select
                className="select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label={t('admin.tickets.filters.typePlaceholder')}
              >
                <option value="all">{t('admin.tickets.filters.allTypes')}</option>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadingTickets ? (
          /* Misma altura que la tarjeta de ticket real (card p-6: fila de
             etiquetas, título, descripción de una línea, pie de metadatos y
             los tres botones a la derecha), para que nada salte al llegar. */
          <div className="space-y-4" aria-busy="true" aria-label={t('common.loading')}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card" aria-hidden="true">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <SkeletonLine width={88} height={20} />
                        <SkeletonLine width={104} height={20} />
                        <SkeletonLine width={80} height={20} />
                      </div>
                      <SkeletonLine width="55%" height={28} className="mb-2" />
                      <SkeletonLine width="90%" height={24} className="mb-3" />
                      <div className="flex items-center gap-4">
                        <SkeletonLine width={128} height={20} />
                        <SkeletonLine width={40} height={20} />
                        <SkeletonLine width={80} height={20} />
                      </div>
                    </div>
                    <div className="hidden sm:flex gap-2 shrink-0">
                      <SkeletonLine width={96} height={40} />
                      <SkeletonLine width={96} height={40} />
                      <SkeletonLine width={96} height={40} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const StatusIcon = statusConfig[ticket.status]?.icon;
              const messageCount = messageCounts[ticket.id] || 0;
              
              return (
                <div key={ticket.id} className="card hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge-outline font-mono text-xs">
                            {ticket.ticket_number}
                          </span>
                          <span className={`badge ${statusConfig[ticket.status]?.color} text-white`}>
                            {StatusIcon && <StatusIcon size={12} />}
                            {statusLabels[ticket.status]}
                          </span>
                          <span className="badge-outline">{typeLabels[ticket.type]}</span>
                        </div>
                        
                        <h3 
                          className="text-lg font-semibold text-ink mb-2 hover:text-c-accent cursor-pointer"
                          onClick={() => navigate(createPageUrl("TicketDetail") + `?id=${ticket.id}`)}
                        >
                          {ticket.title}
                        </h3>
                        
                        <p className="text-c-muted line-clamp-1 mb-3">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-c-muted">
                          <span>{t('admin.tickets.card.by', { name: ticket.creator_name })}</span>
                          <div className="flex items-center gap-1">
                            <IconMessageSquare size={16} />
                            <span>{messageCount}</span>
                          </div>
                          <span>
                            {new Date(ticket.last_activity || ticket.created_date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowNoteDialog(true);
                          }}
                        >
                          <IconNote size={16} />
                          {t('admin.tickets.actions.note')}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowAssignDialog(true);
                          }}
                        >
                          <IconUserCog size={16} />
                          {t('admin.tickets.actions.assign')}
                        </button>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => navigate(createPageUrl("TicketDetail") + `?id=${ticket.id}`)}
                        >
                          {t('view')}
                        </button>
                      </div>
                    </div>
                    
                    {ticket.internal_notes && (
                      <div className="mt-4 pt-4 border-t border-c-border">
                        <p className="text-xs text-c-muted mb-1">{t('admin.tickets.card.internalNote')}</p>
                        <p className="text-sm text-ink bg-warning/10 p-2 rounded">
                          {ticket.internal_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showNoteDialog}
        onClose={() => setShowNoteDialog(false)}
        title={t('admin.tickets.noteDialog.title')}
      >
        <div>
          <textarea
            className="textarea"
            placeholder={t('admin.tickets.noteDialog.placeholder')}
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={4}
            aria-label={t('admin.tickets.noteDialog.title')}
          />
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => setShowNoteDialog(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (selectedTicket) {
                addNoteMutation.mutate({ ticketId: selectedTicket.id, note: internalNote });
              }
            }}
          >
            {t('admin.tickets.noteDialog.save')}
          </button>
        </div>
      </Modal>

      <Modal
        open={showAssignDialog}
        onClose={() => setShowAssignDialog(false)}
        title={t('admin.tickets.assign.dialogTitle')}
      >
        <div>
          <label className="label" htmlFor="assign-admin-email">
            {t('admin.tickets.assign.emailLabel')}
          </label>
          <input
            id="assign-admin-email"
            className="input"
            placeholder={t('admin.tickets.assign.emailPlaceholder')}
            value={assignToEmail}
            onChange={(e) => setAssignToEmail(e.target.value)}
          />
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => setShowAssignDialog(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (selectedTicket && assignToEmail) {
                assignTicketMutation.mutate({ ticketId: selectedTicket.id, adminEmail: assignToEmail });
              }
            }}
          >
            {t('admin.tickets.actions.assign')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
