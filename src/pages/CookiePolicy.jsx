import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { IconArrowLeft, IconCookie, IconSettings } from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";

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
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <SEOHead
        title={`${t('cookies.policy.title')} - MisAutónomos`}
        description={t('cookies.policy.seoDescription')}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(createPageUrl("Search"))}
            className="btn-ghost mb-6 hover:bg-c-accent/5"
          >
            <IconArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </button>

          <div className="card shadow-xl border-0">
            <div className="bg-gradient-to-r from-c-accent to-accent-hover text-white p-8">
              <div className="flex items-center gap-3 mb-2">
                <IconCookie className="w-8 h-8" />
                <h1 className="text-3xl font-bold">{t('cookies.policy.title')}</h1>
              </div>
              <p className="text-blue-100">{t('cookies.policy.updated')}</p>
            </div>
            <div className="p-8 space-y-8">
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
        </div>
      </div>
    </>
  );
}
