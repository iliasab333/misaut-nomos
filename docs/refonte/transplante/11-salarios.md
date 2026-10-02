# 11 — Observatorio salarial: de dónde salen los datos

Fase de **sólo lectura y sólo consulta**. No se ha escrito ni una fila en
`dquxsethatxtptfviiwd`, no se ha creado ningún fichero en `scripts/`, no se ha
ejecutado ninguna siembra. Todo el SQL contra la base de misautonomos ha sido
`select`. Todas las llamadas a terceros han sido `GET`.

Lo que sigue son **cifras obtenidas ejecutando las peticiones**, no cifras
recordadas. Cada número lleva la URL con la que se saca. Medido el **02/10/2026**.

---

## 0. Resumen en seis líneas

1. **La API del INE funciona y da exactamente la forma que el observatorio
   necesita**: P25 / mediana / P75 por ocupación, en euros, sin clave y sin
   registro. Licencia **CC BY 4.0**.
2. **Pero mide asalariados**. El INE publica el salario de quien cobra una
   nómina. El observatorio es para autónomos, y la pregunta del autónomo es
   «¿cuánto cobro la hora?». El INE no responde a esa pregunta y no hay fuente
   oficial española que lo haga.
3. La prueba está dentro del propio INE: la CNO-11 tiene códigos para
   **autónomos propietarios** (`8411` conductores propietarios, `50` camareros y
   cocineros propietarios, `53` comerciantes propietarios) y la encuesta salarial
   devuelve **`null`** en todos ellos.
4. **misautonomos ya tiene datos reales de tarifa de autónomo en casa**:
   `professional_profiles.tarifa_base` tiene **17 valores no nulos** entre 20 € y
   90 €/h. El INE dice que la hora de un electricista vale 14,40–23,87 €; los
   electricistas de misautonomos piden 30–48 €. Son dos preguntas distintas y el
   factor entre ellas es ~1,5–2,5x.
5. Propuesta: **sembrar con el INE, pero etiquetado como «referencia de
   asalariado», y recoger la tarifa de autónomo como magnitud separada**. Nunca
   mezclar las dos en el mismo rango. El detalle está en §8.
6. **Trampa que casi se cuela**: la tabla de percentiles del INE **mezcla jornada
   completa y parcial**, mientras que la página de khdemlidaba dice «a jornada
   completa». Sembrar sin corregir eso es un error del **11 al 21 %**. La
   corrección se puede calcular, y se calcula en §3.1bis.

---

## 1. Qué hay hoy en khdemlidaba

`/Users/bigseo/khdemlidaba/supabase/migrations/20260926202006_salary_observatory.sql`
(58 líneas) y `/Users/bigseo/khdemlidaba/src/pages/Salaires.jsx`.

### 1.1 La tabla

```sql
app_private.salary_contributions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  category_slug text not null references public.categories(slug),
  experience text not null check(experience in ('0-2','3-5','6-10','11+')),
  amount integer not null check(amount between 500 and 500000),
  consent_version text not null default '2026-09-26',
  updated_at timestamptz not null default now()
)
```

Hechos que condicionan todo lo demás:

| Hecho | Consecuencia para la siembra |
|---|---|
| `user_id` es **primary key** | una fila por persona. Un dato sembrado no tiene `user_id`. **No cabe en esta tabla sin tocar el esquema.** |
| `user_id references auth.users(id)` | no se puede inventar un uuid: la FK lo rechaza |
| la tabla está en `app_private`, `revoke all ... from public,anon,authenticated` | la siembra tiene que ir con `service_role` o desde una migración |
| `amount integer`, 500 ≤ amount ≤ 500 000 | el rango está pensado en **dirhams**. En euros, 500 000 €/mes es absurdo y 500 € está por debajo del SMI |
| no hay columna de moneda, ni de unidad, ni de origen | no hay forma de distinguir un dato del INE de una contribución real |
| no hay columna de provincia ni de CCAA | el rango es nacional por construcción |

### 1.2 La unidad

Está escrita en tres sitios y coincide: **salario mensual BRUTO, a jornada
completa, sin primas ni ventajas** (`Salaire mensuel brut (MAD)` en el
formulario; `Fourchette centrale du salaire mensuel brut` en el resultado;
`Salaires bruts avant retenues, à temps plein, hors primes et avantages` en la
nota metodológica). La propia página advierte, en el pie: *« Il ne mesure ni les
tarifs des indépendants ni le salaire net »* — es decir, **khdemlidaba ya declara
por escrito que su observatorio NO mide tarifas de independientes**. Eso es
coherente en una bolsa de empleo marroquí llena de asalariados. En misautonomos,
donde todo el directorio es de autónomos, esa frase deja el módulo sin sentido si
se copia tal cual.

### 1.3 Qué necesita exactamente `salary_range` para pintar un rango

```sql
select count(*), percentile_cont(0.25) ..., percentile_cont(0.5) ..., percentile_cont(0.75) ...
from app_private.salary_contributions
where category_slug = p_category and experience = p_experience
  and updated_at >= now() - interval '12 months';
if n < 20 then return {'status':'insufficient','minimum':20};
```

| Requisito | Valor |
|---|---|
| Cohorte | `(category_slug, experience)` — 17 × 4 = **68 cohortes** en misautonomos |
| Mínimo de muestra | **20** contribuciones por cohorte → **1 360 filas** para que se publiquen las 68 |
| Ventana | **12 meses** de `updated_at`. Un dato sembrado y no refrescado **desaparece al año** |
| Salida | `lower`, `median`, `upper` redondeados a 100; `sample` redondeado a tramos de 5; `months: 12` |
| Validación de entrada | `p_experience in ('0-2','3-5','6-10','11+')` y `exists(select 1 from public.categories where slug=p_category)` → en misautonomos la tabla se llama **`service_categories`**, hay que reescribir esa línea |

El dato duro: **con 47 perfiles en producción, el observatorio nace vacío y se
queda vacío**. 20 contribuciones por cohorte es inalcanzable a corto plazo. De
ahí la petición del dueño.

---

## 2. La API del INE: lo que responde de verdad

Base: `https://servicios.ine.es/wstempus/js/ES/{FUNCIÓN}/{ID}`.
Sin clave, sin registro, sin cabeceras. **Atención: devuelve 301** a
`.../wstempus/jsCache/...`; hay que seguir la redirección (`curl -L`).

```
GET https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES   → 200, 112 operaciones
```

Operaciones candidatas y veredicto, después de abrirlas una a una:

| Id | Código | Operación | ¿Sirve? |
|---|---|---|---|
| **121** | EAES:Q | Encuesta Cuatrienal de Estructura Salarial | **SÍ — la buena.** 152 tablas. Es la única con **percentiles por ocupación** |
| **140** | EAES | Encuesta Anual de Estructura Salarial | **SÍ — para actualizar.** 26 tablas. Dato más reciente (2024) pero sólo **medias** por ocupación |
| **137** | IPT | Índice de Precios del Trabajo | Parcial. 18 tablas. Índice por ocupación, pero sólo **8 grupos agregados** |
| **303** | ETCL | Encuesta Trimestral de Coste Laboral | **SÍ — para el puente a €/hora.** 59 tablas. Dato de **2026 T2**, el más fresco de todos |
| 139 | EACL | Encuesta Anual de Coste Laboral | No. Coste por trabajador y por CNAE, sin ocupación ni percentiles |
| 6 | ICLA | Índice de Coste Laboral Armonizado | No. Índice, sin niveles |
| **407** | EAES:Q | (duplicado sin Cod_IOE) | **No. `TABLAS_OPERACION/407` devuelve `[]`.** Es un alias vacío: no usarlo |

---

## 3. Las tablas que sirven, con las cifras obtenidas

### 3.1 La tabla madre: percentiles por ocupación — EAES:Q, tabla 36830

```
GET https://servicios.ine.es/wstempus/js/ES/GRUPOS_TABLA/36830
  → [Sexo] [Grupos y subgrupos principales de la CNO-11] [Media y percentiles]
GET https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/36830?nult=1&tip=A
  → 200, 1 440 series, 511 066 bytes
```

Año de referencia **2022**, `T3_TipoDato: "Avance"` (provisional), unidad
`Euros`, magnitud **ganancia bruta ANUAL**. 78 filas de ocupación × 3 sexos × 6
medidas (Media, P10, Cuartil inferior, Mediana, Cuartil superior, P90).

Referencia nacional, ambos sexos, «Todas las ocupaciones»:

| Medida | 2022 |
|---|---|
| P10 | 10 657,37 € |
| **Cuartil inferior (P25)** | **15 913,52 €** |
| **Mediana** | **22 383,11 €** |
| **Cuartil superior (P75)** | **33 561,62 €** |
| Media | 26 948,87 € |

Esto es **exactamente** lo que `salary_range` devuelve (`lower`, `median`,
`upper`). La forma encaja al milímetro.

**Tres trampas de la API que hay que programar:**

1. **Un valor negativo no es un valor negativo.** La propia nota de la serie lo
   dice: `"Un signo '-' antes del dato, indica que el número de observaciones
   muestrales está comprendido entre 100 y 500, por lo que la cifra está sujeta a
   gran variabilidad"`. Ejemplo real, serie `EAES5848`: `Valor: -66721.06`.
   → hay que hacer `Math.abs()` **y** marcar la fila como poco fiable.
