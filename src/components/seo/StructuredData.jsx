import { useEffect } from 'react';
import { slugify } from '@/lib/slugify';
import { getProfileSeoUrl } from '@/lib/seoUrl';

export function OrganizationSchema() {
  useEffect(() => {
    let script = document.getElementById('structured-data-organization');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-organization');
      document.head.appendChild(script);
    }
    
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "MisAutónomos",
      "alternateName": "Mis Autónomos",
      "url": "https://misautonomos.es",
      "logo": "https://misautonomos.es/logo-512.png",
      "description": "Plataforma líder en España para conectar clientes con profesionales autónomos verificados. Electricistas, fontaneros, carpinteros y más.",
      "foundingDate": "2024",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "soporte@misautonomos.es",
        "contactType": "customer support",
        "areaServed": "ES",
        "availableLanguage": ["Spanish", "English"]
      },
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "ES"
      },
      "sameAs": [
        "https://facebook.com/misautonomos",
        "https://instagram.com/misautonomos",
        "https://linkedin.com/company/misautonomos"
      ]
    });
  }, []);

  return null;
}

export function ServiceSchema({ categories, location }) {
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    
    let script = document.getElementById('structured-data-service');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-service');
      document.head.appendChild(script);
    }
    
    const services = categories.map(category => ({
      "@type": "Service",
      "serviceType": category,
      "provider": {
        "@type": "Organization",
        "name": "MisAutónomos"
      },
      "areaServed": {
        "@type": "City",
        "name": location || "España"
      }
    }));
    
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": services
    });
  }, [categories, location]);

  return null;
}

export function FAQPageSchema({ faqs }) {
  useEffect(() => {
    if (!faqs || faqs.length === 0) return;
    
    let script = document.getElementById('structured-data-faq');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-faq');
      document.head.appendChild(script);
    }
    
    // Filtrar FAQs inválidas y asegurar que tienen name y text
    const validFaqs = faqs.filter(faq => {
      const question = faq.question || faq.name;
      const answer = faq.answer || faq.text;
      return question && question.trim() !== '' && answer && answer.trim() !== '';
    });

    if (validFaqs.length === 0) return;
    
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": validFaqs.map(faq => ({
        "@type": "Question",
        "name": String(faq.question || faq.name).trim(),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": String(faq.answer || faq.text).trim()
        }
      }))
    });

    return () => {
      const existingScript = document.getElementById('structured-data-faq');
      if (existingScript) existingScript.remove();
    };
  }, [faqs]);

  return null;
}

const FALLBACK_IMAGE = 'https://misautonomos.es/og-image.png';

export function MerchantListingSchema({ profile, reviews, professionalUser }) {
  useEffect(() => {
    if (!profile) return;


    const profileSlug = profile.slug_publico || slugify(profile.business_name);
    // `/autonomo/{oficio}-en-{ciudad}/{nombre}` — la forma de un solo segmento
    // que había aquí devuelve **404** en 53 de las 55 fichas: no está
    // prerenderizada y no la cubre ninguna regla. Es decir, los datos
    // estructurados de cada ficha le decían a Google que la página de ese
    // negocio está en una dirección que no existe. `getProfileSeoUrl` es el
    // mismo constructor que usan el sitemap y los enlaces del buscador, y cae
    // solo a la forma corta cuando la ficha no tiene ciudad (hoy, dos).
    const profileUrl = `https://misautonomos.es${getProfileSeoUrl(profile)}`;

    // image: NUNCA puede ser null — fallback al logo de MisAutónomos
    const imageUrl = profile.imagen_principal
      || profile.photos?.[0]
      || professionalUser?.profile_picture
      || FALLBACK_IMAGE;

    const name = profile.business_name || 'Profesional autónomo';
    const description = profile.descripcion_corta
      || profile.description
      || `${name} - Profesional autónomo en ${profile.ciudad || profile.provincia || 'España'}`;
    const areaServed = profile.ciudad || profile.provincia || 'España';
    const price = profile.tarifa_base > 0 ? String(profile.tarifa_base) : '0';

    const schema = {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": profileUrl,
      "name": name,
      "description": description,
      "image": imageUrl,
      "url": profileUrl,
      "provider": {
        "@type": "Person",
        "name": name,
        "image": imageUrl
      },
      "areaServed": areaServed,
      "offers": {
        "@type": "Offer",
        "price": price,
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "url": profileUrl,
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "EUR" },
          "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "ES" },
          "doesNotShip": true
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "ES",
          "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted"
        }
      },
      ...(profile.average_rating > 0 && profile.total_reviews > 0 && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": Number(profile.average_rating).toFixed(1),
          "reviewCount": String(profile.total_reviews),
          "bestRating": "5",
          "worstRating": "1"
        }
      })
    };

    let script = document.getElementById('structured-data-merchant');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-merchant');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);

    return () => {
      const existing = document.getElementById('structured-data-merchant');
      if (existing) existing.remove();
    };
  }, [profile, reviews, professionalUser]);

  return null;
}

