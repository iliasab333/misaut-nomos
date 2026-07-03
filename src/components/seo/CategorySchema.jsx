import { useEffect } from 'react';
import { slugify } from '@/lib/slugify';

export default function CategorySchema({ categoryName, professionals, location }) {
  useEffect(() => {
    if (!categoryName) return;

    let script = document.getElementById('structured-data-category');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-category');
      document.head.appendChild(script);
    }

    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${categoryName} en ${location || 'España'}`,
      "description": `Encuentra profesionales de ${categoryName} verificados en ${location || 'toda España'}`,
      "numberOfItems": professionals?.length || 0,
      "itemListElement": (professionals || []).slice(0, 20).map((prof, index) => {
        const profileSlug = prof.slug_publico || slugify(prof.business_name);

        return {
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "ProfessionalService",
            "@id": `https://misautonomos.es/autonomo/${profileSlug}`,
            "name": prof.business_name,
            "description": prof.descripcion_corta || `${categoryName} profesional`,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": prof.ciudad,
              "addressRegion": prof.provincia,
              "addressCountry": "ES"
            },
            ...(prof.average_rating > 0 && {
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": prof.average_rating.toFixed(1),
                "reviewCount": prof.total_reviews || 1,
                "bestRating": "5",
                "worstRating": "1"
              }
            })
          }
        };
      })
    };

    script.textContent = JSON.stringify(schema);

    return () => {
      const existing = document.getElementById('structured-data-category');
      if (existing) existing.remove();
    };
  }, [categoryName, professionals, location]);

  return null;
}