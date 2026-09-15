import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { defaultDestinationFor, isProfessional } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, Briefcase, Search as SearchIcon, ShieldCheck, Apple } from 'lucide-react';
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
          <p className="hidden sm:block mt-3 text-sm text-slate-500">
            {t('auth.tagline')}
          </p>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-7">
          {/* Segmented control */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-3 sm:mb-6">
            <button
              type="button"
              onClick={() => switchMode(MODES.SIGN_IN)}
              className={`text-sm font-medium py-2 rounded-lg transition ${
                isSignIn
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('nav.login')}
            </button>
            <button
              type="button"
              onClick={() => switchMode(MODES.SIGN_UP)}
              className={`text-sm font-medium py-2 rounded-lg transition ${
                !isSignIn
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
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
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('auth.role.title')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  active={role === ROLES.PROFESIONAL}
                  onClick={() => setRole(ROLES.PROFESIONAL)}
                  icon={<Briefcase className="w-5 h-5" />}
                  title={t('nav.iAmPro')}
                  subtitle={t('auth.role.proSubtitle')}
                />
                <RoleCard
                  active={role === ROLES.CLIENTE}
                  onClick={() => setRole(ROLES.CLIENTE)}
                  icon={<SearchIcon className="w-5 h-5" />}
                  title={t('auth.role.client')}
                  subtitle={t('auth.role.clientSubtitle')}
                />
              </div>
            </div>
          )}
          {!isSignIn && rolePreselected && (
            <p className="text-xs text-slate-500 mb-4 text-center">
              {role === ROLES.PROFESIONAL
                ? t('auth.role.preselectedPro')
                : t('auth.role.preselectedClient')}{' '}
              <button
                type="button"
                onClick={() => setRole(role === ROLES.PROFESIONAL ? ROLES.CLIENTE : ROLES.PROFESIONAL)}
                className="text-blue-700 hover:underline font-medium"
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
            <Button
              type="button"
              onClick={handleApple}
              disabled={appleLoading || googleLoading || submitting}
              className="w-full h-11 rounded-xl text-white font-semibold mb-2"
              style={{ backgroundColor: '#000000' }}
            >
              {appleLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.social.connecting')}</>
              ) : (
                <>
                  <Apple className="w-4 h-4 mr-2" />
                  <span>{isSignIn ? t('auth.social.continueApple') : t('auth.social.signupApple')}</span>
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={googleLoading || appleLoading || submitting}
            className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-medium mb-4"
          >
            {googleLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.social.connecting')}</>
            ) : (
              <>
                <GoogleIcon />
                <span className="ml-2">{isSignIn ? t('auth.continue_with_google') : t('auth.social.signupGoogle')}</span>
              </>
            )}
          </Button>

          {/* Separador */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">{isSignIn ? t('auth.separator.signIn') : t('auth.separator.signUp')}</span>
            </div>
          </div>

          <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-4" noValidate>
            {!isSignIn && (
              <div>
                <Label htmlFor="name" className="text-slate-700">{t('auth.name')}</Label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.name_placeholder')}
                    className="pl-9 h-11"
                    disabled={submitting}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-slate-700">{t('auth.email')}</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
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
                  className="pl-9 h-11"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700">{t('auth.password')}</Label>
                {isSignIn && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetting || submitting}
                    className="text-xs text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-50"
                  >
                    {resetting ? t('auth.reset.sending') : t('auth.reset.link')}
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  enterKeyHint="go"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignIn ? t('auth.passwordPlaceholder') : t('auth.passwordMinPlaceholder')}
                  className="pl-9 pr-10 h-11"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {info && !error && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {info}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-white font-semibold rounded-xl"
              style={{ backgroundColor: '#0f172a' }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isSignIn ? t('auth.submitting.signIn') : t('auth.submitting.signUp')}</>
              ) : (
                isSignIn ? t('nav.login') : primarySignUpLabel
              )}
            </Button>
          </form>

        </div>

        {/* Pie */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            {t('auth.footer.trust')}
          </p>
          <p className="text-xs text-slate-500">
            {isSignIn ? (
              <>{t('auth.footer.noAccount')}{' '}
                <button onClick={() => switchMode(MODES.SIGN_UP)} className="text-blue-700 hover:underline font-medium">
                  {t('auth.footer.createOne')}
                </button>
              </>
            ) : (
              <>{t('auth.footer.haveAccount')}{' '}
                <button onClick={() => switchMode(MODES.SIGN_IN)} className="text-blue-700 hover:underline font-medium">
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
          : 'bg-white hover:border-slate-300 hover:bg-slate-50'
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
        <span className={`text-sm font-semibold ${active ? 'text-slate-900' : 'text-slate-800'}`}>{title}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500 leading-snug">{subtitle}</p>
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
