// Buscador del hero — la barra unificada de la portada.
//
// Es el mismo buscador guiado que tenía LandingHero (categorías de
// `service_categories`, provincias y ciudades de locationsData, y el mismo
// `buildSearchUrl`), montado ahora con la maqueta de khdemlidaba: una barra
// blanca con dos campos separados por un filete y el botón a la derecha en
// escritorio; dos campos apilados y un botón de ancho completo en móvil.
//
// La lógica de navegación NO cambia respecto a la que ya había en producción:
//   - con categoría y ciudad  → /categoria/<slug>-en-<ciudad>   (URL canónica SEO)
//   - con categoría sola      → /categoria/<slug>[?provincia=…]
//   - sin categoría           → /buscar?provincia=…&ciudad=…
// `/buscar` lee `categoria`, `provincia` y `ciudad` de la query string.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { IconSearch, IconBriefcase, IconMapPin } from '@/components/Icons';
import { base44 } from '@/api/base44Client';
import { PROVINCIAS, CIUDADES_POR_PROVINCIA } from '@/components/utils/locationsData';
import { slugify } from '@/lib/seoUrl';

const sortByName = (list) =>
  [...list].sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'es'));

function buildCategorySlug(cat) {
  if (cat?.slug) return cat.slug;
  if (cat?.name) return slugify(cat.name);
  return '';
}

// Hook compartido por la barra y por el carril de chips: una sola petición
// (React Query deduplica por `queryKey`) y la misma normalización.
export function useServiceCategories() {
  const { data, isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  const categories = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return sortByName(
      data
        .filter((c) => c && c.name)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: buildCategorySlug(c),
          icon: typeof c.icon === 'string' ? c.icon.trim() : '',
        }))
        .filter((c) => c.slug),
    );
  }, [data]);

  return { categories, isLoading };
}

// Campo del interior de la barra (escritorio): etiqueta minúscula arriba,
// select sin borde propio —el borde lo pone la barra— y el icono delante.
function BarField({ id, label, icon: Icon, value, onChange, placeholder, options, disabled }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg min-w-0">
      <Icon className="w-4 h-4 flex-shrink-0 text-c-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-c-muted leading-none mb-1">
          {label}
        </span>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="select border-transparent bg-transparent px-0 py-0 min-h-0 h-auto text-ink font-medium"
          style={{ backgroundPosition: 'right 0 center' }}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </span>
    </label>
  );
}

