-- =============================================================================
-- RUN_ME_SQL.sql
-- Mundo Medics Catálogo — migraciones 002 (RLS) + 003 (índices)
--
-- ⚠️ EJECUTAR EN EL SQL EDITOR DE SUPABASE (https://app.supabase.com → tu proyecto).
--    Haz BACKUP primero (Database → Backups). Empieza en DESARROLLO.
--
-- Seguridad:
--   - Idempotente: se puede correr 2 veces sin error. Cada política se elimina
--     con DROP POLICY IF EXISTS antes de crearla (PostgreSQL NO soporta
--     CREATE POLICY IF NOT EXISTS; ese fue el error 42601 de la primera versión).
--   - Reversible: al final hay un bloque ROLLBACK, por si hay que deshacer.
--   - No toca datos: solo políticas, límites del bucket e índices.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PRODUCTS — escritura solo autenticados (lectura pública se mantiene)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.products;
DROP POLICY IF EXISTS "Lectura publica de productos" ON public.products;
DROP POLICY IF EXISTS "Permitir insertar productos" ON public.products;
DROP POLICY IF EXISTS "Permitir actualizar productos" ON public.products;
DROP POLICY IF EXISTS "Permitir eliminar productos" ON public.products;
DROP POLICY IF EXISTS "Escritura de productos solo autenticados" ON public.products;
DROP POLICY IF EXISTS "Actualizacion de productos solo autenticados" ON public.products;
DROP POLICY IF EXISTS "Eliminacion de productos solo autenticados" ON public.products;

CREATE POLICY "Lectura publica de productos"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Escritura de productos solo autenticados"
  ON public.products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Actualizacion de productos solo autenticados"
  ON public.products FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Eliminacion de productos solo autenticados"
  ON public.products FOR DELETE TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CATEGORIES — escritura solo autenticados
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Permitir lectura publica de categorias" ON public.categories;
DROP POLICY IF EXISTS "Lectura publica de categorias" ON public.categories;
DROP POLICY IF EXISTS "Permitir insertar categorias" ON public.categories;
DROP POLICY IF EXISTS "Permitir actualizar categorias" ON public.categories;
DROP POLICY IF EXISTS "Permitir eliminar categorias" ON public.categories;
DROP POLICY IF EXISTS "Escritura de categorias solo autenticados" ON public.categories;
DROP POLICY IF EXISTS "Actualizacion de categorias solo autenticados" ON public.categories;
DROP POLICY IF EXISTS "Eliminacion de categorias solo autenticados" ON public.categories;

CREATE POLICY "Lectura publica de categorias"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Escritura de categorias solo autenticados"
  ON public.categories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Actualizacion de categorias solo autenticados"
  ON public.categories FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Eliminacion de categorias solo autenticados"
  ON public.categories FOR DELETE TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SETTINGS — escritura solo autenticados
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access on settings" ON public.settings;
DROP POLICY IF EXISTS "Lectura publica de settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public insert/update access on settings" ON public.settings;
DROP POLICY IF EXISTS "Permitir escritura de settings a todos" ON public.settings;
DROP POLICY IF EXISTS "Escritura de settings solo autenticados" ON public.settings;

CREATE POLICY "Lectura publica de settings"
  ON public.settings FOR SELECT USING (true);

CREATE POLICY "Escritura de settings solo autenticados"
  ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE — bucket products: subida/actualizacion/eliminacion solo autenticados
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Lectura publica del bucket products" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;
DROP POLICY IF EXISTS "Subida de imagenes solo autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Actualizacion de imagenes solo autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Eliminacion de imagenes solo autenticados" ON storage.objects;

CREATE POLICY "Lectura publica del bucket products"
  ON storage.objects FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Subida de imagenes solo autenticados"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products');

CREATE POLICY "Actualizacion de imagenes solo autenticados"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'products');

CREATE POLICY "Eliminacion de imagenes solo autenticados"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'products');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Límites del bucket (5 MB, solo formatos de imagen)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]
WHERE id = 'products';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Índices para la paginación y filtros de la portada (Fase 4)
--    category:   WHERE category = 'X'
--    created_at: ORDER BY created_at DESC (paginación)
--    CREATE INDEX IF NOT EXISTS sí es válido en PostgreSQL.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products (category);

CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON public.products (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VERIFICACIÓN (revisar los resultados al terminar)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'categories', 'settings')
ORDER BY tablename, cmd, policyname;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'products'
ORDER BY indexname;

SELECT id, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'products';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (solo si es necesario): volver a políticas abiertas de escritura.
-- ═══════════════════════════════════════════════════════════════════════════════
-- DROP POLICY IF EXISTS "Escritura de productos solo autenticados" ON public.products;
-- DROP POLICY IF EXISTS "Actualizacion de productos solo autenticados" ON public.products;
-- DROP POLICY IF EXISTS "Eliminacion de productos solo autenticados" ON public.products;
-- CREATE POLICY "Permitir insertar productos" ON public.products FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Permitir actualizar productos" ON public.products FOR UPDATE USING (true);
-- CREATE POLICY "Permitir eliminar productos" ON public.products FOR DELETE USING (true);
-- (repetir para categories, settings y storage.objects)
-- DROP INDEX IF EXISTS idx_products_category;
-- DROP INDEX IF EXISTS idx_products_created_at;
