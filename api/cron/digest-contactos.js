// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  DIGEST DE CONTACTOS — 18:00 UTC, a diario (20:00 en España ahora)      ║
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
import { enviarCorreo, plantilla, cifras, seccion, escapar, plural, sinRastro } from '../_lib/correo.js';

/**
 * ¿Es `AAAA-MM-DD` de un día que de verdad existe? El regex solo no basta:
 * `2026-02-30` lo pasa y luego PostgREST devuelve un 400 que acaba en un 500
 * con la consulta cruda dentro. Vale más decirle al que teclea el parámetro
 * que ese día no existe.
 */
function diaValido(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

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
    // falló. Se valida antes de tocar la base: va directo a la consulta.
    const pedido = String(req.query?.dia || '');
    if (pedido && !diaValido(pedido)) {
      return res.status(400).json({ error: 'dia no válido: se espera AAAA-MM-DD de un día que exista' });
    }
    const diaDeHoy = new Date().toISOString().slice(0, 10);
    const hoy = pedido || diaDeHoy;
    const primeroDeMes = `${hoy.slice(0, 7)}-01`;

    // Con `?dia=` de un día pasado, decir «hoy» por todo el correo es mentir
    // justo en el caso para el que existe el parámetro. La fecha ya va en el
    // encabezado, así que basta con una palabra que valga en los dos modos.
    const esHoy = hoy === diaDeHoy;
    const cuando = esHoy ? 'hoy' : 'ese día';

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
      const nombre = (p?.business_name || '').trim();
      const quien = p
        ? `<a href="${urlFicha(p)}" style="color:#00255C;font-weight:600;">${escapar(nombre || 'sin nombre')}</a>`
        : '<span style="color:#9aa1ae;">ficha retirada</span>';

      // Las señas se montan con lo que haya, no con relleno: dos fichas de la
      // base tienen la ciudad vacía y el «— sin oficio en sin ciudad» que
      // salía de ahí se lee como una plantilla a medio hacer.
      const oficio = (p?.categories?.[0] || '').trim();
      const ciudad = (p?.ciudad || '').trim();
      const senas = oficio && ciudad
        ? `${escapar(oficio)} en ${escapar(ciudad)}`
        : escapar(oficio || ciudad);

      // Un «0 visitas» al lado de un contacto se lee como un error del
      // contador. Si no hay visitas que contar, no se menciona.
      const visitas = v.visitas ? ` · ${plural(v.visitas, 'visita')} a la ficha` : '';
      return `${quien}${senas ? ` — ${senas}` : ''}<br>`
        + `<span style="color:#6b7280;font-size:13px;">`
        + `<strong style="color:#1FAD4F;">${plural(v.contactos, 'contacto')}</strong>`
        + `${visitas}</span>`;
    });

    const visitasDeEsas = ordenadas.reduce((s, [, v]) => s + v.visitas, 0);
    const fecha = new Date(`${hoy}T00:00:00Z`)
      .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

    const fichasDelMes = [...mes.porFicha.keys()].length;

    // El día 1 el acumulado del mes ES el día, y repetir la misma cifra dos
    // líneas más abajo resta credibilidad al resto del correo.
    const mesAporta = mes.total !== dia.total || fichasDelMes !== ordenadas.length;
    const lineaMes = mesAporta
      ? `En lo que va de mes: ${plural(mes.total, 'contacto')} en `
        + `${plural(fichasDelMes, 'ficha distinta', 'fichas distintas')}.<br>`
      : '';

    const html = plantilla({
      titulo: `MisAutónomos · contactos del ${fecha}`,
      entradilla: `${plural(dia.total, 'contacto')} en ${plural(ordenadas.length, 'ficha')}.`,
      bloques: [
        cifras([
          { etiqueta: `contactos ${cuando}`, valor: dia.total },
          { etiqueta: 'fichas con contacto', valor: ordenadas.length },
          { etiqueta: 'visitas a esas fichas', valor: visitasDeEsas },
        ]),
        seccion(`Quién ha recibido contactos ${cuando}`, lineas),
      ],
      // Esta nota decía «el contador sólo registra quien abre el formulario:
      // las llamadas y los WhatsApp no se cuentan», y desde que `Autonomo.jsx`
      // llama a `trackMetric` también en Llamar y en WhatsApp eso es falso: le
      // estaba diciendo al dueño que desconfiara de su mejor cifra. Lo que sí
      // hay que advertir es el tope de `trackMetric`, que deduplica cinco
      // minutos por ficha y tipo: quien prueba el teléfono y luego el WhatsApp
      // en la misma ficha cuenta como UN contacto aquí, aunque haya llegado un
      // aviso instantáneo por cada uno.
      pie: lineaMes
        + 'Cuenta los tres botones: Llamar, WhatsApp y el formulario. Un mismo visitante en la misma '
        + 'ficha cuenta una vez cada cinco minutos, así que dos intentos seguidos suman uno.'
        + '<br>Panel de MisAutónomos · <a href="https://misautonomos.es/admin" style="color:#8b93a7;">abrir el panel</a>',
    });

    const envio = await enviarCorreo({
      asunto: esHoy
        ? `MisAutónomos · ${plural(dia.total, 'contacto')} hoy, ${fecha}`
        : `MisAutónomos · ${plural(dia.total, 'contacto')} el ${fecha}`,
      // El candado no puede ser el asunto entero —lleva el número de contactos
      // dentro, y ese número cambia entre las 20:00 y un reintento diez minutos
      // después— pero tampoco puede ser sólo la fecha: el informe diario de la
      // mañana siguiente titula «resumen del jueves, 8 de octubre» con esa
      // misma fecha, y los dos correos se darían por enviados el uno al otro.
      // «hoy, <fecha>» sale de este asunto y de ningún otro.
      //
      // Con `?dia=` no hay candado: eso lo pide una persona a mano para rehacer
      // un correo que falló, y negárselo porque «ya salió» es justo lo
      // contrario de lo que ha pedido.
      marca: esHoy ? `hoy, ${fecha}` : null,
      html,
    });
    if (!envio.ok) {
      const estado = envio.estado ? 502 : 500;
      return res.status(estado).json(sinRastro(envio, 'digest-contactos'));
    }
    return res.status(200).json({
      ok: true, enviado: !envio.duplicado, envio, dia: hoy, contactos: dia.total, fichas: ordenadas.length, contactosMes: mes.total,
    });
  } catch (e) {
    console.error('[digest-contactos]', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
