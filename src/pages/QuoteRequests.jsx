import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, FileText, Clock, CheckCircle, XCircle, Send, Eye, MapPin, Calendar, Euro, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import SEOHead from "../components/seo/SEOHead";

// Mapa explícito urgencia (valor de BD) → clave i18n.
const URGENCY_KEYS = {
  baja: 'quotes.urgency.low',
  media: 'quotes.urgency.medium',
  alta: 'quotes.urgency.high',
  urgente: 'quotes.urgency.urgent',
};

export default function QuoteRequestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseData, setResponseData] = useState({
    quote_amount: "",
    estimated_days: "",
    response_message: "",
    breakdown: []
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin();
    } finally {
      setLoadingUser(false);
    }
  };

  const { data: receivedRequests = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['quoteRequests', 'received', user?.id],
    queryFn: () => base44.entities.QuoteRequest.filter({ professional_id: user.id }, '-created_date'),
    enabled: !!user,
  });

  const { data: sentRequests = [], isLoading: loadingSent } = useQuery({
    queryKey: ['quoteRequests', 'sent', user?.id],
    queryFn: () => base44.entities.QuoteRequest.filter({ client_id: user.id }, '-created_date'),
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (requestId) => base44.entities.QuoteRequest.update(requestId, { 
      is_read: true,
      views_count: (selectedRequest?.views_count || 0) + 1
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
    }
  });

  const respondQuoteMutation = useMutation({
    mutationFn: async ({ requestId, response }) => {
      const updated = await base44.entities.QuoteRequest.update(requestId, {
        professional_response: {
          ...response,
          response_date: new Date().toISOString()
        },
        status: "quoted"
      });

      const request = receivedRequests.find(r => r.id === requestId);
      if (request) {
        await base44.entities.Notification.create({
          user_id: request.client_id,
          type: "quote_response",
          title: "Presupuesto recibido",
          message: `${request.professional_name} ha respondido tu solicitud`,
          link: createPageUrl("QuoteRequests"),
          metadata: { quote_request_id: requestId }
        });

        base44.integrations.Core.SendEmail({
          to: request.client_email,
          subject: "Presupuesto recibido - MisAutónomos",
          body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); padding: 40px 20px; text-align: center; }
    .logo { width: 60px; height: 60px; background: white; border-radius: 16px; display: inline-block; line-height: 60px; font-size: 32px; margin-bottom: 15px; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 30px; }
    .quote-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; }
    .cta { text-align: center; margin: 35px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; }
    .footer { background: #1f2937; color: #9ca3af; padding: 40px 30px; text-align: center; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✅</div>
      <h1>Presupuesto recibido</h1>
    </div>
    <div class="content">
      <p class="message">Hola ${request.client_name},</p>
      <div class="quote-box">
        <p><strong>Profesional:</strong> ${request.professional_name}</p>
        <p><strong>Presupuesto:</strong> ${response.quote_amount}€</p>
        <p><strong>Tiempo estimado:</strong> ${response.estimated_days} días</p>
        <p><strong>Mensaje:</strong> ${response.response_message}</p>
      </div>
      <div class="cta">
        <a href="https://misautonomos.es/QuoteRequests" class="button">
          Ver presupuesto completo →
        </a>
      </div>
    </div>
    <div class="footer">
      <strong style="color: #ffffff; display: block; margin-bottom: 5px; font-size: 18px;">Equipo MisAutónomos</strong>
      <p style="color: #60a5fa; margin-bottom: 15px; font-style: italic;">Tu autónomo de confianza</p>
    </div>
  </div>
</body>
</html>
          `,
          from_name: "MisAutónomos"
        }).catch(err => console.log('Email error:', err));
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setShowResponseDialog(false);
      setSelectedRequest(null);
      toast.success(t('quotes.requests.sentToast'));
    },
    onError: () => {
      toast.error(t('quotes.requests.sendError'));
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ requestId, status }) => base44.entities.QuoteRequest.update(requestId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      toast.success(t('statusUpdated'));
    }
  });

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    if (user.user_type === "professionnel" && !request.is_read) {
      markAsReadMutation.mutate(request.id);
    }
  };

  const handleRespond = () => {
    if (!responseData.quote_amount || !responseData.response_message) {
      toast.error(t('quotes.requests.validationError'));
      return;
    }

    respondQuoteMutation.mutate({
      requestId: selectedRequest.id,
      response: responseData
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: "bg-yellow-100 text-yellow-800", text: t('quotes.status.pending'), icon: Clock },
      quoted: { color: "bg-blue-100 text-blue-800", text: t('quotes.status.quoted'), icon: FileText },
      accepted: { color: "bg-green-100 text-green-800", text: t('quotes.status.accepted'), icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-800", text: t('quotes.status.rejected'), icon: XCircle },
      expired: { color: "bg-gray-100 text-gray-800", text: t('quotes.status.expired'), icon: Clock }
    };
    const { color, text, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {text}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const config = {
      baja: "bg-gray-100 text-gray-700",
      media: "bg-blue-100 text-blue-700",
      alta: "bg-orange-100 text-orange-700",
      urgente: "bg-red-100 text-red-700"
    };
    const labelKey = URGENCY_KEYS[urgency];
    const label = labelKey ? t(labelKey) : (urgency || "");
    return <Badge className={config[urgency]}>{label.toUpperCase()}</Badge>;
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isProfessional = user?.user_type === "professionnel";

  return (
    <>
      <SEOHead 
        title={t('quotes.requests.seoTitle')}
        description={t('quotes.requests.seoDescription')}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              {t('quotesPage.title')}
            </h1>
            {!isProfessional && (
              <Button onClick={() => navigate(createPageUrl("Search"))} className="bg-blue-600 hover:bg-blue-700">
                {t('quotes.requests.requestButton')}
              </Button>
            )}
          </div>

          <Tabs defaultValue={isProfessional ? "received" : "sent"} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              {isProfessional && (
                <TabsTrigger value="received">
                  {t('quotes.requests.tabReceived', { count: receivedRequests.length })}
                </TabsTrigger>
              )}
              <TabsTrigger value="sent">
                {isProfessional
                  ? t('quotes.requests.tabSent', { count: sentRequests.length })
                  : t('quotes.requests.tabMine', { count: sentRequests.length })}
              </TabsTrigger>
            </TabsList>

            {isProfessional && (
              <TabsContent value="received" className="space-y-4">
                {loadingReceived ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </div>
                ) : receivedRequests.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">{t('quotes.requests.emptyReceived')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  receivedRequests.map(request => (
                    <Card key={request.id} className={`cursor-pointer hover:shadow-lg transition-shadow ${!request.is_read ? 'border-l-4 border-blue-600' : ''}`} onClick={() => handleViewRequest(request)}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg">{request.title}</h3>
                              {!request.is_read && <Badge className="bg-blue-600">{t('profile_card.new_tag')}</Badge>}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{request.description.substring(0, 150)}...</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {getStatusBadge(request.status)}
                              {getUrgencyBadge(request.urgency)}
                              {request.budget_range !== "no_definido" && (
                                <Badge variant="outline">{request.budget_range}€</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{format(new Date(request.created_date), "dd/MM/yyyy")}</p>
                            <p className="flex items-center gap-1 mt-1">
                              <Eye className="w-3 h-3" />
                              {request.views_count || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            )}

            <TabsContent value="sent" className="space-y-4">
              {loadingSent ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                </div>
              ) : sentRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">{t('quotes.requests.emptySent')}</p>
                    <Button onClick={() => navigate(createPageUrl("Search"))} className="bg-blue-600 hover:bg-blue-700">
                      {t('quotes.requests.findProfessionals')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                sentRequests.map(request => (
                  <Card key={request.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleViewRequest(request)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2">{request.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{t('quotes.requests.forProfessional', { name: request.professional_name })}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {getStatusBadge(request.status)}
                            {getUrgencyBadge(request.urgency)}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>{format(new Date(request.created_date), "dd/MM/yyyy")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {selectedRequest.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2">
                  {getStatusBadge(selectedRequest.status)}
                  {getUrgencyBadge(selectedRequest.urgency)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{format(new Date(selectedRequest.created_date), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  {selectedRequest.deadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{t('quotes.requests.deadline', { date: format(new Date(selectedRequest.deadline), "dd/MM/yyyy") })}</span>
                    </div>
                  )}
                </div>

                {isProfessional && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <p className="font-semibold text-sm">{t('quotes.requests.clientData')}</p>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {selectedRequest.client_email}
                      </p>
                      {selectedRequest.client_phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {selectedRequest.client_phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">{t('quotes.requests.description')}</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
                </div>

                {(selectedRequest.location || selectedRequest.ciudad || selectedRequest.provincia) && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {t('quotes.requests.location')}
                    </h4>
                    <p className="text-gray-700">
                      {[selectedRequest.location, selectedRequest.ciudad, selectedRequest.provincia].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}

                {selectedRequest.budget_range !== "no_definido" && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Euro className="w-4 h-4" />
                      {t('quotes.fields.estimatedBudget')}
                    </h4>
                    <p className="text-gray-700">{selectedRequest.budget_range}€</p>
                  </div>
                )}

                {selectedRequest.professional_response && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-3 text-green-800">{t('quotes.requests.professionalQuote')}</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>{t('quotes.requests.price')}</strong> {selectedRequest.professional_response.quote_amount}€</p>
                      {selectedRequest.professional_response.estimated_days && (
                        <p><strong>{t('quotes.requests.estimatedTime')}</strong> {t('quotes.fields.daysCount', { count: Number(selectedRequest.professional_response.estimated_days) })}</p>
                      )}
                      <p><strong>{t('quotes.requests.message')}</strong> {selectedRequest.professional_response.response_message}</p>
                      {selectedRequest.professional_response.response_date && (
                        <p className="text-gray-500">{t('quotes.requests.respondedOn', { date: format(new Date(selectedRequest.professional_response.response_date), "dd/MM/yyyy HH:mm") })}</p>
                      )}
                    </div>
                  </div>
                )}

                {isProfessional && selectedRequest.status === "pending" && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => setShowResponseDialog(true)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {t('quotes.actions.sendQuote')}
                    </Button>
                  </div>
                )}

                {!isProfessional && selectedRequest.status === "quoted" && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateStatusMutation.mutate({ requestId: selectedRequest.id, status: "accepted" })}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('common.accept')}
                    </Button>
                    <Button
                      onClick={() => updateStatusMutation.mutate({ requestId: selectedRequest.id, status: "rejected" })}
                      variant="outline"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {t('common.reject')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('quotes.actions.sendQuote')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('quotes.requests.totalPriceLabel')}</Label>
              <Input
                type="number"
                value={responseData.quote_amount}
                onChange={(e) => setResponseData({ ...responseData, quote_amount: e.target.value })}
                placeholder={t('quotes.requests.totalPricePlaceholder')}
              />
            </div>

            <div>
              <Label>{t('quotes.requests.estimatedDaysLabel')}</Label>
              <Input
                type="number"
                value={responseData.estimated_days}
                onChange={(e) => setResponseData({ ...responseData, estimated_days: e.target.value })}
                placeholder={t('quotes.requests.estimatedDaysPlaceholder')}
              />
            </div>

            <div>
              <Label>{t('quotes.requests.messageLabel')}</Label>
              <Textarea
                value={responseData.response_message}
                onChange={(e) => setResponseData({ ...responseData, response_message: e.target.value })}
                placeholder={t('quotes.requests.messagePlaceholder')}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleRespond}
              disabled={respondQuoteMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {respondQuoteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('quotes.actions.sending')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('quotes.actions.sendQuote')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
