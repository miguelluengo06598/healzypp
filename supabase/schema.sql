-- ============================================================================
-- SCHEMA COMPLETO DE LA TIENDA — Supabase SQL Editor
-- Ejecutar de arriba a abajo sin interrupciones.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. EXTENSIONES
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LIMPIEZA (comentado — descomentar solo para reset en desarrollo)
-- ════════════════════════════════════════════════════════════════════════════

-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS cart_items CASCADE;
-- DROP TABLE IF EXISTS order_tracking CASCADE;
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS coupons CASCADE;
-- DROP TABLE IF EXISTS product_variants CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS addresses CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TYPE IF EXISTS order_status_enum CASCADE;
-- DROP TYPE IF EXISTS coupon_type_enum CASCADE;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. FUNCIONES COMPARTIDAS
-- ════════════════════════════════════════════════════════════════════════════

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar si el usuario es admin (por JWT claim)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(auth.jwt()->>'role', auth.jwt()->'app_metadata'->>'role', '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generar número de pedido: ORD-YYYY-NNNNNN
-- Intenta obtener el último número del año actual para evitar duplicados.
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part     TEXT;
  sequence_part TEXT;
  last_seq      INTEGER;
  candidate     TEXT;
  exists_check  INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Buscar el último número de secuencia usado este año
  SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_pedido, '^ORD-[0-9]{4}-', ''), '')), '0')::INTEGER
  INTO last_seq
  FROM orders
  WHERE numero_pedido LIKE 'ORD-' || year_part || '-%';

  -- Intentar hasta 10 veces por si hay race condition
  FOR i IN 1..10 LOOP
    sequence_part := LPAD((last_seq + i)::TEXT, 6, '0');
    candidate     := 'ORD-' || year_part || '-' || sequence_part;

    SELECT COUNT(*) INTO exists_check FROM orders WHERE numero_pedido = candidate;
    IF exists_check = 0 THEN
      RETURN candidate;
    END IF;
  END LOOP;

  -- Fallback: usar timestamp + random (extremadamente improbable)
  RETURN 'ORD-' || year_part || '-' || LPAD(floor(extract(epoch from NOW()))::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Crear perfil automáticamente al registrarse un usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  first_name TEXT;
  last_name TEXT;
BEGIN
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Intentar separar nombre y apellidos si hay un espacio
  IF position(' ' IN full_name) > 0 THEN
    first_name := split_part(full_name, ' ', 1);
    last_name  := substr(full_name, position(' ' IN full_name) + 1);
  ELSE
    first_name := full_name;
    last_name  := NULL;
  END IF;

  INSERT INTO public.profiles (id, nombre, apellidos, email)
  VALUES (NEW.id, first_name, last_name, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decremento atómico de stock — solo debe llamarse al confirmarse un pago
-- (webhook de Stripe, payment_intent.succeeded), nunca al crear el PaymentIntent.
-- WHERE stock >= p_qty hace que el UPDATE sea atómico contra race conditions:
-- si dos pagos concurrentes agotan el stock, solo uno consigue decrementar.
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_qty INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE products SET stock = stock - p_qty
  WHERE id = p_product_id AND stock >= p_qty;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Garantizar solo una dirección por defecto por usuario
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND is_default = true
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. ENUMS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TYPE order_status_enum AS ENUM (
  'pendiente',
  'pagado',
  'fallido',
  'procesando',
  'enviado',
  'entregado',
  'cancelado',
  'reembolsado'
);

CREATE TYPE coupon_type_enum AS ENUM (
  'porcentaje',
  'fijo',
  'envio_gratis'
);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. TABLAS
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.1 profiles (extiende auth.users)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre          VARCHAR(100),
  apellidos       VARCHAR(100),
  email           VARCHAR(255),
  telefono        VARCHAR(50),
  avatar_url      TEXT,
  fecha_creacion  TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Perfiles de usuario vinculados a auth.users';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.2 addresses (direcciones del usuario)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE addresses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255) NOT NULL,
  calle           TEXT NOT NULL,
  numero          VARCHAR(20),
  piso            VARCHAR(20),
  ciudad          VARCHAR(100) NOT NULL,
  provincia       VARCHAR(100) NOT NULL,
  codigo_postal   VARCHAR(20) NOT NULL,
  pais            VARCHAR(100) DEFAULT 'España',
  telefono        VARCHAR(50),
  is_default      BOOLEAN DEFAULT false,
  fecha_creacion  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE addresses IS 'Direcciones de envío de los usuarios';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.3 products
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) UNIQUE NOT NULL,
  descripcion       TEXT,
  descripcion_corta TEXT,
  precio            DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
  precio_original   DECIMAL(10, 2) CHECK (precio_original >= 0),
  imagenes          JSONB DEFAULT '[]',
  categoria         VARCHAR(100),
  tags              JSONB DEFAULT '[]',
  stock             INTEGER DEFAULT 0 CHECK (stock >= 0),
  activo            BOOLEAN DEFAULT true,
  proveedor_id      VARCHAR(100),
  proveedor_sku     VARCHAR(100),
  peso_gramos       INTEGER DEFAULT 0 CHECK (peso_gramos >= 0),
  meta_title        VARCHAR(255),
  meta_description  TEXT,
  fecha_creacion    TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Catálogo de productos de la tienda';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.4 product_variants
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE product_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  nombre        VARCHAR(255) NOT NULL,
  opciones      JSONB DEFAULT '{}',
  precio_extra  DECIMAL(10, 2) DEFAULT 0.00 CHECK (precio_extra >= 0),
  stock         INTEGER DEFAULT 0 CHECK (stock >= 0),
  sku           VARCHAR(100),
  activo        BOOLEAN DEFAULT true
);

