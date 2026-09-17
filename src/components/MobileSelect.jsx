// Select con el picker nativo del sistema.
//
// Antes: en escritorio un `Select` de shadcn y en móvil un `Drawer` con una
// lista de botones a mano. Regla de khdemlidaba: el select nativo del móvil
// (rueda de iOS, diálogo de Android) gana a cualquier menú custom —
// arrastra mejor, no se pelea con el teclado y no necesita portal. Un solo
// camino para los dos tamaños; la clase `.select` ya trae los 48px y el
// texto de 16px que iOS exige para no hacer zoom.
//
// La firma no cambia (`value`, `onValueChange`, `placeholder`, `children`,
// `disabled`, `label`): los hijos siguen siendo elementos con `value` y
// contenido, y aquí se convierten en <option>.

import React from 'react';

export default function MobileSelect({
  value,
  onValueChange,
  placeholder,
  children,
  disabled,
  label,
}) {
  const items = React.Children.toArray(children).filter((child) => child && child.props);

  return (
    <select
      className="select"
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
      aria-label={label || placeholder || undefined}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {items.map((child, idx) => (
        <option key={child.props.value ?? idx} value={child.props.value}>
          {child.props.children}
        </option>
      ))}
    </select>
  );
}
