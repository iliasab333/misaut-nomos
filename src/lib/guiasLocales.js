// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  GUÍAS EDITORIALES LOCALES — el contenido, en un solo sitio              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// 4 oficios × 2 ciudades del Vallès = 8 páginas con contenido ESCRITO, no
// clonado: precios reales de 2026, qué preguntar antes de aceptar, errores
// típicos y preguntas frecuentes. Son las páginas con más intención de compra
// del sitio — quien busca «fontanero en Sabadell» tiene una fuga en casa — y
// por eso van en el sitemap con prioridad 0.8, por encima de las fichas.
//
// POR QUÉ ESTÁ AQUÍ Y NO DENTRO DEL PRERENDERIZADOR, QUE ES DONDE NACIÓ:
// porque vivía SÓLO allí. El prerenderizador escribía la guía en el HTML, y
// luego React hidrataba, no sabía nada de este contenido y lo borraba de la
// pantalla. Google indexaba una guía de 2.400 caracteres y la persona que
// llegaba desde Google veía «0 profesionales disponibles» y nada más. Dos
// páginas distintas en la misma dirección, que además de ser inútil para quien
// llega es exactamente lo que Google llama «cloaking».
//
// Ahora lo leen los dos: `scripts/prerender.mjs` para escribir el HTML y
// `src/pages/Categoria.jsx` para pintarlo. Una sola copia del texto.
//
// El `intro` es HTML escrito a mano en este fichero — no hay nada de un
// usuario aquí dentro, y por eso `Categoria.jsx` puede inyectarlo. Si algún
// día estos textos pasan a venir de la base o del panel, hay que sanearlos
// antes.