COMMENT ON TABLE product_variants IS 'Variantes de productos (talla, color, etc.)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.5 bundles
-- Fuente de verdad del precio para los endpoints de PaymentIntent — tabla
-- real de producción, documentada aquí para que el schema versionado en git
-- coincida con la base de datos real (no se ejecuta contra Supabase, ya
-- existe en producción).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE bundles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  nombre             VARCHAR(255) NOT NULL,
  cantidad           INTEGER NOT NULL CHECK (cantidad > 0),
  precio             DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
  precio_original    DECIMAL(10, 2) CHECK (precio_original >= 0),
  ahorro             DECIMAL(10, 2) CHECK (ahorro >= 0),
  porcentaje_dto     INTEGER CHECK (porcentaje_dto >= 0 AND porcentaje_dto <= 100),
  precio_por_unidad  DECIMAL(10, 2) CHECK (precio_por_unidad >= 0),
  es_popular         BOOLEAN DEFAULT false,
  activo             BOOLEAN DEFAULT true,
  orden              INTEGER DEFAULT 0,
  fecha_creacion     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bundles IS 'Bundles/packs de un producto (p.ej. 1/2/3 botes) — fuente de verdad del precio cobrado en Stripe';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.6 coupons
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE coupons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo              VARCHAR(50) UNIQUE NOT NULL,
  tipo                coupon_type_enum NOT NULL,
  valor               DECIMAL(10, 2) NOT NULL CHECK (valor >= 0),
  minimo_pedido       DECIMAL(10, 2) DEFAULT 0.00 CHECK (minimo_pedido >= 0),
  maximo_descuento    DECIMAL(10, 2) CHECK (maximo_descuento >= 0),
  usos_totales        INTEGER DEFAULT NULL,
  usos_por_usuario    INTEGER DEFAULT NULL,
  usos_actuales       INTEGER DEFAULT 0 CHECK (usos_actuales >= 0),
  fecha_inicio        TIMESTAMPTZ,
  fecha_fin           TIMESTAMPTZ,
  activo              BOOLEAN DEFAULT true,
  fecha_creacion      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE coupons IS 'Cupones de descuento';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.7 orders
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido           VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_order_number(),
  user_id                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email_cliente           VARCHAR(255),
  nombre_cliente          VARCHAR(255),
  telefono_cliente        VARCHAR(50),
  estado                  order_status_enum DEFAULT 'pendiente',
  subtotal                DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  descuento               DECIMAL(10, 2) DEFAULT 0.00 CHECK (descuento >= 0),
  gastos_envio            DECIMAL(10, 2) DEFAULT 0.00 CHECK (gastos_envio >= 0),
  total                   DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  metodo_pago             VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  cupon_id                UUID REFERENCES coupons(id) ON DELETE SET NULL,
  direccion_envio         JSONB DEFAULT '{}',
  notas_cliente           TEXT,
  fecha_creacion          TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Pedidos realizados en la tienda';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.8 order_items
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id        UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  nombre_producto   VARCHAR(255) NOT NULL,
  imagen_producto   TEXT,
  cantidad          INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario   DECIMAL(10, 2) NOT NULL CHECK (precio_unitario >= 0),
  precio_total      DECIMAL(10, 2) NOT NULL CHECK (precio_total >= 0),
  unidades_stock    INTEGER CHECK (unidades_stock >= 0)
);

