#!/usr/bin/env node
// Referencias salariales por oficio, desde la API del INE.
//
// Qué produce y qué NO
// ────────────────────
// Produce la REFERENCIA de lo que cobra un asalariado en cada oficio: cuartil
// bajo, mediana y cuartil alto, en euros al mes. No produce la tarifa de un
// autónomo, y conviene no confundirlas nunca: medido contra los datos de la
// propia web, el INE dice que la hora de un electricista vale entre 14,40 y
// 23,87 €, y los electricistas dados de alta en misautonomos piden entre 30 y
// 48. No es un fallo de la encuesta — es que responde a otra pregunta. La
// tarifa de autónomo sólo puede salir de los propios autónomos.
//
// Por eso cada fila que escribe este script lleva `source` y `metric`
// explícitos, y la tabla de contribuciones de personas NO se toca jamás desde
// aquí. Lo dice la regla dura de más abajo.
//
// La cadena de cálculo, con sus dos correcciones declaradas
// ─────────────────────────────────────────────────────────
//   percentil anual 2022 (tabla 36830, AMBAS jornadas)
//     × fT  factor temporal 2022→2024, del grupo principal del oficio
//     × fJ  factor de jornada completa, del gran grupo
//     ÷ 12
//
// Las dos correcciones no son adorno. Sin fJ la cifra está entre un 11 % y un
// 21 % por debajo, porque la tabla 36830 mezcla jornada completa y parcial
// mientras que lo que se publica dice «a jornada completa». Y sin fT se
// publicarían sueldos de 2022 en 2026.
//
// Cuatro trampas de esta API, todas comprobadas
// ─────────────────────────────────────────────
//   1. Un valor NEGATIVO no es negativo. El INE antepone un «-» cuando la
//      muestra tiene entre 100 y 500 observaciones. Se toma el valor absoluto
//      y se marca la fila como de baja fiabilidad.
//   2. `null` significa «no publicado», y cae justo en los autónomos:
//      camareros propietarios, comerciantes propietarios, conductores
//      propietarios. Esas filas se saltan.
//   3. `Ultima_Modificacion` NO fecha el dato: la tabla 30046 declara
//      20/06/2023 y devuelve datos de 2024. El año sale de `Data[].Anyo`.
//   4. La API responde 301 hacia `/wstempus/jsCache/`. Hay que seguir la
//      redirección o todo vuelve vacío sin un solo error.
//
// Licencia: los datos del INE son CC BY 4.0, con uso comercial permitido.
// Como aquí se TRANSFORMAN, la atribución que toca es «Elaboración propia con
// datos extraídos del sitio web del INE: www.ine.es», y la licencia prohíbe
// dar a entender que el INE respalda esta reutilización. El script escribe esa
// atribución en el volcado para que viaje con los datos.
//
// Uso:
//   node scripts/seed-salarios.mjs                       (ensayo + volcado JSON)
//   node scripts/seed-salarios.mjs --json=ruta.json
//   node scripts/seed-salarios.mjs --only=electricista,fontanero
//
// Escribir en la base es la fase B del trasplante: la tabla del observatorio
// todavía no existe en misautonomos. Hasta entonces esto sólo calcula y vuelca.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const INE = 'https://servicios.ine.es/wstempus/js/ES';
const TABLA = {
  PERCENTILES_2022: '36830', // EAES:Q — P25/mediana/P75 anual por subgrupo CNO-11, ambas jornadas
  JORNADA_2022: '36863',     // EAES:Q — media anual por gran grupo × jornada → fJ
  MEDIAS_2024: '28186',      // EAES   — media anual por grupo principal → fT
};

// REGLA DURA: este script escribe referencias del INE. Nunca contribuciones
// de personas. Si algún día alguien añade aquí una escritura a la tabla de
// contribuciones, está mezclando dos magnitudes que la web promete separadas.
const TABLA_PROHIBIDA = 'salary_contributions';

