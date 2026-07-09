-- ============================================================================
-- CRON DE LIMPIEZA DE DATOS DE TRACKING (RGPD / LOPD)
-- ============================================================================
--
-- Propósito: borrar registros de tracking cuyo expires_at ha superado now().
-- Período configurado: 13 meses desde created_at (columna calculada).
--
-- PREREQUISITO: ejecutar primero database/migrations/003_tracking_retention.sql
--
-- OPCIONES DE ACTIVACIÓN (elige una):
--
--   A) pg_cron (disponible en Supabase con plan Pro o superior):
--      Ejecutar el bloque "Opción A" desde el SQL Editor.
--
--   B) Supabase Edge Function programada:
--      Crear una Edge Function que ejecute estas DELETE y programarla desde
--      el panel de Supabase (Scheduled Functions → nuevo job).
--
-- FRECUENCIA RECOMENDADA: diaria (00:30 UTC para evitar picos de tráfico)
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- OPCIÓN A: pg_cron
-- Habilitar pg_cron: Dashboard → Database → Extensions → pg_cron → Enable
-- ═══════════════════════════════════════════════════════════════════════════

-- Activar la extensión (solo necesario una vez):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar el job (se ejecuta a las 00:30 UTC cada día):
/*
SELECT cron.schedule(
  'purge-expired-tracking',   -- nombre único del job
  '30 0 * * *',               -- cron expression: 00:30 UTC diario
  $$
    DELETE FROM tracking_events        WHERE expires_at < NOW();
    DELETE FROM tracking_abandonments  WHERE expires_at < NOW();
    DELETE FROM tracking_checkouts     WHERE expires_at < NOW();
    DELETE FROM tracking_cart_actions  WHERE expires_at < NOW();
    DELETE FROM tracking_product_views WHERE expires_at < NOW();
    DELETE FROM tracking_page_views    WHERE expires_at < NOW();
    -- tracking_sessions al final: tiene FK de las tablas anteriores (ON DELETE CASCADE),
    -- pero los hijos se borran primero para evitar violar constraints temporalmente.
    DELETE FROM tracking_sessions      WHERE expires_at < NOW();
  $$
);
*/

-- Para desactivar / eliminar el job:
-- SELECT cron.unschedule('purge-expired-tracking');

-- Para verificar jobs activos:
-- SELECT * FROM cron.job;


-- ═══════════════════════════════════════════════════════════════════════════
-- OPCIÓN B: script de purga manual / Edge Function
-- Ejecutar directamente en el SQL Editor cuando sea necesario,
-- o pegar en el body de una Edge Function programada.
-- ═══════════════════════════════════════════════════════════════════════════

-- Purga manual (orden seguro respetando FK → CASCADE):
/*
DO $$
DECLARE
  deleted_events        INT;
  deleted_abandonments  INT;
  deleted_checkouts     INT;
  deleted_cart_actions  INT;
  deleted_product_views INT;
  deleted_page_views    INT;
  deleted_sessions      INT;
BEGIN
  DELETE FROM tracking_events        WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  DELETE FROM tracking_abandonments  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_abandonments = ROW_COUNT;

  DELETE FROM tracking_checkouts     WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_checkouts = ROW_COUNT;

  DELETE FROM tracking_cart_actions  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_cart_actions = ROW_COUNT;

  DELETE FROM tracking_product_views WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_product_views = ROW_COUNT;

  DELETE FROM tracking_page_views    WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_page_views = ROW_COUNT;

  DELETE FROM tracking_sessions      WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

  RAISE NOTICE 'Purga completada: % sessions, % page_views, % product_views, % cart_actions, % checkouts, % abandonments, % events eliminados.',
    deleted_sessions, deleted_page_views, deleted_product_views,
    deleted_cart_actions, deleted_checkouts, deleted_abandonments, deleted_events;
END;
$$;
*/

-- ============================================================================
-- FIN DEL SCRIPT DE LIMPIEZA
-- ============================================================================
