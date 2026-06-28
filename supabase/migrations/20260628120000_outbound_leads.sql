-- outbound_leads: motor de oferta — leads INTERNOS desde Google Places.
-- Regla dura: estos datos NUNCA se publican como perfiles públicos. Solo
-- sirven para outreach (invitación al alta). El perfil público existe solo
-- cuando el profesional se da de alta él mismo.

CREATE TABLE IF NOT EXISTS outbound_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identidad canónica del lead
    place_id text NOT NULL,
    business_name text NOT NULL,
    category_slug text,
    city text,

    -- Datos de contacto (solo lo mínimo para outreach)
    phone text,
    email text,
    website text,
    address text,

    -- Señales de calidad de Places
    rating real,
    user_ratings_total integer,

    -- Trazabilidad de descubrimiento
    source text NOT NULL DEFAULT 'google_places',
    discovered_at timestamptz NOT NULL DEFAULT now(),

    -- Pipeline de outreach
    status text NOT NULL DEFAULT 'nuevo'
        CHECK (status IN ('nuevo','contactado','pending_wa','respondido','convertido','descartado','opt_out')),
    contacted_at timestamptz,
    contact_channel text CHECK (contact_channel IN ('email','whatsapp_manual','whatsapp_auto','sms')),

    -- Conversión (link a profesional dado de alta)
    converted_at timestamptz,
    converted_user_id uuid,
    converted_profile_id text,

    -- Cumplimiento RGPD
    opt_out boolean NOT NULL DEFAULT false,
    opt_out_at timestamptz,
    opt_out_token text DEFAULT encode(gen_random_bytes(16), 'hex'),

    -- Operativa interna
    notes text DEFAULT '',
    last_outreach_attempts integer NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS outbound_leads_place_id_uq ON outbound_leads (place_id);
CREATE INDEX IF NOT EXISTS outbound_leads_status_discovered_idx ON outbound_leads (status, discovered_at DESC);
CREATE INDEX IF NOT EXISTS outbound_leads_city_cat_idx ON outbound_leads (city, category_slug);
CREATE INDEX IF NOT EXISTS outbound_leads_opt_out_token_idx ON outbound_leads (opt_out_token);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION outbound_leads_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outbound_leads_updated_at ON outbound_leads;
CREATE TRIGGER outbound_leads_updated_at
    BEFORE UPDATE ON outbound_leads
    FOR EACH ROW EXECUTE FUNCTION outbound_leads_set_updated_at();

-- RLS: estos datos son privados. Solo service role (server-side) y admin
-- autenticado pueden leer/escribir. Anon no tiene acceso.
ALTER TABLE outbound_leads ENABLE ROW LEVEL SECURITY;

-- Política para service_role: acceso completo (la usan seed-leads y outreach scripts).
DROP POLICY IF EXISTS outbound_leads_service_role_all ON outbound_leads;
CREATE POLICY outbound_leads_service_role_all ON outbound_leads
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Política para admin autenticado (rol 'admin' en users): lectura + update
-- desde el dashboard administrativo. NO se permite delete a admin (auditoría).
DROP POLICY IF EXISTS outbound_leads_admin_read ON outbound_leads;
CREATE POLICY outbound_leads_admin_read ON outbound_leads
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS outbound_leads_admin_update ON outbound_leads;
CREATE POLICY outbound_leads_admin_update ON outbound_leads
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Comentarios para documentación del schema
COMMENT ON TABLE outbound_leads IS 'Leads internos desde Google Places. NUNCA se publican como perfiles públicos. Solo outreach.';
COMMENT ON COLUMN outbound_leads.place_id IS 'Identificador canónico de Google Places. Único.';
COMMENT ON COLUMN outbound_leads.status IS 'Pipeline: nuevo → contactado/pending_wa → respondido → convertido | descartado | opt_out';
COMMENT ON COLUMN outbound_leads.opt_out_token IS 'Token para enlace de baja en correos/mensajes outreach.';
