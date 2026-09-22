// /ayuda — soporte.
//
// Qué había aquí
// ──────────────
// Un centro de ayuda con artículos: buscador sobre la tabla `faqs`,
// «Artículos populares», «Explorar por categoría», una página de detalle por
// artículo y un editor en /admin/faq. Todo eso leía una tabla con CERO filas
// —comprobado en producción— así que la página pintaba tres titulares con
// nada debajo, el enlace «Leer más» no llevaba a ningún sitio (apuntaba a la
// ruta del índice, no a la del artículo) y el editor administraba el vacío.
//
// khdemlidaba no tiene nada de eso, y las respuestas que sí existen viven en
// /preguntas-frecuentes, escritas en los ficheros de idioma. Así que la
// página se queda con lo que de verdad hace: mandar a las preguntas
// frecuentes y abrir un ticket cuando la respuesta no está ahí.
//
// El formulario de tickets SE QUEDA: tiene 3 tickets reales, el último del
// 3 de septiembre, y es el único canal que deja rastro en /admin/soporte
// (el de /contacto manda un correo y no se puede seguir).

import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { IconArrowRight, IconMessageSquare } from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";
import PageTitle from "@/components/PageTitle";
import PublicTicketForm from "../components/support/PublicTicketForm";

export default function HelpCenterPage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead
        title={t('helpCenter.seoTitle')}
        description={t('helpCenter.seoDescription')}
      />

      <section className="section-tight">
        <div className="container-page max-w-3xl">
          <PageTitle eyebrow={t('nav.support')} className="mb-3">{t('helpCenter.title')}</PageTitle>
          <p className="text-lg text-c-muted">{t('helpCenter.subtitle')}</p>

          <div className="mt-6">
            <Link to={createPageUrl("FAQ")} className="btn-secondary btn-sm">
              {t('helpCenter.allFaqs')}
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-12" id="contact-form">
            <h2 className="text-2xl font-semibold text-ink mb-2 flex items-center gap-2">
              <IconMessageSquare className="w-7 h-7 text-c-accent" />
              {t('helpCenter.contactTitle')}
            </h2>
            <p className="text-c-muted mb-6">{t('helpCenter.contactSubtitle')}</p>
            <PublicTicketForm />
          </div>
        </div>
      </section>
    </>
  );
}
