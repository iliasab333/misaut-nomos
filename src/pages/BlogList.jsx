import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { IconClock, IconSearch, IconSparkles, IconArrowRight } from '@/components/Icons';
import { EmptyState } from '@/components/ListStates';
import NewsletterSignup from '@/components/NewsletterSignup';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const GOLD = '#F5C13D';
const BRAND = 'MisAutónomos';

// Categorías del blog: id (valor en BD) → clave de traducción de la etiqueta.
// Mapa explícito y cerrado: es lo que permite t(labelKey) sin claves dinámicas.
const CATEGORIES = [
  { id: 'autonomos', labelKey: 'footer.for_pros' },
  { id: 'clientes', labelKey: 'footer.for_clients' },
  { id: 'legal_fiscal', labelKey: 'blog.editor.category.legalFiscal' },
  { id: 'herramientas', labelKey: 'blog.editor.category.tools' },
  { id: 'actualidad', labelKey: 'blog.editor.category.news' },
];

const CATEGORY_LABEL_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.labelKey]));

export function CategoryBadge({ category }) {
  const { t } = useTranslation();
  if (!category) return null;
  const labelKey = CATEGORY_LABEL_KEY[category];
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(0,37,92,0.06)', color: NAVY }}
    >
      {labelKey ? t(labelKey) : category}
    </span>
  );
}

function formatDate(dateStr, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('es-ES', opts); } catch { return ''; }
}

