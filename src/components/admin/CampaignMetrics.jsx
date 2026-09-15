import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RefreshCw, Download, Mail, CheckCircle, Eye, MousePointer,
  AlertTriangle, Shield, Loader2, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_COLORS = {
  sent:      'bg-gray-100 text-gray-700',
  delivered: 'bg-blue-100 text-blue-700',
  opened:    'bg-green-100 text-green-700',
  clicked:   'bg-purple-100 text-purple-700',
  bounced:   'bg-red-100 text-red-700',
  spam:      'bg-red-100 text-red-700',
  failed:    'bg-red-100 text-red-700',
  queued:    'bg-yellow-100 text-yellow-700',
  skipped:   'bg-gray-100 text-gray-500',
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
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon className={`w-7 h-7 opacity-30 ${color || 'text-gray-400'}`} />}
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* Header + controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h3 className="font-bold text-gray-900">{t('admin.campaigns.metrics.title')}</h3>
        </div>

        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t('admin.campaigns.metrics.selectCampaign')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.campaigns.metrics.allCampaigns')}</SelectItem>
            <SelectItem value="transactional">{t('admin.campaigns.metrics.transactionalOnly')}</SelectItem>
            {campaignIds.map(id => (
              <SelectItem key={id} value={id}>{id}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          {t('admin.campaigns.metrics.refresh')}
        </Button>

        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!tableRows.length} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          {t('admin.campaigns.metrics.exportCsv')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBackfillConfirm(true)}
          disabled={backfilling}
          className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          {backfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {backfilling ? t('admin.campaigns.metrics.syncing') : t('admin.campaigns.metrics.backfill')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label={t('admin.campaigns.metrics.kpi.totalSent')} value={kpis.total} icon={Mail} color="text-gray-900" />
        <KPICard
          label={t('admin.campaigns.metrics.kpi.delivered')}
          value={kpis.delivered}
          sub={pct(kpis.delivered, kpis.total)}
          icon={CheckCircle}
          color="text-blue-600"
        />
        <KPICard
          label={t('admin.campaigns.metrics.kpi.opened')}
          value={kpis.opened}
          sub={t('admin.campaigns.metrics.kpi.ofDelivered', { pct: pct(kpis.opened, kpis.delivered) })}
          icon={Eye}
          color="text-green-600"
        />
        <KPICard
          label={t('admin.campaigns.metrics.kpi.clicks')}
          value={kpis.clicked}
          sub={t('admin.campaigns.metrics.kpi.ofOpened', { pct: pct(kpis.clicked, kpis.opened) })}
          icon={MousePointer}
          color="text-purple-600"
        />
        <KPICard
          label={t('admin.campaigns.metrics.kpi.bouncesSpam')}
          value={`${kpis.bounced} / ${kpis.spam}`}
          sub={pct(kpis.bounced + kpis.spam, kpis.total)}
          icon={AlertTriangle}
          color="text-red-600"
        />
      </div>

      {/* Tasas adicionales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-gray-500">{t('admin.campaigns.metrics.rates.delivery')}</p>
          <p className="text-xl font-bold text-blue-600">{pct(kpis.delivered, kpis.total)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-gray-500">{t('admin.campaigns.metrics.rates.open')}</p>
          <p className="text-xl font-bold text-green-600">{pct(kpis.opened, kpis.delivered)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-gray-500">{t('admin.campaigns.metrics.rates.click')}</p>
          <p className="text-xl font-bold text-purple-600">{pct(kpis.clicked, kpis.delivered)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-gray-500">{t('admin.campaigns.metrics.rates.ctr')}</p>
          <p className="text-xl font-bold text-indigo-600">{pct(kpis.clicked, kpis.opened)}</p>
        </Card>
      </div>

      {/* Tabla detalle */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('common.loading')}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">{t('emailField')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">{t('admin.campaigns.shared.table.status')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">{t('admin.campaigns.metrics.table.sentAt')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">{t('admin.campaigns.metrics.table.deliveredAt')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">{t('admin.campaigns.metrics.table.openedAt')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">{t('admin.campaigns.metrics.table.clickedAt')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">{t('admin.campaigns.metrics.table.resendId')}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      {t('admin.campaigns.metrics.empty')}
                    </td>
                  </tr>
                ) : (
                  tableRows.map(log => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-gray-800 font-medium">{log.to_email}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[log.status] || log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">{fmtDate(log.sent_at || log.created_date)}</td>
                      <td className="py-2.5 px-3 text-gray-500">{fmtDate(log.delivered_at)}</td>
                      <td className="py-2.5 px-3 text-gray-500">{fmtDate(log.opened_at)}</td>
                      <td className="py-2.5 px-3 text-gray-500">{fmtDate(log.clicked_at)}</td>
                      <td className="py-2.5 px-3 text-gray-400 font-mono truncate max-w-[120px]">
                        {log.resend_message_id ? log.resend_message_id.slice(0, 12) + '…' : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal confirmación backfill */}
      {showBackfillConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-orange-500" />
              <h3 className="font-bold text-gray-900">{t('admin.campaigns.metrics.backfillConfirm.title')}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {t('admin.campaigns.metrics.backfillConfirm.body')}
            </p>
            <div className="flex gap-3">
              <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleBackfill}>
                {t('admin.campaigns.metrics.backfillConfirm.confirm')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowBackfillConfirm(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
