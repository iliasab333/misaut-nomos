// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  INFORME DIARIO — 06:00 UTC, todos los días (08:00 en España ahora)     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Lo que pasó ayer, y lo que está esperando a que alguien lo mire. Esas dos
// cosas, y nada más: un informe diario que cuenta doce cifras no se lee a la
// tercera semana.
//
// Se calcula sobre el día natural de AYER —ventana [ayer, hoy), cerrada por
// los dos lados—, no sobre las últimas 24 horas: una ventana rodante mezcla
// media tarde de anteayer y el informe deja de poder compararse consigo mismo.
// Y tampoco se deja abierta por arriba: sin tope colaba el tráfico de hoy, y
// la cifra de portada del informe de ayer subía con la mañana.

import { esCronLegitimo } from '../_lib/guardia.js';
import { hayBase, cuenta, filas, metricas, nombresDeFichas, urlFicha, desde } from '../_lib/datos.js';
import { enviarCorreo, plantilla, cifras, seccion, alerta, escapar, plural, sinRastro } from '../_lib/correo.js';

const dia = (n) => desde(n).slice(0, 10);

export default async function handler(req, res) {
  const permiso = esCronLegitimo(req);
  if (!permiso.ok) return res.status(permiso.estado).json({ error: permiso.error });
  if (!hayBase()) return res.status(500).json({ error: 'faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' });

  try {
    const ayer = dia(1), anteayer = dia(2);

    const [
      fichasAyer, usuariosAyer, resenasAyer, ticketsAyer, altasBoletin,
      verifPendientes, ticketsAbiertos, mAyer, mAntes,
    ] = await Promise.all([
      filas(`professional_profiles?select=id,business_name,ciudad,categories,slug_publico,visible_en_busqueda,created_date&created_date=gte.${ayer}&created_date=lt.${dia(0)}&order=created_date.desc`),
      cuenta('users', `created_date=gte.${ayer}&created_date=lt.${dia(0)}`),
      cuenta('reviews', `created_date=gte.${ayer}&created_date=lt.${dia(0)}`),
      // Con tope por arriba, como las otras cuatro consultas del día. Sin él,
      // el apartado «Soporte nuevo» del informe de AYER listaba los tickets
      // abiertos hoy antes de que el dueño los hubiera visto en ningún sitio.
      filas(`tickets?select=id,title,creator_name,status,created_date&created_date=gte.${ayer}&created_date=lt.${dia(0)}&order=created_date.desc`),
      cuenta('newsletter_subscribers', `created_date=gte.${ayer}&created_date=lt.${dia(0)}`),
      filas('identity_verifications?select=id,created_date,document_type&status=eq.pending&order=created_date.asc'),
      // Por lo que NO está cerrado, no por `status=eq.open`. Esta base guarda
      // los estados en castellano («abierto») — lo escribe `AdminTickets` —
      // mientras que `AdminSoporte` escribe «open». Dos vocabularios conviven
      // en la misma columna, así que preguntar por uno de los dos da siempre
      // cero: con `eq.open` este aviso no se habría disparado nunca, teniendo
      // 4 tickets abiertos. Preguntando por lo cerrado aguanta además un
      // estado nuevo que a nadie se le ocurra añadir mañana.
      cuenta('tickets', 'status=not.in.(cerrado,closed,resuelto,resolved)'),
      // Cada día, cerrado por arriba. Antes las dos llamadas iban sin tope y
      // arrastraban lo que llevara medido HOY: la cifra de portada del informe
      // de ayer subía durante la mañana y el top de fichas se reordenaba.
      metricas(ayer, dia(0)),
      metricas(anteayer, ayer),
    ]);

    // Las dos ventanas ya son días sueltos, así que anteayer es lo que mide
    // `mAntes` y no hace falta restar nada. (Sí hacía falta cuando las dos
    // consultas eran acumuladas y `mAntes` incluía a `mAyer` dentro.)
    const soloAntes = { visitas: mAntes.visitas, contactos: mAntes.contactos };

    const nombres = await nombresDeFichas([...mAyer.porFicha.keys()]);
    const masVistas = [...mAyer.porFicha.entries()]
      .sort((a, b) => b[1].visitas - a[1].visitas)
      .filter(([, v]) => v.visitas > 0)
      .slice(0, 5)
      .map(([id, v]) => {
        const p = nombres.get(id);
        const quien = p ? escapar(p.business_name || 'sin nombre') : 'ficha retirada';
        const donde = p?.ciudad ? ` · ${escapar(p.ciudad)}` : '';
        const enlace = p ? `<a href="${urlFicha(p)}" style="color:#00255C;">${quien}</a>` : quien;
        // Con `plural`, no a mano: una ficha con una sola visita salía como
        // «1 visitas, 1 contactos», que es justo lo que delata una plantilla.
        return `${enlace}${donde} — <strong>${v.visitas}</strong> ${v.visitas === 1 ? 'visita' : 'visitas'}`
          + `${v.contactos ? `, ${plural(v.contactos, 'contacto')}` : ''}`;
      });

    const bloques = [
      cifras([
        { etiqueta: 'visitas a fichas', valor: mAyer.visitas, delta: mAyer.visitas - soloAntes.visitas },
        { etiqueta: 'contactos', valor: mAyer.contactos, delta: mAyer.contactos - soloAntes.contactos },
        { etiqueta: 'fichas nuevas', valor: fichasAyer.length },
        { etiqueta: 'registros', valor: usuariosAyer },
      ]),
    ];

    // Lo que espera a que alguien actúe va ARRIBA, antes de las novedades:
    // es lo único del correo sobre lo que hay que hacer algo.
    if (verifPendientes.length) {
      const vieja = verifPendientes[0];
      const dias = Math.floor((Date.now() - new Date(vieja.created_date).getTime()) / 86400000);
      // Igual que en el resumen semanal: por debajo de un día no se dice la
      // espera, y con una fecha ilegible tampoco. El aviso vale sin la cifra;
      // un «NaN días» se lo lleva por delante entero.
      const espera = Number.isFinite(dias) && dias >= 1 ? plural(dias, 'día') : null;
      bloques.push(alerta(
        `<strong>${plural(verifPendientes.length, 'verificación de identidad sin revisar', 'verificaciones de identidad sin revisar')}.</strong> `
        + (espera ? `La más antigua lleva <strong>${espera}</strong> esperando, y el producto les prometió 24-48 h.`
          : 'El producto les prometió 24-48 h.'),
      ));
    }
    if (ticketsAbiertos) {
      bloques.push(alerta(`<strong>${plural(ticketsAbiertos, 'ticket de soporte abierto', 'tickets de soporte abiertos')}.</strong>`));
    }

    bloques.push(seccion('Fichas nuevas', fichasAyer.map((p) => {
      const oficio = p.categories?.[0] ? escapar(p.categories[0]) : 'sin oficio';
      const ciudad = p.ciudad ? escapar(p.ciudad) : 'sin ciudad';
      const estado = p.visible_en_busqueda ? '' : ' <span style="color:#DC2626;">· sin publicar</span>';
      return `<a href="${urlFicha(p)}" style="color:#00255C;font-weight:600;">${escapar(p.business_name || 'sin nombre')}</a> — ${oficio} en ${ciudad}${estado}`;
    }), 'Ninguna ficha nueva ayer.'));

    bloques.push(seccion('Las más vistas de ayer', masVistas, 'Ayer no se abrió ninguna ficha.'));

    if (ticketsAyer.length) {
      bloques.push(seccion('Soporte nuevo', ticketsAyer.map((t) =>
        `<strong>${escapar(t.title || 'sin asunto')}</strong> — ${escapar(t.creator_name || 'anónimo')}`)));
    }
    if (altasBoletin) {
      bloques.push(seccion('Boletín', [`${plural(altasBoletin, 'alta nueva', 'altas nuevas')}.`]));
    }
    if (resenasAyer) {
      bloques.push(seccion('Valoraciones', [`${plural(resenasAyer, 'valoración nueva', 'valoraciones nuevas')}.`]));
    }

    const fecha = new Date(ayer).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const html = plantilla({
      titulo: `MisAutónomos · ${fecha}`,
      entradilla: `${plural(mAyer.visitas, 'visita')} y ${plural(mAyer.contactos, 'contacto')}. ${plural(fichasAyer.length, 'ficha nueva', 'fichas nuevas')}.`,
      bloques,
    });

    // `marca` es el candado. Lleva «resumen del» DENTRO, no sólo la fecha: el
    // digest de la tarde anterior tituló «1 contacto el jueves, 8 de octubre»
    // con esa misma fecha, y una marca que fuera sólo `fecha` la encontraba y
    // daba este informe por enviado. Comprobado: con la marca a secas el
    // informe diario desaparecía —HTTP 200, `enviado:false`— cada día en que
    // hubiera habido contactos la víspera. La marca tiene que identificar el
    // INFORME y el periodo, no el periodo solo.
    const asunto = `MisAutónomos · resumen del ${fecha}`;
    const envio = await enviarCorreo({ asunto, html, marca: `resumen del ${fecha}` });
    // `!envio.ok`, no `envio.ok === false`: con la clave de Resend o el
    // destinatario sin configurar, `enviarCorreo` no enviaba nada y este cron
    // respondía 200 y `ok:true`. Un cron en verde sin correo no se encuentra.
    if (!envio.ok) {
      const estado = envio.estado ? 502 : 500;
      return res.status(estado).json(sinRastro(envio, 'informe-diario'));
    }
    return res.status(200).json({
      ok: true, enviado: !envio.duplicado, envio,
      visitas: mAyer.visitas, contactos: mAyer.contactos, fichas: fichasAyer.length,
    });
  } catch (e) {
    console.error('[informe-diario]', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
