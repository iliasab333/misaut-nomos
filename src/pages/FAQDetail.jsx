import React, { useEffect, useState } from "react";
import { uiLang } from '@/i18n';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { EmptyState, SkeletonLine, SkeletonBlock } from "@/components/ListStates";
import {
  IconHome,
  IconChevronRight,
  IconThumbUp,
  IconThumbDown,
  IconShare,
  IconBook,
  IconUsers,
  IconBriefcase,
  IconShieldPlain,
  IconCard,
  IconUser,
  IconAlert,
  IconClock,
  IconEye,
} from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";
import { FAQPageSchema } from "../components/seo/StructuredData";
import { toast } from "@/lib/toast";

const categoryConfig = {
  platform: { icon: IconBook, color: "bg-blue-500", label_es: "Sobre la plataforma", label_en: "About the platform" },
  clients: { icon: IconUsers, color: "bg-green-500", label_es: "Para clientes", label_en: "For clients" },
  professionals: { icon: IconBriefcase, color: "bg-c-accent", label_es: "Para autónomos", label_en: "For professionals" },
  security: { icon: IconShieldPlain, color: "bg-amber-500", label_es: "Seguridad", label_en: "Security" },
  payments: { icon: IconCard, color: "bg-green-600", label_es: "Pagos y suscripciones", label_en: "Payments & subscriptions" },
  profile: { icon: IconUser, color: "bg-blue-500", label_es: "Perfil profesional", label_en: "Professional profile" },
  troubleshooting: { icon: IconAlert, color: "bg-red-500", label_es: "Resolución de problemas", label_en: "Troubleshooting" }
};

