// Maqueta de móvil del hero — versión MisAutónomos de la de khdemlidaba.
//
// Enseña, en vez de contar: dentro del marco se ve un resultado de búsqueda
// real (cabecera «Madrid · Electricista», un resultado, la ficha del
// autónomo) y, alrededor, dos piezas flotantes que cuentan lo que pasa
// después — un mensaje de WhatsApp entrando y el sello «contactado en 2
// minutos».
//
// - Escritorio (HeroMockupDesktop): marco completo girado -6°, burbuja arriba
//   a la izquierda y sello abajo a la derecha. La ficha es una versión
//   compacta hecha a medida: las tarjetas de /buscar están dimensionadas para
//   un viewport real y dentro del marco se desbordan.
// - Móvil (HeroMockupMobile): sin marco ni rotación — la ficha y la burbuja,
//   apiladas debajo de los chips de oficios. Cada bloque reserva su altura
//   real, así que no hay saltos de maqueta.
//
// La ficha es DECORATIVA: perfil de ejemplo, sin valoraciones inventadas y
// sin teléfono — los botones no llaman ni abren WhatsApp (tabIndex={-1}).
// Las medidas son fijas a propósito (CLS = 0).

import React from 'react';
import { useTranslation } from 'react-i18next';
import InitialsAvatar from '@/components/InitialsAvatar';
import { IconWhatsApp, IconPhone, IconVerified, IconCheck } from '@/components/Icons';

const PHONE_WIDTH = 330;
const PHONE_HEIGHT = 530;

// Ficha compacta: cabe sin truncar dentro del ancho del marco.
function MockupProfileCard({ t, compact = false }) {
  const name = t('landing.mockup.proName');
  return (
    <div className="card bg-surface" style={{ padding: compact ? 14 : 16 }}>
      <div className="flex items-center" style={{ gap: 12 }}>
        <InitialsAvatar name={name} size={compact ? 52 : 56} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink leading-tight" style={{ fontSize: 14.5, whiteSpace: 'nowrap' }}>
            {name}
          </p>
          <p className="text-c-muted leading-tight" style={{ fontSize: 12.5, whiteSpace: 'nowrap', marginTop: 4 }}>
            {t('landing.mockup.trade')} · {t('landing.mockup.city')}
          </p>
        </div>
        {/* Decorativos: ni marcan ni abren WhatsApp. */}
        <div className="flex flex-col flex-shrink-0" style={{ gap: 6 }}>
          <span
            role="img"
            aria-label={t('landing.mockup.callLabel')}
            className="inline-flex items-center justify-center rounded-full text-white bg-brand-navy"
            style={{ width: 36, height: 36 }}
          >
            <IconPhone className="w-4 h-4" />
          </span>
          <span
            role="img"
            aria-label={t('landing.mockup.whatsappLabel')}
            className="inline-flex items-center justify-center rounded-full text-white bg-whatsapp"
            style={{ width: 36, height: 36 }}
          >
            <IconWhatsApp size={16} />
          </span>
        </div>
      </div>

      <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 10 }}>
        <span className="chip-info">{t('landing.mockup.badgeNew')}</span>
        <span className="badge-verified">
          <IconVerified className="w-3 h-3" />
          {t('landing.mockup.badgeVerified')}
        </span>
      </div>
    </div>
  );
}

