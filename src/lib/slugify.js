// Fuente única de verdad para generar slugs URL-safe.
// Todo importador nuevo debe usar esta función — nunca duplicar la lógica.
// Contrato exacto:
//   1. normalize('NFD') + eliminar diacríticos [̀-ͯ]
//   2. reemplazar todo lo que no sea [a-zA-Z0-9-] por guión
//   3. colapsar guiones múltiples en uno
//   4. eliminar guiones al inicio y final
//   5. toLowerCase()
//
// Ejemplos:
//   "Óscar Gómez"     → "oscar-gomez"
//   "rayan-"          → "rayan"
//   "Sergi — FixTIC"  → "sergi-fixtic"
//   "Vinaròs"         → "vinaros"

export function slugify(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