export const EDITORIAL_GUIDES = [
  // ─────── FONTANERO ───────
  {
    catSlug: 'fontanero',
    ciudad: 'Sabadell',
    ciudadSlug: 'sabadell',
    intro: `
      <p>Buscar <strong>fontanero en Sabadell</strong> suele ser cosa de urgencia: una fuga, un calentador que no enciende, un atasco que se desborda. Esta guía resume qué deberías pagar de verdad por cada tipo de servicio en la zona, cómo distinguir un buen profesional de un timo, y qué preguntar antes de aceptar un presupuesto. Si al final prefieres ir directo, abajo tienes los autónomos verificados que cubren Sabadell y alrededores.</p>
      <h2>Precios orientativos en Sabadell (2026)</h2>
      <ul>
        <li><strong>Hora de trabajo diurna:</strong> 30–45 €/h (entre semana, horario comercial).</li>
        <li><strong>Urgencia 24h / fin de semana:</strong> 60–90 € la salida + hora; desconfía si te piden 150 € solo por desplazarse en horario normal.</li>
        <li><strong>Atasco con máquina de cable:</strong> 80–140 € presupuesto cerrado.</li>
        <li><strong>Sustitución de calentador (gas atmosférico → estanco):</strong> 600–950 € con material y mano de obra; obligatorio boletín del instalador.</li>
        <li><strong>Cambio de grifería completa:</strong> 60–90 € + el grifo.</li>
      </ul>
      <h2>Qué preguntar antes de aceptar</h2>
      <ul>
        <li>¿Presupuesto cerrado o por horas? Para fugas localizadas, exige cerrado.</li>
        <li>¿Factura con IVA desglosado? Si no la dan, no cuela.</li>
        <li>¿El precio incluye desplazamiento? En Sabadell ciudad debería estar incluido.</li>
        <li>Para calentadores: ¿van a tramitar el cambio en la compañía del gas?</li>
      </ul>
      <h2>Errores comunes</h2>
      <p>Aceptar un “presupuesto” verbal por teléfono sin verlo en escrito. Dejar pasar 24 h una fuga pequeña (los daños por humedad multiplican el coste). Llamar al primer número de Google Ads sin comparar — muchas franquicias derivan a comerciales, no a fontaneros locales.</p>
    `,
    faqs: [
      { q: '¿Cuánto cuesta un fontanero en Sabadell?', a: 'Entre 30 y 45 €/hora en horario normal. Una urgencia nocturna o fin de semana sube a 60–90 € por desplazamiento más la hora. Un atasco con máquina suele cerrarse en 80–140 €.' },
      { q: '¿Es obligatorio el boletín del fontanero al cambiar el calentador?', a: 'Sí. Cualquier sustitución de calentador de gas requiere certificado del instalador autorizado y comunicación a la compañía. Si te lo ofrecen sin boletín, no lo aceptes.' },
      { q: '¿Cómo evito el timo de la urgencia?', a: 'Pide presupuesto antes de cualquier intervención. Desconfía si te dan un precio muy bajo por teléfono y luego suben en casa. Llama a un autónomo local antes que a una franquicia 24h con número 900.' },
    ],
  },
  {
    catSlug: 'fontanero',
    ciudad: 'Terrassa',
    ciudadSlug: 'terrassa',
    intro: `
      <p>En Terrassa, el grueso del trabajo de un fontanero es fugas en pisos antiguos del centro y averías de calentadores en zonas residenciales (Can Boada, Sant Pere Nord). Esta guía cubre precios reales 2026, qué pedir siempre y los líos típicos cuando vives en piso de comunidad.</p>
      <h2>Precios orientativos en Terrassa (2026)</h2>
      <ul>
        <li><strong>Hora diurna:</strong> 30–45 €/h.</li>
        <li><strong>Urgencia fuera de horario:</strong> 60–90 € desplazamiento + hora.</li>
        <li><strong>Localización de fuga sin obra:</strong> 90–180 € (con cámara endoscópica).</li>
        <li><strong>Reparación de bajante comunitaria:</strong> ojo, suele ir por cuenta de la comunidad, NO la tuya. Pide siempre que el fontanero confirme el origen antes de pagar.</li>
        <li><strong>Termo eléctrico nuevo (80–100 L) instalado:</strong> 280–450 €.</li>
      </ul>
      <h2>Pisos antiguos del centro: lo que pasa de verdad</h2>
      <p>Mucho edificio anterior a 1970 en el centro de Terrassa lleva plomo o hierro galvanizado. Una reparación puntual puede revelar una instalación entera al borde del colapso. Pide al fontanero que te confirme el material y, si recomienda cambio integral, pide al menos 2 presupuestos antes de decidir.</p>
      <h2>Errores comunes</h2>
      <p>Pagar al fontanero por una avería que era de la comunidad (bajantes generales, tuberías de pared maestra). No avisar al presidente cuando la fuga afecta al vecino de abajo — luego se complica el seguro. Aceptar “material original” sin marca: el latón chino se rompe en 2 años.</p>
    `,
    faqs: [
      { q: '¿La fuga es mía o de la comunidad?', a: 'Si el agua viene de bajantes generales, tuberías comunitarias o conducciones empotradas en paredes maestras del edificio, normalmente es responsabilidad de la comunidad de propietarios. El fontanero debería confirmarlo por escrito.' },
      { q: '¿Cuánto cobra un fontanero en Terrassa por una visita?', a: 'En horario normal, entre 30 y 45 € la hora. Una localización de fuga con cámara va de 90 a 180 € presupuesto cerrado, sin obra incluida.' },
      { q: '¿Qué hago si el fontanero se va sin terminar y no quiere cobrar nada?', a: 'Pide igualmente un albarán firmado con la fecha y los trabajos hechos. Si vuelve a haber fuga en 30 días, tienes que poder demostrar que ya pagó por intervenir antes.' },
    ],
  },

  // ─────── ELECTRICISTA ───────
  {
    catSlug: 'electricista',
    ciudad: 'Sabadell',
    ciudadSlug: 'sabadell',
    intro: `
      <p>Necesitas <strong>electricista en Sabadell</strong>: cambiar el cuadro general, montar puntos de luz nuevos, instalar el cargador del coche eléctrico, o resolver un fallo que va saltando el diferencial. Esta guía resume tarifas reales 2026, cuándo necesitas Boletín y qué pedir siempre.</p>
      <h2>Precios orientativos en Sabadell (2026)</h2>
      <ul>
        <li><strong>Hora suelta:</strong> 30–45 €/h.</li>
        <li><strong>Cambio de diferencial / magnetotérmico:</strong> 50–90 € incluido material.</li>
        <li><strong>Renovación cuadro general (vivienda media):</strong> 350–600 € + Boletín Eléctrico (CIE).</li>
        <li><strong>Punto de luz nuevo con interruptor:</strong> 70–120 €.</li>
        <li><strong>Instalación cargador VE 7,4 kW monofásico:</strong> 700–1.200 € (sin tirar línea desde cuadro lejano).</li>
      </ul>
      <h2>Cuándo necesitas Boletín de Instalación (CIE)</h2>
      <p>Para vivienda con más de 20 años sin reformar al solicitar contrato eléctrico nuevo, para ampliar potencia, o tras renovación del cuadro. En Sabadell lo emite el instalador autorizado (categoría IBT o IBTE) y lo tramita en Endesa o tu comercializadora. El Boletín cuesta 80–120 € aparte de la obra.</p>
      <h2>Qué preguntar antes de aceptar</h2>
      <ul>
        <li>¿Está dado de alta como instalador autorizado (REA)? Sin esa autorización no puede emitir Boletín y la instalación queda ilegal.</li>
        <li>¿El presupuesto incluye papeleo + canon de Boletín?</li>
        <li>Para cargador de VE: ¿necesitamos protección magnetotérmica + diferencial dedicada? (sí — obligatorio por ITC-BT-52).</li>
      </ul>
    `,
    faqs: [
      { q: '¿Cuánto cuesta un electricista en Sabadell?', a: 'En horario normal, 30–45 € la hora. Cambios pequeños (un diferencial, un interruptor) se cierran en 50–90 €. Un cuadro completo en vivienda de tamaño medio: 350–600 € + el Boletín Eléctrico (CIE).' },
      { q: '¿Puedo cambiar yo el diferencial?', a: 'Legalmente sí en tu propia vivienda, pero si la compañía pide un Boletín al instalar contrato o ampliar potencia, ese trabajo solo lo certifica un instalador autorizado. Por seguridad y por papeleo, es mejor encargarlo.' },
      { q: '¿Cuánto cuesta instalar un cargador de coche eléctrico en Sabadell?', a: 'Entre 700 y 1.200 € la instalación estándar de 7,4 kW monofásico, sin tirada larga de cable. Trifásico de 11–22 kW sube de 1.500 € en adelante. Hay subvenciones MOVES III activas — pide al electricista que las tramite.' },
    ],
  },
  {
    catSlug: 'electricista',
    ciudad: 'Terrassa',
    ciudadSlug: 'terrassa',
    intro: `
      <p>En Terrassa, los encargos típicos de un electricista mezclan vivienda antigua del centro (instalaciones de aluminio o sin toma de tierra completa) con vivienda nueva en Sant Pere Nord y Can Anglada con todo a punto. Esta guía cubre precios 2026, cuándo es obligatorio Boletín y cómo no pagar de más por trabajos sencillos.</p>
      <h2>Precios orientativos en Terrassa (2026)</h2>
      <ul>
        <li><strong>Hora diurna:</strong> 30–45 €/h.</li>
        <li><strong>Sustitución de toma de tierra:</strong> 80–150 € si hay arqueta accesible.</li>
        <li><strong>Cuadro nuevo en vivienda 60–90 m²:</strong> 400–700 € + Boletín.</li>
        <li><strong>Instalación punto cocina (vitro + horno):</strong> 90–160 € con cable de 2,5 mm² nuevo.</li>
        <li><strong>Reparación cortocircuito puntual:</strong> 40–90 € cerrado si se identifica en menos de 1 h.</li>
      </ul>
      <h2>Casco antiguo de Terrassa: lo que cuesta de verdad</h2>
      <p>En pisos del Centre o Sant Pere antiguos verás cableado de aluminio (años 80) o sin toma de tierra. Si te piden cambiar el cuadro pero NO el cableado horizontal, en 2 años saltará el diferencial sin parar. Pide siempre al electricista que evalúe el cableado existente con un megóhmetro antes de presupuestar solo el cuadro.</p>
      <h2>Avisa antes de:</h2>
      <ul>
        <li>Ampliar potencia (cambiará el ICP y posiblemente el cuadro).</li>
        <li>Instalar aire acondicionado split (necesita línea dedicada).</li>
        <li>Pasar de gas a inducción (la línea de cocina nueva debe ser 2,5 mm² mínimo, 6 mm² recomendado).</li>
      </ul>
    `,
    faqs: [
      { q: '¿Necesito Boletín si solo cambio el diferencial?', a: 'No para una sustitución puntual de un dispositivo de protección, sí para cambio del cuadro completo o ampliación de potencia. Si tu comercializadora te lo exige al firmar contrato nuevo, es obligatorio independientemente.' },
      { q: '¿Cuánto cuesta cambiar el cuadro eléctrico en Terrassa?', a: 'Una vivienda de 60–90 m² ronda 400–700 € + el CIE (80–120 €). Si el cableado existente está degradado (típico en pisos del centro), añadir cableado nuevo puede duplicar el presupuesto.' },
      { q: '¿Por qué salta el diferencial todo el rato?', a: 'Lo más habitual: un electrodoméstico con fuga a tierra (lavadora vieja, calentador eléctrico), humedad en una caja de conexión o cableado degradado. Un electricista mide derivaciones con multímetro en 30–60 min para identificarlo.' },
    ],
  },

  // ─────── CERRAJERO ───────
  {
    catSlug: 'cerrajero',
    ciudad: 'Sabadell',
    ciudadSlug: 'sabadell',
    intro: `
      <p>El sector de los <strong>cerrajeros en Sabadell</strong> está plagado de empresas-pantalla con número 900 que cobran 300–500 € por una apertura que no debería pasar de 80 €. Esta guía es honesta: tarifas reales, qué desconfiar y cómo elegir bien.</p>
      <h2>Precios orientativos en Sabadell (2026)</h2>
      <ul>
        <li><strong>Apertura de puerta con resbalón (cerrada de golpe, no echada con llave):</strong> 50–80 €.</li>
        <li><strong>Apertura con bombín echado (sin destruir):</strong> 80–150 € si el cerrajero usa técnica de impresión / ganzúa.</li>
        <li><strong>Apertura con bombín echado (destructiva, si no abre limpio):</strong> 90–130 € + bombín nuevo (40–90 €).</li>
        <li><strong>Cambio de bombín antibumping:</strong> 90–180 € puesto.</li>
        <li><strong>Refuerzo puerta blindada / cerradura adicional:</strong> 200–500 € según modelo.</li>
      </ul>
      <h2>Cómo evitar el timo de los falsos cerrajeros</h2>
      <p>El fraude clásico: llamas al número 900 de “cerrajero urgente Sabadell”, viene un operario que dice que “la cerradura tiene seguridad” y que solo puede abrir destrozándola (cobrando 300 €) y vendiéndote otra antibumping (otros 200 €). Cuando un cerrajero LEGÍTIMO siempre te dirá si puede entrar sin romper. Pide:</p>
      <ul>
        <li>Presupuesto cerrado por teléfono ANTES de que venga.</li>
        <li>Factura con su NIF y dirección física (NO una franquicia).</li>
        <li>Que intente apertura NO destructiva primero.</li>
      </ul>
      <h2>Errores comunes</h2>
      <p>Pagar en efectivo sin recibo. Aceptar que “el bombín está roto” sin que te lo enseñen físicamente. Comprar el bombín que te traiga el cerrajero sin saber la marca — exige Tesa o Lince con tarjeta de seguridad si vas a invertir en uno antibumping.</p>
    `,
    faqs: [
      { q: '¿Cuánto cuesta un cerrajero para abrir la puerta en Sabadell?', a: 'Una apertura por puerta cerrada de golpe (sin llave echada) ronda 50–80 €. Con llave echada y técnica no destructiva, 80–150 €. Si te piden más de 200 € “porque tu cerradura es especial”, sospecha.' },
      { q: '¿Cómo distingo un cerrajero legítimo de una franquicia 900?', a: 'Un cerrajero local tiene dirección física en Sabadell, un número fijo o móvil propio (no un 900) y da presupuesto cerrado por teléfono. Si te derivan a un call-center y no pueden confirmar precio, no contrates.' },
      { q: '¿El seguro del hogar cubre la apertura de puerta?', a: 'Si tu póliza incluye “asistencia en cerrajería”, sí — y suele cubrir hasta 80–150 €. Llama antes a tu seguro y pide que ELLOS te manden a uno. Te ahorras la sorpresa de la factura.' },
    ],
  },
  {
    catSlug: 'cerrajero',
    ciudad: 'Terrassa',
    ciudadSlug: 'terrassa',
    intro: `
      <p>Terrassa tiene mucho piso con puerta blindada antigua y cerraduras de 30+ años que se quedan atascadas cuando hace frío. Esta guía cubre lo que cuesta de verdad un <strong>cerrajero en Terrassa</strong> en 2026, qué garantías exigir y cómo evitar los timos clásicos de la urgencia nocturna.</p>
      <h2>Precios orientativos en Terrassa (2026)</h2>
      <ul>
        <li><strong>Apertura simple (puerta cerrada de golpe):</strong> 50–80 €.</li>
        <li><strong>Apertura con llave echada, no destructiva:</strong> 80–150 €.</li>
        <li><strong>Sustitución de bombín estándar:</strong> 60–100 € + bombín (30–80 €).</li>
        <li><strong>Bombín antibumping con tarjeta:</strong> 90–180 € puesto.</li>
        <li><strong>Reparación cerradura embutida (vieja, no abre del todo):</strong> 80–150 €.</li>
        <li><strong>Persianas: cambio de cinta + capuchino:</strong> 50–110 €.</li>
      </ul>
      <h2>Por qué se atasca tu cerradura</h2>
      <p>En pisos antiguos de Terrassa el problema típico es óxido + desgaste del bombín tras décadas + dilatación por humedad invernal. Antes de tirar de cerrajero, prueba lubricante de grafito en polvo (NO aceite — el aceite atrae polvo y empeora). Si sigue duro, hora de cambiarlo. Un bombín antibumping decente cuesta 30–50 € en cualquier ferretería y se cambia en 20 min.</p>
      <h2>Garantías que tienes que exigir</h2>
      <ul>
        <li>Mínimo 12 meses de garantía sobre el trabajo.</li>
        <li>Factura desglosada: mano de obra + material + IVA.</li>
        <li>Si te ponen bombín nuevo: marca, modelo y tarjeta de seguridad incluida (sin tarjeta, no podrás encargar copias en el futuro).</li>
      </ul>
    `,
    faqs: [
      { q: '¿Cuánto cuesta cambiar el bombín en Terrassa?', a: 'Un bombín estándar puesto sale por 60–100 € + el bombín (30–80 €). Un antibumping con tarjeta de seguridad puesto: 90–180 € total.' },
      { q: '¿Es obligatorio cambiar el bombín al mudarse a un piso de alquiler?', a: 'No es obligatorio por ley, pero es altamente recomendable. El propietario y el inquilino anterior pueden tener copias. Si lo haces tú, son 30–80 € de material y 20 min con una llave allen.' },
      { q: '¿Puedo abrir mi propia puerta con una tarjeta o un destornillador?', a: 'Solo si está cerrada de golpe (resbalón, sin llave echada). Si la llave está echada, no — destrozarás el marco. Llama a un cerrajero local antes que forzar.' },
    ],
  },

  // ─────── ALBAÑIL / REFORMAS ───────
  {
    catSlug: 'albanil-reformas',
    ciudad: 'Sabadell',
    ciudadSlug: 'sabadell',
    intro: `
      <p>Reformar piso en Sabadell sube de precio cada año. Esta guía es directa: qué cuesta de verdad cada partida, cómo elegir albañil sin tirar el dinero y qué papeles vas a necesitar en el Ayuntamiento de Sabadell.</p>
      <h2>Precios orientativos para reformas en Sabadell (2026)</h2>
      <ul>
        <li><strong>Reforma integral de baño (5 m²):</strong> 4.500–8.500 € llave en mano (gres, sanitarios estándar, mampara).</li>
        <li><strong>Reforma de cocina (8–12 m²):</strong> 7.500–18.000 € incluyendo muebles de gama media e instalación.</li>
        <li><strong>Pintura integral piso 70 m²:</strong> 1.500–2.500 € a dos manos plástica mate.</li>
        <li><strong>Tirar tabique no portante (con porte de escombros):</strong> 400–800 €.</li>
        <li><strong>Solado nuevo (porcelánico medio, 50 m²):</strong> 2.500–4.500 € incluyendo retirada del antiguo.</li>
      </ul>
      <h2>Licencia de obras en Sabadell: lo que necesitas</h2>
      <p>Para tirar tabiques, mover instalaciones de fontanería o cambiar la distribución, en Sabadell se tramita <strong>comunicación previa de obra menor</strong> (no requiere proyecto técnico para reformas estándar de vivienda). Tasa orientativa: 0,8 % del presupuesto de obra. Para obra mayor (afectar elementos estructurales, cambiar fachada): licencia de obras + proyecto firmado por arquitecto.</p>
      <h2>Cómo elegir albañil sin pillarte los dedos</h2>
      <ul>
        <li>Pide al menos 3 presupuestos por escrito con desglose por partidas (no solo precio total).</li>
        <li>Comprueba que está dado de alta como autónomo (pide NIF + número de la Seguridad Social).</li>
        <li>Exige seguro de responsabilidad civil — si hay un siniestro durante la obra, sin seguro pagas tú.</li>
        <li>Anticipo máximo 30 %. El resto contra entregas parciales (no al final). Nunca el 100 % por adelantado.</li>
      </ul>
      <h2>Errores comunes</h2>
      <p>Aceptar el presupuesto más barato sin desglose (acaba subiendo un 40 % por “extras imprevistos”). Olvidar la licencia (multa de 600–3.000 € si el Ayuntamiento de Sabadell detecta la obra sin tramitar). Pagar sin factura — pierdes la garantía y la deducción del IRPF si aplica.</p>
    `,
    faqs: [
      { q: '¿Cuánto cuesta reformar un baño en Sabadell?', a: 'Un baño estándar de unos 5 m² llave en mano va de 4.500 a 8.500 € en 2026, con calidad media (gres porcelánico, sanitarios marca conocida, mampara estándar). Subir a gama alta puede llegar a 12.000–15.000 €.' },
      { q: '¿Necesito licencia para tirar un tabique?', a: 'Sí, comunicación previa de obra menor en el Ayuntamiento de Sabadell. Es un trámite sencillo (formulario online + tasa) pero obligatorio. Si te lo saltas y te denuncian, multa.' },
      { q: '¿Cuánto se tarda en reformar un piso entero en Sabadell?', a: 'Una reforma integral de piso de 70–90 m² lleva entre 6 y 12 semanas según alcance. Cocina y baño en paralelo: 4–6 semanas. Pinturas + suelo solo: 2–3 semanas.' },
    ],
  },
  {
    catSlug: 'albanil-reformas',
    ciudad: 'Terrassa',
    ciudadSlug: 'terrassa',
    intro: `
      <p>Reformar en Terrassa tiene un par de particularidades: muchas viviendas son antiguas (Centre, Ca n'Aurell) con tabiques de pluet y forjados delicados, y la disponibilidad de albañiles serios baja entre marzo y junio (alta demanda). Esta guía cubre precios reales 2026, cómo no comerte una sorpresa estructural y qué tramitar.</p>
      <h2>Precios orientativos para reformas en Terrassa (2026)</h2>
      <ul>
        <li><strong>Baño completo (4–6 m²):</strong> 4.500–8.500 €.</li>
        <li><strong>Cocina mediana (10 m²) con muebles gama media:</strong> 8.500–16.000 €.</li>
        <li><strong>Reforma integral piso 80 m² (sin estructural):</strong> 25.000–45.000 € llave en mano.</li>
        <li><strong>Pintura completa (70 m²):</strong> 1.500–2.500 €.</li>
        <li><strong>Cambio de ventanas (PVC RPT, 8 ud):</strong> 3.500–6.000 € puestas con retirada de las viejas.</li>
      </ul>
      <h2>Pisos antiguos del centro: lo que descubres al picar</h2>
      <p>En Centre y Ca n'Aurell verás tabiques de pluet (cañizo y yeso) que se desmenuzan al primer golpe, viguetas de madera con humedad, y muchas veces ausencia de cámara de aire. Cuando un albañil te dice “tiramos este tabique y abrimos al salón”, asegúrate de que evalúa:</p>
      <ul>
        <li>Si el tabique es portante (consulta plano del edificio).</li>
        <li>Estado de las viguetas debajo del solado (descubrir un forjado de madera podrida puede sumar 4.000–8.000 €).</li>
        <li>Aislamiento de fachada exterior — la cámara existe o no.</li>
      </ul>
      <h2>Trámites Ayuntamiento de Terrassa</h2>
      <p>Para reformas estándar: <strong>comunicación previa de obra menor</strong> a través de la sede electrónica. Tasa según presupuesto. Si tocas estructura, fachada o cambias huecos en envolvente: licencia de obra mayor + proyecto. Importante: si vives en edificio catalogado del centro, hay restricciones específicas (ventanas, balcones, color de fachada).</p>
      <h2>Recomendaciones honestas</h2>
      <ul>
        <li>No firmes con el primer albañil que te visite si vienes de Idealista — los presupuestos suelen estar inflados un 20 % en marzo–junio.</li>
        <li>Pide ver al menos 1 obra reciente del albañil en Terrassa.</li>
        <li>Reserva un colchón del 15 % del presupuesto para imprevistos (en piso antiguo, casi seguro que aparece algo).</li>
      </ul>
    `,
    faqs: [
      { q: '¿Cuánto cuesta reformar un piso entero de 80 m² en Terrassa?', a: 'Una reforma integral sin tocar estructura va de 25.000 a 45.000 € en 2026, llave en mano con calidades medias. Si hay que tirar tabiques porque están podridos o el suelo es de madera vieja, súmale 5.000–10.000 € fácilmente.' },
      { q: '¿Necesito licencia para cambiar las ventanas?', a: 'En edificios no catalogados, basta con comunicación previa. En edificios catalogados del centro de Terrassa, necesitas autorización urbanística previa porque afecta a fachada — el modelo y color suele estar reglado.' },
      { q: '¿Cuánto tardan en reformar un piso entero en Terrassa?', a: 'Una reforma integral de 80 m² lleva 8–14 semanas. Si hay sorpresas (viguetas, instalaciones a cambiar), suma 2–4 semanas extra. Marca fechas con penalizaciones de 50 €/día por retraso si te interesa.' },
    ],
  },
];

// Busca la guía de una combinación oficio+ciudad. Devuelve null si no hay —
// que es el caso de todas las combinaciones menos ocho.
export function guiaLocal(catSlug, ciudadSlug) {
  if (!catSlug || !ciudadSlug) return null;
  return EDITORIAL_GUIDES.find(
    (g) => g.catSlug === catSlug && g.ciudadSlug === ciudadSlug,
  ) || null;
}
