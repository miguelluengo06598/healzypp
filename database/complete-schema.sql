-- ============================================================================
-- SCHEMA COMPLETO HEALZYP — Supabase SQL Editor
-- BD nueva y vacía. Ejecutar de arriba a abajo sin interrupciones.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. EXTENSIONES
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════════
-- 2. FUNCIONES Y TRIGGERS COMPARTIDOS
-- ════════════════════════════════════════════════════════════════════════════

-- Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Impedir modificación de order_number una vez creado
CREATE OR REPLACE FUNCTION prevent_order_number_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.order_number IS DISTINCT FROM NEW.order_number THEN
    RAISE EXCEPTION 'order_number is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generador de números de pedido: ORD-YYYY-NNNNNN
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part     TEXT;
  sequence_part TEXT;
  order_count   INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO order_count
  FROM orders
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  sequence_part := LPAD(order_count::TEXT, 6, '0');
  RETURN 'ORD-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. ENUMS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TYPE payment_method_enum AS ENUM ('COD', 'CARD');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE order_status_enum AS ENUM (
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
);
CREATE TYPE cart_action_enum AS ENUM ('add', 'remove', 'update');
CREATE TYPE device_type_enum AS ENUM ('mobile', 'desktop', 'tablet', 'unknown');

-- ════════════════════════════════════════════════════════════════════════════
-- 4. TABLAS
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.0 audit_log (primera porque la función de auditoría la referencia)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT NOT NULL,
  record_id     TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data      JSONB,
  new_data      JSONB,
  performed_by  TEXT,
  performed_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Registro de cambios en tablas críticas';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.1 products
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255)    NOT NULL,
  description   TEXT,
  price         DECIMAL(10, 2)  NOT NULL CHECK (price >= 0),
  discount      INTEGER         DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  rating        DECIMAL(3, 2)   DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  stock         INTEGER         DEFAULT 100 CHECK (stock >= 0),
  active        BOOLEAN         DEFAULT true,
  image_url     TEXT            NOT NULL,
  gallery_urls  TEXT[],
  slug          VARCHAR(255)    UNIQUE NOT NULL,
  meta_title    VARCHAR(255),
  meta_description TEXT,
  category_id   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Catálogo de productos';
COMMENT ON COLUMN products.slug IS 'Identificador URL único del producto';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.2 categories
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)    NOT NULL,
  slug          VARCHAR(100)    UNIQUE NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Categorías de productos';

