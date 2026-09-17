import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import Modal from '@/components/Modal';
import {
  IconUsers, IconSend, IconEye, IconCheckCircle, IconError, IconWarning,
} from '@/components/Icons';
import { toast } from '@/lib/toast';

const CAMPAIGN_TAG = 'winback_v1_sent';
const CAMPAIGN_ID = 'winback_v1';
const CAMPAIGN_SUBJECT = 'Estuviste con nosotros hace un tiempo — ¿qué falló?';

// Lista FIJA de destinatarios (hardcoded, no query dinámica)
const TARGET_USER_IDS = [
  '692980f8a1233a63cc216433', // moujtabakh123@gmail.com - Al Moujtaba Kharrat
  '692b04468af1f276d86a6529', // emaar.estates@gmail.com - Ilyas
  '6937c7d7503351ab9cd5c9d4', // estradaservice0953@gmail.com - Andrés Felipe Rodríguez Estrada
  '693acd9f370063e1959b824f', // kassim.kone27@gmail.com - Kassim Kone
  '69412ee0bdf0b3d43693759f', // seletto9@gmail.com - Seletto
  '695a671d41f34d1044653729', // bencharkizaid@gmail.com - Zaid Bencharki
];

const buildHtml = (name, email) => {
  const unsubscribeUrl = `https://misautonomos.es/newsletter/unsubscribe?email=${encodeURIComponent(email || '')}`;
  const firstName = name ? name.split(' ')[0] : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>¿Qué falló?</title>
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
        <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1a1a2e;font-weight:700;">Estuviste con nosotros hace un tiempo — ¿qué falló?</h1>
      </td></tr>
      <tr><td style="padding:16px 32px;font-size:16px;line-height:1.6;color:#3a3a4e;">
        <p style="margin:0 0 16px 0;">Hola${firstName ? ` ${firstName}` : ''},</p>
        <p style="margin:0 0 16px 0;">Vi que estuviste suscrito en MisAutónomos hace un tiempo y luego decidiste dejarlo. Antes de nada, gracias por haberle dado una oportunidad a la plataforma.</p>
        <p style="margin:0 0 16px 0;">Te escribo porque me interesa de verdad saber <strong>qué fue lo que no funcionó</strong>: ¿no te llegaban suficientes clientes? ¿el precio no compensaba? ¿algo de la plataforma no te cuadraba? ¿cambió tu situación?</p>
        <p style="margin:0 0 16px 0;">Cualquier respuesta me sirve. Es lo que más útil me resulta para mejorar.</p>
        <p style="margin:0 0 16px 0;">Y si quieres volver a intentarlo, tu perfil <strong>sigue guardado tal cual lo dejaste</strong>. Reactivarlo es un click y, como bienvenida de vuelta, el primer mes vuelve a estar a <strong>1 €</strong> en el plan que prefieras.</p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 24px 32px;">
        <a href="https://misautonomos.es/precios?utm_source=email&utm_medium=email&utm_campaign=winback_v1" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:16px;font-weight:600;">Reactivar mi cuenta por 1 € →</a>
      </td></tr>
      <tr><td style="padding:0 32px 16px 32px;font-size:15px;line-height:1.6;color:#3a3a4e;">
        <p style="margin:0;">Un saludo,<br><strong>Equipo MisAutónomos</strong></p>
      </td></tr>
      <tr><td style="padding:24px 32px;border-top:1px solid #eef0f3;font-size:12px;color:#8a8fa3;text-align:center;">
        Recibes este email porque tuviste una suscripción en MisAutónomos. <a href="${unsubscribeUrl}" style="color:#8a8fa3;text-decoration:underline;">Darse de baja</a><br>
        © 2026 MisAutónomos · misautonomos.es
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function CampaignWinbackV1() {
  const { t } = useTranslation();
  const [audience, setAudience] = useState(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  const fetchAudience = async () => {
    setLoadingAudience(true);
    setAudience(null);
    setResult(null);
    try {
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

  // Destinatarios pendientes (sin tag winback_v1_sent)
  const pendingAudience = audience
    ? audience.filter(u => !Array.isArray(u.tags) || !u.tags.includes(CAMPAIGN_TAG))
    : [];

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
      } catch { /* si falla, continuar */ }

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
          // Añadir tag de idempotencia
          await base44.entities.User.update(user.id, {
            tags: [...freshTags, CAMPAIGN_TAG],
          });
          ok++;
        } else {
          failed++;
        }
      } catch (e) {
        console.error('[winback_v1] Error para', user.email, e.message);
        failed++;
      }

      // Rate limit: ~5 emails/s
      if (i < toSend.length - 1) await sleep(200);
    }

    setProgress({ done: toSend.length, total: toSend.length });
    setResult({ ok, failed, skippedBlocklist, skippedTag });
    setSending(false);
    toast.success(t('admin.campaigns.shared.completed', { ok, failed }));

    // Refrescar audiencia para mostrar estado actualizado
    await fetchAudience();
  };

  return (
    <div className="card p-6 border-2 border-orange-100">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <IconSend className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="font-bold text-ink">{t('admin.campaigns.winback.title')}</h3>
          <p className="text-xs text-c-muted">{t('admin.campaigns.winback.subtitle', { tag: CAMPAIGN_TAG })}</p>
        </div>
        <span className="ml-auto badge-error">{t('admin.campaigns.winback.cancelledBadge')}</span>
      </div>

      {/* Info */}
      <div className="bg-soft rounded-lg p-3 mb-4 text-sm text-ink">
        <p><strong>{t('admin.campaigns.shared.subjectLabel')}</strong> {CAMPAIGN_SUBJECT}</p>
        <p className="mt-1"><strong>{t('admin.campaigns.shared.targetAudienceLabel')}</strong> {t('admin.campaigns.winback.targetAudience')}</p>
        <p className="mt-1"><strong>{t('admin.campaigns.shared.campaignIdLabel')}</strong> {CAMPAIGN_ID}</p>
      </div>

      {/* Banner cancelación */}
      <div role="alert" className="bg-error/10 border border-error/30 rounded-lg p-3 mb-4 flex items-center gap-2">
        <IconError className="w-4 h-4 text-error flex-shrink-0" />
        <span className="text-sm text-error font-medium">{t('admin.campaigns.winback.cancelledNotice')}</span>
      </div>

      {/* Acciones — solo previsualización, envío deshabilitado */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={fetchAudience}
          disabled={loadingAudience}
        >
          <IconEye className="w-4 h-4" />
          {loadingAudience ? t('common.loading') : t('admin.campaigns.shared.previewAudience')}
        </button>

        <button
          type="button"
          className="btn-primary btn-sm bg-c-border text-c-muted hover:bg-c-border cursor-not-allowed"
          disabled={true}
        >
          <IconSend className="w-4 h-4" />
          {t('admin.campaigns.winback.sendCancelled')}
        </button>
      </div>

      {/* Progreso */}
      {sending && (
        <div className="mb-4 bg-orange-50 rounded-lg p-4 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-orange-800 font-semibold">
            {t('admin.campaigns.shared.progress', { done: progress.done, total: progress.total })}
          </span>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="mb-4 bg-success/10 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <IconCheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm font-semibold text-success">{t('admin.campaigns.shared.result.sentOk', { ok: result.ok })}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconError className="w-4 h-4 text-error" />
            <span className="text-sm font-semibold text-error">{t('admin.campaigns.shared.result.failed', { failed: result.failed })}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconWarning className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold text-warning">{t('admin.campaigns.shared.result.blocked', { blocked: result.skippedBlocklist })}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconWarning className="w-4 h-4 text-c-muted" />
            <span className="text-sm font-semibold text-c-muted">{t('admin.campaigns.shared.result.alreadyTagged', { tagged: result.skippedTag })}</span>
          </div>
        </div>
      )}

      {/* Tabla de audiencia */}
      {audience && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <IconUsers className="w-4 h-4 text-c-muted" />
              <span className="text-sm font-semibold text-ink">
                <Trans i18nKey="admin.campaigns.shared.audienceSummary" values={{ total: audience.length, pending: pendingAudience.length }} />
              </span>
            </div>
            <button type="button" className="btn-ghost btn-sm text-xs" onClick={fetchAudience} disabled={loadingAudience}>
              {t('admin.campaigns.shared.reload')}
            </button>
          </div>
          <div className="overflow-auto max-h-64 rounded border border-c-border">
            <table className="w-full text-xs">
              <thead className="bg-soft sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-ink">{t('emailField')}</th>
                  <th className="text-left py-2 px-3 font-semibold text-ink">{t('admin.campaigns.shared.table.name')}</th>
                  <th className="text-left py-2 px-3 font-semibold text-ink">{t('admin.campaigns.shared.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {audience.map((u) => {
                  const alreadySent = Array.isArray(u.tags) && u.tags.includes(CAMPAIGN_TAG);
                  return (
                    <tr key={u.id} className="border-t border-c-border hover:bg-soft">
                      <td className="py-2 px-3 text-ink">{u.email}</td>
                      <td className="py-2 px-3 text-c-muted">{u.full_name || '—'}</td>
                      <td className="py-2 px-3">
                        {alreadySent ? (
                          <span className="badge-success">{t('admin.campaigns.shared.table.alreadySent')}</span>
                        ) : (
                          <span className="badge-muted">{t('admin.campaigns.shared.table.pending')}</span>
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
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        dismissible={false}
        title={t('admin.campaigns.winback.confirm.title')}
      >
        <p className="text-c-muted mb-6">
          <Trans i18nKey="admin.campaigns.winback.confirm.body" values={{ pending: pendingAudience.length }} />
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-danger-solid flex-1"
            onClick={handleSend}
          >
            {t('admin.campaigns.shared.confirmSend')}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setShowConfirm(false)}
          >
            {t('common.cancel')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