2. **`null` significa que no hay dato publicado**, y se concentra justo donde
   duele: `50 Camareros y cocineros propietarios`, `53 Comerciantes propietarios
   de tiendas`, `91 Empleados domésticos`, `62`, `63`, `0 Ocupaciones militares`.
   Ver §5.
3. **Estos percentiles NO son de jornada completa**, aunque la página de
   khdemlidaba pida «salario mensual bruto **a jornada completa**». La tabla 36830
   sólo tiene tres variables (Sexo, CNO, Media y percentiles): **no hay dimensión
   de jornada**, así que lo que devuelve es la mezcla de tiempo completo y tiempo
   parcial. Es el error más fácil de cometer y el que más desplaza la cifra. Ver
   §3.1bis.

### 3.1bis La corrección de jornada (sin ella la cifra está mal)

`DATOS_TABLA/36832` (`Sexo` × **`Tipo de jornada`** × percentiles) mide el tamaño
del problema. Nacional, 2022, ganancia bruta anual:

| | Ambas jornadas | **Jornada completa** | Jornada parcial | completa/ambas |
|---|---|---|---|---|
| P25 | 15 913,52 | **19 239,40** | 7 857,89 | **1,2090** |
| Mediana | 22 383,11 | **25 687,05** | 11 619,53 | **1,1476** |
| P75 | 33 561,62 | **37 425,29** | 16 010,70 | **1,1151** |
| Media | 26 948,87 | 30 998,32 | 12 986,05 | 1,1503 |

Entre un 11 % y un 21 % de diferencia. **Sembrar la columna «ambas jornadas» bajo
el rótulo «jornada completa» es un error del 11 al 21 %, y crece hacia los
percentiles bajos** — justo donde están los oficios manuales.

No existe tabla que cruce percentiles × ocupación × jornada. Pero sí existe
`DATOS_TABLA/36863` («Ocupación y tipo de jornada», `Comunidad autónoma` × `Sexo`
× **`Gran grupo de la CNO-11`** × `Tipo de jornada`, 1 881 series), que da el
factor de jornada **por gran grupo** sobre la media anual. Nacional, 2022:

| Gran grupo CNO-11 | ambas | completa | **factor** |
|---|---|---|---|
| Total | 26 949 | 30 998 | 1,1503 |
| **7 Artesanos y trabajadores cualificados de las industrias manufactureras y la construcción** | 24 318 | 25 319 | **1,0411** |
| 6 Trabajadores cualificados en el sector agrícola, ganadero, forestal y pesquero | 21 383 | 22 426 | 1,0488 |
| 8 Operadores de instalaciones y maquinaria, y montadores | 24 793 | 26 311 | 1,0612 |
| 3 Técnicos; profesionales de apoyo | 31 900 | 34 990 | 1,0969 |
| 2 Técnicos y profesionales científicos e intelectuales | 39 356 | 43 483 | 1,1049 |
| 4 Empleados contables, administrativos y otros de oficina | 24 198 | 27 157 | 1,1223 |
| 5 Trabajadores de los servicios de restauración, personales, protección y vendedores | 18 993 | 22 976 | **1,2097** |
| 9 Ocupaciones elementales | 17 017 | 20 968 | **1,2321** |
| 1 Directores y gerentes | 59 479 | 61 563 | 1,0350 |

**Buena noticia para misautonomos: el gran grupo 7, donde viven la mayoría de los
oficios (albañil, fontanero, pintor, electricista, carpintero, cerrajero,
persianas), tiene el factor más pequeño después de directivos: 1,0411.** El sesgo
de jornada apenas les afecta, porque en esos oficios el tiempo parcial es raro.
Donde sí muerde es en peluquería y estética (gran grupo 5, **1,2097**) y en
limpieza (gran grupo 9, **1,2321**).

Límites de este factor, que hay que escribir en la columna `factor_basis` y no
esconder: está calculado sobre **medias**, no sobre percentiles, y se aplica a
percentiles; es de **gran grupo** (1 dígito) y se aplica a subgrupos (2 dígitos);
y es de **2022**, así que al combinarlo con el factor temporal 2022→2024 se asume
que la mezcla de jornadas no cambió entre esos dos años. Son tres
aproximaciones, pero las tres **acercan** el dato a lo que la página dice que
muestra; no corregir es alejarse un 11–21 % de forma garantizada.

### 3.2 La misma tabla, pero mensual: EAES:Q, tabla 36838

```
GET https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/36838?nult=1&tip=A
  → 200, 1 860 series
GRUPOS_TABLA/36838 → [Sexo] [Subgrupos principales de la CNO-11] [Componentes del salario bruto mensual]
```

Nacional, total, 2022 — y aquí está el bruto↔neto que ninguna otra tabla da:

| Componente | €/mes |
|---|---|
| Salario base | 1 401,80 |
| Complementos salariales | 587,37 |
| Pagos por horas extraordinarias | 8,61 |
| Salario ordinario | 1 997,78 |
| Pagas extraordinarias | 41,36 |
| **Salario bruto** | **2 039,14** |
| Contribuciones a la SS a cargo del trabajador | 130,01 |
| Retenciones IRPF | 310,44 |
| **Salario neto** | **1 598,69** |

Útil, pero **sólo medias: no hay percentiles mensuales**. Y el mes de referencia
es octubre, así que `2 039,14 × 12 = 24 470 €` ≠ `26 949 €` de ganancia anual: la
anual incluye pagas prorrateadas y variables que octubre no ve. **Son dos
definiciones distintas; no se pueden mezclar en la misma tabla.** Si se quiere un
mensual coherente con los percentiles, el único camino honesto es
`ganancia_anual / 12`.

Ratio bruto→neto medido: **1 598,69 / 2 039,14 = 0,784**.

### 3.3 El dato más reciente por ocupación: EAES anual, tabla 28186

```
GET https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/28186?nult=1&tip=A  → 200, 54 series
```

Año **2024**, `Definitivo`. Publicado el **28/05/2026** (lo dice la propia API:
`PUBLICACIONES_OPERACION/140?det=1` → `"Encuesta Anual de Estructura Salarial.
Definitivos 2024"`). Ganancia media bruta anual, 17 grupos principales de la
CNO-11, **sólo nacional y sólo medias**:

| Grupo principal CNO-11 | 2024 (€/año) |
|---|---|
| Todas las ocupaciones | 29 540,26 |
| Directores y gerentes | 63 865,45 |
| Otros técnicos y profesionales científicos e intelectuales | 45 513,91 |
| Técnicos y prof. científicos e intelectuales de la salud y la enseñanza | 40 554,53 |
| Técnicos; profesionales de apoyo | 34 917,46 |
| Trabajadores de los servicios de protección y seguridad | 35 621,47 |
| Operadores de instalaciones y maquinaria fijas, y montadores | 30 835,88 |
| Empleados de oficina que no atienden al público | 29 918,88 |
| Trabajadores cualificados de las industrias manufactureras | 27 531,44 |
| Trabajadores cualificados en el sector agrícola, ganadero, forestal y pesquero | 26 045,04 |
| Conductores y operadores de maquinaria móvil | 24 741,48 |
| **Trabajadores cualificados de la construcción** | **24 445,11** |
| Empleados de oficina que atienden al público | 23 138,15 |
| Peones de la agricultura, pesca, construcción, industrias manufactureras | 22 030,03 |
| Trabajadores de los servicios de salud y el cuidado de personas | 19 479,94 |
| Trabajadores de los servicios de restauración y comercio | 18 918,65 |
| Trabajadores no cualificados en servicios (excepto transportes) | 16 062,57 |
| Ocupaciones militares | `null` |

### 3.4 El factor de actualización 2022 → 2024 (calculado, no supuesto)

El cruce de §3.1 (medias 2022 por grupo) con §3.3 (medias 2024 por el **mismo**
grupo, misma encuesta, misma etiqueta) da un factor por grupo. Los **17 grupos
emparejan**; sólo «Ocupaciones militares» queda sin pareja porque es `null` en los
dos años.

| Grupo principal | media 2022 | media 2024 | factor |
|---|---|---|---|
| Todas las ocupaciones | 26 949 | 29 540 | **1,0962** |
| Trabajadores cualificados en el sector agrícola… | 21 383 | 26 045 | **1,2180** |
| Trabajadores de los servicios de protección y seguridad | 31 896 | 35 621 | 1,1168 |
| Trabajadores de los servicios de restauración y comercio | 17 169 | 18 919 | 1,1019 |
| Otros técnicos y prof. científicos e intelectuales | 41 382 | 45 514 | 1,0998 |
| Trabajadores cualificados de la construcción | 22 274 | 24 445 | **1,0975** |
| Trabajadores no cualificados en servicios | 14 665 | 16 063 | 1,0953 |
| Técnicos; profesionales de apoyo | 31 900 | 34 917 | 1,0946 |
| Empleados de oficina que no atienden al público | 27 403 | 29 919 | 1,0918 |
| Operadores de instalaciones y maquinaria fijas | 28 251 | 30 836 | 1,0915 |
| Peones de la agricultura, pesca, construcción… | 20 242 | 22 030 | 1,0883 |
| Trabajadores cualificados de las industrias manufactureras | 25 305 | 27 531 | **1,0880** |
| Técnicos y prof. científicos de la salud y la enseñanza | 37 456 | 40 555 | 1,0827 |
| Empleados de oficina que atienden al público | 21 463 | 23 138 | 1,0781 |
| Conductores y operadores de maquinaria móvil | 22 997 | 24 741 | 1,0759 |
| Directores y gerentes | 59 479 | 63 865 | 1,0738 |
| Trabajadores de los servicios de salud y el cuidado de personas | 18 232 | 19 480 | 1,0684 |

