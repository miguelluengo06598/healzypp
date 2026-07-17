-- ============================================================================
-- Migración: insert atómico de order_items + order_tracking (Fase 3, FIX 4
-- de audit-full.md)
-- Estado: ⏸ PROPUESTA, NO aplicada en Supabase (a diferencia de 0001 y 0002,
-- que sí están aplicadas). El código actual NO la usa — ver
-- docs/propuesta-migracion-0003-order-items-tracking.md antes de decidir.
--
-- Motivo: al paralelizar los inserts de createOrder() con Promise.all, un
-- fallo de red en el insert de order_items (excepción, no {error} devuelto)
-- podía dejar una fila de order_tracking huérfana sin su order_item
-- correspondiente — createOrder() devolvía success:false pero el registro
-- ya había quedado escrito. Reproducido con test en verify-fix4-race.js
-- antes de esta migración. insert_order_item_and_tracking() hace ambos
-- inserts en la misma transacción de función plpgsql: o entran los dos o
-- ninguno.
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_order_item_and_tracking(
  p_order_id UUID,
  p_product_id UUID,
  p_nombre_producto TEXT,
  p_cantidad INTEGER,
  p_precio_unitario NUMERIC,
  p_precio_total NUMERIC,
  p_unidades_stock INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO order_items (order_id, product_id, nombre_producto, cantidad, precio_unitario, precio_total, unidades_stock)
  VALUES (p_order_id, p_product_id, p_nombre_producto, p_cantidad, p_precio_unitario, p_precio_total, p_unidades_stock);

  INSERT INTO order_tracking (order_id, estado, descripcion)
  VALUES (p_order_id, 'pendiente', 'Pedido creado, esperando confirmación de pago');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
