import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldCheck, ShieldX, Upload, X, Loader2, CheckCircle, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function VerifiedBadge({ size = "sm", showLabel = true }) {
  const { t } = useTranslation();
  const sizeMap = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };
  return (
    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium" title={t('proProfile.badges.identityVerified')}>
      <ShieldCheck className={`${sizeMap[size]} text-emerald-500 fill-emerald-100`} />
      {showLabel && <span className="text-xs">{t('proProfile.badges.verified')}</span>}
    </span>
  );
}

export function useIdentityVerification(userId) {
  return useQuery({
    queryKey: ["identity_verification", userId],
    queryFn: async () => {
      if (!userId) return null;
      const results = await base44.entities.IdentityVerification.filter({ user_id: userId });
      return results[0] || null;
    },
    enabled: !!userId,
    staleTime: 60000 * 5,
  });
}

export default function IdentityVerificationWidget({ user }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: verification, isLoading } = useIdentityVerification(user?.id);

  const [step, setStep] = useState("idle"); // idle | uploading | submitting | done
  const [docType, setDocType] = useState("dni");
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  const frontRef = useRef();
  const backRef = useRef();
  const selfieRef = useRef();

  const handleFile = (e, setter, previewSetter) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t('verification.toasts.fileTooLarge'));
      return;
    }
    setter(file);
    previewSetter(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!frontFile) {
      toast.error(t('verification.toasts.frontRequired'));
      return;
    }
    if (docType !== "passport" && !backFile) {
      toast.error(t('verification.toasts.backRequired'));
      return;
    }
    if (!selfieFile) {
      toast.error(t('verification.toasts.selfieRequired'));
      return;
    }

    setStep("submitting");
    try {
      const [frontRes, backRes, selfieRes] = await Promise.all([
        base44.integrations.Core.UploadFile({ file: frontFile }),
        backFile ? base44.integrations.Core.UploadFile({ file: backFile }) : Promise.resolve({ file_url: null }),
        base44.integrations.Core.UploadFile({ file: selfieFile }),
      ]);

      const payload = {
        document_type: docType,
        document_front_url: frontRes.file_url,
        document_back_url: backRes.file_url || null,
        selfie_url: selfieRes.file_url,
        status: "pending",
        rejection_reason: null,
        reviewed_date: null,
      };

      // Si ya existe un registro (reintento tras rechazo), actualizar; si no, crear
      if (verification?.id) {
        await base44.entities.IdentityVerification.update(verification.id, payload);
      } else {
        await base44.entities.IdentityVerification.create({
          ...payload,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name || user.email,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["identity_verification", user.id] });
      toast.success(t('verification.toasts.submitted'));
      setStep("done");
    } catch (err) {
      console.error(err);
      toast.error(t('verification.toasts.submitError'));
      setStep("idle");
    }
  };

  if (isLoading) return null;

  // --- FORMULARIO (tiene prioridad sobre status rechazado para permitir reintento) ---
  if (step === "form" || step === "submitting") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-semibold text-blue-900">{t('verification.form.title')}</p>
          </div>
          <button onClick={() => setStep("idle")} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-600 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
            {t('verification.form.privacyNote')}
          </p>
        </div>

        {/* Tipo de documento */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">{t('verification.form.documentType')}</p>
          <div className="flex gap-2">
            {[["dni", "DNI"], ["nie", "NIE"], ["passport", t('verification.form.passport')]].map(([val, label]) => (
              <button key={val} onClick={() => setDocType(val)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${docType === val ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Foto frontal */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">{t('verification.form.frontLabel')}</p>
          <input ref={frontRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFile(e, setFrontFile, setFrontPreview)} />
          {frontPreview ? (
            <div className="relative">
              <img src={frontPreview} className="w-full h-28 object-cover rounded-lg border border-gray-200" />
              <button onClick={() => { setFrontFile(null); setFrontPreview(null); }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button onClick={() => frontRef.current.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-xs text-gray-500 hover:border-blue-400 flex flex-col items-center gap-1">
              <Upload className="w-5 h-5" /> {t('verification.form.uploadFront')}
            </button>
          )}
        </div>

        {/* Foto trasera (DNI / NIE) */}
        {docType !== "passport" && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">{t('verification.form.backLabel')}</p>
            <input ref={backRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleFile(e, setBackFile, setBackPreview)} />
            {backPreview ? (
              <div className="relative">
                <img src={backPreview} className="w-full h-28 object-cover rounded-lg border border-gray-200" />
                <button onClick={() => { setBackFile(null); setBackPreview(null); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => backRef.current.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-xs text-gray-500 hover:border-blue-400 flex flex-col items-center gap-1">
                <Upload className="w-5 h-5" /> {t('verification.form.uploadBack')}
              </button>
            )}
          </div>
        )}

        {/* Selfie con documento */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">{t('verification.form.selfieLabel')}</p>
          <input ref={selfieRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFile(e, setSelfieFile, setSelfiePreview)} />
          {selfiePreview ? (
            <div className="relative">
              <img src={selfiePreview} className="w-full h-28 object-cover rounded-lg border border-gray-200" />
              <button onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button onClick={() => selfieRef.current.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-xs text-gray-500 hover:border-blue-400 flex flex-col items-center gap-1">
              <Upload className="w-5 h-5" /> {t('verification.form.uploadSelfie')}
            </button>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={step === "submitting"} className="w-full bg-blue-600 hover:bg-blue-700">
          {step === "submitting" ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('reviews.form.sending')}</>
          ) : (
            <><CheckCircle className="w-4 h-4 mr-2" /> {t('verification.form.submit')}</>
          )}
        </Button>
      </div>
    );
  }

  // --- ESTADO: APROBADO ---
  if (verification?.status === "approved") {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">{t('proProfile.badges.identityVerified')}</p>
          <p className="text-xs text-emerald-600">{t('verification.approved.subtitle')}</p>
        </div>
      </div>
    );
  }

  // --- ESTADO: PENDIENTE ---
  if (verification?.status === "pending") {
    return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">{t('verification.pending.title')}</p>
          <p className="text-xs text-amber-600">{t('verification.pending.subtitle')}</p>
        </div>
      </div>
    );
  }

  // --- ESTADO: RECHAZADO ---
  if (verification?.status === "rejected") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldX className="w-5 h-5 text-red-600" />
          <p className="text-sm font-semibold text-red-800">{t('verification.status.rejected')}</p>
        </div>
        {verification.rejection_reason && (
          <p className="text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2">
            {t('verification.rejected.reason', { reason: verification.rejection_reason })}
          </p>
        )}
        <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
          onClick={() => setStep("form")}>
          {t('verification.rejected.retry')}
        </Button>
      </div>
    );
  }

  // --- ESTADO: IDLE (sin verificación) ---
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{t('verification.idle.title')}</p>
          <p className="text-xs text-gray-500">{t('verification.idle.subtitle')}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" className="flex-shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50"
        onClick={() => setStep("form")}>
        {t('verification.idle.cta')}
      </Button>
    </div>
  );
}