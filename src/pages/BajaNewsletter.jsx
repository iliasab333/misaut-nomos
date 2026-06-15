import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

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
        setMsg(err?.message || 'Error');
        setState(STATE.error);
      }
    })();
  }, [token]);

  const panelByState = () => {
    switch (state) {
      case STATE.loading:
        return {
          icon: <Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} />,
          title: 'Procesando tu baja…',
          body: 'Un momento.',
        };
      case STATE.success:
        return {
          icon: <CheckCircle2 className="w-7 h-7" style={{ color: NAVY }} />,
          title: 'Te has dado de baja',
          body: email
            ? `Ya no recibirás más emails de la newsletter en ${email}.`
            : 'Ya no recibirás más emails de la newsletter.',
        };
      case STATE.already:
        return {
          icon: <CheckCircle2 className="w-7 h-7 text-emerald-600" />,
          title: 'Ya estabas dado de baja',
          body: email
            ? `${email} no recibe nuestra newsletter.`
            : 'Tu email ya no recibe nuestra newsletter.',
        };
      case STATE.not_found:
        return {
          icon: <AlertCircle className="w-7 h-7 text-amber-600" />,
          title: 'Enlace no válido',
          body: 'No hemos encontrado este enlace de baja. Puede que ya haya caducado.',
        };
      case STATE.no_token:
        return {
          icon: <AlertCircle className="w-7 h-7 text-amber-600" />,
          title: 'Falta el token',
          body: 'Este enlace de baja no incluye el identificador. Usa el enlace del email que recibiste.',
        };
      case STATE.error:
      default:
        return {
          icon: <AlertCircle className="w-7 h-7 text-rose-600" />,
          title: 'Algo ha fallado',
          body: msg || 'No hemos podido procesar tu baja. Vuelve a intentarlo o escríbenos a hola@misautonomos.es.',
        };
    }
  };
  const { icon, title, body } = panelByState();

  return (
    <>
      <SEOHead title="Baja de newsletter · MisAutónomos" noindex />
      <main className="min-h-screen bg-white text-slate-900">
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
          <p className="mt-3 text-slate-600 max-w-md mx-auto leading-relaxed">{body}</p>

          {(state === STATE.success || state === STATE.already) && (
            <p className="mt-2 text-xs text-slate-500">
              ¿Te diste de baja por error? Puedes volver a suscribirte cuando quieras desde el footer.
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-semibold text-white"
              style={{ background: NAVY }}
            >
              Volver al inicio
            </Link>
            <Link
              to="/contacto"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Contactar
            </Link>
          </div>

          <p className="mt-10 text-[11px] text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1.5" style={{ background: GOLD }} />
            misAutónomos · hola@misautonomos.es
          </p>
        </section>
      </main>
    </>
  );
}
