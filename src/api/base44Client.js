// ============================================================================
// Adaptador Supabase con la MISMA forma que el SDK de Base44.
// Toda la app sigue usando base44.entities.X / base44.auth /
// base44.integrations.Core / base44.functions.invoke SIN cambios.
// ============================================================================
import { supabase } from './supabaseClient';

// --- mapa EntityName -> tabla Supabase --------------------------------------
const TABLE_MAP = {
  User: 'users',
  ServiceCategory: 'service_categories',
  ProfessionalProfile: 'professional_profiles',
  SubscriptionPlan: 'subscription_plans',
  Subscription: 'subscriptions',
  PaymentRecord: 'payment_records',
  Message: 'messages',
  Review: 'reviews',
  Favorite: 'favorites',
  Notification: 'notifications',
  ProfileMetrics: 'profile_metrics',
  QuoteRequest: 'quote_requests',
  SavedSearch: 'saved_searches',
  Ticket: 'tickets',
  TicketMessage: 'ticket_messages',
  TicketEvent: 'ticket_events',
  IdentityVerification: 'identity_verifications',
  CookieConsent: 'cookie_consents',
  BlogPost: 'blog_posts',
  NewsletterSubscriber: 'newsletter_subscribers',
  ReviewRequest: 'review_requests',
  FollowUpReminder: 'follow_up_reminders',
  TrialUsageLog: 'trial_usage_logs',
  ClientContact: 'client_contacts',
  Job: 'jobs',
  Invoice: 'invoices',
  InvoiceTemplate: 'invoice_templates',
  InvoicingSettings: 'invoicing_settings',
  ClientActivity: 'client_activities',
  CRMAutomation: 'crm_automations',
  AutomationExecution: 'automation_executions',
  Task: 'tasks',
  Project: 'projects',
  ProjectPhase: 'project_phases',
  ProjectTask: 'project_tasks',
  TimeLog: 'time_logs',
  Quote: 'quotes',
  Referral: 'referrals',
  AdminAlert: 'admin_alerts',
  AdsBriefing: 'ads_briefings',
  ClientInsights: 'client_insights',
  PlanAuditLog: 'plan_audit_logs',
  RedirectLog: 'redirect_logs',
  EmailLog: 'email_logs',
  ResendEvent: 'resend_events',
  OutboundLead: 'outbound_leads',
  FreeMonthGrant: 'free_month_grants',
};

const fallbackTable = (name) =>
  name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() + 's';
const tableFor = (name) => TABLE_MAP[name] || fallbackTable(name);

// --- id estilo Base44 (24 hex) ----------------------------------------------
function genId() {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const bytes = new Uint8Array(8);
  (globalThis.crypto || crypto).getRandomValues(bytes);
  let rand = '';
  for (const b of bytes) rand += b.toString(16).padStart(2, '0');
  return (ts + rand).slice(0, 24);
}

// --- ordenacion estilo Base44 ('-campo' = desc) -----------------------------
function applySort(query, sort) {
  if (!sort) return query;
  const list = Array.isArray(sort) ? sort : [sort];
  for (const s of list) {
    if (!s) continue;
    const desc = s.startsWith('-');
    const col = desc ? s.slice(1) : s;
    query = query.order(col, { ascending: !desc });
  }
  return query;
}

// --- filtro estilo Base44 (igualdad + operadores basicos) -------------------
function applyWhere(query, where) {
  for (const [key, val] of Object.entries(where || {})) {
    if (val === undefined) continue;
    if (val === null) { query = query.is(key, null); continue; }
    if (Array.isArray(val)) { query = query.in(key, val); continue; }
    if (typeof val === 'object') {
      if ('$gt' in val) query = query.gt(key, val.$gt);
      if ('$gte' in val) query = query.gte(key, val.$gte);
      if ('$lt' in val) query = query.lt(key, val.$lt);
      if ('$lte' in val) query = query.lte(key, val.$lte);
      if ('$ne' in val) query = query.neq(key, val.$ne);
      if ('$in' in val) query = query.in(key, val.$in);
      if ('$contains' in val) query = query.contains(key, val.$contains);
      if ('$ilike' in val) query = query.ilike(key, val.$ilike);
      continue;
    }
    query = query.eq(key, val);
  }
  return query;
}

