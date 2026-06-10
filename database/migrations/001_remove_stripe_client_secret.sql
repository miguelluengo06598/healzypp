-- ============================================================================
-- MIGRACIÓN DE SEGURIDAD: Eliminar columna stripe_client_secret
-- Fecha: 2026-05-12
-- Razón: El client_secret de Stripe es un token temporal de un solo uso.
--        Almacenarlo en base de datos viola PCI-DSS y aumenta la superficie
--        de ataque en caso de compromiso de la base de datos.
-- ============================================================================

-- 1. Eliminar la columna stripe_client_secret de la tabla orders
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_client_secret;

-- 2. (Opcional) Limpiar registros históricos que pudieran contener residuos
--    en logs o backups. En PostgreSQL/Supabase, DROP COLUMN ya marca como nulos.
--    Asegúrate de rotar backups antiguos que contengan esta columna.

-- 3. Verificación
COMMENT ON TABLE orders IS 'Pedidos realizados en la tienda (stripe_client_secret eliminado por seguridad)';

-- ============================================================================
-- INSTRUCCIONES DE DESPLIEGUE:
--   1. Ejecutar esta migración en Supabase SQL Editor ANTES de desplegar
--      el código corregido.
--   2. Verificar que no hay código desplegado que intente insertar en esta columna.
--   3. Rotar backups antiguos si contienen datos sensibles.
-- ============================================================================