Contraste independiente con el IPT (`DATOS_TABLA/76192?nult=6&tip=A`, índice por
ocupación): total 2022 = 113,233 → 2024 = 120,463 → **1,0638**. Y con el salario
medio por hora de la EAES anual (`DATOS_SERIE/EAES2013?nult=6`): 2022 = 17,19 €/h
→ 2024 = 18,77 €/h → **1,0919**. Los tres métodos caen entre 1,06 y 1,10 para el
total: el factor es sólido.

Aviso sobre el IPT: su variable «Ocupación» tiene **8 grupos, no 9**. Fusiona el
gran grupo 6 (agrícola) con el **7 (artesanos y trabajadores cualificados de las
industrias manufactureras y la construcción)** en una sola serie. El grupo 7 es
precisamente donde viven la mayoría de los oficios de misautonomos. **Por eso el
factor se calcula con EAES/EAES:Q y no con el IPT.**

### 3.5 El puente a €/hora

Dos fuentes, dos preguntas distintas:

**(a) Lo que cobra el trabajador — EAES anual, tabla 30046** (`Comunidades
autónomas` × `Sectores de actividad` × `Sexo`, 216 series, 2024):

| Ámbito | €/hora 2024 |
|---|---|
| Total nacional | **18,77** |
| Industria | 19,84 |
| Construcción | **15,87** |
| Servicios | 18,81 |
| Cataluña (todas las secciones) | 20,13 |
| Andalucía | 16,83 |
| Canarias | 15,46 |

Serie histórica nacional (`DATOS_SERIE/EAES2013?nult=6`): 2019 **15,85** · 2020
16,15 · 2021 16,54 · 2022 17,19 · 2023 17,82 · 2024 **18,77**.

De aquí sale el divisor para pasar de anual a horario:
`29 540,26 / 18,77 = ` **1 573,8 horas/año**.

**(b) Lo que paga quien contrata — ETCL, tabla 6062**, coste laboral total por
hora efectiva, **2026 T2** (el dato más reciente que existe):

| Ámbito | €/hora 2026T2 |
|---|---|
| Total nacional | **26,18** |
| Industria | 27,95 |
| **Construcción** | **23,92** |
| Servicios | 26,06 |
| Andalucía (total) | 23,42 |
| Aragón (construcción) | 25,86 |

Y el coste salarial por hora sin cotizaciones (tabla 6040, 2026T2): nacional
**19,42 €**, construcción **16,88 €**, servicios **19,44 €**.

**Este par de cifras es lo más parecido a una respuesta honesta a «cuánto vale
una hora»**: el trabajador percibe ~15,9 €/h en construcción, y el cliente que
contrata a la empresa paga ~23,9 €/h sólo de coste laboral, antes del margen, el
desplazamiento, el material y la estructura.

### 3.5bis €/hora por oficio y por comunidad: la tabla 36891

La única tabla del INE que cruza **ocupación × territorio × jornada** y da euros
por hora. `GRUPOS_TABLA/36891` → `Comunidad autónoma` × `Sexo` × `Tipo de jornada`
× `Gran grupo de la CNO-11`, 1 881 series, 2022.

Nacional, jornada completa, 2022 (€/hora):

| Gran grupo CNO-11 | €/h |
|---|---|
| Total | **13,79** |
| Directores y gerentes | 25,93 |
| Técnicos y profesionales científicos e intelectuales | 19,85 |
| Técnicos; profesionales de apoyo | 15,37 |
| Empleados contables y administrativos | 12,11 |
| Operadores de instalaciones y maquinaria | 11,66 |
| **Artesanos y cualificados de manufactureras y construcción** | **11,26** |
| Trabajadores cualificados del sector agrícola | 11,09 |
| Servicios de restauración, personales, protección y vendedores | 10,26 |
| Ocupaciones elementales | 9,50 |

Y el mismo gran grupo 7 (los oficios de la casa), jornada completa, por comunidad:

| CCAA | €/h | CCAA | €/h |
|---|---|---|---|
| País Vasco | **13,66** | Castilla y León | 11,02 |
| Navarra | 12,47 | Galicia | 10,64 |
| Asturias | 12,38 | Castilla-La Mancha | 10,78 |
| Cataluña | 12,25 | Comunitat Valenciana | 10,49 |
| Aragón | 11,74 | Murcia | 10,46 |
| Cantabria | 11,40 | Balears | 10,44 |
| La Rioja | 11,37 | Extremadura | 9,62 |
| Madrid | 11,17 | Canarias | 9,36 |
| Andalucía | 11,04 | Ceuta y Melilla | 11,27 (baja fiabilidad) |

**Aviso de incoherencia entre encuestas, comprobado:** el €/hora de la EAES
cuatrienal para 2022 es **13,20** (ambas jornadas, tabla 36891) y el de la EAES
anual para el mismo 2022 es **17,19** (`DATOS_SERIE/EAES2013`). Un 30 % de
diferencia. No son el mismo indicador: uno se calcula sobre las horas del mes de
octubre y el otro sobre la ganancia anual. **No se pueden mezclar ni comparar, y
hay que elegir uno y decir cuál.** Para una referencia por oficio y comunidad, el
de 36891; para la serie temporal, el de la anual.

### 3.6 Lo que el INE NO cruza

Comprobado abriendo las tablas: **no existe ninguna tabla que cruce ocupación con
comunidad autónoma a nivel de percentil.** Las dos dimensiones van por separado:

- `DATOS_TABLA/28191` → percentiles **por CCAA**, sin ocupación. Nacional 2024:
  P10 12 018,46 · **P25 17 457,47** · **Mediana 24 497,17** · **P75 36 969,61** ·
  P90 52 515,27. Andalucía: P25 15 876,00 · mediana 21 557,40 · P75 32 099,35.
  Aragón: P25 18 356,18 · mediana 24 936,20 · P75 34 535,16.
- `DATOS_TABLA/28193` («Sexo y ocupación», 216 series) suena a lo que hace falta y
  **no lo es**: su variable «ocupación» tiene sólo **tres valores** —
  cualificación `Alta` / `Media` / `Baja` — cruzados por 18 CCAA. Nacional 2024:
  Alta 41 497,74 · Media 23 665,68 · Baja 21 442,54. Inservible para 17 oficios.
- `SERIES_TABLA/36830` no tiene dimensión territorial: todas las series empiezan
  por `Total Nacional`.

Lo que **sí** cruza ocupación y territorio son **medias**, nunca percentiles:
36863 (media anual por CCAA × gran grupo × jornada) y 36891 (€/hora por CCAA ×
gran grupo × jornada), ambas al nivel de **gran grupo (1 dígito)** y de 2022.

**Consecuencia: el rango sembrado será nacional.** Si se quiere un ajuste
territorial hay dos caminos, y los dos hay que declararlos:

- **Genérico, de los percentiles**: multiplicador `mediana_CCAA /
  mediana_nacional` de la tabla 28191 (2024), aplicado al rango nacional de la
  ocupación. Andalucía `21 557,40 / 24 497,17 = 0,880`; Aragón `1,018`.
- **Por oficio, pero sólo de gran grupo y sobre €/hora**: la tabla 36891 ya da el
  dato directo por CCAA para el gran grupo 7 (§3.5bis): Canarias 9,36 €/h frente a
  País Vasco 13,66 €/h, un **46 % de diferencia** dentro del mismo oficio. Más
  específico, pero más grueso en ocupación y de 2022.

---

## 4. Mapeo: las 17 categorías de misautonomos → CNO-11

La lista real, consultada con `select name, slug from service_categories order by
name` contra `dquxsethatxtptfviiwd`: **17 filas**.

La estructura oficial de la CNO-11 se descarga de
`https://www.ine.es/daco/daco42/clasificaciones/cno11_estructura.xls` (97 792
bytes, hoja `RD`, 761 filas, columna 0 = código, columna 1 = título). **65 de las
78 etiquetas de ocupación de la tabla 36830 emparejan automáticamente con un
código de ese fichero**; las 13 restantes son los agregados de gran grupo, cuyo
título la EAES abrevia.

El techo de granularidad es el **subgrupo principal (2 dígitos)**: ahí paran los
percentiles. Los códigos de 3 y 4 dígitos se dan para justificar la elección, no
porque haya datos a ese nivel.

