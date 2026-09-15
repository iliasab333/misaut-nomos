import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, Shield, Gift, ArrowRightLeft, XCircle, Play, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminPlanAuditLog() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Antes constante de módulo (CHANGE_TYPE_CONFIG); dentro para que las etiquetas sigan al idioma
  const changeTypeConfig = {
    gift_upgrade:         { label: t('admin.planAudit.types.giftUpgrade'),            color: 'bg-amber-100 text-amber-700',  icon: Gift },
    gift_revoke:          { label: t('admin.planAudit.types.giftRevoke'),             color: 'bg-red-100 text-red-700',      icon: XCircle },
    gift_expire:          { label: t('admin.planAudit.types.giftExpire'),             color: 'bg-gray-100 text-gray-600',    icon: RotateCcw },
    plan_change:          { label: t('admin.planAudit.types.planChange'),             color: 'bg-blue-100 text-blue-700',    icon: ArrowRightLeft },
    trial_start:          { label: t('admin.planAudit.types.trialStart'),             color: 'bg-green-100 text-green-700',  icon: Play },
    subscription_cancel:  { label: t('admin.planAudit.types.subscriptionCancel'),     color: 'bg-red-100 text-red-700',      icon: XCircle },
    subscription_reactivate: { label: t('admin.planAudit.types.subscriptionReactivate'), color: 'bg-green-100 text-green-700', icon: Play },
  };

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['planAuditLogs'],
    queryFn: () => base44.entities.PlanAuditLog.list('-created_date', 200),
    staleTime: 1000 * 60,
  });

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.changed_by_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.reason?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || log.change_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('admin.planAudit.title')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('admin.planAudit.subtitle')}</p>
        </div>
        <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> {t('admin.planAudit.refresh')}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.planAudit.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="all">{t('admin.planAudit.allTypes')}</option>
          {Object.entries(changeTypeConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">{t('admin.planAudit.empty.title')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('admin.planAudit.empty.description')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{t('admin.planAudit.columns.date')}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{t('admin.planAudit.columns.type')}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{t('admin.planAudit.columns.user')}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{t('admin.planAudit.columns.change')}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{t('admin.planAudit.columns.changedBy')}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{t('admin.planAudit.columns.reason')}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{t('admin.planAudit.columns.validUntil')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(log => {
                  const cfg = changeTypeConfig[log.change_type] || { label: log.change_type, color: 'bg-gray-100 text-gray-600', icon: ArrowRightLeft };
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {format(new Date(log.created_date), 'dd MMM yyyy HH:mm', { locale: es })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{log.user_email || log.user_id}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        <span className="text-gray-400">{log.plan_before_name || log.plan_before || '—'}</span>
                        <span className="mx-1.5 text-gray-300">→</span>
                        <span className="font-medium text-gray-800">{log.plan_after_name || log.plan_after || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.changed_by_email || log.changed_by_id}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                        <span className="truncate block" title={log.reason}>{log.reason || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {log.valid_until ? format(new Date(log.valid_until), 'dd MMM yyyy', { locale: es }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            {t('admin.planAudit.count', { count: filtered.length })}
          </div>
        </div>
      )}
    </div>
  );
}
