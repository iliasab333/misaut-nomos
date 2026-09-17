import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { IconArrowLeft, IconFile } from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";

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
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <SEOHead
        title={`${t('legal.terms.title')} - MisAutónomos`}
        description={t('legal.terms.seoDescription')}
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
                <IconFile className="w-8 h-8" />
                <h1 className="text-3xl font-bold">{t('legal.terms.title')}</h1>
              </div>
              <p className="text-blue-100">{t('legal.terms.updated')}</p>
            </div>
            <div className="p-8 space-y-6">
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
        </div>
      </div>
    </>
  );
}
