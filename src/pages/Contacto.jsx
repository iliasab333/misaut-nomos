import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { IconMail, IconMessageSquare, IconShield, IconSend, IconSuccess, IconAlert } from '@/components/Icons';
import SEOHead from '@/components/seo/SEOHead';
import { base44 } from '@/api/base44Client';

const NAVY = '#00255C';
const GOLD = '#F5C13D';
const SUPPORT_EMAIL = 'hola@misautonomos.es';

function FieldLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-[0.06em]">
      {children}
    </label>
  );
}

export default function Contacto() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' });
  const [status, setStatus] = useState({ state: 'idle', msg: '' });

  const update = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  // Puente entre el valor que guarda el <select> y la clave de su etiqueta.
  const TEMA_CLAVE = { general: 'general', autonomo: 'pro', cliente: 'client', incidencia: 'issue', prensa: 'press' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setStatus({ state: 'error', msg: t('contact.validation.nameRequired') });
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setStatus({ state: 'error', msg: t('contact.validation.emailInvalid') });
    if (form.message.trim().length < 10) return setStatus({ state: 'error', msg: t('contact.validation.messageTooShort') });
    setStatus({ state: 'sending', msg: '' });
    // Este formulario NO ENVIABA NADA.
    //
    // Llamaba a una función `contactForm` que nunca se ha desplegado — es una
    // de las diez que el código invoca y no existen, herencia de Base44. El
    // `catch` se tragaba el error, el comentario que había aquí decía que
    // caíamos a un `mailto` de red de seguridad (no existía tal cosa), y acto
    // seguido se le decía al visitante «mensaje enviado». Quien escribía por
    // aquí se marchaba convencido de haber contactado, y al otro lado no
    // llegaba nada.
    //
    // Ahora escribe un ticket, que es el camino que SÍ funciona: tiene filas
    // reales, un disparador que avisa, y una pantalla donde mirarlos
    // (/admin/soporte). Es además donde ya caen los mensajes de /ayuda, así
    // que no hay dos bandejas.
    try {
      const referencia = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      await base44.entities.Ticket.create({
        ticket_number: referencia,
        // El valor del desplegable y la clave de su etiqueta NO coinciden
        // ('autonomo' → 'pro', 'cliente' → 'client'…), así que el puente va
        // escrito: usar el valor como clave daba un título crudo.
        title: t(`contact.form.topics.${TEMA_CLAVE[form.topic] || 'general'}`),
        description: `**Nombre:** ${form.name.trim()}\n**Email:** ${form.email.trim()}\n\n${form.message.trim()}`,
        type: 'consulta_general',
        status: 'abierto',
        priority: 'media',
        creator_id: 'public_form',
        user_id: 'public_form',
        creator_name: form.name.trim(),
        creator_type: 'visitante',
        creator_email: form.email.trim(),
        tags: ['formulario_contacto', form.topic, form.email.trim()],
        // Sin pedir la fila de vuelta: quien escribe sin sesión no puede
        // leer los tickets, y pedirla tumbaba el INSERT entero.
      }, { devolverFila: false });
    } catch (e) {
      // Y si falla de verdad, se dice. Antes el fallo era invisible y el
      // visitante se iba contento: eso es peor que un error.
      console.error('[contacto] no se pudo registrar el mensaje:', e);
      setStatus({ state: 'error', msg: t('contact.form.failed') });
      return;
    }
    setStatus({ state: 'sent', msg: t('contact.form.sent', { email: form.email.trim() }) });
    setForm({ name: '', email: '', topic: 'general', message: '' });
  };

  return (
    <>
      <SEOHead
        title={t('contact.seo.title')}
        description={t('contact.seo.description')}
      />

      <main className="bg-canvas text-ink">
        {/* HERO sobrio */}
        <section style={{ background: '#FBFCFE' }}>
          <div className="container-page max-w-4xl pt-14 pb-10 md:pt-20 md:pb-12 text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(0,37,92,0.06)', color: NAVY }}
            >
              <IconMessageSquare className="w-3.5 h-3.5" /> {t('contact.hero.eyebrow')}
            </div>
            <h1
              className="mt-5 font-semibold tracking-tight"
              style={{ color: NAVY, fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.06, letterSpacing: '-0.025em' }}
            >
              {t('contact.hero.title')}
            </h1>
            <p className="mt-4 max-w-xl mx-auto text-c-muted text-[16px] md:text-lg leading-relaxed">
              {t('contact.hero.subtitle')}
            </p>
          </div>
        </section>

        {/* CUERPO con dos columnas: formulario y datos directos */}
        <section className="bg-canvas">
          <div className="container-page pb-16 md:pb-20">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 md:gap-10">
              {/* Formulario */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-c-border bg-surface p-5 md:p-6"
              >
                <h2 className="font-semibold text-ink mb-1">{t('contact.form.title')}</h2>
                <p className="text-sm text-c-muted mb-5">{t('contact.form.subtitle')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="cf-name">{t('auth.name')}</FieldLabel>
                    <input
                      id="cf-name"
                      type="text"
                      value={form.name}
                      onChange={update('name')}
                      placeholder={t('auth.name_placeholder')}
                      className="w-full h-11 rounded-xl border border-c-border px-3 text-[15px] text-ink placeholder:text-c-muted focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="cf-email">{t('auth.email')}</FieldLabel>
                    <input
                      id="cf-email"
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      placeholder={t('auth.email_placeholder')}
                      className="w-full h-11 rounded-xl border border-c-border px-3 text-[15px] text-ink placeholder:text-c-muted focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel htmlFor="cf-topic">{t('contact.form.topic')}</FieldLabel>
                  <select
                    id="cf-topic"
                    value={form.topic}
                    onChange={update('topic')}
                    className="w-full h-11 rounded-xl border border-c-border px-3 text-[15px] text-ink bg-surface focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                  >
                    <option value="general">{t('contact.form.topics.general')}</option>
                    <option value="autonomo">{t('contact.form.topics.pro')}</option>
                    <option value="cliente">{t('contact.form.topics.client')}</option>
                    <option value="incidencia">{t('contact.form.topics.issue')}</option>
                    <option value="prensa">{t('contact.form.topics.press')}</option>
                  </select>
                </div>

                <div className="mt-4">
                  <FieldLabel htmlFor="cf-msg">{t('contact.form.message')}</FieldLabel>
                  <textarea
                    id="cf-msg"
                    value={form.message}
                    onChange={update('message')}
                    rows={5}
                    placeholder={t('contact.form.messagePlaceholder')}
                    className="w-full rounded-xl border border-c-border px-3 py-2.5 text-[15px] text-ink placeholder:text-c-muted focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15 resize-y"
                  />
                </div>

                {status.state === 'error' && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
                    <IconAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {status.msg}
                  </div>
                )}
                {status.state === 'sent' && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                    <IconSuccess className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {status.msg}
                  </div>
                )}

                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <button
                    type="submit"
                    disabled={status.state === 'sending'}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: NAVY }}
                  >
                    <IconSend className="w-4 h-4" />
                    {status.state === 'sending' ? t('contact.form.sending') : t('proProfile.contact.sendMessage')}
                  </button>
                  <p className="text-xs text-c-muted">
                    <Trans
                      i18nKey="contact.form.orEmail"
                      values={{ email: SUPPORT_EMAIL }}
                      components={{ link: <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline underline-offset-2" style={{ color: NAVY }} /> }}
                    />
                  </p>
                </div>
              </form>

              {/* Datos directos */}
              <aside className="space-y-4">
                <div className="rounded-2xl border border-c-border bg-surface p-5">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}>
                    <IconMail className="w-4 h-4" />
                  </span>
                  <h3 className="mt-3 font-semibold text-ink">{t('auth.email')}</h3>
                  <p className="text-sm text-c-muted mt-1">
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline" style={{ color: NAVY }}>{SUPPORT_EMAIL}</a>
                  </p>
                  <p className="text-xs text-c-muted mt-2">{t('contact.aside.responseTime')}</p>
                </div>

                <div className="rounded-2xl border border-c-border bg-surface p-5">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}>
                    <IconShield className="w-4 h-4" />
                  </span>
                  <h3 className="mt-3 font-semibold text-ink">{t('contact.aside.supportTitle')}</h3>
                  <p className="text-sm text-c-muted mt-1">
                    {t('contact.aside.supportBody')}
                  </p>
                </div>

                <div
                  className="rounded-2xl p-5 text-white"
                  style={{ background: NAVY }}
                >
                  <h3 className="font-semibold">{t('landing.cta_pro_title')}</h3>
                  <p className="text-sm text-white/80 mt-1">
                    {t('contact.aside.proBody')}
                  </p>
                  <a
                    href="/para-autonomos"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold w-full"
                    style={{ backgroundColor: GOLD, color: NAVY }}
                  >
                    {t('contact.aside.proCta')}
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
