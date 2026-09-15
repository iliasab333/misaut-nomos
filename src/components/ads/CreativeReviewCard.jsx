import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, MessageSquare, ZoomIn, X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

// Lightbox para ver imágenes a tamaño completo
function Lightbox({ urls, startIndex, onClose }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(startIndex);

  const prev = () => setCurrent(i => (i - 1 + urls.length) % urls.length);
  const next = () => setCurrent(i => (i + 1) % urls.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
      >
        <X className="w-6 h-6" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-3"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-3"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <img
        src={urls[current]}
        alt={t('ads.creativeReview.creativeAlt', { number: current + 1 })}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />

      {urls.length > 1 && (
        <div className="absolute bottom-4 flex gap-2">
          {urls.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreativeReviewCard({ briefing, onReviewed }) {
  const { t } = useTranslation();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesText, setChangesText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Si ya fue aprobado
  if (briefing.ads_content_approved) {
    return (
      <Card className="border-0 shadow-md bg-green-50 border-green-100">
        <CardContent className="p-6 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">{t('ads.creativeReview.approvedTitle')}</p>
            <p className="text-sm text-green-700">{t('ads.creativeReview.approvedText')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      // 1. Actualizar briefing
      await base44.entities.AdsBriefing.update(briefing.id, {
        ads_content_approved: true,
        campaign_status: "live",
        admin_updated_at: new Date().toISOString()
      });

      // 2. Notificar al admin
      await base44.integrations.Core.SendEmail({
        to: "hola@misautonomos.es",
        subject: `✅ Campaña APROBADA por ${briefing.professional_name}`,
        body: `
<h2>El profesional ha aprobado las creatividades</h2>
<p><strong>Profesional:</strong> ${briefing.professional_name}</p>
<p><strong>Mes:</strong> ${briefing.month_year}</p>
<p><strong>Red:</strong> ${briefing.platform}</p>
<p><strong>Acción requerida:</strong> Lanzar la campaña.</p>
<br><a href="https://misautonomos.es/admin">Ver en el panel de administración →</a>
        `
      });

      toast.success(t('ads.creativeReview.approveSuccess'));
      onReviewed?.();
    } catch (error) {
      console.error("Error al aprobar:", error);
      toast.error(t('ads.creativeReview.approveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changesText.trim()) {
      toast.error(t('ads.creativeReview.describeChanges'));
      return;
    }
    setSubmitting(true);
    try {
      // 1. Guardar en briefing
      await base44.entities.AdsBriefing.update(briefing.id, {
        admin_notes: `[Cambios solicitados por el cliente]\n${changesText}`,
        campaign_status: "creating",
        admin_updated_at: new Date().toISOString()
      });

      // 2. Notificar al admin
      await base44.integrations.Core.SendEmail({
        to: "hola@misautonomos.es",
        subject: `🔄 Cambios solicitados por ${briefing.professional_name}`,
        body: `
<h2>El profesional ha solicitado cambios en las creatividades</h2>
<p><strong>Profesional:</strong> ${briefing.professional_name}</p>
<p><strong>Mes:</strong> ${briefing.month_year}</p>
<p><strong>Red:</strong> ${briefing.platform}</p>
<h3>Cambios solicitados:</h3>
<blockquote style="border-left:4px solid #e5e7eb; padding-left:12px; color:#374151;">${changesText.replace(/\n/g, '<br>')}</blockquote>
<br><a href="https://misautonomos.es/admin">Ver en el panel de administración →</a>
        `
      });

      toast.success(t('ads.creativeReview.changesSent'));
      setShowChangesForm(false);
      setChangesText("");
      onReviewed?.();
    } catch (error) {
      console.error("Error al solicitar cambios:", error);
      toast.error(t('ads.creativeReview.sendError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox
          urls={briefing.ads_creative_urls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-base font-semibold">{t('ads.creativeReview.title')}</CardTitle>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {t('ads.creativeReview.subtitle')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Imágenes */}
          {briefing.ads_creative_urls?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('ads.campaign.creativesLabel')}</p>
              <div className="grid grid-cols-2 gap-3">
                {briefing.ads_creative_urls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group cursor-pointer rounded-xl overflow-hidden border border-gray-100"
                    onClick={() => setLightboxIndex(idx)}
                  >
                    <img
                      src={url}
                      alt={t('ads.creativeReview.creativeAlt', { number: idx + 1 })}
                      className="w-full h-44 object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                      {idx + 1}/{briefing.ads_creative_urls.length}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5 text-center">{t('ads.creativeReview.tapToZoom')}</p>
            </div>
          )}

          {/* Copy del anuncio */}
          {briefing.ads_copy && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('ads.creativeReview.adTextLabel')}</p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{briefing.ads_copy}</p>
              </div>
            </div>
          )}

          {/* Formulario de cambios */}
          {showChangesForm && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t('ads.creativeReview.whatWouldYouChange')}
              </p>
              <Textarea
                value={changesText}
                onChange={e => setChangesText(e.target.value)}
                placeholder={t('ads.creativeReview.changesPlaceholder')}
                rows={4}
                className="bg-white border-amber-200 focus:border-amber-400 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleRequestChanges}
                  disabled={submitting || !changesText.trim()}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium"
                >
                  {submitting ? t('ads.shared.sending') : t('ads.creativeReview.sendRequest')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowChangesForm(false); setChangesText(""); }}
                  disabled={submitting}
                  className="text-sm"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Botones principales */}
          {!showChangesForm && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {submitting ? t('ads.creativeReview.processing') : t('ads.creativeReview.approveAndLaunch')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowChangesForm(true)}
                disabled={submitting}
                className="flex-1 border-gray-300 text-gray-700 font-medium py-3"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('ads.creativeReview.requestChanges')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}