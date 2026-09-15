import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Send, Eye, CheckCircle, XCircle, AlertTriangle, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

const CAMPAIGN_TAG = 'blog_plataformas_v1_sent';
const CAMPAIGN_ID = 'blog_plataformas_v1';
const CAMPAIGN_SUBJECT = 'Hemos comparado 7 plataformas para autónomos en España';

// Lista FIJA de 11 destinatarios (hardcoded, no query dinámica)
const TARGET_USER_IDS = [
  '69df7f55607df85d840e4fda', // fixtic.consultant@gmail.com - FixTIC
  '695a671d41f34d1044653729', // bencharkizaid@gmail.com - Zaid Bencharki
  '69412ee0bdf0b3d43693759f', // seletto9@gmail.com - Seletto
  '6940fe823069e39c15eb2f43', // varon5927@gmail.com - Jorge Varon
  '693acd9f370063e1959b824f', // kassim.kone27@gmail.com - Kassim Kone
  '6937c7d7503351ab9cd5c9d4', // estradaservice0953@gmail.com - Andrés F. Rodríguez
  '6936fcf4a5dd1965a8c9d011', // nahuelvilches.tbv@gmail.com - Nahuel Vilches
  '6932b27acee41be4b8ef3978', // fastserviceasesoria@gmail.com - FAST SERVICE
  '692b04468af1f276d86a6529', // emaar.estates@gmail.com - Ilyas
  '692980f8a1233a63cc216433', // moujtabakh123@gmail.com - Al Moujtaba Kharrat
  '6929599cd8f5ce796ed1f11f', // sstus8579@gmail.com - саша стус
];

