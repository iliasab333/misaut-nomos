// Tarjeta de un profesional en un listado — portada de khdemlidaba
// (src/components/ProfessionalCard.jsx).
//
// Una sola tarjeta para las TRES listas: el buscador, la página de categoría
// y los favoritos. Antes había una distinta en cada sitio —la del buscador
// con tres botones apilados, la de categoría con «Ver perfil», la de
// favoritos otra— y cada arreglo había que hacerlo tres veces, así que se
// hacía en una.

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconMapPin,
  IconHeart,
  IconHeartFilled,
  IconPhone,
  IconStar,
  IconMessageSquare,
  IconVerified,
  IconWhatsApp,
} from "@/components/Icons";
import InitialsAvatar from "@/components/InitialsAvatar";
import GuestContactModal from "@/components/GuestContactModal";
import { optimizeSupabaseImage } from "@/lib/supabaseImage";
import { trackMetric } from "@/lib/trackMetric";

// Tarjeta de resultado — tres columnas, la forma de khdemlidaba.
//
//   [avatar 56 + corazón]   [nombre · oficio · ciudad/nota]   [2 botones 44]
//
// La altura de la fila la marca la columna de botones (44+8+44 = 96 px) y la
// de la izquierda mide 56+8+28 = 92: la tarjeta no crece por el corazón.
//
// Los botones redondos son los dos canales que el profesional ha declarado.
// Si no tiene ninguno —o sólo uno— el hueco lo ocupa «Contactar», que abre el
// formulario de correo (Edge Function `contact-professional`): es el único
// canal garantizado, y dejar una ficha sin ninguna puerta sería peor que
// apartarse del modelo.
const ProfessionalCard = React.memo(function ProfessionalCard({ profile, href, onToggleFavorite, isFavorite, professionalUser, priority }) {
  const { t } = useTranslation();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [guestModal, setGuestModal] = useState(false);

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('34') && cleaned.length === 9) cleaned = '34' + cleaned;
    return cleaned;
  };

  // Orden de respaldo verificado en BD: 16/27 tienen imagen_principal, 15/27
  // photos[], y profile_picture está vacío en todos.
  const photoUrl =
    profile.imagen_principal ||
    (Array.isArray(profile.photos) && profile.photos[0]) ||
    professionalUser?.profile_picture ||
    null;
  const optimizedPhotoUrl = optimizeSupabaseImage(photoUrl, { width: 128, height: 128, quality: 70 });

  const isVerified = profile.identity_verified === true;
  const hasWhatsapp = profile.metodos_contacto?.includes('whatsapp') && profile.telefono_contacto;
  const hasPhone = profile.metodos_contacto?.includes('telefono') && profile.telefono_contacto;
  const categoryLabel = profile.categories?.[0];
  const name = profile.business_name || t('favorites.page.unnamed');
  const cityLabel = [profile.ciudad, profile.provincia !== profile.ciudad ? profile.provincia : null]
    .filter(Boolean)
    .join(', ');

  const roundBtn = 'inline-flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-95';
  const openContact = (e) => { e.stopPropagation(); trackMetric(profile.id, 'contact_click'); setGuestModal(true); };
  const channels = (hasWhatsapp ? 1 : 0) + (hasPhone ? 1 : 0);

  return (
    <div className="card transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-3 p-4">
        {/* Columna 1 — avatar (abre la ficha) y, debajo, el corazón. El
            corazón va FUERA del enlace: un toque ahí no debe cargar la ficha. */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {/* Enlaces de verdad, no `onClick` sobre un <div>: el buscador es
              la puerta a las 39 fichas y un robot no dispara manejadores de
              clic. El del avatar va `aria-hidden` + fuera del recorrido del
              teclado — el de al lado ya anuncia el mismo destino. */}
          <Link to={href} aria-hidden="true" tabIndex={-1} className="focus:outline-none">
            <InitialsAvatar
              name={profile.business_name || ""}
              src={optimizedPhotoUrl || undefined}
              size={56}
              square
              priority={priority}
            />
          </Link>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              aria-label={isFavorite ? t('favorites.page.remove') : t('search.card.addFavorite')}
              title={isFavorite ? t('favorites.page.remove') : t('search.card.saveFavorite')}
              className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-c-border bg-surface hover:bg-rose-50 transition-colors"
            >
              {isFavorite
                ? <IconHeartFilled size={14} className="text-rose-500" />
                : <IconHeart size={14} className="text-c-muted" />}
            </button>
          )}
        </div>

        {/* Columna 2 — nombre / oficio / ciudad·nota. Tres informaciones,
            tres líneas: juntas en una se cortaban a la mitad. */}
        <Link to={href} title={name} className="flex-1 min-w-0 focus:outline-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-ink font-semibold truncate leading-tight m-0" style={{ fontSize: 15 }}>
              {name}
            </p>
            {isVerified && (
              <IconVerified
                size={15}
                className="flex-shrink-0 text-brand-navy"
                aria-label={t('proProfile.badges.identityVerified')}
              />
            )}
          </div>

          {categoryLabel && (
            <p className="mt-1 text-c-muted leading-snug truncate" style={{ fontSize: 15 }} title={categoryLabel}>
              {categoryLabel}
            </p>
          )}

          <div className="mt-1 flex items-center gap-2 justify-between" style={{ fontSize: 14 }}>
            {/* De los 39 autónomos visibles, 37 no tienen ni una reseña: una
                etiqueta «Nuevo» en casi todas las tarjetas no informa de nada
                y, en 200 px, le robaba el sitio a la CIUDAD —que es lo que
                de verdad decide si alguien llama— dejándola en «B…».
                Una sola línea, pase lo que pase: `flex-wrap` dejaba que
                «Nuevo» y el precio cayeran a un segundo renglón cuando la
                ficha lleva distintivo, y entonces unas tarjetas medían tres
                líneas y otras cuatro. Lo que cede es la ciudad, truncada. */}
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              {cityLabel && (
                <span className="text-c-muted truncate inline-flex items-center gap-1 min-w-0">
                  <IconMapPin size={13} className="flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{cityLabel}</span>
                </span>
              )}
              {profile.average_rating > 0 && (
                <>
                  {cityLabel && <span className="text-c-muted" aria-hidden="true" style={{ opacity: 0.55 }}>·</span>}
                  <span className="inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                    <IconStar size={13} className="text-brand-gold" />
                    <span className="font-semibold text-ink">{profile.average_rating.toFixed(1)}</span>
                    <span className="text-c-muted">({profile.total_reviews || 0})</span>
                  </span>
                </>
              )}
              {profile.tarifa_base > 0 && (
                <>
                  <span className="text-c-muted flex-shrink-0" aria-hidden="true" style={{ opacity: 0.55 }}>·</span>
                  <span className="font-semibold text-ink whitespace-nowrap flex-shrink-0">{profile.tarifa_base} €/h</span>
                </>
              )}
            </div>
            {/* Fuera el sello de «destacado». Anunciaba una posición
                privilegiada en el listado que ya no existe —ahora todas salen
                en orden aleatorio— y por la que además nadie paga desde el
                17/04. Un distintivo que no corresponde a nada es una señal
                falsa para quien compara, y las 5 fichas que lo llevaban no
                habían hecho nada para merecerlo. El interruptor sigue en
                /admin/usuarios por si vuelve a haber un plan de pago. */}
          </div>
        </Link>

        {/* Columna 3 — como mucho dos botones redondos. Una sola pastilla
            saturada por tarjeta, y es la verde. */}
        <div className="flex-shrink-0 self-start flex flex-col gap-2 items-end" onClick={(e) => e.stopPropagation()}>
          {hasWhatsapp && (
            <a
              href={`https://wa.me/${formatPhoneForWhatsApp(profile.telefono_contacto)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); trackMetric(profile.id, 'contact_click'); }}
              aria-label={t('search.card.openWhatsAppOf', { name })}
              className={`${roundBtn} bg-whatsapp text-white hover:bg-whatsapp-hover`}
            >
              <IconWhatsApp size={18} />
            </a>
          )}
          {hasPhone && (
            phoneRevealed ? (
              <a
                href={`tel:${profile.telefono_contacto}`}
                onClick={(e) => { e.stopPropagation(); trackMetric(profile.id, 'contact_click'); }}
                aria-label={t('search.card.callNumber', { phone: profile.telefono_contacto })}
                className={`${roundBtn} bg-soft text-ink border border-c-border hover:opacity-90`}
              >
                <IconPhone size={18} />
              </a>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); trackMetric(profile.id, 'contact_click'); setPhoneRevealed(true); }}
                aria-label={t('search.card.showPhone')}
                className={`${roundBtn} bg-soft text-ink border border-c-border hover:opacity-90`}
              >
                <IconPhone size={18} />
              </button>
            )
          )}
          {channels < 2 && (
            <button
              type="button"
              onClick={openContact}
              aria-label={t('proProfile.contact.contactWith', { name })}
              title={t('profile_card.contact')}
              className={`${roundBtn} bg-brand-navy text-white hover:bg-brand-navy-deep`}
            >
              <IconMessageSquare size={18} />
            </button>
          )}
        </div>
      </div>

      {guestModal && (
        <GuestContactModal professional={profile} onClose={() => setGuestModal(false)} />
      )}
    </div>
  );
});

export default ProfessionalCard;
