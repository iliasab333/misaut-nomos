import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { notifyAdminEvent } from "@/lib/notifyAdmin";

const LOGO_URL = '/logo-192.png';

// Paleta de marca (mismos tokens que el resto de la home)
const NAVY = "#00255C";

const FacebookIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const LinkedInIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TikTokIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const socialLinks = [
  { href: "https://www.instagram.com/misautonomos/", label: "Instagram", Icon: Instagram },
  { href: "https://www.facebook.com/misautonomos", label: "Facebook", Icon: FacebookIcon },
  { href: "https://www.linkedin.com/company/misautonomos", label: "LinkedIn", Icon: LinkedInIcon },
  { href: "https://www.tiktok.com/@misautonomos", label: "TikTok", Icon: TikTokIcon },
];

// Tres columnas exactas — Producto, Empresa, Legal. Todas las rutas verificadas
// contra las <Route> declaradas en App.jsx: cero 404.
const COLUMN_PRODUCTO = [
  { label: "Buscar profesionales", to: "/buscar" },
  { label: "Hazte autónomo", to: "/para-autonomos" },
  { label: "Precios", to: "/precios" },
];

const COLUMN_EMPRESA = [
  { label: "Cómo funciona", to: "/para-autonomos" },
  { label: "Centro de ayuda", to: "/ayuda" },
  { label: "Preguntas frecuentes", to: "/preguntas-frecuentes" },
  { label: "Blog", to: "/blog" },
  { label: "Contacto", to: "/contacto" },
];

const COLUMN_LEGAL = [
  { label: "Privacidad", to: "/privacidad" },
  { label: "Términos", to: "/terminos" },
  { label: "Cookies", to: "/cookies" },
  { label: "Aviso legal", to: "/aviso-legal" },
];

// Bloque SEO interno: enlaces a las páginas reales /categoria/:slug que ya
// existen (Categoria.jsx resuelve los slugs contra service_categories).
// Slugs verificados con slugify() de @/lib/seoUrl.
const SEO_SERVICIOS = [
  { label: "Electricistas", to: "/categoria/electricista" },
  { label: "Fontaneros", to: "/categoria/fontanero" },
  { label: "Albañiles / Reformas", to: "/categoria/albanil-reformas" },
  { label: "Pintores", to: "/categoria/pintor" },
  { label: "Cerrajeros", to: "/categoria/cerrajero" },
  { label: "Asesoría / gestoría", to: "/categoria/asesoria-o-gestoria" },
  { label: "Limpieza", to: "/categoria/autonomo-de-limpieza" },
];

// Para ciudades: /buscar?provincia=Madrid funciona contra los filtros que
// Search.jsx ya lee de query params. Cero 404.
const SEO_CIUDADES = [
  { label: "Madrid", to: "/buscar?provincia=Madrid" },
  { label: "Barcelona", to: "/buscar?provincia=Barcelona" },
  { label: "Valencia", to: "/buscar?provincia=Valencia" },
  { label: "Sevilla", to: "/buscar?provincia=Sevilla" },
  { label: "Málaga", to: "/buscar?provincia=M%C3%A1laga" },
];

function NewsletterInlineForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { i18n } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Introduce un email válido');
      return;
    }
    setIsSubmitting(true);
    try {
      const { NewsletterSubscriber } = base44.entities;
      const normalizedEmail = email.toLowerCase().trim();

      let existing = [];
      try {
        const result = await NewsletterSubscriber.filter({ email: normalizedEmail });
        existing = Array.isArray(result) ? result : [];
      } catch (err) {
        console.warn('[Newsletter] Filter falló, asumimos que no existe:', err);
        existing = [];
      }

      if (existing.length > 0) {
        if (existing[0].status === 'unsubscribed') {
          await NewsletterSubscriber.update(existing[0].id, {
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          });
          toast.success('Te hemos reactivado. Bienvenido de nuevo.');
        } else {
          toast.info('Ya estás suscrito.');
        }
        setEmail('');
        return;
      }

      const genToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const unsubscribeToken = genToken();

      await NewsletterSubscriber.create({
        email: normalizedEmail,
        status: 'confirmed',
        language: i18n.language || 'es',
        source: 'footer',
        confirmation_token: genToken(),
        unsubscribe_token: unsubscribeToken,
        confirmed_at: new Date().toISOString(),
        user_type_interest: 'ambos',
        emails_sent: 0,
      });

      base44.functions.invoke('sendNewsletterWelcome', {
        email: normalizedEmail,
        language: i18n.language || 'es',
        unsubToken: unsubscribeToken,
      }).catch((err) => console.warn('[Newsletter] Welcome email failed:', err));

      // Notificar al admin de la nueva alta (footer).
      notifyAdminEvent({
        event: 'newsletter_signup',
        title: '📧 Nuevo suscriptor newsletter (footer)',
        body: `<strong>${normalizedEmail}</strong> se ha suscrito al newsletter desde el footer.`,
        data: { email: normalizedEmail, source: 'footer' },
        userEmail: normalizedEmail,
      });

      toast.success('Suscripción confirmada.');
      setEmail('');
    } catch (err) {
      console.error('[Newsletter] Error:', err);
      toast.error('No se ha podido completar. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full sm:w-auto sm:min-w-[280px]">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
        disabled={isSubmitting}
        aria-label="Tu email"
        className="flex-1 h-9 bg-white border border-slate-200 rounded-l-lg px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-9 text-xs font-semibold px-3 rounded-r-lg border border-l-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00255C]/20 disabled:opacity-50"
        style={{ borderColor: NAVY, background: NAVY, color: 'white' }}
      >
        {isSubmitting ? 'Enviando…' : 'Suscribirme'}
      </button>
    </form>
  );
}

export default function Footer() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then((u) => setCurrentUser(u))
      .catch(() => setCurrentUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="max-w-6xl mx-auto px-5 py-6 md:py-8">
        {/* Cabecera del footer: marca + 3 columnas. Gaps más ajustados. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 md:gap-x-8 md:gap-y-6">
          {/* Marca */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={LOGO_URL} alt="" width="28" height="28" className="rounded-lg" loading="lazy" />
              <span className="text-[15px] leading-none notranslate" translate="no">
                <span style={{ color: NAVY, fontWeight: 500 }}>mis</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>autónomos</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-[24ch]">
              Profesionales verificados, contacto directo, sin comisiones.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">Producto</h4>
            <ul className="space-y-1.5">
              {COLUMN_PRODUCTO.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-2 focus:outline-none focus-visible:underline">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">Empresa</h4>
            <ul className="space-y-1.5">
              {COLUMN_EMPRESA.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-2 focus:outline-none focus-visible:underline">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">Legal</h4>
            <ul className="space-y-1.5">
              {COLUMN_LEGAL.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-2 focus:outline-none focus-visible:underline">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bloque SEO interno compacto: TODO en una sola franja. Tipografía
            más pequeña que los enlaces principales, con separador "·". */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5">
          <p className="text-[11px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-600 uppercase tracking-[0.06em] mr-2">Servicios</span>
            {SEO_SERVICIOS.map(({ label, to }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>}
                <Link to={to} className="text-slate-600 hover:text-slate-900 hover:underline underline-offset-2">{label}</Link>
              </React.Fragment>
            ))}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-600 uppercase tracking-[0.06em] mr-2">Ciudades</span>
            {SEO_CIUDADES.map(({ label, to }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>}
                <Link to={to} className="text-slate-600 hover:text-slate-900 hover:underline underline-offset-2">{label}</Link>
              </React.Fragment>
            ))}
          </p>
        </div>

        {/* Newsletter inline — solo para no logueados. Compacta y sin borde
            superior propio (cuelga directamente del bloque SEO). */}
        {!loadingUser && !currentUser && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-slate-500">
              <span className="text-slate-700 font-medium">Newsletter:</span> 1-2 emails al mes. Cero spam.
            </p>
            <NewsletterInlineForm />
          </div>
        )}

        {/* Bottom bar: copyright + redes en una sola fila */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            © {year} <span className="notranslate" translate="no">MisAutónomos</span>. Hecho en España.
          </p>
          <div className="flex items-center gap-1">
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00255C]/20"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