// El mapeo es explícito y se revisa a mano: nunca se infiere. `fit` dice
// cuánto se parece el oficio de la web a la ocupación del INE, y `poor`
// significa que no se siembra — mejor un hueco honesto que una cifra que no
// es de ese oficio.
//
//   cno        subgrupo CNO-11 de la tabla 36830 (códigos de dos dígitos)
//   granGrupo  primer dígito del CNO, para el factor de jornada (tabla 36863,
//              que usa los diez grandes grupos 0–9)
//   letraFT    grupo de la tabla 28186, que NO usa los mismos códigos: parte
//              los grandes grupos en 18 letras A–Q. El 7 («artesanos y
//              cualificados de manufactureras y construcción») se parte en K
//              (construcción: albañil, fontanero, pintor) y L (manufactureras:
//              electricista, cerrajero). Poner la letra a mano es lo que evita
//              atribuirle a un electricista la subida de los albañiles.
const MAPEO = [
  { slug: 'abogado', cno: '25', granGrupo: '2', letraFT: 'C', fit: 'good' },
  { slug: 'albanil-reformas', cno: '71', granGrupo: '7', letraFT: 'K', fit: 'good' },
  { slug: 'asesoria-gestoria', cno: '26', granGrupo: '2', letraFT: 'C', fit: 'fair' },
  { slug: 'carpintero', cno: '71', granGrupo: '7', letraFT: 'K', fit: 'fair' },
  { slug: 'climatizacion-calefaccion', cno: '72', granGrupo: '7', letraFT: 'K', fit: 'good' },
  { slug: 'electricista', cno: '75', granGrupo: '7', letraFT: 'L', fit: 'good' },
  { slug: 'fontanero', cno: '72', granGrupo: '7', letraFT: 'K', fit: 'good' },
  { slug: 'informatico-domicilio-soporte-it', cno: '38', granGrupo: '3', letraFT: 'D', fit: 'good' },
  { slug: 'jardinero', cno: '61', granGrupo: '6', letraFT: 'J', fit: 'fair' },
  { slug: 'marketing-digital-diseno-web', cno: '27', granGrupo: '2', letraFT: 'C', fit: 'fair' },
  { slug: 'peluqueria-estetica-domicilio', cno: '58', granGrupo: '5', letraFT: 'H', fit: 'good' },
  { slug: 'persianas-toldos', cno: '71', granGrupo: '7', letraFT: 'K', fit: 'fair' },
  { slug: 'pintor', cno: '72', granGrupo: '7', letraFT: 'K', fit: 'good' },
  { slug: 'transportista', cno: '84', granGrupo: '8', letraFT: 'N', fit: 'fair' },
  // Los tres que NO se siembran, y por qué:
  //   limpieza  — el subgrupo 92 son empleados de limpieza por cuenta ajena en
  //               oficinas; un autónomo de limpieza a domicilio cobra por
  //               servicio, no por nómina, y el 91 (empleados domésticos) sale
  //               vacío en la encuesta.
  //   cerrajero — NO EXISTE en la CNO-11. Lo más cercano, 7321 herreros y
  //               forjadores, es otro oficio.
  //   multiservicios — no es una ocupación, es un modelo de negocio.
  { slug: 'autonomo-limpieza', cno: '92', granGrupo: '9', letraFT: 'O', fit: 'poor' },
  { slug: 'cerrajero', cno: '73', granGrupo: '7', letraFT: 'L', fit: 'poor' },
  { slug: 'empresa-multiservicios', cno: '71', granGrupo: '7', letraFT: 'K', fit: 'poor' },
];

// Las etiquetas de medida del INE no son «Percentil 25» y «Percentil 75»
// sino «Cuartil inferior» y «Cuartil superior». Leerlas de MetaData y no del
// nombre de la serie evita esta clase de sorpresa entera.
const MEDIDA = {
  'Cuartil inferior': 'p25',
  Mediana: 'p50',
  'Cuartil superior': 'p75',
};

// ── Utilidades ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n, d = null) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const soloEstos = (flag('only') || '').split(',').filter(Boolean);
const salida = flag('json', 'docs/refonte/transplante/salarios-ine.json');

async function ine(fn, id, qs = '') {
  const r = await fetch(`${INE}/${fn}/${id}${qs}`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`INE ${fn}/${id} → HTTP ${r.status}`);
  return r.json();
}

// La llave de cada serie es su `MetaData`, NO su `Nombre`. El nombre viene
// abreviado y mentiroso —dice «Total. Total.» donde los metadatos dicen
// «Ambos sexos» y «Todas las ocupaciones»—, y la ocupación lleva puntos y
// comas dentro, así que partirlo por puntos es una trampa. Los metadatos
// traen la variable, la etiqueta y el CÓDIGO.
const meta = (serie, ...variables) => (serie.MetaData || []).find((m) => variables.includes(m.T3_Variable)) || null;
const codigo = (serie, ...variables) => meta(serie, ...variables)?.Codigo ?? null;
const etiqueta = (serie, ...variables) => meta(serie, ...variables)?.Nombre ?? null;

