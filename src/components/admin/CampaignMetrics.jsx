import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { SkeletonBlock } from '@/components/ListStates';
import {
  IconRefresh, IconDownload, IconMail, IconCheckCircle, IconEye, IconPointer,
  IconWarning, IconShieldPlain, IconSpinner, IconChart
} from '@/components/Icons';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_COLORS = {
  sent:      'bg-soft text-ink',
  delivered: 'bg-c-accent/10 text-c-accent',
  opened:    'bg-success/10 text-success',
  clicked:   'bg-purple-100 text-purple-700',
  bounced:   'bg-error/10 text-error',
  spam:      'bg-error/10 text-error',
  failed:    'bg-error/10 text-error',
  queued:    'bg-warning/10 text-warning',
  skipped:   'bg-soft text-c-muted',
};

function fmtDate(dt) {
  if (!dt) return '—';
  try { return format(new Date(dt), 'dd MMM HH:mm', { locale: es }); } catch { return '—'; }
}

function pct(num, denom) {
  if (!denom) return '—';
  return Math.round((num / denom) * 100) + '%';
}

export default function CampaignMetrics() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [backfilling, setBackfilling] = useState(false);
  const [showBackfillConfirm, setShowBackfillConfirm] = useState(false);

  const statusLabels = {
    sent: t('admin.campaigns.metrics.status.sent'),
    delivered: t('admin.campaigns.metrics.status.delivered'),
    opened: t('admin.campaigns.metrics.status.opened'),
    clicked: t('admin.campaigns.metrics.status.clicked'),
    bounced: t('admin.campaigns.metrics.status.bounced'),
    spam: t('admin.campaigns.metrics.status.spam'),
    failed: t('admin.campaigns.metrics.status.failed'),
    queued: t('admin.campaigns.metrics.status.queued'),
    skipped: t('admin.campaigns.metrics.status.skipped'),
  };

  // Cargar todos los EmailLog válidos (con resend_message_id, excluir queued puros)
  const { data: allLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['campaignMetrics'],
    queryFn: async () => {
      // Traer en lotes de hasta 1000
      const logs = await base44.asServiceRole.entities.EmailLog.filter({}, '-created_date', 1000);
      // Excluir queued sin resend_message_id (duplicados del bug antiguo)
      return (logs || []).filter(l => !(l.status === 'queued' && !l.resend_message_id));
    },
    staleTime: 60000
  });

  // Extraer campaign_ids distintos
  const campaignIds = useMemo(() => {
    const ids = new Set();
    allLogs.forEach(l => { if (l.campaign_id) ids.add(l.campaign_id); });
    return Array.from(ids).sort();
  }, [allLogs]);

  // Filtrar según selección
  const filteredLogs = useMemo(() => {
    if (selectedCampaign === 'all') return allLogs;
    if (selectedCampaign === 'transactional') return allLogs.filter(l => !l.campaign_id);
    return allLogs.filter(l => l.campaign_id === selectedCampaign);
  }, [allLogs, selectedCampaign]);

  // KPIs
  const kpis = useMemo(() => {
    const sentStatuses = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam'];
    const sent = filteredLogs.filter(l => sentStatuses.includes(l.status));
    const total = sent.length;
    const delivered = sent.filter(l => ['delivered', 'opened', 'clicked'].includes(l.status)).length;
    const opened = sent.filter(l => l.opened_at).length;
    const clicked = sent.filter(l => l.clicked_at).length;
    const bounced = sent.filter(l => l.status === 'bounced').length;
    const spam = sent.filter(l => l.status === 'spam').length;
    return { total, delivered, opened, clicked, bounced, spam };
  }, [filteredLogs]);

  // Tabla: solo logs enviados reales
  const tableRows = useMemo(() => {
    const sentStatuses = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam', 'failed'];
    return filteredLogs.filter(l => sentStatuses.includes(l.status));
  }, [filteredLogs]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['campaignMetrics'] });
    refetch();
    toast.success(t('admin.campaigns.metrics.refreshed'));
  };

  const handleExportCSV = () => {
    const headers = [
      t('emailField'),
      t('admin.campaigns.shared.table.status'),
      t('admin.campaigns.metrics.table.sentAt'),
      t('admin.campaigns.metrics.table.deliveredAt'),
      t('admin.campaigns.metrics.table.openedAt'),
      t('admin.campaigns.metrics.table.clickedAt'),
      t('admin.campaigns.metrics.table.campaign'),
      t('admin.campaigns.metrics.table.resendId'),
    ];
    const rows = tableRows.map(l => [
      l.to_email,
      l.status,
      fmtDate(l.sent_at),
      fmtDate(l.delivered_at),
      fmtDate(l.opened_at),
      fmtDate(l.clicked_at),
      l.campaign_id || '',
      l.resend_message_id || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emails_${selectedCampaign}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackfill = async () => {
    setShowBackfillConfirm(false);
    setBackfilling(true);
    try {
      const res = await base44.functions.invoke('backfillEmailStatusFromResend', {});
      const data = res?.data || res;
      toast.success(t('admin.campaigns.metrics.backfillDone', { updated: data.updated, failed: data.failed }));
      handleRefresh();
    } catch (e) {
      toast.error(t('admin.campaigns.metrics.backfillError', { message: e.message }));
    } finally {
      setBackfilling(false);
    }
  };

  const KPICard = ({ label, value, sub, icon: Icon, color }) => (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-c-muted mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color || 'text-ink'}`}>{value}</p>
          {sub && <p className="text-xs text-c-muted mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon size={28} className={`opacity-30 ${color || 'text-c-muted'}`} />}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header + controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <IconChart size={20} className="text-c-accent flex-shrink-0" />
          <h3 className="font-bold text-ink">{t('admin.campaigns.metrics.title')}</h3>
        </div>

        <select
          className="select w-52"
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          aria-label={t('admin.campaigns.metrics.selectCampaign')}
        >
          <option value="all">{t('admin.campaigns.metrics.allCampaigns')}</option>
          <option value="transactional">{t('admin.campaigns.metrics.transactionalOnly')}</option>
          {campaignIds.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>

        <button type="button" className="btn-secondary btn-sm gap-1.5" onClick={handleRefresh}>
          <IconRefresh size={14} />
          {t('admin.campaigns.metrics.refresh')}
        </button>

        <button type="button" className="btn-secondary btn-sm gap-1.5" onClick={handleExportCSV} disabled={!tableRows.length}>
          <IconDownload size={14} />
          {t('admin.campaigns.metrics.exportCsv')}
        </button>

        <button
          type="button"
          onClick={() => setShowBackfillConfirm(true)}
          disabled={backfilling}
          className="btn-secondary btn-sm gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          {backfilling ? <IconSpinner size={14} /> : <IconRefresh size={14} />}
          {backfilling ? t('admin.campaigns.metrics.syncing') : t('admin.campaigns.metrics.backfill')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label={t('admin.campaigns.metrics.kpi.totalSent')} value={kpis.total} icon={IconMail} color="text-ink" />
        <KPICard
          label={t('admin.campaigns.metrics.kpi.delivered')}
          value={kpis.delivered}
          sub={pct(kpis.delivered, kpis.total)}
          icon={IconCheckCircle}
          color="text-c-accent"
        />
        <KPICard
          label={t('admin.campaigns.metrics.kpi.opened')}
          value={kpis.opened}
          sub={t('admin.campaigns.metrics.kpi.ofDelivered', { pct: pct(kpis.opened, kpis.delivered) })}
          icon={IconEye}
          color="text-success"
        />
        <KPICard
          label={t('admin.campaigns.metrics.kpi.clicks')}
          value={kpis.clicked}
          sub={t('admin.campaigns.metrics.kpi.ofOpened', { pct: pct(kpis.clicked, kpis.opened) })}
          icon={IconPointer}
          color="text-purple-600"
        />
        <KPICard
          label={t('admin.campaigns.metrics.kpi.bouncesSpam')}
          value={`${kpis.bounced} / ${kpis.spam}`}
          sub={pct(kpis.bounced + kpis.spam, kpis.total)}
          icon={IconWarning}
          color="text-error"
        />
      </div>

      {/* Tasas adicionales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-c-muted">{t('admin.campaigns.metrics.rates.delivery')}</p>
          <p className="text-xl font-bold text-c-accent">{pct(kpis.delivered, kpis.total)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-c-muted">{t('admin.campaigns.metrics.rates.open')}</p>
          <p className="text-xl font-bold text-success">{pct(kpis.opened, kpis.delivered)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-c-muted">{t('admin.campaigns.metrics.rates.click')}</p>
          <p className="text-xl font-bold text-purple-600">{pct(kpis.clicked, kpis.delivered)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-c-muted">{t('admin.campaigns.metrics.rates.ctr')}</p>
          <p className="text-xl font-bold text-indigo-600">{pct(kpis.clicked, kpis.opened)}</p>
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="card">
        {isLoading ? (
          <div className="py-12 px-4" aria-busy="true" aria-label={t('common.loading')}>
            <SkeletonBlock lines={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-soft border-b border-c-border">
                <tr>
                  <th className="text-left py-3 px-3 font-semibold text-c-muted">{t('emailField')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-c-muted">{t('admin.campaigns.shared.table.status')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-c-muted">{t('admin.campaigns.metrics.table.sentAt')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-c-muted">{t('admin.campaigns.metrics.table.deliveredAt')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-c-muted">{t('admin.campaigns.metrics.table.openedAt')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-c-muted">{t('admin.campaigns.metrics.table.clickedAt')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-c-muted">{t('admin.campaigns.metrics.table.resendId')}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-c-muted">
                      {t('admin.campaigns.metrics.empty')}
                    </td>
                  </tr>
                ) : (
                  tableRows.map(log => (
                    <tr key={log.id} className="border-b border-c-border hover:bg-soft">
                      <td className="py-2.5 px-3 text-ink font-medium">{log.to_email}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[log.status] || 'bg-soft text-ink'}`}>
                          {statusLabels[log.status] || log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-c-muted">{fmtDate(log.sent_at || log.created_date)}</td>
                      <td className="py-2.5 px-3 text-c-muted">{fmtDate(log.delivered_at)}</td>
                      <td className="py-2.5 px-3 text-c-muted">{fmtDate(log.opened_at)}</td>
                      <td className="py-2.5 px-3 text-c-muted">{fmtDate(log.clicked_at)}</td>
                      <td className="py-2.5 px-3 text-c-muted font-mono truncate max-w-[120px]">
                        {log.resend_message_id ? log.resend_message_id.slice(0, 12) + '…' : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal confirmación backfill */}
      <Modal
        open={showBackfillConfirm}
        onClose={() => setShowBackfillConfirm(false)}
        dismissible={false}
        title={
          <span className="flex items-center gap-3">
            <IconShieldPlain size={24} className="text-orange-500" />
            {t('admin.campaigns.metrics.backfillConfirm.title')}
          </span>
        }
      >
        <p className="text-sm text-c-muted mb-5">
          {t('admin.campaigns.metrics.backfillConfirm.body')}
        </p>
        <div className="flex gap-3">
          <button type="button" className="btn-primary flex-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleBackfill}>
            {t('admin.campaigns.metrics.backfillConfirm.confirm')}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={() => setShowBackfillConfirm(false)}>
            {t('common.cancel')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
