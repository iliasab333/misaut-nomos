import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, Loader2, ArrowRight, Eye, MessageSquare, FileText, CreditCard, Users, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function PaymentSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState(t('payments.success.activating'));
  const hasProcessed = useRef(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    processPayment();
  }, []);

  const processPayment = async () => {
    try {
      // Limpiar cache
      sessionStorage.removeItem('current_user');
      
      // Obtener usuario
      const user = await base44.auth.me();
      if (!user) {
        setStatus("error");
        setMessage(t('payments.success.noSession'));
        return;
      }

      console.log('👤 Usuario:', user.email);
      setMessage(t('payments.success.verifyingPayment'));

      // ✅ LLAMAR A LA FUNCIÓN QUE SINCRONIZA CON STRIPE Y CREA LA SUSCRIPCIÓN
      let syncResult = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const response = await base44.functions.invoke('syncStripeSubscription', {
            sessionId: sessionId
          });
          syncResult = response.data;
          console.log('🔄 Sync resultado:', syncResult);
          
          if (syncResult?.subscription?.active) {
            break;
          }
        } catch (e) {
          console.log('Intento', attempts + 1, 'fallido:', e.message);
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setMessage(t('payments.success.waitingStripe', { attempt: attempts, max: maxAttempts }));
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // ✅ VERIFICAR SUSCRIPCIÓN EN BD
      setMessage(t('payments.success.verifyingSubscription'));
      const subs = await base44.entities.Subscription.filter({ user_id: user.id });
      
      let hasSubscription = false;
      if (subs.length > 0) {
        const sub = subs[0];
        const estado = sub.estado?.toLowerCase();
        const fechaExp = new Date(sub.fecha_expiracion);
        const today = new Date();
        
        hasSubscription = (
          estado === 'activo' || 
          estado === 'en_prueba' || 
          estado === 'trialing' ||
          estado === 'active'
        ) && fechaExp >= today;
        
        console.log('📊 Suscripción encontrada:', estado, 'Activa:', hasSubscription);
      }

      // ✅ ACTUALIZAR USUARIO A PROFESIONAL
      if (user.user_type !== 'professionnel') {
        await base44.auth.updateMe({ user_type: 'professionnel' });
        console.log('✅ Usuario actualizado a professionnel');
      }

      // ✅ VERIFICAR PERFIL PROFESIONAL
      const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: user.id });
      const hasProfile = profiles.length > 0;
      const onboardingDone = hasProfile && profiles[0].onboarding_completed === true;

      console.log('📋 Perfil:', hasProfile, 'Onboarding:', onboardingDone);

      // Limpiar cache de nuevo
      sessionStorage.removeItem('current_user');

      // ✅ DETERMINAR DESTINO
      if (!hasSubscription) {
        // Sin suscripción activa - mostrar error pero permitir continuar
        setStatus("warning");
        setMessage(t('payments.success.processingCompleteProfile'));
        
        setTimeout(() => {
          if (!onboardingDone) {
            navigate(createPageUrl("ProfileOnboarding"));
          } else {
            navigate(createPageUrl("ProfessionalDashboard"));
          }
        }, 2000);
        return;
      }

      // ✅ ÉXITO - Redirigir automáticamente
      setStatus("success");
      
      if (onboardingDone) {
        setMessage(t('payments.success.allSetRedirecting'));
        setTimeout(() => {
          navigate(createPageUrl("ProfessionalDashboard"));
        }, 1500);
      } else {
        setMessage(t('payments.success.confirmedCompleteProfile'));
        setTimeout(() => {
          navigate(createPageUrl("ProfileOnboarding"));
        }, 1500);
      }

    } catch (error) {
      console.error("Error:", error);
      setStatus("error");
      setMessage(t('payments.success.processingError'));
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      status === "success" ? "bg-gradient-to-br from-green-50 to-emerald-100" :
      status === "error" ? "bg-gradient-to-br from-red-50 to-orange-100" :
      status === "warning" ? "bg-gradient-to-br from-amber-50 to-yellow-100" :
      "bg-gradient-to-br from-blue-50 to-indigo-100"
    }`}>
      <Card className="max-w-md w-full shadow-2xl border-0">
        <CardContent className="p-8 text-center">
          {status === "processing" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {t('payments.success.processingTitle')}
              </h1>
              <p className="text-gray-600 mb-6">{message}</p>
              
              {/* What you get section */}
              <div className="bg-blue-50 rounded-xl p-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">{t('payments.success.benefitsTitle')}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700">{t('payments.success.benefitVisibleProfile')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="text-gray-700">{t('payments.success.benefitDirectContacts')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span className="text-gray-700">{t('payments.success.benefitProInvoices')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span className="text-gray-700">{t('payments.success.benefitEasyPayments')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span className="text-gray-700">{t('payments.success.benefitClientManagement')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                    <span className="text-gray-700">{t('payments.success.benefitProDashboard')}</span>
                  </div>
                </div>
                <Link to={createPageUrl("DashboardProInfo")} className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-3 inline-flex items-center">
                  {t('payments.success.learnMore')} <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-800 mb-3">
                {t('payments.success.confirmedTitle')}
              </h1>
              <p className="text-gray-600 mb-4">{message}</p>
              {/* CTA Referidos */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
                <p className="text-sm font-bold text-gray-900 mb-1">{t('payments.success.referralTitle')}</p>
                <p className="text-xs text-gray-600">{t('payments.success.referralDescription')}</p>
                <button
                  onClick={() => navigate("/referidos")}
                  className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900"
                >
                  {t('payments.success.referralCta')}
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('payments.success.redirecting')}
              </div>
            </>
          )}

          {status === "warning" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
                <ArrowRight className="w-12 h-12 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-amber-800 mb-3">
                {t('payments.success.processing')}
              </h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('payments.success.redirecting')}
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {t('payments.success.errorTitle')}
              </h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate(createPageUrl("ProfileOnboarding"))} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {t('dashboard.complete_profile')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(createPageUrl("SubscriptionManagement"))}
                  className="w-full"
                >
                  {t('payments.success.viewSubscription')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