// La misma tabla usa DOS nombres de variable para la ocupación según la fila:
// `TOTALES OCUPACIONES` para el renglón «Todas las ocupaciones» y `OCUPACIONES`
// para los grupos de verdad. Buscar sólo el primero devuelve una sola fila y
// deja todos los factores a 1 sin que nada falle: el cálculo sale entero y
// silenciosamente mal.
const OCUP = ['OCUPACIONES', 'TOTALES OCUPACIONES'];

// Las dos banderas del INE, que no son opcionales (trampas 1 y 2).
function limpia(valor) {
  if (valor === null || valor === undefined) return { v: null, baja: false };
  return { v: Math.abs(valor), baja: valor < 0 };
}

// El dato más reciente, por AÑO y no por posición: la tabla 28186 trae de
// 2008 a 2024 y su último elemento del array es el de 2008.
function valorDe(serie, anyo = null) {
  const d = (serie.Data || []).filter((x) => x.Valor != null && (anyo == null || x.Anyo === anyo));
  if (!d.length) return null;
  return d.reduce((a, b) => (b.Anyo > a.Anyo ? b : a));
}

// ── 1. Percentiles por ocupación ─────────────────────────────────────────
console.log('INE · descargando…');
const t36830 = await ine('DATOS_TABLA', TABLA.PERCENTILES_2022, '?tip=AM');
console.log(`  ${TABLA.PERCENTILES_2022} percentiles por ocupación: ${t36830.length} series`);

const porCno = new Map();
let anyoBase = null;
for (const s of t36830) {
  if (codigo(s, 'Total Nacional') !== '00') continue;
  if (etiqueta(s, 'Sexo') !== 'Ambos sexos') continue;
  const clave = MEDIDA[etiqueta(s, 'Percentiles simples')];
  if (!clave) continue;
  const cno = codigo(s, ...OCUP);
  if (!cno || !/^\d{2}$/.test(cno)) continue;   // sólo subgrupos de dos dígitos
  const d = valorDe(s);
  if (!d) continue;
  anyoBase ??= d.Anyo;
  const { v, baja } = limpia(d.Valor);
  const fila = porCno.get(cno) || { etiqueta: etiqueta(s, ...OCUP), baja: false };
  fila[clave] = v;
  fila.baja = fila.baja || baja;
  porCno.set(cno, fila);
}
console.log(`  → ${porCno.size} ocupaciones de dos dígitos, año base ${anyoBase}`);

// ── 2. Factor de jornada completa, por gran grupo ────────────────────────
// Sin esta corrección la cifra está entre un 11 % y un 21 % por debajo: la
// tabla de percentiles mezcla jornada completa y parcial, y lo que se publica
// dice «a jornada completa».
const t36863 = await ine('DATOS_TABLA', TABLA.JORNADA_2022, '?tip=AM');
const jornada = new Map();
for (const s of t36863) {
  if (codigo(s, 'Total Nacional') !== '00') continue;
  if (etiqueta(s, 'Sexo') !== 'Ambos sexos') continue;
  const gg = codigo(s, ...OCUP);
  if (!gg) continue;
  const tipo = etiqueta(s, 'Tipo de jornada');
  const col = tipo === 'Jornada a tiempo completo' ? 'completa' : tipo === 'Total' ? 'total' : null;
  if (!col) continue;
  const d = valorDe(s);
  if (!d) continue;
  const e = jornada.get(gg) || {};
  e[col] = Math.abs(d.Valor);
  jornada.set(gg, e);
}
const fJ = new Map();
for (const [gg, e] of jornada) if (e.completa && e.total) fJ.set(gg, e.completa / e.total);
console.log(`  ${TABLA.JORNADA_2022} jornada: ${fJ.size} grandes grupos · ` + [...fJ].map(([g, f]) => `${g}=${f.toFixed(4)}`).join(' '));

// ── 3. Factor temporal, dentro de la MISMA tabla ─────────────────────────
// La 28186 trae la serie de 2008 a 2024, así que el factor sale de comparar
// el año base con el último dentro de la misma encuesta y la misma
// definición. Cruzar dos encuestas distintas, como se hizo al explorar,
// introduce un sesgo que nadie puede auditar después.
const t28186 = await ine('DATOS_TABLA', TABLA.MEDIAS_2024, '?tip=AM');
let anyoNuevo = null;
const fT = new Map();
for (const s of t28186) {
  if (etiqueta(s, 'Sexo') !== 'Ambos sexos') continue;
  const letra = codigo(s, ...OCUP);
  const reciente = valorDe(s);
  const base = valorDe(s, anyoBase);
  if (!reciente || !base || !base.Valor) continue;
  anyoNuevo ??= reciente.Anyo;
  fT.set(letra || 'TOTAL', Math.abs(reciente.Valor) / Math.abs(base.Valor));
}
const fTGlobal = fT.get('') ?? fT.get('TOTAL') ?? 1;
console.log(`  ${TABLA.MEDIAS_2024} medias ${anyoBase}→${anyoNuevo}: ${fT.size} grupos · global=${fTGlobal.toFixed(4)}`);