export function LocalBusinessSchema({ profile, reviews, professionalUser }) {
  useEffect(() => {
    if (!profile) return;
    
    let script = document.getElementById('structured-data-business');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-business');
      document.head.appendChild(script);
    }

    const profileSlug = profile.slug_publico || slugify(profile.business_name);
    // La canónica de verdad: la misma que publica el sitemap. El comentario que
    // había aquí decía «formato correcto» de una URL que responde 404.
    const profileUrl = `https://misautonomos.es${getProfileSeoUrl(profile)}`;

    // ✅ Imagen: preferir la más específica del negocio
    const imageUrl = profile.imagen_principal || profile.photos?.[0] || professionalUser?.profile_picture;

    // ✅ openingHoursSpecification como array (requerido por Google)
    const daysMap = {
      laborables: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      festivos: ["Saturday", "Sunday"],
      ambos: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    };
    const days = daysMap[profile.disponibilidad_tipo] || daysMap.laborables;
    const openingHours = days.map(day => ({
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": `https://schema.org/${day}`,
      "opens": profile.horario_apertura || "09:00",
      "closes": profile.horario_cierre || "18:00"
    }));

    // ✅ sameAs fusiona website + redes sociales sin sobreescribirse
    const sameAsLinks = [
      profile.website,
      profile.social_links?.facebook,
      profile.social_links?.instagram,
      profile.social_links?.linkedin,
      profile.social_links?.tiktok,
    ].filter(Boolean).map(link =>
      link.startsWith('http') ? link : `https://${link}`
    );

    // ✅ GeoCoordinates: usar coordenadas reales si existen, sino caer a ciudad/provincia
    const geoBlock = profile.latitude && profile.longitude
      ? {
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": profile.latitude,
            "longitude": profile.longitude
          }
        }
      : {};

    // ✅ Área de servicio con radio (en metros)
    const areaServed = {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        ...(profile.latitude && profile.longitude
          ? { "latitude": profile.latitude, "longitude": profile.longitude }
          : { "name": [profile.ciudad, profile.provincia].filter(Boolean).join(', ') }
        )
      },
      "geoRadius": String((profile.radio_servicio_km || 10) * 1000)
    };

    // ✅ Reseñas individuales (máx 10, solo las que tienen comentario)
    const reviewItems = reviews?.length > 0
      ? reviews.slice(0, 10).map(review => {
          // Calcular rating medio si no existe el campo rating directamente
          const ratingVal = review.rating || (
            review.rapidez && review.comunicacion && review.calidad && review.precio_satisfaccion
              ? ((review.rapidez + review.comunicacion + review.calidad + review.precio_satisfaccion) / 4).toFixed(1)
              : null
          );
          return {
            "@type": "Review",
            "author": { "@type": "Person", "name": review.client_name || "Cliente verificado" },
            "datePublished": review.created_date?.split('T')[0],
            ...(review.comment && { "reviewBody": review.comment }),
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": String(ratingVal || "5"),
              "bestRating": "5",
              "worstRating": "1"
            }
          };
        })
      : undefined;

    const schema = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": profileUrl,
      "name": profile.business_name,
      "description": profile.descripcion_corta || profile.description || `${profile.business_name} - Profesional autónomo en ${profile.ciudad || profile.provincia || 'España'}`,
      ...(imageUrl && { "image": imageUrl }),
      "url": profileUrl,
      "mainEntityOfPage": { "@type": "WebPage", "@id": profileUrl },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": profile.ciudad || "",
        "addressRegion": profile.provincia || "",
        "addressCountry": "ES"
      },
      ...geoBlock,
      "areaServed": areaServed,
      ...(profile.telefono_contacto && { "telephone": profile.telefono_contacto }),
      ...(profile.email_contacto && { "email": profile.email_contacto }),
      "priceRange": profile.price_range || "€€",
      ...(profile.formas_pago?.length > 0 && { "paymentAccepted": profile.formas_pago.join(', ') }),
      ...(profile.categories?.length > 0 && {
        "knowsAbout": profile.categories,
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Servicios profesionales",
          "itemListElement": profile.categories.map(cat => ({
            "@type": "Offer",
            "itemOffered": { "@type": "Service", "name": cat }
          }))
        }
      }),
      ...(profile.services_offered?.length > 0 && {
        "makesOffer": profile.services_offered.map(s => ({
          "@type": "Offer",
          "name": s.name,
          ...(s.description && { "description": s.description }),
          ...(s.price && {
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": s.price,
              "priceCurrency": "EUR",
              "unitText": s.unit || "hora"
            }
          })
        }))
      }),
      ...(profile.years_experience > 0 && {
        "foundingDate": String(new Date().getFullYear() - profile.years_experience)
      }),
      ...(profile.certifications?.length > 0 && {
        "hasCredential": profile.certifications.map(cert => ({
          "@type": "EducationalOccupationalCredential",
          "credentialCategory": "certification",
          "name": cert
        }))
      }),
      ...(sameAsLinks.length > 0 && { "sameAs": sameAsLinks }),
      ...(profile.average_rating > 0 && profile.total_reviews > 0 && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": Number(profile.average_rating).toFixed(1),
          "reviewCount": String(profile.total_reviews),
          "bestRating": "5",
          "worstRating": "1"
        }
      }),
      ...(reviewItems && { "review": reviewItems }),
      "openingHoursSpecification": openingHours,
      "isPartOf": { "@type": "WebSite", "name": "MisAutónomos", "url": "https://misautonomos.es" }
    };

    script.textContent = JSON.stringify(schema);

    return () => {
      const existing = document.getElementById('structured-data-business');
      if (existing) existing.remove();
    };
  }, [profile, reviews, professionalUser]);

  return null;
}