| Categoría (slug) | Código fino CNO-11 | Subgrupo con datos | Encaje |
|---|---|---|---|
| `abogado` | 2511 Abogados | **25** Profesionales en derecho | **BIEN** |
| `albanil-reformas` | 7121 Albañiles | **71** Obras estructurales de construcción | **BIEN** |
| `climatizacion-calefaccion` | 7250 Mecánicos-instaladores de refrigeración y climatización | **72** Acabado e instalaciones | **BIEN** |
| `electricista` | 7510 Electricistas de la construcción y afines | **75** Electricidad y electrotecnología | **BIEN** |
| `fontanero` | 7221 Fontaneros | **72** Acabado e instalaciones | **BIEN** |
| `informatico-domicilio-soporte-it` | 3811 Técnicos en operaciones de sistemas informáticos | **38** Técnicos de las TIC | **BIEN** |
| `peluqueria-estetica-domicilio` | 5811 Peluqueros / 581 Peluqueros y estética | **58** Servicios personales | **BIEN** |
| `pintor` | 7231 Pintores y empapeladores | **72** Acabado e instalaciones | **BIEN** |
| `asesoria-gestoria` | 2611 Especialistas en contabilidad, 2612 Asesores financieros | **26** Especialistas en organización de la AP y de las empresas | REGULAR — una gestoría también cae en 411 «Empleados contables» (19 063/25 458/35 593), y la diferencia entre las dos opciones es de ~10 000 €/año |
| `carpintero` | 7131 Carpinteros / 7820 Ebanistas | **71** (obra) o **78** (taller) | REGULAR — el oficio está partido entre dos subgrupos. 71: 18 308/21 290/25 540. 78: 15 346/18 227/22 432 |
| `jardinero` | 6120 Trabajadores cualificados en huertas, invernaderos, viveros y jardines | **61** Actividades agrícolas | REGULAR — el 61 lo domina la agricultura de campo, no la jardinería urbana. Y es el grupo con el factor 2022→2024 más extremo (**1,2180**), señal de serie inestable |
| `marketing-digital-diseno-web` | 2713 Analistas, programadores y diseñadores Web / 2484 Diseñadores gráficos y multimedia | **27** Profesionales de las TI, o **24** | REGULAR — dos negocios distintos bajo un slug. 27: 32 763/41 846/54 731 |
| `persianas-toldos` | 7132 Instaladores de cerramientos metálicos y carpinteros metálicos | **71** | REGULAR — aproximación por el 713 |
| `transportista` | **8411 Conductores PROPIETARIOS** de automóviles, taxis y furgonetas; **8431 Conductores PROPIETARIOS de camiones** | **84** Conductores de transporte urbano o por carretera | REGULAR y revelador — la CNO distingue propietario de asalariado, y el 84 de la EAES son los asalariados (8412/8432) |
| `autonomo-limpieza` | 9210 / 9229 Personal de limpieza | **92** Otro personal de limpieza | **MAL** — 8 404/13 607/17 635 €/año es el sueldo de una limpiadora contratada a tiempo parcial. No tiene nada que ver con lo que factura una autónoma de limpieza |
| `cerrajero` | — | **73** Soldadores, chapistas, herreros (7321) | **MAL** — **«cerrajero» no existe en la CNO-11**. Lo más cerca es 7321 «Herreros y forjadores» o 7132 «cerramientos metálicos»: ninguno es un cerrajero de urgencias |
| `empresa-multiservicios` | 7191 Mantenedores de edificios | **71** por descarte | **MAL** — no es una ocupación, es un modelo de negocio. Cualquier código que se le ponga es inventado |

**Recuento: 8 BIEN, 6 REGULAR, 3 MAL.** Ninguna categoría se queda literalmente
sin candidato, pero tres (`cerrajero`, `empresa-multiservicios`,
`autonomo-limpieza`) sólo tienen candidatos que falsean el dato. Para esas tres,
**la recomendación es no sembrar**: mejor «aún no hay datos» que un número
equivocado.

Ninguna fila cae en un subgrupo con `null`, y ninguna cae en un subgrupo con la
marca de baja fiabilidad (valor negativo). Eso sí se ha comprobado una a una.

---

## 5. El punto crítico, sin rodeos

**El INE mide a quien cobra una nómina. El observatorio es para quien emite una
factura. No es el mismo número ni la misma pregunta.**

### 5.1 Qué parte responde el INE y qué parte no

| Pregunta | ¿La responde el INE? |
|---|---|
| ¿Qué gana al año un electricista **asalariado** en España? | **Sí**, con percentiles y por ocupación |
| ¿Cuánto cuesta una hora de trabajo **asalariado** en construcción, con cotizaciones? | **Sí**: 23,92 €/h, 2026 T2 |
| ¿Cómo ha subido el salario de ese oficio desde 2022? | **Sí**, factor medido |
| **¿Cuánto cobra la hora un electricista autónomo?** | **NO** |
| ¿Cuánto factura al año un autónomo de un oficio concreto? | **NO** |
| ¿Cuál es su beneficio neto después de cuota, IRPF, furgoneta y horas no facturables? | **NO** |

### 5.2 La prueba dentro del propio INE

La CNO-11 **sí** distingue a los autónomos propietarios. Tiene códigos para
ellos. Y la encuesta salarial devuelve `null` en todos:

| Código CNO-11 | Título | EAES:Q 2022 |
|---|---|---|
| **50** | Camareros y cocineros **propietarios** | `null` |
| **53** | Comerciantes **propietarios** de tiendas | `null` |
| **8411** | Conductores **propietarios** de automóviles, taxis y furgonetas | (bajo el 84, no se publica aparte) |
| **8431** | Conductores **propietarios** de camiones | (ídem) |
| **91** | Empleados domésticos | `null` |

Es decir: el hueco no es un descuido de la API, es el **ámbito de la encuesta**.
La EAES encuesta cuentas de cotización de empresas con asalariados. Un autónomo
sin empleados no entra en el marco. **No hay forma de arreglar eso con otra tabla
del INE.**

### 5.3 La magnitud del error, con datos de misautonomos

`professional_profiles` ya tiene una columna `tarifa_base numeric` y
`price_range text`. Medido hoy sobre los 47 perfiles:

- `tarifa_base` no nula en **47/47**, pero **30 de ellas valen `0`** → hay **17
  tarifas reales**, entre **20 € y 90 €**, media 13,00 € (arrastrada por los
  ceros). Moda: **30 €** (6 perfiles) y **35 €** (4 perfiles).
- `price_range` vale `'€€'` en **las 47**: columna sin información, no sirve.

Por categoría (perfiles con tarifa > 0):

| Categoría | nº | tarifa mín–máx (€/h) | **INE: €/h implícitos P25–P75** |
|---|---|---|---|
| Electricista | 3 | **30 – 48** | **14,40 – 23,87** |
| Albañil / Reformas | 3 | 20 – 40 | 13,29 – 18,54 |
| Empresa multiservicios | 3 | 28 – 35 | 13,29 – 18,54 |
| Cerrajero | 2 | 35 – 40 | 15,01 – 23,46 |
| Pintor | 2 | 25 – 30 | 13,45 – 17,82 |
| Carpintero | 1 | 30 | 13,29 – 18,54 |
| Informático a domicilio | 1 | 30 | 16,82 – 32,01 |
| Climatización / Calefacción | 1 | 35 | 13,45 – 17,82 |
| Autónomo de limpieza | 1 | **90** | 7,21 – 15,12 |
| Asesoría, marketing, peluquería, persianas, jardinero, transportista | 0 | — | — |

(€/h implícitos = `percentil_anual_2022 × factor_tiempo × factor_jornada / 1 573,8 h`,
con los dos factores de §3.4 y §3.1bis. Comparar también con el €/hora directo del
INE para el gran grupo 7 a jornada completa: **11,26 €** nacional, **12,25 €** en
Cataluña, §3.5bis.)

**El factor entre lo que mide el INE y lo que piden los autónomos de la casa es
de 1,5x a 2,5x.** No es ruido: es la diferencia entre un salario y un precio. Y
el caso de `autonomo-limpieza` (90 € frente a 5,85–12,27 €) seguramente no es una
tarifa horaria, sino un precio mínimo de servicio — aviso de que **la columna
`tarifa_base` tampoco tiene una unidad declarada** y arrastra basura.

### 5.4 Qué hacer, en concreto

Tres opciones. La recomendada es la B.

**A — Sembrar con el INE y presentarlo como salario de autónomo.**
Descartar. Es publicar un número falso con sello del INE detrás, y además el
aviso legal del INE prohíbe expresamente dar a entender que el INE respalda la
reutilización. Un autónomo que lea «un electricista gana 2 250 €/mes» en una web
de autónomos concluirá, con razón, que la web no sabe de qué habla.

**B — Dos magnitudes separadas, y el INE etiquetado por lo que es (RECOMENDADA).**

| | Referencia de mercado | Observatorio de tarifas |
|---|---|---|
| Qué es | ganancia bruta anual/mensual de un **asalariado** del mismo oficio | **€/hora** que cobra un autónomo |
| Origen | INE, sembrado | sólo contribuciones de profesionales |
| Rótulo en pantalla | «Referencia: lo que gana un *asalariado* del oficio (INE, EAES 2022, actualizado a 2024)» | «Lo que cobran los autónomos de misautonomos» |
| Mínimo de muestra | n/a (es un dato oficial) | 20, como en khdemlidaba — o 10, ver §8.4 |
| Disponible el día 1 | **sí, 14 de 17 categorías** | no |

Así el módulo nace con contenido útil el primer día, no miente, y el rango de
tarifas crece con las contribuciones. El puente entre las dos columnas se explica
con el dato de la ETCL (§3.5b): el cliente que contrata a un asalariado paga
23,92 €/h de coste laboral en construcción; un autónomo a 30–35 €/h está en el
mismo orden de magnitud una vez se suman margen, desplazamiento y estructura. Esa
frase es la que convierte el módulo en algo que un autónomo lee con interés en
vez de con enfado.

