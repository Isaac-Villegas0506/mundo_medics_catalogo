-- supabase_schema_v2.sql
-- Ejecuta este script en tu consola SQL de Supabase para actualizar la base de datos

-- 1. Crear tabla de categorías
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text DEFAULT 'category',
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para categorías
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de categorias"
ON public.categories FOR SELECT
USING (true);

-- Categorías iniciales por defecto (si la tabla está vacía)
INSERT INTO public.categories (name, icon, order_index)
SELECT 'Polos', 'apparel', 0 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Polos');
INSERT INTO public.categories (name, icon, order_index)
SELECT 'Camisas', 'checkroom', 1 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Camisas');
INSERT INTO public.categories (name, icon, order_index)
SELECT 'Pantalones', 'straight', 2 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Pantalones');
INSERT INTO public.categories (name, icon, order_index)
SELECT 'Casacas', 'laundry', 3 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Casacas');
INSERT INTO public.categories (name, icon, order_index)
SELECT 'Zapatillas', 'footprint', 4 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Zapatillas');

-- 2. Modificar tabla de productos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Disponible',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS internal_code text,
ADD COLUMN IF NOT EXISTS gallery text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Migrar la categoría de texto simple a relacionar conceptualmente o mantenerla como texto
-- Para mantener la simplicidad y la compatibilidad, seguiremos usando 'category' como text,
-- pero la interfaz usará la tabla de categorías para alimentar los selectores.

-- Asignar valores por defecto a los productos existentes
UPDATE public.products 
SET gallery = ARRAY[image_url]
WHERE image_url IS NOT NULL AND gallery = '{}'::text[];

-- (Opcional) Limpiar cache o reestructurar columnas
