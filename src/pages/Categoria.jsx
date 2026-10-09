import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import ProfessionalCard from "@/components/ProfessionalCard";
import { toast } from "@/lib/toast";
import SEOHead from "../components/seo/SEOHead";
import { useTranslation } from "react-i18next";
import { slugify, getProfileSeoUrl } from "@/lib/seoUrl";
import { ordenarFichas } from "@/lib/ordenFichas";

const CIUDADES_PRINCIPALES = [
  "Madrid", "Barcelona", "Valencia", "Sevilla", "Málaga", "Zaragoza", "Bilbao",
  "Murcia", "Palma de Mallorca", "Alicante", "Córdoba", "Valladolid", "Vigo",
  "Gijón", "Granada", "A Coruña", "Vitoria-Gasteiz", "Santa Cruz de Tenerife",
  "Getafe", "Alcalá de Henares", "Fuenlabrada", "Leganés", "Móstoles", "Torrejón de Ardoz"
];

// Normaliza texto para comparación: quita tildes y pone minúsculas
function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n');
}

// Dada una lista de ServiceCategory y un slug de URL, devuelve la categoría que coincide
function resolveCategoryBySlug(categories, slug) {
  if (!slug || !categories?.length) return null;
  // 1. Match exacto por slug guardado
  let found = categories.find(c => c.slug === slug);
  if (found) return found;
  // 2. Match por slug generado del name (fallback para categorías sin slug explícito)
  found = categories.find(c => slugify(c.name) === slug);
  if (found) return found;
  // 3. Match normalizado (tolera pequeñas diferencias)
  found = categories.find(c => normalize(c.slug) === normalize(slug) || normalize(slugify(c.name)) === normalize(slug));
  return found || null;
}