// ── 4. Cálculo ───────────────────────────────────────────────────────────
const filas = [];
const saltadas = [];
for (const m of MAPEO) {
  if (soloEstos.length && !soloEstos.includes(m.slug)) continue;
  if (m.fit === 'poor') { saltadas.push({ slug: m.slug, motivo: 'la ocupación del INE no es este oficio' }); continue; }
  const base = porCno.get(m.cno);
  if (!base) { saltadas.push({ slug: m.slug, motivo: `el subgrupo CNO ${m.cno} ya no está en la tabla ${TABLA.PERCENTILES_2022}` }); continue; }
  if (base.p25 == null || base.p50 == null || base.p75 == null) {
    saltadas.push({ slug: m.slug, motivo: 'el INE no publica percentiles para esta ocupación (null)' });
    continue;
  }
  const ft = (m.letraFT && fT.get(m.letraFT)) || fTGlobal;
  const fj = fJ.get(m.granGrupo) || 1;
  const mes = (v) => Math.round((v * ft * fj) / 12 / 10) * 10;
  const fila = {
    category_slug: m.slug,
    cno: m.cno,
    cno_label: base.etiqueta,
    fit: m.fit,
    p25_mes: mes(base.p25),
    p50_mes: mes(base.p50),
    p75_mes: mes(base.p75),
    p25_anual_base: base.p25,
    p50_anual_base: base.p50,
    p75_anual_base: base.p75,
    factor_temporal: Number(ft.toFixed(4)),
    factor_temporal_origen: m.letraFT && fT.has(m.letraFT) ? `28186 grupo ${m.letraFT}` : '28186 total',
    factor_jornada: Number(fj.toFixed(4)),
    baja_fiabilidad: base.baja,
    anyo_base: anyoBase,
    anyo_actualizado: anyoNuevo,
  };
  // Guarda: un rango desordenado significa que algo cambió en la fuente.
  if (!(fila.p25_mes <= fila.p50_mes && fila.p50_mes <= fila.p75_mes)) {
    throw new Error(`${m.slug}: rango desordenado ${fila.p25_mes}/${fila.p50_mes}/${fila.p75_mes} — revisar la tabla del INE antes de sembrar`);
  }
  filas.push(fila);
}

// ── 5. Volcado ───────────────────────────────────────────────────────────
const volcado = {
  generado_por: 'scripts/seed-salarios.mjs',
  fuente: 'Instituto Nacional de Estadística (INE)',
  // La atribución viaja CON los datos: la licencia obliga, y un fichero que
  // se copia sin su procedencia acaba publicado sin ella.
  atribucion: 'Elaboración propia con datos extraídos del sitio web del INE: www.ine.es',
  licencia: 'CC BY 4.0 — el INE no participa ni respalda esta reutilización',
  tablas: TABLA,
  anyo_base: anyoBase,
  anyo_actualizado: anyoNuevo,
  magnitud: 'salario bruto mensual de persona ASALARIADA a jornada completa — NO es la tarifa de un autónomo',
  factor_temporal_global: Number(fTGlobal.toFixed(4)),
  referencias: filas,
  sin_referencia: saltadas,
};
mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, JSON.stringify(volcado, null, 2) + '\n');

console.log(`\n${filas.length} oficios con referencia · ${saltadas.length} sin ella\n`);
console.log('slug'.padEnd(34) + 'P25'.padStart(7) + 'mediana'.padStart(9) + 'P75'.padStart(8) + '   fT     fJ    ajuste');
for (const f of filas) {
  console.log(
    f.category_slug.padEnd(34)
    + String(f.p25_mes).padStart(7) + String(f.p50_mes).padStart(9) + String(f.p75_mes).padStart(8)
    + '  ' + f.factor_temporal.toFixed(4) + ' ' + f.factor_jornada.toFixed(4)
    + '  ' + f.fit + (f.baja_fiabilidad ? '  ⚠ muestra pequeña' : ''),
  );
}
for (const s of saltadas) console.log(`  — ${s.slug}: ${s.motivo}`);
console.log(`\nvolcado en ${salida}`);
if (volcado.magnitud.includes(TABLA_PROHIBIDA)) throw new Error('no');
