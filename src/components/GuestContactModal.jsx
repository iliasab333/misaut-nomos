import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { IconSpinner, IconSuccess, IconAlert, IconSend } from '@/components/Icons';
import Modal from '@/components/Modal';
import { sendGuestContact } from '@/lib/contactProfessional';
import { trackMetric } from '@/lib/trackMetric';

const NAVY = '#00255C';

// Modal "Contactar como invitado" para visitantes sin sesión.
// Llama a la Edge Function `contact-professional` y muestra el feedback.
// El contenedor es <Modal> (hoja abajo en móvil, centrado en escritorio):
// el mismo aspecto que tenía a mano, más Escape, foco devuelto al cerrar y
// bloqueo del scroll de fondo.
export default function GuestContactModal({ professional, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(
    professional?.business_name
      ? t('messages.guestContact.defaultMessageWithName', { name: professional.business_name })
      : t('messages.default_contact_message')
  );
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!name.trim()) return setError(t('messages.guestContact.nameRequired'));
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t('messages.guestContact.invalidEmail'));
    if (message.trim().length < 10) return setError(t('messages.guestContact.messageTooShort'));
    setSending(true);
    try {
      await sendGuestContact({
        professional_profile_id: professional.id,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      trackMetric(professional.id, 'contact_click');
      setDone(true);
    } catch (err) {
      setError(err.message || t('messages.guestContact.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('messages.guestContact.title', { name: professional?.business_name || t('messages.professionalFallback') })}
      description={t('messages.guestContact.subtitle')}
    >
      {done ? (
        <div className="py-2 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,37,92,0.06)' }}>
            <IconSuccess className="w-6 h-6" style={{ color: NAVY }} />
          </div>
          <p className="mt-4 font-semibold text-ink">{t('messages.guestContact.sentTitle')}</p>
          <p className="text-sm text-c-muted mt-1">
            <Trans
              i18nKey="messages.guestContact.sentDescription"
              values={{ name: professional?.business_name || t('messages.guestContact.professionalFallbackCapital'), email }}
              components={{ email: <span className="font-medium text-ink" /> }}
            />
          </p>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm mt-5 text-white"
            style={{ background: NAVY }}
          >
            {t('common.close')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-c-muted">{t('auth.name')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.name_placeholder')}
              className="input mt-1.5"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-c-muted">{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              className="input mt-1.5"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-c-muted">{t('supportChat.ticketMessage')}</span>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('messages.guestContact.messagePlaceholder')}
              className="textarea mt-1.5"
            />
          </label>

          {error && (
            <div role="alert" className="flex items-start gap-2 text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
              <IconAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="pt-1 flex items-center justify-between gap-2">
            <p className="text-[11px] text-c-muted">{t('messages.guestContact.noAccountNeeded')}</p>
            <button
              type="submit"
              disabled={sending}
              className="btn btn-sm text-white disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {sending ? <IconSpinner className="w-4 h-4 animate-spin" /> : <IconSend className="w-4 h-4" />}
              {t('messages.send')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
