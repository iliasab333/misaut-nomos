import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cookie, Settings } from "lucide-react";
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
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Search"))}
            className="mb-6 hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>

          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
              <div className="flex items-center gap-3 mb-2">
                <Cookie className="w-8 h-8" />
                <CardTitle className="text-3xl font-bold">{t('cookies.policy.title')}</CardTitle>
              </div>
              <p className="text-blue-100">{t('cookies.policy.updated')}</p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {SECTIONS.map((key) => (
                <div key={key} className="space-y-3">
                  <h2 className="text-xl font-semibold text-gray-900">{t(`cookies.policy.sections.${key}.title`)}</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{t(`cookies.policy.sections.${key}.text`)}</p>

                  {key === TABLE_SECTION && (
                    <div className="mt-4 space-y-4">
                      {COOKIE_TABLES.map((table) => (
                        <div key={table.group} className="overflow-x-auto">
                          <h4 className="font-semibold text-gray-900 text-sm mb-2">
                            {t(table.titleKey)}
                          </h4>
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border border-gray-200">
                                <th className="p-2 text-left font-semibold text-gray-900">
                                  {t('cookies.policy.table.name')}
                                </th>
                                <th className="p-2 text-left font-semibold text-gray-900">
                                  {t('cookies.policy.table.provider')}
                                </th>
                                <th className="p-2 text-left font-semibold text-gray-900">
                                  {t('cookies.policy.table.purpose')}
                                </th>
                                <th className="p-2 text-left font-semibold text-gray-900">
                                  {t('cookies.policy.table.duration')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row) => (
                                <tr key={row.key} className="border border-gray-200 hover:bg-gray-50">
                                  <td className="p-2 text-gray-700 font-mono text-xs">{row.name}</td>
                                  <td className="p-2 text-gray-700 text-sm">{row.provider}</td>
                                  <td className="p-2 text-gray-700 text-sm">{t(`cookies.policy.table.rows.${row.key}.purpose`)}</td>
                                  <td className="p-2 text-gray-700 text-sm">{t(`cookies.policy.table.rows.${row.key}.duration`)}</td>
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
                <div className="p-6 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
                  <p className="text-sm text-gray-800 font-medium">
                    {t('cookies.policy.contactLead')}:
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:text-blue-800 ml-1 font-semibold">
                      {SUPPORT_EMAIL}
                    </a>
                  </p>
                </div>

                <Link to="/configuracion-cookies" className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  {t('cookies.policy.goToPreferences')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
