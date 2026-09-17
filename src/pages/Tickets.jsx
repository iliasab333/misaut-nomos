import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { SkeletonList, EmptyState } from "@/components/ListStates";
import {
  IconLifeBuoy,
  IconPlus,
  IconSearch,
  IconFilter,
  IconClock,
  IconCheckCircle,
  IconError,
  IconAlert,
  IconFile,
  IconMessageSquare,
  IconSpinner,
} from "@/components/Icons";
import CreateTicketDialog from "../components/tickets/CreateTicketDialog";
import SEOHead from "../components/seo/SEOHead";

const statusConfig = {
  abierto: { icon: IconClock, color: "bg-c-accent", text_es: "Abierto", text_en: "Open" },
  en_progreso: { icon: IconAlert, color: "bg-warning", text_es: "En progreso", text_en: "In progress" },
  resuelto: { icon: IconCheckCircle, color: "bg-success", text_es: "Resuelto", text_en: "Resolved" },
  cerrado: { icon: IconError, color: "bg-c-muted", text_es: "Cerrado", text_en: "Closed" }
};

const typeConfig = {
  soporte_cliente: { text_es: "Soporte Cliente", text_en: "Client Support" },
  soporte_autonomo: { text_es: "Soporte Autónomo", text_en: "Professional Support" },
  reclamo: { text_es: "Reclamo", text_en: "Complaint" },
  problema_trabajo: { text_es: "Problema con trabajo", text_en: "Job Issue" },
  problema_pago: { text_es: "Problema de pago", text_en: "Payment Issue" },
  consulta_general: { text_es: "Consulta general", text_en: "General Query" }
};

