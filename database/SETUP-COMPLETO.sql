-- ============================================================================
-- SETUP-COMPLETO.sql — Configuración completa de base de datos (Supabase)
-- ============================================================================
--
-- QUÉ HACE ESTE ARCHIVO
-- Consolida en un único script, idempotente, todo el esquema real usado por
-- la tienda: núcleo de e-commerce, tracking/analytics, auditoría de Meta
-- Pixel y funciones agregadas para el dashboard SaaS opcional.
--
-- CÓMO USARLO
-- 1. Crea un proyecto en supabase.com (o usa uno existente).
-- 2. Ve a SQL Editor → New query.
-- 3. Copia y pega este archivo COMPLETO.
-- 4. Ejecuta (Ctrl+Enter / Run).
-- 5. Al final verás una tabla de verificación: 22 filas, todas "✅ creada".
--    Si falta alguna, revisa el mensaje de error más arriba en el log.
-- 6. Puedes volver a ejecutar este archivo entero las veces que quieras —
--    es idempotente: no falla ni duplica nada si ya existe.
--
-- ORDEN (por dependencias, de arriba a abajo):
--   1. Extensiones
--   2. Enums
--   3. Funciones núcleo (algunas son DEFAULT de columnas de las tablas de abajo)
--   4. Tablas núcleo de la tienda (productos, pedidos, usuarios...)
--   5. Índices núcleo
--   6. Triggers núcleo
--   7. RLS + políticas núcleo
--   8. Datos de ejemplo (producto demo, cupones) — opcional, idempotente
--   9. Tablas de tracking/analytics
--  10. Índices de tracking
--  11. Vistas de analytics (auxiliares; la app consulta las tablas
--      directamente, no dependen de estas vistas)
--  12. RLS de tracking
--  13. Tabla de auditoría Meta Pixel (CAPI)
--  14. Funciones del dashboard SaaS opcional (/api/dashboard/*)
--  15. Cron de limpieza de datos de tracking (RGPD) — bloque de referencia,
--      no se auto-ejecuta, tú decides si activarlo
--  16. Verificación final
--
-- CONSOLIDACIÓN — DECISIONES TOMADAS (léelo si comparas con los .sql originales)
-- Este archivo NO es una concatenación literal de los .sql del repo. Se
-- construyó al ESTADO FINAL correcto para una instalación nueva, evitando
-- repetir el historial de migraciones que no aporta nada a un setup desde
-- cero:
--   • order_status_enum ya incluye 'fallido' desde la creación (evita el
--     ALTER TYPE ... ADD VALUE, que no puede ejecutarse dentro de una
--     transacción en algunas versiones de Postgres).
--   • order_items ya incluye unidades_stock desde la creación.
--   • tracking_sessions ya incluye store_instance_id desde la creación
--     (en el repo original esto llega en una migración posterior).
--   • Las tablas de tracking se crean YA con RLS activado y la política
--     block_anon_select (en el repo original nacen con RLS desactivado y
--     una migración posterior lo activa).
--   • Las tablas de tracking ya incluyen expires_at (retención RGPD de 13
--     meses) desde la creación — como DEFAULT (NOW() + INTERVAL '13 months'),
--     no como columna GENERATED a partir de created_at: Postgres exige que
--     la expresión de una columna GENERATED sea IMMUTABLE, y sumar un
--     intervalo con meses a un timestamptz es solo STABLE (depende de la
--     zona horaria para resolver meses/DST) — GENERATED con esa expresión
--     falla con "generation expression is not immutable" (detectado
--     ejecutando el script de verdad contra una Supabase de prueba). Con
--     DEFAULT, calculado en el momento del insert, el resultado es idéntico
--     en la práctica porque nada en el código inserta created_at a mano.
--   • dashboard_daily_visitors se crea directamente en su versión de 3
--     argumentos (con filtro por store_instance_id) — no se crea primero
--     la versión de 2 argumentos para luego reemplazarla.
--
-- EXCLUIDO A PROPÓSITO (confirmado con el usuario):
--   • database/schema.sql y database/complete-schema.sql — esquema legacy
--     en inglés (tabla customers, pago COD, IDs no-UUID) que NO coincide
--     con la base de datos real de producción. No se incluye nada de ahí.
--   • supabase/migrations/0003_order_item_and_tracking_atomic.sql —
--     propuesta NO aplicada en producción; el código actual no la usa.
--   • database/migrations/001_remove_stripe_client_secret.sql — elimina
--     una columna que no existe en el esquema real; no aporta nada a una
--     instalación nueva.
--
-- CORRECCIÓN DE TIPOS (confirmada con el usuario):
--   database/tracking-schema.sql original declara
--   tracking_product_views.product_id y tracking_cart_actions.product_id /
--   bundle_id como INTEGER. En la base de datos real de producción esas
--   columnas son UUID (verificado contra el esquema en vivo) — coincide con
--   products.id / bundles.id, que son UUID. Un INTEGER no puede tener FK a
--   una PK UUID (Postgres lo rechaza). Aquí se crean directamente como UUID.
--
-- NO INCLUIDO (opcional, requiere decisiones humanas):
--   database/cleanup-cron.sql se referencia como bloque comentado al final
--   (sección 15) — activar pg_cron o una Edge Function programada es una
--   decisión de cada instalación, no algo que deba ejecutarse solo.
--
-- AÑADIDO TRAS LA PRUEBA DE EJECUCIÓN REAL Y A PETICIÓN EXPLÍCITA (no estaba
-- en el archivo original que se revisó por texto):
--   • cart_items: la unicidad (user_id, product_id, variant_id) estaba como
--     UNIQUE de tabla con COALESCE(...) dentro — inválido en Postgres (un
--     UNIQUE de tabla solo admite columnas simples, no expresiones). Fallaba
--     con "syntax error at or near (" y abortaba TODO el script (protocolo
--     simple = una transacción implícita). Se cambió a CREATE UNIQUE INDEX
--     (sí admite expresiones). Detectado ejecutando el script de verdad.
--   • contact_messages (id, name, email, message, created_at) — tabla que
--     src/app/actions/contact.ts ya intenta usar y no existía en ningún .sql
--     incluido (ni en la Supabase real). RLS: INSERT público (el formulario
--     lo rellena cualquier visitante), SELECT solo admin.
--   • RLS en bundles (lectura pública si activo=true, escritura admin) —
--     mismo patrón que products. supabase/schema.sql (la fuente real) no
--     tenía RLS en bundles; se añade aquí como mejora explícita, no por
--     fidelidad al original.
--
-- UNIFICACIÓN DEL CATÁLOGO (precio/nombre/imágenes → código, solo stock en
-- Supabase):
--   • products, product_variants y bundles quedan DORMANTES: nombre,
--     precio, descripción, imágenes, etc. ahora viven en
--     src/data/catalog.ts (única fuente de verdad para mostrar Y cobrar).
--     Las tablas se mantienen (sin seed, sin lecturas) únicamente porque
--     order_items/cart_items/reviews/product_variants/tracking_* tienen FK
--     a products(id)/bundles(id) — reestructurar esas FKs es una migración
--     mayor, fuera de alcance aquí.
--   • product_stock (NUEVA) es la única tabla de catálogo que sigue viva:
--     guarda el stock real por `slug` (el identificador de catalog.ts, no
--     un UUID). decrement_product_stock() cambia de firma —
--     (UUID, INTEGER) sobre products → (TEXT, INTEGER) sobre product_stock
--     — con DROP FUNCTION explícito de la versión vieja para no dejar un
--     overload muerto.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- 1. EXTENSIONES
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ════════════════════════════════════════════════════════════════════════════
-- 2. ENUMS (idempotente: CREATE TYPE no admite IF NOT EXISTS, se envuelve en
--    un bloque que ignora el error si el tipo ya existe)
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE coupon_type_enum AS ENUM (
    'porcentaje',
    'fijo',
    'envio_gratis'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cart_action_enum AS ENUM ('add', 'remove', 'update');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE device_type_enum AS ENUM ('mobile', 'desktop', 'tablet', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- 3. FUNCIONES NÚCLEO
--    Van antes que las tablas porque orders.numero_pedido usa
--    generate_order_number() como DEFAULT — Postgres exige que la función
--    exista antes de crear la columna que la referencia. Las funciones
--    plpgsql pueden mencionar tablas que aún no existen en su cuerpo (solo
--    se resuelven al ejecutarse, no al crearse), así que handle_new_user()
--    puede referenciar profiles sin problema aunque profiles se cree después.
-- ════════════════════════════════════════════════════════════════════════════

-- Actualizar fecha_actualizacion automáticamente. BUG encontrado probando
-- el flujo de pedido de verdad (no en el texto): esta función escribía
-- NEW.updated_at, pero NINGUNA tabla del proyecto tiene una columna
-- llamada así — todas usan fecha_actualizacion (español). Cualquier
-- UPDATE en profiles/products/orders/cart_items fallaba con "record NEW
-- has no field updated_at" y abortaba la sentencia entera. Pre-existente
-- en el archivo original (no introducido por la unificación del
-- catálogo) — se corrige aquí porque bloqueaba la propia prueba de
-- pedido de principio a fin.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
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

  SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_pedido, '^ORD-[0-9]{4}-', ''), '')), '0')::INTEGER
  INTO last_seq
  FROM orders
  WHERE numero_pedido LIKE 'ORD-' || year_part || '-%';

  FOR i IN 1..10 LOOP
    sequence_part := LPAD((last_seq + i)::TEXT, 6, '0');
    candidate     := 'ORD-' || year_part || '-' || sequence_part;

    SELECT COUNT(*) INTO exists_check FROM orders WHERE numero_pedido = candidate;
    IF exists_check = 0 THEN
      RETURN candidate;
    END IF;
  END LOOP;

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

-- Decremento atómico de stock — llamar SOLO desde el webhook de Stripe al
-- confirmarse un pago (payment_intent.succeeded), nunca al crear el
-- PaymentIntent. Opera sobre product_stock (por slug) — desde la
-- unificación del catálogo, nombre/precio/imágenes viven en código
-- (src/data/catalog.ts); SOLO el stock, que es estado mutable real, sigue
-- en Supabase. WHERE stock >= p_qty hace el UPDATE atómico contra race
-- conditions: si dos pagos concurrentes agotan el stock, solo uno
-- decrementa. La firma cambia de (UUID, INTEGER) a (TEXT, INTEGER) — se
-- elimina explícitamente la versión antigua para no dejar un overload
-- muerto que nadie llama.
DROP FUNCTION IF EXISTS decrement_product_stock(UUID, INTEGER);
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_slug TEXT, p_qty INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE product_stock SET stock = stock - p_qty
  WHERE product_slug = p_product_slug AND stock >= p_qty;
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
-- 4. TABLAS NÚCLEO DE LA TIENDA
-- ════════════════════════════════════════════════════════════════════════════

-- 4.1 profiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
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

-- 4.2 addresses (direcciones del usuario)
CREATE TABLE IF NOT EXISTS addresses (
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

-- 4.3 products — DORMANTE desde la unificación del catálogo en código
-- (src/data/catalog.ts): nombre/precio/imágenes/etc. de un producto ya no
-- se leen de aquí para mostrar ni para cobrar. Se mantiene la tabla (vacía
-- o sin usar activamente) solo porque otras tablas (order_items,
-- cart_items, reviews, product_variants, tracking_product_views,
-- tracking_cart_actions) tienen una FK a products(id)/bundles(id) — tocar
-- eso es una migración de esquema más grande, fuera del alcance de esta
-- unificación. El identificador real de un producto ahora es su `slug`
-- (ver product_stock más abajo), no products.id.
CREATE TABLE IF NOT EXISTS products (
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

-- 4.4 product_variants
CREATE TABLE IF NOT EXISTS product_variants (
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

-- 4.5 bundles — fuente de verdad del precio para los endpoints de PaymentIntent
CREATE TABLE IF NOT EXISTS bundles (
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
COMMENT ON TABLE bundles IS 'Bundles/packs de un producto (p.ej. 1/2/3 botes) — DORMANTE, ver nota en products más arriba. El precio real vive en src/data/catalog.ts.';

-- 4.5b product_stock — NUEVA. Único dato de catálogo que sigue en Supabase:
-- el stock es estado mutable real (cambia con cada venta), no contenido
-- editorial — no puede vivir en un archivo de código estático como el
-- resto del catálogo (nombre/precio/imágenes, ver src/data/catalog.ts).
-- Clave = product_slug (el `slug` de catalog.ts), no un UUID — así el
-- código nunca necesita resolver "a qué fila de Supabase corresponde este
-- producto", solo usa el slug que ya tiene a mano.
CREATE TABLE IF NOT EXISTS product_stock (
  product_slug  TEXT PRIMARY KEY,
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);
COMMENT ON TABLE product_stock IS 'Stock real por producto (por slug de src/data/catalog.ts) — lo decrementa exclusivamente decrement_product_stock() desde el webhook de Stripe.';

-- 4.6 coupons
CREATE TABLE IF NOT EXISTS coupons (
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

-- 4.7 orders
CREATE TABLE IF NOT EXISTS orders (
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

-- 4.8 order_items (incluye unidades_stock desde el origen — ver nota de
-- consolidación al principio del archivo)
CREATE TABLE IF NOT EXISTS order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  product_slug      TEXT,
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
COMMENT ON COLUMN order_items.product_id IS 'DORMANTE (ver nota de unificación del catálogo) — siempre NULL desde que products ya no se puebla. Se mantiene la columna por compatibilidad, no la borres a mano.';
COMMENT ON COLUMN order_items.product_slug IS 'Identificador real del producto (src/data/catalog.ts) — el webhook de Stripe agrupa por esta columna para decrementar product_stock, ya que product_id ya no se rellena.';

-- 4.9 order_tracking
CREATE TABLE IF NOT EXISTS order_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  estado          order_status_enum NOT NULL,
  descripcion     TEXT,
  numero_tracking VARCHAR(100),
  empresa_envio   VARCHAR(100),
  fecha_creacion  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE order_tracking IS 'Historial de estados de un pedido';

-- 4.10 cart_items
-- La unicidad (user_id, product_id, variant_id) no puede ser un UNIQUE de
-- tabla porque COALESCE(...) es una expresión — Postgres solo admite
-- columnas simples en un UNIQUE de tabla. Se declara como índice único
-- aparte (sí admite expresiones). Este bug se detectó ejecutando el script
-- de verdad contra una Supabase de prueba: con el UNIQUE de tabla, el
-- CREATE TABLE fallaba con "syntax error at or near (" y abortaba TODO el
-- script (protocolo simple = una transacción implícita).
CREATE TABLE IF NOT EXISTS cart_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  cantidad          INTEGER NOT NULL CHECK (cantidad > 0),
  fecha_creacion    TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE cart_items IS 'Carrito persistente en base de datos';
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product_variant
  ON cart_items (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 4.11 reviews
CREATE TABLE IF NOT EXISTS reviews (
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

-- 4.12 contact_messages
-- Añadida en esta consolidación: src/app/actions/contact.ts ya inserta en
-- esta tabla, pero no existía en ninguno de los .sql incluidos (solo en el
-- esquema legacy excluido) — confirmado que tampoco existe en la Supabase
-- real (el formulario de contacto fallaba en silencio).
CREATE TABLE IF NOT EXISTS contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE contact_messages IS 'Mensajes del formulario de contacto (src/app/actions/contact.ts)';


-- ════════════════════════════════════════════════════════════════════════════
-- 5. ÍNDICES NÚCLEO
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_activo ON products(activo);
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);
CREATE INDEX IF NOT EXISTS idx_products_fecha_creacion ON products(fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_coupons_codigo ON coupons(codigo);
CREATE INDEX IF NOT EXISTS idx_coupons_activo ON coupons(activo);

CREATE INDEX IF NOT EXISTS idx_orders_numero ON orders(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_estado ON orders(estado);
CREATE INDEX IF NOT EXISTS idx_orders_fecha_creacion ON orders(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi ON orders(stripe_payment_intent_id);
-- Usada por las funciones del dashboard (sección 14) para filtrar por fecha de pago
CREATE INDEX IF NOT EXISTS idx_orders_fecha_actualizacion ON orders(fecha_actualizacion DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_tracking_order_id ON order_tracking(order_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_aprobado ON reviews(aprobado);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 6. TRIGGERS NÚCLEO (DROP IF EXISTS antes de cada CREATE — CREATE TRIGGER no
--    admite IF NOT EXISTS en todas las versiones de Postgres)
-- ════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON cart_items FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Crear perfil tras registro en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Solo una dirección por defecto por usuario
DROP TRIGGER IF EXISTS trg_addresses_single_default ON addresses;
CREATE TRIGGER trg_addresses_single_default
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_address();


-- ════════════════════════════════════════════════════════════════════════════
-- 7. RLS + POLÍTICAS NÚCLEO (DROP POLICY IF EXISTS antes de cada CREATE)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());

-- addresses
DROP POLICY IF EXISTS "addresses_select_own" ON addresses;
CREATE POLICY "addresses_select_own" ON addresses
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "addresses_insert_own" ON addresses;
CREATE POLICY "addresses_insert_own" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "addresses_update_own" ON addresses;
CREATE POLICY "addresses_update_own" ON addresses
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "addresses_delete_own" ON addresses;
CREATE POLICY "addresses_delete_own" ON addresses
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- products (lectura pública, escritura admin)
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (activo = true OR is_admin());
DROP POLICY IF EXISTS "products_insert_admin" ON products;
CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "products_delete_admin" ON products;
CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (is_admin());

-- product_variants (lectura pública si producto activo, escritura admin)
DROP POLICY IF EXISTS "variants_select_public" ON product_variants;
CREATE POLICY "variants_select_public" ON product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.activo = true)
    OR is_admin()
  );
DROP POLICY IF EXISTS "variants_insert_admin" ON product_variants;
CREATE POLICY "variants_insert_admin" ON product_variants
  FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "variants_update_admin" ON product_variants;
CREATE POLICY "variants_update_admin" ON product_variants
  FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "variants_delete_admin" ON product_variants;
CREATE POLICY "variants_delete_admin" ON product_variants
  FOR DELETE USING (is_admin());

-- bundles (lectura pública si activo, escritura admin) — mismo patrón que
-- products. supabase/schema.sql (fuente real) no tenía RLS aquí; se añade
-- ahora como mejora explícita pedida, no por fidelidad al original.
DROP POLICY IF EXISTS "bundles_select_public" ON bundles;
CREATE POLICY "bundles_select_public" ON bundles
  FOR SELECT USING (activo = true OR is_admin());
DROP POLICY IF EXISTS "bundles_insert_admin" ON bundles;
CREATE POLICY "bundles_insert_admin" ON bundles
  FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "bundles_update_admin" ON bundles;
CREATE POLICY "bundles_update_admin" ON bundles
  FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "bundles_delete_admin" ON bundles;
CREATE POLICY "bundles_delete_admin" ON bundles
  FOR DELETE USING (is_admin());

-- coupons (lectura pública de activos, escritura admin)
DROP POLICY IF EXISTS "coupons_select_public" ON coupons;
CREATE POLICY "coupons_select_public" ON coupons
  FOR SELECT USING (activo = true OR is_admin());
DROP POLICY IF EXISTS "coupons_insert_admin" ON coupons;
CREATE POLICY "coupons_insert_admin" ON coupons
  FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "coupons_update_admin" ON coupons;
CREATE POLICY "coupons_update_admin" ON coupons
  FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "coupons_delete_admin" ON coupons;
CREATE POLICY "coupons_delete_admin" ON coupons
  FOR DELETE USING (is_admin());

-- orders (lectura propia, escritura admin/service_role)
DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "orders_insert_service" ON orders;
CREATE POLICY "orders_insert_service" ON orders
  FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (is_admin());

-- order_items (lectura a través de pedidos propios)
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "order_items_insert_service" ON order_items;
CREATE POLICY "order_items_insert_service" ON order_items
  FOR INSERT WITH CHECK (is_admin());

-- order_tracking (lectura propia)
DROP POLICY IF EXISTS "order_tracking_select_own" ON order_tracking;
CREATE POLICY "order_tracking_select_own" ON order_tracking
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_tracking.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "order_tracking_insert_admin" ON order_tracking;
CREATE POLICY "order_tracking_insert_admin" ON order_tracking
  FOR INSERT WITH CHECK (is_admin());

-- cart_items (solo propio)
DROP POLICY IF EXISTS "cart_items_select_own" ON cart_items;
CREATE POLICY "cart_items_select_own" ON cart_items
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "cart_items_insert_own" ON cart_items;
CREATE POLICY "cart_items_insert_own" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "cart_items_update_own" ON cart_items;
CREATE POLICY "cart_items_update_own" ON cart_items
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "cart_items_delete_own" ON cart_items;
CREATE POLICY "cart_items_delete_own" ON cart_items
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- reviews (lectura pública de aprobadas, escritura propia/admin)
DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
CREATE POLICY "reviews_select_public" ON reviews
  FOR SELECT USING (aprobado = true OR auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "reviews_update_admin" ON reviews;
CREATE POLICY "reviews_update_admin" ON reviews
  FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "reviews_delete_admin" ON reviews;
CREATE POLICY "reviews_delete_admin" ON reviews
  FOR DELETE USING (is_admin());

-- contact_messages (INSERT público — cualquier visitante debe poder enviar
-- el formulario de contacto; SELECT solo admin)
DROP POLICY IF EXISTS "contact_messages_insert_public" ON contact_messages;
CREATE POLICY "contact_messages_insert_public" ON contact_messages
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "contact_messages_select_admin" ON contact_messages;
CREATE POLICY "contact_messages_select_admin" ON contact_messages
  FOR SELECT USING (is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- 8. DATOS DE EJEMPLO (opcional — bórralos o edítalos libremente; usan
--    ON CONFLICT DO NOTHING / comprobación WHERE NOT EXISTS para que
--    reejecutar este archivo no duplique nada)
--
--    NOTA: ya no se seedea "products"/"product_variants" — desde la
--    unificación del catálogo esas tablas están dormantes (ver nota en la
--    sección 4.3) y nada las lee. El único dato de ejemplo real que hace
--    falta es el stock del producto de catalog.ts, en product_stock.
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO product_stock (product_slug, stock)
VALUES ('gominolas-vinagre-manzana', 500)
ON CONFLICT (product_slug) DO NOTHING;

INSERT INTO coupons (codigo, tipo, valor, minimo_pedido, maximo_descuento, usos_totales, usos_por_usuario, fecha_inicio, fecha_fin, activo)
VALUES
  ('BIENVENIDO10', 'porcentaje', 10.00, 30.00, 10.00, 1000, 1, NOW(), NOW() + INTERVAL '90 days', true),
  ('ENVIOGRATIS', 'envio_gratis', 0.00, 50.00, NULL, 500, 1, NOW(), NOW() + INTERVAL '30 days', true),
  ('5EUROS', 'fijo', 5.00, 25.00, 5.00, NULL, NULL, NOW(), NOW() + INTERVAL '60 days', true)
ON CONFLICT (codigo) DO NOTHING;

-- Cómo convertir un usuario en administrador (ejecutar a mano, sustituyendo
-- el UUID real del usuario ya registrado en Supabase Auth):
--
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
-- WHERE id = 'UUID_DEL_USUARIO';


-- ════════════════════════════════════════════════════════════════════════════
-- 9. TABLAS DE TRACKING / ANALYTICS
--    A diferencia del .sql original (database/tracking-schema.sql), estas
--    tablas se crean YA con store_instance_id y expires_at incluidos (ver
--    nota de consolidación al principio del archivo). product_id/bundle_id
--    se crean como UUID (no INTEGER) para coincidir con products.id/
--    bundles.id reales — ver nota de "CORRECCIÓN DE TIPOS" arriba.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tracking_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  ended_at          TIMESTAMP WITH TIME ZONE,
  duration_seconds  INTEGER DEFAULT 0,
  store_instance_id TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '13 months')
);
COMMENT ON TABLE tracking_sessions IS 'Sesiones de usuario para analytics';
COMMENT ON COLUMN tracking_sessions.fingerprint IS 'Hash anonimizado del navegador, NO la IP raw';
COMMENT ON COLUMN tracking_sessions.consent_given IS 'El usuario ha aceptado cookies/analytics';
COMMENT ON COLUMN tracking_sessions.store_instance_id IS 'STORE_INSTANCE_ID del despliegue que creó la sesión (p.ej. UUID de conexión del dashboard SaaS) — separa tráfico de distintas instancias (local/producción) que comparten la misma Supabase. NULL en instalaciones que no usan el dashboard SaaS.';

CREATE TABLE IF NOT EXISTS tracking_page_views (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  path              TEXT NOT NULL,
  title             TEXT,
  duration_seconds  INTEGER DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '13 months')
);

CREATE TABLE IF NOT EXISTS tracking_product_views (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_slug      VARCHAR(255) NOT NULL,
  duration_seconds  INTEGER DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '13 months')
);

CREATE TABLE IF NOT EXISTS tracking_cart_actions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bundle_id         UUID REFERENCES bundles(id) ON DELETE SET NULL,
  action            cart_action_enum NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1,
  unit_price        DECIMAL(10, 2),
  cart_total        DECIMAL(10, 2),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '13 months')
);

CREATE TABLE IF NOT EXISTS tracking_checkouts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  step              VARCHAR(50) DEFAULT 'init',
  cart_total        DECIMAL(10, 2),
  items_count       INTEGER DEFAULT 0,
  completed         BOOLEAN DEFAULT false,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at      TIMESTAMP WITH TIME ZONE,
  expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '13 months')
);

CREATE TABLE IF NOT EXISTS tracking_conversions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number      VARCHAR(50),
  total_amount      DECIMAL(10, 2) NOT NULL,
  items_count       INTEGER NOT NULL,
  payment_method    VARCHAR(50),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '13 months')
);

CREATE TABLE IF NOT EXISTS tracking_abandonments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  reason            VARCHAR(50) DEFAULT 'unknown',
  last_page         TEXT NOT NULL,
  cart_value        DECIMAL(10, 2) DEFAULT 0,
  items_in_cart     INTEGER DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '13 months')
);

CREATE TABLE IF NOT EXISTS tracking_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  event_type        VARCHAR(50) NOT NULL,
  payload           JSONB DEFAULT '{}',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '13 months')
);


-- ════════════════════════════════════════════════════════════════════════════
-- 10. ÍNDICES DE TRACKING
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_user        ON tracking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_created     ON tracking_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_fingerprint ON tracking_sessions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_instance    ON tracking_sessions(store_instance_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_expires     ON tracking_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_tracking_page_views_session ON tracking_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_page_views_created ON tracking_page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_page_views_expires ON tracking_page_views(expires_at);

CREATE INDEX IF NOT EXISTS idx_tracking_product_views_session ON tracking_product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_product_views_product ON tracking_product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_tracking_product_views_expires ON tracking_product_views(expires_at);

CREATE INDEX IF NOT EXISTS idx_tracking_cart_actions_session ON tracking_cart_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_cart_actions_product ON tracking_cart_actions(product_id);
CREATE INDEX IF NOT EXISTS idx_tracking_cart_actions_expires ON tracking_cart_actions(expires_at);

CREATE INDEX IF NOT EXISTS idx_tracking_checkouts_session ON tracking_checkouts(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_checkouts_expires ON tracking_checkouts(expires_at);

CREATE INDEX IF NOT EXISTS idx_tracking_conversions_session ON tracking_conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_conversions_expires ON tracking_conversions(expires_at);

CREATE INDEX IF NOT EXISTS idx_tracking_abandonments_session ON tracking_abandonments(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_abandonments_expires ON tracking_abandonments(expires_at);

CREATE INDEX IF NOT EXISTS idx_tracking_events_session ON tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type    ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_expires ON tracking_events(expires_at);


-- ════════════════════════════════════════════════════════════════════════════
-- 11. VISTAS DE ANALYTICS (auxiliares para consultas rápidas desde el SQL
--     Editor — la app consulta las tablas directamente, no depende de estas
--     vistas)
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
-- 12. RLS DE TRACKING
--     Se activa directamente (a diferencia del .sql original, que nace con
--     RLS desactivado y lo activa en una migración posterior — ver nota de
--     consolidación). USING (false) bloquea todo SELECT con la anon key;
--     el servidor siempre usa service_role, que bypasea RLS.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE tracking_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_page_views    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_cart_actions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_checkouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_conversions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_abandonments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_anon_select" ON tracking_sessions;
CREATE POLICY "block_anon_select" ON tracking_sessions FOR SELECT USING (false);

DROP POLICY IF EXISTS "block_anon_select" ON tracking_page_views;
CREATE POLICY "block_anon_select" ON tracking_page_views FOR SELECT USING (false);

DROP POLICY IF EXISTS "block_anon_select" ON tracking_product_views;
CREATE POLICY "block_anon_select" ON tracking_product_views FOR SELECT USING (false);

DROP POLICY IF EXISTS "block_anon_select" ON tracking_cart_actions;
CREATE POLICY "block_anon_select" ON tracking_cart_actions FOR SELECT USING (false);

DROP POLICY IF EXISTS "block_anon_select" ON tracking_checkouts;
CREATE POLICY "block_anon_select" ON tracking_checkouts FOR SELECT USING (false);

DROP POLICY IF EXISTS "block_anon_select" ON tracking_conversions;
CREATE POLICY "block_anon_select" ON tracking_conversions FOR SELECT USING (false);

DROP POLICY IF EXISTS "block_anon_select" ON tracking_abandonments;
CREATE POLICY "block_anon_select" ON tracking_abandonments FOR SELECT USING (false);

DROP POLICY IF EXISTS "block_anon_select" ON tracking_events;
CREATE POLICY "block_anon_select" ON tracking_events FOR SELECT USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 13. AUDITORÍA META PIXEL (CAPI)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meta_pixel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      TEXT UNIQUE NOT NULL,
  event_name    TEXT NOT NULL,
  pixel_id      TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  capi_response JSONB
);

CREATE INDEX IF NOT EXISTS idx_meta_pixel_events_event_id   ON meta_pixel_events(event_id);
CREATE INDEX IF NOT EXISTS idx_meta_pixel_events_event_name ON meta_pixel_events(event_name);
CREATE INDEX IF NOT EXISTS idx_meta_pixel_events_sent_at    ON meta_pixel_events(sent_at DESC);

ALTER TABLE meta_pixel_events ENABLE ROW LEVEL SECURITY;
-- Sin políticas de lectura pública a propósito: solo service_role puede
-- acceder (bypasea RLS). No hay CREATE POLICY aquí porque no debe haberlo.
COMMENT ON TABLE meta_pixel_events IS 'Auditoría de eventos enviados a Meta Conversions API. No contiene PII sin hash.';


-- ════════════════════════════════════════════════════════════════════════════
-- 14. FUNCIONES DEL DASHBOARD SAAS (OPCIONAL)
--     Solo necesarias si conectas esta tienda al dashboard de analítica
--     externo vía /api/dashboard/* (DASHBOARD_API_TOKEN + STORE_INSTANCE_ID
--     en .env.local). Si no vas a usar ese dashboard, puedes omitir esta
--     sección — el resto de la tienda funciona igual sin ella.
--     dashboard_daily_visitors se crea directamente en su versión final de
--     3 argumentos (con filtro por instancia) — ver nota de consolidación.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION dashboard_daily_visitors(p_since date, p_until date, p_instance_id text)
RETURNS TABLE(day date, visitors bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    date_trunc('day', created_at)::date AS day,
    COUNT(*)::bigint AS visitors
  FROM tracking_sessions
  WHERE created_at >= p_since::timestamptz
    AND created_at < (p_until::timestamptz + INTERVAL '1 day')
    AND consent_given = true
    AND store_instance_id = p_instance_id
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION dashboard_daily_visitors(date, date, text) TO service_role;

CREATE OR REPLACE FUNCTION dashboard_orders_by_status(p_since date, p_until date)
RETURNS TABLE(estado order_status_enum, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    estado,
    COUNT(*)::bigint AS count
  FROM orders
  WHERE fecha_creacion >= p_since::timestamptz
    AND fecha_creacion < (p_until::timestamptz + INTERVAL '1 day')
  GROUP BY estado;
$$;

GRANT EXECUTE ON FUNCTION dashboard_orders_by_status(date, date) TO service_role;

CREATE OR REPLACE FUNCTION dashboard_paid_revenue(p_since date, p_until date)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(total), 0)::numeric
  FROM orders
  WHERE estado = 'pagado'
    AND fecha_actualizacion >= p_since::timestamptz
    AND fecha_actualizacion < (p_until::timestamptz + INTERVAL '1 day');
$$;

GRANT EXECUTE ON FUNCTION dashboard_paid_revenue(date, date) TO service_role;

-- product_id es NULL si el producto fue borrado tras venderse (order_items.
-- product_id ON DELETE SET NULL) — esas líneas caen en un único grupo NULL.
CREATE OR REPLACE FUNCTION dashboard_top_products(p_since date, p_until date, p_limit integer DEFAULT 10)
RETURNS TABLE(product_id uuid, nombre_producto varchar, unidades bigint, facturacion numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    oi.product_id,
    MAX(oi.nombre_producto) AS nombre_producto,
    SUM(oi.cantidad)::bigint AS unidades,
    SUM(oi.precio_total)::numeric AS facturacion
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.estado = 'pagado'
    AND o.fecha_actualizacion >= p_since::timestamptz
    AND o.fecha_actualizacion < (p_until::timestamptz + INTERVAL '1 day')
  GROUP BY oi.product_id
  ORDER BY facturacion DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION dashboard_top_products(date, date, integer) TO service_role;

CREATE OR REPLACE FUNCTION dashboard_revenue_series(p_since date, p_until date, p_period text)
RETURNS TABLE(bucket date, ingresos numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    date_trunc(p_period, fecha_actualizacion)::date AS bucket,
    SUM(total)::numeric AS ingresos
  FROM orders
  WHERE estado = 'pagado'
    AND fecha_actualizacion >= p_since::timestamptz
    AND fecha_actualizacion < (p_until::timestamptz + INTERVAL '1 day')
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION dashboard_revenue_series(date, date, text) TO service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 15. CRON DE LIMPIEZA DE TRACKING (RGPD) — BLOQUE DE REFERENCIA, NO SE
--     AUTO-EJECUTA. Activarlo es una decisión tuya (requiere pg_cron o una
--     Edge Function programada). Descomenta y ejecuta el bloque que prefieras
--     por separado cuando lo decidas.
-- ════════════════════════════════════════════════════════════════════════════

-- OPCIÓN A: pg_cron (Supabase Pro o superior)
-- Habilitar la extensión una vez: Dashboard → Database → Extensions → pg_cron
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'purge-expired-tracking',
--   '30 0 * * *',
--   $$
--     DELETE FROM tracking_events        WHERE expires_at < NOW();
--     DELETE FROM tracking_abandonments  WHERE expires_at < NOW();
--     DELETE FROM tracking_checkouts     WHERE expires_at < NOW();
--     DELETE FROM tracking_cart_actions  WHERE expires_at < NOW();
--     DELETE FROM tracking_product_views WHERE expires_at < NOW();
--     DELETE FROM tracking_page_views    WHERE expires_at < NOW();
--     DELETE FROM tracking_sessions      WHERE expires_at < NOW();
--   $$
-- );
--
-- Para desactivar: SELECT cron.unschedule('purge-expired-tracking');
-- Para verificar jobs activos: SELECT * FROM cron.job;

-- OPCIÓN B: purga manual / Edge Function programada — ejecutar cuando quieras
-- directamente en el SQL Editor, o pegar en el body de una Edge Function:
--
-- DELETE FROM tracking_events        WHERE expires_at < NOW();
-- DELETE FROM tracking_abandonments  WHERE expires_at < NOW();
-- DELETE FROM tracking_checkouts     WHERE expires_at < NOW();
-- DELETE FROM tracking_cart_actions  WHERE expires_at < NOW();
-- DELETE FROM tracking_product_views WHERE expires_at < NOW();
-- DELETE FROM tracking_page_views    WHERE expires_at < NOW();
-- DELETE FROM tracking_sessions      WHERE expires_at < NOW();


-- ════════════════════════════════════════════════════════════════════════════
-- 16. VERIFICACIÓN FINAL
--     Ejecuta esto (ya se ejecuta solo al final del script) y confirma que
--     las 22 filas dicen "✅ creada". Si alguna dice "❌ FALTA", desplázate
--     hacia arriba en el log de resultados para ver el error concreto.
-- ════════════════════════════════════════════════════════════════════════════

WITH esperadas(tabla) AS (
  VALUES
    ('profiles'), ('addresses'), ('products'), ('product_variants'), ('bundles'),
    ('product_stock'),
    ('coupons'), ('orders'), ('order_items'), ('order_tracking'), ('cart_items'), ('reviews'),
    ('contact_messages'),
    ('tracking_sessions'), ('tracking_page_views'), ('tracking_product_views'),
    ('tracking_cart_actions'), ('tracking_checkouts'), ('tracking_conversions'),
    ('tracking_abandonments'), ('tracking_events'),
    ('meta_pixel_events')
)
SELECT
  e.tabla AS tabla_esperada,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ creada' ELSE '❌ FALTA' END AS estado
FROM esperadas e
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = e.tabla
ORDER BY e.tabla;

-- ============================================================================
-- FIN DE SETUP-COMPLETO.sql
-- ============================================================================
