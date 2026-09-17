import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { defaultDestinationFor, isProfessional } from '@/lib/roles';
import {
  IconSpinner,
  IconMail,
  IconLock,
  IconUser,
  IconEye,
  IconEyeOff,
  IconBriefcase,
  IconSearch,
  IconShield,
  IconApple,
} from '@/components/Icons';
import { signInWithGoogle, signInWithApple, emailRedirectFor, passwordResetRedirect, isNative, isIOS } from '@/lib/native/auth';
import { useTranslation } from 'react-i18next';

const MODES = { SIGN_IN: 'signin', SIGN_UP: 'signup' };
const ROLES = { PROFESIONAL: 'profesional', CLIENTE: 'cliente' };
// Lockup de marca: va literal (no se traduce), en dos tonos.
const BRAND = { prefix: 'mis', suffix: 'autónomos' };

// Traduce los errores típicos de Supabase a un mensaje claro en el idioma
// del usuario. Recibe `t` porque vive fuera del componente.
function authErrorMessage(t, error) {
  const raw = (error?.message || '').toLowerCase();
  if (!raw) return t('auth.errors.generic');
  if (raw.includes('invalid login credentials') || raw.includes('invalid email or password')) {
    return t('auth.errors.invalidCredentials');
  }
  if (raw.includes('email not confirmed')) {
    return t('auth.errors.emailNotConfirmed');
  }
  if (raw.includes('user already registered') || raw.includes('already registered') || raw.includes('already been registered')) {
    return t('auth.errors.alreadyRegistered');
  }
  if (raw.includes('password should be at least')) {
    return t('auth.errors.passwordTooShort');
  }
  if (raw.includes('rate limit') || raw.includes('too many')) {
    return t('auth.errors.rateLimit');
  }
  if (raw.includes('unable to validate email')) {
    return t('auth.errors.invalidEmail');
  }
  return error?.message || t('auth.errors.generic');
}

// Destino post-registro según el rol elegido en la pestaña Crear cuenta.
function defaultDestinationForRole(role) {
  if (role === ROLES.PROFESIONAL) return '/completar-perfil';
  return '/buscar';
}

