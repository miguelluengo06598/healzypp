-- ============================================================================
-- SCHEMA DE TRACKING Y ANALYTICS PARA ECOMMERCE
-- Supabase (PostgreSQL) — Generado para Next.js + TypeScript
-- ============================================================================

-- Extensiones ya habilitadas en schema.sql principal
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

CREATE TYPE cart_action_enum AS ENUM ('add', 'remove', 'update');
CREATE TYPE device_type_enum AS ENUM ('mobile', 'desktop', 'tablet', 'unknown');

-- ─── TABLA: tracking_sessions ───────────────────────────────────────────────
-- Una sesión agrupa toda la actividad de un visitante
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID,                         -- Supabase Auth user_id (null si es anónimo)
  fingerprint     VARCHAR(64),                  -- Hash ligero del navegador (no IP)
  device_type     device_type_enum DEFAULT 'unknown',
  device_info     JSONB DEFAULT '{}',           -- { os, browser, screen }
  country         VARCHAR(2),                   -- Código ISO (ES, MX, etc.) desde GeoIP
  region          VARCHAR(100),
  city            VARCHAR(100),
  referrer        TEXT,                         -- URL de procedencia
  landing_page    TEXT NOT NULL,                -- Primera página visitada
  utm_source      VARCHAR(255),
  utm_medium      VARCHAR(255),
  utm_campaign    VARCHAR(255),
  utm_content     VARCHAR(255),
  utm_term        VARCHAR(255),
  consent_given   BOOLEAN DEFAULT false,        -- GDPR / LOPD
  ended_at        TIMESTAMP WITH TIME ZONE,     -- Cuando se registra abandono o cierre
  duration_seconds INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE tracking_sessions IS 'Sesiones de usuario para analytics';
COMMENT ON COLUMN tracking_sessions.fingerprint IS 'Hash anonimizado del navegador, NO la IP raw';
COMMENT ON COLUMN tracking_sessions.consent_given IS 'El usuario ha aceptado cookies/analytics';

-- ─── TABLA: tracking_page_views ─────────────────────────────────────────────
-- Cada vez que un usuario carga o navega a una página
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_page_views (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  path            TEXT NOT NULL,
  title           TEXT,
  duration_seconds INTEGER DEFAULT 0,           -- Tiempo en la página antes de salir
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── TABLA: tracking_product_views ──────────────────────────────────────────
-- Cuando un usuario mira un producto (con tiempo de visualización)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_product_views (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_slug    VARCHAR(255) NOT NULL,        -- Snapshot para analytics sin JOIN
  duration_seconds INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── TABLA: tracking_cart_actions ───────────────────────────────────────────
-- Añadir, quitar o modificar cantidad en el carrito
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_cart_actions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bundle_id       INTEGER REFERENCES bundles(id) ON DELETE SET NULL,
  action          cart_action_enum NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10, 2),
  cart_total      DECIMAL(10, 2),               -- Total del carrito en ese momento
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── TABLA: tracking_checkouts ──────────────────────────────────────────────
-- Inicio del checkout
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_checkouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  step            VARCHAR(50) DEFAULT 'init',   -- init, shipping, payment, review
  cart_total      DECIMAL(10, 2),
  items_count     INTEGER DEFAULT 0,
  completed       BOOLEAN DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at    TIMESTAMP WITH TIME ZONE
);

-- ─── TABLA: tracking_conversions ────────────────────────────────────────────
-- Compra completada
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_conversions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number    VARCHAR(50),
  total_amount    DECIMAL(10, 2) NOT NULL,
  items_count     INTEGER NOT NULL,
  payment_method  VARCHAR(50),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── TABLA: tracking_abandonments ───────────────────────────────────────────
-- Cuando un usuario abandona sin comprar
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_abandonments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  reason          VARCHAR(50) DEFAULT 'unknown', -- close_tab, navigate_away, timeout, checkout_exit
  last_page       TEXT NOT NULL,
  cart_value      DECIMAL(10, 2) DEFAULT 0,
  items_in_cart   INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── TABLA: tracking_events (cola general de eventos crudos) ────────────────
