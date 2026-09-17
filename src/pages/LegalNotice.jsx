import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { IconArrowLeft, IconScale } from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";

const LEGAL_EMAIL = "info@misautonomos.es";

// Secciones del aviso legal, en orden. El texto de cada una vive en
// legal.notice.sections.<clave>.{title,text} del JSON de idioma.
const SECTIONS = [
  "identification",
  "purpose",
  "termsOfUse",
  "intellectualProperty",
  "liability",
  "links",
  "dataProtection",
  "applicableLaw",
  "contact",
];

export default function LegalNoticePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <SEOHead
        title={`${t('legal.notice.title')} - MisAutónomos`}
        description={t('legal.notice.seoDescription')}
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
                <IconScale className="w-8 h-8" />
                <h1 className="text-3xl font-bold">{t('legal.notice.title')}</h1>
              </div>
              <p className="text-blue-100">{t('legal.notice.updated')}</p>
            </div>
            <div className="p-8 space-y-6">
              {SECTIONS.map((key) => (
                <div key={key} className="space-y-2">
                  <h2 className="text-xl font-semibold text-ink">{t(`legal.notice.sections.${key}.title`)}</h2>
                  <p className="text-ink leading-relaxed">{t(`legal.notice.sections.${key}.text`)}</p>
                </div>
              ))}

              <div className="mt-12 p-6 bg-c-accent/5 border-l-4 border-c-accent rounded-r-lg">
                <p className="text-sm text-ink font-medium">
                  {t('legal.notice.contactLead')}:
                  <a href={`mailto:${LEGAL_EMAIL}`} className="text-c-accent hover:text-accent-hover ml-1 font-semibold">
                    {LEGAL_EMAIL}
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
