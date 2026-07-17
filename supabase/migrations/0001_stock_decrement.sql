-- ============================================================================
-- Migración: decremento atómico de stock (Fase 1, FIX 2 de audit-full.md)
-- Estado: ✅ APLICADA en Supabase de producción (ejecutada manualmente en el
-- SQL Editor; confirmado por el usuario el 2026-07-17). No re-ejecutar.
--
-- Objetos que añade:
--   1. order_items.unidades_stock — botes reales que consume cada línea de
--      pedido (bundle.cantidad × cantidad), para que el webhook sepa cuánto
--      descontar sin tener que volver a hacer matching por nombre.
--   2. decrement_product_stock(p_product_id, p_qty) — UPDATE atómico
--      (WHERE stock >= qty) usado SOLO desde el webhook de Stripe al
--      confirmarse un pago (payment_intent.succeeded).
-- ============================================================================

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unidades_stock INTEGER CHECK (unidades_stock >= 0);

COMMENT ON COLUMN order_items.unidades_stock IS
  'Unidades reales de stock (botes) que consume esta línea — bundle.cantidad × cantidad. Usado por decrement_product_stock() al confirmarse el pago.';

CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_qty INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE products SET stock = stock - p_qty
  WHERE id = p_product_id AND stock >= p_qty;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
