import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  StickyNote,
  UserCog,
  RefreshCw,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

// Icono y color por estado. La etiqueta visible sale de `statusLabels` (t())
// dentro del componente; `text` se conserva sólo para la descripción del
// TicketEvent que se persiste en la BD, que sigue en español como hasta ahora.
const statusConfig = {
  abierto: { icon: Clock, color: "bg-blue-500", text: "Abierto" },
  en_progreso: { icon: AlertCircle, color: "bg-amber-500", text: "En progreso" },
  resuelto: { icon: CheckCircle, color: "bg-green-500", text: "Resuelto" },
  cerrado: { icon: XCircle, color: "bg-gray-500", text: "Cerrado" }
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('admin.tickets.accessDenied.title')}</h2>
          <p className="text-gray-600 mb-4">{t('admin.tickets.accessDenied.text')}</p>
          <Button onClick={() => navigate(createPageUrl("Tickets"))}>
            {t('admin.tickets.accessDenied.backToTickets')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('admin.tickets.title')}
            </h1>
            <p className="text-gray-600">{t('admin.tickets.subtitle', { total: tickets.length })}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['adminTickets'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('admin.tickets.refresh')}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">{t('total')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">{t('admin.tickets.stats.open')}</p>
              <p className="text-2xl font-bold text-blue-600">{stats.abiertos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">{t('admin.tickets.status.inProgress')}</p>
              <p className="text-2xl font-bold text-amber-600">{stats.en_progreso}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">{t('admin.tickets.stats.resolved')}</p>
              <p className="text-2xl font-bold text-green-600">{stats.resueltos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">{t('admin.tickets.stats.closed')}</p>
              <p className="text-2xl font-bold text-gray-600">{stats.cerrados}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('admin.tickets.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.tickets.filters.statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.tickets.filters.allStatuses')}</SelectItem>
                  <SelectItem value="abierto">{statusLabels.abierto}</SelectItem>
                  <SelectItem value="en_progreso">{statusLabels.en_progreso}</SelectItem>
                  <SelectItem value="resuelto">{statusLabels.resuelto}</SelectItem>
                  <SelectItem value="cerrado">{statusLabels.cerrado}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.tickets.filters.typePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.tickets.filters.allTypes')}</SelectItem>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loadingTickets ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const StatusIcon = statusConfig[ticket.status]?.icon;
              const messageCount = messageCounts[ticket.id] || 0;
              
              return (
                <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {ticket.ticket_number}
                          </Badge>
                          <Badge className={`${statusConfig[ticket.status]?.color} text-white`}>
                            {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                            {statusLabels[ticket.status]}
                          </Badge>
                          <Badge variant="outline">{typeLabels[ticket.type]}</Badge>
                        </div>
                        
                        <h3 
                          className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-700 cursor-pointer"
                          onClick={() => navigate(createPageUrl("TicketDetail") + `?id=${ticket.id}`)}
                        >
                          {ticket.title}
                        </h3>
                        
                        <p className="text-gray-600 line-clamp-1 mb-3">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{t('admin.tickets.card.by', { name: ticket.creator_name })}</span>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{messageCount}</span>
                          </div>
                          <span>
                            {new Date(ticket.last_activity || ticket.created_date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowNoteDialog(true);
                          }}
                        >
                          <StickyNote className="w-4 h-4 mr-1" />
                          {t('admin.tickets.actions.note')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowAssignDialog(true);
                          }}
                        >
                          <UserCog className="w-4 h-4 mr-1" />
                          {t('admin.tickets.actions.assign')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(createPageUrl("TicketDetail") + `?id=${ticket.id}`)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {t('view')}
                        </Button>
                      </div>
                    </div>
                    
                    {ticket.internal_notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">{t('admin.tickets.card.internalNote')}</p>
                        <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded">
                          {ticket.internal_notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.tickets.noteDialog.title')}</DialogTitle>
          </DialogHeader>
          <div>
            <Textarea
              placeholder={t('admin.tickets.noteDialog.placeholder')}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (selectedTicket) {
                  addNoteMutation.mutate({ ticketId: selectedTicket.id, note: internalNote });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('admin.tickets.noteDialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.tickets.assign.dialogTitle')}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('admin.tickets.assign.emailLabel')}
            </label>
            <Input
              placeholder={t('admin.tickets.assign.emailPlaceholder')}
              value={assignToEmail}
              onChange={(e) => setAssignToEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (selectedTicket && assignToEmail) {
                  assignTicketMutation.mutate({ ticketId: selectedTicket.id, adminEmail: assignToEmail });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('admin.tickets.actions.assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