export default function TicketsPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const language = i18n.language.split('-')[0];
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      console.log('🔍 Buscando tickets para usuario:', user.id);
      const allTickets = await base44.entities.Ticket.list();
      console.log('📋 Total tickets en sistema:', allTickets.length);
      
      const userTickets = allTickets.filter(t => 
        t.creator_id === user.id || t.assigned_to_id === user.id
      );
      console.log('📋 Tickets del usuario:', userTickets.length);
      
      return userTickets.sort((a, b) => 
        new Date(b.last_activity || b.created_date) - new Date(a.last_activity || a.created_date)
      );
    },
    enabled: !!user,
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;
    const matchesType = filterType === "all" || ticket.type === filterType;
    const matchesSearch = !searchTerm || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusLabel = (status) => {
    return language === 'es' ? statusConfig[status]?.text_es : statusConfig[status]?.text_en;
  };

  const getTypeLabel = (type) => {
    return language === 'es' ? typeConfig[type]?.text_es : typeConfig[type]?.text_en;
  };

  const stats = {
    total: tickets.length,
    abiertos: tickets.filter(t => t.status === 'abierto').length,
    en_progreso: tickets.filter(t => t.status === 'en_progreso').length,
    resueltos: tickets.filter(t => t.status === 'resuelto').length,
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IconSpinner className="w-8 h-8 animate-spin text-c-accent" />
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={language === 'es' ? "Mis Tickets de Soporte - MisAutónomos" : "My Support Tickets - MisAutónomos"}
        description={language === 'es' ? "Gestiona tus tickets de soporte" : "Manage your support tickets"}
        noindex={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ink mb-2 flex items-center gap-3">
                <IconLifeBuoy className="w-8 h-8 text-c-accent" />
                {language === 'es' ? 'Mis Tickets de Soporte' : 'My Support Tickets'}
              </h1>
              <p className="text-c-muted">
                {language === 'es' 
                  ? 'Gestiona tus consultas y problemas reportados'
                  : 'Manage your queries and reported issues'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="btn-primary"
            >
              <IconPlus className="w-4 h-4" />
              {language === 'es' ? 'Nuevo Ticket' : 'New Ticket'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <div className="p-4">
                <p className="text-sm text-c-muted mb-1">{language === 'es' ? 'Total' : 'Total'}</p>
                <p className="text-2xl font-bold text-ink">{stats.total}</p>
              </div>
            </div>
            <div className="card">
              <div className="p-4">
                <p className="text-sm text-c-muted mb-1">{language === 'es' ? 'Abiertos' : 'Open'}</p>
                <p className="text-2xl font-bold text-c-accent">{stats.abiertos}</p>
              </div>
            </div>
            <div className="card">
              <div className="p-4">
                <p className="text-sm text-c-muted mb-1">{language === 'es' ? 'En progreso' : 'In progress'}</p>
                <p className="text-2xl font-bold text-warning">{stats.en_progreso}</p>
              </div>
            </div>
            <div className="card">
              <div className="p-4">
                <p className="text-sm text-c-muted mb-1">{language === 'es' ? 'Resueltos' : 'Resolved'}</p>
                <p className="text-2xl font-bold text-success">{stats.resueltos}</p>
              </div>
            </div>
          </div>

          <div className="card mb-6">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <IconFilter className="w-5 h-5 text-c-accent" />
                <h2 className="font-semibold text-ink">
                  {language === 'es' ? 'Filtros' : 'Filters'}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-c-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder={language === 'es' ? "Buscar tickets..." : "Search tickets..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                    aria-label={language === 'es' ? "Buscar tickets" : "Search tickets"}
                  />
                </div>

                <select
                  className="select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label={language === 'es' ? "Estado" : "Status"}
                >
                  <option value="all">{language === 'es' ? 'Todos los estados' : 'All statuses'}</option>
                  <option value="abierto">{getStatusLabel('abierto')}</option>
                  <option value="en_progreso">{getStatusLabel('en_progreso')}</option>
                  <option value="resuelto">{getStatusLabel('resuelto')}</option>
                  <option value="cerrado">{getStatusLabel('cerrado')}</option>
                </select>

                <select
                  className="select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  aria-label={language === 'es' ? "Tipo" : "Type"}
                >
                  <option value="all">{language === 'es' ? 'Todos los tipos' : 'All types'}</option>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {language === 'es' ? config.text_es : config.text_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <SkeletonList count={3} avatar={false} />
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              icon={<IconFile size={24} />}
              title={language === 'es' ? 'No hay tickets' : 'No tickets'}
              body={language === 'es'
                ? 'Crea tu primer ticket de soporte para obtener ayuda'
                : 'Create your first support ticket to get help'}
              ctaLabel={language === 'es' ? 'Crear Ticket' : 'Create Ticket'}
              onCta={() => setShowCreateDialog(true)}
            />
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const StatusIcon = statusConfig[ticket.status]?.icon;
                const messageCount = messageCounts[ticket.id] || 0;
                
                return (
                  <div
                    key={ticket.id}
                    className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-c-border hover:border-c-accent/40"
                    onClick={() => navigate(createPageUrl("TicketDetail") + `?id=${ticket.id}`)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="badge-outline font-mono text-xs">
                              {ticket.ticket_number}
                            </span>
                            <span className={`badge ${statusConfig[ticket.status]?.color} text-white`}>
                              {StatusIcon && <StatusIcon className="w-3 h-3" />}
                              {getStatusLabel(ticket.status)}
                            </span>
                            <span className="badge-outline">
                              {getTypeLabel(ticket.type)}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-ink mb-2">
                            {ticket.title}
                          </h3>
                          
                          <p className="text-c-muted line-clamp-2 mb-3">
                            {ticket.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-c-muted">
                            <div className="flex items-center gap-1">
                              <IconMessageSquare className="w-4 h-4" />
                              <span>{messageCount} {language === 'es' ? 'mensajes' : 'messages'}</span>
                            </div>
                            <span>
                              {language === 'es' ? 'Creado' : 'Created'}{' '}
                              {new Date(ticket.created_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                            </span>
                            {ticket.last_activity && (
                              <span>
                                {language === 'es' ? 'Actualizado' : 'Updated'}{' '}
                                {new Date(ticket.last_activity).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                              </span>
                            )}
                          </div>

                          {ticket.tags && ticket.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {ticket.tags.map((tag, idx) => (
                                <span key={idx} className="badge-muted text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateTicketDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        user={user}
      />
    </>
  );
}
