// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  RESUMEN MENSUAL — el día 1 a las 07:00 UTC (09:00 en España ahora)     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// El mes natural ANTERIOR completo, comparado con el mes anterior a ése. No
// son 30 días rodantes a propósito: un mensual rodante no se puede comparar
// con el que se envió el mes pasado, que es justo para lo que sirve.
//
// Es el correo que se lee con calma una vez al mes, así que puede ser más
// largo que el diario. La regla sigue siendo la misma: cada cifra tiene que
// llevar a una decisión. Si una no la lleva, fuera.
//
// La cifra que de verdad importa aquí es «contactos por ficha publicada», y no
// la mira nadie porque no sale en ningún panel. Si sube el catálogo y baja esa
// división, el directorio está repartiendo menos trabajo entre más gente: los
// autónomos que entraron este mes van a renovar peor, y eso se ve un mes antes
// aquí que en los cobros.
//
// Todo lo demás de este fichero es cautela contra el mismo error, que tiene
// dos caras: afirmar un cero donde sólo hay un hueco, y comparar contra él.

import { esCronLegitimo } from '../_lib/guardia.js';
import { hayBase, cuenta, filas, nombresDeFichas, urlFicha } from '../_lib/datos.js';
import { enviarCorreo, plantilla, cifras, seccion, alerta, escapar, plural, sinRastro } from '../_lib/correo.js';

/**
 * Los tres cortes del mes, a medianoche UTC. `Date.UTC` normaliza los meses
 * fuera de rango, y de eso vive esta función: en enero `m - 1` es -1 y sale
 * diciembre del año anterior sin un solo `if`. Es el punto donde este tipo de
 * informe se rompe siempre, y aquí se rompe en una prueba, no en producción.
 */
function cortesDelMes(ahora = new Date()) {
  const y = ahora.getUTCFullYear();
  const m = ahora.getUTCMonth();
  return {
    inicio: new Date(Date.UTC(y, m - 1, 1)),      // primer día del mes del informe
    fin: new Date(Date.UTC(y, m, 1)),             // exclusivo: el día 1 de hoy
    inicioPrevio: new Date(Date.UTC(y, m - 2, 1)), // el mes con el que se compara
  };
}

const dia = (d) => d.toISOString().slice(0, 10);

/**
 * Una tabla entera, pedida de mil en mil.
 *
 * PostgREST devuelve 1.000 filas como máximo y se COME el resto sin avisar:
 * `limit=5000` responde con mil, lo comprobé contra producción. Por eso en
 * este fichero no hay ni una consulta con `limit` a pelo, ni para las métricas
 * ni para el catálogo: con 56 fichas × 31 días un mes ya puede dar 1.736 filas
 * de métricas, y el día que el catálogo pase de mil fichas la consulta de
 * perfiles empezaría a truncarse igual de callada y el informe mentiría por lo
 * bajo justo cuando más gente dependiera de él.
 *
 * Se ordena por `id` —único en las dos tablas que se leen aquí— y no por
 * `date` ni `created_date`, porque con fechas repetidas el orden entre páginas
 * no está garantizado y se duplicarían unas filas y se perderían otras.
 */
async function todasLasFilas(tabla, consulta) {
  const TAMANO = 1000;
  const todas = [];
  for (let salto = 0; salto < 200000; salto += TAMANO) {
    const trozo = await filas(`${tabla}?${consulta}&order=id.asc&limit=${TAMANO}&offset=${salto}`);
    todas.push(...trozo);
    if (trozo.length < TAMANO) break;
  }
  return todas;
}

/**
 * Suma `profile_metrics` en una ventana [desde, hasta) y de paso la parte por
 * ficha, que es de donde sale el top 10.
 *
 * Devuelve también `medidas`, el número de filas leídas, no sólo lo que suman:
 * un mes con mediciones a cero y un mes SIN mediciones dan la misma cifra y
 * son cosas distintas. Sin ese contador el informe no puede distinguir «nadie
 * visitó» de «el contador no escribió», y las dos conclusiones llevan a
 * decisiones opuestas.
 */
async function metricasEntre(desdeDia, hastaDia) {
  const f = await todasLasFilas(
    'profile_metrics',
    'select=professional_id,profile_views,search_appearances,contact_clicks'
    + `&date=gte.${desdeDia}&date=lt.${hastaDia}`,
  );
  const total = { visitas: 0, apariciones: 0, contactos: 0 };
  const porFicha = new Map();
  for (const r of f) {
    const v = Number(r.profile_views || 0);
    const a = Number(r.search_appearances || 0);
    const c = Number(r.contact_clicks || 0);
    total.visitas += v; total.apariciones += a; total.contactos += c;
    const p = porFicha.get(r.professional_id) || { visitas: 0, contactos: 0 };
    p.visitas += v; p.contactos += c;
    porFicha.set(r.professional_id, p);
  }
  return { ...total, porFicha, medidas: f.length };
}