function PostCard({ post }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-c-border bg-surface overflow-hidden hover:border-[#00255C] hover:shadow-[0_10px_30px_-15px_rgba(0,37,92,0.18)] transition-all"
    >
      <div className="aspect-[16/10] bg-soft overflow-hidden">
        {post.featured_image ? (
          <img
            src={post.featured_image}
            alt={post.title_es || ''}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F4F6FB 0%, #E7ECF6 100%)' }}>
            <span className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: NAVY, opacity: 0.4 }}>
              {BRAND}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-5">
        <CategoryBadge category={post.category} />
        <h3 className="mt-3 font-semibold text-ink text-[17px] leading-snug line-clamp-2 group-hover:underline underline-offset-4">
          {post.title_es}
        </h3>
        {post.excerpt_es && (
          <p className="mt-2 text-sm text-c-muted line-clamp-2 leading-relaxed">{post.excerpt_es}</p>
        )}
        <div className="mt-4 pt-4 flex items-center gap-3 text-xs text-c-muted border-t border-c-border">
          {post.read_time_minutes ? (
            <span className="inline-flex items-center gap-1"><IconClock className="w-3 h-3" />{t('blog.list.readTime', { minutes: post.read_time_minutes })}</span>
          ) : null}
          {post.publish_date && (<><span>·</span><span>{formatDate(post.publish_date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></>)}
        </div>
      </div>
    </Link>
  );
}

export default function BlogListPage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.BlogPost.filter({ status: 'published' }, '-publish_date', 100)
      .then((all) => { setPosts(Array.isArray(all) ? all : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = posts.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.title_es || '').toLowerCase().includes(q) || (p.excerpt_es || '').toLowerCase().includes(q);
    }
    return true;
  });

  const featured = posts.find((p) => p.featured);
  const rest = filtered.filter((p) => p.id !== featured?.id);

  const blogSchema = posts.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Blog MisAutónomos",
    "url": "https://misautonomos.es/blog",
    "description": "Guías fiscales, herramientas y consejos para autónomos y clientes en España.",
    "publisher": {
      "@type": "Organization",
      "name": "MisAutónomos",
      "logo": { "@type": "ImageObject", "url": "https://misautonomos.es/logo-512.png" },
    },
    "blogPost": posts.slice(0, 10).map((p) => ({
      "@type": "BlogPosting",
      "headline": p.title_es,
      "description": p.excerpt_es,
      "datePublished": p.publish_date,
      "url": `https://misautonomos.es/blog/${p.slug}`,
    })),
  } : null;

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <SEOHead
        title={t('blog.list.seo.title')}
        description={t('blog.list.seo.description')}
        structuredData={blogSchema}
      />

      {/* Cabecera */}
      <section style={{ background: '#FBFCFE' }}>
        <div className="container-page pt-14 pb-10 md:pt-20 md:pb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'rgba(0,37,92,0.06)', color: NAVY }}>
            <IconSparkles className="w-3.5 h-3.5" /> {t('nav.blog')}
          </div>
          <h1
            className="mt-5 font-semibold tracking-tight"
            style={{ color: NAVY, fontSize: 'clamp(2rem, 5.4vw, 3rem)', lineHeight: 1.06, letterSpacing: '-0.025em' }}
          >
            {t('blog.list.hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-c-muted text-[16px] md:text-lg leading-relaxed">
            {t('blog.list.hero.subtitle')}
          </p>

          <div className="relative mt-7 max-w-md">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-c-muted" />
            <input
              type="text"
              placeholder={t('blog.list.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-c-border rounded-xl text-sm text-ink focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
            />
          </div>
        </div>
      </section>

      {/* Filtros sticky */}
      <div className="sticky top-0 bg-surface/95 backdrop-blur border-b border-c-border z-10">
        <div className="container-page overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                category === 'all' ? 'text-ink' : 'border-transparent text-c-muted hover:text-ink'
              }`}
              style={category === 'all' ? { borderColor: NAVY } : { borderColor: 'transparent' }}
            >
              {t('blog.list.allCategories')}
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  category === c.id ? 'text-ink' : 'border-transparent text-c-muted hover:text-ink'
                }`}
                style={category === c.id ? { borderColor: NAVY } : { borderColor: 'transparent' }}
              >
                {t(c.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <section className="bg-canvas">
        <div className="container-page py-10 md:py-12">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-c-border overflow-hidden">
                  <div className="aspect-[16/10] bg-soft" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-soft rounded w-16" />
                    <div className="h-4 bg-soft rounded w-3/4" />
                    <div className="h-3 bg-soft rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t('blog.list.empty')}
              ctaLabel={t('blog.list.allCategories')}
              onCta={() => { setCategory('all'); setSearch(''); }}
            />
          ) : (
            <>
              {/* Featured */}
              {featured && category === 'all' && !search && (
                <Link
                  to={`/blog/${featured.slug}`}
                  className="block mb-12 rounded-2xl border border-c-border overflow-hidden hover:border-[#00255C] hover:shadow-[0_18px_50px_-25px_rgba(0,37,92,0.22)] transition-all group"
                >
                  <div className="grid md:grid-cols-[1.05fr_1fr] items-stretch">
                    <div className="aspect-[16/10] md:aspect-auto bg-soft overflow-hidden">
                      {featured.featured_image ? (
                        <img
                          src={featured.featured_image}
                          alt={featured.title_es || ''}
                          loading="eager"
                          fetchPriority="high"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #F4F6FB 0%, #E7ECF6 100%)' }} />
                      )}
                    </div>
                    <div className="p-6 md:p-8 flex flex-col">
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={featured.category} />
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,193,61,0.16)', color: '#7B5400' }}>
                          {t('blog.list.featured')}
                        </span>
                      </div>
                      <h2 className="mt-4 text-2xl md:text-[28px] font-semibold tracking-tight text-ink" style={{ letterSpacing: '-0.02em', lineHeight: 1.12 }}>
                        {featured.title_es}
                      </h2>
                      {featured.excerpt_es && (
                        <p className="mt-3 text-c-muted line-clamp-3 leading-relaxed">{featured.excerpt_es}</p>
                      )}
                      <div className="mt-5 flex items-center gap-3 text-xs text-c-muted">
                        {featured.read_time_minutes ? <span className="inline-flex items-center gap-1"><IconClock className="w-3 h-3" />{t('blog.list.readTime', { minutes: featured.read_time_minutes })}</span> : null}
                        {featured.publish_date && (<><span>·</span><span>{formatDate(featured.publish_date)}</span></>)}
                      </div>
                      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: NAVY }}>
                        {t('blog.list.readArticle')} <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Rejilla con newsletter intercalada */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.slice(0, 2).map((post) => <PostCard key={post.id} post={post} />)}
                {rest.length > 2 && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <NewsletterSignup variant="blog" source="blog" />
                  </div>
                )}
                {rest.slice(2).map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