// Burbuja «nuevo mensaje» — el mismo bloque en las dos versiones, sólo
// cambia la escala.
function WhatsAppBubble({ t, compact = false }) {
  return (
    <div className="card bg-surface flex items-start gap-2.5" style={{ padding: compact ? 10 : 12 }}>
      <span
        className="flex items-center justify-center flex-shrink-0 text-white bg-whatsapp"
        style={{ width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: 8 }}
        aria-hidden="true"
      >
        <IconWhatsApp size={compact ? 16 : 20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-c-muted font-semibold leading-none">
          {t('landing.mockup.newMessage')}
        </p>
        <p className="text-ink leading-snug mt-1" style={{ fontSize: compact ? 12 : 14 }}>
          {t('landing.mockup.messagePreview')}
        </p>
      </div>
    </div>
  );
}

export function HeroMockupDesktop() {
  const { t } = useTranslation();
  return (
    <div className="relative w-full flex items-center justify-center" style={{ height: PHONE_HEIGHT }}>
      {/* Halo dorado detrás: da profundidad sin meter una imagen de fondo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(60% 60% at 60% 40%, hsl(var(--brand-gold) / 0.20), transparent 70%)' }}
      />

      <div className="hero-enter">
        <div
          className="relative"
          style={{
            width: PHONE_WIDTH,
            height: PHONE_HEIGHT,
            transform: 'rotate(-6deg)',
            borderRadius: 44,
            background: 'hsl(var(--brand-navy))',
            padding: 10,
            boxShadow: '0 30px 60px -20px hsl(var(--brand-navy) / 0.35), 0 12px 24px -12px hsl(var(--brand-navy) / 0.20)',
          }}
        >
          {/* Muesca */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 14,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 90,
              height: 22,
              background: 'hsl(var(--brand-navy))',
              borderRadius: 12,
              zIndex: 2,
            }}
          />
          {/* Pantalla */}
          <div
            className="w-full h-full overflow-hidden flex flex-col bg-surface"
            style={{ borderRadius: 34 }}
          >
            <div className="flex items-center justify-between px-6 pt-4 pb-2 text-[10px] font-semibold text-ink">
              <span>{t('landing.mockup.clock')}</span>
              <span aria-hidden="true">••• 5G</span>
            </div>

            {/* Cabecera «app»: el filtro que produce esta ficha. */}
            <div className="px-4 pt-1 pb-3 border-b border-c-border">
              <p className="text-xs text-c-muted uppercase tracking-widest">
                {t('landing.mockup.city')} · {t('landing.mockup.trade')}
              </p>
              <p className="text-[11px] text-c-muted mt-0.5">{t('landing.mockup.resultsCount')}</p>
            </div>

            <div className="flex-1 flex items-center justify-center px-3">
              <MockupProfileCard t={t} compact />
            </div>
          </div>
        </div>
      </div>

      {/* Burbuja de WhatsApp — arriba a la izquierda, por encima del marco. */}
      <div
        className="hero-enter hero-enter-delay-2 absolute"
        style={{ top: 36, insetInlineStart: -24, width: 258, zIndex: 3 }}
      >
        <div className="hero-float">
          <WhatsAppBubble t={t} />
        </div>
      </div>

      {/* Sello «contactado en 2 minutos» — abajo a la derecha. */}
      <div
        className="hero-enter hero-enter-delay-3 absolute"
        style={{ bottom: 36, insetInlineEnd: -16, zIndex: 3 }}
      >
        <div className="hero-float-slow">
          <span
            className="inline-flex items-center gap-2 rounded-full bg-surface border shadow-card"
            style={{ padding: '8px 14px', borderColor: 'rgb(var(--c-success) / 0.35)' }}
          >
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center rounded-full bg-success text-white"
              style={{ width: 18, height: 18 }}
            >
              <IconCheck className="w-3 h-3" strokeWidth={3} />
            </span>
            <span className="text-sm font-medium text-ink whitespace-nowrap">
              {t('landing.mockup.contactedIn')}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function HeroMockupMobile() {
  const { t } = useTranslation();
  return (
    <div className="w-full mx-auto flex flex-col gap-2" style={{ maxWidth: 480 }}>
      <div className="hero-enter">
        <MockupProfileCard t={t} />
      </div>
      <div className="hero-enter hero-enter-delay-2">
        <div className="hero-float">
          <WhatsAppBubble t={t} compact />
        </div>
      </div>
    </div>
  );
}