**C — Buscar una fuente oficial de ingresos de autónomos.**
Se ha buscado. §6. No existe con la granularidad necesaria.

---

## 6. Las otras fuentes: qué se ha comprobado

### 6.1 Seguridad Social — bases de cotización del RETA

Desde la reforma de 2023 la cuota del RETA va por **tramos de ingresos reales**,
así que la distribución de autónomos por tramo sería un proxy legítimo de
rendimiento neto. **El problema es que no está publicada de forma explotable.**

Comprobado, no supuesto:

```
https://w6.seg-social.es/PXWeb/pxweb/es/   → HTTP 200
```

El servidor PX-Web de la TGSS existe y es navegable. Sus bases de datos son
exactamente cuatro: `Afiliados en alta laboral`, `Afiliados en ERTE`, **`Bases de
cotización y cotizantes`**, `Códigos de cuenta de cotización`, `Dias cotizados`.

- `Bases de cotización y cotizantes` → contiene **una sola rama: «Régimen
  General»**. **No hay RETA.**
- `Afiliados en alta laboral` → `Afiliados Medios`, `Afiliados Fin de mes`, y las
  variantes de extranjeros. Recuentos, no importes.
- `https://w6.seg-social.es/PXWeb/api/v1/es/` → **HTTP 404**. El PX-Web está
  publicado sin API REST: sólo interfaz web. No se puede automatizar.
- Las páginas de estadísticas de afiliación (`.../Estadisticas/EST8`,
  `EST8/EST10`, `EST8/EST11`, `EST8/EST167`) devuelven 200 y **no ofrecen ninguna
  descarga de autónomos por base de cotización ni por tramo de ingresos**.
  Lo que hay es afiliación por régimen, CCAA, provincia y CNAE.

**Veredicto: la Seguridad Social no sirve.** Ni hay dato de tramos por actividad,
ni hay API.

### 6.2 Ministerio de Trabajo (BEL, convenios colectivos, REGCON)

**El sitio no es fetchable.** `https://www.mites.gob.es/` falla el handshake TLS
desde dos clientes independientes (curl local y el fetch remoto):

```
openssl s_client -connect www.mites.gob.es:443
  subject= CN = *.mites.gob.es
  issuer=  C = ES, O = FNMT-RCM, OU = AC Componentes Informáticos
  Verify return code: 21 (unable to verify the first certificate)
```

No sirve el certificado intermedio de la FNMT, así que **ningún cliente estándar
puede verificar la cadena**. `https://expinterweb.mites.gob.es/regcon/` sí
responde (200, 30 014 bytes), pero es un **buscador de convenios en HTML**: hay
que localizar el convenio sectorial y provincial, abrir el PDF del BOE/BOP y leer
la tabla salarial a mano. Para los 17 oficios × 52 provincias eso son cientos de
convenios, cada uno con su estructura. **No es una fuente automatizable, y además
mide salario de convenio de asalariado: el mismo problema del INE.**

Nota operativa: si algún día se depende de `mites.gob.es`, habrá que llevar el
intermedio de la FNMT en el repo o usar `NODE_EXTRA_CA_CERTS`. **Hoy no se
depende, y mejor así.**

### 6.3 Agencia Tributaria (AEAT)

`https://sede.agenciatributaria.gob.es/Sede/estadisticas.html` → **200**. Ofrece
«Estadísticas por impuesto», «Anuario Estadístico» y «Muestras de datos
fiscales». `.../Sede/datos-abiertos.html` y `/Sede/datos-abiertos/catalogo.html`
→ **404**: no hay catálogo de datos abiertos.

El IRPF da rendimientos de actividades económicas por **tramo de renta y por
CCAA**, no por oficio. Las muestras de microdatos requieren solicitud y
justificación de investigación. **No sirve para sembrar 17 categorías.**

### 6.4 datos.gob.es

```
https://datos.gob.es/apidata/catalog/dataset/title/autonomos?_pageSize=20&_page=0 → 200
```

Devuelve **3 resultados, y los 3 son falsos positivos**: la búsqueda por título
casa «autónomos» con «comunidad autónoma» (esperanza de vida por CCAA, índices
por CCAA). **No hay un conjunto de datos de ingresos de autónomos en el catálogo
nacional.**

### 6.5 Y entonces, ¿de dónde sale la tarifa de autónomo?

De los autónomos. No hay atajo. Lo que sí hay son **tres aceleradores que no
dependen de nadie de fuera**:

1. **Las 17 tarifas que ya están en `professional_profiles.tarifa_base`** (§5.3).
   Son datos reales de autónomos españoles de la propia web. Hay que normalizar
   la unidad y limpiar el 90 € y los 30 ceros, pero es el arranque.
2. **Pedir la tarifa en el onboarding**, no en una página aparte que nadie visita.
   `tarifa_base` ya existe en el formulario de perfil: basta con etiquetarla
   («€/hora, trabajo normal, sin desplazamiento ni IVA») y hacerla obligatoria.
3. **Bajar el mínimo de muestra de 20 a 10** para la columna de tarifas, con el
   rótulo correspondiente. Con 47 perfiles, 20 por cohorte no llega nunca; 10 por
   **categoría** (sin partir por experiencia) sí es alcanzable. Ver §8.4.

---

## 7. Licencia y atribución

Fuente verificada: `https://www.ine.es/aviso_legal/` redirige (meta refresh) a
**`https://www.ine.es/dyngs/AYU/index.htm?cid=125`**, y ahí está el texto, bajo
el epígrafe «Reutilización de la información contenida en este sitio web».

Lo que dice, en sus términos:

> La licencia de uso general a aplicar a la información estadística de este sitio
> web, salvo que se indique lo contrario, es la **Creative Commons Reconocimiento
> 4.0 (CC BY 4.0)** […] incluso con finalidad comercial citando la autoría.

Y las condiciones, que son **tres obligaciones y una prohibición**:

1. **Citar la fuente.** El propio aviso da las dos fórmulas exactas:
   - `Fuente: Sitio web del INE: www.ine.es` → si **no** se tratan los datos.
   - **`Elaboración propia con datos extraídos del sitio web del INE: www.ine.es`**
     → si **sí** se tratan.
   **Nos corresponde la segunda**: se agregan percentiles de 2022, se multiplican
   por un factor 2024 y se divide por 12. Eso es tratamiento.
2. **Mencionar la fecha de la última actualización** de la información reutilizada.
3. **Prohibido** «indicar, insinuar o sugerir que el INE participa, patrocina o
   apoya la reutilización». → Nada de logos del INE, nada de «datos oficiales del
   INE» a secas, nada de «avalado por».

Legislación aplicable que el propio aviso cita: **Ley 37/2007** sobre
reutilización de la información del sector público (con su régimen sancionador en
el art. 11), **RD 1495/2011** y la Resolución de 19/02/2013 (NTI de
Reutilización).

### 7.1 Texto de atribución propuesto, y dónde va

**Literal, en la nota metodológica de la página del observatorio** (debajo del
rango, siempre visible, no en un `<details>` colapsado):

> Referencia de salario asalariado: elaboración propia con datos extraídos del
> sitio web del INE (www.ine.es) — Encuesta Cuatrienal de Estructura Salarial
> 2022 (datos de avance, publicados el 23/09/2024) y Encuesta Anual de Estructura
> Salarial 2024 (datos definitivos, publicados el 28/05/2026). Licencia CC BY 4.0.
> El INE no participa en esta reutilización ni la respalda.
> Las cifras son de trabajadores **por cuenta ajena** y no miden la tarifa de un
> autónomo.

**Las tres fechas son comprobables en la propia API**, no hay que fiarse de
nadie:

| Dato | Fuente de la fecha | Valor |
|---|---|---|
| EAES:Q 2022 publicada | `TABLAS_OPERACION/121` → `Ultima_Modificacion` de 36830/36838 | **23/09/2024** |
| EAES 2024 publicada | `TABLAS_OPERACION/140` → `Ultima_Modificacion` de 28186/28191/28193 | **28/05/2026** |
| Nombre de la última publicación | `PUBLICACIONES_OPERACION/140?det=1` → `PubFechaAct.Nombre` | «Encuesta Anual de Estructura Salarial. Definitivos 2024» |

Cuidado con una incoherencia real detectada: la tabla **30046** (salario por
hora) declara `Ultima_Modificacion: 20/06/2023` **pero devuelve datos de 2024**.
→ **Para la fecha de atribución hay que usar el año de la propia serie
(`Data[].Anyo`), no `Ultima_Modificacion`**, y cuando las dos existan, guardar
las dos.

Y, además de la cita del INE, en los textos legales (`/aviso-legal` o la página
del observatorio) hace falta la frase que distingue origen de responsabilidad:
los datos sembrados son del INE; el tratamiento, el mapeo oficio→CNO y cualquier
error en ese mapeo son de misautonomos.

---

## 8. El plan de siembra

### 8.1 Lo que la tabla necesita para distinguir semilla de contribución

El esquema de khdemlidaba **no puede alojar un dato sembrado**: `user_id` es
clave primaria y apunta a `auth.users`. Hay dos salidas y la segunda es la buena.

**Mal — meter la semilla en `salary_contributions` con usuarios falsos.** Exige
crear filas en `auth.users`, contamina el recuento de usuarios, rompe el «una
contribución por cuenta», y hace que `sample` mienta («47 contribuciones» cuando
son 2 reales). **Descartar.**

