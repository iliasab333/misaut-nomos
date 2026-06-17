import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Users,
  Search as SearchIcon,
  MessageSquare,
  FilePlus2,
  ShieldCheck,
  BadgeCheck,
  MapPin,
  Wallet,
  Star,
  Megaphone,
} from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import LandingHero from '@/components/home/LandingHero';
import { slugify } from '@/lib/seoUrl';

const TrustSlider = lazy(() => import('@/components/search/TrustSlider'));

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// Ciudades con cobertura (los 12 mercados principales). Honesto: estas son
// las ciudades donde ya tenemos autónomos activos o publicidad en curso.
const COVERAGE_CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Bilbao',
  'Zaragoza', 'Alicante', 'Murcia', 'Palma', 'Granada', 'A Coruña',
];

const CLIENT_STEPS = [
  {
    n: '01',
    icon: SearchIcon,
    title: 'Filtra por servicio y zona',
    body: 'Eliges la categoría (electricista, fontanero, …) y la ciudad. Sin tener que rellenar formularios largos.',
  },
  {
    n: '02',
    icon: Users,
    title: 'Compara perfiles verificados',
    body: 'Ves fotos de trabajos, precios orientativos, valoraciones reales y zona de trabajo. Sin perfiles falsos.',
  },
  {
    n: '03',
    icon: MessageSquare,
    title: 'Contacta directamente',
    body: 'Chat, teléfono o WhatsApp con el autónomo. Sin intermediarios. Sin esperar llamadas comerciales.',
  },
];

const PRO_STEPS = [
  {
    n: '01',
    icon: FilePlus2,
    title: 'Crea tu perfil en 10 minutos',
    body: 'Servicios, zona, precios orientativos, fotos de trabajos. Verificamos tu identidad y publicamos.',
  },
  {
    n: '02',
    icon: MapPin,
    title: 'Apareces en búsquedas de tu zona',
    body: 'Sales en /categoria/<oficio>-en-<ciudad>. Sin pelearte por SEO ni gastar en anuncios tú.',
  },
  {
    n: '03',
    icon: MessageSquare,
    title: 'Recibes clientes reales',
    body: 'Los clientes te escriben por chat, teléfono o WhatsApp. Tú decides a quién respondes.',
  },
];

const TRUST_POINTS = [
  {
    icon: BadgeCheck,
    title: 'Identidad verificada',
    body: 'Validamos DNI/NIE, teléfono y oficio antes de publicar cada perfil. Insignia visible.',
  },
  {
    icon: Wallet,
    title: 'Sin comisiones',
    body: 'Ni los autónomos pagan por contacto recibido, ni los clientes pagan por buscar.',
  },
  {
    icon: Star,
    title: 'Reseñas reales',
    body: 'Solo dejan opinión los clientes que han contactado al autónomo. Cero opiniones anónimas.',
  },
  {
    icon: Megaphone,
    title: 'Promoción incluida',
    body: 'Invertimos en redes y Google para llevarte clientes en tu zona, sin coste para el autónomo.',
  },
];

function StepTabs() {
  const [tab, setTab] = useState('cliente');
  const steps = tab === 'cliente' ? CLIENT_STEPS : PRO_STEPS;

  return (
    <div>
      <div className="inline-flex p-1 rounded-xl bg-slate-100 mb-8">
        <button
          type="button"
          onClick={() => setTab('cliente')}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
            tab === 'cliente'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Soy cliente
        </button>
        <button
          type="button"
          onClick={() => setTab('pro')}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
            tab === 'pro'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Soy autónomo
        </button>
      </div>

      <ol className="grid gap-4 md:gap-5 md:grid-cols-3">
        {steps.map(({ n, icon: Icon, title, body }) => (
          <li key={n} className="rounded-2xl border border-slate-200 p-5 bg-white">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}
                aria-hidden="true"
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold tracking-[0.12em]" style={{ color: GOLD }}>{n}</span>
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CoverageGrid() {
  // Cuando hay ciudad, el formato canónico de URL es /categoria/<slug>-en-<ciudad>,
  // pero la home apunta a /buscar?ciudad=<ciudad> para que el usuario filtre desde ahí
  // sin forzar categoría.
  const cities = useMemo(() => COVERAGE_CITIES, []);
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
    >
      {cities.map((city) => (
        <Link
          key={city}
          to={`/buscar?ciudad=${encodeURIComponent(city)}`}
          className="rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm transition group"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
            <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            {city}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <SEOHead
        title="MisAutónomos · Autónomos verificados en tu zona, sin comisiones"
        description="Encuentra y contacta autónomos verificados en España. Filtra por servicio y ciudad, contacto directo, sin intermediarios."
      />

      <main className="bg-white text-slate-900">
        {/* HERO con buscador guiado (no lista profesionales) */}
        <LandingHero />

        {/* CÓMO FUNCIONA — banda blanca con tabs cliente/autónomo */}
        <section className="bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">Cómo funciona</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl mb-6">
              Tres pasos. Sin trampa.
            </p>
            <StepTabs />
          </div>
        </section>

        {/* CONFIANZA — banda suave navy soft */}
        <section style={{ background: 'hsl(var(--brand-surface))' }}>
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">Por qué confiar</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl">
              Reglas claras. Verificación real.
            </p>
            <div
              className="mt-10 grid gap-4 md:gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            >
              {TRUST_POINTS.map(({ icon: Icon, title, body }) => (
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

        {/* TRUST SLIDER existente — banda blanca.
            Reservamos altura mínima en el fallback para que su llegada
            no empuje al CTA de abajo (anti-CLS). Mismas dimensiones que
            la sección real ya rendereada. */}
        <Suspense fallback={<div className="trust-slider-reserve" aria-hidden="true" />}>
          <TrustSlider />
        </Suspense>

        {/* COBERTURA POR CIUDAD — banda blanca */}
        <section className="bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">Cobertura</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl mb-8">
              Ciudades donde ya hay autónomos activos.
            </p>
            <CoverageGrid />
            <p className="mt-6 text-xs text-slate-500">
              ¿Tu ciudad no aparece? Empezamos por las áreas con más demanda y crecemos cada mes.
            </p>
          </div>
        </section>

        {/* CTA FINAL AUTÓNOMOS — banda navy */}
        <section style={{ background: NAVY }}>
          <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center text-white">
            <h2
              className="font-semibold tracking-tight"
              style={{ fontSize: 'clamp(1.7rem, 4.4vw, 2.5rem)', lineHeight: 1.1, color: '#ffffff' }}
            >
              <span style={{ color: '#ffffff' }}>¿Eres autónomo?</span>{' '}
              <span style={{ color: GOLD }}>Aparece en tu zona.</span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.88)' }}>
              Te damos de alta en minutos. Sin tarjeta. Sin comisiones. Contacto directo con los clientes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/para-autonomos"
                className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl font-semibold"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                Cómo funciona para autónomos
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/precios"
                className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
