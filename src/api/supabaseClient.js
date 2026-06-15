import { createClient } from '@supabase/supabase-js';

// Claves PÚBLICAS de Supabase (la anon key se publica en el cliente por diseño; el acceso lo protege RLS).
// Se usan como fallback para que el build de producción funcione aunque el entorno no tenga las VITE_*.
const FALLBACK_URL = 'https://dquxsethatxtptfviiwd.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdXhzZXRoYXR4dHB0ZnZpaXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDMxMDQsImV4cCI6MjA5MDg3OTEwNH0.YdFfgWS5NG4ErtL_AdTf-D5lmaNBuHBEAC3ZT91RIBA';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'misautonomos-auth',
  },
});

export default supabase;
