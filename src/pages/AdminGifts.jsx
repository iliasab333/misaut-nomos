import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Gift, RefreshCw, Search, CheckCircle, AlertCircle, User, Users, UserX, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/admin/AdminLayout';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  redeemed: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-600'
};

export default function AdminGiftsPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('visibilidad');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [granting, setGranting] = useState(false);
  const [result, setResult] = useState(null);

  // Dentro del componente para que las etiquetas se retraduzcan al cambiar de idioma.
  const CASE_LABELS = {
    A: { label: t('admin.gifts.case.noUser'), color: 'bg-gray-100 text-gray-700', icon: UserX },
    B: { label: t('clientLabel'), color: 'bg-blue-100 text-blue-700', icon: User },
    C: { label: t('admin.gifts.case.professionalNoSub'), color: 'bg-amber-100 text-amber-700', icon: Users },
    D: { label: t('admin.gifts.case.professionalActive'), color: 'bg-green-100 text-green-700', icon: CheckCircle }
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role !== 'admin') window.location.href = '/buscar';
      else setUser(u);
    });
  }, []);

  const { data: grants = [], refetch, isLoading } = useQuery({
    queryKey: ['freeMonthGrants'],
    queryFn: () => base44.entities.FreeMonthGrant.list('-granted_at', 50),
    enabled: !!user
  });

  const thisMonthGrants = grants.filter(g => {
    const d = new Date(g.granted_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const handlePreview = async () => {
    if (!email.trim()) return;
    setPreviewing(true);
    setPreview(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('previewGrant', { email: email.trim(), plan });
      setPreview(res.data);
    } catch (err) {
      toast.error(t('admin.gifts.previewError', { message: err.message }));
    } finally {
      setPreviewing(false);
    }
  };

  const handleGrant = async () => {
    if (!preview) return;
    setGranting(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('grantFreeMonth', { email: email.trim(), plan });
      setResult(res.data);
      toast.success(t('admin.gifts.grantSuccess'));
      refetch();
      setPreview(null);
      setEmail('');
    } catch (err) {
      toast.error(t('admin.gifts.grantError', { message: err.message }));
    } finally {
      setGranting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('admin.gifts.copied'));
  };

  if (!user) {
    return (
      <AdminLayout activeSection="gifts" onSectionChange={() => {}}>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="gifts" onSectionChange={() => {}}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('admin.gifts.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('admin.gifts.subtitle')}
              <span className="ml-2 font-semibold text-amber-600">{t('admin.gifts.thisMonth', { count: thisMonthGrants })}</span>
            </p>
          </div>
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('admin.gifts.refresh')}
          </button>
        </div>

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">{t('admin.gifts.newGift')}</h2>

          <div className="flex gap-3 flex-wrap">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setPreview(null); setResult(null); }}
              onKeyDown={e => e.key === 'Enter' && handlePreview()}
              placeholder={t('admin.gifts.emailPlaceholder')}
              className="flex-1 min-w-[240px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={plan}
              onChange={e => { setPlan(e.target.value); setPreview(null); setResult(null); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="visibilidad">{t('admin.gifts.planVisibility')}</option>
              <option value="ads_plus">{t('admin.gifts.planAdsPlus')}</option>
            </select>
            <button
              onClick={handlePreview}
              disabled={previewing || !email.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {previewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t('admin.gifts.checkUser')}
            </button>
          </div>

          {/* Preview card */}
          {preview && !result && (
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CASE_LABELS[preview.case]?.color}`}>
                  {t('admin.gifts.caseBadge', { code: preview.case, label: CASE_LABELS[preview.case]?.label })}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{preview.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{preview.description}</p>
                </div>
              </div>

              {preview.user && (
                <div className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <span className="font-medium">{preview.user.full_name || t('admin.gifts.noName')}</span>
                  <span className="mx-2 text-gray-400">·</span>
                  <span>{preview.email}</span>
                  <span className="mx-2 text-gray-400">·</span>
                  <span className="capitalize">{preview.user.user_type}</span>
                </div>
              )}

              {preview.subscription && (
                <div className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <span className="font-medium">{t('admin.gifts.activeSub')}</span> {preview.subscription.plan_nombre}
                  {preview.stripe_preview !== null && (
                    <span className="ml-2 text-green-700 font-medium">
                      {t('admin.gifts.nextInvoiceWithCoupon', { amount: (preview.stripe_preview?.amount_due / 100).toFixed(2) })}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleGrant}
                  disabled={granting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {granting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  {t('admin.gifts.confirmGrant')}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle className="w-5 h-5" />
                {t('admin.gifts.granted', { code: result.case })}
              </div>

              {result.promo_code && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-white border border-green-200 rounded-lg px-3 py-2">
                    <span className="font-mono font-bold text-green-800 text-base tracking-widest">{result.promo_code}</span>
                    <button onClick={() => copyToClipboard(result.promo_code)} className="ml-auto text-green-600 hover:text-green-800">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {result.suggested_message && (
                    <div className="relative">
                      <pre className="text-xs text-gray-700 bg-white border border-gray-100 rounded-lg p-3 whitespace-pre-wrap font-sans">
                        {result.suggested_message}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(result.suggested_message)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                        title={t('admin.gifts.copyMessage')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {result.stripe_subscription_id && (
                <p className="text-xs text-gray-600">
                  <span className="font-medium">{t('admin.gifts.subscriptionId')}</span> <code className="bg-white px-1 rounded">{result.stripe_subscription_id}</code>
                  {result.trial_end && <span className="ml-2">{t('admin.gifts.trialUntil', { date: new Date(result.trial_end).toLocaleDateString('es-ES') })}</span>}
                </p>
              )}

              {result.amount_due_next !== undefined && result.amount_due_next !== null && (
                <p className="text-xs text-gray-600">
                  {t('admin.gifts.nextInvoiceVerified')} <span className="font-bold text-green-700">{(result.amount_due_next / 100).toFixed(2)}€</span>
                </p>
              )}

              <button onClick={() => setResult(null)} className="text-xs text-gray-500 underline">{t('admin.gifts.makeAnother')}</button>
            </div>
          )}
        </div>

        {/* Tabla de historial */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{t('admin.gifts.lastGrants')}</h2>
            <span className="text-sm text-gray-500">{t('admin.gifts.records', { count: grants.length })}</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : grants.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('admin.gifts.emptyState')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[t('emailField'), t('admin.gifts.table.type'), t('admin.gifts.table.case'), t('admin.gifts.table.plan'), t('admin.gifts.table.stripeId'), t('admin.gifts.table.status'), t('admin.gifts.table.grantedAt'), t('admin.gifts.table.expiresAt')].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grants.map(g => {
                    const CaseIcon = CASE_LABELS[g.case]?.icon || Gift;
                    return (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800 font-medium">{g.email}</td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-gray-600">{g.user_type?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CASE_LABELS[g.case]?.color}`}>
                            <CaseIcon className="w-3 h-3" />
                            {g.case}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700 capitalize">{g.plan?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          {g.promo_code ? (
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{g.promo_code}</span>
                          ) : (
                            <span className="font-mono text-xs text-gray-500 truncate max-w-[120px] block">{g.stripe_object_id || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[g.status] || 'bg-gray-100 text-gray-600'}`}>
                            {g.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {g.granted_at ? new Date(g.granted_at).toLocaleDateString('es-ES') : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {g.expires_at ? new Date(g.expires_at).toLocaleDateString('es-ES') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}