export default function FAQDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const language = uiLang(i18n.language);
  const [hasVoted, setHasVoted] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const faqId = urlParams.get("id");

  const { data: faq, isLoading } = useQuery({
    queryKey: ['faq', faqId],
    queryFn: async () => {
      const faqs = await base44.entities.FAQ.filter({ id: faqId });
      if (faqs.length === 0) return null;
      
      await base44.entities.FAQ.update(faqId, {
        views: (faqs[0].views || 0) + 1
      });
      
      const recentViews = JSON.parse(localStorage.getItem('recentFaqViews') || '[]');
      const newRecent = [
        { id: faqs[0].id, title: language === 'es' ? faqs[0].title_es : faqs[0].title_en, timestamp: Date.now() },
        ...recentViews.filter(v => v.id !== faqs[0].id)
      ].slice(0, 5);
      localStorage.setItem('recentFaqViews', JSON.stringify(newRecent));
      
      return faqs[0];
    },
    enabled: !!faqId,
  });

  const { data: relatedFaqs = [] } = useQuery({
    queryKey: ['relatedFaqs', faq?.category, faqId],
    queryFn: async () => {
      if (!faq) return [];
      
      const allFaqs = await base44.entities.FAQ.filter({
        category: faq.category,
        published: true
      });
      
      return allFaqs
        .filter(f => f.id !== faqId)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 3);
    },
    enabled: !!faq,
  });

  const [recentViews, setRecentViews] = useState([]);

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentFaqViews') || '[]');
    setRecentViews(recent.filter(v => v.id !== faqId));
  }, [faqId]);

  const markHelpfulMutation = useMutation({
    mutationFn: async (helpful) => {
      await base44.entities.FAQ.update(faqId, {
        helpful_count: (faq.helpful_count || 0) + (helpful ? 1 : -1)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq', faqId] });
      setHasVoted(true);
      toast.success(language === 'es' ? '¡Gracias por tu feedback!' : 'Thanks for your feedback!');
    },
  });

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: language === 'es' ? faq.title_es : faq.title_en,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(language === 'es' ? 'Enlace copiado' : 'Link copied');
    }
  };

  if (isLoading) {
    // Esqueleto con la forma del artículo: título, meta y párrafos. Así
    // nada salta cuando llega el contenido.
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8">
            <SkeletonLine width="35%" height={28} />
            <div className="mt-4">
              <SkeletonLine width="60%" height={16} />
            </div>
            <div className="mt-8">
              <SkeletonBlock lines={8} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!faq) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <EmptyState
          className="max-w-md w-full"
          icon={<IconAlert size={24} />}
          title={language === 'es' ? 'Artículo no encontrado' : 'Article not found'}
          body={language === 'es'
            ? 'El artículo que buscas no existe o ha sido eliminado.'
            : 'The article you are looking for does not exist or has been deleted.'}
          ctaLabel={language === 'es' ? 'Volver al centro de ayuda' : 'Back to help center'}
          onCta={() => navigate(createPageUrl("HelpCenter"))}
        />
      </div>
    );
  }

  const getCategoryLabel = (category) => {
    return language === 'es' 
      ? categoryConfig[category]?.label_es 
      : categoryConfig[category]?.label_en;
  };

  // Schema FAQ con campos name y text correctos
  const faqSchemaData = [{
    question: language === 'es' ? faq.title_es : faq.title_en,
    answer: language === 'es' ? (faq.content_es || faq.summary_es) : (faq.content_en || faq.summary_en)
  }];

  return (
    <>
      <SEOHead 
        title={`${language === 'es' ? faq.title_es : faq.title_en} - MisAutónomos`}
        description={language === 'es' ? faq.summary_es : faq.summary_en}
        type="article"
        publishedTime={faq.created_date}
        modifiedTime={faq.updated_date}
      />
      
      {/* Schema JSON-LD para FAQPage */}
      <FAQPageSchema faqs={faqSchemaData} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-c-muted mb-6 flex-wrap">
            <Link to={createPageUrl("HelpCenter")} className="hover:text-c-accent flex items-center gap-1">
              <IconHome className="w-4 h-4" />
              {language === 'es' ? 'Centro de Ayuda' : 'Help Center'}
            </Link>
            <IconChevronRight className="w-4 h-4" />
            <Link to={createPageUrl("FAQ")} className="hover:text-c-accent">
              {language === 'es' ? 'Preguntas Frecuentes' : 'FAQs'}
            </Link>
            <IconChevronRight className="w-4 h-4" />
            <span className="text-ink font-medium line-clamp-1">
              {language === 'es' ? faq.title_es : faq.title_en}
            </span>
          </nav>

          <div className="card mb-6 border-0 shadow-xl">
            <div className="p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-10 h-10 ${categoryConfig[faq.category]?.color} rounded-lg flex items-center justify-center`}>
                  {React.createElement(categoryConfig[faq.category]?.icon || IconBook, {
                    className: "w-5 h-5 text-white"
                  })}
                </div>
                <span className="badge-outline text-sm">
                  {getCategoryLabel(faq.category)}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                {language === 'es' ? faq.title_es : faq.title_en}
              </h1>

              <div className="flex items-center gap-4 text-sm text-c-muted mb-6">
                <div className="flex items-center gap-1">
                  <IconEye className="w-4 h-4" />
                  <span>{faq.views || 0} {language === 'es' ? 'vistas' : 'views'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <IconClock className="w-4 h-4" />
                  <span>
                    {language === 'es' ? 'Actualizado' : 'Updated'}{' '}
                    {new Date(faq.updated_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                  </span>
                </div>
              </div>

              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-ink mb-6 leading-relaxed">
                  {language === 'es' ? faq.summary_es : faq.summary_en}
                </p>

                <div 
                  className="text-ink leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: (language === 'es' ? faq.content_es : faq.content_en)
                      .split('\n')
                      .map(p => p.trim() ? `<p class="mb-4">${p}</p>` : '')
                      .join('') 
                  }}
                />
              </div>

              {faq.tags && faq.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-c-border">
                  <p className="text-sm text-c-muted mb-2">
                    {language === 'es' ? 'Etiquetas:' : 'Tags:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {faq.tags.map((tag, idx) => (
                      <span key={idx} className="badge-muted text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-c-border">
                <p className="text-ink font-semibold mb-4">
                  {language === 'es' ? '¿Te ha sido útil este artículo?' : 'Was this article helpful?'}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => markHelpfulMutation.mutate(true)}
                    disabled={hasVoted}
                    className="btn-secondary hover:bg-success/10 hover:border-success hover:text-success"
                  >
                    <IconThumbUp className="w-4 h-4" />
                    {language === 'es' ? 'Sí' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => markHelpfulMutation.mutate(false)}
                    disabled={hasVoted}
                    className="btn-secondary hover:bg-error/10 hover:border-error hover:text-error"
                  >
                    <IconThumbDown className="w-4 h-4" />
                    {language === 'es' ? 'No' : 'No'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="btn-secondary ml-auto"
                  >
                    <IconShare className="w-4 h-4" />
                    {language === 'es' ? 'Compartir' : 'Share'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {relatedFaqs.length > 0 && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-ink mb-4">
                {language === 'es' ? 'Artículos relacionados' : 'Related articles'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedFaqs.map((related) => (
                  <div
                    key={related.id}
                    className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-c-border hover:border-c-accent/40"
                    onClick={() => navigate(createPageUrl("FAQDetail") + `?id=${related.id}`)}
                  >
                    <div className="p-4">
                      <h3 className="font-semibold text-ink mb-2 line-clamp-2 hover:text-c-accent">
                        {language === 'es' ? related.title_es : related.title_en}
                      </h3>
                      <p className="text-sm text-c-muted line-clamp-2">
                        {language === 'es' ? related.summary_es : related.summary_en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentViews.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-ink mb-4">
                {language === 'es' ? 'Vistos recientemente' : 'Recently viewed'}
              </h2>
              <div className="space-y-2">
                {recentViews.map((recent) => (
                  <div
                    key={recent.id}
                    className="card hover:bg-c-accent/10 transition-colors cursor-pointer"
                    onClick={() => navigate(createPageUrl("FAQDetail") + `?id=${recent.id}`)}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-ink font-medium">{recent.title}</span>
                      <IconChevronRight className="w-5 h-5 text-c-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
