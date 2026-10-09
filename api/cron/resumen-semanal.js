// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  RESUMEN SEMANAL — lunes a las 07:00 UTC (09:00 en España ahora)        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// El informe diario dice qué pasó ayer. Este dice si la cosa va hacia arriba o
// hacia abajo, que es una pregunta que un solo día no puede contestar: por eso
// cada cifra viene con la de los siete días anteriores al lado. Una cifra
// semanal suelta no se puede juzgar.
//
// Lo que de verdad justifica el correo es el apartado de fichas sin una sola
// visita en siete días. Hoy eso no se ve en ningún sitio del panel, y son los
// autónomos que se van a dar de baja: cuando lo hagan, el dato de que llevaban
// una semana sin que nadie les abriera la ficha llega tarde.
//
// Ventana: los 7 días naturales cerrados anteriores a hoy. No las últimas 168
// horas — a las 07:00 del lunes una ventana rodante mete media mañana del lunes
// anterior y el correo deja de poder compararse con el de la semana pasada.

import { esCronLegitimo } from '../_lib/guardia.js';
import { hayBase, cuenta, filas, urlFicha, desde } from '../_lib/datos.js';
import { enviarCorreo, plantilla, cifras, seccion, alerta, escapar, plural, sinRastro } from '../_lib/correo.js';

const dia = (n) => desde(n).slice(0, 10);

// Supabase corta en 1000 filas TODA consulta a PostgREST, y pedir `limit=20000`
// no sube ese techo: se ignora sin decir nada. Comprobado contra producción —
// `profile_metrics?limit=5000` devuelve 1000 filas y una cabecera que no se
// queja. Por eso se pagina en vez de poner un número grande y confiar: hoy una
// semana son ~330 filas, pero octubre va a 5× septiembre y el día que una
// semana pase de 1000 el correo empezaría a contar de menos sin que nada lo
// delate, que es justo el fallo que un informe automático no puede permitirse.
const PAGINA = 1000;
const TOPE_PAGINAS = 60;

/**
 * Trae TODAS las filas de una consulta, página a página.
 *
 * La ruta tiene que traer su propio `order=`: sin orden, dos páginas de
 * PostgREST pueden repetir y perderse filas, y una suma con filas repetidas es
 * peor que una suma corta porque no se nota.
 */
async function todas(ruta) {
  const acumulado = [];
  for (let p = 0; p < TOPE_PAGINAS; p += 1) {
    const trozo = await filas(`${ruta}&limit=${PAGINA}&offset=${p * PAGINA}`);
    acumulado.push(...trozo);
    if (trozo.length < PAGINA) return acumulado;
  }
  // Antes de devolver un informe mutilado, que falle y se vea en los logs.
  throw new Error(`la consulta pasa de ${TOPE_PAGINAS * PAGINA} filas: ${ruta.slice(0, 80)}`);
}

/**
 * Suma `profile_metrics` en una ventana [desde, hasta) y la reparte por ficha.
 *
 * No se reutiliza `metricas()` de `_lib/datos.js` porque sólo acepta fecha de
 * inicio: acumula hasta hoy. El informe diario se las arregla restando dos
 * acumulados, pero aquí harían falta tres consultas para dos semanas y el
 * redondeo de la resta se nota. Con las dos fechas, cada semana es exacta.
 */
async function ventana(desdeDia, hastaDia) {
  const f = await todas(
    'profile_metrics?select=professional_id,date,profile_views,search_appearances,contact_clicks'
    + `&date=gte.${desdeDia}&date=lt.${hastaDia}&order=id.asc`,
  );
  const tot = { visitas: 0, apariciones: 0, contactos: 0, filas: f.length };
  const porFicha = new Map();
  for (const r of f) {
    const v = Number(r.profile_views || 0), a = Number(r.search_appearances || 0), c = Number(r.contact_clicks || 0);
    tot.visitas += v; tot.apariciones += a; tot.contactos += c;
    const p = porFicha.get(r.professional_id) || { visitas: 0, contactos: 0 };
    p.visitas += v; p.contactos += c;
    porFicha.set(r.professional_id, p);
  }
  return { ...tot, porFicha, diasConDatos: new Set(f.map((r) => r.date)).size };
}

