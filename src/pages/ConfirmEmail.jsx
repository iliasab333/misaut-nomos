import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { emailRedirectFor } from '@/lib/native/auth';

// Pantalla intermedia entre signup y onboarding cuando Supabase exige
// confirmar el correo. Reemplaza el antiguo "info toast" que dejaba al
// usuario en un dead-end silencioso.
export default function ConfirmEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();

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
      setMessage('Te hemos reenviado el email. Revisa tu bandeja (y la carpeta de Promociones o Spam).');
      setCooldown(30);
    } catch (e) {
      setStatus('error');
      setMessage(e?.message || 'No hemos podido reenviar el email. Inténtalo de nuevo en un minuto.');
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
      setMessage('Aún no vemos tu confirmación. Abre el email y pulsa el botón; después vuelve aquí.');
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
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Cambiar de email
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Mail className="w-7 h-7 text-blue-700" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Confirma tu email</h1>
          <p className="text-sm text-slate-600 mb-1">
            Te hemos enviado un enlace a
          </p>
          {email ? (
            <p className="text-sm font-semibold text-slate-900 mb-4 break-all">{email}</p>
          ) : (
            <p className="text-sm text-slate-500 mb-4">tu correo electrónico</p>
          )}

          <div className="text-left bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 mb-5">
            <p className="mb-2 font-medium text-slate-800">Cómo continuar:</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Abre el email de <strong>MisAutónomos</strong>.</li>
              <li>Pulsa el botón <strong>"Confirmar mi cuenta"</strong>.</li>
              <li>Volverás aquí y podrás publicar tu perfil.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              ¿No lo ves? Revisa la carpeta <strong>Promociones</strong> o <strong>Spam</strong>. A veces tarda hasta 2 minutos en llegar.
            </p>
          </div>

          {status === 'ok' && (
            <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {message}
            </div>
          )}
          {status === 'error' && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <Button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="w-full h-11 text-white font-semibold rounded-xl mb-3"
            style={{ backgroundColor: '#0f172a' }}
          >
            {checking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Comprobando…</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Ya lo he confirmado</>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
            className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
          >
            {resending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reenviando…</>
            ) : cooldown > 0 ? (
              <>Reenviar el email en {cooldown} s</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Reenviar el email</>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-blue-700 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