ALTER TABLE products
  ADD CONSTRAINT fk_products_categories
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.3 bundles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE bundles (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name          VARCHAR(100)    NOT NULL,
  quantity      INTEGER         NOT NULL CHECK (quantity > 0),
  price         DECIMAL(10, 2)  NOT NULL CHECK (price >= 0),
  discount      INTEGER         DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  popular       BOOLEAN         DEFAULT false,
  active        BOOLEAN         DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bundles IS 'Packs de compra disponibles para cada producto';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.4 customers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE customers (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(255)    NOT NULL,
  phone         VARCHAR(50)     NOT NULL,
  email         VARCHAR(255)    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  address       TEXT            NOT NULL,
  postal_code   VARCHAR(20)     NOT NULL,
  city          VARCHAR(100)    NOT NULL,
  province      VARCHAR(100)    NOT NULL,
  country       VARCHAR(100)    DEFAULT 'España',
  total_orders  INTEGER         DEFAULT 0 CHECK (total_orders >= 0),
  total_spent   DECIMAL(10, 2)  DEFAULT 0.00 CHECK (total_spent >= 0),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Compradores registrados. Se crea automáticamente al hacer un pedido';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.5 orders
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              VARCHAR(50)     UNIQUE NOT NULL,
  customer_id               INTEGER         REFERENCES customers(id),

  -- Datos de envío (denormalizados para historial inmutable)
  shipping_name             VARCHAR(255)    NOT NULL,
  shipping_email            VARCHAR(255)    CHECK (shipping_email IS NULL OR shipping_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  shipping_phone            VARCHAR(50)     NOT NULL,
  shipping_address          TEXT            NOT NULL,
  shipping_postal           VARCHAR(20)     NOT NULL,
  shipping_city             VARCHAR(100)    NOT NULL,
  shipping_province         VARCHAR(100)    NOT NULL,
  shipping_country          VARCHAR(100)    DEFAULT 'España',

  -- Precios
  subtotal                  DECIMAL(10, 2)  NOT NULL CHECK (subtotal >= 0),
  shipping_cost             DECIMAL(10, 2)  DEFAULT 0.00 CHECK (shipping_cost >= 0),
  discount_cents            INTEGER         DEFAULT 0 CHECK (discount_cents >= 0),
  total                     DECIMAL(10, 2)  NOT NULL CHECK (total >= 0),

  -- Pago
  payment_method            payment_method_enum NOT NULL,
  payment_status            payment_status_enum DEFAULT 'PENDING',
  paid_at                   TIMESTAMPTZ,

  -- Stripe
  stripe_payment_intent_id  VARCHAR(255)    UNIQUE,

  -- Estado
  status                    order_status_enum DEFAULT 'PENDING',

  -- Notas
  customer_notes            TEXT,
  admin_notes               TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ
);

COMMENT ON TABLE orders IS 'Pedidos realizados en la tienda';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'ID del PaymentIntent de Stripe para pagos con tarjeta';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.6 order_items
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id            SERIAL PRIMARY KEY,
  order_id      UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER         REFERENCES products(id),
  product_title VARCHAR(255)    NOT NULL,
  bundle_id     INTEGER         REFERENCES bundles(id),
  bundle_name   VARCHAR(100)    NOT NULL,
  quantity      INTEGER         NOT NULL CHECK (quantity > 0),
  unit_price    DECIMAL(10, 2)  NOT NULL CHECK (unit_price >= 0),
  discount      DECIMAL(10, 2)  DEFAULT 0.00 CHECK (discount >= 0),
  subtotal      DECIMAL(10, 2)  NOT NULL CHECK (subtotal >= 0),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE order_items IS 'Líneas de producto de cada pedido';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.7 reviews
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE reviews (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER         REFERENCES products(id) ON DELETE CASCADE,
  order_id      UUID            REFERENCES orders(id),
  customer_name VARCHAR(255)    NOT NULL,
  rating        INTEGER         NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  verified      BOOLEAN         DEFAULT false,
  visible       BOOLEAN         DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reviews IS 'Reseñas de clientes';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.8 contact_messages
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contact_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255)    NOT NULL,
  email         VARCHAR(255)    NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  message       TEXT            NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contact_messages IS 'Mensajes enviados desde el formulario de contacto';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.9 tracking_sessions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID,
  fingerprint       VARCHAR(64),
  device_type       device_type_enum DEFAULT 'unknown',
  device_info       JSONB DEFAULT '{}',
  country           VARCHAR(2),
  region            VARCHAR(100),
  city              VARCHAR(100),
  referrer          TEXT,
  landing_page      TEXT NOT NULL,
  utm_source        VARCHAR(255),
  utm_medium        VARCHAR(255),
  utm_campaign      VARCHAR(255),
  utm_content       VARCHAR(255),
  utm_term          VARCHAR(255),
  consent_given     BOOLEAN DEFAULT false,
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tracking_sessions IS 'Sesiones de usuario para analytics';
COMMENT ON COLUMN tracking_sessions.fingerprint IS 'Hash anonimizado del navegador, NO la IP raw';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.10 tracking_events (eventos de comportamiento en página de producto + fallback)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  event_type            VARCHAR(50) NOT NULL
    CHECK (event_type IN (
      'page_enter',
      'page_exit',
      'section_view',
      'scroll_depth',
      'time_on_page',
      'add_to_cart',
      'initiate_checkout'
    )),
  section_name          VARCHAR(50)
    CHECK (section_name IS NULL OR section_name IN (
      'hero', 'descripcion', 'ingredientes', 'beneficios',
      'testimonios', 'faq', 'precio', 'footer'
    )),
  scroll_percentage     INTEGER
    CHECK (scroll_percentage IS NULL OR (scroll_percentage >= 0 AND scroll_percentage <= 100)),
  time_on_page_seconds  INTEGER CHECK (time_on_page_seconds IS NULL OR time_on_page_seconds >= 0),
  last_section_seen     VARCHAR(50),
  product_id            INTEGER,
  product_slug          VARCHAR(255),
  metadata              JSONB DEFAULT '{}',
  payload               JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tracking_events IS 'Eventos de comportamiento en página de producto y fallback de tracking general';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.11 tracking_page_views
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_page_views (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  path              TEXT NOT NULL,
  title             TEXT,
  duration_seconds  INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.12 tracking_product_views
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_product_views (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_slug      VARCHAR(255) NOT NULL,
  duration_seconds  INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.13 tracking_cart_actions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_cart_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bundle_id   INTEGER REFERENCES bundles(id) ON DELETE SET NULL,
  action      cart_action_enum NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_price  DECIMAL(10, 2),
  cart_total  DECIMAL(10, 2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.14 tracking_checkouts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_checkouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  step          VARCHAR(50) DEFAULT 'init',
  cart_total    DECIMAL(10, 2),
  items_count   INTEGER DEFAULT 0 CHECK (items_count >= 0),
  completed     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.15 tracking_conversions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number    VARCHAR(50),
  total_amount    DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  items_count     INTEGER NOT NULL CHECK (items_count >= 0),
  payment_method  VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.16 tracking_abandonments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_abandonments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  reason        VARCHAR(50) DEFAULT 'unknown',
  last_page     TEXT NOT NULL,
  cart_value    DECIMAL(10, 2) DEFAULT 0 CHECK (cart_value >= 0),
  items_in_cart INTEGER DEFAULT 0 CHECK (items_in_cart >= 0),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.17 meta_pixel_events
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE meta_pixel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      TEXT UNIQUE NOT NULL,
  event_name    TEXT NOT NULL,
  pixel_id      TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  capi_response JSONB
);

COMMENT ON TABLE meta_pixel_events IS 'Auditoría de eventos enviados a Meta Conversions API. No contiene PII sin hash.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.18 rate_limit_store
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE rate_limit_store (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rate_limit_store IS 'Segunda capa de rate limiting a nivel de base de datos';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════

-- products / categories
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_categories_slug ON categories(slug);

-- bundles
CREATE INDEX idx_bundles_product ON bundles(product_id);

-- customers
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

-- orders
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_stripe_pi ON orders(stripe_payment_intent_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- order_items
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- reviews
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_visible ON reviews(visible);

-- contact_messages
CREATE INDEX idx_contact_messages_email ON contact_messages(email);
CREATE INDEX idx_contact_messages_created ON contact_messages(created_at DESC);

-- tracking_sessions
CREATE INDEX idx_tracking_sessions_user ON tracking_sessions(user_id);
CREATE INDEX idx_tracking_sessions_created ON tracking_sessions(created_at DESC);
CREATE INDEX idx_tracking_sessions_fingerprint ON tracking_sessions(fingerprint);

-- tracking_events
CREATE INDEX idx_tracking_events_session ON tracking_events(session_id);
CREATE INDEX idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX idx_tracking_events_created ON tracking_events(created_at DESC);

-- tracking tablas detalladas
CREATE INDEX idx_tracking_page_views_session ON tracking_page_views(session_id);
CREATE INDEX idx_tracking_page_views_created ON tracking_page_views(created_at DESC);
CREATE INDEX idx_tracking_product_views_session ON tracking_product_views(session_id);
CREATE INDEX idx_tracking_product_views_product ON tracking_product_views(product_id);
CREATE INDEX idx_tracking_cart_actions_session ON tracking_cart_actions(session_id);
CREATE INDEX idx_tracking_cart_actions_product ON tracking_cart_actions(product_id);
CREATE INDEX idx_tracking_checkouts_session ON tracking_checkouts(session_id);
CREATE INDEX idx_tracking_conversions_session ON tracking_conversions(session_id);
CREATE INDEX idx_tracking_abandonments_session ON tracking_abandonments(session_id);

-- meta_pixel_events
CREATE INDEX idx_meta_pixel_events_event_id ON meta_pixel_events(event_id);
CREATE INDEX idx_meta_pixel_events_event_name ON meta_pixel_events(event_name);
CREATE INDEX idx_meta_pixel_events_sent_at ON meta_pixel_events(sent_at DESC);

-- audit_log
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_audit_log_performed_at ON audit_log(performed_at DESC);

-- rate_limit_store
CREATE INDEX idx_rate_limit_key ON rate_limit_store(key);
CREATE INDEX idx_rate_limit_window ON rate_limit_store(window_start);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_page_views   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_cart_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_checkouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_conversions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_abandonments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_pixel_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_store      ENABLE ROW LEVEL SECURITY;

-- products: anon solo SELECT activos
CREATE POLICY "products_anon_select" ON products
  FOR SELECT TO anon USING (active = true);

-- categories: anon solo SELECT
CREATE POLICY "categories_anon_select" ON categories
  FOR SELECT TO anon USING (true);

-- bundles: anon solo SELECT activos
CREATE POLICY "bundles_anon_select" ON bundles
  FOR SELECT TO anon USING (active = true);

-- customers: solo service_role (sin policies públicas)

-- orders: anon puede INSERT, nunca SELECT ni modificar
CREATE POLICY "orders_anon_insert" ON orders
  FOR INSERT TO anon WITH CHECK (true);

-- order_items: anon puede INSERT
CREATE POLICY "order_items_anon_insert" ON order_items
  FOR INSERT TO anon WITH CHECK (true);

-- reviews: anon solo SELECT visibles
CREATE POLICY "reviews_anon_select" ON reviews
  FOR SELECT TO anon USING (visible = true);

-- contact_messages: anon solo INSERT
CREATE POLICY "contact_messages_anon_insert" ON contact_messages
  FOR INSERT TO anon WITH CHECK (true);

-- tracking_sessions: anon INSERT, solo service_role SELECT
CREATE POLICY "tracking_sessions_anon_insert" ON tracking_sessions
  FOR INSERT TO anon WITH CHECK (true);

-- tracking_events: anon INSERT, solo service_role SELECT
CREATE POLICY "tracking_events_anon_insert" ON tracking_events
  FOR INSERT TO anon WITH CHECK (true);

-- tracking_page_views: anon INSERT
CREATE POLICY "tracking_page_views_anon_insert" ON tracking_page_views
  FOR INSERT TO anon WITH CHECK (true);

-- tracking_product_views: anon INSERT
CREATE POLICY "tracking_product_views_anon_insert" ON tracking_product_views
  FOR INSERT TO anon WITH CHECK (true);

-- tracking_cart_actions: anon INSERT
CREATE POLICY "tracking_cart_actions_anon_insert" ON tracking_cart_actions
  FOR INSERT TO anon WITH CHECK (true);

-- tracking_checkouts: anon INSERT
CREATE POLICY "tracking_checkouts_anon_insert" ON tracking_checkouts
  FOR INSERT TO anon WITH CHECK (true);

-- tracking_conversions: anon INSERT
CREATE POLICY "tracking_conversions_anon_insert" ON tracking_conversions
  FOR INSERT TO anon WITH CHECK (true);

-- tracking_abandonments: anon INSERT
CREATE POLICY "tracking_abandonments_anon_insert" ON tracking_abandonments
  FOR INSERT TO anon WITH CHECK (true);

-- meta_pixel_events, audit_log, rate_limit_store: solo service_role (sin policies públicas)

-- ════════════════════════════════════════════════════════════════════════════
-- 7. FUNCIONES DE NEGOCIO
-- ════════════════════════════════════════════════════════════════════════════

-- Lectura segura de pedido por número (para página de confirmación)
CREATE OR REPLACE FUNCTION get_order_by_number(p_order_number TEXT)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM orders WHERE order_number = p_order_number;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. AUDITORÍA Y TRIGGERS ADICIONALES
-- ════════════════════════════════════════════════════════════════════════════

-- Función de auditoría genérica (audit_log ya existe)
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, performed_by)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::TEXT, NEW.order_number), 'INSERT', to_jsonb(NEW), current_user);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::TEXT, NEW.order_number), 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, performed_by)
    VALUES (TG_TABLE_NAME, COALESCE(OLD.id::TEXT, OLD.order_number), 'DELETE', to_jsonb(OLD), current_user);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de updated_at
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bundles_updated_at
  BEFORE UPDATE ON bundles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger inmutable order_number
CREATE TRIGGER trg_orders_immutable_number
  BEFORE UPDATE ON orders FOR EACH ROW
  EXECUTE FUNCTION prevent_order_number_update();

-- Triggers de auditoría para orders y contact_messages
CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER trg_contact_messages_audit
  AFTER INSERT OR UPDATE OR DELETE ON contact_messages FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- ════════════════════════════════════════════════════════════════════════════
-- 9. VISTAS ANALÍTICAS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW analytics_live_sessions AS
SELECT
  COUNT(DISTINCT s.id) AS active_sessions,
  COUNT(DISTINCT s.user_id) AS authenticated_users,
  COUNT(DISTINCT CASE WHEN s.device_type = 'mobile' THEN s.id END) AS mobile_sessions,
  COUNT(DISTINCT CASE WHEN s.device_type = 'desktop' THEN s.id END) AS desktop_sessions
FROM tracking_sessions s
WHERE s.created_at > NOW() - INTERVAL '5 minutes'
  AND (s.ended_at IS NULL OR s.ended_at > NOW() - INTERVAL '5 minutes');

CREATE OR REPLACE VIEW analytics_live_page_views AS
SELECT
  pv.path,
  COUNT(*) AS view_count,
  MAX(pv.created_at) AS last_view
FROM tracking_page_views pv
WHERE pv.created_at > NOW() - INTERVAL '5 minutes'
GROUP BY pv.path
ORDER BY view_count DESC;

CREATE OR REPLACE VIEW analytics_top_products_today AS
SELECT
  pv.product_id,
  pv.product_slug,
  COUNT(*) AS view_count,
  AVG(pv.duration_seconds) AS avg_duration
FROM tracking_product_views pv
WHERE pv.created_at > CURRENT_DATE
GROUP BY pv.product_id, pv.product_slug
ORDER BY view_count DESC;

CREATE OR REPLACE VIEW analytics_funnel_today AS
SELECT
  (SELECT COUNT(*) FROM tracking_sessions WHERE created_at > CURRENT_DATE) AS sessions,
  (SELECT COUNT(DISTINCT session_id) FROM tracking_product_views WHERE created_at > CURRENT_DATE) AS product_views,
  (SELECT COUNT(DISTINCT session_id) FROM tracking_cart_actions WHERE action = 'add' AND created_at > CURRENT_DATE) AS add_to_carts,
  (SELECT COUNT(DISTINCT session_id) FROM tracking_checkouts WHERE created_at > CURRENT_DATE) AS checkouts,
  (SELECT COUNT(*) FROM tracking_conversions WHERE created_at > CURRENT_DATE) AS conversions;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. DATOS INICIALES (SEED)
-- ════════════════════════════════════════════════════════════════════════════

-- Producto principal
INSERT INTO products (
  title, description, price, discount, rating, stock,
  image_url, gallery_urls, slug, meta_title, meta_description
) VALUES (
  'Gominolas de vinagre de manzana',
  'Gominolas naturales de vinagre de manzana orgánico. Mejora tu digestión, controla el apetito y aumenta tu energía de forma natural. 60 gominolas por bote (suministro para 30 días). Aptas para veganos, sin gluten.',
  14.00,
  10,
  4.8,
  500,
  '/images/pic1.png',
  ARRAY['/images/pic1.png', '/images/pic10.png', '/images/pic11.png'],
  'gominolas-vinagre-manzana',
  'Gominolas de Vinagre de Manzana | Mejora tu Digestión Naturalmente',
  'Gominolas naturales con vinagre de manzana orgánico. 60 gominolas por bote. Vegano, sin gluten. Envío gratis a toda España.'
);

-- Bundles (asociados al producto id=1)
INSERT INTO bundles (product_id, name, quantity, price, discount, popular, active) VALUES
  (1, '1 Bote',  1, 29.99,  0, false, true),
  (1, '2 Botes', 2, 44.99, 25, true,  true),
  (1, '3 Botes', 3, 59.99, 33, false, true);

-- Reseñas verificadas (30 reseñas)
INSERT INTO reviews (product_id, customer_name, rating, comment, verified, visible, created_at) VALUES
  (1, 'Carmen López',      5, 'Llevo 3 semanas tomándolas y noto mucha menos hinchazón después de comer. Al principio era escéptica pero funcionan de verdad.',                           true, true, '2024-03-15'),
  (1, 'Javier M.',         4, 'Están bien, el sabor no es malo aunque tampoco increíble. Lo importante es que sí noto mejoría en la digestión.',                                         true, true, '2024-03-12'),
  (1, 'María Fernández',   5, 'Mi madre me las recomendó y ahora las tomo cada mañana. He notado que tengo más energía y menos antojos de dulce a media tarde.',                        true, true, '2024-03-10'),
  (1, 'Alberto S.',        3, 'No me han hecho milagros pero tampoco están mal. Quizá necesite más tiempo para ver resultados claros.',                                                  true, true, '2024-03-08'),
  (1, 'Laura Jiménez',     5, 'Las compré por el tema de controlar el apetito y funcionan bastante bien. Ya voy por mi segundo bote.',                                                   true, true, '2024-03-05'),
  (1, 'Pedro García',      4, 'El envío llegó rápido. Las gominolas tienen buen sabor, parecen chuches normales jaja. Aún es pronto para ver resultados grandes.',                       true, true, '2024-03-03'),
  (1, 'Ana Ruiz',          5, 'Desde que las tomo he mejorado mucho las digestiones pesadas. Antes me sentía fatal después de comer y ahora mucho mejor.',                              true, true, '2024-03-01'),
  (1, 'Carlos Martín',     5, 'Mi mujer y yo las tomamos juntos. A ella le van genial para la hinchazón, a mí me ayudan con el tema de controlar lo que como.',                         true, true, '2024-02-28'),
  (1, 'Isabel V.',         4, 'Buen producto, el precio está bien si pillas el pack de 2. El sabor es agradable, nada ácido como pensaba.',                                              true, true, '2024-02-26'),
  (1, 'Diego Sánchez',     5, 'Llevo un mes tomándolas y he notado cambios. Me siento menos pesado después de las comidas y con más ganas de moverme.',                                 true, true, '2024-02-24'),
  (1, 'Rocío Morales',     5, 'Las vi en Instagram y me animé a probarlas. La verdad es que sí funcionan, sobre todo para la hinchazón abdominal.',                                     true, true, '2024-02-22'),
  (1, 'Miguel Ángel P.',   4, 'Están bien, cumplen lo que prometen. No son mágicas pero ayudan si llevas una dieta decente.',                                                            true, true, '2024-02-20'),
  (1, 'Patricia Navarro',  5, '¡Me encantan! Saben bien y funcionan. Ya he recomendado a varias amigas y todas contentas.',                                                              true, true, '2024-02-18'),
  (1, 'Raúl Torres',       5, 'Pedí el pack de 3 botes. Voy por el primero y de momento genial. Se nota en la digestión y en cómo me siento de ligero.',                                true, true, '2024-02-16'),
  (1, 'Marta Domínguez',   4, 'El envío fue rápido, contra reembolso perfecto. Las gominolas están bien, me ayudan con los gases que tenía después de comer.',                          true, true, '2024-02-14'),
  (1, 'Francisco J.',      5, 'Estoy sorprendido la verdad. No esperaba mucho pero funcionan mejor de lo que pensaba. Repetiré seguro.',                                                 true, true, '2024-02-12'),
  (1, 'Cristina Vega',     5, 'Tengo problemas digestivos desde hace años y estas gominolas me han ayudado más que muchas cosas que he probado.',                                        true, true, '2024-02-10'),
  (1, 'Andrés Romero',     4, 'Por el precio están bien. No son milagrosas pero notas que hacen algo. El sabor es agradable.',                                                           true, true, '2024-02-08'),
  (1, 'Elena Castro',      5, 'Las tomo cada mañana antes del desayuno. He perdido un poco de peso sin hacer dieta estricta, solo comiendo más consciente.',                            true, true, '2024-02-06'),
  (1, 'José Luis G.',      5, 'Mi hija me las regaló porque siempre me quejo de las digestiones. ¡Pues funcionan! Ya llevo 2 botes.',                                                   true, true, '2024-02-04'),
  (1, 'Lucía Prieto',      4, 'Están bien, aunque al principio no notaba nada. A partir de la segunda semana sí empecé a notar mejoras.',                                               true, true, '2024-02-02'),
  (1, 'Sergio Ortiz',      5, 'Buenísimas. Las uso como parte de mi rutina de salud y van genial. Nada de molestias después de comer.',                                                 true, true, '2024-01-31'),
  (1, 'Rosa María L.',     5, 'Pedí el pack de 2 y acerté. El pago contra reembolso me da más confianza. Producto totalmente recomendable.',                                            true, true, '2024-01-29'),
  (1, 'Pablo Herrera',     4, 'Las llevo tomando un mes. No he perdido peso milagrosamente pero sí me siento mejor en general.',                                                         true, true, '2024-01-27'),
  (1, 'Silvia Medina',     5, '¡Me gustan mucho! Son fáciles de tomar porque saben bien y funcionan. Ya no me siento hinchada todo el día.',                                            true, true, '2024-01-25'),
  (1, 'Manuel R.',         5, 'Compré por probar y la verdad es que repetiré. Mejoran la digestión y me ayudan a no picar entre horas.',                                                true, true, '2024-01-23'),
  (1, 'Beatriz Gil',       4, 'Buen producto. El sabor es agradable y se notan los efectos después de unas semanas. Relación calidad-precio correcta.',                                 true, true, '2024-01-21'),
  (1, 'Antonio Molina',    5, 'Las tomo desde hace 3 semanas y estoy muy contento. Digestiones mucho mejor y más energía durante el día.',                                              true, true, '2024-01-19'),
  (1, 'Nuria Santos',      5, '¡Super recomendables! Funcionan de verdad. Ya he pedido más para mi hermana que también quiere probarlas.',                                               true, true, '2024-01-17'),
  (1, 'Víctor Campos',     4, 'Están bien. No son la solución a todo pero ayudan bastante con la digestión y el control del apetito.',                                                  true, true, '2024-01-15');

-- ════════════════════════════════════════════════════════════════════════════
-- 11. VERIFICACIÓN FINAL
-- ════════════════════════════════════════════════════════════════════════════

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
