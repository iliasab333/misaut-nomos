import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Info,
  TrendingUp,
  Zap,
  AlertCircle,
  Briefcase,
  Download,
  FileText,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation, Trans } from "react-i18next";
import SEOHead from "../components/seo/SEOHead";
import { getEffectivePlan } from "@/utils/subscription";
import { Gift } from "lucide-react";
import { Capacitor } from "@capacitor/core";

// En nativo (iOS/Android) ocultamos cualquier CTA de pago para cumplir con las
// políticas de Apple/Google sobre IAP y porque el cobro va por Stripe en web.
const IS_NATIVE = (() => {
  try { return Capacitor?.isNativePlatform?.() === true; } catch { return false; }
})();

export default function SubscriptionManagementPage() {
  // 1. HOOKS PRIMERO
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [effectivePlan, setEffectivePlan] = useState(null);
  const [plan, setPlan] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // 2. FUNCIONES AUXILIARES (declaraciones hoisteables)
  async function loadUser() {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser || null);
      return currentUser;
    } catch (error) {
      console.error('Error loading user:', error);
      base44.auth.redirectToLogin();
      return null;
    }
  }

  async function loadInvoices() {
    setLoadingInvoices(true);
    try {
      const response = await base44.functions.invoke('getStripeInvoices', {});
      if (response.data?.invoices && Array.isArray(response.data.invoices)) {
        setInvoices(response.data.invoices);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function loadSubscription(currentUser) {
    try {
      if (!currentUser?.id) {
        console.error('[SubscriptionManagement] No user ID available');
        setLoading(false);
        return;
      }

      setSyncing(true);
      // Sincronizar con Stripe
      try {
        const syncResponse = await base44.functions.invoke('syncStripeSubscription', {});
        if (syncResponse.data?.ok && syncResponse.data?.subscription) {
          sessionStorage.removeItem('current_user');
        }
      } catch (syncError) {
        console.warn('[SubscriptionManagement] Sync failed, continuing:', syncError.message);
      }
      setSyncing(false);

      // Cargar suscripción de la BD
      const subs = (await base44.entities.Subscription.filter({
        user_id: currentUser.id
      })) || [];
      const sub = subs[0] || null;
      setSubscription(sub);

      // Cargar plan efectivo
      if (sub) {
        try {
          const planData = await getEffectivePlan(currentUser.id);
          setEffectivePlan(planData);

          // Cargar detalles del plan
          const planId = planData?.planId || sub.plan_id;
          if (planId) {
            try {
              const plans = (await base44.entities.SubscriptionPlan.filter({ plan_id: planId })) || [];
              setPlan((Array.isArray(plans) ? plans : [])[0] || null);
            } catch (planFetchError) {
              console.warn('[loadSubscription] Error loading plan details:', planFetchError.message);
              setPlan(null);
            }
          }
        } catch (planError) {
          console.warn('[loadSubscription] Error loading effective plan, using fallback:', planError.message);
          setEffectivePlan(null);
          setPlan(null);
        }
      }

      // Cargar facturas si hay suscripción
      if (sub && (sub.estado === 'activo' || sub.estado === 'en_prueba' || sub.estado === 'cancelado')) {
        await loadInvoices();
      }
    } catch (error) {
      console.error('[SubscriptionManagement] Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  // 3. EFFECTS
  useEffect(() => {
    async function init() {
      const currentUser = await loadUser();
      if (currentUser) {
        await loadSubscription(currentUser);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 4. FUNCIONES DE GESTIÓN
  const handleFixSubscription = async () => {
    setIsFixing(true);
    try {
      if (!user?.email) {
        toast.error(t('subscription.toasts.noEmail'));
        return;
      }
      
      const debugResponse = await base44.functions.invoke('debugUserSubscription', {
        email: user.email
      });
      
      if (!debugResponse.data.ok || debugResponse.data.issues?.length > 0) {
        const fixResponse = await base44.functions.invoke('fixUserSubscription', {
          email: user.email,
          forceActivate: true
        });
        
        if (fixResponse.data.ok) {
          toast.success(t('subscription.toasts.fixed'));
          const currentUser = await loadUser();
          if (currentUser) {
            await loadSubscription(currentUser);
          }
        } else {
          toast.error(t('subscription.toasts.fixFailed'));
        }
      } else {
        toast.info(t('subscription.toasts.alreadyOk'));
      }
    } catch (error) {
      console.error('Error fixing subscription:', error);
      toast.error(t('subscription.toasts.verifyError'));
    } finally {
      setIsFixing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const response = await base44.functions.invoke('cancelSubscription', {});
      
      if (response.data?.success) {
        const currentUser = await loadUser();
        if (currentUser) {
          await loadSubscription(currentUser);
        }
        toast.success(t('subscription.toasts.canceled'), {
          description: t('subscription.toasts.canceledDescription')
        });
        setShowCancelDialog(false);
        sessionStorage.removeItem('current_user');
      } else {
        toast.error(response.data?.error || t('subscription.toasts.cancelError'));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('subscription.toasts.cancelSubscriptionError'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setIsReactivating(true);
    try {
      const response = await base44.functions.invoke('reactivateSubscription', {});
      if (response.data.ok) {
        toast.success(response.data.message);
        const currentUser = await loadUser();
        if (currentUser) {
          await loadSubscription(currentUser);
        }
      } else {
        toast.error(response.data.error || t('subscription.toasts.reactivateError'));
      }
    } catch (error) {
      toast.error(error.message || t('subscription.toasts.reactivateSubscriptionError'));
    } finally {
      setIsReactivating(false);
    }
  };

  const handleUpgradePlan = async () => {
    setIsUpgrading(true);
    try {
      const response = await base44.functions.invoke('createBillingPortalSession', {});
      if (response?.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No se recibió URL del portal');
      }
    } catch (error) {
      console.error('[Upgrade] Error:', error.message);
      toast.error(t('subscription.toasts.portalError'));
      // Fallback: abrir el portal de login general
      window.open('https://billing.stripe.com/p/login/00w00j5OLbXH4PV7jbgjC00', '_blank');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDowngradePlan = async (newPlanId) => {
    setIsDowngrading(true);
    try {
      const response = await base44.functions.invoke('downgradeSubscription', {
        newPlanId
      });

      if (response.data?.ok) {
        toast.success(response.data.message || t('subscription.toasts.downgraded'));
        // Recargar con el user actual
        const currentUser = await loadUser();
        if (currentUser) {
          await loadSubscription(currentUser);
        }
      } else {
        toast.error(response.data?.error || t('subscription.toasts.downgradeError'));
      }
    } catch (error) {
      console.error('Error downgrading plan:', error);
      toast.error(t('subscription.toasts.downgradeError'));
    } finally {
      setIsDowngrading(false);
    }
  };

  const getDaysLeft = (expirationDateString) => {
    if (!expirationDateString) return 0;
    const today = new Date();
    const expiration = new Date(expirationDateString);
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getStatusBadge = (estado) => {
    switch (estado) {
      case "activo":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t('subscription.status.active')}</Badge>;
      case "cancelado":
        return <Badge className="bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3 mr-1" />{t('subscription.status.canceled')}</Badge>;
      case "finalizada":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />{t('subscription.status.finished')}</Badge>;
      case "en_prueba":
        return <Badge className="bg-blue-100 text-blue-800"><Info className="w-3 h-3 mr-1" />{t('subscription.status.trial')}</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // 5. ESTADOS DERIVADOS (después de tener datos)
  const displayPlanId = effectivePlan?.planId || subscription?.plan_id;
  const displayPlanName = plan?.nombre || effectivePlan?.planName || subscription?.plan_nombre;
  const isGifted = effectivePlan?.isGifted === true;
  const isTrialing = subscription?.estado === 'en_prueba';
  const expiryDate = subscription?.fecha_expiracion ? new Date(subscription.fecha_expiracion) : null;
  const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate - new Date()) / (1000*60*60*24)) : null;
  const monthlyPrice = plan?.precio || subscription?.plan_precio || 0;





  if (loading || syncing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
        {syncing && (
          <p className="text-sm text-gray-600">{t('subscription.sync.stripe')}</p>
        )}
      </div>
    );
  }

  if (IS_NATIVE) {
    return (
      <>
        <SEOHead title={`${t('nav.my_subscription')} - MisAutónomos`} noindex />
        <div className="min-h-screen bg-white p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("MyProfile"))}
              className="mb-6 hover:bg-gray-100"
              aria-label={t('subscription.page.backToProfile')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl inline-flex items-center justify-center" style={{ background: 'rgba(0,37,92,0.08)', color: '#00255C' }}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">{t('subscription.native.yourPlan')}</h2>
                  {subscription ? (
                    <p className="text-sm text-slate-700 mt-0.5">
                      {t('subscription.native.status')} <span className="font-semibold">{subscription.estado || '—'}</span>
                      {subscription.fecha_expiracion ? (
                        <> · {t('subscription.native.renewsOn', { date: new Date(subscription.fecha_expiracion).toLocaleDateString('es-ES') })}</>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-700 mt-0.5">{t('subscription.native.noActivePlan')}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <Trans
                  i18nKey="subscription.native.manageOnWeb"
                  components={{
                    website: <a href="https://misautonomos.es" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: '#00255C' }} />,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`${t('nav.my_subscription')} - MisAutónomos`}
        description={t('subscription.page.seoDescription')}
        noindex={true}
      />

      <div className="min-h-screen bg-white p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("MyProfile"))}
            className="mb-6 hover:bg-gray-100"
            aria-label={t('subscription.page.backToProfile')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>

          {!subscription || subscription.estado === 'finalizada' ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-gray-400" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                {subscription?.estado === 'finalizada' ? t('subscription.noPlan.canceledTitle') : t('subscription.noPlan.title')}
              </h2>
              
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {subscription?.estado === 'finalizada' 
                  ? t('subscription.noPlan.canceledText')
                  : t('subscription.noPlan.text')}
              </p>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate(createPageUrl("PricingPlans"))}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                >
                  {t('subscription.noPlan.viewPlans')}
                </Button>
                
                <p className="text-sm text-gray-500">
                  {t('supportChat.needHelp')} <a href="mailto:soporte@misautonomos.es" className="text-blue-600 hover:underline">soporte@misautonomos.es</a>
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* REGALO ACTIVO */}
              {effectivePlan?.isGifted && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-white"/>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900">{t('subscription.gift.title')}</h3>
                      <p className="text-sm text-amber-800 mt-1">
                        <Trans
                          i18nKey="subscription.gift.enjoyUntil"
                          values={{
                            plan: effectivePlan.planName,
                            date: new Date(effectivePlan.giftedUntil).toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'}),
                          }}
                          components={{ strong: <strong /> }}
                        />
                      </p>
                      <p className="text-xs text-amber-700 mt-2">
                        {t('subscription.gift.billingUnchanged', { plan: effectivePlan.originalPlanName })}
                      </p>
                      <p className="text-xs text-amber-700 mt-2 font-medium">
                        {t('dashboard.days_remaining', { days: Math.ceil((new Date(effectivePlan.giftedUntil) - new Date()) / (1000*60*60*24)) })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ENCABEZADO DE ESTADO - Visual y Directo */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{t('subscription.plan.current')}</p>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {plan?.nombre || (effectivePlan?.planName) || subscription.plan_nombre}
                      {effectivePlan?.isGifted && (
                        <span className="ml-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          {t('subscription.plan.giftBadge')}
                        </span>
                      )}
                    </h2>
                  </div>
                  {subscription.estado === "activo" && (
                    <Badge className="bg-green-100 text-green-700 border-0 px-3 py-1">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('subscription.status.active')}
                    </Badge>
                  )}
                  {subscription.estado === "en_prueba" && (
                    <Badge className="bg-blue-100 text-blue-700 border-0 px-3 py-1">
                      {t('subscription.status.trial')}
                    </Badge>
                  )}
                  {subscription.estado === "cancelado" && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 px-3 py-1">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {t('subscription.status.canceled')}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t('subscription.plan.price')}</span>
                    <span className="font-semibold text-gray-900">{t('subscription.plan.pricePerMonth', { price: plan?.precio || subscription.plan_precio })}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">
                      {subscription.estado === "en_prueba" ? t('subscription.plan.trialEnds') : t('subscription.plan.nextCharge')}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {new Date(subscription.fecha_expiracion).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                      {subscription.estado === "en_prueba" && getDaysLeft(subscription.fecha_expiracion) > 0 && (
                        <span className="text-blue-600 ml-2">
                          {t('subscription.plan.daysLeft', { count: getDaysLeft(subscription.fecha_expiracion) })}
                        </span>
                      )}
                    </span>
                  </div>

                  {subscription.estado === "en_prueba" && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-900">
                        <Trans
                          i18nKey="subscription.plan.trialNotice"
                          values={{
                            date: new Date(subscription.fecha_expiracion).toLocaleDateString('es-ES'),
                            price: plan?.precio || subscription.plan_precio,
                          }}
                          components={{ strong: <strong /> }}
                        />
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ACCIONES PRINCIPALES */}
              <div className="space-y-4 mb-6">
                {/* UPGRADE si está en Plan Visibility (y sin regalo Ads+) */}
                {(subscription.estado === "activo" || subscription.estado === "en_prueba") && subscription.plan_id === 'plan_visibility' && !effectivePlan?.isGifted && (
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{t('subscription.upgrade.title')}</h3>
                        <p className="text-sm text-purple-100">
                          {t('subscription.upgrade.subtitle')}
                        </p>
                      </div>
                      <TrendingUp className="w-10 h-10 opacity-80" />
                    </div>

                    <ul className="space-y-2 mb-4 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        {t('subscription.upgrade.featureCrm')}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        {t('subscription.upgrade.featureAds')}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        {t('subscription.upgrade.featureInvoicing')}
                      </li>
                    </ul>

                    <Button
                      className="w-full bg-white text-purple-700 hover:bg-purple-50 font-semibold transition-all duration-200"
                      onClick={() => {
                        console.log('[BUTTON] Upgrade button clicked');
                        handleUpgradePlan('plan_adsplus');
                      }}
                      disabled={isUpgrading}
                      type="button"
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('subscription.upgrade.processingPayment')}
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          {t('subscription.upgrade.button')}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-purple-100 mt-2 text-center">
                      {t('subscription.upgrade.proration')}
                    </p>
                  </div>
                )}

                {/* DOWNGRADE si está en Plan Ads+ (plan real pagado) */}
                {(subscription.estado === "activo" || subscription.estado === "en_prueba") && subscription.plan_id === 'plan_adsplus' && !effectivePlan?.isGifted && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">{t('subscription.downgrade.title')}</h3>
                        <p className="text-sm text-gray-600">
                          {t('subscription.downgrade.subtitle')}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full border-gray-300 hover:bg-gray-50"
                      onClick={() => handleDowngradePlan('plan_visibility')}
                      disabled={isDowngrading}
                    >
                      {isDowngrading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('subscription.actions.processing')}
                        </>
                      ) : (
                        <>
                          {t('subscription.downgrade.button')}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {t('subscription.downgrade.appliesNextPeriod')}
                    </p>
                  </div>
                )}

                {/* FACTURAS DE SUSCRIPCIÓN */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{t('subscription.invoices.title')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.invoices.subtitle')}
                      </p>
                    </div>
                  </div>
                  
                  {loadingInvoices ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        {t('subscription.invoices.empty')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t('subscription.invoices.emptyHint')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {invoice.number || t('subscription.invoices.fallbackNumber', { id: invoice.id })}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(invoice.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {invoice.amount.toFixed(2)}€
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {invoice.status === 'paid' ? t('paid') : invoice.status === 'open' ? t('subscription.invoices.statusOpen') : invoice.status}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {invoice.pdf_url && (
                                <a
                                  href={invoice.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-white rounded-md transition-colors"
                                  title={t('downloadPDF')}
                                >
                                  <Download className="w-4 h-4 text-gray-600" />
                                </a>
                              )}
                              {invoice.hosted_invoice_url && (
                                <a
                                  href={invoice.hosted_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-white rounded-md transition-colors"
                                  title={t('subscription.invoices.view')}
                                >
                                  <ExternalLink className="w-4 h-4 text-gray-600" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* GESTIONAR MÉTODO DE PAGO */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{t('paymentMethod')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.payment.subtitle')}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
                    onClick={async () => {
                      if (openingPortal) return;
                      
                      setOpeningPortal(true);
                      
                      const timeout = setTimeout(() => {
                        toast.error(t('subscription.payment.timeout'));
                        setOpeningPortal(false);
                      }, 10000);

                      try {
                        const response = await base44.functions.invoke('createStripePortalSession', {});
                        clearTimeout(timeout);
                        
                        if (response.data?.url) {
                          const portalUrl = response.data.url;
                          
                          const newWindow = window.open(portalUrl, '_blank', 'noopener,noreferrer');
                          
                          if (!newWindow) {
                            window.location.href = portalUrl;
                          } else {
                            toast.success(t('subscription.payment.portalOpened'));
                            setOpeningPortal(false);
                          }
                        } else {
                          const errorMsg = response.data?.error || t('subscription.payment.portalError');
                          toast.error(errorMsg);
                          setOpeningPortal(false);
                        }
                      } catch (error) {
                        clearTimeout(timeout);
                        console.error('Error completo:', error);
                        toast.error(t('subscription.payment.connectionError'));
                        setOpeningPortal(false);
                      }
                    }}
                    disabled={openingPortal}
                  >
                    {openingPortal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('subscription.payment.openingPortal')}
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t('subscription.payment.manage')}
                      </>
                    )}
                  </Button>
                  {subscription?.stripe_customer_id && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {t('subscription.payment.customerId', { id: subscription.stripe_customer_id.substring(0, 12) })}
                    </p>
                  )}
                </div>

                {/* REACTIVAR si está cancelado con días restantes */}
                {subscription.estado === "cancelado" && getDaysLeft(subscription.fecha_expiracion) > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">
                          {t('subscription.reactivate.title')}
                        </p>
                        <p className="text-sm text-gray-700">
                          {t('subscription.reactivate.activeUntil', {
                            date: new Date(subscription.fecha_expiracion).toLocaleDateString('es-ES'),
                            count: getDaysLeft(subscription.fecha_expiracion),
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleReactivateSubscription}
                      disabled={isReactivating}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isReactivating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('subscription.reactivate.loading')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t('subscription.reactivate.button')}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* REACTIVAR si está finalizado */}
                {(subscription.estado === "finalizada" || (subscription.estado === "cancelado" && getDaysLeft(subscription.fecha_expiracion) <= 0)) && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {t('subscription.expired.title')}
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                      {t('subscription.expired.text')}
                    </p>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate(createPageUrl("PricingPlans"))}
                    >
                      {t('subscription.noPlan.viewPlans')}
                    </Button>
                  </div>
                )}
              </div>

              {/* CANCELAR SUSCRIPCIÓN - Sutil pero visible */}
              {(subscription.estado === "activo" || subscription.estado === "en_prueba") && (
                <div className="border-t border-gray-200 pt-6">
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors mx-auto block"
                  >
                    {t('subscription.cancel.link')}
                  </button>
                </div>
              )}
            </>
          )}

          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {t('subscription.cancel.dialogTitle')}
                </DialogTitle>
                <DialogDescription className="space-y-4 pt-4 text-base">
                  {subscription?.estado === "en_prueba" ? (
                    <>
                      <p className="text-gray-700">
                        <Trans i18nKey="subscription.cancel.trialNoCharge" components={{ strong: <strong /> }} />
                      </p>
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
                        <p className="text-sm text-amber-900">
                          {t('subscription.cancel.trialWarning')}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700">
                        <Trans
                          i18nKey="subscription.cancel.activeUntil"
                          values={{ date: new Date(subscription?.fecha_expiracion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) }}
                          components={{ strong: <strong /> }}
                        />
                      </p>
                      <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                        <p className="text-sm text-red-900">
                          <Trans i18nKey="subscription.cancel.activeWarning" components={{ strong: <strong /> }} />
                        </p>
                      </div>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCancelling}
                  className="w-full sm:w-auto"
                >
                  {t('subscription.cancel.keep')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                  className="w-full sm:w-auto"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('subscription.cancel.loading')}
                    </>
                  ) : (
                    t('subscription.cancel.confirm')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