// Destino post-login del usuario YA existente.
// Devuelve { dest, user } para que el caller pueda hacer fallbacks.
async function defaultDestinationForCurrentUser() {
  try {
    const u = await base44.auth.me();
    if (!u) return '/buscar';
    // Para profesional comprobamos si tiene ficha completada; si no, alta.
    if (isProfessional(u)) {
      try {
        const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: u.id });
        const has = Array.isArray(profiles) && profiles[0]?.onboarding_completed === true;
        return defaultDestinationFor(u, { hasProfessionalProfile: has });
      } catch (_e) {
        return defaultDestinationFor(u, { hasProfessionalProfile: null });
      }
    }
    return defaultDestinationFor(u);
  } catch (_e) {
    return '/buscar';
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const { t } = useTranslation();

  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const nextUrl = useMemo(() => {
    const next = urlParams.get('next');
    if (!next) return null;
    try {
      const parsed = new URL(next, window.location.origin);
      if (parsed.origin !== window.location.origin) return null;
      if (parsed.pathname === '/login') return null;
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (_e) {
      return null;
    }
  }, [urlParams]);

  // Lee ?mode=signup y ?role= para abrir directamente la pestaña correcta
  // (lo usan los CTA "Hazte autónomo" y "Soy cliente" desde la cabecera).
  const initialMode = urlParams.get('mode') === 'signup' ? MODES.SIGN_UP : MODES.SIGN_IN;
  const initialRoleRaw = (urlParams.get('role') || '').toLowerCase();
  const initialRole = initialRoleRaw === 'cliente' || initialRoleRaw === 'client'
    ? ROLES.CLIENTE
    : ROLES.PROFESIONAL;

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  // Cuando la URL trae ?role= (típicamente porque venimos de un CTA
  // "Hazte autónomo · Gratis"), evitamos el paso extra de "elegir rol":
  // ocultamos la selección visual y el usuario ve directamente Google + email.
  const rolePreselected = Boolean(urlParams.get('role'));

  // Si el usuario ya está autenticado al entrar a /login (típico de un cliente
  // que pulsa "Hazte autónomo" en /para-autonomos), no le hacemos rellenar el
  // formulario de signup contra su propio email: le mandamos directamente al
  // destino que pidió (?next=) o al destino por defecto según su tipo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const dest = nextUrl || await defaultDestinationForCurrentUser();
        if (!cancelled) navigate(dest, { replace: true });
      } catch (_e) {
        // sin sesión válida → seguir mostrando la pantalla de login normal
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, nextUrl]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isSignIn = mode === MODES.SIGN_IN;

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email || !password) {
      setError(t('auth.validation.emailAndPassword'));
      return;
    }
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(authErrorMessage(t,signInError));
        return;
      }
      await refreshUser();
      const dest = nextUrl || await defaultDestinationForCurrentUser();
      navigate(dest, { replace: true });
    } catch (err) {
      setError(authErrorMessage(t,err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!name.trim()) {
      setError(t('auth.validation.nameRequired'));
      return;
    }
    if (!email) {
      setError(t('auth.validation.emailRequired'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('auth.errors.passwordTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim(), role },
          emailRedirectTo: emailRedirectFor('/completar-perfil'),
        },
      });
      if (signUpError) {
        setError(authErrorMessage(t,signUpError));
        return;
      }
      if (data?.session) {
        await refreshUser();
        navigate(nextUrl || defaultDestinationForRole(role), { replace: true });
        return;
      }
      // Sin sesión inmediata → Supabase exige confirmación por email.
      // Enviamos al usuario a la pantalla dedicada (contador + reenviar).
      navigate(`/confirma-email?email=${encodeURIComponent(email.trim())}`, { replace: true });
    } catch (err) {
      setError(authErrorMessage(t,err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setInfo('');
    if (!email) {
      setError(t('auth.validation.emailForReset'));
      return;
    }
    setResetting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordResetRedirect(),
      });
      if (resetError) {
        setError(authErrorMessage(t,resetError));
        return;
      }
      setInfo(t('auth.reset.sent'));
    } catch (err) {
      setError(authErrorMessage(t,err));
    } finally {
      setResetting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        setError(authErrorMessage(t,res.error));
        setGoogleLoading(false);
      }
      // En nativo el resultado llega por deep-link; el AuthStateChange redirige.
    } catch (err) {
      setError(authErrorMessage(t,err));
      setGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    setError('');
    setInfo('');
    setAppleLoading(true);
    try {
      const res = await signInWithApple();
      if (res?.error) {
        setError(authErrorMessage(t,res.error));
        setAppleLoading(false);
        return;
      }
      // En iOS nativo el signInWithIdToken devuelve session directa: refrescamos.
      if (res?.data?.session) {
        await refreshUser();
        const dest = nextUrl || await defaultDestinationForCurrentUser();
        navigate(dest, { replace: true });
      }
    } catch (err) {
      const raw = String(err?.message || err || '');
      // El usuario cancela la hoja de SIWA: no lo tratamos como error.
      if (raw.includes('canceled') || raw.includes('cancelled') || err?.code === '1001') {
        setAppleLoading(false);
        return;
      }
      setError(authErrorMessage(t,err));
      setAppleLoading(false);
    }
  };

  const primarySignUpLabel = role === ROLES.PROFESIONAL
    ? t('auth.signup.asPro')
    : t('auth.signup.asClient');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-start sm:items-center justify-center px-4 py-3 sm:py-12">
      <div className="w-full max-w-md">
        {/* Cabecera con lockup — compacta en móvil para que el CTA de Google
            entre en el primer viewport (390×844). */}
        <div className="flex flex-col items-center text-center mb-3 sm:mb-6">
          <Link to="/" className="inline-flex items-center gap-2 sm:gap-3 group">
            <img
              src="/logo-192.png"
              alt=""
              width="32"
              height="32"
              className="rounded-[8px] shadow-sm sm:w-[38px] sm:h-[38px]"
              style={{ width: 32, height: 32 }}
            />
            <span className="text-[22px] sm:text-[26px] leading-none tracking-tight">
              <span className="notranslate" translate="no" style={{ display: 'contents' }}>
                <span style={{ color: '#00255C', fontWeight: 500 }}>{BRAND.prefix}</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{BRAND.suffix}</span>
              </span>
            </span>
          </Link>
          <p className="hidden sm:block mt-3 text-sm text-c-muted">
            {t('auth.tagline')}
          </p>
        </div>

        {/* Tarjeta principal */}
        <div className="card rounded-2xl shadow-sm p-4 sm:p-7">
          {/* Segmented control */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-xl mb-3 sm:mb-6">
            <button
              type="button"
              aria-pressed={isSignIn}
              onClick={() => switchMode(MODES.SIGN_IN)}
              className={`text-sm font-medium py-2 rounded-lg transition ${
                isSignIn
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-c-muted hover:text-ink'
              }`}
            >
              {t('nav.login')}
            </button>
            <button
              type="button"
              aria-pressed={!isSignIn}
              onClick={() => switchMode(MODES.SIGN_UP)}
              className={`text-sm font-medium py-2 rounded-lg transition ${
                !isSignIn
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-c-muted hover:text-ink'
              }`}
            >
              {t('auth.signup.tab')}
            </button>
          </div>

          {/* Selector de rol — solo en Crear cuenta y solo si el usuario NO
              llega ya con ?role=. Si viene de un CTA "Hazte autónomo · Gratis"
              (o "Soy cliente"), evitamos ese clic extra y le mostramos Google
              + email directamente. */}
          {!isSignIn && !rolePreselected && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-ink mb-3">{t('auth.role.title')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  active={role === ROLES.PROFESIONAL}
                  onClick={() => setRole(ROLES.PROFESIONAL)}
                  icon={<IconBriefcase size={20} />}
                  title={t('nav.iAmPro')}
                  subtitle={t('auth.role.proSubtitle')}
                />
                <RoleCard
                  active={role === ROLES.CLIENTE}
                  onClick={() => setRole(ROLES.CLIENTE)}
                  icon={<IconSearch size={20} />}
                  title={t('auth.role.client')}
                  subtitle={t('auth.role.clientSubtitle')}
                />
              </div>
            </div>
          )}
          {!isSignIn && rolePreselected && (
            <p className="text-xs text-c-muted mb-4 text-center">
              {role === ROLES.PROFESIONAL
                ? t('auth.role.preselectedPro')
                : t('auth.role.preselectedClient')}{' '}
              <button
                type="button"
                onClick={() => setRole(role === ROLES.PROFESIONAL ? ROLES.CLIENTE : ROLES.PROFESIONAL)}
                className="text-c-accent hover:underline font-medium"
              >
                {t('auth.role.switch')}
              </button>
            </p>
          )}

          {/* Botones sociales — arriba, atajos más rápidos en móvil.
              En iOS nativo mostramos Sign in with Apple como primer botón
              (compliance App Store §4.8: si ofreces cualquier otro OAuth,
              debes ofrecer también SIWA cuando la plataforma lo soporta). */}
          {isIOS() && isNative() && (
            <button
              type="button"
              onClick={handleApple}
              disabled={appleLoading || googleLoading || submitting}
              className="btn w-full rounded-xl text-white font-semibold mb-2"
              style={{ backgroundColor: '#000000' }}
            >
              {appleLoading ? (
                <><IconSpinner size={16} /> {t('auth.social.connecting')}</>
              ) : (
                <>
                  <IconApple size={16} />
                  <span>{isSignIn ? t('auth.social.continueApple') : t('auth.social.signupApple')}</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || appleLoading || submitting}
            className="btn-secondary w-full rounded-xl hover:bg-soft font-medium mb-4"
          >
            {googleLoading ? (
              <><IconSpinner size={16} /> {t('auth.social.connecting')}</>
            ) : (
              <>
                <GoogleIcon />
                <span>{isSignIn ? t('auth.continue_with_google') : t('auth.social.signupGoogle')}</span>
              </>
            )}
          </button>

          {/* Separador */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-c-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-3 text-c-muted">{isSignIn ? t('auth.separator.signIn') : t('auth.separator.signUp')}</span>
            </div>
          </div>

          <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-4" noValidate>
            {!isSignIn && (
              <div>
                <label className="label" htmlFor="name">{t('auth.name')}</label>
                <div className="relative mt-1">
                  <IconUser size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-c-muted" />
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.name_placeholder')}
                    className="input pl-9"
                    disabled={submitting}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">{t('auth.email')}</label>
              <div className="relative mt-1">
                <IconMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-c-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint={isSignIn ? 'go' : 'next'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email_placeholder')}
                  className="input pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="password">{t('auth.password')}</label>
                {isSignIn && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetting || submitting}
                    className="text-xs text-c-accent hover:text-accent-hover hover:underline disabled:opacity-50"
                  >
                    {resetting ? t('auth.reset.sending') : t('auth.reset.link')}
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-c-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  enterKeyHint="go"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignIn ? t('auth.passwordPlaceholder') : t('auth.passwordMinPlaceholder')}
                  className="input pl-9 pr-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-c-muted hover:text-ink"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  tabIndex={-1}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {info && !error && (
              <div role="status" className="text-sm text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn w-full text-white font-semibold rounded-xl"
              style={{ backgroundColor: '#0f172a' }}
            >
              {submitting ? (
                <><IconSpinner size={16} /> {isSignIn ? t('auth.submitting.signIn') : t('auth.submitting.signUp')}</>
              ) : (
                isSignIn ? t('nav.login') : primarySignUpLabel
              )}
            </button>
          </form>

        </div>

        {/* Pie */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-c-muted">
            <IconShield size={14} className="text-c-muted" />
            {t('auth.footer.trust')}
          </p>
          <p className="text-xs text-c-muted">
            {isSignIn ? (
              <>{t('auth.footer.noAccount')}{' '}
                <button type="button" onClick={() => switchMode(MODES.SIGN_UP)} className="text-c-accent hover:underline font-medium">
                  {t('auth.footer.createOne')}
                </button>
              </>
            ) : (
              <>{t('auth.footer.haveAccount')}{' '}
                <button type="button" onClick={() => switchMode(MODES.SIGN_IN)} className="text-c-accent hover:underline font-medium">
                  {t('auth.login_title')}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left rounded-xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        active
          ? 'bg-blue-50/60 shadow-sm'
          : 'bg-surface hover:border-slate-300 hover:bg-soft'
      }`}
      style={active ? { borderColor: '#1E3A8A', borderWidth: 2, padding: '11px', '--tw-ring-color': '#1E3A8A' } : { borderColor: '#e2e8f0' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{
            backgroundColor: active ? '#1E3A8A' : '#f1f5f9',
            color: active ? '#fff' : '#475569',
          }}
        >
          {icon}
        </span>
        <span className={`text-sm font-semibold ${active ? 'text-ink' : 'text-slate-800'}`}>{title}</span>
      </div>
      <p className="mt-2 text-xs text-c-muted leading-snug">{subtitle}</p>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.69-3.9 2.69-6.61z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.97v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.97A9 9 0 0 0 0 9c0 1.45.35 2.83.97 4.04l3-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .97 4.96l3 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}
