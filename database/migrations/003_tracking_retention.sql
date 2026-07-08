-- ============================================================================
-- MIGRACIÓN 003: Columna expires_at para retención de datos (RGPD / LOPD)
-- ============================================================================
--
-- CONTEXTO:
--   El RGPD y la LOPD exigen no conservar datos personales más tiempo del
--   necesario. 13 meses es el período estándar para analytics de comportamiento
--   (alineado con Google Analytics y las guías de la AEPD).
--
--   expires_at es nullable; los registros sin valor no se borran automáticamente
--   (útil para conservar conversiones indefinidamente si se desea).
--
-- PARA APLICAR: ejecutar en el SQL Editor de Supabase antes de activar el cron.
-- ============================================================================

-- ─── Añadir columna expires_at a todas las tablas de tracking ────────────────

ALTER TABLE tracking_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    GENERATED ALWAYS AS (created_at + INTERVAL '13 months') STORED;

ALTER TABLE tracking_page_views
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    GENERATED ALWAYS AS (created_at + INTERVAL '13 months') STORED;

ALTER TABLE tracking_product_views
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    GENERATED ALWAYS AS (created_at + INTERVAL '13 months') STORED;

ALTER TABLE tracking_cart_actions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    GENERATED ALWAYS AS (created_at + INTERVAL '13 months') STORED;

ALTER TABLE tracking_checkouts
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    GENERATED ALWAYS AS (created_at + INTERVAL '13 months') STORED;

ALTER TABLE tracking_conversions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    GENERATED ALWAYS AS (created_at + INTERVAL '13 months') STORED;

ALTER TABLE tracking_abandonments
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    GENERATED ALWAYS AS (created_at + INTERVAL '13 months') STORED;

ALTER TABLE tracking_events
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    GENERATED ALWAYS AS (created_at + INTERVAL '13 months') STORED;

-- ─── Índices para que la purga sea eficiente ─────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_expires      ON tracking_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_tracking_page_views_expires    ON tracking_page_views(expires_at);
CREATE INDEX IF NOT EXISTS idx_tracking_product_views_expires ON tracking_product_views(expires_at);
CREATE INDEX IF NOT EXISTS idx_tracking_cart_actions_expires  ON tracking_cart_actions(expires_at);
CREATE INDEX IF NOT EXISTS idx_tracking_checkouts_expires     ON tracking_checkouts(expires_at);
CREATE INDEX IF NOT EXISTS idx_tracking_conversions_expires   ON tracking_conversions(expires_at);
CREATE INDEX IF NOT EXISTS idx_tracking_abandonments_expires  ON tracking_abandonments(expires_at);
CREATE INDEX IF NOT EXISTS idx_tracking_events_expires        ON tracking_events(expires_at);

-- ============================================================================
-- FIN DE LA MIGRACIÓN 003
-- ============================================================================
