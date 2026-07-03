import { useEffect } from 'react';
import { slugify } from '@/lib/slugify';

export default function LocationSchema({ city, province, professionals, categories }) {
  useEffect(() => {
    if (!city && !province) return;

    let script = document.getElementById('structured-data-location');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-location');
      document.head.appendChild(script);
    }

    const locationName = city ? `${city}, ${province}` : province;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Place",
      "name": locationName,
      "address": {
        "@type": "PostalAddress",
        ...(city && { "addressLocality": city }),
        "addressRegion": province,
        "addressCountry": "ES"
      },
      "containsPlace": (professionals || []).slice(0, 15).map(prof => {
        const profileSlug = prof.slug_publico || slugify(prof.business_name);

        return {
          "@type": "ProfessionalService",
          "@id": `https://misautonomos.es/autonomo/${profileSlug}`,
          "name": prof.business_name,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": prof.ciudad,
            "addressRegion": prof.provincia,
            "addressCountry": "ES"
          }
        };
      }),
      ...(categories && categories.length > 0 && {
        "additionalType": categories.map(cat => ({
          "@type": "Service",
          "serviceType": cat
        }))
      })
    };

    script.textContent = JSON.stringify(schema);

    return () => {
      const existing = document.getElementById('structured-data-location');
      if (existing) existing.remove();
    };
  }, [city, province, professionals, categories]);

  return null;
}