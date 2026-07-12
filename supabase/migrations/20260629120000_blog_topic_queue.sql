-- blog_topic_queue: cola de temas pendientes para el autoposter semanal.
-- El cron /api/cron/weekly-post coge el siguiente 'nuevo' y lo marca 'usado'
-- al insertar el post.

CREATE TABLE IF NOT EXISTS blog_topic_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pista del tema (usada como entrada para Anthropic, NO como título final).
    title_hint text NOT NULL,
    -- Ángulo / enfoque editorial.
    angle text,
    -- Categoría del post resultante: autonomos | clientes | legal_fiscal | herramientas | actualidad
    category text NOT NULL DEFAULT 'autonomos',
    -- Audiencia objetivo (libre — opcional).
    audience text DEFAULT 'autonomos',

    -- Pipeline: nuevo → usado | descartado
    status text NOT NULL DEFAULT 'nuevo'
        CHECK (status IN ('nuevo','usado','descartado')),

    -- Cuando se usa, qué post se generó (FK soft).
    used_at timestamptz,
    used_post_id text,

    -- Orden estable: el más antiguo primero.
    priority integer NOT NULL DEFAULT 0,

    created_date timestamptz NOT NULL DEFAULT now(),
    updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_topic_queue_title_uq ON blog_topic_queue (lower(title_hint));
CREATE INDEX IF NOT EXISTS blog_topic_queue_status_idx ON blog_topic_queue (status, created_date);

-- Trigger updated_date
CREATE OR REPLACE FUNCTION blog_topic_queue_set_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_topic_queue_updated ON blog_topic_queue;
CREATE TRIGGER blog_topic_queue_updated
    BEFORE UPDATE ON blog_topic_queue
    FOR EACH ROW EXECUTE FUNCTION blog_topic_queue_set_updated();

-- RLS: solo service_role escribe; admin autenticado lee (para inspeccionar).
ALTER TABLE blog_topic_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blog_topic_queue_service_role_all ON blog_topic_queue;
CREATE POLICY blog_topic_queue_service_role_all ON blog_topic_queue
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS blog_topic_queue_admin_read ON blog_topic_queue;
CREATE POLICY blog_topic_queue_admin_read ON blog_topic_queue
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role = 'admin'
        )
    );

COMMENT ON TABLE blog_topic_queue IS 'Cola de temas evergreen para el autoposter semanal.';