COMMENT ON TABLE order_items IS 'Líneas de cada pedido';
COMMENT ON COLUMN order_items.unidades_stock IS 'Unidades reales de stock (botes) que consume esta línea — bundle.cantidad × cantidad. Usado por decrement_product_stock() al confirmarse el pago.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.9 order_tracking
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE order_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  estado          order_status_enum NOT NULL,
  descripcion     TEXT,
  numero_tracking VARCHAR(100),
  empresa_envio   VARCHAR(100),
  fecha_creacion  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE order_tracking IS 'Historial de estados de un pedido';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.10 cart_items
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE cart_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  cantidad          INTEGER NOT NULL CHECK (cantidad > 0),
  fecha_creacion    TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))
);

COMMENT ON TABLE cart_items IS 'Carrito persistente en base de datos';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.11 reviews
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pedido_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
  puntuacion      INTEGER NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
  titulo          VARCHAR(255),
  comentario      TEXT,
  verificado      BOOLEAN DEFAULT false,
  aprobado        BOOLEAN DEFAULT false,
  fecha_creacion  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

COMMENT ON TABLE reviews IS 'Valoraciones de productos por usuarios';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════

-- profiles
CREATE INDEX idx_profiles_email ON profiles(email);

-- addresses
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_default ON addresses(user_id) WHERE is_default = true;

-- products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_activo ON products(activo);
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_fecha_creacion ON products(fecha_creacion DESC);

-- product_variants
CREATE INDEX idx_variants_product_id ON product_variants(product_id);

-- coupons
CREATE INDEX idx_coupons_codigo ON coupons(codigo);
CREATE INDEX idx_coupons_activo ON coupons(activo);

-- orders
CREATE INDEX idx_orders_numero ON orders(numero_pedido);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_estado ON orders(estado);
CREATE INDEX idx_orders_fecha_creacion ON orders(fecha_creacion DESC);
CREATE INDEX idx_orders_stripe_pi ON orders(stripe_payment_intent_id);

-- order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- order_tracking
CREATE INDEX idx_tracking_order_id ON order_tracking(order_id);

-- cart_items
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- reviews
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_aprobado ON reviews(aprobado);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════

-- updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON cart_items FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Crear perfil tras registro en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Solo una dirección por defecto por usuario
CREATE TRIGGER trg_addresses_single_default
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_address();

-- ════════════════════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());

-- addresses
CREATE POLICY "addresses_select_own" ON addresses
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "addresses_insert_own" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "addresses_update_own" ON addresses
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "addresses_delete_own" ON addresses
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- products (lectura pública, escritura admin)
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (activo = true OR is_admin());
CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (is_admin());
CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (is_admin());

-- product_variants (lectura pública si producto activo, escritura admin)
CREATE POLICY "variants_select_public" ON product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.activo = true)
    OR is_admin()
  );
CREATE POLICY "variants_insert_admin" ON product_variants
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "variants_update_admin" ON product_variants
  FOR UPDATE USING (is_admin());
CREATE POLICY "variants_delete_admin" ON product_variants
  FOR DELETE USING (is_admin());

-- coupons (lectura pública de activos, escritura admin)
CREATE POLICY "coupons_select_public" ON coupons
  FOR SELECT USING (activo = true OR is_admin());
CREATE POLICY "coupons_insert_admin" ON coupons
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "coupons_update_admin" ON coupons
  FOR UPDATE USING (is_admin());
CREATE POLICY "coupons_delete_admin" ON coupons
  FOR DELETE USING (is_admin());

-- orders (lectura propia, escritura admin/service_role)
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "orders_insert_service" ON orders
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (is_admin());

-- order_items (lectura a través de pedidos propios)
CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );
CREATE POLICY "order_items_insert_service" ON order_items
  FOR INSERT WITH CHECK (is_admin());

-- order_tracking (lectura propia)
CREATE POLICY "order_tracking_select_own" ON order_tracking
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_tracking.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );
CREATE POLICY "order_tracking_insert_admin" ON order_tracking
  FOR INSERT WITH CHECK (is_admin());

-- cart_items (solo propio)
CREATE POLICY "cart_items_select_own" ON cart_items
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "cart_items_insert_own" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "cart_items_update_own" ON cart_items
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "cart_items_delete_own" ON cart_items
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- reviews (lectura pública de aprobadas, escritura propia/admin)
CREATE POLICY "reviews_select_public" ON reviews
  FOR SELECT USING (aprobado = true OR auth.uid() = user_id OR is_admin());
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "reviews_update_admin" ON reviews
  FOR UPDATE USING (is_admin());
