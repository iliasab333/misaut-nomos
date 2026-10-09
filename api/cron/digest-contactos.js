// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  DIGEST DE CONTACTOS — 20:00, todos los días                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Quién ha recibido trabajo hoy, ficha por ficha. En la web hermana es el
// correo que más se abre, y no por las cifras: se abre porque dice nombres.
//
// Dos decisiones que son el correo entero:
//
// 1. Si hoy no ha habido ni un contacto, NO se envía nada. Un diario que dice
//    «hoy nada» todos los días acaba en la papelera en una semana y se lleva
//    por delante los días que sí importaban. El cron responde 200 con
//    `enviado:false` para que en los logs de Vercel se vea que corrió bien.
//
// 2. El acumulado del mes va al pie, en letra pequeña. Da el contexto que
//    convierte «3 contactos» en «3 de los 10 que llevamos» sin gastar otro
//    correo al mes que nadie pidió.
//
// A las 20:00 el día todavía no ha acabado, y es a propósito: este correo no
// es un cierre contable, es «mira quién tiene trabajo esperando hoy». Lo que
// entre de 20:00 a medianoche lo cuenta el informe de mañana, que sí cierra
// el día natural.

import { esCronLegitimo } from '../_lib/guardia.js';
import { hayBase, filas, nombresDeFichas, urlFicha } from '../_lib/datos.js';
import { enviarCorreo, plantilla, cifras, seccion, escapar, plural } from '../_lib/correo.js';

/**
 * Suma de `profile_metrics` sobre un rango de días, quedándose sólo con las
 * filas que traen algún contacto. Se consulta a mano en vez de con
 * `metricas()` porque ese ayudante filtra por `date >= x` y aquí hace falta un
 * día exacto y un mes cerrado por arriba, para que `?dia=` de un día pasado no
 * arrastre lo que vino después.
 */
async function contactosEntre(desdeDia, hastaDia) {
  const f = await filas(
    'profile_metrics?select=professional_id,profile_views,contact_clicks'
    + `&date=gte.${desdeDia}&date=lte.${hastaDia}&contact_clicks=gt.0&limit=5000`,
  );
  let total = 0;
  const porFicha = new Map();
  for (const r of f) {
    const c = Number(r.contact_clicks || 0);
    const v = Number(r.profile_views || 0);
    total += c;
    const p = porFicha.get(r.professional_id) || { contactos: 0, visitas: 0 };
    p.contactos += c; p.visitas += v;
    porFicha.set(r.professional_id, p);
  }
  return { total, porFicha };
}

export default async function handler(req, res) {
  const permiso = esCronLegitimo(req);
  if (!permiso.ok) return res.status(permiso.estado).json({ error: permiso.error });
  if (!hayBase()) return res.status(500).json({ error: 'faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' });

  try {
    // `?dia=AAAA-MM-DD` sirve para rehacer a mano el correo de un día cuyo cron
    // falló. Se valida con regex: va directo a la consulta.
    const pedido = String(req.query?.dia || '');
    const hoy = /^\d{4}-\d{2}-\d{2}$/.test(pedido)
      ? pedido
      : new Date().toISOString().slice(0, 10);
    const primeroDeMes = `${hoy.slice(0, 7)}-01`;

    const [dia, mes] = await Promise.all([
      contactosEntre(hoy, hoy),
      contactosEntre(primeroDeMes, hoy),
    ]);

    // El corte: sin contactos no hay correo. Antes de pedir nombres, que es
    // una consulta más a la base para nada.
    if (!dia.total) {
      return res.status(200).json({ ok: true, enviado: false, motivo: 'sin contactos hoy' });
    }

    const nombres = await nombresDeFichas([...dia.porFicha.keys()]);
    const ordenadas = [...dia.porFicha.entries()]
      .sort((a, b) => b[1].contactos - a[1].contactos || b[1].visitas - a[1].visitas);

    const lineas = ordenadas.map(([id, v]) => {
      const p = nombres.get(id);
      const quien = p
        ? `<a href="${urlFicha(p)}" style="color:#00255C;font-weight:600;">${escapar(p.business_name || 'sin nombre')}</a>`
        : '<span style="color:#9aa1ae;">ficha retirada</span>';
      const oficio = p?.categories?.[0] ? escapar(p.categories[0]) : 'sin oficio';
      const ciudad = p?.ciudad ? escapar(p.ciudad) : 'sin ciudad';
      return `${quien} — ${oficio} en ${ciudad}<br>`
        + `<span style="color:#6b7280;font-size:13px;">`
        + `<strong style="color:#1FAD4F;">${plural(v.contactos, 'contacto')}</strong>`
        + ` · ${plural(v.visitas, 'visita')} a la ficha hoy</span>`;
    });

    const visitasDeEsas = ordenadas.reduce((s, [, v]) => s + v.visitas, 0);
    const fecha = new Date(`${hoy}T00:00:00Z`)
      .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

    const fichasDelMes = [...mes.porFicha.keys()].length;
    const html = plantilla({
      titulo: `MisAutónomos · contactos del ${fecha}`,
      entradilla: `${plural(dia.total, 'contacto')} en ${plural(ordenadas.length, 'ficha')}.`,
      bloques: [
        cifras([
          { etiqueta: 'contactos hoy', valor: dia.total },
          { etiqueta: 'fichas con contacto', valor: ordenadas.length },
          { etiqueta: 'visitas a esas fichas', valor: visitasDeEsas },
        ]),
        seccion('Quién ha recibido contactos hoy', lineas),
      ],
      pie: `En lo que va de mes: ${plural(mes.total, 'contacto')} en `
        + `${plural(fichasDelMes, 'ficha distinta', 'fichas distintas')}.`
        + '<br>El contador sólo registra quien abre el formulario: las llamadas y los WhatsApp no se cuentan.'
        + '<br>Panel de MisAutónomos · <a href="https://misautonomos.es/admin" style="color:#8b93a7;">abrir el panel</a>',
    });

    const envio = await enviarCorreo({
      asunto: `MisAutónomos · ${plural(dia.total, 'contacto')} hoy, ${fecha}`,
      html,
    });
    if (envio.ok === false) return res.status(502).json({ error: 'resend', detalle: envio });
    return res.status(200).json({
      ok: true, enviado: true, envio, dia: hoy, contactos: dia.total, fichas: ordenadas.length, contactosMes: mes.total,
    });
  } catch (e) {
    console.error('[digest-contactos]', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
