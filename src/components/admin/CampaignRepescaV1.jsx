import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import Modal from '@/components/Modal';
import {
  IconUsers, IconSend, IconEye, IconCheckCircle, IconError, IconWarning, IconFlask,
} from '@/components/Icons';
import { toast } from '@/lib/toast';

const CAMPAIGN_TAG = 'repesca_v1_sent';
const CAMPAIGN_SUBJECT = 'Te dejaste algo a medias en MisAutónomos 👋';

// NO HAY BLOCKLIST EN EL CLIENTE, y antes tampoco la había de verdad.
//
// Aquí vivían seis direcciones de correo escritas a mano —las cuentas de
// prueba del dueño— y resulta que NO bloqueaban nada: lo único que hacía ese
// array era dar su `.length` a una etiqueta. El bloqueo de verdad lo hace
// `sendAndLog` en el servidor, que devuelve `status: 'skipped'`, y eso es lo
// que cuenta `skippedBlocklist` más abajo.
//
// Así que eran seis direcciones reales publicadas para nada: en un repositorio
// PÚBLICO de GitHub y, como las cadenas sí sobreviven al minificador, servidas
// dentro de `/assets/AdminEmails-*.js`, que responde 200 a cualquier visitante
// sin sesión (comprobado en producción el 2026-10-08). Se quitan, y la
// etiqueta deja de prometer un número que no era suyo.

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
    <div className="card p-6 border-2 border-blue-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-c-accent/10 flex items-center justify-center">
          <IconSend className="w-5 h-5 text-c-accent" />
        </div>
        <div>
          <h3 className="font-bold text-ink">{t('admin.campaigns.repesca.title')}</h3>
          <p className="text-xs text-c-muted">{t('admin.campaigns.repesca.subtitle', { tag: CAMPAIGN_TAG })}</p>
        </div>
        <span className="ml-auto badge-warning">{t('admin.campaigns.shared.readyBadge')}</span>
      </div>

      <div className="bg-soft rounded-lg p-3 mb-4 text-sm text-ink">
        <p><strong>{t('admin.campaigns.shared.subjectLabel')}</strong> {CAMPAIGN_SUBJECT}</p>
        <p className="mt-1"><strong>{t('admin.campaigns.shared.targetAudienceLabel')}</strong> {t('admin.campaigns.repesca.targetAudience')}</p>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={fetchAudience}
          disabled={loadingAudience || sending}
        >
          <IconEye className="w-4 h-4" />
          {loadingAudience ? t('admin.campaigns.repesca.calculating') : t('admin.campaigns.shared.previewAudience')}
        </button>

        <button
          type="button"
          className="btn-secondary btn-sm border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-200"
          onClick={handleTestSend}
          disabled={sendingTest || sending}
        >
          <IconFlask className="w-4 h-4" />
          {sendingTest ? t('admin.campaigns.shared.sending') : t('admin.campaigns.repesca.sendMeTest')}
        </button>

        {audience && audience.length > 0 && !sending && (
          <button
            type="button"
            className="btn-danger-solid btn-sm"
            onClick={() => setShowConfirm(true)}
            disabled={sending}
          >
            <IconSend className="w-4 h-4" />
            {t('admin.campaigns.repesca.sendAll', { total: audience.length })}
          </button>
        )}
      </div>

      {/* Progreso */}
      {sending && (
        <div className="mb-4 bg-c-accent/10 rounded-lg p-4 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-c-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-c-accent font-semibold">
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
          <div className="flex items-center gap-2 mb-2">
            <IconUsers className="w-4 h-4 text-c-muted" />
            <span className="text-sm font-semibold text-ink">
              <Trans i18nKey="admin.campaigns.repesca.effectiveAudience" values={{ total: audience.length }} />
            </span>
          </div>
          {audience.length === 0 ? (
            <p className="text-sm text-c-muted italic">{t('admin.campaigns.repesca.noRecipients')}</p>
          ) : (
            <div className="overflow-auto max-h-64 rounded border border-c-border">
              <table className="w-full text-xs">
                <thead className="bg-soft sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-ink">{t('emailField')}</th>
                    <th className="text-left py-2 px-3 font-semibold text-ink">{t('admin.campaigns.shared.table.name')}</th>
                    <th className="text-left py-2 px-3 font-semibold text-ink">{t('admin.campaigns.repesca.table.userType')}</th>
                  </tr>
                </thead>
                <tbody>
                  {audience.map((u) => (
                    <tr key={u.id} className="border-t border-c-border hover:bg-soft">
                      <td className="py-2 px-3 text-ink">{u.email}</td>
                      <td className="py-2 px-3 text-c-muted">{u.full_name || '—'}</td>
                      <td className="py-2 px-3 text-c-muted">{u.user_type || t('admin.campaigns.repesca.emptyUserType')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmación */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        dismissible={false}
        title={t('admin.campaigns.repesca.confirm.title')}
      >
        <p className="text-c-muted mb-6">
          <Trans i18nKey="admin.campaigns.repesca.confirm.body" values={{ total: audience?.length || 0 }} />
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
