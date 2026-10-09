// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EL CORREO QUE LE DICE A LA PERSONA QUE YA ESTÁ VERIFICADA              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Está aparte del endpoint por dos motivos: lo usa el circuito de aprobación
// cada vez que alguien aprueba una, y lo usó una vez el guion que avisó a las
// ocho personas que ya estaban aprobadas antes de que esto existiera.
//
// POR QUÉ EXISTE: ocho personas enseñaron su DNI y esperaron entre 2 y 87 días.
// Aprobarlas en silencio es hacerles pasar por todo el trámite y no decirles
// que ha servido. El distintivo aparece en su ficha y nadie se entera.
//
// NO SE AVISA DE UN RECHAZO DESDE AQUÍ, a propósito: un «no» se cuenta con el
// motivo delante y conviene leerlo antes de mandarlo. Eso es otra decisión.

import { enviarCorreo, plantilla, seccion, escapar } from './correo.js';

/**
 * @param {{nombre?:string, correo:string, tieneFicha:boolean, urlFicha?:string}} datos
 * No lanza nunca: avisar es un extra, y que falle el correo no puede deshacer
 * una aprobación que ya está escrita en la base.
 */
export async function avisarVerificada({ nombre, correo, tieneFicha, urlFicha }) {
  if (!correo || !correo.includes('@')) return { enviado: false, motivo: 'sin correo' };

  const saludo = nombre ? `Hola ${escapar(String(nombre).trim())},` : 'Hola,';
  const bloques = [
    `<p style="font-size:15px;line-height:1.6;margin:18px 0 0;">${saludo}</p>`,
    `<p style="font-size:15px;line-height:1.6;">Hemos revisado la documentación que nos enviaste y
      <strong>tu identidad ya está verificada</strong>. Gracias por la paciencia.</p>`,
  ];

  if (tieneFicha) {
    bloques.push(seccion('Qué cambia en tu ficha', [
      'Aparece el distintivo de <strong>identidad verificada</strong>, que ve cualquiera que entre en tu perfil.',
      'Es la señal que más mira alguien que no te conoce y está decidiendo a quién llamar.',
    ]));
    if (urlFicha) {
      bloques.push(`<div style="margin-top:22px;">
        <a href="${urlFicha}" style="display:inline-block;background:#00255C;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px;">Ver mi ficha</a>
      </div>`);
    }
  } else {
    // Sin ficha publicada el distintivo no se ve en ningún sitio. Prometerle
    // un sello que no puede encontrar sería peor que no escribirle.
    bloques.push(seccion('Lo que falta para que se vea', [
      'Tu verificación queda guardada, pero el distintivo sólo aparece cuando tienes una ficha publicada.',
      'En cuanto completes y publiques tu perfil, se mostrará solo.',
    ]));
    bloques.push(`<div style="margin-top:22px;">
      <a href="https://misautonomos.es/mi-perfil" style="display:inline-block;background:#00255C;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px;">Completar mi ficha</a>
    </div>`);
  }

  const html = plantilla({
    titulo: 'Tu identidad ya está verificada',
    entradilla: 'Hemos revisado tu documentación.',
    bloques,
    pie: 'Recibes esto porque enviaste documentación para verificar tu perfil en MisAutónomos.',
  });

  try {
    // `marca` enciende el candado anti-duplicado de `enviarCorreo`: antes de
    // mandar, mira en Resend si a ESTA dirección ya le salió un correo con esa
    // marca en el asunto y, si lo encuentra, no repite.
    //
    // Está aquí por una razón concreta y vergonzosa: el día que se avisó a las
    // ocho personas que ya estaban aprobadas, un fallo en el guion de envío
    // ejecutó la tanda DOS VECES y las ocho recibieron el correo por
    // duplicado. El candado no habría arreglado el guion, pero sí habría
    // evitado la segunda copia — y protege del caso normal: dos clics en
    // Aprobar, o un reintento tras un error de red.
    const r = await enviarCorreo({
      asunto: 'Tu identidad ya está verificada · MisAutónomos',
      html,
      para: correo,
      marca: 'Tu identidad ya está verificada',
    });
    if (r.ok === false || r.saltado) {
      // Al log, no a la respuesta: el cuerpo de error de Resend repite el
      // campo `to`, o sea la dirección de la persona.
      console.error('[aviso-verificacion] no se pudo enviar:', r.error || r.motivo);
      return { enviado: false, motivo: r.motivo || 'resend' };
    }
    return { enviado: true, id: r.id };
  } catch (e) {
    console.error('[aviso-verificacion]', e.message);
    return { enviado: false, motivo: 'excepcion' };
  }
}
