import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import {
  Mail, Download, Trash2, Users, TrendingUp, UserMinus,
  RefreshCw, Send, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const NAVY_SOFT = 'rgba(0,37,92,0.06)';

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const map = {
    confirmed: { label: t('admin.newsletter.status.confirmed'), bg: '#D1FAE5', color: '#065F46' },
    pending: { label: t('admin.newsletter.status.pending'), bg: '#FEF3C7', color: '#92400E' },
    unsubscribed: { label: t('admin.newsletter.status.unsubscribed'), bg: '#E5E7EB', color: '#374151' },
  };
  const m = map[status] || { label: status || '—', bg: '#E5E7EB', color: '#374151' };
  return (
    <span className="inline-flex text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: NAVY_SOFT, color: NAVY }}>
          <Icon className="w-4 h-4" />
        </span>
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900 tabular-nums">{(value || 0).toLocaleString('es-ES')}</p>
    </div>
  );
}

function Composer({ adminEmail, confirmedCount, onSent }) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => { setSubject(''); setHtml(''); setResult(null); };

  const invoke = async (body) => {
    const { data, error } = await supabase.functions.invoke('send-newsletter', { body });
    if (error) throw error;
    return data || { sent: 0, failed: 0, total: 0 };
  };

  const sendTest = async () => {
    if (!subject.trim()) { toast.error(t('admin.newsletter.composer.missingSubject')); return; }
    if (!html.trim()) { toast.error(t('admin.newsletter.composer.missingBody')); return; }
    if (!adminEmail) { toast.error(t('admin.newsletter.composer.noAdminEmail')); return; }
    setSendingTest(true); setResult(null);
    try {
      const data = await invoke({ subject, html, test_email: adminEmail });
      setResult({ kind: 'test', ...data });
      toast.success(t('admin.newsletter.composer.testSent', { email: adminEmail }));
    } catch (err) {
      toast.error(t('admin.newsletter.composer.testError', { message: err?.message || '' }));
    } finally { setSendingTest(false); }
  };

  const sendAll = async () => {
    if (!confirmAll) { setConfirmAll(true); return; }
    if (!subject.trim()) { toast.error(t('admin.newsletter.composer.missingSubject')); return; }
    if (!html.trim()) { toast.error(t('admin.newsletter.composer.missingBody')); return; }
    setSendingAll(true); setResult(null);
    try {
      const data = await invoke({ subject, html });
      setResult({ kind: 'broadcast', ...data });
      toast.success(t('admin.newsletter.composer.broadcastDone', { sent: data.sent, total: data.total }));
      onSent?.();
      setConfirmAll(false);
    } catch (err) {
      toast.error(t('admin.newsletter.composer.sendError', { message: err?.message || '' }));
    } finally { setSendingAll(false); }
  };

  const busy = sendingTest || sendingAll;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">{t('admin.newsletter.composer.title')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          <Trans
            i18nKey="admin.newsletter.composer.subtitle"
            components={[<code key="fn" className="font-mono text-[11px]" />]}
          />
        </p>
      </div>
      <div className="p-5 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.newsletter.composer.subjectLabel')}</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('admin.newsletter.composer.subjectPlaceholder')}
            className="mt-1.5 w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.newsletter.composer.bodyLabel')}</span>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
            placeholder={t('admin.newsletter.composer.bodyPlaceholder')}
            className="mt-1.5 w-full px-3 py-2 text-[13px] font-mono border border-slate-200 rounded-lg resize-y focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            <Trans
              i18nKey="admin.newsletter.composer.unsubscribeHint"
              components={[<code key="path" className="font-mono" />]}
            />
          </p>
        </label>

        {result && (
          <div className="rounded-lg border p-3 flex items-start gap-2 text-sm"
               style={{
                 borderColor: result.failed > 0 ? '#FECACA' : '#A7F3D0',
                 background: result.failed > 0 ? '#FEF2F2' : '#F0FDF4',
                 color: result.failed > 0 ? '#991B1B' : '#065F46',
               }}>
            {result.failed > 0 ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <div>
              <p className="font-semibold">
                {result.kind === 'test' ? t('admin.newsletter.composer.testResultTitle') : t('admin.newsletter.composer.broadcastResultTitle')}
              </p>
              <p className="text-xs mt-0.5">
                {t('admin.newsletter.composer.resultSummary', {
                  sent: result.sent.toLocaleString('es-ES'),
                  failed: result.failed.toLocaleString('es-ES'),
                  total: result.total.toLocaleString('es-ES'),
                })}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={sendTest}
            disabled={busy}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {t('admin.newsletter.composer.sendTest', { email: adminEmail || '—' })}
          </button>

          <button
            type="button"
            onClick={sendAll}
            disabled={busy}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: confirmAll ? '#B91C1C' : NAVY }}
          >
            {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {confirmAll
              ? t('admin.newsletter.composer.confirmSend', { recipients: confirmedCount.toLocaleString('es-ES') })
              : t('admin.newsletter.composer.sendAll')}
          </button>

          {confirmAll && !sendingAll && (
            <button type="button" onClick={() => setConfirmAll(false)} className="text-xs text-slate-500 hover:text-slate-800 underline">
              {t('common.cancel')}
            </button>
          )}

          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="ml-auto text-xs text-slate-500 hover:text-slate-800 underline disabled:opacity-50"
          >
            {t('admin.newsletter.composer.clear')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminNewsletter() {
  const { t } = useTranslation();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [admin, setAdmin] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [me, all] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.NewsletterSubscriber.list('-created_date', 5000),
      ]);
      setAdmin(me);
      setSubs(Array.isArray(all) ? all : []);
    } catch (err) {
      toast.error(t('admin.newsletter.loadError', { message: err?.message || '' }));
    } finally {
      setLoading(false);
    }
  };

  const deleteSub = async (id) => {
    if (!confirm(t('admin.newsletter.deleteConfirm'))) return;
    try {
      await base44.entities.NewsletterSubscriber.delete(id);
      setSubs((prev) => prev.filter((s) => s.id !== id));
      toast.success(t('admin.newsletter.deleted'));
    } catch (err) { toast.error(t('admin.newsletter.errorWithMessage', { message: err?.message || '' })); }
  };

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (search) {
        const needle = search.toLowerCase();
        if (!s.email?.toLowerCase().includes(needle) && !(s.name || '').toLowerCase().includes(needle)) return false;
      }
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (langFilter !== 'all' && s.language !== langFilter) return false;
      if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
      return true;
    });
  }, [subs, search, statusFilter, langFilter, sourceFilter]);

  const confirmed = subs.filter((s) => s.status === 'confirmed');
  const unsub = subs.filter((s) => s.status === 'unsubscribed');
  const thisMonth = subs.filter((s) => {
    if (!s.created_date) return false;
    const d = new Date(s.created_date); const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const sources = useMemo(() => [...new Set(subs.map((s) => s.source).filter(Boolean))], [subs]);
  const langs = useMemo(() => [...new Set(subs.map((s) => s.language).filter(Boolean))], [subs]);

  const exportCSV = () => {
    const rows = [[
      t('auth.email'), t('auth.name'), t('admin.newsletter.csv.interest'), t('admin.newsletter.table.language'),
      t('admin.newsletter.csv.source'), t('admin.newsletter.table.signup'), t('admin.newsletter.table.status'),
      t('admin.newsletter.table.sent'), t('admin.newsletter.csv.lastSent'),
    ]];
    filtered.forEach((s) => rows.push([
      s.email, s.name || '', s.user_type_interest || '', s.language || '',
      s.source || '', s.created_date ? new Date(s.created_date).toLocaleDateString('es-ES') : '',
      s.status, s.emails_sent ?? 0, s.last_sent_at ? new Date(s.last_sent_at).toLocaleDateString('es-ES') : '',
    ]));
    const csv = rows.map((r) => r.map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `newsletter_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEOHead title={t('admin.newsletter.pageTitle')} noindex />
      <main className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-end justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900" style={{ letterSpacing: '-0.02em' }}>{t('admin.newsletter.title')}</h1>
              <p className="text-sm text-slate-500 mt-1">{t('admin.newsletter.subtitle')}</p>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {t('admin.newsletter.refresh')}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard label={t('admin.newsletter.metrics.active')} value={confirmed.length} icon={Users} />
            <MetricCard label={t('admin.newsletter.metrics.thisMonth')} value={thisMonth.length} icon={TrendingUp} />
            <MetricCard label={t('admin.newsletter.metrics.unsubscribed')} value={unsub.length} icon={UserMinus} />
            <MetricCard label={t('admin.newsletter.metrics.total')} value={subs.length} icon={Mail} />
          </div>

          <Composer adminEmail={admin?.email} confirmedCount={confirmed.length} onSent={load} />

          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 mt-10 mb-3">{t('admin.newsletter.subscribersHeading')}</h2>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder={t('admin.newsletter.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[180px] h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="all">{t('admin.newsletter.filters.allStatuses')}</option>
                <option value="confirmed">{t('admin.newsletter.filters.active')}</option>
                <option value="pending">{t('admin.newsletter.filters.pending')}</option>
                <option value="unsubscribed">{t('admin.newsletter.filters.unsubscribed')}</option>
              </select>
              <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="all">{t('admin.newsletter.filters.allLanguages')}</option>
                {langs.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="all">{t('admin.newsletter.filters.allSources')}</option>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={exportCSV}
                className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 text-sm font-semibold text-white rounded-lg"
                style={{ background: NAVY }}
              >
                <Download className="w-4 h-4" /> {t('admin.newsletter.exportCsv')}
              </button>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-sm">{t('admin.newsletter.loading')}</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">{t('admin.newsletter.emptyState')}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{t('auth.email')}</th>
                      <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{t('auth.name')}</th>
                      <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.newsletter.table.language')}</th>
                      <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.newsletter.table.source')}</th>
                      <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.newsletter.table.signup')}</th>
                      <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.newsletter.table.status')}</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.newsletter.table.sent')}</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{t('admin.newsletter.table.last')}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-slate-900 font-mono text-[12px]">{s.email}</td>
                        <td className="px-3 py-2 text-slate-700">{s.name || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-xs uppercase text-slate-500">{s.language || '—'}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{s.source || '—'}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{s.created_date ? new Date(s.created_date).toLocaleDateString('es-ES') : '—'}</td>
                        <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{s.emails_sent ?? 0}</td>
                        <td className="px-3 py-2 text-right text-xs text-slate-500">{s.last_sent_at ? new Date(s.last_sent_at).toLocaleDateString('es-ES') : '—'}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => deleteSub(s.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
              {t('admin.newsletter.footerCount', {
                shown: filtered.length.toLocaleString('es-ES'),
                total: subs.length.toLocaleString('es-ES'),
              })}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
