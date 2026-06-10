-- ============================================================================
-- SCHEMA: Meta Pixel Events (CAPI Auditoría)
-- Propósito: auditoría y deduplicación de eventos enviados a Meta CAPI
-- ============================================================================

CREATE TABLE IF NOT EXISTS meta_pixel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,        -- UUID de deduplicación (browser + CAPI)
  event_name TEXT NOT NULL,             -- PageView, ViewContent, AddToCart, etc.
  pixel_id TEXT NOT NULL,               -- ID del pixel de Meta
  payload JSONB NOT NULL DEFAULT '{}',  -- custom_data del evento (sin PII)
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  capi_response JSONB                   -- respuesta de Graph API para debug
);

-- Índices para consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_meta_pixel_events_event_id ON meta_pixel_events(event_id);
CREATE INDEX IF NOT EXISTS idx_meta_pixel_events_event_name ON meta_pixel_events(event_name);
CREATE INDEX IF NOT EXISTS idx_meta_pixel_events_sent_at ON meta_pixel_events(sent_at DESC);

-- RLS: solo service_role puede leer/escribir (las inserciones vienen desde API Routes)
ALTER TABLE meta_pixel_events ENABLE ROW LEVEL SECURITY;

-- No creamos políticas de lectura pública → solo service_role puede acceder
COMMENT ON TABLE meta_pixel_events IS 'Auditoría de eventos enviados a Meta Conversions API. No contiene PII sin hash.';

-- ============================================================================
-- FIN SCHEMA META PIXEL
-- ============================================================================
