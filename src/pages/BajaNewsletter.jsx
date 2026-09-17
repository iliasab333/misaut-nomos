import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { IconSuccess, IconAlert, IconSpinner } from '@/components/Icons';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const GOLD = '#F5C13D';
const BRAND = 'misAutónomos';
const SUPPORT_EMAIL = 'hola@misautonomos.es';

// Estados de la página: comprobando token → confirmado / error.
const STATE = {
  loading: 'loading',
  success: 'success',
  not_found: 'not_found',
  already: 'already',
  no_token: 'no_token',
  error: 'error',
};

export default function BajaNewsletter() {
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const token = params.get('token');
  const [state, setState] = useState(STATE.loading);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) { setState(STATE.no_token); return; }
    (async () => {
      try {
        const rows = await base44.entities.NewsletterSubscriber.filter({ unsubscribe_token: token });
        const sub = Array.isArray(rows) && rows[0];
        if (!sub) { setState(STATE.not_found); return; }
        setEmail(sub.email || '');
        if (sub.status === 'unsubscribed') {
          setState(STATE.already);
          return;
        }
        await base44.entities.NewsletterSubscriber.update(sub.id, {
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
        });
        setState(STATE.success);
      } catch (err) {
        setMsg(err?.message || t('common.error'));
        setState(STATE.error);
      }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const panelByState = () => {
    switch (state) {
      case STATE.loading:
        return {
          icon: <IconSpinner className="w-7 h-7 animate-spin" style={{ color: NAVY }} />,
          title: t('newsletter.baja.loadingTitle'),
          body: t('newsletter.baja.loadingBody'),
        };
      case STATE.success:
        return {
          icon: <IconSuccess className="w-7 h-7" style={{ color: NAVY }} />,
          title: t('newsletter.unsubscribe.title'),
          body: email
            ? t('newsletter.baja.successBodyEmail', { email })
            : t('newsletter.baja.successBody'),
        };
      case STATE.already:
        return {
          icon: <IconSuccess className="w-7 h-7 text-success" />,
          title: t('newsletter.baja.alreadyTitle'),
          body: email
            ? t('newsletter.baja.alreadyBodyEmail', { email })
            : t('newsletter.baja.alreadyBody'),
        };
      case STATE.not_found:
        return {
          icon: <IconAlert className="w-7 h-7 text-warning" />,
          title: t('newsletter.baja.notFoundTitle'),
          body: t('newsletter.baja.notFoundBody'),
        };
      case STATE.no_token:
        return {
          icon: <IconAlert className="w-7 h-7 text-warning" />,
          title: t('newsletter.baja.noTokenTitle'),
          body: t('newsletter.baja.noTokenBody'),
        };
      case STATE.error:
      default:
        return {
          icon: <IconAlert className="w-7 h-7 text-error" />,
          title: t('common.errorGenericTitle'),
          body: msg || t('newsletter.baja.errorBody'),
        };
    }
  };
  const { icon, title, body } = panelByState();

  return (
    <>
      <SEOHead title={t('newsletter.baja.seoTitle')} noindex />
      <main className="min-h-screen bg-canvas text-ink">
        <section className="max-w-xl mx-auto px-4 pt-20 md:pt-28 pb-16 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
            style={{ background: 'rgba(0,37,92,0.06)' }}
          >
            {icon}
          </div>
          <h1
            className="mt-6 font-semibold tracking-tight"
            style={{ color: NAVY, fontSize: 'clamp(1.7rem, 4.4vw, 2.25rem)', lineHeight: 1.1, letterSpacing: '-0.025em' }}
          >
            {title}
          </h1>
          <p className="mt-3 text-c-muted max-w-md mx-auto leading-relaxed">{body}</p>

          {(state === STATE.success || state === STATE.already) && (
            <p className="mt-2 text-xs text-c-muted">
              {t('newsletter.baja.resubscribeHint')}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-semibold text-white"
              style={{ background: NAVY }}
            >
              {t('newsletter.backHome')}
            </Link>
            <Link
              to="/contacto"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-semibold border border-c-border text-ink hover:bg-soft"
            >
              {t('profile_card.contact')}
            </Link>
          </div>

          <p className="mt-10 text-[11px] text-c-muted">
            <span className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1.5" style={{ background: GOLD }} />
            {BRAND} · {SUPPORT_EMAIL}
          </p>
        </section>
      </main>
    </>
  );
}
