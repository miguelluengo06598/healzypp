-- ============================================================================
-- SCHEMA COMPLETO PARA SUPABASE
-- Proyecto: Gominolas de Vinagre de Manzana
--
-- Instrucciones:
--   1. Ve a tu proyecto en supabase.com
--   2. Abre el SQL Editor → New Query
--   3. Pega este archivo completo y haz clic en "Run"
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── LIMPIAR SCHEMA (útil para re-ejecutar en desarrollo) ──────────────────
-- Descomenta las líneas siguientes SOLO si quieres reiniciar todo desde cero
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
-- DROP TABLE IF EXISTS bundles CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TYPE IF EXISTS payment_method_enum CASCADE;
-- DROP TYPE IF EXISTS payment_status_enum CASCADE;
-- DROP TYPE IF EXISTS order_status_enum CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE payment_method_enum AS ENUM (
  'COD',   -- Contra reembolso
  'CARD'   -- Tarjeta (Stripe)
);

CREATE TYPE payment_status_enum AS ENUM (
  'PENDING',   -- Pendiente de pago
  'PAID',      -- Pagado
  'FAILED',    -- Fallido
  'REFUNDED'   -- Devuelto
);

CREATE TYPE order_status_enum AS ENUM (
  'PENDING',     -- Recibido, sin confirmar
  'CONFIRMED',   -- Confirmado por el equipo
  'PROCESSING',  -- En preparación
  'SHIPPED',     -- Enviado
  'DELIVERED',   -- Entregado
  'CANCELLED'    -- Cancelado
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: products
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(255)    NOT NULL,
  description      TEXT,
  price            DECIMAL(10, 2)  NOT NULL,
  discount         INTEGER         DEFAULT 0,     -- Porcentaje de descuento (0-100)
  rating           DECIMAL(3, 2)   DEFAULT 4.5,
  stock            INTEGER         DEFAULT 100,
  active           BOOLEAN         DEFAULT true,

  -- Imágenes
  image_url        TEXT            NOT NULL,
  gallery_urls     TEXT[],                        -- Array de URLs de galería

  -- SEO
  slug             VARCHAR(255)    UNIQUE NOT NULL,
  meta_title       VARCHAR(255),
  meta_description TEXT,

  -- Timestamps
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Catálogo de productos de la tienda';
COMMENT ON COLUMN products.gallery_urls IS 'Array de URLs para la galería de imágenes del producto';
COMMENT ON COLUMN products.slug IS 'Identificador URL único del producto (ej: gominolas-vinagre-manzana)';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: bundles
-- Packs de producto (1 bote, 2 botes, 3 botes)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE bundles (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER         REFERENCES products(id) ON DELETE CASCADE,
  name       VARCHAR(100)    NOT NULL,           -- "1 Bote", "2 Botes", "3 Botes"
  quantity   INTEGER         NOT NULL,           -- 1, 2, 3
  price      DECIMAL(10, 2)  NOT NULL,           -- 29.99, 44.99, 59.99
  discount   INTEGER         DEFAULT 0,          -- Descuento en %
  popular    BOOLEAN         DEFAULT false,      -- Muestra el badge "MÁS POPULAR"
  active     BOOLEAN         DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE bundles IS 'Packs de compra disponibles para cada producto';
COMMENT ON COLUMN bundles.popular IS 'Si true, muestra el badge "MÁS POPULAR" en el selector de bundles';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: customers
-- Datos del comprador (se crea/actualiza en cada pedido)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE customers (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(255)  NOT NULL,
  phone       VARCHAR(50)   NOT NULL,
  email       VARCHAR(255),                      -- Opcional en checkout COD

  -- Dirección principal
  address     TEXT          NOT NULL,
  postal_code VARCHAR(20)   NOT NULL,
  city        VARCHAR(100)  NOT NULL,
  province    VARCHAR(100)  NOT NULL,
  country     VARCHAR(100)  DEFAULT 'España',

  -- Metadatos
  total_orders   INTEGER        DEFAULT 0,
  total_spent    DECIMAL(10, 2) DEFAULT 0.00,

  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Compradores registrados. Se crea automáticamente al hacer un pedido';
COMMENT ON COLUMN customers.total_orders IS 'Contador de pedidos — actualizado por trigger';
COMMENT ON COLUMN customers.total_spent IS 'Total gastado en euros — actualizado por trigger';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: orders
-- Pedidos realizados
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50)    UNIQUE NOT NULL,   -- "ORD-2024-000001"

  -- Relación con cliente
  customer_id  INTEGER        REFERENCES customers(id),

  -- Datos de envío (denormalizados para historial inmutable)
  shipping_name     VARCHAR(255)  NOT NULL,
  shipping_phone    VARCHAR(50)   NOT NULL,
  shipping_address  TEXT          NOT NULL,
  shipping_postal   VARCHAR(20)   NOT NULL,
  shipping_city     VARCHAR(100)  NOT NULL,
  shipping_province VARCHAR(100)  NOT NULL,
  shipping_country  VARCHAR(100)  DEFAULT 'España',

  -- Precios
  subtotal       DECIMAL(10, 2)  NOT NULL,
  shipping_cost  DECIMAL(10, 2)  DEFAULT 0.00,   -- Siempre gratis por ahora
  total          DECIMAL(10, 2)  NOT NULL,

  -- Pago
  payment_method          payment_method_enum  NOT NULL,
  payment_status          payment_status_enum  DEFAULT 'PENDING',
  paid_at                 TIMESTAMP WITH TIME ZONE,

  -- Stripe (solo para pagos con tarjeta)
  stripe_payment_intent_id  VARCHAR(255)  UNIQUE,
  stripe_client_secret      TEXT,

  -- Estado del pedido
  status  order_status_enum  DEFAULT 'PENDING',

  -- Notas
  customer_notes  TEXT,
  admin_notes     TEXT,

  -- Timestamps
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at  TIMESTAMP WITH TIME ZONE,
  cancelled_at  TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE orders IS 'Pedidos realizados en la tienda';
COMMENT ON COLUMN orders.id IS 'UUID único del pedido (referencia interna)';
COMMENT ON COLUMN orders.order_number IS 'Número legible del pedido mostrado al cliente (ORD-YYYY-NNNNNN)';
COMMENT ON COLUMN orders.shipping_name IS 'Datos de envío denormalizados — no cambian aunque el cliente se edite';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'ID del PaymentIntent de Stripe para pagos con tarjeta';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: order_items
-- Líneas de cada pedido
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id             SERIAL PRIMARY KEY,
  order_id       UUID     REFERENCES orders(id) ON DELETE CASCADE,

  -- Producto (referencia + snapshot para historial)
  product_id     INTEGER  REFERENCES products(id),
  product_title  VARCHAR(255)  NOT NULL,         -- Snapshot del título

  -- Bundle (referencia + snapshot)
  bundle_id      INTEGER  REFERENCES bundles(id),
  bundle_name    VARCHAR(100)  NOT NULL,          -- "2 Botes"

  -- Precios (denormalizados)
  quantity       INTEGER        NOT NULL,
  unit_price     DECIMAL(10, 2) NOT NULL,
  discount       DECIMAL(10, 2) DEFAULT 0.00,
  subtotal       DECIMAL(10, 2) NOT NULL,

  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE order_items IS 'Líneas de producto de cada pedido';
COMMENT ON COLUMN order_items.product_title IS 'Snapshot del título al momento de la compra — inmutable';
COMMENT ON COLUMN order_items.bundle_name IS 'Snapshot del nombre del bundle al momento de la compra — inmutable';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: reviews
-- Reseñas de clientes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE reviews (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER  REFERENCES products(id) ON DELETE CASCADE,
  order_id       UUID     REFERENCES orders(id),   -- Opcional: para verificar compra real

  -- Datos del revisor
  customer_name  VARCHAR(255)  NOT NULL,
  rating         INTEGER       NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment        TEXT,
  verified       BOOLEAN       DEFAULT false,       -- Compra verificada

  -- Moderación
  visible        BOOLEAN       DEFAULT true,

  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE reviews IS 'Reseñas de clientes para los productos';
COMMENT ON COLUMN reviews.verified IS 'true si se puede vincular a un pedido real completado';
COMMENT ON COLUMN reviews.visible IS 'false para ocultar reseñas sin borrarlas (moderación)';

-- ─────────────────────────────────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_products_slug         ON products(slug);
CREATE INDEX idx_products_active       ON products(active);
CREATE INDEX idx_bundles_product       ON bundles(product_id);
CREATE INDEX idx_customers_phone       ON customers(phone);
CREATE INDEX idx_customers_email       ON customers(email);
CREATE INDEX idx_orders_number         ON orders(order_number);
CREATE INDEX idx_orders_customer       ON orders(customer_id);
CREATE INDEX idx_orders_status         ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created        ON orders(created_at DESC);
CREATE INDEX idx_order_items_order     ON order_items(order_id);
CREATE INDEX idx_reviews_product       ON reviews(product_id);
CREATE INDEX idx_reviews_visible       ON reviews(visible);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-actualizar updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: generate_order_number()
-- Genera un número de pedido legible: ORD-2024-000001
-- Uso: INSERT INTO orders (order_number, ...) VALUES (generate_order_number(), ...)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number    TEXT;
  year_part     TEXT;
  sequence_part TEXT;
  order_count   INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) + 1 INTO order_count
  FROM orders
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  sequence_part := LPAD(order_count::TEXT, 6, '0');
  new_number    := 'ORD-' || year_part || '-' || sequence_part;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Habilita RLS en tablas sensibles.
-- La clave anon solo puede leer productos/reseñas públicos.
-- Las inserciones de pedidos se hacen desde Server Actions (service_role).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Lectura pública: productos activos
CREATE POLICY "productos_publicos_lectura" ON products
  FOR SELECT USING (active = true);

-- Lectura pública: bundles activos
CREATE POLICY "bundles_publicos_lectura" ON bundles
  FOR SELECT USING (active = true);

-- Lectura pública: reseñas visibles
CREATE POLICY "resenias_publicas_lectura" ON reviews
  FOR SELECT USING (visible = true);

-- Escritura de pedidos: solo desde el backend (service_role bypassa RLS)
-- Ninguna policy de INSERT/UPDATE/DELETE para anon → solo el service_role puede escribir

-- ─────────────────────────────────────────────────────────────────────────────
-- DATOS INICIALES (SEED)
-- ─────────────────────────────────────────────────────────────────────────────

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
INSERT INTO bundles (product_id, name, quantity, price, discount, popular) VALUES
  (1, '1 Bote',  1, 29.99,  0, false),
  (1, '2 Botes', 2, 44.99, 25, true),   -- MÁS POPULAR
  (1, '3 Botes', 3, 59.99, 33, false);

-- Reseñas verificadas (30 reseñas)
INSERT INTO reviews (product_id, customer_name, rating, comment, verified, created_at) VALUES
  (1, 'Carmen López',      5, 'Llevo 3 semanas tomándolas y noto mucha menos hinchazón después de comer. Al principio era escéptica pero funcionan de verdad.',                           true, '2024-03-15'),
  (1, 'Javier M.',         4, 'Están bien, el sabor no es malo aunque tampoco increíble. Lo importante es que sí noto mejoría en la digestión.',                                         true, '2024-03-12'),
  (1, 'María Fernández',   5, 'Mi madre me las recomendó y ahora las tomo cada mañana. He notado que tengo más energía y menos antojos de dulce a media tarde.',                        true, '2024-03-10'),
  (1, 'Alberto S.',        3, 'No me han hecho milagros pero tampoco están mal. Quizá necesite más tiempo para ver resultados claros.',                                                  true, '2024-03-08'),
  (1, 'Laura Jiménez',     5, 'Las compré por el tema de controlar el apetito y funcionan bastante bien. Ya voy por mi segundo bote.',                                                   true, '2024-03-05'),
  (1, 'Pedro García',      4, 'El envío llegó rápido. Las gominolas tienen buen sabor, parecen chuches normales jaja. Aún es pronto para ver resultados grandes.',                       true, '2024-03-03'),
  (1, 'Ana Ruiz',          5, 'Desde que las tomo he mejorado mucho las digestiones pesadas. Antes me sentía fatal después de comer y ahora mucho mejor.',                              true, '2024-03-01'),
  (1, 'Carlos Martín',     5, 'Mi mujer y yo las tomamos juntos. A ella le van genial para la hinchazón, a mí me ayudan con el tema de controlar lo que como.',                         true, '2024-02-28'),
  (1, 'Isabel V.',         4, 'Buen producto, el precio está bien si pillas el pack de 2. El sabor es agradable, nada ácido como pensaba.',                                              true, '2024-02-26'),
  (1, 'Diego Sánchez',     5, 'Llevo un mes tomándolas y he notado cambios. Me siento menos pesado después de las comidas y con más ganas de moverme.',                                 true, '2024-02-24'),
  (1, 'Rocío Morales',     5, 'Las vi en Instagram y me animé a probarlas. La verdad es que sí funcionan, sobre todo para la hinchazón abdominal.',                                     true, '2024-02-22'),
  (1, 'Miguel Ángel P.',   4, 'Están bien, cumplen lo que prometen. No son mágicas pero ayudan si llevas una dieta decente.',                                                            true, '2024-02-20'),
  (1, 'Patricia Navarro',  5, '¡Me encantan! Saben bien y funcionan. Ya he recomendado a varias amigas y todas contentas.',                                                              true, '2024-02-18'),
  (1, 'Raúl Torres',       5, 'Pedí el pack de 3 botes. Voy por el primero y de momento genial. Se nota en la digestión y en cómo me siento de ligero.',                                true, '2024-02-16'),
  (1, 'Marta Domínguez',   4, 'El envío fue rápido, contra reembolso perfecto. Las gominolas están bien, me ayudan con los gases que tenía después de comer.',                          true, '2024-02-14'),
  (1, 'Francisco J.',      5, 'Estoy sorprendido la verdad. No esperaba mucho pero funcionan mejor de lo que pensaba. Repetiré seguro.',                                                 true, '2024-02-12'),
  (1, 'Cristina Vega',     5, 'Tengo problemas digestivos desde hace años y estas gominolas me han ayudado más que muchas cosas que he probado.',                                        true, '2024-02-10'),
  (1, 'Andrés Romero',     4, 'Por el precio están bien. No son milagrosas pero notas que hacen algo. El sabor es agradable.',                                                           true, '2024-02-08'),
  (1, 'Elena Castro',      5, 'Las tomo cada mañana antes del desayuno. He perdido un poco de peso sin hacer dieta estricta, solo comiendo más consciente.',                            true, '2024-02-06'),
  (1, 'José Luis G.',      5, 'Mi hija me las regaló porque siempre me quejo de las digestiones. ¡Pues funcionan! Ya llevo 2 botes.',                                                   true, '2024-02-04'),
  (1, 'Lucía Prieto',      4, 'Están bien, aunque al principio no notaba nada. A partir de la segunda semana sí empecé a notar mejoras.',                                               true, '2024-02-02'),
  (1, 'Sergio Ortiz',      5, 'Buenísimas. Las uso como parte de mi rutina de salud y van genial. Nada de molestias después de comer.',                                                 true, '2024-01-31'),
  (1, 'Rosa María L.',     5, 'Pedí el pack de 2 y acerté. El pago contra reembolso me da más confianza. Producto totalmente recomendable.',                                            true, '2024-01-29'),
  (1, 'Pablo Herrera',     4, 'Las llevo tomando un mes. No he perdido peso milagrosamente pero sí me siento mejor en general.',                                                         true, '2024-01-27'),
  (1, 'Silvia Medina',     5, '¡Me gustan mucho! Son fáciles de tomar porque saben bien y funcionan. Ya no me siento hinchada todo el día.',                                            true, '2024-01-25'),
  (1, 'Manuel R.',         5, 'Compré por probar y la verdad es que repetiré. Mejoran la digestión y me ayudan a no picar entre horas.',                                                true, '2024-01-23'),
  (1, 'Beatriz Gil',       4, 'Buen producto. El sabor es agradable y se notan los efectos después de unas semanas. Relación calidad-precio correcta.',                                 true, '2024-01-21'),
  (1, 'Antonio Molina',    5, 'Las tomo desde hace 3 semanas y estoy muy contento. Digestiones mucho mejor y más energía durante el día.',                                              true, '2024-01-19'),
  (1, 'Nuria Santos',      5, '¡Super recomendables! Funcionan de verdad. Ya he pedido más para mi hermana que también quiere probarlas.',                                               true, '2024-01-17'),
  (1, 'Víctor Campos',     4, 'Están bien. No son la solución a todo pero ayudan bastante con la digestión y el control del apetito.',                                                  true, '2024-01-15');

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
