import React from 'react';
import { IconHelp } from '@/components/Icons';

// El Tooltip de Radix se va: el contenido era una sola frase, así que el
// atributo `title` nativo la da igual de bien y funciona en táctil (pulsación
// larga) sin portal ni provider. `side` se conserva en la firma porque los
// llamantes pueden seguir pasándolo; el navegador decide dónde pintarlo.
export default function OnboardingTooltip({ children, content, side = "top" }) {
  return (
    <button
      type="button"
      title={content}
      data-side={side}
      className="inline-flex items-center gap-1.5 text-c-accent hover:text-accent-hover"
    >
      {children}
      <IconHelp className="w-4 h-4" size={16} />
    </button>
  );
}
