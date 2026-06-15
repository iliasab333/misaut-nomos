import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, FileText, Send, CheckCircle, Euro, Download, Eye, Trash2, Loader2, XCircle, RefreshCw, FolderKanban, Link as LinkIcon, Share2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import SEOHead from "@/components/seo/SEOHead";
import QuoteForm from "@/components/quotes/QuoteForm";
// quotePdfGenerator → jspdf (~600 KB). Carga dinámica al pulsar Descargar.
const importQuotePdfGenerator = () => import('@/services/quotePdfGenerator');
const downloadQuotePDFWithLogo = async (q) => {
  const mod = await importQuotePdfGenerator();
  return mod.downloadQuotePDFWithLogo(q);
};
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG = {
  borrador: { label: "Borrador", className: "bg-gray-100 text-gray-700" },
  enviado:  { label: "Enviado",  className: "bg-blue-50 text-blue-700" },
  aceptado: { label: "Aceptado", className: "bg-green-50 text-green-700" },
  rechazado:{ label: "Rechazado",className: "bg-red-50 text-red-700" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.borrador;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

function MetricCard({ label, value, icon: Icon, color = "gray" }) {
  const colors = { gray: "text-gray-600", blue: "text-blue-600", green: "text-green-600", amber: "text-amber-600" };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <Icon className={`w-4 h-4 ${colors[color]}`} />
      </div>
      <p className={`text-xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}

export default function PresupuestosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [viewQuote, setViewQuote] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [shareQuote, setShareQuote] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin()).finally(() => setLoadingUser(false));
  }, []);

  const isProfessional = user?.user_type === "professionnel";

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes', user?.id, isProfessional],
    queryFn: () => isProfessional
      ? base44.entities.Quote.filter({ professional_id: user.id }, '-created_date')
      : base44.entities.Quote.filter({ client_id: user.id }, '-created_date'),
    enabled: !!user,
  });

  const filteredQuotes = filter === "todos" ? quotes : quotes.filter(q => q.status === filter);

  const metrics = {
    total: quotes.length,
    enviados: quotes.filter(q => q.status === 'enviado').length,
    aceptados: quotes.filter(q => q.status === 'aceptado').length,
    totalAceptado: quotes.filter(q => q.status === 'aceptado').reduce((s, q) => s + (q.total || 0), 0),
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await base44.entities.Quote.delete(deleteTarget.id);
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    toast.success("Presupuesto eliminado");
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleSendNow = async (q) => {
    setSendingId(q.id);
    try {
      // Enviar por chat
      const ids = [q.professional_id, q.client_id].sort();
      const conversationId = ids[0] + '_' + ids[1];
      const { getQuotePDFBase64 } = await import('@/services/quotePdfGenerator');
      const pdfBase64 = getQuotePDFBase64(q);

      const { createMessage } = await import('@/lib/createMessage');
      const msg = await createMessage({
        conversation_id: conversationId,
        sender_id: q.professional_id,
        recipient_id: q.client_id,
        content: `📄 Te envío el presupuesto: ${q.title}\n\nNº ${q.quote_number}\nTotal: ${parseFloat(q.total).toFixed(2)}€\nVálido hasta: ${q.valid_until ? new Date(q.valid_until).toLocaleDateString('es-ES') : ''}`,
        professional_name: q.professional_name,
        client_name: q.client_name,
        is_read: false,
        attachments: [{ url: pdfBase64, name: `${q.quote_number}.pdf`, type: 'application/pdf', size: pdfBase64.length }],
        quote_request: { quote_amount: q.total, status: 'pending', professional_responded: true }
      });

      await base44.entities.Quote.update(q.id, {
        status: 'enviado',
        sent_date: new Date().toISOString(),
        sent_via_chat: true,
        sent_conversation_id: conversationId,
        quote_message_id: msg.id
      });

      base44.functions.invoke('sendPushNotification', {
        userIds: [q.client_id],
        title: `📄 Nuevo presupuesto de ${q.professional_name}`,
        message: `${q.title} — ${parseFloat(q.total).toFixed(2)}€`,
        url: 'https://misautonomos.es/mensajes'
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success("Presupuesto enviado por chat");
    } catch (err) {
      toast.error("Error al enviar: " + err.message);
    } finally {
      setSendingId(null);
    }
  };

  const handleConvertToProject = async (q) => {
    try {
      const project = await base44.entities.Project.create({
        professional_id: user.id,
        client_contact_id: q.client_contact_id || q.client_id,
        client_name: q.client_name,
        name: q.title,
        description: q.description,
        status: 'planning',
        priority: 'medium',
        budget: q.total,
        total_hours_estimated: (q.estimated_days || 0) * 8,
        progress_percentage: 0,
        color: '#3B82F6'
      });
      toast.success("Proyecto creado");
      navigate(`/proyectos/${project.id}`);
    } catch {
      toast.error("Error al crear proyecto");
    }
  };

  const handleConvertToInvoice = async (q) => {
    try {
      const response = await base44.functions.invoke('convertQuoteToInvoice', { quoteId: q.id });
      
      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success(`✅ Factura ${response.data.invoice.invoice_number} creada`);
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error) {
      console.error("Error converting to invoice:", error);
      toast.error("Error al convertir en factura");
    }
  };

  const handleShare = (q) => {
    setShareQuote(q);
    setCopied(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/presupuesto/${shareQuote.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
    </div>
  );

  const TABS = ['todos', 'borrador', 'enviado', 'aceptado', 'rechazado'];
  const TAB_LABELS = { todos: 'Todos', borrador: 'Borrador', enviado: 'Enviado', aceptado: 'Aceptado', rechazado: 'Rechazado' };

  return (
    <>
      <SEOHead title="Presupuestos — MisAutónomos" description="Crea, envía y gestiona tus presupuestos" />

      <div className="max-w-5xl mx-auto p-4 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Presupuestos</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isProfessional ? "Crea, envía y gestiona tus presupuestos" : "Presupuestos recibidos"}
            </p>
          </div>
          {isProfessional && (
            <button
              onClick={() => { setEditingQuote(null); setShowForm(true); }}
              className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />Nuevo presupuesto
            </button>
          )}
        </div>

        {/* Métricas */}
        {isProfessional && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MetricCard label="Total" value={metrics.total} icon={FileText} />
            <MetricCard label="Enviados" value={metrics.enviados} icon={Send} color="blue" />
            <MetricCard label="Aceptados" value={metrics.aceptados} icon={CheckCircle} color="green" />
            <MetricCard label="Importe aceptado" value={`${metrics.totalAceptado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`} icon={Euro} color="amber" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0.5 border-b border-gray-100 mb-4 overflow-x-auto scrollbar-hide">
          {TABS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${filter === s ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {TAB_LABELS[s]}
              {s !== 'todos' && quotes.filter(q => q.status === s).length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {quotes.filter(q => q.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {filter === 'todos' ? (isProfessional ? 'No has creado presupuestos aún' : 'No has recibido presupuestos') : `Sin presupuestos ${TAB_LABELS[filter].toLowerCase()}s`}
            </p>
            {isProfessional && filter === 'todos' && (
              <button onClick={() => { setEditingQuote(null); setShowForm(true); }} className="mt-3 text-sm text-blue-600 hover:underline">
                Crear el primer presupuesto →
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Número</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">{isProfessional ? 'Cliente' : 'Profesional'}</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Fecha</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Total</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map(q => (
                    <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{q.quote_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{isProfessional ? q.client_name : q.professional_name}</td>
                      <td className="px-4 py-3 text-gray-500">{q.issue_date ? new Date(q.issue_date).toLocaleDateString('es-ES') : format(new Date(q.created_date), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{parseFloat(q.total || 0).toFixed(2)}€</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={q.status} /></td>
                      <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end items-center">
                        <button onClick={() => handleShare(q)} title="Compartir" className="p-1.5 hover:bg-blue-50 rounded">
                          <Share2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button onClick={() => setViewQuote(q)} title="Ver" className="p-1.5 hover:bg-gray-100 rounded">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => downloadQuotePDFWithLogo(q)} title="Descargar PDF" className="p-1.5 hover:bg-gray-100 rounded">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                          {isProfessional && q.status === 'borrador' && (
                            <button
                              onClick={() => handleSendNow(q)}
                              title="Enviar por chat"
                              disabled={sendingId === q.id}
                              className="p-1.5 hover:bg-blue-50 rounded"
                            >
                              {sendingId === q.id ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <Send className="w-4 h-4 text-blue-500" />}
                            </button>
                          )}
                          {isProfessional && q.status === 'aceptado' && (
                            <>
                              <button onClick={() => handleConvertToInvoice(q)} title="Convertir a factura" className="p-1.5 hover:bg-green-50 rounded">
                                <FileText className="w-4 h-4 text-green-500" />
                              </button>
                              <button onClick={() => handleConvertToProject(q)} title="Convertir a proyecto" className="p-1.5 hover:bg-indigo-50 rounded">
                                <FolderKanban className="w-4 h-4 text-indigo-500" />
                              </button>
                            </>
                          )}
                          {isProfessional && (
                            <button onClick={() => { setEditingQuote(q); setShowForm(true); }} title="Editar" className="p-1.5 hover:bg-gray-100 rounded">
                              <RefreshCw className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                          {isProfessional && (
                            <button onClick={() => setDeleteTarget(q)} title="Eliminar" className="p-1.5 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {filteredQuotes.map(q => (
                <div key={q.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{q.title}</p>
                      <p className="text-xs text-gray-500">{q.quote_number || '—'} · {isProfessional ? q.client_name : q.professional_name}</p>
                    </div>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{parseFloat(q.total || 0).toFixed(2)}€</span>
                    <div className="flex gap-1">
                      <button onClick={() => downloadQuotePDFWithLogo(q)} className="p-1.5 hover:bg-gray-100 rounded"><Download className="w-4 h-4 text-gray-500" /></button>
                      {isProfessional && q.status === 'borrador' && (
                        <button onClick={() => handleSendNow(q)} disabled={sendingId === q.id} className="p-1.5 hover:bg-blue-50 rounded">
                          {sendingId === q.id ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <Send className="w-4 h-4 text-blue-500" />}
                        </button>
                      )}
                      {isProfessional && q.status === 'aceptado' && (
                        <button onClick={() => handleConvertToInvoice(q)} title="Convertir a factura" className="p-1.5 hover:bg-green-50 rounded">
                          <FileText className="w-4 h-4 text-green-500" />
                        </button>
                      )}
                      {isProfessional && (
                        <button onClick={() => setDeleteTarget(q)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-gray-400" /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vista detalle */}
      {viewQuote && (
        <AlertDialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {viewQuote.title}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={viewQuote.status} />
                <span className="text-gray-500">{viewQuote.quote_number}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3 text-xs">
                <div><span className="text-gray-500">Cliente:</span> <strong>{viewQuote.client_name}</strong></div>
                <div><span className="text-gray-500">Fecha:</span> {viewQuote.issue_date || format(new Date(viewQuote.created_date), 'dd/MM/yyyy')}</div>
                <div><span className="text-gray-500">Válido hasta:</span> {viewQuote.valid_until || '—'}</div>
                {viewQuote.estimated_days && <div><span className="text-gray-500">Días estimados:</span> {viewQuote.estimated_days}</div>}
              </div>
              {viewQuote.description && <p className="text-gray-700">{viewQuote.description}</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border rounded-lg overflow-hidden min-w-[360px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-center">Cant.</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewQuote.items || []).map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{item.concept}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{parseFloat(item.unit_price || 0).toFixed(2)}€</td>
                        <td className="px-3 py-2 text-right font-medium">{parseFloat(item.total || 0).toFixed(2)}€</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr className="border-t"><td colSpan={3} className="px-3 py-1.5 text-right">Subtotal:</td><td className="px-3 py-1.5 text-right">{parseFloat(viewQuote.subtotal || 0).toFixed(2)}€</td></tr>
                    <tr><td colSpan={3} className="px-3 py-1.5 text-right">IVA:</td><td className="px-3 py-1.5 text-right">{parseFloat(viewQuote.total_iva || 0).toFixed(2)}€</td></tr>
                    {viewQuote.aplica_retencion && <tr><td colSpan={3} className="px-3 py-1.5 text-right text-red-600">Retención ({viewQuote.porcentaje_retencion}%):</td><td className="px-3 py-1.5 text-right text-red-600">-{parseFloat(viewQuote.total_retencion || 0).toFixed(2)}€</td></tr>}
                    <tr className="border-t-2"><td colSpan={3} className="px-3 py-2 text-right font-bold">TOTAL:</td><td className="px-3 py-2 text-right font-bold text-green-700">{parseFloat(viewQuote.total || 0).toFixed(2)}€</td></tr>
                  </tfoot>
                </table>
              </div>
              {viewQuote.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 font-medium text-xs">Motivo del rechazo:</p>
                  <p className="text-red-600 text-xs mt-1">{viewQuote.rejection_reason}</p>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cerrar</AlertDialogCancel>
              <AlertDialogAction onClick={() => downloadQuotePDFWithLogo(viewQuote)} className="bg-gray-900 hover:bg-gray-800">
                <Download className="w-4 h-4 mr-1" />Descargar PDF
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Form modal */}
      {showForm && (
        <QuoteForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditingQuote(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['quotes'] })}
          user={user}
          initialQuote={editingQuote}
        />
      )}

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />Eliminar presupuesto
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar <strong>{deleteTarget?.title}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog compartir */}
      <AlertDialog open={!!shareQuote} onOpenChange={() => setShareQuote(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Compartir presupuesto
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Envía este enlace a <strong>{shareQuote?.client_name}</strong> para que pueda ver y aceptar el presupuesto online.
              </p>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Enlace público:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/presupuesto/${shareQuote?.id}`}
                    readOnly
                    className="flex-1 text-xs bg-white border rounded px-2 py-1.5"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className={copied ? "bg-green-50 border-green-200 text-green-700" : ""}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>💡 Consejo:</strong> El cliente podrá aceptar o rechazar el presupuesto desde este enlace. 
                  Una vez aceptado, podrás convertirlo automáticamente en factura.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyLink} className="bg-blue-600 hover:bg-blue-700">
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              {copied ? "Copiado" : "Copiar enlace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}