import React from "react";
import { IconSuccess, IconCircle, IconSparkles } from "@/components/Icons";

const NAVY = '#00255C';

// Calcula la completitud del perfil profesional con un check exhaustivo
// alineado con `professional_profiles`. Se mantiene visible siempre
// (también al 100%) para que el profesional pueda revisar el estado.
export default function ProfileCompleteness({ profile, user }) {
  const calculateCompleteness = () => {
    if (!profile) return { percentage: 0, items: [], doneCount: 0 };

    const checks = [
      { field: 'business_name', label: 'Nombre comercial', weight: 8 },
      { field: 'profile_picture', label: 'Foto de perfil', weight: 10, check: () => !!user?.profile_picture || !!profile.imagen_principal },
      { field: 'descripcion_corta', label: 'Descripción corta', weight: 8 },
      { field: 'description', label: 'Descripción detallada', weight: 10, check: () => !!profile.description && String(profile.description).length >= 80 },
      { field: 'categories', label: 'Categorías', weight: 8, check: () => Array.isArray(profile.categories) && profile.categories.length > 0 },
      { field: 'provincia', label: 'Provincia y ciudad', weight: 5, check: () => !!profile.provincia && !!profile.ciudad },
      { field: 'telefono_contacto', label: 'Teléfono de contacto', weight: 6 },
      { field: 'email_contacto', label: 'Email de contacto', weight: 4 },
      { field: 'photos', label: 'Galería (3+ fotos)', weight: 10, check: () => Array.isArray(profile.photos) && profile.photos.length >= 3 },
      { field: 'services_offered', label: 'Servicios ofrecidos', weight: 8, check: () => Array.isArray(profile.services_offered) && profile.services_offered.length > 0 },
      { field: 'metodos_contacto', label: 'Métodos de contacto', weight: 5, check: () => Array.isArray(profile.metodos_contacto) && profile.metodos_contacto.length > 0 },
      { field: 'horario_dias', label: 'Disponibilidad', weight: 5, check: () => Array.isArray(profile.horario_dias) && profile.horario_dias.length > 0 },
      { field: 'skills', label: 'Especialidades', weight: 5, check: () => Array.isArray(profile.skills) && profile.skills.length > 0 },
      { field: 'formas_pago', label: 'Métodos de pago', weight: 4, check: () => Array.isArray(profile.formas_pago) && profile.formas_pago.length > 0 },
      { field: 'identity_verified', label: 'Identidad verificada', weight: 4, check: () => !!profile.identity_verified },
    ];

    const items = checks.map((c) => ({
      ...c,
      completed: c.check
        ? !!c.check()
        : !!profile[c.field] &&
          (typeof profile[c.field] === 'string'
            ? profile[c.field].trim() !== ''
            : true),
    }));

    const totalWeight = items.reduce((s, c) => s + c.weight, 0);
    const earned = items.filter((i) => i.completed).reduce((s, c) => s + c.weight, 0);
    const percentage = Math.round((earned / totalWeight) * 100);
    const doneCount = items.filter((i) => i.completed).length;
    return { percentage, items, doneCount };
  };

  const { percentage, items, doneCount } = calculateCompleteness();
  const isComplete = percentage === 100;

  return (
    <div className="card rounded-2xl">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <IconSparkles className="w-4 h-4" style={{ color: NAVY }} />
              <h3 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: NAVY }}>
                {isComplete ? '¡Perfil completo!' : 'Completa tu perfil'}
              </h3>
            </div>
            <p className="text-xs text-c-muted">
              {isComplete
                ? 'Tu perfil está optimizado. Sigue así para conseguir más contactos.'
                : `${doneCount} de ${items.length} elementos. Los perfiles completos reciben hasta 5× más contactos.`}
            </p>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-ink leading-none">
            {percentage}
            <span className="text-sm sm:text-base text-c-muted font-bold">%</span>
          </span>
        </div>

        <div className="h-2 mb-4 rounded-full bg-soft overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-c-accent transition-all" style={{ width: `${percentage}%` }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
          {items.map((item) => (
            <div key={item.field} className="flex items-center gap-2 min-w-0">
              {item.completed ? (
                <IconSuccess className="w-4 h-4 text-success flex-shrink-0" />
              ) : (
                <IconCircle className="w-4 h-4 text-c-border flex-shrink-0" />
              )}
              <span className={`text-xs truncate ${item.completed ? 'text-ink' : 'text-c-muted'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
