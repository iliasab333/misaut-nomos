import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { FileText, CheckCircle, XCircle, Download, Eye, Euro, Calendar, User, Mail, Phone, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
// quotePdfGenerator → jspdf (~600 KB). Carga dinámica al pulsar Descargar.
import SEOHead from "@/components/seo/SEOHead";

const STATUS_CONFIG = {
  borrador: { label: "Borrador", className: "bg-gray-100 text-gray-700" },
  enviado: { label: "Enviado", className: "bg-blue-50 text-blue-700" },
  aceptado: { label: "Aceptado", className: "bg-green-50 text-green-700" },
  rechazado: { label: "Rechazado", className: "bg-red-50 text-red-700" },
};

export default function AcceptQuotePage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const quotes = await base44.entities.Quote.filter({ id: quoteId });
      if (!quotes || quotes.length === 0) {
        toast.error("Presupuesto no encontrado");
        navigate("/buscar");
        return;
      }
      const q = quotes[0];
      setQuote(q);

      // Verificar si el usuario actual es el cliente
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.id !== q.client_id && currentUser.role !== "admin") {
          toast.error("No tienes permiso para ver este presupuesto");
          navigate("/buscar");
        }
      } catch {
        // Usuario no logueado - permitir ver pero no aceptar
      }
    } catch (error) {
      console.error("Error loading quote:", error);
      toast.error("Error al cargar el presupuesto");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!fullName.trim() || !termsAccepted) {
      toast.error("Debes completar tu nombre y aceptar los términos");
      return;
    }

    setAccepting(true);
    try {
      await base44.entities.Quote.update(quote.id, {
        status: "aceptado",
        accepted_date: new Date().toISOString(),
        client_signature: fullName.trim(),
        client_signature_date: new Date().toISOString(),
        acceptance_ip: await getClientIP()
      });

      // Notificar al profesional (push + in-app)
      try {
        await base44.functions.invoke("sendPushNotification", {
          userIds: [quote.professional_id],
          title: `✅ Presupuesto aceptado`,
          message: `${quote.client_name} ha aceptado el presupuesto: ${quote.title}`,
          url: `https://misautonomos.es/presupuestos`
        });
        await base44.entities.Notification.create({
          user_id: quote.professional_id,
          type: 'quote_accepted',
          title: `✅ Presupuesto aceptado`,
          message: `${quote.client_name} ha aceptado "${quote.title}" — ${parseFloat(quote.total || 0).toFixed(2)}€`,
          link: '/presupuestos'
        });
      } catch {}

      toast.success("¡Presupuesto aceptado correctamente!");
      setShowAcceptDialog(false);
      setQuote(prev => ({
        ...prev,
        status: "aceptado",
        accepted_date: new Date().toISOString(),
        client_signature: fullName.trim()
      }));
    } catch (error) {
      console.error("Error accepting quote:", error);
      toast.error("Error al aceptar el presupuesto");
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor, indica el motivo del rechazo");
      return;
    }

    setRejecting(true);
    try {
      await base44.entities.Quote.update(quote.id, {
        status: "rechazado",
        rejection_reason: rejectionReason.trim(),
        rejection_date: new Date().toISOString()
      });

      // Notificar al profesional (push + in-app)
      try {
        await base44.functions.invoke("sendPushNotification", {
          userIds: [quote.professional_id],
          title: `❌ Presupuesto rechazado`,
          message: `${quote.client_name} ha rechazado el presupuesto: ${quote.title}`,
          url: `https://misautonomos.es/presupuestos`
        });
        await base44.entities.Notification.create({
          user_id: quote.professional_id,
          type: 'quote_rejected',
          title: `❌ Presupuesto rechazado`,
          message: `${quote.client_name} ha rechazado "${quote.title}". Motivo: ${rejectionReason.trim()}`,
          link: '/presupuestos'
        });
      } catch {}

      toast.success("Presupuesto rechazado");
      setShowRejectDialog(false);
      setQuote(prev => ({
        ...prev,
        status: "rechazado",
        rejection_reason: rejectionReason.trim()
      }));
    } catch (error) {
      console.error("Error rejecting quote:", error);
      toast.error("Error al rechazar el presupuesto");
    } finally {
      setRejecting(false);
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  const isAccepted = quote.status === "aceptado";
  const isRejected = quote.status === "rechazado";
  const canInteract = user && user.id === quote.client_id;

  return (
    <>
      <SEOHead 
        title={`Presupuesto ${quote.quote_number} — ${quote.title}`} 
        description={`Presupuesto de ${quote.professional_name}: ${quote.title}`} 
      />

      <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
                <p className="text-sm text-gray-500 mt-1">{quote.quote_number}</p>
              </div>
              <Badge className={STATUS_CONFIG[quote.status]?.className || STATUS_CONFIG.borrador.className}>
                {STATUS_CONFIG[quote.status]?.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Info profesional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Profesional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold text-gray-900">{quote.professional_name}</p>
              {quote.emisor_email && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {quote.emisor_email}
                </p>
              )}
              {quote.emisor_telefono && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {quote.emisor_telefono}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Info cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold text-gray-900">{quote.client_name}</p>
              {quote.client_email && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {quote.client_email}
                </p>
              )}
              {quote.client_nif && (
                <p className="text-sm text-gray-600">NIF: {quote.client_nif}</p>
              )}
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Fecha de emisión</p>
                <p className="font-medium text-gray-900">
                  {quote.issue_date ? new Date(quote.issue_date).toLocaleDateString("es-ES", { locale: es }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Válido hasta</p>
                <p className="font-medium text-gray-900">
                  {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("es-ES", { locale: es }) : "—"}
                </p>
              </div>
              {isAccepted && quote.accepted_date && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Aceptado el</p>
                  <p className="font-medium text-green-700">
                    {new Date(quote.accepted_date).toLocaleDateString("es-ES", { 
                      locale: es, 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </p>
                  {quote.client_signature && (
                    <p className="text-xs text-gray-600 mt-1">
                      Firmado por: {quote.client_signature}
                    </p>
                  )}
                </div>
              )}
              {isRejected && quote.rejection_date && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Rechazado el</p>
                  <p className="font-medium text-red-700">
                    {new Date(quote.rejection_date).toLocaleDateString("es-ES", { 
                      locale: es, 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Descripción */}
          {quote.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Desglose
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Concepto</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Cant.</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Precio</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quote.items || []).map((item, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-3 py-2 text-gray-900">{item.concept}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {parseFloat(item.unit_price || 0).toFixed(2)}€
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {parseFloat(item.total || 0).toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr className="border-t">
                      <td colSpan={3} className="px-3 py-1.5 text-right">Subtotal:</td>
                      <td className="px-3 py-1.5 text-right">
                        {parseFloat(quote.subtotal || 0).toFixed(2)}€
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-1.5 text-right">IVA:</td>
                      <td className="px-3 py-1.5 text-right">
                        {parseFloat(quote.total_iva || 0).toFixed(2)}€
                      </td>
                    </tr>
                    {quote.aplica_retencion && (
                      <tr>
                        <td colSpan={3} className="px-3 py-1.5 text-right text-red-600">
                          Retención ({quote.porcentaje_retencion}%):
                        </td>
                        <td className="px-3 py-1.5 text-right text-red-600">
                          -{parseFloat(quote.total_retencion || 0).toFixed(2)}€
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2">
                      <td colSpan={3} className="px-3 py-2 text-right font-bold text-lg">
                        TOTAL:
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-green-700 text-xl">
                        {parseFloat(quote.total || 0).toFixed(2)}€
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Condiciones */}
          {(quote.payment_conditions || quote.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Condiciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quote.payment_conditions && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Condiciones de pago</p>
                    <p className="text-sm text-gray-700">{quote.payment_conditions}</p>
                  </div>
                )}
                {quote.notes && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Notas</p>
                    <p className="text-sm text-gray-700">{quote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Motivo rechazo */}
          {isRejected && quote.rejection_reason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  Motivo del rechazo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600 text-sm">{quote.rejection_reason}</p>
              </CardContent>
            </Card>
          )}

          {/* Texto legal */}
          {quote.legal_text && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información legal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">{quote.legal_text}</p>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          {!isAccepted && !isRejected && canInteract && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => setShowAcceptDialog(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Aceptar presupuesto
              </Button>
              <Button
                onClick={() => setShowRejectDialog(true)}
                variant="outline"
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50 py-6"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Rechazar
              </Button>
            </div>
          )}

          {isAccepted && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-6">
                <div className="flex items-center gap-3 text-green-700">
                  <CheckCircle className="w-8 h-8" />
                  <div>
                    <p className="font-semibold text-lg">¡Presupuesto aceptado!</p>
                    <p className="text-sm">
                      El profesional ha sido notificado. Podéis proceder con el trabajo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botón descargar PDF con logo */}
          <Button
            onClick={async () => {
              const { downloadQuotePDFWithLogo } = await import('@/services/quotePdfGenerator');
              return downloadQuotePDFWithLogo(quote);
            }}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Dialog aceptar */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-6 h-6" />
              Aceptar presupuesto
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Vas a aceptar el presupuesto <strong>{quote.title}</strong> por importe de{" "}
                <strong className="text-green-700">{parseFloat(quote.total || 0).toFixed(2)}€</strong>.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="fullName">Tu nombre completo *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nombre y apellidos"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este nombre aparecerá como firma digital del contrato.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={setTermsAccepted}
                  />
                  <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed">
                    Acepto los términos y condiciones del presupuesto, incluyendo el importe, 
                    las condiciones de pago y el plazo de ejecución estimado.
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccept}
              disabled={accepting || !fullName.trim() || !termsAccepted}
              className="bg-green-600 hover:bg-green-700"
            >
              {accepting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Confirmar aceptación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog rechazar */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-6 h-6" />
              Rechazar presupuesto
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Vas a rechazar el presupuesto <strong>{quote.title}</strong>.
              </p>

              <div>
                <Label htmlFor="reason">Motivo del rechazo *</Label>
                <textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Indica brevemente el motivo..."
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm min-h-[100px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El profesional recibirá este mensaje.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejecting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Confirmar rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}