**Bien — dos tablas y un `salary_range` que las lea por separado.**

```sql
-- 1) Las contribuciones, como en khdemlidaba, pero en euros y con unidad explícita.
create table app_private.salary_contributions (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  category_slug  text not null references public.service_categories(slug),
  experience     text not null check (experience in ('0-2','3-5','6-10','11+')),
  metric         text not null check (metric in ('hourly_rate','monthly_gross')),
  amount_cents   integer not null,                      -- céntimos: no perder los 32,50 €/h
  currency       char(3) not null default 'EUR',
  province_code  char(2) references public.provinces(code),  -- nullable
  consent_version text not null default '2026-10-02',
  updated_at     timestamptz not null default now(),
  constraint salary_amount_sane check (
    (metric = 'hourly_rate'   and amount_cents between   500 and   50000) or  -- 5 € – 500 €/h
    (metric = 'monthly_gross' and amount_cents between 50000 and 3000000)     -- 500 € – 30 000 €/mes
  )
);
```

`amount integer` entre 500 y 500 000 de khdemlidaba era un rango en dirhams.
**En euros hay que reescribirlo**, y hay que guardar céntimos: las tarifas reales
de la casa ya incluyen valores como 48 €, y una media de 32,50 €/h no se puede
representar en euros enteros.

```sql
-- 2) Las referencias oficiales. NO son contribuciones y no comparten tabla.
create table public.salary_references (
  category_slug  text not null references public.service_categories(slug),
  experience     text,                      -- null = todas las experiencias
  metric         text not null check (metric in ('annual_gross','monthly_gross','hourly_gross')),
  p25_cents      integer,
  median_cents   integer,
  p75_cents      integer,
  -- procedencia: sin esto el dato no es publicable (CC BY obliga a citar)
  source_code    text not null,             -- 'INE_EAES_Q' | 'INE_EAES' | 'INE_ETCL'
  source_table   text not null,             -- '36830'
  source_series  text,                      -- 'EAES5858'
  reference_year smallint not null,         -- 2022
  data_kind      text not null,             -- 'Avance' | 'Definitivo'  (T3_TipoDato del INE)
  published_at   date,                      -- 2024-09-23
  -- el mapeo, para poder auditarlo y corregirlo
  cno_code       text not null,             -- '75'
  cno_label      text not null,             -- etiqueta literal del INE, sin reescribir
  mapping_fit    text not null check (mapping_fit in ('good','fair','poor')),
  -- banderas de calidad del INE
  low_reliability boolean not null default false,  -- el valor venía con signo '-'
  -- la cadena de cálculo, para que sea reproducible
  time_factor    numeric(6,4),              -- 1.0880  (2022 -> 2024, grupo principal)
  fulltime_factor numeric(6,4),             -- 1.0411  (ambas jornadas -> jornada completa, gran grupo)
  factor_basis   text,                      -- 'fT: EAES 28186/2024 ÷ EAES:Q 36830/2022, grupo principal.
                                            --  fJ: EAES:Q 36863/2022, gran grupo 7, completa ÷ ambas.'
  scope_jornada  text not null,             -- 'full_time' (tras aplicar fJ) | 'all'
  fetched_at     timestamptz not null default now(),
  primary key (category_slug, metric, source_code, reference_year)
);
```

Las columnas que no son negociables, y por qué:

| Columna | Sin ella… |
|---|---|
| `source_code` / `source_table` / `reference_year` / `published_at` | se incumple la obligación de citar fuente y fecha del aviso legal del INE |
| `data_kind` | se publica un «Avance» de 2022 como si fuera definitivo |
| `low_reliability` | se publica como firme un dato que el INE marca con 100–500 observaciones |
| `cno_code` + `mapping_fit` | nadie puede auditar por qué «cerrajero» salió del subgrupo 73, ni corregirlo |
| `time_factor` + `fulltime_factor` + `factor_basis` | el número de pantalla no es reproducible: no se sabe de dónde salió el ×1,0880 ni el ×1,0411 |
| `scope_jornada` | se publica como «jornada completa» una mezcla de completa y parcial: error del 11 al 21 % (§3.1bis) |
| `metric` separado de la contribución | se acaba comparando €/h con €/mes |

Y `salary_range` devuelve **las dos cosas, nunca mezcladas**:

```jsonc
{
  "contributed": { "status": "insufficient", "minimum": 10, "metric": "hourly_rate" },
  "reference":   { "status": "ready", "metric": "monthly_gross",
                   "lower": 1890, "median": 2340, "upper": 3130,
                   "source": "INE_EAES_Q", "year": 2022, "updated_to": 2024,
                   "cno": "75", "fit": "good",
                   "scope": "employees", "jornada": "full_time" }
}
```

El front **tiene que pintar el `scope: "employees"`**. Si no se pinta, el módulo
miente por omisión.

### 8.2 Lo que se sembraría, con las cifras ya calculadas

La cadena completa, con los cuatro pasos y las dos aproximaciones declaradas:

```
percentil_anual_2022 (EAES:Q 36830, ambas jornadas)
  × fT  factor temporal 2022→2024   del grupo principal          (§3.4)
  × fJ  factor de jornada completa  del gran grupo               (§3.1bis)
  ÷ 12  mensualización
  → redondeo a 10 €
```

| slug | CNO | GG | enc. | P25 anual 2022 | mediana | P75 | fT | fJ | **P25 €/mes** | **mediana** | **P75** | €/h impl. P50 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `abogado` | 25 | 2 | BIEN | 29 483 | 38 640 | 55 640 | 1,0998 | 1,1049 | **2 990** | **3 910** | **5 630** | 29,83 |
| `albanil-reformas` | 71 | 7 | BIEN | 18 308 | 21 290 | 25 540 | 1,0975 | 1,0411 | **1 740** | **2 030** | **2 430** | 15,46 |
| `asesoria-gestoria` | 26 | 2 | REG. | 27 624 | 40 187 | 55 152 | 1,0998 | 1,1049 | 2 800 | 4 070 | 5 580 | 31,03 |
| `carpintero` | 71 | 7 | REG. | 18 308 | 21 290 | 25 540 | 1,0975 | 1,0411 | 1 740 | 2 030 | 2 430 | 15,46 |
| `climatizacion-calefaccion` | 72 | 7 | BIEN | 18 524 | 20 724 | 24 549 | 1,0975 | 1,0411 | **1 760** | **1 970** | **2 340** | 15,05 |
| `electricista` | 75 | 7 | BIEN | 20 005 | 24 804 | 33 168 | 1,0880 | 1,0411 | **1 890** | **2 340** | **3 130** | 17,85 |
| `fontanero` | 72 | 7 | BIEN | 18 524 | 20 724 | 24 549 | 1,0975 | 1,0411 | **1 760** | **1 970** | **2 340** | 15,05 |
| `informatico-domicilio-soporte-it` | 38 | 3 | BIEN | 22 049 | 30 243 | 41 962 | 1,0946 | 1,0969 | **2 210** | **3 030** | **4 200** | 23,07 |
| `jardinero` | 61 | 6 | REG. | 14 535 | 19 777 | 24 156 | 1,2180 | 1,0488 | 1 550 | 2 110 | 2 570 | 16,05 |
| `marketing-digital-diseno-web` | 27 | 2 | REG. | 32 763 | 41 846 | 54 731 | 1,0998 | 1,1049 | 3 320 | 4 240 | 5 540 | 32,31 |
| `peluqueria-estetica-domicilio` | 58 | 5 | BIEN | 12 821 | 16 230 | 24 470 | 1,0962 | 1,2097 | **1 420** | **1 790** | **2 700** | 13,68 |
| `persianas-toldos` | 71 | 7 | REG. | 18 308 | 21 290 | 25 540 | 1,0975 | 1,0411 | 1 740 | 2 030 | 2 430 | 15,46 |
| `pintor` | 72 | 7 | BIEN | 18 524 | 20 724 | 24 549 | 1,0975 | 1,0411 | **1 760** | **1 970** | **2 340** | 15,05 |
| `transportista` | 84 | 8 | REG. | 15 726 | 20 139 | 26 698 | 1,0759 | 1,0612 | 1 500 | 1 920 | 2 540 | 14,61 |
| `autonomo-limpieza` | 92 | 9 | **MAL** | 8 404 | 13 607 | 17 635 | 1,0953 | 1,2321 | ~~950~~ | ~~1 530~~ | ~~1 980~~ | 11,67 |
| `cerrajero` | 73 | 7 | **MAL** | 20 848 | 25 209 | 32 597 | 1,0880 | 1,0411 | ~~1 970~~ | ~~2 380~~ | ~~3 080~~ | 18,14 |
| `empresa-multiservicios` | 71 | 7 | **MAL** | 18 308 | 21 290 | 25 540 | 1,0975 | 1,0411 | ~~1 740~~ | ~~2 030~~ | ~~2 430~~ | 15,46 |

**Se siembran 14 de 17.** Las tres tachadas se dejan sin referencia, con el
mensaje «aún no hay datos para este oficio». `peluqueria-estetica-domicilio` usa
el `fT` global (1,0962) porque el subgrupo 58 no cuelga de ninguno de los 17
grupos principales de la tabla 28186: eso también va en `factor_basis`.

