import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { SkeletonBlock } from '@/components/ListStates';
import { IconMail, IconSend, IconFilter, IconChart, IconEye, IconMegaphone } from '@/components/Icons';
import CampaignRepescaV1 from './CampaignRepescaV1';
import CampaignWinbackV1 from './CampaignWinbackV1';
import CampaignBlogPlataformasV1 from './CampaignBlogPlataformasV1';
import CampaignMetrics from './CampaignMetrics';
import { toast } from '@/lib/toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const TEMPLATE_VARS = {
  welcome: { name: 'John Doe', ctaUrl: 'https://misautonomos.es' },
  gift_received: { name: 'John Doe', planName: 'Ads+', until: '2024-06-30', profileUrl: 'https://misautonomos.es/dashboard' },
  review_request: { clientName: 'John', professionalName: 'Jane', reviewUrl: 'https://misautonomos.es/valorar/123' },
  generic: { headline: 'Título', body: '<p>Contenido del email</p>', ctaText: 'Botón', ctaUrl: 'https://misautonomos.es' }
};

export default function AdminEmailsPanel() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    template: 'all',
    search: '',
    dateRange: '30'
  });
  const [testEmail, setTestEmail] = useState('');
  const [testTemplate, setTestTemplate] = useState('welcome');
  const [testSubject, setTestSubject] = useState(t('admin.emailsPanel.test.title'));
  const [testVars, setTestVars] = useState(JSON.stringify(TEMPLATE_VARS.welcome, null, 2));
  const [sending, setSending] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const getDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  const { data: logs, isLoading } = useQuery({
    queryKey: ['emailLogs', filters],
    queryFn: async () => {
      const query = {};
      if (filters.status !== 'all') query.status = filters.status;
      if (filters.category !== 'all') query.category = filters.category;
      if (filters.template !== 'all') query.template = filters.template;

      let result = await base44.asServiceRole.entities.EmailLog.filter(query, '-created_date', 100);
      
      if (filters.search) {
        result = result.filter(l => l.to_email.toLowerCase().includes(filters.search.toLowerCase()));
      }

      if (filters.dateRange !== 'all') {
        const cutoffDate = getDaysAgo(parseInt(filters.dateRange));
        result = result.filter(l => new Date(l.created_date) >= cutoffDate);
      }

      return result || [];
    }
  });

  const { data: metrics } = useQuery({
    queryKey: ['emailMetrics'],
    queryFn: async () => {
      const thirtyDaysAgo = getDaysAgo(30);
      const allLogs = await base44.asServiceRole.entities.EmailLog.filter({}, '-created_date', 1000);
      
      if (!allLogs) return { total: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };

      const recentLogs = allLogs.filter(l => new Date(l.created_date) >= thirtyDaysAgo);
      const sent = recentLogs.filter(l => ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam'].includes(l.status));
      const total = sent.length;
      const delivered = sent.filter(l => ['delivered', 'opened', 'clicked'].includes(l.status)).length;
      const opened = sent.filter(l => ['opened', 'clicked'].includes(l.status)).length;
      const clicked = sent.filter(l => l.status === 'clicked').length;
      const bounced = sent.filter(l => l.status === 'bounced').length;

      return {
        total,
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        bounceRate: total > 0 ? Math.round((bounced / total) * 100) : 0
      };
    }
  });

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error(t('admin.emailsPanel.test.emailRequired'));
      return;
    }

    setSending(true);
    try {
      let vars = {};
      try {
        vars = JSON.parse(testVars);
      } catch (e) {
        toast.error(t('admin.emailsPanel.test.invalidJson'));
        setSending(false);
        return;
      }

      await base44.functions.invoke('sendAndLog', {
        to: testEmail,
        subject: testSubject,
        template: testTemplate,
        vars,
        category: 'transactional'
      });
      
      toast.success(t('admin.emailsPanel.test.sent'));
      setShowTestModal(false);
      setTestEmail('');
      setTestSubject(t('admin.emailsPanel.test.title'));
      setTestTemplate('welcome');
      setTestVars(JSON.stringify(TEMPLATE_VARS.welcome, null, 2));
    } catch (error) {
      toast.error(t('admin.emailsPanel.test.error', { message: error.message }));
    } finally {
      setSending(false);
    }
  };

  const handleTemplateChange = (template) => {
    setTestTemplate(template);
    setTestVars(JSON.stringify(TEMPLATE_VARS[template], null, 2));
  };

  const getStatusColor = (status) => {
    const colors = {
      sent: 'bg-c-accent/10 text-c-accent',
      delivered: 'bg-success/10 text-success',
      opened: 'bg-success/10 text-success',
      clicked: 'bg-success/10 text-success',
      bounced: 'bg-error/10 text-error',
      spam: 'bg-error/10 text-error',
      failed: 'bg-error/10 text-error',
      queued: 'bg-warning/10 text-warning',
      skipped: 'bg-soft text-ink'
    };
    return colors[status] || 'bg-soft text-ink';
  };

  const getStatusLabel = (status) => {
    const labels = {
      queued: t('admin.emailsPanel.status.queued'),
      sent: t('admin.emailsPanel.status.sent'),
      delivered: t('admin.emailsPanel.status.delivered'),
      opened: t('admin.emailsPanel.status.opened'),
      clicked: t('admin.emailsPanel.status.clicked'),
      bounced: t('admin.emailsPanel.status.bounced'),
      spam: t('admin.emailsPanel.status.spam'),
      failed: t('admin.emailsPanel.status.failed'),
      skipped: t('admin.emailsPanel.status.skipped')
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">{t('admin.emailsPanel.title')}</h2>
        <button type="button" onClick={() => setShowTestModal(true)} className="btn-primary">
          <IconSend size={16} />
          {t('admin.emailsPanel.test.title')}
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-c-muted">{t('admin.emailsPanel.periods.last30d')}</p>
              <p className="text-2xl font-bold text-ink">{metrics?.total || 0}</p>
            </div>
            <IconMail size={32} className="text-c-accent" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-c-muted">{t('admin.emailsPanel.metrics.delivery')}</p>
              <p className="text-2xl font-bold text-success">{metrics?.deliveryRate || 0}%</p>
            </div>
            <IconChart size={32} className="text-success" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-c-muted">{t('admin.emailsPanel.metrics.open')}</p>
              <p className="text-2xl font-bold text-purple-600">{metrics?.openRate || 0}%</p>
            </div>
            <IconChart size={32} className="text-purple-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-c-muted">{t('admin.emailsPanel.metrics.clicks')}</p>
              <p className="text-2xl font-bold text-indigo-600">{metrics?.clickRate || 0}%</p>
            </div>
            <IconChart size={32} className="text-indigo-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-c-muted">{t('admin.emailsPanel.metrics.bounces')}</p>
              <p className="text-2xl font-bold text-error">{metrics?.bounceRate || 0}%</p>
            </div>
            <IconChart size={32} className="text-error" />
          </div>
        </div>
      </div>

      {/* ── CAMPAÑAS ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <IconMegaphone size={20} className="text-orange-500" />
          <h3 className="text-base font-bold text-ink">{t('admin.emailsPanel.campaignsTitle')}</h3>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CampaignRepescaV1 />
          <CampaignWinbackV1 />
          <CampaignBlogPlataformasV1 />
        </div>
      </div>

      {/* ── MÉTRICAS DE CAMPAÑAS ── */}
      <CampaignMetrics />

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <IconFilter size={16} className="text-c-muted" />
          <span className="font-semibold text-ink">{t('admin.emailsPanel.filters.title')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="input"
            placeholder={t('admin.emailsPanel.filters.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            aria-label={t('admin.emailsPanel.filters.searchPlaceholder')}
          />
          <select
            className="select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            aria-label={t('admin.emailsPanel.fields.status')}
          >
            <option value="all">{t('admin.emailsPanel.filters.allStatuses')}</option>
            <option value="sent">{t('admin.emailsPanel.filters.statusSent')}</option>
            <option value="delivered">{t('admin.emailsPanel.filters.statusDelivered')}</option>
            <option value="opened">{t('admin.emailsPanel.filters.statusOpened')}</option>
            <option value="bounced">{t('admin.emailsPanel.filters.statusBounced')}</option>
            <option value="failed">{t('admin.emailsPanel.filters.statusFailed')}</option>
          </select>
          <select
            className="select"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            aria-label={t('admin.emailsPanel.fields.category')}
          >
            <option value="all">{t('admin.emailsPanel.filters.allCategories')}</option>
            <option value="transactional">{t('admin.emailsPanel.category.transactional')}</option>
            <option value="marketing">{t('admin.emailsPanel.category.marketing')}</option>
          </select>
          <select
            className="select"
            value={filters.template}
            onChange={(e) => setFilters({ ...filters, template: e.target.value })}
            aria-label={t('admin.emailsPanel.fields.template')}
          >
            <option value="all">{t('admin.emailsPanel.filters.allTemplates')}</option>
            <option value="welcome">{t('admin.emailsPanel.templates.welcome')}</option>
            <option value="gift_received">{t('admin.emailsPanel.templates.giftReceived')}</option>
            <option value="review_request">{t('admin.emailsPanel.templates.reviewRequest')}</option>
            <option value="generic">{t('admin.emailsPanel.templates.generic')}</option>
          </select>
          <select
            className="select"
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            aria-label={t('admin.emailsPanel.fields.period')}
          >
            <option value="7">{t('admin.emailsPanel.periods.last7d')}</option>
            <option value="30">{t('admin.emailsPanel.periods.last30d')}</option>
            <option value="90">{t('admin.emailsPanel.periods.last90d')}</option>
            <option value="all">{t('admin.emailsPanel.periods.all')}</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-4">
        {isLoading ? (
          <div className="py-8" aria-busy="true" aria-label={t('common.loading')}>
            <SkeletonBlock lines={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-c-border">
                  <th className="text-left py-3 px-4 font-semibold text-ink">{t('admin.emailsPanel.fields.date')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">{t('emailField')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">{t('admin.emailsPanel.fields.subject')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">{t('admin.emailsPanel.fields.template')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">{t('admin.emailsPanel.fields.category')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">{t('admin.emailsPanel.fields.status')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">{t('admin.emailsPanel.fields.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-c-border hover:bg-soft">
                      <td className="py-3 px-4 text-c-muted text-xs">
                        {formatDistanceToNow(new Date(log.created_date), { locale: es, addSuffix: true })}
                      </td>
                      <td className="py-3 px-4 text-ink text-xs">{log.to_email}</td>
                      <td className="py-3 px-4 text-c-muted text-xs truncate max-w-xs">{log.subject}</td>
                      <td className="py-3 px-4 text-c-muted text-xs">{log.template}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          log.category === 'transactional' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {log.category === 'transactional' ? t('admin.emailsPanel.category.transactionalShort') : t('admin.emailsPanel.category.marketing')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(log.status)}`}>
                          {getStatusLabel(log.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailModal(true);
                          }}
                          className="text-c-accent hover:text-accent-hover text-xs font-medium flex items-center gap-1"
                        >
                          <IconEye size={12} />
                          {t('view')}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-c-muted">
                      {t('admin.emailsPanel.table.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Test Email */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title={t('admin.emailsPanel.test.title')}
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="test-email-to">{t('admin.emailsPanel.test.recipient')}</label>
            <input
              id="test-email-to"
              className="input"
              type="email"
              placeholder={t('admin.emailsPanel.test.recipientPlaceholder')}
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              disabled={sending}
            />
          </div>
          <div>
            <label className="label" htmlFor="test-email-subject">{t('admin.emailsPanel.fields.subject')}</label>
            <input
              id="test-email-subject"
              className="input"
              value={testSubject}
              onChange={(e) => setTestSubject(e.target.value)}
              disabled={sending}
            />
          </div>
          <div>
            <label className="label" htmlFor="test-email-template">{t('admin.emailsPanel.fields.template')}</label>
            <select
              id="test-email-template"
              className="select"
              value={testTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={sending}
            >
              <option value="welcome">{t('admin.emailsPanel.templates.welcome')}</option>
              <option value="gift_received">{t('admin.emailsPanel.templates.giftReceived')}</option>
              <option value="review_request">{t('admin.emailsPanel.templates.reviewRequest')}</option>
              <option value="generic">{t('admin.emailsPanel.templates.generic')}</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="test-email-vars">{t('admin.emailsPanel.test.variables')}</label>
            <textarea
              id="test-email-vars"
              className="textarea font-mono h-32"
              value={testVars}
              onChange={(e) => setTestVars(e.target.value)}
              disabled={sending}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={handleTestEmail} disabled={sending}>
              {sending ? t('admin.emailsPanel.test.sending') : t('admin.emailsPanel.test.send')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowTestModal(false)} disabled={sending}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal
        open={showDetailModal && !!selectedLog}
        onClose={() => setShowDetailModal(false)}
        size="lg"
        title={t('admin.emailsPanel.detail.title')}
      >
        <pre className="bg-soft p-4 rounded text-xs overflow-auto text-ink">
          {JSON.stringify(selectedLog, null, 2)}
        </pre>
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => setShowDetailModal(false)}>
          {t('common.close')}
        </button>
      </Modal>
    </div>
  );
}
