import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconSettings } from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";
import PageTitle from "@/components/PageTitle";

const BRAND = "MisAutónomos";

const SUPPORT_EMAIL = "hola@misautonomos.com";

// Secciones de la política, en orden. El texto de cada una vive en
// cookies.policy.sections.<clave>.{title,text} del JSON de idioma.
const SECTIONS = ["what", "used", "legalBasis", "manage", "withdraw", "thirdParty", "duration", "contact"];

// La sección "used" lleva las tablas de cookies. Nombre y proveedor son
// identificadores técnicos y van literales; finalidad y duración se traducen
// desde cookies.policy.table.rows.<clave>.
const TABLE_SECTION = "used";
const COOKIE_TABLES = [
  {
    group: "essential",
    titleKey: "cookies.policy.table.essentialTitle",
    rows: [
      { key: "session", name: "session", provider: "MisAutónomos" },
      { key: "language", name: "language", provider: "MisAutónomos" },
      { key: "cookieConsent", name: "cookie_consent", provider: "MisAutónomos" },
      { key: "consentId", name: "consent_id", provider: "MisAutónomos" },
      { key: "sessionStorage", name: "sessionStorage", provider: "MisAutónomos" },
    ],
  },
  {
    group: "analytics",
    titleKey: "cookies.policy.table.analyticsTitle",
    rows: [
      { key: "ga", name: "_ga", provider: "Google Analytics" },
      { key: "gid", name: "_gid", provider: "Google Analytics" },
      { key: "gat", name: "_gat", provider: "Google Analytics" },
      { key: "gaWildcard", name: "_ga_*", provider: "Google Analytics" },
    ],
  },
  {
    group: "marketing",
    titleKey: "cookies.policy.table.marketingTitle",
    rows: [
      { key: "fbp", name: "_fbp", provider: "Meta" },
      { key: "fr", name: "fr", provider: "Meta" },
    ],
  },
];

export default function CookiePolicyPage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead
        title={`${t('cookies.policy.title')} - MisAutónomos`}
        description={t('cookies.policy.seoDescription')}
      />

      {/* Página de texto con la maqueta del modelo: sobretítulo, titular
          y UNA carta con el contenido. La banda de color en degradado que
          había aquí arriba no decía nada que el titular no dijera ya, y su
          azul no es el de la marca. */}
      <section className="section-tight">
        <div className="container-page max-w-3xl">
          <PageTitle eyebrow={BRAND} className="mb-2">{t('cookies.policy.title')}</PageTitle>
          <p className="text-sm text-c-muted mb-8">{t('cookies.policy.updated')}</p>

          <div className="card p-6 sm:p-8 space-y-8 text-ink leading-relaxed">
              {SECTIONS.map((key) => (
                <div key={key} className="space-y-3">
                  <h2 className="text-xl font-semibold text-ink">{t(`cookies.policy.sections.${key}.title`)}</h2>
                  <p className="text-ink leading-relaxed whitespace-pre-line">{t(`cookies.policy.sections.${key}.text`)}</p>

                  {key === TABLE_SECTION && (
                    <div className="mt-4 space-y-4">
                      {COOKIE_TABLES.map((table) => (
                        <div key={table.group} className="overflow-x-auto">
                          <h4 className="font-semibold text-ink text-sm mb-2">
                            {t(table.titleKey)}
                          </h4>
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-soft border border-c-border">
                                <th className="p-2 text-left font-semibold text-ink">
                                  {t('cookies.policy.table.name')}
                                </th>
                                <th className="p-2 text-left font-semibold text-ink">
                                  {t('cookies.policy.table.provider')}
                                </th>
                                <th className="p-2 text-left font-semibold text-ink">
                                  {t('cookies.policy.table.purpose')}
                                </th>
                                <th className="p-2 text-left font-semibold text-ink">
                                  {t('cookies.policy.table.duration')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row) => (
                                <tr key={row.key} className="border border-c-border hover:bg-soft">
                                  <td className="p-2 text-ink font-mono text-xs">{row.name}</td>
                                  <td className="p-2 text-ink text-sm">{row.provider}</td>
                                  <td className="p-2 text-ink text-sm">{t(`cookies.policy.table.rows.${row.key}.purpose`)}</td>
                                  <td className="p-2 text-ink text-sm">{t(`cookies.policy.table.rows.${row.key}.duration`)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-12 space-y-4">
                <div className="p-6 bg-c-accent/5 border-l-4 border-c-accent rounded-r-lg">
                  <p className="text-sm text-ink font-medium">
                    {t('cookies.policy.contactLead')}:
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-c-accent hover:text-accent-hover ml-1 font-semibold">
                      {SUPPORT_EMAIL}
                    </a>
                  </p>
                </div>

                <Link to="/configuracion-cookies" className="btn-dark w-full">
                  <IconSettings className="w-4 h-4" />
                  {t('cookies.policy.goToPreferences')}
                </Link>
              </div>
          </div>
        </div>
      </section>
    </>
  );
}
