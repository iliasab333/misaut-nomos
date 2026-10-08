import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { IconMail, IconCheck, IconSpinner } from '@/components/Icons';
import { notifyAdminEvent } from '@/lib/notifyAdmin';

export default function NewsletterSignup({ variant = 'footer', source = 'footer' }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('ambos');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError(t('newsletter.signup.invalidEmail'));
      return;
    }
    setStatus('loading');
    setError('');

    try {
      // Comprobar si ya existe
      const existing = await base44.entities.NewsletterSubscriber.filter({ email: email.toLowerCase() });
      if (existing.length > 0) {
        if (existing[0].status === 'unsubscribed') {
          await base44.entities.NewsletterSubscriber.update(existing[0].id, {
            status: 'confirmed',
            unsubscribed_at: null,
            confirmed_at: new Date().toISOString()
          });
          setStatus('success');
          return;
        }
        setError(t('newsletter.signup.alreadySubscribed'));
        setStatus('error');
        return;
      }

      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const unsubToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const lang = document.documentElement.lang || localStorage.getItem('i18nextLng') || 'es';

      // { devolverFila: false }: la policy `ns_create` deja insertar a
      // cualquiera, pero `ns_read` exige `is_admin()`. `.create()` hacía
      // `insert().select().single()`, así que la fila ENTRABA y la lectura
      // de vuelta devolvía 401; el adaptador lanzaba, el catch lo daba por
      // un fallo de alta y el visitante veía un error. `newsletter_subscribers`
      // tiene 0 filas después de meses en línea por esto. Es el mismo fallo
      // que tenía /contacto.
      await base44.entities.NewsletterSubscriber.create({
        email: email.toLowerCase().trim(),
        status: 'confirmed',
        language: lang.startsWith('en') ? 'en' : 'es',
        source,
        user_type_interest: userType,
        confirmation_token: token,
        unsubscribe_token: unsubToken,
        confirmed_at: new Date().toISOString(),
        tags: []
      }, { devolverFila: false });

      // Fire-and-forget welcome email
      try {
        await base44.functions.invoke('sendNewsletterWelcome', {
          email,
          language: lang.startsWith('en') ? 'en' : 'es',
          unsubToken
        });
      } catch {}

      // Notificar admin
      notifyAdminEvent({
        event: 'newsletter_signup',
        title: '📧 Nuevo suscriptor newsletter (formulario)',
        body: `<strong>${email}</strong> se ha suscrito como <em>${userType}</em> desde el formulario.`,
        data: { email, userType, source },
        userEmail: email
      });

      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error(err);
      setError(t('newsletter.signup.error'));
      setStatus('error');
    }
  };

  if (variant === 'footer') {
    return (
      <div>
        <h4 className="text-sm font-semibold text-white mb-2">{t('newsletter.signup.footerTitle')}</h4>
        <p className="text-xs text-gray-400 mb-3">{t('newsletter.signup.footerSubtitle')}</p>

        {status === 'success' ? (
          <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-green-400">
            <IconCheck className="w-4 h-4 flex-shrink-0" />
            <span>{t('newsletter.signup.thanks')}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
              required
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-surface text-ink text-sm font-medium px-4 py-2 rounded-lg hover:bg-soft disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
            >
              {status === 'loading' ? <IconSpinner className="w-4 h-4 animate-spin" /> : t('newsletter.signup.button')}
            </button>
          </form>
        )}
        {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
        <p className="text-[10px] text-gray-500 mt-2">{t('newsletter.signup.consent')}</p>
      </div>
    );
  }

  // Variant 'blog'
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <IconMail className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg">{t('newsletter.signup.blogTitle')}</h3>
          <p className="text-sm text-blue-100 mt-0.5">{t('newsletter.signup.blogSubtitle')}</p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="bg-white/10 rounded-lg px-4 py-3 flex items-center gap-2">
          <IconCheck className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{t('newsletter.signup.thanks')}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white min-w-0"
              required
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-surface text-c-accent text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-soft disabled:opacity-50 whitespace-nowrap flex-shrink-0"
            >
              {status === 'loading' ? <IconSpinner className="w-4 h-4 animate-spin" /> : t('newsletter.signup.button')}
            </button>
          </div>
          <div className="flex gap-4 text-xs flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name={`ut-${source}`} checked={userType === 'autonomo'} onChange={() => setUserType('autonomo')} className="accent-white" />
              {t('nav.iAmPro')}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name={`ut-${source}`} checked={userType === 'cliente'} onChange={() => setUserType('cliente')} className="accent-white" />
              {t('nav.sign_up_client')}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name={`ut-${source}`} checked={userType === 'ambos'} onChange={() => setUserType('ambos')} className="accent-white" />
              {t('newsletter.signup.both')}
            </label>
          </div>
        </form>
      )}
      {error && <p className="text-xs text-red-200 mt-1.5">{error}</p>}
      <p className="text-[10px] text-blue-200 mt-3">{t('newsletter.signup.consent')}</p>
    </div>
  );
}