const buildHtml = (name, email) => {
  const unsubscribeUrl = `https://misautonomos.es/newsletter/unsubscribe?email=${encodeURIComponent(email || '')}`;
  const firstName = name ? name.split(' ')[0] : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>7 plataformas para autónomos comparadas</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <tr><td style="padding:32px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#2563eb;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;color:#ffffff;font-size:20px;font-weight:800;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:40px;">M</td>
            <td style="padding-left:12px;font-size:18px;font-weight:700;color:#1a1a2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:-0.2px;">MisAutónomos</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 8px 32px;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1a1a2e;font-weight:700;">Hemos comparado 7 plataformas para autónomos. Estas son las comisiones reales.</h1>
      </td></tr>
      <tr><td style="padding:16px 32px;font-size:16px;line-height:1.6;color:#3a3a4e;">
        <p style="margin:0 0 16px 0;">Hola${firstName ? ` ${firstName}` : ''},</p>
        <p style="margin:0 0 16px 0;">Llevábamos tiempo queriendo escribir una comparativa <strong>sin maquillar</strong> de las plataformas más usadas en España para conseguir clientes como autónomo. Hoy la hemos publicado.</p>
        <p style="margin:0 0 12px 0;"><strong>Lo que cobra cada una en 2026:</strong></p>
        <ul style="margin:0 0 16px 20px;padding:0;">
          <li style="margin-bottom:6px;">Habitissimo: hasta 25 € por cada lead, lo cierres o no.</li>
          <li style="margin-bottom:6px;">Malt y Fiverr: entre el 10 % y el 20 % de cada proyecto.</li>
          <li style="margin-bottom:6px;">Wallapop: gratis, pero el cliente busca el más barato.</li>
          <li style="margin-bottom:6px;">Google Business: gratis y obligatorio para todos.</li>
          <li style="margin-bottom:6px;">LinkedIn: ideal para B2B, pero a meses vista.</li>
        </ul>
        <p style="margin:0 0 16px 0;">En el artículo tienes la tabla completa con qué plataforma encaja según tu sector (reformas, oficios, freelance digital, consultoría, estética…), el ticket medio recomendado y los 3 errores más típicos que matan tu visibilidad online.</p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 24px 32px;">
        <a href="https://misautonomos.es/blog/mejores-plataformas-conseguir-clientes-autonomo-2026?utm_source=email&utm_medium=email&utm_campaign=blog_plataformas_v1" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:16px;font-weight:600;">Leer la comparativa completa →</a>
      </td></tr>
      <tr><td style="padding:0 32px 16px 32px;font-size:15px;line-height:1.6;color:#3a3a4e;">
        <p style="margin:0;">Si te ha resultado útil, contéstanos a este email con tu sector y te decimos qué combinación de plataformas vemos funcionar mejor para perfiles como el tuyo.</p>
        <p style="margin:16px 0 0 0;">Un saludo,<br><strong>Equipo MisAutónomos</strong></p>
      </td></tr>
      <tr><td style="padding:24px 32px;border-top:1px solid #eef0f3;font-size:12px;color:#8a8fa3;text-align:center;">
        Recibes este email porque estás suscrito al newsletter de MisAutónomos. <a href="${unsubscribeUrl}" style="color:#8a8fa3;text-decoration:underline;">Darse de baja</a><br>
        © 2026 MisAutónomos · misautonomos.es
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function CampaignBlogPlataformasV1() {
  const { t } = useTranslation();
  const [audience, setAudience] = useState(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  const fetchAudience = async () => {
    setLoadingAudience(true);
    setAudience(null);
    setResult(null);
    try {
      // Una sola query con todos los IDs — evita 11 fetches en paralelo
      const records = await base44.entities.User.filter({ id: { $in: TARGET_USER_IDS } });
      const userMap = new Map((records || []).map(u => [u.id, u]));
      const users = TARGET_USER_IDS.map(uid => userMap.get(uid) || { id: uid, email: t('admin.campaigns.shared.userNotFound'), full_name: '', tags: [] });
      setAudience(users);
    } catch (e) {
      toast.error(t('admin.campaigns.shared.audienceLoadError', { message: e.message }));
    } finally {
      setLoadingAudience(false);
    }
  };

  const pendingAudience = audience
    ? audience.filter(u => !Array.isArray(u.tags) || !u.tags.includes(CAMPAIGN_TAG))
    : [];

  const handleTestSend = async () => {
    setSendingTest(true);
    try {
      const me = await base44.auth.me();
      await base44.functions.invoke('sendAndLog', {
        to: me.email,
        subject: `[TEST] ${CAMPAIGN_SUBJECT}`,
        template: 'raw_html',
        html: buildHtml(me.full_name, me.email),
        category: 'transactional',
        vars: {},
      });
      toast.success(t('admin.campaigns.shared.testSent', { email: me.email }));
    } catch (e) {
      toast.error(t('admin.campaigns.shared.testError', { message: e.message }));
    } finally {
      setSendingTest(false);
    }
  };

  const handleSend = async () => {
    if (!audience) return;
    const toSend = pendingAudience;
    if (toSend.length === 0) {
      toast.info(t('admin.campaigns.shared.nothingToSend'));
      setShowConfirm(false);
      return;
    }

    setShowConfirm(false);
    setSending(true);
    setResult(null);

    let ok = 0;
    let failed = 0;
    let skippedBlocklist = 0;
    let skippedTag = 0;

    setProgress({ done: 0, total: toSend.length });

    for (let i = 0; i < toSend.length; i++) {
      const user = toSend[i];
      setProgress({ done: i, total: toSend.length });

      // Guard idempotencia: recargar tags frescos antes de enviar
      let freshTags = [];
      try {
        const fresh = await base44.entities.User.filter({ id: user.id });
        freshTags = Array.isArray(fresh?.[0]?.tags) ? fresh[0].tags : [];
      } catch { /* continuar */ }

      if (freshTags.includes(CAMPAIGN_TAG)) {
        skippedTag++;
        setProgress({ done: i + 1, total: toSend.length });
        continue;
      }

      try {
        const res = await base44.functions.invoke('sendAndLog', {
          to: user.email,
          subject: CAMPAIGN_SUBJECT,
          template: 'raw_html',
          html: buildHtml(user.full_name, user.email),
          category: 'marketing',
          campaign_id: CAMPAIGN_ID,
          vars: {},
        });

        const emailResult = res?.data?.results?.[0];

        if (emailResult?.status === 'skipped') {
          skippedBlocklist++;
        } else if (emailResult?.status === 'sent') {
          await base44.entities.User.update(user.id, {
            tags: [...freshTags, CAMPAIGN_TAG],
          });
          ok++;
        } else {
          failed++;
        }
      } catch (e) {
        console.error('[blog_plataformas_v1] Error para', user.email, e.message);
        failed++;
      }

      if (i < toSend.length - 1) await sleep(200);
    }

    setProgress({ done: toSend.length, total: toSend.length });
    setResult({ ok, failed, skippedBlocklist, skippedTag });
    setSending(false);
    toast.success(t('admin.campaigns.shared.completed', { ok, failed }));

    await fetchAudience();
  };

  return (
    <Card className="p-6 border-2 border-blue-100">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Send className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{t('admin.campaigns.blogPlataformas.title')}</h3>
          <p className="text-xs text-gray-500">{t('admin.campaigns.blogPlataformas.subtitle', { tag: CAMPAIGN_TAG })}</p>
        </div>
        <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">{t('admin.campaigns.shared.readyBadge')}</span>
      </div>

      {/* Info */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700">
        <p><strong>{t('admin.campaigns.shared.subjectLabel')}</strong> {CAMPAIGN_SUBJECT}</p>
        <p className="mt-1"><strong>{t('admin.campaigns.shared.targetAudienceLabel')}</strong> {t('admin.campaigns.blogPlataformas.targetAudience')}</p>
        <p className="mt-1"><strong>{t('admin.campaigns.shared.campaignIdLabel')}</strong> {CAMPAIGN_ID}</p>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Button
          variant="outline"
          onClick={fetchAudience}
          disabled={loadingAudience || sending}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          {loadingAudience ? t('common.loading') : t('admin.campaigns.shared.previewAudience')}
        </Button>

        <Button
          variant="outline"
          onClick={handleTestSend}
          disabled={sendingTest || sending}
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          <FlaskConical className="w-4 h-4" />
          {sendingTest ? t('admin.campaigns.shared.sending') : t('admin.campaigns.blogPlataformas.testToMe')}
        </Button>

        {audience && pendingAudience.length > 0 && !sending && (
          <Button
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setShowConfirm(true)}
            disabled={sending}
          >
            <Send className="w-4 h-4" />
            {t('admin.campaigns.blogPlataformas.sendPending', { pending: pendingAudience.length })}
          </Button>
        )}
      </div>

      {/* Progreso */}
      {sending && (
        <div className="mb-4 bg-blue-50 rounded-lg p-4 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-blue-800 font-semibold">
            {t('admin.campaigns.shared.progress', { done: progress.done, total: progress.total })}
          </span>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="mb-4 bg-green-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">{t('admin.campaigns.shared.result.sentOk', { ok: result.ok })}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">{t('admin.campaigns.shared.result.failed', { failed: result.failed })}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-yellow-700">{t('admin.campaigns.shared.result.blocked', { blocked: result.skippedBlocklist })}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-600">{t('admin.campaigns.shared.result.alreadyTagged', { tagged: result.skippedTag })}</span>
          </div>
        </div>
      )}

      {/* Tabla de audiencia */}
      {audience && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">
                <Trans i18nKey="admin.campaigns.shared.audienceSummary" values={{ total: audience.length, pending: pendingAudience.length }} />
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchAudience} disabled={loadingAudience} className="text-xs gap-1 h-7">
              {t('admin.campaigns.shared.reload')}
            </Button>
          </div>
          <div className="overflow-auto max-h-64 rounded border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('emailField')}</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('admin.campaigns.shared.table.name')}</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('admin.campaigns.shared.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {audience.map((u) => {
                  const alreadySent = Array.isArray(u.tags) && u.tags.includes(CAMPAIGN_TAG);
                  return (
                    <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-800">{u.email}</td>
                      <td className="py-2 px-3 text-gray-600">{u.full_name || '—'}</td>
                      <td className="py-2 px-3">
                        {alreadySent ? (
                          <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">{t('admin.campaigns.shared.table.alreadySent')}</span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-semibold">{t('admin.campaigns.shared.table.pending')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('admin.campaigns.blogPlataformas.confirm.title')}</h3>
            <p className="text-gray-600 mb-6">
              <Trans i18nKey="admin.campaigns.blogPlataformas.confirm.body" values={{ pending: pendingAudience.length }} />
            </p>
            <div className="flex gap-3">
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleSend}>
                {t('admin.campaigns.shared.confirmSend')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
