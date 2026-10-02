import React, { useState, useEffect } from "react";
import { supabaseImageOriginal } from "@/lib/supabaseImage";

// Paleta de marca discreta para las iniciales. Selección determinística según
// el nombre, así el mismo profesional siempre tiene el mismo color.
const PALETTE = [
  ["#00255C", "#E8EEF8"], // navy
  ["#3F4B6B", "#ECEFF6"], // ink slate
  ["#1F3B6A", "#E7EEFB"], // deep cobalt
  ["#6B5210", "#FAF1D7"], // gold ink on cream
  ["#4F4F4F", "#F1F2F4"], // neutral
];

function pickPalette(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function deriveInitials(name = "") {
  const trimmed = String(name).trim();
  if (!trimmed) return "··";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] || "") + (parts[parts.length - 1][0] || "")).toUpperCase();
}

/**
 * Avatar con `src` opcional. Si la imagen falla o no se pasa, renderiza
 * iniciales sobre un fondo determinístico de marca. Sin "?" rotos.
 */
export default function InitialsAvatar({
  name = "",
  src,
  size = 48,
  className = "",
  priority = false,
  square = false,
}) {
  // Dos escalones antes de rendirse, no uno.
  //
  //   0 — la miniatura que nos han dado (la que pesa 4 KB en vez de 500);
  //   1 — el ORIGINAL, si el servicio de transformación de Supabase falla;
  //   2 — las iniciales.
  //
  // El escalón intermedio importa: el día que el render vuelva a apagarse,
  // una web entera de iniciales parece rota, mientras que una foto pesada
  // sigue siendo la cara de esa persona. Es el mismo orden que usa
  // khdemlidaba (components/Avatar.jsx).
  const [step, setStep] = useState(0);

  useEffect(() => { setStep(0); }, [src]);

  const initials = deriveInitials(name);
  const [textColor, bgColor] = pickPalette(name || "?");
  const fontSize = size <= 28 ? 11 : size <= 40 ? 13 : size <= 56 ? 16 : Math.round(size * 0.34);

  const baseStyle = { width: size, height: size, minWidth: size, minHeight: size };
  // Cuadrado con esquinas suaves en las listas (la forma de khdemlidaba),
  // círculo en cabeceras y fichas. El radio va en `style` y no en una clase:
  // así gana siempre al `rounded-*` que pueda traer `className`, sin depender
  // del orden con que Tailwind emita las dos reglas.
  const radiusStyle = square ? { borderRadius: 12 } : { borderRadius: 9999 };
  const original = supabaseImageOriginal(src);
  // Si la miniatura ES el original (imagen externa, blob, data:) no hay
  // escalón intermedio que probar: se salta directo a las iniciales.
  const lastStep = original && original !== src ? 2 : 1;
  const showImage = src && step < lastStep;
  const currentSrc = step === 0 ? src : original;

  if (showImage) {
    return (
      <img
        key={currentSrc}
        src={currentSrc}
        alt={name || ""}
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        // `fetchpriority` en minúscula: React 18 no conoce la forma camelCase
        // y la deja pasar al DOM con un warning en cada tarjeta.
        fetchpriority={priority ? "high" : "low"}
        decoding={priority ? "sync" : "async"}
        onError={() => setStep((n) => n + 1)}
        className={`object-cover object-center ${className}`}
        style={{ ...baseStyle, ...radiusStyle }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name || "Sin foto"}
      className={`flex items-center justify-center font-semibold select-none flex-shrink-0 ${className}`}
      style={{
        ...baseStyle,
        ...radiusStyle,
        backgroundColor: bgColor,
        color: textColor,
        fontSize,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}
