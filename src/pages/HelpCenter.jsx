import React, { useState } from "react";
import { uiLang } from '@/i18n';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import {
  IconSearch,
  IconBook,
  IconUsers,
  IconBriefcase,
  IconShieldPlain,
  IconCard,
  IconUser,
  IconAlert,
  IconChevronRight,
  IconTrending,
  IconHelp,
  IconArrowRight,
  IconMessageSquare,
} from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";
import { faqUrl } from "@/lib/faqUrl";
import PageTitle from "@/components/PageTitle";
import { FAQPageSchema } from "../components/seo/StructuredData";
import PublicTicketForm from "../components/support/PublicTicketForm";

const categoryConfig = {
  platform: {
    icon: IconBook,
    color: "bg-blue-500",
    label_es: "Sobre la plataforma",
    label_en: "About the platform"
  },
  clients: {
    icon: IconUsers,
    color: "bg-green-500",
    label_es: "Para clientes",
    label_en: "For clients"
  },
  professionals: {
    icon: IconBriefcase,
    color: "bg-c-accent",
    label_es: "Para autónomos",
    label_en: "For professionals"
  },
  security: {
    icon: IconShieldPlain,
    color: "bg-amber-500",
    label_es: "Seguridad",
    label_en: "Security"
  },
  payments: {
    icon: IconCard,
    color: "bg-green-600",
    label_es: "Pagos y suscripciones",
    label_en: "Payments & subscriptions"
  },
  profile: {
    icon: IconUser,
    color: "bg-blue-500",
    label_es: "Perfil profesional",
    label_en: "Professional profile"
  },
  troubleshooting: {
    icon: IconAlert,
    color: "bg-red-500",
    label_es: "Resolución de problemas",
    label_en: "Troubleshooting"
  }
};

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = uiLang(i18n.language);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const { data: faqs = [] } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const allFaqs = await base44.entities.FAQ.filter({ published: true });
      return allFaqs.sort((a, b) => (b.views || 0) - (a.views || 0));
    },
  });

  const { data: popularArticles = [] } = useQuery({
    queryKey: ['popularFaqs'],
    queryFn: async () => {
      const allFaqs = await base44.entities.FAQ.filter({ published: true });
      return allFaqs.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
    },
  });

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const searchLower = value.toLowerCase();
    const results = faqs.filter(faq => {
      const title = language === 'es' ? faq.title_es : faq.title_en;
      const content = language === 'es' ? faq.content_es : faq.content_en;
      const summary = language === 'es' ? faq.summary_es : faq.summary_en;
      
      return title.toLowerCase().includes(searchLower) ||
             content.toLowerCase().includes(searchLower) ||
             summary.toLowerCase().includes(searchLower) ||
             faq.tags.some(tag => tag.toLowerCase().includes(searchLower));
    }).slice(0, 5);

    setSearchResults(results);
  };

  const getCategoryLabel = (category) => {
    return language === 'es' 
      ? categoryConfig[category]?.label_es 
      : categoryConfig[category]?.label_en;
  };

  const faqsByCategory = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {});

  return (
    <>
      <SEOHead 
        title={t('helpCenter.seoTitle')}
        description={t('helpCenter.seoDescription')}
        keywords="ayuda, soporte, FAQ, guías, tutoriales, help center"
      />
      
      <FAQPageSchema faqs={popularArticles} language={language} />

      {/* Abría con una banda de blue-600 a blue-800 y el titular centrado
          dentro. Ni ese azul es de la marca ni el modelo usa bandas de color
          para abrir: rótulo, titular a la izquierda y el contenido. */}
      <section className="section-tight pb-0">
        <div className="container-page max-w-3xl">
          <PageTitle eyebrow={t('nav.support')} className="mb-3">{t('helpCenter.title')}</PageTitle>
          <p className="text-lg text-c-muted">{t('helpCenter.subtitle')}</p>

          <div className="relative mt-8">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-c-muted pointer-events-none z-10" />
            <label htmlFor="help-search" className="sr-only">{t('helpCenter.searchLabel')}</label>
            <input
              id="help-search"
              type="text"
              placeholder={t('helpCenter.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="input ps-12"
            />
              {searchResults.length > 0 && (
                <div className="card absolute w-full mt-2 z-50 shadow-xl animate-slide-down">
                  <div className="p-2">
                    {searchResults.map((faq) => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => {
                          navigate(faqUrl(faq));
                          setSearchTerm("");
                          setSearchResults([]);
                        }}
                        className="w-full text-left p-3 hover:bg-soft rounded-lg transition-colors"
                      >
                        <p className="font-semibold text-ink">
                          {language === 'es' ? faq.title_es : faq.title_en}
                        </p>
                        <p className="text-sm text-c-muted line-clamp-1">
                          {language === 'es' ? faq.summary_es : faq.summary_en}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <div className="mt-6">
            <Link to={createPageUrl("FAQ")} className="btn-secondary btn-sm">
              {t('helpCenter.allFaqs')}
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <div>
        <div className="container-page py-12">
          {/* La tabla `faqs` está VACÍA en producción (0 filas, comprobado).
              Sin esta guarda, la página pintaba dos titulares —«Artículos
              populares» y «Explorar por categoría»— con nada debajo, que es
              peor que no tener la sección: parece que algo se ha roto. */}
          {popularArticles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-ink mb-2 flex items-center gap-2">
              <IconTrending className="w-7 h-7 text-c-accent" />
              {t('helpCenter.popularTitle')}
            </h2>
            <p className="text-c-muted mb-6">
              {t('helpCenter.popularSubtitle')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularArticles.map((faq) => (
                <div key={faq.id} className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-c-border hover:border-c-accent/40">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      {React.createElement(categoryConfig[faq.category]?.icon || IconBook, {
                        className: "w-5 h-5 text-c-accent flex-shrink-0 mt-0.5"
                      })}
                      <h3 
                        className="font-semibold text-ink line-clamp-2 hover:text-c-accent transition-colors"
                        onClick={() => navigate(faqUrl(faq))}
                      >
                        {language === 'es' ? faq.title_es : faq.title_en}
                      </h3>
                    </div>
                    <p className="text-sm text-c-muted line-clamp-2 mb-3">
                      {language === 'es' ? faq.summary_es : faq.summary_en}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="badge-outline text-xs">
                        {getCategoryLabel(faq.category)}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(faqUrl(faq))}
                        className="btn-ghost btn-sm text-c-accent hover:text-accent-hover"
                      >
                        {t('helpCenter.readMore')}
                        <IconChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {Object.keys(faqsByCategory).length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-ink mb-6">
              {t('helpCenter.browseTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const count = faqsByCategory[key]?.length || 0;
                if (count === 0) return null;

                return (
                  <div
                    key={key}
                    className="card hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2 border-c-border hover:border-c-accent/60"
                    onClick={() => navigate(createPageUrl("FAQ") + `?category=${key}`)}
                  >
                    <div className="p-6">
                      <div className={`w-14 h-14 ${config.color} rounded-xl flex items-center justify-center mb-4`}>
                        {React.createElement(config.icon, {
                          className: "w-7 h-7 text-white"
                        })}
                      </div>
                      <h3 className="font-bold text-xl text-ink mb-2">
                        {language === 'es' ? config.label_es : config.label_en}
                      </h3>
                      <p className="text-c-muted mb-4">
                        {t('helpCenter.articlesCount', { count })}
                      </p>
                      <button type="button" className="btn-ghost p-0 text-c-accent hover:text-accent-hover">
                        {t('helpCenter.viewArticles')}
                        <IconChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* FORMULARIO DE CONTACTO PÚBLICO */}
          <div className="mt-12" id="contact-form">
            <h2 className="text-2xl font-semibold text-ink mb-2 flex items-center gap-2">
              <IconMessageSquare className="w-7 h-7 text-c-accent" />
              {t('helpCenter.contactTitle')}
            </h2>
            <p className="text-c-muted mb-6">
              {t('helpCenter.contactSubtitle')}
            </p>
            <div className="max-w-2xl">
              <PublicTicketForm language={language} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