/** «+252 % que el mes anterior». Sin base no se inventa un porcentaje. */
function variacion(ahora, antes, hayPrevio = true) {
  if (!hayPrevio) return 'sin mes anterior medido con el que comparar';
  if (!antes) return ahora ? 'sin base con la que comparar' : 'igual que el mes anterior';
  const pct = Math.round(((ahora - antes) / antes) * 100);
  if (pct === 0) return 'igual que el mes anterior';
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)} % que el mes anterior`;
}

/** La misma variación, para meterla entre paréntesis detrás de una cifra. */
function pctCorto(ahora, antes) {
  if (!antes) return ahora ? 'sin base' : 'igual';
  const pct = Math.round(((ahora - antes) / antes) * 100);
  return pct === 0 ? 'igual' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`;
}

// Dos decimales, no uno: esta división vive entre 0,1 y 0,3, y con un decimal
// 0,136 y 0,176 se imprimen «0,1» y «0,2», que se lee como que ha caído a la
// mitad cuando ha caído un 23 %. Un redondeo que exagera en el único sitio del
// correo que pide una decisión es peor que no poner la cifra.
const dosDecimales = (n) => n.toFixed(2).replace('.', ',');

// Separador de miles del castellano. Ojo con lo que se espera: en es-ES los
// números de cuatro cifras van SIN punto («1394»), y a partir de cinco con él
// («10.394»). Es lo correcto según CLDR, no un fallo del formateador.
const miles = (n) => n.toLocaleString('es-ES');

const conMayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function handler(req, res) {
  const permiso = esCronLegitimo(req);
  if (!permiso.ok) return res.status(permiso.estado).json({ error: permiso.error });
  if (!hayBase()) return res.status(500).json({ error: 'faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' });

  try {
    const { inicio, fin, inicioPrevio } = cortesDelMes();
    const dIni = dia(inicio), dFin = dia(fin), dPrev = dia(inicioPrevio);

    const [mes, previo, perfiles, registros, registrosPrevios, valoraciones, valoracionesPrevias] = await Promise.all([
      metricasEntre(dIni, dFin),
      metricasEntre(dPrev, dIni),
      // Todas las fichas de una vez: hacen falta completas para el stock a dos
      // fechas y para la salud del catálogo.
      todasLasFilas(
        'professional_profiles',
        'select=id,business_name,ciudad,categories,slug_publico,visible_en_busqueda,imagen_principal,photos,created_date,identity_verified,total_reviews',
      ),
      cuenta('users', `created_date=gte.${dIni}&created_date=lt.${dFin}`),
      cuenta('users', `created_date=gte.${dPrev}&created_date=lt.${dIni}`),
      cuenta('reviews', `created_date=gte.${dIni}&created_date=lt.${dFin}`),
      cuenta('reviews', `created_date=gte.${dPrev}&created_date=lt.${dIni}`),
    ]);

    // Si el mes de comparación no tiene NI UNA medición, su cero no es un
    // cero: es un hueco. Es el caso real de junio de 2026, cuyo mes anterior
    // —mayo— no tiene una sola fila: comparar contra él imprimía «▲113
    // visitas» y «frente a 0,00 contactos por ficha», o sea un crecimiento
    // inventado a partir de una tabla vacía. Las cifras que NO salen de
    // `profile_metrics` (registros, valoraciones, fichas nuevas) sí se siguen
    // comparando: esas tablas no dejaron de escribir.
    const hayPrevio = previo.medidas > 0;

    const publicadas = perfiles.filter((p) => p.visible_en_busqueda);

    // Cuántas fichas había publicadas en una fecha pasada. Se mide con
    // `created_date` y no con `fecha_publicacion` porque esa columna está
    // vacía en 21 de las 56 fichas y daría un catálogo más pequeño del real.
    // Limitación conocida: `visible_en_busqueda` es el estado de HOY, no hay
    // histórico, así que una ficha despublicada después no cuenta en el mes en
    // que sí estaba. Con un catálogo que sólo crece el sesgo es mínimo; si
    // algún día se despublica en serio, esto hay que historificarlo.
    const stock = (corte) => publicadas.filter(
      (p) => p.created_date && new Date(p.created_date) < corte,
    ).length;

    const fichasAlEmpezar = stock(inicio);
    const fichasAlAcabar = stock(fin);

    const enVentana = (lista, a, b) => lista.filter(
      (x) => x.created_date && new Date(x.created_date) >= a && new Date(x.created_date) < b,
    );
    const nuevasDelMes = enVentana(perfiles, inicio, fin).length;
    const nuevasPrevias = enVentana(perfiles, inicioPrevio, inicio).length;

    // La división que nadie mira. Cada mes se divide por las fichas que había
    // publicadas al ACABAR ese mes, para que los dos meses se midan igual.
    const porFichaMes = fichasAlAcabar ? mes.contactos / fichasAlAcabar : 0;
    const porFichaPrevio = fichasAlEmpezar ? previo.contactos / fichasAlEmpezar : 0;
    // El aviso exige una caída de verdad, del 10 % para arriba. Con el umbral
    // en «menor que», 0,1499 frente a 0,1501 disparaba un párrafo diciendo que
    // el directorio reparte menos trabajo por una diferencia de 0,0002. Una
    // alarma que salta por ruido se aprende a ignorar en dos meses.
    const repartoEmpeora = hayPrevio && mes.medidas > 0
      && porFichaMes < porFichaPrevio * 0.9
      && fichasAlAcabar > fichasAlEmpezar;

    // Sólo se piden los nombres de las diez del top. `nombresDeFichas` corta a
    // 60 identificadores, y pasarle todas las fichas con métricas dejaría el
    // top sin nombres el día que el catálogo pase de ahí.
    //
    // El desempate por contactos no es cosmético: con el orden anterior, a
    // igualdad de visitas entraba la que el mapa hubiera visto primero, así que
    // en septiembre la décima plaza se la llevó una ficha de 5 visitas y
    // ningún contacto por delante de otra de 5 visitas y un contacto.
    const top = [...mes.porFicha.entries()]
      .filter(([, v]) => v.visitas > 0)
      .sort((a, b) => b[1].visitas - a[1].visitas || b[1].contactos - a[1].contactos)
      .slice(0, 10);
    const nombres = await nombresDeFichas(top.map(([id]) => id));

    // Fichas que estuvieron publicadas el mes ENTERO y no recibieron ni una
    // visita. El corte es `< inicio`, no `< fin`: una ficha creada el día 30 no
    // ha tenido un mes para recibir una visita, y contarla aquí la acusa de
    // invisible el día que llega y encima infla el denominador. En septiembre
    // de 2026 el criterio viejo listaba cuatro, de las cuales dos se habían
    // creado el 30 — la mitad de la lista era falsa, y la frase «no recibieron
    // ni una visita en todo el mes» no era verdad de ninguna de las dos. El
    // error va en los dos sentidos: en agosto decía «13 de 34» cuando de las
    // que estuvieron el mes completo eran 13 de 28.
    const todoElMes = publicadas.filter((p) => p.created_date && new Date(p.created_date) < inicio);
    const conAlgunaVisita = new Set(
      [...mes.porFicha.entries()].filter(([, v]) => v.visitas > 0).map(([id]) => id),
    );
    const sinNingunaVisita = todoElMes.filter((p) => !conAlgunaVisita.has(p.id)).length;

    const sinFoto = publicadas.filter((p) => !p.imagen_principal && !(p.photos?.length)).length;
    const sinValoracion = publicadas.filter((p) => !p.total_reviews).length;
    const sinVerificar = publicadas.filter((p) => !p.identity_verified).length;

    const nombreMes = inicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const nombrePrevio = inicioPrevio.toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' });

    // Sin mediciones las dos primeras casillas van con una raya. Un cero ahí
    // afirma que nadie entró; la raya dice que no se sabe, que es lo que pasa.
    const bloques = [
      cifras([
        { etiqueta: 'visitas a fichas', valor: mes.medidas ? miles(mes.visitas) : '—', delta: hayPrevio && mes.medidas ? mes.visitas - previo.visitas : null },
        { etiqueta: 'contactos', valor: mes.medidas ? mes.contactos : '—', delta: hayPrevio && mes.medidas ? mes.contactos - previo.contactos : null },
        { etiqueta: 'fichas nuevas', valor: nuevasDelMes, delta: nuevasDelMes - nuevasPrevias },
        { etiqueta: 'registros', valor: registros, delta: registros - registrosPrevios },
        { etiqueta: 'valoraciones', valor: valoraciones, delta: valoraciones - valoracionesPrevias },
      ]),
    ];

    // Si no hay NI UNA medición en todo el mes, el problema no es que nadie
    // visitara: es que el contador no escribió. Decir «56 fichas invisibles»
    // con la tabla vacía sería inventarse una conclusión a partir de un hueco,
    // y además taparía la avería, que es lo único que habría que arreglar.
    if (!mes.medidas) {
      bloques.push(alerta(
        '<strong>No hay ni una medición de todo el mes.</strong> La tabla de métricas no registró nada entre '
        + `${escapar(dIni)} y ${escapar(dFin)}, así que no se sabe cuántas visitas ni cuántos contactos hubo. `
        + 'Hay que mirar si el contador dejó de escribir; hasta entonces, el resto del correo sólo habla del catálogo.',
      ));
    }

    // El diagnóstico va inmediatamente después de las cifras, antes de
    // cualquier lista: es lo único del correo que cambia una decisión. Con el
    // mes sin medir no se pone, porque la división sería 0 partido por lo que
    // sea y el párrafo contradiría al aviso de arriba en el mismo correo.
    if (mes.medidas) {
      const fraseReparto = hayPrevio
        ? `<strong>${dosDecimales(porFichaMes)} contactos por ficha publicada</strong> en ${escapar(nombreMes)}, `
          + `frente a ${dosDecimales(porFichaPrevio)} en ${escapar(nombrePrevio)}.`
        : `<strong>${dosDecimales(porFichaMes)} contactos por ficha publicada</strong> en ${escapar(nombreMes)}. `
          + `${escapar(conMayuscula(nombrePrevio))} no tiene mediciones, así que no hay con qué comparar.`;

      if (repartoEmpeora) {
        const caida = Math.round((1 - porFichaMes / porFichaPrevio) * 100);
        bloques.push(alerta(
          `${fraseReparto} El catálogo subió de ${fichasAlEmpezar} a ${fichasAlAcabar} fichas y lo que recibe cada una `
          + `bajó un ${caida} %: el directorio está repartiendo menos trabajo entre más gente. Captar más autónomos `
          + 'sin traer más demanda empeora lo que recibe cada uno, y eso se nota en las renovaciones antes que en '
          + 'ningún otro sitio.',
        ));
      } else {
        bloques.push(seccion('Lo que recibe cada ficha', [fraseReparto]));
      }
    }

    bloques.push(seccion('Crecimiento de la oferta', [
      `De <strong>${fichasAlEmpezar}</strong> ${fichasAlEmpezar === 1 ? 'ficha publicada' : 'fichas publicadas'} al empezar el mes `
      + `a <strong>${fichasAlAcabar}</strong> al acabarlo`
      + `${fichasAlAcabar !== fichasAlEmpezar ? ` (${fichasAlAcabar > fichasAlEmpezar ? '+' : '−'}${Math.abs(fichasAlAcabar - fichasAlEmpezar)})` : ' (sin cambios)'}.`,
      mes.medidas
        ? `Demanda: <strong>${miles(mes.apariciones)}</strong> ${mes.apariciones === 1 ? 'aparición' : 'apariciones'} en búsquedas `
          + `y <strong>${miles(mes.visitas)}</strong> ${mes.visitas === 1 ? 'visita' : 'visitas'} a ficha, `
          + `${variacion(mes.visitas, previo.visitas, hayPrevio)}.`
        : 'De la demanda no se puede decir nada este mes: no hay mediciones.',
    ]));

    if (mes.medidas) {
      // Cuando salen menos de diez, «las diez» sobra y además miente: son
      // todas las que recibieron alguna visita, no una selección.
      const tituloTop = top.length === 10 ? 'Las diez fichas más vistas del mes' : 'Las fichas que recibieron visitas';
      bloques.push(seccion(tituloTop, top.map(([id, v], i) => {
        const p = nombres.get(id);
        const quien = p ? escapar(p.business_name || 'sin nombre') : 'ficha retirada desde entonces';
        const donde = p?.ciudad ? ` · ${escapar(p.ciudad)}` : '';
        const enlace = p ? `<a href="${urlFicha(p)}" style="color:#00255C;">${quien}</a>` : quien;
        return `<span style="color:#8b93a7;">${i + 1}.</span> ${enlace}${donde} — <strong>${miles(v.visitas)}</strong> `
          + `${v.visitas === 1 ? 'visita' : 'visitas'}${v.contactos ? `, ${plural(v.contactos, 'contacto')}` : ', ningún contacto'}`;
      }), 'Ninguna ficha recibió visitas en todo el mes.'));
    }

    // Es la lista de gente que paga —o que podría pagar— y no está recibiendo
    // nada: el motivo número uno por el que se dan de baja. Por eso tiene que
    // ser exacta: si lleva fichas que acaban de entrar, se escribe a mano a
    // quien no toca y se deja de creer el bloque.
    if (sinNingunaVisita && mes.medidas) {
      const pct = Math.round((sinNingunaVisita / todoElMes.length) * 100);
      bloques.push(seccion('Fichas invisibles', [
        `<strong>${plural(sinNingunaVisita, 'ficha', 'fichas')}</strong> de las ${todoElMes.length} que estuvieron `
        + `publicadas todo el mes ${sinNingunaVisita === 1 ? 'no recibió' : 'no recibieron'} ni una visita: el ${pct} %. `
        + 'Son las primeras que se van a dar de baja, y las únicas a las que merece la pena escribir a mano.',
      ]));
    }

    // La salud del catálogo no cambia de un mes a otro, por eso va al final y
    // no en las cifras grandes: es una lista de deberes, no una noticia.
    const trozo = (n, texto) => `<strong>${n}</strong> de ${publicadas.length} ${texto}`;
    bloques.push(seccion('Salud del catálogo', [
      trozo(sinFoto, 'no tienen ni una foto. Una ficha sin foto se abre, se mira y se cierra.'),
      trozo(sinValoracion, 'no tienen ninguna valoración.'),
      trozo(sinVerificar, 'no tienen la identidad verificada.'),
    ]));

    // El catálogo siempre se puede contar, las visitas no. Y el porcentaje va
    // pegado a la cifra a la que pertenece: colgar el de las visitas de una
    // frase que habla de visitas Y contactos daba a entender que los contactos
    // también habían subido un 252 % el mes en que se quedaron clavados en 6.
    const catalogo = `${plural(nuevasDelMes, 'ficha nueva', 'fichas nuevas')}, `
      + `${fichasAlAcabar} ${fichasAlAcabar === 1 ? 'publicada' : 'publicadas'} al cerrar el mes.`;
    let entradilla;
    if (!mes.medidas) {
      entradilla = `Sin una sola medición en todo el mes: no hay visitas ni contactos que contar. ${catalogo}`;
    } else if (hayPrevio) {
      entradilla = `${miles(mes.visitas)} ${mes.visitas === 1 ? 'visita' : 'visitas'} (${pctCorto(mes.visitas, previo.visitas)}) `
        + `y ${plural(mes.contactos, 'contacto')} (${pctCorto(mes.contactos, previo.contactos)}) frente a ${escapar(nombrePrevio)}. ${catalogo}`;
    } else {
      entradilla = `${miles(mes.visitas)} ${mes.visitas === 1 ? 'visita' : 'visitas'} y ${plural(mes.contactos, 'contacto')}. `
        + `${escapar(conMayuscula(nombrePrevio))} no tiene mediciones, así que no hay con qué comparar. ${catalogo}`;
    }

    const html = plantilla({ titulo: `MisAutónomos · ${nombreMes}`, entradilla, bloques });

    // «resumen de septiembre de 2026»: el año evita confundirse con el mismo
    // mes del año que viene, y «resumen de» evita confundirse con los otros
    // tres correos del mismo periodo. La marca identifica informe Y periodo.
    const envio = await enviarCorreo({ asunto: `MisAutónomos · resumen de ${nombreMes}`, html, marca: `resumen de ${nombreMes}` });
    if (!envio.ok) {
      const estado = envio.estado ? 502 : 500;
      return res.status(estado).json(sinRastro(envio, 'resumen-mensual'));
    }

    return res.status(200).json({
      ok: true,
      enviado: !envio.duplicado,
      envio,
      mes: nombreMes,
      ventana: [dIni, dFin],
      // `medidas` va en la respuesta para que un cron en verde con el contador
      // parado se vea en los logs de Vercel sin abrir el correo.
      medidas: mes.medidas,
      medidasPrevias: previo.medidas,
      visitas: mes.visitas,
      contactos: mes.contactos,
      contactosPorFicha: Number(porFichaMes.toFixed(2)),
      fichas: { alEmpezar: fichasAlEmpezar, alAcabar: fichasAlAcabar, nuevas: nuevasDelMes },
      sinNingunaVisita: { fichas: sinNingunaVisita, deLasQueEstuvieronTodoElMes: todoElMes.length },
    });
  } catch (e) {
    console.error('[resumen-mensual]', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
