// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  AVISO AL AUTÓNOMO CUANDO SE LE RESPONDE UN TICKET                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Hasta hoy, responder un ticket escribía una fila en `ticket_messages` y nada
// más. La tabla tenía CERO filas: nadie había respondido nunca a nadie. Y aun
// respondiendo, la persona sólo se enteraba si volvía a la web por su cuenta y
// abría el ticket — que es tanto como no enterarse.
//
// El caso que lo destapó: ECOSMART INSTALACIONES escribió el 3 de septiembre
// preguntando por sus documentos y llevaba 66 días esperando. Decirle «Hecho»
// en una caja que no envía nada habría sido dejarle esperando otra vez.
//
// TRES DECISIONES:
//
// 1. SÓLO ADMIN. El endpoint manda correo a una dirección sacada de la base;
//    abierto sería una máquina de spam con el dominio verificado del sitio.
//    Usa la misma puerta que `/api/admin/verificaciones`.
//
// 2. EL TEXTO SE LEE DE LA BASE, no del cuerpo de la petición. El cliente
//    manda sólo `ticketId`. Así nadie puede hacer que el sitio envíe, con su
//    propio dominio, un texto que nadie escribió en ningún ticket.
//
// 3. NO SE ENVÍAN LAS NOTAS INTERNAS. Son las que el admin escribe para sí
//    mismo. Mandárselas a la persona sería el peor fallo posible de esta
//    función, así que el filtro va en la consulta y además se vuelve a
//    comprobar antes de enviar.

import { quienLlama, postgrest, hayCredenciales } from '../_lib/quienLlama.js';
import { enviarCorreo, plantilla, seccion, escapar } from '../_lib/correo.js';

export default async function handler(req, res) {
  // Sin CORS a propósito: sólo lo llama el panel, desde el mismo origen.
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'metodo_no_permitido' });
  }
  if (!hayCredenciales()) return res.status(500).json({ error: 'faltan_credenciales' });

  const permiso = await quienLlama(req);
  if (!permiso.ok) return res.status(permiso.estado).json({ error: permiso.error });

  const cuerpo = typeof req.body === 'string' ? leerJSON(req.body) : (req.body || {});
  const ticketId = typeof cuerpo.ticketId === 'string' ? cuerpo.ticketId.trim() : '';
  if (!ticketId || !/^[A-Za-z0-9-]{6,40}$/.test(ticketId)) {
    return res.status(400).json({ error: 'ticket_invalido' });
  }

  try {
    const tickets = await postgrest(
      `tickets?select=id,title,status,creator_name,creator_email&id=eq.${encodeURIComponent(ticketId)}&limit=1`,
    );
    const ticket = tickets?.[0];
    if (!ticket) return res.status(404).json({ error: 'ticket_no_encontrado' });

    const destino = (ticket.creator_email || '').trim();
    // Sin dirección no hay aviso posible, y no es un error: hay tickets
    // abiertos desde el formulario público sin correo. Se responde 200 para
    // que el panel no pinte un fallo donde no lo hay.
    if (!destino || !destino.includes('@')) {
      return res.status(200).json({ ok: true, enviado: false, motivo: 'el ticket no tiene correo' });
    }

    // La última respuesta del admin que NO sea nota interna. El filtro va en
    // la consulta; la comprobación de abajo es el segundo cerrojo.
    const mensajes = await postgrest(
      `ticket_messages?select=content,is_internal,sender_type,created_date`
      + `&ticket_id=eq.${encodeURIComponent(ticketId)}&sender_type=eq.admin&is_internal=is.false`
      + `&order=created_date.desc&limit=1`,
    );
    const ultimo = mensajes?.[0];
    if (!ultimo) return res.status(200).json({ ok: true, enviado: false, motivo: 'no hay respuesta que enviar' });
    if (ultimo.is_internal === true) {
      return res.status(200).json({ ok: true, enviado: false, motivo: 'la ultima es una nota interna' });
    }

    const asunto = `Respuesta a tu consulta · ${ticket.title || 'MisAutónomos'}`;
    const html = plantilla({
      titulo: 'Tenemos respuesta a tu consulta',
      entradilla: escapar(ticket.title || ''),
      bloques: [
        seccion('Te hemos escrito', [
          // `white-space: pre-line` para respetar los saltos que escribió el
          // admin: un texto de varias líneas pegado en un párrafo corrido se
          // lee como una plantilla automática, no como una respuesta.
          `<div style="white-space:pre-line;">${escapar(ultimo.content || '')}</div>`,
        ]),
        `<div style="margin-top:22px;">
           <a href="https://misautonomos.es/soporte/${encodeURIComponent(ticket.id)}"
              style="display:inline-block;background:#00255C;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px;">
             Ver la conversación y responder
           </a>
         </div>`,
      ],
      pie: 'Has recibido esto porque abriste una consulta en MisAutónomos.',
    });

    const envio = await enviarCorreo({ asunto, html, para: destino });
    if (envio.ok === false || envio.saltado) {
      // El detalle al log: el cuerpo de error de Resend repite el campo `to`,
      // o sea la dirección de la persona, y esta respuesta la lee el navegador.
      console.error('[aviso-respuesta] no se pudo enviar:', envio.error || envio.motivo);
      return res.status(502).json({ error: 'no_enviado', motivo: envio.motivo || 'resend' });
    }
    return res.status(200).json({ ok: true, enviado: true });
  } catch (e) {
    console.error('[aviso-respuesta]', e.message);
    return res.status(500).json({ error: 'fallo_interno' });
  }
}

function leerJSON(s) { try { return JSON.parse(s); } catch { return {}; } }
