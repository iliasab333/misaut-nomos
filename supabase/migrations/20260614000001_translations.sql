-- Tabla de caché de traducciones (Auto-Translate).
-- La Edge Function `translate` lee/escribe aquí con service-role.

create table if not exists public.translations (
  source_text     text        not null,
  target_lang     text        not null,
  translated_text text        not null,
  created_at      timestamptz not null default now(),
  primary key (target_lang, source_text)
);

create index if not exists translations_target_lang_idx
  on public.translations (target_lang);

-- RLS activado, sin policies: solo el service-role (Edge Function) accede.
alter table public.translations enable row level security;
