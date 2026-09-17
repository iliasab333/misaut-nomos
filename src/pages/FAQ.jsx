import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconSearch, IconChevronDown, IconArrowRight, IconBriefcase, IconUsers, IconHelp } from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";

// ─── Datos de las 17 preguntas ────────────────────────────────────────────────
// Se construyen con `t` (no como constante de módulo) para que se retraduzcan
// al cambiar de idioma. Los ids y las URLs no se traducen.

const faqItem = (t, id, ctaUrl, ctaKey = `faq.items.${id}.cta`) => ({
  id,
  q: t(`faq.items.${id}.question`),
  a: t(`faq.items.${id}.answer`),
  cta: t(ctaKey),
  ctaUrl,
});

const buildSections = (t) => [
  {
    id: "autonomos",
    label: t("faq.sections.autonomos"),
    icon: IconBriefcase,
    color: "bg-c-accent",
    faqs: [
      faqItem(t, "altaAutonomo", "/buscar"),
      faqItem(t, "cuotaAutonomos", "/buscar"),
      faqItem(t, "impuestosAutonomo", "/buscar"),
      faqItem(t, "gastosDeducibles", "/buscar"),
      faqItem(t, "facturarAutonomo", "/buscar"),
      faqItem(t, "autonomoVsSl", "/buscar"),
      faqItem(t, "tarifaPlana", "/buscar"),
      faqItem(t, "modelo130", "/buscar"),
      faqItem(t, "pluriactividad", "/buscar"),
      faqItem(t, "bajaAutonomo", "/buscar"),
    ],
  },
  {
    id: "clientes",
    label: t("faq.sections.clientes"),
    icon: IconUsers,
    color: "bg-green-600",
    faqs: [
      faqItem(t, "encontrarAutonomo", "/buscar"),
      faqItem(t, "cuantoCobra", "/buscar"),
      faqItem(t, "facturaObligatoria", "/buscar"),
      faqItem(t, "noTermina", "/buscar"),
      faqItem(t, "autonomoVsEmpresa", "/buscar"),
    ],
  },
  {
    id: "plataforma",
    label: t("faq.sections.plataforma"),
    icon: IconHelp,
    color: "bg-purple-600",
    faqs: [
      faqItem(t, "verificacion", "/mi-perfil"),
      faqItem(t, "solicitudes", "/mi-perfil"),
    ],
  },
];

// Schema JSON-LD FAQPage
function FAQSchema({ faqs }) {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a,
        },
      })),
    };
    let script = document.getElementById("faq-schema-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.id = "faq-schema-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
    return () => { if (script) script.remove(); };
  }, [faqs]);

  return null;
}

// Acordeón individual
function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isOpen ? "border-blue-200 shadow-sm" : "border-c-border"}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-soft transition-colors"
        aria-expanded={isOpen}
      >
        <span className={`font-semibold text-base pr-4 ${isOpen ? "text-blue-900" : "text-ink"}`}>
          {faq.q}
        </span>
        <IconChevronDown className={`w-5 h-5 flex-shrink-0 text-c-muted transition-transform ${isOpen ? "rotate-180 text-c-accent" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-blue-100 pt-4">
          <p className="text-c-muted leading-relaxed mb-4">{faq.a}</p>
          <Link
            to={faq.ctaUrl}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-c-accent hover:text-accent-hover transition-colors"
          >
            {faq.cta} <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("autonomos");
  const [openIndex, setOpenIndex] = useState(null);

  const sections = useMemo(() => buildSections(t), [t]);
  // Todas las FAQs aplanadas para el buscador y el schema
  const allFaqs = useMemo(
    () => sections.flatMap(s => s.faqs.map(f => ({ ...f, sectionId: s.id, sectionLabel: s.label }))),
    [sections]
  );

  const filteredFaqs = useMemo(() => {
    if (!searchTerm.trim()) return null; // null = mostrar por secciones
    const lower = searchTerm.toLowerCase();
    return allFaqs.filter(f => f.q.toLowerCase().includes(lower) || f.a.toLowerCase().includes(lower));
  }, [searchTerm, allFaqs]);

  const activeSectionData = sections.find(s => s.id === activeSection);

  return (
    <>
      <SEOHead
        title={t("faq.page.seoTitle")}
        description={t("faq.page.seoDescription")}
        keywords="preguntas frecuentes autónomos, alta autónomo España, cuota autónomos 2026, impuestos autónomo, tarifa plana autónomos, contratar autónomo"
      />
      <FAQSchema faqs={allFaqs} />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="badge mb-4 bg-blue-600/50 text-blue-100 border border-blue-500/40 text-sm font-medium">
              {t("faq.page.badge")}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              {t("nav.faq")}
            </h1>
            <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
              {t("faq.page.subtitle")}
            </p>

            {/* Buscador */}
            <div className="relative max-w-xl mx-auto">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-c-muted pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setOpenIndex(null); }}
                placeholder={t("faq.page.searchPlaceholder")}
                aria-label={t("faq.page.searchPlaceholder")}
                className="input pl-12 text-base bg-surface text-ink border-0 shadow-lg rounded-xl py-3.5"
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Resultados de búsqueda */}
          {filteredFaqs ? (
            <div>
              <p className="text-sm text-c-muted mb-4">
                {t("faq.page.results", { count: filteredFaqs.length, term: searchTerm })}
              </p>
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-16 text-c-muted">
                  <IconHelp className="w-12 h-12 mx-auto mb-3 text-c-muted opacity-60" />
                  <p className="text-lg font-medium">{t("faq.page.noResults")}</p>
                  <p className="text-sm mt-1">{t("faq.page.noResultsHint")}</p>
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-4 text-c-accent text-sm font-semibold hover:underline"
                  >
                    {t("faq.page.viewAll")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFaqs.map((faq, i) => (
                    <FAQItem
                      key={i}
                      faq={faq}
                      isOpen={openIndex === i}
                      onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Tabs de sección */}
              <div role="tablist" className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
                {sections.map(s => {
                  const Icon = s.icon;
                  const isActive = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      id={`faq-tab-${s.id}`}
                      aria-controls={`faq-panel-${s.id}`}
                      aria-selected={isActive}
                      onClick={() => { setActiveSection(s.id); setOpenIndex(null); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-c-accent text-white shadow-md"
                          : "bg-surface text-ink border border-c-border hover:border-blue-300 hover:text-c-accent"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Preguntas de la sección activa */}
              {activeSectionData && (
                <div
                  role="tabpanel"
                  id={`faq-panel-${activeSection}`}
                  aria-labelledby={`faq-tab-${activeSection}`}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 ${activeSectionData.color} rounded-xl flex items-center justify-center`}>
                      <activeSectionData.icon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-ink">{activeSectionData.label}</h2>
                    <span className="ml-auto text-sm text-c-muted">{t("faq.page.questionCount", { count: activeSectionData.faqs.length })}</span>
                  </div>

                  <div className="space-y-3">
                    {activeSectionData.faqs.map((faq, i) => (
                      <FAQItem
                        key={i}
                        faq={faq}
                        isOpen={openIndex === i}
                        onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── CTA final ── */}
          <div className="mt-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">{t("faq.page.ctaTitle")}</h2>
            <p className="text-blue-200 mb-6">{t("faq.page.ctaSubtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/buscar"
                className="inline-flex items-center justify-center gap-2 bg-surface text-c-accent font-bold px-6 py-3 rounded-xl hover:bg-c-accent/10 transition-colors"
              >
                {t("faq.page.findPro")} <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
