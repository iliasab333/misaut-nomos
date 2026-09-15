/**
 * Componente que genera el link "Ver más {categoría} en {ciudad}"
 * usando el slug canónico de ServiceCategory (sin añadir "s" ni generar slugs on-the-fly).
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { slugify } from "@/lib/seoUrl";
import { useTranslation } from "react-i18next";

function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n');
}

export default function CategoryCityLink({ categoryName, ciudad }) {
  const { t } = useTranslation();
  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 1000 * 60 * 30,
  });

  // Resolver slug canónico desde ServiceCategory
  const matched = categories.find(c =>
    normalize(c.name) === normalize(categoryName) ||
    (c.slug && normalize(c.slug) === normalize(slugify(categoryName)))
  );

  const catSlug = matched?.slug || slugify(categoryName);
  const ciudadSlug = slugify(ciudad);
  const href = `/categoria/${catSlug}-en-${ciudadSlug}`;

  return (
    <p className="text-xs mt-1.5">
      <a
        href={href}
        className="text-blue-600 hover:text-blue-700 underline font-medium"
      >
        {t("proProfile.categoryCity.seeMore", { category: categoryName, city: ciudad })}
      </a>
    </p>
  );
}