# Funciones apartadas, no borradas

Vercel trata cada fichero de `api/` como una función serverless, **salvo los
que empiezan por `_`**. Esta carpeta existe por el límite del plan Hobby:
**12 funciones por despliegue**, y el proyecto había llegado a 13.

## `weekly-post.js` — autopublicador semanal del blog

Está bien hecho: comprueba el secreto del cron, es idempotente por semana ISO,
genera con Anthropic, **valida duro y no publica si la validación falla**, y
por defecto deja el post en borrador.

Se apartó porque **no podía funcionar**:

- No tiene entrada en `vercel.json`, así que nunca se ha ejecutado.
- `ANTHROPIC_API_KEY` no está configurada en producción.
- La tabla `blog_topic_queue`, de donde saca el siguiente tema, **no existe**.

## Para volver a activarlo

1. `git mv api/_inactivo/weekly-post.js api/cron/weekly-post.js`
2. Crear `blog_topic_queue` y meterle temas con `status='nuevo'`.
3. Añadir `ANTHROPIC_API_KEY` en Vercel.
4. Añadir el cron en `vercel.json`.
5. **Liberar un hueco**: el plan Hobby admite 12 funciones y ya están las 12.

Antes de encenderlo conviene decidir si se quiere que publique solo. Hoy deja
borradores, que es lo prudente.
