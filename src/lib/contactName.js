// Regla única para mostrar el nombre del INTERLOCUTOR en mensajería.
//
// Reglas (en este orden, nunca mostrar email):
//  1. Si el otro es profesional → business_name del professional_profiles.
//  2. Si no, professional_name guardado en mensajes (cuando el otro es pro).
//  3. Si tampoco hay → cae al nombre personal (client_name o full_name).
//  4. Nunca devolvemos email, ni la parte local del email.
//
// La caché `cached` es la fila de `profilesCache[otherUserId]` con shape:
//   { business_name, full_name, email, type: 'professional' | 'client' }
//
// `messages` es la lista de mensajes de la conversación (filtramos por id).

const BRIEFING_PREFIX = 'briefing_';

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function nameFromMessagesProfessional(messages, otherUserId, myId) {
  if (!Array.isArray(messages)) return null;
  // 1) Si el OTRO envió mensajes, su nombre está en sender_name o professional_name.
  for (const m of messages) {
    if (m.sender_id !== otherUserId) continue;
    const v = nonEmpty(m.sender_name) || nonEmpty(m.professional_name);
    if (v) return v;
  }
  // 2) Si solo yo he enviado, professional_name del mensaje es el del OTRO (yo soy cliente).
  for (const m of messages) {
    if (m.sender_id !== myId) continue;
    const v = nonEmpty(m.professional_name);
    if (v) return v;
  }
  return null;
}

function nameFromMessagesClient(messages, otherUserId, myId) {
  if (!Array.isArray(messages)) return null;
  // 1) Mensajes donde el cliente fue el sender.
  for (const m of messages) {
    if (m.sender_id !== otherUserId) continue;
    const v = nonEmpty(m.sender_name) || nonEmpty(m.client_name);
    if (v) return v;
  }
  // 2) Mensajes míos donde guardamos client_name del OTRO.
  for (const m of messages) {
    if (m.sender_id !== myId) continue;
    const v = nonEmpty(m.client_name);
    if (v) return v;
  }
  return null;
}

// Heurística: determina si el OTRO interlocutor es profesional.
// Si tenemos caché, su `type` es la fuente más fiable. Si no, usamos el
// `user_type` del usuario logueado: si yo soy profesional → el otro es cliente,
// y viceversa.
export function isOtherProfessional({ cached, myUserType }) {
  if (cached?.type === 'professional') return true;
  if (cached?.type === 'client') return false;
  if (myUserType === 'professionnel') return false;
  if (myUserType === 'client') return true;
  return null; // desconocido — tratar como pro por defecto (caso landing/registro)
}

// Devuelve el nombre a mostrar para el OTRO interlocutor.
// `opts` = { conversationId, otherUserId, myId, myUserType, cached, messages }
export function pickOtherName({
  conversationId,
  otherUserId,
  myId,
  myUserType,
  cached,
  messages,
}) {
  // Chats internos del equipo (briefing_…) — alias fijo.
  if (conversationId?.startsWith?.(BRIEFING_PREFIX)) {
    return 'Equipo Plan Ads+';
  }

  const otherIsPro = isOtherProfessional({ cached, myUserType });

  if (otherIsPro || otherIsPro === null) {
    // 1) business_name del perfil pro
    const business = nonEmpty(cached?.business_name);
    if (business) return business;
    // 2) professional_name guardado en mensajes
    const fromMsg = nameFromMessagesProfessional(messages, otherUserId, myId);
    if (fromMsg) return fromMsg;
    // 3) fallback a nombre personal del usuario (NO email)
    const full = nonEmpty(cached?.full_name);
    if (full) return full;
  } else {
    // El otro es CLIENTE: nombre personal
    const fromMsg = nameFromMessagesClient(messages, otherUserId, myId);
    if (fromMsg) return fromMsg;
    const full = nonEmpty(cached?.full_name);
    if (full) return full;
    // Último intento: si tuviese business_name por error de tipo, lo usamos
    const business = nonEmpty(cached?.business_name);
    if (business) return business;
  }

  return null;
}
