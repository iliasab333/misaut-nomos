import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, Send, Paperclip, Loader2, Save, Upload, ExternalLink, CheckCircle, AlertCircle, Image } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PLATFORM_LABELS = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok',
  google_search: 'Google Search', linkedin: 'LinkedIn',
};

function formatMonthYear(monthNames, my) {
  if (!my) return '—';
  const [year, month] = my.split('-');
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export default function CampaignManageModal({ briefing, users = [], onClose, onUpdated }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('briefing');
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setAdminUser(u));
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const tabs = [
    { id: 'briefing', label: t('admin.campaigns.manage.tabs.briefing') },
    { id: 'material', label: t('admin.campaigns.manage.tabs.material') },
    { id: 'chat', label: t('admin.campaigns.manage.tabs.chat') },
    { id: 'metrics', label: t('admin.campaigns.manage.tabs.metrics') },
    { id: 'notes', label: t('admin.campaigns.manage.tabs.notes') },
  ];

  const monthNames = [
    t('admin.campaigns.manage.months.january'),
    t('admin.campaigns.manage.months.february'),
    t('admin.campaigns.manage.months.march'),
    t('admin.campaigns.manage.months.april'),
    t('admin.campaigns.manage.months.may'),
    t('admin.campaigns.manage.months.june'),
    t('admin.campaigns.manage.months.july'),
    t('admin.campaigns.manage.months.august'),
    t('admin.campaigns.manage.months.september'),
    t('admin.campaigns.manage.months.october'),
    t('admin.campaigns.manage.months.november'),
    t('admin.campaigns.manage.months.december'),
  ];

  const professional = users.find(u => u.id === briefing.professional_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">
              {t('admin.campaigns.manage.header.title', {
                monthYear: formatMonthYear(monthNames, briefing.month_year),
                name: briefing.professional_name || professional?.full_name || '?',
              })}
            </h2>
            <p className="text-blue-200 text-xs mt-0.5">{professional?.email || briefing.professional_id}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 flex overflow-x-auto flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'briefing' && (
            <BriefingTab briefing={briefing} professional={professional} onGoToChat={() => setActiveTab('chat')} />
          )}
          {activeTab === 'material' && (
            <MaterialTab briefing={briefing} professional={professional} onUpdated={onUpdated} />
          )}
          {activeTab === 'chat' && adminUser && (
            <ChatTab briefing={briefing} professional={professional} adminUser={adminUser} />
          )}
          {activeTab === 'metrics' && (
            <MetricsTab briefing={briefing} onUpdated={onUpdated} />
          )}
          {activeTab === 'notes' && (
            <NotesTab briefing={briefing} onUpdated={onUpdated} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PESTAÑA 1: Briefing del cliente ───────────────────────────────────────
function BriefingTab({ briefing, professional, onGoToChat }) {
  const { t } = useTranslation();
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const goalLabels = {
    more_calls: t('admin.campaigns.manage.goals.moreCalls'),
    more_leads: t('admin.campaigns.manage.goals.moreLeads'),
    brand_awareness: t('admin.campaigns.manage.goals.brandAwareness'),
    website_traffic: t('admin.campaigns.manage.goals.websiteTraffic'),
    more_quotes: t('admin.campaigns.manage.goals.moreQuotes'),
  };

  const sourceLabels = {
    boca_a_boca: t('admin.campaigns.manage.sources.wordOfMouth'),
    redes_sociales: t('socialNetworks'),
    google: 'Google',
    anuncios: t('admin.campaigns.manage.sources.paidAds'),
    otros: t('admin.campaigns.manage.sources.other'),
  };

  return (
    <div className="p-6 space-y-6">
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt={t('admin.campaigns.manage.briefing.previewAlt')} className="max-w-[90vw] max-h-[90vh] rounded-xl" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoBlock label={t('admin.campaigns.manage.briefing.platform')} value={PLATFORM_LABELS[briefing.platform] || briefing.platform} />
        <InfoBlock label={t('admin.campaigns.manage.briefing.goal')} value={goalLabels[briefing.goal] || briefing.goal} />
        <InfoBlock label={t('admin.campaigns.manage.briefing.serviceArea')} value={briefing.service_area} />
        <InfoBlock label={t('admin.campaigns.manage.briefing.specialOffer')} value={briefing.special_offer} />
      </div>

      {briefing.top_services?.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">{t('admin.campaigns.manage.briefing.topServices')}</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {briefing.top_services.map((s, i) => (
              <span key={i} className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}

      <InfoBlock label={t('admin.campaigns.manage.briefing.clientProfile')} value={briefing.client_profile} multiline />
      <InfoBlock label={t('admin.campaigns.manage.briefing.testimonials')} value={briefing.best_testimonials} multiline />
      <InfoBlock label={t('admin.campaigns.manage.briefing.additionalNotes')} value={briefing.additional_notes} multiline />

      {briefing.client_sources_now?.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">{t('admin.campaigns.manage.briefing.clientSources')}</label>
          <p className="text-sm text-gray-700 mt-1">{briefing.client_sources_now.map(s => sourceLabels[s] || s).join(', ')}</p>
        </div>
      )}

      {briefing.images_provided?.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">{t('admin.campaigns.manage.briefing.imagesProvided')}</label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {briefing.images_provided.map((url, i) => (
              <div key={i} className="relative group cursor-pointer" onClick={() => setLightboxUrl(url)}>
                <img src={url} alt={`img-${i}`} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                  <Image className="w-5 h-5 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {briefing.video_url && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">{t('admin.campaigns.manage.briefing.video')}</label>
          {briefing.video_url.includes('youtube') || briefing.video_url.includes('youtu.be') || briefing.video_url.includes('vimeo') ? (
            <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
              <iframe
                src={briefing.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <a href={briefing.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 text-sm hover:underline">
              <ExternalLink className="w-4 h-4" /> {briefing.video_url}
            </a>
          )}
        </div>
      )}

      <button
        onClick={onGoToChat}
        className="mt-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors"
      >
        {t('admin.campaigns.manage.briefing.askMoreInfo')}
      </button>
    </div>
  );
}

// ─── PESTAÑA 2: Material de campaña ─────────────────────────────────────────
function MaterialTab({ briefing, professional, onUpdated }) {
  const { t } = useTranslation();
  const [adsCopy, setAdsCopy] = useState(briefing.ads_copy || '');
  const [creativeUrls, setCreativeUrls] = useState(briefing.ads_creative_urls || []);
  const [budgetTier, setBudgetTier] = useState(briefing.budget_tier || 'standard');
  const [startDate, setStartDate] = useState(briefing.start_date || '');
  const [endDate, setEndDate] = useState(briefing.end_date || '');
  const [campaignIdExternal, setCampaignIdExternal] = useState(briefing.campaign_id_external || '');
  const [saving, setSaving] = useState(false);
  const [sendingToClient, setSendingToClient] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImage(true);
    try {
      const urls = await Promise.all(files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return file_url;
      }));
      setCreativeUrls(prev => [...prev, ...urls]);
      toast.success(t('admin.campaigns.manage.material.imagesUploaded', { n: urls.length }));
    } catch {
      toast.error(t('admin.campaigns.manage.material.uploadError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.AdsBriefing.update(briefing.id, {
        ads_copy: adsCopy,
        ads_creative_urls: creativeUrls,
        budget_tier: budgetTier,
        start_date: startDate || null,
        end_date: endDate || null,
        campaign_id_external: campaignIdExternal,
        admin_updated_at: new Date().toISOString(),
      });
      onUpdated(updated);
      toast.success(t('admin.campaigns.manage.material.saved'));
    } catch {
      toast.error(t('admin.campaigns.manage.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async () => {
    if (!adsCopy && creativeUrls.length === 0) {
      toast.error(t('admin.campaigns.manage.material.copyOrImagesRequired'));
      return;
    }
    setSendingToClient(true);
    try {
      // 1. Actualizar estado
      const updated = await base44.entities.AdsBriefing.update(briefing.id, {
        ads_copy: adsCopy,
        ads_creative_urls: creativeUrls,
        budget_tier: budgetTier,
        start_date: startDate || null,
        end_date: endDate || null,
        campaign_id_external: campaignIdExternal,
        status: 'approved',
        campaign_status: 'in_review',
        admin_updated_at: new Date().toISOString(),
      });

      // 2. Email al profesional
      await base44.functions.invoke('sendCampaignEmail', {
        type: 'material_ready_for_approval',
        data: {
          professionalEmail: professional?.email,
          professionalName: briefing.professional_name || professional?.full_name,
          monthYear: briefing.month_year,
          adsCopy,
          creativeUrls,
        }
      });

      // 3. Mensaje en el chat
      const adminUser = await base44.auth.me();
      await base44.entities.Message.create({
        conversation_id: `briefing_${briefing.id}`,
        sender_id: adminUser.id,
        recipient_id: briefing.professional_id,
        content: `${t('admin.campaigns.manage.material.materialReadyMessage')}\n\n${adsCopy ? t('admin.campaigns.manage.material.copyPreview', { copy: adsCopy.substring(0, 150) }) : ''}`,
        professional_name: t('admin.campaigns.manage.teamName'),
        client_name: briefing.professional_name || professional?.full_name,
      });

      onUpdated(updated);
      toast.success(t('admin.campaigns.manage.material.sentToClient'));
    } catch (err) {
      toast.error(t('admin.campaigns.manage.sendError', { message: err.message }));
    } finally {
      setSendingToClient(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Copy */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">{t('admin.campaigns.manage.material.adCopy')}</label>
        <textarea
          value={adsCopy}
          onChange={e => setAdsCopy(e.target.value)}
          rows={6}
          placeholder={t('admin.campaigns.manage.material.adCopyPlaceholder')}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Creatividades */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">{t('admin.campaigns.manage.material.creatives')}</label>
        {creativeUrls.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
            {creativeUrls.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`creative-${i}`} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                <button
                  onClick={() => setCreativeUrls(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >×</button>
              </div>
            ))}
          </div>
        )}
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUploadImages} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors w-full justify-center"
        >
          {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploadingImage ? t('admin.campaigns.manage.material.uploading') : t('admin.campaigns.manage.material.uploadImages')}
        </button>
      </div>

      {/* Presupuesto y fechas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">{t('admin.campaigns.manage.material.budget')}</label>
          <select value={budgetTier} onChange={e => setBudgetTier(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="standard">{t('admin.campaigns.manage.material.budgetStandard')}</option>
            <option value="boosted">{t('admin.campaigns.manage.material.budgetBoosted')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">{t('admin.campaigns.manage.material.startDate')}</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">{t('admin.campaigns.manage.material.endDate')}</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">{t('admin.campaigns.manage.material.externalCampaignId')}</label>
        <input type="text" value={campaignIdExternal} onChange={e => setCampaignIdExternal(e.target.value)} placeholder={t('admin.campaigns.manage.material.externalCampaignIdPlaceholder')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('admin.campaigns.manage.material.saveChanges')}
        </button>
        <button
          onClick={handleSendToClient}
          disabled={sendingToClient}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {sendingToClient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t('admin.campaigns.manage.material.sendForApproval')}
        </button>
      </div>
    </div>
  );
}

// ─── PESTAÑA 3: Chat ─────────────────────────────────────────────────────────
function ChatTab({ briefing, professional, adminUser }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const attachInputRef = useRef(null);
  const conversationId = `briefing_${briefing.id}`;

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['briefingChat', briefing.id],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ conversation_id: conversationId }, 'created_date', 200);
      return msgs;
    },
    refetchInterval: 5000,
    staleTime: 0,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAttach = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingAttach(true);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { url: file_url, name: file.name, type: file.type, size: file.size };
      }));
      setAttachments(prev => [...prev, ...uploaded]);
    } catch {
      toast.error(t('admin.campaigns.manage.chat.attachError'));
    } finally {
      setUploadingAttach(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;
    setSending(true);
    try {
      await base44.entities.Message.create({
        conversation_id: conversationId,
        sender_id: adminUser.id,
        recipient_id: briefing.professional_id,
        content: message.trim(),
        professional_name: t('admin.campaigns.manage.teamName'),
        client_name: briefing.professional_name || professional?.full_name,
        attachments,
      });

      // Email al profesional
      if (professional?.email) {
        await base44.functions.invoke('sendCampaignEmail', {
          type: 'admin_needs_info',
          data: {
            professionalEmail: professional.email,
            professionalName: briefing.professional_name || professional?.full_name,
            adminName: adminUser.full_name || t('admin.campaigns.manage.teamNameFallback'),
            messagePreview: message.trim().substring(0, 200),
            monthYear: briefing.month_year,
          }
        });
      }

      setMessage('');
      setAttachments([]);
      refetch();
      toast.success(t('admin.campaigns.manage.chat.sent'));
    } catch (err) {
      toast.error(t('admin.campaigns.manage.sendError', { message: err.message }));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            {t('admin.campaigns.manage.chat.empty')}
          </div>
        )}
        {messages.map(msg => {
          const isAdmin = msg.sender_id === adminUser.id;
          return (
            <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isAdmin ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                {!isAdmin && <p className="text-xs font-semibold text-blue-600 mb-1">{msg.client_name || t('professionalLabel')}</p>}
                {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                {msg.attachments?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.attachments.map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-1 text-xs underline ${isAdmin ? 'text-blue-200' : 'text-blue-600'}`}>
                        <Paperclip className="w-3 h-3" /> {att.name || t('admin.campaigns.manage.chat.attachmentFallback')}
                      </a>
                    ))}
                  </div>
                )}
                <p className={`text-[10px] mt-1.5 ${isAdmin ? 'text-blue-200' : 'text-gray-400'}`}>
                  {msg.created_date ? format(new Date(msg.created_date), 'dd MMM HH:mm', { locale: es }) : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
              <Paperclip className="w-3 h-3" /> {att.name}
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-blue-400 hover:text-red-500">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white flex items-end gap-2">
        <input ref={attachInputRef} type="file" multiple className="hidden" onChange={handleAttach} />
        <button onClick={() => attachInputRef.current?.click()} disabled={uploadingAttach}
          className="p-2 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0">
          {uploadingAttach ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={t('admin.campaigns.manage.chat.placeholder')}
          rows={2}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={sending || (!message.trim() && attachments.length === 0)}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── PESTAÑA 4: Métricas ─────────────────────────────────────────────────────
function MetricsTab({ briefing, onUpdated }) {
  const { t } = useTranslation();
  const budget = briefing.budget_tier === 'boosted' ? 100 : 30;
  const [metrics, setMetrics] = useState({
    reach: briefing.campaign_metrics?.reach || 0,
    impressions: briefing.campaign_metrics?.impressions || 0,
    clicks: briefing.campaign_metrics?.clicks || 0,
    conversions: briefing.campaign_metrics?.conversions || 0,
    leads_generated: briefing.campaign_metrics?.leads_generated || 0,
    cpc: briefing.campaign_metrics?.cpc || 0,
    spent_eur: briefing.campaign_metrics?.spent_eur || 0,
  });
  const [saving, setSaving] = useState(false);

  const spentPct = Math.min(100, (metrics.spent_eur / budget) * 100);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.AdsBriefing.update(briefing.id, {
        campaign_metrics: metrics,
        admin_updated_at: new Date().toISOString(),
      });
      onUpdated(updated);
      toast.success(t('admin.campaigns.manage.metrics.updated'));
    } catch {
      toast.error(t('admin.campaigns.manage.metrics.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const MetricInput = ({ label, field, prefix = '', suffix = '' }) => (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={metrics[field]}
          onChange={e => setMetrics(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
          className={`w-full border border-gray-200 rounded-lg py-2 text-sm ${prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-7' : 'px-3'}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Presupuesto */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">{t('admin.campaigns.manage.metrics.budgetSpent')}</span>
          <span className="text-sm font-bold text-gray-900">{metrics.spent_eur?.toFixed(2)}€ / {budget}€ ({spentPct.toFixed(0)}%)</span>
        </div>
        <div className="h-3 bg-white rounded-full overflow-hidden border border-blue-100">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${spentPct}%` }} />
        </div>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricInput label={t('admin.campaigns.manage.metrics.reach')} field="reach" />
        <MetricInput label={t('admin.campaigns.manage.metrics.impressions')} field="impressions" />
        <MetricInput label={t('admin.campaigns.manage.metrics.clicks')} field="clicks" />
        <MetricInput label={t('admin.campaigns.manage.metrics.conversions')} field="conversions" />
        <MetricInput label={t('admin.campaigns.manage.metrics.leadsGenerated')} field="leads_generated" />
        <MetricInput label="CPC" field="cpc" prefix="€" />
        <MetricInput label={t('admin.campaigns.manage.metrics.totalSpent')} field="spent_eur" prefix="€" />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t('admin.campaigns.manage.metrics.update')}
      </button>
    </div>
  );
}

// ─── PESTAÑA 5: Notas internas ───────────────────────────────────────────────
function NotesTab({ briefing, onUpdated }) {
  const { t } = useTranslation();
  const [adminNotes, setAdminNotes] = useState(briefing.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.AdsBriefing.update(briefing.id, {
        admin_notes: adminNotes,
        admin_updated_at: new Date().toISOString(),
      });
      onUpdated(updated);
      toast.success(t('admin.campaigns.manage.notes.saved'));
    } catch {
      toast.error(t('admin.campaigns.manage.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        {t('admin.campaigns.manage.notes.privacyNotice')}
      </div>
      <textarea
        value={adminNotes}
        onChange={e => setAdminNotes(e.target.value)}
        rows={12}
        placeholder={t('admin.campaigns.manage.notes.placeholder')}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t('admin.campaigns.manage.notes.save')}
      </button>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function InfoBlock({ label, value, multiline }) {
  if (!value) return null;
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">{label}</label>
      {multiline ? (
        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-sm text-gray-900 font-medium">{value}</p>
      )}
    </div>
  );
}