// Campo suelto (móvil): una caja de 48 px con el icono delante y el valor
// dentro — el mismo gabarito que el buscador del modelo en móvil.
//
// El rótulo NO se pinta encima de la caja. Ponerlo ahí metía ~50 px justo
// entre el titular y el botón de buscar, que es donde menos sitio hay en un
// móvil. Sigue estando para quien navega con lector de pantalla, en `sr-only`.
//
// El borde y el fondo los pone la ETIQUETA, no el <select>, y el icono va
// fuera del campo: globals.css fuerza `padding: 12px !important` a todo
// input/select por debajo de 768 px (evitar el zoom de iOS), así que ni
// `ps-12` ni `py-0` llegan a aplicarse dentro del control. Con el icono
// fuera, esos 12 px hacen de separación y la caja mide lo que debe.
function StackedField({ id, label, icon: Icon, value, onChange, placeholder, options, disabled }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center bg-surface border border-c-border rounded-lg ps-4 min-h-[48px] min-w-0"
    >
      <Icon className="w-5 h-5 flex-shrink-0 text-c-muted" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="select flex-1 min-w-0 border-transparent bg-transparent disabled:bg-transparent min-h-0 h-auto text-ink font-medium"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function HeroSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [provincia, setProvincia] = useState('');
  const [ciudad, setCiudad] = useState('');

  const { categories, isLoading } = useServiceCategories();

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.slug, label: c.name })),
    [categories],
  );
  const provinciaOptions = useMemo(
    () => PROVINCIAS.map((p) => ({ value: p, label: p })),
    [],
  );
  const ciudadOptions = useMemo(() => {
    if (!provincia) return [];
    return (CIUDADES_POR_PROVINCIA[provincia] || []).map((c) => ({ value: c, label: c }));
  }, [provincia]);

  const buildSearchUrl = () => {
    if (category) {
      if (ciudad) return `/categoria/${category}-en-${slugify(ciudad)}`;
      return `/categoria/${category}${provincia ? `?provincia=${encodeURIComponent(provincia)}` : ''}`;
    }
    const params = new URLSearchParams();
    if (provincia) params.set('provincia', provincia);
    if (ciudad) params.set('ciudad', ciudad);
    const qs = params.toString();
    return qs ? `/buscar?${qs}` : '/buscar';
  };

  const submit = (e) => {
    e.preventDefault();
    navigate(buildSearchUrl());
  };

  const tradePlaceholder = isLoading
    ? t('landing.hero.loadingCategories')
    : t('landing.hero.chooseService');

  return (
    <form onSubmit={submit} role="search" className="w-full">
      {/* Móvil: dos cajas compactas (icono + valor) + botón de ancho completo */}
      <div className="sm:hidden space-y-2">
        <StackedField
          id="hero-trade-m"
          label={t('landing.hero.whatLabel')}
          icon={IconBriefcase}
          value={category}
          onChange={setCategory}
          placeholder={tradePlaceholder}
          options={categoryOptions}
          disabled={isLoading || categoryOptions.length === 0}
        />
        <StackedField
          id="hero-province-m"
          label={t('landing.hero.whereLabel')}
          icon={IconMapPin}
          value={provincia}
          onChange={(v) => { setProvincia(v); setCiudad(''); }}
          placeholder={t('provinceField')}
          options={provinciaOptions}
        />
        <button type="submit" className="btn btn-lg w-full bg-brand-navy text-white hover:bg-brand-navy-deep">
          <IconSearch className="w-[18px] h-[18px]" />
          <span>{t('common.search')}</span>
        </button>
      </div>

      {/* Escritorio: una sola barra — oficio · filete · provincia · botón */}
      <div
        className="hidden sm:grid bg-surface border border-c-border rounded-xl shadow-card p-2 items-stretch"
        style={{ gridTemplateColumns: '1.4fr 1px 1.2fr auto', gap: 4 }}
      >
        <BarField
          id="hero-trade-d"
          label={t('landing.hero.whatLabel')}
          icon={IconBriefcase}
          value={category}
          onChange={setCategory}
          placeholder={tradePlaceholder}
          options={categoryOptions}
          disabled={isLoading || categoryOptions.length === 0}
        />
        <div className="self-stretch bg-c-border" aria-hidden="true" />
        <BarField
          id="hero-province-d"
          label={t('landing.hero.whereLabel')}
          icon={IconMapPin}
          value={provincia}
          onChange={(v) => { setProvincia(v); setCiudad(''); }}
          placeholder={t('provinceField')}
          options={provinciaOptions}
        />
        <button type="submit" className="btn ms-1 whitespace-nowrap bg-brand-navy text-white hover:bg-brand-navy-deep">
          <IconSearch className="w-[18px] h-[18px]" />
          <span>{t('common.search')}</span>
        </button>
      </div>

      {/* Ciudad — sólo cuando hay provincia elegida. Afina la búsqueda sin
          ocupar sitio en la barra mientras no hace falta. */}
      {provincia && ciudadOptions.length > 0 && (
        <label htmlFor="hero-city" className="block mt-2">
          <span className="sr-only">{t('landing.hero.cityLabel', { province: provincia })}</span>
          <select
            id="hero-city"
            className="select"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
          >
            <option value="">{t('landing.hero.wholeProvince')}</option>
            {ciudadOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      )}
    </form>
  );
}