Dos comprobaciones hechas fila por fila: **ninguna de las 14 venía con el signo
negativo de baja fiabilidad**, y **ninguna cae en un subgrupo con `null`**.

Lo que sí hay que mirar antes de publicar: **el P25 de `peluqueria-estetica` queda
en 1 420 €/mes**, cerca del SMI vigente; y el P25 de los oficios de construcción
ronda los 1 740–1 760 €/mes. Son cifras bajas porque son cifras de nómina, no de
factura. Si al dueño le parecen demasiado bajas para publicarlas, eso **no es un
error de cálculo: es exactamente la razón por la que el INE no responde a la
pregunta del autónomo** (§5). Conviene comparar el P25 con el SMI del año en curso
antes de cada siembra (§8.3, última guarda) y, si algún P25 cae por debajo, decidir
a mano si se publica o si se recorta el rango por abajo al SMI diciéndolo.

### 8.3 `scripts/seed-salarios.mjs` — esbozo

**No se ha creado el fichero. Esto es el esbozo, no el script.** Sigue las
convenciones de `scripts/seed-leads.mjs`: ESM, carga `.env.local` a mano,
`--dry-run` por defecto, `SUPABASE_SERVICE_ROLE_KEY` obligatorio.

```js
// scripts/seed-salarios.mjs
// Siembra public.salary_references desde la API del INE (CC BY 4.0).
//
// REGLA DURA: este script NUNCA escribe en app_private.salary_contributions.
// Las contribuciones son de personas; las referencias son del INE. No se mezclan.
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-salarios.mjs --dry-run
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-salarios.mjs --apply
//   ...flags:
//     --only=electricista,fontanero
//     --json=docs/refonte/transplante/salarios-ine.json   (volcado auditable)
//
// Es IDEMPOTENTE: upsert sobre (category_slug, metric, source_code, reference_year).

const INE = 'https://servicios.ine.es/wstempus/js/ES';
const T = {
  PERCENTILES_2022: '36830', // EAES:Q — P25/mediana/P75 anual por subgrupo CNO-11 (AMBAS jornadas)
  JORNADA_2022:     '36863', // EAES:Q — media anual por gran grupo × jornada  -> factor fJ
  MEDIAS_2024:      '28186', // EAES   — media anual por grupo principal       -> factor fT
  HORA_2024:        '30046', // EAES   — salario medio por hora, CCAA × sector
  HORA_CNO_2022:    '36891', // EAES:Q — €/hora por CCAA × jornada × gran grupo CNO-11
  CCAA_2024:        '28191', // EAES   — percentiles por CCAA (factor territorial)
};
const HORAS_ANO = 1573.8;    // = 29540.26 / 18.77, EAES 2024

// 1) MAPEO. Tabla explícita, revisable a mano, versionada. 17 filas, nunca inferido.
//    'poor' => no se siembra: mejor vacío que mentira.
//    `grupo`     -> de dónde sale el factor temporal  fT (tabla 28186 vs 36830)
//    `granGrupo` -> de dónde sale el factor de jornada fJ (tabla 36863)
const MAPEO = [
  { slug:'electricista', cno:'75', granGrupo:'7', fit:'good',
    grupo:'Trabajadores cualificados de las industrias manufactureras, excepto operadores de instalaciones y máquinas' },
  { slug:'fontanero', cno:'72', granGrupo:'7', fit:'good',
    grupo:'Trabajadores cualificados de la construcción, excepto operadores de máquinas' },
  // … 15 filas más, tal como la tabla de §8.2 (columnas CNO y GG)
  { slug:'cerrajero', cno:'73', granGrupo:'7', fit:'poor',  grupo:'…' },   // skip
  { slug:'empresa-multiservicios', cno:'71', granGrupo:'7', fit:'poor', grupo:'…' }, // skip
  { slug:'autonomo-limpieza', cno:'92', granGrupo:'9', fit:'poor', grupo:'…' },      // skip
];

// 2) El INE devuelve 301 -> jsCache. `fetch` sigue redirecciones por defecto; aquí se
//    comprueba explícitamente para que un cambio de política no rompa en silencio.
async function ine(fn, id, qs = '') {
  const r = await fetch(`${INE}/${fn}/${id}${qs}`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`INE ${fn}/${id} → HTTP ${r.status}`);
  return r.json();
}

// 3) Parseo. El nombre de la serie es la ÚNICA llave que da el INE:
//    'Total Nacional. Dato base. Ambos sexos. <ocupación>. <medida>. '
//    Hay que partir por el ÚLTIMO '. ' porque la ocupación contiene puntos y comas.
function parseSerie(nombre) {
  const body = nombre.trim().replace(/\.\s*$/, '').split('Ambos sexos.')[1]?.trim();
  if (!body) return null;
  const i = body.lastIndexOf('. ');
  return { ocupacion: body.slice(0, i).trim(), medida: body.slice(i + 2).trim() };
}

// 4) Las dos banderas del INE, que no son opcionales.
function limpia(valor) {
  if (valor === null || valor === undefined) return { v: null, low: false }; // sin dato publicado
  return { v: Math.abs(valor), low: valor < 0 };   // '-' = 100..500 observaciones
}

// 5) fT — factor 2022 -> 2024: medias del MISMO grupo principal en las dos encuestas.
//    No se usa el IPT: su variable 'Ocupación' fusiona los grandes grupos 6 y 7,
//    y el 7 es donde están casi todos los oficios de misautonomos.
function factorTiempo(datos2022, datos2024) { /* media2024 / |media2022| por grupo */ }

// 6) fJ — factor de jornada completa, de la tabla 36863 (gran grupo × jornada, 2022):
//    media('Jornada a tiempo completo') / media('Total') del gran grupo.
//    SIN ESTO la cifra está mal entre un 11 % y un 21 %, porque 36830 mezcla
//    jornada completa y parcial y la página dice 'a jornada completa'.
function factorJornada(datos36863) { /* completa / |ambas| por gran grupo */ }

// 7) Resolver la etiqueta CNO. Las etiquetas del INE se guardan LITERALES en
//    cno_label; el código sale de cno11_estructura.xls, cacheado en el repo.
//    Si una etiqueta deja de emparejar, el script FALLA en vez de adivinar.

// 8) Escritura. Upsert, nunca delete+insert: así una ejecución a medias no deja
//    el observatorio sin referencias.
//    - metric: 'monthly_gross'  (anual x fT x fJ / 12, en céntimos)
//    - también 'annual_gross' en la misma pasada: cuesta cero y permite auditar
//    - scope_jornada: 'full_time' si se aplicó fJ, 'all' si no
//    - published_at desde TABLAS_OPERACION/{121|140}.Ultima_Modificacion
//    - reference_year y data_kind desde Data[0].Anyo / Data[0].T3_TipoDato
//      (NUNCA deducir el año de Ultima_Modificacion: la tabla 30046 declara
//       20/06/2023 y devuelve datos de 2024)

// 9) Guardas que abortan la siembra (fallar ruidosamente, no sembrar basura):
//    - si `reference_year` < 2022                          -> abort
//    - si p25 > median o median > p75                      -> abort
//    - si cambian los slugs de service_categories          -> abort (comparar con la BD)
//    - si una ocupación del MAPEO ya no aparece en 36830   -> abort
//    - si fT sale fuera de [1.00, 1.30]                    -> avisar y marcar fit='fair'
//    - si fJ sale fuera de [1.00, 1.40]                    -> abort (algo cambió en 36863)
//    - si un P25 sembrado cae por debajo del SMI del año en curso -> NO abortar,
//      pero exigir --allow-below-smi y dejarlo en el log. Es un resultado
//      legítimo (la EAES incluye nóminas bajas), pero nadie debe publicarlo
//      sin haberlo visto. El SMI se pone a mano en una constante fechada:
//      el INE no lo publica por API en estas operaciones.
```

Dependencias: ninguna nueva. `fetch` nativo (Node ≥ 18) y
`@supabase/supabase-js`, que ya está. El `.xls` de la CNO-11 **se cachea en el
repo** (`docs/refonte/transplante/cno11_estructura.xls`, 97 792 bytes) para que
el script no depende de que `www.ine.es` sirva un fichero de 2010.

### 8.4 El umbral de muestra

khdemlidaba exige **20** por cohorte `(categoría, experiencia)`. En misautonomos
eso son **68 cohortes × 20 = 1 360 contribuciones**, con 47 perfiles vivos. **No
va a pasar.** Propuesta:

| | khdemlidaba | propuesta misautonomos |
|---|---|---|
| Cohorte de tarifas | categoría × experiencia | **sólo categoría** (17 cohortes) |
| Mínimo | 20 | **10** |
| Total para cubrirlo todo | 1 360 | **170** |
| Experiencia | obligatoria en la cohorte | se guarda, pero no parte la cohorte hasta que haya volumen |

Con 10 por categoría el rango es ruidoso: hay que **rotularlo** («10–14
profesionales; rango orientativo») y seguir publicando `sample`, como ya hace
`salary_range`. Bajar de 10 no: por debajo, el P25–P75 de una muestra pequeña es
indistinguible del azar y además se acerca peligrosamente a identificar a
personas concretas en una categoría con un puñado de perfiles.

### 8.5 Cómo se refresca cuando el INE publique el año siguiente

**La propia API avisa.** No hace falta rascar HTML ni suscribirse a nada:

