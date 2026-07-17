-- ============================================================================
-- Migración: añadir 'fallido' a order_status_enum (Fase 1, FIX 3 de audit-full.md)
-- Estado: ✅ APLICADA en Supabase de producción (ejecutada manualmente en el
-- SQL Editor; confirmado por el usuario el 2026-07-17). No re-ejecutar.
--
-- Motivo: updateOrderPaymentStatus() (src/lib/db/orders.ts) pone
-- estado = 'fallido' cuando Stripe emite payment_intent.payment_failed,
-- pero ese valor no existía en el enum — el UPDATE fallaba silenciosamente.
-- Antes de FIX 3 este camino estaba dormido en el flujo de bundle único
-- (no existía fila de pedido antes del pago); con FIX 3 el pedido ya existe
-- antes de pagar, así que un pago rechazado con tarjeta lo dispara siempre.
--
-- ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de una transacción
-- explícita en versiones antiguas de Postgres — ejecutar esta sentencia sola.
-- ============================================================================

ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'fallido' AFTER 'pagado';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
