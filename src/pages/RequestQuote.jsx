import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Paperclip, X, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "../components/seo/SEOHead";

// Nombres propios (no se traducen). "Otras" es el único valor con texto: su
// etiqueta visible pasa por t() al pintarse, el valor guardado no cambia.
const PROVINCIAS_ESPANA = [
  "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia",
  "Palma de Mallorca", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid",
  "Vigo", "Gijón", "Granada", "Almería", "Otras"
];

export default function RequestQuotePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const professionalId = searchParams.get('professional');

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categories: [],
    location: "",
    provincia: "",
    ciudad: "",
    budget_range: "no_definido",
    deadline: "",
    urgency: "media",
    client_phone: ""
  });
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
  });

  const { data: professional } = useQuery({
    queryKey: ['professional', professionalId],
    queryFn: async () => {
      if (!professionalId) return null;
      const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: professionalId });
      const users = await base44.entities.User.filter({ id: professionalId });
      return { profile: profiles[0], user: users[0] };
    },
    enabled: !!professionalId,
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFormData(prev => ({
        ...prev,
        client_phone: currentUser.phone || ""
      }));
    } catch (error) {
      base44.auth.redirectToLogin();
    } finally {
      setLoadingUser(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return {
            url: file_url,
            name: file.name,
            type: file.type,
            size: file.size
          };
        })
      );
      setAttachments([...attachments, ...uploadedFiles]);
      toast.success(t('quotes.request.filesUploaded'));
    } catch (error) {
      toast.error(t('quotes.request.uploadError'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const createQuoteMutation = useMutation({
    mutationFn: async (data) => {
      const quoteRequest = await base44.entities.QuoteRequest.create(data);

      await base44.entities.Notification.create({
        user_id: data.professional_id,
        type: "quote_request",
        title: "Nueva solicitud de presupuesto",
        message: `${data.client_name} solicita presupuesto: ${data.title}`,
        link: createPageUrl("QuoteRequests"),
        metadata: { quote_request_id: quoteRequest.id }
      });

      if (professional?.user?.email) {
        const urgencyLabels = {
          baja: "🟢 Baja",
          media: "🟡 Media",
          alta: "🟠 Alta",
          urgente: "🔴 Urgente"
        };
        
        base44.integrations.Core.SendEmail({
          to: professional.user.email,
          subject: `🔔 Nueva solicitud de presupuesto - ${data.title}`,
          body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 40px 20px; text-align: center; }
    .logo { width: 70px; height: 70px; background: white; border-radius: 20px; display: inline-block; line-height: 70px; font-size: 40px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .content { padding: 40px 30px; }
    .alert-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 12px; text-align: center; }
    .alert-box h2 { color: #1e40af; margin: 0 0 10px 0; font-size: 22px; }
    .quote-details { background: #f9fafb; border: 1px solid #e5e7eb; padding: 25px; margin: 20px 0; border-radius: 12px; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #4b5563; }
    .detail-value { color: #1f2937; text-align: right; }
    .description-box { background: white; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .description-box h3 { margin: 0 0 15px 0; color: #1e40af; font-size: 18px; }
    .description-box p { color: #374151; line-height: 1.7; margin: 0; white-space: pre-wrap; }
    .attachments { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .attachments h4 { margin: 0 0 10px 0; color: #92400e; }
    .cta { text-align: center; margin: 40px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 18px 50px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); transition: transform 0.2s; }
    .button:hover { transform: translateY(-2px); }
    .info-banner { background: #eff6ff; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe; }
    .footer { background: #111827; color: #9ca3af; padding: 40px 30px; text-align: center; font-size: 14px; }
    .footer strong { color: #ffffff; display: block; margin-bottom: 10px; font-size: 20px; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📋</div>
      <h1>¡Nueva Solicitud de Presupuesto!</h1>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <h2>💼 ${data.title}</h2>
        <p style="color: #4b5563; margin: 0;">Un cliente está interesado en tus servicios</p>
      </div>

      <div class="quote-details">
        <div class="detail-row">
          <span class="detail-label">👤 Cliente:</span>
          <span class="detail-value"><strong>${data.client_name}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📧 Email:</span>
          <span class="detail-value">${data.client_email}</span>
        </div>
        ${data.client_phone ? `
        <div class="detail-row">
          <span class="detail-label">📱 Teléfono:</span>
          <span class="detail-value"><strong>${data.client_phone}</strong></span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">📍 Ubicación:</span>
          <span class="detail-value">${data.ciudad ? `${data.ciudad}, ${data.provincia}` : (data.provincia || 'No especificada')}</span>
        </div>
        ${data.location ? `
        <div class="detail-row">
          <span class="detail-label">🏠 Dirección:</span>
          <span class="detail-value">${data.location}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">💰 Presupuesto estimado:</span>
          <span class="detail-value"><strong>${data.budget_range === 'no_definido' ? 'No definido' : data.budget_range + '€'}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">⚡ Urgencia:</span>
          <span class="detail-value"><strong>${urgencyLabels[data.urgency] || data.urgency}</strong></span>
        </div>
        ${data.deadline ? `
        <div class="detail-row">
          <span class="detail-label">📅 Fecha límite:</span>
          <span class="detail-value">${new Date(data.deadline).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        ` : ''}
      </div>

      <div class="description-box">
        <h3>📝 Descripción detallada del trabajo:</h3>
        <p>${data.description}</p>
      </div>

      ${data.attachments && data.attachments.length > 0 ? `
      <div class="attachments">
        <h4>📎 Archivos adjuntos (${data.attachments.length})</h4>
        <p style="color: #92400e; margin: 0;">El cliente ha adjuntado ${data.attachments.length} archivo(s). Podrás verlos al responder la solicitud.</p>
      </div>
      ` : ''}

      <div class="info-banner">
        <p style="color: #1e40af; margin: 0; font-size: 15px;">
          <strong>💡 Consejo:</strong> Responde rápido para aumentar tus posibilidades de conseguir el trabajo. Los clientes valoran la rapidez de respuesta.
        </p>
      </div>

      <div class="cta">
        <a href="https://misautonomos.es/QuoteRequests" class="button">
          Ver Solicitud y Responder →
        </a>
      </div>

      <p style="color: #6b7280; text-align: center; font-size: 14px; margin-top: 30px;">
        Puedes responder a esta solicitud directamente desde tu panel de control en MisAutónomos.
      </p>
    </div>
    
    <div class="footer">
      <strong>Equipo MisAutónomos</strong>
      <p style="color: #60a5fa; margin-bottom: 15px; font-style: italic;">Tu autónomo de confianza</p>
      <p>Si tienes alguna pregunta, contáctanos en soporte@misautonomos.es</p>
    </div>
  </div>
</body>
</html>
          `,
          from_name: "MisAutónomos - Solicitud de Presupuesto"
        }).catch(err => console.log('Email error:', err));
      }

      return quoteRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      toast.success(t('quotes.request.sentToast'));
      navigate(createPageUrl("Search"));
    },
    onError: (error) => {
      toast.error(t('quotes.request.sendError'));
      console.error(error);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error(t('quotes.request.validationError'));
      return;
    }

    if (!professionalId) {
      toast.error(t('quotes.request.selectProfessional'));
      return;
    }

    const data = {
      ...formData,
      client_id: user.id,
      client_name: user.full_name || user.email,
      client_email: user.email,
      professional_id: professionalId,
      professional_name: professional?.profile?.business_name || professional?.user?.full_name || "Profesional",
      attachments: attachments.map(a => a.url),
      status: "pending",
      is_read: false,
      views_count: 0
    };

    createQuoteMutation.mutate(data);
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={t('quotes.request.seoTitle')}
        description={t('quotes.request.seoDescription')}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                {t('quotes.request.title')}
              </CardTitle>
              <CardDescription>
                {professional?.profile ? (
                  <span>
                    <Trans
                      i18nKey="quotes.request.subtitleFor"
                      values={{ name: professional.profile.business_name }}
                      components={{ 1: <strong /> }}
                    />
                  </span>
                ) : (
                  <span>{t('quotes.request.subtitle')}</span>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>{t('quotes.request.titleLabel')}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('quotes.request.titlePlaceholder')}
                    required
                  />
                </div>

                <div>
                  <Label>{t('quotes.request.descriptionLabel')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('quotes.request.descriptionPlaceholder')}
                    rows={5}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('province')}</Label>
                    <Select value={formData.provincia} onValueChange={(v) => setFormData({ ...formData, provincia: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('quotes.request.selectPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCIAS_ESPANA.map(p => (
                          <SelectItem key={p} value={p}>{p === "Otras" ? t('quotes.request.otherProvince') : p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('city')}</Label>
                    <Input
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      placeholder={t('quotes.request.cityPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('quotes.request.addressLabel')}</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t('quotes.request.addressPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('quotes.request.budgetLabel')}</Label>
                    <Select value={formData.budget_range} onValueChange={(v) => setFormData({ ...formData, budget_range: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_definido">{t('quotes.request.budgetUndefined')}</SelectItem>
                        <SelectItem value="0-500">{t('quotes.request.budget0to500')}</SelectItem>
                        <SelectItem value="500-1000">{t('quotes.request.budget500to1000')}</SelectItem>
                        <SelectItem value="1000-2500">{t('quotes.request.budget1000to2500')}</SelectItem>
                        <SelectItem value="2500-5000">{t('quotes.request.budget2500to5000')}</SelectItem>
                        <SelectItem value="5000+">{t('quotes.request.budgetOver5000')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('quotes.request.urgencyLabel')}</Label>
                    <Select value={formData.urgency} onValueChange={(v) => setFormData({ ...formData, urgency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baja">{t('quotes.urgency.low')}</SelectItem>
                        <SelectItem value="media">{t('quotes.urgency.medium')}</SelectItem>
                        <SelectItem value="alta">{t('quotes.urgency.high')}</SelectItem>
                        <SelectItem value="urgente">{t('quotes.urgency.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{t('quotes.request.deadlineLabel')}</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div>
                  <Label>{t('quotes.request.phoneLabel')}</Label>
                  <Input
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    placeholder={t('phoneField')}
                  />
                </div>

                <div>
                  <Label>{t('quotes.request.attachmentsLabel')}</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="w-full"
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4 mr-2" />
                    )}
                    {t('quotes.request.attachButton')}
                  </Button>

                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createQuoteMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {createQuoteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('quotes.actions.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {t('quotes.request.submit')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
