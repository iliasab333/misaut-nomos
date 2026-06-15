// Cliente del nuevo sistema de reseñas (RPC Supabase).
// Solo el profesional logueado puede crear solicitudes; los clientes leen y
// envían usando el token en /valorar/:token. El backend ya valida todo.

import { supabase } from '@/api/supabaseClient';

export async function createReviewRequest({ conversation_id, client_id }) {
  const { data, error } = await supabase.rpc('create_review_request', {
    p_conversation_id: conversation_id,
    p_client_id: client_id,
  });
  if (error) throw new Error(error.message || 'No se pudo crear la solicitud');
  return data || null;
}

export async function getReviewRequest(token) {
  const { data, error } = await supabase.rpc('get_review_request', {
    p_token: token,
  });
  if (error) throw new Error(error.message || 'Token inválido');
  return data || null;
}

export async function submitReview({
  token,
  rating,
  comment,
  comunicacion,
  calidad,
  rapidez,
  precio_satisfaccion,
  client_name,
}) {
  const { data, error } = await supabase.rpc('submit_review', {
    p_token: token,
    p_rating: rating,
    p_comment: comment ?? null,
    p_comunicacion: comunicacion ?? null,
    p_calidad: calidad ?? null,
    p_rapidez: rapidez ?? null,
    p_precio_satisfaccion: precio_satisfaccion ?? null,
    p_client_name: client_name ?? null,
  });
  if (error) throw new Error(error.message || 'No se pudo enviar la reseña');
  return data || null;
}