CREATE POLICY "reviews_delete_admin" ON reviews
  FOR DELETE USING (is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- 9. DATOS DE PRUEBA
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO products (
  nombre, slug, descripcion, descripcion_corta,
  precio, precio_original, imagenes, categoria, tags,
  stock, activo, proveedor_id, proveedor_sku,
  peso_gramos, meta_title, meta_description
) VALUES (
  'Gominolas de Vinagre de Manzana',
  'gominolas-vinagre-manzana',
  'Gominolas naturales elaboradas con vinagre de manzana orgánico. Mejoran la digestión, controlan el apetito y aportan energía. 60 unidades por bote. Aptas para veganos y sin gluten.',
  '60 gominolas de vinagre de manzana orgánico. Digestión + energía.',
  29.99,
  39.99,
  '["/images/pic1.png", "/images/pic10.png", "/images/pic11.png"]',
  'Suplementos',
  '["vegano", "sin gluten", "digestión", "energía", "vinagre de manzana"]',
  500,
  true,
  'SUPP-001',
  'SKU-GVM-001',
  250,
  'Gominolas de Vinagre de Manzana | Natural y Vegano',
  'Compra gominolas de vinagre de manzana orgánico. Mejora tu digestión de forma natural. Envío gratis.'
);

-- Variantes del producto (ejemplo: packs)
INSERT INTO product_variants (product_id, nombre, opciones, precio_extra, stock, sku, activo)
SELECT
  id,
  'Pack 1 Bote',
  '{"pack": "1 bote"}'::jsonb,
  0.00,
  200,
  'GVM-1B',
  true
FROM products WHERE slug = 'gominolas-vinagre-manzana';

INSERT INTO product_variants (product_id, nombre, opciones, precio_extra, stock, sku, activo)
SELECT
  id,
  'Pack 2 Botes',
  '{"pack": "2 botes"}'::jsonb,
  14.99,
  150,
  'GVM-2B',
  true
FROM products WHERE slug = 'gominolas-vinagre-manzana';

INSERT INTO product_variants (product_id, nombre, opciones, precio_extra, stock, sku, activo)
SELECT
  id,
  'Pack 3 Botes',
  '{"pack": "3 botes"}'::jsonb,
  29.98,
  100,
  'GVM-3B',
  true
FROM products WHERE slug = 'gominolas-vinagre-manzana';

-- Cupones de ejemplo
INSERT INTO coupons (codigo, tipo, valor, minimo_pedido, maximo_descuento, usos_totales, usos_por_usuario, fecha_inicio, fecha_fin, activo) VALUES
  ('BIENVENIDO10', 'porcentaje', 10.00, 30.00, 10.00, 1000, 1, NOW(), NOW() + INTERVAL '90 days', true),
  ('ENVIO gratis', 'envio_gratis', 0.00, 50.00, NULL, 500, 1, NOW(), NOW() + INTERVAL '30 days', true),
  ('5EUROS', 'fijo', 5.00, 25.00, 5.00, NULL, NULL, NOW(), NOW() + INTERVAL '60 days', true);

-- Nota: los pedidos, items y reviews requieren un usuario autenticado.
-- Ejemplo de inserción manual (después de crear un usuario en Auth):
--
-- INSERT INTO addresses (user_id, nombre_completo, calle, numero, ciudad, provincia, codigo_postal, is_default)
-- VALUES (
--   'UUID_DEL_USUARIO',
--   'María López',
--   'Calle Mayor',
--   '12',
--   'Madrid',
--   'Madrid',
--   '28001',
--   true
-- );
--
-- INSERT INTO orders (user_id, email_cliente, nombre_cliente, telefono_cliente, estado, subtotal, descuento, gastos_envio, total, metodo_pago, direccion_envio)
-- VALUES (
--   'UUID_DEL_USUARIO',
--   'maria@example.com',
--   'María López',
--   '+34600123456',
--   'pagado',
--   29.99,
--   0.00,
--   0.00,
--   29.99,
--   'CARD',
--   '{"calle":"Calle Mayor","numero":"12","ciudad":"Madrid","provincia":"Madrid","cp":"28001"}'::jsonb
-- );
--
-- INSERT INTO order_items (order_id, product_id, nombre_producto, cantidad, precio_unitario, precio_total)
-- SELECT o.id, p.id, p.nombre, 1, p.precio, p.precio
-- FROM orders o, products p
-- WHERE o.email_cliente = 'maria@example.com' AND p.slug = 'gominolas-vinagre-manzana';

-- ════════════════════════════════════════════════════════════════════════════
-- 10. NOTAS DE CONFIGURACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- Para convertir a un usuario en administrador, ejecuta en el SQL Editor
-- (reemplaza 'UUID_DEL_USUARIO' por el UUID real del usuario):
--
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
-- WHERE id = 'UUID_DEL_USUARIO';

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
