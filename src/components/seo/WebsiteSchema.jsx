import { useEffect } from 'react';

export default function WebsiteSchema() {
  useEffect(() => {
    // Defer schema injection to avoid blocking critical path
    const injectSchema = () => {
      let script = document.getElementById('structured-data-website');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('id', 'structured-data-website');
        document.head.appendChild(script);
      }
    
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "MisAutónomos",
      "alternateName": "Mis Autónomos",
      "url": "https://misautonomos.es",
      "description": "Plataforma líder en España para conectar clientes con profesionales autónomos verificados",
      "inLanguage": ["es", "en"],
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://misautonomos.es/buscar?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      },
      "publisher": {
        "@type": "Organization",
        "name": "MisAutónomos",
        "logo": {
          "@type": "ImageObject",
          "url": "https://misautonomos.es/logo-512.png"
        }
      }
    });
    };

    // Use requestIdleCallback to defer non-critical structured data
    if ('requestIdleCallback' in window) {
      requestIdleCallback(injectSchema);
    } else {
      setTimeout(injectSchema, 100);
    }

    return () => {
      const existingScript = document.getElementById('structured-data-website');
      if (existingScript) existingScript.remove();
    };
  }, []);

  return null;
}