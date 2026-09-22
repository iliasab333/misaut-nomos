/**
 * Migas de pan de la ficha: Inicio / Categoría / Ciudad.
 *
 * Sustituye a `CategoryCityLink` («Ver más electricistas en Antequera»), que
 * era un enlace suelto bajo el nombre. Hace el mismo trabajo de SEO interno
 * —lleva a /categoria/{cat} y a /categoria/{cat}-en-{ciudad}— pero en el
 * sitio donde khdemlidaba lo pone y donde el visitante lo entiende sin
 * leerlo: arriba, como camino.
 *
 * El slug de la categoría se resuelve contra `service_categories`, NUNCA con
 * un slugify del nombre: «Asesoría o gestoría» no produce el mismo slug que
 * tiene la fila, y el enlace caía en una página vacía.
 */
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { slugify } from "@/lib/seoUrl";
import { useTranslation } from "react-i18next";

function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/g, 'n');
}

export default function ProfileBreadcrumb({ categoryName, ciudad, provincia }) {
  const { t } = useTranslation();
  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 1000 * 60 * 30,
  });

  const matched = categories.find((c) =>
    normalize(c.name) === normalize(categoryName)
    || (c.slug && normalize(c.slug) === normalize(slugify(categoryName))));

  const catSlug = matched?.slug || slugify(categoryName || '');
  const place = ciudad || provincia;

  return (
    <nav aria-label={t('proProfile.breadcrumbAria')} className="text-sm text-c-muted flex items-center gap-1.5 flex-wrap mb-6">
      <Link to="/" className="hover:text-ink">{t('nav.home')}</Link>
      {categoryName && (
        <>
          <span aria-hidden="true">/</span>
          <Link to={`/categoria/${catSlug}`} className="hover:text-ink">{categoryName}</Link>
        </>
      )}
      {place && (
        <>
          <span aria-hidden="true">/</span>
          {categoryName && ciudad ? (
            <Link to={`/categoria/${catSlug}-en-${slugify(ciudad)}`} className="hover:text-ink">{ciudad}</Link>
          ) : (
            <span className="text-ink">{place}</span>
          )}
        </>
      )}
    </nav>
  );
}
