// Titular de página: sobretítulo opcional + h1.
//
// Portado de khdemlidaba. Existe para que las páginas de texto —legales,
// ayuda, contacto— abran todas igual, en vez de cada una con su banda de
// color y su tamaño de letra. El h1 no lleva clase de tamaño a propósito: lo
// pone la capa base (ver src/index.css), que es la escala del modelo.

import React from "react";

export default function PageTitle({ eyebrow, children, className = "mb-8" }) {
  return (
    <>
      {eyebrow ? <p className="text-sm text-c-muted mb-2">{eyebrow}</p> : null}
      <h1 className={className}>{children}</h1>
    </>
  );
}
