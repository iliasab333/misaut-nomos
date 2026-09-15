import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldX, Clock, Eye, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function VerificationRequests() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState("pending");

  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ["admin_verifications", filter],
    queryFn: () => filter === "all"
      ? base44.entities.IdentityVerification.list("-created_date", 100)
      : base44.entities.IdentityVerification.filter({ status: filter }, "-created_date", 100),
    staleTime: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const v = verifications.find(v => v.id === id);
      const now = new Date().toISOString();
      
      // 1. Marcar verificación como aprobada
      await base44.entities.IdentityVerification.update(id, {
        status: "approved",
        reviewed_date: now,
      });
      
      // 2. CRÍTICO: actualizar ProfessionalProfile del usuario
      if (v?.user_id) {
        const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: v.user_id }).limit(1);
        if (profiles[0]) {
          await base44.entities.ProfessionalProfile.update(profiles[0].id, {
            identity_verified: true,
            identity_verified_at: now,
            identity_document_type: v.document_type
          });
        }
      }
      
      // 3. Notificar al usuario (push + email)
      if (v?.user_id) {
        try {
          await base44.functions.invoke('sendPushNotification', {
            userIds: [v.user_id],
            title: '✓ Identidad verificada',
            message: 'Tu identidad ha sido verificada. Tu perfil ahora muestra el distintivo de verificado.',
            url: 'https://misautonomos.es/mi-perfil'
          });
        } catch (e) { console.error('Push error:', e); }
      }
      
      if (v?.user_email) {
        const name = v.user_name || "Usuario";
        await base44.integrations.Core.SendEmail({
          to: v.user_email,
          subject: "✅ Tu identidad ha sido verificada - MisAutónomos",
          body: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="padding:24px 32px 20px;border-bottom:1px solid #E2E8F0;">
  <span style="font-size:20px;font-weight:700;color:#0F172A;">✦ MisAutónomos</span>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0F172A;">✓ Identidad verificada</h1>
  <div style="background:#ECFDF5;border-left:3px solid #10B981;padding:12px 16px;border-radius:8px;margin-bottom:20px;">
    <span style="color:#10B981;font-weight:700;margin-right:6px;">✓</span>
    <span style="color:#1E293B;font-size:14px;">Tu solicitud ha sido aprobada</span>
  </div>
  <div style="font-size:15px;line-height:1.6;color:#1E293B;">
    <p>Hola <strong>${name}</strong>,</p>
    <p>Tu verificación de identidad ha sido <strong>aprobada</strong>. Tu perfil ahora muestra el distintivo <strong>"Verificado"</strong>, lo que genera mayor confianza en los clientes que visiten tu perfil.</p>
  </div>
  <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr><td>
      <a href="https://misautonomos.es/mi-perfil" style="display:inline-block;background:#0F172A;color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 28px;border-radius:10px;">Ver mi perfil</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:24px 32px 28px;border-top:1px solid #E2E8F0;background:#FAFBFC;">
  <p style="margin:0 0 12px;font-size:13px;color:#64748B;">Saludos,<br><strong style="color:#1E293B;">El equipo de MisAutónomos</strong></p>
  <p style="margin:16px 0 0;font-size:12px;color:#64748B;">Recibes este correo porque tienes una cuenta en <a href="https://misautonomos.es" style="color:#1E40AF;">misautonomos.es</a>.</p>
  <p style="margin:8px 0 0;font-size:11px;color:#94A3B8;">© ${new Date().getFullYear()} MisAutónomos · <a href="https://misautonomos.es/privacidad" style="color:#94A3B8;">Privacidad</a> · <a href="https://misautonomos.es/terminos" style="color:#94A3B8;">Términos</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
          from_name: "MisAutónomos"
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_verifications"] });
      setSelected(null);
      toast.success(t("admin.verificationRequests.toast.approved"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const v = verifications.find(v => v.id === id);
      
      // 1. Marcar verificación como rechazada
      await base44.entities.IdentityVerification.update(id, {
        status: "rejected",
        rejection_reason: reason,
        reviewed_date: new Date().toISOString(),
      });
      
      // 2. Asegurar que el perfil NO esté marcado como verificado
      if (v?.user_id) {
        const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: v.user_id }).limit(1);
        if (profiles[0] && profiles[0].identity_verified) {
          await base44.entities.ProfessionalProfile.update(profiles[0].id, {
            identity_verified: false,
            identity_verified_at: null
          });
        }
      }
      
      if (v?.user_email) {
        const name = v.user_name || "Usuario";
        const motivo = reason || "Documentos no válidos o ilegibles";
        await base44.integrations.Core.SendEmail({
          to: v.user_email,
          subject: "⚠️ Tu verificación de identidad necesita atención - MisAutónomos",
          body: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="padding:24px 32px 20px;border-bottom:1px solid #E2E8F0;">
  <span style="font-size:20px;font-weight:700;color:#0F172A;">✦ MisAutónomos</span>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0F172A;">Tu verificación necesita atención</h1>
  <div style="background:#FFFBEB;border-left:3px solid #F59E0B;padding:12px 16px;border-radius:8px;margin-bottom:20px;">
    <span style="color:#F59E0B;font-weight:700;margin-right:6px;">⚠</span>
    <span style="color:#1E293B;font-size:14px;">No hemos podido aprobar tu verificación</span>
  </div>
  <div style="font-size:15px;line-height:1.6;color:#1E293B;">
    <p>Hola <strong>${name}</strong>,</p>
    <p>Lamentablemente no hemos podido aprobar tu verificación de identidad.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#64748B;">Motivo</p>
      <p style="margin:4px 0 0;font-weight:600;color:#1E293B;">${motivo}</p>
    </div>
    <p>Puedes volver a intentarlo subiendo documentos más claros desde tu perfil.</p>
  </div>
  <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr><td>
      <a href="https://misautonomos.es/mi-perfil" style="display:inline-block;background:#0F172A;color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 28px;border-radius:10px;">Volver a intentarlo</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:24px 32px 28px;border-top:1px solid #E2E8F0;background:#FAFBFC;">
  <p style="margin:0 0 12px;font-size:13px;color:#64748B;">Saludos,<br><strong style="color:#1E293B;">El equipo de MisAutónomos</strong></p>
  <p style="margin:16px 0 0;font-size:12px;color:#64748B;">Recibes este correo porque tienes una cuenta en <a href="https://misautonomos.es" style="color:#1E40AF;">misautonomos.es</a>.</p>
  <p style="margin:8px 0 0;font-size:11px;color:#94A3B8;">© ${new Date().getFullYear()} MisAutónomos · <a href="https://misautonomos.es/privacidad" style="color:#94A3B8;">Privacidad</a> · <a href="https://misautonomos.es/terminos" style="color:#94A3B8;">Términos</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
          from_name: "MisAutónomos"
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_verifications"] });
      setSelected(null);
      setRejectReason("");
      toast.success(t("admin.verificationRequests.toast.rejected"));
    },
  });

  const pending = verifications.filter(v => v.status === "pending").length;

  const filterLabels = {
    pending: t("admin.verificationRequests.filters.pending"),
    approved: t("admin.verificationRequests.filters.approved"),
    rejected: t("admin.verificationRequests.filters.rejected"),
    all: t("admin.verificationRequests.filters.all"),
  };

  const statusBadge = (status) => {
    if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">{t("admin.verificationRequests.status.approved")}</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">{t("admin.verificationRequests.status.rejected")}</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">{t("admin.verificationRequests.status.pending")}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">{t("admin.verificationRequests.title")}</h2>
          {pending > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending}</span>
          )}
        </div>
        <div className="flex gap-1 ml-auto">
          {["pending", "approved", "rejected", "all"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 text-sm">{t("common.loading")}</div>
      ) : verifications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{filter !== "all" ? t("admin.verificationRequests.emptyFiltered", { status: filter }) : t("admin.verificationRequests.emptyAll")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {verifications.map((v) => (
            <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-700 flex-shrink-0">
                  {(v.user_name || v.user_email || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{v.user_name || "—"}</p>
                  <p className="text-xs text-gray-500 truncate">{v.user_email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(v.created_date), t("admin.verificationRequests.dateFormat"), { locale: es })} · {v.document_type?.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {statusBadge(v.status)}
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setSelected(v)}>
                  <Eye className="w-3.5 h-3.5" /> {t("admin.verificationRequests.review")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de revisión */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selected.user_name || t("admin.verificationRequests.userFallback")}</h3>
                <p className="text-xs text-gray-500">{selected.user_email} · {selected.document_type?.toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(selected.status)}
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">{t("admin.verificationRequests.documentFront")}</p>
                  <a href={selected.document_front_url} target="_blank" rel="noopener noreferrer">
                    <img src={selected.document_front_url} className="w-full rounded-lg border object-cover max-h-48 hover:opacity-90 transition-opacity cursor-zoom-in" />
                  </a>
                </div>
                {selected.document_back_url && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{t("admin.verificationRequests.documentBack")}</p>
                    <a href={selected.document_back_url} target="_blank" rel="noopener noreferrer">
                      <img src={selected.document_back_url} className="w-full rounded-lg border object-cover max-h-48 hover:opacity-90 transition-opacity cursor-zoom-in" />
                    </a>
                  </div>
                )}
                <div className={selected.document_back_url ? "col-span-full sm:col-span-1" : ""}>
                  <p className="text-xs font-medium text-gray-500 mb-1">{t("admin.verificationRequests.selfie")}</p>
                  <a href={selected.selfie_url} target="_blank" rel="noopener noreferrer">
                    <img src={selected.selfie_url} className="w-full rounded-lg border object-cover max-h-48 hover:opacity-90 transition-opacity cursor-zoom-in" />
                  </a>
                </div>
              </div>

              {selected.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <strong>{t("admin.verificationRequests.rejectionReasonLabel")}</strong> {selected.rejection_reason}
                </div>
              )}

              {selected.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">{t("admin.verificationRequests.rejectReasonLabel")}</label>
                    <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder={t("admin.verificationRequests.rejectReasonPlaceholder")}
                      className="h-20 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => approveMutation.mutate(selected.id)}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      <Check className="w-4 h-4 mr-1" />
                      {approveMutation.isPending ? t("admin.verificationRequests.approving") : t("admin.verificationRequests.approve")}
                    </Button>
                    <Button onClick={() => rejectMutation.mutate({ id: selected.id, reason: rejectReason })}
                      disabled={rejectMutation.isPending}
                      variant="destructive" className="flex-1">
                      <X className="w-4 h-4 mr-1" />
                      {rejectMutation.isPending ? t("admin.verificationRequests.rejecting") : t("common.reject")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}