/**
 * Las n claves con más peso de un mapa nombre → número, sin los ceros.
 *
 * El empate se deshace por orden alfabético y no se deja al azar: con dos
 * oficios a 25 visitas, el orden en que PostgREST devolvió las filas decidía
 * cuál salía antes, y dos ejecuciones del mismo lunes daban listas distintas.
 * Un informe que cambia sin que cambien los datos no se puede creer.
 */
const ranking = (mapa, n) => [...mapa.entries()]
  .filter(([, v]) => v > 0)
  .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'es'))
  .slice(0, n);

export default async function handler(req, res) {
  const permiso = esCronLegitimo(req);
  if (!permiso.ok) return res.status(permiso.estado).json({ error: permiso.error });
  if (!hayBase()) return res.status(500).json({ error: 'faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' });

  try {
    const hoy = dia(0), inicio = dia(7), inicioPrevia = dia(14);

    // El panel guarda los tickets abiertos como «abierto», no como «open». Se
    // pregunta por lo que NO está cerrado para que un estado nuevo cuente como
    // pendiente en vez de desaparecer del aviso — y el `status.is.null` va
    // aparte porque en SQL `NOT (NULL IN (...))` no es cierto, es nulo: sin esa
    // mitad, un ticket sin estado se escapaba justo del aviso que lo buscaba.
    const sinCerrar = 'or=(status.is.null,status.not.in.(cerrado,closed,resuelto,resolved))';

    const [
      semana, previa, fichasNuevas, registros, registrosPrevios, fichasPreviasN,
      resenas, altasBoletin, verifN, verifMasVieja, ticketsAbiertos, ticketsNuevos,
      posts, fichasPublicadas,
    ] = await Promise.all([
      ventana(inicio, hoy),
      ventana(inicioPrevia, inicio),
      todas(`professional_profiles?select=id,business_name,ciudad,categories,slug_publico,visible_en_busqueda,created_date&created_date=gte.${inicio}&created_date=lt.${hoy}&order=created_date.desc`),
      cuenta('users', `created_date=gte.${inicio}&created_date=lt.${hoy}`),
      cuenta('users', `created_date=gte.${inicioPrevia}&created_date=lt.${inicio}`),
      cuenta('professional_profiles', `created_date=gte.${inicioPrevia}&created_date=lt.${inicio}`),
      cuenta('reviews', `created_date=gte.${inicio}&created_date=lt.${hoy}`),
      cuenta('newsletter_subscribers', `created_date=gte.${inicio}&created_date=lt.${hoy}`),
      // Del montón de verificaciones pendientes el correo sólo usa cuántas son
      // y cuánto lleva esperando la más vieja: una cuenta y una fila, en vez de
      // traerse la cola entera para medirla con `.length`.
      cuenta('identity_verifications', 'status=eq.pending'),
      filas('identity_verifications?select=created_date&status=eq.pending&order=created_date.asc&limit=1'),
      cuenta('tickets', sinCerrar),
      // Los nuevos se cuentan también sin cerrar: si no, el aviso diría «uno
      // llegó esta semana» hablando de un ticket que ya se cerró y que por
      // tanto no está entre los que dice que quedan.
      cuenta('tickets', `created_date=gte.${inicio}&created_date=lt.${hoy}&${sinCerrar}`),
      // `nullslast` porque en Postgres `ORDER BY views DESC` pone los nulos
      // PRIMERO: un artículo recién publicado sin contador encabezaría la lista
      // de los más leídos con cero lecturas.
      filas('blog_posts?select=title_es,slug,views&status=eq.published&order=views.desc.nullslast&limit=3'),
      // Todas las fichas, no sólo las que tuvieron actividad: el apartado
      // importante de este correo es justamente el de las que no la tuvieron.
      todas('professional_profiles?select=id,business_name,ciudad,categories,slug_publico,visible_en_busqueda,created_date&order=id.asc'),
    ]);

    const porId = new Map(fichasPublicadas.map((p) => [p.id, p]));
    const nombre = (p) => escapar(p?.business_name || 'sin nombre');
    // `urlFicha` monta la dirección con el `slug_publico` tal cual viene de la
    // base, y en producción hay slugs con tildes. Hoy ninguno trae comillas,
    // pero el que las traiga rompería el atributo `href`: se escapa aquí.
    const enlazada = (p) => `<a href="${escapar(urlFicha(p))}" style="color:#00255C;font-weight:600;">${nombre(p)}</a>`;

    // Sin semana previa no se compara nada. Pasa en la primera ejecución y
    // volvería a pasar si se reinicia la tabla de métricas: es mejor un correo
    // sin flechas que un correo que dice «▲ 329» porque antes no había nada.
    const hayPrevia = previa.filas > 0;
    const delta = (ahora, antes) => (hayPrevia ? ahora - antes : null);

    const bloques = [
      cifras([
        { etiqueta: 'visitas a fichas', valor: semana.visitas, delta: delta(semana.visitas, previa.visitas) },
        { etiqueta: 'contactos', valor: semana.contactos, delta: delta(semana.contactos, previa.contactos) },
        { etiqueta: 'fichas nuevas', valor: fichasNuevas.length, delta: delta(fichasNuevas.length, fichasPreviasN) },
        { etiqueta: 'registros', valor: registros, delta: delta(registros, registrosPrevios) },
      ]),
    ];

    if (!hayPrevia) {
      bloques.push(seccion('Comparación', [
        'No hay datos de la semana anterior, así que esta vez las cifras van sin flechas. El lunes que viene ya habrá con qué comparar.',
      ]));
    }

    // Lo que espera a que alguien actúe va antes de las listas: es lo único del
    // correo sobre lo que hay que hacer algo hoy.
    if (verifN) {
      const dias = Math.floor((Date.now() - new Date(verifMasVieja[0]?.created_date).getTime()) / 86400000);
      // Por debajo de un día se dice en palabras: «lleva 0 días esperando»
      // suena a error de cálculo aunque sea cierto. Y si la fecha no se puede
      // leer, el aviso va sin la espera antes que con un «NaN días».
      const espera = Number.isFinite(dias) && dias >= 1 ? plural(dias, 'día') : null;
      bloques.push(alerta(
        `<strong>${plural(verifN, 'verificación de identidad sin revisar', 'verificaciones de identidad sin revisar')}.</strong> `
        + (espera ? `La más antigua lleva <strong>${espera}</strong> esperando, y el producto les prometió 24-48 h.`
          : 'El producto les prometió 24-48 h.'),
      ));
    }
    if (ticketsAbiertos) {
      bloques.push(alerta(
        `<strong>${plural(ticketsAbiertos, 'ticket de soporte sin cerrar', 'tickets de soporte sin cerrar')}.</strong>`
        + (ticketsNuevos ? ` ${ticketsNuevos === 1 ? 'Uno llegó' : `${ticketsNuevos} llegaron`} esta semana.` : ''),
      ));
    }

    // A igualdad de visitas manda quien recibió más contactos, y después el
    // nombre: dos fichas con 13 visitas no pueden entrar y salir del top por el
    // orden en que vinieron las filas.
    const masVistas = [...semana.porFicha.entries()]
      .filter(([, v]) => v.visitas > 0)
      .sort(([ia, a], [ib, b]) => b.visitas - a.visitas
        || b.contactos - a.contactos
        || String(porId.get(ia)?.business_name || ia).localeCompare(String(porId.get(ib)?.business_name || ib), 'es'))
      .slice(0, 5);

    bloques.push(seccion('Las 5 más vistas de la semana', masVistas.map(([id, v]) => {
      const p = porId.get(id);
      const quien = p ? enlazada(p) : 'ficha retirada';
      const donde = p?.ciudad ? ` · ${escapar(p.ciudad)}` : '';
      return `${quien}${donde} — <strong>${v.visitas}</strong> ${v.visitas === 1 ? 'visita' : 'visitas'}${v.contactos ? `, ${plural(v.contactos, 'contacto')}` : ''}`;
    }), 'Esta semana no se abrió ninguna ficha.'));

    // Una ficha creada el jueves no lleva una semana sin visitas: lleva tres
    // días. Sólo entran las que ya existían cuando empezó la ventana, o el
    // correo regañaría por fichas recién publicadas.
    const antiguas = fichasPublicadas
      .filter((p) => p.visible_en_busqueda && p.created_date && p.created_date < inicio)
      .sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)));
    const mudas = antiguas.filter((p) => !(semana.porFicha.get(p.id)?.visitas > 0));

    if (!semana.filas) {
      // Sin una sola fila de métricas en la ventana, TODAS las fichas salen
      // mudas y el correo acusaría a los autónomos de una avería nuestra:
      // «56 de 56 se van a dar de baja». Esto es lo más valioso del correo
      // precisamente porque se puede actuar sobre él, y por eso no se dice sin
      // datos que lo sostengan.
      bloques.push(seccion('Publicadas y sin una sola visita', [
        'No hay ninguna medición de estos siete días, así que no se puede saber qué fichas se quedaron sin visitas.',
        `<span style="color:#6b7280;">Las ${plural(antiguas.length, 'ficha publicada', 'fichas publicadas')} de antes de la semana aparecen todas a cero, y eso apunta a la recogida de métricas, no a las fichas.</span>`,
      ]));
    } else {
      bloques.push(seccion(
        'Publicadas y sin una sola visita',
        mudas.length
          ? [
            `<strong>${mudas.length} de ${antiguas.length} fichas publicadas</strong> no recibieron ninguna visita en los siete días. Son las bajas de dentro de dos meses.`,
            ...mudas.slice(0, 8).map((p) => {
              const oficio = p.categories?.[0] ? escapar(p.categories[0]) : 'sin oficio';
              const ciudad = p.ciudad ? escapar(p.ciudad) : 'sin ciudad';
              return `${enlazada(p)} — ${oficio} en ${ciudad}`;
            }),
            ...(mudas.length > 8 ? [`<span style="color:#6b7280;">y ${plural(mudas.length - 8, 'ficha más', 'fichas más')}.</span>`] : []),
          ]
          : [],
        antiguas.length
          ? 'Ninguna. Todas las fichas publicadas recibieron al menos una visita esta semana.'
          : 'Todavía no hay fichas publicadas de antes de la semana.',
      ));
    }

    // Qué demanda hay, deducido de qué fichas se abrieron: no existe un registro
    // de términos buscados, así que el oficio y la ciudad de la ficha vista es
    // lo más cerca que se puede estar del dato sin inventarlo.
    const porOficio = new Map(), porCiudad = new Map();
    for (const [id, v] of semana.porFicha) {
      const p = porId.get(id);
      if (!p || !v.visitas) continue;
      const oficio = p.categories?.[0], ciudad = p.ciudad;
      if (oficio) porOficio.set(oficio, (porOficio.get(oficio) || 0) + v.visitas);
      if (ciudad) porCiudad.set(ciudad, (porCiudad.get(ciudad) || 0) + v.visitas);
    }
    const lista = (r) => r.map(([k, v]) => `${escapar(k)} <strong>${v}</strong>`).join(' · ');
    const demanda = [];
    if (porOficio.size) demanda.push(`<span style="color:#6b7280;">Oficios</span><br>${lista(ranking(porOficio, 5))}`);
    if (porCiudad.size) demanda.push(`<span style="color:#6b7280;">Ciudades</span><br>${lista(ranking(porCiudad, 5))}`);
    bloques.push(seccion('Qué se miró, por visitas a la ficha', demanda, 'Sin visitas no hay nada que deducir.'));

    const sueltos = [];
    if (fichasNuevas.length) {
      const sinPublicar = fichasNuevas.filter((p) => !p.visible_en_busqueda).length;
      sueltos.push(`${plural(fichasNuevas.length, 'ficha nueva', 'fichas nuevas')}`
        + (sinPublicar ? `, <span style="color:#DC2626;">${sinPublicar} sin publicar</span>` : '') + '.');
    }
    if (altasBoletin) sueltos.push(`${plural(altasBoletin, 'alta nueva', 'altas nuevas')} en el boletín.`);
    if (resenas) sueltos.push(`${plural(resenas, 'valoración nueva', 'valoraciones nuevas')}.`);
    sueltos.push(`${plural(semana.apariciones, 'aparición', 'apariciones')} en resultados de búsqueda.`);
    bloques.push(seccion('Lo demás de la semana', sueltos));

    // `blog_posts.views` es el acumulado desde que se publicó el artículo: no
    // hay histórico por día, así que esto no son las visitas de la semana y el
    // título lo dice. Mentir aquí sería fácil y se notaría al tercer correo.
    if (posts.length) {
      bloques.push(seccion('Blog, los más leídos en total', posts.map((p) =>
        `<a href="https://misautonomos.es/blog/${escapar(p.slug || '')}" style="color:#00255C;font-weight:600;">${escapar(p.title_es || 'sin título')}</a>`
        + ` — <strong>${Number(p.views || 0)}</strong> lecturas acumuladas`)));
    }

    // «del 2 al 8 de octubre», pero «del 25 de septiembre al 1 de octubre»
    // cuando la semana cruza el mes: sin el mes en la primera fecha, «del 25 al
    // 1 de octubre» parece una errata.
    const fin = new Date(dia(1));
    const conMes = { day: 'numeric', month: 'long', timeZone: 'UTC' };
    const primero = new Date(inicio);
    const rango = `del ${primero.toLocaleDateString('es-ES', primero.getUTCMonth() === fin.getUTCMonth() ? { day: 'numeric', timeZone: 'UTC' } : conMes)}`
      + ` al ${fin.toLocaleDateString('es-ES', conMes)}`;

    const comparacion = hayPrevia
      ? ` La semana anterior fueron ${plural(previa.visitas, 'visita')} y ${plural(previa.contactos, 'contacto')}.`
      : '';
    const html = plantilla({
      titulo: `MisAutónomos · semana ${rango}`,
      entradilla: `${plural(semana.visitas, 'visita')} y ${plural(semana.contactos, 'contacto')} en siete días.`
        + ` ${plural(fichasNuevas.length, 'ficha nueva', 'fichas nuevas')} y ${plural(registros, 'registro')}.${comparacion}`,
      bloques,
    });

    // «semana del 2 al 8 de octubre»: el rango identifica la semana y la
    // palabra «semana» identifica el informe. Lo segundo no es adorno — con la
    // marca a secas, dos informes distintos del mismo periodo se dan por
    // enviados el uno al otro (le pasaba al diario con el digest).
    const envio = await enviarCorreo({ asunto: `MisAutónomos · semana ${rango}`, html, marca: `semana ${rango}` });
    if (!envio.ok) {
      const estado = envio.estado ? 502 : 500;
      return res.status(estado).json(sinRastro(envio, 'resumen-semanal'));
    }
    return res.status(200).json({
      ok: true,
      enviado: !envio.duplicado,
      envio,
      ventana: { inicio, fin: hoy },
      visitas: semana.visitas,
      contactos: semana.contactos,
      fichas: fichasNuevas.length,
      registros,
      // `null`, no `0`: sin métricas de la ventana no se sabe cuántas fichas se
      // quedaron sin visitas, y un 56 aquí se leería como una fuga de clientes.
      sinVisitas: semana.filas ? mudas.length : null,
      comparada: hayPrevia,
      filasMetricas: { semana: semana.filas, previa: previa.filas },
    });
  } catch (e) {
    console.error('[resumen-semanal]', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
