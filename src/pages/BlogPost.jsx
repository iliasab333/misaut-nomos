import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Helmet } from 'react-helmet-async';
import { Clock, ArrowLeft, Twitter, Linkedin, Copy, Check } from 'lucide-react';
import { CategoryBadge } from './BlogList';
import NewsletterSignup from '@/components/NewsletterSignup';

export default function BlogPostPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [toc, setToc] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPost(null);
    setToc([]);
    setRelated([]);
    load();
  }, [slug]);

  const load = async () => {
    const found = await base44.entities.BlogPost.filter({ slug, status: 'published' }, '-publish_date', 1);
    if (!found[0]) { setPost(false); return; }
    const p = found[0];
    setPost(p);
    base44.entities.BlogPost.update(p.id, { views: (p.views || 0) + 1 }).catch(() => {});

    // Related articles
    if (p.related_articles?.length) {
      const rel = await Promise.all(p.related_articles.map(id => base44.entities.BlogPost.get(id).catch(() => null)));
      setRelated(rel.filter(Boolean).filter(r => r.status === 'published'));
    } else {
      const rel = await base44.entities.BlogPost.filter({ category: p.category, status: 'published' }, '-publish_date', 4);
      setRelated(rel.filter(r => r.id !== p.id).slice(0, 3));
    }

    // Table of contents
    setTimeout(() => {
      const headings = document.querySelectorAll('.blog-content h2, .blog-content h3');
      const items = Array.from(headings).map((h, i) => {
        const id = h.id || `heading-${i}`;
        h.id = id;
        return { id, text: h.textContent, level: h.tagName === 'H2' ? 2 : 3 };
      });
      setToc(items);
    }, 150);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const url = typeof window !== 'undefined' ? window.location.href : '';

  if (post === null) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-gray-900 border-t-transparent rounded-full" />
    </div>
  );

  if (post === false) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">{t('blog.post.notFound')}</p>
      <Link to="/blog" className="text-sm text-blue-600 hover:underline">{t('blog.post.backToBlogArrow')}</Link>
    </div>
  );

  const metaTitle = post.meta_title_es || t('blog.post.metaTitle', { title: post.title_es });
  const metaDesc = post.meta_description_es || post.excerpt_es || '';
  const ogImage = post.og_image || post.featured_image || '';
  const shareText = post.title_es;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title_es,
    "description": metaDesc,
    "image": ogImage,
    "author": { "@type": "Person", "name": post.author_name },
    "publisher": {
      "@type": "Organization",
      "name": "MisAutónomos",
      "logo": { "@type": "ImageObject", "url": "https://misautonomos.es/logo-512.png" }
    },
    "datePublished": post.publish_date,
    "mainEntityOfPage": url
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        {post.publish_date && <meta property="article:published_time" content={post.publish_date} />}
        {post.author_name && <meta property="article:author" content={post.author_name} />}
        {post.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Hero image — full width, above everything */}
      {post.featured_image && (
        <div className="w-full max-h-[480px] overflow-hidden bg-gray-100">
          <img
            src={post.featured_image}
            alt={post.title_es}
            className="w-full h-full object-cover"
            style={{ maxHeight: '480px', width: '100%', display: 'block' }}
          />
        </div>
      )}

      {/* Back link */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> {t('blog.post.backToBlog')}
        </Link>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <CategoryBadge category={post.category} />
        <h1
          className="font-semibold mt-4 tracking-tight"
          style={{ color: '#00255C', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '-0.025em', lineHeight: 1.08 }}
        >
          {post.title_es}
        </h1>

        {post.excerpt_es && (
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">{post.excerpt_es}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-5 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {post.author_avatar ? (
              <img src={post.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
                {post.author_name?.[0] || 'M'}
              </div>
            )}
            <span className="font-medium text-gray-700">{post.author_name || t('blog.post.defaultAuthor')}</span>
          </div>
          <span className="text-gray-300">·</span>
          {post.publish_date && (
            <span>{new Date(post.publish_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          )}
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t('blog.post.readTime', { minutes: post.read_time_minutes })}</span>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-10">
          <div>
            {/* Mobile TOC */}
            {toc.length > 2 && (
              <details className="lg:hidden mb-6 bg-gray-50 rounded-lg p-4">
                <summary className="font-semibold text-sm cursor-pointer">{t('blog.post.toc')}</summary>
                <ul className="mt-3 space-y-1 text-sm">
                  {toc.map(item => (
                    <li key={item.id} className={item.level === 3 ? 'ml-4' : ''}>
                      <a href={`#${item.id}`} className="text-gray-600 hover:text-gray-900">{item.text}</a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* Content */}
            <div
              className="blog-content prose prose-slate max-w-none prose-headings:font-semibold prose-h2:text-[26px] prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-[20px] prose-h3:mt-8 prose-h3:mb-3 prose-p:text-slate-700 prose-p:leading-[1.75] prose-a:no-underline hover:prose-a:underline prose-a:underline-offset-2 prose-strong:text-slate-900 prose-ul:my-4 prose-li:my-1 prose-img:rounded-2xl"
              style={{ '--tw-prose-links': '#00255C' }}
              dangerouslySetInnerHTML={{ __html: post.content_es }}
            />

            {/* Share */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">{t('blog.post.share')}</p>
              <div className="flex gap-2">
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-green-500 hover:bg-green-600 flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.126 1.534 5.856L0 24l6.335-1.517A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg>
                </a>
                <button onClick={copyLink} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Newsletter */}
            <div className="mt-10">
              <NewsletterSignup variant="blog" source="blog_article" />
            </div>

            {/* CTA marca navy/gold */}
            <div className="mt-6 rounded-2xl p-6" style={{ background: '#00255C', color: 'white' }}>
              <h3 className="text-lg font-semibold">{t('blog.post.cta.title')}</h3>
              <p className="text-sm text-white/80 mt-1">
                {t('blog.post.cta.body')}
              </p>
              <Link
                to="/para-autonomos"
                className="inline-block mt-4 text-sm font-semibold px-5 py-2 rounded-lg"
                style={{ backgroundColor: '#F5C13D', color: '#00255C' }}
              >
                {t('blog.post.cta.button')}
              </Link>
            </div>
          </div>

          {/* Desktop TOC sidebar */}
          {toc.length > 2 && (
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{t('blog.post.tocShort')}</p>
                <ul className="space-y-2 text-sm border-l-2 border-gray-100">
                  {toc.map(item => (
                    <li key={item.id} className={item.level === 3 ? 'ml-3' : ''}>
                      <a href={`#${item.id}`} className="block pl-3 py-1 -ml-0.5 border-l-2 border-transparent hover:border-gray-900 text-gray-600 hover:text-gray-900 transition-colors">
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('blog.post.related')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map(r => (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group">
                  {r.featured_image && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 mb-2">
                      <img src={r.featured_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-gray-700 line-clamp-2">{r.title_es}</h3>
                  <p className="text-xs text-gray-500 mt-1">{t('blog.post.readTime', { minutes: r.read_time_minutes })}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
