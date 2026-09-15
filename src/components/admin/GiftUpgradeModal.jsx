import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Gift, X } from 'lucide-react';
import { toast } from 'sonner';

export default function GiftUpgradeModal({ subscriber, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [giftPlan, setGiftPlan] = useState('plan_adsplus');
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Nombres de plan: se envían al backend (giftedPlanName / originalPlanName)
  // y se persisten, por eso se mantienen como identificadores y no pasan por t().
  const plans = {
    'plan_trial': { name: 'Plan Trial', price: 0 },
    'plan_visibility': { name: 'Plan Visibilidad', price: 13 },
    'plan_adsplus': { name: 'Plan Ads+', price: 33 }
  };

  // subscriber puede tener: { id (subscriptionId), user_id, plan_id, ... } o { userId, name, email } (sin suscripción)
  const hasSubscription = !!subscriber.plan_id;
  const currentPlan = hasSubscription
    ? (plans[subscriber.plan_id] || { name: subscriber.plan_nombre || 'Sin plan', price: subscriber.plan_precio ?? 0 })
    : { name: 'Sin suscripción', price: 0 };
  const targetPlan = plans[giftPlan];

  const handleGift = async () => {
    if (!reason.trim()) {
      setError(t('admin.giftUpgrade.errors.reasonRequired'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const giftedUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

      const payload = hasSubscription
        ? { subscriptionId: subscriber.id, giftedPlanId: giftPlan, giftedPlanName: targetPlan.name, giftedUntil: giftedUntil.toISOString(), giftReason: reason.trim() }
        : { userId: subscriber.userId || subscriber.user_id, giftedPlanId: giftPlan, giftedPlanName: targetPlan.name, giftedUntil: giftedUntil.toISOString(), giftReason: reason.trim() };

      // Usar backend function con asServiceRole para poder actualizar suscripción de otro usuario
      const response = await base44.functions.invoke('giftUpgrade', payload);

      if (!response.data?.ok) {
        throw new Error(response.data?.error || 'Error desconocido');
      }

      // Enviar notificación
      try {
        await base44.functions.invoke('sendGiftNotification', {
          userId: subscriber.user_id,
          giftedPlanName: targetPlan.name,
          giftedUntil: giftedUntil.toISOString(),
          originalPlanName: currentPlan.name,
          duration,
          giftedPlanId: giftPlan
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      toast.success(t('admin.giftUpgrade.toast.success'));
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(t('admin.giftUpgrade.errors.applyFailed', { message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-600"/>
            <h2 className="text-lg font-semibold text-gray-900">{t('admin.giftUpgrade.title')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
          <p className="mb-1"><strong>{t('admin.giftUpgrade.userLabel')}</strong> {subscriber.name || subscriber.email}</p>
          <p className="mb-1"><strong>{t('admin.giftUpgrade.emailLabel')}</strong> {subscriber.email}</p>
          <p><strong>{t('admin.giftUpgrade.currentPlanLabel')}</strong> {currentPlan.name}</p>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.giftUpgrade.planToGift')}</label>
        <select 
          value={giftPlan} 
          onChange={e => setGiftPlan(e.target.value)} 
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
        >
          <option value="plan_adsplus">{t('admin.giftUpgrade.planOptions.adsPlus')}</option>
          <option value="plan_visibility">{t('admin.giftUpgrade.planOptions.visibility')}</option>
        </select>

        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.giftUpgrade.duration')}</label>
        <select 
          value={duration} 
          onChange={e => setDuration(parseInt(e.target.value))} 
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
        >
          <option value={7}>{t('admin.giftUpgrade.durations.days', { count: 7 })}</option>
          <option value={15}>{t('admin.giftUpgrade.durations.days', { count: 15 })}</option>
          <option value={30}>{t('admin.giftUpgrade.durations.oneMonth')}</option>
          <option value={60}>{t('admin.giftUpgrade.durations.twoMonths')}</option>
          <option value={90}>{t('admin.giftUpgrade.durations.threeMonths')}</option>
          <option value={180}>{t('admin.giftUpgrade.durations.sixMonths')}</option>
          <option value={365}>{t('admin.giftUpgrade.durations.oneYear')}</option>
        </select>

        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.giftUpgrade.internalReason')} <span className="text-red-500">*</span></label>
        <textarea 
          value={reason} 
          onChange={e => { setReason(e.target.value); setError(''); }}
          placeholder={t('admin.giftUpgrade.reasonPlaceholder')}
          rows={2}
          className={`w-full border rounded-lg px-3 py-2 text-sm mb-2 ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
        />
        {error && <p className="text-red-600 text-xs mb-3 font-medium">⚠️ {error}</p>}

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 mb-4">
          <strong>{t('admin.giftUpgrade.info.title')}</strong><br/>
          {t('admin.giftUpgrade.info.benefits', { plan: targetPlan?.name, days: duration })}<br/>
          {hasSubscription
            ? <>{t('admin.giftUpgrade.info.stripeUnchanged', { plan: currentPlan.name })}<br/></>
            : <>{t('admin.giftUpgrade.info.manualSubscription')}<br/></>
          }
          {t('admin.giftUpgrade.info.notification')}<br/>
          {hasSubscription
            ? t('admin.giftUpgrade.info.expiryRevert', { plan: currentPlan.name })
            : t('admin.giftUpgrade.info.expiryInactive')}
        </div>

        <div className="flex gap-2">
          <button 
            onClick={onClose} 
            disabled={loading} 
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-200"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleGift} 
            disabled={loading} 
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {loading ? t('admin.giftUpgrade.applying') : t('admin.giftUpgrade.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