// Schema para Person/Professional
export function ProfessionalPersonSchema({ profile, professionalUser }) {
  useEffect(() => {
    if (!profile) return;
    
    let script = document.getElementById('structured-data-person');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-person');
      document.head.appendChild(script);
    }

    const profileSlug = profile.slug_publico || slugify(profile.business_name);
    
    const schema = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": profile.business_name,
      "jobTitle": profile.categories?.[0] || "Profesional autónomo",
      "description": profile.descripcion_corta,
      "image": professionalUser?.profile_picture || profile.imagen_principal,
      "url": `https://misautonomos.es${getProfileSeoUrl(profile)}`,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": profile.ciudad,
        "addressRegion": profile.provincia,
        "addressCountry": "ES"
      },
      ...(profile.skills?.length > 0 && { "knowsAbout": profile.skills }),
      ...(profile.years_experience > 0 && { 
        "hasOccupation": {
          "@type": "Occupation",
          "name": profile.categories?.[0] || "Profesional",
          "experienceRequirements": `${profile.years_experience} años de experiencia`
        }
      }),
      "worksFor": {
        "@type": "Organization",
        "name": profile.business_name
      }
    };
    
    script.textContent = JSON.stringify(schema);

    return () => {
      const existing = document.getElementById('structured-data-person');
      if (existing) existing.remove();
    };
  }, [profile, professionalUser]);

  return null;
}

export function BreadcrumbSchema({ items }) {
  useEffect(() => {
    if (!items || items.length === 0) return;
    
    let script = document.getElementById('structured-data-breadcrumb');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'structured-data-breadcrumb');
      document.head.appendChild(script);
    }
    
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    });
  }, [items]);

  return null;
}