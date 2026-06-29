-- users: añadir campos para que respetemos las bajas de la newsletter en
-- envíos por API directa (script send-newsletter.mjs).
--
-- IMPORTANTE: no toca columnas existentes, solo añade.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_unsubscribed boolean NOT NULL DEFAULT false;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Índice para resolver rápido el token desde el endpoint /api/baja.
CREATE UNIQUE INDEX IF NOT EXISTS users_unsubscribe_token_uq ON users (unsubscribe_token);

-- Backfill: a quien ya existiera SIN unsubscribe_token (por el DEFAULT,
-- la columna se rellena con valor único en cada fila al añadirse, así
-- que normalmente no hace falta backfill explícito).
-- Si por cualquier motivo alguno queda nulo, lo poblamos:
UPDATE users SET unsubscribe_token = gen_random_uuid() WHERE unsubscribe_token IS NULL;

COMMENT ON COLUMN users.email_unsubscribed IS 'Si TRUE, NO mandar correo de marketing/newsletter. El usuario lo marca usando el link de baja del email.';
COMMENT ON COLUMN users.unsubscribe_token IS 'Token único que se incluye en cada email de newsletter para que el usuario pueda darse de baja en un clic.';