```
GET https://servicios.ine.es/wstempus/js/ES/PUBLICACIONES_OPERACION/140?det=1
→ { "PubFechaAct": { "Nombre": "Encuesta Anual de Estructura Salarial. Definitivos 2024",
                     "Fecha": 1779958800000, "Anyo": 2024 } }
```

`1779958800000` = **28/05/2026**. El patrón de la EAES anual es publicación a
**finales de mayo** con el año `N-2`.

Rutina de refresco, en tres pasos y sin cron nuevo:

1. **Comprobar**: `PUBLICACIONES_OPERACION/140?det=1` y comparar `PubFechaAct.Anyo`
   con `max(reference_year)` de `salary_references` donde `source_code='INE_EAES'`.
   Igual → nada que hacer, salir con 0. Esto cuesta 478 bytes.
2. **Resembrar**: si ha subido, `node scripts/seed-salarios.mjs --apply`. El
   factor se recalcula solo (vuelve a leer 28186) y el upsert pisa la fila. Los
   percentiles base siguen siendo los de 2022 hasta que haya EAES:Q nueva.
3. **Avisar**: dejar en el log la pareja `(reference_year anterior → nuevo,
   factor anterior → nuevo)`. Si un factor se mueve más de 5 puntos de golpe, es
   que el INE ha cambiado algo: revisar a mano antes de publicar.

Dos calendarios distintos, y conviene no confundirlos:

| Qué | Periodicidad | Último | Siguiente esperado |
|---|---|---|---|
| **EAES anual** (medias → el factor) | anual, finales de mayo | 2024, publicado 28/05/2026 | 2025, ~mayo 2027 |
| **EAES:Q cuatrienal** (percentiles → la forma del rango) | cada 4 años | **2022, «Avance», publicado 23/09/2024** | **2022 definitivo**, y luego **2026** (~2028) |

Dos consecuencias que hay que escribir en el código, no recordarlas:

- **Lo que se siembra hoy son datos de AVANCE de 2022.** Cuando salgan los
  definitivos de 2022, los percentiles cambiarán sin que cambie el año. Por eso
  `data_kind` es columna y la clave primaria no la incluye: el upsert tiene que
  poder pasar de `Avance` a `Definitivo` sobre la misma fila.
- **La base de percentiles envejecerá hasta 4 años.** En 2027 se estará mostrando
  2022 actualizado a 2025 con un factor acumulado de ~1,18. Eso es defendible si
  se dice; es indefendible si se oculta. `reference_year` y `update_factor` tienen
  que llegar al front.

Y un recordatorio del §1.3 que no es del INE sino de khdemlidaba: `salary_range`
filtra `updated_at >= now() - interval '12 months'`. **Eso es sólo para
contribuciones.** `salary_references` no se filtra por antigüedad; se filtra por
`reference_year` y se rotula. Si alguien copia el filtro de 12 meses a la tabla de
referencias, las 14 semillas desaparecen al año de sembrarlas.

---

## 9. Lo que no puedo decidir yo

1. **¿Se publica la referencia de asalariado del INE, sabiendo que no es la
   tarifa del autónomo?** Es la decisión de producto de este informe. Mi
   recomendación es la opción B de §5.4, con el rótulo bien visible. Pero publicar
   un salario de nómina en una web de autónomos es una decisión del dueño, no mía.
2. **Las tres categorías sin encaje** (`cerrajero`, `empresa-multiservicios`,
   `autonomo-limpieza`): confirmar que se quedan sin referencia. La alternativa
   —ponerles el número del subgrupo menos malo— la considero peor.
3. **Bajar el mínimo de 20 a 10 y quitar la experiencia de la cohorte** (§8.4)
   cambia la garantía estadística que khdemlidaba había elegido. Hay que
   aprobarlo a sabiendas.
4. **`professional_profiles.tarifa_base`**: hay 30 ceros, un 90 € que no parece
   €/hora y ninguna unidad declarada. Antes de usar esas 17 tarifas como semilla
   de la columna de autónomos, alguien que conozca a esos profesionales tiene que
   decir qué significa cada número. Yo sólo puedo decir que están ahí.
5. **La corrección de jornada (§3.1bis).** Son tres aproximaciones encadenadas
   (media aplicada a percentiles, gran grupo aplicado a subgrupo, 2022 aplicado a
   2024). Mi criterio es que corregir acerca y no corregir se aleja un 11–21 %
   seguro, pero es una decisión metodológica que conviene aprobar explícitamente,
   porque queda escrita en la nota de la página.
6. **Los P25 bajos.** El P25 de peluquería queda en 1 420 €/mes y el de los
   oficios de construcción en 1 740–1 760 €/mes. Son correctos y son bajos.
   Publicarlos o no es decisión de producto.
7. **La clave de servicio.** Cualquier escritura en `app_private` o en
   `salary_references` necesita `SUPABASE_SERVICE_ROLE_KEY` de
   `dquxsethatxtptfviiwd`, que no está en este entorno. Con la consulta de sólo
   lectura del MCP se ha podido medir, no escribir — que es lo correcto en esta
   fase.

---

## 10. URLs verificadas el 02/10/2026

Todas devuelven **200** (siguiendo la redirección 301 del INE).

### API del INE — Tempus3

| Qué da | URL |
|---|---|
| Catálogo de operaciones (112) | `https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES` |
| Tablas de la EAES anual (26) | `https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/140` |
| Tablas de la EAES cuatrienal (152) | `https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/121` |
| **Percentiles por ocupación, 2022** | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/36830?nult=1&tip=A` |
| Variables de esa tabla | `https://servicios.ine.es/wstempus/js/ES/GRUPOS_TABLA/36830` |
| Nombres de sus 1 440 series | `https://servicios.ine.es/wstempus/js/ES/SERIES_TABLA/36830` |
| **Percentiles por tipo de jornada, 2022** (el sesgo de jornada) | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/36832?nult=1&tip=A` |
| **Media anual por gran grupo × jornada, 2022** (el factor fJ) | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/36863?nult=1&tip=A` |
| **€/hora por CCAA × jornada × gran grupo CNO-11, 2022** | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/36891?nult=1&tip=A` |
| Salario mensual bruto y **neto** por ocupación, 2022 | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/36838?nult=1&tip=A` |
| **Medias por grupo de ocupación, 2024** (el factor) | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/28186?nult=1&tip=A` |
| Percentiles por CCAA, 2024 | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/28191?nult=1&tip=A` |
| Ocupación × CCAA pero sólo Alta/Media/Baja | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/28193?nult=1&tip=A` |
| **€/hora por CCAA y sector, 2024** | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/30046?nult=1&tip=A` |
| Serie histórica del €/hora nacional | `https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/EAES2013?nult=6` |
| **Coste laboral por hora efectiva, 2026T2** | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/6062?nult=1&tip=A` |
| Coste salarial por hora, 2026T2 | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/6040?nult=2&tip=A` |
| IPT por ocupación (8 grupos) | `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/76192?nult=6&tip=A` |
| **Última publicación de la EAES** (disparador del refresco) | `https://servicios.ine.es/wstempus/js/ES/PUBLICACIONES_OPERACION/140?det=1` |

### Clasificación y aviso legal

| Qué | URL |
|---|---|
| Estructura completa de la CNO-11 (`.xls`, 97 792 B, 761 filas) | `https://www.ine.es/daco/daco42/clasificaciones/cno11_estructura.xls` |
| **Aviso legal del INE** (CC BY 4.0 y fórmulas de cita) | `https://www.ine.es/dyngs/AYU/index.htm?cid=125` |
| Redirección canónica al anterior | `https://www.ine.es/aviso_legal/` |
| Ficha de la EAES en INEbase | `https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177025&menu=ultiDatos&idp=1254735976596` |

### Lo comprobado y descartado

| Fuente | Resultado |
|---|---|
| `https://w6.seg-social.es/PXWeb/pxweb/es/` | 200 — pero `Bases de cotización` sólo tiene Régimen General, **sin RETA** |
| `https://w6.seg-social.es/PXWeb/api/v1/es/` | **404** — el PX-Web de la TGSS no expone API REST |
| `https://www.seg-social.es/.../Estadisticas/EST8` (y EST10, EST11, EST167) | 200 — afiliación por régimen/CNAE/provincia, **ningún importe de autónomos** |
| `https://www.mites.gob.es/` | **fallo TLS**, código 21: falta el intermedio de la FNMT |
| `https://expinterweb.mites.gob.es/regcon/` | 200 — buscador HTML de convenios, no automatizable |
| `https://sede.agenciatributaria.gob.es/Sede/estadisticas.html` | 200 — pero sin desglose por oficio |
| `https://sede.agenciatributaria.gob.es/Sede/datos-abiertos.html` | **404** |
| `https://datos.gob.es/apidata/catalog/dataset/title/autonomos?_pageSize=20&_page=0` | 200 — **3 falsos positivos** («comunidad autónoma») |
| `https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/407` | 200 pero **`[]`** — el alias EAES:Q 407 está vacío, usar 121 |

### Ficheros de este repo citados

- `/Users/bigseo/khdemlidaba/supabase/migrations/20260926202006_salary_observatory.sql`
- `/Users/bigseo/khdemlidaba/src/pages/Salaires.jsx`
- `/Users/bigseo/Desktop/misaut-nomos/scripts/seed-leads.mjs` (convenciones del script)
- `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/11-salarios.md` (este fichero)
