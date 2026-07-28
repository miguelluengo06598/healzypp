-- ════════════════════════════════════════════════════════════════════════════
-- Migración 001 — Cambio de estado de pedido desde el dashboard
--
-- Idempotente: se puede ejecutar varias veces sin efecto adicional.
-- NO toca order_status_enum a propósito (ver más abajo).
--
-- ATAJO, NO FUENTE DE VERDAD. Todo lo de aquí está también en
-- database/SETUP-COMPLETO.sql (columnas en su CREATE TABLE, más la sección
-- 4.13 de reconciliación y el índice en la sección 5). Este archivo existe
-- solo para aplicar el cambio a una base YA en producción sin volver a lanzar
-- el script completo. Una instalación nueva NO lo necesita.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. "Se entrega hoy" ─────────────────────────────────────────────────────
-- No es un estado distinto de 'enviado': es el mismo estado con una fecha de
-- entrega estimada. Modelarlo como valor propio del enum obligaría a un
-- ALTER TYPE (que no puede ir dentro de una transacción en algunas versiones
-- de Postgres, ver la nota de SETUP-COMPLETO.sql) y además crearía un estado
-- del que no se sale solo: a las 00:00 dejaría de ser cierto.
--
--   Enviado          → estado='enviado', fecha_estimada_entrega = NULL
--   Se entrega hoy   → estado='enviado', fecha_estimada_entrega = CURRENT_DATE
--
-- De regalo, sirve para "llega el jueves" sin más cambios de esquema.
ALTER TABLE order_tracking
  ADD COLUMN IF NOT EXISTS fecha_estimada_entrega DATE;

COMMENT ON COLUMN order_tracking.fecha_estimada_entrega IS
  'Fecha estimada de entrega. Si coincide con hoy, la UI muestra "Se entrega hoy" en vez de "Enviado". NULL = sin estimación.';

-- ── 2. Incidencia ───────────────────────────────────────────────────────────
-- Ortogonal al estado, no un estado más. Un pedido puede estar "enviado con
-- incidencia": son dos hechos independientes.
--
-- Se descartó reutilizar el valor 'fallido' del enum porque ya significa PAGO
-- fallido — lo escribe el webhook de Stripe en payment_intent.payment_failed.
-- Mezclarlos haría indistinguible un pedido cobrado con problema logístico de
-- uno que nunca llegó a cobrarse, y falsearía cualquier informe de ingresos
-- que filtre por estado.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS incidencia TEXT;

COMMENT ON COLUMN orders.incidencia IS
  'Descripción de una incidencia logística. Ortogonal al estado: un pedido puede estar "enviado" y tener incidencia. NULL = sin incidencia. No confundir con estado=fallido, que es un pago fallido.';

-- ── 3. Índice para el historial ─────────────────────────────────────────────
-- El detalle de pedido lee el historial ordenado por fecha; sin índice es un
-- seq scan sobre toda la tabla según crezca.
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_fecha
  ON order_tracking (order_id, fecha_creacion DESC);
