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
import { useLanguage } from "../components/ui/LanguageSwitcher";
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
  const { t } = useLanguage();
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
        toast.error("No se pudo obtener tu email");
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
          toast.success("Suscripción corregida, recargando...");
          const currentUser = await loadUser();
          if (currentUser) {
            await loadSubscription(currentUser);
          }
        } else {
          toast.error("No se pudo corregir automáticamente");
        }
      } else {
        toast.info("La suscripción está correctamente configurada");
      }
    } catch (error) {
      console.error('Error fixing subscription:', error);
      toast.error("Error al verificar la suscripción");
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
        toast.success('Suscripción cancelada correctamente', {
          description: 'Tu perfil ya no es visible en búsquedas'
        });
        setShowCancelDialog(false);
        sessionStorage.removeItem('current_user');
      } else {
        toast.error(response.data?.error || 'Error al cancelar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cancelar la suscripción');
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
        toast.error(response.data.error || "Error al reactivar");
      }
    } catch (error) {
      toast.error(error.message || "Error al reactivar la suscripción");
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
      toast.error('Error al abrir el portal de facturación');
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
        toast.success(response.data.message || 'Plan degradado correctamente');
        // Recargar con el user actual
        const currentUser = await loadUser();
        if (currentUser) {
          await loadSubscription(currentUser);
        }
      } else {
        toast.error(response.data?.error || 'Error al degradar el plan');
      }
    } catch (error) {
      console.error('Error downgrading plan:', error);
      toast.error('Error al degradar el plan');
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
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t('active')}</Badge>;
      case "cancelado":
        return <Badge className="bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3 mr-1" />{t('canceled')}</Badge>;
      case "finalizada":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />{t('finished')}</Badge>;
      case "en_prueba":
        return <Badge className="bg-blue-100 text-blue-800"><Info className="w-3 h-3 mr-1" />{t('trial')}</Badge>;
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
          <p className="text-sm text-gray-600">Sincronizando con Stripe...</p>
        )}
      </div>
    );
  }

  if (IS_NATIVE) {
    return (
      <>
        <SEOHead title={`${t('mySubscription')} - MisAutónomos`} noindex />
        <div className="min-h-screen bg-white p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("MyProfile"))}
              className="mb-6 hover:bg-gray-100"
              aria-label={t('backToProfile')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl inline-flex items-center justify-center" style={{ background: 'rgba(0,37,92,0.08)', color: '#00255C' }}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">Tu plan</h2>
                  {subscription ? (
                    <p className="text-sm text-slate-700 mt-0.5">
                      Estado: <span className="font-semibold">{subscription.estado || '—'}</span>
                      {subscription.fecha_expiracion ? (
                        <> · Renueva el {new Date(subscription.fecha_expiracion).toLocaleDateString('es-ES')}</>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-700 mt-0.5">Sin plan activo.</p>
                  )}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Gestiona tu plan en <a href="https://misautonomos.es" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: '#00255C' }}>misautonomos.es</a>.
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
        title={`${t('mySubscription')} - MisAutónomos`}
        description={t('manageProfessionalPlan')}
        noindex={true}
      />

      <div className="min-h-screen bg-white p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("MyProfile"))}
            className="mb-6 hover:bg-gray-100"
            aria-label={t('backToProfile')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>

          {!subscription || subscription.estado === 'finalizada' ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-gray-400" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                {subscription?.estado === 'finalizada' ? 'Tu suscripción ha sido cancelada' : 'No tienes un plan activo'}
              </h2>
              
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {subscription?.estado === 'finalizada' 
                  ? 'Tu perfil ya no es visible en las búsquedas. Puedes volver a suscribirte cuando quieras.'
                  : 'Necesitas contratar un plan profesional para que tu perfil aparezca en las búsquedas'}
              </p>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate(createPageUrl("PricingPlans"))}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                >
                  Ver planes disponibles
                </Button>
                
                <p className="text-sm text-gray-500">
                  ¿Necesitas ayuda? <a href="mailto:soporte@misautonomos.es" className="text-blue-600 hover:underline">soporte@misautonomos.es</a>
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
                      <h3 className="font-bold text-amber-900">Tienes un plan regalado activo</h3>
                      <p className="text-sm text-amber-800 mt-1">
                        Disfrutas de <strong>{effectivePlan.planName}</strong> hasta el{' '}
                        <strong>{new Date(effectivePlan.giftedUntil).toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'})}</strong>.
                      </p>
                      <p className="text-xs text-amber-700 mt-2">
                        Tu facturación actual ({effectivePlan.originalPlanName}) no ha cambiado. Al terminar el regalo volverás automáticamente a este plan.
                      </p>
                      <p className="text-xs text-amber-700 mt-2 font-medium">
                        {Math.ceil((new Date(effectivePlan.giftedUntil) - new Date()) / (1000*60*60*24))} días restantes
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ENCABEZADO DE ESTADO - Visual y Directo */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tu plan actual</p>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {plan?.nombre || (effectivePlan?.planName) || subscription.plan_nombre}
                      {effectivePlan?.isGifted && (
                        <span className="ml-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          Regalo
                        </span>
                      )}
                    </h2>
                  </div>
                  {subscription.estado === "activo" && (
                    <Badge className="bg-green-100 text-green-700 border-0 px-3 py-1">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Activo
                    </Badge>
                  )}
                  {subscription.estado === "en_prueba" && (
                    <Badge className="bg-blue-100 text-blue-700 border-0 px-3 py-1">
                      Periodo de prueba
                    </Badge>
                  )}
                  {subscription.estado === "cancelado" && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 px-3 py-1">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Cancelado
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Precio</span>
                    <span className="font-semibold text-gray-900">{plan?.precio || subscription.plan_precio}€/mes</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">
                      {subscription.estado === "en_prueba" ? "Fin de prueba" : "Próximo cobro"}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {new Date(subscription.fecha_expiracion).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                      {subscription.estado === "en_prueba" && getDaysLeft(subscription.fecha_expiracion) > 0 && (
                        <span className="text-blue-600 ml-2">
                          ({getDaysLeft(subscription.fecha_expiracion)} días)
                        </span>
                      )}
                    </span>
                  </div>

                  {subscription.estado === "en_prueba" && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-900">
                        <strong>Periodo de prueba:</strong> Los primeros 7 días son gratis. 
                        Si no cancelas antes del {new Date(subscription.fecha_expiracion).toLocaleDateString('es-ES')}, 
                        se cobrará automáticamente {plan?.precio || subscription.plan_precio}€/mes.
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
                        <h3 className="text-xl font-semibold mb-2">Mejorar a Plan Ads+</h3>
                        <p className="text-sm text-purple-100">
                          Acceso completo al Dashboard Pro + Campañas publicitarias gestionadas
                        </p>
                      </div>
                      <TrendingUp className="w-10 h-10 opacity-80" />
                    </div>

                    <ul className="space-y-2 mb-4 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        CRM completo y gestión de clientes
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        Campañas en Instagram, Facebook y TikTok
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        Facturación y presupuestos automáticos
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
                          Procesando pago...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Mejorar por 33€/mes
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-purple-100 mt-2 text-center">
                      Prorrateo automático. Solo pagas la diferencia del mes actual.
                    </p>
                  </div>
                )}

                {/* DOWNGRADE si está en Plan Ads+ (plan real pagado) */}
                {(subscription.estado === "activo" || subscription.estado === "en_prueba") && subscription.plan_id === 'plan_adsplus' && !effectivePlan?.isGifted && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Cambiar a Plan Visibilidad</h3>
                        <p className="text-sm text-gray-600">
                          Reduce tus gastos manteniendo visibilidad en búsquedas
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
                          Procesando...
                        </>
                      ) : (
                        <>
                          Cambiar a 14€/mes
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Se aplicará en el próximo período de facturación.
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
                      <h3 className="font-semibold text-gray-900 mb-1">Facturas de tu suscripción</h3>
                      <p className="text-sm text-gray-600">
                        Descarga o consulta tus facturas de MisAutónomos
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
                        No hay facturas disponibles aún
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Las facturas aparecen después del primer cobro
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
                                {invoice.number || `Factura ${invoice.id}`}
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
                                {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'open' ? 'Pendiente' : invoice.status}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {invoice.pdf_url && (
                                <a
                                  href={invoice.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-white rounded-md transition-colors"
                                  title="Descargar PDF"
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
                                  title="Ver factura"
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
                      <h3 className="font-semibold text-gray-900 mb-1">Método de pago</h3>
                      <p className="text-sm text-gray-600">
                        Actualiza tu tarjeta o gestiona tu facturación
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
                    onClick={async () => {
                      if (openingPortal) return;
                      
                      setOpeningPortal(true);
                      
                      const timeout = setTimeout(() => {
                        toast.error('La conexión está tardando mucho. Intenta de nuevo.');
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
                            toast.success('Portal abierto en nueva pestaña');
                            setOpeningPortal(false);
                          }
                        } else {
                          const errorMsg = response.data?.error || 'Error al abrir el portal';
                          toast.error(errorMsg);
                          setOpeningPortal(false);
                        }
                      } catch (error) {
                        clearTimeout(timeout);
                        console.error('Error completo:', error);
                        toast.error('Error de conexión. Verifica tu suscripción e intenta de nuevo.');
                        setOpeningPortal(false);
                      }
                    }}
                    disabled={openingPortal}
                  >
                    {openingPortal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Abriendo portal...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Gestionar pago
                      </>
                    )}
                  </Button>
                  {subscription?.stripe_customer_id && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      ID Cliente: {subscription.stripe_customer_id.substring(0, 12)}...
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
                          Suscripción cancelada
                        </p>
                        <p className="text-sm text-gray-700">
                          Tu plan sigue activo hasta el {new Date(subscription.fecha_expiracion).toLocaleDateString('es-ES')}. 
                          Quedan {getDaysLeft(subscription.fecha_expiracion)} días.
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
                          Reactivando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reactivar suscripción
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
                      Tu plan ha expirado
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Tu perfil no es visible en las búsquedas
                    </p>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate(createPageUrl("PricingPlans"))}
                    >
                      Ver planes disponibles
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
                    Cancelar suscripción
                  </button>
                </div>
              )}
            </>
          )}

          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  ¿Cancelar tu suscripción?
                </DialogTitle>
                <DialogDescription className="space-y-4 pt-4 text-base">
                  {subscription?.estado === "en_prueba" ? (
                    <>
                      <p className="text-gray-700">
                        Si cancelas ahora, <strong>no se te cobrará nada</strong>. Tu prueba gratuita se detendrá inmediatamente.
                      </p>
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
                        <p className="text-sm text-amber-900">
                          Tu perfil dejará de aparecer en las búsquedas al instante y perderás tu plaza reservada (máximo 10 por ciudad).
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700">
                        Tu suscripción seguirá activa hasta el <strong>{new Date(subscription?.fecha_expiracion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</strong>.
                      </p>
                      <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                        <p className="text-sm text-red-900">
                          Después de esa fecha, tu perfil pasará a ser gratuito y <strong>perderás tu plaza reservada</strong> (máximo 10 profesionales por ciudad).
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
                  No, mantener activo
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
                      Cancelando...
                    </>
                  ) : (
                    'Sí, cancelar suscripción'
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