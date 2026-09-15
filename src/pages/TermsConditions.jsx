import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
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
                <FileText className="w-8 h-8" />
                <CardTitle className="text-3xl font-bold">{t('legal.terms.title')}</CardTitle>
              </div>
              <p className="text-blue-100">{t('legal.terms.updated')}</p>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {SECTIONS.map((key) => (
                <div key={key} className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">{t(`legal.terms.sections.${key}.title`)}</h2>
                  <p className="text-gray-700 leading-relaxed">{t(`legal.terms.sections.${key}.text`)}</p>
                </div>
              ))}

              <div className="mt-12 p-6 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
                <p className="text-sm text-gray-800 font-medium">
                  {t('legal.terms.contactLead')}:
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:text-blue-800 ml-1 font-semibold">
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
