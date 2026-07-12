import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  BadgeCheck,
  Clock3,
  MessageSquare,
  Wallet,
  Megaphone,
  Star,
  ArrowRight,
  Check,
} from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: 'Identidad verificada',
    body: 'Validamos DNI/NIE, teléfono y oficio antes de publicar tu perfil. Los clientes confían más y respondes a peticiones reales.',
  },
  {
    icon: Wallet,
    title: 'Sin comisiones por trabajo',
    body: 'Negocias y cobras directamente. No nos llevamos un porcentaje del presupuesto ni cobramos por contacto.',
  },
  {
    icon: MessageSquare,
    title: 'Contacto directo',
    body: 'Chat, teléfono y WhatsApp. El cliente decide cómo escribirte. Sin intermediarios.',
  },
  {
    icon: Megaphone,
    title: 'Te promocionamos',
    body: 'Invertimos en publicidad en redes y Google para llevarte clientes en tu zona. Sin coste para ti.',
  },
  {
    icon: Star,
    title: 'Reseñas verificadas',
    body: 'Solo opinan los clientes que te han contactado. Subes en posicionamiento con cada reseña real.',
  },
  {
    icon: Clock3,
    title: 'Perfil activo en minutos',
    body: 'Te das de alta en menos de 10 minutos. Sin permanencia, sin tarjeta hasta que tú decidas.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Crea tu cuenta',
    body: 'Email y contraseña. Eliges el rol "Soy autónomo" y entras directo al alta de perfil.',
  },
  {
    n: '02',
    title: 'Completa tu perfil',
    body: 'Servicios, zona, precios orientativos, fotos de trabajos. Verificamos tu identidad y publicamos.',
  },
  {
    n: '03',
    title: 'Recibe clientes',
    body: 'Apareces en /categoria/<oficio>-en-<ciudad>. Los clientes te escriben por chat, teléfono o WhatsApp.',
  },
];

const FAQS = [
  {
    q: '¿Cuánto cuesta?',
    a: 'Hay un plan gratuito permanente para empezar. Los planes Pro y Ads+ añaden visibilidad y herramientas; sin permanencia.',
  },
  {
    q: '¿Qué significa "verificado"?',
    a: 'Comprobamos DNI/NIE, teléfono y oficio. Cuando lo pasas se muestra una insignia visible en tu perfil y en los resultados.',
  },
  {
    q: '¿Qué pasa si recibo malas reseñas?',
    a: 'Las reseñas vienen de clientes que te han contactado. Si acumulas tres reseñas negativas verificadas, el perfil se desactiva automáticamente.',
  },
  {
    q: '¿Puedo darme de baja?',
    a: 'Sí, cuando quieras desde tu panel. No tenemos permanencia ni penalizaciones.',
  },
];

// /registro (UserTypeSelection) decide automáticamente:
//   - no logueado → /login?mode=signup&role=profesional&next=/completar-perfil
//   - logueado como cliente o sin user_type → /completar-perfil
//   - logueado como profesional con ficha → /dashboard
// Así los CTAs funcionan tanto para visitantes nuevos como para clientes que
// quieren hacerse profesionales sin tener que volver a "iniciar sesión".
const CTA_HREF = '/registro?tipo=autonomo';

export default function ParaAutonomos() {
  return (
    <>
      <SEOHead
        title="Hazte autónomo en MisAutónomos — Aparece en tu zona, sin comisiones"
        description="Gana visibilidad como autónomo en España. Identidad verificada, contacto directo con clientes y cero comisiones por trabajo."
        keywords="autónomos, profesionales, alta autónomo, conseguir clientes, sin comisiones"
      />

      <main className="bg-white text-slate-900">
        {/* HERO */}
        <section className="relative" style={{ background: '#FBFCFE' }}>
          <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(0,37,92,0.06)', color: NAVY }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Para autónomos en España
            </div>

            <h1
              className="mt-5 font-semibold tracking-tight"
              style={{ color: NAVY, fontSize: 'clamp(2.1rem, 5.6vw, 3.5rem)', lineHeight: 1.06, letterSpacing: '-0.025em' }}
            >
              Aparece donde te busca tu cliente.{' '}
              <span style={{ color: GOLD }}>Sin comisiones.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-slate-600 text-[17px] md:text-lg leading-relaxed">
              MisAutónomos te pone delante de quien necesita tu oficio en tu zona. Contacto directo, identidad verificada,
              herramientas para llevar tu agenda. Tú trabajas; nosotros te traemos clientes.
            </p>

            <div className="mt-8 flex">
              <Link
                to={CTA_HREF}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-semibold text-[15px] transition-colors"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                Hazte autónomo · Gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5" style={{ color: NAVY }} />Identidad verificada</span>
              <span className="inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" style={{ color: NAVY }} />Sin comisiones</span>
              <span className="inline-flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" style={{ color: NAVY }} />Contacto directo</span>
            </div>
          </div>
        </section>

        {/* BENEFICIOS — banda gris suave */}
        <section style={{ background: 'hsl(var(--brand-surface))' }}>
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">Por qué autónomos eligen MisAutónomos</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl">
              Lo que hace bien una plataforma para autónomos.
            </p>

            <div className="mt-10 grid gap-4 md:gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-2xl bg-white border border-slate-200 p-5">
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA — banda blanca */}
        <section className="bg-white">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">Cómo funciona</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl">
              Tres pasos. Sin trampa.
            </p>

            <ol className="mt-10 grid gap-4 md:gap-5 md:grid-cols-3">
              {STEPS.map(({ n, title, body }) => (
                <li key={n} className="rounded-2xl border border-slate-200 p-5">
                  <span className="text-xs font-semibold tracking-[0.12em]" style={{ color: GOLD }}>{n}</span>
                  <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* COMPARATIVA HONESTA — banda gris muy suave */}
        <section style={{ background: 'hsl(var(--brand-surface))' }}>
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">Diferencias con otras plataformas</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl">
              Lo que NO hacemos.
            </p>

            <ul className="mt-8 grid gap-3 md:gap-4 md:grid-cols-2">
              {[
                'No cobramos por cada contacto recibido.',
                'No nos llevamos un porcentaje del presupuesto.',
                'No vendemos tus datos.',
                'No permitimos reseñas anónimas o sin verificar.',
                'No te bloqueamos si decides darte de baja.',
                'No prometemos clientes que no podemos traer.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 rounded-2xl bg-white border border-slate-200 p-4">
                  <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0" style={{ background: 'rgba(0,37,92,0.08)' }}>
                    <Check className="w-3.5 h-3.5" style={{ color: NAVY }} />
                  </span>
                  <span className="text-sm text-slate-700">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ — banda blanca */}
        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">Preguntas frecuentes</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900">Lo que nos suelen preguntar.</p>

            <dl className="mt-8 space-y-3">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group rounded-2xl border border-slate-200 bg-white">
                  <summary className="list-none cursor-pointer p-5 flex items-center justify-between gap-4 font-semibold text-slate-900 text-[15px]">
                    {q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-slate-600 text-sm leading-relaxed">{a}</p>
                </details>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA FINAL — banda navy */}
        <section style={{ background: NAVY }}>
          <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center text-white">
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'clamp(1.7rem, 4.4vw, 2.5rem)', lineHeight: 1.1 }}>
              ¿Listo para aparecer donde te buscan?
            </h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Te damos de alta en minutos. Sin tarjeta, sin permanencia.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to={CTA_HREF}
                className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl font-semibold"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                Hazte autónomo · Gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
