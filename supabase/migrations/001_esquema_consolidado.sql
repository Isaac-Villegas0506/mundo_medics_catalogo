-- =============================================================================
-- 001_esquema_consolidado.sql
-- Esquema consolidado de Mundo Medics Catálogo
-- Generado desde: supabase_schema.sql, _v2, _v3, _v4,
--   supabase_schema_settings.sql, migration_categories.sql,
--   schema_update_sets.sql, supabase_storage.sql
-- Fecha: 2026-11-06
-- =============================================================================
-- NOTA: Este archivo documenta el esquema ACTUAL de la base de datos.
-- NO ejecutar en producción — la base ya tiene estas tablas.
-- Para cambios futuros, crear nuevas migraciones numeradas (002_, 003_...).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLA: products
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color_name text NOT NULL,
  color_hex_codes text[] DEFAULT '{}'::text[],
  image_url text,
  action_text text DEFAULT 'Ver detalles',
  description text,
  care_instructions text,
  material text,
  category text DEFAULT 'Todos',
  sizes text[] DEFAULT '{"S","M","L","XL"}'::text[],
  status text DEFAULT 'Disponible',
  tags text[] DEFAULT '{}'::text[],
  internal_code text,
  gallery text[] DEFAULT '{}'::text[],
  is_featured boolean DEFAULT false,
  order_index integer DEFAULT 0,
  customization_options text[] DEFAULT '{}'::text[],
  is_set boolean DEFAULT false,
  included_products jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas ACTUALES (⚠ INSEGURAS — se corrigen en Fase 1)
CREATE POLICY "Permitir lectura publica de productos"
  ON public.products FOR SELECT USING (true);
CREATE POLICY "Permitir insertar productos"
  ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar productos"
  ON public.products FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminar productos"
  ON public.products FOR DELETE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLA: categories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text DEFAULT 'category',
  order_index integer DEFAULT 0,
  featured_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de categorias"
  ON public.categories FOR SELECT USING (true);
CREATE POLICY "Permitir insertar categorias"
  ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar categorias"
  ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminar categorias"
  ON public.categories FOR DELETE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLA: settings
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTA: Existen dos definiciones en el código original:
--   - supabase_schema_settings.sql: key TEXT PRIMARY KEY (sin id uuid)
--   - migration_categories.sql:     id UUID PRIMARY KEY, key VARCHAR UNIQUE
-- Se debe verificar cuál existe realmente en la base de producción.
-- La versión más probable (y recomendada) es la de key como PK:
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on settings"
  ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update access on settings"
  ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Valores por defecto
INSERT INTO public.settings (key, value) VALUES
  ('whatsapp_number', ''),
  ('instagram_url', 'https://instagram.com/'),
  ('tiktok_url', 'https://tiktok.com/'),
  ('facebook_url', 'https://facebook.com/'),
  ('map_photo_url', 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=800&auto=format&fit=crop'),
  ('map_iframe_url', ''),
  ('map_directions_url', 'https://maps.app.goo.gl/ay9nCUgq9SYtcxGA7')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE: bucket público "products"
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas ACTUALES (⚠ INSEGURAS — se corrigen en Fase 1)
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Allow Uploads"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products');
CREATE POLICY "Allow Updates"
  ON storage.objects FOR UPDATE USING (bucket_id = 'products');
CREATE POLICY "Allow Deletes"
  ON storage.objects FOR DELETE USING (bucket_id = 'products');
