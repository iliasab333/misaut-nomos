// /perfil y /perfil/:slug — redirección a la ficha pública.
//
// Aquí vivía una SEGUNDA ficha de profesional, de 616 líneas, que pintaba los
// mismos datos que `Autonomo.jsx` con otra maqueta. Nada enlazaba a ella: la
// única puerta era el redireccionamiento heredado `/professionalprofile` →
// `/perfil`, de la época de Base44. Dos fichas significan dos sitios donde
// arreglar cada cosa, y sólo uno se arregla.
//
// Queda la ruta —una URL antigua compartida por WhatsApp tiene que seguir
// llevando a alguna parte— pero ya sólo traduce la dirección vieja a la
// canónica: `?id=<user_id>` o `/perfil/<slug>` → /autonomo/<cat>-en-<ciudad>/<slug>.
// Si el profesional ya no existe, al buscador.

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getProfileSeoUrl } from '@/lib/seoUrl';
import { generateSlug } from '@/utils/slugUtils';

export default function ProfessionalProfileRedirect() {
  const navigate = useNavigate();
  const params = useParams();
  const search = new URLSearchParams(window.location.search);
  const professionalId = search.get('id');
  const slug = params.slug || search.get('slug');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['legacyProfileLookup', professionalId, slug],
    queryFn: async () => {
      if (professionalId) {
        const found = await base44.entities.ProfessionalProfile.filter({ user_id: professionalId });
        return found?.[0] || null;
      }
      if (slug) {
        const all = await base44.entities.ProfessionalProfile.list();
        return all.find((p) => p.slug_publico === slug)
          || all.find((p) => generateSlug(p.business_name) === generateSlug(slug))
          || null;
      }
      return null;
    },
    enabled: Boolean(professionalId || slug),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (isLoading) return;
    navigate(profile ? getProfileSeoUrl(profile) : '/buscar', { replace: true });
  }, [isLoading, profile, navigate]);

  // Nada que pintar: o estamos consultando, o ya nos hemos ido.
  return <div className="min-h-[60svh]" aria-hidden="true" />;
}
