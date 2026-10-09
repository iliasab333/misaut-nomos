// El portero de los crons.
//
// Vercel manda `Authorization: Bearer $CRON_SECRET` en cada invocación
// programada, siempre que la variable exista en el proyecto. Sin este guardia
// cualquiera podría pedir `/api/cron/resumen-semanal` y provocar envíos; con
// él, un endpoint de cron sin secreto configurado se niega a funcionar en vez
// de quedarse abierto, que es el fallo que nadie ve hasta que lo usan.
export function esCronLegitimo(req) {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) return { ok: false, estado: 500, error: 'CRON_SECRET sin configurar: el endpoint se niega a ejecutarse en abierto' };
  const dado = req.headers?.authorization || '';
  if (dado !== `Bearer ${esperado}`) return { ok: false, estado: 401, error: 'no autorizado' };
  return { ok: true };
}
