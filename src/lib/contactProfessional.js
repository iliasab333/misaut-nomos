// Lógica del CTA "Contactar" del buscador y del perfil público.
// Reglas (P0):
//   - Si hay sesión Supabase activa (CUALQUIER usuario), creamos/abrimos la
//     conversación y entramos al chat. NUNCA redirigimos a /login si hay
//     sesión. Resolvemos el perfil interno (tabla `users`) por auth_user_id =
//     auth.uid(), nunca por id directo.
//   - Si NO hay sesión, llamamos a la Edge Function `contact-professional`
//     con { professional_profile_id, name, email, message } y mostramos OK al
//     usuario sin obligar a registrarse.
//
// Helpers exportados:
//   getCurrentSessionUser() -> { session, profile } | null
//   buildConversationId(myUserRowId, otherUserRowId) -> string
//   sendGuestContact({ professional_profile_id, name, email, message })

import { supabase } from '@/api/supabaseClient';

export async function getCurrentSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch (_e) {
    return null;
  }
}

// Resuelve la fila de users por auth_user_id = auth.uid().
// Devuelve null si no hay sesión o no se encuentra fila (RLS).
export async function resolveSelfUserRow() {
  const session = await getCurrentSession();
  if (!session?.user?.id) return { session: null, userRow: null };
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();
    if (error) return { session, userRow: null };
    return { session, userRow: data || null };
  } catch (_e) {
    return { session, userRow: null };
  }
}

// Convención del codebase: el conversation_id es el join de los dos user.id
// ordenados ascendentemente y unidos por "_". Lo usan los polls/realtime
// existentes — no cambiar.
export function buildConversationId(idA, idB) {
  if (!idA || !idB) return null;
  return [idA, idB].sort().join('_');
}

// Llamada anónima a la Edge Function `contact-professional`. La function
// crea/encola el mensaje en backend; el front solo confirma envío.
export async function sendGuestContact({ professional_profile_id, name, email, message }) {
  const { data, error } = await supabase.functions.invoke('contact-professional', {
    body: {
      professional_profile_id,
      name: (name || '').trim(),
      email: (email || '').trim(),
      message: (message || '').trim(),
    },
  });
  if (error) throw new Error(error.message || 'Error al enviar');
  return data;
}
