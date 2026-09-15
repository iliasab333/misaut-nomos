import React, { useState, useEffect } from "react";

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
}) {
  const [errored, setErrored] = useState(false);

  useEffect(() => { setErrored(false); }, [src]);

  const initials = deriveInitials(name);
  const [textColor, bgColor] = pickPalette(name || "?");
  const fontSize = size <= 28 ? 11 : size <= 40 ? 13 : size <= 56 ? 16 : Math.round(size * 0.34);

  const baseStyle = { width: size, height: size, minWidth: size, minHeight: size };
  const showImage = src && !errored;

  if (showImage) {
    return (
      <img
        src={src}
        alt={name || ""}
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding={priority ? "sync" : "async"}
        onError={() => setErrored(true)}
        className={`rounded-full object-cover object-center ${className}`}
        style={baseStyle}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name || "Sin foto"}
      className={`rounded-full flex items-center justify-center font-semibold select-none flex-shrink-0 ${className}`}
      style={{
        ...baseStyle,
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