// --- API de una entidad (misma forma que base44.entities.X) -----------------
function makeEntity(name) {
  const table = tableFor(name);
  return {
    _table: table,
    async list(sort = '-created_date', limit) {
      let q = supabase.from(table).select('*');
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    async filter(where = {}, sort, limit) {
      let q = supabase.from(table).select('*');
      q = applyWhere(q, where);
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    // `devolverFila: false` para cuando quien escribe NO puede leer lo que
    // acaba de escribir. Pasa de verdad: un visitante sin sesión puede abrir
    // un ticket desde /contacto, pero la política de lectura —con razón— no
    // le deja ver los tickets. Como `.select()` hace que PostgREST devuelva
    // la fila, el INSERT entero se rechazaba con un 401 que parecía de
    // permisos de escritura y era de lectura. Media tarde para encontrarlo.
    async create(values = {}, { devolverFila = true } = {}) {
      const row = { id: values.id || genId(), ...values };
      if (!devolverFila) {
        const { error } = await supabase.from(table).insert(row);
        if (error) throw error;
        return row;
      }
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    async bulkCreate(items = []) {
      const rows = (items || []).map((v) => ({ id: v.id || genId(), ...v }));
      const { data, error } = await supabase.from(table).insert(rows).select();
      if (error) throw error;
      return data || [];
    },
    async update(id, values = {}) {
      const patch = { ...values, updated_date: new Date().toISOString() };
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    // Realtime estilo Base44: cb({ type:'create'|'update'|'delete', data }) -> devuelve unsubscribe
    subscribe(callback) {
      const typeMap = { INSERT: 'create', UPDATE: 'update', DELETE: 'delete' };
      const channel = supabase
        .channel(`rt-${table}-${genId()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          const type = typeMap[payload.eventType] || String(payload.eventType || '').toLowerCase();
          const data = (payload.new && Object.keys(payload.new).length) ? payload.new : payload.old;
          try { callback({ type, data }); } catch (_e) { /* noop */ }
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch (_e) { /* noop */ } };
    },
  };
}

// Proxy: base44.entities.CualquierNombre funciona sin enumerarlas
const entities = new Proxy({}, {
  get(_t, prop) {
    if (typeof prop !== 'string') return undefined;
    return makeEntity(prop);
  },
});

// --- AUTH (misma forma que base44.auth) -------------------------------------
const usersApi = makeEntity('User');

async function currentAppUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: row } = await supabase.from('users').select('*').eq('auth_user_id', user.id).maybeSingle();

  if (!row) {
    const { data: byEmail } = await supabase.from('users').select('*').eq('email', user.email).maybeSingle();
    row = byEmail || null;
    if (row && !row.auth_user_id) {
      await supabase.from('users').update({ auth_user_id: user.id }).eq('id', row.id);
      row.auth_user_id = user.id;
    }
  }

  if (!row) {
    const insert = {
      id: genId(),
      auth_user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      role: 'user',
      is_verified: true,
    };
    const { data: created, error } = await supabase.from('users').insert(insert).select().single();
    if (error) throw error;
    row = created;
  }

  if (row) row._app_role = row.role;
  return row;
}

const auth = {
  // El identificador de la SESIÓN, que no siempre es `users.id`.
  //
  // Las cuentas heredadas de Base44 llevan un `users.id` de 24 hexadecimales y
  // su uuid de sesión aparte, en `auth_user_id`; las nuevas tienen los dos
  // iguales. Las reglas de `storage.objects` comparan contra `auth.uid()`, así
  // que lo que decide la carpeta donde se puede escribir es ESTE valor y no el
  // otro. Pedirlo a la sesión en vez de deducirlo de una fila evita el fallo
  // silencioso de escribir en la carpeta de otro.
  async uid() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  },
  async me() {
    const u = await currentAppUser();
    if (!u) throw new Error('Not authenticated');
    return u;
  },
  // Lleva al usuario a la pantalla de login propia (NO dispara OAuth de Google).
  // El proveedor (Google) solo se activa si el usuario pulsa el botón en /login.
  login(callbackUrl) { return this.redirectToLogin(callbackUrl); },
  loginWithRedirect(callbackUrl) { return this.redirectToLogin(callbackUrl); },
  redirectToLogin(callbackUrl) {
    if (typeof window === 'undefined') return;
    const next = callbackUrl && typeof callbackUrl === 'string' ? callbackUrl : window.location.href;
    const url = `/login?next=${encodeURIComponent(next)}`;
    if (window.location.pathname !== '/login') window.location.href = url;
  },
  // Inicio de sesión con Google: SOLO se invoca explícitamente desde el botón
  // "Continuar con Google" en la pantalla de login.
  async loginWithGoogle(callbackUrl) {
    const redirectTo = (typeof window !== 'undefined' && (callbackUrl || window.location.origin)) || undefined;
    return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  },
  async logout(callbackUrl) {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') window.location.href = callbackUrl || '/';
  },
  // metodos de coleccion (los usa el admin)
  async list(sort, limit) { return usersApi.list(sort, limit); },
  async filter(where, sort, limit) { return usersApi.filter(where, sort, limit); },
  async get(id) { return usersApi.get(id); },
  async create(values) { return usersApi.create(values); },
  async update(id, values) { return usersApi.update(id, values); },
  async updateMyUserData(values) {
    const u = await currentAppUser();
    if (!u) throw new Error('Not authenticated');
    return usersApi.update(u.id, values);
  },
  // Alias compatible con el SDK original de Base44. Toda la app llama
  // base44.auth.updateMe({ user_type, ... }) — sin esto fallaba el upgrade
  // de cliente a profesional, la actualización de avatar, notificaciones,
  // etc., porque tiraba TypeError dentro de un try/catch silencioso.
  async updateMe(values) {
    const u = await currentAppUser();
    if (!u) throw new Error('Not authenticated');
    return usersApi.update(u.id, values);
  },
  onAuthStateChange(cb) { return supabase.auth.onAuthStateChange(cb); },
};

// --- FUNCTIONS (base44.functions.invoke -> Edge Function) -------------------
async function invokeFunction(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  return { data, error };
}
const functions = { invoke: invokeFunction };

// --- INTEGRATIONS.Core ------------------------------------------------------
const Core = {
  // `bucket` + `folder` existen por una razón concreta: los documentos de
  // identidad (DNI por las dos caras y selfie) se subían aquí, al bucket
  // PÚBLICO `uploads` y a su raíz, y la fila guardaba la URL pública.
  // Resultado: quince documentos de cinco personas legibles por cualquiera
  // que tuviera la dirección. Ya están movidos al bucket privado
  // `credentials`; esto es para que los siguientes no repitan el camino.
  //
  // Cuando el bucket es privado se devuelve la RUTA, no una URL: en un bucket
  // privado no hay URL pública que devolver, y quien tenga que verlo pedirá
  // una firmada con caducidad.
  async UploadFile({ file, bucket = 'uploads', folder = null } = {}) {
    if (!file) throw new Error('UploadFile: se requiere "file"');
    const safeName = (file.name || 'file').replace(/[^\w.\-]/g, '_');
    const path = folder ? `${folder}/${genId()}-${safeName}` : `${genId()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || undefined,
    });
    if (error) throw error;
    if (bucket !== 'uploads') return { file_url: path, path, bucket };
    const { data } = supabase.storage.from('uploads').getPublicUrl(path);
    return { file_url: data.publicUrl, path, bucket };
  },
  async SendEmail(payload = {}) { const { data } = await invokeFunction('sendEmail', payload); return data; },
  async SendSMS(payload = {}) { const { data } = await invokeFunction('sendSMS', payload); return data; },
  async InvokeLLM(payload = {}) { const { data } = await invokeFunction('invokeLLM', payload); return data; },
  async GenerateImage(payload = {}) { const { data } = await invokeFunction('generateImage', payload); return data; },
  async ExtractDataFromUploadedFile(payload = {}) { const { data } = await invokeFunction('extractData', payload); return data; },
};

// --- appLogs (analitica de Base44): no-op para no romper la app -------------
const appLogs = new Proxy({}, { get() { return async () => {}; } });

// --- agents (asistente IA de Base44): stubs que no rompen -------------------
// La funcionalidad real se reimplementara con una Edge Function + InvokeLLM.
const agentsBase = {
  async createConversation() { return { id: genId(), messages: [] }; },
  subscribeToConversation() { return () => {}; },
  async addMessage(conversation) { return conversation; },
};
const agents = new Proxy(agentsBase, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return async () => {};
  },
});

// --- integrations -----------------------------------------------------------
const integrations = { Core };

// --- objeto base44 final ----------------------------------------------------
export const base44 = {
  entities,
  auth,
  integrations,
  functions,
  appLogs,
  agents,
};

// asServiceRole: en Base44 saltaba la RLS con la service key. En el navegador
// NO hay service key, asi que apunta al mismo cliente (anon, con RLS). Para
// admin funciona (RLS de admin). Las operaciones anonimas que necesiten
// privilegios (p.ej. baja de newsletter sin login) se moveran a Edge Functions.
base44.asServiceRole = { entities, auth, functions, integrations };

export default base44;
