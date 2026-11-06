-- =============================================================================
-- 001_esquema_consolidado.sql
-- Esquema consolidado de Mundo Medics Catálogo (DOCUMENTACIÓN, NO EJECUTAR)
--
-- ⚠️⚠️ ESTE ARCHIVO ES SOLO REFERENCIA HISTÓRICA. NO LO EJECUTES. ⚠️⚠️
--
-- Contiene las políticas RLS ABIERTAS originales (escritura para cualquiera),
-- que la migración 002 cierra. Si alguien ejecuta este archivo después de la
-- 002, vuelve a abrir la base al público.
--
-- El esquema real y actual vive en:
--   - 002_rls_seguridad.sql   → políticas correctas (lectura pública, escritura
--                               solo para `authenticated`)
--   - 003_indices_rendimiento.sql → índices de category y created_at
--
-- Verificado contra la base real el 2026-11-06 (information_schema).
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
-- VERIFICADO contra la base real el 2026-11-06 (information_schema):
--   id    uuid  PRIMARY KEY (settings_pkey)
--   key   varchar(255) UNIQUE (settings_key_key)
--   value text
--   created_at timestamptz
-- La versión anterior de este archivo decía que `key` era la PK; era incorrecto.
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key varchar(255) NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
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
