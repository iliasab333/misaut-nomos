import React from "react";
import { useTranslation } from "react-i18next";
import SEOHead from "../components/seo/SEOHead";
import PageTitle from "@/components/PageTitle";

const BRAND = "MisAutónomos";

const SUPPORT_EMAIL = "soporte@misautonomos.es";

// Secciones de los términos, en orden. El texto de cada una vive en
// legal.terms.sections.<clave>.{title,text} del JSON de idioma.
const SECTIONS = [
  "acceptance",
  "service",
  "accounts",
  "proObligations",
  "clientObligations",
  "subscriptions",
  "userContent",
  "intellectualProperty",
  "liability",
  "termination",
  "modifications",
  "law",
  "contact",
];

export default function TermsConditionsPage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead
        title={`${t('legal.terms.title')} - MisAutónomos`}
        description={t('legal.terms.seoDescription')}
      />

      {/* Página de texto con la maqueta del modelo: sobretítulo, titular
          y UNA carta con el contenido. La banda de color en degradado que
          había aquí arriba no decía nada que el titular no dijera ya, y su
          azul no es el de la marca. */}
      <section className="section-tight">
        <div className="container-page max-w-3xl">
          <PageTitle eyebrow={BRAND} className="mb-2">{t('legal.terms.title')}</PageTitle>
          <p className="text-sm text-c-muted mb-8">{t('legal.terms.updated')}</p>

          <div className="card p-6 sm:p-8 space-y-6 text-ink leading-relaxed">
              {SECTIONS.map((key) => (
                <div key={key} className="space-y-2">
                  <h2 className="text-xl font-semibold text-ink">{t(`legal.terms.sections.${key}.title`)}</h2>
                  <p className="text-ink leading-relaxed">{t(`legal.terms.sections.${key}.text`)}</p>
                </div>
              ))}

              <div className="mt-12 p-6 bg-c-accent/5 border-l-4 border-c-accent rounded-r-lg">
                <p className="text-sm text-ink font-medium">
                  {t('legal.terms.contactLead')}:
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-c-accent hover:text-accent-hover ml-1 font-semibold">
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </div>
          </div>
        </div>
      </section>
    </>
  );
}
