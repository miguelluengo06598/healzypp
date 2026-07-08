-- ============================================================================
-- MIGRACIÓN 002: Habilitar RLS en tablas de tracking
-- ============================================================================
--
-- CONTEXTO:
--   Todas las escrituras y lecturas de estas tablas se hacen desde API Routes
--   de Next.js usando createServiceClient() (SUPABASE_SERVICE_ROLE_KEY), que
--   bypasea RLS por completo. El anon key nunca llega a estas tablas desde el
--   código de la aplicación.
--
--   Al habilitar RLS con SELECT USING (false) bloqueamos el acceso directo
--   desde cualquier cliente que use la anon key (Dashboard, scripts externos,
--   fugas de clave), sin afectar los endpoints del servidor.
--
-- VERIFICADO en: /api/track, /api/meta/capi, /api/analytics/live
-- Todos usan createServiceClient() → service_role → RLS ignorado.
--
-- PARA APLICAR: ejecutar en el SQL Editor de Supabase (en producción o preview).
-- ============================================================================

-- ─── Habilitar RLS ───────────────────────────────────────────────────────────

ALTER TABLE tracking_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_page_views    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_cart_actions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_checkouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_conversions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_abandonments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events        ENABLE ROW LEVEL SECURITY;

-- ─── Políticas: bloquear SELECT desde anon key ───────────────────────────────
--
-- USING (false) → ninguna fila es visible para roles no privilegiados.
-- El service_role bypasea RLS, por lo que las queries del servidor no se ven afectadas.

CREATE POLICY "block_anon_select" ON tracking_sessions
  FOR SELECT USING (false);

CREATE POLICY "block_anon_select" ON tracking_page_views
  FOR SELECT USING (false);

CREATE POLICY "block_anon_select" ON tracking_product_views
  FOR SELECT USING (false);

CREATE POLICY "block_anon_select" ON tracking_cart_actions
  FOR SELECT USING (false);

CREATE POLICY "block_anon_select" ON tracking_checkouts
  FOR SELECT USING (false);

CREATE POLICY "block_anon_select" ON tracking_conversions
  FOR SELECT USING (false);

CREATE POLICY "block_anon_select" ON tracking_abandonments
  FOR SELECT USING (false);

CREATE POLICY "block_anon_select" ON tracking_events
  FOR SELECT USING (false);

-- ============================================================================
-- FIN DE LA MIGRACIÓN 002
-- ============================================================================
