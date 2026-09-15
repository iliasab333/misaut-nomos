import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Send, Eye, CheckCircle, XCircle, AlertTriangle, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

const CAMPAIGN_TAG = 'repesca_v1_sent';
const CAMPAIGN_SUBJECT = 'Te dejaste algo a medias en MisAutónomos 👋';

// Blocklist específica de esta campaña
const CAMPAIGN_BLOCKLIST = [
  'gucciahmedben@gmail.com',
  'yahyarayan25@gmail.com',
  'anisbenchellal@gmail.com',
  'edxikol@gmail.com',
  'guccito67@gmail.com',
  'missautonomos@gmail.com',
];

const buildHtml = (name) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Te dejaste algo a medias</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <tr><td style="padding:32px 32px 8px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#2563eb;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;color:#ffffff;font-size:20px;font-weight:800;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:40px;">M</td>
            <td style="padding-left:12px;font-size:18px;font-weight:700;color:#1a1a2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:-0.2px;">MisAutónomos</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 8px 32px;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1a1a2e;font-weight:700;">Te dejaste algo a medias en MisAutónomos 👋</h1>
      </td></tr>
      <tr><td style="padding:16px 32px;font-size:16px;line-height:1.6;color:#3a3a4e;">
        <p style="margin:0 0 16px 0;">Hola${name ? ` ${name}` : ''},</p>
        <p style="margin:0 0 16px 0;">Mirando los registros vimos que te diste de alta hace un tiempo pero no llegaste a terminar de crear tu cuenta. Queríamos preguntarte directamente: <strong>¿hubo algo que no te convenció, o simplemente se quedó en el tintero?</strong></p>
        <p style="margin:0 0 16px 0;">En serio, lo preguntamos para mejorar la plataforma.</p>
        <p style="margin:0 0 16px 0;">Y si lo dejaste por el precio o por probar sin compromiso, te dejamos algo: <strong>el primer mes en el Plan Ads+ por solo 1 €</strong> (en vez de 33 €). Lo justo para que veas si te llegan clientes reales antes de pagar el precio normal.</p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 24px 32px;">
        <a href="https://misautonomos.es/precios?utm_source=email&utm_medium=email&utm_campaign=repesca_v1" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:16px;font-weight:600;">Activar mi cuenta por 1 € →</a>
      </td></tr>
      <tr><td style="padding:0 32px 16px 32px;font-size:15px;line-height:1.6;color:#3a3a4e;">
        <p style="margin:0 0 12px 0;">Sin trampas, sin permanencia oculta. Si en algún momento ves que no es para ti, te das de baja desde tu perfil con un click.</p>
        <p style="margin:0 0 24px 0;">Si tienes cualquier duda, contéstanos a este email — nos llega directamente.</p>
        <p style="margin:0;">Un saludo,<br><strong>Equipo MisAutónomos</strong></p>
      </td></tr>
      <tr><td style="padding:24px 32px;border-top:1px solid #eef0f3;font-size:12px;color:#8a8fa3;text-align:center;">
        Recibes este email porque te diste de alta en MisAutónomos. <a href="https://misautonomos.es/newsletter/unsubscribe?email=${encodeURIComponent('')}" style="color:#8a8fa3;text-decoration:underline;">Darse de baja</a><br>
        © 2026 MisAutónomos · misautonomos.es
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function CampaignRepescaV1() {
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
      const res = await base44.functions.invoke('getCampaignAudience', {});
      setAudience(res.data.audience || []);
    } catch (e) {
      toast.error(t('admin.campaigns.repesca.audienceError', { message: e.message }));
    } finally {
      setLoadingAudience(false);
    }
  };

  const handleTestSend = async () => {
    setSendingTest(true);
    try {
      const me = await base44.auth.me();
      await base44.functions.invoke('sendAndLog', {
        to: me.email,
        subject: `[TEST] ${CAMPAIGN_SUBJECT}`,
        template: 'raw_html',
        html: buildHtml(me.full_name ? me.full_name.split(' ')[0] : 'Admin'),
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
    if (!audience || audience.length === 0) return;
    setShowConfirm(false);
    setSending(true);
    setResult(null);

    let ok = 0;
    let failed = 0;
    let skippedBlocklist = 0;

    setProgress({ done: 0, total: audience.length });

    for (let i = 0; i < audience.length; i++) {
      const user = audience[i];
      setProgress({ done: i, total: audience.length });

      try {
        const res = await base44.functions.invoke('sendAndLog', {
          to: user.email,
          subject: CAMPAIGN_SUBJECT,
          template: 'raw_html',
          html: buildHtml(user.full_name ? user.full_name.split(' ')[0] : ''),
          category: 'marketing',
          vars: {},
        });

        // Verificar resultado: sendAndLog devuelve { results: [{status, email, ...}] }
        const emailResult = res?.data?.results?.[0];
        if (emailResult?.status === 'skipped') {
          skippedBlocklist++;
        } else if (emailResult?.status === 'sent') {
          // Añadir tag de idempotencia via SDK normal (admin puede actualizar users)
          const currentTags = Array.isArray(user.tags) ? user.tags : [];
          if (!currentTags.includes(CAMPAIGN_TAG)) {
            await base44.entities.User.update(user.id, {
              tags: [...currentTags, CAMPAIGN_TAG],
            });
          }
          ok++;
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
      }

      // Rate limit: max ~5/s → esperar 200ms entre cada uno
      if (i < audience.length - 1) {
        await sleep(200);
      }
    }

    setProgress({ done: audience.length, total: audience.length });
    setResult({ ok, failed, skippedBlocklist, skippedTag: 0 });
    setSending(false);
    toast.success(t('admin.campaigns.shared.completed', { ok, failed }));

    // Refrescar audiencia para mostrar estado actualizado
    await fetchAudience();
  };

  return (
    <Card className="p-6 border-2 border-blue-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Send className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{t('admin.campaigns.repesca.title')}</h3>
          <p className="text-xs text-gray-500">{t('admin.campaigns.repesca.subtitle', { tag: CAMPAIGN_TAG })}</p>
        </div>
        <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">{t('admin.campaigns.shared.readyBadge')}</span>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700">
        <p><strong>{t('admin.campaigns.shared.subjectLabel')}</strong> {CAMPAIGN_SUBJECT}</p>
        <p className="mt-1"><strong>{t('admin.campaigns.shared.targetAudienceLabel')}</strong> {t('admin.campaigns.repesca.targetAudience', { blocked: CAMPAIGN_BLOCKLIST.length })}</p>
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
          {loadingAudience ? t('admin.campaigns.repesca.calculating') : t('admin.campaigns.shared.previewAudience')}
        </Button>

        <Button
          variant="outline"
          onClick={handleTestSend}
          disabled={sendingTest || sending}
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          <FlaskConical className="w-4 h-4" />
          {sendingTest ? t('admin.campaigns.shared.sending') : t('admin.campaigns.repesca.sendMeTest')}
        </Button>

        {audience && audience.length > 0 && !sending && (
          <Button
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setShowConfirm(true)}
            disabled={sending}
          >
            <Send className="w-4 h-4" />
            {t('admin.campaigns.repesca.sendAll', { total: audience.length })}
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
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">
              <Trans i18nKey="admin.campaigns.repesca.effectiveAudience" values={{ total: audience.length }} />
            </span>
          </div>
          {audience.length === 0 ? (
            <p className="text-sm text-gray-500 italic">{t('admin.campaigns.repesca.noRecipients')}</p>
          ) : (
            <div className="overflow-auto max-h-64 rounded border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('emailField')}</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('admin.campaigns.shared.table.name')}</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('admin.campaigns.repesca.table.userType')}</th>
                  </tr>
                </thead>
                <tbody>
                  {audience.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-800">{u.email}</td>
                      <td className="py-2 px-3 text-gray-600">{u.full_name || '—'}</td>
                      <td className="py-2 px-3 text-gray-500">{u.user_type || t('admin.campaigns.repesca.emptyUserType')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('admin.campaigns.repesca.confirm.title')}</h3>
            <p className="text-gray-600 mb-6">
              <Trans i18nKey="admin.campaigns.repesca.confirm.body" values={{ total: audience.length }} />
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleSend}
              >
                {t('admin.campaigns.shared.confirmSend')}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