-- Útil para debug y para reconstruir eventos si falla el batch
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tracking_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  event_type      VARCHAR(50) NOT NULL,         -- page_view, product_view, cart_add, etc.
  payload         JSONB DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ÍNDICES (performance crítica para analytics)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_tracking_sessions_user      ON tracking_sessions(user_id);
CREATE INDEX idx_tracking_sessions_created   ON tracking_sessions(created_at DESC);
CREATE INDEX idx_tracking_sessions_fingerprint ON tracking_sessions(fingerprint);

CREATE INDEX idx_tracking_page_views_session ON tracking_page_views(session_id);
CREATE INDEX idx_tracking_page_views_created ON tracking_page_views(created_at DESC);

CREATE INDEX idx_tracking_product_views_session ON tracking_product_views(session_id);
CREATE INDEX idx_tracking_product_views_product ON tracking_product_views(product_id);

CREATE INDEX idx_tracking_cart_actions_session ON tracking_cart_actions(session_id);
CREATE INDEX idx_tracking_cart_actions_product ON tracking_cart_actions(product_id);

CREATE INDEX idx_tracking_checkouts_session ON tracking_checkouts(session_id);
CREATE INDEX idx_tracking_conversions_session ON tracking_conversions(session_id);
CREATE INDEX idx_tracking_abandonments_session ON tracking_abandonments(session_id);
CREATE INDEX idx_tracking_events_session ON tracking_events(session_id);
CREATE INDEX idx_tracking_events_type ON tracking_events(event_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- VISTAS ÚTILES PARA EL DASHBOARD
-- ─────────────────────────────────────────────────────────────────────────────

-- Vista: sesiones activas en los últimos 5 minutos
CREATE OR REPLACE VIEW analytics_live_sessions AS
SELECT
  COUNT(DISTINCT s.id) AS active_sessions,
  COUNT(DISTINCT s.user_id) AS authenticated_users,
  COUNT(DISTINCT CASE WHEN s.device_type = 'mobile' THEN s.id END) AS mobile_sessions,
  COUNT(DISTINCT CASE WHEN s.device_type = 'desktop' THEN s.id END) AS desktop_sessions
FROM tracking_sessions s
WHERE s.created_at > NOW() - INTERVAL '5 minutes'
  AND (s.ended_at IS NULL OR s.ended_at > NOW() - INTERVAL '5 minutes');

-- Vista: páginas vistas en tiempo real (últimos 5 min)
CREATE OR REPLACE VIEW analytics_live_page_views AS
SELECT
  pv.path,
  COUNT(*) AS view_count,
  MAX(pv.created_at) AS last_view
FROM tracking_page_views pv
WHERE pv.created_at > NOW() - INTERVAL '5 minutes'
GROUP BY pv.path
ORDER BY view_count DESC;

-- Vista: productos más vistos hoy
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

-- Vista: funnel de conversión hoy
CREATE OR REPLACE VIEW analytics_funnel_today AS
SELECT
  (SELECT COUNT(*) FROM tracking_sessions WHERE created_at > CURRENT_DATE) AS sessions,
  (SELECT COUNT(DISTINCT session_id) FROM tracking_product_views WHERE created_at > CURRENT_DATE) AS product_views,
  (SELECT COUNT(DISTINCT session_id) FROM tracking_cart_actions WHERE action = 'add' AND created_at > CURRENT_DATE) AS add_to_carts,
  (SELECT COUNT(DISTINCT session_id) FROM tracking_checkouts WHERE created_at > CURRENT_DATE) AS checkouts,
  (SELECT COUNT(*) FROM tracking_conversions WHERE created_at > CURRENT_DATE) AS conversions;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: deshabilitar RLS en tablas de tracking (se escriben desde API Routes
-- con service_role, pero permitimos lectura anónima para el endpoint live)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tracking_sessions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_page_views    DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_product_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_cart_actions  DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_checkouts     DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_conversions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_abandonments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events        DISABLE ROW LEVEL SECURITY;

-- Nota: si quieres proteger lecturas, habilita RLS y crea policies:
-- ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "tracking_read_all" ON tracking_sessions FOR SELECT USING (true);

-- ============================================================================
-- FIN DEL SCHEMA DE TRACKING
-- ============================================================================
