-- =============================================================================
-- 002_rls_seguridad.sql
-- Fase 1 — Seguridad: cerrar el acceso de escritura público.
--
-- Problema: las políticas previas permitían a CUALQUIER persona (con la llave
-- anónima pública del navegador) insertar/editar/borrar productos, categorías,
-- ajustes e imágenes del bucket. Esto permitía, por ejemplo, cambiar el número
-- de WhatsApp del catálogo.
--
-- Cambio: la lectura sigue siendo pública; la escritura queda restringida a
-- usuarios autenticados (role = authenticated). Combinar con:
--   1) Desactivar el registro público en Auth (ver docs/SEGURIDAD.md).
--   2) La protección de /admin en src/proxy.ts y src/app/admin/layout.tsx.
--
-- ⚠ Ejecutar primero en el proyecto de DESARROLLO y hacer respaldo antes de
--   aplicar en producción.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Permitir insertar productos" ON public.products;
DROP POLICY IF EXISTS "Permitir actualizar productos" ON public.products;
DROP POLICY IF EXISTS "Permitir eliminar productos" ON public.products;

-- Lectura pública (se mantiene). El filtrado por `status` llega en otra fase.
CREATE POLICY IF NOT EXISTS "Lectura publica de productos"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Escritura de productos solo autenticados"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Actualizacion de productos solo autenticados"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Eliminacion de productos solo autenticados"
  ON public.products FOR DELETE
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Permitir insertar categorias" ON public.categories;
DROP POLICY IF EXISTS "Permitir actualizar categorias" ON public.categories;
DROP POLICY IF EXISTS "Permitir eliminar categorias" ON public.categories;

CREATE POLICY IF NOT EXISTS "Lectura publica de categorias"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Escritura de categorias solo autenticados"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Actualizacion de categorias solo autenticados"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Eliminacion de categorias solo autenticados"
  ON public.categories FOR DELETE
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public insert/update access on settings" ON public.settings;
DROP POLICY IF EXISTS "Permitir escritura de settings a todos" ON public.settings;

CREATE POLICY IF NOT EXISTS "Lectura publica de settings"
  ON public.settings FOR SELECT USING (true);

CREATE POLICY "Escritura de settings solo autenticados"
  ON public.settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE (bucket público "products")
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;

-- Lectura pública del bucket (se mantiene).
CREATE POLICY IF NOT EXISTS "Lectura publica del bucket products"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "Subida de imagenes solo autenticados"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products');

CREATE POLICY "Actualizacion de imagenes solo autenticados"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products');

CREATE POLICY "Eliminacion de imagenes solo autenticados"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Límites del bucket (validación en el servidor, refuerza S6)
--    Tamaño máximo 5 MB y solo formatos de imagen comunes.
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

-- =============================================================================
-- ROLLBACK (solo si es necesario): volver a políticas abiertas de escritura.
--   CREATE POLICY "Permitir insertar productos" ON public.products
--     FOR INSERT WITH CHECK (true);
--   ... (repetir para update/delete de products, categories, settings y storage)
-- =============================================================================
