import React from 'react';

// Logo servido como asset estático local. Para tamaños hasta 96px en 2x el
// PNG de 192px es suficiente (incluso 512px si se quiere mayor calidad).
const LOGO_192 = '/logo-192.png';
const LOGO_512 = '/logo-512.png';

const SIZE_CONFIG = {
  sm: { container: 'w-8 h-8', text: 'text-sm', px: 32 },
  md: { container: 'w-12 h-12', text: 'text-base', px: 48 },
  lg: { container: 'w-16 h-16', text: 'text-lg', px: 64 },
};

export default function OptimizedLogo({ size = 'md', showText = false }) {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const useLarge = config.px >= 64;
  const src = useLarge ? LOGO_512 : LOGO_192;

  return (
    <div className="flex items-center gap-2">
      <img
        src={src}
        alt="MisAutónomos"
        className={config.container}
        width={config.px}
        height={config.px}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      {showText && (
        <span className={`font-bold text-gray-900 ${config.text}`}>
          MisAutónomos
        </span>
      )}
    </div>
  );
}
