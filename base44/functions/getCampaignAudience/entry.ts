import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CAMPAIGN_TAG = 'repesca_v1_sent';
// Las seis direcciones que había aquí escritas a mano —las cuentas de prueba
// del dueño— salen a una variable de entorno: este repositorio es público.
// Vacía, la campaña no excluye a nadie, que es lo que hacía antes de que la
// lista existiera.
const CAMPAIGN_BLOCKLIST = (Deno.env.get('CAMPAIGN_BLOCKLIST') || '')
  .split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cargar todos los users en lotes de 500 hasta agotar
    let allUsers = [];
    let skip = 0;
    const limit = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', limit, skip);
      if (!batch || batch.length === 0) break;
      allUsers = allUsers.concat(batch);
      if (batch.length < limit) break;
      skip += limit;
    }

    // Filtrar clientes (user_type = client, cliente o vacío)
    const clientUsers = allUsers.filter((u) => {
      const t = (u.user_type || '').toLowerCase();
      return t === 'client' || t === 'cliente' || t === '';
    });

    // Excluir blocklist de campaña
    const afterBlocklist = clientUsers.filter(
      (u) => !CAMPAIGN_BLOCKLIST.includes((u.email || '').toLowerCase())
    );

    // Excluir quienes ya tienen el tag
    const effective = afterBlocklist.filter((u) => {
      const tags = Array.isArray(u.tags) ? u.tags : [];
      return !tags.includes(CAMPAIGN_TAG);
    });

    // Devolver solo los campos necesarios (sin datos sensibles extra)
    const audience = effective.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name || '',
      user_type: u.user_type || '',
      tags: u.tags || [],
    }));

    return Response.json({ audience, total: audience.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});