export default function CategoriaPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);

  // TRES FORMAS DE URL LLEGAN AQUÍ, y hasta hoy sólo se entendían dos:
  //
  //   /categoria/fontanero                  → sólo oficio
  //   /categoria/fontanero/sabadell         → oficio + ciudad  ← LA CANÓNICA
  //   /categoria/fontanero-en-sabadell      → la forma vieja, de una pieza
  //
  // La de dos segmentos es la que emiten el sitemap, el prerenderizador y las
  // 301 de `vercel.json`, y era la única que esta página NO sabía leer. Ni
  // falta le hacía saberlo, porque tampoco había ruta para ella: todas esas
  // URLs acababan en el 404 del router.
  const cityCategorySlug = params.slug || params.cityCategory;

  let categorySlug = null;
  let ciudadSlug = null;
  let legacyRedirectPath = null;

  if (params.cat && params.ciudad) {
    // La canónica. Dos segmentos, cada uno ya limpio.
    categorySlug = params.cat;
    ciudadSlug = params.ciudad;
  } else if (cityCategorySlug && cityCategorySlug.includes('-en-')) {
    // La vieja. Se entiende y se manda a la canónica con un replace, para que
    // no queden dos direcciones vivas para la misma página.
    const enIdx = cityCategorySlug.indexOf('-en-');
    categorySlug = cityCategorySlug.slice(0, enIdx);
    ciudadSlug = cityCategorySlug.slice(enIdx + 4);
    legacyRedirectPath = `/categoria/${categorySlug}/${ciudadSlug}`;
  } else if (cityCategorySlug) {
    categorySlug = cityCategorySlug;
  } else {
    // Legacy: ?name=X&ciudad=Y → calcular redirect path
    const legacyName = urlParams.get("name");
    const legacyCiudad = urlParams.get("ciudad");
    if (legacyName) {
      categorySlug = slugify(legacyName);
      ciudadSlug = legacyCiudad ? slugify(legacyCiudad) : null;
      legacyRedirectPath = ciudadSlug
        ? `/categoria/${categorySlug}/${ciudadSlug}`
        : `/categoria/${categorySlug}`;
    }
  }

  // Redirect legacy ?name=X&ciudad=Y — siempre al nivel superior (no condicional)
  useEffect(() => {
    if (legacyRedirectPath) navigate(legacyRedirectPath, { replace: true });
  }, []);

  // Ciudad legible: capitalizar cada palabra del slug
  const ciudadName = ciudadSlug
    ? ciudadSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : null;

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => setUser(null));
  }, []);

  // Cargar ServiceCategories para resolver slug → name
  const { data: serviceCategories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 1000 * 60 * 30,
  });

  // Resolver la categoría real desde las ServiceCategory
  const resolvedCategory = resolveCategoryBySlug(serviceCategories, categorySlug);
  const categoryName = resolvedCategory?.name || null;

  // Redirect legacy: si tenemos categorías cargadas y el slug NO coincide exactamente,
  // pedir al backend que resuelva el canonical y redirigir con replace.
  useEffect(() => {
    if (!categorySlug || !serviceCategories.length) return;
    // Si ya hay match exacto, no necesitamos redirect
    if (resolvedCategory && (resolvedCategory.slug === categorySlug || slugify(resolvedCategory.name) === categorySlug)) return;
    // Si hay un match aproximado (no exacto), construir el redirect
    if (resolvedCategory) {
      const correctSlug = resolvedCategory.slug || slugify(resolvedCategory.name);
      if (correctSlug && correctSlug !== categorySlug) {
        const canonical = ciudadSlug
          ? `/categoria/${correctSlug}/${ciudadSlug}`
          : `/categoria/${correctSlug}`;
        // Log fire-and-forget
        base44.functions.invoke('resolveLegacySlug', { path: window.location.pathname }).catch(() => {});
        navigate(canonical, { replace: true });
      }
    }
  }, [serviceCategories, categorySlug, resolvedCategory]);

  // Cargar perfiles solo cuando tenemos el nombre de categoría
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['categoryProfiles', categorySlug, ciudadSlug],
    queryFn: async () => {
      const allProfiles = await base44.entities.ProfessionalProfile.list();

      const lista = allProfiles.filter(p => {
        // Solo perfiles activos y visibles
        if (!p.visible_en_busqueda || !p.onboarding_completed) return false;
        if (p.estado_perfil && p.estado_perfil !== 'activo') return false;

        // Filtro de categoría: comparar por nombre (case-insensitive + sin tildes)
        // Si tenemos categoryName del ServiceCategory, comparar con él;
        // si no, comparar por slug generado del nombre de categoría del perfil
        const matchesCategory = p.categories?.some(c => {
          if (categoryName) {
            return normalize(c) === normalize(categoryName);
          }
          // fallback: comparar slug generado
          return slugify(c) === categorySlug || normalize(slugify(c)) === normalize(categorySlug);
        });

        if (!matchesCategory) return false;

        // Filtro de ciudad (case-insensitive + sin tildes)
        if (ciudadSlug) {
          const profCiudadSlug = slugify(p.ciudad || '');
          const profProvSlug = slugify(p.provincia || '');
          if (normalize(profCiudadSlug) !== normalize(ciudadSlug) && normalize(profProvSlug) !== normalize(ciudadSlug)) {
            return false;
          }
        }

        return true;
      });
      // Mismo orden que el buscador: aleatorio para todas. Esta página ponía
      // delante a las destacadas y después ordenaba por nota, así que el mismo
      // autónomo salía en un sitio distinto según por dónde se llegara.
      return ordenarFichas(lista);
    },
    // Ejecutar siempre que tengamos categorySlug, incluso antes de resolver categoryName
    // (la query se refinará cuando categoryName esté disponible por el re-render)
    enabled: !!categorySlug,
    staleTime: 1000 * 60 * 5,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => base44.entities.Favorite.filter({ client_id: user.id }),
    enabled: !!user,
  });

  const handleCiudadChange = (ciudad) => {
    if (ciudad === "all") {
      navigate(`/categoria/${categorySlug}`);
    } else {
      // Dos segmentos: es la forma que el sitemap publica y la que el
      // prerenderizador tiene escrita en disco. Navegar a la vieja desde aquí
      // llevaba a una URL que el servidor responde con un 404 de verdad.
      navigate(`/categoria/${categorySlug}/${slugify(ciudad)}`);
    }
  };


  const handleToggleFavorite = async (profile) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    try {
      const existing = favorites.filter(f => f.professional_id === profile.user_id);
      if (existing.length > 0) {
        await base44.entities.Favorite.delete(existing[0].id);
        toast.success(t('favorites.toast.removed'));
      } else {
        await base44.entities.Favorite.create({
          client_id: user.id,
          professional_id: profile.user_id,
          business_name: profile.business_name
        });
        toast.success(t('favorites.toast.added'));
      }
    } catch {
      toast.error(t('search.favoritesError'));
    }
  };

  // Nombre visible: categoryName resuelto o placeholder mientras carga
  // ── LA GUÍA LOCAL ──────────────────────────────────────────────────────
  // Ocho combinaciones del Vallès tienen una guía escrita a mano (precios de
  // 2026, qué preguntar, FAQ). El prerenderizador ya la escribía en el HTML
  // que ve Google; React la borraba al hidratar y dejaba a la persona con
  // «0 profesionales disponibles» y nada más.
  //
  // Se carga con `import()` dinámico y no con un import normal: son 24 kB de
  // texto que sólo necesitan 8 páginas de las 25 de categoría. Vite lo saca a
  // su propio trozo y el resto de categorías no lo descarga nunca.
  const [guia, setGuia] = useState(null);
  useEffect(() => {
    let vivo = true;
    if (!categorySlug || !ciudadSlug) { setGuia(null); return; }
    import('@/lib/guiasLocales')
      .then((m) => { if (vivo) setGuia(m.guiaLocal(categorySlug, ciudadSlug)); })
      .catch(() => { if (vivo) setGuia(null); });
    return () => { vivo = false; };
  }, [categorySlug, ciudadSlug]);

  const displayName = categoryName || (serviceCategories.length === 0 ? '…' : categorySlug);

  // SEO
  // El canonical TIENE que ser el que está en el sitemap. Antes apuntaba a la
  // forma de una pieza, que devuelve 404: una canónica que no existe le dice a
  // Google que la página buena no es ésta y que la buena no está.
  const canonicalUrl = ciudadSlug
    ? `https://misautonomos.es/categoria/${categorySlug}/${ciudadSlug}`
    : `https://misautonomos.es/categoria/${categorySlug}`;

  const seoTitle = ciudadName
    ? t('category.seo.titleCity', { category: displayName, city: ciudadName })
    : t('category.seo.title', { category: displayName });

  const seoDescription = ciudadName
    ? t('category.seo.descriptionCity', { category: displayName?.toLowerCase(), city: ciudadName })
    : t('category.seo.description', { category: displayName?.toLowerCase() });

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={`${displayName?.toLowerCase()}, ${ciudadName?.toLowerCase() || 'españa'}, autónomo, profesional, presupuesto`}
      />
      <link rel="canonical" href={canonicalUrl} />

      {profiles.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": ciudadName ? `${displayName} en ${ciudadName}` : displayName,
            "numberOfItems": profiles.length,
            "itemListElement": profiles.slice(0, 20).map((profile, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "item": {
                "@type": "LocalBusiness",
                "name": profile.business_name,
                // El `ItemList` de esta página listaba a cada autónomo con una
                // URL de un segmento, que responde 404. El enlace que pinta la
                // tarjeta justo debajo (`getProfileSeoUrl`) sí era el bueno:
                // los datos estructurados y los enlaces decían cosas distintas.
                "url": `https://misautonomos.es${getProfileSeoUrl(profile)}`,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": profile.ciudad,
                  "addressRegion": profile.provincia,
                  "addressCountry": "ES"
                },
                ...(profile.average_rating > 0 ? {
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": profile.average_rating,
                    "reviewCount": profile.total_reviews || 0
                  }
                } : {})
              }
            }))
          })
        }} />
      )}

      {/* Página de categoría con la maqueta de khdemlidaba/metier: rótulo,
          titular grande, recuento, y la lista con la MISMA tarjeta que el
          buscador. Antes abría con una banda azul en degradado —un azul que
          no es el de la marca— y las tarjetas eran otras, con un botón «Ver
          perfil» que hacía lo mismo que pulsar la tarjeta. */}
      <section className="section-tight">
        <div className="container-page">
          <p className="text-sm text-c-muted mb-2">{displayName}</p>
          <h1>
            {ciudadName
              ? t('category.heading.inCity', { category: displayName, city: ciudadName })
              : t('category.heading.inSpain', { category: displayName })}
          </h1>
          <p className="mt-3 text-lg text-c-muted max-w-2xl">
            {isLoading ? t('category.loading') : t('category.available', { count: profiles.length })}
          </p>
          <p className="mt-2 text-lg text-c-muted max-w-2xl">{seoDescription}</p>

          {/* LA GUÍA LOCAL, arriba y antes del listado — el mismo orden en que
              la escribe el prerenderizador, para que la persona y Google vean
              la misma página. En las ciudades donde todavía no hay ningún
              autónomo de este oficio (hoy, todas: ninguna combinación llega a
              tres), esta guía es LO ÚNICO que la página tiene que ofrecer, y
              es bastante: precios reales, qué preguntar y en qué fijarse.
              `dangerouslySetInnerHTML` sobre texto escrito en el repositorio,
              no sobre nada que venga de fuera. */}
          {guia && (
            <div
              className="guia-local mt-8 max-w-3xl text-ink leading-relaxed"
              dangerouslySetInnerHTML={{ __html: guia.intro }}
            />
          )}

          {/* Filtro de ciudad — cambia la URL, que es la que manda: cada
              ciudad tiene su propia página indexable. */}
          <div className="mt-8 max-w-sm">
            <label htmlFor="categoria-ciudad" className="sr-only">{t('category.filter.selectCity')}</label>
            <select
              id="categoria-ciudad"
              className="select"
              value={ciudadName || "all"}
              onChange={(e) => handleCiudadChange(e.target.value)}
            >
              <option value="all">{t('category.filter.allSpain')}</option>
              {CIUDADES_PRINCIPALES.map((ciudad) => (
                <option key={ciudad} value={ciudad}>{ciudad}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="container-page">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 flex items-center gap-3" style={{ minHeight: 128 }} aria-hidden="true">
                  <div className="rounded-xl bg-soft" style={{ width: 56, height: 56 }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/5 rounded bg-soft" />
                    <div className="h-3 w-2/5 rounded bg-soft" />
                    <div className="h-3 w-1/2 rounded bg-soft" />
                  </div>
                </div>
              ))}
            </div>
          ) : profiles.length === 0 && !guia ? (
            <div className="rounded-xl bg-brand-navy text-white p-8 sm:p-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {ciudadName
                  ? t('category.empty.titleCity', { category: displayName, city: ciudadName })
                  : t('category.empty.title', { category: displayName })}
              </h2>
              <p className="text-white/80 mt-3 mb-6 max-w-lg mx-auto leading-relaxed">
                {t('category.empty.body')}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/registro?tipo=autonomo" className="btn bg-brand-gold text-brand-navy font-semibold hover:bg-brand-gold-deep">
                  {t('nav.becomeProFree')}
                </Link>
                <Link to="/buscar" className="btn bg-white/10 text-white hover:bg-white/20">
                  {t('category.empty.allTrades')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {profiles.map((profile, idx) => (
                  <ProfessionalCard
                    key={profile.id}
                    profile={profile}
                    href={getProfileSeoUrl(profile)}
                    onToggleFavorite={user ? () => handleToggleFavorite(profile) : undefined}
                    isFavorite={favorites.some((f) => f.professional_id === profile.user_id)}
                    priority={idx < 4}
                  />
                ))}
              </div>

              {/* Cierre: la invitación a darse de alta EN ESTA categoría.
                  Llevaba a `PricingPlans`, una página que dejó de existir al
                  retirar las suscripciones: el botón acababa en el 404. */}
              <div className="mt-12 rounded-xl bg-brand-navy text-white p-8 sm:p-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {t('category.cta.title', { category: displayName })}
                </h2>
                <p className="text-white/80 mt-3 mb-6 max-w-lg mx-auto leading-relaxed">
                  {t('category.cta.body')}
                </p>
                <Link to="/registro?tipo=autonomo" className="btn bg-brand-gold text-brand-navy font-semibold hover:bg-brand-gold-deep">
                  {t('nav.becomeProFree')}
                </Link>
              </div>
            </>
          )}

          {/* LAS PREGUNTAS FRECUENTES de la guía, al final y con su JSON-LD.
              Van después del listado porque quien ya ha visto a los autónomos
              es quien tiene las dudas de «¿cuánto debería costarme esto?».
              El `FAQPage` es lo que puede sacar el desplegable de respuestas
              en los resultados de Google, que ocupa el triple de alto que un
              resultado normal. */}
          {guia?.faqs?.length > 0 && (
            <section className="mt-12 max-w-3xl">
              <h2 className="text-2xl font-bold tracking-tight">
                {t('category.faq.title')}
              </h2>
              <div className="mt-5 space-y-4">
                {guia.faqs.map((f, i) => (
                  <details key={i} className="rounded-xl border border-c-border bg-surface p-4">
                    <summary className="font-semibold text-ink cursor-pointer">{f.q}</summary>
                    <p className="mt-2 text-c-muted leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
              <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: guia.faqs.map((f) => ({
                    '@type': 'Question',
                    name: f.q,
                    acceptedAnswer: { '@type': 'Answer', text: f.a },
                  })),
                }),
              }} />
            </section>
          )}
        </div>
      </section>
    </>
  );
}