import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { supabase } from '@/api/supabaseClient';
import { IconMail, IconRefresh, IconCheckCircle, IconArrowLeft, IconSpinner } from '@/components/Icons';
import { emailRedirectFor } from '@/lib/native/auth';

// Pantalla intermedia entre signup y onboarding cuando Supabase exige
// confirmar el correo. Reemplaza el antiguo "info toast" que dejaba al
// usuario en un dead-end silencioso.
export default function ConfirmEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const email = params.get('email') || '';

  const [cooldown, setCooldown] = useState(30);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(''); // '', 'ok', 'error'
  const [message, setMessage] = useState('');

  // Cuenta atrás del botón "Reenviar".
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setStatus('');
    setMessage('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: emailRedirectFor('/completar-perfil') },
      });
      if (error) throw error;
      setStatus('ok');
      setMessage(t('auth.confirmEmail.resent'));
      setCooldown(30);
    } catch (e) {
      setStatus('error');
      setMessage(e?.message || t('auth.confirmEmail.resendError'));
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        navigate('/completar-perfil', { replace: true });
        return;
      }
      setStatus('error');
      setMessage(t('auth.confirmEmail.notConfirmedYet'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/login?mode=signup', { replace: true })}
          className="mb-4 inline-flex items-center gap-1 text-sm text-c-muted hover:text-ink"
        >
          <IconArrowLeft className="w-4 h-4" />
          {t('auth.confirmEmail.changeEmail')}
        </button>

        <div className="bg-surface border border-c-border rounded-2xl shadow-sm p-6 sm:p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-c-accent/5 flex items-center justify-center mb-4">
            <IconMail className="w-7 h-7 text-c-accent" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-ink mb-2">{t('auth.confirmEmail.title')}</h1>
          <p className="text-sm text-c-muted mb-1">
            {t('auth.confirmEmail.sentTo')}
          </p>
          {email ? (
            <p className="text-sm font-semibold text-ink mb-4 break-all">{email}</p>
          ) : (
            <p className="text-sm text-c-muted mb-4">{t('auth.confirmEmail.yourEmail')}</p>
          )}

          <div className="text-left bg-soft border border-c-border rounded-xl p-4 text-sm text-c-muted mb-5">
            <p className="mb-2 font-medium text-ink">{t('auth.confirmEmail.howToContinue')}</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li><Trans i18nKey="auth.confirmEmail.stepOpen" components={{ strong: <strong /> }} /></li>
              <li><Trans i18nKey="auth.confirmEmail.stepClick" components={{ strong: <strong /> }} /></li>
              <li>{t('auth.confirmEmail.stepReturn')}</li>
            </ol>
            <p className="mt-3 text-xs text-c-muted">
              <Trans i18nKey="auth.confirmEmail.spamHint" components={{ strong: <strong /> }} />
            </p>
          </div>

          {status === 'ok' && (
            <div className="mb-4 text-sm text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
              {message}
            </div>
          )}
          {status === 'error' && (
            <div className="mb-4 text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="btn-dark w-full font-semibold rounded-xl mb-3"
          >
            {checking ? (
              <><IconSpinner className="w-4 h-4 mr-2 animate-spin" /> {t('auth.confirmEmail.checking')}</>
            ) : (
              <><IconCheckCircle className="w-4 h-4 mr-2" /> {t('auth.confirmEmail.confirmed')}</>
            )}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
            className="btn-secondary w-full rounded-xl font-medium"
          >
            {resending ? (
              <><IconSpinner className="w-4 h-4 mr-2 animate-spin" /> {t('auth.confirmEmail.resending')}</>
            ) : cooldown > 0 ? (
              <>{t('auth.confirmEmail.resendIn', { seconds: cooldown })}</>
            ) : (
              <><IconRefresh className="w-4 h-4 mr-2" /> {t('auth.confirmEmail.resend')}</>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-c-muted mt-6">
          {t('auth.footer.haveAccount')}{' '}
          <Link to="/login" className="text-c-accent hover:underline font-medium">
            {t('auth.login_title')}
          </Link>
        </p>
      </div>
    </div>
  );
}
