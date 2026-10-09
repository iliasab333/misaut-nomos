// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EL ORDEN DE LAS FICHAS — uno solo, para el buscador y las categorías   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Todas las fichas salen en orden aleatorio. Sin destacados, sin prioridad por
// nota, sin antigüedad: el mismo sitio para todos y la posición rotando entre
// visitas.
//
// ANTES había dos órdenes distintos, y ninguno era éste:
//   · `Search.jsx` ponía delante las fichas con `is_ads_plus` —5 de 47— y
//     barajaba el resto con `Math.random()`.
//   · `Categoria.jsx` ponía delante las mismas y ordenaba el resto por nota,
//     sin nada de azar.
// Dos páginas que enseñan el mismo catálogo y lo ordenaban de forma distinta.
// Por eso esto vive aquí y no dentro de cada página.
//
// EL AZAR ES SEMBRADO, y no `Math.random()` suelto, por una razón de uso: con
// `Math.random()` la lista se rebaraja en cada render y en cada vuelta atrás,
// así que quien abre una ficha, retrocede y busca la de al lado ya no la
// encuentra donde estaba. Con una semilla por visita el orden es estable
// mientras dure la sesión y distinto en la siguiente, que es lo que reparte la
// primera pantalla entre todos sin marear a nadie.

const CLAVE = 'orden_fichas_semilla';

function semillaDeSesion() {
  // En el prerenderizado no hay `sessionStorage`: se devuelve una semilla fija
  // para que el HTML que lee Google sea estable, y el navegador la cambia en
  // cuanto hidrata.
  if (typeof window === 'undefined') return 1;
  try {
    const guardada = window.sessionStorage.getItem(CLAVE);
    if (guardada) return Number(guardada) || 1;
    const nueva = Math.floor(Math.random() * 2 ** 31) || 1;
    window.sessionStorage.setItem(CLAVE, String(nueva));
    return nueva;
  } catch {
    // Navegación privada o almacenamiento bloqueado: el orden cambia en cada
    // render y no pasa nada. Mejor eso que caerse.
    return Math.floor(Math.random() * 2 ** 31) || 1;
  }
}

/** Generador determinista (mulberry32). Misma semilla, misma secuencia. */
function generador(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Devuelve una copia barajada. No toca el array que recibe: las páginas lo
 * guardan en caché de react-query y barajarlo en el sitio corrompería la
 * caché compartida.
 */
export function ordenarFichas(fichas, semilla = semillaDeSesion()) {
  if (!Array.isArray(fichas) || fichas.length < 2) return fichas;
  const copia = [...fichas];
  const azar = generador(semilla);
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export { semillaDeSesion };
